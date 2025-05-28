#!/bin/bash

# Exit on error
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default values
AUTO_MODE=false
CONFIG_FILE=""

# Default ports configuration
CPANEL_HTTP_PORT=9000
CPANEL_HTTPS_PORT=9001
CPANEL_FTP_PORT=9021
CPANEL_SSH_PORT=9022

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --auto-mode)
            AUTO_MODE=true
            shift
            ;;
        --config)
            CONFIG_FILE="$2"
            shift 2
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Load configuration if in auto mode
if [ "$AUTO_MODE" = true ] && [ -f "$CONFIG_FILE" ]; then
    echo -e "${YELLOW}Loading configuration from: $CONFIG_FILE${NC}"
    source <(grep = "$CONFIG_FILE" | sed 's/ *= */=/g')
else
    # Interactive mode - ask for configuration
    read -p "Enter domain name (default: localhost): " DOMAIN
    DOMAIN=${DOMAIN:-localhost}
    read -p "Enter admin email (default: admin@localhost): " ADMIN_EMAIL
    ADMIN_EMAIL=${ADMIN_EMAIL:-admin@localhost}
fi

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root${NC}"
    exit 1
fi

# Check OS
if ! grep -q "Ubuntu" /etc/os-release; then
    echo -e "${RED}This script only supports Ubuntu Server${NC}"
    exit 1
fi

# Progress function
show_progress() {
    local current=$1
    local total=$2
    local task=$3
    local percentage=$((current * 100 / total))
    printf "\r[%-50s] %d%% - %s" $(printf "#%.0s" $(seq 1 $((percentage/2)))) $percentage "$task"
    if [ $current -eq $total ]; then
        echo -e "\n"
    fi
}

# Total installation steps
TOTAL_STEPS=8
CURRENT_STEP=0

# Welcome message
clear
echo -e "${GREEN}Control Panel Installation${NC}"
echo -e "${BLUE}System Requirements Check...${NC}"

# Update system
CURRENT_STEP=$((CURRENT_STEP + 1))
show_progress $CURRENT_STEP $TOTAL_STEPS "Updating system packages"
apt update -qq && apt upgrade -y -qq > /dev/null 2>&1

# Install PHP repository
CURRENT_STEP=$((CURRENT_STEP + 1))
show_progress $CURRENT_STEP $TOTAL_STEPS "Adding PHP repository"
apt install -y software-properties-common > /dev/null 2>&1
add-apt-repository -y ppa:ondrej/php > /dev/null 2>&1
apt update -qq > /dev/null 2>&1

# Install required packages
CURRENT_STEP=$((CURRENT_STEP + 1))
show_progress $CURRENT_STEP $TOTAL_STEPS "Installing required packages"
DEBIAN_FRONTEND=noninteractive apt install -y python3 python3-pip python3-venv nginx mysql-server \
    php8.1 php8.1-fpm php8.1-mysql php8.1-curl php8.1-gd php8.1-mbstring php8.1-xml php8.1-cli \
    bind9 vsftpd postfix certbot python3-certbot-nginx fail2ban ufw > /dev/null 2>&1

# Install Node.js
CURRENT_STEP=$((CURRENT_STEP + 1))
show_progress $CURRENT_STEP $TOTAL_STEPS "Installing Node.js"
curl -fsSL https://deb.nodesource.com/setup_18.x | bash - > /dev/null 2>&1
DEBIAN_FRONTEND=noninteractive apt install -y nodejs > /dev/null 2>&1

# Configure MySQL
CURRENT_STEP=$((CURRENT_STEP + 1))
show_progress $CURRENT_STEP $TOTAL_STEPS "Configuring MySQL"

# Reset MySQL root password
systemctl stop mysql
mkdir -p /var/run/mysqld
chown mysql:mysql /var/run/mysqld
mysqld_safe --skip-grant-tables --skip-networking &
sleep 5

# Update root password
mysql -u root << EOF
FLUSH PRIVILEGES;
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '$DB_ROOT_PASSWORD';
FLUSH PRIVILEGES;
EOF

# Stop MySQL in safe mode and restart normally
pkill mysqld
sleep 5
systemctl start mysql
sleep 5

# Create database and user
mysql -u root -p"$DB_ROOT_PASSWORD" << EOF
CREATE DATABASE IF NOT EXISTS cpanel;
CREATE USER IF NOT EXISTS 'cpanel'@'localhost' IDENTIFIED BY '$DB_USER_PASSWORD';
GRANT ALL PRIVILEGES ON cpanel.* TO 'cpanel'@'localhost';
FLUSH PRIVILEGES;
EOF

# Configure PHP
CURRENT_STEP=$((CURRENT_STEP + 1))
show_progress $CURRENT_STEP $TOTAL_STEPS "Configuring PHP"
sed -i 's/upload_max_filesize = .*/upload_max_filesize = 64M/' /etc/php/8.1/fpm/php.ini
sed -i 's/post_max_size = .*/post_max_size = 64M/' /etc/php/8.1/fpm/php.ini
sed -i 's/memory_limit = .*/memory_limit = 256M/' /etc/php/8.1/fpm/php.ini
systemctl restart php8.1-fpm

# Setup application
CURRENT_STEP=$((CURRENT_STEP + 1))
show_progress $CURRENT_STEP $TOTAL_STEPS "Setting up application"
INSTALL_DIR=${INSTALL_DIR:-"/opt/cpanel"}
echo -e "${YELLOW}Setting up application in ${INSTALL_DIR}...${NC}"

# Create virtual environment and install dependencies
echo -e "${YELLOW}Setting up Python environment...${NC}"
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Configure application
echo -e "${YELLOW}Configuring application...${NC}"
cat > .env << EOF
DB_HOST=localhost
DB_USER=cpanel
DB_PASSWORD=$DB_USER_PASSWORD
DB_NAME=cpanel
SECRET_KEY=$APP_SECRET
JWT_SECRET_KEY=$JWT_SECRET
DEBUG=False
PORT=8889
DOMAIN_NAME=${DOMAIN:-$SERVER_IP}
ADMIN_EMAIL=${ADMIN_EMAIL:-admin@localhost}
NGINX_PORT=80
SSL_ENABLED=False
EOF

# Setup Frontend
echo -e "${YELLOW}Setting up frontend...${NC}"
cd frontend
npm install
npm run build
cd ..

# Configure Nginx with optimizations
echo -e "${YELLOW}Configuring Nginx...${NC}"
cat > /etc/nginx/sites-available/cpanel.conf << EOF
server {
    listen ${CPANEL_HTTP_PORT};
    listen ${CPANEL_HTTPS_PORT} ssl;
    server_name ${DOMAIN:-$SERVER_IP};
    
    # SSL configuration
    ssl_certificate /etc/ssl/certs/ssl-cert-snakeoil.pem;
    ssl_certificate_key /etc/ssl/private/ssl-cert-snakeoil.key;
    
    client_max_body_size 64M;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-XSS-Protection "1; mode=block";
    add_header X-Content-Type-Options "nosniff";
    
    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    location / {
        root $INSTALL_DIR/frontend/build;
        try_files \$uri \$uri/ /index.html;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    location /api {
        proxy_pass http://localhost:8889;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}
EOF

ln -sf /etc/nginx/sites-available/cpanel.conf /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# Configure system services
echo -e "${YELLOW}Configuring system services...${NC}"

# Configure BIND
sed -i 's/OPTIONS=.*/OPTIONS="-u bind -4"/' /etc/default/bind9
systemctl restart bind9

# Configure vsftpd
sed -i 's/anonymous_enable=.*/anonymous_enable=NO/' /etc/vsftpd.conf
sed -i 's/#local_enable=.*/local_enable=YES/' /etc/vsftpd.conf
sed -i 's/#write_enable=.*/write_enable=YES/' /etc/vsftpd.conf
sed -i 's/#chroot_local_user=.*/chroot_local_user=YES/' /etc/vsftpd.conf
sed -i "s/^listen_port=.*/listen_port=${CPANEL_FTP_PORT}/" /etc/vsftpd.conf
systemctl restart vsftpd

# Configure SSH
sed -i "s/^#Port .*/Port ${CPANEL_SSH_PORT}/" /etc/ssh/sshd_config
sed -i "s/^Port .*/Port ${CPANEL_SSH_PORT}/" /etc/ssh/sshd_config

# Setup directories and permissions
echo -e "${YELLOW}Setting up directories and permissions...${NC}"
mkdir -p /var/www/websites
mkdir -p /var/log/cpanel
chown -R www-data:www-data $INSTALL_DIR /var/www/websites
chmod -R 755 $INSTALL_DIR /var/www/websites

# Configure fail2ban
echo -e "${YELLOW}Configuring fail2ban...${NC}"
cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 5

[sshd]
enabled = true

[nginx-http-auth]
enabled = true
EOF

systemctl restart fail2ban

# Create systemd service
echo -e "${YELLOW}Creating systemd service...${NC}"
cat > /etc/systemd/system/cpanel.service << EOF
[Unit]
Description=Control Panel Service
After=network.target mysql.service

[Service]
User=www-data
WorkingDirectory=$INSTALL_DIR
Environment="PATH=$INSTALL_DIR/venv/bin"
ExecStart=$INSTALL_DIR/venv/bin/python backend/app.py
Restart=always
StandardOutput=append:/var/log/cpanel/backend.log
StandardError=append:/var/log/cpanel/backend-error.log

[Install]
WantedBy=multi-user.target
EOF

# Configure logrotate
cat > /etc/logrotate.d/cpanel << EOF
/var/log/cpanel/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0640 www-data adm
}
EOF

# Start services
echo -e "${YELLOW}Starting services...${NC}"
systemctl daemon-reload
systemctl enable cpanel fail2ban
systemctl start cpanel

# Setup SSL if domain is provided
if [ "$DOMAIN" != "localhost" ] && [ "$DOMAIN" != "$SERVER_IP" ]; then
    echo -e "${YELLOW}Setting up SSL certificate...${NC}"
    certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m ${ADMIN_EMAIL:-admin@localhost}
fi

# Save credentials
echo -e "${YELLOW}Saving credentials...${NC}"
cat > $INSTALL_DIR/credentials.txt << EOF
Control Panel Credentials
=======================
URL: http://${DOMAIN:-$SERVER_IP}:${CPANEL_HTTP_PORT}
Admin Username: admin
Admin Password: $ADMIN_PASSWORD
MySQL Root Password: $DB_ROOT_PASSWORD
MySQL User: cpanel
MySQL Password: $DB_USER_PASSWORD
Installation Directory: $INSTALL_DIR

Please save these credentials and delete this file!
EOF

chmod 600 $INSTALL_DIR/credentials.txt

# Final configuration
CURRENT_STEP=$((CURRENT_STEP + 1))
show_progress $CURRENT_STEP $TOTAL_STEPS "Finalizing installation"

# Final message
echo -e "\n${GREEN}Installation completed successfully!${NC}"
echo -e "Control Panel URLs:"
echo -e "HTTP: http://${DOMAIN:-$SERVER_IP}:${CPANEL_HTTP_PORT}"
echo -e "HTTPS: https://${DOMAIN:-$SERVER_IP}:${CPANEL_HTTPS_PORT}"
echo -e "FTP Port: ${CPANEL_FTP_PORT}"
echo -e "SSH Port: ${CPANEL_SSH_PORT}"
echo -e "\n${YELLOW}All credentials have been saved to: $INSTALL_DIR/credentials.txt${NC}"
echo -e "${YELLOW}IMPORTANT: Save these credentials and delete the credentials.txt file!${NC}"

# Setup basic firewall
echo -e "${YELLOW}Setting up basic firewall...${NC}"
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 22/tcp
ufw allow 53/tcp
ufw allow 53/udp
ufw allow 21/tcp
ufw allow 'Nginx Full'

echo -e "${GREEN}Setup complete! You can now access your control panel at: http://${DOMAIN:-$SERVER_IP}:${CPANEL_HTTP_PORT}${NC}"

# Configure SSO with System Users
configure_sso() {
    echo -e "${BLUE}Configuring Single Sign-On with System Users...${NC}"
    
    # Install required packages
    DEBIAN_FRONTEND=noninteractive apt install -y \
        libpam-mysql \
        libnss-mysql \
        pamtester \
        > /dev/null 2>&1

    # Create SSO configuration directory
    mkdir -p /etc/cpanel/sso
    chmod 700 /etc/cpanel/sso

    # Configure PAM for MySQL authentication
    cat > /etc/pam.d/cpanel << EOF
#%PAM-1.0
auth required pam_mysql.so user=cpanel passwd=$DB_USER_PASSWORD host=localhost db=cpanel table=system_users usercolumn=username passwdcolumn=password crypt=2
account required pam_mysql.so user=cpanel passwd=$DB_USER_PASSWORD host=localhost db=cpanel table=system_users usercolumn=username passwdcolumn=password crypt=2
EOF

    # Create system_users table in MySQL
    mysql -u root -p"$DB_ROOT_PASSWORD" cpanel << EOF
CREATE TABLE IF NOT EXISTS system_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    email VARCHAR(255),
    is_admin BOOLEAN DEFAULT FALSE,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    groups TEXT,
    shell VARCHAR(255) DEFAULT '/bin/bash'
);

CREATE TABLE IF NOT EXISTS user_groups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    group_name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    permissions JSON
);

CREATE TABLE IF NOT EXISTS user_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    session_token VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES system_users(id)
);
EOF

    # Create NSS MySQL configuration
    cat > /etc/libnss-mysql.cfg << EOF
getpwnam    SELECT username,'x',uid,gid,full_name,home,shell \
            FROM system_users \
            WHERE username='%1\$s' AND enabled=TRUE
getpwuid    SELECT username,'x',uid,gid,full_name,home,shell \
            FROM system_users \
            WHERE uid='%1\$u' AND enabled=TRUE
getspnam    SELECT username,password,FLOOR(UNIX_TIMESTAMP()/86400-1),0,99999,7,NULL,NULL,NULL \
            FROM system_users \
            WHERE username='%1\$s' AND enabled=TRUE
getpwent    SELECT username,'x',uid,gid,full_name,home,shell \
            FROM system_users \
            WHERE enabled=TRUE
EOF

    # Configure NSS to use MySQL
    sed -i '/^passwd:/ s/$/ mysql/' /etc/nsswitch.conf
    sed -i '/^shadow:/ s/$/ mysql/' /etc/nsswitch.conf

    # Create SSO helper script
    cat > /usr/local/bin/cpanel-add-system-user << EOF
#!/bin/bash
if [ "\$#" -ne 2 ]; then
    echo "Usage: \$0 username password"
    exit 1
fi

USERNAME=\$1
PASSWORD=\$(openssl passwd -1 \$2)

mysql -u cpanel -p"$DB_USER_PASSWORD" cpanel << EOSQL
INSERT INTO system_users (username, password, full_name, home, shell) 
VALUES ('\$USERNAME', '\$PASSWORD', '\$USERNAME', '/home/\$USERNAME', '/bin/bash');
EOSQL

mkdir -p /home/\$USERNAME
chown \$USERNAME:\$USERNAME /home/\$USERNAME
chmod 750 /home/\$USERNAME
EOF

    chmod +x /usr/local/bin/cpanel-add-system-user

    # Add admin user to system_users
    ADMIN_SYSTEM_PASS=$(openssl passwd -1 $ADMIN_PASSWORD)
    mysql -u root -p"$DB_ROOT_PASSWORD" cpanel << EOF
INSERT INTO system_users (username, password, full_name, email, is_admin, home, shell) 
VALUES ('admin', '$ADMIN_SYSTEM_PASS', 'Administrator', 'admin@localhost', TRUE, '/home/admin', '/bin/bash');
EOF

    # Create admin home directory
    mkdir -p /home/admin
    chown admin:admin /home/admin
    chmod 750 /home/admin

    echo -e "${GREEN}✓${NC} SSO configuration completed"
}

# Configure custom ports
configure_ports() {
    echo -e "${BLUE}Configuring custom ports...${NC}"
    
    # Configure Nginx for Control Panel
    cat > /etc/nginx/sites-available/cpanel.conf << EOF
server {
    listen ${CPANEL_HTTP_PORT};
    listen ${CPANEL_HTTPS_PORT} ssl;
    server_name ${DOMAIN:-$SERVER_IP};
    
    # SSL configuration
    ssl_certificate /etc/ssl/certs/ssl-cert-snakeoil.pem;
    ssl_certificate_key /etc/ssl/private/ssl-cert-snakeoil.key;
    
    client_max_body_size 64M;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-XSS-Protection "1; mode=block";
    add_header X-Content-Type-Options "nosniff";
    
    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    location / {
        root $INSTALL_DIR/frontend/build;
        try_files \$uri \$uri/ /index.html;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    location /api {
        proxy_pass http://localhost:8889;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}
EOF

    # Configure VSFTPD for custom port
    sed -i "s/^listen_port=.*/listen_port=${CPANEL_FTP_PORT}/" /etc/vsftpd.conf
    
    # Configure SSH for custom port
    sed -i "s/^#Port .*/Port ${CPANEL_SSH_PORT}/" /etc/ssh/sshd_config
    sed -i "s/^Port .*/Port ${CPANEL_SSH_PORT}/" /etc/ssh/sshd_config

    # Update firewall rules
    ufw allow ${CPANEL_HTTP_PORT}/tcp > /dev/null 2>&1
    ufw allow ${CPANEL_HTTPS_PORT}/tcp > /dev/null 2>&1
    ufw allow ${CPANEL_FTP_PORT}/tcp > /dev/null 2>&1
    ufw allow ${CPANEL_SSH_PORT}/tcp > /dev/null 2>&1

    # Create port configuration file
    cat > /etc/cpanel/ports.conf << EOF
# Control Panel Port Configuration
HTTP_PORT=${CPANEL_HTTP_PORT}
HTTPS_PORT=${CPANEL_HTTPS_PORT}
FTP_PORT=${CPANEL_FTP_PORT}
SSH_PORT=${CPANEL_SSH_PORT}
EOF

    # Restart services
    systemctl restart nginx vsftpd ssh

    echo -e "${GREEN}✓${NC} Custom ports configured"
    echo -e "HTTP Port: ${CPANEL_HTTP_PORT}"
    echo -e "HTTPS Port: ${CPANEL_HTTPS_PORT}"
    echo -e "FTP Port: ${CPANEL_FTP_PORT}"
    echo -e "SSH Port: ${CPANEL_SSH_PORT}"
}

# Add SSO configuration to the main installation process
configure_system() {
    # ... existing configuration code ...
    
    # Configure SSO
    configure_sso
    
    # Configure custom ports
    configure_ports
    
    # ... rest of existing code ...
}

# Configure MySQL
configure_mysql() {
    echo -e "${BLUE}Configuring MySQL...${NC}"
    
    # Stop MySQL
    systemctl stop mysql

    # Initialize MySQL with safe settings
    rm -rf /var/lib/mysql/*
    mysqld --initialize-insecure > /dev/null 2>&1
    
    # Start MySQL
    systemctl start mysql
    
    # Disable password validation plugin and set simple password policy
    mysql --user=root << EOF
SET GLOBAL validate_password.policy=LOW;
SET GLOBAL validate_password.length=6;
SET GLOBAL validate_password.mixed_case_count=0;
SET GLOBAL validate_password.number_count=0;
SET GLOBAL validate_password.special_char_count=0;
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '$DB_ROOT_PASSWORD';
FLUSH PRIVILEGES;

CREATE DATABASE IF NOT EXISTS cpanel;
CREATE USER IF NOT EXISTS 'cpanel'@'localhost' IDENTIFIED BY '$DB_USER_PASSWORD';
GRANT ALL PRIVILEGES ON cpanel.* TO 'cpanel'@'localhost';
FLUSH PRIVILEGES;
EOF

    # Create MySQL configuration
    cat > /etc/mysql/mysql.conf.d/mysqld.cnf << EOF
[mysqld]
pid-file        = /var/run/mysqld/mysqld.pid
socket          = /var/run/mysqld/mysqld.sock
datadir         = /var/lib/mysql
log-error       = /var/log/mysql/error.log
bind-address    = 127.0.0.1
symbolic-links  = 0
default_authentication_plugin = mysql_native_password
validate_password.policy = LOW
validate_password.length = 6
validate_password.mixed_case_count = 0
validate_password.number_count = 0
validate_password.special_char_count = 0
EOF

    # Restart MySQL to apply changes
    systemctl restart mysql

    echo -e "${GREEN}✓${NC} MySQL configured successfully"
}

# Update package installation
install_packages() {
    echo -e "${BLUE}Installing required packages...${NC}"
    
    # Update package list silently
    apt update -qq > /dev/null 2>&1
    
    # Remove any existing installations
    apt purge -y apache2* mysql* mariadb* php* vsftpd bind9 > /dev/null 2>&1
    apt autoremove -y > /dev/null 2>&1
    
    # Add required repositories silently
    apt install -y software-properties-common > /dev/null 2>&1
    add-apt-repository -y ppa:ondrej/php > /dev/null 2>&1
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - > /dev/null 2>&1
    apt update -qq > /dev/null 2>&1
    
    # Install packages with noninteractive mode
    export DEBIAN_FRONTEND=noninteractive
    apt install -y nginx mysql-server php8.1-fpm php8.1-mysql php8.1-curl \
        php8.1-gd php8.1-mbstring php8.1-xml php8.1-cli nodejs bind9 vsftpd \
        postfix certbot python3-certbot-nginx fail2ban ufw > /dev/null 2>&1
        
    echo -e "${GREEN}✓${NC} Packages installed successfully"
}

# Main installation process
main() {
    clear
    echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║      Control Panel Installation        ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
    echo
    
    # Generate secure passwords
    DB_ROOT_PASSWORD=$(openssl rand -base64 12)
    DB_USER_PASSWORD=$(openssl rand -base64 12)
    ADMIN_PASSWORD=$(openssl rand -base64 12)
    
    # Installation steps
    TOTAL_STEPS=5
    CURRENT_STEP=0
    
    # Step 1: Install packages
    CURRENT_STEP=$((CURRENT_STEP + 1))
    show_progress $CURRENT_STEP $TOTAL_STEPS "Installing packages"
    install_packages
    
    # Step 2: Configure MySQL
    CURRENT_STEP=$((CURRENT_STEP + 1))
    show_progress $CURRENT_STEP $TOTAL_STEPS "Configuring MySQL"
    configure_mysql
    
    # Step 3: Configure PHP and Nginx
    CURRENT_STEP=$((CURRENT_STEP + 1))
    show_progress $CURRENT_STEP $TOTAL_STEPS "Configuring web services"
    configure_web_services
    
    # Step 4: Configure SSO
    CURRENT_STEP=$((CURRENT_STEP + 1))
    show_progress $CURRENT_STEP $TOTAL_STEPS "Configuring SSO"
    configure_sso
    
    # Step 5: Configure ports
    CURRENT_STEP=$((CURRENT_STEP + 1))
    show_progress $CURRENT_STEP $TOTAL_STEPS "Configuring ports"
    configure_ports
    
    # Show completion message
    echo -e "\n${GREEN}╔════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║      Installation Complete! 🎉          ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
    echo -e "\nControl Panel is ready to use!"
    echo -e "URL: http://${DOMAIN:-$SERVER_IP}:${CPANEL_HTTP_PORT}"
    echo -e "Admin Username: admin"
    echo -e "Admin Password: $ADMIN_PASSWORD"
    echo -e "\nCredentials have been saved to: /root/cpanel-credentials.txt"
}

# Start installation
main 
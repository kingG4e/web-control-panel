#!/bin/bash

# Exit on error
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Default values
AUTO_MODE=false
CONFIG_FILE=""

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

# Welcome message
echo -e "${GREEN}Welcome to Control Panel Installation${NC}"
echo -e "${YELLOW}This script will automatically install and configure the Control Panel.${NC}"

# Get server IP
SERVER_IP=$(hostname -I | cut -d' ' -f1)
echo -e "${YELLOW}Detected Server IP: ${SERVER_IP}${NC}"

# Generate secure passwords
DB_ROOT_PASSWORD=$(openssl rand -base64 12)
DB_USER_PASSWORD=$(openssl rand -base64 12)
ADMIN_PASSWORD=$(openssl rand -base64 12)
JWT_SECRET=$(openssl rand -base64 32)
APP_SECRET=$(openssl rand -base64 32)

# Update system
echo -e "${YELLOW}Updating system packages...${NC}"
apt update && apt upgrade -y

# Install LAMP stack and other requirements
echo -e "${YELLOW}Installing required packages...${NC}"
apt install -y python3 python3-pip python3-venv nginx mysql-server \
    php8.1-fpm php8.1-mysql php8.1-curl php8.1-gd php8.1-mbstring php8.1-xml \
    bind9 vsftpd postfix certbot python3-certbot-nginx nodejs npm \
    fail2ban ufw

# Configure MySQL
echo -e "${YELLOW}Configuring MySQL...${NC}"
mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '$DB_ROOT_PASSWORD';"
mysql -e "CREATE DATABASE cpanel;"
mysql -e "CREATE USER 'cpanel'@'localhost' IDENTIFIED BY '$DB_USER_PASSWORD';"
mysql -e "GRANT ALL PRIVILEGES ON cpanel.* TO 'cpanel'@'localhost';"
mysql -e "FLUSH PRIVILEGES;"

# Configure PHP
echo -e "${YELLOW}Configuring PHP...${NC}"
sed -i 's/upload_max_filesize = .*/upload_max_filesize = 64M/' /etc/php/8.1/fpm/php.ini
sed -i 's/post_max_size = .*/post_max_size = 64M/' /etc/php/8.1/fpm/php.ini
sed -i 's/memory_limit = .*/memory_limit = 256M/' /etc/php/8.1/fpm/php.ini
systemctl restart php8.1-fpm

# Setup application
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
    listen 80;
    server_name ${DOMAIN:-$SERVER_IP};
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
systemctl restart vsftpd

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
URL: http://${DOMAIN:-$SERVER_IP}
Admin Username: admin
Admin Password: $ADMIN_PASSWORD
MySQL Root Password: $DB_ROOT_PASSWORD
MySQL User: cpanel
MySQL Password: $DB_USER_PASSWORD
Installation Directory: $INSTALL_DIR

Please save these credentials and delete this file!
EOF

chmod 600 $INSTALL_DIR/credentials.txt

# Final message
echo -e "${GREEN}Installation completed successfully!${NC}"
echo -e "Control Panel URL: http://${DOMAIN:-$SERVER_IP}"
echo -e "Admin Username: admin"
echo -e "Admin Password: $ADMIN_PASSWORD"
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

echo -e "${GREEN}Setup complete! You can now access your control panel at: http://${DOMAIN:-$SERVER_IP}${NC}" 
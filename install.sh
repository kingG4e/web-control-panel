#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Default ports
CPANEL_HTTP_PORT=2080
CPANEL_HTTPS_PORT=2083
CPANEL_FTP_PORT=2021
CPANEL_SSH_PORT=2022

# System check function
check_system() {
    echo -e "\n${BLUE}[1/5] System Check...${NC}"
    
    # Check OS
    if ! grep -q "Ubuntu" /etc/os-release; then
        echo -e "${RED}This script only supports Ubuntu Server${NC}"
        exit 1
    fi
    
    # Check memory
    total_mem=$(free -m | awk '/^Mem:/{print $2}')
    if [ $total_mem -lt 1024 ]; then
        echo -e "${RED}Requires at least 1GB RAM (Current: ${total_mem}MB)${NC}"
        exit 1
    fi
    
    # Check disk space
    free_space=$(df -m / | awk 'NR==2 {print $4}')
    if [ $free_space -lt 5120 ]; then
        echo -e "${RED}Requires at least 5GB free space (Current: ${free_space}MB)${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓${NC} System check passed"
}

# Prepare system
prepare_system() {
    echo -e "\n${BLUE}[2/5] Preparing System...${NC}"
    
    # Backup important files
    mkdir -p /root/cpanel-backup
    if [ -f /etc/nginx/nginx.conf ]; then
        cp /etc/nginx/nginx.conf /root/cpanel-backup/
    fi
    if [ -f /etc/mysql/my.cnf ]; then
        cp /etc/mysql/my.cnf /root/cpanel-backup/
    fi
    
    # Stop and remove conflicting services
    systemctl stop apache2 nginx mysql php8.1-fpm 2>/dev/null || true
    apt remove -y apache2* nginx* mysql* php* vsftpd bind9 2>/dev/null || true
    apt autoremove -y 2>/dev/null || true
    
    # Clean up directories
    rm -rf /var/lib/mysql/*
    rm -rf /etc/nginx/sites-enabled/*
    rm -rf /var/www/html/*
    
    echo -e "${GREEN}✓${NC} System preparation complete"
}

# Install packages
install_packages() {
    echo -e "\n${BLUE}[3/5] Installing Packages...${NC}"
    
    # Update package list
    apt update -qq
    
    # Install prerequisites
    DEBIAN_FRONTEND=noninteractive apt install -y \
        software-properties-common \
        apt-transport-https \
        ca-certificates \
        curl \
        gnupg \
        lsb-release \
        > /dev/null 2>&1
    
    # Add MariaDB repository
    curl -LsS https://downloads.mariadb.com/MariaDB/mariadb_repo_setup | sudo bash -s -- --mariadb-server-version="10.6" > /dev/null 2>&1
    
    # Add PHP repository
    add-apt-repository -y ppa:ondrej/php > /dev/null 2>&1
    apt update -qq
    
    # Install main packages
    DEBIAN_FRONTEND=noninteractive apt install -y \
        nginx \
        mariadb-server \
        php8.1-fpm \
        php8.1-mysql \
        php8.1-curl \
        php8.1-gd \
        php8.1-mbstring \
        php8.1-xml \
        php8.1-cli \
        bind9 \
        vsftpd \
        postfix \
        certbot \
        python3-certbot-nginx \
        fail2ban \
        ufw \
        > /dev/null 2>&1
        
    echo -e "${GREEN}✓${NC} Packages installation completed successfully"
}

# Configure services
configure_services() {
    echo -e "\n${BLUE}[4/5] Configuring Services...${NC}"
    local error_count=0
    
    # Generate passwords
    DB_ROOT_PASSWORD=$(openssl rand -base64 12)
    DB_USER_PASSWORD=$(openssl rand -base64 12)
    
    # Configure MariaDB
    echo -e "${BLUE}➤ Configuring MariaDB...${NC}"
    if ! mkdir -p /var/run/mysqld; then
        echo -e "${RED}✗ Failed to create directory /var/run/mysqld${NC}"
        error_count=$((error_count + 1))
    else
        chown mysql:mysql /var/run/mysqld
        chmod 777 /var/run/mysqld
    fi
    
    # Create MariaDB configuration directory if not exists
    if ! mkdir -p /etc/mysql/mariadb.conf.d/; then
        echo -e "${RED}✗ Failed to create MariaDB config directory${NC}"
        error_count=$((error_count + 1))
    fi
    
    # Create MariaDB configuration
    if ! cat > /etc/mysql/mariadb.conf.d/50-server.cnf << EOF
[mysqld]
bind-address = 127.0.0.1
port = 3306
user = mysql
pid-file = /run/mysqld/mysqld.pid
socket = /run/mysqld/mysqld.sock
basedir = /usr
datadir = /var/lib/mysql
tmpdir = /tmp
lc-messages-dir = /usr/share/mysql
skip-external-locking
max_connections = 100
connect_timeout = 5
wait_timeout = 600
max_allowed_packet = 16M
thread_cache_size = 128
sort_buffer_size = 4M
bulk_insert_buffer_size = 16M
tmp_table_size = 32M
max_heap_table_size = 32M
character-set-server = utf8mb4
collation-server = utf8mb4_general_ci
EOF
    then
        echo -e "${RED}✗ Failed to create MariaDB config file${NC}"
        error_count=$((error_count + 1))
    fi
    
    # Start MariaDB
    echo -e "${BLUE}➤ Starting MariaDB...${NC}"
    if ! systemctl start mariadb; then
        echo -e "${RED}✗ Failed to start MariaDB${NC}"
        error_count=$((error_count + 1))
    fi
    
    # Secure MariaDB installation
    echo -e "${BLUE}➤ Securing MariaDB...${NC}"
    if ! mysql -u root << EOF
ALTER USER 'root'@'localhost' IDENTIFIED BY '${DB_ROOT_PASSWORD}';
DELETE FROM mysql.user WHERE User='';
DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');
DROP DATABASE IF EXISTS test;
DELETE FROM mysql.db WHERE Db='test' OR Db='test\\_%';
CREATE DATABASE IF NOT EXISTS cpanel CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
CREATE USER IF NOT EXISTS 'cpanel'@'localhost' IDENTIFIED BY '${DB_USER_PASSWORD}';
GRANT ALL PRIVILEGES ON cpanel.* TO 'cpanel'@'localhost';
FLUSH PRIVILEGES;
EOF
    then
        echo -e "${RED}✗ Failed to secure MariaDB${NC}"
        error_count=$((error_count + 1))
    fi
    
    # Configure PHP
    echo -e "${BLUE}➤ Configuring PHP...${NC}"
    if [ ! -f /etc/php/8.1/fpm/php.ini ]; then
        echo -e "${RED}✗ php.ini file not found${NC}"
        error_count=$((error_count + 1))
    else
        sed -i 's/upload_max_filesize = .*/upload_max_filesize = 64M/' /etc/php/8.1/fpm/php.ini
        sed -i 's/post_max_size = .*/post_max_size = 64M/' /etc/php/8.1/fpm/php.ini
        sed -i 's/memory_limit = .*/memory_limit = 256M/' /etc/php/8.1/fpm/php.ini
    fi
    
    # Create Nginx directories if they don't exist
    echo -e "${BLUE}➤ Configuring Nginx...${NC}"
    if ! mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled; then
        echo -e "${RED}✗ Failed to create Nginx config directories${NC}"
        error_count=$((error_count + 1))
    fi
    
    # Configure Nginx
    if ! cat > /etc/nginx/sites-available/cpanel.conf << EOF
server {
    listen ${CPANEL_HTTP_PORT} default_server;
    listen ${CPANEL_HTTPS_PORT} ssl default_server;
    server_name _;
    
    root /var/www/html;
    index index.php index.html;
    
    # SSL configuration
    ssl_certificate /etc/ssl/certs/ssl-cert-snakeoil.pem;
    ssl_certificate_key /etc/ssl/private/ssl-cert-snakeoil.key;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-XSS-Protection "1; mode=block";
    add_header X-Content-Type-Options "nosniff";
    
    location / {
        try_files \$uri \$uri/ /index.php?\$args;
    }
    
    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
        fastcgi_param SCRIPT_FILENAME \$document_root\$fastcgi_script_name;
        include fastcgi_params;
    }
    
    # Deny access to . files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
EOF
    then
        echo -e "${RED}✗ Failed to create Nginx config file${NC}"
        error_count=$((error_count + 1))
    fi
    
    # Create symbolic link for Nginx config
    if ! ln -sf /etc/nginx/sites-available/cpanel.conf /etc/nginx/sites-enabled/cpanel.conf; then
        echo -e "${RED}✗ Failed to create symbolic link for Nginx config${NC}"
        error_count=$((error_count + 1))
    fi
    
    # Remove default Nginx config if exists
    rm -f /etc/nginx/sites-enabled/default
    
    # Configure FTP
    echo -e "${BLUE}➤ Configuring FTP...${NC}"
    if [ ! -f /etc/vsftpd.conf ]; then
        echo -e "${RED}✗ vsftpd.conf file not found${NC}"
        error_count=$((error_count + 1))
    else
        sed -i 's/anonymous_enable=.*/anonymous_enable=NO/' /etc/vsftpd.conf
        sed -i 's/#local_enable=.*/local_enable=YES/' /etc/vsftpd.conf
        sed -i 's/#write_enable=.*/write_enable=YES/' /etc/vsftpd.conf
        sed -i "s/^listen_port=.*/listen_port=${CPANEL_FTP_PORT}/" /etc/vsftpd.conf
    fi
    
    # Create www directory if it doesn't exist
    if ! mkdir -p /var/www/html; then
        echo -e "${RED}✗ Failed to create directory /var/www/html${NC}"
        error_count=$((error_count + 1))
    fi
    
    # Save credentials
    echo -e "${BLUE}➤ Saving access credentials...${NC}"
    if ! cat > /root/cpanel-credentials.txt << EOF
Control Panel Credentials
=======================
MariaDB Root Password: ${DB_ROOT_PASSWORD}
MariaDB User: cpanel
MariaDB Password: ${DB_USER_PASSWORD}
Installation Date: $(date)

Ports:
HTTP: ${CPANEL_HTTP_PORT}
HTTPS: ${CPANEL_HTTPS_PORT}
FTP: ${CPANEL_FTP_PORT}
SSH: ${CPANEL_SSH_PORT}

Database Information:
Server: localhost
Port: 3306
Default Character Set: utf8mb4
Default Collation: utf8mb4_general_ci
EOF
    then
        echo -e "${RED}✗ Failed to save credentials file${NC}"
        error_count=$((error_count + 1))
    else
        chmod 600 /root/cpanel-credentials.txt
    fi
    
    # Restart services
    echo -e "${BLUE}➤ Restarting services...${NC}"
    if ! systemctl restart mariadb php8.1-fpm nginx vsftpd; then
        echo -e "${RED}✗ Failed to restart services${NC}"
        error_count=$((error_count + 1))
    fi
    
    if [ $error_count -eq 0 ]; then
        echo -e "${GREEN}✓ Service configuration completed successfully${NC}"
        return 0
    else
        echo -e "${RED}✗ Service configuration failed with ${error_count} error(s)${NC}"
        return 1
    fi
}

# Configure security
configure_security() {
    echo -e "\n${BLUE}[5/5] Configuring Security...${NC}"
    
    # Reset and configure firewall
    ufw --force reset > /dev/null 2>&1
    ufw default deny incoming > /dev/null 2>&1
    ufw default allow outgoing > /dev/null 2>&1
    
    # Remove all existing rules
    ufw status numbered | grep -o '\[[0-9]*\]' | tr -d '[]' | tac | while read -r num; do
        echo "y" | ufw delete $num > /dev/null 2>&1
    done
    
    # Allow only necessary ports
    ufw allow 22/tcp > /dev/null 2>&1    # SSH
    ufw allow ${CPANEL_HTTP_PORT}/tcp > /dev/null 2>&1  # HTTP
    ufw allow ${CPANEL_HTTPS_PORT}/tcp > /dev/null 2>&1 # HTTPS
    ufw allow ${CPANEL_FTP_PORT}/tcp > /dev/null 2>&1   # FTP
    ufw allow ${CPANEL_SSH_PORT}/tcp > /dev/null 2>&1   # SSH (if needed)
    
    # Enable firewall
    ufw --force enable > /dev/null 2>&1
    
    # Configure fail2ban
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
    
    # Stop unnecessary services
    systemctl stop bind9 2>/dev/null || true
    systemctl disable bind9 2>/dev/null || true
    systemctl stop postfix 2>/dev/null || true
    systemctl disable postfix 2>/dev/null || true
    
    # Start required services
    systemctl start nginx
    systemctl start php8.1-fpm
    systemctl start mariadb
    systemctl start vsftpd
    systemctl start fail2ban
    
    # Enable services to start on boot
    systemctl enable nginx
    systemctl enable php8.1-fpm
    systemctl enable mariadb
    systemctl enable vsftpd
    systemctl enable fail2ban
    
    # Verify firewall rules
    echo -e "\n${BLUE}Firewall Rules:${NC}"
    ufw status verbose | grep -A 20 "Status: active"
    
    echo -e "${GREEN}✓${NC} Security configuration completed"
}

# Main installation
main() {
    clear
    echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║      Web Control Panel Installer       ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
    echo

    # Check if running as root
    if [ "$EUID" -ne 0 ]; then 
        echo -e "${RED}Please run this script as root (use sudo)${NC}"
        exit 1
    fi
    
    # Run installation steps
    check_system
    prepare_system
    install_packages
    configure_services
    configure_security
    
    # Show completion message
    echo -e "\n${GREEN}╔════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║         ติดตั้งเสร็จเรียบร้อย          ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
    echo -e "\nControl Panel URL: http://localhost:${CPANEL_HTTP_PORT}"
    echo -e "Credentials saved to: /root/cpanel-credentials.txt"
    echo -e "\nPorts in use:"
    echo -e "SSH: 22"
    echo -e "HTTP: ${CPANEL_HTTP_PORT}"
    echo -e "HTTPS: ${CPANEL_HTTPS_PORT}"
    echo -e "FTP: ${CPANEL_FTP_PORT}"
    echo -e "SSH (Alt): ${CPANEL_SSH_PORT}"
    
    # Show running services
    echo -e "\nRunning services:"
    systemctl status nginx | grep "Active:" | sed 's/^[ \t]*//'
    systemctl status php8.1-fpm | grep "Active:" | sed 's/^[ \t]*//'
    systemctl status mariadb | grep "Active:" | sed 's/^[ \t]*//'
    systemctl status vsftpd | grep "Active:" | sed 's/^[ \t]*//'
    systemctl status fail2ban | grep "Active:" | sed 's/^[ \t]*//'
}

# Start installation
main 
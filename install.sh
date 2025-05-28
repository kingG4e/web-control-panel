#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default ports (ไม่ชนกับ Virtualmin)
CPANEL_HTTP_PORT=9000
CPANEL_HTTPS_PORT=9001
CPANEL_FTP_PORT=9021
CPANEL_SSH_PORT=9022

# Print header
clear
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       Easy Control Panel Setup         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}กรุณารันสคริปต์ด้วยสิทธิ์ root (sudo)${NC}"
    exit 1
fi

# Check OS
if ! grep -q "Ubuntu" /etc/os-release; then
    echo -e "${RED}สคริปต์นี้รองรับเฉพาะ Ubuntu Server เท่านั้น${NC}"
    exit 1
fi

# Simple installation function
install_packages() {
    echo -e "\n${BLUE}[1/4] กำลังติดตั้งแพ็คเกจที่จำเป็น...${NC}"
    
    # Update system
    apt update -qq && apt upgrade -y -qq > /dev/null 2>&1
    
    # Install required packages
    DEBIAN_FRONTEND=noninteractive apt install -y \
        nginx mysql-server php8.1-fpm php8.1-mysql php8.1-curl \
        php8.1-gd php8.1-mbstring php8.1-xml php8.1-cli \
        bind9 vsftpd postfix certbot python3-certbot-nginx \
        fail2ban ufw > /dev/null 2>&1
}

# Configure MySQL with simple settings
setup_mysql() {
    echo -e "\n${BLUE}[2/4] กำลังตั้งค่า MySQL...${NC}"
    
    # Generate random passwords
    DB_ROOT_PASSWORD=$(openssl rand -base64 12)
    DB_USER_PASSWORD=$(openssl rand -base64 12)
    
    # Stop MySQL and clean up
    systemctl stop mysql
    rm -rf /var/lib/mysql/*
    rm -f /var/run/mysqld/mysqld.*
    
    # Initialize MySQL
    mysqld --initialize-insecure --user=mysql > /dev/null 2>&1
    chown -R mysql:mysql /var/lib/mysql
    systemctl start mysql
    
    # Set root password and create database
    mysql -u root << EOF
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '${DB_ROOT_PASSWORD}';
CREATE DATABASE IF NOT EXISTS cpanel;
CREATE USER IF NOT EXISTS 'cpanel'@'localhost' IDENTIFIED BY '${DB_USER_PASSWORD}';
GRANT ALL PRIVILEGES ON cpanel.* TO 'cpanel'@'localhost';
FLUSH PRIVILEGES;
EOF

    # Save credentials
    echo "MySQL Root Password: ${DB_ROOT_PASSWORD}" > /root/cpanel-credentials.txt
    echo "MySQL User Password: ${DB_USER_PASSWORD}" >> /root/cpanel-credentials.txt
    chmod 600 /root/cpanel-credentials.txt
}

# Configure web services
setup_web() {
    echo -e "\n${BLUE}[3/4] กำลังตั้งค่าเว็บเซิร์ฟเวอร์...${NC}"
    
    # Configure PHP
    sed -i 's/upload_max_filesize = .*/upload_max_filesize = 64M/' /etc/php/8.1/fpm/php.ini
    sed -i 's/post_max_size = .*/post_max_size = 64M/' /etc/php/8.1/fpm/php.ini
    sed -i 's/memory_limit = .*/memory_limit = 256M/' /etc/php/8.1/fpm/php.ini
    
    # Configure Nginx
    cat > /etc/nginx/sites-available/cpanel.conf << EOF
server {
    listen ${CPANEL_HTTP_PORT};
    listen ${CPANEL_HTTPS_PORT} ssl;
    server_name localhost;
    
    root /var/www/html;
    index index.php index.html;
    
    location / {
        try_files \$uri \$uri/ /index.php?\$args;
    }
    
    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
    }
}
EOF

    ln -sf /etc/nginx/sites-available/cpanel.conf /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    # Restart services
    systemctl restart php8.1-fpm nginx
}

# Configure firewall
setup_firewall() {
    echo -e "\n${BLUE}[4/4] กำลังตั้งค่าไฟร์วอลล์...${NC}"
    
    ufw allow ${CPANEL_HTTP_PORT}/tcp
    ufw allow ${CPANEL_HTTPS_PORT}/tcp
    ufw allow ${CPANEL_FTP_PORT}/tcp
    ufw allow ${CPANEL_SSH_PORT}/tcp
    ufw --force enable
}

# Main installation
main() {
    install_packages
    setup_mysql
    setup_web
    setup_firewall
    
    echo -e "\n${GREEN}╔════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║         ติดตั้งเสร็จสมบูรณ์! 🎉        ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
    echo -e "\nControl Panel URL: http://localhost:${CPANEL_HTTP_PORT}"
    echo -e "รหัสผ่านถูกบันทึกไว้ที่: /root/cpanel-credentials.txt"
    echo -e "\nพอร์ตที่ใช้งาน:"
    echo -e "HTTP: ${CPANEL_HTTP_PORT}"
    echo -e "HTTPS: ${CPANEL_HTTPS_PORT}"
    echo -e "FTP: ${CPANEL_FTP_PORT}"
    echo -e "SSH: ${CPANEL_SSH_PORT}"
}

# Start installation
main 
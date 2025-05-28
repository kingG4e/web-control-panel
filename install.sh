#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Default ports (ไม่ชนกับ Virtualmin)
CPANEL_HTTP_PORT=9000
CPANEL_HTTPS_PORT=9001
CPANEL_FTP_PORT=9021
CPANEL_SSH_PORT=9022

# System check function
check_system() {
    echo -e "\n${BLUE}[1/5] ตรวจสอบระบบ...${NC}"
    
    # Check OS
    if ! grep -q "Ubuntu" /etc/os-release; then
        echo -e "${RED}สคริปต์นี้รองรับเฉพาะ Ubuntu Server เท่านั้น${NC}"
        exit 1
    fi
    
    # Check memory
    total_mem=$(free -m | awk '/^Mem:/{print $2}')
    if [ $total_mem -lt 1024 ]; then
        echo -e "${RED}ต้องการ RAM อย่างน้อย 1GB (มี ${total_mem}MB)${NC}"
        exit 1
    fi
    
    # Check disk space
    free_space=$(df -m / | awk 'NR==2 {print $4}')
    if [ $free_space -lt 5120 ]; then
        echo -e "${RED}ต้องการพื้นที่ว่างอย่างน้อย 5GB (มี ${free_space}MB)${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓${NC} ระบบผ่านการตรวจสอบ"
}

# Prepare system
prepare_system() {
    echo -e "\n${BLUE}[2/5] เตรียมระบบ...${NC}"
    
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
    
    echo -e "${GREEN}✓${NC} ระบบพร้อมสำหรับการติดตั้ง"
}

# Install packages
install_packages() {
    echo -e "\n${BLUE}[3/5] ติดตั้งแพ็คเกจ...${NC}"
    
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
        
    echo -e "${GREEN}✓${NC} ติดตั้งแพ็คเกจเสร็จสมบูรณ์"
}

# Configure services
configure_services() {
    echo -e "\n${BLUE}[4/5] ตั้งค่าบริการ...${NC}"
    
    # Generate passwords
    DB_ROOT_PASSWORD=$(openssl rand -base64 12)
    DB_USER_PASSWORD=$(openssl rand -base64 12)
    
    # Configure MariaDB
    mkdir -p /var/run/mysqld
    chown mysql:mysql /var/run/mysqld
    chmod 777 /var/run/mysqld
    
    # Create MariaDB configuration
    cat > /etc/mysql/mariadb.conf.d/50-server.cnf << EOF
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
    
    # Start MariaDB
    systemctl start mariadb
    
    # Secure MariaDB installation
    mysql -u root << EOF
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
    
    # Configure PHP
    sed -i 's/upload_max_filesize = .*/upload_max_filesize = 64M/' /etc/php/8.1/fpm/php.ini
    sed -i 's/post_max_size = .*/post_max_size = 64M/' /etc/php/8.1/fpm/php.ini
    sed -i 's/memory_limit = .*/memory_limit = 256M/' /etc/php/8.1/fpm/php.ini
    
    # Configure Nginx
    cat > /etc/nginx/sites-available/cpanel.conf << EOF
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
    
    ln -sf /etc/nginx/sites-available/cpanel.conf /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    # Configure FTP
    sed -i 's/anonymous_enable=.*/anonymous_enable=NO/' /etc/vsftpd.conf
    sed -i 's/#local_enable=.*/local_enable=YES/' /etc/vsftpd.conf
    sed -i 's/#write_enable=.*/write_enable=YES/' /etc/vsftpd.conf
    sed -i "s/^listen_port=.*/listen_port=${CPANEL_FTP_PORT}/" /etc/vsftpd.conf
    
    # Save credentials
    cat > /root/cpanel-credentials.txt << EOF
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
    
    chmod 600 /root/cpanel-credentials.txt
    
    # Restart services
    systemctl restart mariadb php8.1-fpm nginx vsftpd
    
    echo -e "${GREEN}✓${NC} ตั้งค่าบริการเสร็จสมบูรณ์"
}

# Configure security
configure_security() {
    echo -e "\n${BLUE}[5/5] ตั้งค่าความปลอดภัย...${NC}"
    
    # Configure firewall
    ufw --force reset > /dev/null 2>&1
    ufw default deny incoming > /dev/null 2>&1
    ufw default allow outgoing > /dev/null 2>&1
    ufw allow ${CPANEL_HTTP_PORT}/tcp > /dev/null 2>&1
    ufw allow ${CPANEL_HTTPS_PORT}/tcp > /dev/null 2>&1
    ufw allow ${CPANEL_FTP_PORT}/tcp > /dev/null 2>&1
    ufw allow ${CPANEL_SSH_PORT}/tcp > /dev/null 2>&1
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
    
    echo -e "${GREEN}✓${NC} ตั้งค่าความปลอดภัยเสร็จสมบูรณ์"
}

# Main installation
main() {
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
    
    # Run installation steps
    check_system
    prepare_system
    install_packages
    configure_services
    configure_security
    
    # Show completion message
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
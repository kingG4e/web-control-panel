#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default configuration
INSTALL_DIR="/usr/local/cpanel"
CPANEL_PORT=2082
WEBSERVER_PORT=80
MYSQL_PORT=3306
FTP_PORT=21
SSH_PORT=22

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run this script as root (use sudo)${NC}"
    exit 1
fi

echo -e "${BLUE}Starting Control Panel Installation...${NC}"

# System Update
echo -e "${BLUE}Updating system packages...${NC}"
apt-get update
apt-get upgrade -y

# Install Essential Packages
echo -e "${BLUE}Installing essential packages...${NC}"
apt-get install -y \
    apache2 \
    mariadb-server \
    mariadb-client \
    php \
    php-mysql \
    php-fpm \
    php-curl \
    php-gd \
    php-mbstring \
    php-xml \
    php-zip \
    python3 \
    python3-pip \
    python3-venv \
    nodejs \
    npm \
    vsftpd \
    bind9 \
    postfix \
    certbot \
    ufw \
    fail2ban

# Configure MariaDB
echo -e "${BLUE}Configuring MariaDB...${NC}"
systemctl start mariadb
systemctl enable mariadb

# Set MariaDB root password
MYSQL_ROOT_PASSWORD=$(openssl rand -base64 12)
mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED BY '$MYSQL_ROOT_PASSWORD';"
mysql -e "CREATE DATABASE IF NOT EXISTS cpanel;"
mysql -e "CREATE USER IF NOT EXISTS 'cpanel'@'localhost' IDENTIFIED BY 'cpanel';"
mysql -e "GRANT ALL PRIVILEGES ON cpanel.* TO 'cpanel'@'localhost';"
mysql -e "FLUSH PRIVILEGES;"

# Configure Apache
echo -e "${BLUE}Configuring Apache...${NC}"
a2enmod proxy
a2enmod proxy_http
a2enmod ssl
a2enmod rewrite

# Create Apache Virtual Host
cat > /etc/apache2/sites-available/cpanel.conf << EOF
<VirtualHost *:${WEBSERVER_PORT}>
    ServerAdmin webmaster@localhost
    DocumentRoot ${INSTALL_DIR}/frontend/build

    ProxyPass /api http://localhost:8080/api
    ProxyPassReverse /api http://localhost:8080/api

    <Directory ${INSTALL_DIR}/frontend/build>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog \${APACHE_LOG_DIR}/cpanel-error.log
    CustomLog \${APACHE_LOG_DIR}/cpanel-access.log combined
</VirtualHost>
EOF

a2ensite cpanel.conf
systemctl restart apache2

# Configure Firewall
echo -e "${BLUE}Configuring firewall...${NC}"
ufw allow $WEBSERVER_PORT/tcp
ufw allow $MYSQL_PORT/tcp
ufw allow $FTP_PORT/tcp
ufw allow $SSH_PORT/tcp
ufw --force enable

# Install Control Panel
echo -e "${BLUE}Installing Control Panel...${NC}"
mkdir -p $INSTALL_DIR
cp -r * $INSTALL_DIR/

# Create Python virtual environment
cd $INSTALL_DIR
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Install and build frontend
cd frontend
npm install
npm run build
cd ..

# Create systemd service for backend
cat > /etc/systemd/system/cpanel.service << EOF
[Unit]
Description=Control Panel Backend Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${INSTALL_DIR}
Environment="PATH=${INSTALL_DIR}/.venv/bin:\$PATH"
ExecStart=${INSTALL_DIR}/.venv/bin/python backend/app.py
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Start and enable services
systemctl daemon-reload
systemctl enable cpanel
systemctl start cpanel

# Generate admin credentials
ADMIN_PASSWORD=$(openssl rand -base64 12)

echo -e "${GREEN}Installation Complete!${NC}"
echo -e "${YELLOW}Control Panel Information:${NC}"
echo "URL: http://localhost:$WEBSERVER_PORT"
echo "Admin Username: admin"
echo "Admin Password: $ADMIN_PASSWORD"
echo "MySQL Root Password: $MYSQL_ROOT_PASSWORD"
echo -e "${YELLOW}Please save these credentials!${NC}"

# Save credentials to file
cat > ${INSTALL_DIR}/credentials.txt << EOF
Control Panel Credentials
========================
URL: http://localhost:$WEBSERVER_PORT
Admin Username: admin
Admin Password: $ADMIN_PASSWORD
MySQL Root Password: $MYSQL_ROOT_PASSWORD

Please keep this information secure!
EOF

chmod 600 ${INSTALL_DIR}/credentials.txt

echo -e "${BLUE}Starting Control Panel...${NC}"
echo -e "${GREEN}You can now access your Control Panel at http://localhost${NC}" 
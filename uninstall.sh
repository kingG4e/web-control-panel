#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default ports
CPANEL_HTTP_PORT=9000
CPANEL_HTTPS_PORT=9001
CPANEL_FTP_PORT=9021
CPANEL_SSH_PORT=9022

# Print header
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        Control Panel Uninstaller       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root${NC}"
    exit 1
fi

# Confirm uninstallation
echo -e "${RED}WARNING: This will remove Control Panel and all its data!${NC}"
echo -n "Are you sure you want to continue? [y/N] "
read -r response

if [[ "$response" =~ ^([yY][eE][sS]|[yY])+$ ]]; then
    echo -e "${YELLOW}Starting uninstallation...${NC}"
    
    # Stop services
    echo -e "Stopping services..."
    systemctl stop cpanel mysql nginx vsftpd bind9 php8.1-fpm || true
    
    # Remove MySQL database and user
    if command -v mysql &> /dev/null; then
        echo -e "Removing MySQL database and user..."
        mysql -e "DROP DATABASE IF EXISTS cpanel;" || true
        mysql -e "DROP USER IF EXISTS 'cpanel'@'localhost';" || true
    fi
    
    # Remove installed packages
    echo -e "Removing installed packages..."
    DEBIAN_FRONTEND=noninteractive apt purge -y \
        nginx mysql-server php8.1-fpm php8.1-mysql php8.1-curl \
        php8.1-gd php8.1-mbstring php8.1-xml php8.1-cli nodejs \
        bind9 vsftpd postfix certbot python3-certbot-nginx \
        fail2ban > /dev/null 2>&1 || true
        
    # Remove directories and files
    echo -e "Removing Control Panel files..."
    rm -rf /opt/cpanel || true
    rm -rf /etc/cpanel || true
    rm -rf /var/www/websites || true
    rm -f /etc/nginx/sites-*/cpanel.conf || true
    rm -f /etc/systemd/system/cpanel.service || true
    rm -f /etc/logrotate.d/cpanel || true
    rm -rf /var/log/cpanel || true
    
    # Remove MySQL data backup if exists
    rm -rf /var/lib/mysql.bak || true
    
    # Reset firewall rules
    echo -e "Resetting firewall rules..."
    if command -v ufw &> /dev/null; then
        ufw delete allow ${CPANEL_HTTP_PORT}/tcp > /dev/null 2>&1 || true
        ufw delete allow ${CPANEL_HTTPS_PORT}/tcp > /dev/null 2>&1 || true
        ufw delete allow ${CPANEL_FTP_PORT}/tcp > /dev/null 2>&1 || true
        ufw delete allow ${CPANEL_SSH_PORT}/tcp > /dev/null 2>&1 || true
    fi
    
    # Clean up system
    echo -e "Cleaning up system..."
    apt autoremove -y > /dev/null 2>&1 || true
    apt clean > /dev/null 2>&1 || true
    
    echo -e "${GREEN}Control Panel has been successfully uninstalled.${NC}"
else
    echo -e "${YELLOW}Uninstallation cancelled.${NC}"
fi 
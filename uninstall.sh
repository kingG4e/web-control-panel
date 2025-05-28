#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run this script as root (use sudo)${NC}"
    exit 1
fi

echo -e "\n${BLUE}Starting uninstallation...${NC}"

# Stop services
echo -e "\n${BLUE}Stopping services...${NC}"
systemctl stop nginx
systemctl stop php8.1-fpm
systemctl stop mariadb
systemctl stop vsftpd
systemctl stop fail2ban

# Remove packages
echo -e "\n${BLUE}Removing packages...${NC}"
apt remove -y nginx php8.1-fpm mariadb-server vsftpd fail2ban
apt autoremove -y

# Remove configuration files
echo -e "\n${BLUE}Removing configuration files...${NC}"
rm -rf /etc/nginx/sites-available/cpanel.conf
rm -rf /etc/nginx/sites-enabled/cpanel.conf
rm -rf /etc/php/8.1/fpm/pool.d/cpanel.conf
rm -rf /etc/mysql/mariadb.conf.d/50-server.cnf
rm -rf /etc/vsftpd.conf
rm -rf /etc/fail2ban/jail.local

# Remove data directories
echo -e "\n${BLUE}Removing data directories...${NC}"
rm -rf /var/www/html/*
rm -rf /var/lib/mysql/*
rm -rf /var/log/nginx/*
rm -rf /var/log/php8.1-fpm.log
rm -rf /var/log/mysql/*
rm -rf /var/log/vsftpd.log

# Remove credentials
echo -e "\n${BLUE}Removing credentials...${NC}"
rm -rf /root/cpanel-credentials.txt
rm -rf /root/cpanel-backup

# Reset firewall
echo -e "\n${BLUE}Resetting firewall...${NC}"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw --force enable

# Remove repositories
echo -e "\n${BLUE}Removing repositories...${NC}"
add-apt-repository -y --remove ppa:ondrej/php
rm -rf /etc/apt/sources.list.d/mariadb.list

# Update package list
echo -e "\n${BLUE}Updating package list...${NC}"
apt update

echo -e "\n${GREEN}Uninstallation completed successfully!${NC}"
echo -e "\nThe system has been restored to its original state."
echo -e "You can now reinstall the control panel if needed." 
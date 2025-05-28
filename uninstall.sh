#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root${NC}"
    echo "Usage: sudo ./uninstall.sh"
    exit 1
fi

# Function to show progress
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

# Confirm uninstallation
echo -e "${RED}╔════════════════════════════════════════╗${NC}"
echo -e "${RED}║        Control Panel Uninstaller       ║${NC}"
echo -e "${RED}╚════════════════════════════════════════╝${NC}"
echo
echo -e "${RED}WARNING: This will remove Control Panel and all its data!${NC}"
read -p "Are you sure you want to continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}Uninstallation cancelled.${NC}"
    exit 1
fi

TOTAL_STEPS=6
CURRENT_STEP=0

# Stop services
CURRENT_STEP=$((CURRENT_STEP + 1))
show_progress $CURRENT_STEP $TOTAL_STEPS "Stopping services"
systemctl stop nginx php8.1-fpm mysql vsftpd

# Remove database and users
CURRENT_STEP=$((CURRENT_STEP + 1))
show_progress $CURRENT_STEP $TOTAL_STEPS "Removing database"
mysql -e "DROP DATABASE IF EXISTS cpanel;"
mysql -e "DROP USER IF EXISTS 'cpanel'@'localhost';"

# Remove installed packages
CURRENT_STEP=$((CURRENT_STEP + 1))
show_progress $CURRENT_STEP $TOTAL_STEPS "Removing packages"
apt purge -y nginx mysql* php8.1* vsftpd bind9 certbot python3-certbot-nginx nodejs npm \
    libpam-mysql libnss-mysql fail2ban > /dev/null 2>&1
apt autoremove -y > /dev/null 2>&1

# Remove configuration files
CURRENT_STEP=$((CURRENT_STEP + 1))
show_progress $CURRENT_STEP $TOTAL_STEPS "Removing configuration files"
rm -rf /etc/nginx/sites-available/cpanel.conf
rm -rf /etc/nginx/sites-enabled/cpanel.conf
rm -rf /etc/php
rm -rf /etc/mysql
rm -rf /etc/vsftpd.conf
rm -rf /etc/cpanel
rm -rf /var/lib/mysql
rm -rf /var/www/html/*
rm -f /etc/pam.d/cpanel
rm -f /etc/libnss-mysql.cfg
rm -f /usr/local/bin/cpanel-add-system-user

# Remove installation directory
CURRENT_STEP=$((CURRENT_STEP + 1))
show_progress $CURRENT_STEP $TOTAL_STEPS "Removing installation files"
rm -rf /opt/cpanel
rm -f /root/cpanel-credentials.txt

# Reset firewall rules
CURRENT_STEP=$((CURRENT_STEP + 1))
show_progress $CURRENT_STEP $TOTAL_STEPS "Resetting firewall rules"
# Read custom ports if they exist
if [ -f /etc/cpanel/ports.conf ]; then
    source /etc/cpanel/ports.conf
    ufw delete allow ${HTTP_PORT}/tcp
    ufw delete allow ${HTTPS_PORT}/tcp
    ufw delete allow ${FTP_PORT}/tcp
    ufw delete allow ${SSH_PORT}/tcp
else
    # Delete default ports
    ufw delete allow 9000/tcp
    ufw delete allow 9001/tcp
    ufw delete allow 9021/tcp
    ufw delete allow 9022/tcp
fi

# Final message
echo -e "\n${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║      Uninstallation Complete! 🗑️        ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo -e "\n${BLUE}The Control Panel has been completely removed from your system.${NC}"
echo -e "${BLUE}If you want to reinstall, run: sudo ./quick-install.sh${NC}" 
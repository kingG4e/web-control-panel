#!/bin/bash

# Exit on error
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root${NC}"
    exit 1
fi

echo -e "${YELLOW}This will completely remove the Control Panel and all its data.${NC}"
echo -e "${RED}This action cannot be undone!${NC}"
read -p "Are you sure you want to continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo -e "${GREEN}Uninstallation cancelled.${NC}"
    exit 1
fi

# Stop and disable services
echo -e "${YELLOW}Stopping services...${NC}"
systemctl stop cpanel
systemctl disable cpanel

# Remove systemd service
echo -e "${YELLOW}Removing systemd service...${NC}"
rm -f /etc/systemd/system/cpanel.service
systemctl daemon-reload

# Remove nginx configuration
echo -e "${YELLOW}Removing nginx configuration...${NC}"
rm -f /etc/nginx/sites-enabled/cpanel.conf
rm -f /etc/nginx/sites-available/cpanel.conf
systemctl reload nginx

# Remove logrotate configuration
echo -e "${YELLOW}Removing logrotate configuration...${NC}"
rm -f /etc/logrotate.d/cpanel

# Remove database
echo -e "${YELLOW}Removing database...${NC}"
sudo -u postgres psql -c "DROP DATABASE IF EXISTS cpanel;"
sudo -u postgres psql -c "DROP USER IF EXISTS cpanel;"

# Remove installation directory
echo -e "${YELLOW}Removing installation directory...${NC}"
rm -rf /opt/cpanel

# Remove logs
echo -e "${YELLOW}Removing logs...${NC}"
rm -rf /var/log/cpanel

echo -e "${GREEN}Control Panel has been successfully uninstalled.${NC}"
echo -e "${YELLOW}Note: This script did not remove the following:${NC}"
echo -e "1. System packages (nginx, postgresql, etc.)"
echo -e "2. SSL certificates"
echo -e "3. Node.js"
echo -e "If you want to remove these, please do so manually." 
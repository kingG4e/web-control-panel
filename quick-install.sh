#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root${NC}"
    echo "Usage: sudo bash quick-install.sh"
    exit 1
fi

# Check OS
if ! grep -q "Ubuntu" /etc/os-release; then
    echo -e "${RED}This script only supports Ubuntu Server${NC}"
    exit 1
fi

# Welcome message
clear
echo -e "${GREEN}Welcome to Control Panel Quick Installation${NC}"
echo -e "${YELLOW}This script will automatically install and configure everything for you.${NC}"
echo "------------------------------------------------"
echo -e "${YELLOW}System Requirements:${NC}"
echo "- Ubuntu Server 20.04 or newer"
echo "- Minimum 2GB RAM"
echo "- 20GB free disk space"
echo "------------------------------------------------"

# Confirm installation
read -p "Do you want to continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Installation cancelled.${NC}"
    exit 1
fi

# Get server info
echo -e "\n${YELLOW}Detecting system information...${NC}"
SERVER_IP=$(hostname -I | cut -d' ' -f1)
HOSTNAME=$(hostname)
TOTAL_RAM=$(free -m | awk '/^Mem:/{print $2}')
FREE_DISK=$(df -h / | awk 'NR==2 {print $4}')

echo "Server IP: $SERVER_IP"
echo "Hostname: $HOSTNAME"
echo "Total RAM: $TOTAL_RAM MB"
echo "Free Disk Space: $FREE_DISK"

# Check minimum requirements
if [ $TOTAL_RAM -lt 2048 ]; then
    echo -e "${RED}Error: Minimum 2GB RAM required. Current: $TOTAL_RAM MB${NC}"
    exit 1
fi

# Update system
echo -e "\n${YELLOW}Updating system packages...${NC}"
apt update && apt upgrade -y

# Install dependencies
echo -e "\n${YELLOW}Installing required packages...${NC}"
apt install -y git curl wget

# Set installation directory
INSTALL_DIR="/opt/cpanel"
REPO_URL="https://github.com/yourusername/controlpanel.git"

# Download control panel
echo -e "\n${YELLOW}Downloading Control Panel...${NC}"
git clone $REPO_URL $INSTALL_DIR
cd $INSTALL_DIR

# Make scripts executable
chmod +x install.sh
chmod +x uninstall.sh

# Generate configuration
echo -e "\n${YELLOW}Generating initial configuration...${NC}"
cat > config.ini << EOF
[server]
hostname=$HOSTNAME
ip=$SERVER_IP
install_dir=$INSTALL_DIR

[database]
type=mysql
host=localhost
port=3306

[web]
server=nginx
php_version=8.1

[email]
server=postfix
antispam=spamassassin

[dns]
server=bind9

[ftp]
server=vsftpd

[ssl]
provider=letsencrypt
auto_renew=true

[backup]
enabled=true
schedule=daily
retention=7
EOF

# Run main installation
echo -e "\n${YELLOW}Starting main installation...${NC}"
./install.sh --auto-mode --config config.ini

# Final check
if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}Installation completed successfully!${NC}"
    echo -e "\nControl Panel URL: http://$SERVER_IP"
    echo -e "Admin credentials are saved in: $INSTALL_DIR/credentials.txt"
    echo -e "\n${YELLOW}Important: Please save your credentials and delete credentials.txt file${NC}"
    
    # Setup basic firewall
    echo -e "\n${YELLOW}Setting up basic firewall...${NC}"
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw allow 22/tcp
    ufw allow 21/tcp
    ufw allow 53/tcp
    ufw allow 53/udp
    
    # Show services status
    echo -e "\n${YELLOW}Services status:${NC}"
    systemctl status nginx | grep Active
    systemctl status mysql | grep Active
    systemctl status php8.1-fpm | grep Active
    
    # Show resource usage
    echo -e "\n${YELLOW}Current resource usage:${NC}"
    echo "CPU Usage: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}')%"
    echo "Memory Usage: $(free -m | awk 'NR==2{printf "%.2f%%", $3*100/$2}')"
    echo "Disk Usage: $(df -h / | awk 'NR==2{print $5}')"
else
    echo -e "\n${RED}Installation failed. Please check the logs for details.${NC}"
    echo "Log file: $INSTALL_DIR/install.log"
fi

# Add to startup
echo -e "\n${YELLOW}Adding services to startup...${NC}"
systemctl enable nginx mysql php8.1-fpm

echo -e "\n${GREEN}Setup complete!${NC}"
echo -e "You can now access your control panel at: http://$SERVER_IP"
echo -e "Please save your credentials and secure your server." 
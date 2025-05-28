#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root${NC}"
    echo "To install, run this command:"
    echo -e "${GREEN}wget -O - https://raw.githubusercontent.com/kingG4e/web-control-panel/main/quick-install.sh | sudo bash${NC}"
    exit 1
fi

# Clear screen and show welcome message
clear
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║      Control Panel Quick Installer      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo

# Function to show spinner
spinner() {
    local pid=$1
    local delay=0.1
    local spinstr='|/-\'
    while [ "$(ps a | awk '{print $1}' | grep $pid)" ]; do
        local temp=${spinstr#?}
        printf "\r[%c] Installing..." "$spinstr"
        local spinstr=$temp${spinstr%"$temp"}
        sleep $delay
    done
    printf "\r   \n"
}

# Function to check system requirements
check_requirements() {
    echo -e "${BLUE}[1/4]${NC} Checking system requirements..."
    
    # Check OS
    if ! grep -q "Ubuntu" /etc/os-release; then
        echo -e "${RED}Error: This script only supports Ubuntu Server${NC}"
        exit 1
    fi

    # Check RAM
    local total_ram=$(free -m | awk '/^Mem:/{print $2}')
    if [ $total_ram -lt 2048 ]; then
        echo -e "${RED}Error: Minimum 2GB RAM required${NC}"
        exit 1
    fi

    # Check Disk Space
    local free_space=$(df -m / | awk 'NR==2 {print $4}')
    if [ $free_space -lt 20480 ]; then
        echo -e "${RED}Error: Minimum 20GB free disk space required${NC}"
        exit 1
    fi

    echo -e "${GREEN}✓${NC} System requirements met"
}

# Function to prepare system
prepare_system() {
    echo -e "\n${BLUE}[2/4]${NC} Preparing system..."
    
    # Update system silently
    apt update -qq > /dev/null 2>&1
    apt upgrade -y -qq > /dev/null 2>&1
    
    # Remove conflicting packages
    apt purge -y apache2* mysql* mariadb* > /dev/null 2>&1
    
    echo -e "${GREEN}✓${NC} System prepared"
}

# Function to install components
install_components() {
    echo -e "\n${BLUE}[3/4]${NC} Installing components..."
    
    # Add required repositories
    add-apt-repository -y ppa:ondrej/php > /dev/null 2>&1
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - > /dev/null 2>&1
    
    # Install packages silently
    DEBIAN_FRONTEND=noninteractive apt install -y nginx mysql-server php8.1-fpm php8.1-mysql \
        php8.1-curl php8.1-gd php8.1-mbstring php8.1-xml php8.1-cli nodejs bind9 vsftpd \
        postfix certbot python3-certbot-nginx fail2ban ufw > /dev/null 2>&1
    
    echo -e "${GREEN}✓${NC} Components installed"
}

# Function to configure system
configure_system() {
    echo -e "\n${BLUE}[4/4]${NC} Configuring system..."
    
    # Generate secure passwords
    local db_pass=$(openssl rand -base64 12)
    local admin_pass=$(openssl rand -base64 12)
    
    # Configure MySQL
    mysql -u root << EOF > /dev/null 2>&1
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '${db_pass}';
CREATE DATABASE IF NOT EXISTS cpanel;
CREATE USER IF NOT EXISTS 'cpanel'@'localhost' IDENTIFIED BY '${db_pass}';
GRANT ALL PRIVILEGES ON cpanel.* TO 'cpanel'@'localhost';
FLUSH PRIVILEGES;
EOF
    
    # Configure firewall
    ufw allow 80/tcp > /dev/null 2>&1
    ufw allow 443/tcp > /dev/null 2>&1
    ufw allow 22/tcp > /dev/null 2>&1
    ufw allow 21/tcp > /dev/null 2>&1
    ufw allow 53/tcp > /dev/null 2>&1
    ufw allow 53/udp > /dev/null 2>&1
    
    # Save credentials
    cat > /root/cpanel-credentials.txt << EOF
Control Panel Credentials
========================
URL: http://$(hostname -I | cut -d' ' -f1)
Admin Username: admin
Admin Password: ${admin_pass}
Database Root Password: ${db_pass}

IMPORTANT: Please save these credentials and delete this file!
EOF
    chmod 600 /root/cpanel-credentials.txt
    
    echo -e "${GREEN}✓${NC} System configured"
}

# Main installation process
echo "Starting installation..."
check_requirements
prepare_system
install_components
configure_system

# Show completion message
echo -e "\n${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║      Installation Complete! 🎉          ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo -e "\nYour credentials have been saved to: /root/cpanel-credentials.txt"
echo -e "Control Panel URL: http://$(hostname -I | cut -d' ' -f1)"
echo -e "\n${RED}Important:${NC} Please save your credentials and delete the credentials file!" 
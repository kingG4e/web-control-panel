#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Setting up Control Panel...${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run this script as root (use sudo)${NC}"
    exit 1
fi

# Install MariaDB if not installed
if ! command -v mariadb &> /dev/null; then
    echo -e "${BLUE}Installing MariaDB...${NC}"
    apt-get update
    apt-get install -y mariadb-server mariadb-client
    systemctl start mariadb
    systemctl enable mariadb
fi

# Configure MariaDB
echo -e "${BLUE}Configuring MariaDB...${NC}"
mysql -e "CREATE DATABASE IF NOT EXISTS cpanel;"
mysql -e "CREATE USER IF NOT EXISTS 'cpanel'@'localhost' IDENTIFIED BY 'cpanel';"
mysql -e "GRANT ALL PRIVILEGES ON cpanel.* TO 'cpanel'@'localhost';"
mysql -e "FLUSH PRIVILEGES;"

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Python 3 is not installed. Installing...${NC}"
    apt-get install -y python3 python3-pip python3-venv
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed. Installing...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
    apt-get install -y nodejs
fi

# Create virtual environment
echo -e "${BLUE}Creating Python virtual environment...${NC}"
python3 -m venv .venv
source .venv/bin/activate

# Install Python dependencies
echo -e "${BLUE}Installing Python dependencies...${NC}"
pip install -r requirements.txt

# Install Node.js dependencies
echo -e "${BLUE}Installing Node.js dependencies...${NC}"
cd frontend
npm install

# Build frontend
echo -e "${BLUE}Building frontend...${NC}"
npm run build

cd ..

echo -e "${GREEN}Setup completed successfully!${NC}"
echo -e "${YELLOW}Starting servers...${NC}"

# Start backend server in background
echo -e "${BLUE}Starting backend server...${NC}"
python backend/app.py &

# Wait for backend to start
sleep 5

# Start frontend server
echo -e "${BLUE}Starting frontend server...${NC}"
cd frontend && npm start 
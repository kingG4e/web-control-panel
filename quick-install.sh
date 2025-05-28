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

# Download and run install script
echo -e "\n${BLUE}Downloading installation script...${NC}"
wget -q https://raw.githubusercontent.com/kingG4e/web-control-panel/main/install.sh -O install.sh

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Download successful${NC}"
    chmod +x install.sh
    ./install.sh
else
    echo -e "${RED}Failed to download installation script${NC}"
    exit 1
fi 
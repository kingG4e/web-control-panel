#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}Web Hosting Control Panel Installer${NC}"
echo "=============================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root (use sudo)${NC}"
    exit 1
fi

# Get installation directory
INSTALL_DIR="/opt/controlpanel"
echo -e "${BLUE}Installation Directory: $INSTALL_DIR${NC}"

# Get admin username (system user)
while true; do
    read -p "Enter system username for admin access: " ADMIN_USER
    if [ -z "$ADMIN_USER" ]; then
        echo -e "${RED}Username is required${NC}"
        continue
    fi
    
    # Check if user exists
    if id "$ADMIN_USER" >/dev/null 2>&1; then
        break
    else
        echo -e "${RED}User $ADMIN_USER does not exist in the system${NC}"
    fi
done

# Get database password
read -s -p "Enter database password for control panel: " DB_PASSWORD
echo
if [ -z "$DB_PASSWORD" ]; then
    echo -e "${RED}Database password is required${NC}"
    exit 1
fi

echo -e "\n${GREEN}Starting installation...${NC}"

# Update system
echo -e "${BLUE}Updating system packages...${NC}"
apt update && apt upgrade -y

# Install dependencies
echo -e "${BLUE}Installing system dependencies...${NC}"
apt install -y python3-pip python3-venv postgresql postgresql-contrib git

# Install Node.js
echo -e "${BLUE}Installing Node.js...${NC}"
curl -fsSL https://deb.nodesource.com/setup_16.x | bash -
apt install -y nodejs

# Create installation directory
mkdir -p $INSTALL_DIR
cd $INSTALL_DIR

# Clone repository
echo -e "${BLUE}Cloning repository...${NC}"
git clone https://github.com/kingG4e/web-control-panel.git .

# Setup Python virtual environment
echo -e "${BLUE}Setting up Python environment...${NC}"
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Setup database
echo -e "${BLUE}Setting up database...${NC}"
sudo -u postgres psql << EOF
CREATE DATABASE controlpanel;
CREATE USER cpanel WITH PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE controlpanel TO cpanel;
EOF

# Configure database connection
cat > backend/config.py << EOF
SQLALCHEMY_DATABASE_URI = 'postgresql://cpanel:$DB_PASSWORD@localhost/controlpanel'
SQLALCHEMY_TRACK_MODIFICATIONS = False
SECRET_KEY = '$(openssl rand -hex 32)'
PORT = 12345
EOF

# Create initial admin user in database
echo -e "${BLUE}Creating admin user...${NC}"
ADMIN_UID=$(id -u $ADMIN_USER)
sudo -u postgres psql controlpanel << EOF
INSERT INTO users (username, email, is_active, is_system_user, system_uid, role) 
VALUES ('$ADMIN_USER', '$ADMIN_USER@localhost', true, true, $ADMIN_UID, 'admin');
EOF

# Run database migrations
echo -e "${BLUE}Running database migrations...${NC}"
cd backend
python manage.py db upgrade
cd ..

# Build frontend
echo -e "${BLUE}Building frontend...${NC}"
cd frontend
# Update package.json for port 12345
sed -i 's/"dev": "vite"/"dev": "vite --port 12345"/' package.json
npm install
npm run build
cd ..

# Configure systemd services
echo -e "${BLUE}Configuring system services...${NC}"

# Backend service
cat > /etc/systemd/system/cpanel-backend.service << EOF
[Unit]
Description=Control Panel Backend
After=network.target postgresql.service

[Service]
User=www-data
WorkingDirectory=$INSTALL_DIR/backend
Environment="PATH=$INSTALL_DIR/venv/bin"
ExecStart=$INSTALL_DIR/venv/bin/python app.py
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Frontend service
cat > /etc/systemd/system/cpanel-frontend.service << EOF
[Unit]
Description=Control Panel Frontend
After=network.target

[Service]
User=www-data
WorkingDirectory=$INSTALL_DIR/frontend
Environment="PATH=/usr/bin"
ExecStart=/usr/bin/npm run dev
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Set permissions
chown -R www-data:www-data $INSTALL_DIR
chmod -R 755 $INSTALL_DIR

# Start and enable services
systemctl daemon-reload
systemctl enable cpanel-backend cpanel-frontend
systemctl start cpanel-backend cpanel-frontend

# Configure firewall if enabled
if command -v ufw >/dev/null; then
    echo -e "${BLUE}Configuring firewall...${NC}"
    ufw allow 12345/tcp
    ufw allow OpenSSH
fi

# Final steps
echo -e "${GREEN}Installation completed!${NC}"
echo -e "Your control panel is now available at: http://localhost:12345"
echo -e "\nAdmin access:"
echo -e "Username: $ADMIN_USER (your system user)"
echo -e "Password: Your system user password"
echo -e "\n${BLUE}Note: Login using your system user credentials${NC}"

# Create quick management script
cat > /usr/local/bin/cpanel << EOF
#!/bin/bash
case "\$1" in
    start)
        systemctl start cpanel-backend cpanel-frontend
        ;;
    stop)
        systemctl stop cpanel-backend cpanel-frontend
        ;;
    restart)
        systemctl restart cpanel-backend cpanel-frontend
        ;;
    status)
        systemctl status cpanel-backend cpanel-frontend
        ;;
    logs)
        echo "Backend logs:"
        journalctl -u cpanel-backend -f &
        echo "Frontend logs:"
        journalctl -u cpanel-frontend -f
        ;;
    *)
        echo "Usage: cpanel {start|stop|restart|status|logs}"
        exit 1
        ;;
esac
EOF

chmod +x /usr/local/bin/cpanel

echo -e "\n${BLUE}Quick management commands:${NC}"
echo "cpanel start   - Start the control panel"
echo "cpanel stop    - Stop the control panel"
echo "cpanel restart - Restart the control panel"
echo "cpanel status  - Check control panel status"
echo "cpanel logs    - View control panel logs"

# เริ่มต้น git repository
git init

# เพิ่มไฟล์ทั้งหมด
git add .

# Commit ครั้งแรก
git commit -m "Initial commit"

# เพิ่ม remote repository
git remote add origin https://github.com/yourusername/controlpanel.git

# Push ขึ้น GitHub
git push -u origin main 
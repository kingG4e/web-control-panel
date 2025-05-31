#!/bin/bash

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Please run as root (use sudo)"
    exit 1
fi

# Check if running on Ubuntu
if ! grep -q "Ubuntu" /etc/os-release; then
    echo "This script is designed for Ubuntu systems"
    exit 1
fi

echo "Starting Control Panel Setup..."

# Define secure port for control panel
CONTROL_PANEL_PORT=2087  # Standard secure port like cPanel

# Auto detect server IP
echo "Detecting server IP..."
if command -v curl &> /dev/null; then
    SERVER_IP=$(curl -s ifconfig.me)
elif command -v wget &> /dev/null; then
    SERVER_IP=$(wget -qO- ifconfig.me)
else
    SERVER_IP=$(hostname -I | awk '{print $1}')
fi

if [ -z "$SERVER_IP" ]; then
    echo "Could not detect server IP automatically."
    read -p "Please enter server IP address manually: " SERVER_IP
else
    echo "Detected server IP: $SERVER_IP"
    read -p "Is this IP correct? (y/n): " CONFIRM_IP
    if [ "$CONFIRM_IP" != "y" ]; then
        read -p "Please enter correct server IP: " SERVER_IP
    fi
fi

# Ask for domain name
read -p "Domain name (leave empty if none): " DOMAIN_NAME

# Install required packages
echo "Installing required packages..."
apt-get update
apt-get install -y nginx redis-server curl python3 python3-venv python3-dev build-essential libssl-dev nodejs npm certbot python3-certbot-nginx

# Install Redis if not present
systemctl enable redis-server
systemctl start redis-server

# Create Python virtual environment
echo "Creating Python virtual environment..."
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
echo "Installing Python dependencies..."
pip install wheel  # Ensure wheel is installed first
pip install -r requirements.txt

# Install Node.js dependencies and build frontend
echo "Installing Node.js dependencies..."
cd frontend
npm install
npm run build
cd ..

# Create necessary directories
echo "Creating necessary directories..."
mkdir -p logs
mkdir -p instance
chown -R www-data:www-data logs instance

# Set up environment variables
echo "Setting up environment variables..."
cat > .env << EOL
FLASK_APP=backend/app.py
FLASK_ENV=production
SECRET_KEY=$(python3 -c 'import secrets; print(secrets.token_hex(32))')
JWT_SECRET_KEY=$(python3 -c 'import secrets; print(secrets.token_hex(32))')
DATABASE_URL=sqlite:///instance/controlpanel.db
REDIS_URL=redis://localhost:6379/0
CONTROL_PANEL_PORT=${CONTROL_PANEL_PORT}
SERVER_IP=${SERVER_IP}
ALLOWED_HOSTS=${SERVER_IP},localhost,127.0.0.1
EOL

if [ ! -z "$DOMAIN_NAME" ]; then
    echo "DOMAIN_NAME=${DOMAIN_NAME}" >> .env
fi

# Configure Nginx for control panel
echo "Configuring Nginx..."
cat > /etc/nginx/sites-available/controlpanel << EOL
# Regular web traffic (80/443)
server {
    listen 80;
    listen 443 ssl http2;
    server_name ${DOMAIN_NAME:-$SERVER_IP};

    # Redirect all regular web traffic to control panel port
    return 301 https://\$host:${CONTROL_PANEL_PORT}\$request_uri;
}

# Control Panel (secure port)
server {
    listen ${CONTROL_PANEL_PORT} ssl http2;
    server_name ${DOMAIN_NAME:-$SERVER_IP};

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/\${server_name}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/\${server_name}/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # SSL optimization
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Frontend
    root $(pwd)/frontend/build;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    # API endpoints
    location /api {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # Additional security for API
        limit_req zone=api burst=20 nodelay;
        limit_req_status 429;
    }

    # WebSocket support
    location /socket.io {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}

# Rate limiting
limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
EOL

# Enable Nginx site
ln -sf /etc/nginx/sites-available/controlpanel /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Create systemd service file
echo "Creating systemd service..."
cat > /etc/systemd/system/controlpanel.service << EOL
[Unit]
Description=Control Panel Service
After=network.target redis.service
Wants=redis.service

[Service]
User=www-data
Group=www-data
WorkingDirectory=$(pwd)
Environment="PATH=$(pwd)/venv/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
ExecStart=$(pwd)/venv/bin/gunicorn --workers 3 --bind 127.0.0.1:5000 'backend.app:app' --access-logfile logs/access.log --error-logfile logs/error.log
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOL

# Set correct permissions
echo "Setting permissions..."
chown -R www-data:www-data .
chmod -R 755 .
chmod 700 .env
chmod -R 700 instance

# Configure firewall
echo "Configuring firewall..."
ufw allow ${CONTROL_PANEL_PORT}/tcp comment 'Control Panel'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'

# Start and enable services
echo "Starting services..."
systemctl daemon-reload
systemctl enable --now redis-server
systemctl enable --now controlpanel
systemctl enable --now nginx

echo "Control Panel setup completed!"
if [ ! -z "$DOMAIN_NAME" ]; then
    echo "Setting up SSL with Let's Encrypt..."
    certbot --nginx -d $DOMAIN_NAME --non-interactive --agree-tos --email admin@$DOMAIN_NAME
    echo "You can access the Control Panel at:"
    echo "https://${DOMAIN_NAME}:${CONTROL_PANEL_PORT}"
else
    echo "Generating self-signed SSL certificate..."
    openssl req -x509 -newkey rsa:4096 -nodes -keyout /etc/ssl/private/controlpanel.key -out /etc/ssl/certs/controlpanel.crt -days 365 -subj "/CN=${SERVER_IP}"
    echo "You can access the Control Panel at:"
    echo "https://${SERVER_IP}:${CONTROL_PANEL_PORT}"
fi

echo "Default admin credentials:"
echo "Username: admin"
echo "Password: admin123"
echo ""
echo "IMPORTANT: Please change the admin password after first login!"
echo "Note: The control panel runs on port ${CONTROL_PANEL_PORT} for enhanced security." 
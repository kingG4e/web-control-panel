#!/bin/bash

# Enhanced Control Panel Installer
# Version: 2.0
# Author: Your Name
# Last Modified: $(date +%Y-%m-%d)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
INSTALL_DIR="/opt/controlpanel"
LOG_FILE="/var/log/controlpanel_install.log"
SERVICE_USER="cpuser"

# Port Configuration
CPANEL_HTTP_PORT=2080
CPANEL_HTTPS_PORT=2083
CPANEL_API_PORT=5000

# Database Configuration
DB_NAME="controlpanel"
DB_USER="cpadmin"

# Initialize logging
init_logging() {
    exec > >(tee -a "${LOG_FILE}") 2>&1
    echo -e "\n${CYAN}Installation started at $(date)${NC}" >> "${LOG_FILE}"
}

# Logging function
log() {
    local level=$1
    local message=$2
    local timestamp=$(date +"%Y-%m-%d %H:%M:%S")
    
    case $level in
        "INFO") color="${BLUE}" ;;
        "SUCCESS") color="${GREEN}" ;;
        "WARNING") color="${YELLOW}" ;;
        "ERROR") color="${RED}" ;;
        *) color="${NC}" ;;
    esac
    
    echo -e "${color}[${timestamp}] [${level}] ${message}${NC}" | tee -a "${LOG_FILE}"
}

# Error handling
error_exit() {
    log "ERROR" "$1"
    exit 1
}

# Check command success
check_success() {
    if [ $? -ne 0 ]; then
        error_exit "$1"
    fi
}

# Detect Linux distribution
detect_distribution() {
    log "INFO" "Detecting Linux distribution..."
    
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        DISTRO=$ID
        VERSION=$VERSION_ID
        log "INFO" "Detected distribution: ${DISTRO} ${VERSION}"
    else
        error_exit "Cannot detect Linux distribution"
    fi
}

# Create dedicated user
create_service_user() {
    log "INFO" "Creating service user: ${SERVICE_USER}..."
    
    if id "${SERVICE_USER}" &>/dev/null; then
        log "WARNING" "User ${SERVICE_USER} already exists"
    else
        useradd -r -s /bin/false -d "${INSTALL_DIR}" "${SERVICE_USER}"
        check_success "Failed to create user ${SERVICE_USER}"
        
        mkdir -p "${INSTALL_DIR}"
        chown "${SERVICE_USER}:${SERVICE_USER}" "${INSTALL_DIR}"
        log "SUCCESS" "Created service user ${SERVICE_USER}"
    fi
}

# Install system dependencies
install_dependencies() {
    log "INFO" "Installing system dependencies..."
    
    case $DISTRO in
        "ubuntu"|"debian")
            apt-get update -qq
            DEBIAN_FRONTEND=noninteractive apt-get install -y \
                python3 python3-pip python3-venv python3-dev \
                nodejs npm build-essential \
                nginx mariadb-server redis-server \
                libmariadb-dev libssl-dev \
                curl git unzip ufw \
                || error_exit "Failed to install dependencies"
            ;;
            
        "centos"|"rhel"|"fedora")
            dnf install -y epel-release
            dnf install -y \
                python3 python3-pip python3-devel \
                nodejs npm nginx mariadb-server redis \
                gcc gcc-c++ make mariadb-devel openssl-devel \
                curl git unzip firewalld \
                || error_exit "Failed to install dependencies"
            ;;
            
        "arch")
            pacman -Sy --noconfirm \
                python python-pip nodejs npm \
                nginx mariadb redis \
                base-devel mariadb-libs curl git unzip \
                || error_exit "Failed to install dependencies"
            ;;
            
        *)
            error_exit "Unsupported distribution: ${DISTRO}"
            ;;
    esac
    
    log "SUCCESS" "System dependencies installed"
}

# Setup Python environment
setup_python() {
    log "INFO" "Setting up Python environment..."
    
    cd "${INSTALL_DIR}" || error_exit "Failed to enter installation directory"
    
    # Create virtual environment
    python3 -m venv .venv || error_exit "Failed to create Python virtual environment"
    source .venv/bin/activate
    
    # Upgrade pip and setuptools
    pip install --upgrade pip setuptools wheel || error_exit "Failed to upgrade pip"
    
    # Install Python requirements
    if [ -f "requirements.txt" ]; then
        pip install -r requirements.txt || error_exit "Failed to install Python requirements"
    else
        error_exit "requirements.txt not found"
    fi
    
    log "SUCCESS" "Python environment setup complete"
}

# Setup Node.js and frontend
setup_frontend() {
    log "INFO" "Setting up frontend..."
    
    if [ ! -d "frontend" ]; then
        error_exit "Frontend directory not found"
    fi
    
    cd frontend || error_exit "Failed to enter frontend directory"
    
    # Clean and install Node modules
    rm -rf node_modules package-lock.json
    npm install --silent || error_exit "Failed to install Node.js dependencies"
    
    # Build frontend
    npm run build --silent || error_exit "Failed to build frontend"
    
    # Deploy to web directory
    mkdir -p /var/www/controlpanel
    cp -r build/* /var/www/controlpanel/
    chown -R "${SERVICE_USER}:${SERVICE_USER}" /var/www/controlpanel
    
    cd ..
    log "SUCCESS" "Frontend setup complete"
}

# Configure database
configure_database() {
    log "INFO" "Configuring database..."
    
    # Generate secure passwords
    DB_ROOT_PASSWORD=$(openssl rand -base64 24)
    DB_USER_PASSWORD=$(openssl rand -base64 24)
    
    # Save credentials securely
    mkdir -p /etc/controlpanel
    cat > /etc/controlpanel/db_credentials.conf <<EOF
[mysql]
root_password=${DB_ROOT_PASSWORD}
user_password=${DB_USER_PASSWORD}
EOF
    chmod 600 /etc/controlpanel/db_credentials.conf
    chown "${SERVICE_USER}:${SERVICE_USER}" /etc/controlpanel/db_credentials.conf
    
    # Start and enable MariaDB
    systemctl start mariadb || error_exit "Failed to start MariaDB"
    systemctl enable mariadb || error_exit "Failed to enable MariaDB"
    
    # Secure MariaDB installation
    mysql -u root <<EOF
ALTER USER 'root'@'localhost' IDENTIFIED BY '${DB_ROOT_PASSWORD}';
DELETE FROM mysql.user WHERE User='';
DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');
DROP DATABASE IF EXISTS test;
DELETE FROM mysql.db WHERE Db='test' OR Db='test\\_%';
CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_USER_PASSWORD}';
GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
EOF
    check_success "Failed to configure MariaDB"
    
    log "SUCCESS" "Database configuration complete"
}

# Configure Redis
configure_redis() {
    log "INFO" "Configuring Redis..."
    
    systemctl start redis || error_exit "Failed to start Redis"
    systemctl enable redis || error_exit "Failed to enable Redis"
    
    # Configure Redis to listen on localhost only
    sed -i 's/^bind .*/bind 127.0.0.1/' /etc/redis/redis.conf
    
    systemctl restart redis || error_exit "Failed to restart Redis"
    log "SUCCESS" "Redis configuration complete"
}

# Configure Nginx
configure_nginx() {
    log "INFO" "Configuring Nginx..."
    
    # Create Nginx configuration
    cat > /etc/nginx/conf.d/controlpanel.conf <<EOF
server {
    listen ${CPANEL_HTTP_PORT};
    listen [::]:${CPANEL_HTTP_PORT};
    server_name _;
    
    root /var/www/controlpanel;
    index index.html;
    
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://127.0.0.1:${CPANEL_API_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    
    # Static file caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF
    
    # Test and reload Nginx
    nginx -t || error_exit "Nginx configuration test failed"
    systemctl restart nginx || error_exit "Failed to restart Nginx"
    
    log "SUCCESS" "Nginx configuration complete"
}

# Create systemd service
create_systemd_service() {
    log "INFO" "Creating systemd service..."
    
    cat > /etc/systemd/system/controlpanel.service <<EOF
[Unit]
Description=Control Panel Backend Service
After=network.target mariadb.service redis.service

[Service]
User=${SERVICE_USER}
Group=${SERVICE_USER}
WorkingDirectory=${INSTALL_DIR}/backend
Environment="PATH=${INSTALL_DIR}/.venv/bin"
Environment="FLASK_ENV=production"
ExecStart=${INSTALL_DIR}/.venv/bin/gunicorn \
    --workers 3 \
    --bind 127.0.0.1:${CPANEL_API_PORT} \
    --timeout 120 \
    --access-logfile - \
    --error-logfile - \
    app:app
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
    
    systemctl daemon-reload
    systemctl enable controlpanel || error_exit "Failed to enable controlpanel service"
    systemctl start controlpanel || error_exit "Failed to start controlpanel service"
    
    log "SUCCESS" "Systemd service created"
}

# Configure firewall
configure_firewall() {
    log "INFO" "Configuring firewall..."
    
    case $DISTRO in
        "ubuntu"|"debian")
            ufw allow ssh
            ufw allow ${CPANEL_HTTP_PORT}/tcp
            ufw allow ${CPANEL_HTTPS_PORT}/tcp
            ufw --force enable
            ;;
        "centos"|"rhel"|"fedora")
            firewall-cmd --permanent --add-service=ssh
            firewall-cmd --permanent --add-port=${CPANEL_HTTP_PORT}/tcp
            firewall-cmd --permanent --add-port=${CPANEL_HTTPS_PORT}/tcp
            firewall-cmd --reload
            ;;
    esac
    
    log "SUCCESS" "Firewall configured"
}

# Final setup
finalize_setup() {
    log "INFO" "Finalizing setup..."
    
    # Create environment file
    cat > ${INSTALL_DIR}/backend/.env <<EOF
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_USER_PASSWORD}

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Application Configuration
SECRET_KEY=$(openssl rand -hex 32)
JWT_SECRET_KEY=$(openssl rand -hex 32)
FLASK_ENV=production
EOF
    
    # Set permissions
    chown -R "${SERVICE_USER}:${SERVICE_USER}" "${INSTALL_DIR}"
    chmod 640 "${INSTALL_DIR}/backend/.env"
    
    # Run database migrations
    cd "${INSTALL_DIR}/backend" || error_exit "Failed to enter backend directory"
    source "${INSTALL_DIR}/.venv/bin/activate"
    flask db upgrade || error_exit "Database migration failed"
    
    log "SUCCESS" "Final setup complete"
}

# Display installation summary
show_summary() {
    local public_ip=$(curl -s ifconfig.me)
    
    echo -e "\n${GREEN}Installation Completed Successfully!${NC}"
    echo -e "\n${YELLOW}=== Access Information ===${NC}"
    echo -e "Control Panel URL: ${CYAN}http://${public_ip}:${CPANEL_HTTP_PORT}${NC}"
    echo -e "API Endpoint: ${CYAN}http://localhost:${CPANEL_API_PORT}/api${NC}"
    
    echo -e "\n${YELLOW}=== Credentials ===${NC}"
    echo -e "Database root password saved in: ${CYAN}/etc/controlpanel/db_credentials.conf${NC}"
    echo -e "Application credentials saved in: ${CYAN}${INSTALL_DIR}/backend/.env${NC}"
    
    echo -e "\n${YELLOW}=== Service Status ===${NC}"
    systemctl status controlpanel --no-pager
    systemctl status nginx --no-pager
    
    echo -e "\n${YELLOW}=== Next Steps ===${NC}"
    echo "1. Configure HTTPS with Let's Encrypt:"
    echo "   sudo certbot --nginx -d yourdomain.com"
    echo "2. Set up regular backups for database and configuration"
    echo "3. Monitor application logs:"
    echo "   journalctl -u controlpanel -f"
    echo -e "\nInstallation log: ${CYAN}${LOG_FILE}${NC}"
}

# Main installation process
main() {
    init_logging
    log "INFO" "Starting Control Panel installation"
    
    detect_distribution
    create_service_user
    install_dependencies
    setup_python
    setup_frontend
    configure_database
    configure_redis
    configure_nginx
    create_systemd_service
    configure_firewall
    finalize_setup
    
    show_summary
    log "INFO" "Installation completed at $(date)"
}

# Start installation
main
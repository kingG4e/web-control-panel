#!/bin/bash

# Version
VERSION="1.0.0"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Default configuration
INSTALL_DIR="/usr/local/cpanel"
STACK_TYPE="LAMP"  # LAMP or LEMP
CPANEL_PORT=2082
WEBSERVER_PORT=80
MYSQL_PORT=3306
FTP_PORT=21
SSH_PORT=22

# Database configuration
DB_NAME="cpanel"
DB_USER="cpanel"
DB_HOST="localhost"
MYSQL_CONF_DIR="/etc/mysql/mariadb.conf.d"
MARIADB_CONF_DIR="/etc/my.cnf.d"

# Log file
LOG_FILE="/var/log/cpanel-install.log"
TEMP_DIR="/tmp/.cpanel-install-$$"

# Create temp directory
if [ -e "$TEMP_DIR" ]; then
    rm -rf "$TEMP_DIR"
fi
mkdir -p "$TEMP_DIR"

# Logging function
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
    echo "[INFO] $1" >> "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
    echo "[SUCCESS] $1" >> "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    echo "[ERROR] $1" >> "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
    echo "[WARNING] $1" >> "$LOG_FILE"
}

# Error handling
handle_error() {
    log_error "An error occurred during installation. Check $LOG_FILE for details."
    cleanup
    exit 1
}

# Cleanup function
cleanup() {
    if [ -d "$TEMP_DIR" ]; then
        log_info "Cleaning up temporary files..."
        rm -rf "$TEMP_DIR"
    fi
}

# Trap errors
trap 'handle_error' ERR

# Check system requirements
check_system() {
    log_info "Checking system requirements..."
    
    # Check if running as root
    if [ "$EUID" -ne 0 ]; then 
        log_error "Please run this script as root (use sudo)"
        exit 1
    }

    # Check OS
    if [ ! -f /etc/os-release ]; then
        log_error "Cannot detect operating system"
        exit 1
    }

    # Source OS information
    . /etc/os-release
    log_info "Detected OS: $PRETTY_NAME"

    # Check minimum requirements
    MEMORY_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    MEMORY_GB=$((MEMORY_KB / 1024 / 1024))
    
    if [ "$MEMORY_GB" -lt 1 ]; then
        log_warning "System has less than 1GB RAM. This may impact performance."
    fi

    # Check disk space
    DISK_SPACE_GB=$(df -BG / | awk 'NR==2 {print $4}' | tr -d 'G')
    if [ "$DISK_SPACE_GB" -lt 10 ]; then
        log_error "Insufficient disk space. Minimum 10GB required."
        exit 1
    }
}

# Usage function
usage() {
    echo "Usage: $0 [options]"
    echo "Options:"
    echo "  --stack|-s <LAMP|LEMP>    Choose stack type (default: LAMP)"
    echo "  --port|-p <port>          Set web server port (default: 80)"
    echo "  --dbname|-d <name>        Set database name (default: cpanel)"
    echo "  --dbuser|-u <user>        Set database user (default: cpanel)"
    echo "  --help|-h                 Show this help message"
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --stack|-s)
                STACK_TYPE="${2^^}"  # Convert to uppercase
                if [[ ! "$STACK_TYPE" =~ ^(LAMP|LEMP)$ ]]; then
                    log_error "Invalid stack type. Must be LAMP or LEMP"
                    exit 1
                fi
                shift 2
                ;;
            --port|-p)
                WEBSERVER_PORT="$2"
                shift 2
                ;;
            --dbname|-d)
                DB_NAME="$2"
                shift 2
                ;;
            --dbuser|-u)
                DB_USER="$2"
                shift 2
                ;;
            --help|-h)
                usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done
}

# Install dependencies based on OS and stack type
install_dependencies() {
    log_info "Installing essential packages for $STACK_TYPE stack..."
    
    # Detect OS
    if [ -f /etc/debian_version ]; then
        # Debian/Ubuntu
        apt-get update >> "$LOG_FILE" 2>&1 || {
            log_error "Failed to update package lists"
            exit 1
        }

        # Common packages
        local COMMON_PACKAGES="mariadb-server mariadb-client python3-mysqldb php php-mysql php-fpm php-curl php-gd php-mbstring php-xml php-zip python3 python3-pip python3-venv nodejs npm vsftpd bind9 postfix certbot ufw fail2ban"

        # Stack specific packages
        if [ "$STACK_TYPE" = "LAMP" ]; then
            local STACK_PACKAGES="apache2 libapache2-mod-php"
        else  # LEMP
            local STACK_PACKAGES="nginx"
        fi

        apt-get install -y $COMMON_PACKAGES $STACK_PACKAGES >> "$LOG_FILE" 2>&1 || {
            log_error "Failed to install essential packages"
            exit 1
        }

    elif [ -f /etc/redhat-release ]; then
        # RHEL/CentOS/Rocky/Alma
        if command -v dnf >/dev/null 2>&1; then
            local PKG_MGR="dnf"
        else
            local PKG_MGR="yum"
        fi

        $PKG_MGR -y update >> "$LOG_FILE" 2>&1

        # Common packages
        local COMMON_PACKAGES="mariadb-server mariadb python3-PyMySQL php php-mysqlnd php-fpm php-curl php-gd php-mbstring php-xml php-zip python3 python3-pip python3-virtualenv nodejs npm vsftpd bind postfix certbot"

        # Stack specific packages
        if [ "$STACK_TYPE" = "LAMP" ]; then
            local STACK_PACKAGES="httpd mod_ssl"
        else  # LEMP
            local STACK_PACKAGES="nginx"
        fi

        $PKG_MGR -y install $COMMON_PACKAGES $STACK_PACKAGES >> "$LOG_FILE" 2>&1 || {
            log_error "Failed to install essential packages"
            exit 1
        }
    else
        log_error "Unsupported operating system"
        exit 1
    fi
}

# Configure database with better security and performance
configure_database() {
    log_info "Configuring MariaDB..."
    
    # Start MariaDB service
systemctl start mariadb
systemctl enable mariadb

    # Generate secure passwords
    MYSQL_ROOT_PASSWORD=$(openssl rand -base64 16)
    DB_PASSWORD=$(openssl rand -base64 16)
    
    # Secure installation
    mysql -e "UPDATE mysql.user SET Password=PASSWORD('$MYSQL_ROOT_PASSWORD') WHERE User='root';"
    mysql -e "DELETE FROM mysql.user WHERE User='';"
    mysql -e "DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');"
    mysql -e "DROP DATABASE IF EXISTS test;"
    mysql -e "DELETE FROM mysql.db WHERE Db='test' OR Db='test\\_%';"
    
    # Create database and user
    mysql -e "CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    mysql -e "CREATE USER IF NOT EXISTS '$DB_USER'@'$DB_HOST' IDENTIFIED BY '$DB_PASSWORD';"
    mysql -e "GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'$DB_HOST';"
mysql -e "FLUSH PRIVILEGES;"

    # Configure MariaDB for better performance
    local MYCNF
    if [ -d "$MARIADB_CONF_DIR" ]; then
        MYCNF="$MARIADB_CONF_DIR/server.cnf"
    elif [ -d "$MYSQL_CONF_DIR" ]; then
        MYCNF="$MYSQL_CONF_DIR/50-server.cnf"
    else
        MYCNF="/etc/mysql/my.cnf"
    fi

    cat >> "$MYCNF" << EOF

# Custom configuration for web control panel
[mysqld]
innodb_buffer_pool_size = 256M
innodb_log_file_size = 64M
innodb_flush_log_at_trx_commit = 2
innodb_flush_method = O_DIRECT
max_connections = 200
EOF

    systemctl restart mariadb
}

# Configure web server based on stack type
configure_webserver() {
    log_info "Configuring web server for $STACK_TYPE stack..."
    
    if [ "$STACK_TYPE" = "LAMP" ]; then
        configure_apache
    else
        configure_nginx
    fi
}

# Apache configuration
configure_apache() {
    log_info "Configuring Apache..."
    
a2enmod proxy
a2enmod proxy_http
a2enmod ssl
a2enmod rewrite
    a2enmod headers

# Create Apache Virtual Host
cat > /etc/apache2/sites-available/cpanel.conf << EOF
<VirtualHost *:${WEBSERVER_PORT}>
    ServerAdmin webmaster@localhost
    DocumentRoot ${INSTALL_DIR}/frontend/build

    ProxyPass /api http://localhost:8080/api
    ProxyPassReverse /api http://localhost:8080/api

    <Directory ${INSTALL_DIR}/frontend/build>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog \${APACHE_LOG_DIR}/cpanel-error.log
    CustomLog \${APACHE_LOG_DIR}/cpanel-access.log combined

    <IfModule mod_headers.c>
        Header set X-Content-Type-Options nosniff
        Header set X-Frame-Options SAMEORIGIN
        Header set X-XSS-Protection "1; mode=block"
    </IfModule>
</VirtualHost>
EOF

a2ensite cpanel.conf
systemctl restart apache2
}

# Nginx configuration
configure_nginx() {
    log_info "Configuring Nginx..."
    
    cat > /etc/nginx/conf.d/cpanel.conf << EOF
server {
    listen ${WEBSERVER_PORT};
    server_name localhost;

    root ${INSTALL_DIR}/frontend/build;
    index index.html index.htm;

    location /api {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    error_log /var/log/nginx/cpanel-error.log;
    access_log /var/log/nginx/cpanel-access.log;

    # Security headers
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options SAMEORIGIN;
    add_header X-XSS-Protection "1; mode=block";
}
EOF

    systemctl restart nginx
}

# Configure Firewall
configure_firewall() {
    log_info "Configuring firewall..."
    
    ufw --force reset
    ufw default deny incoming
    ufw default allow outgoing
ufw allow $WEBSERVER_PORT/tcp
ufw allow $MYSQL_PORT/tcp
ufw allow $FTP_PORT/tcp
ufw allow $SSH_PORT/tcp
ufw --force enable
}

# Install Control Panel
install_cpanel() {
    log_info "Installing Control Panel..."
    
mkdir -p $INSTALL_DIR
cp -r * $INSTALL_DIR/

    # Setup Python environment
cd $INSTALL_DIR
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

    # Build frontend
cd frontend
npm install
npm run build
cd ..

    # Create systemd service
cat > /etc/systemd/system/cpanel.service << EOF
[Unit]
Description=Control Panel Backend Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${INSTALL_DIR}
Environment="PATH=${INSTALL_DIR}/.venv/bin:\$PATH"
ExecStart=${INSTALL_DIR}/.venv/bin/python backend/app.py
Restart=always

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable cpanel
systemctl start cpanel
}

# Main installation process
main() {
    echo -e "${BOLD}${BLUE}Starting Control Panel Installation v${VERSION}${NC}"
    echo "Installation log will be saved to $LOG_FILE"
    
    # Parse command line arguments
    parse_args "$@"
    
    # Run installation phases
    check_system
    install_dependencies
    configure_database
    configure_webserver
    configure_firewall
    install_cpanel

    # Save credentials with additional database info
cat > ${INSTALL_DIR}/credentials.txt << EOF
Control Panel Credentials
========================
URL: http://localhost:$WEBSERVER_PORT
Admin Username: admin
Admin Password: $ADMIN_PASSWORD

Database Information
===================
Database Name: $DB_NAME
Database User: $DB_USER
Database Password: $DB_PASSWORD
MySQL Root Password: $MYSQL_ROOT_PASSWORD

Stack Type: $STACK_TYPE

Please keep this information secure!
EOF
chmod 600 ${INSTALL_DIR}/credentials.txt

    log_success "Installation Complete!"
    echo -e "\n${YELLOW}Control Panel Information:${NC}"
    echo "URL: http://localhost:$WEBSERVER_PORT"
    echo "Admin Username: admin"
    echo "Admin Password: $ADMIN_PASSWORD"
    echo "Stack Type: $STACK_TYPE"
    echo -e "${YELLOW}Database and additional credentials have been saved to ${INSTALL_DIR}/credentials.txt${NC}"

    cleanup
}

# Start installation with command line arguments
main "$@" 
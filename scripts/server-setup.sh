#!/bin/bash

# 🌐 Server Setup Script for Domain and Subdomain Configuration
# This script sets up the server environment for hosting multiple domains and subdomains

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration variables
DOMAIN=""
SERVER_IP=""
EMAIL=""
PHP_VERSION="8.1"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root"
        exit 1
    fi
}

# Get server information
get_server_info() {
    log_info "Getting server information..."
    
    if [[ -z "$SERVER_IP" ]]; then
        SERVER_IP=$(curl -s ifconfig.me || curl -s ipinfo.io/ip || hostname -I | awk '{print $1}')
        log_info "Detected server IP: $SERVER_IP"
    fi
    
    if [[ -z "$DOMAIN" ]]; then
        read -p "Enter your main domain (e.g., example.com): " DOMAIN
    fi
    
    if [[ -z "$EMAIL" ]]; then
        read -p "Enter your email for SSL certificates: " EMAIL
    fi
}

# Update system packages
update_system() {
    log_info "Updating system packages..."
    
    if command -v apt &> /dev/null; then
        apt update && apt upgrade -y
        PACKAGE_MANAGER="apt"
    elif command -v yum &> /dev/null; then
        yum update -y
        PACKAGE_MANAGER="yum"
    else
        log_error "Unsupported package manager"
        exit 1
    fi
    
    log_success "System updated successfully"
}

# Install required packages
install_packages() {
    log_info "Installing required packages..."
    
    if [[ "$PACKAGE_MANAGER" == "apt" ]]; then
        apt install -y nginx php${PHP_VERSION}-fpm php${PHP_VERSION}-cli php${PHP_VERSION}-common \
                      php${PHP_VERSION}-mysql php${PHP_VERSION}-xml php${PHP_VERSION}-curl \
                      php${PHP_VERSION}-gd php${PHP_VERSION}-zip php${PHP_VERSION}-mbstring \
                      bind9 bind9utils bind9-doc certbot python3-certbot-nginx \
                      ufw fail2ban htop curl wget git unzip
    elif [[ "$PACKAGE_MANAGER" == "yum" ]]; then
        yum install -y nginx php-fpm php-cli php-common php-mysql php-xml php-curl \
                      php-gd php-zip php-mbstring bind bind-utils \
                      certbot python3-certbot-nginx firewalld fail2ban htop curl wget git unzip
    fi
    
    log_success "Packages installed successfully"
}

# Configure firewall
setup_firewall() {
    log_info "Configuring firewall..."
    
    if command -v ufw &> /dev/null; then
        ufw --force reset
        ufw default deny incoming
        ufw default allow outgoing
        ufw allow 22/tcp    # SSH
        ufw allow 80/tcp    # HTTP
        ufw allow 443/tcp   # HTTPS
        ufw allow 53/tcp    # DNS
        ufw allow 53/udp    # DNS
        ufw --force enable
    elif command -v firewall-cmd &> /dev/null; then
        systemctl start firewalld
        systemctl enable firewalld
        firewall-cmd --permanent --add-service=ssh
        firewall-cmd --permanent --add-service=http
        firewall-cmd --permanent --add-service=https
        firewall-cmd --permanent --add-service=dns
        firewall-cmd --reload
    fi
    
    log_success "Firewall configured successfully"
}

# Configure Nginx
setup_nginx() {
    log_info "Configuring Nginx..."
    
    # Create main Nginx configuration
    cat > /etc/nginx/nginx.conf << EOF
user www-data;
worker_processes auto;
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
    worker_connections 1024;
    multi_accept on;
    use epoll;
}

http {
    ##
    # Basic Settings
    ##
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    server_tokens off;
    
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    ##
    # SSL Settings
    ##
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    ##
    # Logging Settings
    ##
    log_format main '\$remote_addr - \$remote_user [\$time_local] "\$request" '
                    '\$status \$body_bytes_sent "\$http_referer" '
                    '"\$http_user_agent" "\$http_x_forwarded_for"';
    
    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log;
    
    ##
    # Gzip Settings
    ##
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;
    
    ##
    # Security Headers
    ##
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    ##
    # Virtual Host Configs
    ##
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
EOF
    
    # Create sites-available and sites-enabled directories
    mkdir -p /etc/nginx/sites-available
    mkdir -p /etc/nginx/sites-enabled
    
    # Remove default site
    rm -f /etc/nginx/sites-enabled/default
    
    # Create default server block for unmatched domains
    cat > /etc/nginx/sites-available/default << EOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    
    location / {
        return 444;  # Close connection for unmatched domains
    }
}
EOF
    
    ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/
    
    # Test Nginx configuration
    nginx -t
    
    # Start and enable Nginx
    systemctl start nginx
    systemctl enable nginx
    
    log_success "Nginx configured successfully"
}

# Configure PHP-FPM
setup_php() {
    log_info "Configuring PHP-FPM..."
    
    # Configure PHP-FPM pool
    cat > /etc/php/${PHP_VERSION}/fpm/pool.d/www.conf << EOF
[www]
user = www-data
group = www-data
listen = /var/run/php/php${PHP_VERSION}-fpm.sock
listen.owner = www-data
listen.group = www-data
listen.mode = 0660

pm = dynamic
pm.max_children = 50
pm.start_servers = 5
pm.min_spare_servers = 5
pm.max_spare_servers = 35
pm.max_requests = 500

php_admin_value[error_log] = /var/log/php${PHP_VERSION}-fpm.log
php_admin_flag[log_errors] = on
php_admin_value[memory_limit] = 256M
php_admin_value[upload_max_filesize] = 100M
php_admin_value[post_max_size] = 100M
EOF
    
    # Configure PHP settings
    sed -i 's/;cgi.fix_pathinfo=1/cgi.fix_pathinfo=0/' /etc/php/${PHP_VERSION}/fpm/php.ini
    sed -i 's/upload_max_filesize = 2M/upload_max_filesize = 100M/' /etc/php/${PHP_VERSION}/fpm/php.ini
    sed -i 's/post_max_size = 8M/post_max_size = 100M/' /etc/php/${PHP_VERSION}/fpm/php.ini
    sed -i 's/memory_limit = 128M/memory_limit = 256M/' /etc/php/${PHP_VERSION}/fpm/php.ini
    
    # Start and enable PHP-FPM
    systemctl start php${PHP_VERSION}-fpm
    systemctl enable php${PHP_VERSION}-fpm
    
    log_success "PHP-FPM configured successfully"
}

# Configure BIND DNS
setup_bind() {
    log_info "Configuring BIND DNS..."
    
    # Configure named.conf.options
    cat > /etc/bind/named.conf.options << EOF
options {
    directory "/var/cache/bind";
    
    // If there is a firewall between you and nameservers you want
    // to talk to, you may need to fix the firewall to allow multiple
    // ports to talk.  See http://www.kb.cert.org/vuls/id/800113
    
    // If your ISP provided one or more IP addresses for stable
    // nameservers, you probably want to use them as forwarders.
    // Uncomment the following block, and insert the addresses replacing
    // the all-0's placeholder.
    
    forwarders {
        8.8.8.8;
        8.8.4.4;
        1.1.1.1;
        1.0.0.1;
    };
    
    //========================================================================
    // If BIND logs error messages about the root key being expired,
    // you will need to update your keys.  See https://www.isc.org/bind-keys
    //========================================================================
    dnssec-validation auto;
    
    listen-on-v6 { any; };
    
    // Security settings
    allow-recursion { localnets; };
    allow-query { any; };
    allow-query-cache { localnets; };
    
    version "DNS Server";
    hostname none;
    server-id none;
};
EOF
    
    # Create zone directory
    mkdir -p /var/lib/bind
    
    # Create main domain zone file
    cat > /var/lib/bind/${DOMAIN}.zone << EOF
\$TTL 3600
@   IN  SOA ns1.${DOMAIN}. admin.${DOMAIN}. (
        $(date +%Y%m%d)01  ; Serial
        3600               ; Refresh
        1800               ; Retry
        1209600            ; Expire
        86400              ; Minimum
    )

; NS Records
@   IN  NS  ns1.${DOMAIN}.

; A Records
@   IN  A   ${SERVER_IP}
ns1 IN  A   ${SERVER_IP}
www IN  A   ${SERVER_IP}

; CNAME Records
mail IN CNAME ns1.${DOMAIN}.

; MX Records
@   IN  MX  10  mail.${DOMAIN}.

; TXT Records
@   IN  TXT "v=spf1 a mx ~all"
EOF
    
    # Add zone to named.conf.local
    cat >> /etc/bind/named.conf.local << EOF

zone "${DOMAIN}" {
    type master;
    file "/var/lib/bind/${DOMAIN}.zone";
    allow-transfer { none; };
};
EOF
    
    # Set proper permissions
    chown -R bind:bind /var/lib/bind
    chmod 644 /var/lib/bind/${DOMAIN}.zone
    
    # Test BIND configuration
    named-checkconf
    
    # Start and enable BIND
    systemctl start bind9
    systemctl enable bind9
    
    log_success "BIND DNS configured successfully"
}

# Create main domain virtual host
create_main_domain() {
    log_info "Creating main domain virtual host..."
    
    # Create document root
    mkdir -p /var/www/${DOMAIN}
    
    # Create default index.html
    cat > /var/www/${DOMAIN}/index.html << EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to ${DOMAIN}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .container {
            background: rgba(255,255,255,0.1);
            padding: 40px;
            border-radius: 15px;
            backdrop-filter: blur(10px);
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
        }
        .status {
            background: rgba(76, 175, 80, 0.2);
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
            border-left: 4px solid #4CAF50;
        }
        .info {
            background: rgba(33, 150, 243, 0.2);
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
            border-left: 4px solid #2196F3;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Welcome to ${DOMAIN}</h1>
            <p>Your server is ready to host websites!</p>
        </div>
        
        <div class="status">
            <h2>✅ Server Status: Active</h2>
            <p>Your web server is configured and running properly.</p>
        </div>
        
        <div class="info">
            <h3>📋 Server Information</h3>
            <ul>
                <li><strong>Domain:</strong> ${DOMAIN}</li>
                <li><strong>Server IP:</strong> ${SERVER_IP}</li>
                <li><strong>Web Server:</strong> Nginx</li>
                <li><strong>PHP Version:</strong> ${PHP_VERSION}</li>
                <li><strong>DNS Server:</strong> BIND</li>
            </ul>
        </div>
        
        <div class="info">
            <h3>🔧 Next Steps</h3>
            <ol>
                <li>Upload your website files to /var/www/${DOMAIN}/</li>
                <li>Configure SSL certificate using Let's Encrypt</li>
                <li>Create additional subdomains as needed</li>
                <li>Set up email services if required</li>
            </ol>
        </div>
        
        <div class="status">
            <h3>🔒 Security Features</h3>
            <ul>
                <li>Firewall configured (UFW/Firewalld)</li>
                <li>Security headers enabled</li>
                <li>SSL/TLS ready for configuration</li>
                <li>Fail2ban installed for intrusion prevention</li>
            </ul>
        </div>
        
        <footer style="text-align: center; margin-top: 40px; opacity: 0.8;">
            <p>Generated on $(date) | Server Setup Complete</p>
        </footer>
    </div>
</body>
</html>
EOF
    
    # Set proper permissions
    chown -R www-data:www-data /var/www/${DOMAIN}
    chmod -R 755 /var/www/${DOMAIN}
    
    # Create Nginx virtual host
    cat > /etc/nginx/sites-available/${DOMAIN}.conf << EOF
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};
    root /var/www/${DOMAIN};
    index index.html index.htm index.php;
    
    # Security headers
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    
    # Hide server information
    server_tokens off;
    
    location / {
        try_files \$uri \$uri/ /index.php?\$query_string;
    }
    
    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php${PHP_VERSION}-fpm.sock;
    }
    
    location ~ /\.ht {
        deny all;
    }
    
    # Logging
    access_log /var/log/nginx/${DOMAIN}_access.log;
    error_log /var/log/nginx/${DOMAIN}_error.log;
}
EOF
    
    # Enable the site
    ln -sf /etc/nginx/sites-available/${DOMAIN}.conf /etc/nginx/sites-enabled/
    
    # Test and reload Nginx
    nginx -t
    systemctl reload nginx
    
    log_success "Main domain virtual host created successfully"
}

# Setup SSL with Let's Encrypt
setup_ssl() {
    log_info "Setting up SSL with Let's Encrypt..."
    
    # Install certbot if not already installed
    if ! command -v certbot &> /dev/null; then
        if [[ "$PACKAGE_MANAGER" == "apt" ]]; then
            apt install -y certbot python3-certbot-nginx
        elif [[ "$PACKAGE_MANAGER" == "yum" ]]; then
            yum install -y certbot python3-certbot-nginx
        fi
    fi
    
    # Request SSL certificate
    certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} --email ${EMAIL} --agree-tos --non-interactive
    
    # Setup auto-renewal
    (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
    
    log_success "SSL certificate configured successfully"
}

# Setup subdomain template
create_subdomain_template() {
    log_info "Creating subdomain template..."
    
    cat > /usr/local/bin/create-subdomain << 'EOF'
#!/bin/bash

# Subdomain creation script
if [[ $# -ne 2 ]]; then
    echo "Usage: create-subdomain <subdomain> <main-domain>"
    echo "Example: create-subdomain blog example.com"
    exit 1
fi

SUBDOMAIN=$1
MAIN_DOMAIN=$2
FULL_DOMAIN="${SUBDOMAIN}.${MAIN_DOMAIN}"
SERVER_IP=$(curl -s ifconfig.me)

# Create document root
mkdir -p /var/www/${FULL_DOMAIN}

# Create default index.html
cat > /var/www/${FULL_DOMAIN}/index.html << HTML
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to ${FULL_DOMAIN}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .container {
            background: rgba(255,255,255,0.1);
            padding: 40px;
            border-radius: 15px;
            backdrop-filter: blur(10px);
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🌐 Welcome to ${FULL_DOMAIN}</h1>
            <p>Your subdomain is ready!</p>
        </div>
        
        <div class="info">
            <h3>📋 Subdomain Information</h3>
            <ul>
                <li><strong>Subdomain:</strong> ${FULL_DOMAIN}</li>
                <li><strong>Document Root:</strong> /var/www/${FULL_DOMAIN}</li>
                <li><strong>Status:</strong> Active</li>
            </ul>
        </div>
    </div>
</body>
</html>
HTML

# Set permissions
chown -R www-data:www-data /var/www/${FULL_DOMAIN}
chmod -R 755 /var/www/${FULL_DOMAIN}

# Create Nginx virtual host
cat > /etc/nginx/sites-available/${FULL_DOMAIN}.conf << NGINX
server {
    listen 80;
    server_name ${FULL_DOMAIN};
    root /var/www/${FULL_DOMAIN};
    index index.html index.htm index.php;
    
    location / {
        try_files \$uri \$uri/ /index.php?\$query_string;
    }
    
    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
    }
    
    access_log /var/log/nginx/${FULL_DOMAIN}_access.log;
    error_log /var/log/nginx/${FULL_DOMAIN}_error.log;
}
NGINX

# Enable the site
ln -sf /etc/nginx/sites-available/${FULL_DOMAIN}.conf /etc/nginx/sites-enabled/

# Test and reload Nginx
nginx -t && systemctl reload nginx

# Add DNS A record
echo "${SUBDOMAIN} IN A ${SERVER_IP}" >> /var/lib/bind/${MAIN_DOMAIN}.zone

# Update zone serial
sed -i "s/$(date +%Y%m%d)01/$(date +%Y%m%d)02/" /var/lib/bind/${MAIN_DOMAIN}.zone

# Reload BIND
systemctl reload bind9

echo "✅ Subdomain ${FULL_DOMAIN} created successfully!"
echo "📁 Document root: /var/www/${FULL_DOMAIN}"
echo "🌐 URL: http://${FULL_DOMAIN}"
echo "🔒 Run: certbot --nginx -d ${FULL_DOMAIN} (for SSL)"
EOF

    chmod +x /usr/local/bin/create-subdomain
    
    log_success "Subdomain creation script created at /usr/local/bin/create-subdomain"
}

# Main execution
main() {
    log_info "🚀 Starting server setup for domain and subdomain hosting..."
    
    check_root
    get_server_info
    update_system
    install_packages
    setup_firewall
    setup_nginx
    setup_php
    setup_bind
    create_main_domain
    create_subdomain_template
    
    log_success "🎉 Server setup completed successfully!"
    
    echo ""
    echo "📋 Setup Summary:"
    echo "=================="
    echo "🌐 Main Domain: ${DOMAIN}"
    echo "🔗 URL: http://${DOMAIN}"
    echo "📁 Document Root: /var/www/${DOMAIN}"
    echo "🔒 SSL Setup: Run 'certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}'"
    echo "🔧 Subdomain Script: /usr/local/bin/create-subdomain"
    echo ""
    echo "📖 Usage Examples:"
    echo "=================="
    echo "Create subdomain: create-subdomain blog ${DOMAIN}"
    echo "Create subdomain: create-subdomain shop ${DOMAIN}"
    echo "Create subdomain: create-subdomain api ${DOMAIN}"
    echo ""
    echo "🔒 SSL for subdomains: certbot --nginx -d blog.${DOMAIN}"
    echo ""
    echo "📚 Full documentation: DOMAIN_SETUP_GUIDE.md"
}

# Run main function
main "$@"

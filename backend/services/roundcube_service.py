import os
import subprocess
import platform
import configparser
from datetime import datetime
import mysql.connector
from mysql.connector import Error

class RoundcubeService:
    def __init__(self):
        # Detect operating system
        self.is_windows = platform.system() == 'Windows'
        
        if self.is_windows:
            # Windows simulation mode
            self.roundcube_path = os.path.join(os.environ.get('TEMP', 'C:\\temp'), 'roundcube_simulation')
            self.config_path = os.path.join(self.roundcube_path, 'config')
            # Allow overriding Roundcube URL/base via environment variables
            # RC_WEBMAIL_URL takes precedence over RC_BASE_PATH
            self.rc_webmail_url = os.environ.get('RC_WEBMAIL_URL')
            self.rc_base_path = os.environ.get('RC_BASE_PATH', 'roundcube')
            os.makedirs(self.config_path, exist_ok=True)
            print("[SIMULATION] Roundcube service running in Windows simulation mode")
        else:
            # Linux production mode - common Roundcube installation paths
            possible_paths = [
                '/usr/share/roundcube',
                '/var/www/roundcube',
                '/var/www/html/roundcube',
                '/opt/roundcube'
            ]
            
            self.roundcube_path = None
            for path in possible_paths:
                if os.path.exists(path):
                    self.roundcube_path = path
                    break
            
            if not self.roundcube_path:
                raise Exception("Roundcube installation not found. Please install Roundcube first.")
            
            self.config_path = os.path.join(self.roundcube_path, 'config')
    
    def get_roundcube_url(self, domain=None):
        """Get the Roundcube webmail URL"""
        if self.is_windows:
            return "http://localhost/roundcube"  # Simulation
        
        # If explicit URL is configured, use it directly
        if self.rc_webmail_url:
            # If email/domain specific, caller will append query params
            return self.rc_webmail_url.rstrip('/')
        
        # Determine base path (default: /roundcube). Allow custom base path from env
        base_path = (self.rc_base_path or 'roundcube').strip('/')
        
        # Default URLs to try
        possible_urls = [
            f"https://{domain}/{base_path}" if domain else None,
            f"http://{domain}/{base_path}" if domain else None,
            f"https://localhost/{base_path}",
            f"http://localhost/{base_path}",
            "https://webmail.localhost",
            "http://webmail.localhost"
        ]
        
        return [url for url in possible_urls if url is not None]
    
    def configure_roundcube_database(self, db_host='localhost', db_name='roundcube', db_user='roundcube', db_password=None):
        """Configure Roundcube database connection"""
        try:
            config_file = os.path.join(self.config_path, 'config.inc.php')
            
            if self.is_windows:
                print(f"[SIMULATION] Would configure Roundcube database: {db_name}@{db_host}")
                return True
            
            # Generate database password if not provided
            if not db_password:
                db_password = self._generate_password()
            
            # Create database and user
            self._setup_roundcube_database(db_host, db_name, db_user, db_password)
            
            # Update Roundcube configuration
            config_content = f"""<?php
$config = array();

// Database configuration
$config['db_dsnw'] = 'mysql://{db_user}:{db_password}@{db_host}/{db_name}';

// IMAP configuration
$config['default_host'] = 'localhost';
$config['default_port'] = 143;
$config['imap_conn_options'] = array(
    'ssl' => array(
        'verify_peer'  => false,
        'verify_peer_name' => false,
    ),
);

// SMTP configuration
$config['smtp_server'] = 'localhost';
$config['smtp_port'] = 587;
$config['smtp_user'] = '%u';
$config['smtp_pass'] = '%p';
$config['smtp_conn_options'] = array(
    'ssl' => array(
        'verify_peer'      => false,
        'verify_peer_name' => false,
    ),
);

// General configuration
$config['support_url'] = '';
$config['product_name'] = 'Webmail';
$config['des_key'] = '{self._generate_des_key()}';
$config['plugins'] = array('archive', 'zipdownload');

// Security
$config['session_lifetime'] = 30;
$config['ip_check'] = true;
$config['referer_check'] = true;

// Logging
$config['log_driver'] = 'file';
$config['log_dir'] = 'logs/';

// User interface
$config['skin'] = 'elastic';
$config['language'] = 'en_US';
$config['date_format'] = 'Y-m-d';
$config['time_format'] = 'H:i';

// Features
$config['enable_installer'] = false;
$config['auto_create_user'] = true;
$config['check_all_folders'] = true;

?>
"""
            
            with open(config_file, 'w') as f:
                f.write(config_content)
            
            # Set proper permissions
            os.chmod(config_file, 0o640)
            
            return True
            
        except Exception as e:
            raise Exception(f'Failed to configure Roundcube database: {str(e)}')
    
    def _setup_roundcube_database(self, db_host, db_name, db_user, db_password):
        """Setup Roundcube database and user"""
        try:
            # Connect to MySQL as root
            connection = mysql.connector.connect(
                host=db_host,
                user='root',
                password=self._get_mysql_root_password()
            )
            
            cursor = connection.cursor()
            
            # Create database
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS {db_name} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
            
            # Create user and grant privileges
            cursor.execute(f"CREATE USER IF NOT EXISTS '{db_user}'@'{db_host}' IDENTIFIED BY '{db_password}'")
            cursor.execute(f"GRANT ALL PRIVILEGES ON {db_name}.* TO '{db_user}'@'{db_host}'")
            cursor.execute("FLUSH PRIVILEGES")
            
            cursor.close()
            connection.close()
            
            # Initialize Roundcube database schema
            self._initialize_roundcube_schema(db_host, db_name, db_user, db_password)
            
        except Error as e:
            raise Exception(f'Database setup failed: {str(e)}')
    
    def _initialize_roundcube_schema(self, db_host, db_name, db_user, db_password):
        """Initialize Roundcube database schema"""
        try:
            sql_file = os.path.join(self.roundcube_path, 'SQL', 'mysql.initial.sql')
            if os.path.exists(sql_file):
                cmd = f"mysql -h {db_host} -u {db_user} -p{db_password} {db_name} < {sql_file}"
                subprocess.run(cmd, shell=True, check=True)
        except Exception as e:
            print(f"Warning: Could not initialize Roundcube schema: {e}")
    
    def create_webmail_user(self, email, password):
        """Create or update webmail user credentials"""
        try:
            if self.is_windows:
                print(f"[SIMULATION] Would create webmail user: {email}")
                return True
            
            # Roundcube typically auto-creates users on first login
            # But we can pre-create them in the database if needed
            return True
            
        except Exception as e:
            raise Exception(f'Failed to create webmail user: {str(e)}')
    
    def get_webmail_login_url(self, email=None, domain=None):
        """Get webmail login URL with optional pre-filled email"""
        base_urls = self.get_roundcube_url(domain)
        
        if isinstance(base_urls, list):
            base_url = base_urls[0]  # Use first URL
        else:
            base_url = base_urls
        
        if email:
            return f"{base_url}/?_user={email}"
        else:
            return base_url
    
    def check_roundcube_status(self):
        """Check if Roundcube is properly installed and configured"""
        try:
            if self.is_windows:
                return {
                    'installed': True,
                    'configured': True,
                    'status': 'simulation',
                    'path': self.roundcube_path,
                    'version': '1.6.0 (simulation)'
                }
            
            # Check if Roundcube directory exists
            if not os.path.exists(self.roundcube_path):
                return {
                    'installed': False,
                    'error': 'Roundcube directory not found'
                }
            
            # Check if config file exists
            config_file = os.path.join(self.config_path, 'config.inc.php')
            if not os.path.exists(config_file):
                return {
                    'installed': True,
                    'configured': False,
                    'error': 'Configuration file not found'
                }
            
            # Try to get version
            version = self._get_roundcube_version()
            
            return {
                'installed': True,
                'configured': True,
                'status': 'active',
                'path': self.roundcube_path,
                'version': version
            }
            
        except Exception as e:
            return {
                'installed': False,
                'error': str(e)
            }
    
    def _get_roundcube_version(self):
        """Get Roundcube version"""
        try:
            version_file = os.path.join(self.roundcube_path, 'program', 'include', 'iniset.php')
            if os.path.exists(version_file):
                with open(version_file, 'r') as f:
                    content = f.read()
                    # Extract version from define('RCMAIL_VERSION', '1.6.0');
                    import re
                    match = re.search(r"define\('RCMAIL_VERSION',\s*'([^']+)'\)", content)
                    if match:
                        return match.group(1)
            return 'Unknown'
        except:
            return 'Unknown'
    
    def _generate_password(self, length=16):
        """Generate a secure random password"""
        import secrets
        import string
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
        return ''.join(secrets.choice(alphabet) for _ in range(length))
    
    def _generate_des_key(self):
        """Generate DES key for Roundcube"""
        import secrets
        return secrets.token_hex(12)
    
    def _get_mysql_root_password(self):
        """Get MySQL root password from system"""
        # This should be configured based on your system
        # For now, return empty string for default installation
        return ""
    
    def configure_nginx_roundcube(self, domain=None):
        """Configure Nginx virtual host for Roundcube"""
        try:
            if self.is_windows:
                print(f"[SIMULATION] Would configure Nginx for Roundcube on domain: {domain}")
                return True
            
            # Create Nginx configuration for Roundcube
            if domain:
                config_content = f"""server {{
    listen 80;
    server_name webmail.{domain};
    root {self.roundcube_path};
    index index.php index.html;

    # Security headers
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    # Hide server information
    server_tokens off;

    location / {{
        try_files $uri $uri/ /index.php?$query_string;
    }}

    location ~ \.php$ {{
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }}

    location ~ /\.ht {{
        deny all;
    }}

    error_log /var/log/nginx/roundcube-{domain}-error.log;
    access_log /var/log/nginx/roundcube-{domain}-access.log;
}}

server {{
    listen 443 ssl http2;
    server_name webmail.{domain};
    root {self.roundcube_path};
    index index.php index.html;

    ssl_certificate /etc/ssl/certs/ssl-cert-snakeoil.pem;
    ssl_certificate_key /etc/ssl/private/ssl-cert-snakeoil.key;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";

    # Hide server information
    server_tokens off;

    location / {{
        try_files $uri $uri/ /index.php?$query_string;
    }}

    location ~ \.php$ {{
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }}

    location ~ /\.ht {{
        deny all;
    }}

    error_log /var/log/nginx/roundcube-{domain}-ssl-error.log;
    access_log /var/log/nginx/roundcube-{domain}-ssl-access.log;
}}"""
                
                config_file = f"/etc/nginx/sites-available/roundcube-{domain}.conf"
                with open(config_file, 'w') as f:
                    f.write(config_content)
                
                # Enable site
                subprocess.run(['ln', '-sf', config_file, f'/etc/nginx/sites-enabled/roundcube-{domain}.conf'], check=True)
                subprocess.run(['nginx', '-t'], check=True)
                subprocess.run(['systemctl', 'reload', 'nginx'], check=True)
            
            return True
            
        except Exception as e:
            raise Exception(f'Failed to configure Nginx for Roundcube: {str(e)}')
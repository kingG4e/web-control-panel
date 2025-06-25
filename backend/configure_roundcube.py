#!/usr/bin/env python3
"""
Roundcube Configuration Script for Web Control Panel
This script helps configure Roundcube webmail client integration
"""

import os
import sys
import subprocess
import mysql.connector
from mysql.connector import Error
import secrets
import string

def generate_password(length=16):
    """Generate a secure random password"""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(secrets.choice(alphabet) for _ in range(length))

def generate_des_key():
    """Generate DES key for Roundcube"""
    return secrets.token_hex(12)

def find_roundcube_path():
    """Find Roundcube installation path"""
    possible_paths = [
        '/usr/share/roundcube',
        '/var/www/roundcube',
        '/var/www/html/roundcube',
        '/opt/roundcube'
    ]
    
    for path in possible_paths:
        if os.path.exists(path):
            return path
    
    return None

def setup_database(db_host='localhost', db_name='roundcube', db_user='roundcube', db_password=None):
    """Setup Roundcube database"""
    if not db_password:
        db_password = generate_password()
    
    try:
        print("Setting up Roundcube database...")
        
        # Connect to MySQL as root
        root_password = input("Enter MySQL root password (press Enter if no password): ")
        connection = mysql.connector.connect(
            host=db_host,
            user='root',
            password=root_password if root_password else ''
        )
        
        cursor = connection.cursor()
        
        # Create database
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {db_name} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
        print(f"Database '{db_name}' created successfully")
        
        # Create user and grant privileges
        cursor.execute(f"CREATE USER IF NOT EXISTS '{db_user}'@'{db_host}' IDENTIFIED BY '{db_password}'")
        cursor.execute(f"GRANT ALL PRIVILEGES ON {db_name}.* TO '{db_user}'@'{db_host}'")
        cursor.execute("FLUSH PRIVILEGES")
        print(f"Database user '{db_user}' created successfully")
        
        cursor.close()
        connection.close()
        
        return db_password
        
    except Error as e:
        print(f"Database setup failed: {e}")
        return None

def initialize_roundcube_schema(roundcube_path, db_host, db_name, db_user, db_password):
    """Initialize Roundcube database schema"""
    try:
        sql_file = os.path.join(roundcube_path, 'SQL', 'mysql.initial.sql')
        if os.path.exists(sql_file):
            print("Initializing Roundcube database schema...")
            cmd = f"mysql -h {db_host} -u {db_user} -p{db_password} {db_name} < {sql_file}"
            subprocess.run(cmd, shell=True, check=True)
            print("Database schema initialized successfully")
        else:
            print(f"Warning: SQL file not found at {sql_file}")
    except Exception as e:
        print(f"Warning: Could not initialize Roundcube schema: {e}")

def create_roundcube_config(roundcube_path, db_host, db_name, db_user, db_password):
    """Create Roundcube configuration file"""
    try:
        config_dir = os.path.join(roundcube_path, 'config')
        config_file = os.path.join(config_dir, 'config.inc.php')
        
        des_key = generate_des_key()
        
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
$config['des_key'] = '{des_key}';
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
        
        print(f"Configuration file created at {config_file}")
        return True
        
    except Exception as e:
        print(f"Failed to create configuration file: {e}")
        return False

def configure_apache(domain=None):
    """Configure Apache for Roundcube"""
    try:
        roundcube_path = find_roundcube_path()
        if not roundcube_path:
            print("Roundcube path not found, skipping Apache configuration")
            return False
        
        if domain:
            config_content = f"""
<VirtualHost *:80>
    ServerName webmail.{domain}
    DocumentRoot {roundcube_path}
    
    <Directory {roundcube_path}>
        Options -Indexes
        AllowOverride All
        Require all granted
    </Directory>
    
    # Security headers
    Header always set X-Content-Type-Options nosniff
    Header always set X-Frame-Options DENY
    Header always set X-XSS-Protection "1; mode=block"
    
    ErrorLog ${{APACHE_LOG_DIR}}/roundcube-{domain}-error.log
    CustomLog ${{APACHE_LOG_DIR}}/roundcube-{domain}-access.log combined
</VirtualHost>

<VirtualHost *:443>
    ServerName webmail.{domain}
    DocumentRoot {roundcube_path}
    
    SSLEngine on
    SSLCertificateFile /etc/ssl/certs/ssl-cert-snakeoil.pem
    SSLCertificateKeyFile /etc/ssl/private/ssl-cert-snakeoil.key
    
    <Directory {roundcube_path}>
        Options -Indexes
        AllowOverride All
        Require all granted
    </Directory>
    
    # Security headers
    Header always set X-Content-Type-Options nosniff
    Header always set X-Frame-Options DENY
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
    
    ErrorLog ${{APACHE_LOG_DIR}}/roundcube-{domain}-ssl-error.log
    CustomLog ${{APACHE_LOG_DIR}}/roundcube-{domain}-ssl-access.log combined
</VirtualHost>
"""
            
            config_file = f"/etc/apache2/sites-available/roundcube-{domain}.conf"
            with open(config_file, 'w') as f:
                f.write(config_content)
            
            # Enable site
            subprocess.run(['a2ensite', f'roundcube-{domain}'], check=True)
            subprocess.run(['systemctl', 'reload', 'apache2'], check=True)
            
            print(f"Apache configuration created for webmail.{domain}")
        else:
            # Create default roundcube alias
            alias_content = f"""
Alias /roundcube {roundcube_path}

<Directory {roundcube_path}>
    Options -Indexes
    AllowOverride All
    Require all granted
</Directory>
"""
            
            with open('/etc/apache2/conf-available/roundcube.conf', 'w') as f:
                f.write(alias_content)
            
            subprocess.run(['a2enconf', 'roundcube'], check=True)
            subprocess.run(['systemctl', 'reload', 'apache2'], check=True)
            
            print("Apache configuration created for /roundcube")
        
        return True
        
    except Exception as e:
        print(f"Failed to configure Apache: {e}")
        return False

def main():
    print("🌐 Roundcube Configuration Script for Web Control Panel")
    print("=" * 60)
    
    # Check if running as root
    if os.geteuid() != 0:
        print("❌ This script must be run as root (use sudo)")
        sys.exit(1)
    
    # Find Roundcube installation
    roundcube_path = find_roundcube_path()
    if not roundcube_path:
        print("❌ Roundcube installation not found!")
        print("Please install Roundcube first using:")
        print("sudo apt update")
        print("sudo apt install roundcube roundcube-core roundcube-mysql")
        sys.exit(1)
    
    print(f"✅ Found Roundcube at: {roundcube_path}")
    
    # Database configuration
    print("\n📊 Setting up database...")
    db_name = input("Database name [roundcube]: ").strip() or 'roundcube'
    db_user = input("Database user [roundcube]: ").strip() or 'roundcube'
    
    db_password = setup_database(db_name=db_name, db_user=db_user)
    if not db_password:
        print("❌ Database setup failed")
        sys.exit(1)
    
    # Initialize schema
    initialize_roundcube_schema(roundcube_path, 'localhost', db_name, db_user, db_password)
    
    # Create configuration
    print("\n⚙️ Creating Roundcube configuration...")
    if create_roundcube_config(roundcube_path, 'localhost', db_name, db_user, db_password):
        print("✅ Configuration created successfully")
    else:
        print("❌ Configuration creation failed")
        sys.exit(1)
    
    # Apache configuration
    print("\n🌐 Configuring Apache...")
    domain = input("Domain for webmail (optional, press Enter to skip): ").strip()
    
    if configure_apache(domain if domain else None):
        print("✅ Apache configured successfully")
    else:
        print("⚠️ Apache configuration failed, but Roundcube should still work")
    
    # Final instructions
    print("\n🎉 Roundcube configuration completed!")
    print("=" * 60)
    print(f"📝 Database credentials:")
    print(f"   Database: {db_name}")
    print(f"   User: {db_user}")
    print(f"   Password: {db_password}")
    print(f"\n🔗 Access URLs:")
    if domain:
        print(f"   https://webmail.{domain}")
        print(f"   http://webmail.{domain}")
    print(f"   http://your-server-ip/roundcube")
    print(f"\n⚠️ Important:")
    print(f"   - Save the database password in a secure location")
    print(f"   - Configure your mail server (Postfix/Dovecot) if not already done")
    print(f"   - Test the webmail access with an email account")

if __name__ == "__main__":
    main()
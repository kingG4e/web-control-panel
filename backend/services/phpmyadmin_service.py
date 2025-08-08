import os
import subprocess
import platform
import base64
import hashlib
import time
from datetime import datetime, timedelta
from flask import current_app
from urllib.parse import urlencode

class PhpMyAdminService:
    def __init__(self):
        self.is_windows = platform.system() == 'Windows'
        
        if self.is_windows:
            # Windows simulation mode
            self.phpmyadmin_path = os.path.join(os.environ.get('TEMP', 'C:\\temp'), 'phpmyadmin_simulation')
            self.config_path = os.path.join(self.phpmyadmin_path, 'config')
            os.makedirs(self.config_path, exist_ok=True)
            print("[SIMULATION] phpMyAdmin service running in Windows simulation mode")
        else:
            # Linux production mode - common phpMyAdmin installation paths
            possible_paths = [
                '/usr/share/phpmyadmin',
                '/var/www/phpmyadmin',
                '/var/www/html/phpmyadmin',
                '/opt/phpmyadmin'
            ]
            
            self.phpmyadmin_path = None
            for path in possible_paths:
                if os.path.exists(path):
                    self.phpmyadmin_path = path
                    break
            
            if not self.phpmyadmin_path:
                # Try to detect through which command
                try:
                    result = subprocess.run(['which', 'phpmyadmin'], capture_output=True, text=True)
                    if result.returncode == 0:
                        self.phpmyadmin_path = os.path.dirname(result.stdout.strip())
                except:
                    pass
            
            self.config_path = os.path.join(self.phpmyadmin_path, 'config') if self.phpmyadmin_path else None

    def is_installed(self):
        """Check if phpMyAdmin is installed"""
        if self.is_windows:
            return True  # Always true in simulation mode
        
        if not self.phpmyadmin_path:
            return False
            
        # Check if main phpMyAdmin files exist
        index_file = os.path.join(self.phpmyadmin_path, 'index.php')
        return os.path.exists(index_file)

    def get_phpmyadmin_url(self, database_name=None, username=None):
        """Get phpMyAdmin URL with optional database pre-selection"""
        try:
            base_url = current_app.config.get('PHPMYADMIN_URL', 'http://localhost/phpmyadmin')
            
            if self.is_windows:
                print(f"[SIMULATION] Would open phpMyAdmin: {base_url}")
                if database_name:
                    print(f"[SIMULATION] Pre-selected database: {database_name}")
                return f"{base_url}?db={database_name}" if database_name else base_url
            
            # Real implementation
            params = {}
            if database_name:
                params['db'] = database_name
            if username:
                params['username'] = username
                
            if params:
                return f"{base_url}?{urlencode(params)}"
            return base_url
            
        except Exception as e:
            raise Exception(f'Failed to generate phpMyAdmin URL: {str(e)}')

    def generate_auto_login_token(self, database_name, username, password):
        """Generate auto-login token for phpMyAdmin (if supported)"""
        try:
            if self.is_windows:
                print(f"[SIMULATION] Would generate auto-login token for {username}@{database_name}")
                return "simulated_token_123456"
            
            # Create a temporary token for auto-login
            # This is a simple implementation - in production, you might want to use
            # phpMyAdmin's built-in authentication plugins or custom authentication
            timestamp = int(time.time())
            token_data = f"{username}:{database_name}:{timestamp}"
            token = base64.b64encode(token_data.encode()).decode()
            
            return token
            
        except Exception as e:
            raise Exception(f'Failed to generate auto-login token: {str(e)}')

    def create_auto_login_url(self, database_name, username, password):
        """Create auto-login URL for phpMyAdmin"""
        try:
            base_url = self.get_phpmyadmin_url(database_name)
            
            if self.is_windows:
                return f"{base_url}&auto_login=simulation"
            
            # Generate token
            token = self.generate_auto_login_token(database_name, username, password)
            
            # Create URL with auto-login parameters
            params = {
                'db': database_name,
                'username': username,
                'token': token
            }
            
            return f"{base_url}?{urlencode(params)}"
            
        except Exception as e:
            raise Exception(f'Failed to create auto-login URL: {str(e)}')

    def check_database_access(self, database_name, username, password):
        """Check if user can access the specified database"""
        try:
            import mysql.connector
            
            # Get root password from session (from our earlier implementation)
            from flask import session
            root_password = session.get('mysql_root_password')
            
            if not root_password:
                raise Exception('MySQL root password not configured')
            
            # Connect as root to check user permissions
            conn = mysql.connector.connect(
                host='localhost',
                user='root',
                password=root_password
            )
            cursor = conn.cursor()
            
            # Check if database exists
            cursor.execute("SHOW DATABASES LIKE %s", (database_name,))
            if not cursor.fetchone():
                raise Exception(f'Database {database_name} does not exist')
            
            # Check if user exists and has access to database
            cursor.execute("""
                SELECT * FROM mysql.db 
                WHERE Db = %s AND User = %s 
                AND (Select_priv = 'Y' OR Insert_priv = 'Y' OR Update_priv = 'Y' OR Delete_priv = 'Y')
            """, (database_name, username))
            
            has_access = cursor.fetchone() is not None
            
            cursor.close()
            conn.close()
            
            return has_access
            
        except Exception as e:
            raise Exception(f'Failed to check database access: {str(e)}')

    def install_phpmyadmin(self):
        """Install phpMyAdmin (basic installation)"""
        try:
            if self.is_windows:
                print("[SIMULATION] Would install phpMyAdmin on Windows")
                return True
            
            # Check if running as root/sudo
            if os.geteuid() != 0:
                raise Exception('Root privileges required for installation')
            
            # Update package list
            subprocess.run(['apt', 'update'], check=True)
            
            # Install phpMyAdmin
            subprocess.run(['apt', 'install', '-y', 'phpmyadmin'], check=True)
            
            # Enable Apache/Nginx configuration
            self._configure_web_server()
            
            return True
            
        except subprocess.CalledProcessError as e:
            raise Exception(f'Installation failed: {str(e)}')
        except Exception as e:
            raise Exception(f'Installation error: {str(e)}')

    def _configure_web_server(self):
        """Configure web server for phpMyAdmin"""
        try:
            # Configure Apache if available
            apache_config = '/etc/apache2/conf-available/phpmyadmin.conf'
            if os.path.exists('/etc/apache2') and os.path.exists(apache_config):
                subprocess.run(['a2enconf', 'phpmyadmin'], check=True)
                subprocess.run(['systemctl', 'reload', 'apache2'], check=True)
                
            # Configure Nginx if available
            nginx_config = '/etc/nginx/sites-available/phpmyadmin'
            if os.path.exists('/etc/nginx') and not os.path.exists(nginx_config):
                self._create_nginx_config()
                
        except Exception as e:
            print(f"Warning: Web server configuration failed: {e}")

    def _create_nginx_config(self):
        """Create Nginx configuration for phpMyAdmin"""
        config_content = """
server {
    listen 80;
    server_name localhost;
    root /usr/share/phpmyadmin;
    index index.php;

    location /phpmyadmin {
        alias /usr/share/phpmyadmin;
        
        location ~ \\.php$ {
            include snippets/fastcgi-php.conf;
            fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
            fastcgi_param SCRIPT_FILENAME $request_filename;
        }
    }
}
"""
        nginx_config = '/etc/nginx/sites-available/phpmyadmin'
        with open(nginx_config, 'w') as f:
            f.write(config_content)
        
        # Enable site
        nginx_enabled = '/etc/nginx/sites-enabled/phpmyadmin'
        if not os.path.exists(nginx_enabled):
            os.symlink(nginx_config, nginx_enabled)
        
        subprocess.run(['systemctl', 'reload', 'nginx'], check=True)
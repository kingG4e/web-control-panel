import os
import subprocess
import platform
from jinja2 import Template

class ApacheService:
    def __init__(self):
        self.sites_available = '/etc/apache2/sites-available'
        self.sites_enabled = '/etc/apache2/sites-enabled'
        self.is_development = platform.system() == 'Windows'
        self.template = '''
<VirtualHost *:80>
    ServerName {{ domain_name }}
    DocumentRoot {{ document_root }}
    {% if server_admin %}
    ServerAdmin {{ server_admin }}
    {% endif %}

    <Directory {{ document_root }}>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/{{ domain_name }}_error.log
    CustomLog ${APACHE_LOG_DIR}/{{ domain_name }}_access.log combined
</VirtualHost>
'''

    def create_virtual_host(self, virtual_host):
        """Create Apache virtual host configuration"""
        try:
            # Check if domain already exists
            if self._domain_exists(virtual_host.domain):
                raise Exception(f'Domain "{virtual_host.domain}" already exists. Please choose a different domain name.')
            
            if self.is_development:
                print(f"Development Mode: Simulating Apache virtual host creation for {virtual_host.domain}")
                # Still create document root and index file for testing
                os.makedirs(virtual_host.document_root, exist_ok=True)
                self._create_default_index(virtual_host.document_root, virtual_host.domain)
                return
            
            # Generate configuration from template
            template = Template(self.template)
            config = template.render(
                domain_name=virtual_host.domain,
                document_root=virtual_host.document_root,
                server_admin=virtual_host.server_admin
            )
            
            # Write configuration file
            config_path = os.path.join(self.sites_available, f'{virtual_host.domain}.conf')
            with open(config_path, 'w') as f:
                f.write(config)
            
            # Create document root if it doesn't exist
            os.makedirs(virtual_host.document_root, exist_ok=True)
            
            # Create default index.html if it doesn't exist
            self._create_default_index(virtual_host.document_root, virtual_host.domain)
            
            # Enable site
            self._enable_site(virtual_host.domain)
            
            # Reload Apache
            self._reload_apache()
            
        except Exception as e:
            raise Exception(f'Failed to create virtual host: {str(e)}')

    def delete_virtual_host(self, virtual_host):
        """Delete Apache virtual host configuration"""
        try:
            if self.is_development:
                print(f"Development Mode: Simulating Apache virtual host deletion for {virtual_host.domain}")
                return
            
            # Disable site
            self._disable_site(virtual_host.domain)
            
            # Remove configuration file
            config_path = os.path.join(self.sites_available, f'{virtual_host.domain}.conf')
            if os.path.exists(config_path):
                os.remove(config_path)
            
            # Reload Apache
            self._reload_apache()
            
        except Exception as e:
            raise Exception(f'Failed to delete virtual host: {str(e)}')

    def update_virtual_host(self, virtual_host):
        """Update Apache virtual host configuration"""
        try:
            if self.is_development:
                print(f"Development Mode: Simulating Apache virtual host update for {virtual_host.domain}")
                return
            
            # Delete old configuration and create new one
            self.delete_virtual_host(virtual_host)
            self.create_virtual_host(virtual_host)
            
        except Exception as e:
            raise Exception(f'Failed to update virtual host: {str(e)}')

    def _enable_site(self, domain_name):
        """Enable Apache site"""
        try:
            subprocess.run(['a2ensite', f'{domain_name}.conf'], check=True)
        except subprocess.CalledProcessError as e:
            raise Exception(f'Failed to enable site: {str(e)}')

    def _disable_site(self, domain_name):
        """Disable Apache site"""
        try:
            subprocess.run(['a2dissite', f'{domain_name}.conf'], check=True)
        except subprocess.CalledProcessError as e:
            raise Exception(f'Failed to disable site: {str(e)}')

    def _reload_apache(self):
        """Reload Apache service"""
        try:
            subprocess.run(['systemctl', 'reload', 'apache2'], check=True)
        except subprocess.CalledProcessError as e:
            raise Exception(f'Failed to reload Apache: {str(e)}')

    def _domain_exists(self, domain_name):
        """Check if domain configuration already exists"""
        try:
            # Check if configuration file exists
            config_path = os.path.join(self.sites_available, f'{domain_name}.conf')
            if os.path.exists(config_path):
                return True
            
            # Check if site is enabled
            enabled_path = os.path.join(self.sites_enabled, f'{domain_name}.conf')
            if os.path.exists(enabled_path):
                return True
            
            # In development mode, also check if we're using default development setup
            if self.is_development:
                # Check if there's a directory structure that suggests this domain exists
                potential_paths = [
                    f'/home/{domain_name}',
                    f'/var/www/{domain_name}',
                    f'/home/user/{domain_name}',
                    f'/home/user/public_html/{domain_name}'
                ]
                for path in potential_paths:
                    if os.path.exists(path) and os.path.isdir(path):
                        # Check if it has web files
                        web_files = ['index.html', 'index.php', 'index.htm']
                        for web_file in web_files:
                            if os.path.exists(os.path.join(path, web_file)):
                                return True
            
            return False
            
        except Exception as e:
            # If we can't check, assume it doesn't exist to avoid blocking creation
            print(f"Warning: Could not check if domain exists: {e}")
            return False

    def _create_default_index(self, document_root, domain_name):
        """Create default index.html file"""
        try:
            index_path = os.path.join(document_root, 'index.html')
            if not os.path.exists(index_path):
                index_content = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{domain_name} - Web Control Panel</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }}
        
        .control-panel {{
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(20px);
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            max-width: 900px;
            width: 100%;
            overflow: hidden;
        }}
        
        .header {{
            background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
            color: white;
            padding: 30px;
            text-align: center;
            position: relative;
        }}
        
        .header::before {{
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 20"><defs><radialGradient id="g" cx="20" cy="20" r="20"><stop stop-color="%23ffffff" stop-opacity="0.1"/><stop offset="1" stop-color="%23ffffff" stop-opacity="0"/></radialGradient></defs><rect width="100" height="20" fill="url(%23g)"/></svg>');
            opacity: 0.1;
        }}
        
        .header h1 {{
            font-size: 2.5em;
            font-weight: 300;
            margin-bottom: 10px;
            position: relative;
        }}
        
        .header .subtitle {{
            font-size: 1.1em;
            opacity: 0.9;
            position: relative;
        }}
        
        .status-bar {{
            background: #27ae60;
            color: white;
            padding: 15px 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
        }}
        
        .status-bar i {{
            font-size: 1.2em;
        }}
        
        .content {{
            padding: 40px;
            color: #2c3e50;
        }}
        
        .info-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }}
        
        .info-card {{
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 10px;
            padding: 20px;
            text-align: center;
            transition: transform 0.3s ease;
        }}
        
        .info-card:hover {{
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
        }}
        
        .info-card i {{
            font-size: 2em;
            color: #667eea;
            margin-bottom: 15px;
        }}
        
        .info-card h3 {{
            margin-bottom: 10px;
            font-weight: 600;
        }}
        
        .info-card p {{
            color: #6c757d;
            font-size: 0.9em;
        }}
        
        .instructions {{
            background: #f8f9fa;
            border-left: 4px solid #667eea;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
        }}
        
        .instructions h3 {{
            margin-bottom: 20px;
            color: #2c3e50;
            display: flex;
            align-items: center;
            gap: 10px;
        }}
        
        .instructions ul {{
            list-style: none;
            padding: 0;
        }}
        
        .instructions li {{
            padding: 10px 0;
            border-bottom: 1px solid #e9ecef;
            display: flex;
            align-items: center;
            gap: 15px;
        }}
        
        .instructions li:last-child {{
            border-bottom: none;
        }}
        
        .instructions i {{
            color: #667eea;
            width: 20px;
            text-align: center;
        }}
        
        .footer {{
            background: #f8f9fa;
            border-top: 1px solid #e9ecef;
            padding: 20px 30px;
            text-align: center;
            color: #6c757d;
        }}
        
        .tech-info {{
            margin-top: 15px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 10px;
        }}
        
        .tech-badge {{
            background: #667eea;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8em;
            margin-right: 5px;
        }}
        
        @media (max-width: 768px) {{
            .control-panel {{
                margin: 10px;
            }}
            
            .header h1 {{
                font-size: 2em;
            }}
            
            .content {{
                padding: 20px;
            }}
            
            .info-grid {{
                grid-template-columns: 1fr;
            }}
            
            .tech-info {{
                flex-direction: column;
                text-align: center;
            }}
        }}
    </style>
</head>
<body>
    <div class="control-panel">
        <div class="header">
            <h1><i class="fas fa-globe"></i> {domain_name}</h1>
            <p class="subtitle">Virtual Host Successfully Created</p>
        </div>
        
        <div class="status-bar">
            <i class="fas fa-check-circle"></i>
            <span>Apache Virtual Host is Active and Running</span>
        </div>
        
        <div class="content">
            <div class="info-grid">
                <div class="info-card">
                    <i class="fas fa-folder-open"></i>
                    <h3>Document Root</h3>
                    <p>{os.path.dirname(document_root)}</p>
                </div>
                
                <div class="info-card">
                    <i class="fas fa-server"></i>
                    <h3>Web Server</h3>
                    <p>Apache 2.4</p>
                </div>
                
                <div class="info-card">
                    <i class="fas fa-shield-alt"></i>
                    <h3>Security</h3>
                    <p>Protected & Optimized</p>
                </div>
            </div>
            
            <div class="instructions">
                <h3><i class="fas fa-rocket"></i> Next Steps</h3>
                <ul>
                    <li><i class="fas fa-upload"></i> Upload your website files to the document root</li>
                    <li><i class="fas fa-code"></i> Replace this index.html with your own content</li>
                    <li><i class="fas fa-lock"></i> Configure SSL certificate for HTTPS</li>
                    <li><i class="fas fa-database"></i> Set up database connections if needed</li>
                    <li><i class="fas fa-envelope"></i> Configure email settings through control panel</li>
                </ul>
            </div>
        </div>
        
        <div class="footer">
            <p>Powered by Web Control Panel</p>
            <div class="tech-info">
                <div>
                    <span class="tech-badge">Apache</span>
                    <span class="tech-badge">Linux</span>
                    <span class="tech-badge">MySQL</span>
                    <span class="tech-badge">SSL Ready</span>
                </div>
                <div>
                    <small>Virtual Host Status: <strong style="color: #27ae60;">Active</strong></small>
                </div>
            </div>
        </div>
    </div>
</body>
</html>'''
                
                with open(index_path, 'w', encoding='utf-8') as f:
                    f.write(index_content)
                
                # Set proper permissions
                os.chmod(index_path, 0o644)
                
                # Create a safe .htaccess file without PHP dependencies
                self._create_safe_htaccess(document_root)
                
        except Exception as e:
            raise Exception(f'Failed to create default index.html: {str(e)}')
    
    def _create_safe_htaccess(self, document_root):
        """Create a safe .htaccess file without PHP dependencies"""
        try:
            htaccess_path = os.path.join(document_root, '.htaccess')
            
            # Always create a new safe .htaccess (overwrite existing problematic ones)
            htaccess_content = '''# ============================================
# Web Control Panel - Safe .htaccess Configuration
# ============================================
# This file is automatically generated and optimized
# for compatibility without PHP dependencies

# Security Settings
Options -Indexes
ServerSignature Off

# Disable server-side includes
Options -Includes

# Prevent access to sensitive files
<FilesMatch "^\.">
    Require all denied
</FilesMatch>

# File Protection
<Files .htaccess>
    Require all denied
</Files>

<Files .htpasswd>
    Require all denied
</Files>

<Files config.php>
    Require all denied
</Files>

<Files wp-config.php>
    Require all denied
</Files>

# Prevent access to backup files
<FilesMatch "\.(bak|backup|old|orig|save|swp|tmp)$">
    Require all denied
</FilesMatch>

# Browser Caching (Performance Optimization)
<IfModule mod_expires.c>
    ExpiresActive On
    
    # Images
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/gif "access plus 1 year"
    ExpiresByType image/svg+xml "access plus 1 year"
    ExpiresByType image/webp "access plus 1 year"
    ExpiresByType image/ico "access plus 1 year"
    
    # CSS and JavaScript
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType application/javascript "access plus 1 month"
    ExpiresByType application/x-javascript "access plus 1 month"
    ExpiresByType text/javascript "access plus 1 month"
    
    # Fonts
    ExpiresByType font/woff "access plus 1 year"
    ExpiresByType font/woff2 "access plus 1 year"
    ExpiresByType application/font-woff "access plus 1 year"
    ExpiresByType application/font-woff2 "access plus 1 year"
    
    # Documents
    ExpiresByType application/pdf "access plus 1 month"
    ExpiresByType text/html "access plus 1 day"
</IfModule>

# Compression (Performance Optimization)
<IfModule mod_deflate.c>
    # Compress text files
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/xml
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE text/javascript
    AddOutputFilterByType DEFLATE application/xml
    AddOutputFilterByType DEFLATE application/xhtml+xml
    AddOutputFilterByType DEFLATE application/rss+xml
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/x-javascript
    AddOutputFilterByType DEFLATE application/json
    
    # Don't compress images
    SetEnvIfNoCase Request_URI \
        \.(?:gif|jpe?g|png|webp)$ no-gzip dont-vary
    SetEnvIfNoCase Request_URI \
        \.(?:exe|t?gz|zip|bz2|sit|rar)$ no-gzip dont-vary
</IfModule>

# URL Rewrite (Basic setup for clean URLs)
<IfModule mod_rewrite.c>
    RewriteEngine On
    
    # Redirect to remove trailing slash (except for directories)
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteCond %{REQUEST_URI} (.+)/$
    RewriteRule ^ %1 [R=301,L]
    
    # Handle common missing files gracefully
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteCond %{REQUEST_URI} ^/favicon\.ico$
    RewriteRule .* - [R=404,L]
</IfModule>

# Security Headers (if mod_headers is available)
<IfModule mod_headers.c>
    # Prevent MIME type sniffing
    Header set X-Content-Type-Options nosniff
    
    # XSS Protection
    Header set X-XSS-Protection "1; mode=block"
    
    # Clickjacking protection
    Header set X-Frame-Options SAMEORIGIN
    
    # Remove server signature
    Header unset Server
    Header unset X-Powered-By
</IfModule>

# ============================================
# PHP Configuration (Commented Out for Safety)
# ============================================
# The following PHP settings are commented out to prevent
# Internal Server Error when PHP is not installed.
# 
# To enable PHP functionality:
# 1. Install PHP: sudo apt install php libapache2-mod-php
# 2. Enable PHP module: sudo a2enmod php8.1
# 3. Restart Apache: sudo systemctl restart apache2
# 4. Then uncomment and customize these settings:
#
# php_flag display_errors Off
# php_flag log_errors On
# php_value memory_limit 256M
# php_value upload_max_filesize 64M
# php_value post_max_size 64M
# php_value max_execution_time 300

# ============================================
# Custom Error Pages (Optional)
# ============================================
# Uncomment to use custom error pages:
# ErrorDocument 404 /404.html
# ErrorDocument 403 /403.html
# ErrorDocument 500 /500.html

# ============================================
# Generated by Web Control Panel
# Do not edit manually - changes may be overwritten
# ============================================
'''
            
            with open(htaccess_path, 'w', encoding='utf-8') as f:
                f.write(htaccess_content)
            
            # Set proper permissions
            os.chmod(htaccess_path, 0o644)
            print(f"Created safe .htaccess file for {os.path.basename(document_root)}")
            
        except Exception as e:
            # Don't fail if .htaccess creation fails, just log it
            print(f"Warning: Could not create .htaccess file: {e}") 
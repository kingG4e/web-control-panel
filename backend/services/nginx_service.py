import os
import subprocess
import platform
from jinja2 import Template

class NginxService:
    def __init__(self):
        self.sites_available = '/etc/nginx/sites-available'
        self.sites_enabled = '/etc/nginx/sites-enabled'
        self.is_development = platform.system() == 'Windows'
        self.template = '''
server {
    listen 80;
    server_name {{ domain_name }};
    root {{ document_root }};
    index index.html index.htm index.php;

    {% if server_admin %}
    # Server admin: {{ server_admin }}
    {% endif %}

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
    }

    location ~ /\.ht {
        deny all;
    }

    # Security headers
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    # Hide server information
    server_tokens off;

    error_log /var/log/nginx/{{ domain_name }}_error.log;
    access_log /var/log/nginx/{{ domain_name }}_access.log;
}
'''

    def create_virtual_host(self, virtual_host):
        """Create Nginx virtual host configuration"""
        try:
            if self.is_development:
                print(f"[SIMULATION] Would create Nginx virtual host for: {virtual_host.domain}")
                return True

            # Create document root directory
            document_root = virtual_host.document_root
            os.makedirs(document_root, exist_ok=True)

            # Set proper permissions
            if hasattr(virtual_host, 'linux_username') and virtual_host.linux_username:
                # If linux_username is available, use it for ownership
                subprocess.run(['chown', '-R', f'{virtual_host.linux_username}:{virtual_host.linux_username}', document_root], check=True)
            else:
                # Fallback to www-data if no specific user is associated yet
                subprocess.run(['chown', '-R', 'www-data:www-data', document_root], check=True)
            subprocess.run(['chmod', '-R', '755', document_root], check=True)

            # Generate configuration
            config_content = Template(self.template).render(
                domain_name=virtual_host.domain,
                document_root=document_root,
                server_admin=virtual_host.server_admin or None
            )

            # Write configuration file
            config_path = os.path.join(self.sites_available, f'{virtual_host.domain}.conf')
            with open(config_path, 'w') as f:
                f.write(config_content)

            # Enable site
            self._enable_site(virtual_host.domain)

            # Test and reload Nginx with fallbacks and detailed errors
            self._reload_nginx()

            # Create default index file
            self._create_default_index(document_root, virtual_host.domain)

            return True

        except Exception as e:
            raise Exception(f'Failed to create Nginx virtual host: {str(e)}')

    def delete_virtual_host(self, domain):
        """Delete Nginx virtual host configuration.

        Accepts either a domain string or an object with a `domain` attribute.
        Removes both standard and SSL configs from sites-available and sites-enabled.
        """
        try:
            if self.is_development:
                print(f"[SIMULATION] Would delete Nginx virtual host for: {domain}")
                return True

            # Normalize input
            if hasattr(domain, 'domain'):
                domain = getattr(domain, 'domain')

            # Disable site
            self._disable_site(domain)
            # Also disable potential SSL vhost created by SSL service
            self._disable_site(f"{domain}-ssl")

            # Remove configuration file
            for name in (domain, f"{domain}-ssl"):
                config_path = os.path.join(self.sites_available, f'{name}.conf')
                if os.path.exists(config_path):
                    os.remove(config_path)

            # Remove document root (only if it's in /var/www for backward compatibility)
            document_root = f'/var/www/{domain}'
            if os.path.exists(document_root):
                subprocess.run(['rm', '-rf', document_root], check=True)

            # Test and reload Nginx with fallbacks and detailed errors
            self._reload_nginx()

            return True

        except Exception as e:
            raise Exception(f'Failed to delete Nginx virtual host: {str(e)}')

    def update_virtual_host(self, virtual_host):
        """Update Nginx virtual host configuration"""
        try:
            if self.is_development:
                print(f"[SIMULATION] Would update Nginx virtual host for: {virtual_host.domain}")
                return True

            # Delete existing configuration
            self.delete_virtual_host(virtual_host.domain)

            # Create new configuration
            return self.create_virtual_host(virtual_host)

        except Exception as e:
            raise Exception(f'Failed to update Nginx virtual host: {str(e)}')

    def enable_virtual_host(self, domain):
        """Enable Nginx virtual host"""
        try:
            if self.is_development:
                print(f"[SIMULATION] Would enable Nginx virtual host for: {domain}")
                return True

            self._enable_site(domain)
            self._reload_nginx()
            return True

        except Exception as e:
            raise Exception(f'Failed to enable Nginx virtual host: {str(e)}')

    def disable_virtual_host(self, domain):
        """Disable Nginx virtual host"""
        try:
            if self.is_development:
                print(f"[SIMULATION] Would disable Nginx virtual host for: {domain}")
                return True

            self._disable_site(domain)
            self._reload_nginx()
            return True

        except Exception as e:
            raise Exception(f'Failed to disable Nginx virtual host: {str(e)}')

    def get_virtual_hosts(self):
        """Get list of all Nginx virtual hosts"""
        try:
            if self.is_development:
                return ["example.com", "test.local"]

            virtual_hosts = []
            for filename in os.listdir(self.sites_enabled):
                if filename.endswith('.conf'):
                    domain = filename.replace('.conf', '')
                    virtual_hosts.append(domain)
            return virtual_hosts

        except Exception as e:
            raise Exception(f'Failed to get Nginx virtual hosts: {str(e)}')

    def _enable_site(self, domain):
        """Enable Nginx site by creating symlink"""
        source = os.path.join(self.sites_available, f'{domain}.conf')
        target = os.path.join(self.sites_enabled, f'{domain}.conf')
        if not os.path.exists(target):
            os.symlink(source, target)

    def _disable_site(self, domain):
        """Disable Nginx site by removing symlink (idempotent)."""
        target = os.path.join(self.sites_enabled, f'{domain}.conf')
        if os.path.islink(target) or os.path.exists(target):
            try:
                os.unlink(target)
            except FileNotFoundError:
                pass

    def _create_default_index(self, document_root, domain_name):
        """Create default index.html file"""
        index_content = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to {domain_name}</title>
    <style>
        body {{
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
        }}
        .header {{
            text-align: center;
            padding: 40px 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 10px;
            margin-bottom: 30px;
        }}
        .content {{
            background: #f8f9fa;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }}
        .status {{
            background: #d4edda;
            color: #155724;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }}
        .info {{
            background: #d1ecf1;
            color: #0c5460;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>Welcome to {domain_name}</h1>
        <p>Your website is now running successfully!</p>
    </div>
    
    <div class="content">
        <div class="status">
            <h2>✅ Site Status: Active</h2>
            <p>Your virtual host is configured and running properly.</p>
        </div>
        
        <div class="info">
            <h3>📋 Site Information</h3>
            <ul>
                <li><strong>Domain:</strong> {domain_name}</li>
                <li><strong>Document Root:</strong> {document_root}</li>
                <li><strong>Web Server:</strong> Nginx</li>
                <li><strong>Status:</strong> Active</li>
            </ul>
        </div>
        
        <h3>🚀 Next Steps</h3>
        <p>To customize this page:</p>
        <ol>
            <li>Replace this index.html file with your own content</li>
            <li>Upload your website files to the document root directory</li>
            <li>Configure any additional settings through the Web Control Panel</li>
        </ol>
        
        <h3>🔧 Technical Details</h3>
        <p>This virtual host is managed by the Web Control Panel and uses Nginx as the web server. 
        The configuration supports PHP, static files, and includes security headers for enhanced protection.</p>
    </div>
    
    <footer style="text-align: center; margin-top: 40px; color: #666;">
        <p>Powered by Web Control Panel | Generated on {subprocess.run(['date'], capture_output=True, text=True).stdout.strip()}</p>
    </footer>
</body>
</html>'''

        index_path = os.path.join(document_root, 'index.html')
        with open(index_path, 'w') as f:
            f.write(index_content)

        # Set proper permissions
        if hasattr(virtual_host, 'linux_username') and virtual_host.linux_username:
            subprocess.run(['chown', f'{virtual_host.linux_username}:{virtual_host.linux_username}', index_path], check=True)
        else:
            subprocess.run(['chown', 'www-data:www-data', index_path], check=True)
        subprocess.run(['chmod', '644', index_path], check=True) 

    def _reload_nginx(self):
        """Validate configuration and reload Nginx with fallbacks, raising detailed errors on failure."""
        def _run(cmd):
            result = subprocess.run(cmd, capture_output=True, text=True)
            return result.returncode == 0, result.stdout, result.stderr

        ok, out, err = _run(['nginx', '-t'])
        if not ok:
            message = err.strip() or out.strip() or 'nginx -t failed without output'
            raise Exception(f"nginx -t failed: {message}")

        errors = []
        for cmd in [
            ['systemctl', 'reload', 'nginx'],
            ['nginx', '-s', 'reload'],
            ['service', 'nginx', 'reload'],
        ]:
            ok, out, err = _run(cmd)
            if ok:
                return True
            errors.append(f"{' '.join(cmd)} => {(err or out).strip()}")

        raise Exception("All Nginx reload attempts failed: " + " | ".join(errors))
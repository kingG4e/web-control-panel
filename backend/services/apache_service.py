import os
import subprocess
from jinja2 import Template

class ApacheService:
    def __init__(self):
        self.sites_available = '/etc/apache2/sites-available'
        self.sites_enabled = '/etc/apache2/sites-enabled'
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
            # Generate configuration from template
            template = Template(self.template)
            config = template.render(
                domain_name=virtual_host.domain_name,
                document_root=virtual_host.document_root,
                server_admin=virtual_host.server_admin
            )
            
            # Write configuration file
            config_path = os.path.join(self.sites_available, f'{virtual_host.domain_name}.conf')
            with open(config_path, 'w') as f:
                f.write(config)
            
            # Create document root if it doesn't exist
            os.makedirs(virtual_host.document_root, exist_ok=True)
            
            # Enable site
            self._enable_site(virtual_host.domain_name)
            
            # Reload Apache
            self._reload_apache()
            
        except Exception as e:
            raise Exception(f'Failed to create virtual host: {str(e)}')

    def delete_virtual_host(self, virtual_host):
        """Delete Apache virtual host configuration"""
        try:
            # Disable site
            self._disable_site(virtual_host.domain_name)
            
            # Remove configuration file
            config_path = os.path.join(self.sites_available, f'{virtual_host.domain_name}.conf')
            if os.path.exists(config_path):
                os.remove(config_path)
            
            # Reload Apache
            self._reload_apache()
            
        except Exception as e:
            raise Exception(f'Failed to delete virtual host: {str(e)}')

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
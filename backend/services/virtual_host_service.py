import os
import subprocess
from typing import Optional, List, Dict
from .base_service import BaseService
from models import VirtualHost, VirtualHostAlias
from models.base import db

class VirtualHostService(BaseService):
    def __init__(self):
        super().__init__(VirtualHost)
        self.nginx_sites_path = '/etc/nginx/sites-available'
        self.nginx_enabled_path = '/etc/nginx/sites-enabled'

    def create_virtual_host(self, data: Dict) -> VirtualHost:
        try:
            # Create virtual host record
            virtual_host = super().create(data)

            # Create document root directory if it doesn't exist
            os.makedirs(virtual_host.document_root, exist_ok=True)
            os.chmod(virtual_host.document_root, 0o755)

            # Create Nginx configuration
            self._create_nginx_config(virtual_host)

            # Enable the site
            self._enable_site(virtual_host.domain)

            # Reload Nginx
            self._reload_nginx()



            return virtual_host
        except Exception as e:
            # Cleanup if something goes wrong
            if 'virtual_host' in locals():
                super().delete(virtual_host.id)
            raise e

    def update_virtual_host(self, id: int, data: Dict) -> Optional[VirtualHost]:
        virtual_host = super().update(id, data)
        if virtual_host:
            self._create_nginx_config(virtual_host)
            self._reload_nginx()
        return virtual_host

    def delete_virtual_host(self, id: int) -> bool:
        virtual_host = self.get_by_id(id)
        if not virtual_host:
            return False

        try:
            domain = virtual_host.domain
            user_id = virtual_host.user_id

            # Disable the site
            self._disable_site(domain)

            # Remove Nginx configuration
            config_path = os.path.join(self.nginx_sites_path, f"{domain}.conf")
            if os.path.exists(config_path):
                os.remove(config_path)

            # Delete the virtual host record
            result = super().delete(id)

            # Reload Nginx
            self._reload_nginx()



            return result
        except Exception as e:
            raise e

    def add_alias(self, virtual_host_id: int, domain: str) -> Optional[VirtualHostAlias]:
        try:
            alias = VirtualHostAlias(
                domain=domain,
                virtual_host_id=virtual_host_id
            )
            db.session.add(alias)
            db.session.commit()

            # Update Nginx configuration
            virtual_host = self.get_by_id(virtual_host_id)
            self._create_nginx_config(virtual_host)
            self._reload_nginx()

            return alias
        except Exception as e:
            db.session.rollback()
            raise e

    def remove_alias(self, alias_id: int) -> bool:
        try:
            alias = VirtualHostAlias.query.get(alias_id)
            if not alias:
                return False

            virtual_host_id = alias.virtual_host_id
            db.session.delete(alias)
            db.session.commit()

            # Update Nginx configuration
            virtual_host = self.get_by_id(virtual_host_id)
            self._create_nginx_config(virtual_host)
            self._reload_nginx()

            return True
        except Exception as e:
            db.session.rollback()
            raise e

    def _create_nginx_config(self, virtual_host: VirtualHost) -> None:
        config = f"""server {{
    listen 80;
    server_name {virtual_host.domain}"""
        
        # Add aliases
        if virtual_host.aliases:
            config += " " + " ".join(alias.domain for alias in virtual_host.aliases)
        
        config += f""";

    root {virtual_host.document_root};
    index index.html index.htm index.php;

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
    
    # Serve ACME challenge files for Let's Encrypt HTTP-01 validation
    location ^~ /.well-known/acme-challenge/ {{
        default_type "text/plain";
        alias {virtual_host.document_root}/.well-known/acme-challenge/;
        try_files $uri =404;
    }}
"""
        
        # Add PHP configuration if specified
        if virtual_host.php_version:
            config += f"""
    location ~ \.php$ {{
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php{virtual_host.php_version}-fpm.sock;
    }}
"""
        
        config += f"""
    location ~ /\.ht {{
        deny all;
    }}

    error_log /var/log/nginx/{virtual_host.domain}_error.log;
    access_log /var/log/nginx/{virtual_host.domain}_access.log;
}}"""

        # Write configuration to file
        config_path = os.path.join(self.nginx_sites_path, f"{virtual_host.domain}.conf")
        with open(config_path, 'w') as f:
            f.write(config)

    def _enable_site(self, domain: str) -> None:
        source = os.path.join(self.nginx_sites_path, f"{domain}.conf")
        target = os.path.join(self.nginx_enabled_path, f"{domain}.conf")
        if not os.path.exists(target):
            os.symlink(source, target)

    def _disable_site(self, domain: str) -> None:
        target = os.path.join(self.nginx_enabled_path, f"{domain}.conf")
        if os.path.exists(target):
            os.unlink(target)

    def _reload_nginx(self) -> None:
        subprocess.run(['nginx', '-t'], check=True)  # Test configuration
        subprocess.run(['systemctl', 'reload', 'nginx'], check=True)

    def get_virtual_hosts_by_user(self, user_id: int) -> List[VirtualHost]:
        """Get all virtual hosts owned by a specific user"""
        return VirtualHost.query.filter_by(user_id=user_id).all() 
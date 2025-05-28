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

            # Create root directory if it doesn't exist
            os.makedirs(virtual_host.root_directory, exist_ok=True)
            os.chmod(virtual_host.root_directory, 0o755)

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
            # Disable the site
            self._disable_site(virtual_host.domain)

            # Remove Nginx configuration
            config_path = os.path.join(self.nginx_sites_path, f"{virtual_host.domain}.conf")
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

    root {virtual_host.root_directory};
    index index.html index.htm index.php;

    location / {{
        try_files $uri $uri/ /index.php?$query_string;
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
        
        config += """
    location ~ /\.ht {
        deny all;
    }
}"""

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
import os
import subprocess
from typing import Optional, List, Dict
from .base_service import BaseService
from models import VirtualHost, VirtualHostAlias
from models.email import EmailDomain
from models.base import db
from .mail_db_sync_service import MailDBSyncService
from .nginx_service import NginxService

class VirtualHostService(BaseService):
    def __init__(self):
        super().__init__(VirtualHost)
        self.nginx_sites_path = '/etc/nginx/sites-available'
        self.nginx_enabled_path = '/etc/nginx/sites-enabled'
        self.mail_sync = MailDBSyncService()

    def create_virtual_host(self, data: Dict) -> VirtualHost:
        try:
            # Extract non-model flags before creating DB record
            skip_email_provision = bool(data.pop('skip_email_provision', False))

            # Create virtual host record (model expects only real columns)
            virtual_host = super().create(data)

            # Create document root directory if it doesn't exist
            os.makedirs(virtual_host.document_root, exist_ok=True)
            os.chmod(virtual_host.document_root, 0o755)

            # Create default index using the same template as normal creation
            try:
                NginxService()._create_default_index(virtual_host.document_root, virtual_host)
            except Exception:
                pass

            # Create Nginx configuration
            self._create_nginx_config(virtual_host)

            # Enable the site
            self._enable_site(virtual_host.domain)

            # Reload Nginx
            self._reload_nginx()

            # Optionally skip email provisioning if requested by caller
            if not skip_email_provision:
                # Ensure EmailDomain exists for this virtual host (mail integration)
                try:
                    existing = EmailDomain.query.filter_by(domain=virtual_host.domain).first()
                    if not existing:
                        email_domain = EmailDomain(
                            domain=virtual_host.domain,
                            virtual_host_id=virtual_host.id,
                            status='active'
                        )
                        db.session.add(email_domain)
                        db.session.commit()
                    # Also upsert to server mail DB
                    try:
                        self.mail_sync.ensure_schema()
                        self.mail_sync.upsert_domain(virtual_host.domain, 'active')
                    except Exception:
                        pass
                except Exception:
                    db.session.rollback()
                    # Non-fatal: email domain creation should not block vhost creation
                    pass

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

            # Remove related EmailDomain(s) if safe (no accounts/forwarders)
            try:
                related_domains = EmailDomain.query.filter_by(virtual_host_id=virtual_host.id).all()
                for ed in related_domains:
                    if not ed.accounts and not ed.forwarders:
                        db.session.delete(ed)
                db.session.commit()
                # Cleanup in server mail DB when empty
                try:
                    for ed in related_domains:
                        self.mail_sync.remove_domain_if_empty(ed.domain)
                except Exception:
                    pass
            except Exception:
                db.session.rollback()
                # Non-fatal
                pass

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

            # Ensure EmailDomain exists for alias domain
            try:
                existing = EmailDomain.query.filter_by(domain=domain).first()
                if not existing:
                    email_domain = EmailDomain(
                        domain=domain,
                        virtual_host_id=virtual_host_id,
                        status='active'
                    )
                    db.session.add(email_domain)
                    db.session.commit()
                # Also upsert to server mail DB
                try:
                    self.mail_sync.ensure_schema()
                    self.mail_sync.upsert_domain(domain, 'active')
                except Exception:
                    pass
            except Exception:
                db.session.rollback()
                pass

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

            # Optionally remove EmailDomain for alias domain if no longer referenced
            try:
                # Only delete EmailDomain if it points to this vhost and has no accounts/forwarders
                email_domain = EmailDomain.query.filter_by(domain=alias.domain, virtual_host_id=virtual_host_id).first()
                if email_domain and not email_domain.accounts and not email_domain.forwarders:
                    db.session.delete(email_domain)
                    db.session.commit()
                # Attempt cleanup in server mail DB if empty
                try:
                    self.mail_sync.remove_domain_if_empty(alias.domain)
                except Exception:
                    pass
            except Exception:
                db.session.rollback()
                pass

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
        """Validate configuration and reload Nginx with fallbacks, raising detailed errors on failure."""
        def _run(cmd):
            result = subprocess.run(cmd, capture_output=True, text=True)
            return result.returncode == 0, result.stdout, result.stderr

        # 1. Validate configuration
        ok, out, err = _run(['nginx', '-t'])
        if not ok:
            # Combine stderr and stdout for a comprehensive error message
            message = (err or '').strip() + ('\\n' + (out or '').strip() if out else '')
            raise Exception(f"nginx -t failed: {message.strip()}")

        # 2. Attempt to reload using multiple methods
        errors = []
        for cmd in [
            ['systemctl', 'reload', 'nginx'],
            ['nginx', '-s', 'reload'],
            ['service', 'nginx', 'reload'],
        ]:
            ok, out, err = _run(cmd)
            if ok:
                return  # Success
            errors.append(f"CMD: `{' '.join(cmd)}` | ERR: `{(err or out).strip()}`")

        # 3. If all attempts fail, raise a consolidated error
        raise Exception("All Nginx reload attempts failed: " + " || ".join(errors))

    def get_virtual_hosts_by_user(self, user_id: int) -> List[VirtualHost]:
        """Get all virtual hosts owned by a specific user"""
        return VirtualHost.query.filter_by(user_id=user_id).all() 
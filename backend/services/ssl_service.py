import os
import subprocess
import shutil
from datetime import datetime
from cryptography import x509
from cryptography.hazmat.backends import default_backend
from cryptography.x509.oid import NameOID

class SSLService:
    def __init__(self):
        # Configuration
        self.certbot_path = os.getenv('CERTBOT_PATH', '/usr/bin/certbot')
        self.certificates_dir = os.getenv('LE_LIVE_DIR', '/etc/letsencrypt/live')
        self.nginx_config_dir = os.getenv('NGINX_SITES_AVAILABLE', '/etc/nginx/sites-available')
        self.nginx_enabled_dir = os.getenv('NGINX_SITES_ENABLED', '/etc/nginx/sites-enabled')
        self.certbot_email = os.getenv('CERTBOT_EMAIL')
        self.certbot_staging = os.getenv('CERTBOT_STAGING', 'false').lower() in ('1', 'true', 'yes')
        
        # Cloudflare DNS-01 Configuration
        self.certbot_dns_plugin = 'dns-cloudflare'
        self.certbot_dns_credentials = os.getenv('CERTBOT_DNS_CREDENTIALS', '/etc/letsencrypt/cloudflare.ini')
        self.certbot_dns_propagation_seconds = os.getenv('CERTBOT_DNS_PROPAGATION_SECONDS', '60')

    def issue_certificate(self, domain, user_id=None, document_root=None):
        """Issue a new SSL certificate using Let's Encrypt DNS-01"""
        try:
            # 1. Pre-check: Credentials file
            if not os.path.exists(self.certbot_dns_credentials):
                raise Exception(f"Cloudflare credentials file not found at: {self.certbot_dns_credentials}")

            # 2. Build and Run Command
            command = self._build_certbot_command(domain)
            subprocess.run(command, check=True, capture_output=True, text=True)
            
            # 3. Get certificate paths
            cert_path = os.path.join(self.certificates_dir, domain, 'fullchain.pem')
            key_path = os.path.join(self.certificates_dir, domain, 'privkey.pem')
            chain_path = os.path.join(self.certificates_dir, domain, 'chain.pem')
            
            if not os.path.exists(cert_path):
                raise Exception("Certbot finished but certificate file was not found.")

            # 4. Read Certificate Details
            with open(cert_path, 'rb') as f:
                cert_data = x509.load_pem_x509_certificate(f.read(), default_backend())
            
            return {
                'certificate_path': cert_path,
                'private_key_path': key_path,
                'chain_path': chain_path,
                'issuer': self._get_issuer(cert_data),
                'valid_from': self._get_date(cert_data, 'not_valid_before'),
                'valid_until': self._get_date(cert_data, 'not_valid_after')
            }
            
        except subprocess.CalledProcessError as e:
            raise Exception(f'Certbot failed. Exit code {e.returncode}. Error: {e.stderr}')
        except Exception as e:
            raise Exception(f'Failed to issue certificate: {str(e)}')

    def renew_certificate(self, domain, user_id=None):
        """Renew an SSL certificate"""
        try:
            command = [self.certbot_path, 'renew', '--cert-name', domain, '--force-renewal']
            if self.certbot_staging:
                command.append('--staging')
                
            subprocess.run(command, check=True, capture_output=True, text=True)
            
            # Return new validity dates
            cert_path = os.path.join(self.certificates_dir, domain, 'fullchain.pem')
            with open(cert_path, 'rb') as f:
                cert_data = x509.load_pem_x509_certificate(f.read(), default_backend())

            return {
                'valid_from': self._get_date(cert_data, 'not_valid_before'),
                'valid_until': self._get_date(cert_data, 'not_valid_after')
            }
        except Exception as e:
            raise Exception(f'Failed to renew certificate: {str(e)}')

    def revoke_certificate(self, domain):
        """Revoke SSL and Delete files"""
        try:
            # 1. Revoke with Let's Encrypt
            command = [
                self.certbot_path, 'revoke',
                '--cert-name', domain,
                '--non-interactive'
            ]
            # Use check=False because if cert is already gone/expired it might error, but we still want to delete files
            subprocess.run(command, check=False, capture_output=True, text=True)
            
            # 2. Delete files and DB records
            self.delete_certificate(domain)
            
        except Exception as e:
            raise Exception(f'Failed to revoke certificate: {str(e)}')

    def delete_certificate(self, domain, cert_id=None):
        """Delete certificate files (OS) and Record (DB)"""
        try:
            # --- Part 1: OS Level Deletion (Certbot & Nginx) ---
            
            # 1.1 Run Certbot Delete (The specific command you asked for)
            cmd_delete = [
                self.certbot_path, 'delete',
                '--cert-name', domain,
                '--non-interactive'
            ]
            subprocess.run(cmd_delete, check=False, capture_output=True, text=True)

            # 1.2 Remove Nginx Configs
            conf_path = os.path.join(self.nginx_config_dir, f'{domain}-ssl.conf')
            enabled_path = os.path.join(self.nginx_enabled_dir, f'{domain}-ssl.conf')
            
            if os.path.exists(enabled_path):
                os.remove(enabled_path)
            if os.path.exists(conf_path):
                os.remove(conf_path)

            # 1.3 Reload Nginx to apply changes
            subprocess.run(['nginx', '-t'], check=False, capture_output=True) # Check config first
            subprocess.run(['systemctl', 'reload', 'nginx'], check=False)

            # --- Part 2: Database Level Deletion ---
            if cert_id:
                from models.ssl_certificate import SSLCertificate, SSLCertificateLog
                from models.database import db

                cert = SSLCertificate.query.get(cert_id)
                if cert:
                    SSLCertificateLog.query.filter_by(certificate_id=cert_id).delete()
                    db.session.delete(cert)
                    db.session.commit()
                    print(f"Certificate DB record {cert_id} deleted.")

            return True

        except Exception as e:
            print(f"Error deleting certificate for {domain}: {str(e)}")
            return False

    def configure_nginx_ssl(self, domain, certificate_path, private_key_path, document_root=None):
        """Configure Nginx to use SSL"""
        try:
            config_path = os.path.join(self.nginx_config_dir, f'{domain}-ssl.conf')
            if not document_root:
                document_root = f'/var/www/{domain}'
            
            # Adjust PHP socket path if needed
            php_sock = "unix:/var/run/php/php8.3-fpm.sock"

            config = f'''server {{
    listen 443 ssl http2;
    server_name {domain};
    root {document_root};
    index index.html index.htm index.php;

    ssl_certificate {certificate_path};
    ssl_certificate_key {private_key_path};

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    location / {{
        try_files $uri $uri/ /index.php?$query_string;
    }}

    location ~ \.php$ {{
        include snippets/fastcgi-php.conf;
        fastcgi_pass {php_sock};
    }}

    location ~ /\.ht {{
        deny all;
    }}

    error_log /var/log/nginx/{domain}-ssl-error.log;
    access_log /var/log/nginx/{domain}-ssl-access.log;
}}'''
            
            with open(config_path, 'w') as f:
                f.write(config)
            
            # Symlink
            enabled_path = os.path.join(self.nginx_enabled_dir, f'{domain}-ssl.conf')
            if not os.path.exists(enabled_path):
                subprocess.run(['ln', '-sf', config_path, enabled_path], check=True)
            
            # Cleanup .well-known
            if document_root and document_root != f'/var/www/{domain}':
                well_known_dir = os.path.join(document_root, '.well-known')
                if os.path.exists(well_known_dir):
                    shutil.rmtree(well_known_dir)
            
            # Test & Reload
            subprocess.run(['nginx', '-t'], check=True, capture_output=True)
            subprocess.run(['systemctl', 'reload', 'nginx'], check=True)
            
        except subprocess.CalledProcessError as e:
            err = e.stderr.decode() if e.stderr else str(e)
            raise Exception(f'Nginx Config Failed: {err}')

    def get_certificate_info(self, domain):
        try:
            cert_path = os.path.join(self.certificates_dir, domain, 'fullchain.pem')
            if not os.path.exists(cert_path):
                return None
            
            with open(cert_path, 'rb') as f:
                cert_data = x509.load_pem_x509_certificate(f.read(), default_backend())
            
            return {
                'issuer': self._get_issuer(cert_data),
                'valid_from': self._get_date(cert_data, 'not_valid_before'),
                'valid_until': self._get_date(cert_data, 'not_valid_after'),
                'serial_number': format(cert_data.serial_number, 'x'),
                'subject': self._get_subject(cert_data)
            }
        except Exception:
            return None

    def _build_certbot_command(self, domain):
        """Helper to build certbot command"""
        cmd = [
            self.certbot_path, 'certonly',
            '--dns-cloudflare',
            '--dns-cloudflare-credentials', self.certbot_dns_credentials,
            '--dns-cloudflare-propagation-seconds', str(self.certbot_dns_propagation_seconds),
            '-d', domain,
            '--non-interactive',
            '--agree-tos',
            '--keep-until-expiring',
            '--expand'
        ]
        
        if self.certbot_email:
            cmd += ['--email', self.certbot_email]
        else:
            cmd.append('--register-unsafely-without-email')

        if self.certbot_staging:
            cmd.append('--staging')
            
        return cmd

    def _get_issuer(self, cert_data):
        try: return cert_data.issuer.get_attributes_for_oid(NameOID.COMMON_NAME)[0].value
        except: return None

    def _get_subject(self, cert_data):
        try: return cert_data.subject.get_attributes_for_oid(NameOID.COMMON_NAME)[0].value
        except: return None

    def _get_date(self, cert_data, attr_name):
        """Helper to safely get date across cryptography versions"""
        try:
            return getattr(cert_data, f"{attr_name}_utc")
        except AttributeError:
            return getattr(cert_data, attr_name)

    def get_certificates_by_user(self, user_id: int) -> list:
        try:
            from models.ssl_certificate import SSLCertificate
            return SSLCertificate.query.filter_by(user_id=user_id).all()
        except Exception:
            return []
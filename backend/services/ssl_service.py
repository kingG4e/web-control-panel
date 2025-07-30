import os
import subprocess
from datetime import datetime
from cryptography import x509
from cryptography.hazmat.backends import default_backend
from cryptography.x509.oid import NameOID

class SSLService:
    def __init__(self):
        self.certbot_path = '/usr/bin/certbot'
        self.certificates_dir = '/etc/letsencrypt/live'
        self.nginx_config_dir = '/etc/nginx/sites-available'

    def issue_certificate(self, domain, user_id=None, document_root=None):
        """Issue a new SSL certificate using Let's Encrypt"""
        try:
            # Use certbot with webroot method if document_root is provided
            if document_root:
                # Create .well-known directory for ACME challenge
                well_known_dir = os.path.join(document_root, '.well-known', 'acme-challenge')
                os.makedirs(well_known_dir, exist_ok=True)
                
                command = [
                    self.certbot_path,
                    'certonly',
                    '--webroot',
                    '--webroot-path', document_root,
                    '--non-interactive',
                    '--agree-tos',
                    '-d', domain,
                    '--keep-until-expiring',
                    '--expand'
                ]
            else:
                # Fallback to nginx plugin
                command = [
                    self.certbot_path,
                    'certonly',
                    '--nginx',  # Use Nginx plugin
                    '--non-interactive',
                    '--agree-tos',
                    '-d', domain,
                    '--keep-until-expiring',
                    '--expand'
                ]
            
            subprocess.run(command, check=True, capture_output=True, text=True)
            
            # Get certificate paths
            cert_path = os.path.join(self.certificates_dir, domain, 'fullchain.pem')
            key_path = os.path.join(self.certificates_dir, domain, 'privkey.pem')
            chain_path = os.path.join(self.certificates_dir, domain, 'chain.pem')
            
            # Get certificate details
            with open(cert_path, 'rb') as f:
                cert_data = x509.load_pem_x509_certificate(f.read(), default_backend())
            

            
            return {
                'certificate_path': cert_path,
                'private_key_path': key_path,
                'chain_path': chain_path,
                'issuer': self._get_issuer(cert_data),
                'valid_from': cert_data.not_valid_before,
                'valid_until': cert_data.not_valid_after
            }
            
        except Exception as e:
            raise Exception(f'Failed to issue certificate: {str(e)}')

    def renew_certificate(self, domain, user_id=None):
        """Renew an SSL certificate"""
        try:
            # Run certbot to renew certificate
            command = [
                self.certbot_path,
                'renew',
                '--cert-name', domain,
                '--force-renewal'
            ]
            
            subprocess.run(command, check=True, capture_output=True, text=True)
            
            # Get certificate paths
            cert_path = os.path.join(self.certificates_dir, domain, 'fullchain.pem')
            
            # Get certificate details
            with open(cert_path, 'rb') as f:
                cert_data = x509.load_pem_x509_certificate(f.read(), default_backend())
            

            
            return {
                'valid_from': cert_data.not_valid_before,
                'valid_until': cert_data.not_valid_after
            }
            
        except Exception as e:
            raise Exception(f'Failed to renew certificate: {str(e)}')

    def revoke_certificate(self, domain):
        """Revoke an SSL certificate"""
        try:
            # Run certbot to revoke certificate
            command = [
                self.certbot_path,
                'revoke',
                '--cert-name', domain,
                '--non-interactive'
            ]
            
            subprocess.run(command, check=True, capture_output=True, text=True)
            
            # Delete certificate files
            self.delete_certificate(domain)
            
        except subprocess.CalledProcessError as e:
            raise Exception(f'Failed to revoke certificate: {e.stderr}')
        except Exception as e:
            raise Exception(f'Failed to revoke certificate: {str(e)}')

    def delete_certificate(self, cert_id):
        """Delete certificate by ID"""
        try:
            from models.ssl_certificate import SSLCertificate, SSLCertificateLog
            from models.database import db

            # Get certificate
            cert = SSLCertificate.query.get(cert_id)
            if not cert:
                print(f"Certificate ID {cert_id} not found")
                return False

            # Delete logs first
            SSLCertificateLog.query.filter_by(certificate_id=cert_id).delete()

            # Delete certificate record
            db.session.delete(cert)
            db.session.commit()

            print(f"Certificate {cert_id} deleted successfully")
            return True

        except Exception as e:
            print(f"Error deleting certificate {cert_id}: {str(e)}")
            return False

    def get_certificate_info(self, domain):
        """Get SSL certificate information"""
        try:
            cert_path = os.path.join(self.certificates_dir, domain, 'fullchain.pem')
            
            if not os.path.exists(cert_path):
                return None
            
            with open(cert_path, 'rb') as f:
                cert_data = x509.load_pem_x509_certificate(f.read(), default_backend())
            
            return {
                'issuer': self._get_issuer(cert_data),
                'valid_from': cert_data.not_valid_before,
                'valid_until': cert_data.not_valid_after,
                'serial_number': format(cert_data.serial_number, 'x'),
                'subject': self._get_subject(cert_data)
            }
            
        except Exception as e:
            raise Exception(f'Failed to get certificate info: {str(e)}')

    def configure_nginx_ssl(self, domain, certificate_path, private_key_path, document_root=None):
        """Configure Nginx to use SSL certificate"""
        try:
            config_path = os.path.join(self.nginx_config_dir, f'{domain}-ssl.conf')
            
            # Use provided document root or fallback to /var/www for backward compatibility
            if not document_root:
                document_root = f'/var/www/{domain}'
            
            # Use provided document root or fallback to /var/www for backward compatibility
            if not document_root:
                document_root = f'/var/www/{domain}'
            
            # Use provided document root or fallback to /var/www for backward compatibility
            if not document_root:
                document_root = f'/var/www/{domain}'
            
            # Create SSL configuration
            config = f'''server {{
    listen 443 ssl http2;
    server_name {domain};
    root {document_root};
    index index.html index.htm index.php;

    ssl_certificate {certificate_path};
    ssl_certificate_key {private_key_path};
    
    # SSL configuration
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
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
    }}

    location ~ /\.ht {{
        deny all;
    }}

    error_log /var/log/nginx/{domain}-error.log;
    access_log /var/log/nginx/{domain}-access.log;
}}

# Redirect HTTP to HTTPS
server {{
    listen 80;
    server_name {domain};
    return 301 https://$server_name$request_uri;
}}'''
            
            # Write configuration file
            with open(config_path, 'w') as f:
                f.write(config)
            
            # Enable site
            subprocess.run(['ln', '-sf', config_path, f'/etc/nginx/sites-enabled/{domain}-ssl.conf'], check=True)
            
            # Remove .well-known directory after certificate issuance
            if document_root and document_root != f'/var/www/{domain}':
                well_known_dir = os.path.join(document_root, '.well-known')
                if os.path.exists(well_known_dir):
                    import shutil
                    shutil.rmtree(well_known_dir)
            
            # Remove .well-known directory after certificate issuance
            if document_root and document_root != f'/var/www/{domain}':
                well_known_dir = os.path.join(document_root, '.well-known')
                if os.path.exists(well_known_dir):
                    import shutil
                    shutil.rmtree(well_known_dir)
            
            # Test and reload Nginx
            subprocess.run(['nginx', '-t'], check=True)
            subprocess.run(['systemctl', 'reload', 'nginx'], check=True)
            
        except subprocess.CalledProcessError as e:
            raise Exception(f'Failed to configure Nginx SSL: {str(e)}')
        except Exception as e:
            raise Exception(f'Failed to configure Nginx SSL: {str(e)}')

    def _get_issuer(self, cert_data):
        """Get certificate issuer name"""
        try:
            issuer = cert_data.issuer.get_attributes_for_oid(NameOID.COMMON_NAME)[0].value
            return issuer
        except:
            return None

    def _get_subject(self, cert_data):
        """Get certificate subject name"""
        try:
            subject = cert_data.subject.get_attributes_for_oid(NameOID.COMMON_NAME)[0].value
            return subject
        except:
            return None

    def get_certificates_by_user(self, user_id: int) -> list:
        """Get all SSL certificates owned by a specific user"""
        try:
            from models.ssl_certificate import SSLCertificate
            return SSLCertificate.query.filter_by(user_id=user_id).all()
        except Exception as e:
            print(f"Error getting certificates for user {user_id}: {str(e)}")
            return [] 
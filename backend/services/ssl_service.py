import os
import subprocess
from datetime import datetime
from cryptography import x509
from cryptography.hazmat.backends import default_backend
from cryptography.x509.oid import NameOID

class SSLService:
    def __init__(self):
        # Allow overrides via environment for flexibility across systems
        self.certbot_path = os.getenv('CERTBOT_PATH', '/usr/bin/certbot')
        self.certificates_dir = os.getenv('LE_LIVE_DIR', '/etc/letsencrypt/live')
        self.nginx_config_dir = os.getenv('NGINX_SITES_AVAILABLE', '/etc/nginx/sites-available')
        self.certbot_email = os.getenv('CERTBOT_EMAIL')  # Optional
        self.certbot_staging = os.getenv('CERTBOT_STAGING', 'false').lower() in ('1', 'true', 'yes')
        # DNS-01 support
        self.certbot_auth_method = os.getenv('CERTBOT_AUTH_METHOD', '').lower()  # '', 'webroot', 'nginx', 'dns'
        self.certbot_dns_plugin = os.getenv('CERTBOT_DNS_PLUGIN')  # e.g. 'dns-cloudflare', 'dns-digitalocean', 'dns-google', 'dns-route53'
        self.certbot_dns_credentials = os.getenv('CERTBOT_DNS_CREDENTIALS')  # path to credentials file for the dns plugin
        self.certbot_dns_propagation_seconds = os.getenv('CERTBOT_DNS_PROPAGATION_SECONDS')  # string seconds

    def issue_certificate(self, domain, user_id=None, document_root=None):
        """Issue a new SSL certificate using Let's Encrypt"""
        try:
            # Ensure webroot exists if provided
            if document_root and not os.path.isdir(document_root):
                raise Exception(f'Document root does not exist: {document_root}')

            # Prepare ACME challenge dir for webroot
            if document_root:
                well_known_dir = os.path.join(document_root, '.well-known', 'acme-challenge')
                os.makedirs(well_known_dir, exist_ok=True)

            command = self._build_certbot_command(domain, document_root=document_root)

            result = subprocess.run(command, check=True, capture_output=True, text=True)
            
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
            
        except subprocess.CalledProcessError as e:
            stderr = e.stderr.strip() if e.stderr else ''
            stdout = e.stdout.strip() if e.stdout else ''
            raise Exception(f'Certbot failed (issue). Exit {e.returncode}. Stderr: {stderr}. Stdout: {stdout}')
        except Exception as e:
            raise Exception(f'Failed to issue certificate: {str(e)}')

    def renew_certificate(self, domain, user_id=None):
        """Renew an SSL certificate"""
        try:
            # Run certbot to renew certificate
            command = [self.certbot_path, 'renew', '--cert-name', domain, '--force-renewal']
            if self.certbot_staging:
                command.append('--staging')
            result = subprocess.run(command, check=True, capture_output=True, text=True)
            
            # Get certificate paths
            cert_path = os.path.join(self.certificates_dir, domain, 'fullchain.pem')
            
            # Get certificate details
            with open(cert_path, 'rb') as f:
                cert_data = x509.load_pem_x509_certificate(f.read(), default_backend())
            

            
            return {
                'valid_from': cert_data.not_valid_before,
                'valid_until': cert_data.not_valid_after
            }
            
        except subprocess.CalledProcessError as e:
            stderr = e.stderr.strip() if e.stderr else ''
            stdout = e.stdout.strip() if e.stdout else ''
            raise Exception(f'Certbot failed (renew). Exit {e.returncode}. Stderr: {stderr}. Stdout: {stdout}')
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
            stderr = e.stderr.decode('utf-8', errors='ignore') if isinstance(e.stderr, (bytes, bytearray)) else (e.stderr or '')
            raise Exception(f'Failed to configure Nginx SSL: {stderr}')
        except Exception as e:
            raise Exception(f'Failed to configure Nginx SSL: {str(e)}')

    def _build_certbot_command(self, domain: str, document_root: str = None):
        """Build certbot command with proper flags and environment options."""
        base_cmd = [self.certbot_path, 'certonly']

        # Decide authenticator
        use_dns = False
        if self.certbot_auth_method == 'dns' or (self.certbot_dns_plugin and self.certbot_dns_plugin.startswith('dns-')):
            use_dns = True

        if use_dns:
            plugin = self.certbot_dns_plugin
            if not plugin:
                raise Exception('DNS auth selected but CERTBOT_DNS_PLUGIN is not set (e.g. dns-cloudflare)')
            base_cmd += [f'--{plugin}']

            # Many plugins support credentials & propagation flags in a consistent naming scheme
            cred_flag = f'--{plugin}-credentials'
            prop_flag = f'--{plugin}-propagation-seconds'

            # Route53 is special; skip credentials flag if not provided
            if self.certbot_dns_credentials and plugin != 'dns-route53':
                base_cmd += [cred_flag, self.certbot_dns_credentials]
            if self.certbot_dns_propagation_seconds:
                base_cmd += [prop_flag, str(self.certbot_dns_propagation_seconds)]

        else:
            # Fallback order: webroot if provided, else nginx plugin
            if document_root:
                base_cmd += ['--webroot', '--webroot-path', document_root]
            else:
                base_cmd += ['--nginx']

        base_cmd += ['--non-interactive', '--agree-tos', '-d', domain, '--keep-until-expiring', '--expand']

        if self.certbot_email:
            base_cmd += ['--email', self.certbot_email]
        else:
            # For non-interactive mode without email, allow unsafe registration (testing/dev)
            base_cmd.append('--register-unsafely-without-email')

        if self.certbot_staging:
            base_cmd.append('--staging')

        return base_cmd

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
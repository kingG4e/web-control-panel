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
        self.apache_config_dir = '/etc/apache2/sites-available'

    def issue_certificate(self, domain):
        """Issue a new SSL certificate using Let's Encrypt"""
        try:
            # Run certbot to obtain certificate
            command = [
                self.certbot_path,
                'certonly',
                '--apache',  # Use Apache plugin
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
            
        except subprocess.CalledProcessError as e:
            raise Exception(f'Failed to issue certificate: {e.stderr}')
        except Exception as e:
            raise Exception(f'Failed to issue certificate: {str(e)}')

    def renew_certificate(self, domain):
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
            
        except subprocess.CalledProcessError as e:
            raise Exception(f'Failed to renew certificate: {e.stderr}')
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

    def configure_apache_ssl(self, domain, certificate_path, private_key_path):
        """Configure Apache to use SSL certificate"""
        try:
            config_path = os.path.join(self.apache_config_dir, f'{domain}-le-ssl.conf')
            
            # Create SSL configuration
            config = f'''<IfModule mod_ssl.c>
<VirtualHost *:443>
    ServerName {domain}
    DocumentRoot /var/www/{domain}
    
    SSLEngine on
    SSLCertificateFile {certificate_path}
    SSLCertificateKeyFile {private_key_path}
    
    <Directory /var/www/{domain}>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
    
    ErrorLog ${{APACHE_LOG_DIR}}/error.log
    CustomLog ${{APACHE_LOG_DIR}}/access.log combined
</VirtualHost>
</IfModule>'''
            
            # Write configuration file
            with open(config_path, 'w') as f:
                f.write(config)
            
            # Enable site and SSL module
            subprocess.run(['a2enmod', 'ssl'], check=True)
            subprocess.run(['a2ensite', f'{domain}-le-ssl'], check=True)
            
            # Reload Apache
            subprocess.run(['systemctl', 'reload', 'apache2'], check=True)
            
        except subprocess.CalledProcessError as e:
            raise Exception(f'Failed to configure Apache SSL: {str(e)}')
        except Exception as e:
            raise Exception(f'Failed to configure Apache SSL: {str(e)}')

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
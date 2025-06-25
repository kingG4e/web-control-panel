# Import base first
from .base import db

# Import models in correct order to avoid circular imports
from .user import User
from .notification import Notification
from .virtual_host import VirtualHost, VirtualHostAlias
from .database import Database
from .dns import DNSRecord
from .email import EmailAccount
from .ftp import FTPAccount
from .ssl_certificate import SSLCertificate
from .ssl import SSLCertificate as SSLCert, SSLCertificateLog

# Make sure all models are available
__all__ = [
    'db',
    'User',
    'Notification', 
    'VirtualHost',
    'VirtualHostAlias',
    'Database',
    'DNSRecord',
    'EmailAccount',
    'FTPAccount',
    'SSLCertificate',
    'SSLCert',
    'SSLCertificateLog'
] 
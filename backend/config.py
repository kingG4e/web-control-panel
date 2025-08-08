import os
from datetime import timedelta

class Config:
    """Base configuration class."""
    
    # Flask Configuration
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    DEBUG = os.environ.get('FLASK_DEBUG', 'True').lower() == 'true'
    
    # Database Configuration
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///controlpanel.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
    }
    
    # Session Configuration
    PERMANENT_SESSION_LIFETIME = timedelta(hours=24)
    SESSION_COOKIE_SECURE = os.environ.get('SESSION_COOKIE_SECURE', 'False').lower() == 'true'
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    
    # JWT Configuration
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or SECRET_KEY
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    
    # CORS Configuration
    CORS_ORIGINS = [
        "http://localhost:3000",
        "http://127.0.0.1:3000", 
        "http://0.0.0.0:3000",
        # Allow any IP in common private network ranges:
        # 192.168.0.0/16, 10.0.0.0/8, 172.16.0.0/12
        "http://192.168.0.0/16",
        "http://10.0.0.0/8",
        "http://172.16.0.0/12"
    ]
    
    # File Upload Configuration
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER') or 'uploads'
    ALLOWED_EXTENSIONS = {'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'zip', 'tar', 'gz'}
    
    # Email Configuration
    MAIL_SERVER = os.environ.get('MAIL_SERVER') or 'localhost'
    MAIL_PORT = int(os.environ.get('MAIL_PORT') or 587)
    MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', 'True').lower() == 'true'
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER') or 'noreply@localhost'
    
    # SSL Configuration
    SSL_CERT_PATH = os.environ.get('SSL_CERT_PATH') or '/etc/ssl/certs'
    SSL_KEY_PATH = os.environ.get('SSL_KEY_PATH') or '/etc/ssl/private'
    SSL_AUTO_RENEWAL = os.environ.get('SSL_AUTO_RENEWAL', 'True').lower() == 'true'
    
    # Nginx Configuration
    NGINX_CONFIG_DIR = os.environ.get('NGINX_CONFIG_DIR') or '/etc/nginx/sites-available'
    NGINX_SITES_ENABLED = os.environ.get('NGINX_SITES_ENABLED') or '/etc/nginx/sites-enabled'
    NGINX_RELOAD_COMMAND = os.environ.get('NGINX_RELOAD_COMMAND') or 'systemctl reload nginx'
    
    # DNS Configuration
    BIND_CONFIG_DIR = os.environ.get('BIND_CONFIG_DIR') or '/etc/bind'
    BIND_ZONES_DIR = os.environ.get('BIND_ZONES_DIR') or '/var/lib/bind'
    BIND_RELOAD_COMMAND = os.environ.get('BIND_RELOAD_COMMAND') or 'systemctl reload bind9'
    BIND_DEV_MODE = os.environ.get('BIND9_DEV_MODE', 'False').lower() == 'true'
    
    # MySQL Configuration
    MYSQL_HOST = os.environ.get('MYSQL_HOST') or 'localhost'
    MYSQL_PORT = int(os.environ.get('MYSQL_PORT') or 3306)
    MYSQL_USER = os.environ.get('MYSQL_USER') or 'root'
    MYSQL_PASSWORD = os.environ.get('MYSQL_PASSWORD') or ''
    MYSQL_ROOT_PASSWORD = os.environ.get('MYSQL_ROOT_PASSWORD') or ''
    
    # phpMyAdmin Configuration
    PHPMYADMIN_URL = os.environ.get('PHPMYADMIN_URL') or 'http://localhost/phpmyadmin'
    PHPMYADMIN_PATH = os.environ.get('PHPMYADMIN_PATH') or '/usr/share/phpmyadmin'
    PHPMYADMIN_ENABLED = os.environ.get('PHPMYADMIN_ENABLED', 'True').lower() == 'true'
    

    
    # Logging Configuration
    LOG_LEVEL = os.environ.get('LOG_LEVEL') or 'INFO'
    LOG_FILE = os.environ.get('LOG_FILE') or 'logs/app.log'
    LOG_MAX_SIZE = int(os.environ.get('LOG_MAX_SIZE') or 10 * 1024 * 1024)  # 10MB
    LOG_BACKUP_COUNT = int(os.environ.get('LOG_BACKUP_COUNT') or 5)
    
    # Security Configuration
    PASSWORD_MIN_LENGTH = int(os.environ.get('PASSWORD_MIN_LENGTH') or 8)
    PASSWORD_REQUIRE_UPPERCASE = os.environ.get('PASSWORD_REQUIRE_UPPERCASE', 'True').lower() == 'true'
    PASSWORD_REQUIRE_LOWERCASE = os.environ.get('PASSWORD_REQUIRE_LOWERCASE', 'True').lower() == 'true'
    PASSWORD_REQUIRE_DIGITS = os.environ.get('PASSWORD_REQUIRE_DIGITS', 'True').lower() == 'true'
    PASSWORD_REQUIRE_SPECIAL = os.environ.get('PASSWORD_REQUIRE_SPECIAL', 'False').lower() == 'true'
    
    # Enhanced Security Configuration
    SESSION_TIMEOUT = int(os.environ.get('SESSION_TIMEOUT') or 3600)  # 1 hour
    MAX_LOGIN_ATTEMPTS = int(os.environ.get('MAX_LOGIN_ATTEMPTS') or 5)
    LOCKOUT_DURATION = int(os.environ.get('LOCKOUT_DURATION') or 1800)  # 30 minutes
    PASSWORD_EXPIRY_DAYS = int(os.environ.get('PASSWORD_EXPIRY_DAYS') or 90)
    REQUIRE_2FA = os.environ.get('REQUIRE_2FA', 'False').lower() == 'true'
    ALLOWED_FILE_EXTENSIONS = os.environ.get('ALLOWED_FILE_EXTENSIONS', 'txt,pdf,png,jpg,jpeg,gif,zip,tar,gz').split(',')
    MAX_FILE_SIZE = int(os.environ.get('MAX_FILE_SIZE') or 16 * 1024 * 1024)  # 16MB
    
    # CSRF Protection
    WTF_CSRF_ENABLED = os.environ.get('WTF_CSRF_ENABLED', 'True').lower() == 'true'
    WTF_CSRF_TIME_LIMIT = int(os.environ.get('WTF_CSRF_TIME_LIMIT') or 3600)
    
    # Content Security Policy
    CSP_DEFAULT_SRC = os.environ.get('CSP_DEFAULT_SRC', "'self'")
    CSP_SCRIPT_SRC = os.environ.get('CSP_SCRIPT_SRC', "'self' 'unsafe-inline'")
    CSP_STYLE_SRC = os.environ.get('CSP_STYLE_SRC', "'self' 'unsafe-inline'")
    CSP_IMG_SRC = os.environ.get('CSP_IMG_SRC', "'self' data: https:")
    CSP_CONNECT_SRC = os.environ.get('CSP_CONNECT_SRC', "'self'")
    
    # API Security
    API_RATE_LIMIT = os.environ.get('API_RATE_LIMIT') or '100 per minute'
    API_RATE_LIMIT_STORAGE = os.environ.get('API_RATE_LIMIT_STORAGE') or 'memory://'
    API_KEY_REQUIRED = os.environ.get('API_KEY_REQUIRED', 'False').lower() == 'true'
    
    # Rate Limiting
    RATELIMIT_ENABLED = os.environ.get('RATELIMIT_ENABLED', 'True').lower() == 'true'
    RATELIMIT_STORAGE_URL = os.environ.get('RATELIMIT_STORAGE_URL') or 'memory://'
    RATELIMIT_DEFAULT = os.environ.get('RATELIMIT_DEFAULT') or '100 per minute'
    
    # Backup Configuration
    BACKUP_ENABLED = os.environ.get('BACKUP_ENABLED', 'True').lower() == 'true'
    BACKUP_DIR = os.environ.get('BACKUP_DIR') or 'backups'
    BACKUP_RETENTION_DAYS = int(os.environ.get('BACKUP_RETENTION_DAYS') or 30)
    
    @staticmethod
    def init_app(app):
        """Initialize application with configuration."""
        # Create necessary directories
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
        os.makedirs(app.config['BACKUP_DIR'], exist_ok=True)
        os.makedirs(os.path.dirname(app.config['LOG_FILE']), exist_ok=True)

class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///dev_controlpanel.db'
    LOG_LEVEL = 'DEBUG'

class TestingConfig(Config):
    """Testing configuration."""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    WTF_CSRF_ENABLED = False

class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')
    SESSION_COOKIE_SECURE = True
    LOG_LEVEL = 'WARNING'
    
    @classmethod
    def init_app(cls, app):
        Config.init_app(app)
        
        # Production-specific initialization
        import logging
        from logging.handlers import RotatingFileHandler
        
        if not app.debug and not app.testing:
            # Set up file logging
            file_handler = RotatingFileHandler(
                app.config['LOG_FILE'],
                maxBytes=app.config['LOG_MAX_SIZE'],
                backupCount=app.config['LOG_BACKUP_COUNT']
            )
            file_handler.setFormatter(logging.Formatter(
                '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
            ))
            file_handler.setLevel(logging.INFO)
            app.logger.addHandler(file_handler)
            
            app.logger.setLevel(logging.INFO)
            app.logger.info('Control Panel startup')

# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
} 
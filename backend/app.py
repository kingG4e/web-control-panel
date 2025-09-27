import os
import platform
from datetime import timedelta
from typing import Optional

from flask import Flask, jsonify, send_from_directory, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from models.database import db, init_db
from utils.logger import setup_logger
from config import Config
from sqlalchemy import inspect, text
from dotenv import load_dotenv

# Setup logger
logger = setup_logger(__name__)

def get_current_user() -> str:
    """Get current username with proper error handling."""
    try:
        # Check if running with sudo
        if os.environ.get('SUDO_USER'):
            return os.environ.get('SUDO_USER')
        
        # Try to get user from pwd (Unix/Linux)
        try:
            import pwd
            return os.environ.get('USER') or pwd.getpwuid(os.getuid()).pw_name
        except ImportError:
            logger.warning("pwd module not available (Windows system)")
        
        # Windows fallback
        return os.environ.get('USERNAME') or os.environ.get('USER') or 'user'
    except Exception as e:
        logger.error(f"Error getting current user: {e}")
        return 'user'

def setup_file_manager_root() -> str:
    """Setup file manager root directory with proper permissions."""
    current_user = get_current_user()
    logger.info(f"Running as user: {current_user}")
    
    # Set file manager root directory based on OS
    if platform.system() == 'Windows':
        file_manager_root = os.path.join(os.getcwd(), 'web-files')
    else:
        file_manager_root = f'/home/{current_user}'
    
    # If can't access home directory, fallback to web-files in current directory
    if not os.access(file_manager_root, os.W_OK):
        logger.warning(f"Cannot write to {file_manager_root}")
        file_manager_root = os.path.abspath('web-files')
        
        try:
            os.makedirs(file_manager_root, exist_ok=True)
            
            # Change ownership if running with sudo (Linux only)
            if os.environ.get('SUDO_USER'):
                try:
                    import pwd
                    uid = pwd.getpwnam(current_user).pw_uid
                    gid = pwd.getpwnam(current_user).pw_gid
                    os.chown(file_manager_root, uid, gid)
                except ImportError:
                    logger.warning("pwd module not available for ownership change")
            
            if not os.access(file_manager_root, os.W_OK):
                raise Exception("Cannot write to web-files directory")
        except Exception as e:
            logger.warning(f"Could not use web-files directory: {e}")
            # Last resort - use temp directory
            if platform.system() == 'Windows':
                file_manager_root = os.path.join(os.environ.get('TEMP', 'C:\\temp'), 'web-files')
            else:
                file_manager_root = os.path.join('/tmp', 'web-files')
            
            os.makedirs(file_manager_root, exist_ok=True)
            
            # Change ownership of temp directory if running with sudo
            if os.environ.get('SUDO_USER'):
                try:
                    import pwd
                    uid = pwd.getpwnam(current_user).pw_uid
                    gid = pwd.getpwnam(current_user).pw_gid
                    os.chown(file_manager_root, uid, gid)
                except ImportError:
                    logger.warning("pwd module not available for ownership change")
    
    # Ensure directory exists and is writable
    try:
        os.makedirs(file_manager_root, exist_ok=True)
        test_file = os.path.join(file_manager_root, '.test_write')
        with open(test_file, 'w') as f:
            f.write('test')
        os.remove(test_file)
        logger.info(f"File Manager Root Directory: {file_manager_root}")
        logger.info(f"Directory exists: {os.path.exists(file_manager_root)}")
        logger.info(f"Directory is writable: {os.access(file_manager_root, os.W_OK)}")
        return file_manager_root
    except Exception as e:
        logger.error(f"Error: Could not write to directory {file_manager_root}: {e}")
        raise e

def create_app(config_class=Config) -> Flask:
    """Application factory pattern."""
    # Load environment variables from .env file
    load_dotenv()
    
    app = Flask(__name__, static_folder='../frontend/build', static_url_path='/')
    
    # Load configuration
    app.config.from_object(config_class)
    
    # Setup file manager root
    file_manager_root = setup_file_manager_root()
    os.environ['FILE_MANAGER_ROOT'] = file_manager_root
    
    # Configure CORS
    CORS(app, 
         supports_credentials=True, 
         origins=[
             "http://localhost:3000", 
             "http://127.0.0.1:3000",
             "http://0.0.0.0:3000",
             "http://192.168.128.4:3000",
             "http://192.168.1.174:3000"
         ],
         allow_headers=["Content-Type", "Authorization"])
    
    # Initialize extensions
    init_db(app)
    JWTManager(app)
    Migrate(app, db)
    
    # Import models after db is initialized
    from models.user import User
    from models.virtual_host import VirtualHost
    from models.dns import DNSZone, DNSRecord
    from models.ssl_certificate import SSLCertificate, SSLCertificateLog
    from models.email import EmailDomain, EmailAccount, EmailForwarder, EmailAlias
    
    # Import and register blueprints
    from routes.auth import auth_bp
    from routes.system import system_bp
    from routes.files import files_bp
    from routes.dns import dns_bp
    from routes.virtual_host import virtual_host_bp
    from routes.ssl import ssl_bp
    from routes.email import email_bp
    from routes.roundcube import roundcube_bp
    from routes.user import user_bp
    from routes.database import database_bp
    from routes.signup import signup_bp
    from routes.quota import quota_bp
    from routes.settings import settings_bp
    
    app.register_blueprint(auth_bp)
    app.register_blueprint(system_bp)
    app.register_blueprint(files_bp, url_prefix='/api/files')
    app.register_blueprint(dns_bp)
    app.register_blueprint(virtual_host_bp)
    app.register_blueprint(ssl_bp)
    app.register_blueprint(email_bp)
    app.register_blueprint(roundcube_bp)
    app.register_blueprint(user_bp)
    app.register_blueprint(database_bp)
    app.register_blueprint(signup_bp)
    app.register_blueprint(quota_bp)
    app.register_blueprint(settings_bp)
    
    # Create database tables
    with app.app_context():
        try:
            db.create_all()
            logger.info("Database tables created successfully")
            # Lightweight migration: ensure new columns exist
            try:
                _ensure_schema_migrations()
            except Exception as mig_e:
                logger.warning(f"Schema migration check failed: {mig_e}")
        except Exception as e:
            logger.error(f"Error creating database tables: {e}")
            raise
    
    # Register routes and error handlers
    register_routes(app)
    register_error_handlers(app)
    
    return app

def _ensure_schema_migrations() -> None:
    """Best-effort schema migrations for SQLite without Alembic.
    Adds missing columns/indexes introduced after initial release.
    """
    try:
        inspector = inspect(db.engine)
        tables = inspector.get_table_names()
        if 'signup_request' in tables:
            columns = {col['name'] for col in inspector.get_columns('signup_request')}
            # Add domain column if missing (nullable to allow SQLite ALTER)
            if 'domain' not in columns:
                with db.engine.begin() as conn:
                    conn.execute(text("ALTER TABLE signup_request ADD COLUMN domain VARCHAR(255)"))
                    # Best-effort unique index (SQLite allows duplicates before index creation may fail if duplicates exist)
                    try:
                        conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_signup_request_domain ON signup_request (domain)"))
                    except Exception:
                        pass
            # Add email column if missing
            if 'email' not in columns:
                with db.engine.begin() as conn:
                    conn.execute(text("ALTER TABLE signup_request ADD COLUMN email VARCHAR(120)"))
        # Ensure signup_meta table exists (for new flow)
        if 'signup_meta' not in tables:
            # Create via SQL to avoid importing models here
            with db.engine.begin() as conn:
                conn.execute(text(
                    """
CREATE TABLE IF NOT EXISTS signup_meta (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    domain VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    server_password_enc TEXT,
    options_json JSON,
    storage_quota_mb INTEGER,
    status VARCHAR(20) DEFAULT 'pending',
    admin_comment VARCHAR(255),
    approved_by INTEGER,
    approved_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
                    """
                ))
        else:
            # Lightweight migration: add full_name column if missing
            meta_columns = {col['name'] for col in inspector.get_columns('signup_meta')}
            if 'full_name' not in meta_columns:
                with db.engine.begin() as conn:
                    conn.execute(text("ALTER TABLE signup_meta ADD COLUMN full_name VARCHAR(255)"))
    except Exception as e:
        # Do not block app start; log only
        logger.warning(f"Ensure schema migrations failed: {e}")

def register_routes(app: Flask) -> None:
    """Register application routes."""
    
    @app.route('/')
    def serve_frontend():
        return app.send_static_file('index.html')
    
    @app.route('/<path:path>')
    def serve_static(path):
        """Serve React build files. If file not found, fall back to index.html for SPA routing."""
        # If the requested path is an API route, return 404 (handled by blueprints)
        if path.startswith('api'):
            return jsonify({'success': False, 'error': 'Not found'}), 404
        
        file_path = os.path.join(app.static_folder, path)
        if os.path.exists(file_path):
            return send_from_directory(app.static_folder, path)
        else:
            # Fallback to index.html so React Router can handle the route
            return app.send_static_file('index.html')
    
    @app.route('/api/health')
    def health_check():
        """Basic health check endpoint."""
        from datetime import datetime, timezone
        logger.info(f"Health check requested from {request.remote_addr}")
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'version': '2.0.0'
        })
    
    @app.route('/api/docs')
    def api_documentation():
        """API Documentation endpoint."""
        return jsonify({
            'title': 'Web Control Panel API',
            'version': '2.0.0',
            'description': 'Complete API documentation for Web Control Panel',
            'endpoints': {
                'authentication': {
                    'POST /api/auth/login': 'User login',
                    'POST /api/auth/logout': 'User logout',
                    'POST /api/auth/refresh': 'Refresh JWT token',
                    'GET /api/auth/user': 'Get current user',
                    'POST /api/auth/register': 'Register new user',
                    'POST /api/auth/change-password': 'Change password'
                },
                'virtual_hosts': {
                    'GET /api/virtual-hosts': 'List all virtual hosts',
                    'POST /api/virtual-hosts': 'Create new virtual host',
                    'GET /api/virtual-hosts/{id}': 'Get virtual host details',
                    'PUT /api/virtual-hosts/{id}': 'Update virtual host',
                    'DELETE /api/virtual-hosts/{id}': 'Delete virtual host'
                },
                'dns': {
                    'GET /api/dns/zones': 'List DNS zones',
                    'POST /api/dns/zones': 'Create DNS zone',
                    'GET /api/dns/zones/{id}/records': 'Get DNS records',
                    'POST /api/dns/zones/{id}/records': 'Create DNS record'
                },
                'system': {
                    'GET /api/system/health': 'Enhanced system health check with scores',
                    'GET /api/system/metrics': 'System performance metrics',
                    'GET /api/system/info': 'System information and features',
                    'GET /api/system/logs': 'System logs (Admin only)',
                    'GET /api/system/sync-check': 'Database/filesystem sync check (Admin only)',
                    'POST /api/system/sync-check/fix': 'Auto-fix sync issues (Admin only)',
                    'GET /api/system/config-validation': 'Validate service configurations (Admin only)',
                    'GET /api/system/rate-limits': 'View current rate limits',
                    'POST /api/system/rate-limits/reset': 'Reset rate limits (Admin only)',
                    'GET /api/system/backup': 'List backups (Admin only)',
                    'POST /api/system/backup': 'Create full system backup (Admin only)',
                    'DELETE /api/system/backup/{id}': 'Delete backup (Admin only)',
                    'POST /api/system/backup/cleanup': 'Cleanup old backups (Admin only)',
                    'GET /api/dashboard/stats': 'Get dashboard statistics for current user',
                    'GET /api/dashboard/debug-user-data': 'Debug user data and relationships'
                },
                'files': {
                    'GET /api/files': 'List files',
                    'POST /api/files/upload': 'Upload file',
                    'DELETE /api/files/{path}': 'Delete file'
                }
            },
            'authentication': {
                'type': 'Bearer Token',
                'header': 'Authorization: Bearer <token>'
            },
            'rate_limiting': {
                'default': '100 requests per minute',
                'login': '5 attempts per 15 minutes'
            }
        })

def register_error_handlers(app: Flask) -> None:
    """Register error handlers."""
    
    @app.errorhandler(500)
    def internal_error(error):
        logger.error(f"Internal server error: {error}")
        return jsonify({'error': 'Internal server error'}), 500
    
    @app.errorhandler(404)
    def not_found(error):
        logger.warning(f"Not found: {request.url}")
        return jsonify({'error': 'Not found'}), 404
    
    @app.errorhandler(400)
    def bad_request(error):
        logger.warning(f"Bad request: {error}")
        return jsonify({'error': 'Bad request'}), 400
    
    @app.errorhandler(401)
    def unauthorized(error):
        logger.warning(f"Unauthorized: {error}")
        return jsonify({'error': 'Unauthorized'}), 401
    
    @app.errorhandler(403)
    def forbidden(error):
        logger.warning(f"Forbidden: {error}")
        return jsonify({'error': 'Forbidden'}), 403

# Create app instance
app = create_app()

if __name__ == '__main__':
    # Set startup time for health check
    import datetime
    os.environ['STARTUP_TIME'] = datetime.datetime.now().isoformat()
    
    # Run the application
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True
    ) 
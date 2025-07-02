import os
import platform
from datetime import timedelta
from typing import Optional

from flask import Flask, jsonify, send_from_directory, request
from flask_cors import CORS

from models.database import db, init_db
from utils.logger import setup_logger
from config import Config

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
    app = Flask(__name__, static_folder='../frontend/build', static_url_path='/')
    
    # Load configuration
    app.config.from_object(config_class)
    
    # Setup file manager root
    file_manager_root = setup_file_manager_root()
    os.environ['FILE_MANAGER_ROOT'] = file_manager_root
    
    # Configure CORS
    CORS(app, 
         supports_credentials=True, 
         origins=app.config.get('CORS_ORIGINS', [
             "http://localhost:3000", 
             "http://127.0.0.1:3000",
             "http://192.168.1.174:3000",
             "http://0.0.0.0:3000",
             # Allow any IP in local network
             "http://192.168.0.0/16",
             "http://10.0.0.0/8", 
             "http://172.16.0.0/12"
         ]))
    
    # Initialize extensions
    init_db(app)
    
    # Import models after db is initialized
    from models.user import User
    from models.virtual_host import VirtualHost
    from models.dns import DNSZone, DNSRecord
    from models.ssl_certificate import SSLCertificate, SSLCertificateLog
    from models.email import EmailDomain, EmailAccount, EmailForwarder, EmailAlias
    from models.ftp import FTPAccount
    
    # Import and register blueprints
    from routes.auth import auth_bp
    from routes.system import system_bp
    from routes.files import files_bp
    from routes.dns import dns_bp
    from routes.virtual_host import virtual_host_bp
    from routes.ssl import ssl_bp
    from routes.email import email_bp
    from routes.roundcube import roundcube_bp
    from routes.notifications import notifications_bp
    from routes.user import user_bp
    from routes.database import database_bp
    
    app.register_blueprint(auth_bp)
    app.register_blueprint(system_bp)
    app.register_blueprint(files_bp, url_prefix='/api/files')
    app.register_blueprint(dns_bp)
    app.register_blueprint(virtual_host_bp)
    app.register_blueprint(ssl_bp)
    app.register_blueprint(email_bp)
    app.register_blueprint(roundcube_bp)
    app.register_blueprint(notifications_bp)
    app.register_blueprint(user_bp)
    app.register_blueprint(database_bp)
    
    # Create database tables
    with app.app_context():
        try:
            db.create_all()
            logger.info("Database tables created successfully")
        except Exception as e:
            logger.error(f"Error creating database tables: {e}")
            raise
    
    # Register routes and error handlers
    register_routes(app)
    register_error_handlers(app)
    
    return app

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
        return jsonify({
            "status": "healthy",
            "version": "1.0.0",
            "timestamp": os.environ.get('STARTUP_TIME', 'unknown')
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
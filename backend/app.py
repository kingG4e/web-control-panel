from flask import Flask, jsonify, send_from_directory, request, session
from flask_cors import CORS
# from flask_compress import Compress  # Enable after installing flask-compress
from datetime import timedelta
from models.database import db, init_db
from routes.auth import auth_bp
from routes.system import system_bp
from routes.files import files_bp
import os
import platform

# Import pwd only on Unix/Linux systems
try:
    import pwd
    PWD_AVAILABLE = True
except ImportError:
    PWD_AVAILABLE = False
    print("Warning: pwd module not available (Windows system)")
    pwd = None

# Get current username from environment or pwd database
try:
    # Check if running with sudo
    if os.environ.get('SUDO_USER'):
        current_user = os.environ.get('SUDO_USER')
    elif PWD_AVAILABLE and pwd:
        current_user = os.environ.get('USER') or pwd.getpwuid(os.getuid()).pw_name
    else:
        # Windows fallback
        current_user = os.environ.get('USERNAME') or os.environ.get('USER') or 'user'
    print(f"Running as user: {current_user}")
except:
    current_user = 'user'  # fallback
    print(f"Using fallback user: {current_user}")

# Set file manager root directory based on OS
if platform.system() == 'Windows':
    # Windows: use current directory or user profile
    FILE_MANAGER_ROOT = os.path.join(os.getcwd(), 'web-files')
else:
    # Linux: use user's home directory
    FILE_MANAGER_ROOT = f'/home/{current_user}'

# If can't access home directory, fallback to a directory we can write to
if not os.access(FILE_MANAGER_ROOT, os.W_OK):
    print(f"Warning: Cannot write to {FILE_MANAGER_ROOT}")
    # Try to create web-files in current directory first
    FILE_MANAGER_ROOT = os.path.abspath('web-files')
    try:
        os.makedirs(FILE_MANAGER_ROOT, exist_ok=True)
        # Change ownership to the actual user if running with sudo (Linux only)
        if PWD_AVAILABLE and pwd and os.environ.get('SUDO_USER'):
            uid = pwd.getpwnam(current_user).pw_uid
            gid = pwd.getpwnam(current_user).pw_gid
            os.chown(FILE_MANAGER_ROOT, uid, gid)
        if not os.access(FILE_MANAGER_ROOT, os.W_OK):
            raise Exception("Cannot write to web-files directory")
    except Exception as e:
        print(f"Warning: Could not use web-files directory: {e}")
        # Last resort - use temp directory
        if platform.system() == 'Windows':
            FILE_MANAGER_ROOT = os.path.join(os.environ.get('TEMP', 'C:\\temp'), 'web-files')
        else:
            FILE_MANAGER_ROOT = os.path.join('/tmp', 'web-files')
        os.makedirs(FILE_MANAGER_ROOT, exist_ok=True)
        # Change ownership of temp directory if running with sudo (Linux only)
        if PWD_AVAILABLE and pwd and os.environ.get('SUDO_USER'):
            uid = pwd.getpwnam(current_user).pw_uid
            gid = pwd.getpwnam(current_user).pw_gid
            os.chown(FILE_MANAGER_ROOT, uid, gid)

# Ensure directory exists and is writable
try:
    os.makedirs(FILE_MANAGER_ROOT, exist_ok=True)
    test_file = os.path.join(FILE_MANAGER_ROOT, '.test_write')
    with open(test_file, 'w') as f:
        f.write('test')
    os.remove(test_file)
except Exception as e:
    print(f"Error: Could not write to directory {FILE_MANAGER_ROOT}: {e}")
    raise e  # This is critical - we need a writable directory

print(f"File Manager Root Directory: {FILE_MANAGER_ROOT}")
print(f"Directory exists: {os.path.exists(FILE_MANAGER_ROOT)}")
print(f"Directory is writable: {os.access(FILE_MANAGER_ROOT, os.W_OK)}")
os.environ['FILE_MANAGER_ROOT'] = FILE_MANAGER_ROOT

app = Flask(__name__, static_folder='../frontend/build', static_url_path='/')

# Enable response compression for better performance (uncomment after installing flask-compress)
# compress = Compress(app)
# app.config['COMPRESS_MIMETYPES'] = [
#     'text/html', 'text/css', 'text/xml',
#     'application/json', 'application/javascript',
#     'text/plain', 'text/csv'
# ]

# Configure CORS to be more flexible
CORS(app, supports_credentials=True, origins=[
    "http://localhost:3000", 
    "http://127.0.0.1:3000",
    "http://192.168.1.174:3000" # Allow specific IP
])

# Session configuration
app.config.update(
    SECRET_KEY=os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production'),
    SESSION_COOKIE_SECURE=False,  # Set to True in production with HTTPS
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax',
    PERMANENT_SESSION_LIFETIME=timedelta(hours=24),
    SESSION_COOKIE_NAME='control_panel_session'
)

# Database configuration with connection pooling
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///controlpanel.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Add connection pooling configuration for better performance
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_size': 20,
    'pool_recycle': 3600,
    'pool_pre_ping': True,
    'echo': False  # Set to True for SQL query debugging
}

# Initialize extensions
init_db(app)

# Import models after db is initialized
from models.user import User
from models.virtual_host import VirtualHost
from models.dns import DNSZone, DNSRecord
from models.ssl_certificate import SSLCertificate, SSLCertificateLog
from models.email import EmailDomain, EmailAccount, EmailForwarder, EmailAlias
from models.ftp import FTPAccount

# Import routes after models
from routes.dns import dns_bp
from routes.virtual_host import virtual_host_bp
from routes.ssl import ssl_bp
from routes.email import email_bp
from routes.roundcube import roundcube_bp
from routes.notifications import notifications_bp
from routes.user import user_bp
from routes.database import database_bp

# Register blueprints
app.register_blueprint(dns_bp)
app.register_blueprint(virtual_host_bp)
app.register_blueprint(ssl_bp)
app.register_blueprint(email_bp)
app.register_blueprint(roundcube_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(system_bp)
app.register_blueprint(files_bp, url_prefix='/api/files')
app.register_blueprint(notifications_bp)
app.register_blueprint(user_bp)
app.register_blueprint(database_bp)

# Create database tables
with app.app_context():
    try:
        db.create_all()
        print("Database tables created successfully")
    except Exception as e:
        print(f"Error creating database tables: {e}")

# Serve frontend
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

# Health check endpoint
@app.route('/api/health')
def health_check():
    return jsonify({
        "status": "healthy",
        "version": "1.0.0"
    })

# Error handlers
@app.errorhandler(500)
def internal_error(error):
    import traceback
    print(f"Internal Server Error: {error}")
    print(f"Traceback: {traceback.format_exc()}")
    return jsonify({
        'success': False,
        'error': 'Internal server error',
        'details': str(error) if app.debug else None
    }), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'error': 'Not found'
    }), 404

@app.errorhandler(400)
def bad_request(error):
    return jsonify({
        'success': False,
        'error': 'Bad request'
    }), 400

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000) 
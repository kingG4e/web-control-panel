from flask import Flask, jsonify, send_from_directory, request, current_app
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
import os
import secrets
import bcrypt
from datetime import timedelta, datetime
from models.database import db, init_db
from utils.error_handlers import register_error_handlers, ValidationError, AuthenticationError
from utils.security import setup_security_headers, RateLimiter, validate_password, authenticate_user
from utils.logger import setup_logger, log_request, log_response, audit_log

app = Flask(__name__, static_folder='../frontend/build', static_url_path='/')
CORS(app)

# Configure application
app.config['SECRET_KEY'] = secrets.token_hex(32)
app.config['JWT_SECRET_KEY'] = secrets.token_hex(32)
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///controlpanel.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize extensions
init_db(app)
jwt = JWTManager(app)
rate_limiter = RateLimiter(app)

# Setup error handlers and logging
register_error_handlers(app)
setup_logger(app)

# Request logging
@app.before_request
def before_request():
    log_request()

# Response logging and security headers
@app.after_request
def after_request(response):
    log_response(response)
    return setup_security_headers(response)

# User Model
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='user')
    last_login = db.Column(db.DateTime)
    failed_login_attempts = db.Column(db.Integer, default=0)
    is_system_user = db.Column(db.Boolean, default=False)
    
    # Relationships
    virtual_hosts = db.relationship('VirtualHost', backref='user', lazy=True)

# Import models and routes
from models.virtual_host import VirtualHost
from models.dns import DNSZone, DNSRecord
from routes.dns import dns_bp

# Register blueprints
app.register_blueprint(dns_bp)

# Create database tables
with app.app_context():
    try:
        db.create_all()
        app.logger.info("Database tables created successfully")
    except Exception as e:
        app.logger.error(f"Error creating database tables: {e}")

# Authentication routes
@app.route('/api/auth/login', methods=['POST'])
@rate_limiter.limit('login', limit=5, period=300)  # 5 attempts per 5 minutes
def login():
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('password'):
        raise ValidationError("Username and password are required")
    
    try:
        user = authenticate_user(data.get('username'), data.get('password'))
        
        # Update login info
        user.failed_login_attempts = 0
        user.last_login = datetime.utcnow()
        db.session.commit()
        
        # Create access token
        access_token = create_access_token(identity=user.username)
        audit_log(user, 'login', {
            'method': 'system_user' if user.is_system_user else 'local_user'
        })
        
        return jsonify({
            'token': access_token,
            'user': {
                'username': user.username,
                'role': user.role,
                'is_system_user': user.is_system_user
            }
        }), 200
        
    except AuthenticationError as e:
        audit_log(None, 'login_failed', {
            'username': data.get('username'),
            'reason': str(e)
        })
        raise ValidationError(str(e))
    except Exception as e:
        current_app.logger.error(f"Login error: {str(e)}")
        raise ValidationError("An error occurred during login")

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('password'):
        raise ValidationError("Username and password are required")
    
    # Validate password strength
    is_valid, message = validate_password(data.get('password'))
    if not is_valid:
        raise ValidationError(message)
    
    if User.query.filter_by(username=data.get('username')).first():
        raise ValidationError("Username already exists")
    
    hashed = bcrypt.hashpw(data.get('password').encode('utf-8'), bcrypt.gensalt())
    new_user = User(
        username=data.get('username'),
        password=hashed.decode('utf-8'),
        role='admin' if User.query.count() == 0 else 'user'
    )
    
    db.session.add(new_user)
    db.session.commit()
    
    audit_log(new_user, 'user_created')
    return jsonify({'message': 'User created successfully'}), 201

@app.route('/api/users/me', methods=['GET'])
@jwt_required()
def get_current_user():
    current_user = get_jwt_identity()
    user = User.query.filter_by(username=current_user).first()
    return jsonify({
        'username': user.username,
        'role': user.role,
        'last_login': user.last_login.isoformat() if user.last_login else None
    }), 200

# Create initial admin user
def create_admin_user():
    with app.app_context():
        if User.query.count() == 0:
            hashed = bcrypt.hashpw('admin123'.encode('utf-8'), bcrypt.gensalt())
            admin = User(
                username='admin',
                password=hashed.decode('utf-8'),
                role='admin'
            )
            db.session.add(admin)
            db.session.commit()
            app.logger.info('Admin user created successfully')
            print('Admin user created with credentials:')
            print('Username: admin')
            print('Password: admin123')

# Serve frontend
@app.route('/')
def serve_frontend():
    return app.send_static_file('index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory(app.static_folder, path)

# Health check endpoint
@app.route('/api/health')
def health_check():
    return jsonify({
        "status": "healthy",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    })

if __name__ == '__main__':
    create_admin_user()
    app.run(debug=True, port=5000) 
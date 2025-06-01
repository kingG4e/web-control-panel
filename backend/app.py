from flask import Flask, jsonify, send_from_directory, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
import os
import secrets
import bcrypt
from datetime import timedelta
from models.database import db, init_db

app = Flask(__name__, static_folder='../frontend/build', static_url_path='/')
CORS(app)

# Generate secure random key
app.config['SECRET_KEY'] = secrets.token_hex(32)
app.config['JWT_SECRET_KEY'] = secrets.token_hex(32)
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1)

# Use SQLite database
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///controlpanel.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize extensions
init_db(app)
jwt = JWTManager(app)

# User Model
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='user')
    
    # Relationships
    virtual_hosts = db.relationship('VirtualHost', backref='user', lazy=True)

# Import models after db is initialized
from models.virtual_host import VirtualHost
from models.dns import DNSZone, DNSRecord

# Import routes after models
from routes.dns import dns_bp

# Register blueprints
app.register_blueprint(dns_bp)

# Create database tables
with app.app_context():
    try:
        db.create_all()
        print("Database tables created successfully")
    except Exception as e:
        print(f"Error creating database tables: {e}")

# Authentication routes
@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(username=data.get('username')).first()
    
    if user and bcrypt.checkpw(data.get('password').encode('utf-8'), user.password.encode('utf-8')):
        access_token = create_access_token(identity=user.username)
    return jsonify({
            'token': access_token,
            'user': {
                'username': user.username,
                'role': user.role
        }
        }), 200
    return jsonify({'message': 'Invalid credentials'}), 401

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    
    if User.query.filter_by(username=data.get('username')).first():
        return jsonify({'message': 'Username already exists'}), 400
        
    hashed = bcrypt.hashpw(data.get('password').encode('utf-8'), bcrypt.gensalt())
    new_user = User(
        username=data.get('username'),
        password=hashed.decode('utf-8'),
        role='admin' if User.query.count() == 0 else 'user'
    )
    
    db.session.add(new_user)
    db.session.commit()
    
    return jsonify({'message': 'User created successfully'}), 201

@app.route('/api/users/me', methods=['GET'])
@jwt_required()
def get_current_user():
    current_user = get_jwt_identity()
    user = User.query.filter_by(username=current_user).first()
    return jsonify({
        'username': user.username,
        'role': user.role
    }), 200

# Create initial admin user if no users exist
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
        "version": "1.0.0"
    })

if __name__ == '__main__':
    create_admin_user()
    app.run(debug=True, port=5000) 
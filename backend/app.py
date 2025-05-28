from flask import Flask, jsonify, send_from_directory, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv
import os
import secrets
import mariadb
import psutil
import platform
import subprocess
import json

# Load routes
from routes.virtual_host import virtual_host_bp
from routes.dns import dns_bp
from routes.auth import auth_bp
from routes.ftp import ftp_bp
from routes.database import database_bp
from routes.email import email_bp
from routes.ssl import ssl_bp

# Load models
from models.virtual_host import db
from models.user import User

# Load environment variables if exists
load_dotenv()

app = Flask(__name__, static_folder='../frontend/build', static_url_path='/')
CORS(app)

# Generate secure random keys if not provided
def generate_secure_key():
    return secrets.token_hex(32)

# Database configuration with default values
DB_USER = os.getenv('DB_USER', 'root')
DB_PASSWORD = os.getenv('DB_PASSWORD', '')
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = int(os.getenv('DB_PORT', '3306'))
DB_NAME = os.getenv('DB_NAME', 'cpanel')

# Try MariaDB connection
try:
    conn = mariadb.connect(
        user=DB_USER,
        password=DB_PASSWORD,
        host=DB_HOST,
        port=DB_PORT
    )
    
    cursor = conn.cursor()
    cursor.execute(f"CREATE DATABASE IF NOT EXISTS {DB_NAME}")
    conn.commit()
    cursor.close()
    conn.close()

    app.config['SQLALCHEMY_DATABASE_URI'] = f'mariadb+mariadbconnector://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    print(f"Successfully connected to MariaDB on {DB_HOST}:{DB_PORT}")

except mariadb.Error as e:
    print(f"MariaDB connection failed: {e}")
    print("Falling back to SQLite database...")
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///controlpanel.db'

# Security configuration
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', generate_secure_key())
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', generate_secure_key())

# Initialize extensions
db.init_app(app)
jwt = JWTManager(app)

# Register blueprints
app.register_blueprint(virtual_host_bp, url_prefix='/api/virtual-hosts')
app.register_blueprint(dns_bp, url_prefix='/api/dns')
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(ftp_bp, url_prefix='/api/ftp')
app.register_blueprint(database_bp, url_prefix='/api/database')
app.register_blueprint(email_bp, url_prefix='/api/email')
app.register_blueprint(ssl_bp, url_prefix='/api/ssl')

# System monitoring endpoints
@app.route('/api/system/stats')
@jwt_required()
def system_stats():
    cpu_percent = psutil.cpu_percent(interval=1)
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage('/')
    
    return jsonify({
        'cpu': {
            'percent': cpu_percent,
            'cores': psutil.cpu_count()
        },
        'memory': {
            'total': memory.total,
            'used': memory.used,
            'percent': memory.percent
        },
        'disk': {
            'total': disk.total,
            'used': disk.used,
            'percent': disk.percent
        },
        'system': {
            'platform': platform.system(),
            'release': platform.release(),
            'uptime': int(psutil.boot_time())
        }
    })

# Service management endpoints
@app.route('/api/services/status')
@jwt_required()
def service_status():
    services = ['apache2', 'mariadb', 'vsftpd', 'bind9', 'postfix']
    status = {}
    
    for service in services:
        try:
            result = subprocess.run(['systemctl', 'is-active', service], 
                                 capture_output=True, text=True)
            status[service] = result.stdout.strip()
        except Exception as e:
            status[service] = 'unknown'
    
    return jsonify(status)

@app.route('/api/services/control', methods=['POST'])
@jwt_required()
def service_control():
    data = request.get_json()
    service = data.get('service')
    action = data.get('action')
    
    if not service or not action:
        return jsonify({'error': 'Missing service or action'}), 400
        
    if action not in ['start', 'stop', 'restart']:
        return jsonify({'error': 'Invalid action'}), 400
        
    try:
        subprocess.run(['systemctl', action, service], check=True)
        return jsonify({'message': f'Service {service} {action}ed successfully'})
    except subprocess.CalledProcessError as e:
        return jsonify({'error': f'Failed to {action} {service}'}), 500

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
        "database": "MariaDB" if "mariadb" in app.config['SQLALCHEMY_DATABASE_URI'] else "SQLite"
    })

# Create database tables
with app.app_context():
    try:
        db.create_all()
        print("Database tables created successfully")
    except Exception as e:
        print(f"Error creating database tables: {e}")
        if "mariadb" in app.config['SQLALCHEMY_DATABASE_URI']:
            print("Falling back to SQLite database...")
            app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///controlpanel.db'
            db.create_all()

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5464))
    app.run(host='0.0.0.0', port=port) 
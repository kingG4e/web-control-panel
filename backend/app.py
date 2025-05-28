from flask import Flask, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv
import os
import secrets
import mariadb

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

# Load environment variables if exists
load_dotenv()

app = Flask(__name__)
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
    # Test MariaDB connection
    conn = mariadb.connect(
        user=DB_USER,
        password=DB_PASSWORD,
        host=DB_HOST,
        port=DB_PORT
    )
    
    # Create database if not exists
    cursor = conn.cursor()
    cursor.execute(f"CREATE DATABASE IF NOT EXISTS {DB_NAME}")
    conn.commit()
    cursor.close()
    conn.close()

    # Configure SQLAlchemy for MariaDB
    app.config['SQLALCHEMY_DATABASE_URI'] = f'mariadb+mariadbconnector://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    print(f"Successfully connected to MariaDB on {DB_HOST}:{DB_PORT}")

except mariadb.Error as e:
    print(f"MariaDB connection failed: {e}")
    print("Falling back to SQLite database...")
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///controlpanel.db'

# Security configuration with auto-generated keys
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', generate_secure_key())
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', generate_secure_key())

# Initialize extensions
db.init_app(app)
jwt = JWTManager(app)

# Register blueprints
app.register_blueprint(virtual_host_bp)
app.register_blueprint(dns_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(ftp_bp)
app.register_blueprint(database_bp)
app.register_blueprint(email_bp)
app.register_blueprint(ssl_bp)

@app.route('/api/health')
def health_check():
    return jsonify({
        "status": "healthy",
        "message": "Control Panel API is running",
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
    port = int(os.getenv('PORT', 8889))
    debug = os.getenv('DEBUG', 'True').lower() == 'true'
    app.run(host='0.0.0.0', port=port, debug=debug) 
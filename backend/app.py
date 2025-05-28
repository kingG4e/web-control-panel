from flask import Flask, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv
import os

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

load_dotenv()

app = Flask(__name__)
CORS(app)

# Database configuration
DB_USER = os.getenv('DB_USER', 'cpanel')
DB_PASSWORD = os.getenv('DB_PASSWORD', 'cpanel')
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_NAME = os.getenv('DB_NAME', 'cpanel')
app.config['SQLALCHEMY_DATABASE_URI'] = f'mysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}/{DB_NAME}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'your-secret-key-here'
app.config['JWT_SECRET_KEY'] = 'your-secret-key-here'

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
        "version": "1.0.0"
    })

# Create database tables
with app.app_context():
    db.create_all()

if __name__ == '__main__':
    port = int(os.getenv('PORT', 8889))
    debug = os.getenv('DEBUG', 'False').lower() == 'true'
    app.run(host='0.0.0.0', port=port, debug=debug) 
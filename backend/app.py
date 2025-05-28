from flask import Flask, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv
import os

from models.virtual_host import db
from routes.virtual_host import virtual_host_bp
from routes.dns import dns_bp

load_dotenv()

app = Flask(__name__)
CORS(app)

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')

# Initialize database
db.init_app(app)

# Register blueprints
app.register_blueprint(virtual_host_bp)
app.register_blueprint(dns_bp)

@app.route('/api/health')
def health_check():
    return jsonify({"status": "healthy", "message": "Control Panel API is running"})

# Create database tables
with app.app_context():
    db.create_all()

if __name__ == '__main__':
    app.run(debug=True) 
#!/usr/bin/env python3
"""
Script to create admin user for testing permission system
"""

from app import app
from models.database import db
from models.user import User
from werkzeug.security import generate_password_hash

def create_admin_user():
    with app.app_context():
        print('=== Creating Admin User ===')
        
        # Check if admin user already exists
        admin_user = User.query.filter_by(username='admin').first()
        if admin_user:
            print('Admin user already exists!')
            print(f'Username: {admin_user.username}')
            print(f'Email: {admin_user.email}')
            print(f'Is Admin: {admin_user.is_admin}')
            print(f'Role: {admin_user.role}')
            return
        
        # Create admin user
        admin_password = 'admin123'  # Change this in production!
        
        admin_user = User(
            username='admin',
            role='admin',
            email='admin@localhost',
            password=generate_password_hash(admin_password)
        )
        admin_user.is_admin = True
        
        db.session.add(admin_user)
        db.session.commit()
        
        print('✅ Admin user created successfully!')
        print(f'Username: admin')
        print(f'Password: {admin_password}')
        print(f'Email: admin@localhost')
        print('⚠️  Please change the password after first login!')

if __name__ == '__main__':
    create_admin_user() 
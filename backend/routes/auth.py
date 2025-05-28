from flask import Blueprint, request, jsonify
from services.sso_service import SSOService
from flask_jwt_extended import create_access_token

auth_bp = Blueprint('auth', __name__)
sso_service = SSOService()

@auth_bp.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'error': 'Missing username or password'}), 400

    # Try system user authentication first
    user_info = sso_service.authenticate(username, password)
    if user_info:
        # Create JWT token
        access_token = create_access_token(identity=user_info)
        return jsonify({
            'access_token': access_token,
            'user': user_info
        })

    # If system auth fails, try regular authentication
    # ... (your existing authentication logic)

    return jsonify({'error': 'Invalid credentials'}), 401

@auth_bp.route('/api/auth/system-users', methods=['GET'])
def get_system_users():
    """Get list of system users"""
    sso_service.refresh_system_users()
    return jsonify(list(sso_service.system_users.keys()))

@auth_bp.route('/api/auth/system-user/<username>', methods=['GET'])
def get_system_user(username):
    """Get system user details"""
    user_info = sso_service.get_system_user_info(username)
    if not user_info:
        return jsonify({'error': 'User not found'}), 404
    return jsonify(user_info) 
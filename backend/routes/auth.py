from flask import Blueprint, request, jsonify
from services.sso_service import SSOService
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from models.user import User, db

auth_bp = Blueprint('auth', __name__)
sso_service = SSOService()

@auth_bp.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Missing username or password'}), 400
    
    user = User.query.filter_by(username=data['username']).first()
    
    if user and user.check_password(data['password']):
        # Update last login
        user.last_login = datetime.utcnow()
        db.session.commit()
        
        # Create access token
        access_token = create_access_token(
            identity=user.id,
            additional_claims={'is_admin': user.is_admin}
        )
        
        return jsonify({
            'token': access_token,
            'user': user.to_dict()
        }), 200
    
    return jsonify({'error': 'Invalid username or password'}), 401

@auth_bp.route('/api/auth/me', methods=['GET'])
@jwt_required()
def get_current_user():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify(user.to_dict()), 200

@auth_bp.route('/api/auth/change-password', methods=['POST'])
@jwt_required()
def change_password():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.get_json()
    
    if not data or not data.get('old_password') or not data.get('new_password'):
        return jsonify({'error': 'Missing old or new password'}), 400
    
    if not user.check_password(data['old_password']):
        return jsonify({'error': 'Invalid old password'}), 401
    
    user.set_password(data['new_password'])
    db.session.commit()
    
    return jsonify({'message': 'Password updated successfully'}), 200

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
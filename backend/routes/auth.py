from flask import Blueprint, request, jsonify, session, current_app
from werkzeug.security import check_password_hash
from functools import wraps
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import jwt
import platform

from models.user import User
from models.database import db
from utils.logger import setup_logger
from services.auth_service import AuthService
from services.user_service import UserService

logger = setup_logger(__name__)
auth_bp = Blueprint('auth', __name__)

# Initialize services
auth_service = AuthService()
user_service = UserService()

def login_required(f):
    """Decorator to require authentication for routes."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            # Check JWT token first
            token = _extract_token_from_header()
            if token:
                user = auth_service.verify_jwt_token(token)
                if user:
                    request.current_user = user
                    request.current_username = user.username
                    return f(*args, **kwargs)
            
            # Fallback to session-based auth
            if 'username' not in session:
                return jsonify({'error': 'Unauthorized'}), 401
            return f(*args, **kwargs)
        except Exception as e:
            logger.error(f"Authentication error: {e}")
            return jsonify({'error': 'Authentication failed'}), 401
    
    return decorated_function

def _extract_token_from_header() -> Optional[str]:
    """Extract JWT token from Authorization header."""
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return None
    
    try:
        return auth_header.split(" ")[1]  # Bearer <token>
    except IndexError:
        return None

@auth_bp.route('/api/auth/login', methods=['POST'])
def login():
    """Handle user login."""
    try:
        data = request.get_json()
        if not _validate_login_data(data):
            return jsonify({'error': 'Missing username or password'}), 400
        
        username = data['username']
        password = data['password']
        
        # Attempt authentication
        auth_result = auth_service.authenticate_user(username, password)
        
        if not auth_result['success']:
            return jsonify({'error': auth_result['error']}), auth_result['status_code']
        
        user = auth_result['user']
        token = auth_result['token']
        
        # Set session data
        _set_session_data(user)
        
        logger.info(f"User {username} logged in successfully")
        return jsonify({
            'message': 'Login successful',
            'token': token,
            'user': user.to_dict()
        })
        
    except Exception as e:
        logger.error(f"Login error: {e}")
        return jsonify({'error': 'Internal server error'}), 500


@auth_bp.route('/api/auth/refresh', methods=['POST'])
def refresh():
    """Refresh JWT token."""
    try:
        token = _extract_token_from_header()
        if not token:
            return jsonify({'error': 'Token missing'}), 401

        new_token = auth_service.refresh_token(token)
        if not new_token:
            return jsonify({'error': 'Invalid token'}), 401

        return jsonify({'token': new_token})

    except Exception as e:
        logger.error(f"Token refresh error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

def _validate_login_data(data: Dict[str, Any]) -> bool:
    """Validate login request data."""
    return data and data.get('username') and data.get('password')

def _set_session_data(user: User) -> None:
    """Set session data for authenticated user."""
    session.permanent = True
    session['username'] = user.username
    session['user_id'] = user.id
    if hasattr(user, 'system_uid'):
        session['uid'] = user.system_uid

@auth_bp.route('/api/auth/register', methods=['POST'])
def register():
    """Register a new user (for development/testing)."""
    try:
        data = request.get_json()
        if not _validate_register_data(data):
            return jsonify({'error': 'Missing required fields'}), 400
        
        username = data['username']
        password = data['password']
        email = data.get('email', f"{username}@localhost")
        
        # Check if user already exists
        if user_service.user_exists(username):
            return jsonify({'error': 'User already exists'}), 409
        
        # Create new user
        user = user_service.create_user(username, password, email)
        
        logger.info(f"User {username} registered successfully")
        return jsonify({
            'message': 'User registered successfully',
            'user': user.to_dict()
        }), 201
        
    except Exception as e:
        logger.error(f"Registration error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

def _validate_register_data(data: Dict[str, Any]) -> bool:
    """Validate registration request data."""
    return data and data.get('username') and data.get('password')

@auth_bp.route('/api/auth/logout', methods=['POST'])
def logout():
    """Handle user logout."""
    try:
        session.clear()
        logger.info("User logged out successfully")
        return jsonify({'message': 'Logout successful'})
    except Exception as e:
        logger.error(f"Logout error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@auth_bp.route('/api/auth/user', methods=['GET'])
@login_required
def get_current_user():
    """Get current authenticated user information."""
    try:
        username = session.get('username') or getattr(request, 'current_username', None)
        if not username:
            return jsonify({'error': 'User not found'}), 404
        
        user = user_service.get_user_by_username(username)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({
            'user': user.to_dict()
        })
        
    except Exception as e:
        logger.error(f"Get current user error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@auth_bp.route('/api/auth/system-users', methods=['GET'])
@login_required
def get_system_users():
    """Get list of system users."""
    try:
        users = user_service.get_system_users()
        return jsonify({
            'users': [user.to_dict() for user in users]
        })
    except Exception as e:
        logger.error(f"Get system users error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@auth_bp.route('/api/auth/change-password', methods=['POST'])
@login_required
def change_password():
    """Change user password."""
    try:
        data = request.get_json()
        if not _validate_password_change_data(data):
            return jsonify({'error': 'Missing required fields'}), 400
        
        username = session.get('username') or getattr(request, 'current_username', None)
        current_password = data['current_password']
        new_password = data['new_password']
        
        success = user_service.change_password(username, current_password, new_password)
        
        if not success:
            return jsonify({'error': 'Invalid current password'}), 400
        
        logger.info(f"Password changed successfully for user {username}")
        return jsonify({'message': 'Password changed successfully'})
        
    except Exception as e:
        logger.error(f"Change password error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

def _validate_password_change_data(data: Dict[str, Any]) -> bool:
    """Validate password change request data."""
    return data and data.get('current_password') and data.get('new_password')
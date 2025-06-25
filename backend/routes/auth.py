from flask import Blueprint, request, jsonify, session, current_app
from werkzeug.security import check_password_hash
from functools import wraps
from models.user import User
from models.database import db
import jwt
from datetime import datetime, timedelta
import platform

# Import Unix/Linux specific modules
try:
    import pwd
    import spwd
    import crypt
    import pam
    UNIX_AUTH_AVAILABLE = True
except ImportError:
    UNIX_AUTH_AVAILABLE = False
    print("Warning: Unix authentication modules not available (Windows system)")
    pwd = None
    spwd = None
    crypt = None
    pam = None

auth_bp = Blueprint('auth', __name__)

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Check JWT token first
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]  # Bearer <token>
            except IndexError:
                pass
        
        if token:
            try:
                data = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
                current_user = User.query.get(data['user_id'])
                if current_user:
                    request.current_user = current_user
                    request.current_username = current_user.username
                    return f(*args, **kwargs)
            except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
                pass
        
        # Fallback to session-based auth
        if 'username' not in session:
            return jsonify({'error': 'Unauthorized'}), 401
        return f(*args, **kwargs)
    return decorated_function

def authenticate_linux_user(username, password):
    """Authenticate user using Linux PAM or fallback"""
    if not UNIX_AUTH_AVAILABLE:
        # Development mode - simple authentication
        return username == "admin" and password == "admin"
    
    try:
        auth = pam.pam()
        return auth.authenticate(username, password)
    except Exception:
        return False

def get_user_info(username):
    """Get user information from Linux system or return default data"""
    if not UNIX_AUTH_AVAILABLE:
        # Return default user info for development
        if username == "admin":
            return type('DefaultUser', (), {
                'pw_name': username,
                'pw_uid': 1000,
                'pw_gid': 1000,
                'pw_dir': '/home/' + username,
                'pw_shell': '/bin/bash'
            })()
        return None
    
    try:
        return pwd.getpwnam(username)
    except KeyError:
        return None

def format_user_info(user_info):
    """Format user information for JSON response"""
    if not user_info:
        return None
    return {
        'username': user_info.pw_name,
        'uid': user_info.pw_uid,
        'gid': user_info.pw_gid,
        'home': user_info.pw_dir,
        'shell': user_info.pw_shell
    }

@auth_bp.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Missing username or password'}), 400
    
    username = data['username']
    password = data['password']
    
    try:
        # First check database users
        user = User.query.filter_by(username=username).first()
        if user and not user.is_system_user and user.verify_password(password):
            # Database user authentication successful
            user.last_login = datetime.utcnow()
            db.session.commit()
            
            # Generate JWT token
            token_payload = {
                'user_id': user.id,
                'username': username,
                'exp': datetime.utcnow() + timedelta(hours=24)
            }
            token = jwt.encode(token_payload, current_app.config['SECRET_KEY'], algorithm='HS256')
            
            # Also maintain session for backward compatibility
            session.permanent = True
            session['username'] = username
            session['user_id'] = user.id
            
            return jsonify({
                'message': 'Login successful',
                'token': token,
                'user': user.to_dict()
            })
        
        # Fallback to Linux system authentication
        if authenticate_linux_user(username, password):
            user_info = get_user_info(username)
            if user_info:
                # Check if user exists in database
                if not user:
                    # Create new user in database
                    user = User(
                        username=username,
                        email=f"{username}@localhost",
                        role='admin' if user_info.pw_uid == 0 else 'user',
                        is_system_user=True,
                        system_uid=user_info.pw_uid
                    )
                    db.session.add(user)
                    db.session.commit()
                
                # Update last login
                user.last_login = datetime.utcnow()
                db.session.commit()
                
                # Generate JWT token
                token_payload = {
                    'user_id': user.id,
                    'username': username,
                    'exp': datetime.utcnow() + timedelta(hours=24)
                }
                token = jwt.encode(token_payload, current_app.config['SECRET_KEY'], algorithm='HS256')
                
                # Also maintain session for backward compatibility
                session.permanent = True
                session['username'] = username
                session['uid'] = user_info.pw_uid
                session['user_id'] = user.id
                
                return jsonify({
                    'message': 'Login successful',
                    'token': token,
                    'user': user.to_dict()
                })
            return jsonify({'error': 'User not found'}), 404
        return jsonify({'error': 'Invalid credentials'}), 401
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/api/auth/register', methods=['POST'])
def register():
    """Register a new user (for development/testing)"""
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Missing username or password'}), 400
    
    username = data['username']
    password = data['password']
    
    try:
        # Check if user already exists
        existing_user = User.query.filter_by(username=username).first()
        if existing_user:
            return jsonify({'error': 'User already exists'}), 409
        
        # Create new user
        user = User(
            username=username,
            email=data.get('email', f"{username}@localhost"),
            role='user',
            is_system_user=False
        )
        user.set_password(password)
        
        db.session.add(user)
        db.session.commit()
        
        return jsonify({
            'message': 'User registered successfully',
            'user': user.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/api/auth/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'message': 'Logged out successfully'})

@auth_bp.route('/api/auth/user', methods=['GET'])
@login_required
def get_current_user():
    try:
        # Get user from database first
        username = getattr(request, 'current_username', session.get('username'))
        user = User.query.filter_by(username=username).first()
        
        if user:
            return jsonify(user.to_dict())
        
        # Fallback to system user info
        user_info = get_user_info(username)
        if user_info:
            return jsonify(format_user_info(user_info))
            
        return jsonify({'error': 'User not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/api/auth/system-users', methods=['GET'])
@login_required
def get_system_users():
    """Get list of system users"""
    try:
        if not UNIX_AUTH_AVAILABLE:
            # Return default users for development
            return jsonify([{
                'username': 'admin',
                'uid': 1000,
                'gid': 1000,
                'home': '/home/admin',
                'shell': '/bin/bash'
            }])
        
        # Get all users with UID >= 1000 (normal users)
        users = []
        for user in pwd.getpwall():
            if user.pw_uid >= 1000 and user.pw_shell != '/usr/sbin/nologin':
                users.append(format_user_info(user))
        return jsonify(users)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
import os
import jwt
import platform
from functools import wraps
from flask import current_app, request, jsonify
from .error_handlers import AuthenticationError

# Import Unix/Linux specific modules
try:
    import pwd
    import spwd
    import crypt
    UNIX_AUTH_MODULES_AVAILABLE = True
except ImportError:
    UNIX_AUTH_MODULES_AVAILABLE = False
    print("Warning: Unix authentication modules (pwd, spwd, crypt) not available (Windows system)")
    pwd = None
    spwd = None
    crypt = None

def verify_system_user(username, password):
    """Verify login credentials against system users or fallback"""
    if not UNIX_AUTH_MODULES_AVAILABLE:
        # Development mode - simple authentication
        return username == "admin" and password == "admin"
    
    try:
        # Get user's password hash from shadow file
        shadow_entry = spwd.getspnam(username)
        if not shadow_entry:
            return False
            
        # Get encrypted password
        encrypted_password = shadow_entry.sp_pwd
        
        # Check if account is locked or disabled
        if encrypted_password.startswith('!') or encrypted_password.startswith('*'):
            return False
            
        # Verify password
        salt = encrypted_password
        encrypted_attempt = crypt.crypt(password, salt)
        return encrypted_attempt == encrypted_password
        
    except KeyError:
        # User not found
        return False
    except PermissionError:
        # No permission to read shadow file
        current_app.logger.error("No permission to read shadow file. Make sure the application is running with sufficient privileges.")
        return False

def get_system_user_info(username):
    """Get system user information or return default data"""
    if not UNIX_AUTH_MODULES_AVAILABLE:
        # Return default user info for development
        if username == "admin":
            return {
                'username': username,
                'uid': 1000,
                'gid': 1000,
                'home': '/home/' + username,
                'shell': '/bin/bash'
            }
        return None
    
    try:
        pwd_entry = pwd.getpwnam(username)
        return {
            'username': username,
            'uid': pwd_entry.pw_uid,
            'gid': pwd_entry.pw_gid,
            'home': pwd_entry.pw_dir,
            'shell': pwd_entry.pw_shell
        }
    except KeyError:
        return None

def is_system_admin(username):
    """Check if user is system administrator"""
    if not UNIX_AUTH_MODULES_AVAILABLE:
        # Development mode - admin user is admin
        return username == "admin"
    
    try:
        # Check if user is root
        if username == 'root':
            return True
            
        # Check if user is in sudo group
        pwd_entry = pwd.getpwnam(username)
        groups = os.popen(f'groups {username}').read().strip().split()
        return 'sudo' in groups or 'wheel' in groups
        
    except:
        return False

def authenticate_user(username, password):
    """Authenticate user against both system users and application database"""
    from models.user import User  # Import here to avoid circular import
    
    # First try system authentication
    if verify_system_user(username, password):
        user_info = get_system_user_info(username)
        if not user_info:
            raise AuthenticationError("User information not found")
            
        # Check if user already exists in app database
        user = User.query.filter_by(username=username).first()
        if not user:
            # Create new user in app database
            is_admin = is_system_admin(username)
            user = User(
                username=username,
                role='admin' if is_admin else 'user',
                is_system_user=True,
                system_uid=user_info['uid']
            )
            current_app.db.session.add(user)
            current_app.db.session.commit()
        
        return user
        
    # If system auth fails, try application database
    user = User.query.filter_by(username=username, is_system_user=False).first()
    if user and user.verify_password(password):
        return user
        
    raise AuthenticationError("Invalid credentials")

def token_required(f):
    """Decorator to require valid JWT token"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Get token from Authorization header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]  # Bearer <token>
            except IndexError:
                return jsonify({'success': False, 'error': 'Invalid token format'}), 401
        
        # Fallback: allow token to be passed via query parameter (useful for SSE/EventSource)
        if not token:
            token = request.args.get('token')
        
        if not token:
            return jsonify({'success': False, 'error': 'Token is missing'}), 401
        
        try:
            # Decode token
            data = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user_id = data['user_id']
            
            # Get user from database
            from models.user import User
            current_user = User.query.get(current_user_id)
            if not current_user:
                return jsonify({'success': False, 'error': 'User not found'}), 401
                
        except jwt.ExpiredSignatureError:
            return jsonify({'success': False, 'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'success': False, 'error': 'Invalid token'}), 401
        except Exception as e:
            return jsonify({'success': False, 'error': 'Token validation failed'}), 401
        
        return f(current_user, *args, **kwargs)
    
    return decorated 
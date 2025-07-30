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
    # Always try PAM first for proper system authentication
    try:
        import pam
        auth = pam.pam()
        return auth.authenticate(username, password)
    except ImportError:
        print("PAM module not available - trying alternative authentication")
    
    # Fallback to crypt-based authentication if PAM is not available
    if UNIX_AUTH_MODULES_AVAILABLE:
        try:
            # Check if user exists in system
            pwd_entry = pwd.getpwnam(username)
            
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
            if current_app:
                current_app.logger.error("No permission to read shadow file. Make sure the application is running with sufficient privileges.")
            return False
    
    # No fallback authentication - system users only
    return False

def get_system_user_info(username):
    """Get system user information or return default data"""
    try:
        import pwd
        pwd_entry = pwd.getpwnam(username)
        return {
            'username': username,
            'uid': pwd_entry.pw_uid,
            'gid': pwd_entry.pw_gid,
            'home': pwd_entry.pw_dir,
            'shell': pwd_entry.pw_shell
        }
    except ImportError:
        # No fallback user info - system users only
        return None
    except KeyError:
        return None

def is_system_admin(username):
    """Check if user is system administrator"""
    try:
        import pwd
        # Check if user is root
        if username == 'root':
            return True
            
        # Check if user exists in system
        pwd_entry = pwd.getpwnam(username)
        
        # Check if user is in sudo group
        try:
            groups = os.popen(f'groups {username}').read().strip().split()
            return 'sudo' in groups or 'wheel' in groups or 'admin' in groups
        except:
            # Fallback: check if UID is 0 (root)
            return pwd_entry.pw_uid == 0
            
    except ImportError:
        # No fallback admin check - system users only
        return False
    except KeyError:
        # User not found in system
        return False
    except Exception:
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

def admin_required(f):
    """Decorator to require admin privileges"""
    @wraps(f)
    def decorated(*args, **kwargs):
        # This decorator should be used after token_required
        # So current_user should be available from the previous decorator
        if not args:
            return jsonify({'success': False, 'error': 'Authentication required'}), 401
            
        current_user = args[0]  # First argument should be current_user from token_required
        
        # Check if user is admin
        if not (current_user.is_admin or current_user.role == 'admin' or current_user.username == 'root'):
            return jsonify({
                'success': False, 
                'error': 'Admin privileges required'
            }), 403
        
        return f(*args, **kwargs)
    
    return decorated 
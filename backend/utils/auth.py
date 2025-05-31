import os
import pwd
import spwd
import crypt
from flask import current_app
from .error_handlers import AuthenticationError

def verify_system_user(username, password):
    """Verify login credentials against system users"""
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
    """Get system user information"""
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
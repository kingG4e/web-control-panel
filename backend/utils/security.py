from functools import wraps
from flask import request, current_app
import redis
from datetime import datetime, timedelta
import bcrypt
import platform
from .error_handlers import AuthorizationError, AuthenticationError
from models.user import User
from models.database import db
import os
import re
from werkzeug.utils import secure_filename

class RateLimiter:
    def __init__(self, app=None):
        self.redis_client = redis.Redis(host='localhost', port=6379, db=0)
        if app:
            self.init_app(app)

    def init_app(self, app):
        app.config.setdefault('RATELIMIT_DEFAULT', '100/hour')
        app.config.setdefault('RATELIMIT_STORAGE_URL', 'memory://')

    def limit(self, key_prefix, limit=None, period=None):
        def decorator(f):
            @wraps(f)
            def wrapped(*args, **kwargs):
                if not hasattr(request, 'user_id'):
                    return f(*args, **kwargs)

                key = f"{key_prefix}:{request.user_id}"
                try:
                    current = self.redis_client.get(key)
                    if current is None:
                        self.redis_client.setex(key, period, 1)
                    elif int(current) >= limit:
                        raise AuthorizationError("Rate limit exceeded")
                    else:
                        self.redis_client.incr(key)
                except redis.RedisError:
                    current_app.logger.error("Rate limiting failed")
                
                return f(*args, **kwargs)
            return wrapped
        return decorator

def setup_security_headers(response):
    """Add security headers to response"""
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    response.headers['Content-Security-Policy'] = "default-src 'self'"
    return response

def require_role(role):
    """Decorator to check user role"""
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            if not hasattr(request, 'user') or request.user.role != role:
                raise AuthorizationError("Insufficient permissions")
            return f(*args, **kwargs)
        return wrapped
    return decorator

def validate_password(password):
    """Validate password strength"""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if not any(c.isupper() for c in password):
        return False, "Password must contain at least one uppercase letter"
    if not any(c.islower() for c in password):
        return False, "Password must contain at least one lowercase letter"
    if not any(c.isdigit() for c in password):
        return False, "Password must contain at least one number"
    if not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password):
        return False, "Password must contain at least one special character"
    return True, None

def sanitize_path(path):
    """
    Sanitize a file path to prevent directory traversal attacks.
    Ensures proper Linux path handling.
    """
    # Remove any null bytes
    path = path.replace('\0', '')
    
    # Convert Windows backslashes to forward slashes
    path = path.replace('\\', '/')
    
    # Normalize path separators and remove any '..' path traversal attempts
    path = os.path.normpath(path)
    
    # Convert back to forward slashes for consistency
    path = path.replace('\\', '/')
    
    # Remove leading slashes to make path relative
    path = path.lstrip('/')
    
    # Remove any attempts to traverse up directories
    path = '/'.join(part for part in path.split('/') if part and part != '..')
    
    return path

def sanitize_filename(filename):
    """
    Sanitize a filename to be safe for saving on Linux systems.
    """
    # Use werkzeug's secure_filename for basic sanitization
    safe_name = secure_filename(filename)
    
    # Additional sanitization for Linux compatibility
    # Remove any characters that could cause issues
    safe_name = re.sub(r'[^a-zA-Z0-9._-]', '', safe_name)
    
    # Ensure the filename doesn't start with a dash
    safe_name = safe_name.lstrip('-')
    
    # If filename becomes empty after sanitization, provide a default
    if not safe_name:
        safe_name = 'unnamed_file'
    
    return safe_name

def is_safe_path(base_path, path):
    """
    Check if a path is safe (doesn't try to access parent directories).
    Handles Linux paths correctly with improved access checks.
    """
    try:
        # Normalize paths to absolute paths with forward slashes
        base_path = os.path.abspath(base_path).replace('\\', '/')
        if not path:
            return True  # Empty path is safe (refers to base_path)
            
        # Handle absolute paths that might be symlinks
        if os.path.isabs(path):
            real_base = os.path.realpath(base_path)
            real_path = os.path.realpath(path)
            is_safe = real_path.startswith(real_base)
            print(f"Absolute path check: {real_path} -> {real_base} = {is_safe}")
            return is_safe
            
        # For relative paths, join with base and check
        full_path = os.path.abspath(os.path.join(base_path, path)).replace('\\', '/')
        real_base = os.path.realpath(base_path)
        real_full = os.path.realpath(full_path)
        
        print(f"Base path (real): {real_base}")
        print(f"Full path (real): {real_full}")
        
        # Check if the path is within base directory
        is_safe = real_full.startswith(real_base)
        if not is_safe:
            print(f"Path safety check failed: {real_full} is not within {real_base}")
            return False
            
        # Additional permission check
        try:
            # Check if path exists
            if os.path.exists(full_path):
                # Try to access the path
                if os.path.isdir(full_path):
                    os.listdir(full_path)
                else:
                    with open(full_path, 'r'):
                        pass
        except (PermissionError, OSError) as e:
            print(f"Permission check failed for {full_path}: {e}")
            return False
            
        return True
    except Exception as e:
        print(f"Error in path safety check: {e}")
        return False

def validate_file_type(file, allowed_types):
    """Validate uploaded file type"""
    if '.' not in file.filename:
        return False
    ext = file.filename.rsplit('.', 1)[1].lower()
    return ext in allowed_types

def authenticate_user(username, password):
    """Authenticate user against local database"""
    user = User.query.filter_by(username=username).first()
    
    if not user:
        raise AuthenticationError("Invalid username or password")
    
    if user.failed_login_attempts >= 5:
        lockout_time = datetime.utcnow() - timedelta(minutes=30)
        if user.last_login and user.last_login > lockout_time:
            raise AuthenticationError("Account is temporarily locked. Please try again later.")
    
    if bcrypt.checkpw(password.encode('utf-8'), user.password_hash.encode('utf-8')):
        user.failed_login_attempts = 0
        user.last_login = datetime.utcnow()
        db.session.commit()
        return user
    else:
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= 5:
            user.last_login = datetime.utcnow()
        db.session.commit()
        raise AuthenticationError("Invalid username or password")
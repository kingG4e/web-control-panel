from functools import wraps
from flask import request, current_app
import redis
from datetime import datetime, timedelta
import bcrypt
import platform
from .error_handlers import AuthorizationError, AuthenticationError
from models.user import User
from models.database import db

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

def sanitize_filename(filename):
    """Sanitize uploaded file name"""
    return ''.join(c for c in filename if c.isalnum() or c in '._-')

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
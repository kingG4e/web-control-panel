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
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    response.headers['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=()'
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    return response

def setup_csp_headers(response, app):
    """Setup Content Security Policy headers"""
    default_src = app.config.get('CSP_DEFAULT_SRC', "'self'")
    script_src = app.config.get('CSP_SCRIPT_SRC', "'self' 'unsafe-inline'")
    style_src = app.config.get('CSP_STYLE_SRC', "'self' 'unsafe-inline'")
    img_src = app.config.get('CSP_IMG_SRC', "'self' data: https:")
    connect_src = app.config.get('CSP_CONNECT_SRC', "'self'")
    
    csp_parts = [
        f"default-src {default_src}",
        f"script-src {script_src}",
        f"style-src {style_src}",
        f"img-src {img_src}",
        f"connect-src {connect_src}",
        "font-src 'self' data:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'"
    ]
    response.headers['Content-Security-Policy'] = '; '.join(csp_parts)
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
            try:
                # os.path.commonpath provides proper path boundary checks
                return os.path.commonpath([real_base, real_path]) == real_base
            except ValueError:
                # Raised if paths are on different drives on Windows; treat as unsafe
                return False
            
        # For relative paths, join with base and check
        full_path = os.path.abspath(os.path.join(base_path, path)).replace('\\', '/')
        real_base = os.path.realpath(base_path)
        real_full = os.path.realpath(full_path)
        
        # Check if the path is within base directory
        try:
            if os.path.commonpath([real_base, real_full]) != real_base:
                return False
        except ValueError:
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

def validate_session_timeout(user):
    """Validate if user session has expired"""
    from datetime import datetime, timedelta
    from flask import current_app
    
    if not user.last_login:
        return False
    
    timeout_seconds = current_app.config.get('SESSION_TIMEOUT', 3600)
    timeout_threshold = datetime.utcnow() - timedelta(seconds=timeout_seconds)
    
    return user.last_login > timeout_threshold

def check_password_expiry(user):
    """Check if user password has expired"""
    from datetime import datetime, timedelta
    from flask import current_app
    
    if not user.password_updated_at:
        return False
    
    expiry_days = current_app.config.get('PASSWORD_EXPIRY_DAYS', 90)
    expiry_threshold = datetime.utcnow() - timedelta(days=expiry_days)
    
    return user.password_updated_at > expiry_threshold

def generate_secure_token(length=32):
    """Generate a cryptographically secure token"""
    import secrets
    return secrets.token_urlsafe(length)

def validate_api_key(api_key):
    """Validate API key format and existence"""
    from flask import current_app
    from models.user import User
    
    if not api_key:
        return None
    
    # Check if API key exists in database
    user = User.query.filter_by(api_key=api_key, is_active=True).first()
    return user

def sanitize_html(html_content):
    """Sanitize HTML content to prevent XSS"""
    import bleach
    
    allowed_tags = ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'a']
    allowed_attributes = {'a': ['href', 'title']}
    
    return bleach.clean(
        html_content,
        tags=allowed_tags,
        attributes=allowed_attributes,
        strip=True
    )

def validate_file_upload(file, allowed_extensions=None, max_size=None):
    """Validate file upload with enhanced security"""
    from flask import current_app
    
    if not file or not file.filename:
        return False, "No file provided"
    
    # Check file size
    max_size = max_size or current_app.config.get('MAX_FILE_SIZE', 16 * 1024 * 1024)
    if file.content_length and file.content_length > max_size:
        return False, f"File size exceeds maximum allowed size of {max_size} bytes"
    
    # Check file extension
    allowed_extensions = allowed_extensions or current_app.config.get('ALLOWED_FILE_EXTENSIONS', [])
    if '.' not in file.filename:
        return False, "Invalid file type"
    
    file_extension = file.filename.rsplit('.', 1)[1].lower()
    if file_extension not in allowed_extensions:
        return False, f"File type .{file_extension} is not allowed"
    
    # Check for malicious file signatures
    if not _is_safe_file_signature(file):
        return False, "File appears to be malicious"
    
    return True, "File is valid"

def _is_safe_file_signature(file):
    """Check if file has safe signature"""
    import magic
    
    try:
        # Read first few bytes to check signature
        file.seek(0)
        header = file.read(1024)
        file.seek(0)  # Reset file pointer
        
        mime_type = magic.from_buffer(header, mime=True)
        
        # Define safe MIME types
        safe_mime_types = [
            'text/plain', 'text/html', 'text/css', 'text/javascript',
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf', 'application/zip', 'application/x-tar',
            'application/gzip', 'application/x-gzip'
        ]
        
        return mime_type in safe_mime_types
    except Exception:
        return False
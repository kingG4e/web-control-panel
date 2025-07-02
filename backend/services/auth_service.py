from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import jwt
import platform

from models.user import User
from models.database import db
from utils.logger import setup_logger

logger = setup_logger(__name__)

class AuthService:
    """Service class for handling authentication operations."""
    
    def __init__(self):
        self.unix_auth_available = self._check_unix_auth_availability()
    
    def _check_unix_auth_availability(self) -> bool:
        """Check if Unix authentication modules are available."""
        try:
            import pwd
            import spwd
            import crypt
            import pam
            return True
        except ImportError:
            logger.warning("Unix authentication modules not available (Windows system)")
            return False
    
    def authenticate_user(self, username: str, password: str) -> Dict[str, Any]:
        """
        Authenticate user with database or system authentication.
        
        Args:
            username: Username to authenticate
            password: Password to verify
            
        Returns:
            Dict containing authentication result
        """
        try:
            # First check database users
            user = User.query.filter_by(username=username).first()
            if user and not user.is_system_user and user.verify_password(password):
                return self._handle_database_auth_success(user)
            
            # Fallback to system authentication
            if self._authenticate_system_user(username, password):
                return self._handle_system_auth_success(username)
            
            return {
                'success': False,
                'error': 'Invalid credentials',
                'status_code': 401
            }
            
        except Exception as e:
            logger.error(f"Authentication error for user {username}: {e}")
            return {
                'success': False,
                'error': 'Authentication failed',
                'status_code': 500
            }
    
    def _handle_database_auth_success(self, user: User) -> Dict[str, Any]:
        """Handle successful database authentication."""
        user.last_login = datetime.utcnow()
        db.session.commit()
        
        token = self._generate_jwt_token(user)
        
        return {
            'success': True,
            'user': user,
            'token': token
        }
    
    def _handle_system_auth_success(self, username: str) -> Dict[str, Any]:
        """Handle successful system authentication."""
        user_info = self._get_system_user_info(username)
        if not user_info:
            return {
                'success': False,
                'error': 'User not found',
                'status_code': 404
            }
        
        # Get or create user in database
        user = User.query.filter_by(username=username).first()
        if not user:
            user = self._create_system_user(username, user_info)
        
        user.last_login = datetime.utcnow()
        db.session.commit()
        
        token = self._generate_jwt_token(user)
        
        return {
            'success': True,
            'user': user,
            'token': token
        }
    
    def _authenticate_system_user(self, username: str, password: str) -> bool:
        """Authenticate user using system authentication."""
        if not self.unix_auth_available:
            # Development mode - simple authentication
            return username == "admin" and password == "admin"
        
        try:
            import pam
            auth = pam.pam()
            return auth.authenticate(username, password)
        except Exception as e:
            logger.error(f"System authentication error: {e}")
            return False
    
    def _get_system_user_info(self, username: str) -> Optional[Any]:
        """Get user information from system."""
        if not self.unix_auth_available:
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
            import pwd
            return pwd.getpwnam(username)
        except KeyError:
            return None
    
    def _create_system_user(self, username: str, user_info: Any) -> User:
        """Create a new system user in database."""
        user = User(
            username=username,
            email=f"{username}@localhost",
            role='admin' if user_info.pw_uid == 0 else 'user',
            is_system_user=True,
            system_uid=user_info.pw_uid
        )
        db.session.add(user)
        db.session.commit()
        return user
    
    def _generate_jwt_token(self, user: User) -> str:
        """Generate JWT token for user."""
        token_payload = {
            'user_id': user.id,
            'username': user.username,
            'exp': datetime.utcnow() + timedelta(hours=24)
        }
        from flask import current_app
        return jwt.encode(token_payload, current_app.config['SECRET_KEY'], algorithm='HS256')
    
    def verify_jwt_token(self, token: str) -> Optional[User]:
        """
        Verify JWT token and return user.
        
        Args:
            token: JWT token to verify
            
        Returns:
            User object if token is valid, None otherwise
        """
        try:
            from flask import current_app
            data = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
            user = User.query.get(data['user_id'])
            return user if user else None
        except (jwt.ExpiredSignatureError, jwt.InvalidTokenError) as e:
            logger.warning(f"JWT token verification failed: {e}")
            return None
    
    def refresh_token(self, token: str) -> Optional[str]:
        """
        Refresh JWT token.
        
        Args:
            token: Current JWT token
            
        Returns:
            New JWT token if current token is valid, None otherwise
        """
        user = self.verify_jwt_token(token)
        if user:
            return self._generate_jwt_token(user)
        return None
    
    def revoke_token(self, token: str) -> bool:
        """
        Revoke JWT token (add to blacklist).
        
        Args:
            token: JWT token to revoke
            
        Returns:
            True if token was revoked successfully
        """
        # In a production environment, you would add the token to a blacklist
        # For now, we'll just log the revocation
        logger.info(f"Token revoked for user")
        return True 
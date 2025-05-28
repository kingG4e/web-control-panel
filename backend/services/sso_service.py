import os
import pwd
import crypt
from typing import Optional, Dict
from models.user import User, db

class SSOService:
    def __init__(self):
        self.system_users = {}
        self.refresh_system_users()

    def refresh_system_users(self):
        """Refresh the cache of system users"""
        try:
            # Get system users from /etc/passwd
            for user in pwd.getpwall():
                if user.pw_uid >= 1000 and user.pw_uid < 60000:  # Regular users
                    self.system_users[user.pw_name] = {
                        'uid': user.pw_uid,
                        'email': f"{user.pw_name}@localhost",
                        'is_active': True
                    }
        except Exception as e:
            print(f"Error refreshing system users: {str(e)}")

    def verify_credentials(self, username: str, password: str) -> bool:
        """Verify user credentials"""
        try:
            user = User.query.filter_by(username=username).first()
            if not user:
                return False
            
            # Use Linux PAM for authentication
            import pamela
            try:
                pamela.authenticate(username, password)
                return True
            except pamela.PAMError:
                return False
        except Exception as e:
            print(f"Error verifying credentials: {str(e)}")
            return False

    def sync_system_user(self, username: str) -> Optional[User]:
        """Sync system user with control panel user"""
        try:
            user = User.query.filter_by(username=username).first()
            if not user:
                try:
                    # Get system user info
                    pwd_entry = pwd.getpwnam(username)
                    user = User(
                        username=username,
                        email=f"{username}@localhost",
                        is_active=True,
                        is_system_user=True,
                        system_uid=pwd_entry.pw_uid
                    )
                    db.session.add(user)
                    db.session.commit()
                except KeyError:
                    return None
            return user
        except Exception as e:
            print(f"Error syncing system user: {str(e)}")
            db.session.rollback()
            return None

    def authenticate(self, username: str, password: str) -> Optional[Dict]:
        """Authenticate user"""
        if not self.verify_credentials(username, password):
            return None

        user = User.query.filter_by(username=username).first()
        if not user:
            return None

        return {
            'user_id': user.id,
            'username': user.username,
            'is_system_user': user.is_system_user,
            'system_uid': user.system_uid
        }

    def get_system_user_info(self, username: str) -> Optional[Dict]:
        """Get system user information"""
        return self.system_users.get(username) 
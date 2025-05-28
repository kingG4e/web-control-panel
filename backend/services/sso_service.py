import os
import pwd
import spwd
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
            for user in pwd.getpwall():
                # Filter system users (UID >= 1000)
                if user.pw_uid >= 1000 and user.pw_shell != '/usr/sbin/nologin':
                    self.system_users[user.pw_name] = {
                        'uid': user.pw_uid,
                        'gid': user.pw_gid,
                        'home': user.pw_dir,
                        'shell': user.pw_shell
                    }
        except Exception as e:
            print(f"Error refreshing system users: {str(e)}")

    def verify_system_credentials(self, username: str, password: str) -> bool:
        """Verify system user credentials"""
        try:
            system_password = spwd.getspnam(username).sp_pwd
            return system_password == crypt.crypt(password, system_password)
        except KeyError:
            return False
        except Exception as e:
            print(f"Error verifying system credentials: {str(e)}")
            return False

    def sync_system_user(self, username: str) -> Optional[User]:
        """Sync system user with control panel user"""
        if username not in self.system_users:
            return None

        try:
            user = User.query.filter_by(username=username).first()
            system_info = self.system_users[username]

            if not user:
                # Create new user
                user = User(
                    username=username,
                    email=f"{username}@localhost",  # Default email
                    is_active=True,
                    is_system_user=True,
                    system_uid=system_info['uid']
                )
                db.session.add(user)
            else:
                # Update existing user
                user.is_system_user = True
                user.system_uid = system_info['uid']

            db.session.commit()
            return user

        except Exception as e:
            print(f"Error syncing system user: {str(e)}")
            db.session.rollback()
            return None

    def authenticate(self, username: str, password: str) -> Optional[Dict]:
        """Authenticate user through SSO"""
        if not self.verify_system_credentials(username, password):
            return None

        user = self.sync_system_user(username)
        if not user:
            return None

        return {
            'user_id': user.id,
            'username': user.username,
            'is_system_user': True,
            'system_uid': user.system_uid
        }

    def get_system_user_info(self, username: str) -> Optional[Dict]:
        """Get system user information"""
        return self.system_users.get(username) 
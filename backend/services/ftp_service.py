import os
import subprocess
from typing import List, Dict, Optional
from werkzeug.security import generate_password_hash
from models.ftp import FTPAccount, FTPAccessRule, db
from models.user import User

class FTPService:
    def create_account(self, data: Dict) -> FTPAccount:
        """Create a new FTP/SFTP account"""
        # Create FTP account
        account = FTPAccount(
            username=data['username'],
            password_hash=generate_password_hash(data['password']),
            home_directory=data['home_directory'],
            is_sftp=data.get('is_sftp', True),
            user_id=data['user_id'],
            domain=data['domain'],
            permissions=data.get('permissions', '0755'),
            quota_size_mb=data.get('quota_size_mb', 0)
        )

        # Create access rules if provided
        if 'access_rules' in data:
            for rule_data in data['access_rules']:
                rule = FTPAccessRule(
                    directory_path=rule_data['directory_path'],
                    permissions=rule_data['permissions']
                )
                account.access_rules.append(rule)

        db.session.add(account)
        db.session.commit()

        # Create home directory if it doesn't exist
        self._create_home_directory(account)

        return account

    def update_account(self, account_id: int, data: Dict) -> Optional[FTPAccount]:
        """Update an existing FTP/SFTP account"""
        account = FTPAccount.query.get(account_id)
        if not account:
            return None

        if 'username' in data:
            account.username = data['username']
        if 'password' in data:
            account.password_hash = generate_password_hash(data['password'])
        if 'home_directory' in data:
            old_home = account.home_directory
            account.home_directory = data['home_directory']
            self._move_home_directory(old_home, account.home_directory)
        if 'is_sftp' in data:
            account.is_sftp = data['is_sftp']
        if 'is_active' in data:
            account.is_active = data['is_active']
        if 'permissions' in data:
            account.permissions = data['permissions']
        if 'quota_size_mb' in data:
            account.quota_size_mb = data['quota_size_mb']

        # Update access rules if provided
        if 'access_rules' in data:
            # Remove existing rules
            FTPAccessRule.query.filter_by(ftp_account_id=account_id).delete()
            
            # Add new rules
            for rule_data in data['access_rules']:
                rule = FTPAccessRule(
                    ftp_account_id=account_id,
                    directory_path=rule_data['directory_path'],
                    permissions=rule_data['permissions']
                )
                db.session.add(rule)

        db.session.commit()
        return account

    def delete_account(self, account_id: int) -> bool:
        """Delete an FTP/SFTP account"""
        account = FTPAccount.query.get(account_id)
        if not account:
            return False

        # Remove home directory
        self._remove_home_directory(account.home_directory)

        db.session.delete(account)
        db.session.commit()
        return True

    def get_accounts_by_user(self, user_id: int) -> List[FTPAccount]:
        """Get all FTP/SFTP accounts for a user"""
        return FTPAccount.query.filter_by(user_id=user_id).all()

    def get_accounts_by_domain(self, domain: str) -> List[FTPAccount]:
        """Get all FTP/SFTP accounts for a domain"""
        return FTPAccount.query.filter_by(domain=domain).all()

    def add_access_rule(self, account_id: int, data: Dict) -> Optional[FTPAccessRule]:
        """Add a new access rule to an FTP/SFTP account"""
        account = FTPAccount.query.get(account_id)
        if not account:
            return None

        rule = FTPAccessRule(
            ftp_account_id=account_id,
            directory_path=data['directory_path'],
            permissions=data['permissions']
        )

        db.session.add(rule)
        db.session.commit()
        return rule

    def remove_access_rule(self, rule_id: int) -> bool:
        """Remove an access rule"""
        rule = FTPAccessRule.query.get(rule_id)
        if not rule:
            return False

        db.session.delete(rule)
        db.session.commit()
        return True

    def _create_home_directory(self, account: FTPAccount) -> None:
        """Create home directory for FTP/SFTP account"""
        if not os.path.exists(account.home_directory):
            os.makedirs(account.home_directory, mode=0o755, exist_ok=True)
            # Set ownership and permissions
            os.chown(account.home_directory, os.getuid(), os.getgid())
            os.chmod(account.home_directory, int(account.permissions, 8))

    def _move_home_directory(self, old_path: str, new_path: str) -> None:
        """Move home directory to new location"""
        if os.path.exists(old_path) and old_path != new_path:
            os.makedirs(os.path.dirname(new_path), mode=0o755, exist_ok=True)
            subprocess.run(['mv', old_path, new_path], check=True)

    def _remove_home_directory(self, path: str) -> None:
        """Remove home directory"""
        if os.path.exists(path):
            subprocess.run(['rm', '-rf', path], check=True)

    def apply_quota(self, account: FTPAccount) -> None:
        """Apply disk quota for FTP/SFTP account"""
        if account.quota_size_mb > 0:
            # Convert MB to bytes
            quota_bytes = account.quota_size_mb * 1024 * 1024
            subprocess.run([
                'setquota',
                '-u',
                account.username,
                str(quota_bytes),
                str(quota_bytes),
                '0',
                '0',
                account.home_directory
            ], check=True) 
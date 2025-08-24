import os
import platform
import subprocess
import shutil
from typing import Dict, Optional, Tuple
from datetime import datetime


class QuotaMonitoringService:
    """Real-time quota usage monitoring service for Linux users and email accounts."""
    
    def __init__(self):
        self.is_linux = platform.system() == 'Linux'
    
    def get_user_storage_usage(self, username: str) -> Optional[Dict]:
        """Get real-time storage usage for a Linux user."""
        if not self.is_linux:
            return None
            
        try:
            # Get user's home directory
            import pwd
            user_info = pwd.getpwnam(username)
            home_dir = user_info.pw_dir
            
            if not os.path.exists(home_dir):
                return None
            
            # Get disk usage using du command
            result = subprocess.run(
                ['du', '-s', '--block-size=1K', home_dir], 
                capture_output=True, 
                text=True, 
                check=True
            )
            
            # Parse output: "12345\t/home/username"
            usage_kb = int(result.stdout.split('\t')[0])
            usage_mb = round(usage_kb / 1024, 2)
            
            # Get quota limits if available
            quota_info = self._get_user_quota_limits(username)
            
            return {
                'username': username,
                'home_directory': home_dir,
                'usage_mb': usage_mb,
                'usage_kb': usage_kb,
                'quota_soft_mb': quota_info.get('soft_mb'),
                'quota_hard_mb': quota_info.get('hard_mb'),
                'quota_usage_percent': self._calculate_usage_percent(usage_mb, quota_info.get('soft_mb')),
                'last_updated': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            print(f"Error getting storage usage for {username}: {e}")
            return None
    
    def _get_user_quota_limits(self, username: str) -> Dict:
        """Get quota limits for a user from the filesystem."""
        if not self.is_linux or not shutil.which('quota'):
            return {}
            
        try:
            # Get quota information
            result = subprocess.run(
                ['quota', '-u', username], 
                capture_output=True, 
                text=True, 
                check=False
            )
            
            if result.returncode != 0:
                return {}
            
            # Parse quota output
            lines = result.stdout.strip().split('\n')
            if len(lines) < 3:
                return {}
            
            # Find the line with actual quota data (usually line 2)
            quota_line = None
            for line in lines:
                if username in line and ('/' in line or 'dev' in line):
                    quota_line = line
                    break
            
            if not quota_line:
                return {}
            
            # Parse quota data: "username /dev/sda1 12345 20480 0 0"
            parts = quota_line.split()
            if len(parts) >= 5:
                soft_kb = int(parts[2])
                hard_kb = int(parts[3])
                return {
                    'soft_mb': round(soft_kb / 1024, 2),
                    'hard_mb': round(hard_kb / 1024, 2)
                }
                
        except Exception as e:
            print(f"Error getting quota limits for {username}: {e}")
            
        return {}
    
    def _calculate_usage_percent(self, usage_mb: float, quota_mb: Optional[float]) -> Optional[float]:
        """Calculate usage percentage based on quota."""
        if quota_mb is None or quota_mb <= 0:
            return None
        return round((usage_mb / quota_mb) * 100, 2)
    
    def get_email_quota_usage(self, email_account_id: int, email_service) -> Optional[Dict]:
        """Get real-time email quota usage for an email account."""
        try:
            # Get email account info from database
            from models.email import EmailAccount
            from models.database import db
            
            account = EmailAccount.query.get(email_account_id)
            if not account:
                return None
            
            # Get maildir path
            maildir_path = os.path.join(
                email_service.virtual_mailbox_base,
                account.email_domain.domain,
                account.username
            )
            
            if not os.path.exists(maildir_path):
                return None
            
            # Calculate maildir size
            result = subprocess.run(
                ['du', '-s', '--block-size=1K', maildir_path], 
                capture_output=True, 
                text=True, 
                check=True
            )
            
            usage_kb = int(result.stdout.split('\t')[0])
            usage_mb = round(usage_kb / 1024, 2)
            
            return {
                'email_account_id': email_account_id,
                'email': account.get_email(),
                'quota_mb': account.quota,
                'usage_mb': usage_mb,
                'usage_percent': round((usage_mb / account.quota) * 100, 2) if account.quota > 0 else None,
                'maildir_path': maildir_path,
                'last_updated': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            print(f"Error getting email quota usage for account {email_account_id}: {e}")
            return None
    
    def get_all_users_quota_usage(self) -> Dict[str, Dict]:
        """Get quota usage for all system users."""
        if not self.is_linux:
            return {}
            
        try:
            import pwd
            users_usage = {}
            
            for user_info in pwd.getpwall():
                username = user_info.pw_name
                # Skip system users (UID < 1000) except root
                if user_info.pw_uid < 1000 and username != 'root':
                    continue
                    
                usage = self.get_user_storage_usage(username)
                if usage:
                    users_usage[username] = usage
            
            return users_usage
            
        except Exception as e:
            print(f"Error getting all users quota usage: {e}")
            return {}
    
    def get_quota_alerts(self, threshold_percent: float = 80.0) -> Dict[str, list]:
        """Get quota alerts for users approaching or exceeding limits."""
        alerts = {
            'warning': [],  # 80-95%
            'critical': [],  # 95-100%
            'exceeded': []   # >100%
        }
        
        all_usage = self.get_all_users_quota_usage()
        
        for username, usage in all_usage.items():
            usage_percent = usage.get('quota_usage_percent')
            if usage_percent is None:
                continue
                
            if usage_percent > 100:
                alerts['exceeded'].append({
                    'username': username,
                    'usage_percent': usage_percent,
                    'usage_mb': usage['usage_mb'],
                    'quota_mb': usage.get('quota_soft_mb')
                })
            elif usage_percent >= 95:
                alerts['critical'].append({
                    'username': username,
                    'usage_percent': usage_percent,
                    'usage_mb': usage['usage_mb'],
                    'quota_mb': usage.get('quota_soft_mb')
                })
            elif usage_percent >= threshold_percent:
                alerts['warning'].append({
                    'username': username,
                    'usage_percent': usage_percent,
                    'usage_mb': usage['usage_mb'],
                    'quota_mb': usage.get('quota_soft_mb')
                })
        
        return alerts

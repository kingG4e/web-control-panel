import os
import platform
import subprocess
import shutil
from typing import Dict, Optional, Tuple
from datetime import datetime
from time import time
import re


class QuotaMonitoringService:
    """Real-time quota usage monitoring service for Linux users and email accounts."""
    
    def __init__(self):
        self.is_linux = platform.system() == 'Linux'
        self.quota_path = self._find_executable('quota')
        self.setquota_path = self._find_executable('setquota')
        self._all_users_cache: Optional[Dict[str, Dict]] = None
        self._cache_timestamp: float = 0.0

    def _find_executable(self, name: str) -> Optional[str]:
        """Find an executable, checking common paths if not in PATH."""
        path = shutil.which(name)
        if path:
            return path
        # Try common paths if not in PATH
        common_paths = [f'/usr/sbin/{name}', f'/sbin/{name}']
        for p in common_paths:
            if os.path.exists(p) and os.access(p, os.X_OK):
                return p
        return None

    def get_all_users_quota_usage(self, force_refresh: bool = False, cache_duration_seconds: int = 300) -> Dict[str, Dict]:
        """Get quota usage for all system users, with in-memory caching."""
        now = time()
        if force_refresh or not self._all_users_cache or (now - self._cache_timestamp > cache_duration_seconds):
            self._all_users_cache = self._fetch_all_users_quota_usage()
            self._cache_timestamp = now
        
        # Return a copy to prevent mutation of the cache
        return self._all_users_cache.copy() if self._all_users_cache else {}

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
            
            # Fast path: read used/limits (and grace) from quota output; fallback to du if unavailable
            quota_usage = self._get_user_quota_usage_and_limits(username)
            if quota_usage.get('used_mb') is not None:
                usage_mb = quota_usage['used_mb']
                usage_kb = int(usage_mb * 1024)
                soft_mb = quota_usage.get('soft_mb')
                hard_mb = quota_usage.get('hard_mb')
                grace_text = quota_usage.get('grace')
            else:
                result = subprocess.run(
                    ['du', '-s', '--block-size=1K', '--one-file-system', home_dir], 
                    capture_output=True, 
                    text=True, 
                    check=True,
                    timeout=10
                )
                usage_kb = int(result.stdout.split('\t')[0])
                usage_mb = round(usage_kb / 1024, 2)
                limits = self._get_user_quota_limits(username)
                soft_mb = limits.get('soft_mb')
                hard_mb = limits.get('hard_mb')
                grace_text = None

            return {
                'username': username,
                'home_directory': home_dir,
                'usage_mb': usage_mb,
                'usage_kb': usage_kb,
                'quota_soft_mb': soft_mb,
                'quota_hard_mb': hard_mb,
                'quota_usage_percent': self._calculate_usage_percent(usage_mb, soft_mb),
                'quota_grace': grace_text,
                'is_exceeded_soft': True if (soft_mb is not None and soft_mb > 0 and usage_mb > soft_mb) else False,
                'is_exceeded_hard': True if (hard_mb is not None and hard_mb > 0 and usage_mb > hard_mb) else False,
                'last_updated': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            print(f"Error getting storage usage for {username}: {e}")
            return None
    
    def _get_user_quota_limits(self, username: str) -> Dict:
        """Get quota limits for a user from the filesystem."""
        if not self.is_linux or not self.quota_path:
            return {}
            
        try:
            # Get quota information
            result = subprocess.run(
                [self.quota_path, '-u', username], 
                capture_output=True, 
                text=True, 
                check=False,
                timeout=8
            )
            
            if result.returncode != 0:
                return {}
            
            lines = [ln.rstrip() for ln in result.stdout.splitlines() if ln.strip()]
            # Find the line index that starts with a filesystem path
            fs_idx = None
            for idx, line in enumerate(lines):
                if line.lstrip().startswith('/'):
                    fs_idx = idx
                    break
            if fs_idx is None:
                return {}

            # Try to parse numbers on the same line
            same_line_parts = lines[fs_idx].split()
            # Accept numeric tokens with optional trailing '*' (means over soft limit on used blocks)
            numbers = [re.sub(r"\*$", "", p) for p in same_line_parts if re.fullmatch(r"\d+\*?", p)]
            soft_kb = hard_kb = None
            if len(numbers) >= 3:
                # Layout: <fs> <blocks> <quota-soft> <quota-hard> ...
                try:
                    soft_kb = int(numbers[1])
                    hard_kb = int(numbers[2])
                except Exception:
                    soft_kb = hard_kb = None
            
            # If not on the same line, check the following line (wrapped layout)
            if soft_kb is None or hard_kb is None:
                if fs_idx + 1 < len(lines):
                    next_line_numbers = [re.sub(r"\*$", "", p) for p in lines[fs_idx + 1].split() if re.fullmatch(r"\d+\*?", p)]
                    if len(next_line_numbers) >= 3:
                        try:
                            soft_kb = int(next_line_numbers[1])
                            hard_kb = int(next_line_numbers[2])
                        except Exception:
                            return {}
                    else:
                        return {}
                else:
                    return {}

            return {
                'soft_mb': round(soft_kb / 1024, 2) if soft_kb is not None else None,
                'hard_mb': round(hard_kb / 1024, 2) if hard_kb is not None else None,
            }
                
        except Exception as e:
            print(f"Error getting quota limits for {username}: {e}")
            
        return {}

    def _get_user_quota_usage_and_limits(self, username: str) -> Dict[str, Optional[float]]:
        """Parse quota output to get used, soft, hard (MB) and grace text. Returns empty dict on failure."""
        if not self.is_linux or not self.quota_path:
            return {}
        try:
            result = subprocess.run(
                [self.quota_path, '-u', username],
                capture_output=True,
                text=True,
                check=False,
                timeout=8
            )
            # Don't check return code - quota returns 1 when user is over limit
            lines = [ln.rstrip() for ln in result.stdout.splitlines() if ln.strip()]
            
            # Find filesystem line and data line
            fs_idx = None
            for idx, line in enumerate(lines):
                if line.lstrip().startswith('/'):
                    fs_idx = idx
                    break
            if fs_idx is None:
                return {}
            
            # Look for data line (could be same line or next line)
            data_line = None
            if fs_idx + 1 < len(lines):
                # Check if next line has numeric data
                next_line = lines[fs_idx + 1].strip()
                if re.search(r'\d+', next_line):
                    data_line = next_line
                else:
                    # Data might be on the same line as filesystem
                    fs_line_parts = lines[fs_idx].split()
                    if len(fs_line_parts) > 1 and re.search(r'\d+', ' '.join(fs_line_parts[1:])):
                        data_line = ' '.join(fs_line_parts[1:])
            else:
                # Only filesystem line, check if data is on same line
                fs_line_parts = lines[fs_idx].split()
                if len(fs_line_parts) > 1:
                    data_line = ' '.join(fs_line_parts[1:])
            
            if not data_line:
                return {}
            
            # Parse the data line: blocks quota limit grace files quota limit grace
            tokens = data_line.split()
            if len(tokens) < 4:
                return {}
            
            # Extract block quota info (first 4 tokens)
            used_str = tokens[0]  # blocks (may have *)
            soft_str = tokens[1]  # quota
            hard_str = tokens[2]  # limit
            grace_str = tokens[3] if len(tokens) > 3 else None  # grace
            
            # Parse numbers, removing * if present
            used_kb = int(re.sub(r'\*$', '', used_str))
            soft_kb = int(soft_str) if soft_str != '0' else None
            hard_kb = int(hard_str) if hard_str != '0' else None
            
            # Parse grace (skip if it's just numbers or empty)
            grace_text = None
            if grace_str and not re.fullmatch(r'\d+', grace_str) and grace_str != '0':
                grace_text = grace_str
            
            result_dict = {
                'used_mb': round(used_kb / 1024, 2),
                'grace': grace_text
            }
            
            if soft_kb is not None:
                result_dict['soft_mb'] = round(soft_kb / 1024, 2)
            if hard_kb is not None:
                result_dict['hard_mb'] = round(hard_kb / 1024, 2)
                
            return result_dict
            
        except Exception as e:
            print(f"Error parsing quota usage for {username}: {e}")
            return {}
    
    def _calculate_usage_percent(self, usage_mb: float, quota_mb: Optional[float]) -> Optional[float]:
        """Calculate usage percentage based on quota."""
        if quota_mb is None or quota_mb <= 0:
            return None
        return round((usage_mb / quota_mb) * 100, 2)
    
    def set_user_quota(self, username: str, soft_limit_mb: Optional[int], hard_limit_mb: Optional[int]) -> Dict:
        """Set storage quota for a Linux user using setquota."""
        if not self.is_linux or not self.setquota_path:
            raise NotImplementedError("Quota management is not supported on this OS. 'setquota' command not found.")
            
        try:
            # First, find the filesystem for the user's home directory
            import pwd
            user_info = pwd.getpwnam(username)
            home_dir = user_info.pw_dir
            
            # Find the mount point for the user's home directory
            result = subprocess.run(
                ['df', home_dir], 
                capture_output=True, 
                text=True, 
                check=True
            )
            filesystem = result.stdout.strip().split('\n')[-1].split()[0]

            # Convert MB to KB for setquota command
            soft_limit_kb = int(soft_limit_mb * 1024) if soft_limit_mb is not None else 0
            hard_limit_kb = int(hard_limit_mb * 1024) if hard_limit_mb is not None else 0

            # Grace period is typically not set for block quotas, so inodes are 0 0
            command = [
                'sudo', self.setquota_path, '-u', username, 
                str(soft_limit_kb), str(hard_limit_kb), 
                '0', '0', filesystem
            ]
            
            result = subprocess.run(
                command,
                capture_output=True,
                text=True,
                check=True
            )
            
            # Invalidate the cache since we've changed the quota
            self._all_users_cache = None
            self._cache_timestamp = 0.0

            return {
                'success': True,
                'message': f"Quota for {username} set successfully.",
                'username': username,
                'soft_limit_mb': soft_limit_mb,
                'hard_limit_mb': hard_limit_mb,
                'filesystem': filesystem
            }

        except subprocess.CalledProcessError as e:
            error_message = f"Failed to set quota for {username}. Error: {e.stderr}"
            print(error_message)
            raise Exception(error_message)
        except Exception as e:
            error_message = f"An unexpected error occurred while setting quota for {username}: {e}"
            print(error_message)
            raise Exception(error_message)
    
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
    
    def _fetch_all_users_quota_usage(self) -> Dict[str, Dict]:
        """Get quota usage for all system users."""
        if not self.is_linux:
            return {}
            
        try:
            users_usage = {}
            usernames = []
            try:
                # Prefer application users from DB (fewer than system accounts)
                from models.user import User
                usernames = [u.username for u in User.query.all()]
            except Exception:
                # Fallback to all system users when DB not available
                import pwd
                for user_info in pwd.getpwall():
                    username = user_info.pw_name
                    if user_info.pw_uid < 1000 and username != 'root':
                        continue
                    usernames.append(username)

            for username in usernames:
                usage = self.get_user_storage_usage(username)
                if usage:
                    users_usage[username] = usage
            
            return users_usage
            
        except Exception as e:
            print(f"Error getting all users quota usage: {e}")
            return {}
    
    def get_quota_alerts(self, threshold_percent: float = 80.0, all_usage_data: Optional[Dict[str, Dict]] = None) -> Dict[str, list]:
        """Get quota alerts for users approaching or exceeding limits."""
        alerts = {
            'warning': [],  # 80-95%
            'critical': [],  # 95-100%
            'exceeded': []   # >100%
        }
        
        all_usage = all_usage_data if all_usage_data is not None else self.get_all_users_quota_usage()
        
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

import os
import subprocess
import hashlib
import platform
from datetime import datetime

class EmailService:
    def __init__(self):
        # Detect operating system
        self.is_windows = platform.system() == 'Windows'
        
        if self.is_windows:
            # Windows simulation mode - use temp directories
            self.virtual_mailbox_base = os.path.join(os.environ.get('TEMP', 'C:\\temp'), 'mail_simulation')
            self.postfix_config_dir = os.path.join(os.environ.get('TEMP', 'C:\\temp'), 'postfix_simulation')
            self.dovecot_config_dir = os.path.join(os.environ.get('TEMP', 'C:\\temp'), 'dovecot_simulation')
            
            # Create simulation directories
            os.makedirs(self.virtual_mailbox_base, exist_ok=True)
            os.makedirs(self.postfix_config_dir, exist_ok=True)
            os.makedirs(self.dovecot_config_dir, exist_ok=True)
        else:
            # Linux production mode
            self.virtual_mailbox_base = '/var/mail/vhosts'
            self.postfix_config_dir = '/etc/postfix'
            self.dovecot_config_dir = '/etc/dovecot'

    def create_domain(self, domain):
        """Create a new email domain"""
        try:
            # Create domain directory
            domain_dir = os.path.join(self.virtual_mailbox_base, domain)
            os.makedirs(domain_dir, exist_ok=True)
            
            if not self.is_windows:
                os.chmod(domain_dir, 0o755)

            # Update Postfix virtual domains
            virtual_domains_file = os.path.join(self.postfix_config_dir, "virtual_domains")
            with open(virtual_domains_file, "a") as f:
                f.write(f"{domain}\n")

            # Reload Postfix (only on Linux)
            if not self.is_windows:
                subprocess.run(['systemctl', 'reload', 'postfix'], check=True)
            else:
                print(f"[SIMULATION] Would reload Postfix for domain: {domain}")

        except Exception as e:
            if self.is_windows:
                print(f"[SIMULATION] Email domain creation for {domain}: {str(e)}")
                # Don't raise exception in Windows simulation mode
            else:
                raise Exception(f'Failed to create email domain: {str(e)}')

    def delete_domain(self, domain):
        """Delete an email domain"""
        try:
            # Remove domain directory
            domain_dir = os.path.join(self.virtual_mailbox_base, domain)
            if os.path.exists(domain_dir):
                subprocess.run(['rm', '-rf', domain_dir], check=True)

            # Update Postfix virtual domains
            with open(f"{self.postfix_config_dir}/virtual_domains", "r") as f:
                domains = f.readlines()
            with open(f"{self.postfix_config_dir}/virtual_domains", "w") as f:
                for d in domains:
                    if d.strip() != domain:
                        f.write(d)

            # Reload Postfix
            subprocess.run(['systemctl', 'reload', 'postfix'], check=True)

        except Exception as e:
            raise Exception(f'Failed to delete email domain: {str(e)}')

    def create_account(self, username, domain, password, quota=1024):
        """Create a new email account"""
        try:
            # Create user directory
            user_dir = os.path.join(self.virtual_mailbox_base, domain, username)
            os.makedirs(user_dir, exist_ok=True)
            
            if not self.is_windows:
                os.chmod(user_dir, 0o700)

            # Hash password using SHA-256
            salt = os.urandom(32).hex()
            hashed_password = hashlib.sha256(f"{salt}{password}".encode()).hexdigest()
            password_entry = f"{salt}${hashed_password}"

            # Update Dovecot users
            dovecot_users_file = os.path.join(self.dovecot_config_dir, "users")
            with open(dovecot_users_file, "a") as f:
                if self.is_windows:
                    f.write(f"{username}@{domain}:{password_entry}:1000:1000::{user_dir}::{quota}M\n")
                else:
                    f.write(f"{username}@{domain}:{password_entry}:{os.getuid()}:{os.getgid()}::{user_dir}::{quota}M\n")

            # Update Postfix virtual mailboxes
            virtual_mailboxes_file = os.path.join(self.postfix_config_dir, "virtual_mailboxes")
            with open(virtual_mailboxes_file, "a") as f:
                f.write(f"{username}@{domain} {domain}/{username}/\n")

            # Reload services (only on Linux)
            if not self.is_windows:
                subprocess.run(['systemctl', 'reload', 'postfix'], check=True)
                subprocess.run(['systemctl', 'reload', 'dovecot'], check=True)
            else:
                print(f"[SIMULATION] Would reload Postfix and Dovecot for account: {username}@{domain}")

        except Exception as e:
            if self.is_windows:
                print(f"[SIMULATION] Email account creation for {username}@{domain}: {str(e)}")
                # Don't raise exception in Windows simulation mode
            else:
                raise Exception(f'Failed to create email account: {str(e)}')

    def delete_account(self, username, domain):
        """Delete an email account"""
        try:
            # Remove user directory
            user_dir = os.path.join(self.virtual_mailbox_base, domain, username)
            if os.path.exists(user_dir):
                subprocess.run(['rm', '-rf', user_dir], check=True)

            # Update Dovecot users
            with open(f"{self.dovecot_config_dir}/users", "r") as f:
                users = f.readlines()
            with open(f"{self.dovecot_config_dir}/users", "w") as f:
                for user in users:
                    if not user.startswith(f"{username}@{domain}:"):
                        f.write(user)

            # Update Postfix virtual mailboxes
            with open(f"{self.postfix_config_dir}/virtual_mailboxes", "r") as f:
                mailboxes = f.readlines()
            with open(f"{self.postfix_config_dir}/virtual_mailboxes", "w") as f:
                for mailbox in mailboxes:
                    if not mailbox.startswith(f"{username}@{domain} "):
                        f.write(mailbox)

            # Reload services
            subprocess.run(['systemctl', 'reload', 'postfix'], check=True)
            subprocess.run(['systemctl', 'reload', 'dovecot'], check=True)

        except Exception as e:
            raise Exception(f'Failed to delete email account: {str(e)}')

    def create_forwarder(self, source, destination, domain):
        """Create an email forwarder"""
        try:
            # Update Postfix virtual aliases
            with open(f"{self.postfix_config_dir}/virtual_aliases", "a") as f:
                f.write(f"{source}@{domain} {destination}\n")

            # Reload Postfix
            subprocess.run(['systemctl', 'reload', 'postfix'], check=True)

        except Exception as e:
            raise Exception(f'Failed to create email forwarder: {str(e)}')

    def delete_forwarder(self, source, domain):
        """Delete an email forwarder"""
        try:
            # Update Postfix virtual aliases
            with open(f"{self.postfix_config_dir}/virtual_aliases", "r") as f:
                aliases = f.readlines()
            with open(f"{self.postfix_config_dir}/virtual_aliases", "w") as f:
                for alias in aliases:
                    if not alias.startswith(f"{source}@{domain} "):
                        f.write(alias)

            # Reload Postfix
            subprocess.run(['systemctl', 'reload', 'postfix'], check=True)

        except Exception as e:
            raise Exception(f'Failed to delete email forwarder: {str(e)}')

    def create_alias(self, alias, account_email):
        """Create an email alias"""
        try:
            # Update Postfix virtual aliases
            with open(f"{self.postfix_config_dir}/virtual_aliases", "a") as f:
                f.write(f"{alias} {account_email}\n")

            # Reload Postfix
            subprocess.run(['systemctl', 'reload', 'postfix'], check=True)

        except Exception as e:
            raise Exception(f'Failed to create email alias: {str(e)}')

    def delete_alias(self, alias):
        """Delete an email alias"""
        try:
            # Update Postfix virtual aliases
            with open(f"{self.postfix_config_dir}/virtual_aliases", "r") as f:
                aliases = f.readlines()
            with open(f"{self.postfix_config_dir}/virtual_aliases", "w") as f:
                for a in aliases:
                    if not a.startswith(f"{alias} "):
                        f.write(a)

            # Reload Postfix
            subprocess.run(['systemctl', 'reload', 'postfix'], check=True)

        except Exception as e:
            raise Exception(f'Failed to delete email alias: {str(e)}')

    def get_quota_usage(self, username, domain):
        """Get mailbox quota usage in MB"""
        try:
            user_dir = os.path.join(self.virtual_mailbox_base, domain, username)
            if not os.path.exists(user_dir):
                return 0

            # Get directory size using du command
            result = subprocess.run(['du', '-sm', user_dir], capture_output=True, text=True, check=True)
            size = float(result.stdout.split()[0])
            
            return size

        except Exception as e:
            raise Exception(f'Failed to get quota usage: {str(e)}')

    def update_account_password(self, username, domain, new_password):
        """Update password for an email account"""
        try:
            # Hash new password using SHA-256
            salt = os.urandom(32).hex()
            hashed_password = hashlib.sha256(f"{salt}{new_password}".encode()).hexdigest()
            password_entry = f"{salt}${hashed_password}"

            # Update Dovecot users file
            users_file = f"{self.dovecot_config_dir}/users"
            with open(users_file, "r") as f:
                users = f.readlines()
            
            with open(users_file, "w") as f:
                for user in users:
                    if user.startswith(f"{username}@{domain}:"):
                        # Replace password part
                        parts = user.strip().split(":")
                        parts[1] = password_entry
                        f.write(":".join(parts) + "\n")
                    else:
                        f.write(user)

            # Reload Dovecot
            subprocess.run(['systemctl', 'reload', 'dovecot'], check=True)

        except Exception as e:
            raise Exception(f'Failed to update account password: {str(e)}')

    def update_account_quota(self, username, domain, new_quota):
        """Update quota for an email account"""
        try:
            # Update Dovecot users file
            users_file = f"{self.dovecot_config_dir}/users"
            with open(users_file, "r") as f:
                users = f.readlines()
            
            with open(users_file, "w") as f:
                for user in users:
                    if user.startswith(f"{username}@{domain}:"):
                        # Replace quota part (last field)
                        parts = user.strip().split(":")
                        parts[-1] = f"{new_quota}M"
                        f.write(":".join(parts) + "\n")
                    else:
                        f.write(user)

            # Reload Dovecot
            subprocess.run(['systemctl', 'reload', 'dovecot'], check=True)

        except Exception as e:
            raise Exception(f'Failed to update account quota: {str(e)}') 
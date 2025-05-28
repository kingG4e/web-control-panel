import os
import subprocess
import crypt
from datetime import datetime

class EmailService:
    def __init__(self):
        self.virtual_mailbox_base = '/var/mail/vhosts'
        self.postfix_config_dir = '/etc/postfix'
        self.dovecot_config_dir = '/etc/dovecot'

    def create_domain(self, domain):
        """Create a new email domain"""
        try:
            # Create domain directory
            domain_dir = os.path.join(self.virtual_mailbox_base, domain)
            os.makedirs(domain_dir, exist_ok=True)
            os.chmod(domain_dir, 0o755)

            # Update Postfix virtual domains
            with open(f"{self.postfix_config_dir}/virtual_domains", "a") as f:
                f.write(f"{domain}\n")

            # Reload Postfix
            subprocess.run(['postfix', 'reload'], check=True)

        except subprocess.CalledProcessError as e:
            raise Exception(f'Failed to create email domain: {str(e)}')
        except Exception as e:
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
            subprocess.run(['postfix', 'reload'], check=True)

        except subprocess.CalledProcessError as e:
            raise Exception(f'Failed to delete email domain: {str(e)}')
        except Exception as e:
            raise Exception(f'Failed to delete email domain: {str(e)}')

    def create_account(self, username, domain, password, quota=1024):
        """Create a new email account"""
        try:
            # Create user directory
            user_dir = os.path.join(self.virtual_mailbox_base, domain, username)
            os.makedirs(user_dir, exist_ok=True)
            os.chmod(user_dir, 0o700)

            # Hash password for Dovecot
            hashed_password = crypt.crypt(password)

            # Update Dovecot users
            with open(f"{self.dovecot_config_dir}/users", "a") as f:
                f.write(f"{username}@{domain}:{hashed_password}:{os.getuid()}:{os.getgid()}::{user_dir}::{quota}M\n")

            # Update Postfix virtual mailboxes
            with open(f"{self.postfix_config_dir}/virtual_mailboxes", "a") as f:
                f.write(f"{username}@{domain} {domain}/{username}/\n")

            # Reload services
            subprocess.run(['postfix', 'reload'], check=True)
            subprocess.run(['dovecot', 'reload'], check=True)

        except subprocess.CalledProcessError as e:
            raise Exception(f'Failed to create email account: {str(e)}')
        except Exception as e:
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
            subprocess.run(['postfix', 'reload'], check=True)
            subprocess.run(['dovecot', 'reload'], check=True)

        except subprocess.CalledProcessError as e:
            raise Exception(f'Failed to delete email account: {str(e)}')
        except Exception as e:
            raise Exception(f'Failed to delete email account: {str(e)}')

    def create_forwarder(self, source, destination, domain):
        """Create an email forwarder"""
        try:
            # Update Postfix virtual aliases
            with open(f"{self.postfix_config_dir}/virtual_aliases", "a") as f:
                f.write(f"{source}@{domain} {destination}\n")

            # Reload Postfix
            subprocess.run(['postfix', 'reload'], check=True)

        except subprocess.CalledProcessError as e:
            raise Exception(f'Failed to create email forwarder: {str(e)}')
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
            subprocess.run(['postfix', 'reload'], check=True)

        except subprocess.CalledProcessError as e:
            raise Exception(f'Failed to delete email forwarder: {str(e)}')
        except Exception as e:
            raise Exception(f'Failed to delete email forwarder: {str(e)}')

    def create_alias(self, alias, account_email):
        """Create an email alias"""
        try:
            # Update Postfix virtual aliases
            with open(f"{self.postfix_config_dir}/virtual_aliases", "a") as f:
                f.write(f"{alias} {account_email}\n")

            # Reload Postfix
            subprocess.run(['postfix', 'reload'], check=True)

        except subprocess.CalledProcessError as e:
            raise Exception(f'Failed to create email alias: {str(e)}')
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
            subprocess.run(['postfix', 'reload'], check=True)

        except subprocess.CalledProcessError as e:
            raise Exception(f'Failed to delete email alias: {str(e)}')
        except Exception as e:
            raise Exception(f'Failed to delete email alias: {str(e)}')

    def get_quota_usage(self, username, domain):
        """Get mailbox quota usage in MB"""
        try:
            user_dir = os.path.join(self.virtual_mailbox_base, domain, username)
            if not os.path.exists(user_dir):
                return 0

            # Get directory size
            result = subprocess.run(['du', '-sm', user_dir], capture_output=True, text=True, check=True)
            size = float(result.stdout.split()[0])
            
            return size

        except subprocess.CalledProcessError as e:
            raise Exception(f'Failed to get quota usage: {str(e)}')
        except Exception as e:
            raise Exception(f'Failed to get quota usage: {str(e)}') 
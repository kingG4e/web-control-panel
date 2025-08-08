from models.user import User, Role, Permission, DomainPermission, db
from services.linux_user_service import LinuxUserService
from typing import List, Dict, Optional, Any
from datetime import datetime
import subprocess
import os
import platform
from utils.logger import setup_logger

logger = setup_logger(__name__)

class UserService:
    def __init__(self):
        self.linux_user_service = LinuxUserService()
        self.unix_auth_available = self._check_unix_auth_availability()
    
    def _check_unix_auth_availability(self) -> bool:
        """Check if Unix authentication modules are available."""
        try:
            import pwd
            return True
        except ImportError:
            logger.warning("Unix authentication modules not available (Windows system)")
            return False
    
    def create_user(self, data: Dict) -> User:
        """Create a new user (both database and optionally Linux user)"""
        # Check if username already exists
        existing_user = User.query.filter_by(username=data['username']).first()
        if existing_user:
            raise ValueError(f"Username '{data['username']}' already exists")
        
        # Check if email already exists
        existing_email = User.query.filter_by(email=data['email']).first()
        if existing_email:
            raise ValueError(f"Email '{data['email']}' already exists")
        
        try:
            # Create database user
            user = User(
                username=data['username'],
                email=data['email'],
                first_name=data.get('first_name'),
                last_name=data.get('last_name'),
                is_admin=data.get('is_admin', False),
                is_active=data.get('is_active', True),
                role=data.get('role', 'user')
            )
            user.set_password(data['password'])

            # Set role-based admin flag
            if data.get('role') == 'admin':
                user.is_admin = True

            # Add roles if provided
            if 'roles' in data:
                roles = Role.query.filter(Role.id.in_(data['roles'])).all()
                user.roles.extend(roles)

            db.session.add(user)
            db.session.flush()  # Get user ID before committing

            # Optionally create Linux user if requested
            create_linux_user = data.get('create_linux_user', False)
            if create_linux_user and data.get('password'):
                try:
                    success, message, _ = self.linux_user_service.create_user(
                        data['username'], 
                        None,  # No domain for regular users
                        data['password']
                    )
                    if success:
                        user.is_system_user = True
                        print(f"Linux user {data['username']} created successfully")
                    else:
                        print(f"Warning: Failed to create Linux user: {message}")
                except Exception as e:
                    print(f"Warning: Could not create Linux user: {str(e)}")

            db.session.commit()
            return user
            
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Failed to create user: {str(e)}")

    def update_user(self, user_id: int, data: Dict) -> Optional[User]:
        """Update an existing user"""
        user = User.query.get(user_id)
        if not user:
            return None

        try:
            # Check for username conflicts
            if 'username' in data and data['username'] != user.username:
                existing_user = User.query.filter_by(username=data['username']).first()
                if existing_user:
                    raise ValueError(f"Username '{data['username']}' already exists")
                user.username = data['username']
                
            # Check for email conflicts  
            if 'email' in data and data['email'] != user.email:
                existing_email = User.query.filter_by(email=data['email']).first()
                if existing_email:
                    raise ValueError(f"Email '{data['email']}' already exists")
                user.email = data['email']
                
            if 'password' in data and data['password']:
                user.set_password(data['password'])
                
            if 'first_name' in data:
                user.first_name = data['first_name']
                
            if 'last_name' in data:
                user.last_name = data['last_name']
                
            if 'is_active' in data:
                user.is_active = data['is_active']
                
            if 'role' in data:
                user.role = data['role']
                # Set admin flag based on role
                user.is_admin = (data['role'] == 'admin')
                
            if 'is_admin' in data:
                user.is_admin = data['is_admin']
                
            if 'roles' in data:
                roles = Role.query.filter(Role.id.in_(data['roles'])).all()
                user.roles = roles

            user.updated_at = datetime.utcnow()
            db.session.commit()
            return user
            
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Failed to update user: {str(e)}")

    def delete_user(self, user_id: int) -> bool:
        """Delete a user and ALL resources owned by that user (virtual hosts, dns, email, ssl, linux user, home dir)."""
        user = User.query.get(user_id)
        if not user:
            return False

        # Safety: do not allow deleting root account via API
        if user.username == 'root':
            raise Exception("Cannot delete root account")

        try:
            username = user.username
            is_system_user = user.is_system_user

            # 1. Delete Virtual Hosts and their cascade services
            from models.virtual_host import VirtualHost
            from models.dns import DNSZone, DNSRecord
            from models.email import EmailDomain, EmailAccount, EmailForwarder, EmailAlias

            from models.ssl_certificate import SSLCertificate
            from services.nginx_service import NginxService
            from services.linux_user_service import LinuxUserService

            nginx_service = NginxService()
            linux_service = self.linux_user_service

            user_vhosts = VirtualHost.query.filter_by(user_id=user_id).all()

            for vh in user_vhosts:
                domain = vh.domain

                # Remove Nginx configuration & home directory via service
                try:
                    nginx_service.delete_virtual_host(vh)
                except Exception as e:
                    print(f"Warning: failed to delete vhost cfg for {domain}: {e}")

                # Delete DNS zones & records
                zones = DNSZone.query.filter_by(domain_name=domain).all()
                for zone in zones:
                    DNSRecord.query.filter_by(zone_id=zone.id).delete()
                    db.session.delete(zone)

                # Delete Email domains & accounts/aliases/forwarders
                email_domains = EmailDomain.query.filter_by(domain=domain).all()
                for ed in email_domains:
                    EmailAccount.query.filter_by(domain_id=ed.id).delete(synchronize_session=False)
                    EmailForwarder.query.filter_by(domain_id=ed.id).delete(synchronize_session=False)
                    EmailAlias.query.join(EmailAccount).filter(EmailAccount.domain_id == ed.id).delete(synchronize_session=False)
                    db.session.delete(ed)

                # Delete SSL certificates
                SSLCertificate.query.filter_by(domain=domain).delete()



                # Finally delete virtual host record
                db.session.delete(vh)

            # 2. All FTP accounts have been removed from system

            # 3. Delete user roles/permissions associations handled via cascade

            # Delete from database first
            db.session.delete(user)
            db.session.commit()

            # 4. Delete Linux user if they are a system user
            if is_system_user and username != 'root':
                try:
                    linux_service.delete_user(username)
                except Exception as e:
                    print(f"Warning: failed to delete linux user {username}: {e}")

            return True
            
        except Exception as e:
            db.session.rollback()
            print(f"Error during user deletion for user_id {user_id}: {e}")
            return False

    def delete_user_and_all_data(self, user_id: int) -> (bool, str):
        """
        Comprehensive and robustly logged deletion of a user and all their associated data.
        Returns a tuple (success: bool, message: str).
        """
        user = User.query.get(user_id)
        if not user:
            return False, "User not found."

        username = user.username
        log = [f"--- Starting deletion for user: {username} (ID: {user_id}) ---"]

        try:
            # 1. Delete all virtual hosts and their dependencies
            log.append("Step 1: Deleting virtual hosts...")
            try:
                from services.virtual_host_service import VirtualHostService
                vhost_service = VirtualHostService()
                virtual_hosts = vhost_service.get_virtual_hosts_by_user(user_id)
                log.append(f"Found {len(virtual_hosts)} virtual host(s).")
                for vh in virtual_hosts:
                    log.append(f"Deleting virtual host: {vh.domain}")
                    vhost_service.delete_virtual_host(vh.id)
                log.append("Virtual hosts deletion step completed.")
            except Exception as e:
                log.append(f"ERROR during virtual host deletion: {e}")

            # 2. Delete all standalone databases
            log.append("Step 2: Deleting databases...")
            try:
                from services.mysql_service import MySQLService
                mysql_service = MySQLService()
                databases = mysql_service.get_databases_by_user(user_id)
                log.append(f"Found {len(databases)} database(s).")
                for db_obj in databases:
                    log.append(f"Deleting database: {db_obj.name}")
                    mysql_service.delete_database(db_obj.id)
                log.append("Database deletion step completed.")
            except Exception as e:
                log.append(f"ERROR during database deletion: {e}")

            # 3. Delete all SSL certificates
            log.append("Step 3: Deleting SSL certificates...")
            try:
                from services.ssl_service import SSLService
                ssl_service = SSLService()
                ssl_certs = ssl_service.get_certificates_by_user(user_id)
                log.append(f"Found {len(ssl_certs)} SSL certificate(s).")
                for cert in ssl_certs:
                    log.append(f"Deleting SSL certificate: {cert.domain}")
                    if ssl_service.delete_certificate(cert.id):
                        log.append(f"Successfully deleted SSL certificate for {cert.domain}")
                    else:
                        log.append(f"Failed to delete SSL certificate for {cert.domain}")
                log.append("SSL certificate deletion step completed.")
            except Exception as e:
                log.append(f"ERROR during SSL certificate deletion: {e}")

            # 4. Delete the Linux user
            log.append(f"Step 4: Deleting Linux user '{username}'...")
            try:
                if user.is_system_user and username != 'root':
                    self.linux_user_service.delete_user(username)
                    log.append(f"Linux user '{username}' deleted successfully.")
                else:
                    log.append(f"Skipping Linux user deletion (not a system user or is root).")
            except Exception as e:
                log.append(f"ERROR during Linux user deletion: {e}")

            # 5. Finally, delete the user record from the database
            log.append(f"Step 5: Deleting user record for '{username}' from database...")
            try:
                db.session.delete(user)
                db.session.commit()
                log.append("User record deleted successfully.")
            except Exception as e:
                db.session.rollback()
                log.append(f"FATAL ERROR: Could not delete user record from database: {e}")
                print("\n".join(log))  # Log everything we did
                return False, f"A critical error occurred while deleting the user from the database. Details: {e}"

            log.append(f"--- Deletion for user: {username} (ID: {user_id}) completed ---")
            print("\n".join(log))
            return True, f"Account '{username}' and all associated data have been deleted."

        except Exception as e:
            import traceback
            log.append(f"--- UNEXPECTED FATAL ERROR during deletion for user: {username} ---")
            log.append(traceback.format_exc())
            print("\n".join(log))
            return False, "An unexpected error occurred. See server logs for details."
            
    def get_user_by_username(self, username: str) -> Optional[User]:
        """Get a user by their username."""
        return User.query.filter_by(username=username).first()

    def get_user_permissions(self, user_id: int) -> Dict:
        """Get all permissions for a user including role-based and domain-based"""
        user = User.query.get(user_id)
        if not user:
            return {}

        # Get role-based permissions
        role_permissions = set()
        for role in user.roles:
            for permission in role.permissions:
                role_permissions.add((permission.resource_type, permission.action))

        # Get domain-based permissions
        domain_permissions = {
            perm.domain: {
                'vhost': perm.can_manage_vhost,
                'dns': perm.can_manage_dns,
                'ssl': perm.can_manage_ssl,
                'email': perm.can_manage_email,
                'database': perm.can_manage_database,
    
            }
            for perm in user.domain_permissions
        }

        return {
            'role_permissions': list(role_permissions),
            'domain_permissions': domain_permissions
        }

    def set_domain_permissions(self, user_id: int, domain: str, permissions: Dict) -> Optional[DomainPermission]:
        """Set permissions for a user on a specific domain"""
        user = User.query.get(user_id)
        if not user:
            return None

        try:
            # Find existing domain permission or create new one
            domain_perm = DomainPermission.query.filter_by(user_id=user_id, domain=domain).first()
            if not domain_perm:
                domain_perm = DomainPermission(user_id=user_id, domain=domain)

            # Update permissions
            domain_perm.can_manage_vhost = permissions.get('vhost', False)
            domain_perm.can_manage_dns = permissions.get('dns', False)
            domain_perm.can_manage_ssl = permissions.get('ssl', False)
            domain_perm.can_manage_email = permissions.get('email', False)
            domain_perm.can_manage_database = permissions.get('database', False)


            db.session.add(domain_perm)
            db.session.commit()
            return domain_perm
            
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Failed to set domain permissions: {str(e)}")

    def remove_domain_permissions(self, user_id: int, domain: str) -> bool:
        """Remove all permissions for a user on a specific domain"""
        domain_perm = DomainPermission.query.filter_by(user_id=user_id, domain=domain).first()
        if not domain_perm:
            return False

        try:
            db.session.delete(domain_perm)
            db.session.commit()
            return True
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Failed to remove domain permissions: {str(e)}")

    def create_role(self, data: Dict) -> Role:
        """Create a new role"""
        # Check if role name already exists
        existing_role = Role.query.filter_by(name=data['name']).first()
        if existing_role:
            raise ValueError(f"Role '{data['name']}' already exists")
            
        try:
            role = Role(
                name=data['name'],
                description=data.get('description')
            )

            # Add permissions if provided
            if 'permissions' in data:
                permissions = Permission.query.filter(Permission.id.in_(data['permissions'])).all()
                role.permissions.extend(permissions)

            db.session.add(role)
            db.session.commit()
            return role
            
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Failed to create role: {str(e)}")

    def update_role(self, role_id: int, data: Dict) -> Optional[Role]:
        """Update an existing role"""
        role = Role.query.get(role_id)
        if not role:
            return None

        try:
            # Check for name conflicts
            if 'name' in data and data['name'] != role.name:
                existing_role = Role.query.filter_by(name=data['name']).first()
                if existing_role:
                    raise ValueError(f"Role name '{data['name']}' already exists")
                role.name = data['name']
                
            if 'description' in data:
                role.description = data['description']
                
            if 'permissions' in data:
                permissions = Permission.query.filter(Permission.id.in_(data['permissions'])).all()
                role.permissions = permissions

            db.session.commit()
            return role
            
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Failed to update role: {str(e)}")

    def delete_role(self, role_id: int) -> bool:
        """Delete a role"""
        role = Role.query.get(role_id)
        if not role:
            return False

        try:
            db.session.delete(role)
            db.session.commit()
            return True
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Failed to delete role: {str(e)}")

    def create_permission(self, data: Dict) -> Permission:
        """Create a new permission"""
        # Check if permission already exists
        existing_perm = Permission.query.filter_by(
            name=data['name'],
            resource_type=data['resource_type'],
            action=data['action']
        ).first()
        if existing_perm:
            raise ValueError(f"Permission '{data['name']}' already exists")
            
        try:
            permission = Permission(
                name=data['name'],
                description=data.get('description'),
                resource_type=data['resource_type'],
                action=data['action']
            )

            db.session.add(permission)
            db.session.commit()
            return permission
            
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Failed to create permission: {str(e)}")

    def check_permission(self, user_id: int, domain: str, resource_type: str, action: str) -> bool:
        """Check if a user has permission to perform an action on a resource"""
        user = User.query.get(user_id)
        if not user:
            return False

        # Admin users have all permissions
        if user.is_admin or user.role == 'admin' or user.username == 'root':
            return True

        # Check role-based permissions
        for role in getattr(user, 'roles', []):
            for permission in getattr(role, 'permissions', []):
                if permission.resource_type == resource_type and permission.action == action:
                    return True

        # Check domain-specific permissions
        if domain:
            domain_perm = DomainPermission.query.filter_by(user_id=user_id, domain=domain).first()
            if domain_perm:
                resource_map = {
                    'virtual_host': domain_perm.can_manage_vhost,
                    'dns': domain_perm.can_manage_dns,
                    'ssl': domain_perm.can_manage_ssl,
                    'email': domain_perm.can_manage_email,
                    'database': domain_perm.can_manage_database,
                }
                return resource_map.get(resource_type, False)
                

        return False

    def get_user_stats(self) -> Dict:
        """Get user statistics"""
        total_users = User.query.count()
        active_users = User.query.filter_by(is_active=True).count()
        admin_users = User.query.filter(
            (User.is_admin == True) | (User.role == 'admin')
        ).count()
        inactive_users = total_users - active_users
        
        return {
            'total_users': total_users,
            'active_users': active_users,
            'admin_users': admin_users,
            'inactive_users': inactive_users
        }

    def get_system_users(self) -> List[User]:
        """
        Get all system users.
        
        Returns:
            List of system User objects
        """
        if not self.unix_auth_available:
            # Return default users for development
            return self._get_default_system_users()
        
        return self._get_actual_system_users()
    
    def _get_default_system_users(self) -> List[User]:
        """Get default system users for development."""
        users = []
        
        # Try to get actual system users first
        try:
            import pwd
            for user_info in pwd.getpwall():
                # Include regular users (UID >= 1000) and root; skip service accounts
                if (user_info.pw_uid >= 1000 or user_info.pw_name == 'root') and \
                   user_info.pw_shell not in ('/usr/sbin/nologin', '/bin/false', '/sbin/nologin'):
                    # Check if user exists in database
                    user = self.get_user_by_username(user_info.pw_name)
                    if not user:
                        # Create user in database
                        user = self._create_system_user_from_info(user_info)
                    users.append(user)
            return users
        except ImportError:
            logger.warning("pwd module not available - creating default admin user only")
        
        # No fallback admin user creation - system users only
        return users
    
    def _get_actual_system_users(self) -> List[User]:
        """Get actual system users from Unix system."""
        try:
            import pwd
            users = []
            
            for user_info in pwd.getpwall():
                if user_info.pw_uid >= 1000 and user_info.pw_shell != '/usr/sbin/nologin':
                    # Check if user exists in database
                    user = self.get_user_by_username(user_info.pw_name)
                    if not user:
                        # Create user in database
                        user = self._create_system_user_from_info(user_info)
                    
                    users.append(user)
            
            return users
            
        except Exception as e:
            logger.error(f"Failed to get system users: {e}")
            return []
    
    def _create_system_user_from_info(self, user_info: Any) -> User:
        """Create a system user from Unix user info."""
        user = User(
            username=user_info.pw_name,
            email=f"{user_info.pw_name}@localhost",
            role='admin' if user_info.pw_uid == 0 else 'user',
            is_system_user=True,
            system_uid=user_info.pw_uid
        )
        
        db.session.add(user)
        db.session.commit()
        return user

    def user_exists(self, username: str) -> bool:
        """
        Check if user exists in database.
        
        Args:
            username: Username to check
            
        Returns:
            True if user exists, False otherwise
        """
        return User.query.filter_by(username=username).first() is not None

    def get_user_by_id(self, user_id: int) -> Optional[User]:
        """
        Get user by ID.
        
        Args:
            user_id: User ID to search for
            
        Returns:
            User object if found, None otherwise
        """
        return User.query.get(user_id)

    def get_all_users(self) -> List[User]:
        """
        Get all users from database.
        
        Returns:
            List of all User objects
        """
        return User.query.all()

    def change_password(self, username: str, current_password: str, new_password: str) -> bool:
        """
        Change user password.
        
        Args:
            username: Username of user
            current_password: Current password
            new_password: New password
            
        Returns:
            True if password change was successful, False otherwise
        """
        try:
            user = self.get_user_by_username(username)
            if not user:
                return False
            
            if not user.verify_password(current_password):
                return False
            
            user.set_password(new_password)
            user.updated_at = datetime.utcnow()
            db.session.commit()
            
            logger.info(f"Password changed successfully for user {username}")
            return True
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Failed to change password for user {username}: {e}")
            return False

    def search_users(self, query: str) -> List[User]:
        """
        Search users by username or email.
        
        Args:
            query: Search query
            
        Returns:
            List of matching User objects
        """
        try:
            return User.query.filter(
                (User.username.ilike(f'%{query}%')) |
                (User.email.ilike(f'%{query}%'))
            ).all()
            
        except Exception as e:
            logger.error(f"Failed to search users: {e}")
            return [] 
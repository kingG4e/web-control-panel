from models.user import User, Role, Permission, DomainPermission, db
from typing import List, Dict, Optional
from datetime import datetime

class UserService:
    def create_user(self, data: Dict) -> User:
        """Create a new user"""
        user = User(
            username=data['username'],
            email=data['email'],
            first_name=data.get('first_name'),
            last_name=data.get('last_name'),
            is_admin=data.get('is_admin', False)
        )
        user.set_password(data['password'])

        # Add roles if provided
        if 'roles' in data:
            roles = Role.query.filter(Role.id.in_(data['roles'])).all()
            user.roles.extend(roles)

        db.session.add(user)
        db.session.commit()
        return user

    def update_user(self, user_id: int, data: Dict) -> Optional[User]:
        """Update an existing user"""
        user = User.query.get(user_id)
        if not user:
            return None

        if 'username' in data:
            user.username = data['username']
        if 'email' in data:
            user.email = data['email']
        if 'password' in data:
            user.set_password(data['password'])
        if 'first_name' in data:
            user.first_name = data['first_name']
        if 'last_name' in data:
            user.last_name = data['last_name']
        if 'is_active' in data:
            user.is_active = data['is_active']
        if 'is_admin' in data:
            user.is_admin = data['is_admin']
        if 'roles' in data:
            roles = Role.query.filter(Role.id.in_(data['roles'])).all()
            user.roles = roles

        db.session.commit()
        return user

    def delete_user(self, user_id: int) -> bool:
        """Delete a user"""
        user = User.query.get(user_id)
        if not user:
            return False

        db.session.delete(user)
        db.session.commit()
        return True

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
                'ftp': perm.can_manage_ftp
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
        domain_perm.can_manage_ftp = permissions.get('ftp', False)

        db.session.add(domain_perm)
        db.session.commit()
        return domain_perm

    def remove_domain_permissions(self, user_id: int, domain: str) -> bool:
        """Remove all permissions for a user on a specific domain"""
        domain_perm = DomainPermission.query.filter_by(user_id=user_id, domain=domain).first()
        if not domain_perm:
            return False

        db.session.delete(domain_perm)
        db.session.commit()
        return True

    def create_role(self, data: Dict) -> Role:
        """Create a new role"""
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

    def update_role(self, role_id: int, data: Dict) -> Optional[Role]:
        """Update an existing role"""
        role = Role.query.get(role_id)
        if not role:
            return None

        if 'name' in data:
            role.name = data['name']
        if 'description' in data:
            role.description = data['description']
        if 'permissions' in data:
            permissions = Permission.query.filter(Permission.id.in_(data['permissions'])).all()
            role.permissions = permissions

        db.session.commit()
        return role

    def delete_role(self, role_id: int) -> bool:
        """Delete a role"""
        role = Role.query.get(role_id)
        if not role:
            return False

        db.session.delete(role)
        db.session.commit()
        return True

    def create_permission(self, data: Dict) -> Permission:
        """Create a new permission"""
        permission = Permission(
            name=data['name'],
            description=data.get('description'),
            resource_type=data['resource_type'],
            action=data['action']
        )

        db.session.add(permission)
        db.session.commit()
        return permission

    def check_permission(self, user_id: int, domain: str, resource_type: str, action: str) -> bool:
        """Check if a user has permission to perform an action on a resource"""
        user = User.query.get(user_id)
        if not user:
            return False

        # Admin users have all permissions
        if user.is_admin:
            return True

        # Check role-based permissions
        for role in user.roles:
            for permission in role.permissions:
                if permission.resource_type == resource_type and permission.action == action:
                    return True

        # Check domain-specific permissions
        domain_perm = DomainPermission.query.filter_by(user_id=user_id, domain=domain).first()
        if not domain_perm:
            return False

        # Check specific permission based on resource type
        if resource_type == 'virtual_host':
            return domain_perm.can_manage_vhost
        elif resource_type == 'dns':
            return domain_perm.can_manage_dns
        elif resource_type == 'ssl':
            return domain_perm.can_manage_ssl
        elif resource_type == 'email':
            return domain_perm.can_manage_email
        elif resource_type == 'database':
            return domain_perm.can_manage_database
        elif resource_type == 'ftp':
            return domain_perm.can_manage_ftp

        return False 
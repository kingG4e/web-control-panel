from functools import lru_cache
from typing import Optional, Tuple
from models.virtual_host import VirtualHost
from models.user import User


class VirtualHostPermissionService:
    """Centralized service for virtual host permission checking with caching"""
    
    @staticmethod
    @lru_cache(maxsize=256)
    def get_virtual_host_for_user(domain: str, user_id: int, username: str, is_admin: bool) -> Optional[VirtualHost]:
        """
        Get virtual host for user with permission checking and caching
        
        Args:
            domain: Domain name to lookup
            user_id: User ID requesting access
            username: Username requesting access  
            is_admin: Whether user has admin privileges
            
        Returns:
            VirtualHost object if found and accessible, None otherwise
        """
        # Admin/root users can access any domain
        if is_admin:
            return VirtualHost.query.filter_by(domain=domain).first()
        
        # First try to find virtual host owned by user
        virtual_host = VirtualHost.query.filter_by(domain=domain, user_id=user_id).first()
        
        # If not found, try to find virtual host with matching linux_username
        if not virtual_host:
            virtual_host = VirtualHost.query.filter_by(domain=domain, linux_username=username).first()
            
            # Additional permission check could be added here if needed
            if virtual_host:
                # Check if user can access this virtual host
                from utils.permissions import can_access_virtual_host
                current_user = User.query.get(user_id)
                if current_user and not can_access_virtual_host(current_user, virtual_host):
                    return None
        
        return virtual_host
    
    @staticmethod
    @lru_cache(maxsize=128)
    def get_user_virtual_hosts(user_id: int, username: str, is_admin: bool) -> list:
        """
        Get all virtual hosts accessible by user with caching
        
        Args:
            user_id: User ID
            username: Username
            is_admin: Whether user has admin privileges
            
        Returns:
            List of VirtualHost objects accessible by user
        """
        if is_admin:
            return VirtualHost.query.all()
        
        # Regular users see virtual hosts where linux_username matches their username
        # OR where they are the creator (user_id matches)
        return VirtualHost.query.filter(
            (VirtualHost.linux_username == username) | 
            (VirtualHost.user_id == user_id)
        ).all()
    
    @staticmethod
    def clear_cache():
        """Clear the permission cache - call when virtual hosts are modified"""
        VirtualHostPermissionService.get_virtual_host_for_user.cache_clear()
        VirtualHostPermissionService.get_user_virtual_hosts.cache_clear()
    
    @staticmethod
    def check_user_permissions(user: User) -> Tuple[bool, str]:
        """
        Check if user has required permissions and return admin status
        
        Args:
            user: User object to check
            
        Returns:
            Tuple of (is_admin, username)
        """
        if not user:
            raise ValueError("User not found")
        
        is_admin = user.is_admin or user.role == 'admin' or user.username == 'root'
        return is_admin, user.username
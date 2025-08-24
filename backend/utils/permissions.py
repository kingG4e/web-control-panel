"""
Permission utilities for virtual host management
"""

from functools import wraps
from flask import jsonify
from models.virtual_host import VirtualHost

def check_virtual_host_permission(action='read'):
    """
    Decorator to check if user has permission to perform action on virtual host
    
    Args:
        action: 'read', 'create', 'update', 'delete'
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(current_user, *args, **kwargs):
            # Admin/root users can access everything
            if current_user.is_admin or current_user.role == 'admin' or current_user.username == 'root':
                return f(current_user, *args, **kwargs)
            
            # Restrict creation to admins/root only
            if action == 'create':
                return jsonify({
                    'success': False,
                    'error': 'Access denied. Only administrators can create virtual hosts.'
                }), 403

            # For specific virtual host operations (update, delete, read by ID)
            if 'id' in kwargs:
                virtual_host_id = kwargs['id']
                virtual_host = VirtualHost.query.get(virtual_host_id)
                
                if not virtual_host:
                    return jsonify({
                        'success': False,
                        'error': 'Virtual host not found'
                    }), 404
                
                # Check if user can access this virtual host
                if not can_access_virtual_host(current_user, virtual_host):
                    return jsonify({
                        'success': False,
                        'error': 'Access denied. You can only manage your own virtual hosts.'
                    }), 403
            
            # For list operations, regular users can proceed
            return f(current_user, *args, **kwargs)
        
        return decorated_function
    return decorator

def can_access_virtual_host(current_user, virtual_host):
    """
    Check if user can access a specific virtual host
    
    Args:
        current_user: User object
        virtual_host: VirtualHost object
        
    Returns:
        bool: True if user can access, False otherwise
    """
    # Admin/root users can access everything
    if current_user.is_admin or current_user.role == 'admin' or current_user.username == 'root':
        return True
    
    # Regular users can access virtual hosts where:
    # 1. They are the creator (user_id matches), OR
    # 2. The linux_username matches their username (they own the Linux user)
    return (virtual_host.user_id == current_user.id or 
            virtual_host.linux_username == current_user.username)

def filter_virtual_hosts_by_permission(current_user, virtual_hosts):
    """
    Filter virtual hosts list based on user permissions
    
    Args:
        current_user: User object
        virtual_hosts: List of VirtualHost objects
        
    Returns:
        List of VirtualHost objects user can access
    """
    # Admin/root users can see everything
    if current_user.is_admin or current_user.role == 'admin' or current_user.username == 'root':
        return virtual_hosts
    
    # Regular users can see virtual hosts where they are creator OR linux_username matches
    return [vh for vh in virtual_hosts if (vh.user_id == current_user.id or 
                                          vh.linux_username == current_user.username)]

def check_document_root_permission(current_user, document_root, virtual_host=None):
    """
    Check if user can modify document root
    
    Args:
        current_user: User object
        document_root: Proposed document root path
        virtual_host: VirtualHost object (for updates)
        
    Returns:
        tuple: (bool, str) - (is_allowed, error_message)
    """
    # Admin/root users can set any document root
    if current_user.is_admin or current_user.role == 'admin' or current_user.username == 'root':
        return True, None
    
    # For regular users, restrict document root to their own directories
    if virtual_host:
        # For updates, check if they can access the virtual host
        if not can_access_virtual_host(current_user, virtual_host):
            return False, "Access denied. You can only modify your own virtual hosts."
        
        # Allow document root changes within their Linux user directory
        # Use the current user's username or the virtual host's linux_username
        linux_user = virtual_host.linux_username if virtual_host.linux_username == current_user.username else current_user.username
        expected_prefix = f"/home/{linux_user}/"
        if not document_root.startswith(expected_prefix):
            return False, f"Document root must be within {expected_prefix} directory."
    
    return True, None 
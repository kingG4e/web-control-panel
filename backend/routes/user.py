from flask import Blueprint, request, jsonify
from services.user_service import UserService
from services.virtual_host_service import VirtualHostService
from services.mysql_service import MySQLService
from services.ftp_service import FTPService
from services.ssl_service import SSLService
from services.email_service import EmailService
from services.bind_service import BindService
from services.linux_user_service import LinuxUserService, UNIX_MODULES_AVAILABLE
from models.user import User, Role, Permission
from utils.auth import token_required
from functools import wraps
import os
import shutil
from models.virtual_host import VirtualHost
from models.dns import DNSZone, DNSRecord
from models.email import EmailDomain, EmailAccount, EmailForwarder, EmailAlias
from models.ftp import FTPAccount
from models.ssl_certificate import SSLCertificate
from services.apache_service import ApacheService
from services.mysql_service import MySQLService
from services.ssl_service import SSLService
from services.ftp_service import FTPService
from models.database import db

user_bp = Blueprint('user', __name__)
user_service = UserService()
vhost_service = VirtualHostService()
mysql_service = MySQLService()
ftp_service = FTPService()
ssl_service = SSLService()
email_service = EmailService()
bind_service = BindService()
linux_service = LinuxUserService()

def admin_required(f):
    @wraps(f)
    @token_required
    def decorated_function(current_user, *args, **kwargs):
        if not current_user or not (current_user.is_admin or current_user.role == 'admin' or current_user.username == 'root'):
            return jsonify({'error': 'Admin privileges required'}), 403
        return f(current_user, *args, **kwargs)
    return decorated_function

def permission_required(resource_type, action):
    def decorator(f):
        @wraps(f)
        @token_required
        def decorated_function(current_user, *args, **kwargs):
            domain = request.args.get('domain')
            
            if not user_service.check_permission(current_user.id, domain, resource_type, action):
                return jsonify({'error': 'Permission denied'}), 403
                
            return f(current_user, *args, **kwargs)
        return decorated_function
    return decorator

def user_or_admin_required(f):
    @wraps(f)
    @token_required
    def decorated_function(current_user, *args, **kwargs):
        user_id = kwargs.get('id')
        if not current_user:
            return jsonify({'error': 'Authentication required'}), 401
        
        # Allow if admin or if user is accessing their own account
        if (current_user.is_admin or current_user.role == 'admin' or 
            current_user.username == 'root' or str(current_user.id) == str(user_id)):
            return f(current_user, *args, **kwargs)
        
        return jsonify({'error': 'Permission denied'}), 403
    return decorated_function

# User Management Routes
@user_bp.route('/api/users', methods=['GET'])
@admin_required
def get_users(current_user):
    """Return only Linux system users (no database users)."""
    # Collect system users (Linux) only
    if UNIX_MODULES_AVAILABLE:
        try:
            import pwd
            system_users = []
            for p in pwd.getpwall():
                # Include regular users (UID >= 1000) and root; skip non-login shells
                if (p.pw_uid >= 1000 or p.pw_name == 'root') and p.pw_shell not in ('/usr/sbin/nologin', '/bin/false'):
                    system_users.append({
                        'username': p.pw_name,
                        'system_uid': p.pw_uid,
                        'is_system_user': True,
                        'role': 'admin' if p.pw_name == 'root' else 'system_user',
                        'email': f"{p.pw_name}@localhost",
                        'status': 'active',
                        'created_at': None,
                        'last_login': None,
                        'updated_at': None
                    })
            return jsonify(system_users)
        except ImportError:
            # Should not happen when UNIX_MODULES_AVAILABLE is True, but handle gracefully
            return jsonify([])
    else:
        # Non-Unix environment – no system users available
        return jsonify([])

@user_bp.route('/api/users/<int:id>', methods=['GET'])
@admin_required
def get_user(current_user, id):
    user = User.query.get_or_404(id)
    return jsonify(user.to_dict())

@user_bp.route('/api/users', methods=['POST'])
@admin_required
def create_user(current_user):
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['username', 'password']
    for field in required_fields:
        if field not in data or not data[field]:
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    # Optional domain for comment; default to username
    domain_for_comment = data.get('domain', data['username'])

    try:
        # Create Linux user directly
        success, message, _ = linux_service.create_user(data['username'], domain_for_comment, data['password'])
        if success:
            return jsonify({'message': message}), 201
        else:
            return jsonify({'error': message}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@user_bp.route('/api/users/<int:id>', methods=['PUT'])
@admin_required
def update_user(current_user, id):
    data = request.get_json()
    
    try:
        user = user_service.update_user(id, data)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        return jsonify(user.to_dict())
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@user_bp.route('/api/users/<int:id>', methods=['DELETE'])
@admin_required
def delete_user(current_user, id):
    if user_service.delete_user(id):
        return '', 204
    return jsonify({'error': 'User not found'}), 404

# Account Self-Deletion Route (for regular users)
@user_bp.route('/api/users/<int:id>/delete-account', methods=['DELETE'])
@user_or_admin_required
def delete_account(current_user, id):
    """Allow users to delete their own account and all associated data"""
    try:
        target_user = User.query.get(id)
        if not target_user:
            return jsonify({'error': 'User not found'}), 404
        
        # Prevent admin users from deleting their accounts via this endpoint
        if target_user.is_admin or target_user.role == 'admin':
            return jsonify({'error': 'Admin accounts cannot be deleted via this endpoint'}), 403
        
        # Only allow users to delete their own account (unless admin)
        if (str(current_user.id) != str(id) and 
            not (current_user.is_admin or current_user.role == 'admin')):
            return jsonify({'error': 'You can only delete your own account'}), 403
        
        deletion_log = []
        errors = []
        
        # Step 1: Get all virtual hosts owned by user
        try:
            virtual_hosts = vhost_service.get_virtual_hosts_by_user(id)
            deletion_log.append(f"Found {len(virtual_hosts)} virtual hosts to delete")
            
            for vhost in virtual_hosts:
                try:
                    # Delete Apache virtual host configuration
                    vhost_service.remove_apache_config(vhost['domain'])
                    deletion_log.append(f"Deleted Apache config for {vhost['domain']}")
                    
                    # Delete DNS zone
                    bind_service.delete_zone(vhost['domain'])
                    deletion_log.append(f"Deleted DNS zone for {vhost['domain']}")
                    
                    # Delete website files
                    if vhost.get('document_root') and os.path.exists(vhost['document_root']):
                        shutil.rmtree(vhost['document_root'])
                        deletion_log.append(f"Deleted files for {vhost['domain']}")
                    
                except Exception as e:
                    error_msg = f"Error deleting virtual host {vhost['domain']}: {str(e)}"
                    errors.append(error_msg)
                    deletion_log.append(error_msg)
                    
        except Exception as e:
            error_msg = f"Error fetching virtual hosts: {str(e)}"
            errors.append(error_msg)
            deletion_log.append(error_msg)
        
        # Step 2: Delete all databases owned by user
        try:
            databases = mysql_service.get_databases_by_user(id)
            deletion_log.append(f"Found {len(databases)} databases to delete")
            
            for db in databases:
                try:
                    mysql_service.delete_database(db['name'])
                    deletion_log.append(f"Deleted database {db['name']}")
                except Exception as e:
                    error_msg = f"Error deleting database {db['name']}: {str(e)}"
                    errors.append(error_msg)
                    deletion_log.append(error_msg)
                    
        except Exception as e:
            error_msg = f"Error fetching databases: {str(e)}"
            errors.append(error_msg)
            deletion_log.append(error_msg)
        
        # Step 3: Delete all FTP accounts
        try:
            ftp_accounts = ftp_service.get_accounts_by_user(id)
            deletion_log.append(f"Found {len(ftp_accounts)} FTP accounts to delete")
            
            for ftp_account in ftp_accounts:
                try:
                    ftp_service.delete_account(ftp_account['username'])
                    deletion_log.append(f"Deleted FTP account {ftp_account['username']}")
                except Exception as e:
                    error_msg = f"Error deleting FTP account {ftp_account['username']}: {str(e)}"
                    errors.append(error_msg)
                    deletion_log.append(error_msg)
                    
        except Exception as e:
            error_msg = f"Error fetching FTP accounts: {str(e)}"
            errors.append(error_msg)
            deletion_log.append(error_msg)
        
        # Step 4: Delete all SSL certificates
        try:
            ssl_certs = ssl_service.get_certificates_by_user(id)
            deletion_log.append(f"Found {len(ssl_certs)} SSL certificates to delete")
            
            for cert in ssl_certs:
                try:
                    ssl_service.delete_certificate(cert['domain'])
                    deletion_log.append(f"Deleted SSL certificate for {cert['domain']}")
                except Exception as e:
                    error_msg = f"Error deleting SSL certificate {cert['domain']}: {str(e)}"
                    errors.append(error_msg)
                    deletion_log.append(error_msg)
                    
        except Exception as e:
            error_msg = f"Error fetching SSL certificates: {str(e)}"
            errors.append(error_msg)
            deletion_log.append(error_msg)
        
        # Step 5: Delete all email domains and accounts
        try:
            email_domains = email_service.get_domains_by_user(id)
            deletion_log.append(f"Found {len(email_domains)} email domains to delete")
            
            for domain in email_domains:
                try:
                    email_service.delete_domain(domain['domain'])
                    deletion_log.append(f"Deleted email domain {domain['domain']}")
                except Exception as e:
                    error_msg = f"Error deleting email domain {domain['domain']}: {str(e)}"
                    errors.append(error_msg)
                    deletion_log.append(error_msg)
                    
        except Exception as e:
            error_msg = f"Error fetching email domains: {str(e)}"
            errors.append(error_msg)
            deletion_log.append(error_msg)
        
        # Step 6: Delete Linux user account
        try:
            linux_service.delete_user(target_user.username)
            deletion_log.append(f"Deleted Linux user {target_user.username}")
        except Exception as e:
            error_msg = f"Error deleting Linux user {target_user.username}: {str(e)}"
            errors.append(error_msg)
            deletion_log.append(error_msg)
        
        # Step 7: Delete user home directory
        try:
            home_dir = f"/home/{target_user.username}"
            if os.path.exists(home_dir):
                shutil.rmtree(home_dir)
                deletion_log.append(f"Deleted home directory {home_dir}")
        except Exception as e:
            error_msg = f"Error deleting home directory: {str(e)}"
            errors.append(error_msg)
            deletion_log.append(error_msg)
        
        # Step 8: Remove user from database records
        try:
            # Remove virtual host records
            vhost_service.delete_all_by_user(id)
            deletion_log.append("Deleted virtual host database records")
            
            # Remove database records
            mysql_service.delete_all_records_by_user(id)
            deletion_log.append("Deleted database records")
            
            # Remove FTP records
            ftp_service.delete_all_records_by_user(id)
            deletion_log.append("Deleted FTP records")
            
            # Remove SSL certificate records
            ssl_service.delete_all_records_by_user(id)
            deletion_log.append("Deleted SSL certificate records")
            
            # Remove email records
            email_service.delete_all_records_by_user(id)
            deletion_log.append("Deleted email records")
            
        except Exception as e:
            error_msg = f"Error deleting database records: {str(e)}"
            errors.append(error_msg)
            deletion_log.append(error_msg)
        
        # Step 9: Finally delete the user account
        try:
            user_service.delete_user(id)
            deletion_log.append(f"Deleted user account {target_user.username}")
        except Exception as e:
            error_msg = f"Error deleting user account: {str(e)}"
            errors.append(error_msg)
            deletion_log.append(error_msg)
            return jsonify({
                'error': 'Failed to delete user account',
                'details': error_msg,
                'deletion_log': deletion_log
            }), 500
        
        # Step 10: Reload services
        try:
            # Reload Apache
            os.system('systemctl reload apache2')
            deletion_log.append("Reloaded Apache")
            
            # Reload Bind9
            bind_service.reload_bind()
            deletion_log.append("Reloaded Bind9")
            
        except Exception as e:
            error_msg = f"Error reloading services: {str(e)}"
            errors.append(error_msg)
            deletion_log.append(error_msg)
        
        response_data = {
            'message': f'Account {target_user.username} and all associated data deleted successfully',
            'deletion_log': deletion_log,
            'total_operations': len(deletion_log),
            'errors': errors,
            'error_count': len(errors)
        }
        
        if errors:
            response_data['warning'] = 'Account deleted but some operations failed'
            return jsonify(response_data), 207  # Multi-status
        
        return jsonify(response_data), 200
        
    except Exception as e:
        return jsonify({
            'error': f'Failed to delete account: {str(e)}',
            'deletion_log': deletion_log if 'deletion_log' in locals() else []
        }), 500

# Role Management Routes
@user_bp.route('/api/roles', methods=['GET'])
@admin_required
def get_roles(current_user):
    roles = Role.query.all()
    return jsonify([role.to_dict() for role in roles])

@user_bp.route('/api/roles', methods=['POST'])
@admin_required
def create_role(current_user):
    data = request.get_json()
    
    if 'name' not in data:
        return jsonify({'error': 'Missing required field: name'}), 400
    
    try:
        role = user_service.create_role(data)
        return jsonify(role.to_dict()), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@user_bp.route('/api/roles/<int:id>', methods=['PUT'])
@admin_required
def update_role(current_user, id):
    data = request.get_json()
    
    try:
        role = user_service.update_role(id, data)
        if not role:
            return jsonify({'error': 'Role not found'}), 404
        return jsonify(role.to_dict())
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@user_bp.route('/api/roles/<int:id>', methods=['DELETE'])
@admin_required
def delete_role(current_user, id):
    if user_service.delete_role(id):
        return '', 204
    return jsonify({'error': 'Role not found'}), 404

# Permission Management Routes
@user_bp.route('/api/permissions', methods=['GET'])
@admin_required
def get_permissions(current_user):
    permissions = Permission.query.all()
    return jsonify([perm.to_dict() for perm in permissions])

@user_bp.route('/api/permissions', methods=['POST'])
@admin_required
def create_permission(current_user):
    data = request.get_json()
    
    required_fields = ['name', 'resource_type', 'action']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    try:
        permission = user_service.create_permission(data)
        return jsonify(permission.to_dict()), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Domain Permission Routes
@user_bp.route('/api/users/<int:id>/permissions', methods=['GET'])
@admin_required
def get_user_permissions(current_user, id):
    permissions = user_service.get_user_permissions(id)
    return jsonify(permissions)

@user_bp.route('/api/users/<int:id>/domain-permissions', methods=['POST'])
@admin_required
def set_domain_permissions(current_user, id):
    data = request.get_json()
    
    if 'domain' not in data or 'permissions' not in data:
        return jsonify({'error': 'Missing required fields: domain and permissions'}), 400
    
    try:
        domain_perm = user_service.set_domain_permissions(id, data['domain'], data['permissions'])
        if not domain_perm:
            return jsonify({'error': 'User not found'}), 404
        return jsonify(domain_perm.to_dict()), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@user_bp.route('/api/users/<int:id>/domain-permissions/<domain>', methods=['DELETE'])
@admin_required
def remove_domain_permissions(current_user, id, domain):
    if user_service.remove_domain_permissions(id, domain):
        return '', 204
    return jsonify({'error': 'Domain permission not found'}), 404 

# User Statistics Route
@user_bp.route('/api/users/stats', methods=['GET'])
@admin_required
def get_user_stats(current_user):
    try:
        stats = user_service.get_user_stats()
        return jsonify(stats)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@user_bp.route('/api/users/account-stats', methods=['GET'])
@token_required
def get_account_stats(current_user):
    """Get statistics for the current user's account"""
    try:
        stats = {
            'virtualHosts': 0,
            'databases': 0,
            'ftpAccounts': 0,
            'sslCertificates': 0
        }

        # Get virtual hosts count
        try:
            virtual_hosts = vhost_service.get_virtual_hosts_by_user(current_user.id)
            stats['virtualHosts'] = len(virtual_hosts) if virtual_hosts else 0
        except Exception as e:
            print(f"Error getting virtual hosts count: {str(e)}")

        # Get databases count
        try:
            databases = mysql_service.get_databases_by_user(current_user.id)
            stats['databases'] = len(databases) if databases else 0
        except Exception as e:
            print(f"Error getting databases count: {str(e)}")

        # Get FTP accounts count
        try:
            ftp_accounts = ftp_service.get_accounts_by_user(current_user.id)
            stats['ftpAccounts'] = len(ftp_accounts) if ftp_accounts else 0
        except Exception as e:
            print(f"Error getting FTP accounts count: {str(e)}")

        # Get SSL certificates count
        try:
            ssl_certs = ssl_service.get_certificates_by_user(current_user.id)
            stats['sslCertificates'] = len(ssl_certs) if ssl_certs else 0
        except Exception as e:
            print(f"Error getting SSL certificates count: {str(e)}")

        return jsonify(stats), 200
    except Exception as e:
        print(f"Error in get_account_stats: {str(e)}")
        return jsonify({
            'error': 'Failed to fetch account statistics',
            'details': str(e)
        }), 500

@user_bp.route('/api/users/export-data', methods=['GET'])
@token_required
def export_user_data(current_user):
    """Export all user data as JSON"""
    try:
        from datetime import datetime
        
        # Collect all user data
        export_data = {
            'user': {
                'id': current_user.id,
                'username': current_user.username,
                'email': getattr(current_user, 'email', None),
                'role': current_user.role,
                'created_at': current_user.created_at.isoformat() if hasattr(current_user, 'created_at') else None,
                'last_login': current_user.last_login.isoformat() if hasattr(current_user, 'last_login') else None
            },
            'statistics': {},
            'export_date': datetime.utcnow().isoformat()
        }
        
        # Get virtual hosts
        try:
            virtual_hosts = vhost_service.get_virtual_hosts_by_user(current_user.id)
            export_data['virtual_hosts'] = [vh.to_dict() for vh in virtual_hosts] if virtual_hosts else []
            export_data['statistics']['virtual_hosts_count'] = len(virtual_hosts) if virtual_hosts else 0
        except Exception as e:
            export_data['virtual_hosts'] = []
            export_data['statistics']['virtual_hosts_count'] = 0
            
        # Get databases
        try:
            databases = mysql_service.get_databases_by_user(current_user.id)
            export_data['databases'] = [db.to_dict() for db in databases] if databases else []
            export_data['statistics']['databases_count'] = len(databases) if databases else 0
        except Exception as e:
            export_data['databases'] = []
            export_data['statistics']['databases_count'] = 0
            
        # Get FTP accounts
        try:
            ftp_accounts = ftp_service.get_accounts_by_user(current_user.id)
            export_data['ftp_accounts'] = [ftp.to_dict() for ftp in ftp_accounts] if ftp_accounts else []
            export_data['statistics']['ftp_accounts_count'] = len(ftp_accounts) if ftp_accounts else 0
        except Exception as e:
            export_data['ftp_accounts'] = []
            export_data['statistics']['ftp_accounts_count'] = 0
            
        # Get SSL certificates
        try:
            ssl_certs = ssl_service.get_certificates_by_user(current_user.id)
            export_data['ssl_certificates'] = [cert.to_dict() for cert in ssl_certs] if ssl_certs else []
            export_data['statistics']['ssl_certificates_count'] = len(ssl_certs) if ssl_certs else 0
        except Exception as e:
            export_data['ssl_certificates'] = []
            export_data['statistics']['ssl_certificates_count'] = 0
        
        # Return as downloadable JSON file
        response = jsonify(export_data)
        response.headers['Content-Disposition'] = f'attachment; filename=account-data-{current_user.username}-{datetime.utcnow().strftime("%Y%m%d-%H%M%S")}.json'
        response.headers['Content-Type'] = 'application/json'
        return response, 200
        
    except Exception as e:
        print(f"Error in export_user_data: {str(e)}")
        return jsonify({
            'error': 'Failed to export account data',
            'details': str(e)
        }), 500

@user_bp.route('/api/users/delete-account', methods=['DELETE'])
@token_required
def delete_user_account(current_user):
    """Delete the current user's account and all associated data"""
    try:
        user_id = current_user.id
        username = current_user.username
        
        # Safety check: prevent admin deletion
        if current_user.is_admin or current_user.role == 'admin':
            return jsonify({'error': 'Admin accounts cannot be deleted this way'}), 403

        # Use the comprehensive user deletion service
        from services.user_service import UserService
        user_service = UserService()
        
        # This service method should handle the entire deletion cascade
        success, message = user_service.delete_user_and_all_data(user_id)
        
        if success:
            return jsonify({'success': True, 'message': message}), 200
        else:
            # The service should provide a detailed error message
            return jsonify({'error': message}), 500

    except Exception as e:
        # Log the exception for debugging
        import traceback
        traceback.print_exc()
        
        return jsonify({
            'error': 'An unexpected error occurred during account deletion.',
            'details': str(e)
        }), 500

@user_bp.route('/api/users/account-details', methods=['GET'])
@token_required
def get_account_details(current_user):
    """Get detailed account information including limits and usage"""
    try:
        # Get basic stats
        stats = {
            'virtualHosts': 0,
            'databases': 0,
            'ftpAccounts': 0,
            'sslCertificates': 0
        }
        
        # Get counts with error handling
        try:
            virtual_hosts = vhost_service.get_virtual_hosts_by_user(current_user.id)
            stats['virtualHosts'] = len(virtual_hosts) if virtual_hosts else 0
        except:
            pass
            
        try:
            databases = mysql_service.get_databases_by_user(current_user.id)
            stats['databases'] = len(databases) if databases else 0
        except:
            pass
            
        try:
            ftp_accounts = ftp_service.get_accounts_by_user(current_user.id)
            stats['ftpAccounts'] = len(ftp_accounts) if ftp_accounts else 0
        except:
            pass
            
        try:
            ssl_certs = ssl_service.get_certificates_by_user(current_user.id)
            stats['sslCertificates'] = len(ssl_certs) if ssl_certs else 0
        except:
            pass
        
        # Account details
        details = {
            'username': current_user.username,
            'email': getattr(current_user, 'email', None),
            'role': current_user.role,
            'created_at': current_user.created_at.isoformat() if hasattr(current_user, 'created_at') else None,
            'last_login': current_user.last_login.isoformat() if hasattr(current_user, 'last_login') else None,
            'stats': stats,
            'usage': {
                'diskUsageMB': 0,  # Would need to calculate actual disk usage
                'bandwidthUsageMB': 0  # Would need to calculate actual bandwidth usage
            }
        }
        
        return jsonify(details), 200
        
    except Exception as e:
        print(f"Error in get_account_details: {str(e)}")
        return jsonify({
            'error': 'Failed to fetch account details',
            'details': str(e)
        }), 500

# New route: Delete Linux system user directly by username (no DB interaction)
@user_bp.route('/api/system-users/<string:username>', methods=['DELETE'])
@admin_required
def delete_system_user(current_user, username):
    """Fully delete a Linux system user **and** all related resources (vhosts, dns, mail, db, ftp, ssl)."""
    try:
        # 1. Gather all virtual hosts owned by this linux_username
        from models.virtual_host import VirtualHost
        from models.dns import DNSZone, DNSRecord
        from models.email import EmailDomain, EmailAccount, EmailForwarder, EmailAlias
        from models.ftp import FTPAccount
        from models.ssl_certificate import SSLCertificate
        from services.apache_service import ApacheService
        from services.bind_service import BindService
        from services.email_service import EmailService
        from services.mysql_service import MySQLService
        from services.ssl_service import SSLService
        from services.ftp_service import FTPService
        
        apache_service = ApacheService()
        bind_service = BindService()
        email_service = EmailService()
        mysql_service = MySQLService()
        ssl_service = SSLService()
        ftp_service = FTPService()

        # --- Virtual Hosts & related domain cleanup ---
        vhosts = VirtualHost.query.filter_by(linux_username=username).all()
        for vh in vhosts:
            domain = vh.domain
            try:
                apache_service.delete_virtual_host(vh)
            except Exception as e:
                print(f"[SystemUserDelete] Apache cleanup failed for {domain}: {e}")

            # DNS
            try:
                bind_service.delete_zone(domain)
            except Exception as e:
                print(f"[SystemUserDelete] DNS cleanup failed for {domain}: {e}")
            DNSRecord.query.filter(DNSRecord.zone.has(domain_name=domain)).delete(synchronize_session=False)
            DNSZone.query.filter_by(domain_name=domain).delete(synchronize_session=False)

            # Email
            email_domains = EmailDomain.query.filter_by(domain=domain).all()
            for ed in email_domains:
                EmailAccount.query.filter_by(domain_id=ed.id).delete(synchronize_session=False)
                EmailForwarder.query.filter_by(domain_id=ed.id).delete(synchronize_session=False)
                # Safe deletion of aliases via sub-select (join delete not allowed)
                account_subq = db.session.query(EmailAccount.id).filter(EmailAccount.domain_id == ed.id).subquery()
                db.session.query(EmailAlias).filter(EmailAlias.account_id.in_(account_subq)).delete(synchronize_session=False)
                db.session.delete(ed)
            try:
                email_service.delete_domain(domain)
            except Exception as e:
                print(f"[SystemUserDelete] Email domain cleanup failed for {domain}: {e}")

            # SSL
            SSLCertificate.query.filter_by(domain=domain).delete(synchronize_session=False)
            try:
                ssl_service.delete_certificate(domain)
            except Exception as e:
                print(f"[SystemUserDelete] SSL cleanup failed for {domain}: {e}")

            # FTP accounts for domain
            FTPAccount.query.filter_by(domain=domain).delete(synchronize_session=False)

            # Database – attempt by derived name
            try:
                derived_db_name = domain.replace('.', '_')[:20]
                mysql_service.delete_database(derived_db_name)
                mysql_service.delete_user(f"{derived_db_name}_user")
            except Exception:
                pass

            # Finally delete VirtualHost row
            db.session.delete(vh)

        # 2. Delete standalone FTP accounts for username
        FTPAccount.query.filter_by(username=username).delete(synchronize_session=False)

        db.session.commit()

        # 3. Delete Linux user account itself (home dir, maildir, etc.)
        success, message = linux_service.delete_user(username)
        if not success:
            return jsonify({'success': False, 'error': message}), 400

        return jsonify({'success': True, 'message': message}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
from flask import Blueprint, request, jsonify
from models.virtual_host import VirtualHost
from models.database import db
from models.user import User
from models.dns import DNSZone, DNSRecord
from models.email import EmailDomain, EmailAccount
from models.ssl_certificate import SSLCertificate
from services.nginx_service import NginxService
from services.linux_user_service import LinuxUserService
from services.bind_service import BindService
from services.email_service import EmailService
from services.mysql_service import MySQLService
from services.ssl_service import SSLService
from services.quota_service import QuotaService
from config import Config
import os
from utils.settings_util import get_dns_default_ip, get_primary_domain
from utils.auth import token_required
from utils.permissions import (
    check_virtual_host_permission, 
    can_access_virtual_host, 
    filter_virtual_hosts_by_permission,
    check_document_root_permission
)
from utils.rate_limiter import rate_limit
import os
import re
import subprocess
import shutil
import secrets
import string
from datetime import datetime, timedelta

virtual_host_bp = Blueprint('virtual_host', __name__)
nginx_service = NginxService()
linux_user_service = LinuxUserService()
bind_service = BindService()
email_service = EmailService()
mysql_service = MySQLService()
ssl_service = SSLService()
quota_service = QuotaService()

def _generate_secure_password(length=12):
    """Generate a secure random password"""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(secrets.choice(alphabet) for _ in range(length))


@virtual_host_bp.route('/api/subdomains', methods=['POST'])
@token_required
@rate_limit('virtual_host_create', per_user=True)
@check_virtual_host_permission('create')
def create_subdomain_virtual_host(current_user):
    """
    Create a subdomain virtual host under PRIMARY_DOMAIN without creating a new DNS zone.
    Steps:
    1) Validate PRIMARY_DOMAIN is set
    2) Build full domain = <subdomain>.<PRIMARY_DOMAIN>
    3) Create Linux user (or reuse if exists), home, public_html
    4) Create Nginx vhost for the subdomain
    5) Add A record to existing PRIMARY_DOMAIN zone (or create zone if missing)
    6) Optionally request SSL
    """
    try:
        data = request.get_json() or {}
        sub_label = str(data.get('subdomain', '')).strip().lower()
        if not sub_label:
            return jsonify({'success': False, 'error': 'subdomain is required'}), 400

        # Validate label
        import re
        if not re.match(r'^[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?$', sub_label):
            return jsonify({'success': False, 'error': 'Invalid subdomain label'}), 400

        primary_domain = get_primary_domain()
        if not primary_domain:
            return jsonify({'success': False, 'error': 'PRIMARY_DOMAIN is not set. Please configure it in Admin Settings.'}), 400

        domain = f"{sub_label}.{primary_domain}"

        # Prevent duplicates
        existing_host = VirtualHost.query.filter_by(domain=domain).first()
        if existing_host:
            return jsonify({'success': False, 'error': f'Domain "{domain}" already exists'}), 409

        # Prepare Linux user
        linux_username = data.get('linux_username')
        if not linux_username:
            linux_username = linux_user_service.generate_username_from_domain(domain)
        else:
            # Validate provided username
            if not re.match(r'^[a-z0-9]([a-z0-9\-]{0,30}[a-z0-9])?$', linux_username):
                return jsonify({'success': False, 'error': 'Invalid Linux username format'}), 400
            if linux_user_service.user_exists(linux_username) and linux_username != current_user.username:
                return jsonify({'success': False, 'error': f'Linux user "{linux_username}" already exists'}), 409

        # Use per-domain document root under user's home with public_html
        domain_part = re.sub(r'[^a-zA-Z0-9]', '', domain.split('.')[0])
        doc_root = f"/home/{linux_username}/{domain_part}/public_html"

        # Ensure directory exists and set ownership (create parent and public_html)
        try:
            os.makedirs(doc_root, exist_ok=True)
            if not linux_user_service.is_development:
                import pwd
                import grp
                user_info = pwd.getpwnam(linux_username)
                www_data_info = grp.getgrnam('www-data')
                
                # ตั้งสิทธิ์โฟลเดอร์ domain ให้ www-data เข้าได้ (711)
                domain_dir = os.path.dirname(doc_root)
                if domain_dir != f'/home/{linux_username}':
                    os.chown(domain_dir, user_info.pw_uid, user_info.pw_gid)
                    os.chmod(domain_dir, 0o711)
                    print(f"Set domain directory permissions: {domain_dir} -> 711")
                
                # ตั้งสิทธิ์ public_html ให้ www-data อ่าน+เข้าได้ (755)
                os.chown(doc_root, user_info.pw_uid, www_data_info.gr_gid)
                os.chmod(doc_root, 0o755)
                print(f"Set public_html permissions: {doc_root} -> 755")
        except Exception as e:
            print(f"Warning: Could not prepare document root for subdomain {domain}: {e}")

        # Ensure Linux user
        linux_password = data.get('linux_password') or _generate_secure_password(14)
        user_success, user_message, final_password = linux_user_service.create_user(linux_username, domain, linux_password)
        if not user_success:
            return jsonify({'success': False, 'error': f'Failed to create/reuse Linux user: {user_message}'}), 500

        # Create VirtualHost record
        php_version = str(data.get('php_version') or '8.3')
        virtual_host = VirtualHost(
            domain=domain,
            document_root=doc_root,
            linux_username=linux_username,
            server_admin=data.get('server_admin', current_user.email or f'admin@{primary_domain}'),
            php_version=php_version,
            user_id=current_user.id
        )
        db.session.add(virtual_host)
        db.session.flush()

        # Create Nginx vhost
        try:
            nginx_service.create_virtual_host(virtual_host)
        except Exception as e:
            db.session.rollback()
            return jsonify({'success': False, 'error': f'Failed to create Nginx vhost: {str(e)}'}), 500

        # Ensure PRIMARY_DOMAIN zone exists
        zone = DNSZone.query.filter_by(domain_name=primary_domain).first()
        if not zone:
            # Create zone with defaults
            zone = DNSZone(
                domain_name=primary_domain,
                serial=datetime.now().strftime('%Y%m%d01'),
                refresh=3600,
                retry=1800,
                expire=1209600,
                minimum=86400,
                status='active'
            )
            db.session.add(zone)
            db.session.flush()
            # base records minimal
            default_ip = get_dns_default_ip()
            db.session.add(DNSRecord(zone_id=zone.id, name='@',  record_type='NS', content=f"ns1.{primary_domain}.", ttl=3600, status='active'))
            db.session.add(DNSRecord(zone_id=zone.id, name='ns1', record_type='A',  content=default_ip,                ttl=3600, status='active'))
            db.session.add(DNSRecord(zone_id=zone.id, name='@',  record_type='A',  content=default_ip,                ttl=3600, status='active'))

        # Add/Upsert subdomain A record
        default_ip = get_dns_default_ip()
        existing_rec = DNSRecord.query.filter_by(zone_id=zone.id, name=sub_label, record_type='A').first()
        if existing_rec:
            existing_rec.content = default_ip
            existing_rec.status = 'active'
        else:
            db.session.add(DNSRecord(zone_id=zone.id, name=sub_label, record_type='A', content=default_ip, ttl=3600, status='active'))

        # Write zone file to BIND
        try:
            bind_service.update_zone(zone, nameserver_ip=default_ip)
        except Exception as e:
            # Non-fatal; keep DB in sync and allow manual DNS management
            print(f"Warning: Failed to update BIND zone for {primary_domain}: {e}")

        # Optionally request SSL
        ssl_requested = bool(data.get('create_ssl', False))
        ssl_status = None
        if ssl_requested:
            try:
                ssl_info = ssl_service.issue_certificate(domain, document_root=doc_root)
                if ssl_info:
                    ssl_cert = SSLCertificate(
                        domain=domain,
                        certificate_path=ssl_info['certificate_path'],
                        private_key_path=ssl_info['private_key_path'],
                        chain_path=ssl_info.get('chain_path'),
                        issuer=ssl_info.get('issuer'),
                        valid_from=ssl_info.get('valid_from'),
                        valid_until=ssl_info.get('valid_until'),
                        auto_renewal=True,
                        status='active'
                    )
                    db.session.add(ssl_cert)
                    ssl_status = 'issued'
            except Exception as e:
                print(f"Warning: SSL issue for {domain} failed: {e}")
                ssl_status = 'failed'

        # Commit all changes
        db.session.commit()

        return jsonify({
            'success': True,
            'data': {
                'domain': domain,
                'linux_username': linux_username,
                'linux_password': final_password or linux_password,
                'document_root': doc_root,
                'php_version': php_version,
                'ssl_status': ssl_status or 'skipped'
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

def _create_cgi_bin_folder(home_directory):
    """Create cgi-bin folder for the user"""
    try:
        cgi_bin_path = os.path.join(home_directory, 'cgi-bin')
        os.makedirs(cgi_bin_path, exist_ok=True)
        os.chmod(cgi_bin_path, 0o755)
        return True
    except Exception as e:
        print(f"Warning: Could not create cgi-bin folder: {e}")
        return False

def _create_dns_zone(domain, linux_username):
    """Create DNS zone with basic records"""
    # Check if DNS zone already exists
    existing_zone = DNSZone.query.filter_by(domain_name=domain).first()
    if existing_zone:
        print(f"DNS zone for {domain} already exists, skipping creation")
        return existing_zone
    
    # Create DNS zone
    dns_zone = DNSZone(
        domain_name=domain,
        serial=datetime.now().strftime('%Y%m%d01'),
        refresh=3600,
        retry=1800,
        expire=1209600,
        minimum=86400,
        status='active'
    )
    db.session.add(dns_zone)
    db.session.flush()  # Get the ID
    
    # Create base DNS records so UI reflects the template-generated zone file
    default_ip = get_dns_default_ip()
    records = [
        # NS record
        DNSRecord(
            zone_id=dns_zone.id,
            name='@',
            record_type='NS',
            content=f'ns1.{domain}.',
            ttl=3600,
            status='active'
        ),
        # ns1 A record
        DNSRecord(
            zone_id=dns_zone.id,
            name='ns1',
            record_type='A',
            content=default_ip,
            ttl=3600,
            status='active'
        ),
        # root A record
        DNSRecord(
            zone_id=dns_zone.id,
            name='@',
            record_type='A',
            content=default_ip,
            ttl=3600,
            status='active'
        ),
        # www CNAME
        DNSRecord(
            zone_id=dns_zone.id,
            name='www',
            record_type='CNAME',
            content=f'{domain}.',
            ttl=3600,
            status='active'
        ),
        # MX record (mail)
        DNSRecord(
            zone_id=dns_zone.id,
            name='@',
            record_type='MX',
            content=f'mail.{domain}.',
            priority=10,
            ttl=3600,
            status='active'
        ),
        # mail A record
        DNSRecord(
            zone_id=dns_zone.id,
            name='mail',
            record_type='A',
            content=default_ip,
            ttl=3600,
            status='active'
        )
    ]
    
    for record in records:
        db.session.add(record)
    
    # Create BIND zone file (external service - handle errors separately)
    try:
        bind_service.create_zone(dns_zone, get_dns_default_ip())
    except Exception as e:
        print(f"Warning: BIND zone file creation failed: {e}")
        # Continue anyway - database records are more important
    
    return dns_zone

def _create_email_domain(domain, linux_username):
    """Create email domain and default mailbox"""
    # Check if email domain already exists
    existing_domain = EmailDomain.query.filter_by(domain=domain).first()
    if existing_domain:
        print(f"Email domain for {domain} already exists, using existing")
        # Check if admin account exists
        existing_admin = EmailAccount.query.filter_by(
            domain_id=existing_domain.id, 
            username='admin'
        ).first()
        if existing_admin:
            return existing_domain, f'admin@{domain}', '[existing]'
        else:
            # Create admin account for existing domain
            try:
                default_password = _generate_secure_password()
                email_account = EmailAccount(
                    domain_id=existing_domain.id,
                    username='admin',
                    password=default_password,
                    quota=1024,
                    status='active'
                )
                db.session.add(email_account)
                return existing_domain, f'admin@{domain}', default_password
            except Exception as e:
                print(f"Warning: Could not create admin account for existing domain: {e}")
                return existing_domain, f'admin@{domain}', '[existing]'
    
    # Create new email domain only if it doesn't exist
    try:
        email_domain = EmailDomain(
            domain=domain,
            virtual_host_id=None,  # Will be set after VirtualHost is created
            status='active'
        )
        db.session.add(email_domain)
        db.session.flush()
        
        # Create default email account (admin@domain)
        default_password = _generate_secure_password()
        email_account = EmailAccount(
            domain_id=email_domain.id,
            username='admin',
            password=default_password,  # Will be hashed in email service
            quota=1024,
            status='active'
        )
        db.session.add(email_account)
        
        # Create email domain in Postfix (external service - handle errors separately)
        try:
            email_service.create_domain(domain)
            email_service.create_account('admin', domain, default_password, 1024)
        except Exception as e:
            print(f"Warning: Postfix email configuration failed: {e}")
            # Continue anyway - database records are more important
        
        return email_domain, f'admin@{domain}', default_password
        
    except Exception as e:
        print(f"Error creating email domain: {e}")
        # If creation fails, check if it was created by another process
        existing_domain = EmailDomain.query.filter_by(domain=domain).first()
        if existing_domain:
            return existing_domain, f'admin@{domain}', '[existing]'
        raise e

def _create_mysql_database(domain, linux_username):
    """Create MySQL database and user"""
    try:
        # Generate database name (remove dots and special chars)
        db_name = re.sub(r'[^a-zA-Z0-9]', '', domain.replace('.', '_'))[:20]
        db_user = f"{db_name}_user"
        db_password = _generate_secure_password()
        
        # Check if MySQL service is available
        try:
            # Quick connection test
            mysql_service.get_database_size('information_schema')  # Test connection
        except Exception as conn_test:
            print(f"MySQL service not available: {conn_test}")
            return None, None, None
        
        # Check if database already exists (try to connect)
        try:
            mysql_service.get_database_size(db_name)
            print(f"MySQL database {db_name} already exists, skipping creation")
            return db_name, db_user, '[existing]'
        except:
            pass  # Database doesn't exist, continue with creation
        
        # Create database
        mysql_service.create_database(db_name)
        
        # Create user with host='%' to allow connections from any host
        mysql_service.create_user(db_user, db_password, host='%')
        
        # Grant privileges with matching host
        mysql_service.grant_privileges(db_user, db_name, host='%')
        
        return db_name, db_user, db_password
    except Exception as e:
        print(f"Warning: Could not create MySQL database: {e}")
        return None, None, None



def _set_public_html_permissions(doc_root, linux_username):
    """ตั้งสิทธิ์ไฟล์และโฟลเดอร์ใน public_html ให้ถูกต้อง"""
    try:
        if not linux_user_service.is_development:
            import pwd
            import grp
            user_info = pwd.getpwnam(linux_username)
            www_data_info = grp.getgrnam('www-data')
            
            # ตั้งสิทธิ์โฟลเดอร์ทั้งหมดใน public_html เป็น 755
            for root, dirs, files in os.walk(doc_root):
                for d in dirs:
                    dir_path = os.path.join(root, d)
                    os.chown(dir_path, user_info.pw_uid, www_data_info.gr_gid)
                    os.chmod(dir_path, 0o755)
                    print(f"Set directory permissions: {dir_path} -> 755")
                
                # ตั้งสิทธิ์ไฟล์ทั้งหมดใน public_html เป็น 644
                for f in files:
                    file_path = os.path.join(root, f)
                    os.chown(file_path, user_info.pw_uid, www_data_info.gr_gid)
                    os.chmod(file_path, 0o644)
                    print(f"Set file permissions: {file_path} -> 644")
    except Exception as e:
        print(f"Warning: Could not set public_html file permissions: {e}")

def _fix_existing_virtual_host_permissions(virtual_host):
    """แก้ไขสิทธิ์ของ virtual host ที่มีอยู่แล้ว"""
    try:
        if linux_user_service.is_development:
            print(f"Development mode: Would fix permissions for {virtual_host.domain}")
            return True
            
        import pwd
        import grp
        import subprocess
        
        user_info = pwd.getpwnam(virtual_host.linux_username)
        www_data_info = grp.getgrnam('www-data')
        
        # ตั้งสิทธิ์ home directory ให้ www-data เข้าได้ (711)
        home_dir = f'/home/{virtual_host.linux_username}'
        os.chown(home_dir, user_info.pw_uid, user_info.pw_gid)
        os.chmod(home_dir, 0o711)
        print(f"Fixed home directory permissions: {home_dir} -> 711")
        
        # ตั้งสิทธิ์โฟลเดอร์ domain ให้ www-data เข้าได้ (711)
        # ต้องตั้งสิทธิ์ทุกโฟลเดอร์ใน path
        current_path = home_dir
        path_parts = virtual_host.document_root.replace(home_dir, '').strip('/').split('/')
        
        for part in path_parts[:-1]:  # ไม่รวม public_html
            current_path = os.path.join(current_path, part)
            if os.path.exists(current_path):
                os.chown(current_path, user_info.pw_uid, user_info.pw_gid)
                os.chmod(current_path, 0o711)
                print(f"Fixed directory permissions: {current_path} -> 711")
        
        # ตั้งสิทธิ์ public_html ให้ www-data อ่าน+เข้าได้ (755)
        os.chown(virtual_host.document_root, user_info.pw_uid, www_data_info.gr_gid)
        os.chmod(virtual_host.document_root, 0o755)
        print(f"Fixed public_html permissions: {virtual_host.document_root} -> 755")
        
        # ตั้งสิทธิ์ไฟล์และโฟลเดอร์ใน public_html
        _set_public_html_permissions(virtual_host.document_root, virtual_host.linux_username)
        
        return True
    except Exception as e:
        print(f"Warning: Could not fix existing virtual host permissions: {e}")
        return False

def _auto_fix_virtual_host(virtual_host):
    """Auto-fix virtual host to prevent PHP-related errors"""
    try:
        doc_root = virtual_host.document_root
        
        # Fix .htaccess file
        htaccess_path = os.path.join(doc_root, '.htaccess')
        if os.path.exists(htaccess_path):
            # Read and remove PHP directives
            with open(htaccess_path, 'r') as f:
                lines = f.readlines()
            
            fixed_lines = []
            removed_count = 0
            
            for line in lines:
                if line.strip().startswith(('php_flag', 'php_value', 'php_admin_flag', 'php_admin_value')):
                    removed_count += 1
                    continue
                fixed_lines.append(line)
            
            if removed_count > 0:
                # Backup original
                backup_path = f"{htaccess_path}.backup"
                if not os.path.exists(backup_path):
                    shutil.copy2(htaccess_path, backup_path)
                
                # Write fixed version
                with open(htaccess_path, 'w') as f:
                    f.writelines(fixed_lines)
                
                print(f"Auto-fixed .htaccess for {virtual_host.domain} - removed {removed_count} PHP directives")
        
        # Ensure proper permissions
        os.chmod(doc_root, 0o755)
        
    except Exception as e:
        print(f"Auto-fix warning for {virtual_host.domain}: {e}")

@virtual_host_bp.route('/api/virtual-hosts', methods=['GET'])
@token_required
def get_virtual_hosts(current_user):
    try:
        # Admin/root can see all virtual hosts
        if current_user.is_admin or current_user.role == 'admin' or current_user.username == 'root':
            virtual_hosts = VirtualHost.query.all()
        else:
            # Regular users see virtual hosts where linux_username matches their username
            # OR where they are the creator (user_id matches)
            virtual_hosts = VirtualHost.query.filter(
                (VirtualHost.linux_username == current_user.username) | 
                (VirtualHost.user_id == current_user.id)
            ).all()
        
        result = [vh.to_dict() for vh in virtual_hosts]
        
        return jsonify({
            'success': True,
            'data': result
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@virtual_host_bp.route('/api/virtual-hosts', methods=['POST'])
@token_required
@rate_limit('virtual_host_create', per_user=True)
@check_virtual_host_permission('create')
def create_virtual_host(current_user):
    """
    สร้าง Virtual Host ตามขั้นตอนที่กำหนด:
    1. สร้าง Linux user + home directory
    2. สร้าง Nginx VirtualHost + DNS zone
    3. สร้าง maildir + email mapping
    4. สร้างฐานข้อมูล + user
    5. ขอ SSL
    6. บันทึกทั้งหมดในระบบ
    """
    
    # Store created resources for cleanup on failure
    created_resources = {
        'linux_user': None,
        'nginx_config': None,
        'dns_zone': None,
        'email_domain': None,
        'database': None,
        'ssl_certificate': None,
        'virtual_host_id': None
    }
    
    try:
        data = request.get_json()
        
        # Check if data is valid JSON
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided or invalid JSON format',
                'error_code': 'INVALID_REQUEST_DATA'
            }), 400
        
        # Validate required fields
        required_fields = ['domain', 'linux_password']
        missing_fields = []
        for field in required_fields:
            if field not in data or not data[field] or str(data[field]).strip() == '':
                missing_fields.append(field)
        
        if missing_fields:
            return jsonify({
                'success': False,
                'error': f'Missing required fields: {", ".join(missing_fields)}',
                'error_code': 'MISSING_REQUIRED_FIELDS',
                'missing_fields': missing_fields
            }), 400
        
        # Sanitize domain name
        domain = str(data['domain']).strip().lower()
        data['domain'] = domain
        
        # Validate domain format
        domain_pattern = r'^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$'
        if not re.match(domain_pattern, domain):
            return jsonify({
                'success': False,
                'error': 'รูปแบบโดเมนไม่ถูกต้อง กรุณาใส่โดเมนในรูปแบบ example.com',
                'error_code': 'INVALID_DOMAIN_FORMAT',
                'provided_domain': domain
            }), 400
        
        # Check for reserved domains
        reserved_domains = ['localhost', 'localhost.localdomain', '127.0.0.1', 'admin', 'www', 'mail', 'ftp', 'root']
        domain_lower = domain
        if any(reserved in domain_lower for reserved in reserved_domains):
            return jsonify({
                'success': False,
                'error': f'โดเมน "{domain}" เป็นชื่อที่สงวนไว้ กรุณาเลือกชื่อโดเมนอื่น',
                'error_code': 'RESERVED_DOMAIN'
            }), 400
        
        # Validate password length
        if len(data['linux_password']) < 8:
            return jsonify({
                'success': False,
                'error': 'Password must be at least 8 characters long'
            }), 400
        
        # Check if domain already exists
        existing_host = VirtualHost.query.filter_by(domain=domain).first()
        if existing_host:
            return jsonify({
                'success': False,
                'error': f'โดเมน "{domain}" มีอยู่ในระบบแล้ว กรุณาเลือกชื่อโดเมนอื่น',
                'error_code': 'DOMAIN_EXISTS',
                'existing_domain': domain
            }), 409
        
        # Generate Linux username from domain
        # Use provided linux_username if available, otherwise generate from domain
        linux_username = data.get('linux_username')
        if not linux_username:
            linux_username = linux_user_service.generate_username_from_domain(domain)
        else:
            # Validate provided username (basic alphanumeric check, adjust as needed)
            if not re.match(r'^[a-z0-9]([a-z0-9\-]{0,30}[a-z0-9])?$', linux_username):
                return jsonify({
                    'success': False,
                    'error': 'รูปแบบชื่อผู้ใช้ Linux ไม่ถูกต้อง ต้องเป็นตัวอักษรพิมพ์เล็ก ตัวเลข หรือขีดกลางเท่านั้น',
                    'error_code': 'INVALID_LINUX_USERNAME_FORMAT'
                }), 400
            # Also check if the provided username already exists as a system user
            if linux_user_service.user_exists(linux_username):
                # Allow if it's the current user's username (for multi-domain hosting)
                if linux_username != current_user.username:
                    return jsonify({
                        'success': False,
                        'error': f'ชื่อผู้ใช้ Linux "{linux_username}" มีอยู่ในระบบแล้ว กรุณาเลือกชื่ออื่น',
                        'error_code': 'LINUX_USERNAME_EXISTS'
                    }), 409

        # Check if username already exists in database (but allow multiple virtual hosts per user)
        existing_user_hosts = VirtualHost.query.filter_by(linux_username=linux_username).all()
        if existing_user_hosts:
            # User already has virtual hosts, we'll create another one
            print(f"User {linux_username} already has {len(existing_user_hosts)} virtual host(s), creating additional one")
        
        # Use per-domain document root for new user with public_html
        domain_part = re.sub(r'[^a-zA-Z0-9]', '', domain.split('.')[0])
        doc_root = f"/home/{linux_username}/{domain_part}/public_html"

        user_password = data['linux_password']
        home_directory = f'/home/{linux_username}'
        
        # Initialize response data
        response_data = {
            'domain': domain,
            'linux_username': linux_username,
            'linux_password': user_password,
            'document_root': doc_root,
            'services_created': [],
            'errors': [],
            'steps_completed': []
        }
        
        print(f"\n=== Starting Virtual Host Creation for {domain} ===")
        
        # ขั้นตอนที่ 1: สร้าง Linux user + home directory
        print("Step 1: Creating Linux user + home directory...")
        success, message, password = linux_user_service.create_user(linux_username, domain, user_password, skip_public_html_creation=True)
        if not success:
            raise Exception(f'Failed to create Linux user: {message}')
        
        created_resources['linux_user'] = linux_username
        response_data['services_created'].append('Linux User + Home Directory')
        response_data['steps_completed'].append('1. Linux user + home directory created')
        print(f"✓ Linux user {linux_username} created successfully")
        
        # Create cgi-bin folder
        if _create_cgi_bin_folder(home_directory):
            response_data['services_created'].append('CGI-bin folder')

        # Ensure document root exists for this domain and owned by the new user
        try:
            os.makedirs(doc_root, exist_ok=True)
            if not linux_user_service.is_development:
                import pwd
                import grp
                import subprocess
                user_info = pwd.getpwnam(linux_username)
                www_data_info = grp.getgrnam('www-data')
                
                # ตรวจสอบและแก้ไขสิทธิ์ home directory ให้แน่ใจ
                home_dir = f'/home/{linux_username}'
                try:
                    subprocess.run(['chmod', '711', home_dir], check=True)
                    print(f"Ensured home directory permissions: {home_dir} -> 711")
                except Exception as e:
                    print(f"Warning: Could not ensure home directory permissions: {e}")
                
                # ตั้งสิทธิ์โฟลเดอร์ domain ให้ www-data เข้าได้ (711)
                domain_dir = os.path.dirname(doc_root)
                if domain_dir != home_dir:
                    os.chown(domain_dir, user_info.pw_uid, user_info.pw_gid)
                    os.chmod(domain_dir, 0o711)
                    print(f"Set domain directory permissions: {domain_dir} -> 711")
                
                # ตั้งสิทธิ์ public_html ให้ www-data อ่าน+เข้าได้ (755)
                os.chown(doc_root, user_info.pw_uid, www_data_info.gr_gid)
                os.chmod(doc_root, 0o755)
                print(f"Set public_html permissions: {doc_root} -> 755")
            print(f"✓ Document root prepared at {doc_root}")
        except Exception as e:
            print(f"Warning: Could not prepare document root {doc_root}: {e}")

        # Best-effort: set storage quota if provided
        if 'storage_quota_mb' in data and data['storage_quota_mb']:
            try:
                quota_val = int(data['storage_quota_mb'])
                if quota_val > 0:
                    applied = quota_service.set_user_quota(linux_username, quota_val)
                    if applied:
                        response_data['services_created'].append(f'Quota {quota_val}MB')
            except Exception as e:
                print(f"Quota set skipped: {e}")
        
        # สร้าง virtual host record เพื่อเตรียมไว้ (ยังไม่ commit)
        virtual_host = VirtualHost(
            domain=domain,
            document_root=doc_root,
            linux_username=linux_username,
            server_admin=data.get('server_admin', current_user.email or 'admin@localhost'),
            php_version=data.get('php_version', '8.3'),
            user_id=current_user.id
        )
        db.session.add(virtual_host)
        db.session.flush()  # Get ID without committing
        created_resources['virtual_host_id'] = virtual_host.id
        
        # ขั้นตอนที่ 2: สร้าง Nginx VirtualHost + DNS zone
        print("Step 2: Creating Nginx VirtualHost + DNS zone...")
        
        # สร้าง Nginx VirtualHost
        try:
            nginx_service.create_virtual_host(virtual_host)
            created_resources['nginx_config'] = domain
            response_data['services_created'].append('Nginx VirtualHost')
            print(f"✓ Nginx VirtualHost for {domain} created")
        except Exception as e:
            raise Exception(f'Failed to create Nginx VirtualHost: {str(e)}')
        
        # สร้าง DNS Zone
        try:
            dns_zone = _create_dns_zone(domain, linux_username)
            if dns_zone:
                created_resources['dns_zone'] = dns_zone.id
                response_data['services_created'].append('DNS Zone')
                response_data['dns_zone_id'] = dns_zone.id
                print(f"✓ DNS zone for {domain} created")
        except Exception as e:
            print(f"Warning: DNS zone creation failed: {e}")
            response_data['errors'].append(f"DNS zone creation failed: {str(e)}")
        
        response_data['steps_completed'].append('2. Nginx VirtualHost + DNS zone created')
        
        # ขั้นตอนที่ 3: สร้าง maildir + email mapping
        print("Step 3: Creating maildir + email mapping...")
        try:
            email_domain, email_address, email_password = _create_email_domain(domain, linux_username)
            if email_domain:
                email_domain.virtual_host_id = virtual_host.id
                created_resources['email_domain'] = email_domain.id
                response_data['services_created'].append('Email Domain + Maildir')
                response_data['default_email'] = email_address
                response_data['email_password'] = email_password
                print(f"✓ Email domain and maildir for {email_address} created")
            
            # Create maildir structure
            maildir_path = f"{home_directory}/Maildir"
            try:
                os.makedirs(f"{maildir_path}/cur", exist_ok=True)
                os.makedirs(f"{maildir_path}/new", exist_ok=True)
                os.makedirs(f"{maildir_path}/tmp", exist_ok=True)
                # Set proper permissions
                if not linux_user_service.is_development:
                    import pwd
                    user_info = pwd.getpwnam(linux_username)
                    os.chown(maildir_path, user_info.pw_uid, user_info.pw_gid)
                    for subdir in ['cur', 'new', 'tmp']:
                        os.chown(f"{maildir_path}/{subdir}", user_info.pw_uid, user_info.pw_gid)
                print(f"✓ Maildir structure created at {maildir_path}")
            except Exception as e:
                print(f"Warning: Maildir structure creation failed: {e}")
                
        except Exception as e:
            print(f"Warning: Email domain creation failed: {e}")
            response_data['errors'].append(f"Email domain creation failed: {str(e)}")
            # ไม่ต้อง rollback ที่นี่ เพราะจะทำให้ virtual host record หายไป
            # ให้ดำเนินการขั้นตอนต่อไป และ commit ทุกอย่างในขั้นตอนสุดท้าย
            print(f"Continuing with other services despite email creation failure")
        
        response_data['steps_completed'].append('3. Maildir + email mapping created')
        
        # ขั้นตอนที่ 4: สร้างฐานข้อมูล + user
        print("Step 4: Creating MySQL database + user...")
        try:
            db_name, db_user, db_password = _create_mysql_database(domain, linux_username)
            if db_name:
                created_resources['database'] = {'name': db_name, 'user': db_user}
                response_data['services_created'].append('MySQL Database')
                response_data['database_name'] = db_name
                response_data['database_user'] = db_user
                response_data['database_password'] = db_password
                print(f"✓ MySQL database {db_name} created with user {db_user}")
        except Exception as e:
            print(f"Warning: MySQL database creation failed: {e}")
            response_data['errors'].append(f"MySQL database creation failed: {str(e)}")
        
        response_data['steps_completed'].append('4. MySQL database + user created')
        
        # ขั้นตอนที่ 5: ขอ SSL
        print("Step 5: Requesting SSL certificate...")
        if data.get('create_ssl', False):
            try:
                existing_ssl = SSLCertificate.query.filter_by(domain=domain).first()
                if existing_ssl:
                    print(f"SSL certificate for {domain} already exists")
                    response_data['services_created'].append('SSL Certificate (existing)')
                    response_data['ssl_certificate_id'] = existing_ssl.id
                    response_data['ssl_valid_until'] = existing_ssl.valid_until.isoformat()
                else:
                    ssl_cert_info = ssl_service.issue_certificate(domain, document_root=doc_root)
                    ssl_certificate = SSLCertificate(
                        domain=domain,
                        certificate_path=ssl_cert_info['certificate_path'],
                        private_key_path=ssl_cert_info['private_key_path'],
                        chain_path=ssl_cert_info['chain_path'],
                        issuer=ssl_cert_info['issuer'],
                        valid_from=ssl_cert_info['valid_from'],
                        valid_until=ssl_cert_info['valid_until'],
                        auto_renewal=True,
                        status='active'
                    )
                    db.session.add(ssl_certificate)
                    created_resources['ssl_certificate'] = ssl_certificate
                    response_data['services_created'].append('SSL Certificate')
                    response_data['ssl_certificate_id'] = ssl_certificate.id
                    response_data['ssl_valid_until'] = ssl_cert_info['valid_until'].isoformat()
                    print(f"✓ SSL certificate for {domain} issued")
            except Exception as e:
                print(f"Warning: SSL certificate creation failed: {e}")
                response_data['ssl_error'] = str(e)
        else:
            print("SSL certificate creation skipped (not requested)")
        
        response_data['steps_completed'].append('6. SSL certificate processed')
        
        # ขั้นตอนที่ 7: บันทึกทั้งหมดในระบบ
        print("Step 7: Saving everything to database...")
        try:
            db.session.commit()
            print(f"✓ All database changes committed successfully for {domain}")
            response_data['steps_completed'].append('7. All data saved to database')
        except Exception as e:
            print(f"Database commit failed: {e}")
            raise Exception(f"Failed to save virtual host to database: {str(e)}")
        
        # Run auto-fix to ensure no PHP issues
        try:
            _auto_fix_virtual_host(virtual_host)
        except Exception as e:
            print(f"Warning: Auto-fix failed: {e}")
        
        # ตั้งสิทธิ์ไฟล์ใน public_html ให้ถูกต้อง
        _set_public_html_permissions(doc_root, linux_username)
        
        # Prepare success message
        services_count = len(response_data['services_created'])
        message = f'🎉 Virtual host created successfully!\n\n'
        message += f'📋 Summary:\n'
        message += f'   Domain: {domain}\n'
        message += f'   Linux User: {linux_username}\n'
        message += f'   Password: {password}\n'
        message += f'   Document Root: {doc_root}\n\n'
        
        if response_data.get('default_email'):
            message += f'📧 Email: {response_data["default_email"]} (Password: {response_data["email_password"]})\n'
        if response_data.get('database_name'):
            message += f'🗄️ Database: {response_data["database_name"]} (User: {response_data["database_user"]}, Password: {response_data["database_password"]})\n'
        if response_data.get('ftp_username'):
            message += f'📁 FTP/SFTP: {response_data["ftp_username"]} (Password: {response_data["ftp_password"]})\n'
        
        message += f'\n✅ Services created ({services_count}): {", ".join(response_data["services_created"])}'
        
        if response_data['errors']:
            message += f'\n\n⚠️ Warnings: {len(response_data["errors"])} non-critical issues occurred'
        
        response_data['message'] = message
        response_data.update(virtual_host.to_dict())
        
        print(f"=== Virtual Host Creation Completed for {domain} ===\n")
        
        return jsonify({
            'success': True,
            'data': response_data
        }), 201
        
    except Exception as e:
        print(f"\n❌ Virtual Host Creation Failed: {str(e)}")
        db.session.rollback()
        
        # Cleanup created resources in reverse order
        cleanup_errors = []
        
        # Cleanup SSL certificate
        if created_resources.get('ssl_certificate'):
            try:
                if hasattr(created_resources['ssl_certificate'], 'id'):
                    # It's already in database, let rollback handle it
                    pass
                else:
                    # External cleanup if needed
                    pass
            except Exception as cleanup_e:
                cleanup_errors.append(f"SSL cleanup: {str(cleanup_e)}")
        

        
        # Cleanup MySQL database
        if created_resources.get('database'):
            try:
                if created_resources['database'].get('name'):
                    mysql_service.delete_database(created_resources['database']['name'])
                if created_resources['database'].get('user'):
                    mysql_service.delete_user(created_resources['database']['user'])
            except Exception as cleanup_e:
                cleanup_errors.append(f"MySQL cleanup: {str(cleanup_e)}")
        
        # Cleanup DNS zone (external service)
        if created_resources.get('dns_zone'):
            try:
                # BIND cleanup if needed
                bind_service.delete_zone(domain)
            except Exception as cleanup_e:
                cleanup_errors.append(f"DNS cleanup: {str(cleanup_e)}")
        
        # Cleanup Nginx config
        if created_resources.get('nginx_config'):
            try:
                # Create a temporary virtual host object for cleanup
                temp_vh = type('obj', (object,), {'domain': created_resources['nginx_config']})
                nginx_service.delete_virtual_host(temp_vh)
            except Exception as cleanup_e:
                cleanup_errors.append(f"Nginx cleanup: {str(cleanup_e)}")
        
        # Cleanup Linux user (this should be last as it removes home directory)
        if created_resources.get('linux_user'):
            try:
                linux_user_service.delete_user(created_resources['linux_user'])
            except Exception as cleanup_e:
                cleanup_errors.append(f"Linux user cleanup: {str(cleanup_e)}")
        
        error_message = str(e)
        if cleanup_errors:
            error_message += f"\n\nCleanup warnings: {'; '.join(cleanup_errors)}"
        
        return jsonify({
            'success': False,
            'error': error_message,
            'cleanup_performed': True,
            'cleanup_errors': cleanup_errors if cleanup_errors else None
        }), 500

@virtual_host_bp.route('/api/virtual-hosts/<int:id>', methods=['GET'])
@token_required
@check_virtual_host_permission('read')
def get_virtual_host(current_user, id):
    try:
        # Permission check is handled by decorator
        virtual_host = VirtualHost.query.get(id)
        if not virtual_host:
            return jsonify({
                'success': False,
                'error': 'Virtual host not found'
            }), 404
        
        # Double-check permission (decorator already checked, but being explicit)
        if not can_access_virtual_host(current_user, virtual_host):
            return jsonify({
                'success': False,
                'error': 'Access denied. You can only view your own virtual hosts.'
            }), 403
        
        return jsonify({
            'success': True,
            'data': virtual_host.to_dict()
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@virtual_host_bp.route('/api/virtual-hosts/<int:id>', methods=['PUT'])
@token_required
@check_virtual_host_permission('update')
def update_virtual_host(current_user, id):
    try:
        virtual_host = VirtualHost.query.get(id)
        if not virtual_host:
            return jsonify({
                'success': False,
                'error': 'Virtual host not found'
            }), 404
        
        # Permission check is handled by decorator
        if not can_access_virtual_host(current_user, virtual_host):
            return jsonify({
                'success': False,
                'error': 'Access denied. You can only modify your own virtual hosts.'
            }), 403
        
        data = request.get_json()
        
        # Update fields
        if 'domain' in data and data['domain'] != virtual_host.domain:
            # Check if new domain already exists
            existing_host = VirtualHost.query.filter_by(domain=data['domain']).first()
            if existing_host and existing_host.id != id:
                return jsonify({
                    'success': False,
                    'error': 'Domain already exists'
                }), 400
            virtual_host.domain = data['domain']
        
        # Document root validation with permission check
        if 'document_root' in data:
            can_modify, error_msg = check_document_root_permission(
                current_user, data['document_root'], virtual_host
            )
            if not can_modify:
                return jsonify({
                    'success': False,
                    'error': error_msg
                }), 403
            
            virtual_host.document_root = data['document_root']
        
        if 'server_admin' in data:
            virtual_host.server_admin = data['server_admin']
        
        if 'php_version' in data:
            virtual_host.php_version = data['php_version']
        
        if 'status' in data:
            virtual_host.status = data['status']
        
        # Update Nginx configuration
        try:
            nginx_service.update_virtual_host(virtual_host)
        except Exception as e:
            print(f"Nginx service error: {e}")
            # Continue even if Nginx service fails
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': virtual_host.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@virtual_host_bp.route('/api/virtual-hosts/<int:id>', methods=['DELETE'])
@token_required
@check_virtual_host_permission('delete')
def delete_virtual_host(current_user, id):
    try:
        virtual_host = VirtualHost.query.get(id)
        if not virtual_host:
            return jsonify({
                'success': False,
                'error': 'Virtual host not found'
            }), 404
        
        # Permission check is handled by decorator
        if not can_access_virtual_host(current_user, virtual_host):
            return jsonify({
                'success': False,
                'error': 'Access denied. You can only delete your own virtual hosts.'
            }), 403
        
        domain = virtual_host.domain
        linux_username = virtual_host.linux_username
        deletion_summary = {
            'virtual_host': False,
            'nginx_config': False,
            'linux_user': False,
            'dns_zone': False,
            'email_domain': False,
            'ssl_certificates': False,
            'databases': False
        }

        # 1. Remove Nginx configuration
        try:
            nginx_service.delete_virtual_host(virtual_host)
            deletion_summary['nginx_config'] = True
        except Exception as e:
            print(f"Nginx service error: {e}")
            # Continue even if Nginx service fails
        
        # 2. Delete related DNS zones and records
        try:
            dns_zone = DNSZone.query.filter_by(domain_name=domain).first()
            if dns_zone:
                # Delete DNS records (handled by cascade)
                # Delete BIND zone file
                try:
                    bind_service.delete_zone(domain)  # Pass domain name, not zone object
                except Exception as e:
                    print(f"Warning: BIND zone file deletion failed: {e}")
                
                # Delete from database
                db.session.delete(dns_zone)
                deletion_summary['dns_zone'] = True
        except Exception as e:
            print(f"Warning: DNS zone deletion failed: {e}")

        # 3. Delete related email domains and accounts
        try:
            email_domain = EmailDomain.query.filter_by(virtual_host_id=id).first()
            if not email_domain:
                # Also check by domain name in case virtual_host_id is not set
                email_domain = EmailDomain.query.filter_by(domain=domain).first()
            
            if email_domain:
                # Email accounts will be deleted by cascade (all, delete-orphan)
                # Delete email service configuration
                try:
                    email_service.delete_domain(domain)  # Pass domain string, not EmailDomain object
                except Exception as e:
                    print(f"Warning: Email service deletion failed: {e}")
                
                # Delete from database
                db.session.delete(email_domain)
                deletion_summary['email_domain'] = True
        except Exception as e:
            print(f"Warning: Email domain deletion failed: {e}")

        # 4. Delete related SSL certificates
        try:
            ssl_certificates = SSLCertificate.query.filter_by(domain=domain).all()
            for cert in ssl_certificates:
                try:
                    ssl_service.delete_certificate(cert.id)  # Pass certificate ID
                except Exception as e:
                    print(f"Warning: SSL service deletion failed for {cert.domain}: {e}")
                
                db.session.delete(cert)
            
            if ssl_certificates:
                deletion_summary['ssl_certificates'] = True
        except Exception as e:
            print(f"Warning: SSL certificate deletion failed: {e}")

        # 5. Delete databases owned by the same user (optional - user may want to keep them)
        # Note: This is more conservative - we only delete databases if they match the domain pattern
        try:
            # Look for databases that might be related to this domain
            domain_prefix = domain.replace('.', '_').replace('-', '_')
            
            # Check Database model for databases owned by the user
            # Note: Database model may not exist, skip if not available
            try:
                from models.database import Database
                user_databases = Database.query.filter_by(owner_id=virtual_host.user_id).all()
            except ImportError:
                user_databases = []
            deleted_db_count = 0
            
            for database in user_databases:
                # Only delete databases that appear to be related to this domain
                if (domain_prefix in database.name or 
                    linux_username in database.name or 
                    database.name.startswith(domain.split('.')[0])):  # e.g. "example" from "example.com"
                    try:
                        # Delete from MySQL server
                        mysql_service.delete_database(database.name)  # Pass database name, not ID
                        # Delete from database model
                        db.session.delete(database)
                        deleted_db_count += 1
                        print(f"Deleted database: {database.name}")
                    except Exception as e:
                        print(f"Warning: Database deletion failed for {database.name}: {e}")
            
            if deleted_db_count > 0:
                deletion_summary['databases'] = True
                print(f"Deleted {deleted_db_count} database(s) related to {domain}")
            else:
                print(f"No databases found related to domain {domain}")
                
        except Exception as e:
            print(f"Warning: Database deletion failed: {e}")

        # 6. Delete Linux user and home directory
        try:
            user_success, user_message = linux_user_service.delete_user(linux_username)
            if user_success:
                deletion_summary['linux_user'] = True
            else:
                print(f"Warning: Failed to delete Linux user {linux_username}: {user_message}")
        except Exception as e:
            print(f"Warning: Error deleting Linux user {linux_username}: {e}")
        
        # 7. Finally, remove virtual host from database
        db.session.delete(virtual_host)
        deletion_summary['virtual_host'] = True
        
        # Commit all changes
        db.session.commit()
        
        # Prepare response message
        deleted_items = [key for key, value in deletion_summary.items() if value]
        skipped_items = [key for key, value in deletion_summary.items() if not value]
        
        message = f'Virtual host {domain} deleted successfully.'
        if deleted_items:
            message += f' Deleted: {", ".join(deleted_items)}.'
        if skipped_items:
            message += f' Skipped (not found or failed): {", ".join(skipped_items)}.'

        return jsonify({
            'success': True,
            'message': message,
            'deletion_summary': deletion_summary
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': f'Failed to delete virtual host: {str(e)}'
        }), 500

# Admin-only routes for managing all virtual hosts
@virtual_host_bp.route('/api/admin/virtual-hosts', methods=['GET'])
@token_required
def admin_get_all_virtual_hosts(current_user):
    """Admin route to get all virtual hosts regardless of ownership"""
    try:
        # Check if user is admin
        if not (current_user.is_admin or current_user.role == 'admin' or current_user.username == 'root'):
            return jsonify({
                'success': False,
                'error': 'Admin access required'
            }), 403
        
        virtual_hosts = VirtualHost.query.all()
        result = []
        
        for vh in virtual_hosts:
            vh_dict = vh.to_dict()
            # Add owner information for admin view
            owner = User.query.get(vh.user_id)
            vh_dict['owner_username'] = owner.username if owner else 'Unknown'
            result.append(vh_dict)
        
        return jsonify({
            'success': True,
            'data': result
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@virtual_host_bp.route('/api/admin/virtual-hosts/<int:id>/transfer', methods=['POST'])
@token_required
def admin_transfer_virtual_host(current_user, id):
    """Admin route to transfer virtual host ownership"""
    try:
        # Check if user is admin
        if not (current_user.is_admin or current_user.role == 'admin' or current_user.username == 'root'):
            return jsonify({
                'success': False,
                'error': 'Admin access required'
            }), 403
        
        virtual_host = VirtualHost.query.get(id)
        if not virtual_host:
            return jsonify({
                'success': False,
                'error': 'Virtual host not found'
            }), 404
        
        data = request.get_json()
        new_user_id = data.get('new_user_id')
        
        if not new_user_id:
            return jsonify({
                'success': False,
                'error': 'new_user_id is required'
            }), 400
        
        new_user = User.query.get(new_user_id)
        if not new_user:
            return jsonify({
                'success': False,
                'error': 'Target user not found'
            }), 404
        
        old_user = User.query.get(virtual_host.user_id)
        virtual_host.user_id = new_user_id
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Virtual host {virtual_host.domain} transferred from {old_user.username if old_user else "Unknown"} to {new_user.username}'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@virtual_host_bp.route('/api/virtual-hosts/<int:id>/fix-permissions', methods=['POST'])
@token_required
@check_virtual_host_permission('update')
def fix_virtual_host_permissions(current_user, id):
    """แก้ไขสิทธิ์ของ virtual host ที่มีอยู่แล้ว"""
    try:
        virtual_host = VirtualHost.query.get(id)
        if not virtual_host:
            return jsonify({
                'success': False,
                'error': 'Virtual host not found'
            }), 404
        
        # Permission check
        if not can_access_virtual_host(current_user, virtual_host):
            return jsonify({
                'success': False,
                'error': 'Access denied. You can only fix permissions for your own virtual hosts.'
            }), 403
        
        # Fix permissions
        success = _fix_existing_virtual_host_permissions(virtual_host)
        
        if success:
            return jsonify({
                'success': True,
                'message': f'Permissions fixed successfully for {virtual_host.domain}'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to fix permissions. Check server logs for details.'
            }), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@virtual_host_bp.route('/api/virtual-hosts/fix-all-permissions', methods=['POST'])
@token_required
def fix_all_virtual_hosts_permissions(current_user):
    """แก้ไขสิทธิ์ของ virtual hosts ทั้งหมด"""
    try:
        # Admin/root can fix all virtual hosts
        if current_user.is_admin or current_user.role == 'admin' or current_user.username == 'root':
            virtual_hosts = VirtualHost.query.all()
        else:
            # Regular users can only fix their own virtual hosts
            virtual_hosts = VirtualHost.query.filter(
                (VirtualHost.linux_username == current_user.username) | 
                (VirtualHost.user_id == current_user.id)
            ).all()
        
        fixed_count = 0
        failed_count = 0
        results = []
        
        for virtual_host in virtual_hosts:
            try:
                success = _fix_existing_virtual_host_permissions(virtual_host)
                if success:
                    fixed_count += 1
                    results.append(f"✅ {virtual_host.domain} - Fixed")
                else:
                    failed_count += 1
                    results.append(f"❌ {virtual_host.domain} - Failed")
            except Exception as e:
                failed_count += 1
                results.append(f"❌ {virtual_host.domain} - Error: {str(e)}")
        
        return jsonify({
            'success': True,
            'message': f'Fixed {fixed_count} virtual hosts, {failed_count} failed',
            'results': results,
            'fixed_count': fixed_count,
            'failed_count': failed_count
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@virtual_host_bp.route('/api/admin/cleanup-duplicate-services/<domain>', methods=['DELETE'])
@token_required
def cleanup_duplicate_services(current_user, domain):
    """Cleanup duplicate services for a domain (admin only)"""
    try:
        # Check if user is admin
        if not (current_user.is_admin or current_user.role == 'admin' or current_user.username == 'root'):
            return jsonify({
                'success': False,
                'error': 'Admin access required'
            }), 403
        
        cleanup_results = []
        
        # Clean up DNS zones
        dns_zones = DNSZone.query.filter_by(domain_name=domain).all()
        if len(dns_zones) > 1:
            # Keep the first one, delete the rest
            for zone in dns_zones[1:]:
                # Delete associated records first
                DNSRecord.query.filter_by(zone_id=zone.id).delete()
                db.session.delete(zone)
            cleanup_results.append(f'Removed {len(dns_zones)-1} duplicate DNS zones')
        
        # Clean up email domains
        email_domains = EmailDomain.query.filter_by(domain=domain).all()
        if len(email_domains) > 1:
            for email_domain in email_domains[1:]:
                # Delete associated accounts first
                EmailAccount.query.filter_by(domain_id=email_domain.id).delete()
                db.session.delete(email_domain)
            cleanup_results.append(f'Removed {len(email_domains)-1} duplicate email domains')
        
        # Clean up SSL certificates
        ssl_certs = SSLCertificate.query.filter_by(domain=domain).all()
        if len(ssl_certs) > 1:
            for ssl_cert in ssl_certs[1:]:
                db.session.delete(ssl_cert)
            cleanup_results.append(f'Removed {len(ssl_certs)-1} duplicate SSL certificates')
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Cleanup completed for {domain}',
            'results': cleanup_results
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500 

@virtual_host_bp.route('/api/virtual-hosts/existing-user', methods=['POST'])
@token_required
@check_virtual_host_permission('create')
def create_virtual_host_for_existing_user(current_user):
    """
    สร้าง Virtual Host สำหรับ user Linux ที่มีอยู่แล้ว:
    1. ตรวจสอบว่า user Linux มีอยู่จริง
    2. สร้าง Nginx VirtualHost + DNS zone
    3. สร้าง maildir + email mapping
    4. สร้างฐานข้อมูล + user
    5. สร้าง FTP user (ถ้ายังไม่มี)
    6. ขอ SSL
    7. บันทึกทั้งหมดในระบบ
    """
    
    # Store created resources for cleanup on failure
    created_resources = {
        'nginx_config': None,
        'dns_zone': None,
        'email_domain': None,
        'database': None,
        'ftp_account': None,
        'ssl_certificate': None,
        'virtual_host_id': None
    }
    
    try:
        data = request.get_json()
        
        # Check if data is valid JSON
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided or invalid JSON format',
                'error_code': 'INVALID_REQUEST_DATA'
            }), 400
        
        # Validate required fields
        required_fields = ['domain', 'linux_username']
        missing_fields = []
        for field in required_fields:
            if field not in data or not data[field] or str(data[field]).strip() == '':
                missing_fields.append(field)
        
        if missing_fields:
            return jsonify({
                'success': False,
                'error': f'Missing required fields: {", ".join(missing_fields)}',
                'error_code': 'MISSING_REQUIRED_FIELDS',
                'missing_fields': missing_fields
            }), 400
        
        # Sanitize domain name and username
        domain = str(data['domain']).strip().lower()
        linux_username = str(data['linux_username']).strip().lower()
        data['domain'] = domain
        data['linux_username'] = linux_username
        
        # Determine document root (unique per domain label under user's home with public_html)
        domain_part = re.sub(r'[^a-zA-Z0-9]', '', domain.split('.')[0])
        doc_root = f"/home/{linux_username}/{domain_part}/public_html"

        # Validate provided username (basic alphanumeric check, adjust as needed)
        if not re.match(r'^[a-z0-9]([a-z0-9\-]{0,30}[a-z0-9])?$', linux_username):
            return jsonify({
                'success': False,
                'error': 'รูปแบบชื่อผู้ใช้ Linux ไม่ถูกต้อง ต้องเป็นตัวอักษรพิมพ์เล็ก ตัวเลข หรือขีดกลางเท่านั้น',
                'error_code': 'INVALID_LINUX_USERNAME_FORMAT'
            }), 400

        # Validate domain format
        domain_pattern = r'^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$'
        if not re.match(domain_pattern, domain):
            return jsonify({
                'success': False,
                'error': 'รูปแบบโดเมนไม่ถูกต้อง กรุณาใส่โดเมนในรูปแบบ example.com',
                'error_code': 'INVALID_DOMAIN_FORMAT',
                'provided_domain': domain
            }), 400
        
        # Check for reserved domains
        reserved_domains = ['localhost', 'localhost.localdomain', '127.0.0.1', 'admin', 'www', 'mail', 'ftp', 'root']
        domain_lower = domain
        if any(reserved in domain_lower for reserved in reserved_domains):
            return jsonify({
                'success': False,
                'error': f'โดเมน "{domain}" เป็นชื่อที่สงวนไว้ กรุณาเลือกชื่อโดเมนอื่น',
                'error_code': 'RESERVED_DOMAIN'
            }), 400
        
        # Check if domain already exists
        existing_host = VirtualHost.query.filter_by(domain=domain).first()
        if existing_host:
            return jsonify({
                'success': False,
                'error': f'โดเมน "{domain}" มีอยู่ในระบบแล้ว กรุณาเลือกชื่อโดเมนอื่น',
                'error_code': 'DOMAIN_EXISTS',
                'existing_domain': domain
            }), 409
        
        # Check if Linux user exists
        try:
            import pwd
            user_info = pwd.getpwnam(linux_username)
            home_directory = user_info.pw_dir
        except KeyError:
            return jsonify({
                'success': False,
                'error': f'Linux user "{linux_username}" ไม่มีอยู่ในระบบ กรุณาตรวจสอบชื่อผู้ใช้',
                'error_code': 'LINUX_USER_NOT_FOUND',
                'provided_username': linux_username
            }), 404
        
        # Check if user has permission to use this Linux username
        if not current_user.is_admin and current_user.role != 'admin' and current_user.username != 'root':
            if current_user.username != linux_username:
                return jsonify({
                    'success': False,
                    'error': f'คุณไม่มีสิทธิ์ใช้ Linux user "{linux_username}" กรุณาใช้ชื่อผู้ใช้ของคุณเอง',
                    'error_code': 'PERMISSION_DENIED',
                    'your_username': current_user.username,
                    'requested_username': linux_username
                }), 403
        
        # Use per-domain document root for existing user as well with public_html
        domain_part = re.sub(r'[^a-zA-Z0-9]', '', domain.split('.')[0])
        doc_root = f"/home/{linux_username}/{domain_part}/public_html"

        # Ensure document root exists with correct ownership
        try:
            os.makedirs(doc_root, exist_ok=True)
            if not linux_user_service.is_development:
                import pwd
                import grp
                user_info = pwd.getpwnam(linux_username)
                www_data_info = grp.getgrnam('www-data')
                
                # ตั้งสิทธิ์โฟลเดอร์ domain ให้ www-data เข้าได้ (711)
                domain_dir = os.path.dirname(doc_root)
                if domain_dir != f'/home/{linux_username}':
                    os.chown(domain_dir, user_info.pw_uid, user_info.pw_gid)
                    os.chmod(domain_dir, 0o711)
                    print(f"Set domain directory permissions: {domain_dir} -> 711")
                
                # ตั้งสิทธิ์ public_html ให้ www-data อ่าน+เข้าได้ (755)
                os.chown(doc_root, user_info.pw_uid, www_data_info.gr_gid)
                os.chmod(doc_root, 0o755)
                print(f"Set public_html permissions: {doc_root} -> 755")
            print(f"✓ Document root prepared at {doc_root}")
        except Exception as e:
            print(f"Warning: Could not prepare document root {doc_root}: {e}")

        # Initialize response data
        response_data = {
            'domain': domain,
            'linux_username': linux_username,
            'document_root': doc_root,
            'services_created': [],
            'errors': [],
            'steps_completed': []
        }
        
        print(f"\n=== Starting Virtual Host Creation for {domain} (Existing User: {linux_username}) ===")
        
        # สร้าง virtual host record เพื่อเตรียมไว้ (ยังไม่ commit)
        virtual_host = VirtualHost(
            domain=domain,
            document_root=doc_root,
            linux_username=linux_username,
            server_admin=data.get('server_admin', current_user.email or 'admin@localhost'),
            php_version=data.get('php_version', '8.3'),
            user_id=current_user.id
        )
        db.session.add(virtual_host)
        db.session.flush()  # Get ID without committing
        created_resources['virtual_host_id'] = virtual_host.id
        
        # Best-effort: set storage quota if provided (apply to existing Linux user)
        if 'storage_quota_mb' in data and data['storage_quota_mb']:
            try:
                quota_val = int(data['storage_quota_mb'])
                if quota_val > 0:
                    applied = quota_service.set_user_quota(linux_username, quota_val)
                    if applied:
                        response_data['services_created'].append(f'Quota {quota_val}MB')
            except Exception as e:
                print(f"Quota set skipped: {e}")

        # ขั้นตอนที่ 1: สร้าง Nginx VirtualHost + DNS zone
        print("Step 1: Creating Nginx VirtualHost + DNS zone...")
        
        # สร้าง Nginx VirtualHost
        try:
            nginx_service.create_virtual_host(virtual_host)
            created_resources['nginx_config'] = domain
            response_data['services_created'].append('Nginx VirtualHost')
            print(f"✓ Nginx VirtualHost for {domain} created")
        except Exception as e:
            raise Exception(f'Failed to create Nginx VirtualHost: {str(e)}')
        
        # สร้าง DNS Zone
        try:
            dns_zone = _create_dns_zone(domain, linux_username)
            if dns_zone:
                created_resources['dns_zone'] = dns_zone.id
                response_data['services_created'].append('DNS Zone')
                response_data['dns_zone_id'] = dns_zone.id
                print(f"✓ DNS zone for {domain} created")
        except Exception as e:
            print(f"Warning: DNS zone creation failed: {e}")
            response_data['errors'].append(f"DNS zone creation failed: {str(e)}")
        
        response_data['steps_completed'].append('1. Nginx VirtualHost + DNS zone created')
        
        # ขั้นตอนที่ 2: สร้าง maildir + email mapping
        print("Step 2: Creating maildir + email mapping...")
        try:
            email_domain, email_address, email_password = _create_email_domain(domain, linux_username)
            if email_domain:
                email_domain.virtual_host_id = virtual_host.id
                created_resources['email_domain'] = email_domain.id
                response_data['services_created'].append('Email Domain + Maildir')
                response_data['default_email'] = email_address
                response_data['email_password'] = email_password
                print(f"✓ Email domain and maildir for {email_address} created")
            
            # Create maildir structure
            maildir_path = f"{home_directory}/Maildir"
            try:
                os.makedirs(f"{maildir_path}/cur", exist_ok=True)
                os.makedirs(f"{maildir_path}/new", exist_ok=True)
                os.makedirs(f"{maildir_path}/tmp", exist_ok=True)
                # Set proper permissions
                if not linux_user_service.is_development:
                    import pwd
                    user_info = pwd.getpwnam(linux_username)
                    os.chown(maildir_path, user_info.pw_uid, user_info.pw_gid)
                    for subdir in ['cur', 'new', 'tmp']:
                        os.chown(f"{maildir_path}/{subdir}", user_info.pw_uid, user_info.pw_gid)
                print(f"✓ Maildir structure created at {maildir_path}")
            except Exception as e:
                print(f"Warning: Maildir structure creation failed: {e}")
                
        except Exception as e:
            print(f"Warning: Email domain creation failed: {e}")
            response_data['errors'].append(f"Email domain creation failed: {str(e)}")
            # ไม่ต้อง rollback ที่นี่ เพราะจะทำให้ virtual host record หายไป
            # ให้ดำเนินการขั้นตอนต่อไป และ commit ทุกอย่างในขั้นตอนสุดท้าย
            print(f"Continuing with other services despite email creation failure")
        
        response_data['steps_completed'].append('2. Maildir + email mapping created')
        
        # ขั้นตอนที่ 3: สร้างฐานข้อมูล + user
        print("Step 3: Creating MySQL database + user...")
        try:
            db_name, db_user, db_password = _create_mysql_database(domain, linux_username)
            if db_name:
                created_resources['database'] = {'name': db_name, 'user': db_user}
                response_data['services_created'].append('MySQL Database')
                response_data['database_name'] = db_name
                response_data['database_user'] = db_user
                response_data['database_password'] = db_password
                print(f"✓ MySQL database {db_name} created with user {db_user}")
        except Exception as e:
            print(f"Warning: MySQL database creation failed: {e}")
            response_data['errors'].append(f"MySQL database creation failed: {str(e)}")
        
        response_data['steps_completed'].append('3. MySQL database + user created')
        
        # ขั้นตอนที่ 4: ขอ SSL
        print("Step 4: Requesting SSL certificate...")
        if data.get('create_ssl', True):
            try:
                ssl_cert = ssl_service.request_certificate(domain)
                if ssl_cert:
                    created_resources['ssl_certificate'] = ssl_cert.id
                    response_data['services_created'].append('SSL Certificate')
                    response_data['ssl_status'] = 'requested'
                    print(f"✓ SSL certificate for {domain} requested")
            except Exception as e:
                print(f"Warning: SSL certificate request failed: {e}")
                response_data['errors'].append(f"SSL certificate request failed: {str(e)}")
        else:
            print("SSL certificate creation skipped")
        
        response_data['steps_completed'].append('4. SSL certificate requested')
        
        # ขั้นตอนที่ 5: บันทึกทั้งหมดในระบบ
        print("Step 5: Saving everything to database...")
        try:
            db.session.commit()
            print(f"✓ All database changes committed successfully for {domain}")
            response_data['steps_completed'].append('5. All data saved to database')
        except Exception as e:
            print(f"Database commit failed: {e}")
            raise Exception(f"Failed to save virtual host to database: {str(e)}")
        
        # Run auto-fix to ensure no PHP issues
        try:
            _auto_fix_virtual_host(virtual_host)
        except Exception as e:
            print(f"Warning: Auto-fix failed: {e}")
        
        # ตั้งสิทธิ์ไฟล์ใน public_html ให้ถูกต้อง
        _set_public_html_permissions(doc_root, linux_username)
        
        # Prepare success message
        services_count = len(response_data['services_created'])
        message = f'🎉 Virtual host created successfully for existing user!\n\n'
        message += f'📋 Summary:\n'
        message += f'   Domain: {domain}\n'
        message += f'   Linux User: {linux_username}\n'
        message += f'   Document Root: {doc_root}\n\n'
        
        if response_data.get('default_email'):
            message += f'📧 Email: {response_data["default_email"]} (Password: {response_data["email_password"]})\n'
        if response_data.get('database_name'):
            message += f'🗄️ Database: {response_data["database_name"]} (User: {response_data["database_user"]}, Password: {response_data["database_password"]})\n'
        if response_data.get('ftp_username'):
            if response_data.get('ftp_password') == '[existing]':
                message += f'📁 FTP/SFTP: {response_data["ftp_username"]} (Using existing account)\n'
            else:
                message += f'📁 FTP/SFTP: {response_data["ftp_username"]} (Password: {response_data["ftp_password"]})\n'
        
        message += f'\n✅ Services created ({services_count}): {", ".join(response_data["services_created"])}'
        
        if response_data['errors']:
            message += f'\n\n⚠️ Warnings: {len(response_data["errors"])} non-critical issues occurred'
        
        return jsonify({
            'success': True,
            'message': message,
            'data': response_data,
            'virtual_host_id': virtual_host.id
        }), 201
        
    except Exception as e:
        print(f"Error creating virtual host for existing user: {e}")
        
        # Cleanup on failure
        cleanup_errors = []
        
        # Cleanup database records
        if created_resources.get('virtual_host_id'):
            try:
                # ไม่ต้อง rollback ที่นี่ เพราะจะทำให้ virtual host record หายไป
                # ให้ลบ virtual host record โดยตรงแทน
                temp_vh = VirtualHost.query.get(created_resources['virtual_host_id'])
                if temp_vh:
                    db.session.delete(temp_vh)
                    db.session.commit()
            except Exception as cleanup_e:
                cleanup_errors.append(f"Database cleanup: {str(cleanup_e)}")
        
        # Cleanup DNS zone (external service)
        if created_resources.get('dns_zone'):
            try:
                # BIND cleanup if needed
                bind_service.delete_zone(domain)
            except Exception as cleanup_e:
                cleanup_errors.append(f"DNS cleanup: {str(cleanup_e)}")
        
        # Cleanup Nginx config
        if created_resources.get('nginx_config'):
            try:
                # Create a temporary virtual host object for cleanup
                temp_vh = type('obj', (object,), {'domain': created_resources['nginx_config']})
                nginx_service.delete_virtual_host(temp_vh)
            except Exception as cleanup_e:
                cleanup_errors.append(f"Nginx cleanup: {str(cleanup_e)}")
        
        error_message = str(e)
        if cleanup_errors:
            error_message += f"\n\nCleanup warnings: {'; '.join(cleanup_errors)}"
        
        return jsonify({
            'success': False,
            'error': error_message,
            'cleanup_performed': True,
            'cleanup_errors': cleanup_errors if cleanup_errors else None
        }), 500 
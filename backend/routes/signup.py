from flask import Blueprint, request, jsonify
from datetime import datetime

from models.database import db
from models.signup_meta import SignupMeta
from models.user import User
from utils.crypto import encrypt_text, decrypt_text
from utils.auth import token_required, admin_required
from services.user_service import UserService
from services.linux_user_service import LinuxUserService
from services.mysql_service import MySQLService
from services.virtual_host_service import VirtualHostService
from services.quota_service import QuotaService
from services.bind_service import BindService
from models.dns import DNSZone, DNSRecord
from models.virtual_host import VirtualHost, VirtualHostAlias
from models.email import EmailDomain
from config import Config
from utils.settings_util import get_dns_default_ip


signup_bp = Blueprint('signup', __name__)
user_service = UserService()
linux_service = LinuxUserService()
mysql_service = MySQLService()
vhost_service = VirtualHostService()
quota_service = QuotaService()
bind_service = BindService()


@signup_bp.route('/api/signup', methods=['POST'])
def submit_signup_request():
    data = request.get_json() or {}

    required = ['username', 'password', 'domain']
    for field in required:
        if not data.get(field):
            return jsonify({'error': f'Missing required field: {field}'}), 400

    # Reject if username already exists in app DB or as system user
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already exists'}), 409
    if linux_service.user_exists(data['username']):
        return jsonify({'error': 'System username already exists'}), 409

    # Normalize and validate domain uniqueness across the system
    domain = (data.get('domain') or '').strip().lower()
    if not domain:
        return jsonify({'error': 'Invalid domain'}), 400

    # Check if domain already exists in VirtualHost, Alias, EmailDomain, DNS Zone or pending signup requests
    domain_taken = (
        VirtualHost.query.filter_by(domain=domain).first()
        or VirtualHostAlias.query.filter_by(domain=domain).first()
        or EmailDomain.query.filter_by(domain=domain).first()
        or DNSZone.query.filter_by(domain_name=domain).first()
        or SignupMeta.query.filter(SignupMeta.domain == domain, SignupMeta.status == 'pending').first()
    )
    if domain_taken:
        return jsonify({'error': 'Domain already exists'}), 409

    try:
        # Create a minimal user record now; extra selections go to SignupMeta
        user = User(username=data['username'], email=data.get('email') or None, role='user')
        user.set_password(data['password'])
        db.session.add(user)
        db.session.flush()

        # Build options including requested services and requested defaults
        options_json = {
            'want_ssl': bool(data.get('want_ssl')),
            'want_dns': bool(data.get('want_dns')),
            'want_email': bool(data.get('want_email')),
            'want_mysql': bool(data.get('want_mysql')),
        }
        # Email account details (if email is requested)
        if data.get('want_email') and (data.get('email_username') or data.get('email_password')):
            options_json['email_account'] = {
                'username': (data.get('email_username') or '').strip(),
                'password': data.get('email_password') or None,
                'quota': data.get('email_quota', 1024)
            }
        # DB details
        if data.get('want_mysql') and (data.get('db_name') or data.get('db_username')):
            options_json['db_account'] = {
                'name': (data.get('db_name') or '').strip(),
                'username': (data.get('db_username') or '').strip(),
                'password': data.get('db_password') or None
            }
        # Optional requested defaults (email/db). These are just stored for admin review.
        if data.get('email_defaults'):
            options_json['email_defaults'] = {
                'username': (data['email_defaults'].get('username') or '').strip(),
                'quota': data['email_defaults'].get('quota'),
                # Do not store raw password if empty
                'password': data['email_defaults'].get('password') or None
            }
        if data.get('db_defaults'):
            options_json['db_defaults'] = {
                'name': (data['db_defaults'].get('name') or '').strip(),
                'username': (data['db_defaults'].get('username') or '').strip(),
                'password': data['db_defaults'].get('password') or None
            }

        meta = SignupMeta(
            user_id=user.id,
            domain=domain,
            full_name=(data.get('full_name') or None),
            server_password_enc=encrypt_text(data['password']),
            options_json=options_json,
            storage_quota_mb=data.get('storage_quota_mb')
        )
        db.session.add(meta)
        db.session.commit()
        # Enrich response with username/email for immediate UI use
        resp = meta.to_dict()
        resp['username'] = user.username
        resp['email'] = user.email
        return jsonify({'success': True, 'data': resp}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@signup_bp.route('/api/signup', methods=['GET'])
@token_required
@admin_required
def list_signup_requests(current_user):
    status = request.args.get('status')
    query = SignupMeta.query
    if status:
        query = query.filter_by(status=status)
    requests = query.order_by(SignupMeta.created_at.desc()).all()
    # Enrich each with username/email
    user_by_id = {u.id: u for u in User.query.filter(User.id.in_([r.user_id for r in requests])).all()} if requests else {}
    data = []
    for r in requests:
        d = r.to_dict()
        u = user_by_id.get(r.user_id)
        d['username'] = u.username if u else None
        d['email'] = u.email if u else None
        data.append(d)
    return jsonify({'success': True, 'data': data})


@signup_bp.route('/api/signup/<int:req_id>', methods=['PUT'])
@token_required
@admin_required
def update_signup_request(current_user, req_id):
    """Update a pending signup request."""
    req = SignupMeta.query.get_or_404(req_id)
    if req.status != 'pending':
        return jsonify({'error': 'Only pending requests can be edited'}), 400

    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    try:
        user = User.query.get(req.user_id)
        if not user:
            return jsonify({'error': 'User not found for this request'}), 404

        # Update user fields if present
        if 'username' in data and data['username'] != user.username:
            # Check for username conflicts
            if User.query.filter(User.username == data['username'], User.id != user.id).first() or \
               linux_service.user_exists(data['username']):
                return jsonify({'error': 'Username already exists'}), 409
            user.username = data['username']
        
        if 'email' in data:
            user.email = data['email']

        # Update meta fields if present
        if 'domain' in data:
            new_domain = (data.get('domain') or '').strip().lower()
            if not new_domain:
                return jsonify({'error': 'Invalid domain'}), 400
            if new_domain != (req.domain or '').lower():
                # Ensure domain is not taken elsewhere or by another pending request
                domain_taken = (
                    VirtualHost.query.filter_by(domain=new_domain).first()
                    or VirtualHostAlias.query.filter_by(domain=new_domain).first()
                    or EmailDomain.query.filter_by(domain=new_domain).first()
                    or DNSZone.query.filter_by(domain_name=new_domain).first()
                    or SignupMeta.query.filter(SignupMeta.id != req.id, SignupMeta.domain == new_domain, SignupMeta.status == 'pending').first()
                )
                if domain_taken:
                    return jsonify({'error': 'Domain already exists'}), 409
                req.domain = new_domain
        if 'full_name' in data:
            req.full_name = data['full_name']
        if 'storage_quota_mb' in data:
            req.storage_quota_mb = data['storage_quota_mb']
        
        # Update service options directly (for MyRequests.js compatibility)
        if 'want_ssl' in data or 'want_dns' in data or 'want_email' in data or 'want_mysql' in data:
            options = req.options_json or {}
            if 'want_ssl' in data:
                options['want_ssl'] = bool(data['want_ssl'])
            if 'want_dns' in data:
                options['want_dns'] = bool(data['want_dns'])
            if 'want_email' in data:
                options['want_email'] = bool(data['want_email'])
            if 'want_mysql' in data:
                options['want_mysql'] = bool(data['want_mysql'])
            req.options_json = options
        
        # Update service options in options_json
        if 'options' in data:
            options = req.options_json or {}
            options.update({
                'want_ssl': bool(data['options'].get('want_ssl', options.get('want_ssl'))),
                'want_dns': bool(data['options'].get('want_dns', options.get('want_dns'))),
                'want_email': bool(data['options'].get('want_email', options.get('want_email'))),
                'want_mysql': bool(data['options'].get('want_mysql', options.get('want_mysql'))),
            })
            # Email account updates
            if 'email_account' in data['options']:
                ea = data['options']['email_account'] or {}
                
                # Ensure email_account key exists to avoid errors
                if 'email_account' not in options:
                    options['email_account'] = {}
                
                # Update username if provided
                if 'username' in ea:
                    options['email_account']['username'] = (ea.get('username') or '').strip()
                
                # Update quota if provided
                if 'quota' in ea:
                    try:
                        # Use provided quota, fallback to existing, then to default
                        quota_val = ea.get('quota')
                        options['email_account']['quota'] = int(quota_val) if quota_val else (options.get('email_account', {}).get('quota', 1024))
                    except (ValueError, TypeError):
                        options['email_account']['quota'] = options.get('email_account', {}).get('quota', 1024)

                # Only update password if a new, non-empty password is provided
                if ea.get('password'):
                    options['email_account']['password'] = ea.get('password')
                
            # DB account updates
            if 'db_account' in data['options']:
                da = data['options']['db_account'] or {}
                options['db_account'] = {
                    'name': (da.get('name') or '').strip(),
                    'username': (da.get('username') or '').strip(),
                    'password': da.get('password') or None
                }
            # Optional defaults updates
            if 'email_defaults' in data['options']:
                ed = data['options']['email_defaults'] or {}
                options['email_defaults'] = {
                    'username': (ed.get('username') or '').strip(),
                    'quota': ed.get('quota'),
                    'password': ed.get('password') or None
                }
            if 'db_defaults' in data['options']:
                dd = data['options']['db_defaults'] or {}
                options['db_defaults'] = {
                    'name': (dd.get('name') or '').strip(),
                    'username': (dd.get('username') or '').strip(),
                    'password': dd.get('password') or None
                }
            req.options_json = options
        else:
            # Handle direct email account fields (for MyRequests.js compatibility)
            if 'email_username' in data or 'email_password' in data or 'email_quota' in data:
                options = req.options_json or {}
                if not options.get('email_account'):
                    options['email_account'] = {}
                if 'email_username' in data:
                    options['email_account']['username'] = (data.get('email_username') or '').strip()
                if 'email_password' in data:
                    options['email_account']['password'] = data.get('email_password') or None
                if 'email_quota' in data:
                    options['email_account']['quota'] = data.get('email_quota', 1024)
                req.options_json = options

        db.session.commit()
        
        # Enrich response with updated user details
        resp = req.to_dict()
        resp['username'] = user.username
        resp['email'] = user.email
        return jsonify({'success': True, 'data': resp})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@signup_bp.route('/api/signup/status', methods=['GET'])
def get_signup_status():
    username = request.args.get('username')
    if not username:
        return jsonify({'error': 'username is required'}), 400
    
    # Find user by username
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({'success': True, 'data': None}), 200
    
    # Get the latest signup meta for this user
    req = SignupMeta.query.filter_by(user_id=user.id).order_by(SignupMeta.created_at.desc()).first()
    if not req:
        return jsonify({'success': True, 'data': None}), 200
    d = req.to_dict()
    d['username'] = user.username
    d['email'] = user.email
    return jsonify({'success': True, 'data': d})


@signup_bp.route('/api/signup/my-requests', methods=['GET'])
@token_required
def get_my_requests(current_user):
    """Get all requests for the current user"""
    requests = SignupMeta.query.filter_by(user_id=current_user.id).order_by(SignupMeta.created_at.desc()).all()
    data = []
    for r in requests:
        d = r.to_dict()
        d['username'] = current_user.username
        d['email'] = current_user.email
        data.append(d)
    return jsonify({'success': True, 'data': data})


@signup_bp.route('/api/signup/additional', methods=['POST'])
@token_required
def submit_additional_request(current_user):
    """Submit additional request for existing user"""
    data = request.get_json() or {}
    
    required = ['domain']
    for field in required:
        if not data.get(field):
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    # Normalize and validate domain uniqueness across the system
    domain = (data.get('domain') or '').strip().lower()
    if not domain:
        return jsonify({'error': 'Invalid domain'}), 400

    # Allow using an existing domain if it belongs to the current user
    owned_vhost = VirtualHost.query.filter_by(domain=domain).first()
    owns_domain = bool(owned_vhost and (
        owned_vhost.user_id == current_user.id or owned_vhost.linux_username == current_user.username
    ))

    if not owns_domain:
        # Check if domain already used elsewhere or pending by someone else
        domain_taken = (
            VirtualHost.query.filter_by(domain=domain).first()
            or VirtualHostAlias.query.filter_by(domain=domain).first()
            or EmailDomain.query.filter_by(domain=domain).first()
            or DNSZone.query.filter_by(domain_name=domain).first()
            or SignupMeta.query.filter(
                SignupMeta.domain == domain,
                SignupMeta.status == 'pending',
                SignupMeta.user_id != current_user.id
            ).first()
        )
        if domain_taken:
            return jsonify({'error': 'Domain already exists'}), 409
    
    try:
        # Generate a server password for this additional request
        server_password = linux_service.generate_secure_password()
        
        # Build options including email account details
        options_json = {
            'want_ssl': bool(data.get('want_ssl')),
            'want_dns': bool(data.get('want_dns')),
            'want_email': bool(data.get('want_email')),
            'want_mysql': bool(data.get('want_mysql')),
        }
        # Email account details (if email is requested)
        if data.get('want_email') and (data.get('email_username') or data.get('email_password')):
            options_json['email_account'] = {
                'username': (data.get('email_username') or '').strip(),
                'password': data.get('email_password') or None,
                'quota': data.get('email_quota', 1024)
            }
        
        # DB details
        if data.get('want_mysql') and (data.get('db_name') or data.get('db_username')):
            options_json['db_account'] = {
                'name': (data.get('db_name') or '').strip(),
                'username': (data.get('db_username') or '').strip(),
                'password': data.get('db_password') or None
            }

        meta = SignupMeta(
            user_id=current_user.id,
            domain=domain,
            full_name=(data.get('full_name') or None),
            server_password_enc=encrypt_text(server_password),
            options_json=options_json,
            storage_quota_mb=data.get('storage_quota_mb')
        )
        db.session.add(meta)
        db.session.commit()
        d = meta.to_dict()
        d['username'] = current_user.username
        d['email'] = current_user.email
        return jsonify({'success': True, 'data': d}), 201
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@signup_bp.route('/api/signup/<int:req_id>/approve', methods=['POST'])
@token_required
@admin_required
def approve_signup_request(current_user, req_id):
    req = SignupMeta.query.get_or_404(req_id)
    if req.status != 'pending':
        return jsonify({'error': 'Request is not pending'}), 400

    try:
        # Optional override from request body (e.g., quota)
        body = request.get_json(silent=True) or {}

        # Create application user first (non-system), keep inactive until provisioning done
        user = User.query.get(req.user_id)
        if not user:
            return jsonify({'error': 'User not found for signup meta'}), 404

        # Allow admin to override requested quota at approval time
        if body.get('storage_quota_mb') is not None:
            try:
                req.storage_quota_mb = int(body.get('storage_quota_mb'))
            except Exception:
                pass

        # --- Smart Provisioning: Check for existing resources ---
        linux_user_exists = linux_service.user_exists(user.username)
        vhost_exists = VirtualHost.query.filter_by(domain=req.domain).first()

        # Create Linux system user only if it doesn't exist
        if not linux_user_exists:
            password_plain = decrypt_text(req.server_password_enc) if req.server_password_enc else ''
            success, message, _ = linux_service.create_user(user.username, req.domain or user.username, password_plain)
            if not success:
                db.session.rollback()
                return jsonify({'error': f'Linux user creation failed: {message}'}), 500
            user.is_system_user = True
            db.session.add(user)
        else:
            req.admin_comment = (req.admin_comment + ' | ' if req.admin_comment else '') + f"Linux user '{user.username}' exists."

        # MySQL: do not auto-provision on approval; Database.js UI will handle creation later
        if (req.options_json or {}).get('want_mysql'):
            try:
                # Record intent only; actual DB/user will be created via Database UI after approval
                note = 'MySQL requested (creation deferred to Database UI)'
                req.admin_comment = (req.admin_comment + ' | ' if req.admin_comment else '') + note
            except Exception:
                pass

        # Create Virtual Host only if it doesn't exist
        if not vhost_exists:
            try:
                if not req.domain:
                    raise Exception('Domain is required to create virtual host')
                domain_part = (req.domain.split('.')[0] or '').strip()
                safe_part = ''.join(c for c in domain_part if c.isalnum()) or user.username
                document_root = f"/home/{user.username}/{safe_part}/public_html"
                vhost_service.create_virtual_host({
                    'domain': req.domain,
                    'document_root': document_root,
                    'linux_username': user.username,
                    'user_id': user.id,
                    'php_version': '8.1',
                    'skip_email_provision': True if (req.options_json or {}).get('want_email') else False
                })
            except Exception as e:
                req.admin_comment = (req.admin_comment + ' | ' if req.admin_comment else '') + f"VHost create failed: {e}"
        else:
            req.admin_comment = (req.admin_comment + ' | ' if req.admin_comment else '') + f"VHost for '{req.domain}' exists."

        # Auto-provision MySQL database and user if details are provided
        opts = req.options_json or {}
        if opts.get('want_mysql') and opts.get('db_account'):
            db_account = opts['db_account']
            db_name = db_account.get('name')
            db_username = db_account.get('username')
            db_password = db_account.get('password')

            if db_name and db_username and db_password:
                try:
                    # Enforce db_ prefix for consistency
                    if not db_name.startswith('db_'):
                        db_name = f"db_{db_name}"

                    # 1. Create Database
                    mysql_service.create_database(name=db_name)
                    
                    # 2. Check if user exists, create if not
                    user_exists = mysql_service.user_exists(username=db_username, host='%')
                    if not user_exists:
                        mysql_service.create_user(username=db_username, password=db_password, host='%')
                    
                    # 3. Grant Privileges
                    mysql_service.grant_privileges(username=db_username, database=db_name, host='%')
                    
                    # 4. Save to app DB
                    from models.database import Database as AppDatabase, DatabaseUser
                    new_app_db = AppDatabase(name=db_name, db_type='mysql', owner_id=user.id, associated_domain=req.domain)
                    db.session.add(new_app_db)
                    db.session.flush()

                    new_db_user = DatabaseUser(database_id=new_app_db.id, username=db_username, host='%')
                    db.session.add(new_db_user)

                    req.admin_comment = (req.admin_comment + ' | ' if req.admin_comment else '') + f"DB '{db_name}' and user '{db_username}' created."

                except Exception as e:
                    req.admin_comment = (req.admin_comment + ' | ' if req.admin_comment else '') + f"DB creation failed: {e}"
            else:
                # Details not provided, defer to UI
                note = 'MySQL requested (creation deferred to Database UI)'
                req.admin_comment = (req.admin_comment + ' | ' if req.admin_comment else '') + note


        # Provision DNS zone (always)
        try:
            # Avoid duplicate zones
            existing_zone = DNSZone.query.filter_by(domain_name=req.domain).first()
            if not existing_zone:
                zone = DNSZone(
                    domain_name=req.domain,
                    serial=datetime.now().strftime('%Y%m%d%H'),
                    refresh=3600,
                    retry=1800,
                    expire=604800,
                    minimum=86400
                )
                db.session.add(zone)
                db.session.flush()

                default_ip = get_dns_default_ip()
                # Create full template records (match normal vhost creation)
                base_records = [
                    # NS
                    DNSRecord(zone_id=zone.id, name='@',   record_type='NS',    content=f"ns1.{zone.domain_name}.", ttl=3600, status='active'),
                    # ns1 A
                    DNSRecord(zone_id=zone.id, name='ns1', record_type='A',     content=default_ip,                   ttl=3600, status='active'),
                    # root A
                    DNSRecord(zone_id=zone.id, name='@',   record_type='A',     content=default_ip,                   ttl=3600, status='active'),
                    # www CNAME
                    DNSRecord(zone_id=zone.id, name='www', record_type='CNAME', content=f"{zone.domain_name}.",      ttl=3600, status='active'),
                    # MX + mail A
                    DNSRecord(zone_id=zone.id, name='@',   record_type='MX',    content=f"mail.{zone.domain_name}.", priority=10, ttl=3600, status='active'),
                    DNSRecord(zone_id=zone.id, name='mail',record_type='A',     content=default_ip,                   ttl=3600, status='active')
                ]

                for r in base_records:
                    db.session.add(r)

                # Create zone in BIND
                bind_service.create_zone(zone, nameserver_ip=default_ip)
        except Exception as e:
            req.admin_comment = (req.admin_comment + ' | ' if req.admin_comment else '') + f"DNS zone create failed: {e}"

        # Optional: set storage quota if provided (best-effort) and record result
        quota_mb = req.storage_quota_mb
        if quota_mb:
            try:
                applied = quota_service.set_user_quota(user.username, int(quota_mb))
                if not applied:
                    req.admin_comment = (
                        (req.admin_comment + ' | ' if req.admin_comment else '') +
                        f"Quota tool unavailable or device not found; requested {int(quota_mb)}MB"
                    )
            except Exception as e:
                # Not fatal; record comment
                req.admin_comment = (
                    (req.admin_comment + ' | ' if req.admin_comment else '') +
                    f"Quota set failed: {e}"
                )

        # Create email account if requested
        try:
            opts = req.options_json or {}
            if opts.get('want_email') and opts.get('email_account'):
                email_account = opts['email_account']
                if email_account.get('username') and email_account.get('password'):
                    # Import email service here to avoid circular imports
                    from services.email_service import EmailService
                    from models.email import EmailDomain
                    from services.maildb_reader import MailDbReader
                    import crypt
                    import secrets
                    
                    email_service = EmailService()
                    mail_db_reader = MailDbReader()
                    
                    # Ensure domain exists in mail database
                    mail_db_reader.upsert_domain(domain=req.domain, status='active')
                    
                    # Get or create EmailDomain
                    email_domain = EmailDomain.query.filter_by(domain=req.domain).first()
                    if not email_domain:
                        email_domain = EmailDomain(
                            domain=req.domain,
                            virtual_host_id=None,  # Will be updated later when VHost is created
                            status='active'
                        )
                        db.session.add(email_domain)
                        db.session.flush()
                    
                    # Create account in mail DB
                    full_email = f"{email_account['username']}@{req.domain}"
                    maildir = f"{req.domain}/{email_account['username']}/"
                    
                    # Build SHA-512-CRYPT password hash
                    salt = f"$6${secrets.token_hex(8)}"
                    hashed = crypt.crypt(email_account['password'], salt)
                    password_hash = f"{{SHA512-CRYPT}}{hashed}"
                    
                    mail_db_reader.upsert_user(
                        email=full_email,
                        maildir=maildir,
                        status='active',
                        quota=email_account.get('quota', 1024),
                        password_hash=password_hash
                    )
                    
                    # Also create account in email system (filesystem / Dovecot)
                    email_service.create_account(
                        email_account['username'],
                        req.domain,
                        email_account['password'],
                        quota=email_account.get('quota', 1024)
                    )

                    # Create account record in app DB to make it "managed"
                    from models.email import EmailAccount
                    from werkzeug.security import generate_password_hash
                    
                    app_db_account = EmailAccount(
                        domain_id=email_domain.id,
                        username=email_account['username'],
                        password=generate_password_hash(email_account['password']),
                        quota=email_account.get('quota', 1024)
                    )
                    db.session.add(app_db_account)
                    
                    req.admin_comment = (req.admin_comment + ' | ' if req.admin_comment else '') + f"Email account {full_email} created successfully"
        except Exception as e:
            # Not fatal; capture in admin comment for visibility
            req.admin_comment = (req.admin_comment + ' | ' if req.admin_comment else '') + f"Email account creation failed: {e}"

        # Grant domain-level permissions based on requested options (DNS always granted)
        try:
            opts = req.options_json or {}
            permissions = {
                'vhost': True,
                'dns': True,
                'ssl': bool(opts.get('want_ssl')),
                'email': bool(opts.get('want_email')),
                'database': bool(opts.get('want_mysql')),
            }
            if req.domain:
                user_service.set_domain_permissions(user.id, req.domain, permissions)
        except Exception as e:
            # Not fatal; capture in admin comment for visibility
            req.admin_comment = (req.admin_comment + ' | ' if req.admin_comment else '') + f"Permission grant failed: {e}"

        req.status = 'approved'
        req.approved_by = current_user.id
        req.approved_at = datetime.utcnow()
        db.session.commit()

        return jsonify({'success': True, 'data': req.to_dict()})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@signup_bp.route('/api/signup/<int:req_id>/reject', methods=['POST'])
@token_required
@admin_required
def reject_signup_request(current_user, req_id):
    req = SignupMeta.query.get_or_404(req_id)
    if req.status != 'pending':
        return jsonify({'error': 'Request is not pending'}), 400
    data = request.get_json() or {}
    comment = data.get('comment')

    req.status = 'rejected'
    req.admin_comment = comment
    req.approved_by = current_user.id
    req.approved_at = datetime.utcnow()
    db.session.commit()
    return jsonify({'success': True, 'data': req.to_dict()})
 



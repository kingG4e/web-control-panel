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

        meta = SignupMeta(
            user_id=user.id,
            domain=domain,
            full_name=(data.get('full_name') or None),
            server_password_enc=encrypt_text(data['password']),
            options_json={
                'want_ssl': bool(data.get('want_ssl')),
                'want_dns': bool(data.get('want_dns')),
                'want_email': bool(data.get('want_email')),
                'want_mysql': bool(data.get('want_mysql')),
            },
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
        
        # Update service options in options_json
        if 'options' in data:
            options = req.options_json or {}
            options.update({
                'want_ssl': bool(data['options'].get('want_ssl', options.get('want_ssl'))),
                'want_dns': bool(data['options'].get('want_dns', options.get('want_dns'))),
                'want_email': bool(data['options'].get('want_email', options.get('want_email'))),
                'want_mysql': bool(data['options'].get('want_mysql', options.get('want_mysql'))),
            })
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

    # Check if domain already used anywhere or in pending requests
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
        # Generate a server password for this additional request
        server_password = linux_service.generate_secure_password()
        
        meta = SignupMeta(
            user_id=current_user.id,
            domain=domain,
            full_name=(data.get('full_name') or None),
            server_password_enc=encrypt_text(server_password),
            options_json={
                'want_ssl': bool(data.get('want_ssl')),
                'want_dns': bool(data.get('want_dns')),
                'want_email': bool(data.get('want_email')),
                'want_mysql': bool(data.get('want_mysql')),
            },
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

        # Create Linux system user
        password_plain = decrypt_text(req.server_password_enc) if req.server_password_enc else ''
        # Use domain if provided for comment/home setup
        success, message, _ = linux_service.create_user(user.username, req.domain or user.username, password_plain)
        if not success:
            db.session.rollback()
            return jsonify({'error': f'Linux user creation failed: {message}'}), 500
        # Mark as system user for authentication and resource ownership
        try:
            user.is_system_user = True
            db.session.add(user)
        except Exception:
            pass

        # Provision MySQL database/user if requested
        if (req.options_json or {}).get('want_mysql'):
            try:
                db_name = f"{user.username}"
                mysql_service.create_database(db_name)
                mysql_service.create_user(user.username, password_plain)
                mysql_service.grant_privileges(user.username, db_name)
            except Exception as e:
                req.admin_comment = f"MySQL provisioning failed: {e}"

        # Create Virtual Host (required domain)
        try:
            if not req.domain:
                raise Exception('Domain is required to create virtual host')
            document_root = f"/home/{user.username}/public_html"
            vhost_service.create_virtual_host({
                'domain': req.domain,
                'document_root': document_root,
                'linux_username': user.username,
                'user_id': user.id,
                'php_version': None
            })
        except Exception as e:
            req.admin_comment = (req.admin_comment + ' | ' if req.admin_comment else '') + f"VHost create failed: {e}"

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
                # Create only essential records automatically
                base_records = [
                    DNSRecord(zone_id=zone.id, name='@',   record_type='NS',    content=f"ns1.{zone.domain_name}.", ttl=3600, status='active'),
                    DNSRecord(zone_id=zone.id, name='ns1', record_type='A',     content=default_ip,                   ttl=3600, status='active')
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
 



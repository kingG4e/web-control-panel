from flask import Blueprint, request, jsonify, current_app
from models.email import EmailDomain, EmailAccount, EmailForwarder, EmailAlias, db
from models.virtual_host import VirtualHost
from services.email_service import EmailService
from services.maildb_reader import MailDbReader
import crypt
import secrets
from utils.auth import token_required
from datetime import datetime
from sqlalchemy import or_
from werkzeug.security import generate_password_hash

email_bp = Blueprint('email', __name__)
email_service = EmailService()
mail_db_reader = MailDbReader()

@email_bp.route('/api/email/domains', methods=['GET'])
@token_required
def get_domains(current_user):
    """Get all email-capable domains for the current user.
    Returns existing EmailDomain records if present; otherwise returns
    stub entries for each VirtualHost accessible by the user so the UI can
    manage email even before a domain record exists.
    Access rules:
      - Admins see all virtual hosts
      - Regular users see VHosts they created (user_id) OR whose linux_username equals their username
    """
    try:
        # Determine accessible virtual hosts
        is_admin = (current_user.is_admin or current_user.role == 'admin' or current_user.username == 'root')
        if is_admin:
            virtual_hosts = VirtualHost.query.all()
        else:
            virtual_hosts = VirtualHost.query.filter(
                or_(
                    VirtualHost.user_id == current_user.id,
                    VirtualHost.linux_username == current_user.username
                )
            ).all()
        
        domain_names = [vh.domain for vh in virtual_hosts]
        domain_name_to_vh = {vh.domain: vh for vh in virtual_hosts}
        
        # Fetch existing EmailDomain rows for these domains
        email_domains = []
        if domain_names:
            email_domains = EmailDomain.query.filter(EmailDomain.domain.in_(domain_names)).all()
        existing_domains_by_name = {ed.domain: ed for ed in email_domains}
        
        result = []
        
        # Helper: build accounts for a domain from mail DB, enriching with local IDs if present
        def _build_accounts_for_domain(domain_name: str, email_domain_id: int | None) -> list:
            accounts_from_mail = []
            try:
                mail_users = mail_db_reader.fetch_users_by_domain(domain_name)
            except Exception as e:
                mail_users = []
            # Map: local accounts by username for ID/quota enrichment
            local_accounts_by_username = {}
            if email_domain_id:
                try:
                    local_accounts = EmailAccount.query.filter_by(domain_id=email_domain_id).all()
                    local_accounts_by_username = {la.username: la for la in local_accounts}
                except Exception:
                    local_accounts_by_username = {}
            for u in mail_users:
                email_addr = u.get('email') or ''
                username = email_addr.split('@')[0] if '@' in email_addr else email_addr
                local = local_accounts_by_username.get(username)
                quota_val = None
                if local and getattr(local, 'quota', None) is not None:
                    quota_val = local.quota
                elif u.get('quota') is not None:
                    try:
                        quota_val = int(u['quota'])
                    except Exception:
                        quota_val = None
                if quota_val is None:
                    quota_val = 1024
                accounts_from_mail.append({
                    'id': getattr(local, 'id', None) if local else None,
                    'username': username,
                    'email': email_addr,
                    'quota': quota_val,
                    'used_quota': getattr(local, 'used_quota', 0) if local else 0,
                    'status': u.get('status', 'active')
                })
            return accounts_from_mail

        # 1) Include existing EmailDomain data; accounts sourced from mail DB
        for domain in email_domains:
            domain_dict = domain.to_dict()
            # Ensure virtual_host_id is set (older rows may be null)
            if not domain_dict.get('virtual_host_id') and domain.domain in domain_name_to_vh:
                domain_dict['virtual_host_id'] = domain_name_to_vh[domain.domain].id
            # Accounts from mail DB
            domain_dict['accounts'] = _build_accounts_for_domain(domain.domain, domain.id)
            # Forwarders remain from local DB for now
            domain_dict.setdefault('forwarders', [fwd.to_dict() for fwd in domain.forwarders])
            result.append(domain_dict)
        
        # 2) Add stub entries for VirtualHosts that don't have EmailDomain yet
        for vh in virtual_hosts:
            if vh.domain not in existing_domains_by_name:
                result.append({
                    'id': None,
                    'domain': vh.domain,
                    'virtual_host_id': vh.id,
                    'status': 'active',
                    'created_at': vh.created_at.isoformat() if vh.created_at else None,
                    'updated_at': vh.updated_at.isoformat() if vh.updated_at else None,
                    # Accounts from mail DB even if no local EmailDomain row exists
                    'accounts': _build_accounts_for_domain(vh.domain, None),
                    'forwarders': []
                })
        
        # Sort for stable UI (by domain)
        result.sort(key=lambda d: d.get('domain', ''))
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@email_bp.route('/api/email/domains/<int:virtual_host_id>/accounts', methods=['GET'])
@token_required
def get_domain_accounts(current_user, virtual_host_id):
    """Get email accounts for a specific domain"""
    try:
        # Verify Virtual Host ownership
        virtual_host = VirtualHost.query.filter_by(id=virtual_host_id, user_id=current_user.id).first()
        if not virtual_host:
            return jsonify({'error': 'Virtual Host not found or access denied'}), 404
        
        # Get email domain (local row if exists for enrichment)
        email_domain = EmailDomain.query.filter_by(domain=virtual_host.domain).first()
        email_domain_id = email_domain.id if email_domain else None
        
        # Build accounts directly from mail DB
        accounts = []
        try:
            mail_users = mail_db_reader.fetch_users_by_domain(virtual_host.domain)
        except Exception:
            mail_users = []
        local_by_username = {}
        if email_domain_id:
            try:
                local_accounts = EmailAccount.query.filter_by(domain_id=email_domain_id).all()
                local_by_username = {la.username: la for la in local_accounts}
            except Exception:
                local_by_username = {}
        for u in mail_users:
            email_addr = u.get('email') or ''
            username = email_addr.split('@')[0] if '@' in email_addr else email_addr
            local = local_by_username.get(username)
            quota_val = None
            if local and getattr(local, 'quota', None) is not None:
                quota_val = local.quota
            elif u.get('quota') is not None:
                try:
                    quota_val = int(u['quota'])
                except Exception:
                    quota_val = None
            if quota_val is None:
                quota_val = 1024
            accounts.append({
                'id': getattr(local, 'id', None) if local else None,
                'username': username,
                'email': email_addr,
                'quota': quota_val,
                'used_quota': getattr(local, 'used_quota', 0) if local else 0,
                'status': u.get('status', 'active')
            })
        return jsonify(accounts)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@email_bp.route('/api/email/domains/<int:virtual_host_id>/accounts', methods=['POST'])
@token_required
def create_account(current_user, virtual_host_id):
    """Create email account for a Virtual Host domain"""
    try:
        # Verify Virtual Host ownership (admins can manage all; regular users limited)
        is_admin = (current_user.is_admin or current_user.role == 'admin' or current_user.username == 'root')
        if is_admin:
            virtual_host = VirtualHost.query.filter_by(id=virtual_host_id).first()
        else:
            virtual_host = VirtualHost.query.filter(
                VirtualHost.id == virtual_host_id,
                or_(
                    VirtualHost.user_id == current_user.id,
                    VirtualHost.linux_username == current_user.username
                )
            ).first()
        if not virtual_host:
            return jsonify({'error': 'Virtual Host not found or access denied'}), 404
        
        # Ensure domain exists in the mail database before proceeding.
        # This is a critical step.
        try:
            mail_db_reader.upsert_domain(domain=virtual_host.domain, status='active')
        except Exception as e:
            current_app.logger.error(f"Failed to upsert domain '{virtual_host.domain}' in mail DB: {e}")
            return jsonify({'error': 'Failed to provision domain in mail database', 'details': str(e)}), 500
        
        # Get or create EmailDomain
        email_domain = EmailDomain.query.filter_by(domain=virtual_host.domain).first()
        if not email_domain:
            email_domain = EmailDomain(
                domain=virtual_host.domain,
                virtual_host_id=virtual_host.id,
                status='active'
            )
            db.session.add(email_domain)
            db.session.flush()
        
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['username', 'password']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Check if account already exists (treat as idempotent; ensure mail DB has it)
        existing_account = EmailAccount.query.filter_by(
            domain_id=email_domain.id, 
            username=data['username']
        ).first()
        
        # Create account in mail DB (minimal schema)
        full_email = f"{data['username']}@{virtual_host.domain}"
        maildir = f"{virtual_host.domain}/{data['username']}/"
        try:
            # Build SHA-512-CRYPT password hash for mail DB password column
            salt = f"$6${secrets.token_hex(8)}"  # $6$ => SHA-512
            hashed = crypt.crypt(data['password'], salt)
            password_hash = f"{'{'}SHA512-CRYPT{'}'}{hashed}"
        except Exception:
            password_hash = None

        try:
            mail_db_reader.upsert_user(
                email=full_email,
                maildir=maildir,
                status='active',
                quota=data.get('quota', 1024),
                password_hash=password_hash
            )
        except Exception as e:
            # Surface the real reason to the client and log server-side
            try:
                current_app.logger.exception(f"Mail DB upsert failed for {full_email}: {e}")
            except Exception:
                pass
            return jsonify({'error': 'Mail DB write failed', 'details': str(e)}), 502

        # If already exists in app DB, return idempotent success with existing record
        if existing_account:
            return jsonify(existing_account.to_dict()), 200

        # Also create account in email system (filesystem / Dovecot) for compatibility
        try:
            email_service.create_account(
                data['username'],
                virtual_host.domain,
                data['password'],
                quota=data.get('quota', 1024)
            )
        except Exception as e:
            # Non-fatal if filesystem creation fails when minimal schema is in use
            current_app.logger.warning(f"Could not create email account on filesystem, but mail DB entry was created. Error: {e}")
        
        # Create account record
        account = EmailAccount(
            domain_id=email_domain.id,
            username=data['username'],
            password=generate_password_hash(data['password']),  # Note: In production, encrypt this
            quota=data.get('quota', 1024)
        )
        
        db.session.add(account)
        db.session.commit()
        
        return jsonify(account.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@email_bp.route('/api/email/accounts/<int:id>', methods=['PUT'])
@token_required
def update_account(current_user, id):
    """Update email account"""
    try:
        account = EmailAccount.query.get_or_404(id)
        
        # Verify ownership through Virtual Host
        email_domain = account.email_domain
        virtual_host = VirtualHost.query.filter_by(domain=email_domain.domain, user_id=current_user.id).first()
        if not virtual_host:
            return jsonify({'error': 'Access denied'}), 403
        
        data = request.get_json()
        
        # Update password if provided
        if 'password' in data and data['password']:
            email_service.update_account_password(
                account.username, 
                email_domain.domain, 
                data['password']
            )
            account.password = data['password']
            # Update password in mail DB if possible
            try:
                salt = f"$6${secrets.token_hex(8)}"
                hashed = crypt.crypt(data['password'], salt)
                password_hash = f"{'{'}SHA512-CRYPT{'}'}{hashed}"
                mail_db_reader.update_password(
                    email=f"{account.username}@{email_domain.domain}",
                    password_hash=password_hash
                )
            except Exception:
                pass
        
        # Update quota if provided
        if 'quota' in data:
            email_service.update_account_quota(
                account.username, 
                email_domain.domain, 
                data['quota']
            )
            account.quota = data['quota']
            # Reflect quota to mail DB if supported
            try:
                mail_db_reader.update_quota(
                    email=f"{account.username}@{email_domain.domain}",
                    quota=int(data['quota'])
                )
            except Exception:
                pass
        
        account.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify(account.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@email_bp.route('/api/email/accounts/<int:id>', methods=['DELETE'])
@token_required
def delete_account(current_user, id):
    """Delete email account"""
    try:
        account = EmailAccount.query.get_or_404(id)
        
        # Verify ownership through Virtual Host
        email_domain = account.email_domain
        virtual_host = VirtualHost.query.filter_by(domain=email_domain.domain, user_id=current_user.id).first()
        if not virtual_host:
            return jsonify({'error': 'Access denied'}), 403
        
        # Delete account from mail DB (minimal schema)
        try:
            mail_db_reader.delete_user(f"{account.username}@{email_domain.domain}")
        except Exception:
            pass

        # Delete account from email system
        try:
            email_service.delete_account(account.username, email_domain.domain)
        except Exception:
            pass
        
        # Delete from our database
        db.session.delete(account)
        db.session.commit()
        
        return '', 204
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500 


@email_bp.route('/api/email/domains/<int:virtual_host_id>/forwarders', methods=['POST'])
@token_required
def create_forwarder(current_user, virtual_host_id):
    """Create an email forwarder (alias) for a Virtual Host domain"""
    try:
        # Verify Virtual Host ownership
        virtual_host = VirtualHost.query.filter_by(id=virtual_host_id, user_id=current_user.id).first()
        if not virtual_host:
            return jsonify({'error': 'Virtual Host not found or access denied'}), 404

        # Ensure EmailDomain exists
        email_domain = EmailDomain.query.filter_by(domain=virtual_host.domain).first()
        if not email_domain:
            email_domain = EmailDomain(
                domain=virtual_host.domain,
                virtual_host_id=virtual_host.id,
                status='active'
            )
            db.session.add(email_domain)
            db.session.flush()

        data = request.get_json() or {}
        source = (data.get('source') or '').strip()
        destination = (data.get('destination') or '').strip()

        if not source or not destination:
            return jsonify({'error': 'Missing required fields: source, destination'}), 400

        # Validate destination is full email
        if '@' not in destination:
            return jsonify({'error': 'Destination must be a full email address'}), 400

        # Prevent duplicates (per domain + source)
        existing = EmailForwarder.query.filter_by(domain_id=email_domain.id, source=source).first()
        if existing:
            return jsonify({'error': 'Forwarder already exists for this source'}), 400

        # Create in mail system
        email_service.create_forwarder(source, destination, virtual_host.domain)

        # Persist in DB
        fwd = EmailForwarder(
            domain_id=email_domain.id,
            source=source,
            destination=destination,
            status='active'
        )
        db.session.add(fwd)
        db.session.commit()

        return jsonify(fwd.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@email_bp.route('/api/email/forwarders/<int:id>', methods=['DELETE'])
@token_required
def delete_forwarder(current_user, id):
    """Delete an email forwarder (alias)"""
    try:
        fwd = EmailForwarder.query.get_or_404(id)

        # Verify ownership via Virtual Host
        email_domain = fwd.email_domain
        virtual_host = VirtualHost.query.filter_by(domain=email_domain.domain, user_id=current_user.id).first()
        if not virtual_host:
            return jsonify({'error': 'Access denied'}), 403

        # Delete from mail system
        email_service.delete_forwarder(fwd.source, email_domain.domain)

        # Delete from DB
        db.session.delete(fwd)
        db.session.commit()

        return '', 204
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@email_bp.route('/api/email/accounts/<int:id>/quota', methods=['GET'])
@token_required
def refresh_quota(current_user, id):
    """Refresh and return current quota usage for an email account (in MB)"""
    try:
        account = EmailAccount.query.get_or_404(id)

        # Verify ownership via Virtual Host
        email_domain = account.email_domain
        virtual_host = VirtualHost.query.filter_by(domain=email_domain.domain, user_id=current_user.id).first()
        if not virtual_host:
            return jsonify({'error': 'Access denied'}), 403

        # Calculate usage and persist
        used_mb = email_service.get_quota_usage(account.username, email_domain.domain)
        account.used_quota = used_mb
        account.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({'used_quota': used_mb, 'quota': account.quota, 'account': account.to_dict()})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
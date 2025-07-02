from flask import Blueprint, request, jsonify
from models.email import EmailDomain, EmailAccount, EmailForwarder, EmailAlias, db
from models.virtual_host import VirtualHost
from services.email_service import EmailService
from utils.auth import token_required
from datetime import datetime

email_bp = Blueprint('email', __name__)
email_service = EmailService()

@email_bp.route('/api/email/domains', methods=['GET'])
@token_required
def get_domains(current_user):
    """Get all email domains for the current user"""
    try:
        # Get user's virtual hosts
        virtual_hosts = VirtualHost.query.filter_by(user_id=current_user.id).all()
        domain_names = [vh.domain for vh in virtual_hosts]
        
        # Get email domains for these virtual hosts
        email_domains = EmailDomain.query.filter(EmailDomain.domain.in_(domain_names)).all()
        
        # Include accounts for each domain
        result = []
        for domain in email_domains:
            domain_dict = domain.to_dict()
            domain_dict['accounts'] = [account.to_dict() for account in domain.accounts]
            result.append(domain_dict)
        
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
        
        # Get email domain
        email_domain = EmailDomain.query.filter_by(domain=virtual_host.domain).first()
        if not email_domain:
            return jsonify([])
        
        # Get accounts
        accounts = EmailAccount.query.filter_by(domain_id=email_domain.id).all()
        return jsonify([account.to_dict() for account in accounts])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@email_bp.route('/api/email/domains/<int:virtual_host_id>/accounts', methods=['POST'])
@token_required
def create_account(current_user, virtual_host_id):
    """Create email account for a Virtual Host domain"""
    try:
        # Verify Virtual Host ownership
        virtual_host = VirtualHost.query.filter_by(id=virtual_host_id, user_id=current_user.id).first()
        if not virtual_host:
            return jsonify({'error': 'Virtual Host not found or access denied'}), 404
        
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
        
        # Check if account already exists
        existing_account = EmailAccount.query.filter_by(
            domain_id=email_domain.id, 
            username=data['username']
        ).first()
        if existing_account:
            return jsonify({'error': 'Email account already exists'}), 400
        
        # Create account in email system
        email_service.create_account(
            data['username'],
            virtual_host.domain,
            data['password'],
            quota=data.get('quota', 1024)
        )
        
        # Create account record
        account = EmailAccount(
            domain_id=email_domain.id,
            username=data['username'],
            password=data['password'],  # Note: In production, encrypt this
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
        
        # Update quota if provided
        if 'quota' in data:
            email_service.update_account_quota(
                account.username, 
                email_domain.domain, 
                data['quota']
            )
            account.quota = data['quota']
        
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
        
        # Delete account from email system
        email_service.delete_account(account.username, email_domain.domain)
        
        # Delete from our database
        db.session.delete(account)
        db.session.commit()
        
        return '', 204
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500 
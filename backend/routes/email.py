from flask import Blueprint, request, jsonify
from models.email import EmailDomain, EmailAccount, EmailForwarder, EmailAlias, db
from services.email_service import EmailService
from datetime import datetime

email_bp = Blueprint('email', __name__)
email_service = EmailService()

@email_bp.route('/api/email/domains', methods=['GET'])
def get_domains():
    domains = EmailDomain.query.all()
    return jsonify([domain.to_dict() for domain in domains])

@email_bp.route('/api/email/domains/<int:id>', methods=['GET'])
def get_domain(id):
    domain = EmailDomain.query.get_or_404(id)
    return jsonify(domain.to_dict())

@email_bp.route('/api/email/domains', methods=['POST'])
def create_domain():
    data = request.get_json()
    
    # Validate required fields
    if 'domain' not in data:
        return jsonify({'error': 'Missing required field: domain'}), 400
    
    try:
        # Create domain in Postfix
        email_service.create_domain(data['domain'])
        
        # Create domain record
        domain = EmailDomain(
            domain=data['domain']
        )
        
        db.session.add(domain)
        db.session.commit()
        
        return jsonify(domain.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@email_bp.route('/api/email/domains/<int:id>/accounts', methods=['POST'])
def create_account(id):
    domain = EmailDomain.query.get_or_404(id)
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['username', 'password']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    try:
        # Create account in Postfix/Dovecot
        email_service.create_account(
            data['username'],
            domain.domain,
            data['password'],
            quota=data.get('quota', 1024)
        )
        
        # Create account record
        account = EmailAccount(
            domain_id=domain.id,
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

@email_bp.route('/api/email/domains/<int:id>/forwarders', methods=['POST'])
def create_forwarder(id):
    domain = EmailDomain.query.get_or_404(id)
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['source', 'destination']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    try:
        # Create forwarder in Postfix
        email_service.create_forwarder(
            data['source'],
            data['destination'],
            domain.domain
        )
        
        # Create forwarder record
        forwarder = EmailForwarder(
            domain_id=domain.id,
            source=data['source'],
            destination=data['destination']
        )
        
        db.session.add(forwarder)
        db.session.commit()
        
        return jsonify(forwarder.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@email_bp.route('/api/email/accounts/<int:id>/aliases', methods=['POST'])
def create_alias(id):
    account = EmailAccount.query.get_or_404(id)
    data = request.get_json()
    
    # Validate required fields
    if 'alias' not in data:
        return jsonify({'error': 'Missing required field: alias'}), 400
    
    try:
        # Create alias in Postfix
        email_service.create_alias(
            data['alias'],
            account.get_email()
        )
        
        # Create alias record
        alias = EmailAlias(
            account_id=account.id,
            alias=data['alias']
        )
        
        db.session.add(alias)
        db.session.commit()
        
        return jsonify(alias.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@email_bp.route('/api/email/domains/<int:id>', methods=['DELETE'])
def delete_domain(id):
    domain = EmailDomain.query.get_or_404(id)
    
    try:
        # Delete domain from Postfix
        email_service.delete_domain(domain.domain)
        
        # Delete from our database
        db.session.delete(domain)
        db.session.commit()
        
        return '', 204
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@email_bp.route('/api/email/accounts/<int:id>', methods=['DELETE'])
def delete_account(id):
    account = EmailAccount.query.get_or_404(id)
    domain = account.email_domain
    
    try:
        # Delete account from Postfix/Dovecot
        email_service.delete_account(account.username, domain.domain)
        
        # Delete from our database
        db.session.delete(account)
        db.session.commit()
        
        return '', 204
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@email_bp.route('/api/email/forwarders/<int:id>', methods=['DELETE'])
def delete_forwarder(id):
    forwarder = EmailForwarder.query.get_or_404(id)
    domain = forwarder.email_domain
    
    try:
        # Delete forwarder from Postfix
        email_service.delete_forwarder(forwarder.source, domain.domain)
        
        # Delete from our database
        db.session.delete(forwarder)
        db.session.commit()
        
        return '', 204
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@email_bp.route('/api/email/aliases/<int:id>', methods=['DELETE'])
def delete_alias(id):
    alias = EmailAlias.query.get_or_404(id)
    
    try:
        # Delete alias from Postfix
        email_service.delete_alias(alias.alias)
        
        # Delete from our database
        db.session.delete(alias)
        db.session.commit()
        
        return '', 204
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@email_bp.route('/api/email/accounts/<int:id>/quota', methods=['GET'])
def get_quota_usage(id):
    account = EmailAccount.query.get_or_404(id)
    domain = account.email_domain
    
    try:
        # Get quota usage from filesystem
        used_quota = email_service.get_quota_usage(account.username, domain.domain)
        
        # Update account record
        account.used_quota = used_quota
        db.session.commit()
        
        return jsonify({
            'quota': account.quota,
            'used_quota': used_quota,
            'available_quota': account.quota - used_quota
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500 
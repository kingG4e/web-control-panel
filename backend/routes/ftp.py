from flask import Blueprint, request, jsonify
from services.ftp_service import FTPService
from services.user_service import UserService
from models.ftp import FTPAccount
from functools import wraps

ftp_bp = Blueprint('ftp', __name__)
ftp_service = FTPService()
user_service = UserService()

def permission_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Get domain from request
        data = request.get_json() or {}
        domain = data.get('domain') or request.args.get('domain')
        
        if not domain:
            return jsonify({'error': 'Domain is required'}), 400
            
        # Check if user has FTP management permission for this domain
        if not user_service.check_permission(1, domain, 'ftp', 'manage'):  # TODO: Get actual user_id from session
            return jsonify({'error': 'Permission denied'}), 403
            
        return f(*args, **kwargs)
    return decorated_function

# FTP Account Management Routes
@ftp_bp.route('/api/ftp/accounts', methods=['GET'])
@permission_required
def get_accounts():
    domain = request.args.get('domain')
    accounts = ftp_service.get_accounts_by_domain(domain)
    return jsonify([account.to_dict() for account in accounts])

@ftp_bp.route('/api/ftp/accounts/<int:id>', methods=['GET'])
@permission_required
def get_account(id):
    account = FTPAccount.query.get_or_404(id)
    return jsonify(account.to_dict())

@ftp_bp.route('/api/ftp/accounts', methods=['POST'])
@permission_required
def create_account():
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['username', 'password', 'home_directory', 'domain', 'user_id']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    try:
        account = ftp_service.create_account(data)
        return jsonify(account.to_dict()), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ftp_bp.route('/api/ftp/accounts/<int:id>', methods=['PUT'])
@permission_required
def update_account(id):
    data = request.get_json()
    
    try:
        account = ftp_service.update_account(id, data)
        if not account:
            return jsonify({'error': 'Account not found'}), 404
        return jsonify(account.to_dict())
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ftp_bp.route('/api/ftp/accounts/<int:id>', methods=['DELETE'])
@permission_required
def delete_account(id):
    if ftp_service.delete_account(id):
        return '', 204
    return jsonify({'error': 'Account not found'}), 404

# Access Rule Management Routes
@ftp_bp.route('/api/ftp/accounts/<int:id>/rules', methods=['POST'])
@permission_required
def add_access_rule(id):
    data = request.get_json()
    
    if 'directory_path' not in data or 'permissions' not in data:
        return jsonify({'error': 'Missing required fields: directory_path and permissions'}), 400
    
    try:
        rule = ftp_service.add_access_rule(id, data)
        if not rule:
            return jsonify({'error': 'Account not found'}), 404
        return jsonify(rule.to_dict()), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ftp_bp.route('/api/ftp/rules/<int:id>', methods=['DELETE'])
@permission_required
def remove_access_rule(id):
    if ftp_service.remove_access_rule(id):
        return '', 204
    return jsonify({'error': 'Rule not found'}), 404

# User's FTP Accounts
@ftp_bp.route('/api/users/<int:user_id>/ftp/accounts', methods=['GET'])
@permission_required
def get_user_accounts(user_id):
    accounts = ftp_service.get_accounts_by_user(user_id)
    return jsonify([account.to_dict() for account in accounts]) 
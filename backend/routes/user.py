from flask import Blueprint, request, jsonify
from services.user_service import UserService
from models.user import User, Role, Permission
from functools import wraps

user_bp = Blueprint('user', __name__)
user_service = UserService()

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # TODO: Get current user from session/token
        current_user = User.query.get(1)  # Temporary for development
        if not current_user or not current_user.is_admin:
            return jsonify({'error': 'Admin privileges required'}), 403
        return f(*args, **kwargs)
    return decorated_function

def permission_required(resource_type, action):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # TODO: Get current user from session/token
            current_user = User.query.get(1)  # Temporary for development
            domain = request.args.get('domain')
            
            if not current_user:
                return jsonify({'error': 'Authentication required'}), 401
                
            if not user_service.check_permission(current_user.id, domain, resource_type, action):
                return jsonify({'error': 'Permission denied'}), 403
                
            return f(*args, **kwargs)
        return decorated_function
    return decorator

# User Management Routes
@user_bp.route('/api/users', methods=['GET'])
@admin_required
def get_users():
    users = User.query.all()
    return jsonify([user.to_dict() for user in users])

@user_bp.route('/api/users/<int:id>', methods=['GET'])
@admin_required
def get_user(id):
    user = User.query.get_or_404(id)
    return jsonify(user.to_dict())

@user_bp.route('/api/users', methods=['POST'])
@admin_required
def create_user():
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['username', 'email', 'password']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    try:
        user = user_service.create_user(data)
        return jsonify(user.to_dict()), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@user_bp.route('/api/users/<int:id>', methods=['PUT'])
@admin_required
def update_user(id):
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
def delete_user(id):
    if user_service.delete_user(id):
        return '', 204
    return jsonify({'error': 'User not found'}), 404

# Role Management Routes
@user_bp.route('/api/roles', methods=['GET'])
@admin_required
def get_roles():
    roles = Role.query.all()
    return jsonify([role.to_dict() for role in roles])

@user_bp.route('/api/roles', methods=['POST'])
@admin_required
def create_role():
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
def update_role(id):
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
def delete_role(id):
    if user_service.delete_role(id):
        return '', 204
    return jsonify({'error': 'Role not found'}), 404

# Permission Management Routes
@user_bp.route('/api/permissions', methods=['GET'])
@admin_required
def get_permissions():
    permissions = Permission.query.all()
    return jsonify([perm.to_dict() for perm in permissions])

@user_bp.route('/api/permissions', methods=['POST'])
@admin_required
def create_permission():
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
def get_user_permissions(id):
    permissions = user_service.get_user_permissions(id)
    return jsonify(permissions)

@user_bp.route('/api/users/<int:id>/domain-permissions', methods=['POST'])
@admin_required
def set_domain_permissions(id):
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
def remove_domain_permissions(id, domain):
    if user_service.remove_domain_permissions(id, domain):
        return '', 204
    return jsonify({'error': 'Domain permission not found'}), 404 
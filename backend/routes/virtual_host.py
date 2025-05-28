from flask import Blueprint, request, jsonify
from models.virtual_host import VirtualHost, db
from services.apache_service import ApacheService

virtual_host_bp = Blueprint('virtual_host', __name__)
apache_service = ApacheService()

@virtual_host_bp.route('/api/virtual-hosts', methods=['GET'])
def get_virtual_hosts():
    virtual_hosts = VirtualHost.query.all()
    return jsonify([vh.to_dict() for vh in virtual_hosts])

@virtual_host_bp.route('/api/virtual-hosts', methods=['POST'])
def create_virtual_host():
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['domain_name', 'document_root']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    # Create virtual host in database
    virtual_host = VirtualHost(
        domain_name=data['domain_name'],
        document_root=data['document_root'],
        server_admin=data.get('server_admin')
    )
    
    try:
        # Create Apache configuration
        apache_service.create_virtual_host(virtual_host)
        
        # Save to database
        db.session.add(virtual_host)
        db.session.commit()
        
        return jsonify(virtual_host.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@virtual_host_bp.route('/api/virtual-hosts/<int:id>', methods=['DELETE'])
def delete_virtual_host(id):
    virtual_host = VirtualHost.query.get_or_404(id)
    
    try:
        # Remove Apache configuration
        apache_service.delete_virtual_host(virtual_host)
        
        # Remove from database
        db.session.delete(virtual_host)
        db.session.commit()
        
        return '', 204
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500 
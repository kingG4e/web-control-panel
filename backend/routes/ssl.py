from flask import Blueprint, request, jsonify
from models.ssl_certificate import SSLCertificate, SSLCertificateLog, db
from services.ssl_service import SSLService
from datetime import datetime

ssl_bp = Blueprint('ssl', __name__)
ssl_service = SSLService()

@ssl_bp.route('/api/ssl/certificates', methods=['GET'])
def get_certificates():
    try:
        certificates = SSLCertificate.query.all()
        return jsonify([cert.to_dict() for cert in certificates])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ssl_bp.route('/api/ssl/certificates/<int:id>', methods=['GET'])
def get_certificate(id):
    certificate = SSLCertificate.query.get_or_404(id)
    return jsonify(certificate.to_dict())

@ssl_bp.route('/api/ssl/certificates', methods=['POST'])
def create_certificate():
    data = request.get_json()
    
    # Validate required fields
    if 'domain' not in data:
        return jsonify({'error': 'Missing required field: domain'}), 400
    
    try:
        # Check if certificate already exists
        existing_cert = SSLCertificate.query.filter_by(domain=data['domain']).first()
        if existing_cert:
            return jsonify({'error': 'Certificate already exists for this domain'}), 400
        
        # Get document root for the domain
        document_root = None
        if 'document_root' in data:
            document_root = data['document_root']
        else:
            # Try to get document root from virtual host
            from models.virtual_host import VirtualHost
            virtual_host = VirtualHost.query.filter_by(domain=data['domain']).first()
            if virtual_host:
                document_root = virtual_host.document_root
        
        # Issue certificate using SSL service
        cert_info = ssl_service.issue_certificate(
            domain=data['domain'], 
            document_root=document_root
        )
        
        certificate = SSLCertificate(
            domain=data['domain'],
            certificate_path=cert_info['certificate_path'],
            private_key_path=cert_info['private_key_path'],
            chain_path=cert_info['chain_path'],
            issuer=cert_info['issuer'],
            valid_from=cert_info['valid_from'],
            valid_until=cert_info['valid_until'],
            auto_renewal=data.get('auto_renewal', True),
            status='active'
        )
        
        # Create log entry
        log = SSLCertificateLog(
            certificate=certificate,
            action='issue',
            status='success',
            message='Certificate issued successfully'
        )
        
        db.session.add(certificate)
        db.session.add(log)
        db.session.commit()
        
        return jsonify(certificate.to_dict()), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@ssl_bp.route('/api/ssl/certificates/<int:id>/renew', methods=['POST'])
def renew_certificate(id):
    certificate = SSLCertificate.query.get_or_404(id)
    
    try:
        # Renew certificate
        cert_info = ssl_service.renew_certificate(certificate.domain)
        
        # Update certificate record
        certificate.valid_from = cert_info['valid_from']
        certificate.valid_until = cert_info['valid_until']
        certificate.updated_at = datetime.utcnow()
        
        # Create log entry
        log = SSLCertificateLog(
            certificate=certificate,
            action='renew',
            status='success',
            message='Certificate renewed successfully'
        )
        
        db.session.add(log)
        db.session.commit()
        
        return jsonify(certificate.to_dict())
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@ssl_bp.route('/api/ssl/certificates/<int:id>', methods=['DELETE'])
def delete_certificate(id):
    try:
        certificate = SSLCertificate.query.get_or_404(id)
        
        # For development/testing - just delete the record
        # In production, this would call ssl_service.revoke_certificate()
        
        # Delete related logs first to avoid foreign key constraint issues
        SSLCertificateLog.query.filter_by(certificate_id=id).delete()
        
        # Then delete the certificate
        db.session.delete(certificate)
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Certificate deleted successfully'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@ssl_bp.route('/api/ssl/certificates/<int:id>/logs', methods=['GET'])
def get_certificate_logs(id):
    certificate = SSLCertificate.query.get_or_404(id)
    return jsonify([log.to_dict() for log in certificate.logs]) 
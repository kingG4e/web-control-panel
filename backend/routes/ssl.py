from flask import Blueprint, request, jsonify
from models.ssl_certificate import SSLCertificate, SSLCertificateLog, db
from services.ssl_service import SSLService
from datetime import datetime
from utils.auth import permission_required

ssl_bp = Blueprint('ssl', __name__)
ssl_service = SSLService()


def _is_admin(user):
    return bool(getattr(user, 'is_admin', False) or getattr(user, 'role', '') == 'admin' or getattr(user, 'username', '') == 'root')


def _user_domains(current_user):
    from models.virtual_host import VirtualHost
    if _is_admin(current_user):
        return None  # Admin sees all domains
    vhosts = VirtualHost.query.filter(
        (VirtualHost.user_id == current_user.id) | (VirtualHost.linux_username == current_user.username)
    ).all()
    return [vh.domain for vh in vhosts]

@ssl_bp.route('/api/ssl/certificates', methods=['GET'])
@permission_required('ssl', 'read')
def get_certificates(current_user):
    try:
        domains = _user_domains(current_user)
        if domains is None:
            certificates = SSLCertificate.query.all()
        else:
            certificates = SSLCertificate.query.filter(SSLCertificate.domain.in_(domains)).all()
        return jsonify([cert.to_dict() for cert in certificates])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ssl_bp.route('/api/ssl/certificates/<int:id>', methods=['GET'])
@permission_required('ssl', 'read')
def get_certificate(current_user, id):
    certificate = SSLCertificate.query.get_or_404(id)
    domains = _user_domains(current_user)
    if domains is not None and certificate.domain not in domains:
        return jsonify({'error': 'Access denied'}), 403
    return jsonify(certificate.to_dict())

@ssl_bp.route('/api/ssl/certificates', methods=['POST'])
@permission_required('ssl', 'create')
def create_certificate(current_user):
    data = request.get_json()
    
    # Validate required fields
    if 'domain' not in data:
        return jsonify({'error': 'Missing required field: domain'}), 400
    if not isinstance(data['domain'], str) or not data['domain'].strip():
        return jsonify({'error': 'Invalid domain value'}), 400
    
    # Ownership check: domain must belong to the user (by vhost)
    domains = _user_domains(current_user)
    if domains is not None and data['domain'] not in domains:
        return jsonify({'error': 'Access denied'}), 403
    
    try:
        # Check if certificate already exists
        existing_cert = SSLCertificate.query.filter_by(domain=data['domain']).first()
        if existing_cert:
            return jsonify({'error': 'Certificate already exists for this domain'}), 400
        
        # Get document root for the domain
        document_root = None
        if 'document_root' in data and data['document_root']:
            document_root = data['document_root']
        else:
            # Try to get document root from virtual host
            from models.virtual_host import VirtualHost
            virtual_host = VirtualHost.query.filter_by(domain=data['domain']).first()
            if virtual_host:
                document_root = virtual_host.document_root
            else:
                return jsonify({'error': 'Document root not provided and virtual host not found for this domain'}), 400

        # Validate document root exists
        try:
            import os as _os
            if not _os.path.isdir(document_root):
                return jsonify({'error': f'Document root not found: {document_root}'}), 400
        except Exception:
            return jsonify({'error': f'Cannot access document root: {document_root}'}), 400
        
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
        
        # Best-effort: configure Nginx SSL for the domain
        try:
            ssl_service.configure_nginx_ssl(
                domain=data['domain'],
                certificate_path=cert_info['certificate_path'],
                private_key_path=cert_info['private_key_path'],
                document_root=document_root,
            )
        except Exception as e:
            print(f"Warning: Nginx SSL configuration failed for {data['domain']}: {str(e)}")
        
        db.session.commit()
        
        return jsonify(certificate.to_dict()), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@ssl_bp.route('/api/ssl/certificates/<int:id>/renew', methods=['POST'])
@permission_required('ssl', 'update')
def renew_certificate(current_user, id):
    certificate = SSLCertificate.query.get_or_404(id)
    domains = _user_domains(current_user)
    if domains is not None and certificate.domain not in domains:
        return jsonify({'error': 'Access denied'}), 403
    
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
@permission_required('ssl', 'delete')
def delete_certificate(current_user, id):
    try:
        certificate = SSLCertificate.query.get_or_404(id)
        domains = _user_domains(current_user)
        if domains is not None and certificate.domain not in domains:
            return jsonify({'error': 'Access denied'}), 403
        
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
@permission_required('ssl', 'read')
def get_certificate_logs(current_user, id):
    certificate = SSLCertificate.query.get_or_404(id)
    domains = _user_domains(current_user)
    if domains is not None and certificate.domain not in domains:
        return jsonify({'error': 'Access denied'}), 403
    return jsonify([log.to_dict() for log in certificate.logs])

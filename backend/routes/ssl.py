from flask import Blueprint, request, jsonify
from models.ssl_certificate import SSLCertificate, SSLCertificateLog, db
from services.ssl_service import SSLService
from datetime import datetime
from utils.auth import permission_required

ssl_bp = Blueprint('ssl', __name__)
ssl_service = SSLService()


def _is_admin(user):
    """ตรวจสอบว่า User เป็น Admin หรือไม่"""
    return bool(getattr(user, 'is_admin', False) or getattr(user, 'role', '') == 'admin' or getattr(user, 'username', '') == 'root')


def _user_domains(current_user):
    """ดึงรายชื่อโดเมนที่ User มีสิทธิ์จัดการ"""
    from models.virtual_host import VirtualHost
    if _is_admin(current_user):
        return None  # Admin จัดการได้ทุกโดเมน
    vhosts = VirtualHost.query.filter(
        (VirtualHost.user_id == current_user.id) | (VirtualHost.linux_username == current_user.username)
    ).all()
    return [vh.domain for vh in vhosts]

@ssl_bp.route('/api/ssl/certificates', methods=['GET'])
@permission_required('ssl', 'read')
def get_certificates(current_user):
    """ดึงรายชื่อใบเซอร์ทั้งหมด (ตามสิทธิ์)"""
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
    """ดูรายละเอียดใบเซอร์รายตัว"""
    certificate = SSLCertificate.query.get_or_404(id)
    domains = _user_domains(current_user)
    if domains is not None and certificate.domain not in domains:
        return jsonify({'error': 'Access denied'}), 403
    return jsonify(certificate.to_dict())

@ssl_bp.route('/api/ssl/certificates', methods=['POST'])
@permission_required('ssl', 'create')
def create_certificate(current_user):
    """ออกใบเซอร์ใหม่"""
    data = request.get_json()
    
    # ตรวจสอบข้อมูลเบื้องต้น
    if 'domain' not in data:
        return jsonify({'error': 'Missing required field: domain'}), 400
    if not isinstance(data['domain'], str) or not data['domain'].strip():
        return jsonify({'error': 'Invalid domain value'}), 400
    
    # ตรวจสอบสิทธิ์ความเป็นเจ้าของโดเมน
    domains = _user_domains(current_user)
    if domains is not None and data['domain'] not in domains:
        return jsonify({'error': 'Access denied'}), 403
    
    try:
        # เช็คว่ามีใบเซอร์เดิมในระบบฐานข้อมูลหรือไม่
        existing_cert = SSLCertificate.query.filter_by(domain=data['domain']).first()
        if existing_cert:
            return jsonify({'error': 'Certificate already exists for this domain'}), 400
        
        # ค้นหา Document Root
        document_root = data.get('document_root')
        if not document_root:
            from models.virtual_host import VirtualHost
            virtual_host = VirtualHost.query.filter_by(domain=data['domain']).first()
            if virtual_host:
                document_root = virtual_host.document_root
            else:
                return jsonify({'error': 'Document root not provided and virtual host not found'}), 400

        # ตรวจสอบว่ามีโฟลเดอร์อยู่จริงหรือไม่
        import os as _os
        if not _os.path.isdir(document_root):
            return jsonify({'error': f'Document root not found: {document_root}'}), 400
        
        # สั่งออกใบเซอร์ผ่าน SSL Service (ระดับ OS)
        cert_info = ssl_service.issue_certificate(
            domain=data['domain'], 
            document_root=document_root
        )
        
        # บันทึกลงฐานข้อมูล
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
        
        log = SSLCertificateLog(
            certificate=certificate,
            action='issue',
            status='success',
            message='Certificate issued successfully'
        )
        
        db.session.add(certificate)
        db.session.add(log)
        
        # ตั้งค่า Nginx อัตโนมัติ (Best-effort)
        try:
            ssl_service.configure_nginx_ssl(
                domain=data['domain'],
                certificate_path=cert_info['certificate_path'],
                private_key_path=cert_info['private_key_path'],
                document_root=document_root,
            )
        except Exception as e:
            print(f"Warning: Nginx SSL configuration failed: {str(e)}")
        
        db.session.commit()
        return jsonify(certificate.to_dict()), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@ssl_bp.route('/api/ssl/certificates/<int:id>/renew', methods=['POST'])
@permission_required('ssl', 'update')
def renew_certificate(current_user, id):
    """ต่ออายุใบเซอร์"""
    certificate = SSLCertificate.query.get_or_404(id)
    domains = _user_domains(current_user)
    if domains is not None and certificate.domain not in domains:
        return jsonify({'error': 'Access denied'}), 403
    
    try:
        # สั่งต่ออายุผ่าน SSL Service
        cert_info = ssl_service.renew_certificate(certificate.domain)
        
        # อัปเดตข้อมูลใน DB
        certificate.valid_from = cert_info['valid_from']
        certificate.valid_until = cert_info['valid_until']
        certificate.updated_at = datetime.utcnow()
        
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
    """ลบใบเซอร์ออกจากระบบ (ทั้ง OS และ DB)"""
    try:
        certificate = SSLCertificate.query.get_or_404(id)
        domains = _user_domains(current_user)
        if domains is not None and certificate.domain not in domains:
            return jsonify({'error': 'Access denied'}), 403
        
        domain = certificate.domain
        
        # 1. พยายาม Revoke และ Delete ในระดับ OS (Certbot & Nginx)
        try:
            # ใช้ฟังก์ชัน revoke_certificate ซึ่งภายในจะสั่ง delete ต่อทันที
            ssl_service.revoke_certificate(domain)
        except Exception as e:
            # หาก Revoke ไม่สำเร็จ (เช่น ใบเซอร์หมดอายุไปแล้ว) ให้พยายามสั่ง Delete ตรงๆ
            try:
                ssl_service.delete_certificate(domain, cert_id=id)
            except Exception as delete_error:
                # Log ข้อผิดพลาดไว้ แต่ให้ดำเนินการลบใน DB ต่อไป
                print(f"Warning: OS cleanup failed for {domain}: {str(delete_error)}")
        
        # 2. ลบข้อมูล Log ที่เกี่ยวข้อง (เพื่อเลี่ยงปัญหา Foreign Key)
        SSLCertificateLog.query.filter_by(certificate_id=id).delete()
        
        # 3. ลบจากฐานข้อมูล
        db.session.delete(certificate)
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Certificate deleted successfully from system and database'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@ssl_bp.route('/api/ssl/certificates/<int:id>/logs', methods=['GET'])
@permission_required('ssl', 'read')
def get_certificate_logs(current_user, id):
    """ดึง Log ประวัติของใบเซอร์นั้นๆ"""
    certificate = SSLCertificate.query.get_or_404(id)
    domains = _user_domains(current_user)
    if domains is not None and certificate.domain not in domains:
        return jsonify({'error': 'Access denied'}), 403
    return jsonify([log.to_dict() for log in certificate.logs])
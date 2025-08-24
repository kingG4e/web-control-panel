from flask import Blueprint, request, jsonify
from models.dns import DNSZone, DNSRecord, db
from services.bind_service import BindService
from datetime import datetime
import os
from utils.auth import permission_required, admin_required, token_required
from sqlalchemy.orm import joinedload
from models.user import DomainPermission

dns_bp = Blueprint('dns', __name__)
bind_service = BindService()

@dns_bp.route('/api/dns/zones', methods=['GET'])
@token_required
def get_zones(current_user):
    # Admins can see all zones
    if current_user.is_admin or current_user.role == 'admin' or current_user.username == 'root':
        zones = DNSZone.query.all()
        return jsonify([zone.to_dict() for zone in zones])

    # Otherwise, filter zones by domain permissions (dns)
    permitted_domains = [
        perm.domain
        for perm in DomainPermission.query.filter_by(user_id=current_user.id, can_manage_dns=True).all()
    ]
    if not permitted_domains:
        return jsonify([])

    zones = DNSZone.query.filter(DNSZone.domain_name.in_(permitted_domains)).all()
    return jsonify([zone.to_dict() for zone in zones])

@dns_bp.route('/api/dns/zones/<int:id>', methods=['GET'])
@token_required
def get_zone(current_user, id):
    zone = DNSZone.query.get_or_404(id)
    # Admins can access any zone
    if current_user.is_admin or current_user.role == 'admin' or current_user.username == 'root':
        return jsonify(zone.to_dict())
    # Check domain permission for dns
    has_perm = DomainPermission.query.filter_by(
        user_id=current_user.id,
        domain=zone.domain_name,
        can_manage_dns=True
    ).first() is not None
    if not has_perm:
        return jsonify({'success': False, 'error': 'Permission denied'}), 403
    return jsonify(zone.to_dict())

@dns_bp.route('/api/dns/zones/<int:zone_id>/records', methods=['GET'])
@token_required
def get_records(current_user, zone_id):
    zone = DNSZone.query.get_or_404(zone_id)
    # Admins can access any zone records
    if not (current_user.is_admin or current_user.role == 'admin' or current_user.username == 'root'):
        has_perm = DomainPermission.query.filter_by(
            user_id=current_user.id,
            domain=zone.domain_name,
            can_manage_dns=True
        ).first() is not None
        if not has_perm:
            return jsonify({'success': False, 'error': 'Permission denied'}), 403
    # Prefer reading from actual zone file so UI reflects real state
    file_records = bind_service.read_zone_records(zone.domain_name)
    if file_records:
        return jsonify(file_records)
    # Fallback to DB if parsing failed or file missing
    records = DNSRecord.query.filter_by(zone_id=zone_id).all()
    records_json = [record.to_dict() for record in records]
    # Ensure SOA appears at top even if not stored as a DB record
    soa_record = {
        'id': None,
        'name': '@',
        'record_type': 'SOA',
        'content': f"ns1.{zone.domain_name}. admin.{zone.domain_name}. ( {zone.serial} {zone.refresh} {zone.retry} {zone.expire} {zone.minimum} )",
        'ttl': 3600,
        'priority': None,
        'status': 'active'
    }
    return jsonify([soa_record] + records_json)

@dns_bp.route('/api/dns/zones', methods=['POST'])
@permission_required('dns', 'create')
def create_zone(current_user):
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['domain_name']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    # Create zone with default values
    zone = DNSZone(
        domain_name=data['domain_name'],
        serial=datetime.now().strftime('%Y%m%d%H'),
        refresh=data.get('refresh', 3600),
        retry=data.get('retry', 1800),
        expire=data.get('expire', 604800),
        minimum=data.get('minimum', 86400)
    )
    
    try:
        # Save zone first to get ID
        db.session.add(zone)
        db.session.flush()

        # Create base records in DB so UI reflects the zone template
        nameserver_ip = data.get('nameserver_ip', '127.0.0.1')
        default_ip = nameserver_ip or '127.0.0.1'
        # Create only essential records automatically
        base_records = [
            DNSRecord(zone_id=zone.id, name='@',   record_type='NS', content=f"ns1.{zone.domain_name}.", ttl=3600, status='active'),
            DNSRecord(zone_id=zone.id, name='ns1', record_type='A',  content=default_ip,                  ttl=3600, status='active')
        ]
        # Optional MX/mail records if explicitly requested
        if data.get('with_mail', False):
            base_records.extend([
                DNSRecord(zone_id=zone.id, name='@',    record_type='MX', content=f"mail.{zone.domain_name}.", priority=10, ttl=3600, status='active'),
                DNSRecord(zone_id=zone.id, name='mail', record_type='A',  content=default_ip,                            ttl=3600, status='active')
            ])

        for r in base_records:
            db.session.add(r)

        # Create zone in BIND
        bind_service.create_zone(zone, nameserver_ip=default_ip)

        db.session.commit()
        return jsonify(zone.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@dns_bp.route('/api/dns/zones/<int:id>/records', methods=['POST'])
@permission_required('dns', 'create')
def add_record(current_user, id):
    zone = DNSZone.query.get_or_404(id)
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['name', 'record_type', 'content']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    # Create record
    record = DNSRecord(
        zone_id=zone.id,
        name=data['name'],
        record_type=data['record_type'].upper(),
        content=data['content'],
        ttl=data.get('ttl', 3600),
        priority=data.get('priority')  # For MX records
    )
    
    try:
        # Add record to database
        db.session.add(record)
        db.session.commit()

        # Re-fetch zone with fresh records (ensures template sees the newly added row)
        zone = DNSZone.query.options(joinedload(DNSZone.records)).get(zone.id)

        # Update zone file
        bind_service.update_zone(zone, nameserver_ip=data.get('nameserver_ip', '127.0.0.1'))

        return jsonify(record.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@dns_bp.route('/api/dns/zones/<int:zone_id>/records/<int:record_id>', methods=['PUT'])
@permission_required('dns', 'update')
def update_record(current_user, zone_id, record_id):
    zone = DNSZone.query.get_or_404(zone_id)
    record = DNSRecord.query.get_or_404(record_id)
    data = request.get_json()
    
    if record.zone_id != zone_id:
        return jsonify({'error': 'Record does not belong to this zone'}), 400
    
    try:
        # Update record fields
        if 'name' in data:
            record.name = data['name']
        if 'record_type' in data:
            record.record_type = data['record_type'].upper()
        if 'content' in data:
            record.content = data['content']
        if 'ttl' in data:
            record.ttl = data['ttl']
        if 'priority' in data:
            record.priority = data['priority']
        
        # Save to database
        db.session.commit()

        # Re-fetch zone with fresh records
        zone = DNSZone.query.options(joinedload(DNSZone.records)).get(zone.id)

        # Update zone file
        bind_service.update_zone(zone, nameserver_ip=data.get('nameserver_ip', '127.0.0.1'))
        
        return jsonify(record.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@dns_bp.route('/api/dns/zones/<int:zone_id>/records/<int:record_id>', methods=['DELETE'])
@permission_required('dns', 'delete')
def delete_record(current_user, zone_id, record_id):
    zone = DNSZone.query.get_or_404(zone_id)
    record = DNSRecord.query.get_or_404(record_id)
    
    if record.zone_id != zone_id:
        return jsonify({'error': 'Record does not belong to this zone'}), 400
    
    try:
        # Remove record from database
        db.session.delete(record)
        db.session.commit()

        # Re-fetch zone with fresh records
        zone = DNSZone.query.options(joinedload(DNSZone.records)).get(zone.id)

        # Update zone file
        bind_service.update_zone(zone, nameserver_ip='127.0.0.1')
        
        return '', 204
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@dns_bp.route('/api/dns/zones/<int:id>', methods=['DELETE'])
@permission_required('dns', 'delete')
def delete_zone(current_user, id):
    zone = DNSZone.query.get_or_404(id)
    
    try:
        # Remove zone from BIND
        bind_service.delete_zone(zone.domain_name)
        
        # Remove from database
        db.session.delete(zone)
        db.session.commit()
        
        return '', 204
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@dns_bp.route('/api/dns/zones/<int:id>/zonefile', methods=['GET'])
@token_required
def get_zone_file(current_user, id):
    zone = DNSZone.query.get_or_404(id)
    # Admins can access any zone file
    if not (current_user.is_admin or current_user.role == 'admin' or current_user.username == 'root'):
        has_perm = DomainPermission.query.filter_by(
            user_id=current_user.id,
            domain=zone.domain_name,
            can_manage_dns=True
        ).first() is not None
        if not has_perm:
            return jsonify({'success': False, 'error': 'Permission denied'}), 403
    
    try:
        zone_file_path = os.path.join(bind_service.zones_dir, f'db.{zone.domain_name}')
        
        if not os.path.exists(zone_file_path):
            return jsonify({'error': 'Zone file not found'}), 404
        
        with open(zone_file_path, 'r') as f:
            content = f.read()
        
        return jsonify({'content': content})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@dns_bp.route('/api/dns/reload', methods=['POST'])
@admin_required
def reload_bind(current_user):
    try:
        bind_service._reload_bind()
        return jsonify({'message': 'BIND reloaded successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@dns_bp.route('/api/dns/rebuild', methods=['POST'])
@admin_required
def rebuild_dns(current_user):
    try:
        # Get all zones and rebuild them
        zones = DNSZone.query.all()
        for zone in zones:
            bind_service.update_zone(zone, nameserver_ip='127.0.0.1')

        # Reload BIND
        bind_service._reload_bind()

        return jsonify({'message': 'DNS zones rebuilt and BIND reloaded successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

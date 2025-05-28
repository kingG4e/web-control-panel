from flask import Blueprint, request, jsonify
from models.dns import DNSZone, DNSRecord, db
from services.bind_service import BindService
from datetime import datetime

dns_bp = Blueprint('dns', __name__)
bind_service = BindService()

@dns_bp.route('/api/dns/zones', methods=['GET'])
def get_zones():
    zones = DNSZone.query.all()
    return jsonify([zone.to_dict() for zone in zones])

@dns_bp.route('/api/dns/zones/<int:id>', methods=['GET'])
def get_zone(id):
    zone = DNSZone.query.get_or_404(id)
    return jsonify(zone.to_dict())

@dns_bp.route('/api/dns/zones', methods=['POST'])
def create_zone():
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
        # Create zone in BIND
        bind_service.create_zone(zone, nameserver_ip=data.get('nameserver_ip', '127.0.0.1'))
        
        # Save to database
        db.session.add(zone)
        db.session.commit()
        
        return jsonify(zone.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@dns_bp.route('/api/dns/zones/<int:id>/records', methods=['POST'])
def add_record(id):
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
        
        # Update zone file
        bind_service.update_zone(zone, nameserver_ip=data.get('nameserver_ip', '127.0.0.1'))
        
        return jsonify(record.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@dns_bp.route('/api/dns/zones/<int:zone_id>/records/<int:record_id>', methods=['DELETE'])
def delete_record(zone_id, record_id):
    zone = DNSZone.query.get_or_404(zone_id)
    record = DNSRecord.query.get_or_404(record_id)
    
    if record.zone_id != zone_id:
        return jsonify({'error': 'Record does not belong to this zone'}), 400
    
    try:
        # Remove record from database
        db.session.delete(record)
        db.session.commit()
        
        # Update zone file
        bind_service.update_zone(zone, nameserver_ip='127.0.0.1')
        
        return '', 204
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@dns_bp.route('/api/dns/zones/<int:id>', methods=['DELETE'])
def delete_zone(id):
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
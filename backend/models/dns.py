from datetime import datetime
from models.virtual_host import db

class DNSZone(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    domain_name = db.Column(db.String(255), unique=True, nullable=False)
    serial = db.Column(db.String(10), nullable=False)  # Zone serial number
    refresh = db.Column(db.Integer, default=3600)
    retry = db.Column(db.Integer, default=1800)
    expire = db.Column(db.Integer, default=604800)
    minimum = db.Column(db.Integer, default=86400)
    status = db.Column(db.String(50), default='active')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship with records
    records = db.relationship('DNSRecord', backref='zone', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'domain_name': self.domain_name,
            'serial': self.serial,
            'refresh': self.refresh,
            'retry': self.retry,
            'expire': self.expire,
            'minimum': self.minimum,
            'status': self.status,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'records': [record.to_dict() for record in self.records]
        }

class DNSRecord(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    zone_id = db.Column(db.Integer, db.ForeignKey('dns_zone.id'), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    record_type = db.Column(db.String(10), nullable=False)  # A, AAAA, CNAME, MX, TXT, etc.
    content = db.Column(db.String(255), nullable=False)
    ttl = db.Column(db.Integer, default=3600)
    priority = db.Column(db.Integer)  # For MX records
    status = db.Column(db.String(50), default='active')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'zone_id': self.zone_id,
            'name': self.name,
            'record_type': self.record_type,
            'content': self.content,
            'ttl': self.ttl,
            'priority': self.priority,
            'status': self.status,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        } 
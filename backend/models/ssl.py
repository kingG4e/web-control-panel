from datetime import datetime
from .base import db

class SSLCertificate(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    domain = db.Column(db.String(255), nullable=False)
    certificate_path = db.Column(db.String(255), nullable=False)
    private_key_path = db.Column(db.String(255), nullable=False)
    chain_path = db.Column(db.String(255))
    issuer = db.Column(db.String(255))
    valid_from = db.Column(db.DateTime, nullable=False)
    valid_until = db.Column(db.DateTime, nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    auto_renew = db.Column(db.Boolean, default=True)
    virtual_host_id = db.Column(db.Integer, db.ForeignKey('virtual_host.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'domain': self.domain,
            'issuer': self.issuer,
            'valid_from': self.valid_from.isoformat(),
            'valid_until': self.valid_until.isoformat(),
            'is_active': self.is_active,
            'auto_renew': self.auto_renew,
            'virtual_host_id': self.virtual_host_id,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class SSLCertificateLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    certificate_id = db.Column(db.Integer, db.ForeignKey('ssl_certificate.id'), nullable=False)
    action = db.Column(db.String(50), nullable=False)  # created, renewed, revoked
    status = db.Column(db.String(50), nullable=False)  # success, failed
    message = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationship
    certificate = db.relationship('SSLCertificate', backref='logs')

    def to_dict(self):
        return {
            'id': self.id,
            'certificate_id': self.certificate_id,
            'action': self.action,
            'status': self.status,
            'message': self.message,
            'created_at': self.created_at.isoformat()
        } 
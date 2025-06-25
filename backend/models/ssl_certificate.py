from datetime import datetime
from models.database import db

class SSLCertificate(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    domain = db.Column(db.String(255), unique=True, nullable=False)
    certificate_path = db.Column(db.String(255))
    private_key_path = db.Column(db.String(255))
    chain_path = db.Column(db.String(255))
    issuer = db.Column(db.String(255))  # e.g., "Let's Encrypt"
    valid_from = db.Column(db.DateTime)
    valid_until = db.Column(db.DateTime)
    auto_renewal = db.Column(db.Boolean, default=True)
    status = db.Column(db.String(50), default='pending')  # pending, active, expired, revoked
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Add relationship
    user = db.relationship('User', backref='ssl_certificates')

    def to_dict(self):
        return {
            'id': self.id,
            'domain': self.domain,
            'issuer': self.issuer,
            'valid_from': self.valid_from.isoformat() if self.valid_from else None,
            'valid_until': self.valid_until.isoformat() if self.valid_until else None,
            'auto_renewal': self.auto_renewal,
            'status': self.status,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class SSLCertificateLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    certificate_id = db.Column(db.Integer, db.ForeignKey('ssl_certificate.id'), nullable=False)
    action = db.Column(db.String(50))  # issue, renew, revoke
    status = db.Column(db.String(50))  # success, failed
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
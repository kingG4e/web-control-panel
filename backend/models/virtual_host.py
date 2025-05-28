from datetime import datetime
from .base import db

class VirtualHost(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    domain = db.Column(db.String(255), unique=True, nullable=False)
    root_directory = db.Column(db.String(255), nullable=False)
    php_version = db.Column(db.String(10))
    ssl_enabled = db.Column(db.Boolean, default=False)
    is_active = db.Column(db.Boolean, default=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    aliases = db.relationship('VirtualHostAlias', backref='virtual_host', lazy=True, cascade='all, delete-orphan')
    ssl_certificate = db.relationship('SSLCertificate', backref='virtual_host', uselist=False)

    def to_dict(self):
        return {
            'id': self.id,
            'domain': self.domain,
            'root_directory': self.root_directory,
            'php_version': self.php_version,
            'ssl_enabled': self.ssl_enabled,
            'is_active': self.is_active,
            'user_id': self.user_id,
            'aliases': [alias.domain for alias in self.aliases],
            'ssl_certificate': self.ssl_certificate.to_dict() if self.ssl_certificate else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class VirtualHostAlias(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    domain = db.Column(db.String(255), unique=True, nullable=False)
    virtual_host_id = db.Column(db.Integer, db.ForeignKey('virtual_host.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'domain': self.domain,
            'virtual_host_id': self.virtual_host_id,
            'created_at': self.created_at.isoformat()
        } 
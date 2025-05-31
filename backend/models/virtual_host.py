from datetime import datetime
from models.database import db

class VirtualHost(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    domain = db.Column(db.String(255), unique=True, nullable=False)
    document_root = db.Column(db.String(255), nullable=False)
    server_admin = db.Column(db.String(255))
    php_version = db.Column(db.String(10))
    status = db.Column(db.String(50), default='active')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'domain': self.domain,
            'document_root': self.document_root,
            'server_admin': self.server_admin,
            'php_version': self.php_version,
            'status': self.status,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'user_id': self.user_id
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
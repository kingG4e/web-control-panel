from datetime import datetime
from models.database import db


class SignupRequest(db.Model):
    __tablename__ = 'signup_request'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    domain = db.Column(db.String(255), unique=True, nullable=True)
    password_enc = db.Column(db.Text, nullable=False)
    email = db.Column(db.String(120), nullable=True)

    want_ssl = db.Column(db.Boolean, default=False)
    want_dns = db.Column(db.Boolean, default=False)
    want_email = db.Column(db.Boolean, default=False)
    want_mysql = db.Column(db.Boolean, default=False)

    storage_quota_mb = db.Column(db.Integer, nullable=True)

    status = db.Column(db.String(20), default='pending')  # pending, approved, rejected
    admin_comment = db.Column(db.String(255), nullable=True)
    approved_by = db.Column(db.Integer, nullable=True)
    approved_at = db.Column(db.DateTime, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'domain': self.domain,
            'email': self.email,
            'want_ssl': self.want_ssl,
            'want_dns': self.want_dns,
            'want_email': self.want_email,
            'want_mysql': self.want_mysql,
            'storage_quota_mb': self.storage_quota_mb,
            'status': self.status,
            'admin_comment': self.admin_comment,
            'approved_by': self.approved_by,
            'approved_at': self.approved_at.isoformat() if self.approved_at else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }



from datetime import datetime
from models.database import db


class SignupMeta(db.Model):
    __tablename__ = 'signup_meta'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    domain = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(255), nullable=True)

    # Keep an encrypted server password to provision Linux/MySQL on approval
    server_password_enc = db.Column(db.Text, nullable=True)

    # Store feature selections as JSON to avoid schema drift
    options_json = db.Column(db.JSON, default={})

    storage_quota_mb = db.Column(db.Integer, nullable=True)

    status = db.Column(db.String(20), default='pending')  # pending, approved, rejected
    admin_comment = db.Column(db.String(255), nullable=True)
    approved_by = db.Column(db.Integer, nullable=True)
    approved_at = db.Column(db.DateTime, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        opts = self.options_json or {}
        result = {
            'id': self.id,
            'user_id': self.user_id,
            'domain': self.domain,
            'full_name': self.full_name,
            'want_ssl': bool(opts.get('want_ssl', False)),
            'want_dns': bool(opts.get('want_dns', False)),
            'want_email': bool(opts.get('want_email', False)),
            'want_mysql': bool(opts.get('want_mysql', False)),
            'storage_quota_mb': self.storage_quota_mb,
            'status': self.status,
            'admin_comment': self.admin_comment,
            'approved_by': self.approved_by,
            'approved_at': self.approved_at.isoformat() if self.approved_at else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }
        
        # Add email account details if present
        if opts.get('email_account'):
            email_account = opts['email_account']
            result['email_username'] = email_account.get('username')
            result['email_quota'] = email_account.get('quota', 1024)
            # Don't include password in response for security
        
        # Add DB account details if present
        if opts.get('db_account'):
            db_account = opts['db_account']
            result['db_name'] = db_account.get('name')
            result['db_username'] = db_account.get('username')
            # Don't include password in response for security
            
        return result



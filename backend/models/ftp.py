from datetime import datetime
from models.virtual_host import db
from models.user import User

class FTPAccount(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    home_directory = db.Column(db.String(255), nullable=False)
    is_sftp = db.Column(db.Boolean, default=True)  # True for SFTP, False for FTP
    is_active = db.Column(db.Boolean, default=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    domain = db.Column(db.String(255), nullable=False)
    permissions = db.Column(db.String(4), default='0755')  # Unix style permissions
    quota_size_mb = db.Column(db.Integer, default=0)  # 0 means unlimited
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = db.relationship('User', backref='ftp_accounts')
    access_rules = db.relationship('FTPAccessRule', backref='ftp_account', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'home_directory': self.home_directory,
            'is_sftp': self.is_sftp,
            'is_active': self.is_active,
            'user_id': self.user_id,
            'domain': self.domain,
            'permissions': self.permissions,
            'quota_size_mb': self.quota_size_mb,
            'access_rules': [rule.to_dict() for rule in self.access_rules],
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class FTPAccessRule(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    ftp_account_id = db.Column(db.Integer, db.ForeignKey('ftp_account.id'), nullable=False)
    directory_path = db.Column(db.String(255), nullable=False)
    permissions = db.Column(db.String(4), nullable=False)  # Unix style permissions
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'ftp_account_id': self.ftp_account_id,
            'directory_path': self.directory_path,
            'permissions': self.permissions,
            'created_at': self.created_at.isoformat()
        } 
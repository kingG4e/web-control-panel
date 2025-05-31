from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(120), nullable=True)  # Nullable for system users
    role = db.Column(db.String(20), nullable=False, default='user')
    is_system_user = db.Column(db.Boolean, default=False)
    system_uid = db.Column(db.Integer, nullable=True)
    is_admin = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)
    failed_login_attempts = db.Column(db.Integer, default=0)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    virtual_hosts = db.relationship('VirtualHost', backref='owner', lazy=True)
    databases = db.relationship('Database', backref='owner', lazy=True)
    email_accounts = db.relationship('EmailAccount', backref='owner', lazy=True)
    ftp_accounts = db.relationship('FTPAccount', backref='owner', lazy=True)

    def __init__(self, username, role='user', password=None, is_system_user=False, system_uid=None):
        self.username = username
        self.role = role
        self.is_system_user = is_system_user
        self.system_uid = system_uid
        if password and not is_system_user:
            self.set_password(password)

    def set_password(self, password):
        if self.is_system_user:
            raise ValueError("Cannot set password for system users")
        self.password_hash = generate_password_hash(password)

    def verify_password(self, password):
        if self.is_system_user:
            # System users are verified through PAM
            return False
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role,
            'is_system_user': self.is_system_user,
            'is_admin': self.is_admin,
            'created_at': self.created_at.isoformat(),
            'last_login': self.last_login.isoformat() if self.last_login else None,
            'updated_at': self.updated_at.isoformat()
        }

    def __repr__(self):
        return f'<User {self.username}>'

class Role(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), unique=True, nullable=False)
    description = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    permissions = db.relationship('Permission', secondary='role_permissions', backref='roles')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'permissions': [perm.to_dict() for perm in self.permissions],
            'created_at': self.created_at.isoformat()
        }

class Permission(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), unique=True, nullable=False)
    description = db.Column(db.String(255))
    resource_type = db.Column(db.String(50))  # virtual_host, database, email, ftp, etc.
    action = db.Column(db.String(50))  # create, read, update, delete
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'resource_type': self.resource_type,
            'action': self.action,
            'created_at': self.created_at.isoformat()
        }

class DomainPermission(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    domain = db.Column(db.String(255), nullable=False)
    can_manage_vhost = db.Column(db.Boolean, default=False)
    can_manage_dns = db.Column(db.Boolean, default=False)
    can_manage_ssl = db.Column(db.Boolean, default=False)
    can_manage_email = db.Column(db.Boolean, default=False)
    can_manage_database = db.Column(db.Boolean, default=False)
    can_manage_ftp = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'domain': self.domain,
            'can_manage_vhost': self.can_manage_vhost,
            'can_manage_dns': self.can_manage_dns,
            'can_manage_ssl': self.can_manage_ssl,
            'can_manage_email': self.can_manage_email,
            'can_manage_database': self.can_manage_database,
            'can_manage_ftp': self.can_manage_ftp,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

# Association Tables
user_roles = db.Table('user_roles',
    db.Column('user_id', db.Integer, db.ForeignKey('user.id'), primary_key=True),
    db.Column('role_id', db.Integer, db.ForeignKey('role.id'), primary_key=True)
)

role_permissions = db.Table('role_permissions',
    db.Column('role_id', db.Integer, db.ForeignKey('role.id'), primary_key=True),
    db.Column('permission_id', db.Integer, db.ForeignKey('permission.id'), primary_key=True)
) 
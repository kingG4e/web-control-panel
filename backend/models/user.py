from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from models.virtual_host import db

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255))
    first_name = db.Column(db.String(80))
    last_name = db.Column(db.String(80))
    is_active = db.Column(db.Boolean, default=True)
    is_admin = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    roles = db.relationship('Role', secondary='user_roles', backref='users')
    domain_permissions = db.relationship('DomainPermission', backref='user', cascade='all, delete-orphan')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'is_active': self.is_active,
            'is_admin': self.is_admin,
            'roles': [role.to_dict() for role in self.roles],
            'domain_permissions': [perm.to_dict() for perm in self.domain_permissions],
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

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
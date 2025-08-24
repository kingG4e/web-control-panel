from datetime import datetime
from models.database import db

class EmailDomain(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    domain = db.Column(db.String(255), unique=True, nullable=False)
    virtual_host_id = db.Column(db.Integer, db.ForeignKey('virtual_host.id'), nullable=True)
    status = db.Column(db.String(50), default='active')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    accounts = db.relationship('EmailAccount', backref='email_domain', lazy=True, cascade='all, delete-orphan')
    forwarders = db.relationship('EmailForwarder', backref='email_domain', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'domain': self.domain,
            'status': self.status,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'accounts': [account.to_dict() for account in self.accounts],
            'forwarders': [forwarder.to_dict() for forwarder in self.forwarders]
        }

class EmailAccount(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    domain_id = db.Column(db.Integer, db.ForeignKey('email_domain.id'), nullable=False)
    username = db.Column(db.String(64), nullable=False)
    password = db.Column(db.String(255), nullable=False)
    quota = db.Column(db.Integer, default=1024)  # MB
    used_quota = db.Column(db.Float, default=0)  # MB
    status = db.Column(db.String(50), default='active')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('domain_id', 'username', name='unique_email_account'),
    )

    def get_email(self):
        return f"{self.username}@{self.email_domain.domain}"

    def to_dict(self):
        return {
            'id': self.id,
            'domain_id': self.domain_id,
            'username': self.username,
            'email': self.get_email(),
            'quota': self.quota,
            'used_quota': self.used_quota,
            'status': self.status,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class EmailForwarder(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    domain_id = db.Column(db.Integer, db.ForeignKey('email_domain.id'), nullable=False)
    source = db.Column(db.String(255), nullable=False)
    destination = db.Column(db.String(255), nullable=False)
    status = db.Column(db.String(50), default='active')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('domain_id', 'source', name='unique_email_forwarder'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'domain_id': self.domain_id,
            'source': self.source,
            'destination': self.destination,
            'status': self.status,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class EmailAlias(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    account_id = db.Column(db.Integer, db.ForeignKey('email_account.id'), nullable=False)
    alias = db.Column(db.String(255), nullable=False, unique=True)
    status = db.Column(db.String(50), default='active')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'account_id': self.account_id,
            'alias': self.alias,
            'status': self.status,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        } 
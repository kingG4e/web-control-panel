from datetime import datetime
from models.base import db

def init_db(app):
    db.init_app(app)

class Database(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(64), unique=True, nullable=False)
    charset = db.Column(db.String(32), default='utf8mb4')
    collation = db.Column(db.String(32), default='utf8mb4_unicode_ci')
    size = db.Column(db.Float)  # Size in MB
    status = db.Column(db.String(50), default='active')
    owner_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships with eager loading
    users = db.relationship('DatabaseUser', backref='database', lazy='select', cascade='all, delete-orphan')
    backups = db.relationship('DatabaseBackup', backref='database', lazy='select', cascade='all, delete-orphan')

    def to_dict(self, include_relations=True):
        result = {
            'id': self.id,
            'name': self.name,
            'charset': self.charset,
            'collation': self.collation,
            'size': self.size,
            'status': self.status,
            'owner_id': self.owner_id,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
        
        if include_relations:
            result['users'] = [user.to_dict(include_relations=False) for user in self.users]
            result['backups'] = [backup.to_dict(include_relations=False) for backup in self.backups]
        
        return result

    @classmethod
    def get_with_relations(cls, database_id=None):
        """Get databases with eager loaded relationships"""
        from sqlalchemy.orm import joinedload
        
        query = cls.query.options(
            joinedload(cls.users),
            joinedload(cls.backups)
        )
        
        if database_id:
            return query.filter_by(id=database_id).first()
        return query.all()

class DatabaseUser(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    database_id = db.Column(db.Integer, db.ForeignKey('database.id'), nullable=False)
    username = db.Column(db.String(32), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    host = db.Column(db.String(255), default='%')
    privileges = db.Column(db.String(255), default='ALL PRIVILEGES')
    status = db.Column(db.String(50), default='active')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self, include_relations=True):
        return {
            'id': self.id,
            'database_id': self.database_id,
            'username': self.username,
            'host': self.host,
            'privileges': self.privileges,
            'status': self.status,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class DatabaseBackup(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    database_id = db.Column(db.Integer, db.ForeignKey('database.id'), nullable=False)
    filename = db.Column(db.String(255), nullable=False)
    size = db.Column(db.Float)  # Size in MB
    backup_type = db.Column(db.String(50), default='manual')  # manual, scheduled
    status = db.Column(db.String(50), default='completed')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self, include_relations=True):
        return {
            'id': self.id,
            'database_id': self.database_id,
            'filename': self.filename,
            'size': self.size,
            'backup_type': self.backup_type,
            'status': self.status,
            'created_at': self.created_at.isoformat()
        } 
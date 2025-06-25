from datetime import datetime
from .base import db

class Notification(db.Model):
    __tablename__ = 'notifications'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # None for system-wide notifications
    title = db.Column(db.String(255), nullable=False)
    message = db.Column(db.Text, nullable=False)
    type = db.Column(db.String(50), nullable=False, default='info')  # info, success, warning, error
    category = db.Column(db.String(50), nullable=False, default='system')  # system, ssl, email, dns, etc.
    is_read = db.Column(db.Boolean, default=False)
    is_global = db.Column(db.Boolean, default=False)  # True for admin/system notifications
    priority = db.Column(db.String(20), default='normal')  # low, normal, high, critical
    action_url = db.Column(db.String(255), nullable=True)  # Optional URL for action
    action_text = db.Column(db.String(100), nullable=True)  # Optional text for action button
    extra_data = db.Column(db.JSON, nullable=True)  # Additional data as JSON
    expires_at = db.Column(db.DateTime, nullable=True)  # Optional expiration
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # No relationship to avoid circular import issues
    # The user can be accessed via query if needed
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'title': self.title,
            'message': self.message,
            'type': self.type,
            'category': self.category,
            'is_read': self.is_read,
            'is_global': self.is_global,
            'priority': self.priority,
            'action_url': self.action_url,
            'action_text': self.action_text,
            'extra_data': self.extra_data,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'time_ago': self.get_time_ago()
        }
    
    def get_time_ago(self):
        """Get human readable time ago string"""
        now = datetime.utcnow()
        diff = now - self.created_at
        
        if diff.days > 0:
            return f"{diff.days} day{'s' if diff.days > 1 else ''} ago"
        elif diff.seconds > 3600:
            hours = diff.seconds // 3600
            return f"{hours} hour{'s' if hours > 1 else ''} ago"
        elif diff.seconds > 60:
            minutes = diff.seconds // 60
            return f"{minutes} minute{'s' if minutes > 1 else ''} ago"
        else:
            return "Just now"
    
    @staticmethod
    def create_notification(title, message, type='info', category='system', user_id=None, 
                          is_global=False, priority='normal', action_url=None, action_text=None, 
                          extra_data=None, expires_at=None):
        """Helper method to create notifications"""
        notification = Notification(
            title=title,
            message=message,
            type=type,
            category=category,
            user_id=user_id,
            is_global=is_global,
            priority=priority,
            action_url=action_url,
            action_text=action_text,
            extra_data=extra_data,
            expires_at=expires_at
        )
        db.session.add(notification)
        db.session.commit()
        return notification
    
    @staticmethod
    def get_user_notifications(user_id, limit=50, unread_only=False):
        """Get notifications for a specific user"""
        query = Notification.query.filter(
            (Notification.user_id == user_id) | (Notification.is_global == True)
        )
        
        if unread_only:
            query = query.filter(Notification.is_read == False)
        
        # Filter out expired notifications
        query = query.filter(
            (Notification.expires_at.is_(None)) | 
            (Notification.expires_at > datetime.utcnow())
        )
        
        return query.order_by(Notification.created_at.desc()).limit(limit).all()
    
    @staticmethod
    def mark_as_read(notification_id, user_id):
        """Mark a notification as read"""
        notification = Notification.query.filter_by(id=notification_id).first()
        if notification and (notification.user_id == user_id or notification.is_global):
            notification.is_read = True
            db.session.commit()
            return True
        return False
    
    @staticmethod
    def mark_all_as_read(user_id):
        """Mark all notifications as read for a user"""
        Notification.query.filter(
            (Notification.user_id == user_id) | (Notification.is_global == True)
        ).update({'is_read': True})
        db.session.commit()
    
    @staticmethod
    def get_unread_count(user_id):
        """Get count of unread notifications for a user"""
        return Notification.query.filter(
            ((Notification.user_id == user_id) | (Notification.is_global == True)) &
            (Notification.is_read == False) &
            ((Notification.expires_at.is_(None)) | (Notification.expires_at > datetime.utcnow()))
        ).count()
    
    @staticmethod
    def cleanup_expired():
        """Remove expired notifications"""
        Notification.query.filter(
            Notification.expires_at < datetime.utcnow()
        ).delete()
        db.session.commit()
    
    def __repr__(self):
        return f'<Notification {self.id}: {self.title}>' 
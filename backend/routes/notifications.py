from flask import Blueprint, jsonify, request
from utils.auth import token_required
from models.notification import Notification
from models.base import db
from datetime import datetime, timedelta

notifications_bp = Blueprint('notifications', __name__)

@notifications_bp.route('/api/notifications', methods=['GET'])
@token_required
def get_notifications(current_user):
    """Get notifications for the current user"""
    try:
        # Get query parameters
        limit = request.args.get('limit', 20, type=int)
        unread_only = request.args.get('unread_only', 'false').lower() == 'true'
        
        # Get notifications
        notifications = Notification.get_user_notifications(
            user_id=current_user.id,
            limit=limit,
            unread_only=unread_only
        )
        
        # Convert to dict
        notifications_data = [notification.to_dict() for notification in notifications]
        
        return jsonify({
            'success': True,
            'data': notifications_data,
            'count': len(notifications_data)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@notifications_bp.route('/api/notifications/unread-count', methods=['GET'])
@token_required
def get_unread_count(current_user):
    """Get count of unread notifications"""
    try:
        count = Notification.get_unread_count(current_user.id)
        return jsonify({
            'success': True,
            'data': {'count': count}
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@notifications_bp.route('/api/notifications/<int:notification_id>/read', methods=['POST'])
@token_required
def mark_notification_read(current_user, notification_id):
    """Mark a specific notification as read"""
    try:
        success = Notification.mark_as_read(notification_id, current_user.id)
        if success:
            return jsonify({'success': True, 'message': 'Notification marked as read'})
        else:
            return jsonify({'success': False, 'error': 'Notification not found or access denied'}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@notifications_bp.route('/api/notifications/mark-all-read', methods=['POST'])
@token_required
def mark_all_notifications_read(current_user):
    """Mark all notifications as read for the current user"""
    try:
        Notification.mark_all_as_read(current_user.id)
        return jsonify({'success': True, 'message': 'All notifications marked as read'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@notifications_bp.route('/api/notifications/<int:notification_id>', methods=['DELETE'])
@token_required
def delete_notification(current_user, notification_id):
    """Delete a specific notification"""
    try:
        notification = Notification.query.filter_by(id=notification_id).first()
        if not notification:
            return jsonify({'success': False, 'error': 'Notification not found'}), 404
        
        # Check if user can delete this notification
        if notification.user_id != current_user.id and not notification.is_global:
            return jsonify({'success': False, 'error': 'Access denied'}), 403
        
        db.session.delete(notification)
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Notification deleted'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@notifications_bp.route('/api/notifications/create', methods=['POST'])
@token_required
def create_notification(current_user):
    """Create a new notification (admin only for system notifications)"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('title') or not data.get('message'):
            return jsonify({'success': False, 'error': 'Title and message are required'}), 400
        
        # Check if user can create global notifications
        is_global = data.get('is_global', False)
        if is_global and not (current_user.role == 'admin' or current_user.is_admin):
            return jsonify({'success': False, 'error': 'Admin access required for global notifications'}), 403
        
        # Parse expires_at if provided
        expires_at = None
        if data.get('expires_at'):
            try:
                expires_at = datetime.fromisoformat(data['expires_at'].replace('Z', '+00:00'))
            except ValueError:
                return jsonify({'success': False, 'error': 'Invalid expires_at format'}), 400
        
        # Create notification
        notification = Notification.create_notification(
            title=data['title'],
            message=data['message'],
            type=data.get('type', 'info'),
            category=data.get('category', 'system'),
            user_id=None if is_global else current_user.id,
            is_global=is_global,
            priority=data.get('priority', 'normal'),
            action_url=data.get('action_url'),
            action_text=data.get('action_text'),
            extra_data=data.get('extra_data'),
            expires_at=expires_at
        )
        
        return jsonify({
            'success': True,
            'message': 'Notification created',
            'data': notification.to_dict()
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# Helper function to create system notifications
def create_system_notification(title, message, type='info', category='system', user_id=None, 
                             priority='normal', action_url=None, action_text=None):
    """Helper function to create system notifications from other parts of the app"""
    try:
        return Notification.create_notification(
            title=title,
            message=message,
            type=type,
            category=category,
            user_id=user_id,
            is_global=(user_id is None),
            priority=priority,
            action_url=action_url,
            action_text=action_text
        )
    except Exception as e:
        print(f"Failed to create notification: {e}")
        return None

# Sample notifications for testing
@notifications_bp.route('/api/notifications/create-samples', methods=['POST'])
def create_sample_notifications_public():
    """Create sample notifications for testing (public endpoint for testing)"""
    try:
        # Use raw SQL to avoid SQLAlchemy issues
        from models.base import db
        
        # Get or create test user using raw SQL
        user_result = db.session.execute(db.text("SELECT id FROM users LIMIT 1")).fetchone()
        if not user_result:
            # Create a test user
            db.session.execute(db.text("""
                INSERT INTO users (username, email, password_hash, created_at, updated_at) 
                VALUES ('testuser', 'test@example.com', 'pbkdf2:sha256:260000$test$hash', NOW(), NOW())
            """))
            db.session.commit()
            user_result = db.session.execute(db.text("SELECT id FROM users WHERE username = 'testuser'")).fetchone()
        
        user_id = user_result[0] if user_result else 1
        
        # Clear existing notifications
        try:
            db.session.execute(db.text("DELETE FROM notifications"))
            db.session.commit()
        except Exception as e:
            print(f"Note: {e}")
        
        # Sample notifications data
        sample_notifications = [
            ('Welcome to Control Panel!', 'Your account is ready. Start managing your services now!', 'success', 'system', 'normal', user_id, 0),
            ('SSL Certificate Expiring', 'Your SSL certificate expires in 7 days. Renew now to avoid downtime.', 'warning', 'ssl', 'high', user_id, 0),
            ('System Maintenance Tonight', 'Scheduled maintenance at 2:00 AM. Expected downtime: 30 minutes.', 'warning', 'system', 'high', None, 1),
            ('Backup Completed', 'Daily backup successful. All data is safely stored.', 'success', 'backup', 'normal', user_id, 0),
            ('High CPU Usage Alert', 'CPU usage above 90% for 10+ minutes. Check your applications.', 'error', 'system', 'critical', user_id, 0),
            ('Email Account Created', 'New email account "support@example.com" is ready to use.', 'success', 'email', 'normal', user_id, 0),
            ('Disk Space Warning', 'Your disk usage is at 85%. Consider cleaning up old files.', 'warning', 'system', 'normal', user_id, 0),
            ('Security Update Available', 'A security update is available. Please apply it soon.', 'warning', 'security', 'high', None, 1)
        ]
        
        # Insert notifications using raw SQL
        created_count = 0
        for title, message, type_val, category, priority, uid, is_global in sample_notifications:
            try:
                db.session.execute(db.text("""
                    INSERT INTO notifications (title, message, type, category, priority, user_id, is_global, is_read, created_at, updated_at)
                    VALUES (:title, :message, :type, :category, :priority, :user_id, :is_global, 0, NOW(), NOW())
                """), {
                    'title': title,
                    'message': message,
                    'type': type_val,
                    'category': category,
                    'priority': priority,
                    'user_id': uid,
                    'is_global': is_global
                })
                created_count += 1
            except Exception as e:
                print(f"Failed to create notification '{title}': {e}")
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Created {created_count} sample notifications using raw SQL',
            'count': created_count
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# Public endpoint for getting unread count (for testing)
@notifications_bp.route('/api/notifications/unread-count-public', methods=['GET'])
def get_unread_count_public():
    """Get count of unread notifications (public endpoint for testing)"""
    try:
        import sqlite3
        import os
        
        # Database path
        db_paths = [
            os.path.join('instance', 'controlpanel.db'),
            os.path.join('instance', 'app.db')
        ]
        
        db_path = None
        for path in db_paths:
            if os.path.exists(path):
                db_path = path
                break
        
        if not db_path:
            return jsonify({'success': True, 'count': 0, 'message': 'No database found'})
        
        # Connect and query using raw SQL
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get first user
        cursor.execute("SELECT id FROM user LIMIT 1")
        user_result = cursor.fetchone()
        
        if not user_result:
            conn.close()
            return jsonify({'success': True, 'count': 0, 'message': 'No users found'})
        
        user_id = user_result[0]
        
        # Count unread notifications using raw SQL
        cursor.execute("""
            SELECT COUNT(*) FROM notifications 
            WHERE (user_id = ? OR is_global = 1) 
            AND is_read = 0
            AND (expires_at IS NULL OR expires_at > datetime('now'))
        """, (user_id,))
        
        count_result = cursor.fetchone()
        count = count_result[0] if count_result else 0
        
        conn.close()
        
        return jsonify({
            'success': True,
            'count': count,
            'user_id': user_id
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# Public endpoint for getting notifications list (for testing)
@notifications_bp.route('/api/notifications-public', methods=['GET'])
def get_notifications_public():
    """Get notifications list (public endpoint for testing)"""
    try:
        import sqlite3
        import os
        
        # Database path
        db_paths = [
            os.path.join('instance', 'controlpanel.db'),
            os.path.join('instance', 'app.db')
        ]
        
        db_path = None
        for path in db_paths:
            if os.path.exists(path):
                db_path = path
                break
        
        if not db_path:
            return jsonify({'success': True, 'data': [], 'message': 'No database found'})
        
        # Connect and query using raw SQL
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get first user
        cursor.execute("SELECT id FROM user LIMIT 1")
        user_result = cursor.fetchone()
        
        if not user_result:
            conn.close()
            return jsonify({'success': True, 'data': [], 'message': 'No users found'})
        
        user_id = user_result[0]
        
        # Get notifications using raw SQL
        cursor.execute("""
            SELECT id, title, message, type, category, is_read, is_global, priority, 
                   action_url, action_text, created_at, updated_at
            FROM notifications 
            WHERE (user_id = ? OR is_global = 1) 
            AND (expires_at IS NULL OR expires_at > datetime('now'))
            ORDER BY created_at DESC
            LIMIT 20
        """, (user_id,))
        
        rows = cursor.fetchall()
        
        notifications = []
        for row in rows:
            notifications.append({
                'id': row[0],
                'title': row[1],
                'message': row[2],
                'type': row[3],
                'category': row[4],
                'is_read': bool(row[5]),
                'is_global': bool(row[6]),
                'priority': row[7],
                'action_url': row[8],
                'action_text': row[9],
                'created_at': row[10],
                'updated_at': row[11]
            })
        
        conn.close()
        
        return jsonify({
            'success': True,
            'data': notifications,
            'count': len(notifications),
            'user_id': user_id
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# Original admin-only endpoint
@notifications_bp.route('/api/notifications/create-samples-admin', methods=['POST'])
@token_required
def create_sample_notifications_admin(current_user):
    """Create sample notifications for testing (admin only)"""
    try:
        if not (current_user.role == 'admin' or current_user.is_admin):
            return jsonify({'success': False, 'error': 'Admin access required'}), 403
        
        sample_notifications = [
            {
                'title': 'System Maintenance Scheduled',
                'message': 'System maintenance is scheduled for tonight at 2:00 AM. Expected downtime: 30 minutes.',
                'type': 'warning',
                'category': 'system',
                'priority': 'high',
                'is_global': True
            },
            {
                'title': 'SSL Certificate Expiring Soon',
                'message': 'Your SSL certificate for example.com will expire in 7 days. Please renew it to avoid service interruption.',
                'type': 'warning',
                'category': 'ssl',
                'priority': 'high',
                'action_url': '/ssl-certificates',
                'action_text': 'Renew Certificate'
            },
            {
                'title': 'Backup Completed Successfully',
                'message': 'Your daily backup has been completed successfully. All files and databases are backed up.',
                'type': 'success',
                'category': 'backup',
                'priority': 'normal'
            },
            {
                'title': 'New Email Account Created',
                'message': 'Email account "support@example.com" has been created successfully.',
                'type': 'success',
                'category': 'email',
                'priority': 'normal'
            },
            {
                'title': 'High CPU Usage Detected',
                'message': 'CPU usage has been above 90% for the last 10 minutes. Please check your applications.',
                'type': 'error',
                'category': 'system',
                'priority': 'critical',
                'action_url': '/dashboard',
                'action_text': 'View Dashboard'
            }
        ]
        
        created_notifications = []
        for notif_data in sample_notifications:
            notification = Notification.create_notification(
                title=notif_data['title'],
                message=notif_data['message'],
                type=notif_data['type'],
                category=notif_data['category'],
                user_id=None if notif_data.get('is_global') else current_user.id,
                is_global=notif_data.get('is_global', False),
                priority=notif_data['priority'],
                action_url=notif_data.get('action_url'),
                action_text=notif_data.get('action_text')
            )
            created_notifications.append(notification.to_dict())
        
        return jsonify({
            'success': True,
            'message': f'Created {len(created_notifications)} sample notifications',
            'data': created_notifications
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# Public endpoint for marking notification as read (for testing)
@notifications_bp.route('/api/notifications/<int:notification_id>/read-public', methods=['POST'])
def mark_notification_read_public(notification_id):
    """Mark a specific notification as read (public endpoint for testing)"""
    try:
        import sqlite3
        import os
        
        # Database path
        db_paths = [
            os.path.join('instance', 'controlpanel.db'),
            os.path.join('instance', 'app.db')
        ]
        
        db_path = None
        for path in db_paths:
            if os.path.exists(path):
                db_path = path
                break
        
        if not db_path:
            return jsonify({'success': False, 'error': 'Database not found'}), 404
        
        # Connect and update using raw SQL
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Update notification as read
        cursor.execute("""
            UPDATE notifications 
            SET is_read = 1, updated_at = datetime('now')
            WHERE id = ?
        """, (notification_id,))
        
        if cursor.rowcount > 0:
            conn.commit()
            conn.close()
            return jsonify({'success': True, 'message': 'Notification marked as read'})
        else:
            conn.close()
            return jsonify({'success': False, 'error': 'Notification not found'}), 404
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# Public endpoint for marking all notifications as read (for testing)
@notifications_bp.route('/api/notifications/mark-all-read-public', methods=['POST'])
def mark_all_notifications_read_public():
    """Mark all notifications as read (public endpoint for testing)"""
    try:
        import sqlite3
        import os
        
        # Database path
        db_paths = [
            os.path.join('instance', 'controlpanel.db'),
            os.path.join('instance', 'app.db')
        ]
        
        db_path = None
        for path in db_paths:
            if os.path.exists(path):
                db_path = path
                break
        
        if not db_path:
            return jsonify({'success': False, 'error': 'Database not found'}), 404
        
        # Connect and query using raw SQL
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get first user
        cursor.execute("SELECT id FROM user LIMIT 1")
        user_result = cursor.fetchone()
        
        if not user_result:
            conn.close()
            return jsonify({'success': False, 'error': 'No users found'}), 404
        
        user_id = user_result[0]
        
        # Update all notifications as read
        cursor.execute("""
            UPDATE notifications 
            SET is_read = 1, updated_at = datetime('now')
            WHERE (user_id = ? OR is_global = 1)
        """, (user_id,))
        
        updated_count = cursor.rowcount
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': f'Marked {updated_count} notifications as read'})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# Public endpoint for deleting notification (for testing)
@notifications_bp.route('/api/notifications/<int:notification_id>/delete-public', methods=['POST'])
def delete_notification_public(notification_id):
    """Delete a specific notification (public endpoint for testing)"""
    try:
        import sqlite3
        import os
        
        # Database path
        db_paths = [
            os.path.join('instance', 'controlpanel.db'),
            os.path.join('instance', 'app.db')
        ]
        
        db_path = None
        for path in db_paths:
            if os.path.exists(path):
                db_path = path
                break
        
        if not db_path:
            return jsonify({'success': False, 'error': 'Database not found'}), 404
        
        # Connect and delete using raw SQL
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Delete notification
        cursor.execute("""
            DELETE FROM notifications 
            WHERE id = ?
        """, (notification_id,))
        
        if cursor.rowcount > 0:
            conn.commit()
            conn.close()
            return jsonify({'success': True, 'message': 'Notification deleted'})
        else:
            conn.close()
            return jsonify({'success': False, 'error': 'Notification not found'}), 404
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500 
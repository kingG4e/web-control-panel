#!/usr/bin/env python3
"""
Test script to create sample notifications
Run this after starting the Flask app
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app
from models.base import db

def create_sample_notifications():
    """Create sample notifications using direct database access"""
    
    with app.app_context():
        # Import after app context to avoid circular imports
        from models.notification import Notification
        from models.user import User
        
        # Get the first user (or create one if none exists)
        user = User.query.first()
        if not user:
            print("No users found. Creating a test user...")
            user = User(username='testuser', email='test@example.com')
            user.set_password('password')
            db.session.add(user)
            db.session.commit()
            print(f"Created test user: {user.username}")
        
        # Clear existing notifications for clean test
        try:
            db.session.execute(db.text("DELETE FROM notifications"))
            db.session.commit()
            print("Cleared existing notifications")
        except Exception as e:
            print(f"Note: {e}")
        
        # Sample notifications data
        sample_notifications = [
            {
                'title': 'Welcome to the Control Panel!',
                'message': 'Your account has been set up successfully. You can now manage your services from this dashboard.',
                'type': 'success',
                'category': 'system',
                'priority': 'normal',
                'user_id': user.id
            },
            {
                'title': 'SSL Certificate Expiring Soon',
                'message': 'Your SSL certificate for example.com will expire in 7 days. Please renew it to avoid service interruption.',
                'type': 'warning',
                'category': 'ssl',
                'priority': 'high',
                'action_url': '/ssl-certificates',
                'action_text': 'Renew Certificate',
                'user_id': user.id
            },
            {
                'title': 'System Maintenance Scheduled',
                'message': 'System maintenance is scheduled for tonight at 2:00 AM. Expected downtime: 30 minutes.',
                'type': 'warning',
                'category': 'system',
                'priority': 'high',
                'is_global': True,  # Global notification for all users
                'user_id': None
            },
            {
                'title': 'Backup Completed Successfully',
                'message': 'Your daily backup has been completed successfully. All files and databases are backed up.',
                'type': 'success',
                'category': 'backup',
                'priority': 'normal',
                'user_id': user.id
            },
            {
                'title': 'High CPU Usage Detected',
                'message': 'CPU usage has been above 90% for the last 10 minutes. Please check your applications.',
                'type': 'error',
                'category': 'system',
                'priority': 'critical',
                'action_url': '/dashboard',
                'action_text': 'View Dashboard',
                'user_id': user.id
            },
            {
                'title': 'New Email Account Created',
                'message': 'Email account "support@example.com" has been created successfully.',
                'type': 'success',
                'category': 'email',
                'priority': 'normal',
                'user_id': user.id
            },
            {
                'title': 'Disk Space Warning',
                'message': 'Your disk usage is at 85%. Consider cleaning up old files or upgrading your storage.',
                'type': 'warning',
                'category': 'system',
                'priority': 'normal',
                'action_url': '/file-manager',
                'action_text': 'Manage Files',
                'user_id': user.id
            },
            {
                'title': 'Security Update Available',
                'message': 'A security update is available for your system. Please apply it as soon as possible.',
                'type': 'warning',
                'category': 'security',
                'priority': 'high',
                'is_global': True,
                'user_id': None
            }
        ]
        
        # Create notifications
        created_count = 0
        for notif_data in sample_notifications:
            try:
                notification = Notification.create_notification(
                    title=notif_data['title'],
                    message=notif_data['message'],
                    type=notif_data['type'],
                    category=notif_data['category'],
                    user_id=notif_data.get('user_id'),
                    is_global=notif_data.get('is_global', False),
                    priority=notif_data['priority'],
                    action_url=notif_data.get('action_url'),
                    action_text=notif_data.get('action_text')
                )
                created_count += 1
                print(f"✅ Created: {notification.title}")
            except Exception as e:
                print(f"❌ Failed to create notification '{notif_data['title']}': {e}")
        
        print(f"\n🎉 Successfully created {created_count} test notifications!")
        
        # Show summary
        try:
            total_result = db.session.execute(db.text("SELECT COUNT(*) FROM notifications")).fetchone()
            unread_result = db.session.execute(db.text("SELECT COUNT(*) FROM notifications WHERE is_read = 0")).fetchone()
            global_result = db.session.execute(db.text("SELECT COUNT(*) FROM notifications WHERE is_global = 1")).fetchone()
            
            total_notifications = total_result[0] if total_result else 0
            unread_count = unread_result[0] if unread_result else 0
            global_count = global_result[0] if global_result else 0
            
            print(f"\n📊 Summary:")
            print(f"   Total notifications: {total_notifications}")
            print(f"   Unread notifications: {unread_count}")
            print(f"   Global notifications: {global_count}")
            print(f"   User-specific notifications: {total_notifications - global_count}")
            
            print(f"\n🔔 You should now see {unread_count} unread notifications in the web interface!")
        except Exception as e:
            print(f"Note: Could not get summary: {e}")

if __name__ == "__main__":
    create_sample_notifications() 
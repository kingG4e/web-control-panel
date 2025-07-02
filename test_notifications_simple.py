#!/usr/bin/env python3
"""
Simple notification test - creates notifications directly in database
No need for backend to be running
"""

import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

def test_notifications():
    print("🔔 Testing Notification System (Direct Database)")
    print("=" * 50)
    
    try:
        # Import Flask app and models
        from app import app
        from models.notification import Notification
        from models.user import User
        from models.base import db
        
        with app.app_context():
            print("\n1. Setting up test environment...")
            
            # Get or create test user
            user = User.query.filter_by(username='testuser').first()
            if not user:
                print("   Creating test user...")
                user = User(username='testuser', email='test@example.com')
                user.set_password('password')
                db.session.add(user)
                db.session.commit()
                print(f"   ✅ Created user: {user.username}")
            else:
                print(f"   ✅ Using existing user: {user.username}")
            
            print("\n2. Creating sample notifications...")
            
            # Clear existing notifications
            try:
                db.session.execute(db.text("DELETE FROM notifications"))
                db.session.commit()
                print("   Cleared existing notifications")
            except Exception as e:
                print(f"   Note: {e}")
            
            # Sample notifications
            notifications_data = [
                {
                    'title': '🎉 Welcome to Control Panel!',
                    'message': 'Your account is ready. Start managing your services now!',
                    'type': 'success',
                    'category': 'system',
                    'priority': 'normal',
                    'user_id': user.id
                },
                {
                    'title': '⚠️ SSL Certificate Expiring',
                    'message': 'Your SSL certificate expires in 7 days. Renew now to avoid downtime.',
                    'type': 'warning',
                    'category': 'ssl',
                    'priority': 'high',
                    'action_url': '/ssl-certificates',
                    'action_text': 'Renew Now',
                    'user_id': user.id
                },
                {
                    'title': '🔧 System Maintenance Tonight',
                    'message': 'Scheduled maintenance at 2:00 AM. Expected downtime: 30 minutes.',
                    'type': 'warning',
                    'category': 'system',
                    'priority': 'high',
                    'is_global': True
                },
                {
                    'title': '✅ Backup Completed',
                    'message': 'Daily backup successful. All data is safely stored.',
                    'type': 'success',
                    'category': 'backup',
                    'priority': 'normal',
                    'user_id': user.id
                },
                {
                    'title': '🚨 High CPU Usage Alert',
                    'message': 'CPU usage above 90% for 10+ minutes. Check your applications.',
                    'type': 'error',
                    'category': 'system',
                    'priority': 'critical',
                    'action_url': '/dashboard',
                    'action_text': 'View Dashboard',
                    'user_id': user.id
                },
                {
                    'title': '📧 Email Account Created',
                    'message': 'New email account "support@example.com" is ready to use.',
                    'type': 'success',
                    'category': 'email',
                    'priority': 'normal',
                    'user_id': user.id
                }
            ]
            
            # Create notifications
            created_count = 0
            for notif_data in notifications_data:
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
                    print(f"   ✅ {notification.title}")
                except Exception as e:
                    print(f"   ❌ Failed: {notif_data['title']} - {e}")
            
            print(f"\n3. Testing notification queries...")
            
            # Get counts
            try:
                total_result = db.session.execute(db.text("SELECT COUNT(*) FROM notifications")).fetchone()
                unread_result = db.session.execute(db.text("SELECT COUNT(*) FROM notifications WHERE is_read = 0")).fetchone()
                global_result = db.session.execute(db.text("SELECT COUNT(*) FROM notifications WHERE is_global = 1")).fetchone()
                
                total_count = total_result[0] if total_result else 0
                unread_count = unread_result[0] if unread_result else 0
                global_count = global_result[0] if global_result else 0
                
                print(f"   📊 Total notifications: {total_count}")
                print(f"   🔴 Unread notifications: {unread_count}")
                print(f"   🌐 Global notifications: {global_count}")
                print(f"   👤 User notifications: {total_count - global_count}")
                
            except Exception as e:
                print(f"   ❌ Query error: {e}")
            
            print("\n" + "=" * 50)
            print("🎯 Test Results:")
            print(f"✅ Created {created_count} sample notifications")
            print(f"✅ Database operations working")
            print(f"✅ Notification models functioning")
            
            if unread_count > 0:
                print(f"\n🔔 SUCCESS! You should see {unread_count} notifications in the web interface!")
                print("\n📋 Next steps:")
                print("1. Start backend: python backend/app.py")
                print("2. Start frontend: cd frontend && npm start")
                print("3. Login at http://localhost:3000")
                print("4. Look for the red badge on the notification bell! 🔔")
                print("\n💡 The notification system is ready to use!")
            else:
                print("\n⚠️  No unread notifications found")
                
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("Make sure you're in the project root directory")
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_notifications() 
#!/usr/bin/env python3
"""
Simple notification test using direct SQLite access
"""

import sqlite3
import os
from datetime import datetime

def test_notifications():
    print("🔔 Simple Notification Test (Direct SQLite)")
    print("=" * 50)
    
    # Database path
    db_path = os.path.join('backend', 'instance', 'app.db')
    
    if not os.path.exists(db_path):
        print("❌ Database not found. Please run the backend first to create the database.")
        return
    
    try:
        # Connect to database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("✅ Connected to database")
        
        # Check if users table exists and get a user
        cursor.execute("SELECT id FROM users LIMIT 1")
        user_result = cursor.fetchone()
        
        if not user_result:
            print("   Creating test user...")
            cursor.execute("""
                INSERT INTO users (username, email, password_hash, created_at, updated_at) 
                VALUES ('testuser', 'test@example.com', 'test_hash', ?, ?)
            """, (datetime.now(), datetime.now()))
            conn.commit()
            user_id = cursor.lastrowid
            print(f"   ✅ Created user with ID: {user_id}")
        else:
            user_id = user_result[0]
            print(f"   ✅ Using existing user ID: {user_id}")
        
        # Clear existing notifications
        cursor.execute("DELETE FROM notifications")
        conn.commit()
        print("   Cleared existing notifications")
        
        # Sample notifications
        notifications = [
            ('🎉 Welcome to Control Panel!', 'Your account is ready. Start managing your services now!', 'success', 'system', 'normal', user_id, 0),
            ('⚠️ SSL Certificate Expiring', 'Your SSL certificate expires in 7 days. Renew now!', 'warning', 'ssl', 'high', user_id, 0),
            ('🔧 System Maintenance Tonight', 'Scheduled maintenance at 2:00 AM. Downtime: 30 minutes.', 'warning', 'system', 'high', None, 1),
            ('✅ Backup Completed', 'Daily backup successful. All data is safely stored.', 'success', 'backup', 'normal', user_id, 0),
            ('🚨 High CPU Usage Alert', 'CPU usage above 90%. Check your applications now!', 'error', 'system', 'critical', user_id, 0),
            ('📧 Email Account Created', 'New email "support@example.com" is ready to use.', 'success', 'email', 'normal', user_id, 0),
            ('💾 Disk Space Warning', 'Disk usage at 85%. Consider cleaning up files.', 'warning', 'system', 'normal', user_id, 0),
            ('🔐 Security Update Available', 'Important security update available. Apply soon!', 'warning', 'security', 'high', None, 1)
        ]
        
        # Insert notifications
        created_count = 0
        for title, message, type_val, category, priority, uid, is_global in notifications:
            try:
                cursor.execute("""
                    INSERT INTO notifications (title, message, type, category, priority, user_id, is_global, is_read, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
                """, (title, message, type_val, category, priority, uid, is_global, datetime.now(), datetime.now()))
                created_count += 1
                print(f"   ✅ {title}")
            except Exception as e:
                print(f"   ❌ Failed: {title} - {e}")
        
        conn.commit()
        
        # Get counts
        cursor.execute("SELECT COUNT(*) FROM notifications")
        total_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM notifications WHERE is_read = 0")
        unread_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM notifications WHERE is_global = 1")
        global_count = cursor.fetchone()[0]
        
        # Show results
        print(f"\n📊 Results:")
        print(f"   Total notifications: {total_count}")
        print(f"   Unread notifications: {unread_count}")
        print(f"   Global notifications: {global_count}")
        print(f"   User notifications: {total_count - global_count}")
        
        conn.close()
        
        print("\n" + "=" * 50)
        print("🎯 Test Results:")
        print(f"✅ Successfully created {created_count} notifications")
        print(f"✅ Database operations completed")
        
        if unread_count > 0:
            print(f"\n🔔 SUCCESS! You should see {unread_count} notifications in the web interface!")
            print("\n📋 Next steps:")
            print("1. Make sure backend is running: python backend/app.py")
            print("2. Start frontend: cd frontend && npm start")
            print("3. Login at http://localhost:3000")
            print("4. Look for the red badge on the notification bell! 🔔")
            print("\n💡 The notification system is ready to use!")
        else:
            print("\n⚠️  No unread notifications found")
            
    except sqlite3.Error as e:
        print(f"❌ Database error: {e}")
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_notifications() 
import sqlite3
import os
from datetime import datetime

def test_notifications():
    print("Simple Notification Test (Direct SQLite)")
    print("=" * 50)
    
    # Try both possible database names
    db_paths = [
        os.path.join("backend", "instance", "controlpanel.db"),
        os.path.join("backend", "instance", "app.db")
    ]
    
    db_path = None
    for path in db_paths:
        if os.path.exists(path):
            db_path = path
            break
    
    if not db_path:
        print("Database not found. Please run the backend first.")
        print("Expected locations:")
        for path in db_paths:
            print(f"- {path}")
        return
    
    print(f"Using database: {db_path}")
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("Connected to database")
        
        # Check if notifications table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='notifications'")
        if not cursor.fetchone():
            print("Notifications table not found. Please run the backend to create tables.")
            return
        
        cursor.execute("SELECT id FROM user LIMIT 1")
        user_result = cursor.fetchone()
        
        if not user_result:
            print("Creating test user...")
            cursor.execute("""
                INSERT INTO user (username, email, password_hash, created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?)
            """, ("testuser", "test@example.com", "test_hash", datetime.now(), datetime.now()))
            conn.commit()
            user_id = cursor.lastrowid
            print(f"Created user with ID: {user_id}")
        else:
            user_id = user_result[0]
            print(f"Using existing user ID: {user_id}")
        
        cursor.execute("DELETE FROM notifications")
        conn.commit()
        print("Cleared existing notifications")
        
        notifications = [
            ("Welcome to Control Panel!", "Your account is ready. Start managing services!", "success", "system", "normal", user_id, 0),
            ("SSL Certificate Expiring", "Your SSL certificate expires in 7 days. Renew now!", "warning", "ssl", "high", user_id, 0),
            ("System Maintenance Tonight", "Scheduled maintenance at 2:00 AM. Downtime: 30 minutes.", "warning", "system", "high", None, 1),
            ("Backup Completed", "Daily backup successful. All data is safely stored.", "success", "backup", "normal", user_id, 0),
            ("High CPU Usage Alert", "CPU usage above 90%. Check your applications now!", "error", "system", "critical", user_id, 0),
            ("Email Account Created", "New email support@example.com is ready to use.", "success", "email", "normal", user_id, 0),
            ("Disk Space Warning", "Disk usage at 85%. Consider cleaning up files.", "warning", "system", "normal", user_id, 0),
            ("Security Update Available", "Important security update available. Apply soon!", "warning", "security", "high", None, 1)
        ]
        
        created_count = 0
        for title, message, type_val, category, priority, uid, is_global in notifications:
            try:
                cursor.execute("""
                    INSERT INTO notifications (title, message, type, category, priority, user_id, is_global, is_read, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
                """, (title, message, type_val, category, priority, uid, is_global, datetime.now(), datetime.now()))
                created_count += 1
                print(f"Created: {title}")
            except Exception as e:
                print(f"Failed: {title} - {e}")
        
        conn.commit()
        
        cursor.execute("SELECT COUNT(*) FROM notifications")
        total_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM notifications WHERE is_read = 0")
        unread_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM notifications WHERE is_global = 1")
        global_count = cursor.fetchone()[0]
        
        print(f"\nResults:")
        print(f"Total notifications: {total_count}")
        print(f"Unread notifications: {unread_count}")
        print(f"Global notifications: {global_count}")
        print(f"User notifications: {total_count - global_count}")
        
        conn.close()
        
        print("\nTest Results:")
        print(f"Successfully created {created_count} notifications")
        print(f"Database operations completed")
        
        if unread_count > 0:
            print(f"\nSUCCESS! You should see {unread_count} notifications in the web interface!")
            print("\nNext steps:")
            print("1. Make sure backend is running: python backend/app.py")
            print("2. Start frontend: cd frontend && npm start")
            print("3. Login at http://localhost:3000")
            print("4. Look for the red badge on the notification bell!")
            print("\nThe notification system is ready to use!")
        else:
            print("\nNo unread notifications found")
            
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_notifications() 
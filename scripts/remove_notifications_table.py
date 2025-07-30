#!/usr/bin/env python3
"""
Script to remove the notifications table from the database.
This should be run after removing all notification-related code.
"""

import os
import sys
import sqlite3
from pathlib import Path

def remove_notifications_table():
    """Remove the notifications table from the database if it exists."""
    
    # Find the database file
    db_paths = [
        Path('instance/controlpanel.db'),
        Path('instance/app.db'),
        Path('controlpanel.db'),
        Path('app.db')
    ]
    
    db_path = None
    for path in db_paths:
        if path.exists():
            db_path = path
            break
    
    if not db_path:
        print("❌ No database file found")
        return False
    
    print(f"📁 Found database: {db_path}")
    
    try:
        # Connect to database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if notifications table exists
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='notifications'
        """)
        
        if cursor.fetchone():
            print("🗑️  Removing notifications table...")
            
            # Drop the notifications table
            cursor.execute("DROP TABLE notifications")
            conn.commit()
            
            print("✅ Notifications table removed successfully")
        else:
            print("ℹ️  Notifications table does not exist")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Error removing notifications table: {e}")
        return False

if __name__ == "__main__":
    print("🔧 Removing notifications table from database...")
    success = remove_notifications_table()
    
    if success:
        print("✅ Database cleanup completed")
    else:
        print("❌ Database cleanup failed")
        sys.exit(1) 
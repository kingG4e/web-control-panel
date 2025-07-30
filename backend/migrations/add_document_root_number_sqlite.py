#!/usr/bin/env python3
"""
Migration script to add document_root_number column to virtual_host table for SQLite
and update existing records to have document_root_number = 1
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from models.database import db
from models.virtual_host import VirtualHost
from sqlalchemy import text

def migrate():
    """Run the migration for SQLite"""
    app = create_app()
    
    with app.app_context():
        try:
            # Check if column already exists using SQLite pragma
            result = db.session.execute(text("PRAGMA table_info(virtual_host)"))
            columns = [row[1] for row in result.fetchall()]
            
            if 'document_root_number' in columns:
                print("Column document_root_number already exists, skipping migration")
                return
            
            # Add the new column
            print("Adding document_root_number column...")
            db.session.execute(text("""
                ALTER TABLE virtual_host 
                ADD COLUMN document_root_number INTEGER DEFAULT 1
            """))
            
            # Update existing records to have document_root_number = 1
            print("Updating existing records...")
            db.session.execute(text("""
                UPDATE virtual_host 
                SET document_root_number = 1 
                WHERE document_root_number IS NULL
            """))
            
            # Commit changes
            db.session.commit()
            print("Migration completed successfully!")
            
        except Exception as e:
            print(f"Migration failed: {e}")
            db.session.rollback()
            raise

if __name__ == "__main__":
    migrate() 
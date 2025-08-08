import os
import subprocess
from datetime import datetime
import mysql.connector
from mysql.connector import Error

class MySQLService:
    def __init__(self):
        self.backup_dir = '/var/backups/mysql'
        self.config = {
            'host': 'localhost',
            'user': 'root',
            'password': os.getenv('MYSQL_ROOT_PASSWORD', 'Kg_73260')
        }

    def create_database(self, name, charset='utf8mb4', collation='utf8mb4_unicode_ci'):
        """Create a new MySQL database"""
        try:
            conn = mysql.connector.connect(**self.config)
            cursor = conn.cursor()
            
            # Create database with specified charset and collation
            cursor.execute(f"CREATE DATABASE `{name}` CHARACTER SET {charset} COLLATE {collation}")
            
            cursor.close()
            conn.close()
            
        except Error as e:
            raise Exception(f'Failed to create database: {str(e)}')

    def delete_database(self, name):
        """Delete a MySQL database"""
        try:
            conn = mysql.connector.connect(**self.config)
            cursor = conn.cursor()
            
            # Drop database
            cursor.execute(f"DROP DATABASE `{name}`")
            
            cursor.close()
            conn.close()
            
        except Error as e:
            raise Exception(f'Failed to delete database: {str(e)}')

    def create_user(self, username, password, host='%'):
        """Create a new MySQL user"""
        try:
            conn = mysql.connector.connect(**self.config)
            cursor = conn.cursor()
            
            # Create user
            cursor.execute(f"CREATE USER '{username}'@'{host}' IDENTIFIED BY '{password}'")
            
            cursor.close()
            conn.close()
            
        except Error as e:
            raise Exception(f'Failed to create user: {str(e)}')

    def delete_user(self, username, host='%'):
        """Delete a MySQL user"""
        try:
            conn = mysql.connector.connect(**self.config)
            cursor = conn.cursor()
            
            # Drop user
            cursor.execute(f"DROP USER '{username}'@'{host}'")
            
            cursor.close()
            conn.close()
            
        except Error as e:
            raise Exception(f'Failed to delete user: {str(e)}')

    def grant_privileges(self, username, database, privileges='ALL PRIVILEGES', host='%'):
        """Grant privileges to a user on a database"""
        try:
            conn = mysql.connector.connect(**self.config)
            cursor = conn.cursor()
            
            # Grant privileges
            cursor.execute(f"GRANT {privileges} ON `{database}`.* TO '{username}'@'{host}'")
            cursor.execute("FLUSH PRIVILEGES")
            
            cursor.close()
            conn.close()
            
        except Error as e:
            raise Exception(f'Failed to grant privileges: {str(e)}')

    def revoke_privileges(self, username, database, host='%'):
        """Revoke all privileges from a user on a database"""
        try:
            conn = mysql.connector.connect(**self.config)
            cursor = conn.cursor()
            
            # Revoke privileges
            cursor.execute(f"REVOKE ALL PRIVILEGES ON `{database}`.* FROM '{username}'@'{host}'")
            cursor.execute("FLUSH PRIVILEGES")
            
            cursor.close()
            conn.close()
            
        except Error as e:
            raise Exception(f'Failed to revoke privileges: {str(e)}')

    def create_backup(self, database, backup_type='manual'):
        """Create a database backup"""
        try:
            # Create backup directory if it doesn't exist
            os.makedirs(self.backup_dir, exist_ok=True)
            
            # Generate backup filename
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"{database}_{timestamp}.sql"
            backup_path = os.path.join(self.backup_dir, filename)
            
            # Execute mysqldump
            command = [
                'mysqldump',
                f'--user={self.config["user"]}',
                f'--password={self.config["password"]}',
                '--single-transaction',
                '--quick',
                '--lock-tables=false',
                database
            ]
            
            with open(backup_path, 'w') as f:
                subprocess.run(command, stdout=f, check=True)
            
            # Get backup size
            size = os.path.getsize(backup_path) / (1024 * 1024)  # Convert to MB
            
            return {
                'filename': filename,
                'size': size,
                'type': backup_type
            }
            
        except subprocess.CalledProcessError as e:
            raise Exception(f'Failed to create backup: {str(e)}')
        except Exception as e:
            raise Exception(f'Failed to create backup: {str(e)}')

    def restore_backup(self, database, filename):
        """Restore a database from backup"""
        try:
            backup_path = os.path.join(self.backup_dir, filename)
            
            # Check if backup file exists
            if not os.path.exists(backup_path):
                raise Exception('Backup file not found')
            
            # Execute mysql restore
            command = [
                'mysql',
                f'--user={self.config["user"]}',
                f'--password={self.config["password"]}',
                database
            ]
            
            with open(backup_path, 'r') as f:
                subprocess.run(command, stdin=f, check=True)
            
        except subprocess.CalledProcessError as e:
            raise Exception(f'Failed to restore backup: {str(e)}')
        except Exception as e:
            raise Exception(f'Failed to restore backup: {str(e)}')

    def get_database_size(self, database):
        """Get the size of a database in MB"""
        try:
            conn = mysql.connector.connect(**self.config)
            cursor = conn.cursor()
            
            # Get database size
            cursor.execute(f"""
                SELECT SUM(data_length + index_length) / 1024 / 1024
                FROM information_schema.tables
                WHERE table_schema = '{database}'
                GROUP BY table_schema
            """)
            
            result = cursor.fetchone()
            size = result[0] if result else 0
            
            cursor.close()
            conn.close()
            
            return size
            
        except Error as e:
            raise Exception(f'Failed to get database size: {str(e)}')

    def get_databases_by_user(self, user_id: int) -> list:
        """Get all databases owned by a specific user"""
        from models.database import Database
        return Database.query.filter_by(owner_id=user_id).all() 
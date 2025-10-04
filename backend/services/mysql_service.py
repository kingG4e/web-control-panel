import os
import subprocess
from datetime import datetime
import mysql.connector
from mysql.connector import Error, errorcode
from utils.validators import is_safe_database_name

ALLOWED_PRIVILEGES = [
    'ALL PRIVILEGES', 'CREATE', 'DROP', 'DELETE', 'INSERT', 'SELECT', 'UPDATE',
    'GRANT OPTION', 'EXECUTE', 'PROXY', 'RELOAD', 'SHUTDOWN', 'SHOW DATABASES',
    'SUPER', 'PROCESS', 'REFERENCES', 'INDEX', 'ALTER', 'CREATE TEMPORARY TABLES',
    'LOCK TABLES', 'CREATE VIEW', 'SHOW VIEW', 'CREATE ROUTINE', 'ALTER ROUTINE',
    'EVENT', 'TRIGGER', 'CREATE USER'
]

class MySQLService:
    def __init__(self):
        self.backup_dir = '/var/backups/mysql'
        self.config = {
            'host': 'localhost',
            'user': 'root',
            'password': os.getenv('MYSQL_ROOT_PASSWORD')
        }
        if not self.config['password']:
            raise Exception("MYSQL_ROOT_PASSWORD environment variable not set.")

    def create_database(self, name, charset='utf8mb4', collation='utf8mb4_unicode_ci'):
        """Create a new MySQL database"""
        try:
            conn = mysql.connector.connect(**self.config)
            cursor = conn.cursor()
            
            # Create database with specified charset and collation
            if not is_safe_database_name(name):
                raise Exception(f'Invalid database name: {name}')
            cursor.execute(f"CREATE DATABASE `{name}` CHARACTER SET %s COLLATE %s", (charset, collation))
            
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
            if not is_safe_database_name(name):
                raise Exception(f'Invalid database name: {name}')
            cursor.execute(f"DROP DATABASE `{name}`")
            
            cursor.close()
            conn.close()
            
        except Error as e:
            raise Exception(f'Failed to delete database: {str(e)}')

    def create_user(self, username, password, host='%'):
        """Create a new MySQL user. If the user already exists, update the password."""
        try:
            conn = mysql.connector.connect(**self.config)
            cursor = conn.cursor()

            try:
                # Prefer idempotent creation where supported
                cursor.execute("CREATE USER IF NOT EXISTS %s@%s IDENTIFIED BY %s", (username, host, password))
                conn.commit()
            except Error as e:
                # 1396: Operation CREATE USER failed (user may already exist)
                if getattr(e, 'errno', None) == 1396 or 'Operation CREATE USER failed' in str(e):
                    # Attempt to update existing user's password
                    cursor.execute("ALTER USER %s@%s IDENTIFIED BY %s", (username, host, password))
                    conn.commit()
                else:
                    raise

            cursor.close()
            conn.close()
        except Error as e:
            raise Exception(f'Failed to create user: {str(e)}')

    def alter_user_password(self, username: str, password: str, host: str = '%'):
        """Alter an existing MySQL user's password."""
        try:
            conn = mysql.connector.connect(**self.config)
            cursor = conn.cursor()
            cursor.execute("ALTER USER %s@%s IDENTIFIED BY %s", (username, host, password))
            conn.commit()
            cursor.close()
            conn.close()
        except Error as e:
            raise Exception(f'Failed to alter user password: {str(e)}')

    def rename_user_host(self, username: str, old_host: str, new_host: str):
        """Rename user's host part. MySQL supports RENAME USER 'u'@'old' TO 'u'@'new'."""
        try:
            conn = mysql.connector.connect(**self.config)
            cursor = conn.cursor()
            cursor.execute("RENAME USER %s@%s TO %s@%s", (username, old_host, username, new_host))
            conn.commit()
            cursor.close()
            conn.close()
        except Error as e:
            raise Exception(f'Failed to rename user host: {str(e)}')

    def delete_user(self, username, host='%'):
        """Delete a MySQL user (no error if missing)."""
        try:
            conn = mysql.connector.connect(**self.config)
            cursor = conn.cursor()

            try:
                cursor.execute("DROP USER IF EXISTS %s@%s", (username, host))
                conn.commit()
            except Error as e:
                # 1397: Operation DROP USER failed (ignore if doesn't exist)
                if getattr(e, 'errno', None) == 1397 or 'Operation DROP USER failed' in str(e):
                    pass
                else:
                    raise

            cursor.close()
            conn.close()
        except Error as e:
            raise Exception(f'Failed to delete user: {str(e)}')

    def grant_privileges(self, username, database, privileges='ALL PRIVILEGES', host='%'):
        """Grant privileges to a user on a database"""
        try:
            conn = mysql.connector.connect(**self.config)
            cursor = conn.cursor()

            # Validate privileges
            privileges_list = [p.strip() for p in privileges.upper().split(',')]
            for p in privileges_list:
                if p not in ALLOWED_PRIVILEGES:
                    raise Exception(f"Invalid privilege: {p}")
            
            # Grant privileges
            if not is_safe_database_name(database):
                raise Exception(f'Invalid database name: {database}')
            cursor.execute(f"GRANT {privileges} ON `{database}`.* TO %s@%s", (username, host))
            cursor.execute("FLUSH PRIVILEGES")
            conn.commit()
            
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
            if not is_safe_database_name(database):
                raise Exception(f'Invalid database name: {database}')
            cursor.execute(f"REVOKE ALL PRIVILEGES ON `{database}`.* FROM %s@%s", (username, host))
            cursor.execute("FLUSH PRIVILEGES")
            conn.commit()
            
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
            if not is_safe_database_name(database):
                raise Exception(f'Invalid database name: {database}')
            cursor.execute("""
                SELECT SUM(data_length + index_length) / 1024 / 1024
                FROM information_schema.tables
                WHERE table_schema = %s
                GROUP BY table_schema
            """, (database,))
            
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

    def list_databases(self):
        """List all databases on the server, excluding system databases."""
        try:
            conn = mysql.connector.connect(**self.config)
            cursor = conn.cursor()
            cursor.execute("SHOW DATABASES")
            databases = [db[0] for db in cursor.fetchall()]
            cursor.close()
            conn.close()
            
            # Filter out system databases
            system_dbs = ['information_schema', 'mysql', 'performance_schema', 'sys']
            return [db for db in databases if db not in system_dbs]
        except Error as e:
            raise Exception(f'Failed to list databases: {str(e)}')

    def user_exists(self, username, host='%'):
        """Check if a MySQL user exists."""
        try:
            conn = mysql.connector.connect(**self.config)
            cursor = conn.cursor()
            cursor.execute("SELECT 1 FROM mysql.user WHERE user = %s AND host = %s", (username, host))
            result = cursor.fetchone()
            conn.close()
            return result is not None
        except Error as e:
            # In case of error, it's safer to assume user might not exist
            # or there's a connection issue. Logging the error is important.
            print(f"Error checking if user exists: {e}")
            return False 
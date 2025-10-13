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

            # Check if user already exists
            cursor.execute("SELECT 1 FROM mysql.user WHERE user = %s AND host = %s", (username, host))
            user_exists = cursor.fetchone() is not None

            if user_exists:
                # User exists, update password
                try:
                    cursor.execute("ALTER USER %s@%s IDENTIFIED BY %s", (username, host, password))
                    conn.commit()
                except Error as e:
                    # If ALTER USER fails, try SET PASSWORD
                    try:
                        cursor.execute("SET PASSWORD FOR %s@%s = %s", (username, host, password))
                        conn.commit()
                    except Error as e2:
                        raise Exception(f'Failed to update existing user password: {str(e2)}. Original error: {str(e)}')
            else:
                # User doesn't exist, create new user
                try:
                    cursor.execute("CREATE USER %s@%s IDENTIFIED BY %s", (username, host, password))
                    conn.commit()
                except Error as e:
                    # If CREATE USER fails, try with IF NOT EXISTS
                    try:
                        cursor.execute("CREATE USER IF NOT EXISTS %s@%s IDENTIFIED BY %s", (username, host, password))
                        conn.commit()
                    except Error as e2:
                        # Provide more specific error information
                        if "not allowed to create a user with GRANT" in str(e2):
                            raise Exception(f'MySQL root user lacks CREATE USER privilege. Please ensure the root user has CREATE USER and GRANT OPTION privileges. Error: {str(e2)}')
                        elif "Access denied" in str(e2):
                            raise Exception(f'Access denied when creating user. Please check MySQL root user permissions. Error: {str(e2)}')
                        else:
                            raise Exception(f'Failed to create user: {str(e2)}. Original error: {str(e)}')
                
                # Verify user was created successfully
                cursor.execute("SELECT 1 FROM mysql.user WHERE user = %s AND host = %s", (username, host))
                if cursor.fetchone() is None:
                    raise Exception(f'User {username}@{host} was not created successfully')

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
            print(f"Granting privileges: {username}@{host} on {database} with privileges: {privileges}")
            conn = mysql.connector.connect(**self.config)
            cursor = conn.cursor()

            # Validate privileges
            privileges_list = [p.strip() for p in privileges.upper().split(',')]
            for p in privileges_list:
                if p not in ALLOWED_PRIVILEGES:
                    raise Exception(f"Invalid privilege: {p}")
            
            # Validate database name
            if not is_safe_database_name(database):
                raise Exception(f'Invalid database name: {database}')
            
            # Check if user exists before granting privileges
            print(f"Checking if user {username}@{host} exists in MySQL...")
            cursor.execute("SELECT 1 FROM mysql.user WHERE user = %s AND host = %s", (username, host))
            if cursor.fetchone() is None:
                raise Exception(f'User {username}@{host} does not exist. Please create the user first.')
            print(f"User {username}@{host} exists in MySQL")
            
            # Grant privileges
            try:
                print(f"Executing: GRANT {privileges} ON `{database}`.* TO {username}@{host}")
                cursor.execute(f"GRANT {privileges} ON `{database}`.* TO %s@%s", (username, host))
                cursor.execute("FLUSH PRIVILEGES")
                conn.commit()
                print(f"Successfully granted privileges to {username}@{host} on {database}")
            except Error as e:
                # If GRANT fails, provide more specific error information
                print(f"GRANT failed with error: {str(e)}")
                if "not allowed to create a user with GRANT" in str(e):
                    raise Exception(f'MySQL root user lacks GRANT privilege. Please ensure the root user has CREATE USER and GRANT OPTION privileges. Error: {str(e)}')
                elif "Access denied" in str(e):
                    raise Exception(f'Access denied when granting privileges. Please check MySQL root user permissions. Error: {str(e)}')
                else:
                    raise Exception(f'Failed to grant privileges: {str(e)}')
            
            cursor.close()
            conn.close()
            
        except Error as e:
            print(f"MySQL connection error: {str(e)}")
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

    def database_exists(self, name):
        """Check if a MySQL database exists."""
        try:
            conn = mysql.connector.connect(**self.config)
            cursor = conn.cursor()
            cursor.execute("SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = %s", (name,))
            result = cursor.fetchone()
            cursor.close()
            conn.close()
            return result is not None
        except Error as e:
            # In case of error, it's safer to assume database might not exist
            # or there's a connection issue. Logging the error is important.
            print(f"Error checking if database exists: {e}")
            return False
    
    def user_exists(self, username, host='%'):
        """Check if a MySQL user exists."""
        try:
            conn = mysql.connector.connect(**self.config)
            cursor = conn.cursor()
            cursor.execute("SELECT 1 FROM mysql.user WHERE user = %s AND host = %s", (username, host))
            result = cursor.fetchone()
            cursor.close()
            conn.close()
            return result is not None
        except Error as e:
            # In case of error, it's safer to assume user might not exist
            # or there's a connection issue. Logging the error is important.
            print(f"Error checking if user exists: {e}")
            return False

    def ensure_user_exists(self, username, password, host='%'):
        """Ensure a MySQL user exists, creating it if necessary."""
        try:
            if not self.user_exists(username, host):
                self.create_user(username, password, host)
                # Verify creation was successful
                if not self.user_exists(username, host):
                    raise Exception(f'Failed to verify user {username}@{host} was created')
            return True
        except Exception as e:
            raise Exception(f'Failed to ensure user exists: {str(e)}')

    def list_users(self):
        """List all MySQL users from the server."""
        try:
            conn = mysql.connector.connect(**self.config)
            cursor = conn.cursor()
            
            # Query to get user information from mysql.user table
            cursor.execute("""
                SELECT 
                    user,
                    host,
                    authentication_string,
                    plugin,
                    password_expired,
                    password_last_changed,
                    password_lifetime,
                    account_locked,
                    password_reuse_time,
                    password_require_current,
                    user_attributes
                FROM mysql.user 
                WHERE user != 'mysql.session' 
                AND user != 'mysql.sys' 
                AND user != 'root'
                ORDER BY user, host
            """)
            
            users = []
            for row in cursor.fetchall():
                user_data = {
                    'username': row[0],
                    'host': row[1],
                    'authentication_string': row[2],
                    'plugin': row[3],
                    'password_expired': row[4],
                    'password_last_changed': row[5],
                    'password_lifetime': row[6],
                    'account_locked': row[7],
                    'password_reuse_time': row[8],
                    'password_require_current': row[9],
                    'user_attributes': row[10],
                    'status': 'active' if not row[7] else 'locked'  # account_locked determines status
                }
                users.append(user_data)
            
            cursor.close()
            conn.close()
            return users
            
        except Error as e:
            raise Exception(f'Failed to list users: {str(e)}')

    def get_user_privileges(self, username, host='%'):
        """Get privileges for a specific user."""
        try:
            conn = mysql.connector.connect(**self.config)
            cursor = conn.cursor()
            
            # Get global privileges
            cursor.execute("SHOW GRANTS FOR %s@%s", (username, host))
            grants = cursor.fetchall()
            
            privileges = []
            for grant in grants:
                privileges.append(grant[0])
            
            cursor.close()
            conn.close()
            return privileges
            
        except Error as e:
            raise Exception(f'Failed to get user privileges: {str(e)}')

    def check_root_privileges(self):
        """Check if the MySQL root user has necessary privileges for user management."""
        try:
            conn = mysql.connector.connect(**self.config)
            cursor = conn.cursor()
            
            # Check if root user has CREATE USER privilege
            cursor.execute("SHOW GRANTS FOR 'root'@'localhost'")
            root_grants = cursor.fetchall()
            
            has_create_user = False
            has_grant_option = False
            
            for grant in root_grants:
                grant_text = grant[0].upper()
                if 'CREATE USER' in grant_text:
                    has_create_user = True
                if 'GRANT OPTION' in grant_text:
                    has_grant_option = True
            
            cursor.close()
            conn.close()
            
            return {
                'has_create_user': has_create_user,
                'has_grant_option': has_grant_option,
                'grants': [grant[0] for grant in root_grants]
            }
            
        except Error as e:
            raise Exception(f'Failed to check root privileges: {str(e)}')

    def fix_root_privileges(self):
        """Attempt to fix MySQL root user privileges (requires super user access)."""
        try:
            conn = mysql.connector.connect(**self.config)
            cursor = conn.cursor()
            
            # Try to grant necessary privileges to root user
            try:
                cursor.execute("GRANT CREATE USER ON *.* TO 'root'@'localhost' WITH GRANT OPTION")
                cursor.execute("GRANT ALL PRIVILEGES ON *.* TO 'root'@'localhost' WITH GRANT OPTION")
                cursor.execute("FLUSH PRIVILEGES")
                conn.commit()
                
                cursor.close()
                conn.close()
                return True
            except Error as e:
                cursor.close()
                conn.close()
                raise Exception(f'Failed to grant privileges to root user: {str(e)}')
                
        except Error as e:
            raise Exception(f'Failed to fix root privileges: {str(e)}') 
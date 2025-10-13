from flask import Blueprint, request, jsonify, session, current_app
from models.database import Database, DatabaseUser, DatabaseBackup, db
from models.virtual_host import VirtualHost
from models.user import User
from services.mysql_service import MySQLService
from services.phpmyadmin_service import PhpMyAdminService
from datetime import datetime
from sqlalchemy.orm import joinedload
from sqlalchemy import desc, or_, text
from sqlalchemy.exc import IntegrityError
from utils.auth import token_required, admin_required
from werkzeug.security import generate_password_hash


def _is_admin(user):
    return bool(getattr(user, 'is_admin', False) or getattr(user, 'role', '') == 'admin' or getattr(user, 'username', '') == 'root')


database_bp = Blueprint('database', __name__)
mysql_service = MySQLService()
phpmyadmin_service = PhpMyAdminService()

@database_bp.route('/api/databases', methods=['GET'])
@token_required
def get_databases(current_user):
    try:
        # Get pagination parameters
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)  # Max 100 per page
        search = request.args.get('search', '', type=str)
        
        # Build query with eager loading
        query = Database.query.options(
            joinedload(Database.users),
            joinedload(Database.backups)
        )
        
        # Non-admins see only their own databases
        if not _is_admin(current_user):
            query = query.filter(Database.owner_id == current_user.id)
        
        # Apply search filter if provided
        if search:
            query = query.filter(Database.name.ilike(f'%{search}%'))
        
        # Apply pagination
        paginated = query.order_by(desc(Database.created_at)).paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        db_names = [db.name for db in paginated.items]
        current_app.logger.info(f"Databases returned for user '{current_user.username}': {db_names}")

        return jsonify({
            'success': True,
            'data': [db.to_dict() for db in paginated.items],
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': paginated.total,
                'pages': paginated.pages,
                'has_next': paginated.has_next,
                'has_prev': paginated.has_prev
            }
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@database_bp.route('/api/databases/sync', methods=['POST'])
@token_required
@admin_required
def sync_databases(current_user):
    """Sync databases from MySQL server to the application database."""
    try:
        # 1. Get all databases from the MySQL server
        server_dbs = mysql_service.list_databases()
        
        # Only consider databases that start with 'db_'
        server_dbs = [name for name in server_dbs if name.startswith('db_')]
        
        # 2. Get all databases known to our application
        app_dbs = [db.name for db in Database.query.all()]
        
        # 3. Find the difference
        new_dbs = [db_name for db_name in server_dbs if db_name not in app_dbs]
        
        imported_count = 0
        if new_dbs:
            for db_name in new_dbs:
                try:
                    # Compute size best-effort
                    try:
                        size_mb = mysql_service.get_database_size(db_name)
                    except Exception:
                        size_mb = None

                    # Attempt to infer owner from database name
                    inferred_owner_id = current_user.id
                    if db_name.startswith('db_'):
                        potential_username = db_name[len('db_'):]
                        # Check if potential_username exists as an application user
                        matching_user = User.query.filter_by(username=potential_username).first()
                        if matching_user:
                            inferred_owner_id = matching_user.id

                    # For imported DBs, assign inferred ownership
                    new_db_record = Database(
                        name=db_name,
                        owner_id=inferred_owner_id,
                        status='active',
                        size=size_mb
                    )
                    db.session.add(new_db_record)
                    imported_count += 1
                except Exception as import_e:
                    current_app.logger.error(f"Failed to import database '{db_name}': {import_e}")
            
            db.session.commit()

        return jsonify({
            'success': True,
            'message': f'Sync completed. Imported {imported_count} new databases.',
            'imported_count': imported_count,
            'new_dbs': new_dbs
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@database_bp.route('/api/databases/<int:id>', methods=['GET'])
@token_required
def get_database(current_user, id):
    # Use eager loading for single database
    database = Database.query.options(
        joinedload(Database.users),
        joinedload(Database.backups)
    ).filter_by(id=id).first()
    
    if not database:
        return jsonify({'error': 'Database not found'}), 404
    
    # Ownership check
    if not _is_admin(current_user) and database.owner_id != current_user.id:
        return jsonify({'success': False, 'error': 'Access denied'}), 403
    
    return jsonify({
        'success': True,
        'data': database.to_dict()
    })

@database_bp.route('/api/databases/<int:id>/users', methods=['GET'])
@token_required
def get_database_users(current_user, id):
    try:
        # Get pagination parameters
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        
        # Verify database exists
        database = Database.query.get_or_404(id)
        
        # Ownership check
        if not _is_admin(current_user) and database.owner_id != current_user.id:
            return jsonify({'success': False, 'error': 'Access denied'}), 403
        
        # Detect schema variants (association table vs legacy FK)
        assoc_exists = True
        try:
            db.session.execute(text('SELECT 1 FROM database_user_association LIMIT 1'))
        except Exception:
            assoc_exists = False

        has_legacy_fk = False
        try:
            # SQLite PRAGMA; ignore errors on other engines (will stay False)
            col_info = db.session.execute(text("PRAGMA table_info('database_user')")).fetchall()
            has_legacy_fk = any(str(row[1]) == 'database_id' for row in col_info)
        except Exception:
            has_legacy_fk = False

        # Use appropriate data source
        if assoc_exists:
            all_users = sorted(database.users, key=lambda u: u.created_at or datetime.utcnow(), reverse=True)
        elif has_legacy_fk:
            all_users = DatabaseUser.query.filter(text('database_id = :dbid')).params(dbid=id).order_by(desc(DatabaseUser.created_at)).all()
        else:
            all_users = []
        total = len(all_users)
        start = (page - 1) * per_page
        end = start + per_page
        items = all_users[start:end]
        pages = (total + per_page - 1) // per_page if per_page else 1
        has_next = page < pages
        has_prev = page > 1
        
        return jsonify({
            'success': True,
            'data': [user.to_dict(include_relations=False) for user in items],
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total,
                'pages': pages,
                'has_next': has_next,
                'has_prev': has_prev
            }
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@database_bp.route('/api/databases/<int:id>/backups', methods=['GET'])
@token_required
def get_database_backups(current_user, id):
    try:
        # Get pagination parameters
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        
        # Verify database exists
        database = Database.query.get_or_404(id)
        
        # Ownership check
        if not _is_admin(current_user) and database.owner_id != current_user.id:
            return jsonify({'success': False, 'error': 'Access denied'}), 403
        
        # Get paginated backups
        paginated = DatabaseBackup.query.filter_by(database_id=id).order_by(
            desc(DatabaseBackup.created_at)
        ).paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        return jsonify({
            'success': True,
            'data': [backup.to_dict(include_relations=False) for backup in paginated.items],
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': paginated.total,
                'pages': paginated.pages,
                'has_next': paginated.has_next,
                'has_prev': paginated.has_prev
            }
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@database_bp.route('/api/databases', methods=['POST'])
@token_required
def create_database(current_user):
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['name']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    try:
        # Create database in MySQL
        mysql_service.create_database(
            data['name'],
            charset=data.get('charset', 'utf8mb4'),
            collation=data.get('collation', 'utf8mb4_unicode_ci')
        )
        
        # Get database size
        size = mysql_service.get_database_size(data['name'])
        
        # Determine owner: non-admins are always the owner; admins can set owner_id
        owner_id = data.get('owner_id') if _is_admin(current_user) and data.get('owner_id') else current_user.id
        
        # Create database record
        database = Database(
            name=data['name'],
            charset=data.get('charset', 'utf8mb4'),
            collation=data.get('collation', 'utf8mb4_unicode_ci'),
            size=size,
            owner_id=owner_id
        )
        
        db.session.add(database)
        db.session.commit()

        # Optional: Create database user and grant privileges if username and password are provided
        if data.get('username') and data.get('password'):
            db_username = data['username']
            db_password = data['password']
            db_host = data.get('host', '%')
            db_privileges = data.get('privileges', 'ALL PRIVILEGES')

            try:
                # Ensure MySQL user exists or create it
                mysql_service.ensure_user_exists(db_username, db_password, host=db_host)
                # Grant privileges for the newly created database
                mysql_service.grant_privileges(db_username, database.name, privileges=db_privileges, host=db_host)

                # Save database user to app DB and associate with database
                from models.database import DatabaseUser
                from werkzeug.security import generate_password_hash
                
                hashed_password = generate_password_hash(db_password)
                db_user_record = DatabaseUser.query.filter_by(username=db_username, host=db_host).first()
                
                if not db_user_record:
                    db_user_record = DatabaseUser(
                        username=db_username,
                        password=hashed_password,
                        host=db_host,
                        privileges=db_privileges
                    )
                    db.session.add(db_user_record)
                    db.session.flush() # Flush to get an ID for association
                else:
                    # Update existing user's password if it changed (and is not a system user)
                    if not db_user_record.is_system_user and db_user_record.password != hashed_password:
                        db_user_record.password = hashed_password
                    
                # Associate user with the database (using modern schema with association table)
                if db_user_record not in database.users:
                    database.users.append(db_user_record)
                
                db.session.commit() # Commit association and potential user updates
                
            except Exception as user_creation_error:
                # Log the error but don't fail the database creation if user creation fails
                print(f"Warning: Failed to create or grant privileges to database user '{db_username}': {user_creation_error}")

        return jsonify({
            'success': True,
            'data': database.to_dict(include_relations=False)
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@database_bp.route('/api/databases/<int:id>', methods=['PUT'])
@token_required
def update_database(current_user, id):
    database = Database.query.get_or_404(id)
    
    # Ownership check
    if not _is_admin(current_user) and database.owner_id != current_user.id:
        return jsonify({'success': False, 'error': 'Access denied'}), 403
    
    data = request.get_json()
    
    try:
        # Update database properties
        if 'charset' in data:
            database.charset = data['charset']
        if 'collation' in data:
            database.collation = data['collation']
        if 'status' in data:
            database.status = data['status']
        if 'associated_domain' in data:
            database.associated_domain = data.get('associated_domain') # Can be None

        if _is_admin(current_user) and 'owner_id' in data:
            database.owner_id = data['owner_id']
        
        database.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': database.to_dict(include_relations=False)
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@database_bp.route('/api/databases/<int:id>', methods=['DELETE'])
@token_required
def delete_database(current_user, id):
    database = Database.query.get_or_404(id)
    
    # Ownership check
    if not _is_admin(current_user) and database.owner_id != current_user.id:
        return jsonify({'success': False, 'error': 'Access denied'}), 403
    
    try:
        # First, delete all associated MySQL users
        for user in database.users:
            try:
                mysql_service.delete_user(user.username, user.host)
            except Exception as user_del_e:
                # Log the error but continue, as the database deletion is more critical
                current_app.logger.warning(f"Could not delete MySQL user '{user.username}@{user.host}': {user_del_e}")

        # Delete database in MySQL
        mysql_service.delete_database(database.name)
        
        # Delete from our database (cascades will handle users)
        db.session.delete(database)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Database deleted successfully'
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@database_bp.route('/api/databases/<int:db_id>/users/<int:user_id>', methods=['DELETE'])
@token_required
def delete_database_user(current_user, db_id, user_id):
    database = Database.query.get_or_404(db_id)
    
    # Ownership check
    if not _is_admin(current_user) and database.owner_id != current_user.id:
        return jsonify({'success': False, 'error': 'Access denied'}), 403
    
    user = DatabaseUser.query.get_or_404(user_id)
    
    # Check if user is actually associated with the database
    if user not in database.users:
        return jsonify({'success': False, 'error': 'User is not associated with this database'}), 400

    try:
        # Revoke privileges from the user for this specific database in MySQL
        mysql_service.revoke_privileges(user.username, database.name, user.host)
        
        # Remove association from our database
        database.users.remove(user)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'User {user.username} access to database {database.name} has been revoked.'
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@database_bp.route('/api/databases/<int:db_id>/users/<int:user_id>', methods=['PUT'])
@token_required
def update_database_user(current_user, db_id, user_id):
    """Update database user settings: password and/or host."""
    database = Database.query.get_or_404(db_id)

    # Ownership/Admin check
    if not _is_admin(current_user) and database.owner_id != current_user.id:
        return jsonify({'success': False, 'error': 'Access denied'}), 403

    user = DatabaseUser.query.get_or_404(user_id)
    if user not in database.users:
        return jsonify({'success': False, 'error': 'User is not associated with this database'}), 400

    data = request.get_json() or {}
    new_password = data.get('password')
    new_host = data.get('host')

    try:
        # Update password if provided
        if new_password:
            mysql_service.alter_user_password(user.username, new_password, user.host)
            # Update stored hash
            hashed = generate_password_hash(new_password)
            user.password = hashed

        # Update host if provided and changed
        if new_host and new_host != user.host:
            # Rename user host in MySQL
            mysql_service.rename_user_host(user.username, user.host, new_host)
            # Also re-grant privileges on this database for new host
            mysql_service.grant_privileges(user.username, database.name, privileges=user.privileges, host=new_host)
            # Update stored host
            user.host = new_host

        user.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({'success': True, 'data': user.to_dict(include_relations=False)})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@database_bp.route('/api/databases/<int:id>/users', methods=['POST'])
@token_required
def create_database_user(current_user, id):
    database = Database.query.get_or_404(id)
    
    # Ownership check
    if not _is_admin(current_user) and database.owner_id != current_user.id:
        return jsonify({'success': False, 'error': 'Access denied'}), 403
    
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['username', 'password']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    try:
        # Detect schema variants (association table vs legacy FK)
        assoc_exists = True
        try:
            db.session.execute(text('SELECT 1 FROM database_user_association LIMIT 1'))
        except Exception:
            assoc_exists = False

        has_legacy_fk = False
        try:
            col_info = db.session.execute(text("PRAGMA table_info('database_user')")).fetchall()
            has_legacy_fk = any(str(row[1]) == 'database_id' for row in col_info)
        except Exception:
            has_legacy_fk = False

        # Check if user already exists in our panel's database
        user = DatabaseUser.query.filter_by(username=data['username']).first()
        user_exists = user is not None

        if not user:
            # If user does not exist, create them in MySQL and in our panel's DB
            mysql_service.ensure_user_exists(
                data['username'],
                data['password'],
                host=data.get('host', '%')
            )
            
            # Hash password for storage
            hashed_password = generate_password_hash(data['password'])

            # First try ORM insert (new schema without legacy column)
            try:
                user = DatabaseUser(
                    username=data['username'],
                    password=hashed_password,
                    host=data.get('host', '%'),
                    privileges=data.get('privileges', 'ALL PRIVILEGES')
                )
                db.session.add(user)
                db.session.flush()
            except IntegrityError as ie:
                # Handle legacy schema where database_user.database_id is NOT NULL
                db.session.rollback()
                if 'database_user.database_id' in str(ie) or 'database_user.database_id' in str(getattr(ie, 'orig', '')):
                    now = datetime.utcnow()
                    insert_sql = text(
                        """
                        INSERT INTO database_user (username, password, host, privileges, status, created_at, updated_at, database_id)
                        VALUES (:username, :password, :host, :privileges, :status, :created_at, :updated_at, :database_id)
                        """
                    )
                    db.session.execute(insert_sql, {
                        'username': data['username'],
                        'password': hashed_password,
                        'host': data.get('host', '%'),
                        'privileges': data.get('privileges', 'ALL PRIVILEGES'),
                        'status': 'active',
                        'created_at': now,
                        'updated_at': now,
                        'database_id': database.id
                    })
                    db.session.flush()
                    user = DatabaseUser.query.filter_by(username=data['username']).first()
                else:
                    raise
        else:
            # Existing user: ensure compatibility with legacy schema
            if has_legacy_fk:
                row = db.session.execute(
                    text("SELECT database_id FROM database_user WHERE username = :u"),
                    {'u': user.username}
                ).fetchone()
                if row is not None and row[0] is not None and row[0] != database.id:
                    return jsonify({'success': False, 'error': 'User belongs to another database (legacy schema)'}), 400
                if row is not None and row[0] is None:
                    db.session.execute(
                        text("UPDATE database_user SET database_id = :dbid WHERE username = :u"),
                        {'dbid': database.id, 'u': user.username}
                    )
        
        # Grant privileges for the specific database in MySQL
        try:
            mysql_service.grant_privileges(
                data['username'],
                database.name,
                privileges=data.get('privileges', 'ALL PRIVILEGES'),
                host=data.get('host', '%')
            )
        except Exception as grant_error:
            # If granting privileges fails, clean up the created user and re-raise
            if not user_exists:
                try:
                    mysql_service.delete_user(data['username'], data.get('host', '%'))
                except:
                    pass  # Ignore cleanup errors
            raise Exception(f'Failed to grant privileges to user: {str(grant_error)}')
        
        # Associate user with the database
        if assoc_exists:
            if user not in database.users:
                database.users.append(user)
        elif has_legacy_fk:
            # Ensure legacy FK points to this database
            db.session.execute(
                text("UPDATE database_user SET database_id = :dbid WHERE username = :u"),
                {'dbid': database.id, 'u': user.username}
            )
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': user.to_dict(include_relations=False)
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@database_bp.route('/api/databases/<int:id>/backups', methods=['POST'])
@token_required
def create_database_backup(current_user, id):
    database = Database.query.get_or_404(id)
    
    # Ownership check
    if not _is_admin(current_user) and database.owner_id != current_user.id:
        return jsonify({'success': False, 'error': 'Access denied'}), 403
    
    data = request.get_json()
    
    try:
        # Create backup in MySQL
        backup_result = mysql_service.create_backup(
            database.name,
            backup_type=data.get('backup_type', 'manual')
        )
        
        # Create backup record
        backup = DatabaseBackup(
            database_id=database.id,
            filename=backup_result['filename'],
            size=backup_result['size'],
            backup_type=backup_result['type']
        )
        
        db.session.add(backup)
        db.session.commit()
        
        return jsonify(backup.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@database_bp.route('/api/databases/<int:id>/backups/<int:backup_id>/restore', methods=['POST'])
@token_required
def restore_database_backup(current_user, id, backup_id):
    database = Database.query.get_or_404(id)
    
    # Ownership check
    if not _is_admin(current_user) and database.owner_id != current_user.id:
        return jsonify({'success': False, 'error': 'Access denied'}), 403
    
    backup = DatabaseBackup.query.get_or_404(backup_id)
    
    if backup.database_id != id:
        return jsonify({'error': 'Backup does not belong to this database'}), 400
    
    try:
        # Restore backup in MySQL
        mysql_service.restore_backup(database.name, backup.filename)
        return jsonify({'message': 'Database restored successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@database_bp.route('/api/mysql-root-connect', methods=['POST'])
@token_required
@admin_required
def mysql_root_connect(current_user):
    data = request.get_json()
    password = data.get('password')
    if not password:
        return jsonify({'success': False, 'error': 'Password is required'}), 400
    # ทดสอบเชื่อมต่อ MySQL
    try:
        import mysql.connector
        conn = mysql.connector.connect(
            host='localhost',
            user='root',
            password=password
        )
        conn.close()
        # เก็บรหัสผ่านใน session (แนะนำ: ใช้ session เฉพาะ admin)
        session['mysql_root_password'] = password
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@database_bp.route('/api/databases/<int:db_id>/users/<string:username>', methods=['POST'])
@token_required
def associate_database_user(current_user, db_id, username):
    """Associate an existing user with a database."""
    database = Database.query.get_or_404(db_id)
    
    # Ownership/Admin check
    if not _is_admin(current_user) and database.owner_id != current_user.id:
        return jsonify({'success': False, 'error': 'Access denied'}), 403
    
    # Parse username and host from the string (format: "username@host")
    if '@' in username:
        user_username, host = username.split('@', 1)
    else:
        user_username = username
        host = '%'
        
    user = DatabaseUser.query.filter_by(username=user_username, host=host).first()
    if not user:
        # Check if user exists in MySQL but not in application database
        try:
            # Verify user exists in MySQL
            mysql_users = mysql_service.list_users()
            mysql_user = next((u for u in mysql_users if u['username'] == user_username and u['host'] == host), None)
            
            if not mysql_user:
                return jsonify({'success': False, 'error': f'User {username} not found in MySQL'}), 404
            
            # Create DatabaseUser record in application database
            from werkzeug.security import generate_password_hash
            user = DatabaseUser(
                username=user_username,
                password=generate_password_hash('temp_password'),  # Temporary password, will be updated when user logs in
                host=host,
                privileges='ALL PRIVILEGES'
            )
            db.session.add(user)
            db.session.flush()  # Get the ID
            print(f"Created DatabaseUser record for {username} in application database")
            
        except Exception as e:
            return jsonify({'success': False, 'error': f'Failed to create user record: {str(e)}'}), 500
    
    # Check if association already exists
    if user in database.users:
        return jsonify({'success': False, 'error': 'User is already associated with this database'}), 400
        
    try:
        # Grant privileges for the specific database in MySQL
        print(f"Granting privileges: user={user.username}, host={user.host}, database={database.name}, privileges={user.privileges}")
        mysql_service.grant_privileges(
            user.username,
            database.name,
            privileges=user.privileges, # Use user's default privileges
            host=user.host
        )
        print(f"Successfully granted privileges to {user.username}@{user.host} for database {database.name}")
        
        # Create the association in our database
        database.users.append(user)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Successfully associated user {user.username} with database {database.name} and granted privileges'
        }), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error granting privileges to {user.username}@{user.host} for database {database.name}: {str(e)}")
        return jsonify({'success': False, 'error': f'Failed to grant privileges: {str(e)}'}), 500

@database_bp.route('/api/database-users', methods=['GET'])
@token_required
def get_all_database_users(current_user):
    """Get database users from MySQL server"""
    try:
        # Get users directly from MySQL server
        users = mysql_service.list_users()
        
        # Add created_at field for compatibility with frontend
        for user in users:
            if 'password_last_changed' in user and user['password_last_changed']:
                user['created_at'] = user['password_last_changed'].isoformat() if hasattr(user['password_last_changed'], 'isoformat') else str(user['password_last_changed'])
            else:
                user['created_at'] = datetime.utcnow().isoformat()
            
            # Add id field for compatibility
            user['id'] = f"{user['username']}@{user['host']}"
        
        return jsonify({
            'success': True,
            'data': users
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@database_bp.route('/api/database-users', methods=['POST'])
@token_required
def create_mysql_database_user(current_user):
    """Create a new database user on MySQL server"""
    if not _is_admin(current_user):
        return jsonify({'success': False, 'error': 'Admin access required'}), 403
    
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['username', 'password']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        username = data['username']
        password = data['password']
        host = data.get('host', '%')
        
        # Create user on MySQL server
        mysql_service.create_user(username, password, host)
        
        # Get user privileges if specified
        if 'privileges' in data and 'database' in data:
            mysql_service.grant_privileges(username, data['database'], data['privileges'], host)
        
        return jsonify({
            'success': True,
            'message': f'Database user {username}@{host} created successfully'
        }), 201
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@database_bp.route('/api/list-mysql-databases', methods=['GET'])
def list_mysql_databases():
    """List all databases in MySQL for debugging"""
    try:
        databases = mysql_service.list_databases()
        return jsonify({
            'success': True,
            'data': databases
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@database_bp.route('/api/test-grant-privileges', methods=['POST'])
def test_grant_privileges():
    """Test grant privileges for debugging"""
    try:
        data = request.get_json()
        username = data.get('username', 'test3')
        database = data.get('database', 'db_test4')
        host = data.get('host', '%')
        
        print(f"Testing grant privileges: {username}@{host} on {database}")
        mysql_service.grant_privileges(username, database, 'ALL PRIVILEGES', host)
        
        return jsonify({
            'success': True,
            'message': f'Successfully granted privileges to {username}@{host} on {database}'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@database_bp.route('/api/check-user-privileges/<string:username>', methods=['GET'])
def check_user_privileges(username):
    """Check user privileges in MySQL for debugging"""
    
    try:
        # Parse username and host
        if '@' in username:
            user_username, host = username.split('@', 1)
        else:
            user_username = username
            host = '%'
        
        # Get user privileges from MySQL
        import mysql.connector
        conn = mysql.connector.connect(**mysql_service.config)
        cursor = conn.cursor()
        
        # Check if user exists
        cursor.execute("SELECT User, Host FROM mysql.user WHERE User = %s AND Host = %s", (user_username, host))
        user_exists = cursor.fetchone()
        
        if not user_exists:
            cursor.close()
            conn.close()
            return jsonify({
                'success': False,
                'error': f'User {username} does not exist in MySQL'
            })
        
        # Get privileges for all databases
        cursor.execute("SHOW GRANTS FOR %s@%s", (user_username, host))
        grants = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'data': {
                'username': user_username,
                'host': host,
                'grants': [grant[0] for grant in grants]
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@database_bp.route('/api/database-users/<string:user_id>', methods=['PUT'])
@token_required
def update_mysql_database_user(current_user, user_id):
    """Update a database user on MySQL server"""
    if not _is_admin(current_user):
        return jsonify({'success': False, 'error': 'Admin access required'}), 403
    
    try:
        data = request.get_json()
        
        # Parse user_id (format: username@host)
        if '@' not in user_id:
            return jsonify({'error': 'Invalid user ID format'}), 400
        
        username, host = user_id.split('@', 1)
        
        # Update password if provided
        if 'password' in data and data['password']:
            mysql_service.alter_user_password(username, data['password'], host)
        
        # Update host if provided
        if 'host' in data and data['host'] != host:
            mysql_service.rename_user_host(username, host, data['host'])
            host = data['host']
        
        return jsonify({
            'success': True,
            'message': f'Database user {username}@{host} updated successfully'
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@database_bp.route('/api/database-users/<string:user_id>', methods=['DELETE'])
@token_required
def delete_mysql_database_user(current_user, user_id):
    """Delete a database user from MySQL server"""
    if not _is_admin(current_user):
        return jsonify({'success': False, 'error': 'Admin access required'}), 403
    
    try:
        # Parse user_id (format: username@host)
        if '@' not in user_id:
            return jsonify({'error': 'Invalid user ID format'}), 400
        
        username, host = user_id.split('@', 1)
        
        # Delete user from MySQL server
        mysql_service.delete_user(username, host)
        
        return jsonify({
            'success': True,
            'message': f'Database user {username}@{host} deleted successfully'
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@database_bp.route('/api/databases/<int:id>/phpmyadmin', methods=['GET'])
@token_required
def get_phpmyadmin_url(current_user, id):
    """Get phpMyAdmin URL for specific database"""
    try:
        # Get database info
        database = Database.query.get_or_404(id)
        
        # Ownership check
        if not _is_admin(current_user) and database.owner_id != current_user.id:
            return jsonify({'success': False, 'error': 'Access denied'}), 403
        
        # Check if phpMyAdmin is available
        if not phpmyadmin_service.is_installed():
            return jsonify({
                'success': False,
                'error': 'phpMyAdmin is not installed on this system'
            }), 404
        
        # Get database user info (first user if multiple)
        db_user = database.users[0] if database.users else None
        
        # Generate phpMyAdmin URL
        if db_user:
            url = phpmyadmin_service.get_phpmyadmin_url(
                database_name=database.name,
                username=db_user.username
            )
            need_login = False
            username = db_user.username
        else:
            # Fallback: return URL without username so user can login manually
            url = phpmyadmin_service.get_phpmyadmin_url(
                database_name=database.name
            )
            need_login = True
            username = None
        
        return jsonify({
            'success': True,
            'data': {
                'url': url,
                'database_name': database.name,
                'username': username,
                'need_login': need_login
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@database_bp.route('/api/databases/<int:id>/phpmyadmin/auto-login', methods=['POST'])
@token_required
def get_phpmyadmin_auto_login(current_user, id):
    """Get phpMyAdmin auto-login URL for specific database"""
    try:
        # Get database info
        database = Database.query.get_or_404(id)
        
        # Ownership check
        if not _is_admin(current_user) and database.owner_id != current_user.id:
            return jsonify({'success': False, 'error': 'Access denied'}), 403
        
        # Check if phpMyAdmin is available
        if not phpmyadmin_service.is_installed():
            return jsonify({
                'success': False,
                'error': 'phpMyAdmin is not installed on this system'
            }), 404
        
        # Get database user info
        db_user = database.users[0] if database.users else None
        
        # Get password from request (optional - for auto-login)
        data = request.get_json() or {}
        user_password = data.get('password', '')
        
        if not db_user or not user_password:
            # Fallback: return regular URL; caller must login manually
            url = phpmyadmin_service.get_phpmyadmin_url(
                database_name=database.name,
                username=db_user.username if db_user else None
            )
            return jsonify({
                'success': True,
                'data': {
                    'url': url,
                    'database_name': database.name,
                    'username': db_user.username if db_user else None,
                    'auto_login': False,
                    'need_login': True
                }
            })
        
        # Generate auto-login URL
        url = phpmyadmin_service.create_auto_login_url(
            database_name=database.name,
            username=db_user.username,
            password=user_password
        )
        
        return jsonify({
            'success': True,
            'data': {
                'url': url,
                'database_name': database.name,
                'username': db_user.username,
                'auto_login': True,
                'need_login': False
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@database_bp.route('/api/phpmyadmin/status', methods=['GET'])
@token_required
def get_phpmyadmin_status(current_user):
    """Check phpMyAdmin installation status"""
    try:
        is_installed = phpmyadmin_service.is_installed()
        
        if is_installed:
            url = phpmyadmin_service.get_phpmyadmin_url()
        else:
            url = None
        
        return jsonify({
            'success': True,
            'data': {
                'installed': is_installed,
                'url': url,
                'message': 'phpMyAdmin is available' if is_installed else 'phpMyAdmin is not installed'
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@database_bp.route('/api/mysql/check-privileges', methods=['GET'])
@token_required
@admin_required
def check_mysql_privileges(current_user):
    """Check MySQL root user privileges"""
    try:
        privileges_info = mysql_service.check_root_privileges()
        
        return jsonify({
            'success': True,
            'data': privileges_info
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@database_bp.route('/api/mysql/fix-privileges', methods=['POST'])
@token_required
@admin_required
def fix_mysql_privileges(current_user):
    """Attempt to fix MySQL root user privileges"""
    try:
        result = mysql_service.fix_root_privileges()
        
        if result:
            return jsonify({
                'success': True,
                'message': 'MySQL root privileges have been updated successfully'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to update MySQL root privileges'
            }), 500
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500 

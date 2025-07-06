from flask import Blueprint, request, jsonify
from models.database import Database, DatabaseUser, DatabaseBackup, db
from services.mysql_service import MySQLService
from datetime import datetime
from sqlalchemy.orm import joinedload
from sqlalchemy import desc

database_bp = Blueprint('database', __name__)
mysql_service = MySQLService()

@database_bp.route('/api/databases', methods=['GET'])
def get_databases():
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
        
        # Apply search filter if provided
        if search:
            query = query.filter(Database.name.ilike(f'%{search}%'))
        
        # Apply pagination
        paginated = query.order_by(desc(Database.created_at)).paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
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

@database_bp.route('/api/databases/<int:id>', methods=['GET'])
def get_database(id):
    # Use eager loading for single database
    database = Database.query.options(
        joinedload(Database.users),
        joinedload(Database.backups)
    ).filter_by(id=id).first()
    
    if not database:
        return jsonify({'error': 'Database not found'}), 404
    
    return jsonify({
        'success': True,
        'data': database.to_dict()
    })

@database_bp.route('/api/databases/<int:id>/users', methods=['GET'])
def get_database_users(id):
    try:
        # Get pagination parameters
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        
        # Verify database exists
        database = Database.query.get_or_404(id)
        
        # Get paginated users
        paginated = DatabaseUser.query.filter_by(database_id=id).order_by(
            desc(DatabaseUser.created_at)
        ).paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        return jsonify({
            'success': True,
            'data': [user.to_dict(include_relations=False) for user in paginated.items],
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

@database_bp.route('/api/databases/<int:id>/backups', methods=['GET'])
def get_database_backups(id):
    try:
        # Get pagination parameters
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        
        # Verify database exists
        database = Database.query.get_or_404(id)
        
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
def create_database():
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
        
        # Create database record
        database = Database(
            name=data['name'],
            charset=data.get('charset', 'utf8mb4'),
            collation=data.get('collation', 'utf8mb4_unicode_ci'),
            size=size,
            owner_id=data.get('owner_id')
        )
        
        db.session.add(database)
        db.session.commit()
        
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
def update_database(id):
    database = Database.query.get_or_404(id)
    data = request.get_json()
    
    try:
        # Update database properties
        if 'charset' in data:
            database.charset = data['charset']
        if 'collation' in data:
            database.collation = data['collation']
        if 'status' in data:
            database.status = data['status']
        
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
def delete_database(id):
    database = Database.query.get_or_404(id)
    
    try:
        # Delete database in MySQL
        mysql_service.delete_database(database.name)
        
        # Delete from our database
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

@database_bp.route('/api/databases/<int:id>/users', methods=['POST'])
def create_database_user(id):
    database = Database.query.get_or_404(id)
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['username', 'password']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    try:
        # Create user in MySQL
        mysql_service.create_user(
            data['username'],
            data['password'],
            database.name,
            host=data.get('host', '%'),
            privileges=data.get('privileges', 'ALL PRIVILEGES')
        )
        
        # Create user record
        user = DatabaseUser(
            database_id=id,
            username=data['username'],
            password=data['password'],  # Should be hashed in production
            host=data.get('host', '%'),
            privileges=data.get('privileges', 'ALL PRIVILEGES')
        )
        
        db.session.add(user)
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

@database_bp.route('/api/databases/<int:db_id>/users/<int:user_id>', methods=['DELETE'])
def delete_database_user(db_id, user_id):
    user = DatabaseUser.query.filter_by(id=user_id, database_id=db_id).first_or_404()
    
    try:
        # Delete user in MySQL
        mysql_service.delete_user(user.username, user.host)
        
        # Delete from our database
        db.session.delete(user)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Database user deleted successfully'
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@database_bp.route('/api/databases/<int:id>/backups', methods=['POST'])
def create_database_backup(id):
    database = Database.query.get_or_404(id)
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
def restore_database_backup(id, backup_id):
    database = Database.query.get_or_404(id)
    backup = DatabaseBackup.query.get_or_404(backup_id)
    
    if backup.database_id != id:
        return jsonify({'error': 'Backup does not belong to this database'}), 400
    
    try:
        # Restore backup in MySQL
        mysql_service.restore_backup(database.name, backup.filename)
        return jsonify({'message': 'Database restored successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500 
from flask import Blueprint, request, jsonify
from models.database import Database, DatabaseUser, DatabaseBackup, db
from services.mysql_service import MySQLService
from datetime import datetime

database_bp = Blueprint('database', __name__)
mysql_service = MySQLService()

@database_bp.route('/api/databases', methods=['GET'])
def get_databases():
    databases = Database.query.all()
    return jsonify([db.to_dict() for db in databases])

@database_bp.route('/api/databases/<int:id>', methods=['GET'])
def get_database(id):
    database = Database.query.get_or_404(id)
    return jsonify(database.to_dict())

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
            size=size
        )
        
        db.session.add(database)
        db.session.commit()
        
        return jsonify(database.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

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
            host=data.get('host', '%')
        )
        
        # Grant privileges
        mysql_service.grant_privileges(
            data['username'],
            database.name,
            privileges=data.get('privileges', 'ALL PRIVILEGES'),
            host=data.get('host', '%')
        )
        
        # Create user record
        user = DatabaseUser(
            database_id=database.id,
            username=data['username'],
            password=data['password'],  # Note: In production, encrypt this
            host=data.get('host', '%'),
            privileges=data.get('privileges', 'ALL PRIVILEGES')
        )
        
        db.session.add(user)
        db.session.commit()
        
        return jsonify(user.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

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

@database_bp.route('/api/databases/<int:id>', methods=['DELETE'])
def delete_database(id):
    database = Database.query.get_or_404(id)
    
    try:
        # Delete database in MySQL
        mysql_service.delete_database(database.name)
        
        # Delete from our database
        db.session.delete(database)
        db.session.commit()
        
        return '', 204
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@database_bp.route('/api/databases/<int:database_id>/users/<int:user_id>', methods=['DELETE'])
def delete_database_user(database_id, user_id):
    database = Database.query.get_or_404(database_id)
    user = DatabaseUser.query.get_or_404(user_id)
    
    if user.database_id != database_id:
        return jsonify({'error': 'User does not belong to this database'}), 400
    
    try:
        # Revoke privileges and delete user in MySQL
        mysql_service.revoke_privileges(user.username, database.name, host=user.host)
        mysql_service.delete_user(user.username, host=user.host)
        
        # Delete from our database
        db.session.delete(user)
        db.session.commit()
        
        return '', 204
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500 
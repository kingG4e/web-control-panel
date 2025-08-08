from flask import Blueprint, request, jsonify, send_file
from services.file_service import FileService
from utils.security import sanitize_filename, sanitize_path, is_safe_path
from utils.auth import token_required
from models.virtual_host import VirtualHost
import os
from utils.permissions import can_access_virtual_host

files_bp = Blueprint('files', __name__)
file_service = None  # Initialize as None first

def init_file_service():
    global file_service
    if file_service is None:
        file_service = FileService()

@files_bp.route('/list', methods=['GET'])
@token_required
def list_directory(current_user):
    """List directory contents.
    ---
    tags:
      - files
    responses:
      200:
        description: Directory listing
    """
    try:
        init_file_service()
        path = request.args.get('path', '/')
        domain = request.args.get('domain')  # Optional domain filter
        
        # If domain is specified, restrict to domain's directory
        if domain:
            domain_path = file_service.get_domain_path(domain, current_user.id)
            if domain_path:
                items = file_service.list_domain_directory(domain, path, current_user.id)
            else:
                return jsonify({'error': 'Domain not found or access denied'}), 404
        else:
            # System file access - only admin/root users allowed
            if not (current_user.is_admin or current_user.role == 'admin' or current_user.username == 'root'):
                return jsonify({'error': 'Access denied. System file management requires admin privileges.'}), 403
            items = file_service.list_directory(path)
            
        return jsonify(items)
    except FileNotFoundError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@files_bp.route('/domains', methods=['GET'])
@token_required
def list_user_domains(current_user):
    """List all domains accessible by the current user"""
    try:
        # Admin/root users can see all virtual hosts
        if current_user.is_admin or current_user.role == 'admin' or current_user.username == 'root':
            all_vhosts = VirtualHost.query.all()
            domain_list = []
            
            for vhost in all_vhosts:
                domain_info = {
                    'id': vhost.id,
                    'domain': vhost.domain,
                    'linux_username': vhost.linux_username,
                    'document_root': vhost.document_root,
                    'created_at': vhost.created_at.isoformat() if vhost.created_at else None,
                    'is_owner': vhost.user_id == current_user.id,
                    'access_type': 'admin_access'
                }
                domain_list.append(domain_info)
        else:
            # Regular users: Get all virtual hosts and filter by access
            all_vhosts = VirtualHost.query.all()
            domain_list = []
            
            for vhost in all_vhosts:
                # Check if user can access this virtual host
                if can_access_virtual_host(current_user, vhost):
                    domain_info = {
                        'id': vhost.id,
                        'domain': vhost.domain,
                        'linux_username': vhost.linux_username,
                        'document_root': vhost.document_root,
                        'created_at': vhost.created_at.isoformat() if vhost.created_at else None,
                        'is_owner': vhost.user_id == current_user.id,
                        'access_type': 'owner' if vhost.user_id == current_user.id else 'linux_user'
                    }
                    domain_list.append(domain_info)
            
        return jsonify(domain_list)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@files_bp.route('/domain-structure', methods=['GET'])
@token_required
def get_domain_structure(current_user):
    """Get the directory structure for a specific domain"""
    try:
        init_file_service()
        domain = request.args.get('domain')
        if not domain:
            return jsonify({'error': 'Domain parameter is required'}), 400
            
        structure = file_service.get_domain_structure(domain, current_user.id)
        return jsonify(structure)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@files_bp.route('/read', methods=['GET'])
@token_required
def read_file(current_user):
    try:
        init_file_service()
        path = request.args.get('path')
        domain = request.args.get('domain')
        
        if not path:
            return jsonify({'error': 'Path parameter is required'}), 400

        if domain:
            file_data = file_service.read_domain_file(domain, path, current_user.id)
        else:
            # System file access - only admin/root users allowed
            if not (current_user.is_admin or current_user.role == 'admin' or current_user.username == 'root'):
                return jsonify({'error': 'Access denied. System file reading requires admin privileges.'}), 403
            file_data = file_service.read_file(path)
            
        return jsonify(file_data)
    except FileNotFoundError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@files_bp.route('/write', methods=['POST'])
@token_required
def write_file(current_user):
    try:
        init_file_service()
        data = request.get_json()
        path = data.get('path')
        content = data.get('content')
        domain = data.get('domain')

        if not path or content is None:
            return jsonify({'error': 'Path and content are required'}), 400

        if domain:
            file_data = file_service.write_domain_file(domain, path, content, current_user.id)
        else:
            # System file access - only admin/root users allowed
            if not (current_user.is_admin or current_user.role == 'admin' or current_user.username == 'root'):
                return jsonify({'error': 'Access denied. System file writing requires admin privileges.'}), 403
            file_data = file_service.write_file(path, content)
            
        return jsonify(file_data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@files_bp.route('/create-directory', methods=['POST'])
@token_required
def create_directory(current_user):
    try:
        init_file_service()  # Initialize if not already initialized
        data = request.get_json()
        path = data.get('path')
        domain = data.get('domain')

        if not path:
            return jsonify({'error': 'Path is required'}), 400

        if domain:
            # Domain-specific directory creation
            dir_data = file_service.create_domain_directory(domain, path, current_user.id)
            return jsonify(dir_data)
        else:
            # System directory creation - only admin/root users allowed
            if not (current_user.is_admin or current_user.role == 'admin' or current_user.username == 'root'):
                return jsonify({'error': 'Access denied. System directory creation requires admin privileges.'}), 403
            dir_data = file_service.create_directory(path)
            return jsonify(dir_data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@files_bp.route('/delete', methods=['DELETE'])
@token_required
def delete_item(current_user):
    try:
        init_file_service()  # Initialize if not already initialized
        path = request.args.get('path')
        domain = request.args.get('domain')
        
        if not path:
            return jsonify({'error': 'Path parameter is required'}), 400

        if domain:
            # Domain-specific deletion
            file_service.delete_domain_item(domain, path, current_user.id)
            return jsonify({'success': True})
        else:
            # System file deletion - only admin/root users allowed
            if not (current_user.is_admin or current_user.role == 'admin' or current_user.username == 'root'):
                return jsonify({'error': 'Access denied. System file deletion requires admin privileges.'}), 403
            file_service.delete_item(path)
            return jsonify({'success': True})
    except FileNotFoundError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@files_bp.route('/rename', methods=['POST'])
@token_required
def rename_item(current_user):
    try:
        init_file_service()  # Initialize if not already initialized
        data = request.get_json()
        old_path = data.get('oldPath')
        new_path = data.get('newPath')
        domain = data.get('domain')

        if not old_path or not new_path:
            return jsonify({'error': 'oldPath and newPath are required'}), 400

        if domain:
            # Domain-specific renaming
            item_data = file_service.rename_domain_item(domain, old_path, new_path, current_user.id)
            return jsonify(item_data)
        else:
            # System file renaming - only admin/root users allowed
            if not (current_user.is_admin or current_user.role == 'admin' or current_user.username == 'root'):
                return jsonify({'error': 'Access denied. System file renaming requires admin privileges.'}), 403
            item_data = file_service.rename_item(old_path, new_path)
            return jsonify(item_data)
    except FileNotFoundError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@files_bp.route('/copy', methods=['POST'])
@token_required
def copy_item(current_user):
    try:
        init_file_service()  # Initialize if not already initialized
        data = request.get_json()
        source_path = data.get('sourcePath')
        dest_path = data.get('destPath')

        domain = data.get('domain')

        if not source_path or not dest_path:
            return jsonify({'error': 'sourcePath and destPath are required'}), 400

        if domain:
            # Domain-specific copying - implement in FileService
            return jsonify({'error': 'Domain-specific file copying not yet implemented'}), 501
        else:
            # System file copying - only admin/root users allowed
            if not (current_user.is_admin or current_user.role == 'admin' or current_user.username == 'root'):
                return jsonify({'error': 'Access denied. System file copying requires admin privileges.'}), 403
            item_data = file_service.copy_item(source_path, dest_path)
            return jsonify(item_data)
    except FileNotFoundError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@files_bp.route('/upload', methods=['POST'])
@token_required
def upload_file(current_user):
    try:
        init_file_service()
        if 'file' not in request.files:
            return jsonify({'error': 'No file part'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400

        path = request.form.get('path', '/')
        domain = request.form.get('domain')
        
        if domain:
            file_data = file_service.upload_domain_file(domain, path, file, current_user.id)
        else:
            # System file upload - only admin/root users allowed
            if not (current_user.is_admin or current_user.role == 'admin' or current_user.username == 'root'):
                return jsonify({'error': 'Access denied. System file upload requires admin privileges.'}), 403
            file_data = file_service.upload_file(path, file)
            
        return jsonify(file_data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@files_bp.route('/download', methods=['GET'])
@token_required
def download_file(current_user):
    try:
        init_file_service()  # Initialize if not already initialized
        path = request.args.get('path')
        domain = request.args.get('domain')
        
        if not path:
            return jsonify({'error': 'Path parameter is required'}), 400

        if domain:
            # Domain-specific download - implement in FileService
            return jsonify({'error': 'Domain-specific file download not yet implemented'}), 501
        else:
            # System file download - only admin/root users allowed
            if not (current_user.is_admin or current_user.role == 'admin' or current_user.username == 'root'):
                return jsonify({'error': 'Access denied. System file download requires admin privileges.'}), 403
                
            path = sanitize_path(path)
            full_path = os.path.join(file_service.root_dir, path)
            
            if not is_safe_path(file_service.root_dir, path):
                return jsonify({'error': 'Invalid path'}), 400

            if not os.path.exists(full_path) or not os.path.isfile(full_path):
                return jsonify({'error': 'File not found'}), 404

            return send_file(full_path, as_attachment=True)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@files_bp.route('/get-file-info', methods=['GET'])
@token_required
def get_file_info(current_user):
    """Get detailed information about a file or directory"""
    try:
        init_file_service()
        path = request.args.get('path')
        domain = request.args.get('domain')
        
        if not path:
            return jsonify({'error': 'Path parameter is required'}), 400
            
        if domain:
            info = file_service.get_domain_file_info(domain, path, current_user.id)
        else:
            # System file info - only admin/root users allowed
            if not (current_user.is_admin or current_user.role == 'admin' or current_user.username == 'root'):
                return jsonify({'error': 'Access denied. System file info requires admin privileges.'}), 403
            info = file_service.get_file_info(path)
            
        return jsonify(info)
    except Exception as e:
        return jsonify({'error': str(e)}), 500 
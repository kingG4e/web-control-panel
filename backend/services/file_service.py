import os
import shutil
from typing import List, Dict, Optional
from werkzeug.utils import secure_filename
from datetime import datetime
from utils.security import sanitize_path, sanitize_filename, is_safe_path
from models.virtual_host import VirtualHost
import stat
import zipfile

# Import Unix/Linux specific modules
try:
    import pwd
    import grp
    UNIX_MODULES_AVAILABLE = True
except ImportError:
    UNIX_MODULES_AVAILABLE = False
    pwd = None
    grp = None

class FileService:
    def __init__(self):
        """Initialize FileService with proper root directory"""
        # ใช้ SUDO_USER ถ้ามี หรือใช้ current user
        sudo_user = os.getenv('SUDO_USER')
        current_user = sudo_user if sudo_user else os.getenv('USER')
        
        # ตรวจสอบ environment variable สำหรับ root directory
        root_dir = os.getenv('FILE_MANAGER_ROOT')
        
        if not root_dir:
            # ถ้าไม่มี FILE_MANAGER_ROOT ให้ใช้ home directory ของ user
            if current_user:
                root_dir = os.path.expanduser(f'~{current_user}')
            else:
                # Fallback to current directory if can't determine user
                root_dir = os.getcwd()
        
        # Normalize path for Linux
        self.root_dir = os.path.normpath(root_dir)
        
        # Create root directory if it doesn't exist
        os.makedirs(self.root_dir, exist_ok=True)
        
        # Set proper ownership if running as root (Unix only)
        if UNIX_MODULES_AVAILABLE and pwd and os.geteuid() == 0 and current_user:
            user_info = pwd.getpwnam(current_user)
            os.chown(self.root_dir, user_info.pw_uid, user_info.pw_gid)

    def get_domain_path(self, domain: str, user_id: int) -> str:
        """Get the home directory path for a specific domain"""
        try:
            # Import here to avoid circular import
            from models.user import User
            from utils.permissions import can_access_virtual_host
            
            current_user = User.query.get(user_id)
            if not current_user:
                raise ValueError("User not found")
            
            # Admin/root users can access any domain
            if current_user.is_admin or current_user.role == 'admin' or current_user.username == 'root':
                virtual_host = VirtualHost.query.filter_by(domain=domain).first()
            else:
                # First try to find virtual host owned by user
                virtual_host = VirtualHost.query.filter_by(domain=domain, user_id=user_id).first()
                
                # If not found, try to find virtual host with matching linux_username
                if not virtual_host:
                    virtual_host = VirtualHost.query.filter_by(domain=domain, linux_username=current_user.username).first()
                    
                    # Check if user can access this virtual host
                    if virtual_host and not can_access_virtual_host(current_user, virtual_host):
                        virtual_host = None
            
            if not virtual_host:
                raise ValueError("Domain not found or access denied")
                
            return f"/home/{virtual_host.linux_username}"
            
        except Exception as e:
            print(f"Error getting domain path: {e}")
            return None

    def get_domain_structure(self, domain: str, user_id: int) -> Dict:
        """Get the directory structure for a specific domain"""
        try:
            # Import here to avoid circular import
            from models.user import User
            from utils.permissions import can_access_virtual_host
            
            current_user = User.query.get(user_id)
            if not current_user:
                raise ValueError("User not found")
            
            # Admin/root users can access any domain
            if current_user.is_admin or current_user.role == 'admin' or current_user.username == 'root':
                virtual_host = VirtualHost.query.filter_by(domain=domain).first()
            else:
                # First try to find virtual host owned by user
                virtual_host = VirtualHost.query.filter_by(domain=domain, user_id=user_id).first()
                
                # If not found, try to find virtual host with matching linux_username
                if not virtual_host:
                    virtual_host = VirtualHost.query.filter_by(domain=domain, linux_username=current_user.username).first()
                    
                    # Check if user can access this virtual host
                    if virtual_host and not can_access_virtual_host(current_user, virtual_host):
                        virtual_host = None
            
            if not virtual_host:
                raise ValueError("Domain not found or access denied")
                
            home_dir = f"/home/{virtual_host.linux_username}"
            
            structure = {
                'domain': domain,
                'linux_username': virtual_host.linux_username,
                'home_directory': home_dir,
                'document_root': virtual_host.document_root,
                'directories': {}
            }
            
            # Common directories to check
            common_dirs = [
                'public_html',
                'cgi-bin', 
                'logs',
                'tmp',
                'mail',
                'backup'
            ]
            
            for dir_name in common_dirs:
                dir_path = os.path.join(home_dir, dir_name)
                if os.path.exists(dir_path):
                    try:
                        stat_info = os.stat(dir_path)
                        structure['directories'][dir_name] = {
                            'exists': True,
                            'path': dir_path,
                            'permissions': self._get_file_permissions(dir_path),
                            'size': self._get_directory_size(dir_path),
                            'modifiedAt': datetime.fromtimestamp(stat_info.st_mtime).isoformat()
                        }
                    except Exception as e:
                        structure['directories'][dir_name] = {
                            'exists': True,
                            'path': dir_path,
                            'error': str(e)
                        }
                else:
                    structure['directories'][dir_name] = {
                        'exists': False,
                        'path': dir_path
                    }
            
            return structure
        except Exception as e:
            raise Exception(f"Error getting domain structure: {str(e)}")

    def list_domain_directory(self, domain: str, path: str, user_id: int) -> List[Dict]:
        """List directory contents for a specific domain"""
        try:
            # Import here to avoid circular import
            from models.user import User
            from utils.permissions import can_access_virtual_host
            
            current_user = User.query.get(user_id)
            if not current_user:
                raise ValueError("User not found")
            
            # Admin/root users can access any domain
            if current_user.is_admin or current_user.role == 'admin' or current_user.username == 'root':
                virtual_host = VirtualHost.query.filter_by(domain=domain).first()
            else:
                # First try to find virtual host owned by user
                virtual_host = VirtualHost.query.filter_by(domain=domain, user_id=user_id).first()
                
                # If not found, try to find virtual host with matching linux_username
                if not virtual_host:
                    virtual_host = VirtualHost.query.filter_by(domain=domain, linux_username=current_user.username).first()
                    
                    # Check if user can access this virtual host
                    if virtual_host and not can_access_virtual_host(current_user, virtual_host):
                        virtual_host = None
            
            if not virtual_host:
                raise ValueError("Domain not found or access denied")
                
            home_dir = f"/home/{virtual_host.linux_username}"
            
            # Normalize path and ensure it's within the domain's directory
            if not path or path == '/':
                full_path = home_dir
            else:
                path = sanitize_path(path)
                full_path = os.path.join(home_dir, path)
            
            # Security check - ensure path is within home directory (skip for admin/root)
            if not (current_user.is_admin or current_user.role == 'admin' or current_user.username == 'root'):
                real_full_path = os.path.realpath(full_path)
                real_home_dir = os.path.realpath(home_dir)
                
                if not real_full_path.startswith(real_home_dir):
                    raise ValueError("Access denied: Path outside domain directory")
            
            return self._list_directory_contents(full_path, home_dir)
            
        except Exception as e:
            raise Exception(f"Error listing domain directory: {str(e)}")

    def _list_directory_contents(self, full_path: str, base_dir: str) -> List[Dict]:
        """Internal method to list directory contents"""
        if not os.path.exists(full_path):
            raise FileNotFoundError(f"Directory not found: {full_path}")
        
        if not os.path.isdir(full_path):
            raise ValueError(f"Not a directory: {full_path}")

        items = []
        try:
            dir_entries = os.scandir(full_path)
            
            for entry in dir_entries:
                try:
                    # Get basic file info
                    name = entry.name
                    item_path = entry.path
                    is_dir = entry.is_dir()
                    is_file = entry.is_file()
                    
                    try:
                        stat_info = entry.stat()
                    except (OSError, PermissionError):
                        stat_info = os.stat(item_path)
                    
                    # Calculate relative path from base directory
                    rel_path = os.path.relpath(item_path, base_dir)
                    rel_path = rel_path.replace(os.sep, '/')
                    
                    # Get file type
                    file_type = self._get_file_type(name) if is_file else 'folder'
                    
                    # Get owner and group names (Unix only)
                    if UNIX_MODULES_AVAILABLE and pwd and grp:
                        try:
                            owner_name = pwd.getpwuid(stat_info.st_uid).pw_name
                        except KeyError:
                            owner_name = str(stat_info.st_uid)
                        
                        try:
                            group_name = grp.getgrgid(stat_info.st_gid).gr_name
                        except KeyError:
                            group_name = str(stat_info.st_gid)
                    else:
                        # Windows fallback
                        owner_name = 'N/A'
                        group_name = 'N/A'
                    
                    item_info = {
                        'name': name,
                        'type': file_type,
                        'size': stat_info.st_size if is_file else self._get_directory_size(item_path) if is_dir else None,
                        'modifiedAt': datetime.fromtimestamp(stat_info.st_mtime).isoformat(),
                        'path': rel_path,
                        'permissions': self._get_file_permissions(item_path),
                        'owner': owner_name,
                        'group': group_name,
                        'isHidden': name.startswith('.'),
                        'isSymlink': entry.is_symlink(),
                        'isReadable': os.access(item_path, os.R_OK),
                        'isWritable': os.access(item_path, os.W_OK),
                        'isExecutable': os.access(item_path, os.X_OK)
                    }
                    
                    items.append(item_info)
                    
                except (OSError, PermissionError) as e:
                    print(f"Error accessing {entry.path}: {e}")
                    continue
            
        except Exception as e:
            print(f"Error listing directory {full_path}: {e}")
            raise
        finally:
            try:
                dir_entries.close()
            except:
                pass

        # Sort items: folders first, then files, both alphabetically
        sorted_items = sorted(items, key=lambda x: (x['type'] != 'folder', x['name'].lower()))
        return sorted_items

    def _get_directory_size(self, path: str) -> int:
        """Get total size of directory"""
        try:
            total_size = 0
            for dirpath, dirnames, filenames in os.walk(path):
                for filename in filenames:
                    filepath = os.path.join(dirpath, filename)
                    try:
                        total_size += os.path.getsize(filepath)
                    except (OSError, IOError):
                        continue
            return total_size
        except Exception:
            return 0

    def read_domain_file(self, domain: str, path: str, user_id: int) -> Dict:
        """Read file content for a specific domain"""
        try:
            # Import here to avoid circular import
            from models.user import User
            from utils.permissions import can_access_virtual_host
            
            current_user = User.query.get(user_id)
            if not current_user:
                raise ValueError("User not found")
            
            # Admin/root users can access any domain
            if current_user.is_admin or current_user.role == 'admin' or current_user.username == 'root':
                virtual_host = VirtualHost.query.filter_by(domain=domain).first()
            else:
                # First try to find virtual host owned by user
                virtual_host = VirtualHost.query.filter_by(domain=domain, user_id=user_id).first()
                
                # If not found, try to find virtual host with matching linux_username
                if not virtual_host:
                    virtual_host = VirtualHost.query.filter_by(domain=domain, linux_username=current_user.username).first()
                    
                    # Check if user can access this virtual host
                    if virtual_host and not can_access_virtual_host(current_user, virtual_host):
                        virtual_host = None
                        
            if not virtual_host:
                raise ValueError("Domain not found or access denied")
                
            home_dir = f"/home/{virtual_host.linux_username}"
            path = sanitize_path(path)
            full_path = os.path.join(home_dir, path)
            
            # Security check (skip for admin/root)
            if not (current_user.is_admin or current_user.role == 'admin' or current_user.username == 'root'):
                real_full_path = os.path.realpath(full_path)
                real_home_dir = os.path.realpath(home_dir)
                
                if not real_full_path.startswith(real_home_dir):
                    raise ValueError("Access denied: Path outside domain directory")
            
            return self._read_file_content(full_path)
            
        except Exception as e:
            raise Exception(f"Error reading domain file: {str(e)}")

    def write_domain_file(self, domain: str, path: str, content: str, user_id: int) -> Dict:
        """Write file content for a specific domain"""
        try:
            # Import here to avoid circular import
            from models.user import User
            from utils.permissions import can_access_virtual_host
            
            current_user = User.query.get(user_id)
            if not current_user:
                raise ValueError("User not found")
            
            # Admin/root users can access any domain
            if current_user.is_admin or current_user.role == 'admin' or current_user.username == 'root':
                virtual_host = VirtualHost.query.filter_by(domain=domain).first()
            else:
                # First try to find virtual host owned by user
                virtual_host = VirtualHost.query.filter_by(domain=domain, user_id=user_id).first()
                
                # If not found, try to find virtual host with matching linux_username
                if not virtual_host:
                    virtual_host = VirtualHost.query.filter_by(domain=domain, linux_username=current_user.username).first()
                    
                    # Check if user can access this virtual host
                    if virtual_host and not can_access_virtual_host(current_user, virtual_host):
                        virtual_host = None
                        
            if not virtual_host:
                raise ValueError("Domain not found or access denied")
                
            home_dir = f"/home/{virtual_host.linux_username}"
            path = sanitize_path(path)
            full_path = os.path.join(home_dir, path)
            
            # Security check (skip for admin/root)
            if not (current_user.is_admin or current_user.role == 'admin' or current_user.username == 'root'):
                real_full_path = os.path.realpath(full_path)
                real_home_dir = os.path.realpath(home_dir)
                
                if not real_full_path.startswith(real_home_dir):
                    raise ValueError("Access denied: Path outside domain directory")
            
            result = self._write_file_content(full_path, content)

            # Ensure the file ownership is set to the domain user when running as root
            try:
                if UNIX_MODULES_AVAILABLE and pwd and grp and os.geteuid() == 0:
                    user_info = pwd.getpwnam(virtual_host.linux_username)
                    os.chown(full_path, user_info.pw_uid, user_info.pw_gid)
            except Exception as e:
                print(f"Warning: failed to chown written file {full_path}: {e}")

            return result
            
        except Exception as e:
            raise Exception(f"Error writing domain file: {str(e)}")

    def upload_domain_file(self, domain: str, path: str, file, user_id: int) -> Dict:
        """Upload file for a specific domain"""
        try:
            # Import here to avoid circular import
            from models.user import User
            from utils.permissions import can_access_virtual_host
            
            current_user = User.query.get(user_id)
            if not current_user:
                raise ValueError("User not found")
            
            # Admin/root users can access any domain
            if current_user.is_admin or current_user.role == 'admin' or current_user.username == 'root':
                virtual_host = VirtualHost.query.filter_by(domain=domain).first()
            else:
                # First try to find virtual host owned by user
                virtual_host = VirtualHost.query.filter_by(domain=domain, user_id=user_id).first()
                
                # If not found, try to find virtual host with matching linux_username
                if not virtual_host:
                    virtual_host = VirtualHost.query.filter_by(domain=domain, linux_username=current_user.username).first()
                    
                    # Check if user can access this virtual host
                    if virtual_host and not can_access_virtual_host(current_user, virtual_host):
                        virtual_host = None
                        
            if not virtual_host:
                raise ValueError("Domain not found or access denied")
                
            home_dir = f"/home/{virtual_host.linux_username}"
            return self._upload_file_to_directory(home_dir, path, file, owner_username=virtual_host.linux_username)
            
        except Exception as e:
            raise Exception(f"Error uploading domain file: {str(e)}")

    def get_domain_file_info(self, domain: str, path: str, user_id: int) -> Dict:
        """Get detailed file information for a specific domain"""
        try:
            # Import here to avoid circular import
            from models.user import User
            from utils.permissions import can_access_virtual_host
            
            current_user = User.query.get(user_id)
            if not current_user:
                raise ValueError("User not found")
            
            # Admin/root users can access any domain
            if current_user.is_admin or current_user.role == 'admin' or current_user.username == 'root':
                virtual_host = VirtualHost.query.filter_by(domain=domain).first()
            else:
                # First try to find virtual host owned by user
                virtual_host = VirtualHost.query.filter_by(domain=domain, user_id=user_id).first()
                
                # If not found, try to find virtual host with matching linux_username
                if not virtual_host:
                    virtual_host = VirtualHost.query.filter_by(domain=domain, linux_username=current_user.username).first()
                    
                    # Check if user can access this virtual host
                    if virtual_host and not can_access_virtual_host(current_user, virtual_host):
                        virtual_host = None
                        
            if not virtual_host:
                raise ValueError("Domain not found or access denied")
                
            home_dir = f"/home/{virtual_host.linux_username}"
            path = sanitize_path(path)
            full_path = os.path.join(home_dir, path)
            
            # Security check (skip for admin/root)
            if not (current_user.is_admin or current_user.role == 'admin' or current_user.username == 'root'):
                real_full_path = os.path.realpath(full_path)
                real_home_dir = os.path.realpath(home_dir)
                
                if not real_full_path.startswith(real_home_dir):
                    raise ValueError("Access denied: Path outside domain directory")
            
            return self._get_detailed_file_info(full_path)
            
        except Exception as e:
            raise Exception(f"Error getting domain file info: {str(e)}")

    def zip_domain_items(self, domain: str, base_path: str, item_names: List[str], zip_name: Optional[str], user_id: int) -> Dict:
        """Create a zip archive from one or more items in a domain directory"""
        try:
            # Import here to avoid circular import
            from models.user import User
            from utils.permissions import can_access_virtual_host

            current_user = User.query.get(user_id)
            if not current_user:
                raise ValueError("User not found")

            if current_user.is_admin or current_user.role == 'admin' or current_user.username == 'root':
                virtual_host = VirtualHost.query.filter_by(domain=domain).first()
            else:
                virtual_host = VirtualHost.query.filter_by(domain=domain, user_id=user_id).first()
                if not virtual_host:
                    virtual_host = VirtualHost.query.filter_by(domain=domain, linux_username=current_user.username).first()
                    if virtual_host and not can_access_virtual_host(current_user, virtual_host):
                        virtual_host = None

            if not virtual_host:
                raise ValueError("Domain not found or access denied")

            home_dir = f"/home/{virtual_host.linux_username}"
            base_path = sanitize_path(base_path) if base_path else ''
            base_full_path = os.path.join(home_dir, base_path)

            # Security check
            if not (current_user.is_admin or current_user.role == 'admin' or current_user.username == 'root'):
                real_home = os.path.realpath(home_dir)
                if not os.path.realpath(base_full_path).startswith(real_home):
                    raise ValueError("Access denied: Path outside domain directory")

            if not os.path.isdir(base_full_path):
                raise ValueError("Base path must be a directory")

            if not item_names:
                raise ValueError("No items specified to zip")

            archive_name = zip_name or 'archive.zip'
            if not archive_name.lower().endswith('.zip'):
                archive_name += '.zip'
            archive_path = os.path.join(base_full_path, archive_name)

            with zipfile.ZipFile(archive_path, 'w', zipfile.ZIP_DEFLATED) as zf:
                for name in item_names:
                    item_rel = sanitize_path(name)
                    item_full = os.path.join(base_full_path, item_rel)
                    if not os.path.exists(item_full):
                        raise FileNotFoundError(f"Item not found: {name}")
                    if os.path.isdir(item_full):
                        # Add directory recursively
                        for dirpath, dirnames, filenames in os.walk(item_full):
                            for filename in filenames:
                                filepath = os.path.join(dirpath, filename)
                                arcname = os.path.relpath(filepath, base_full_path)
                                zf.write(filepath, arcname)
                    else:
                        arcname = os.path.relpath(item_full, base_full_path)
                        zf.write(item_full, arcname)

            # Ensure ownership of the created archive
            try:
                if UNIX_MODULES_AVAILABLE and pwd and grp and os.geteuid() == 0:
                    user_info = pwd.getpwnam(virtual_host.linux_username)
                    os.chown(archive_path, user_info.pw_uid, user_info.pw_gid)
            except Exception as e:
                print(f"Warning: failed to chown archive {archive_path}: {e}")

            stat_info = os.stat(archive_path)
            return {
                'name': os.path.basename(archive_path),
                'path': os.path.relpath(archive_path, home_dir).replace(os.sep, '/'),
                'size': stat_info.st_size,
                'modifiedAt': datetime.fromtimestamp(stat_info.st_mtime).isoformat()
            }
        except Exception as e:
            raise Exception(f"Error creating zip: {str(e)}")

    def unzip_domain_item(self, domain: str, archive_path: str, destination: Optional[str], user_id: int) -> Dict:
        """Extract a zip archive within a domain directory"""
        try:
            # Import here to avoid circular import
            from models.user import User
            from utils.permissions import can_access_virtual_host

            current_user = User.query.get(user_id)
            if not current_user:
                raise ValueError("User not found")

            if current_user.is_admin or current_user.role == 'admin' or current_user.username == 'root':
                virtual_host = VirtualHost.query.filter_by(domain=domain).first()
            else:
                virtual_host = VirtualHost.query.filter_by(domain=domain, user_id=user_id).first()
                if not virtual_host:
                    virtual_host = VirtualHost.query.filter_by(domain=domain, linux_username=current_user.username).first()
                    if virtual_host and not can_access_virtual_host(current_user, virtual_host):
                        virtual_host = None

            if not virtual_host:
                raise ValueError("Domain not found or access denied")

            home_dir = f"/home/{virtual_host.linux_username}"
            archive_rel = sanitize_path(archive_path)
            archive_full = os.path.join(home_dir, archive_rel)

            if destination:
                dest_rel = sanitize_path(destination)
                dest_full = os.path.join(home_dir, dest_rel)
            else:
                dest_full = os.path.dirname(archive_full)

            # Security checks
            if not (current_user.is_admin or current_user.role == 'admin' or current_user.username == 'root'):
                real_home = os.path.realpath(home_dir)
                if not os.path.realpath(archive_full).startswith(real_home) or not os.path.realpath(dest_full).startswith(real_home):
                    raise ValueError("Access denied: Path outside domain directory")

            if not os.path.exists(archive_full) or not os.path.isfile(archive_full):
                raise FileNotFoundError("Archive not found")
            if not archive_full.lower().endswith('.zip'):
                raise ValueError("Only .zip archives are supported")

            os.makedirs(dest_full, exist_ok=True)
            with zipfile.ZipFile(archive_full, 'r') as zf:
                # Prevent Zip Slip by validating paths
                for member in zf.infolist():
                    member_path = os.path.normpath(os.path.join(dest_full, member.filename))
                    if not member_path.startswith(os.path.realpath(dest_full)):
                        raise Exception("Unsafe path detected in archive")
                zf.extractall(dest_full)

            # Ensure ownership of extracted files
            try:
                if UNIX_MODULES_AVAILABLE and pwd and grp and os.geteuid() == 0:
                    user_info = pwd.getpwnam(virtual_host.linux_username)
                    for dirpath, dirnames, filenames in os.walk(dest_full):
                        os.chown(dirpath, user_info.pw_uid, user_info.pw_gid)
                        for name in filenames:
                            os.chown(os.path.join(dirpath, name), user_info.pw_uid, user_info.pw_gid)
            except Exception as e:
                print(f"Warning: failed to chown extracted files in {dest_full}: {e}")

            stat_info = os.stat(dest_full)
            return {
                'destination': dest_full,
                'modifiedAt': datetime.fromtimestamp(stat_info.st_mtime).isoformat()
            }
        except Exception as e:
            raise Exception(f"Error extracting zip: {str(e)}")

    def get_file_info(self, path: str) -> Dict:
        """Get detailed information about a file or directory"""
        path = sanitize_path(path)
        full_path = os.path.join(self.root_dir, path)
        
        if not is_safe_path(self.root_dir, path):
            raise ValueError("Invalid path")
        
        return self._get_detailed_file_info(full_path)

    def _get_detailed_file_info(self, full_path: str) -> Dict:
        """Internal method to get detailed file information"""
        if not os.path.exists(full_path):
            raise FileNotFoundError(f"File not found: {full_path}")
        
        stat_info = os.stat(full_path)
        is_dir = os.path.isdir(full_path)
        
        # Get owner and group names (Unix only)
        if UNIX_MODULES_AVAILABLE and pwd and grp:
            try:
                owner_name = pwd.getpwuid(stat_info.st_uid).pw_name
            except KeyError:
                owner_name = str(stat_info.st_uid)
            
            try:
                group_name = grp.getgrgid(stat_info.st_gid).gr_name
            except KeyError:
                group_name = str(stat_info.st_gid)
        else:
            # Windows fallback
            owner_name = 'N/A'
            group_name = 'N/A'
        
        info = {
            'name': os.path.basename(full_path),
            'fullPath': full_path,
            'type': 'folder' if is_dir else self._get_file_type(os.path.basename(full_path)),
            'size': stat_info.st_size if not is_dir else self._get_directory_size(full_path),
            'permissions': self._get_file_permissions(full_path),
            'owner': owner_name,
            'group': group_name,
            'createdAt': datetime.fromtimestamp(stat_info.st_ctime).isoformat(),
            'modifiedAt': datetime.fromtimestamp(stat_info.st_mtime).isoformat(),
            'accessedAt': datetime.fromtimestamp(stat_info.st_atime).isoformat(),
            'isHidden': os.path.basename(full_path).startswith('.'),
            'isSymlink': os.path.islink(full_path),
            'isReadable': os.access(full_path, os.R_OK),
            'isWritable': os.access(full_path, os.W_OK),
            'isExecutable': os.access(full_path, os.X_OK)
        }
        
        if os.path.islink(full_path):
            try:
                info['linkTarget'] = os.readlink(full_path)
            except OSError:
                info['linkTarget'] = 'Unknown'
        
        return info

    def _read_file_content(self, full_path: str) -> Dict:
        """Internal method to read file content"""
        if not os.path.exists(full_path) or not os.path.isfile(full_path):
            raise FileNotFoundError(f"File not found: {full_path}")

        try:
            with open(full_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except UnicodeDecodeError:
            # If UTF-8 fails, try with system default encoding
            with open(full_path, 'r') as f:
                content = f.read()

        stat_info = os.stat(full_path)
        return {
            'name': os.path.basename(full_path),
            'content': content,
            'size': stat_info.st_size,
            'modifiedAt': datetime.fromtimestamp(stat_info.st_mtime).isoformat(),
            'permissions': self._get_file_permissions(full_path)
        }

    def _write_file_content(self, full_path: str, content: str) -> Dict:
        """Internal method to write file content"""
        # Create directory if it doesn't exist
        dir_path = os.path.dirname(full_path)
        os.makedirs(dir_path, exist_ok=True)
        
        with open(full_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        stat_info = os.stat(full_path)
        return {
            'name': os.path.basename(full_path),
            'size': stat_info.st_size,
            'modifiedAt': datetime.fromtimestamp(stat_info.st_mtime).isoformat(),
            'permissions': self._get_file_permissions(full_path)
        }

    def _upload_file_to_directory(self, base_dir: str, path: str, file, owner_username: Optional[str] = None) -> Dict:
        """Internal method to upload file to directory. Optionally chown to owner_username."""
        filename = secure_filename(file.filename)
        path = sanitize_path(path) if path else ''
        
        if path:
            upload_dir = os.path.join(base_dir, path)
        else:
            upload_dir = base_dir
        
        os.makedirs(upload_dir, exist_ok=True)
        
        file_path = os.path.join(upload_dir, filename)
        file.save(file_path)

        # Adjust ownership to target user if specified and running as root
        try:
            if owner_username and UNIX_MODULES_AVAILABLE and pwd and grp and os.geteuid() == 0:
                user_info = pwd.getpwnam(owner_username)
                os.chown(file_path, user_info.pw_uid, user_info.pw_gid)
        except Exception as e:
            # Non-fatal: log and continue
            print(f"Warning: failed to chown uploaded file {file_path} to {owner_username}: {e}")
        
        stat_info = os.stat(file_path)
        return {
            'name': filename,
            'size': stat_info.st_size,
            'modifiedAt': datetime.fromtimestamp(stat_info.st_mtime).isoformat(),
            'permissions': self._get_file_permissions(file_path)
        }

    def _get_file_permissions(self, path: str) -> str:
        """Get file permissions in octal format (e.g., 755, 644)"""
        st = os.stat(path)
        mode = st.st_mode
        
        # Extract the permission bits (last 3 octal digits)
        # Use format to convert to octal and take last 3 digits
        octal_perms = format(stat.S_IMODE(mode), 'o')
        
        # Ensure it's always 3 digits by padding with zeros if needed
        return octal_perms.zfill(3)

    def list_directory(self, path: str) -> List[Dict]:
        """List contents of a directory with improved file access"""
        try:
            # Normalize empty path to current directory
            if not path or path == '/':
                path = ''
            else:
                path = sanitize_path(path)

            full_path = os.path.join(self.root_dir, path)
            real_full_path = os.path.realpath(full_path)
            
            if not is_safe_path(self.root_dir, path):
                raise ValueError(f"Invalid path: {path}")
            
            if not os.path.exists(real_full_path):
                raise FileNotFoundError(f"Directory not found: {path}")
            
            if not os.path.isdir(real_full_path):
                raise ValueError(f"Not a directory: {path}")

            items = []
            try:
                # Get directory contents
                dir_entries = os.scandir(real_full_path)
                
                for entry in dir_entries:
                    try:
                        # Skip hidden files and directories by default
                        if entry.name.startswith('.'):
                            continue
                        
                        # Get basic file info using entry object (more efficient)
                        name = entry.name
                        item_path = entry.path
                        is_dir = entry.is_dir()
                        is_file = entry.is_file()
                        
                        try:
                            stat_info = entry.stat()
                        except (OSError, PermissionError) as e:
                            print(f"Error getting stat for {item_path}: {e}")
                            # Fallback to os.stat if entry.stat() fails
                            stat_info = os.stat(item_path)
                        
                        # Calculate relative path from root directory
                        rel_path = os.path.relpath(item_path, self.root_dir)
                        # Convert Windows path separators to forward slashes
                        rel_path = rel_path.replace(os.sep, '/')
                        
                        # Determine file type
                        file_type = self._get_file_type(name) if is_file else 'folder'
                        
                        # Get owner and group names for list_directory method
                        if UNIX_MODULES_AVAILABLE and pwd and grp:
                            try:
                                owner_name = pwd.getpwuid(stat_info.st_uid).pw_name
                            except KeyError:
                                owner_name = str(stat_info.st_uid)
                            
                            try:
                                group_name = grp.getgrgid(stat_info.st_gid).gr_name
                            except KeyError:
                                group_name = str(stat_info.st_gid)
                        else:
                            # Windows fallback
                            owner_name = 'N/A'
                            group_name = 'N/A'
                        
                        item_info = {
                            'name': name,
                            'type': file_type,
                            'size': stat_info.st_size if is_file else None,
                            'modifiedAt': datetime.fromtimestamp(stat_info.st_mtime).isoformat(),
                            'path': rel_path,
                            'permissions': self._get_file_permissions(item_path),
                            'isHidden': name.startswith('.'),
                            'owner': owner_name,
                            'group': group_name,
                            'isSymlink': entry.is_symlink()
                        }
                        items.append(item_info)
                        
                    except (OSError, PermissionError) as e:
                        print(f"Error accessing {entry.path}: {e}")
                        continue
                
            except Exception as e:
                print(f"Error listing directory {full_path}: {e}")
                raise
            finally:
                try:
                    dir_entries.close()
                except:
                    pass

            # Sort items: folders first, then files, both alphabetically
            sorted_items = sorted(items, key=lambda x: (x['type'] != 'folder', x['name'].lower()))
            return sorted_items
            
        except Exception as e:
            print(f"Unexpected error in list_directory: {e}")
            raise

    def _get_file_type(self, filename: str) -> str:
        """Determine file type based on extension"""
        lower_name = filename.lower()
        
        if lower_name.endswith(('.txt', '.log', '.conf', '.ini', '.json', '.yml', '.yaml', '.xml')):
            return 'text'
        elif lower_name.endswith(('.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg')):
            return 'image'
        elif lower_name.endswith(('.mp4', '.avi', '.mov', '.mkv', '.webm')):
            return 'video'
        elif lower_name.endswith(('.mp3', '.wav', '.ogg', '.m4a', '.flac')):
            return 'audio'
        elif lower_name.endswith(('.zip', '.tar', '.gz', '.7z', '.rar', '.bz2')):
            return 'archive'
        elif lower_name.endswith(('.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx')):
            return 'document'
        
        return 'file'

    def read_file(self, path: str) -> Dict:
        """Read contents of a file"""
        path = sanitize_path(path)
        full_path = os.path.join(self.root_dir, path)
        
        if not is_safe_path(self.root_dir, path):
            raise ValueError("Invalid path")
            
        if not os.path.exists(full_path) or not os.path.isfile(full_path):
            raise FileNotFoundError(f"File {path} not found")

        try:
            with open(full_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except UnicodeDecodeError:
            # If UTF-8 fails, try with system default encoding
            with open(full_path, 'r') as f:
                content = f.read()

        stat_info = os.stat(full_path)
        return {
            'name': os.path.basename(path),
            'content': content,
            'size': stat_info.st_size,
            'modifiedAt': datetime.fromtimestamp(stat_info.st_mtime).isoformat(),
            'permissions': self._get_file_permissions(full_path)
        }

    def write_file(self, path: str, content: str) -> Dict:
        """Write content to a file"""
        path = sanitize_path(path)
        full_path = os.path.join(self.root_dir, path)
        
        if not is_safe_path(self.root_dir, path):
            raise ValueError("Invalid path")

        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, 'w', encoding='utf-8') as f:
            f.write(content)

        stat_info = os.stat(full_path)
        return {
            'name': os.path.basename(path),
            'size': stat_info.st_size,
            'modifiedAt': datetime.fromtimestamp(stat_info.st_mtime).isoformat(),
            'permissions': self._get_file_permissions(full_path)
        }

    def create_directory(self, path: str) -> Dict:
        """Create a new directory"""
        path = sanitize_path(path)
        full_path = os.path.join(self.root_dir, path)
        
        if not is_safe_path(self.root_dir, path):
            raise ValueError("Invalid path")

        os.makedirs(full_path, exist_ok=True)
        stat_info = os.stat(full_path)
        return {
            'name': os.path.basename(path),
            'type': 'folder',
            'modifiedAt': datetime.fromtimestamp(stat_info.st_mtime).isoformat(),
            'permissions': self._get_file_permissions(full_path)
        }

    def delete_item(self, path: str) -> bool:
        """Delete a file or directory"""
        path = sanitize_path(path)
        full_path = os.path.join(self.root_dir, path)
        
        if not is_safe_path(self.root_dir, path):
            raise ValueError("Invalid path")
            
        if not os.path.exists(full_path):
            raise FileNotFoundError(f"Path {path} not found")

        if os.path.isdir(full_path):
            shutil.rmtree(full_path)
        else:
            os.remove(full_path)
        return True

    def rename_item(self, old_path: str, new_path: str) -> Dict:
        """Rename/move a file or directory"""
        old_path = sanitize_path(old_path)
        new_path = sanitize_path(new_path)
        full_old_path = os.path.join(self.root_dir, old_path)
        full_new_path = os.path.join(self.root_dir, new_path)
        
        if not is_safe_path(self.root_dir, old_path) or not is_safe_path(self.root_dir, new_path):
            raise ValueError("Invalid path")

        if not os.path.exists(full_old_path):
            raise FileNotFoundError(f"Path {old_path} not found")

        os.makedirs(os.path.dirname(full_new_path), exist_ok=True)
        shutil.move(full_old_path, full_new_path)

        stat_info = os.stat(full_new_path)
        return {
            'name': os.path.basename(new_path),
            'type': 'folder' if os.path.isdir(full_new_path) else 'file',
            'size': stat_info.st_size if os.path.isfile(full_new_path) else None,
            'modifiedAt': datetime.fromtimestamp(stat_info.st_mtime).isoformat(),
            'permissions': self._get_file_permissions(full_new_path)
        }

    def zip_items(self, path: str, item_names: List[str], zip_name: Optional[str] = None) -> Dict:
        """Create a zip archive from one or more items under the system root"""
        path = sanitize_path(path) if path else ''
        base_dir = os.path.join(self.root_dir, path)

        if not is_safe_path(self.root_dir, path):
            raise ValueError("Invalid path")
        if not os.path.isdir(base_dir):
            raise ValueError("Base path must be a directory")
        if not item_names:
            raise ValueError("No items specified to zip")

        archive_name = zip_name or 'archive.zip'
        if not archive_name.lower().endswith('.zip'):
            archive_name += '.zip'
        archive_path = os.path.join(base_dir, archive_name)

        with zipfile.ZipFile(archive_path, 'w', zipfile.ZIP_DEFLATED) as zf:
            for name in item_names:
                item_rel = sanitize_path(name)
                item_full = os.path.join(base_dir, item_rel)
                if not os.path.exists(item_full):
                    raise FileNotFoundError(f"Item not found: {name}")
                if os.path.isdir(item_full):
                    for dirpath, dirnames, filenames in os.walk(item_full):
                        for filename in filenames:
                            filepath = os.path.join(dirpath, filename)
                            arcname = os.path.relpath(filepath, base_dir)
                            zf.write(filepath, arcname)
                else:
                    arcname = os.path.relpath(item_full, base_dir)
                    zf.write(item_full, arcname)

        stat_info = os.stat(archive_path)
        return {
            'name': os.path.basename(archive_path),
            'path': os.path.relpath(archive_path, self.root_dir).replace(os.sep, '/'),
            'size': stat_info.st_size,
            'modifiedAt': datetime.fromtimestamp(stat_info.st_mtime).isoformat()
        }

    def unzip_item(self, archive_path: str, destination: Optional[str] = None) -> Dict:
        """Extract a zip archive under the system root"""
        archive_path = sanitize_path(archive_path)
        archive_full = os.path.join(self.root_dir, archive_path)

        if not is_safe_path(self.root_dir, archive_path):
            raise ValueError("Invalid path")
        if not os.path.exists(archive_full) or not os.path.isfile(archive_full):
            raise FileNotFoundError("Archive not found")
        if not archive_full.lower().endswith('.zip'):
            raise ValueError("Only .zip archives are supported")

        if destination:
            dest_rel = sanitize_path(destination)
            dest_full = os.path.join(self.root_dir, dest_rel)
            if not is_safe_path(self.root_dir, dest_rel):
                raise ValueError("Invalid destination path")
        else:
            dest_full = os.path.dirname(archive_full)

        os.makedirs(dest_full, exist_ok=True)
        with zipfile.ZipFile(archive_full, 'r') as zf:
            for member in zf.infolist():
                member_path = os.path.normpath(os.path.join(dest_full, member.filename))
                if not member_path.startswith(os.path.realpath(dest_full)):
                    raise Exception("Unsafe path detected in archive")
            zf.extractall(dest_full)

        stat_info = os.stat(dest_full)
        return {
            'destination': os.path.relpath(dest_full, self.root_dir).replace(os.sep, '/'),
            'modifiedAt': datetime.fromtimestamp(stat_info.st_mtime).isoformat()
        }

    def _create_empty_file(self, full_path: str) -> Dict:
        """Internal method to create an empty file"""
        if os.path.exists(full_path):
            raise ValueError("File already exists")
        
        dir_path = os.path.dirname(full_path)
        os.makedirs(dir_path, exist_ok=True)
        
        # Create an empty file
        with open(full_path, 'w') as f:
            pass
            
        stat_info = os.stat(full_path)
        return {
            'name': os.path.basename(full_path),
            'type': self._get_file_type(os.path.basename(full_path)),
            'size': stat_info.st_size,
            'modifiedAt': datetime.fromtimestamp(stat_info.st_mtime).isoformat(),
            'permissions': self._get_file_permissions(full_path)
        }

    def create_file(self, path: str) -> Dict:
        """Create a new empty file in the system root"""
        path = sanitize_path(path)
        full_path = os.path.join(self.root_dir, path)
        
        if not is_safe_path(self.root_dir, path):
            raise ValueError("Invalid path")

        return self._create_empty_file(full_path)

    # Domain-based file operations
    def create_domain_file(self, domain: str, path: str, user_id: int) -> Dict:
        """Create a new empty file for a specific domain"""
        try:
            # Import here to avoid circular import
            from models.user import User
            from utils.permissions import can_access_virtual_host
            
            current_user = User.query.get(user_id)
            if not current_user:
                raise ValueError("User not found")
            
            # Admin/root users can access any domain
            if current_user.is_admin or current_user.role == 'admin' or current_user.username == 'root':
                virtual_host = VirtualHost.query.filter_by(domain=domain).first()
            else:
                # First try to find virtual host owned by user
                virtual_host = VirtualHost.query.filter_by(domain=domain, user_id=user_id).first()
                
                # If not found, try to find virtual host with matching linux_username
                if not virtual_host:
                    virtual_host = VirtualHost.query.filter_by(domain=domain, linux_username=current_user.username).first()
                    
                    # Check if user can access this virtual host
                    if virtual_host and not can_access_virtual_host(current_user, virtual_host):
                        virtual_host = None
                        
            if not virtual_host:
                raise ValueError("Domain not found or access denied")
                
            home_dir = f"/home/{virtual_host.linux_username}"
            path = sanitize_path(path)
            full_path = os.path.join(home_dir, path)
            
            # Security check (skip for admin/root)
            if not (current_user.is_admin or current_user.role == 'admin' or current_user.username == 'root'):
                real_full_path = os.path.realpath(full_path)
                real_home_dir = os.path.realpath(home_dir)
                
                if not real_full_path.startswith(real_home_dir):
                    raise ValueError("Access denied: Path outside domain directory")
            
            result = self._create_empty_file(full_path)

            # Ensure the file ownership is set to the domain user when running as root
            try:
                if UNIX_MODULES_AVAILABLE and pwd and grp and os.geteuid() == 0:
                    user_info = pwd.getpwnam(virtual_host.linux_username)
                    os.chown(full_path, user_info.pw_uid, user_info.pw_gid)
            except Exception as e:
                print(f"Warning: failed to chown created file {full_path}: {e}")

            return result
            
        except Exception as e:
            raise Exception(f"Error creating domain file: {str(e)}")

    def create_domain_directory(self, domain: str, path: str, user_id: int) -> Dict:
        """Create directory for a specific domain"""
        try:
            # Import here to avoid circular import
            from models.user import User
            from utils.permissions import can_access_virtual_host
            
            current_user = User.query.get(user_id)
            if not current_user:
                raise ValueError("User not found")
            
            # Admin/root users can access any domain
            if current_user.is_admin or current_user.role == 'admin' or current_user.username == 'root':
                virtual_host = VirtualHost.query.filter_by(domain=domain).first()
            else:
                # First try to find virtual host owned by user
                virtual_host = VirtualHost.query.filter_by(domain=domain, user_id=user_id).first()
                
                # If not found, try to find virtual host with matching linux_username
                if not virtual_host:
                    virtual_host = VirtualHost.query.filter_by(domain=domain, linux_username=current_user.username).first()
                    
                    # Check if user can access this virtual host
                    if virtual_host and not can_access_virtual_host(current_user, virtual_host):
                        virtual_host = None
                        
            if not virtual_host:
                raise ValueError("Domain not found or access denied")
                
            home_dir = f"/home/{virtual_host.linux_username}"
            path = sanitize_path(path)
            full_path = os.path.join(home_dir, path)
            
            # Security check (skip for admin/root)
            if not (current_user.is_admin or current_user.role == 'admin' or current_user.username == 'root'):
                real_full_path = os.path.realpath(full_path)
                real_home_dir = os.path.realpath(home_dir)
                
                if not real_full_path.startswith(real_home_dir):
                    raise ValueError("Access denied: Path outside domain directory")
            
            if os.path.exists(full_path):
                raise ValueError(f"Directory already exists: {path}")
            
            os.makedirs(full_path, exist_ok=True)
            # Set ownership to the domain's linux user if running as root
            try:
                if UNIX_MODULES_AVAILABLE and pwd and grp and os.geteuid() == 0:
                    user_info = pwd.getpwnam(virtual_host.linux_username)
                    os.chown(full_path, user_info.pw_uid, user_info.pw_gid)
            except Exception as e:
                print(f"Warning: failed to chown created directory {full_path}: {e}")
            
            stat_info = os.stat(full_path)
            return {
                'name': os.path.basename(full_path),
                'size': None,
                'modifiedAt': datetime.fromtimestamp(stat_info.st_mtime).isoformat(),
                'permissions': self._get_file_permissions(full_path)
            }
            
        except Exception as e:
            raise Exception(f"Error creating domain directory: {str(e)}")

    def delete_domain_item(self, domain: str, path: str, user_id: int) -> bool:
        """Delete file or directory for a specific domain"""
        try:
            # Import here to avoid circular import
            from models.user import User
            from utils.permissions import can_access_virtual_host
            
            current_user = User.query.get(user_id)
            if not current_user:
                raise ValueError("User not found")
            
            # Admin/root users can access any domain
            if current_user.is_admin or current_user.role == 'admin' or current_user.username == 'root':
                virtual_host = VirtualHost.query.filter_by(domain=domain).first()
            else:
                # First try to find virtual host owned by user
                virtual_host = VirtualHost.query.filter_by(domain=domain, user_id=user_id).first()
                
                # If not found, try to find virtual host with matching linux_username
                if not virtual_host:
                    virtual_host = VirtualHost.query.filter_by(domain=domain, linux_username=current_user.username).first()
                    
                    # Check if user can access this virtual host
                    if virtual_host and not can_access_virtual_host(current_user, virtual_host):
                        virtual_host = None
                        
            if not virtual_host:
                raise ValueError("Domain not found or access denied")
                
            home_dir = f"/home/{virtual_host.linux_username}"
            path = sanitize_path(path)
            full_path = os.path.join(home_dir, path)
            
            # Security check (skip for admin/root)
            if not (current_user.is_admin or current_user.role == 'admin' or current_user.username == 'root'):
                real_full_path = os.path.realpath(full_path)
                real_home_dir = os.path.realpath(home_dir)
                
                if not real_full_path.startswith(real_home_dir):
                    raise ValueError("Access denied: Path outside domain directory")
            
            if not os.path.exists(full_path):
                raise FileNotFoundError(f"Item not found: {path}")
            
            if os.path.isdir(full_path):
                shutil.rmtree(full_path)
            else:
                os.remove(full_path)
            
            return True
            
        except Exception as e:
            raise Exception(f"Error deleting domain item: {str(e)}")

    def copy_domain_item(self, domain: str, source_path: str, dest_path: str, user_id: int) -> Dict:
        """Copy a file or directory within a specific domain"""
        try:
            # Import here to avoid circular import
            from models.user import User
            from utils.permissions import can_access_virtual_host

            current_user = User.query.get(user_id)
            if not current_user:
                raise ValueError("User not found")

            # Admin/root users can access any domain
            if current_user.is_admin or current_user.role == 'admin' or current_user.username == 'root':
                virtual_host = VirtualHost.query.filter_by(domain=domain).first()
            else:
                virtual_host = VirtualHost.query.filter_by(domain=domain, user_id=user_id).first()
                if not virtual_host:
                    virtual_host = VirtualHost.query.filter_by(domain=domain, linux_username=current_user.username).first()
                    if virtual_host and not can_access_virtual_host(current_user, virtual_host):
                        virtual_host = None

            if not virtual_host:
                raise ValueError("Domain not found or access denied")

            home_dir = f"/home/{virtual_host.linux_username}"
            source_path = sanitize_path(source_path)
            dest_path = sanitize_path(dest_path)

            source_full_path = os.path.join(home_dir, source_path)
            dest_full_path = os.path.join(home_dir, dest_path)

            # Security check (skip for admin/root)
            if not (current_user.is_admin or current_user.role == 'admin' or current_user.username == 'root'):
                real_home = os.path.realpath(home_dir)
                if not os.path.realpath(source_full_path).startswith(real_home) or not os.path.realpath(dest_full_path).startswith(real_home):
                    raise ValueError("Access denied: Path outside domain directory")

            if not os.path.exists(source_full_path):
                raise FileNotFoundError(f"Source not found: {source_path}")
            if os.path.exists(dest_full_path):
                raise ValueError(f"Destination already exists: {dest_path}")

            os.makedirs(os.path.dirname(dest_full_path), exist_ok=True)

            if os.path.isdir(source_full_path):
                shutil.copytree(source_full_path, dest_full_path)
            else:
                shutil.copy2(source_full_path, dest_full_path)

            # Ensure ownership to domain user when running as root
            try:
                if UNIX_MODULES_AVAILABLE and pwd and grp and os.geteuid() == 0:
                    user_info = pwd.getpwnam(virtual_host.linux_username)
                    if os.path.isdir(dest_full_path):
                        for dirpath, dirnames, filenames in os.walk(dest_full_path):
                            os.chown(dirpath, user_info.pw_uid, user_info.pw_gid)
                            for name in filenames:
                                os.chown(os.path.join(dirpath, name), user_info.pw_uid, user_info.pw_gid)
                    else:
                        os.chown(dest_full_path, user_info.pw_uid, user_info.pw_gid)
            except Exception as e:
                print(f"Warning: failed to chown copied item {dest_full_path}: {e}")

            stat_info = os.stat(dest_full_path)
            return {
                'name': os.path.basename(dest_full_path),
                'size': stat_info.st_size if not os.path.isdir(dest_full_path) else None,
                'modifiedAt': datetime.fromtimestamp(stat_info.st_mtime).isoformat()
            }
        except Exception as e:
            raise Exception(f"Error copying domain item: {str(e)}")

    def rename_domain_item(self, domain: str, old_path: str, new_path: str, user_id: int) -> Dict:
        """Rename file or directory for a specific domain"""
        try:
            # Import here to avoid circular import
            from models.user import User
            from utils.permissions import can_access_virtual_host
            
            current_user = User.query.get(user_id)
            if not current_user:
                raise ValueError("User not found")
            
            # Admin/root users can access any domain
            if current_user.is_admin or current_user.role == 'admin' or current_user.username == 'root':
                virtual_host = VirtualHost.query.filter_by(domain=domain).first()
            else:
                # First try to find virtual host owned by user
                virtual_host = VirtualHost.query.filter_by(domain=domain, user_id=user_id).first()
                
                # If not found, try to find virtual host with matching linux_username
                if not virtual_host:
                    virtual_host = VirtualHost.query.filter_by(domain=domain, linux_username=current_user.username).first()
                    
                    # Check if user can access this virtual host
                    if virtual_host and not can_access_virtual_host(current_user, virtual_host):
                        virtual_host = None
                        
            if not virtual_host:
                raise ValueError("Domain not found or access denied")
                
            home_dir = f"/home/{virtual_host.linux_username}"
            old_path = sanitize_path(old_path)
            new_path = sanitize_path(new_path)
            
            old_full_path = os.path.join(home_dir, old_path)
            new_full_path = os.path.join(home_dir, new_path)
            
            # Security check for both paths (skip for admin/root)
            if not (current_user.is_admin or current_user.role == 'admin' or current_user.username == 'root'):
                real_old_path = os.path.realpath(old_full_path)
                real_new_path = os.path.realpath(new_full_path)
                real_home_dir = os.path.realpath(home_dir)
                
                if not real_old_path.startswith(real_home_dir) or not real_new_path.startswith(real_home_dir):
                    raise ValueError("Access denied: Path outside domain directory")
            
            if not os.path.exists(old_full_path):
                raise FileNotFoundError(f"Source not found: {old_path}")
            
            if os.path.exists(new_full_path):
                raise ValueError(f"Destination already exists: {new_path}")
            
            os.rename(old_full_path, new_full_path)
            
            # Ensure ownership for moved target remains with domain user (best effort)
            try:
                if UNIX_MODULES_AVAILABLE and pwd and grp and os.geteuid() == 0:
                    user_info = pwd.getpwnam(virtual_host.linux_username)
                    if os.path.isdir(new_full_path):
                        for dirpath, dirnames, filenames in os.walk(new_full_path):
                            os.chown(dirpath, user_info.pw_uid, user_info.pw_gid)
                            for name in filenames:
                                os.chown(os.path.join(dirpath, name), user_info.pw_uid, user_info.pw_gid)
                    else:
                        os.chown(new_full_path, user_info.pw_uid, user_info.pw_gid)
            except Exception as e:
                print(f"Warning: failed to chown renamed item {new_full_path}: {e}")

            stat_info = os.stat(new_full_path)
            return {
                'name': os.path.basename(new_full_path),
                'size': stat_info.st_size if not os.path.isdir(new_full_path) else None,
                'modifiedAt': datetime.fromtimestamp(stat_info.st_mtime).isoformat(),
                'permissions': self._get_file_permissions(new_full_path)
            }
            
        except Exception as e:
            raise Exception(f"Error renaming domain item: {str(e)}") 
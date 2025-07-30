import os
import subprocess
import platform
import shutil
import tarfile
import json
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from sqlalchemy import text
from models.virtual_host import VirtualHost
from models.base import db
import tempfile

class BackupService:
    """Service สำหรับจัดการ backup ของระบบ"""
    
    def __init__(self):
        self.is_windows = platform.system() == 'Windows'
        self.backup_base_dir = '/var/backups/web-control-panel'
        self.max_backups = 30  # เก็บ backup สูงสุด 30 วัน
        
        if self.is_windows:
            self.backup_base_dir = os.path.join(os.environ.get('TEMP', 'C:\\temp'), 'backups')
        
        # สร้าง backup directories
        self.backup_dirs = {
            'database': os.path.join(self.backup_base_dir, 'database'),
            'configs': os.path.join(self.backup_base_dir, 'configs'),
            'virtual_hosts': os.path.join(self.backup_base_dir, 'virtual_hosts'),
            'ssl_certs': os.path.join(self.backup_base_dir, 'ssl_certs'),
            'dns_zones': os.path.join(self.backup_base_dir, 'dns_zones'),
            'email_data': os.path.join(self.backup_base_dir, 'email_data')
        }
        
        # สร้าง directories
        for backup_dir in self.backup_dirs.values():
            os.makedirs(backup_dir, exist_ok=True)
    
    def create_full_backup(self, user_id: Optional[int] = None) -> Dict:
        """สร้าง backup แบบเต็มระบบ"""
        backup_id = datetime.now().strftime('%Y%m%d_%H%M%S')
        results = {
            'backup_id': backup_id,
            'timestamp': datetime.now().isoformat(),
            'components': {},
            'total_size': 0,
            'errors': []
        }
        
        try:
            # 1. Backup Database
            db_result = self.backup_database(backup_id)
            results['components']['database'] = db_result
            if db_result['success']:
                results['total_size'] += db_result.get('size', 0)
            else:
                results['errors'].extend(db_result.get('errors', []))
            
            # 2. Backup Configuration Files
            config_result = self.backup_configurations(backup_id)
            results['components']['configurations'] = config_result
            if config_result['success']:
                results['total_size'] += config_result.get('size', 0)
            else:
                results['errors'].extend(config_result.get('errors', []))
            
            # 3. Backup Virtual Hosts Data
            vh_result = self.backup_virtual_hosts_data(backup_id)
            results['components']['virtual_hosts'] = vh_result
            if vh_result['success']:
                results['total_size'] += vh_result.get('size', 0)
            else:
                results['errors'].extend(vh_result.get('errors', []))
            
            # 4. Backup SSL Certificates
            ssl_result = self.backup_ssl_certificates(backup_id)
            results['components']['ssl_certificates'] = ssl_result
            if ssl_result['success']:
                results['total_size'] += ssl_result.get('size', 0)
            else:
                results['errors'].extend(ssl_result.get('errors', []))
            
            # 5. Backup DNS Zones
            dns_result = self.backup_dns_zones(backup_id)
            results['components']['dns_zones'] = dns_result
            if dns_result['success']:
                results['total_size'] += dns_result.get('size', 0)
            else:
                results['errors'].extend(dns_result.get('errors', []))
            
            # สร้าง manifest file
            manifest = {
                'backup_id': backup_id,
                'created_at': results['timestamp'],
                'components': results['components'],
                'total_size': results['total_size'],
                'version': '1.0'
            }
            
            manifest_path = os.path.join(self.backup_base_dir, f'manifest_{backup_id}.json')
            with open(manifest_path, 'w') as f:
                json.dump(manifest, f, indent=2)
            

            
            # Clean up old backups
            self.cleanup_old_backups()
            
        except Exception as e:
            results['errors'].append(f'Full backup failed: {str(e)}')
        
        return results
    
    def backup_database(self, backup_id: str) -> Dict:
        """Backup ฐานข้อมูล MySQL"""
        try:
            backup_file = os.path.join(self.backup_dirs['database'], f'database_{backup_id}.sql')
            
            if not self.is_windows:
                # ใช้ mysqldump สำหรับ backup
                cmd = [
                    'mysqldump',
                    '--single-transaction',
                    '--routines',
                    '--triggers',
                    '--all-databases',
                    '--result-file', backup_file
                ]
                
                # เพิ่ม credentials ถ้ามี
                mysql_user = os.environ.get('MYSQL_USER', 'root')
                mysql_password = os.environ.get('MYSQL_PASSWORD', '')
                
                if mysql_user:
                    cmd.extend(['-u', mysql_user])
                if mysql_password:
                    cmd.extend([f'-p{mysql_password}'])
                
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=3600)
                
                if result.returncode == 0:
                    # Compress backup file
                    compressed_file = f"{backup_file}.gz"
                    subprocess.run(['gzip', backup_file], check=True)
                    
                    size = os.path.getsize(compressed_file)
                    return {
                        'success': True,
                        'backup_file': compressed_file,
                        'size': size,
                        'message': 'Database backup completed successfully'
                    }
                else:
                    return {
                        'success': False,
                        'errors': [f'mysqldump failed: {result.stderr}'],
                        'message': 'Database backup failed'
                    }
            else:
                # Windows simulation
                with open(backup_file, 'w') as f:
                    f.write(f"-- Simulated database backup\n-- Created: {datetime.now()}\n")
                return {
                    'success': True,
                    'backup_file': backup_file,
                    'size': os.path.getsize(backup_file),
                    'message': 'Database backup simulated (Windows)'
                }
                
        except Exception as e:
            return {
                'success': False,
                'errors': [str(e)],
                'message': 'Database backup failed'
            }
    
    def backup_configurations(self, backup_id: str) -> Dict:
        """Backup configuration files"""
        try:
            backup_file = os.path.join(self.backup_dirs['configs'], f'configs_{backup_id}.tar.gz')
            
            config_paths = [
                '/etc/nginx',
                '/etc/bind',
                '/etc/postfix',
                '/etc/dovecot',
                '/etc/letsencrypt',
                '/etc/mysql/mysql.conf.d'
            ]
            
            if self.is_windows:
                # Windows simulation
                with tarfile.open(backup_file, 'w:gz') as tar:
                    # สร้าง dummy config files
                    for i, path in enumerate(config_paths):
                        info = tarfile.TarInfo(name=f'config_{i}.conf')
                        info.size = 100
                        tar.addfile(info, fileobj=None)
                
                return {
                    'success': True,
                    'backup_file': backup_file,
                    'size': os.path.getsize(backup_file),
                    'paths_backed_up': config_paths,
                    'message': 'Configuration backup simulated (Windows)'
                }
            
            # Linux - backup real config files
            existing_paths = [path for path in config_paths if os.path.exists(path)]
            
            if not existing_paths:
                return {
                    'success': False,
                    'errors': ['No configuration directories found'],
                    'message': 'Configuration backup failed'
                }
            
            with tarfile.open(backup_file, 'w:gz') as tar:
                for config_path in existing_paths:
                    try:
                        tar.add(config_path, arcname=os.path.basename(config_path))
                    except Exception as e:
                        print(f"Warning: Could not backup {config_path}: {e}")
            
            size = os.path.getsize(backup_file)
            return {
                'success': True,
                'backup_file': backup_file,
                'size': size,
                'paths_backed_up': existing_paths,
                'message': f'Configuration backup completed. {len(existing_paths)} directories backed up.'
            }
            
        except Exception as e:
            return {
                'success': False,
                'errors': [str(e)],
                'message': 'Configuration backup failed'
            }
    
    def backup_virtual_hosts_data(self, backup_id: str) -> Dict:
        """Backup virtual hosts data"""
        try:
            backup_file = os.path.join(self.backup_dirs['virtual_hosts'], f'vhosts_{backup_id}.tar.gz')
            
            virtual_hosts = VirtualHost.query.filter_by(status='active').all()
            backed_up_hosts = []
            total_size = 0
            
            with tarfile.open(backup_file, 'w:gz') as tar:
                for vh in virtual_hosts:
                    try:
                        if not self.is_windows and os.path.exists(vh.document_root):
                            # Backup document root
                            tar.add(vh.document_root, arcname=f"{vh.domain}/public_html")
                            
                            # Backup user's home directory (excluding large directories)
                            home_dir = f"/home/{vh.linux_username}"
                            if os.path.exists(home_dir):
                                for item in ['Maildir', 'logs', '.bashrc', '.profile']:
                                    item_path = os.path.join(home_dir, item)
                                    if os.path.exists(item_path):
                                        tar.add(item_path, arcname=f"{vh.domain}/home/{item}")
                            
                            backed_up_hosts.append(vh.domain)
                        elif self.is_windows:
                            # Windows simulation
                            info = tarfile.TarInfo(name=f"{vh.domain}/public_html/index.html")
                            info.size = 1024
                            tar.addfile(info, fileobj=None)
                            backed_up_hosts.append(vh.domain)
                            
                    except Exception as e:
                        print(f"Warning: Could not backup {vh.domain}: {e}")
            
            size = os.path.getsize(backup_file)
            return {
                'success': True,
                'backup_file': backup_file,
                'size': size,
                'virtual_hosts_backed_up': backed_up_hosts,
                'total_hosts': len(backed_up_hosts),
                'message': f'Virtual hosts backup completed. {len(backed_up_hosts)} hosts backed up.'
            }
            
        except Exception as e:
            return {
                'success': False,
                'errors': [str(e)],
                'message': 'Virtual hosts backup failed'
            }
    
    def backup_ssl_certificates(self, backup_id: str) -> Dict:
        """Backup SSL certificates"""
        try:
            backup_file = os.path.join(self.backup_dirs['ssl_certs'], f'ssl_{backup_id}.tar.gz')
            
            ssl_dir = '/etc/letsencrypt'
            
            if self.is_windows or not os.path.exists(ssl_dir):
                # Windows simulation หรือไม่มี SSL directory
                with tarfile.open(backup_file, 'w:gz') as tar:
                    info = tarfile.TarInfo(name='dummy_cert.pem')
                    info.size = 2048
                    tar.addfile(info, fileobj=None)
                
                return {
                    'success': True,
                    'backup_file': backup_file,
                    'size': os.path.getsize(backup_file),
                    'message': 'SSL certificates backup simulated'
                }
            
            # Linux - backup real SSL certificates
            with tarfile.open(backup_file, 'w:gz') as tar:
                tar.add(ssl_dir, arcname='letsencrypt')
            
            size = os.path.getsize(backup_file)
            return {
                'success': True,
                'backup_file': backup_file,
                'size': size,
                'message': 'SSL certificates backup completed'
            }
            
        except Exception as e:
            return {
                'success': False,
                'errors': [str(e)],
                'message': 'SSL certificates backup failed'
            }
    
    def backup_dns_zones(self, backup_id: str) -> Dict:
        """Backup DNS zones"""
        try:
            backup_file = os.path.join(self.backup_dirs['dns_zones'], f'dns_{backup_id}.tar.gz')
            
            bind_zones_dir = '/etc/bind/zones'
            
            if self.is_windows or not os.path.exists(bind_zones_dir):
                # Windows simulation
                with tarfile.open(backup_file, 'w:gz') as tar:
                    info = tarfile.TarInfo(name='db.example.com')
                    info.size = 512
                    tar.addfile(info, fileobj=None)
                
                return {
                    'success': True,
                    'backup_file': backup_file,
                    'size': os.path.getsize(backup_file),
                    'message': 'DNS zones backup simulated'
                }
            
            # Linux - backup real DNS zones
            with tarfile.open(backup_file, 'w:gz') as tar:
                tar.add(bind_zones_dir, arcname='zones')
            
            size = os.path.getsize(backup_file)
            return {
                'success': True,
                'backup_file': backup_file,
                'size': size,
                'message': 'DNS zones backup completed'
            }
            
        except Exception as e:
            return {
                'success': False,
                'errors': [str(e)],
                'message': 'DNS zones backup failed'
            }
    
    def list_backups(self) -> List[Dict]:
        """แสดงรายการ backups ที่มีอยู่"""
        backups = []
        
        try:
            manifest_files = [f for f in os.listdir(self.backup_base_dir) 
                            if f.startswith('manifest_') and f.endswith('.json')]
            
            for manifest_file in manifest_files:
                try:
                    manifest_path = os.path.join(self.backup_base_dir, manifest_file)
                    with open(manifest_path, 'r') as f:
                        manifest = json.load(f)
                    
                    # ตรวจสอบว่าไฟล์ backup ยังมีอยู่หรือไม่
                    files_exist = 0
                    total_files = 0
                    
                    for component, data in manifest.get('components', {}).items():
                        if data.get('success') and 'backup_file' in data:
                            total_files += 1
                            if os.path.exists(data['backup_file']):
                                files_exist += 1
                    
                    manifest['files_integrity'] = {
                        'files_exist': files_exist,
                        'total_files': total_files,
                        'complete': files_exist == total_files
                    }
                    
                    backups.append(manifest)
                    
                except Exception as e:
                    print(f"Error reading manifest {manifest_file}: {e}")
            
            # เรียงตามวันที่ใหม่ไปเก่า
            backups.sort(key=lambda x: x.get('created_at', ''), reverse=True)
            
        except Exception as e:
            print(f"Error listing backups: {e}")
        
        return backups
    
    def delete_backup(self, backup_id: str) -> Dict:
        """ลบ backup"""
        try:
            manifest_file = os.path.join(self.backup_base_dir, f'manifest_{backup_id}.json')
            
            if not os.path.exists(manifest_file):
                return {
                    'success': False,
                    'error': 'Backup not found'
                }
            
            # อ่าน manifest เพื่อหาไฟล์ที่ต้องลบ
            with open(manifest_file, 'r') as f:
                manifest = json.load(f)
            
            files_deleted = []
            
            # ลบไฟล์ backup แต่ละส่วน
            for component, data in manifest.get('components', {}).items():
                if data.get('success') and 'backup_file' in data:
                    backup_file = data['backup_file']
                    if os.path.exists(backup_file):
                        os.remove(backup_file)
                        files_deleted.append(backup_file)
            
            # ลบ manifest file
            os.remove(manifest_file)
            files_deleted.append(manifest_file)
            
            return {
                'success': True,
                'backup_id': backup_id,
                'files_deleted': files_deleted,
                'message': f'Backup {backup_id} deleted successfully'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def cleanup_old_backups(self) -> Dict:
        """ลบ backups เก่าที่เกิน max_backups"""
        try:
            backups = self.list_backups()
            
            if len(backups) <= self.max_backups:
                return {
                    'success': True,
                    'message': f'No cleanup needed. Current backups: {len(backups)}, Max: {self.max_backups}'
                }
            
            # ลบ backups เก่าที่เกิน limit
            old_backups = backups[self.max_backups:]
            deleted_backups = []
            
            for backup in old_backups:
                result = self.delete_backup(backup['backup_id'])
                if result['success']:
                    deleted_backups.append(backup['backup_id'])
            
            return {
                'success': True,
                'deleted_backups': deleted_backups,
                'remaining_backups': len(backups) - len(deleted_backups),
                'message': f'Cleaned up {len(deleted_backups)} old backups'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _format_size(self, size_bytes: int) -> str:
        """แปลงขนาดไฟล์เป็น human readable format"""
        if size_bytes == 0:
            return "0 B"
        
        for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
            if size_bytes < 1024.0:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024.0
        
        return f"{size_bytes:.1f} PB"
    

    
    def restore_backup(self, backup_id: str, components: Optional[List[str]] = None) -> Dict:
        """Restore backup (ใช้ด้วยความระมัดระวัง)"""
        return {
            'success': False,
            'error': 'Restore functionality not implemented yet. Please restore manually.'
        } 
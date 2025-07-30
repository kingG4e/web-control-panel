import os
import subprocess
import platform
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from sqlalchemy import text
from models.virtual_host import VirtualHost
from models.dns import DNSZone, DNSRecord
from models.email import EmailDomain, EmailAccount
from models.ssl_certificate import SSLCertificate

from models.database import Database, DatabaseUser
from models.base import db

class SyncCheckService:
    """Service สำหรับตรวจสอบความ consistent ระหว่าง database และไฟล์ระบบ"""
    
    def __init__(self):
        self.is_windows = platform.system() == 'Windows'
        self.nginx_sites_available = '/etc/nginx/sites-available'
        self.nginx_sites_enabled = '/etc/nginx/sites-enabled'
        self.bind_zones_dir = '/etc/bind/zones'
        self.letsencrypt_live = '/etc/letsencrypt/live'
        self.postfix_config = '/etc/postfix'
        self.dovecot_config = '/etc/dovecot'
        
    def run_full_sync_check(self, user_id: Optional[int] = None) -> Dict:
        """รัน sync check แบบเต็มรูปแบบ"""
        results = {
            'timestamp': datetime.now().isoformat(),
            'summary': {
                'total_issues': 0,
                'critical_issues': 0,
                'warning_issues': 0,
                'checks_performed': 0
            },
            'virtual_hosts': self.check_virtual_hosts_sync(),
            'dns_zones': self.check_dns_zones_sync(),
            'email_domains': self.check_email_domains_sync(),
            'ssl_certificates': self.check_ssl_certificates_sync(),

            'databases': self.check_databases_sync(),
            'system_health': self.check_system_health()
        }
        
        # คำนวณสรุป
        for section in ['virtual_hosts', 'dns_zones', 'email_domains', 'ssl_certificates', 'databases', 'system_health']:
            section_data = results[section]
            results['summary']['checks_performed'] += len(section_data.get('items', []))
            results['summary']['total_issues'] += len(section_data.get('issues', []))
            results['summary']['critical_issues'] += len([i for i in section_data.get('issues', []) if i.get('severity') == 'critical'])
            results['summary']['warning_issues'] += len([i for i in section_data.get('issues', []) if i.get('severity') == 'warning'])
        

            
        return results
    
    def check_virtual_hosts_sync(self) -> Dict:
        """ตรวจสอบ virtual hosts ระหว่าง database และ Nginx config"""
        issues = []
        items_checked = []
        
        try:
            virtual_hosts = VirtualHost.query.filter_by(status='active').all()
            
            for vh in virtual_hosts:
                item = {
                    'domain': vh.domain,
                    'database_exists': True,
                    'nginx_config_exists': False,
                    'nginx_enabled': False,
                    'document_root_exists': False,
                    'linux_user_exists': False
                }
                
                # ตรวจสอบ Nginx config
                nginx_config_path = os.path.join(self.nginx_sites_available, f"{vh.domain}.conf")
                nginx_enabled_path = os.path.join(self.nginx_sites_enabled, f"{vh.domain}.conf")
                
                if not self.is_windows:
                    item['nginx_config_exists'] = os.path.exists(nginx_config_path)
                    item['nginx_enabled'] = os.path.exists(nginx_enabled_path)
                    item['document_root_exists'] = os.path.exists(vh.document_root)
                    
                    # ตรวจสอบ Linux user
                    try:
                        import pwd
                        pwd.getpwnam(vh.linux_username)
                        item['linux_user_exists'] = True
                    except KeyError:
                        item['linux_user_exists'] = False
                else:
                    # Windows simulation mode
                    item['nginx_config_exists'] = True
                    item['nginx_enabled'] = True
                    item['document_root_exists'] = True
                    item['linux_user_exists'] = True
                
                # ตรวจหาปัญหา
                if not item['nginx_config_exists']:
                    issues.append({
                        'domain': vh.domain,
                        'type': 'missing_nginx_config',
                        'severity': 'critical',
                        'message': f'Nginx config file missing for {vh.domain}',
                        'suggestion': 'Recreate Nginx configuration'
                    })
                
                if not item['nginx_enabled']:
                    issues.append({
                        'domain': vh.domain,
                        'type': 'nginx_not_enabled',
                        'severity': 'warning',
                        'message': f'Nginx site not enabled for {vh.domain}',
                        'suggestion': 'Enable Nginx site'
                    })
                
                if not item['document_root_exists']:
                    issues.append({
                        'domain': vh.domain,
                        'type': 'missing_document_root',
                        'severity': 'critical',
                        'message': f'Document root directory missing for {vh.domain}',
                        'suggestion': 'Recreate document root directory'
                    })
                
                if not item['linux_user_exists']:
                    issues.append({
                        'domain': vh.domain,
                        'type': 'missing_linux_user',
                        'severity': 'critical',
                        'message': f'Linux user {vh.linux_username} does not exist',
                        'suggestion': 'Recreate Linux user account'
                    })
                
                items_checked.append(item)
                
        except Exception as e:
            issues.append({
                'domain': 'system',
                'type': 'check_error',
                'severity': 'critical',
                'message': f'Error checking virtual hosts: {str(e)}',
                'suggestion': 'Check system configuration'
            })
        
        return {
            'items': items_checked,
            'issues': issues,
            'total_checked': len(items_checked),
            'issues_count': len(issues)
        }
    
    def check_dns_zones_sync(self) -> Dict:
        """ตรวจสอบ DNS zones ระหว่าง database และ BIND files"""
        issues = []
        items_checked = []
        
        try:
            dns_zones = DNSZone.query.filter_by(status='active').all()
            
            for zone in dns_zones:
                item = {
                    'domain': zone.domain_name,
                    'database_exists': True,
                    'bind_file_exists': False,
                    'records_count_db': len(zone.records),
                    'records_count_file': 0
                }
                
                # ตรวจสอบ BIND zone file
                bind_file_path = os.path.join(self.bind_zones_dir, f"db.{zone.domain_name}")
                
                if not self.is_windows:
                    item['bind_file_exists'] = os.path.exists(bind_file_path)
                    
                    # นับจำนวน records ในไฟล์
                    if item['bind_file_exists']:
                        try:
                            with open(bind_file_path, 'r') as f:
                                content = f.read()
                                # นับ lines ที่มี IN record (ไม่นับ comment และ SOA)
                                item['records_count_file'] = len([line for line in content.split('\n') 
                                                                if 'IN' in line and not line.strip().startswith(';')])
                        except Exception:
                            item['records_count_file'] = 0
                else:
                    # Windows simulation
                    item['bind_file_exists'] = True
                    item['records_count_file'] = item['records_count_db']
                
                # ตรวจหาปัญหา
                if not item['bind_file_exists']:
                    issues.append({
                        'domain': zone.domain_name,
                        'type': 'missing_bind_file',
                        'severity': 'warning',
                        'message': f'BIND zone file missing for {zone.domain_name}',
                        'suggestion': 'Recreate BIND zone file'
                    })
                
                if abs(item['records_count_db'] - item['records_count_file']) > 2:  # Allow some variance for SOA records
                    issues.append({
                        'domain': zone.domain_name,
                        'type': 'records_count_mismatch',
                        'severity': 'warning',
                        'message': f'DNS records count mismatch for {zone.domain_name}: DB={item["records_count_db"]}, File={item["records_count_file"]}',
                        'suggestion': 'Synchronize DNS records'
                    })
                
                items_checked.append(item)
                
        except Exception as e:
            issues.append({
                'domain': 'system',
                'type': 'check_error',
                'severity': 'warning',
                'message': f'Error checking DNS zones: {str(e)}',
                'suggestion': 'Check BIND configuration'
            })
        
        return {
            'items': items_checked,
            'issues': issues,
            'total_checked': len(items_checked),
            'issues_count': len(issues)
        }
    
    def check_email_domains_sync(self) -> Dict:
        """ตรวจสอบ email domains ระหว่าง database และ Postfix/Dovecot config"""
        issues = []
        items_checked = []
        
        try:
            email_domains = EmailDomain.query.filter_by(status='active').all()
            
            for domain in email_domains:
                item = {
                    'domain': domain.domain,
                    'database_exists': True,
                    'postfix_domain_exists': False,
                    'accounts_count_db': len(domain.accounts),
                    'maildir_exists': False
                }
                
                # ตรวจสอบ Postfix virtual domains
                if not self.is_windows:
                    virtual_domains_file = os.path.join(self.postfix_config, 'virtual_domains')
                    if os.path.exists(virtual_domains_file):
                        try:
                            with open(virtual_domains_file, 'r') as f:
                                domains_content = f.read()
                                item['postfix_domain_exists'] = domain.domain in domains_content
                        except Exception:
                            item['postfix_domain_exists'] = False
                    
                    # ตรวจสอบ Maildir สำหรับ virtual host ที่เชื่อมโยง
                    if domain.virtual_host_id:
                        vh = VirtualHost.query.get(domain.virtual_host_id)
                        if vh:
                            maildir_path = f"/home/{vh.linux_username}/Maildir"
                            item['maildir_exists'] = os.path.exists(maildir_path)
                else:
                    # Windows simulation
                    item['postfix_domain_exists'] = True
                    item['maildir_exists'] = True
                
                # ตรวจหาปัญหา
                if not item['postfix_domain_exists']:
                    issues.append({
                        'domain': domain.domain,
                        'type': 'missing_postfix_domain',
                        'severity': 'warning',
                        'message': f'Email domain {domain.domain} not found in Postfix configuration',
                        'suggestion': 'Add domain to Postfix virtual_domains'
                    })
                
                if domain.virtual_host_id and not item['maildir_exists']:
                    issues.append({
                        'domain': domain.domain,
                        'type': 'missing_maildir',
                        'severity': 'warning',
                        'message': f'Maildir missing for email domain {domain.domain}',
                        'suggestion': 'Create Maildir structure'
                    })
                
                items_checked.append(item)
                
        except Exception as e:
            issues.append({
                'domain': 'system',
                'type': 'check_error',
                'severity': 'warning',
                'message': f'Error checking email domains: {str(e)}',
                'suggestion': 'Check email system configuration'
            })
        
        return {
            'items': items_checked,
            'issues': issues,
            'total_checked': len(items_checked),
            'issues_count': len(issues)
        }
    
    def check_ssl_certificates_sync(self) -> Dict:
        """ตรวจสอบ SSL certificates ระหว่าง database และ Let's Encrypt files"""
        issues = []
        items_checked = []
        
        try:
            ssl_certs = SSLCertificate.query.filter_by(status='active').all()
            
            for cert in ssl_certs:
                item = {
                    'domain': cert.domain,
                    'database_exists': True,
                    'certificate_file_exists': False,
                    'private_key_exists': False,
                    'expires_soon': False,
                    'days_until_expiry': None
                }
                
                if not self.is_windows:
                    # ตรวจสอบไฟล์ certificate
                    if cert.certificate_path:
                        item['certificate_file_exists'] = os.path.exists(cert.certificate_path)
                    
                    if cert.private_key_path:
                        item['private_key_exists'] = os.path.exists(cert.private_key_path)
                    
                    # ตรวจสอบวันหมดอายุ
                    if cert.valid_until:
                        days_left = (cert.valid_until - datetime.now()).days
                        item['days_until_expiry'] = days_left
                        item['expires_soon'] = days_left < 30
                else:
                    # Windows simulation
                    item['certificate_file_exists'] = True
                    item['private_key_exists'] = True
                    item['expires_soon'] = False
                    item['days_until_expiry'] = 60
                
                # ตรวจหาปัญหา
                if not item['certificate_file_exists']:
                    issues.append({
                        'domain': cert.domain,
                        'type': 'missing_certificate_file',
                        'severity': 'critical',
                        'message': f'SSL certificate file missing for {cert.domain}',
                        'suggestion': 'Reissue SSL certificate'
                    })
                
                if not item['private_key_exists']:
                    issues.append({
                        'domain': cert.domain,
                        'type': 'missing_private_key',
                        'severity': 'critical',
                        'message': f'SSL private key missing for {cert.domain}',
                        'suggestion': 'Reissue SSL certificate'
                    })
                
                if item['expires_soon']:
                    issues.append({
                        'domain': cert.domain,
                        'type': 'certificate_expires_soon',
                        'severity': 'warning',
                        'message': f'SSL certificate for {cert.domain} expires in {item["days_until_expiry"]} days',
                        'suggestion': 'Renew SSL certificate'
                    })
                
                items_checked.append(item)
                
        except Exception as e:
            issues.append({
                'domain': 'system',
                'type': 'check_error',
                'severity': 'warning',
                'message': f'Error checking SSL certificates: {str(e)}',
                'suggestion': 'Check SSL certificate system'
            })
        
        return {
            'items': items_checked,
            'issues': issues,
            'total_checked': len(items_checked),
            'issues_count': len(issues)
        }
    

    
    def check_databases_sync(self) -> Dict:
        """ตรวจสอบ databases ระหว่าง database metadata และ MySQL server"""
        issues = []
        items_checked = []
        
        try:
            databases = Database.query.filter_by(status='active').all()
            
            for db_record in databases:
                item = {
                    'database_name': db_record.name,
                    'metadata_exists': True,
                    'mysql_database_exists': False,
                    'users_count_metadata': len(db_record.users),
                    'mysql_users_exist': False
                }
                
                if not self.is_windows:
                    try:
                        # ตรวจสอบว่า database มีอยู่ใน MySQL จริงหรือไม่
                        result = db.session.execute(text("SHOW DATABASES LIKE :db_name"), {'db_name': db_record.name})
                        item['mysql_database_exists'] = result.fetchone() is not None
                        
                        # ตรวจสอบ users
                        if db_record.users:
                            for db_user in db_record.users:
                                user_result = db.session.execute(
                                    text("SELECT User FROM mysql.user WHERE User = :username"), 
                                    {'username': db_user.username}
                                )
                                if user_result.fetchone():
                                    item['mysql_users_exist'] = True
                                    break
                    except Exception as db_error:
                        # MySQL connection error หรือปัญหาอื่น
                        issues.append({
                            'database_name': db_record.name,
                            'type': 'mysql_connection_error',
                            'severity': 'warning',
                            'message': f'Cannot connect to MySQL to check database {db_record.name}: {str(db_error)}',
                            'suggestion': 'Check MySQL service status'
                        })
                else:
                    # Windows simulation
                    item['mysql_database_exists'] = True
                    item['mysql_users_exist'] = True
                
                # ตรวจหาปัญหา
                if not item['mysql_database_exists']:
                    issues.append({
                        'database_name': db_record.name,
                        'type': 'missing_mysql_database',
                        'severity': 'critical',
                        'message': f'MySQL database {db_record.name} does not exist',
                        'suggestion': 'Recreate MySQL database'
                    })
                
                if item['users_count_metadata'] > 0 and not item['mysql_users_exist']:
                    issues.append({
                        'database_name': db_record.name,
                        'type': 'missing_mysql_users',
                        'severity': 'warning',
                        'message': f'MySQL users for database {db_record.name} do not exist',
                        'suggestion': 'Recreate MySQL database users'
                    })
                
                items_checked.append(item)
                
        except Exception as e:
            issues.append({
                'database_name': 'system',
                'type': 'check_error',
                'severity': 'warning',
                'message': f'Error checking databases: {str(e)}',
                'suggestion': 'Check database system configuration'
            })
        
        return {
            'items': items_checked,
            'issues': issues,
            'total_checked': len(items_checked),
            'issues_count': len(issues)
        }
    
    def check_system_health(self) -> Dict:
        """ตรวจสอบสุขภาพระบบโดยรวม"""
        issues = []
        items_checked = []
        
        services_to_check = ['nginx', 'mysql', 'postfix', 'dovecot', 'bind9']
        
        for service in services_to_check:
            item = {
                'service': service,
                'status': 'unknown',
                'enabled': False,
                'memory_usage': None,
                'config_syntax_ok': None
            }
            
            if not self.is_windows:
                try:
                    # ตรวจสอบสถานะ service
                    result = subprocess.run(['systemctl', 'is-active', service], 
                                          capture_output=True, text=True, timeout=5)
                    item['status'] = result.stdout.strip()
                    
                    # ตรวจสอบว่า enable หรือไม่
                    result = subprocess.run(['systemctl', 'is-enabled', service], 
                                          capture_output=True, text=True, timeout=5)
                    item['enabled'] = result.stdout.strip() == 'enabled'
                    
                    # ตรวจสอบ syntax สำหรับบาง services
                    if service == 'nginx':
                        result = subprocess.run(['nginx', '-t'], capture_output=True, text=True, timeout=10)
                        item['config_syntax_ok'] = result.returncode == 0
                    elif service == 'bind9':
                        result = subprocess.run(['named-checkconf'], capture_output=True, text=True, timeout=10)
                        item['config_syntax_ok'] = result.returncode == 0
                    
                except subprocess.TimeoutExpired:
                    item['status'] = 'timeout'
                except Exception as e:
                    item['status'] = f'error: {str(e)}'
            else:
                # Windows simulation
                item['status'] = 'active'
                item['enabled'] = True
                item['config_syntax_ok'] = True
            
            # ตรวจหาปัญหา
            if item['status'] not in ['active', 'running']:
                issues.append({
                    'service': service,
                    'type': 'service_not_active',
                    'severity': 'critical' if service in ['nginx', 'mysql'] else 'warning',
                    'message': f'Service {service} is not active (status: {item["status"]})',
                    'suggestion': f'Restart {service} service'
                })
            
            if not item['enabled']:
                issues.append({
                    'service': service,
                    'type': 'service_not_enabled',
                    'severity': 'warning',
                    'message': f'Service {service} is not enabled for auto-start',
                    'suggestion': f'Enable {service} service'
                })
            
            if item['config_syntax_ok'] is False:
                issues.append({
                    'service': service,
                    'type': 'config_syntax_error',
                    'severity': 'critical',
                    'message': f'Configuration syntax error in {service}',
                    'suggestion': f'Fix {service} configuration syntax'
                })
            
            items_checked.append(item)
        
        return {
            'items': items_checked,
            'issues': issues,
            'total_checked': len(items_checked),
            'issues_count': len(issues)
        }
    

    
    def auto_fix_issue(self, issue_type: str, domain: str, **kwargs) -> Dict:
        """พยายามแก้ไขปัญหาอัตโนมัติ"""
        try:
            if issue_type == 'missing_document_root':
                # สร้าง document root directory
                vh = VirtualHost.query.filter_by(domain=domain).first()
                if vh and not self.is_windows:
                    os.makedirs(vh.document_root, exist_ok=True)
                    os.chmod(vh.document_root, 0o755)
                    return {'success': True, 'message': f'Created document root for {domain}'}
            
            elif issue_type == 'nginx_not_enabled':
                # Enable nginx site
                if not self.is_windows:
                    source = f"/etc/nginx/sites-available/{domain}.conf"
                    target = f"/etc/nginx/sites-enabled/{domain}.conf"
                    if os.path.exists(source) and not os.path.exists(target):
                        os.symlink(source, target)
                        subprocess.run(['systemctl', 'reload', 'nginx'], check=True)
                        return {'success': True, 'message': f'Enabled nginx site for {domain}'}
            
            elif issue_type == 'missing_maildir':
                # สร้าง Maildir structure
                vh = VirtualHost.query.filter_by(domain=domain).first()
                if vh and not self.is_windows:
                    maildir_path = f"/home/{vh.linux_username}/Maildir"
                    for subdir in ['cur', 'new', 'tmp']:
                        os.makedirs(f"{maildir_path}/{subdir}", exist_ok=True)
                    return {'success': True, 'message': f'Created Maildir for {domain}'}
            
            return {'success': False, 'message': f'Auto-fix not available for {issue_type}'}
            
        except Exception as e:
            return {'success': False, 'message': f'Auto-fix failed: {str(e)}'} 
from flask import Blueprint, jsonify, request, current_app
from functools import wraps
from utils.auth import token_required, admin_required
from utils.rate_limiter import rate_limit, check_rate_limit_status, reset_rate_limit
from services.sync_check_service import SyncCheckService
from services.postfix_sql_maps_service import PostfixSQLMapsService, MySQLConnectionConfig
from services.backup_service import BackupService
from models.virtual_host import VirtualHost
from models.database import Database
from models.email import EmailAccount
from models.dns import DNSRecord
from models.ssl_certificate import SSLCertificate
import platform
import time
import subprocess
import os
from datetime import datetime, timedelta

# Import psutil with better error handling
try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError as e:
    PSUTIL_AVAILABLE = False
    print(f"Warning: psutil module not available: {e}")  # Keep - important warning

system_bp = Blueprint('system', __name__)
sync_check_service = SyncCheckService()
backup_service = BackupService()
postfix_maps_service = PostfixSQLMapsService()

# Simple in-memory cache
_cache = {}
_cache_timeout = {}

def cache_result(timeout_seconds=60):
    """Decorator to cache function results"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Create cache key from function name and arguments
            cache_key = f"{func.__name__}:{str(args)}:{str(sorted(kwargs.items()))}"
            current_time = time.time()
            
            # Check if we have cached result and it's still valid
            if (cache_key in _cache and 
                cache_key in _cache_timeout and 
                current_time < _cache_timeout[cache_key]):
                return _cache[cache_key]
            
            # Execute function and cache result
            result = func(*args, **kwargs)
            _cache[cache_key] = result
            _cache_timeout[cache_key] = current_time + timeout_seconds
            
            return result
        return wrapper
    return decorator

@cache_result(timeout_seconds=30)
def get_system_stats():
    """Get system statistics with caching"""
    try:
        # CPU usage
        cpu_percent = psutil.cpu_percent(interval=1)
        
        # Memory usage
        memory = psutil.virtual_memory()
        memory_percent = memory.percent
        
        # Disk usage
        disk = psutil.disk_usage('/')
        disk_percent = (disk.used / disk.total) * 100
        
        # System uptime
        boot_time = psutil.boot_time()
        uptime = time.time() - boot_time
        
        # Load average
        load_avg = os.getloadavg()
        
        # Network stats
        net_io = psutil.net_io_counters()
        
        return {
            'cpu': round(cpu_percent, 1),
            'memory': round(memory_percent, 1),
            'disk': round(disk_percent, 1),
            'uptime': int(uptime),
            'loadAverage': list(load_avg),
            'networkStats': {
                'upload': net_io.bytes_sent,
                'download': net_io.bytes_recv
            }
        }
    except Exception as e:
        print(f"Error getting system stats: {e}")
        return {
            'cpu': 0,
            'memory': 0,
            'disk': 0,
            'uptime': 0,
            'loadAverage': [0, 0, 0],
            'networkStats': {'upload': 0, 'download': 0}
        }

@cache_result(timeout_seconds=60)
def get_service_status():
    """Get service status with caching"""
    services = [
        {'name': 'Nginx', 'service': 'nginx'},
        {'name': 'MySQL', 'service': 'mysql'},
        {'name': 'BIND', 'service': 'bind9'},
        {'name': 'Postfix', 'service': 'postfix'},
        {'name': 'Dovecot', 'service': 'dovecot'},
        {'name': 'SSH', 'service': 'ssh'},
    ]
    
    result = []
    for service in services:
        try:
            # Check if service is active
            status_result = subprocess.run(
                ['systemctl', 'is-active', service['service']],
                capture_output=True,
                text=True,
                timeout=5
            )
            
            is_active = status_result.stdout.strip() == 'active'
            
            # Get service uptime if active
            uptime = 0
            if is_active:
                try:
                    uptime_result = subprocess.run(
                        ['systemctl', 'show', service['service'], '--property=ActiveEnterTimestamp'],
                        capture_output=True,
                        text=True,
                        timeout=5
                    )
                    if uptime_result.returncode == 0:
                        timestamp_line = uptime_result.stdout.strip()
                        if '=' in timestamp_line:
                            timestamp_str = timestamp_line.split('=', 1)[1]
                            if timestamp_str and timestamp_str != 'n/a':
                                start_time = datetime.fromisoformat(timestamp_str.replace(' ', 'T'))
                                uptime = int((datetime.now() - start_time).total_seconds())
                except Exception:
                    uptime = 0
            
            result.append({
                'name': service['name'],
                'status': 'running' if is_active else 'stopped',
                'uptime': uptime,
                'pid': None  # Could be enhanced to get actual PID
            })
            
        except subprocess.TimeoutExpired:
            result.append({
                'name': service['name'],
                'status': 'timeout',
                'uptime': 0,
                'pid': None
            })
        except Exception as e:
            print(f"Error checking service {service['name']}: {e}")
            result.append({
                'name': service['name'],
                'status': 'error',
                'uptime': 0,
                'pid': None
            })
    
    return result

@system_bp.route('/api/system/status')
def get_system_status():
    try:
        # Get system load
        load_avg = os.getloadavg() if hasattr(os, 'getloadavg') else [0, 0, 0]
        
        # Get memory usage
        memory = psutil.virtual_memory()
        
        # Get disk usage
        disk = psutil.disk_usage('/')
        
        # Get CPU usage
        cpu_percent = psutil.cpu_percent(interval=1)
        
        return jsonify({
            'success': True,
            'data': {
                'load_average': load_avg,
                'memory': {
                    'total': memory.total,
                    'used': memory.used,
                    'free': memory.free,
                    'percent': memory.percent
                },
                'disk': {
                    'total': disk.total,
                    'used': disk.used,
                    'free': disk.free,
                    'percent': (disk.used / disk.total) * 100
                },
                'cpu_percent': cpu_percent
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@system_bp.route('/api/system/postfix/sync', methods=['POST'])
@token_required
@admin_required
def postfix_sync(current_user):
    """Generate Postfix MySQL maps and reload Postfix (admin only).

    Optional JSON body overrides connection:
    { "host": "127.0.0.1", "user": "postfix", "password": "***", "database": "mail" }
    """
    try:
        payload = request.get_json(silent=True) or {}

        host = payload.get('host') or os.environ.get('MYSQL_HOST', '127.0.0.1')
        user = payload.get('user') or os.environ.get('MYSQL_POSTFIX_USER', 'mailadmin')
        password = payload.get('password') or os.environ.get('MYSQL_POSTFIX_PASSWORD', 'King_73260')
        database = payload.get('database') or os.environ.get('MYSQL_POSTFIX_DB', 'mail')

        conn = MySQLConnectionConfig(host=host, user=user, password=password, database=database)

        # Prefer minimal schema if explicitly requested via payload flags
        use_minimal = payload.get('use_minimal_schema') is True or os.environ.get('POSTFIX_MINIMAL_SCHEMA') == '1'
        users_table = payload.get('users_table')

        domains_path = postfix_maps_service.write_domain_map(conn, table='email_domain')
        if use_minimal:
            chosen_users_table = users_table or 'email_user'
            mailbox_path = postfix_maps_service.write_mailbox_map(conn, users_table=chosen_users_table, domains_table='email_domain')
            alias_path = postfix_maps_service.write_alias_map(conn, fwd_table='email_alias', domains_table='email_domain')
        else:
            mailbox_path = postfix_maps_service.write_mailbox_map(conn, users_table='email_account', domains_table='email_domain')
            alias_path = postfix_maps_service.write_alias_map(conn, fwd_table='email_forwarder', domains_table='email_domain')

        # Reload postfix; ignore errors in dev
        try:
            subprocess.run(['systemctl', 'reload', 'postfix'], check=True)
        except Exception:
            pass

        return jsonify({
            'success': True,
            'paths': {
                'domains': domains_path,
                'mailboxes': mailbox_path,
                'aliases': alias_path
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@system_bp.route('/api/dashboard/system-stats')
def get_dashboard_system_stats():
    """Get system statistics"""
    try:
        stats = get_system_stats()
        return jsonify({
            'success': True,
            'data': stats
        })
    except Exception as e:
        print(f"System stats error: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to get system statistics'
        }), 500

@system_bp.route('/api/dashboard/services')
def get_dashboard_services():
    """Get service status"""
    try:
        services = get_service_status()
        return jsonify({
            'success': True,
            'data': services
        })
    except Exception as e:
        print(f"Services error: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to get service status'
        }), 500

@system_bp.route('/api/dashboard/activities')
def get_dashboard_activities():
    """Get recent activities"""
    try:
        # This would typically come from a log or activity table
        # For now, return sample data
        activities = [
            {
                'id': 1,
                'type': 'info',
                'message': 'System started successfully',
                'timestamp': datetime.now().isoformat(),
                'user': 'System'
            }
        ]
        
        return jsonify({
            'success': True,
            'data': activities
        })
    except Exception as e:
        print(f"Activities error: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to get activities'
        }), 500

@system_bp.route('/api/dashboard/server-info')
def get_server_info():
    """Get server information"""
    try:
        info = {
            'hostname': platform.node(),
            'os': f"{platform.system()} {platform.release()}",
            'architecture': platform.machine(),
            'python_version': platform.python_version(),
            'uptime': int(time.time() - psutil.boot_time())
        }
        
        return jsonify({
            'success': True,
            'data': info
        })
    except Exception as e:
        print(f"Server info error: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to get server information'
        }), 500

@system_bp.route('/api/dashboard/stats')
@token_required
def get_dashboard_stats(current_user):
    """Get dashboard statistics for the current user"""
    try:
        # Check if user is admin
        is_admin = current_user.role == 'admin' or current_user.is_admin
        
        # Count virtual hosts
        try:
            if is_admin:
                virtual_hosts_count = VirtualHost.query.count()
            else:
                virtual_hosts_count = VirtualHost.query.filter_by(user_id=current_user.id).count()
        except Exception as e:
            print(f"Dashboard: Error counting virtual hosts: {e}")
            virtual_hosts_count = 0
        
        # Count databases
        try:
            if is_admin:
                databases_count = Database.query.count()
            else:
                # Database model uses 'owner_id' not 'user_id'
                databases_count = Database.query.filter_by(owner_id=current_user.id).count()
        except Exception as e:
            print(f"Dashboard: Error counting databases: {e}")
            databases_count = 0
        
        # Count email accounts
        try:
            if is_admin:
                email_accounts_count = EmailAccount.query.count()
            else:
                # Email accounts are linked to virtual hosts through email domains
                user_vhosts = VirtualHost.query.filter_by(user_id=current_user.id).all()
                user_vhost_ids = [vh.id for vh in user_vhosts]
                
                # Count email accounts in user's virtual host domains
                email_accounts_count = EmailAccount.query.join(EmailDomain).filter(
                    EmailDomain.virtual_host_id.in_(user_vhost_ids)
                ).count()
        except Exception as e:
            print(f"Dashboard: Error counting email accounts: {e}")
            email_accounts_count = 0
        
        # Count DNS records
        try:
            if is_admin:
                dns_records_count = DNSRecord.query.count()
            else:
                # DNS records are linked to virtual hosts through DNS zones
                user_vhosts = VirtualHost.query.filter_by(user_id=current_user.id).all()
                user_domains = [vh.domain for vh in user_vhosts]
                
                # Count DNS records in user's virtual host domains
                dns_records_count = DNSRecord.query.join(DNSZone).filter(
                    DNSZone.domain_name.in_(user_domains)
                ).count()
        except Exception as e:
            print(f"Dashboard: Error counting DNS records: {e}")
            dns_records_count = 0
        
        # Count SSL certificates
        try:
            if is_admin:
                ssl_certificates_count = SSLCertificate.query.count()
            else:
                # SSL certificates are linked to virtual hosts by domain
                user_vhosts = VirtualHost.query.filter_by(user_id=current_user.id).all()
                user_domains = [vh.domain for vh in user_vhosts]
                
                # Count SSL certificates for user's virtual host domains
                ssl_certificates_count = SSLCertificate.query.filter(
                    SSLCertificate.domain.in_(user_domains)
                ).count()
        except Exception as e:
            print(f"Dashboard: Error counting SSL certificates: {e}")
            ssl_certificates_count = 0
        
        ftp_accounts_count = 0  # FTP removed from system
        
        # Debug logging for non-admin users
        if not is_admin:
            print(f"Dashboard Debug - User {current_user.username} (ID: {current_user.id}):")
            print(f"  - Virtual Hosts: {virtual_hosts_count}")
            print(f"  - Databases: {databases_count}")
            print(f"  - Email Accounts: {email_accounts_count}")
            print(f"  - DNS Records: {dns_records_count}")
            print(f"  - SSL Certificates: {ssl_certificates_count}")
            
            # Additional debug info
            user_vhosts = VirtualHost.query.filter_by(user_id=current_user.id).all()
            print(f"  - User's Virtual Hosts: {[vh.domain for vh in user_vhosts]}")
        
        result = {
            'success': True,
            'data': {
                'virtualHosts': virtual_hosts_count,
                'databases': databases_count,
                'emailAccounts': email_accounts_count,
                'dnsRecords': dns_records_count,
                'sslCertificates': ssl_certificates_count,
                'ftpAccounts': ftp_accounts_count,
                'isAdmin': is_admin
            }
        }
        
        return jsonify(result)
        
    except Exception as e:
        print(f"Dashboard stats error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@system_bp.route('/api/system/logs/<service>')
def get_service_logs(service):
    try:
        # Security: only allow specific service names
        allowed_services = ['nginx', 'mysql', 'postfix', 'roundcube', 'bind9', 'syslog']
        if service not in allowed_services:
            return jsonify({'success': False, 'error': 'Service not allowed'}), 400
        
        # Check if running on Windows
        is_windows = platform.system() == 'Windows' or os.name == 'nt'
        
        if is_windows:
            # Windows development mode - return simulated logs
            logs = [
                f"[INFO] {service} service simulation mode",
                f"[INFO] This is a simulated log entry for {service}",
                f"[INFO] Running in Windows development environment",
                f"[INFO] No actual service logs available in simulation mode"
            ]
            return jsonify({
                'success': True,
                'data': {
                    'service': service,
                    'logs': logs,
                    'mode': 'simulation'
                }
            })
        
        # Linux production mode - get actual logs
        if service == 'syslog':
            cmd = ['journalctl', '-n', '50', '--no-pager']
        else:
            cmd = ['journalctl', '-u', service, '-n', '50', '--no-pager']
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        
        if result.returncode == 0:
            logs = result.stdout.split('\n')
            return jsonify({
                'success': True,
                'data': {
                    'service': service,
                    'logs': logs
                }
            })
        else:
            return jsonify({
                'success': False,
                'error': f'Failed to get logs for {service}'
            }), 500
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@system_bp.route('/api/system/restart/<service>', methods=['POST'])
@token_required
def restart_service(current_user, service):
    try:
        # Security: only allow admin users
        if not (current_user.role == 'admin' or current_user.is_admin):
            return jsonify({'success': False, 'error': 'Admin access required'}), 403
        
        # Security: only allow specific service names
        allowed_services = ['nginx', 'mysql', 'postfix', 'roundcube', 'bind9']
        if service not in allowed_services:
            return jsonify({'success': False, 'error': 'Service not allowed'}), 400
        
        # Check if running on Windows
        is_windows = platform.system() == 'Windows' or os.name == 'nt'
        
        if is_windows:
            # Windows development mode - simulate restart
            return jsonify({
                'success': True,
                'message': f'Service {service} restart simulated (Windows development mode)'
            })
        
        # Linux production mode - actual restart
        result = subprocess.run(['systemctl', 'restart', service], 
                              capture_output=True, text=True, timeout=30)
        
        if result.returncode == 0:
            return jsonify({
                'success': True,
                'message': f'Service {service} restarted successfully'
            })
        else:
            return jsonify({
                'success': False,
                'error': f'Failed to restart {service}: {result.stderr}'
            }), 500
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@system_bp.route('/api/system/sync-check', methods=['GET'])
@token_required
@rate_limit('sync_check', per_user=True)
def run_sync_check(current_user):
    """รัน sync check ระหว่าง database และไฟล์ระบบ"""
    try:
        # เฉพาะ admin เท่านั้นที่สามารถรัน full sync check ได้
        if not (current_user.is_admin or current_user.role == 'admin' or current_user.username == 'root'):
            return jsonify({
                'success': False,
                'error': 'Admin access required for sync check'
            }), 403
        
        # รัน sync check
        results = sync_check_service.run_full_sync_check(current_user.id)
        
        return jsonify({
            'success': True,
            'data': results
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@system_bp.route('/api/system/sync-check/fix', methods=['POST'])
@token_required
@admin_required
def auto_fix_sync_issues(current_user):
    """พยายามแก้ไขปัญหา sync อัตโนมัติ"""
    try:
        data = request.get_json()
        if not data or 'issue_type' not in data or 'domain' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing required fields: issue_type, domain'
            }), 400
        
        result = sync_check_service.auto_fix_issue(
            data['issue_type'], 
            data['domain'], 
            **data.get('extra_params', {})
        )
        
        return jsonify({
            'success': True,
            'data': result
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@system_bp.route('/api/system/health', methods=['GET'])
@token_required
def system_health_check(current_user):
    """ตรวจสอบสุขภาพระบบโดยรวม"""
    try:
        health_data = {
            'timestamp': datetime.now().isoformat(),
            'system': {
                'platform': platform.platform(),
                'python_version': platform.python_version(),
                'uptime': None,
                'load_average': None
            },
            'resources': {
                'cpu_percent': psutil.cpu_percent(interval=1),
                'memory': {
                    'total': psutil.virtual_memory().total,
                    'available': psutil.virtual_memory().available,
                    'percent': psutil.virtual_memory().percent,
                    'used': psutil.virtual_memory().used
                },
                'disk': {
                    'total': psutil.disk_usage('/').total,
                    'free': psutil.disk_usage('/').free,
                    'used': psutil.disk_usage('/').used,
                    'percent': psutil.disk_usage('/').percent
                }
            },
            'services': sync_check_service.check_system_health(),
            'database': {
                'connected': True,
                'connection_pool': None
            }
        }
        
        # เพิ่มข้อมูล uptime สำหรับ Linux
        if platform.system() != 'Windows':
            try:
                with open('/proc/uptime', 'r') as f:
                    uptime_seconds = float(f.readline().split()[0])
                    health_data['system']['uptime'] = uptime_seconds
                
                health_data['system']['load_average'] = os.getloadavg()
            except Exception:
                pass
        
        # ตรวจสอบการเชื่อมต่อฐานข้อมูล
        try:
            from models.base import db
            db.session.execute('SELECT 1')
            health_data['database']['connected'] = True
        except Exception as e:
            health_data['database']['connected'] = False
            health_data['database']['error'] = str(e)
        
        # คำนวณ health score
        health_score = 100
        if health_data['resources']['cpu_percent'] > 80:
            health_score -= 20
        if health_data['resources']['memory']['percent'] > 80:
            health_score -= 20
        if health_data['resources']['disk']['percent'] > 90:
            health_score -= 30
        if not health_data['database']['connected']:
            health_score -= 50
        
        # ตรวจสอบ services ที่ล้มเหลว
        failed_services = len([item for item in health_data['services']['items'] 
                             if item['status'] not in ['active', 'running']])
        health_score -= (failed_services * 10)
        
        health_data['health_score'] = max(0, health_score)
        health_data['status'] = 'healthy' if health_score >= 80 else 'warning' if health_score >= 60 else 'critical'
        
        return jsonify({
            'success': True,
            'data': health_data
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@system_bp.route('/api/system/rate-limits', methods=['GET'])
@token_required
def get_rate_limits(current_user):
    """ดูสถานะ rate limits ปัจจุบัน"""
    try:
        rules = ['virtual_host_create', 'virtual_host_delete', 'ssl_create', 
                'email_create', 'database_create', 'sync_check', 'general_api']
        
        rate_limits = {}
        for rule in rules:
            rate_limits[rule] = check_rate_limit_status(rule)
        
        return jsonify({
            'success': True,
            'data': rate_limits
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@system_bp.route('/api/system/rate-limits/reset', methods=['POST'])
@token_required
@admin_required
def reset_user_rate_limits(current_user):
    """รีเซ็ต rate limits สำหรับผู้ใช้ (admin เท่านั้น)"""
    try:
        data = request.get_json()
        rule_name = data.get('rule_name')
        target_user_id = data.get('user_id')
        
        if not rule_name:
            return jsonify({
                'success': False,
                'error': 'Missing rule_name'
            }), 400
        
        client_id = f"user_{target_user_id}" if target_user_id else None
        result = reset_rate_limit(rule_name, client_id)
        
        return jsonify({
            'success': result,
            'message': 'Rate limit reset successfully' if result else 'Failed to reset rate limit'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@system_bp.route('/api/system/config-validation', methods=['GET'])
@token_required
@admin_required
def validate_configurations(current_user):
    """ตรวจสอบความถูกต้องของไฟล์ configuration ต่างๆ"""
    try:
        validation_results = {
            'timestamp': datetime.now().isoformat(),
            'nginx': {'valid': None, 'errors': []},
            'bind': {'valid': None, 'errors': []},
            'postfix': {'valid': None, 'errors': []},
            'dovecot': {'valid': None, 'errors': []},
            'mysql': {'valid': None, 'errors': []}
        }
        
        # ตรวจสอบ Nginx configuration
        try:
            if platform.system() != 'Windows':
                result = subprocess.run(['nginx', '-t'], capture_output=True, text=True, timeout=10)
                validation_results['nginx']['valid'] = result.returncode == 0
                if result.returncode != 0:
                    validation_results['nginx']['errors'] = result.stderr.split('\n')
            else:
                validation_results['nginx']['valid'] = True
        except Exception as e:
            validation_results['nginx']['valid'] = False
            validation_results['nginx']['errors'] = [str(e)]
        
        # ตรวจสอบ BIND configuration
        try:
            if platform.system() != 'Windows':
                result = subprocess.run(['named-checkconf'], capture_output=True, text=True, timeout=10)
                validation_results['bind']['valid'] = result.returncode == 0
                if result.returncode != 0:
                    validation_results['bind']['errors'] = result.stderr.split('\n')
            else:
                validation_results['bind']['valid'] = True
        except Exception as e:
            validation_results['bind']['valid'] = False
            validation_results['bind']['errors'] = [str(e)]
        
        # ตรวจสอบ Postfix configuration
        try:
            if platform.system() != 'Windows':
                result = subprocess.run(['postfix', 'check'], capture_output=True, text=True, timeout=10)
                validation_results['postfix']['valid'] = result.returncode == 0
                if result.returncode != 0:
                    validation_results['postfix']['errors'] = result.stderr.split('\n')
            else:
                validation_results['postfix']['valid'] = True
        except Exception as e:
            validation_results['postfix']['valid'] = False
            validation_results['postfix']['errors'] = [str(e)]
        
        # ตรวจสอบ MySQL connection
        try:
            from models.base import db
            db.session.execute('SELECT VERSION()')
            validation_results['mysql']['valid'] = True
        except Exception as e:
            validation_results['mysql']['valid'] = False
            validation_results['mysql']['errors'] = [str(e)]
        
        # คำนวณผลรวม
        total_services = len(validation_results) - 1  # ไม่นับ timestamp
        valid_services = sum(1 for k, v in validation_results.items() 
                           if k != 'timestamp' and v.get('valid') is True)
        
        validation_results['summary'] = {
            'total_services': total_services,
            'valid_services': valid_services,
            'invalid_services': total_services - valid_services,
            'overall_valid': valid_services == total_services
        }
        
        return jsonify({
            'success': True,
            'data': validation_results
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@system_bp.route('/api/system/logs', methods=['GET'])
@token_required
@admin_required  
def get_system_logs(current_user):
    """ดู system logs (admin เท่านั้น)"""
    try:
        log_type = request.args.get('type', 'nginx')  # nginx, mysql, mail, dns
        lines = int(request.args.get('lines', 100))
        lines = min(lines, 1000)  # จำกัดไม่เกิน 1000 บรรทัด
        
        log_files = {
            'nginx': ['/var/log/nginx/error.log', '/var/log/nginx/access.log'],
            'mysql': ['/var/log/mysql/error.log'],
            'mail': ['/var/log/mail.log', '/var/log/mail.err'],
            'dns': ['/var/log/syslog'],  # BIND logs usually go to syslog
            'system': ['/var/log/syslog', '/var/log/messages']
        }
        
        if log_type not in log_files:
            return jsonify({
                'success': False,
                'error': f'Unknown log type: {log_type}'
            }), 400
        
        logs = []
        for log_file in log_files[log_type]:
            if platform.system() != 'Windows' and os.path.exists(log_file):
                try:
                    result = subprocess.run(
                        ['tail', '-n', str(lines), log_file], 
                        capture_output=True, text=True, timeout=10
                    )
                    if result.returncode == 0:
                        logs.append({
                            'file': log_file,
                            'content': result.stdout,
                            'lines': len(result.stdout.split('\n'))
                        })
                except Exception as e:
                    logs.append({
                        'file': log_file,
                        'error': str(e),
                        'content': None
                    })
        
        return jsonify({
            'success': True,
            'data': {
                'log_type': log_type,
                'requested_lines': lines,
                'logs': logs,
                'timestamp': datetime.now().isoformat()
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@system_bp.route('/api/system/backup', methods=['POST'])
@token_required
@admin_required
@rate_limit('general_api', per_user=True)
def create_backup(current_user):
    """สร้าง backup แบบเต็มระบบ (admin เท่านั้น)"""
    try:
        result = backup_service.create_full_backup(current_user.id)
        
        return jsonify({
            'success': len(result['errors']) == 0,
            'data': result
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@system_bp.route('/api/system/backup', methods=['GET'])
@token_required
@admin_required
def list_backups(current_user):
    """แสดงรายการ backups ที่มีอยู่"""
    try:
        backups = backup_service.list_backups()
        
        return jsonify({
            'success': True,
            'data': {
                'backups': backups,
                'total_backups': len(backups),
                'backup_dir': backup_service.backup_base_dir
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@system_bp.route('/api/system/backup/<backup_id>', methods=['DELETE'])
@token_required
@admin_required
def delete_backup_endpoint(current_user, backup_id):
    """ลบ backup"""
    try:
        result = backup_service.delete_backup(backup_id)
        
        return jsonify({
            'success': result['success'],
            'data': result
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@system_bp.route('/api/system/backup/cleanup', methods=['POST'])
@token_required
@admin_required
def cleanup_backups(current_user):
    """ลบ backups เก่าที่เกิน limit"""
    try:
        result = backup_service.cleanup_old_backups()
        
        return jsonify({
            'success': result['success'],
            'data': result
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500



@system_bp.route('/api/system/info', methods=['GET'])
@token_required
def get_system_info(current_user):
    """ข้อมูลระบบพื้นฐาน (backward compatibility)"""
    try:
        return jsonify({
            'success': True,
            'data': {
                'platform': platform.platform(),
                'python_version': platform.python_version(),
                'system': platform.system(),
                'architecture': platform.architecture()[0],
                'hostname': platform.node(),
                'timestamp': datetime.now().isoformat(),
                'features': {
                    'sync_check': True,
                    'backup_management': True,
                    'rate_limiting': True,
                    'enhanced_monitoring': True,
                    'scheduler': False  # ปิดใช้งานชั่วคราว
                }
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500 

@system_bp.route('/api/system/metrics', methods=['GET'])
@token_required
def get_system_metrics(current_user):
    """ระบบ metrics พื้นฐาน (backward compatibility)"""
    try:
        if not PSUTIL_AVAILABLE:
            return jsonify({
                'success': False,
                'error': 'psutil not available. Install with: pip install psutil'
            }), 503
        
        # CPU usage
        cpu_percent = psutil.cpu_percent(interval=1)
        cpu_count = psutil.cpu_count()
        
        # Memory usage
        memory = psutil.virtual_memory()
        
        # Disk usage
        disk = psutil.disk_usage('/')
        
        # Network I/O (if available)
        try:
            network = psutil.net_io_counters()
            network_data = {
                'bytes_sent': network.bytes_sent,
                'bytes_recv': network.bytes_recv,
                'packets_sent': network.packets_sent,
                'packets_recv': network.packets_recv
            }
        except Exception:
            network_data = None
        
        # Load average (Linux only)
        load_avg = None
        try:
            if hasattr(psutil, 'getloadavg'):
                load_avg = psutil.getloadavg()
        except Exception:
            pass
        
        # Process count
        process_count = len(psutil.pids())
        
        return jsonify({
            'success': True,
            'data': {
                'timestamp': datetime.now().isoformat(),
                'cpu': {
                    'percent': cpu_percent,
                    'count': cpu_count
                },
                'memory': {
                    'total': memory.total,
                    'available': memory.available,
                    'percent': memory.percent,
                    'used': memory.used
                },
                'disk': {
                    'total': disk.total,
                    'used': disk.used,
                    'free': disk.free,
                    'percent': disk.percent
                },
                'network': network_data,
                'system': {
                    'load_average': load_avg,
                    'process_count': process_count
                }
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500 

@system_bp.route('/api/dashboard/debug-user-data')
@token_required
def debug_user_data(current_user):
    """Debug endpoint to check user's data and relationships"""
    try:
        from models.virtual_host import VirtualHost
        from models.database import Database
        from models.email import EmailAccount, EmailDomain
        from models.dns import DNSRecord, DNSZone
        from models.ssl_certificate import SSLCertificate
        
        # Get user's virtual hosts
        user_vhosts = VirtualHost.query.filter_by(user_id=current_user.id).all()
        user_vhost_data = []
        
        for vh in user_vhosts:
            vh_info = {
                'id': vh.id,
                'domain': vh.domain,
                'linux_username': vh.linux_username,
                'document_root': vh.document_root,
                'status': vh.status,
                'created_at': vh.created_at.isoformat() if vh.created_at else None
            }
            
            # Get related email domains
            email_domains = EmailDomain.query.filter_by(virtual_host_id=vh.id).all()
            vh_info['email_domains'] = [ed.domain for ed in email_domains]
            
            # Get related email accounts
            email_accounts = []
            for ed in email_domains:
                accounts = EmailAccount.query.filter_by(domain_id=ed.id).all()
                email_accounts.extend([ea.username for ea in accounts])
            vh_info['email_accounts'] = email_accounts
            
            # Get related DNS zones
            dns_zones = DNSZone.query.filter_by(domain_name=vh.domain).all()
            vh_info['dns_zones'] = [dz.domain_name for dz in dns_zones]
            
            # Get related DNS records
            dns_records = []
            for dz in dns_zones:
                records = DNSRecord.query.filter_by(zone_id=dz.id).all()
                dns_records.extend([f"{dr.name} ({dr.record_type})" for dr in records])
            vh_info['dns_records'] = dns_records
            
            # Get related SSL certificates
            ssl_certs = SSLCertificate.query.filter_by(domain=vh.domain).all()
            vh_info['ssl_certificates'] = [sc.domain for sc in ssl_certs]
            
            user_vhost_data.append(vh_info)
        
        # Get user's databases
        user_databases = Database.query.filter_by(owner_id=current_user.id).all()
        database_data = [{
            'id': db.id,
            'name': db.name,
            'status': db.status,
            'created_at': db.created_at.isoformat() if db.created_at else None
        } for db in user_databases]
        
        debug_info = {
            'user': {
                'id': current_user.id,
                'username': current_user.username,
                'email': current_user.email,
                'role': current_user.role,
                'is_admin': current_user.is_admin
            },
            'virtual_hosts': user_vhost_data,
            'databases': database_data,
            'counts': {
                'virtual_hosts': len(user_vhost_data),
                'databases': len(database_data),
                'email_accounts': sum(len(vh['email_accounts']) for vh in user_vhost_data),
                'dns_records': sum(len(vh['dns_records']) for vh in user_vhost_data),
                'ssl_certificates': sum(len(vh['ssl_certificates']) for vh in user_vhost_data)
            }
        }
        
        return jsonify({
            'success': True,
            'data': debug_info
        })
        
    except Exception as e:
        print(f"Debug user data error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500 

@system_bp.route('/api/dashboard/debug-stats')
@token_required
def get_dashboard_debug_stats(current_user):
    """Debug endpoint to check dashboard statistics"""
    try:
        # Check if user is admin
        is_admin = current_user.role == 'admin' or current_user.is_admin
        
        # Get all virtual hosts for debugging
        all_vhosts = VirtualHost.query.all()
        user_vhosts = VirtualHost.query.filter_by(user_id=current_user.id).all()
        
        # Get user info
        user_info = {
            'id': current_user.id,
            'username': current_user.username,
            'role': current_user.role,
            'is_admin': current_user.is_admin
        }
        
        # Debug information
        debug_info = {
            'user_info': user_info,
            'total_vhosts': len(all_vhosts),
            'user_vhosts': len(user_vhosts),
            'all_vhosts_details': [
                {
                    'id': vh.id,
                    'domain': vh.domain,
                    'user_id': vh.user_id,
                    'linux_username': vh.linux_username,
                    'status': vh.status
                } for vh in all_vhosts
            ],
            'user_vhosts_details': [
                {
                    'id': vh.id,
                    'domain': vh.domain,
                    'user_id': vh.user_id,
                    'linux_username': vh.linux_username,
                    'status': vh.status
                } for vh in user_vhosts
            ]
        }
        
        return jsonify({
            'success': True,
            'debug_info': debug_info
        })
        
    except Exception as e:
        print(f"Dashboard debug error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500 

@system_bp.route('/api/dashboard/test-counts')
@token_required
def test_dashboard_counts(current_user):
    """Test endpoint to verify database counts"""
    try:
        # Test direct database queries
        from sqlalchemy import text
        
        # Get database connection
        db = current_app.db
        
        # Test 1: Count virtual hosts directly
        result = db.session.execute(text("SELECT COUNT(*) as count FROM virtual_host"))
        total_vhosts = result.scalar()
        
        # Test 2: Count user's virtual hosts directly
        result = db.session.execute(
            text("SELECT COUNT(*) as count FROM virtual_host WHERE user_id = :user_id"),
            {"user_id": current_user.id}
        )
        user_vhosts_count = result.scalar()
        
        # Test 3: Get sample virtual host data
        result = db.session.execute(
            text("SELECT id, domain, user_id, linux_username FROM virtual_host LIMIT 5")
        )
        sample_vhosts = [dict(row) for row in result]
        
        # Test 4: Check if user exists in virtual_host table
        result = db.session.execute(
            text("SELECT COUNT(*) as count FROM virtual_host WHERE user_id = :user_id"),
            {"user_id": current_user.id}
        )
        user_exists = result.scalar() > 0
        
        test_results = {
            'total_vhosts_in_db': total_vhosts,
            'user_vhosts_count': user_vhosts_count,
            'user_exists_in_vhost_table': user_exists,
            'current_user_id': current_user.id,
            'sample_vhosts': sample_vhosts,
            'sql_queries_working': True
        }
        
        return jsonify({
            'success': True,
            'test_results': test_results
        })
        
    except Exception as e:
        print(f"Test counts error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500 
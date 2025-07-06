from flask import Blueprint, jsonify, request
from functools import wraps
from utils.auth import token_required
from routes.auth import login_required
import platform
import time
import subprocess
import os
from datetime import datetime, timedelta
import redis

# Import psutil with better error handling
try:
    import psutil
    PSUTIL_AVAILABLE = True
    # print("psutil module loaded successfully")  # Hidden
except ImportError as e:
    PSUTIL_AVAILABLE = False
    print(f"Warning: psutil module not available: {e}")  # Keep - important warning

system_bp = Blueprint('system', __name__)

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
        {'name': 'Apache', 'service': 'apache2'},
        {'name': 'MySQL', 'service': 'mysql'},
        {'name': 'BIND', 'service': 'bind9'},
        {'name': 'Postfix', 'service': 'postfix'},
        {'name': 'Dovecot', 'service': 'dovecot'},
        {'name': 'ProFTPD', 'service': 'proftpd'},
        {'name': 'SSH', 'service': 'ssh'},
        {'name': 'Fail2Ban', 'service': 'fail2ban'},
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
        # print(f"Dashboard stats requested by user: {current_user.username} (ID: {current_user.id})")  # Hidden
        
        # Check if user is admin
        is_admin = current_user.role == 'admin' or current_user.is_admin
        # print(f"User {current_user.username} is admin: {is_admin}")  # Hidden
        
        # Try to import models and count safely
        try:
            from models.virtual_host import VirtualHost
            if is_admin:
                # Admin sees all virtual hosts
                virtual_hosts_count = VirtualHost.query.count()
                # print(f"Dashboard (Admin): Found {virtual_hosts_count} total virtual hosts")  # Hidden
            else:
                # Regular users see only their own virtual hosts
                virtual_hosts_count = VirtualHost.query.filter_by(user_id=current_user.id).count()
                # print(f"Dashboard (User {current_user.username}): Found {virtual_hosts_count} virtual hosts")  # Hidden
        except Exception as e:
            print(f"Dashboard: Error counting virtual hosts: {e}")  # Keep - error
            virtual_hosts_count = 0
        
        try:
            from models.database import Database
            if is_admin:
                databases_count = Database.query.count()
            else:
                # Filter by user if Database model has user_id field
                try:
                    databases_count = Database.query.filter_by(user_id=current_user.id).count()
                except:
                    # If no user_id field, regular users see 0
                    databases_count = 0
        except Exception as e:
            print(f"Dashboard: Error counting databases: {e}")  # Keep - error
            databases_count = 0
        
        try:
            from models.email import EmailAccount
            if is_admin:
                email_accounts_count = EmailAccount.query.count()
            else:
                # Filter by user if EmailAccount model has user_id field
                try:
                    email_accounts_count = EmailAccount.query.filter_by(user_id=current_user.id).count()
                except:
                    # If no user_id field, regular users see 0
                    email_accounts_count = 0
        except Exception as e:
            print(f"Dashboard: Error counting email accounts: {e}")  # Keep - error
            email_accounts_count = 0
        
        try:
            from models.dns import DNSRecord
            if is_admin:
                dns_records_count = DNSRecord.query.count()
            else:
                # Filter by user if DNSRecord model has user_id field
                try:
                    dns_records_count = DNSRecord.query.filter_by(user_id=current_user.id).count()
                except:
                    # If no user_id field, regular users see 0
                    dns_records_count = 0
        except Exception as e:
            print(f"Dashboard: Error counting DNS records: {e}")  # Keep - error
            dns_records_count = 0
        
        try:
            from models.ssl_certificate import SSLCertificate
            if is_admin:
                ssl_certificates_count = SSLCertificate.query.count()
            else:
                # Filter by user - SSL certificates are usually tied to virtual hosts
                try:
                    # Count SSL certificates for user's virtual hosts
                    from models.virtual_host import VirtualHost
                    user_vhosts = VirtualHost.query.filter_by(user_id=current_user.id).all()
                    user_domains = [vh.domain for vh in user_vhosts]
                    ssl_certificates_count = SSLCertificate.query.filter(SSLCertificate.domain.in_(user_domains)).count()
                except:
                    ssl_certificates_count = 0
        except Exception as e:
            print(f"Dashboard: Error counting SSL certificates: {e}")  # Keep - error
            ssl_certificates_count = 0
        
        try:
            from models.ftp import FTPAccount
            if is_admin:
                ftp_accounts_count = FTPAccount.query.count()
            else:
                # Filter by user if FTPAccount model has user_id field
                try:
                    ftp_accounts_count = FTPAccount.query.filter_by(user_id=current_user.id).count()
                except:
                    # If no user_id field, regular users see 0
                    ftp_accounts_count = 0
        except Exception as e:
            print(f"Dashboard: Error counting FTP accounts: {e}")  # Keep - error
            ftp_accounts_count = 0
        
        result = {
            'success': True,
            'data': {
                'virtualHosts': virtual_hosts_count,
                'databases': databases_count,
                'emailAccounts': email_accounts_count,
                'dnsRecords': dns_records_count,
                'sslCertificates': ssl_certificates_count,
                'ftpAccounts': ftp_accounts_count,
                'isAdmin': is_admin  # Include admin status for frontend
            }
        }
        
        # print(f"Dashboard stats result for {current_user.username} (admin={is_admin}): {result}")  # Hidden
        return jsonify(result)
        
    except Exception as e:
        print(f"Dashboard stats error: {e}")  # Keep - error
        return jsonify({'success': False, 'error': str(e)}), 500

@system_bp.route('/api/system/logs/<service>')
def get_service_logs(service):
    try:
        # Security: only allow specific service names
        allowed_services = ['apache2', 'mysql', 'postfix', 'roundcube', 'bind9', 'syslog']
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
        allowed_services = ['apache2', 'mysql', 'postfix', 'roundcube', 'bind9']
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

@system_bp.route('/api/system/health')
def health_check():
    """Enhanced health check endpoint"""
    try:
        # Check database connection
        db_status = "healthy"
        try:
            db.session.execute('SELECT 1')
        except Exception as e:
            db_status = f"unhealthy: {str(e)}"
        
        # Check Redis connection
        redis_status = "healthy"
        try:
            redis_client = redis.Redis(host='localhost', port=6379, db=0)
            redis_client.ping()
        except Exception as e:
            redis_status = f"unhealthy: {str(e)}"
        
        # Check disk space
        disk_status = "healthy"
        try:
            disk_usage = psutil.disk_usage('/')
            disk_percent = disk_usage.percent
            if disk_percent > 90:
                disk_status = f"warning: {disk_percent}% used"
        except Exception as e:
            disk_status = f"unhealthy: {str(e)}"
        
        # Check memory usage
        memory_status = "healthy"
        try:
            memory = psutil.virtual_memory()
            memory_percent = memory.percent
            if memory_percent > 90:
                memory_status = f"warning: {memory_percent}% used"
        except Exception as e:
            memory_status = f"unhealthy: {str(e)}"
        
        # Overall status
        overall_status = "healthy"
        if any(status != "healthy" for status in [db_status, redis_status, disk_status, memory_status]):
            overall_status = "degraded"
        
        return jsonify({
            'status': overall_status,
            'timestamp': datetime.utcnow().isoformat(),
            'version': '2.0.0',
            'services': {
                'database': db_status,
                'redis': redis_status,
                'disk': disk_status,
                'memory': memory_status
            }
        }), 200 if overall_status == "healthy" else 503
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 503

@system_bp.route('/api/system/metrics')
def system_metrics():
    """System metrics endpoint for monitoring"""
    try:
        # CPU usage
        cpu_percent = psutil.cpu_percent(interval=1)
        cpu_count = psutil.cpu_count()
        
        # Memory usage
        memory = psutil.virtual_memory()
        
        # Disk usage
        disk = psutil.disk_usage('/')
        
        # Network I/O
        network = psutil.net_io_counters()
        
        # Load average (Linux only)
        load_avg = None
        try:
            load_avg = psutil.getloadavg()
        except AttributeError:
            pass
        
        # Process count
        process_count = len(psutil.pids())
        
        return jsonify({
            'timestamp': datetime.utcnow().isoformat(),
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
            'network': {
                'bytes_sent': network.bytes_sent,
                'bytes_recv': network.bytes_recv,
                'packets_sent': network.packets_sent,
                'packets_recv': network.packets_recv
            },
            'system': {
                'load_average': load_avg,
                'process_count': process_count
            }
        })
        
    except Exception as e:
        logger.error(f"Metrics collection failed: {e}")
        return jsonify({'error': str(e)}), 500

@system_bp.route('/api/system/logs')
@login_required
def get_system_logs():
    """Get system logs"""
    try:
        lines = request.args.get('lines', 100, type=int)
        log_file = request.args.get('file', 'app.log')
        
        # Validate log file path
        log_dir = current_app.config.get('LOG_DIR', 'logs')
        log_path = os.path.join(log_dir, log_file)
        
        if not os.path.exists(log_path) or not log_path.startswith(os.path.abspath(log_dir)):
            return jsonify({'error': 'Invalid log file'}), 400
        
        # Read last N lines
        with open(log_path, 'r') as f:
            log_lines = f.readlines()[-lines:]
        
        return jsonify({
            'logs': log_lines,
            'file': log_file,
            'lines': len(log_lines)
        })
        
    except Exception as e:
        logger.error(f"Log retrieval failed: {e}")
        return jsonify({'error': str(e)}), 500 
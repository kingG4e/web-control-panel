from flask import Blueprint, jsonify, request
from utils.auth import token_required
import platform
import time
import subprocess
import os

# Import psutil with better error handling
try:
    import psutil
    PSUTIL_AVAILABLE = True
    print("psutil module loaded successfully")
except ImportError as e:
    PSUTIL_AVAILABLE = False
    print(f"Warning: psutil module not available: {e}")

system_bp = Blueprint('system', __name__)

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
    try:
        # Get CPU usage
        cpu_percent = psutil.cpu_percent(interval=1)
        
        # Get memory usage
        memory = psutil.virtual_memory()
        memory_percent = memory.percent
        
        # Get disk usage
        disk = psutil.disk_usage('/')
        disk_percent = round((disk.used / disk.total) * 100, 1)
        
        # Get network stats
        try:
            network = psutil.net_io_counters()
            network_stats = {
                'bytes_sent': network.bytes_sent,
                'bytes_recv': network.bytes_recv
            }
        except:
            network_stats = {
                'bytes_sent': 0,
                'bytes_recv': 0
            }
        
        # Get load average (Unix only)
        try:
            load_avg = os.getloadavg()[0] if hasattr(os, 'getloadavg') else 0
        except:
            load_avg = 0
        
        return jsonify({
            'success': True,
            'data': {
                'cpu': round(cpu_percent, 1),
                'memory': round(memory_percent, 1),
                'disk': disk_percent,
                'load': round(load_avg, 2),
                'network': network_stats
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@system_bp.route('/api/dashboard/stats')
@token_required
def get_dashboard_stats(current_user):
    """Get dashboard statistics for the current user"""
    try:
        print(f"Dashboard stats requested by user: {current_user.username} (ID: {current_user.id})")
        
        # Check if user is admin
        is_admin = current_user.role == 'admin' or current_user.is_admin
        print(f"User {current_user.username} is admin: {is_admin}")
        
        # Try to import models and count safely
        try:
            from models.virtual_host import VirtualHost
            if is_admin:
                # Admin sees all virtual hosts
                virtual_hosts_count = VirtualHost.query.count()
                print(f"Dashboard (Admin): Found {virtual_hosts_count} total virtual hosts")
            else:
                # Regular users see only their own virtual hosts
                virtual_hosts_count = VirtualHost.query.filter_by(user_id=current_user.id).count()
                print(f"Dashboard (User {current_user.username}): Found {virtual_hosts_count} virtual hosts")
        except Exception as e:
            print(f"Dashboard: Error counting virtual hosts: {e}")
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
            print(f"Dashboard: Error counting databases: {e}")
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
            print(f"Dashboard: Error counting email accounts: {e}")
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
            print(f"Dashboard: Error counting DNS records: {e}")
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
            print(f"Dashboard: Error counting SSL certificates: {e}")
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
            print(f"Dashboard: Error counting FTP accounts: {e}")
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
        
        print(f"Dashboard stats result for {current_user.username} (admin={is_admin}): {result}")
        return jsonify(result)
        
    except Exception as e:
        print(f"Dashboard stats error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@system_bp.route('/api/dashboard/activities')
def get_recent_activities():
    try:
        # Return default activities for now
        # In the future, this should come from a logs/activities table
        activities = [
            {
                'id': 1,
                'type': 'info',
                'message': 'System monitoring started',
                'timestamp': time.time() - 3600,
                'user': 'system'
            },
            {
                'id': 2,
                'type': 'success',
                'message': 'All services running normally',
                'timestamp': time.time() - 1800,
                'user': 'system'
            }
        ]
        
        return jsonify({
            'success': True,
            'data': activities
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@system_bp.route('/api/dashboard/server-info')
def get_server_info():
    try:
        # Get system information
        system_info = {
            'hostname': platform.node(),
            'system': platform.system(),
            'release': platform.release(),
            'version': platform.version(),
            'machine': platform.machine(),
            'processor': platform.processor(),
            'python_version': platform.python_version(),
        }
        
        # Get memory info
        memory = psutil.virtual_memory()
        memory_info = {
            'total': memory.total,
            'available': memory.available,
            'used': memory.used,
            'free': memory.free,
            'percent': memory.percent
        }
        
        # Get disk info
        disk = psutil.disk_usage('/')
        disk_info = {
            'total': disk.total,
            'used': disk.used,
            'free': disk.free,
            'percent': (disk.used / disk.total) * 100
        }
        
        # Get CPU info
        cpu_info = {
            'physical_cores': psutil.cpu_count(logical=False),
            'total_cores': psutil.cpu_count(logical=True),
            'max_frequency': psutil.cpu_freq().max if psutil.cpu_freq() else 0,
            'current_frequency': psutil.cpu_freq().current if psutil.cpu_freq() else 0
        }
        
        return jsonify({
            'success': True,
            'data': {
                'system': system_info,
                'memory': memory_info,
                'disk': disk_info,
                'cpu': cpu_info
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@system_bp.route('/api/dashboard/services')
def get_services_status():
    try:
        services = []
        
        # Define services to check
        service_names = ['apache2', 'mysql', 'postfix', 'roundcube', 'bind9']
        
        # Check if running on Windows (development mode)
        is_windows = platform.system() == 'Windows' or os.name == 'nt'
        
        print(f"Services endpoint called. Is Windows: {is_windows}")
        
        if is_windows:
            # Windows development mode - return simulated service status
            print("Running in Windows development mode - simulating service status")
            for service_name in service_names:
                # Simulate more realistic service status
                if service_name in ['apache2', 'mysql']:
                    status = 'running'
                    enabled = True
                elif service_name in ['postfix', 'roundcube']:
                    status = 'running'
                    enabled = True
                else:  # bind9
                    status = 'stopped'
                    enabled = False
                
                service_data = {
                    'name': service_name,
                    'status': status,
                    'enabled': enabled,
                    'mode': 'simulation'
                }
                services.append(service_data)
                print(f"Added service: {service_data}")
        else:
            # Linux production mode - check actual services
            for service_name in service_names:
                try:
                    # Check if service is active
                    result = subprocess.run(['systemctl', 'is-active', service_name], 
                                          capture_output=True, text=True, timeout=5)
                    is_active = result.returncode == 0 and result.stdout.strip() == 'active'
                    
                    # Check if service is enabled
                    result = subprocess.run(['systemctl', 'is-enabled', service_name], 
                                          capture_output=True, text=True, timeout=5)
                    is_enabled = result.returncode == 0 and result.stdout.strip() == 'enabled'
                    
                    services.append({
                        'name': service_name,
                        'status': 'running' if is_active else 'stopped',
                        'enabled': is_enabled
                    })
                except Exception as e:
                    services.append({
                        'name': service_name,
                        'status': 'unknown',
                        'enabled': False,
                        'error': str(e)
                    })
        
        response_data = {
            'success': True,
            'data': services
        }
        print(f"Services endpoint returning: {response_data}")
        
        return jsonify(response_data)
    except Exception as e:
        error_response = {'success': False, 'error': str(e)}
        print(f"Services endpoint error: {error_response}")
        return jsonify(error_response), 500

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
import os
import subprocess
import platform
from datetime import datetime
from jinja2 import Template

class BindService:
    def __init__(self):
        # Import config here to avoid circular imports
        from config import Config
        
        # Use production BIND9 paths from config or environment variables
        self.bind_config_dir = os.environ.get('BIND_CONFIG_DIR', Config.BIND_CONFIG_DIR)
        self.zones_dir = os.environ.get('BIND_ZONES_DIR', Config.BIND_ZONES_DIR)
        self.named_conf_local = os.path.join(self.bind_config_dir, 'named.conf.local')
        
        # Detect environment - use development paths only if explicitly set
        self.is_development = (
            os.getenv('FLASK_ENV') == 'development' or 
            os.getenv('BIND9_DEV_MODE', 'False').lower() == 'true'
        )
        
        # Override with development paths if in development mode
        if self.is_development:
            backend_dir = os.path.dirname(os.path.dirname(__file__))
            self.zones_dir = os.path.join(backend_dir, 'bind', 'zones')
            self.named_conf_local = os.path.join(backend_dir, 'bind', 'conf', 'named.conf.local')
            print(f"BIND9 Development Mode: Using paths {self.zones_dir} and {self.named_conf_local}")
        else:
            print(f"BIND9 Production Mode: Using paths {self.zones_dir} and {self.named_conf_local}")
        
        self.zone_template = '''$TTL    {{ zone.minimum }}
@       IN      SOA     ns1.{{ zone.domain_name }}. admin.{{ zone.domain_name }}. (
                        {{ zone.serial }}      ; Serial
                        {{ zone.refresh }}     ; Refresh
                        {{ zone.retry }}       ; Retry
                        {{ zone.expire }}      ; Expire
                        {{ zone.minimum }} )   ; Minimum TTL

; Name servers
@       IN      NS      ns1.{{ zone.domain_name }}.
@       IN      NS      ns2.{{ zone.domain_name }}.

; Name server A records
ns1     IN      A       {{ nameserver_ip }}
ns2     IN      A       {{ nameserver_ip }}

{% for record in zone.records %}
{%- if record.status == 'active' %}
{%- if record.record_type == 'MX' %}
{{ record.name }}    IN    {{ record.record_type }}    {{ record.priority }}    {{ record.content }}
{%- else %}
{{ record.name }}    IN    {{ record.record_type }}    {{ record.content }}
{%- endif %}
{%- endif %}
{% endfor %}
'''

    def create_zone(self, zone, nameserver_ip, user_id=None):
        """Create a new DNS zone"""
        try:
            # Ensure directories exist with proper permissions
            self._ensure_directories()
            
            # Generate zone file content
            template = Template(self.zone_template)
            zone_content = template.render(
                zone=zone,
                nameserver_ip=nameserver_ip
            )
            
            # Write zone file
            zone_file = os.path.join(self.zones_dir, f'db.{zone.domain_name}')
            with open(zone_file, 'w') as f:
                f.write(zone_content)
            
            # Set proper permissions for zone file
            if not self.is_development:
                try:
                    # Set file ownership to bind user if possible
                    os.chmod(zone_file, 0o644)
                    if os.getuid() == 0:  # Running as root
                        import pwd
                        bind_user = pwd.getpwnam('bind')
                        os.chown(zone_file, bind_user.pw_uid, bind_user.pw_gid)
                except (PermissionError, KeyError, OSError) as e:
                    print(f"Warning: Could not set zone file permissions: {e}")
            
            # Update named.conf.local
            self._update_named_conf_local(zone.domain_name)
            
            # Test BIND configuration before reloading
            if not self.is_development:
                config_valid = self._test_bind_config()
                if not config_valid:
                    raise Exception("BIND configuration test failed")
            
            # Reload BIND
            self._reload_bind()


            
        except Exception as e:
            raise Exception(f'Failed to create DNS zone: {str(e)}')

    def update_zone(self, zone, nameserver_ip, user_id=None):
        """Update an existing DNS zone"""
        try:
            # Update serial number
            zone.serial = datetime.now().strftime('%Y%m%d%H')
            
            # Generate and write new zone file
            self.create_zone(zone, nameserver_ip)


            
        except Exception as e:
            raise Exception(f'Failed to update DNS zone: {str(e)}')

    def delete_zone(self, domain_name, user_id=None):
        """Delete a DNS zone"""
        try:
            # Remove zone file
            zone_file = os.path.join(self.zones_dir, f'db.{domain_name}')
            if os.path.exists(zone_file):
                os.remove(zone_file)
            
            # Remove from named.conf.local
            self._remove_from_named_conf_local(domain_name)
            
            # Reload BIND (will be skipped in Windows/development)
            self._reload_bind()


            
        except Exception as e:
            raise Exception(f'Failed to delete DNS zone: {str(e)}')

    def _ensure_directories(self):
        """Ensure BIND directories exist with proper permissions"""
        try:
            # Create zones directory
            os.makedirs(self.zones_dir, exist_ok=True)
            
            # Create config directory
            os.makedirs(os.path.dirname(self.named_conf_local), exist_ok=True)
            
            if not self.is_development:
                # Set proper permissions
                os.chmod(self.zones_dir, 0o755)
                os.chmod(os.path.dirname(self.named_conf_local), 0o755)
                
                # Try to set ownership to bind user if running as root
                if os.getuid() == 0:
                    try:
                        import pwd
                        bind_user = pwd.getpwnam('bind')
                        os.chown(self.zones_dir, bind_user.pw_uid, bind_user.pw_gid)
                        os.chown(os.path.dirname(self.named_conf_local), bind_user.pw_uid, bind_user.pw_gid)
                    except (KeyError, OSError) as e:
                        print(f"Warning: Could not set directory ownership: {e}")
        except Exception as e:
            print(f"Warning: Could not ensure directories: {e}")

    def _test_bind_config(self):
        """Test BIND configuration before applying changes"""
        try:
            result = subprocess.run(
                ['named-checkconf'], 
                capture_output=True, 
                text=True,
                timeout=10
            )
            if result.returncode == 0:
                return True
            else:
                print(f"BIND config test failed: {result.stderr}")
                return False
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired, FileNotFoundError) as e:
            print(f"Warning: Could not test BIND config: {e}")
            return True  # Allow operation to continue if test fails

    def _update_named_conf_local(self, domain_name):
        """Add zone configuration to named.conf.local"""
        zone_conf = f'''
zone "{domain_name}" {{
    type master;
    file "{self.zones_dir}/db.{domain_name}";
    allow-transfer {{ none; }};
}};
'''
        # Create file if it doesn't exist
        if not os.path.exists(self.named_conf_local):
            with open(self.named_conf_local, 'w') as f:
                f.write('// Local DNS zones managed by Web Control Panel\n')
        
        # Check if zone already exists
        if os.path.exists(self.named_conf_local):
            with open(self.named_conf_local, 'r') as f:
                content = f.read()
                if f'zone "{domain_name}"' in content:
                    print(f"Zone {domain_name} already exists in named.conf.local")
                    return
        
        with open(self.named_conf_local, 'a') as f:
            f.write(zone_conf)
        
        # Set proper permissions
        if not self.is_development:
            try:
                os.chmod(self.named_conf_local, 0o644)
                if os.getuid() == 0:
                    import pwd
                    bind_user = pwd.getpwnam('bind')
                    os.chown(self.named_conf_local, bind_user.pw_uid, bind_user.pw_gid)
            except (PermissionError, KeyError, OSError) as e:
                print(f"Warning: Could not set named.conf.local permissions: {e}")

    def _remove_from_named_conf_local(self, domain_name):
        """Remove zone configuration from named.conf.local"""
        if not os.path.exists(self.named_conf_local):
            return
            
        with open(self.named_conf_local, 'r') as f:
            lines = f.readlines()
        
        with open(self.named_conf_local, 'w') as f:
            skip = False
            for line in lines:
                if f'zone "{domain_name}"' in line:
                    skip = True
                    continue
                if skip and '};' in line:
                    skip = False
                    continue
                if not skip:
                    f.write(line)

    def _reload_bind(self):
        """Reload BIND service"""
        # Skip BIND reload in Windows environment
        if platform.system() == 'Windows' or os.name == 'nt':
            print("Skipping BIND reload in Windows environment")
            return
            
        # Skip BIND reload in development environment
        if self.is_development:
            print("Skipping BIND reload in development environment")
            return
            
        try:
            # Try multiple reload commands
            reload_commands = [
                ['systemctl', 'reload', 'bind9'],
                ['systemctl', 'reload', 'named'],
                ['service', 'bind9', 'reload'],
                ['service', 'named', 'reload'],
                ['rndc', 'reload']
            ]
            
            success = False
            for cmd in reload_commands:
                try:
                    result = subprocess.run(cmd, check=True, capture_output=True, text=True, timeout=30)
                    print(f"BIND reloaded successfully using: {' '.join(cmd)}")
                    success = True
                    break
                except (subprocess.CalledProcessError, FileNotFoundError):
                    continue
            
            if not success:
                print("Warning: Could not reload BIND using any known method")
                print("Available commands tried: systemctl, service, rndc")
                
        except subprocess.TimeoutExpired:
            print("Warning: BIND reload timed out")
        except Exception as e:
            print(f"Warning: Failed to reload BIND: {str(e)}")

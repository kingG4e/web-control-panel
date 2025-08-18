import os
import subprocess
import platform
from datetime import datetime
from jinja2 import Template
from typing import List, Dict, Any

try:
    import dns.zone
    import dns.rdatatype
    import dns.name
except Exception:
    dns = None

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
        
        self.zone_template = '''$TTL 3600
$ORIGIN {{ zone.domain_name }}.
@   IN SOA {{ soa_mname }} {{ soa_rname }} (
        {{ zone.serial }}
        3600
        1800
        1209600
        300 )

@       IN NS  ns1.{{ zone.domain_name }}.
ns1     IN A   {{ ip_ns1 }}

@       IN A   {{ ip_root }}
www     IN CNAME {{ zone.domain_name }}.
{% for record in zone.records %}
{%- if record.status == 'active' %}
{%- set rt = record.record_type.upper() %}
{%- set nm = record.name %}
{%- if rt == 'MX' %}
; เมล (ใส่เฉพาะใช้จริง)
{{ record.name }}    IN    {{ record.record_type }}    {{ record.priority }}    {{ record.content }}
{%- if record.content.startswith('mail.') %}
mail    IN A   {{ ip_mail }}
{%- endif %}
{%- elif rt in ['A','AAAA','CNAME','TXT','NS','SRV','CAA'] %}
{#- Skip base records that are already rendered statically above #}
{%- if not (rt == 'NS' and nm == '@')
      and not (rt == 'A' and (nm == '@' or nm == 'ns1' or nm == 'mail'))
      and not (rt == 'CNAME' and nm == 'www') %}
{{ record.name }}    IN    {{ record.record_type }}    {{ record.content }}
{%- endif %}
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

            # Derive IPs from DB records when available; fall back to provided nameserver_ip
            try:
                records = list(getattr(zone, 'records', []) or [])
            except Exception:
                records = []

            def find_ip(record_name: str) -> str:
                for r in records:
                    if getattr(r, 'status', 'active') == 'active' and getattr(r, 'record_type', '').upper() == 'A' and getattr(r, 'name', '') == record_name:
                        return getattr(r, 'content', None) or nameserver_ip
                return nameserver_ip

            ip_root = find_ip('@')
            ip_ns1 = find_ip('ns1') or ip_root
            ip_mail = find_ip('mail') or ip_root

            # Determine SOA mname/rname, possibly overridden by an SOA record content
            def try_int(val: str, default: int) -> int:
                try:
                    return int(val)
                except Exception:
                    return default

            soa_mname = f"ns1.{zone.domain_name}."
            soa_rname = f"admin.{zone.domain_name}."
            for r in records:
                if getattr(r, 'status', 'active') == 'active' and getattr(r, 'record_type', '').upper() == 'SOA':
                    raw = (getattr(r, 'content', '') or '').replace('(', ' ').replace(')', ' ')
                    parts = [p for p in raw.split() if p]
                    if len(parts) >= 1:
                        soa_mname = parts[0]
                    if len(parts) >= 2:
                        soa_rname = parts[1]
                    # Optionally allow overriding numeric fields if provided
                    if len(parts) >= 7:
                        zone.serial = parts[2]
                        zone.refresh = try_int(parts[3], zone.refresh)
                        zone.retry = try_int(parts[4], zone.retry)
                        zone.expire = try_int(parts[5], zone.expire)
                        zone.minimum = try_int(parts[6], zone.minimum)
                    break

            zone_content = template.render(
                zone=zone,
                nameserver_ip=nameserver_ip,
                ip_root=ip_root,
                ip_ns1=ip_ns1,
                ip_mail=ip_mail,
                soa_mname=soa_mname,
                soa_rname=soa_rname
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
        zone_conf = f'''zone "{domain_name}" {{
    type master;
    file "{self.zones_dir}/db.{domain_name}";
    allow-transfer {{ none; }};
}};

'''
        # Create file if it doesn't exist
        if not os.path.exists(self.named_conf_local):
            with open(self.named_conf_local, 'w') as f:
                f.write('// Local DNS zones managed by Web Control Panel\n\n')
        
        # Check if zone already exists using regex for more robust checking
        if os.path.exists(self.named_conf_local):
            with open(self.named_conf_local, 'r') as f:
                content = f.read()
            
            # Use regex to check for existing zone more accurately
            import re
            zone_pattern = rf'zone\s+"{re.escape(domain_name)}"\s*\{{'
            if re.search(zone_pattern, content):
                print(f"Zone {domain_name} already exists in named.conf.local")
                return
        
        # Append the new zone configuration
        with open(self.named_conf_local, 'a') as f:
            f.write(zone_conf)
        
        print(f"Added zone configuration for {domain_name} to named.conf.local")
        
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
        """Remove a single zone block from named.conf.local safely (no leftovers)."""
        import os, re
        from datetime import datetime

        path = self.named_conf_local
        if not os.path.exists(path):
            return

        # 1) Read & backup
        with open(path, 'r') as f:
            original = f.read()
        backup_path = f"{path}.backup.{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        with open(backup_path, 'w') as f:
            f.write(original)

        # 2) Remove block comments first to avoid fake braces
        content = re.sub(r'/\*.*?\*/', '', original, flags=re.S)
        lines = content.splitlines()

        # strip inline // or # comments (simple and good enough for named.conf)
        def strip_inline_comments(s: str) -> str:
            for sep in ('//', '#'):
                p = s.find(sep)
                if p != -1:
                    s = s[:p]
            return s

        zone_head_re = re.compile(r'^\s*zone\s+"{}"\s*\{{'.format(re.escape(domain_name)))

        out = []
        i, n = 0, len(lines)
        skipping = False
        brace = 0

        while i < n:
            raw = lines[i]
            chk = strip_inline_comments(raw)

            if not skipping and zone_head_re.search(chk):
                # Begin skipping this zone block
                skipping = True
                brace = chk.count('{') - chk.count('}')
                i += 1
                # Eat until matching closing brace
                while i < n and brace > 0:
                    chk2 = strip_inline_comments(lines[i])
                    brace += chk2.count('{') - chk2.count('}')
                    i += 1
                # Eat trailing orphan tokens like '};' / '}' / ';'
                while i < n and lines[i].strip() in ('};', '}', ';'):
                    i += 1
                # Optionally compress blank lines after removal
                while i < n and lines[i].strip() == '':
                    i += 1
                skipping = False
                continue
            else:
                out.append(raw)
                i += 1

        # 3) Normalize blank lines (max 1 consecutive)
        compact = []
        blanks = 0
        for ln in out:
            if ln.strip() == '':
                blanks += 1
                if blanks > 1:
                    continue
            else:
                blanks = 0
            compact.append(ln.rstrip())

        new_content = '\n'.join(compact).rstrip() + '\n'

        # 4) Write & validate; restore if invalid
        try:
            with open(path, 'w') as f:
                f.write(new_content)

            if not self.is_development:
                if not self._test_bind_config():
                    with open(path, 'w') as f:
                        f.write(original)
                    raise Exception(f"BIND configuration test failed after removing zone {domain_name}")

            # Permissions (best-effort)
            if not self.is_development:
                try:
                    os.chmod(path, 0o644)
                    if os.getuid() == 0:
                        import pwd
                        b = pwd.getpwnam('bind')
                        os.chown(path, b.pw_uid, b.pw_gid)
                except Exception as e:
                    print(f"Warning: Could not set named.conf.local permissions: {e}")

            print(f"Successfully removed zone configuration for {domain_name} from named.conf.local")
            try:
                os.remove(backup_path)
            except OSError:
                pass

        except Exception as e:
            # Try to restore if anything goes wrong
            try:
                with open(path, 'w') as f:
                    f.write(original)
            except Exception:
                pass
            raise

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


    def read_zone_records(self, domain_name: str) -> List[Dict[str, Any]]:
        """Parse the real zone file and return records as dicts for UI.

        Best-effort: if parsing fails or dnspython missing, return empty list.
        """
        try:
            if dns is None:
                return []

            origin = dns.name.from_text(domain_name + '.')
            zone_file = os.path.join(self.zones_dir, f'db.{domain_name}')
            if not os.path.exists(zone_file):
                return []

            z = dns.zone.from_file(zone_file, origin=origin, relativize=False)

            records: List[Dict[str, Any]] = []

            # Include SOA at the zone origin explicitly
            try:
                soa_rrset = z.get_rdataset(origin, dns.rdatatype.SOA)
                if soa_rrset:
                    ttl = soa_rrset.ttl or 3600
                    for rdata in soa_rrset:
                        minimum_ttl = int(getattr(rdata, 'minimum', getattr(rdata, 'minimum_ttl', 300)))
                        records.append({
                            'name': '@',
                            'record_type': 'SOA',
                            'ttl': int(ttl),
                            'status': 'active',
                            'content': f"{rdata.mname.to_text()} {rdata.rname.to_text()} ( {int(rdata.serial)} {int(rdata.refresh)} {int(rdata.retry)} {int(rdata.expire)} {minimum_ttl} )"
                        })
            except Exception:
                pass
            for (name, node) in z.nodes.items():
                rel_name = name.relativize(origin).to_text()
                if rel_name == '':
                    rel_name = '@'
                for rdataset in node.rdatasets:
                    rtype = dns.rdatatype.to_text(rdataset.rdtype)
                    ttl = rdataset.ttl or 3600
                    for rdata in rdataset:
                        rec: Dict[str, Any] = {
                            'name': rel_name,
                            'record_type': rtype,
                            'ttl': int(ttl),
                            'status': 'active'
                        }
                        if rtype in ('A', 'AAAA'):
                            rec['content'] = getattr(rdata, 'address', '')
                        elif rtype in ('CNAME', 'NS'):
                            rec['content'] = rdata.target.to_text()
                        elif rtype == 'MX':
                            rec['content'] = rdata.exchange.to_text()
                            rec['priority'] = int(getattr(rdata, 'preference', 0))
                        elif rtype == 'TXT':
                            try:
                                rec['content'] = '"' + ''.join([s.decode() if isinstance(s, bytes) else str(s) for s in rdata.strings]) + '"'
                            except Exception:
                                rec['content'] = str(rdata)
                        else:
                            rec['content'] = str(rdata)
                        records.append(rec)

            # Sort for consistent display
            def sort_key(r):
                return (r.get('name', ''), r.get('record_type', ''), r.get('content', ''))
            records.sort(key=sort_key)
            return records
        except Exception as e:
            print(f"Warning: Failed to parse zone file for {domain_name}: {e}")
            return []
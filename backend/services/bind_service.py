import os
import subprocess
from datetime import datetime
from jinja2 import Template

class BindService:
    def __init__(self):
        # Use local development paths
        self.zones_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'bind', 'zones')
        self.named_conf_local = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'bind', 'conf', 'named.conf.local')
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

    def create_zone(self, zone, nameserver_ip):
        """Create a new DNS zone"""
        try:
            # Ensure directories exist
            os.makedirs(os.path.dirname(self.named_conf_local), exist_ok=True)
            os.makedirs(self.zones_dir, exist_ok=True)
            
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
            
            # Update named.conf.local
            self._update_named_conf_local(zone.domain_name)
            
            # In development, skip BIND reload
            if os.getenv('FLASK_ENV') != 'development':
                self._reload_bind()
            
        except Exception as e:
            raise Exception(f'Failed to create DNS zone: {str(e)}')

    def update_zone(self, zone, nameserver_ip):
        """Update an existing DNS zone"""
        try:
            # Update serial number
            zone.serial = datetime.now().strftime('%Y%m%d%H')
            
            # Generate and write new zone file
            self.create_zone(zone, nameserver_ip)
            
        except Exception as e:
            raise Exception(f'Failed to update DNS zone: {str(e)}')

    def delete_zone(self, domain_name):
        """Delete a DNS zone"""
        try:
            # Remove zone file
            zone_file = os.path.join(self.zones_dir, f'db.{domain_name}')
            if os.path.exists(zone_file):
                os.remove(zone_file)
            
            # Remove from named.conf.local
            self._remove_from_named_conf_local(domain_name)
            
            # In development, skip BIND reload
            if os.getenv('FLASK_ENV') != 'development':
                self._reload_bind()
            
        except Exception as e:
            raise Exception(f'Failed to delete DNS zone: {str(e)}')

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
                f.write('// Local DNS zones\n')
        
        with open(self.named_conf_local, 'a') as f:
            f.write(zone_conf)

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
        try:
            subprocess.run(['systemctl', 'reload', 'bind9'], check=True)
        except subprocess.CalledProcessError as e:
            raise Exception(f'Failed to reload BIND: {str(e)}') 
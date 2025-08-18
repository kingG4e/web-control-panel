#!/usr/bin/env python3
"""
Manual script to remove specific zone from named.conf.local
This bypasses BIND config tests to fix the current issue
"""
import os
import re
import shutil
from datetime import datetime

def manual_remove_zone(domain_name, named_conf_path='/etc/bind/named.conf.local'):
    """Manually remove a specific zone from named.conf.local"""
    
    if not os.path.exists(named_conf_path):
        print(f"File {named_conf_path} does not exist")
        return False
    
    try:
        # Create backup
        backup_path = f"{named_conf_path}.manual_backup.{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        shutil.copy2(named_conf_path, backup_path)
        print(f"✅ Created backup: {backup_path}")
        
        # Read original content
        with open(named_conf_path, 'r') as f:
            content = f.read()
        
        print(f"Original content:")
        print("=" * 50)
        print(content)
        print("=" * 50)
        
        # Method: Line-by-line parsing with proper zone block detection
        lines = content.split('\n')
        result_lines = []
        skip_block = False
        brace_count = 0
        zone_line_start = -1
        
        for i, line in enumerate(lines):
            line_stripped = line.strip()
            
            # Check if this line starts the zone we want to remove
            zone_start_pattern = rf'zone\s+"{re.escape(domain_name)}"\s*\{{'
            if re.search(zone_start_pattern, line):
                print(f"Found zone start at line {i+1}: {line.strip()}")
                skip_block = True
                zone_line_start = i
                brace_count = line.count('{') - line.count('}')
                continue
            
            if skip_block:
                brace_count += line.count('{') - line.count('}')
                print(f"Line {i+1} (inside zone): '{line.strip()}' - brace_count: {brace_count}")
                
                # End of zone block when braces are balanced and we see closing
                if brace_count <= 0 and ('}' in line and ';' in line):
                    print(f"Found zone end at line {i+1}: {line.strip()}")
                    skip_block = False
                    continue
                # Still inside zone block
                continue
            
            # Keep all lines that are not part of the target zone
            result_lines.append(line)
        
        # Join the result
        new_content = '\n'.join(result_lines)
        
        # Clean up excessive empty lines
        new_content = re.sub(r'\n\n\n+', '\n\n', new_content)
        
        # Ensure proper ending
        if new_content.strip() and not new_content.endswith('\n'):
            new_content += '\n'
        
        print(f"New content:")
        print("=" * 50)
        print(new_content)
        print("=" * 50)
        
        # Check if zone was actually removed
        if f'zone "{domain_name}"' in new_content:
            print(f"❌ WARNING: Zone {domain_name} still present in result!")
            return False
        else:
            print(f"✅ Zone {domain_name} successfully removed!")
        
        # Ask for confirmation
        response = input(f"Apply these changes to {named_conf_path}? (y/N): ").strip().lower()
        
        if response in ['y', 'yes']:
            # Write the new content
            with open(named_conf_path, 'w') as f:
                f.write(new_content)
            
            print(f"✅ Successfully updated {named_conf_path}")
            print(f"📁 Backup saved as: {backup_path}")
            return True
        else:
            print("❌ Operation cancelled by user")
            os.unlink(backup_path)  # Remove backup since we didn't apply changes
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def show_current_zones():
    """Show current zones in named.conf.local"""
    named_conf_path = '/etc/bind/named.conf.local'
    
    if not os.path.exists(named_conf_path):
        print(f"File {named_conf_path} does not exist")
        return
    
    with open(named_conf_path, 'r') as f:
        content = f.read()
    
    print("Current zones in named.conf.local:")
    print("=" * 50)
    
    # Find all zones
    zone_matches = re.findall(r'zone\s+"([^"]+)"\s*\{', content)
    
    if zone_matches:
        for i, zone in enumerate(zone_matches, 1):
            print(f"{i}. {zone}")
    else:
        print("No zones found")
    
    print("=" * 50)
    print("Full content:")
    print(content)

if __name__ == '__main__':
    print("🔧 Manual Zone Cleanup Tool")
    print()
    
    # Show current zones
    show_current_zones()
    
    print("\nWhich zone do you want to remove?")
    domain = input("Enter domain name (e.g., d.com): ").strip()
    
    if domain:
        success = manual_remove_zone(domain)
        if success:
            print(f"\n🎉 Successfully removed zone '{domain}'!")
            print("\nFinal result:")
            show_current_zones()
        else:
            print(f"\n💥 Failed to remove zone '{domain}'!")
    else:
        print("No domain name provided. Exiting.")
    
    print("\nDone!")

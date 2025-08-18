#!/usr/bin/env python3
"""
Script to fix the current /etc/bind/named.conf.local file
This will clean up orphaned }; entries and malformed zones
"""

import os
import sys
from datetime import datetime

def fix_current_named_conf():
    """Fix the current named.conf.local file"""
    
    named_conf_path = '/etc/bind/named.conf.local'
    
    if not os.path.exists(named_conf_path):
        print(f"File {named_conf_path} does not exist")
        return False
    
    # Create backup first
    backup_path = f"{named_conf_path}.backup.{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    try:
        # Read current content
        with open(named_conf_path, 'r') as f:
            content = f.read()
        
        print("Current content:")
        print("=" * 50)
        print(content)
        print("=" * 50)
        
        # Create backup
        with open(backup_path, 'w') as f:
            f.write(content)
        print(f"✅ Created backup: {backup_path}")
        
        # Process line by line
        lines = content.split('\n')
        cleaned_lines = []
        removed_lines = []
        
        for i, line in enumerate(lines, 1):
            stripped = line.strip()
            
            # Skip orphaned closing braces/semicolons
            if stripped in ['};', '}', '};]', '} }', '} };', '};}', '}}', '}};', '); };', '); }']:
                removed_lines.append(f"Line {i}: '{stripped}'")
                continue
                
            # Skip incomplete zone declarations
            if (stripped.startswith('zone ') and '{' in stripped and 
                not any(keyword in stripped for keyword in ['type', 'file', 'master', 'slave'])):
                removed_lines.append(f"Line {i}: Incomplete zone - '{stripped}'")
                continue
            
            cleaned_lines.append(line)
        
        # Join and clean up excessive newlines
        new_content = '\n'.join(cleaned_lines)
        
        # Remove excessive newlines
        import re
        new_content = re.sub(r'\n\n\n+', '\n\n', new_content)
        
        # Ensure file ends properly
        new_content = new_content.strip()
        if new_content:
            new_content += '\n'
        
        # Show what will be removed
        if removed_lines:
            print(f"\n📝 Will remove the following {len(removed_lines)} problematic lines:")
            for line in removed_lines:
                print(f"  ❌ {line}")
        else:
            print("\n✅ No problematic lines found")
        
        print(f"\nNew content will be:")
        print("=" * 50)
        print(new_content)
        print("=" * 50)
        
        # Ask for confirmation
        response = input(f"\nDo you want to apply these changes? (y/N): ").strip().lower()
        
        if response in ['y', 'yes']:
            # Write the fixed content
            with open(named_conf_path, 'w') as f:
                f.write(new_content)
            
            print(f"✅ Successfully fixed {named_conf_path}")
            print(f"📁 Backup saved as: {backup_path}")
            
            if removed_lines:
                print(f"🧹 Removed {len(removed_lines)} problematic lines")
            
            return True
        else:
            print("❌ Operation cancelled by user")
            # Remove backup since we didn't make changes
            os.unlink(backup_path)
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == '__main__':
    print("🔧 Named.conf.local Cleanup Tool")
    print("This tool will fix orphaned }; entries and malformed zones")
    print()
    
    success = fix_current_named_conf()
    
    if success:
        print("\n🎉 Cleanup completed successfully!")
        print("Your named.conf.local file is now clean.")
    else:
        print("\n💥 Cleanup failed or was cancelled.")
    
    sys.exit(0 if success else 1)

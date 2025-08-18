#!/usr/bin/env python3
"""
Script to fix broken named.conf.local file
"""
import os
from datetime import datetime

def fix_broken_named_conf():
    """Fix the broken named.conf.local file"""
    
    named_conf_path = '/etc/bind/named.conf.local'
    
    # Read current broken content
    with open(named_conf_path, 'r') as f:
        current_content = f.read()
    
    print("Current broken content:")
    print("=" * 50)
    print(repr(current_content))
    print(current_content)
    print("=" * 50)
    
    # Create backup
    backup_path = f"{named_conf_path}.broken_backup.{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    with open(backup_path, 'w') as f:
        f.write(current_content)
    print(f"Created backup: {backup_path}")
    
    # Create the correct content
    correct_content = '''// Local zones go here.
// Example (uncomment to use):

zone "webtest.com" {
    type master;
    file "/etc/bind/zones/db.webtest.com";
    allow-transfer { none; };
};

zone "d.com" {
    type master;
    file "/etc/bind/zones/db.d.com";
    allow-transfer { none; };
};

'''
    
    print("New correct content:")
    print("=" * 50)
    print(correct_content)
    print("=" * 50)
    
    # Ask for confirmation
    response = input("Apply this fix? (y/N): ").strip().lower()
    
    if response in ['y', 'yes']:
        with open(named_conf_path, 'w') as f:
            f.write(correct_content)
        
        print("✅ Fixed named.conf.local!")
        return True
    else:
        print("❌ Fix cancelled")
        return False

if __name__ == '__main__':
    print("🔧 Fix Broken named.conf.local")
    success = fix_broken_named_conf()
    
    if success:
        print("\n🎉 File has been fixed!")
        print("You can now test zone deletion again.")
    else:
        print("\n💥 Fix was cancelled.")

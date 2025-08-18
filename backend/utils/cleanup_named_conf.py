#!/usr/bin/env python3
"""
Utility script to clean up malformed entries in named.conf.local file.
This script removes orphaned }; entries and fixes formatting issues.
"""

import os
import re
import sys
from datetime import datetime

def cleanup_named_conf_local(named_conf_path):
    """Clean up malformed entries in named.conf.local"""
    
    if not os.path.exists(named_conf_path):
        print(f"File {named_conf_path} does not exist")
        return False
    
    # Create backup
    backup_path = f"{named_conf_path}.backup.{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    try:
        # Read the current content
        with open(named_conf_path, 'r') as f:
            content = f.read()
        
        # Create backup
        with open(backup_path, 'w') as f:
            f.write(content)
        print(f"Created backup: {backup_path}")
        
        # Clean up the content
        original_content = content
        
        # Remove orphaned }; entries (lines that only contain }; or similar)
        lines = content.split('\n')
        cleaned_lines = []
        
        for i, line in enumerate(lines):
            stripped = line.strip()
            
            # Skip lines that are just orphaned closing braces/semicolons
            if stripped in ['};', '}', '};]', '} }', '} };', '};}', '}}', '}};', '); };', '); }']:
                print(f"Removing orphaned line: '{stripped}'")
                continue
                
            # Skip incomplete zone declarations without proper content
            if (stripped.startswith('zone ') and '{' in stripped and 
                not any(keyword in stripped for keyword in ['type', 'file', 'master', 'slave'])):
                print(f"Removing incomplete zone line: '{stripped}'")
                continue
                
            # Skip empty lines that are followed by orphaned braces
            if not stripped:
                # Look ahead for orphaned braces
                next_lines_orphaned = False
                for j in range(i + 1, min(i + 3, len(lines))):
                    if j < len(lines):
                        next_stripped = lines[j].strip()
                        if next_stripped in ['};', '}', '};]', '} }', '} };', '};}', '}}', '}};']:
                            next_lines_orphaned = True
                            break
                        elif next_stripped:  # Non-empty, non-orphaned line
                            break
                
                if next_lines_orphaned:
                    continue
            
            cleaned_lines.append(line)
        
        content = '\n'.join(cleaned_lines)
        
        # Remove malformed zone blocks (incomplete zones)
        # Pattern to find zone blocks that might be malformed
        content = re.sub(r'zone\s+"[^"]*"\s*\{\s*\}\s*;\s*\n?', '', content, flags=re.MULTILINE)
        
        # Clean up excessive newlines
        content = re.sub(r'\n\n\n+', '\n\n', content)
        
        # Remove trailing whitespace from lines
        lines = content.split('\n')
        cleaned_lines = [line.rstrip() for line in lines]
        content = '\n'.join(cleaned_lines)
        
        # Ensure file ends with a single newline
        if content and not content.endswith('\n'):
            content += '\n'
        
        # Write the cleaned content
        with open(named_conf_path, 'w') as f:
            f.write(content)
        
        if content != original_content:
            print(f"Cleaned up {named_conf_path}")
            print("Changes made:")
            print("- Removed orphaned closing braces")
            print("- Cleaned up excessive newlines")
            print("- Removed malformed zone blocks")
            print("- Fixed line endings")
        else:
            print(f"No cleanup needed for {named_conf_path}")
        
        return True
        
    except Exception as e:
        print(f"Error cleaning up {named_conf_path}: {e}")
        # Restore backup if something went wrong
        if os.path.exists(backup_path):
            try:
                with open(backup_path, 'r') as f:
                    original = f.read()
                with open(named_conf_path, 'w') as f:
                    f.write(original)
                print(f"Restored original content from backup")
            except Exception as restore_error:
                print(f"Failed to restore backup: {restore_error}")
        return False

def main():
    """Main function to run the cleanup"""
    
    # Default paths for different environments
    possible_paths = [
        '/etc/bind/named.conf.local',  # Standard Linux path
        '/usr/local/etc/named.conf.local',  # FreeBSD/alternative path
        'backend/bind/conf/named.conf.local',  # Development path (relative)
    ]
    
    # Check if path is provided as argument
    if len(sys.argv) > 1:
        named_conf_path = sys.argv[1]
    else:
        # Try to find the file in common locations
        named_conf_path = None
        for path in possible_paths:
            if os.path.exists(path):
                named_conf_path = path
                break
        
        if not named_conf_path:
            print("Could not find named.conf.local file in standard locations:")
            for path in possible_paths:
                print(f"  - {path}")
            print("\nPlease provide the path as an argument:")
            print(f"  python {sys.argv[0]} /path/to/named.conf.local")
            return False
    
    print(f"Cleaning up named.conf.local file: {named_conf_path}")
    return cleanup_named_conf_local(named_conf_path)

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)

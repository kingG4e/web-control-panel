#!/usr/bin/env python3
"""
Debug script to understand why zone removal is removing wrong content
"""
import tempfile
import re

def debug_zone_removal_logic():
    """Debug the zone removal logic step by step"""
    
    # Test content similar to what you had
    test_content = '''// Local zones go here.
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
    
    domain_name = "d.com"
    
    print("=== DEBUGGING ZONE REMOVAL ===")
    print("Original content:")
    print(repr(test_content))
    print("\nFormatted:")
    print(test_content)
    print("=" * 50)
    
    # Test our current logic
    print("Testing current logic from bind_service.py:")
    
    # Remove block comments first
    content = re.sub(r'/\*.*?\*/', '', test_content, flags=re.DOTALL)
    print("After removing block comments:")
    print(repr(content))
    
    # Use line-by-line parsing for reliable zone removal
    lines = content.split('\n')
    result_lines = []
    skip_block = False
    brace_count = 0
    
    print("\nProcessing line by line:")
    for i, line in enumerate(lines):
        line_info = f"Line {i+1}: '{line}'"
        
        # Check if this line starts the zone we want to remove (exact match)
        zone_start_pattern = rf'zone\s+"{re.escape(domain_name)}"\s*\{{'
        if re.search(zone_start_pattern, line):
            print(f"{line_info} -> ZONE START FOUND! Starting skip_block")
            skip_block = True
            brace_count = line.count('{') - line.count('}')
            print(f"  Initial brace_count: {brace_count}")
            continue
        
        if skip_block:
            brace_count += line.count('{') - line.count('}')
            print(f"{line_info} -> INSIDE ZONE, brace_count: {brace_count}")
            # End of zone block when braces are balanced and we see closing
            if brace_count <= 0 and ('}' in line and ';' in line):
                print(f"  ZONE END FOUND! Stopping skip_block")
                skip_block = False
                continue
            # Still inside zone block
            continue
        
        # Keep all lines that are not part of the target zone
        print(f"{line_info} -> KEEPING")
        result_lines.append(line)
    
    result_content = '\n'.join(result_lines)
    
    print("\nFinal result:")
    print(repr(result_content))
    print("\nFormatted result:")
    print(result_content)
    
    # Check what zones remain
    remaining_zones = re.findall(r'zone\s+"([^"]+)"\s*\{', result_content)
    print(f"\nRemaining zones: {remaining_zones}")
    
    if "webtest.com" in remaining_zones and "d.com" not in remaining_zones:
        print("✅ SUCCESS: Logic works correctly!")
        return True
    else:
        print("❌ FAILURE: Logic has issues!")
        return False

if __name__ == '__main__':
    debug_zone_removal_logic()

#!/usr/bin/env python3
"""
Migration script to add missing nameserver records to existing DNS zones.
This ensures all zones have editable NS records in the database.
"""

import sys
import os

# Add parent directory to path to import models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.dns import DNSZone, DNSRecord, db
from app import create_app

def migrate_nameserver_records():
    """Add missing nameserver records to existing DNS zones"""
    app = create_app()
    
    with app.app_context():
        try:
            # Get all DNS zones
            zones = DNSZone.query.all()
            updated_zones = 0
            
            for zone in zones:
                # Check if zone already has NS records
                existing_ns_records = DNSRecord.query.filter_by(
                    zone_id=zone.id,
                    record_type='NS'
                ).all()
                
                if len(existing_ns_records) == 0:
                    print(f"Adding nameserver records for zone: {zone.domain_name}")
                    
                    # Add NS records
                    ns_records = [
                        DNSRecord(
                            zone_id=zone.id,
                            name='@',
                            record_type='NS',
                            content=f'ns1.{zone.domain_name}.',
                            ttl=3600,
                            status='active'
                        ),
                        DNSRecord(
                            zone_id=zone.id,
                            name='@',
                            record_type='NS',
                            content=f'ns2.{zone.domain_name}.',
                            ttl=3600,
                            status='active'
                        )
                    ]
                    
                    for record in ns_records:
                        db.session.add(record)
                    
                    # Check if ns1 and ns2 A records exist
                    ns1_record = DNSRecord.query.filter_by(
                        zone_id=zone.id,
                        name='ns1',
                        record_type='A'
                    ).first()
                    
                    ns2_record = DNSRecord.query.filter_by(
                        zone_id=zone.id,
                        name='ns2',
                        record_type='A'
                    ).first()
                    
                    # Add missing nameserver A records
                    if not ns1_record:
                        ns1_a_record = DNSRecord(
                            zone_id=zone.id,
                            name='ns1',
                            record_type='A',
                            content='127.0.0.1',  # Default IP, should be updated to actual nameserver IP
                            ttl=3600,
                            status='active'
                        )
                        db.session.add(ns1_a_record)
                        print(f"  Added ns1 A record for {zone.domain_name}")
                    
                    if not ns2_record:
                        ns2_a_record = DNSRecord(
                            zone_id=zone.id,
                            name='ns2',
                            record_type='A',
                            content='127.0.0.1',  # Default IP, should be updated to actual nameserver IP
                            ttl=3600,
                            status='active'
                        )
                        db.session.add(ns2_a_record)
                        print(f"  Added ns2 A record for {zone.domain_name}")
                    
                    updated_zones += 1
                    
                else:
                    print(f"Zone {zone.domain_name} already has {len(existing_ns_records)} NS records")
            
            # Commit all changes
            db.session.commit()
            print(f"\nMigration completed successfully!")
            print(f"Updated {updated_zones} zones with nameserver records")
            
            if updated_zones > 0:
                print("\nIMPORTANT: Please update the nameserver IP addresses in the DNS management interface")
                print("to point to your actual nameserver IP instead of 127.0.0.1")
            
        except Exception as e:
            db.session.rollback()
            print(f"Migration failed: {str(e)}")
            return False
    
    return True

if __name__ == '__main__':
    print("Starting nameserver records migration...")
    success = migrate_nameserver_records()
    if success:
        print("Migration completed successfully!")
        sys.exit(0)
    else:
        print("Migration failed!")
        sys.exit(1)

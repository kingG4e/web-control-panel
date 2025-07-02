#!/usr/bin/env python3
"""
Script to check existing VirtualHosts and EmailDomains
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models.database import db
from models.email import EmailDomain, EmailAccount
from models.virtual_host import VirtualHost
from models.user import User
from app import app

def check_data():
    """Check existing data in database"""
    
    with app.app_context():
        try:
            print("=== USERS ===")
            users = User.query.all()
            for user in users:
                print(f"User ID: {user.id}, Username: {user.username}, Email: {user.email}")
            
            print("\n=== VIRTUAL HOSTS ===")
            virtual_hosts = VirtualHost.query.all()
            for vh in virtual_hosts:
                print(f"VH ID: {vh.id}, Domain: {vh.domain}, User ID: {vh.user_id}, Linux User: {vh.linux_username}")
            
            print("\n=== EMAIL DOMAINS ===")
            email_domains = EmailDomain.query.all()
            for ed in email_domains:
                print(f"ED ID: {ed.id}, Domain: {ed.domain}, VH ID: {ed.virtual_host_id}")
            
            print("\n=== EMAIL ACCOUNTS ===")
            email_accounts = EmailAccount.query.all()
            for ea in email_accounts:
                domain = EmailDomain.query.get(ea.domain_id)
                print(f"EA ID: {ea.id}, Username: {ea.username}, Domain: {domain.domain if domain else 'None'}, Email: {ea.username}@{domain.domain if domain else 'None'}")
            
        except Exception as e:
            print(f"✗ Error: {str(e)}")
            raise

if __name__ == '__main__':
    check_data() 
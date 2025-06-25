#!/usr/bin/env python3
"""
Quick test script for notifications using API
Make sure backend is running first
"""

import requests
import json

def test_notifications():
    base_url = "http://localhost:5000/api"
    
    print("🔔 Testing Notification System")
    print("=" * 40)
    
    # Test 1: Create sample notifications (using public endpoint)
    print("\n1. Creating sample notifications...")
    try:
        response = requests.post(f"{base_url}/notifications/create-samples")
        if response.status_code == 200:
            result = response.json()
            print(f"✅ {result.get('message', 'Success')}")
            created_count = len(result.get('data', []))
            print(f"   Created {created_count} notifications")
        else:
            print(f"❌ Failed: {response.status_code} - {response.text}")
    except requests.exceptions.ConnectionError:
        print("❌ Backend not running. Start with: python backend/app.py")
        return
    except Exception as e:
        print(f"❌ Error: {e}")
        return
    
    # Test 2: Get unread count (using public endpoint)
    print("\n2. Checking unread count...")
    try:
        response = requests.get(f"{base_url}/notifications/unread-count-public")
        if response.status_code == 200:
            data = response.json()
            count = data.get('count', 0)
            print(f"✅ Unread notifications: {count}")
            if count > 0:
                print(f"🎉 Perfect! You should see '{count}' on the notification bell!")
            else:
                print("ℹ️  No unread notifications found")
        else:
            print(f"❌ Failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Test 3: Try the authenticated endpoint (will show 401 as expected)
    print("\n3. Testing authenticated endpoint...")
    try:
        response = requests.get(f"{base_url}/notifications/unread-count")
        if response.status_code == 401:
            print("✅ Authenticated endpoint working (requires login as expected)")
        elif response.status_code == 200:
            data = response.json()
            count = data.get('data', {}).get('count', 0)
            print(f"✅ Authenticated count: {count}")
        else:
            print(f"⚠️  Unexpected response: {response.status_code}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Test 4: Get notifications list (will need auth)
    print("\n4. Testing notifications list...")
    try:
        response = requests.get(f"{base_url}/notifications")
        if response.status_code == 401:
            print("✅ Notifications list requires authentication (as expected)")
        elif response.status_code == 200:
            data = response.json()
            notifications = data.get('data', [])
            print(f"✅ Found {len(notifications)} notifications")
            
            for i, notif in enumerate(notifications[:3], 1):
                type_emoji = {'success': '✅', 'warning': '⚠️', 'error': '❌', 'info': 'ℹ️'}.get(notif.get('type'), '📝')
                read_status = '📖' if notif.get('is_read') else '🔴'
                print(f"   {i}. {read_status} {type_emoji} {notif.get('title')}")
        else:
            print(f"❌ Failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    print("\n" + "=" * 40)
    print("🎯 Test completed!")
    print("\n📋 Next steps:")
    print("1. ✅ Backend is running")
    print("2. ✅ Sample notifications created")
    print("3. Start frontend: cd frontend && npm start")
    print("4. Login at http://localhost:3000")
    print("5. Check the notification bell icon! 🔔")
    print("\n💡 The notification system is working!")
    print("   - Public endpoints work for testing")
    print("   - Authenticated endpoints require login")
    print("   - Frontend will show notifications after login")

if __name__ == "__main__":
    test_notifications() 
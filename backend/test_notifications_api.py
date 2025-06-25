#!/usr/bin/env python3
"""
Simple test script to test notification API endpoints
Make sure backend is running on localhost:5000
"""

import requests
import json

BASE_URL = "http://localhost:5000/api"

def test_notification_endpoints():
    """Test notification API endpoints"""
    
    print("🧪 Testing Notification API Endpoints")
    print("=" * 50)
    
    # Test create sample notifications endpoint
    print("\n1. Creating sample notifications...")
    try:
        response = requests.post(f"{BASE_URL}/notifications/create-samples")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Success: {data.get('message', 'Sample notifications created')}")
        else:
            print(f"❌ Failed to create samples: {response.status_code} - {response.text}")
    except requests.exceptions.ConnectionError:
        print("❌ Connection error: Make sure backend is running on localhost:5000")
        return
    except Exception as e:
        print(f"❌ Error: {e}")
        return
    
    # Test get unread count (no auth needed for this endpoint)
    print("\n2. Getting unread notification count...")
    try:
        response = requests.get(f"{BASE_URL}/notifications/unread-count")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Unread count: {data.get('count', 0)}")
        else:
            print(f"❌ Failed to get unread count: {response.status_code}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Test get notifications (this might need auth)
    print("\n3. Getting notifications list...")
    try:
        response = requests.get(f"{BASE_URL}/notifications")
        if response.status_code == 200:
            data = response.json()
            notifications = data.get('notifications', [])
            print(f"✅ Found {len(notifications)} notifications")
            
            # Show first few notifications
            for i, notif in enumerate(notifications[:3]):
                print(f"   {i+1}. {notif.get('title')} ({notif.get('type')})")
                
        elif response.status_code == 401:
            print("⚠️  Authentication required for this endpoint")
        else:
            print(f"❌ Failed to get notifications: {response.status_code}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    print("\n" + "=" * 50)
    print("🎯 Test completed!")
    print("\nTo see notifications in the web interface:")
    print("1. Start the backend: python app.py")
    print("2. Start the frontend: npm start")
    print("3. Login and check the notification bell icon")

if __name__ == "__main__":
    test_notification_endpoints() 
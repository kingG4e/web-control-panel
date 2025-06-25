#!/usr/bin/env python3
"""
Simple script to start the backend server
"""
import os
import sys
import subprocess

def start_backend():
    """Start the backend server"""
    print("🚀 Starting Web Control Panel Backend...")
    
    # Change to backend directory
    backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
    if os.path.exists(backend_dir):
        os.chdir(backend_dir)
        print(f"📁 Changed to directory: {backend_dir}")
    else:
        print("❌ Backend directory not found!")
        return False
    
    # Check if app.py exists
    if not os.path.exists('app.py'):
        print("❌ app.py not found in backend directory!")
        return False
    
    try:
        print("🔧 Starting Flask application...")
        print("📡 Server will be available at: http://192.168.1.174:5000")
        print("🌐 Frontend should connect to this URL")
        print("⏹️  Press Ctrl+C to stop the server")
        print("-" * 50)
        
        # Start the Flask app
        subprocess.run([sys.executable, 'app.py'], check=True)
        
    except KeyboardInterrupt:
        print("\n⏹️  Server stopped by user")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Error starting server: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

if __name__ == '__main__':
    success = start_backend()
    sys.exit(0 if success else 1) 
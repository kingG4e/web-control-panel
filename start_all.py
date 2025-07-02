#!/usr/bin/env python3
"""
Script to start both backend and frontend servers
"""
import os
import sys
import subprocess
import time
import threading
import signal

def start_backend():
    """Start the backend server"""
    print("🚀 Starting Backend Server...")
    backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
    
    if not os.path.exists(backend_dir):
        print("❌ Backend directory not found!")
        return False
    
    try:
        os.chdir(backend_dir)
        print("📁 Changed to backend directory")
        
        # Start Flask app
        subprocess.run([sys.executable, 'app.py'], check=True)
        
    except KeyboardInterrupt:
        print("\n⏹️  Backend stopped")
        return True
    except Exception as e:
        print(f"❌ Backend error: {e}")
        return False

def start_frontend():
    """Start the frontend server"""
    print("🌐 Starting Frontend Server...")
    frontend_dir = os.path.join(os.path.dirname(__file__), 'frontend')
    
    if not os.path.exists(frontend_dir):
        print("❌ Frontend directory not found!")
        return False
    
    try:
        os.chdir(frontend_dir)
        print("📁 Changed to frontend directory")
        
        # Check if node_modules exists
        if not os.path.exists('node_modules'):
            print("📦 Installing dependencies...")
            subprocess.run(['npm', 'install'], check=True)
        
        # Start React app
        subprocess.run(['npm', 'start'], check=True)
        
    except KeyboardInterrupt:
        print("\n⏹️  Frontend stopped")
        return True
    except Exception as e:
        print(f"❌ Frontend error: {e}")
        return False

def check_ports():
    """Check if ports are available"""
    import socket
    
    def is_port_open(port):
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        result = sock.connect_ex(('127.0.0.1', port))
        sock.close()
        return result == 0
    
    backend_running = is_port_open(5000)
    frontend_running = is_port_open(3000)
    
    print(f"🔍 Port Check:")
    print(f"   Backend (5000): {'✅ Running' if backend_running else '❌ Available'}")
    print(f"   Frontend (3000): {'✅ Running' if frontend_running else '❌ Available'}")
    
    return backend_running, frontend_running

def main():
    print("🌟 Web Control Panel - Start All Services")
    print("=" * 50)
    
    # Check current status
    backend_running, frontend_running = check_ports()
    
    if backend_running and frontend_running:
        print("\n✅ Both services are already running!")
        print("🌐 Frontend: http://192.168.1.174:3000")
        print("🔧 Backend: http://192.168.1.174:5000")
        print("🌍 Apache Redirect: http://192.168.1.174")
        return True
    
    print("\n📋 Starting services...")
    print("1. Backend will start on port 5000")
    print("2. Frontend will start on port 3000")
    print("3. Apache redirect is already configured on port 80")
    print("\n⏹️  Press Ctrl+C to stop all services")
    print("-" * 50)
    
    try:
        # Start backend in a separate thread
        if not backend_running:
            backend_thread = threading.Thread(target=start_backend, daemon=True)
            backend_thread.start()
            time.sleep(3)  # Give backend time to start
        
        # Start frontend in main thread
        if not frontend_running:
            start_frontend()
        else:
            print("✅ Frontend already running, keeping alive...")
            try:
                while True:
                    time.sleep(1)
            except KeyboardInterrupt:
                pass
    
    except KeyboardInterrupt:
        print("\n\n⏹️  Stopping all services...")
        print("✅ Services stopped successfully")
        return True
    except Exception as e:
        print(f"\n❌ Error: {e}")
        return False

if __name__ == '__main__':
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n⏹️  Interrupted by user")
        sys.exit(0) 
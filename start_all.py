#!/usr/bin/env python3
"""
Startup script for Web Control Panel
Automatically detects IP address and starts both backend and frontend
"""

import os
import sys
import subprocess
import socket
import time
import threading
from pathlib import Path

def get_local_ip():
    """Get the local IP address of the machine"""
    try:
        # Connect to a remote address to get local IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        return local_ip
    except Exception:
        # Fallback to localhost
        return "127.0.0.1"

def get_available_port(start_port=3000):
    """Get an available port starting from start_port"""
    for port in range(start_port, start_port + 100):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(('', port))
                return port
        except OSError:
            continue
    return start_port

def start_backend():
    """Start the Flask backend server"""
    print("🚀 Starting Backend Server...")
    backend_dir = Path("backend")
    
    if not backend_dir.exists():
        print("❌ Backend directory not found!")
        return False
    
    try:
        # Change to backend directory
        os.chdir(backend_dir)
        
        # Set environment variables
        env = os.environ.copy()
        env['FLASK_ENV'] = 'development'
        env['FLASK_DEBUG'] = 'True'
        
        # Start Flask app
        process = subprocess.Popen([
            sys.executable, "app.py"
        ], env=env)
        
        print(f"✅ Backend started on http://0.0.0.0:5000")
        return process
        
    except Exception as e:
        print(f"❌ Failed to start backend: {e}")
        return False

def start_frontend():
    """Start the React frontend development server"""
    print("🚀 Starting Frontend Server...")
    frontend_dir = Path("frontend")
    
    if not frontend_dir.exists():
        print("❌ Frontend directory not found!")
        return False
    
    try:
        # Change to frontend directory
        os.chdir(frontend_dir)
        
        # Set environment variables
        env = os.environ.copy()
        local_ip = get_local_ip()
        env['REACT_APP_API_URL'] = f"http://{local_ip}:5000"
        env['PORT'] = str(get_available_port(3000))
        
        # Start React development server
        process = subprocess.Popen([
            "npm", "start"
        ], env=env)
        
        print(f"✅ Frontend started on http://{local_ip}:{env['PORT']}")
        return process
        
    except Exception as e:
        print(f"❌ Failed to start frontend: {e}")
        return False

def main():
    """Main function to start both servers"""
    print("🌐 Web Control Panel - Startup Script")
    print("=" * 50)
    
    # Get local IP
    local_ip = get_local_ip()
    print(f"📍 Local IP Address: {local_ip}")
    
    # Store original directory
    original_dir = os.getcwd()
    
    try:
        # Start backend
        backend_process = start_backend()
        if not backend_process:
            return
        
        # Wait a bit for backend to start
        time.sleep(3)
        
        # Change back to original directory
        os.chdir(original_dir)
        
        # Start frontend
        frontend_process = start_frontend()
        if not frontend_process:
            backend_process.terminate()
            return
        
        print("\n🎉 Both servers started successfully!")
        print(f"📱 Backend:  http://{local_ip}:5000")
        print(f"🌐 Frontend: http://{local_ip}:3000")
        print("\n💡 Tips:")
        print(f"   - Access from other devices using: http://{local_ip}:3000")
        print("   - Press Ctrl+C to stop both servers")
        print("   - Backend API docs: http://localhost:5000/api/health")
        
        # Wait for processes to complete
        try:
            backend_process.wait()
        except KeyboardInterrupt:
            print("\n🛑 Stopping servers...")
            backend_process.terminate()
            frontend_process.terminate()
            print("✅ Servers stopped")
            
    except KeyboardInterrupt:
        print("\n🛑 Interrupted by user")
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        # Change back to original directory
        os.chdir(original_dir)

if __name__ == "__main__":
    main() 
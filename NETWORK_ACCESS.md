# 🌐 Network Access Guide

## 📋 Overview

This guide explains how to access the Web Control Panel from any device on your local network.

## 🚀 Quick Start

### Option 1: Automatic Startup (Recommended)
```bash
python start_all.py
```

This script will:
- Automatically detect your local IP address
- Start both backend and frontend servers
- Display access URLs for all devices

### Option 2: Manual Startup

#### Backend (Flask)
```bash
cd backend
python app.py
```

#### Frontend (React)
```bash
cd frontend
npm start
```

## 🌍 Access URLs

### Local Machine
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

### Other Devices on Network
- **Frontend**: http://[YOUR_IP]:3000
- **Backend API**: http://[YOUR_IP]:5000

### Find Your IP Address

#### Windows
```cmd
ipconfig
```

#### macOS/Linux
```bash
ifconfig
# or
ip addr show
```

## 🔧 Configuration

### Backend Configuration
The backend is configured to accept connections from any IP in your local network:

```python
# backend/config.py
CORS_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000", 
    "http://192.168.1.174:3000",
    "http://0.0.0.0:3000",
    # Allow any IP in local network
    "http://192.168.0.0/16",
    "http://10.0.0.0/8", 
    "http://172.16.0.0/12"
]
```

### Frontend Configuration
The frontend automatically detects the server IP and configures API calls accordingly.

## 🔒 Security Considerations

### Development Environment
- CORS is configured to allow local network access
- No authentication required for local development
- Debug mode is enabled

### Production Environment
1. **Set up proper authentication**
2. **Configure HTTPS**
3. **Restrict CORS origins**
4. **Use environment variables**

```bash
# Production environment variables
export FLASK_ENV=production
export FLASK_DEBUG=False
export SECRET_KEY=your-secure-secret-key
```

## 🛠️ Troubleshooting

### Can't Access from Other Devices?

1. **Check Firewall Settings**
   ```bash
   # Windows - Allow Python through firewall
   # macOS - System Preferences > Security & Privacy > Firewall
   # Linux - Check iptables/ufw
   ```

2. **Check Network Configuration**
   - Ensure devices are on the same network
   - Check if router blocks local connections

3. **Verify Ports are Open**
   ```bash
   # Check if ports are listening
   netstat -an | grep :3000
   netstat -an | grep :5000
   ```

4. **Test Connectivity**
   ```bash
   # From another device
   ping [YOUR_IP]
   telnet [YOUR_IP] 3000
   telnet [YOUR_IP] 5000
   ```

### Common Issues

#### "Connection Refused"
- Check if servers are running
- Verify port numbers
- Check firewall settings

#### "CORS Error"
- Ensure backend CORS is configured correctly
- Check if frontend is using correct API URL

#### "Page Not Found"
- Verify React Router configuration
- Check if static files are served correctly

## 📱 Mobile Access

### Android/iOS
- Use the same URL: http://[YOUR_IP]:3000
- Ensure mobile device is on the same WiFi network
- Some browsers may require HTTPS for certain features

### Responsive Design
The frontend is designed to work on:
- Desktop browsers
- Tablets
- Mobile phones

## 🔄 Environment Variables

### Frontend (.env file)
```bash
REACT_APP_API_URL=http://localhost:5000
REACT_APP_ENV=development
```

### Backend (Environment variables)
```bash
FLASK_ENV=development
FLASK_DEBUG=True
SECRET_KEY=your-secret-key
```

## 📊 Monitoring

### Health Check
```bash
curl http://[YOUR_IP]:5000/api/health
```

### Logs
- Backend logs: Check console output
- Frontend logs: Check browser developer tools
- Network logs: Check browser Network tab

## 🚀 Production Deployment

For production deployment:

1. **Use a proper WSGI server**
   ```bash
   pip install gunicorn
   gunicorn -w 4 -b 0.0.0.0:5000 app:app
   ```

2. **Set up reverse proxy (nginx)**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://127.0.0.1:3000;
       }
       
       location /api {
           proxy_pass http://127.0.0.1:5000;
       }
   }
   ```

3. **Configure SSL/TLS**
4. **Set up proper authentication**
5. **Configure monitoring and logging**

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review server logs for error messages
3. Verify network configuration
4. Test with different devices/browsers 
# Web Control Panel - Deployment Guide

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- MySQL/MariaDB
- Apache/Nginx (optional)

### Backend Setup

1. **Install Dependencies**
```bash
cd backend
pip install -r requirements.txt
```

2. **Configure Environment**
```bash
# Set environment variables
export FLASK_ENV=production
export SECRET_KEY=your-secret-key-here
export DATABASE_URL=mysql://user:password@localhost/webcontrol
export FILE_MANAGER_ROOT=/var/www
```

3. **Initialize Database**
```bash
python recreate_db.py
```

4. **Start Backend**
```bash
python app.py
```

### Frontend Setup

1. **Install Dependencies**
```bash
cd frontend
npm install
```

2. **Configure Environment**
```bash
# Copy and edit environment file
cp env.example .env
# Edit .env with your API URL
```

3. **Build for Production**
```bash
npm run build
```

4. **Serve Frontend**
```bash
# Using serve
npm install -g serve
serve -s build -p 3000

# Or configure with Apache/Nginx
```

## 🔧 Configuration

### API URL Configuration
The frontend automatically detects the API URL in this order:
1. `process.env.REACT_APP_API_URL`
2. `window.REACT_APP_API_URL`
3. Fallback: `http://192.168.1.174:5000`

### Backend Configuration
- Default port: 5000
- CORS enabled for frontend domains
- JWT authentication required for protected routes

## 🔒 Security

### Production Checklist
- [ ] Change default SECRET_KEY
- [ ] Use HTTPS in production
- [ ] Configure proper CORS origins
- [ ] Set up firewall rules
- [ ] Enable rate limiting
- [ ] Configure secure file permissions

### File Manager Security
- Path sanitization enabled
- Safe path validation
- User-specific directory access
- File type restrictions

## 📊 Features

### ✅ Working Features
- JWT Authentication
- Virtual Host Management
- File Management
- User Management (Admin)
- FTP Account Management
- DNS Management
- Email Management
- SSL Certificate Management
- Database Management
- System Monitoring

### 🔧 Development Mode Features
- Windows compatibility
- Mock services for development
- Fallback authentication

## 🐛 Troubleshooting

### Common Issues

1. **Backend not starting**
   - Check Python version (3.8+)
   - Verify all dependencies installed
   - Check port 5000 availability

2. **Frontend API errors**
   - Verify backend is running
   - Check API URL configuration
   - Verify CORS settings

3. **File Manager not working**
   - Check file permissions
   - Verify FILE_MANAGER_ROOT path
   - Ensure user authentication

4. **Database errors**
   - Verify database connection
   - Run database migrations
   - Check user permissions

### Log Locations
- Backend: Console output
- Frontend: Browser console
- System: Check system logs for service issues

## 📈 Monitoring

### Health Checks
- Backend: `GET /api/system/status`
- Frontend: Application loads successfully
- Database: Connection test in backend

### Performance
- Monitor system resources via dashboard
- Check API response times
- Monitor file system usage

## 🔄 Updates

### Backend Updates
1. Stop backend service
2. Pull latest code
3. Install new dependencies
4. Run database migrations
5. Restart service

### Frontend Updates
1. Pull latest code
2. Install new dependencies
3. Build new version
4. Deploy to web server

## 📞 Support

For issues and support:
1. Check logs for error messages
2. Verify configuration
3. Test individual components
4. Check network connectivity 
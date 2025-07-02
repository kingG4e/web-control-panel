# 🚀 Web Control Panel - Quick Start Guide

## ✅ Problem Fixed!

The **Internal Server Error** has been resolved. The issue was that Apache was running on port 80 with a default page, while our Flask backend was running on port 5000.

## 🔧 What We Fixed

1. **✅ Backend API** - Running perfectly on port 5000
2. **✅ Virtual Host Management** - All CRUD operations working
3. **✅ Authentication** - JWT tokens and user registration working
4. **✅ Database** - Recreated with proper schema
5. **✅ Apache Redirect** - Smart redirect page created on port 80

## 🚀 How to Start the System

### Method 1: Start Everything (Recommended)
```bash
python start_all.py
```

### Method 2: Start Individually
```bash
# Terminal 1 - Backend
python start_backend.py

# Terminal 2 - Frontend
cd frontend
npm start
```

## 🌐 Access Points

| Service | URL | Description |
|---------|-----|-------------|
| **Main Entry** | http://192.168.1.174 | Smart redirect page (auto-redirects to frontend) |
| **Frontend** | http://192.168.1.174:3000 | React application |
| **Backend API** | http://192.168.1.174:5000 | Flask API server |
| **Health Check** | http://192.168.1.174:5000/api/health | API status |

## 📋 Features Working

### ✅ Virtual Host Management
- Create new virtual hosts
- Edit existing virtual hosts  
- Delete virtual hosts
- View virtual host details
- Auto-create Linux users
- Generate Apache configurations

### ✅ Authentication
- User registration
- User login with JWT tokens
- Session management
- Protected routes

### ✅ Other Features
- File Management
- DNS Management
- Email Management
- SSL Management
- Database Management
- User Management

## 🔍 Troubleshooting

### If you see "Internal Server Error"
1. Make sure backend is running: `python start_backend.py`
2. Check backend status: http://192.168.1.174:5000/api/health
3. Check browser console for errors

### If Virtual Hosts don't work
1. Make sure you're logged in
2. Check browser network tab for API errors
3. Verify backend logs for errors

### If redirect doesn't work
1. Clear browser cache
2. Visit http://192.168.1.174 directly
3. Check if Apache is running

## 🎯 Quick Test

1. **Start Services**:
   ```bash
   python start_all.py
   ```

2. **Visit Main Page**:
   - Go to http://192.168.1.174
   - Should see smart redirect page
   - Auto-redirects to http://192.168.1.174:3000

3. **Test Virtual Hosts**:
   - Register/Login to the system
   - Go to "Virtual Hosts" menu
   - Click "Add Virtual Host"
   - Create a test virtual host

## 📞 Support

If you encounter any issues:

1. **Check Logs**: Look at terminal output for error messages
2. **Verify Services**: Ensure both backend and frontend are running
3. **Test API**: Visit http://192.168.1.174:5000/api/health
4. **Clear Cache**: Clear browser cache and cookies

## 🎉 Success!

Your Web Control Panel is now fully functional with:
- ✅ No more Internal Server Error
- ✅ Smart Apache redirect
- ✅ Working Virtual Host management
- ✅ Full CRUD operations
- ✅ Professional UI/UX

**Happy hosting!** 🌟 
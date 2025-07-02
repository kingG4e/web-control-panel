# 🌍 Environment Setup Guide

## 📋 Overview

This guide explains how to configure the frontend environment for different deployment scenarios.

## 🔧 Environment Variables

### Required Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `REACT_APP_API_URL` | Backend API URL | Auto-detected | `http://localhost:5000` |
| `REACT_APP_ENV` | Environment name | `development` | `production` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Frontend port | `3000` |
| `HTTPS` | Enable HTTPS | `false` |

## 🚀 Quick Start

### Development (Local)
```bash
# Start with default settings
npm start

# Start with custom API URL
REACT_APP_API_URL=http://192.168.1.100:5000 npm start
```

### Development (Network Access)
```bash
# Start for network access
npm run start:network

# Or with custom API URL
REACT_APP_API_URL=http://192.168.1.100:5000 npm start
```

### Production
```bash
# Build for production
npm run build

# Set production API URL
REACT_APP_API_URL=https://api.yourdomain.com npm run build
```

## 📁 Environment Files

### .env (Local Development)
```bash
REACT_APP_API_URL=http://localhost:5000
REACT_APP_ENV=development
```

### .env.development (Development)
```bash
REACT_APP_API_URL=http://localhost:5000
REACT_APP_ENV=development
```

### .env.production (Production)
```bash
REACT_APP_API_URL=https://api.yourdomain.com
REACT_APP_ENV=production
```

## 🔄 API URL Detection

The application automatically detects the API URL in this order:

1. **Environment Variable**: `REACT_APP_API_URL`
2. **Development Mode**: Current hostname + port 5000
3. **Fallback**: `http://localhost:5000`

### Examples

| Scenario | Detected URL |
|----------|-------------|
| Local development | `http://localhost:5000` |
| Network access | `http://192.168.1.100:5000` |
| Production | `https://api.yourdomain.com` |

## 🛠️ Configuration Utility

The application uses a configuration utility (`src/utils/config.js`) that provides:

```javascript
import { getApiUrl, getEnvironment, getConfig } from '../utils/config';

// Get API URL
const apiUrl = getApiUrl();

// Get environment
const env = getEnvironment();

// Get full config
const config = getConfig();
```

## 📱 Network Access

### For Other Devices

1. **Find your IP address:**
   ```bash
   # Windows
   ipconfig
   
   # macOS/Linux
   ifconfig
   ```

2. **Start frontend with network access:**
   ```bash
   npm run start:network
   ```

3. **Access from other devices:**
   ```
   http://[YOUR_IP]:3000
   ```

### Troubleshooting

#### CORS Errors
- Ensure backend CORS is configured correctly
- Check if API URL matches backend CORS origins

#### Connection Refused
- Verify backend is running on correct port
- Check firewall settings
- Ensure devices are on same network

## 🔒 Security

### Development
- CORS allows local network access
- No authentication required
- Debug mode enabled

### Production
- Restrict CORS origins
- Enable authentication
- Use HTTPS
- Set secure environment variables

## 📊 Monitoring

### Environment Information
```javascript
// Check current configuration
console.log(getConfig());
```

### API Health Check
```bash
curl [API_URL]/api/health
```

## 🚀 Deployment

### Docker
```dockerfile
# Set environment variables
ENV REACT_APP_API_URL=https://api.yourdomain.com
ENV REACT_APP_ENV=production
```

### Nginx
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        root /var/www/html;
        try_files $uri $uri/ /index.html;
    }
}
```

### Environment Variables in Production
```bash
# Set production variables
export REACT_APP_API_URL=https://api.yourdomain.com
export REACT_APP_ENV=production

# Build application
npm run build
```

## 📞 Support

For issues with environment configuration:

1. Check environment variables are set correctly
2. Verify API URL is accessible
3. Check browser console for errors
4. Review network requests in browser dev tools 
# Virtual Hosts Management Guide

## ✅ การตรวจสอบและใช้งาน Virtual Hosts API

### 🛠️ การแก้ไขที่ทำแล้ว

1. **Backend Improvements:**
   - ✅ เพิ่ม development mode ใน `ApacheService` สำหรับ Windows
   - ✅ แก้ไข `LinuxUserService` ให้รองรับ Windows development
   - ✅ Virtual Host routes มี CRUD operations ครบ
   - ✅ Authentication ใช้ JWT tokens
   - ✅ Error handling และ validation

2. **Frontend Improvements:**
   - ✅ ใช้ `VirtualHostManager` component แทนการ duplicate code
   - ✅ API service มี error handling ครบ
   - ✅ Routing configuration ถูกต้อง
   - ✅ Create และ Edit forms ทำงานได้

3. **Mock Data Cleanup:**
   - ✅ ลบ mock data ทั้งหมดแล้ว
   - ✅ ใช้ empty state เป็น default

---

## 🚀 การทดสอบ API

### 1. ใช้ Test Script

```bash
# ติดตั้ง requirements
pip install requests

# รัน test script
cd backend
python test_virtual_hosts.py
```

### 2. ทดสอบด้วย curl

```bash
# 1. Login และรับ token
curl -X POST http://192.168.1.174:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin"}'

# 2. ดึงรายการ Virtual Hosts (ใส่ token ที่ได้)
curl -X GET http://192.168.1.174:5000/api/virtual-hosts \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# 3. สร้าง Virtual Host ใหม่
curl -X POST http://192.168.1.174:5000/api/virtual-hosts \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "test.com",
    "linux_password": "password123",
    "server_admin": "admin@test.com",
    "php_version": "8.1"
  }'
```

---

## 🖥️ การใช้งาน Frontend

### 1. เข้าสู่ระบบ
- ไปที่ `http://192.168.1.174:3000/login`
- ใช้ username: `admin`, password: `admin`

### 2. จัดการ Virtual Hosts
- ไปที่ Virtual Hosts section
- สามารถดู/สร้าง/แก้ไข/ลบ Virtual Hosts ได้

### 3. สร้าง Virtual Host ใหม่
- คลิก "Add Virtual Host"
- กรอกข้อมูล:
  - Domain name (เช่น `example.com`)
  - Linux password (อย่างน้อย 8 ตัวอักษร)
  - Server admin email (optional)
  - PHP version

---

## 📁 โครงสร้างไฟล์

### Backend Files:
```
backend/
├── routes/virtual_host.py          # API endpoints
├── models/virtual_host.py          # Database model
├── services/
│   ├── apache_service.py           # Apache config management
│   └── linux_user_service.py      # Linux user management
└── test_virtual_hosts.py          # Test script
```

### Frontend Files:
```
frontend/src/
├── pages/
│   ├── VirtualHosts.js            # Main page (uses VirtualHostManager)
│   ├── CreateVirtualHost.js       # Create form
│   └── EditVirtualHost.js         # Edit form
├── components/
│   └── VirtualHostManager.tsx     # Main component
└── services/
    └── api.ts                     # API calls
```

---

## 🔧 การพัฒนาต่อ

### Development Mode Features:
- **Windows Support**: ทำงานได้บน Windows โดยจำลองการสร้าง Linux users
- **Apache Simulation**: จำลองการสร้าง Apache virtual host configs
- **File Creation**: ยังคงสร้าง document root และไฟล์ index ได้

### Production Deployment:
- **Linux Server**: ต้องรันบน Linux server ที่มี Apache/Nginx
- **Permissions**: ต้องมีสิทธิ์ในการสร้าง users และแก้ไข Apache config
- **Security**: ตั้งค่า proper firewall และ SSL certificates

---

## 🐛 การแก้ไขปัญหาที่อาจเกิดขึ้น

### 1. Authentication Issues
```bash
# ตรวจสอบว่า login ได้หรือไม่
curl -X POST http://192.168.1.174:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin"}'
```

### 2. CORS Issues
- ตรวจสอบใน `backend/app.py` ว่า CORS settings ถูกต้อง
- Frontend URL ต้องอยู่ใน allowed origins

### 3. Database Issues
```bash
# ลบและสร้าง database ใหม่
cd backend
python recreate_db.py
```

### 4. Port Conflicts
- Backend: `http://192.168.1.174:5000`
- Frontend: `http://192.168.1.174:3000`

---

## 📊 API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/virtual-hosts` | ดึงรายการ Virtual Hosts ทั้งหมด |
| POST | `/api/virtual-hosts` | สร้าง Virtual Host ใหม่ |
| GET | `/api/virtual-hosts/{id}` | ดึงข้อมูล Virtual Host เฉพาะตัว |
| PUT | `/api/virtual-hosts/{id}` | แก้ไข Virtual Host |
| DELETE | `/api/virtual-hosts/{id}` | ลบ Virtual Host |

### Request/Response Examples:

**Create Virtual Host:**
```json
// Request
{
  "domain": "example.com",
  "linux_password": "securepass123",
  "server_admin": "admin@example.com",
  "php_version": "8.1"
}

// Response
{
  "success": true,
  "data": {
    "id": 1,
    "domain": "example.com",
    "linux_username": "example",
    "document_root": "/home/example/public_html",
    "server_admin": "admin@example.com",
    "php_version": "8.1",
    "status": "active",
    "created_at": "2024-01-01T00:00:00",
    "user_id": 1
  }
}
```

---

## ✨ Features ที่ทำงานได้

1. **Authentication & Authorization** ✅
2. **Virtual Host CRUD Operations** ✅
3. **Linux User Management** ✅ (with Windows simulation)
4. **Apache Configuration** ✅ (with Windows simulation)
5. **Frontend UI** ✅
6. **Error Handling** ✅
7. **Validation** ✅
8. **Test Suite** ✅

---

## 🎯 ขั้นตอนถัดไป

1. **SSL Management**: เพิ่มการจัดการ SSL certificates
2. **Domain DNS**: เชื่อมต่อกับ DNS management
3. **File Manager Integration**: เชื่อมต่อกับ file manager
4. **Backup System**: เพิ่มระบบ backup
5. **Monitoring**: เพิ่มการ monitor performance

---

Virtual Hosts API พร้อมใช้งานแล้ว! 🎉 
# Control Panel

ระบบจัดการเซิร์ฟเวอร์แบบครบวงจร สำหรับจัดการ Virtual Hosts, DNS, ฐานข้อมูล, และการตั้งค่าระบบต่างๆ

## คุณสมบัติ

- ระบบจัดการ Virtual Hosts
- ระบบจัดการ DNS Zone และ Records
- ระบบจัดการฐานข้อมูล
- ระบบรักษาความปลอดภัย
- ระบบล็อกและติดตามการใช้งาน
- หน้าจอควบคุมที่ใช้งานง่าย

## ความต้องการของระบบ

- Linux (Ubuntu, Debian, CentOS, RHEL, Fedora, หรือ Arch Linux)
- RAM อย่างน้อย 1GB
- พื้นที่ว่างอย่างน้อย 5GB
- Python 3.8 หรือสูงกว่า
- Node.js 16 หรือสูงกว่า

## การติดตั้ง

### วิธีที่ 1: ติดตั้งอัตโนมัติ (แนะนำ)

1. ดาวน์โหลดและเข้าไปยังโฟลเดอร์:
```bash
git clone https://github.com/yourusername/controlpanel.git
cd controlpanel
```

2. รันสคริปต์ติดตั้ง:
```bash
chmod +x install.sh
sudo ./install.sh
```

สคริปต์จะดำเนินการ:
- ตรวจสอบระบบและความต้องการเบื้องต้น
- ติดตั้งแพ็คเกจที่จำเป็น (Nginx, MariaDB, Redis)
- ตั้งค่าสภาพแวดล้อม Python
- ติดตั้งและ Build หน้าเว็บ
- ตั้งค่าฐานข้อมูลและรหัสผ่าน
- สร้างและเริ่มบริการระบบ

### วิธีที่ 2: ติดตั้งด้วยตนเอง

สำหรับผู้ที่ต้องการควบคุมการติดตั้งเอง:

1. ติดตั้งแพ็คเกจที่จำเป็น:
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install python3-pip python3-venv nodejs npm nginx mariadb-server redis-server

# CentOS/RHEL/Fedora
sudo dnf install python3-pip python3-devel nodejs nginx mariadb-server redis

# Arch Linux
sudo pacman -Sy python python-pip nodejs npm nginx mariadb redis
```

2. ตั้งค่าสภาพแวดล้อม Python:
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

3. ตั้งค่าและ Build หน้าเว็บ:
```bash
cd frontend
npm install
npm run build
cd ..
```

4. ตั้งค่าฐานข้อมูล:
```bash
sudo systemctl start mariadb
sudo mysql -e "CREATE DATABASE controlpanel;"
sudo mysql -e "CREATE USER 'controlpanel'@'localhost' IDENTIFIED BY 'your_password';"
sudo mysql -e "GRANT ALL PRIVILEGES ON controlpanel.* TO 'controlpanel'@'localhost';"
```

5. สร้างไฟล์ .env:
```bash
cat > backend/.env << EOL
DB_HOST=localhost
DB_USER=controlpanel
DB_PASSWORD=your_password
DB_NAME=controlpanel
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET_KEY=$(openssl rand -hex 32)
EOL
```

## การใช้งาน

หลังจากติดตั้งเสร็จ:

1. เข้าใช้งานที่:
   - HTTP: `http://your-server:2080`
   - HTTPS: `https://your-server:2083`

2. ล็อกอินด้วยบัญชีเริ่มต้น:
   - Username: admin
   - Password: admin123

3. **สำคัญ**: ควรเปลี่ยนรหัสผ่านทันทีหลังจากล็อกอินครั้งแรก

## พอร์ตที่ใช้งาน

- HTTP: 2080
- HTTPS: 2083
- MariaDB: 3306
- Redis: 6379
- Backend API: 5000

## การถอนการติดตั้ง

1. ใช้สคริปต์ถอนการติดตั้งอัตโนมัติ:
```bash
sudo ./uninstall.sh
```

2. หรือใช้สคริปต์ลบด้วยตนเอง:
```bash
sudo ./remove_controlpanel.sh
```

## ความปลอดภัย

- รหัสผ่านทั้งหมดถูกเข้ารหัสด้วย bcrypt
- ใช้ JWT สำหรับการยืนยันตัวตน API
- มีระบบจำกัดการเรียกใช้งาน (Rate Limiting)
- มีการบันทึกการใช้งานระบบ (Audit Logging)
- มีการตรวจสอบและป้องกันการป้อนข้อมูลที่ไม่ปลอดภัย

## การแก้ไขปัญหา

1. ตรวจสอบสถานะบริการ:
```bash
sudo systemctl status controlpanel
sudo systemctl status nginx
sudo systemctl status mariadb
sudo systemctl status redis
```

2. ดูล็อกการทำงาน:
```bash
sudo journalctl -u controlpanel
sudo tail -f /var/log/nginx/error.log
```

3. ตรวจสอบการเชื่อมต่อ:
```bash
curl http://localhost:2080
curl http://localhost:5000/api/health
```

## การพัฒนา

สำหรับนักพัฒนา:

1. เริ่ม Backend ในโหมดพัฒนา:
```bash
source .venv/bin/activate
cd backend
FLASK_ENV=development python app.py
```

2. เริ่ม Frontend ในโหมดพัฒนา:
```bash
cd frontend
npm start
```

Frontend จะทำงานที่ `http://localhost:3000`

## License

โครงการนี้อยู่ภายใต้ MIT License - ดูรายละเอียดได้ที่ไฟล์ [LICENSE](LICENSE) 
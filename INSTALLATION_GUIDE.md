# คู่มือการติดตั้งและตั้งค่า Web Control Panel

## สารบัญ
1. [ความต้องการของระบบ](#ความต้องการของระบบ)
2. [การติดตั้งบน Linux](#การติดตั้งบน-linux)
3. [การตั้งค่าฐานข้อมูล](#การตั้งค่าฐานข้อมูล)
4. [การตั้งค่าบริการต่างๆ](#การตั้งค่าบริการต่างๆ)
5. [การตั้งค่า Frontend](#การตั้งค่า-frontend)
6. [การรันระบบ](#การรันระบบ)
7. [การตั้งค่า Production](#การตั้งค่า-production)

---

## ความต้องการของระบบ

### ฮาร์ดแวร์ขั้นต่ำ
- **CPU**: 2 Cores
- **RAM**: 4 GB
- **Storage**: 20 GB (แนะนำ 50 GB ขึ้นไป)
- **Network**: 100 Mbps

### ฮาร์ดแวร์แนะนำ
- **CPU**: 4 Cores หรือมากกว่า
- **RAM**: 8 GB หรือมากกว่า
- **Storage**: 100 GB SSD
- **Network**: 1 Gbps

### ซอฟต์แวร์
- **OS**: Ubuntu 20.04 LTS, 22.04 LTS, Debian 11/12
- **Python**: 3.8 ขึ้นไป
- **Node.js**: 16.x ขึ้นไป
- **Database**: MariaDB 10.5+ หรือ MySQL 8.0+
- **Web Server**: Apache 2.4+
- **DNS Server**: BIND 9.16+
- **Mail Server**: Postfix + Dovecot (ถ้าต้องการใช้งานอีเมล)

---

## การติดตั้งบน Linux

### 1. อัปเดตระบบ

```bash
sudo apt update
sudo apt upgrade -y
```

### 2. ติดตั้ง Dependencies พื้นฐาน

```bash
# ติดตั้ง Python และเครื่องมือที่จำเป็น
sudo apt install -y python3 python3-pip python3-venv python3-dev

# ติดตั้ง Build Tools
sudo apt install -y build-essential libssl-dev libffi-dev

# ติดตั้ง Git
sudo apt install -y git

# ติดตั้ง Node.js และ npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# ตรวจสอบเวอร์ชัน
python3 --version
node --version
npm --version
```

### 3. ติดตั้ง Database (MariaDB)

```bash
# ติดตั้ง MariaDB
sudo apt install -y mariadb-server mariadb-client

# เริ่มบริการ
sudo systemctl start mariadb
sudo systemctl enable mariadb

# ตั้งค่าความปลอดภัย
sudo mysql_secure_installation
```

**คำถามที่จะถูกถาม:**
- Set root password? **Y** (ตั้งรหัสผ่าน root)
- Remove anonymous users? **Y**
- Disallow root login remotely? **Y**
- Remove test database? **Y**
- Reload privilege tables? **Y**

### 4. ติดตั้ง Apache Web Server

```bash
# ติดตั้ง Apache
sudo apt install -y apache2

# เปิดใช้งาน Modules ที่จำเป็น
sudo a2enmod rewrite
sudo a2enmod ssl
sudo a2enmod headers
sudo a2enmod proxy
sudo a2enmod proxy_http

# เริ่มบริการ
sudo systemctl start apache2
sudo systemctl enable apache2
```

### 5. ติดตั้ง BIND DNS Server

```bash
# ติดตั้ง BIND9
sudo apt install -y bind9 bind9utils bind9-doc

# เริ่มบริการ
sudo systemctl start named
sudo systemctl enable named

# สร้างโฟลเดอร์สำหรับ Zone Files
sudo mkdir -p /var/named/zones
sudo chown -R bind:bind /var/named/zones
```

### 6. ติดตั้ง Mail Server (ถ้าต้องการ)

```bash
# ติดตั้ง Postfix (SMTP)
sudo apt install -y postfix

# เลือก "Internet Site" และกรอกชื่อโดเมน

# ติดตั้ง Dovecot (IMAP/POP3)
sudo apt install -y dovecot-core dovecot-imapd dovecot-pop3d

# เริ่มบริการ
sudo systemctl start postfix
sudo systemctl enable postfix
sudo systemctl start dovecot
sudo systemctl enable dovecot
```

### 7. Clone โปรเจค

```bash
# ไปที่โฟลเดอร์ที่ต้องการติดตั้ง
cd /opt

# Clone repository (แทนที่ URL ด้วยของคุณ)
sudo git clone https://github.com/your-repo/web-control-panel.git
cd web-control-panel

# เปลี่ยนเจ้าของไฟล์
sudo chown -R $USER:$USER /opt/web-control-panel
```

---

## การตั้งค่าฐานข้อมูล

### 1. สร้างฐานข้อมูล

```bash
# เข้าสู่ MySQL/MariaDB
sudo mysql -u root -p
```

```sql
-- สร้างฐานข้อมูล
CREATE DATABASE web_control_panel CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- สร้างผู้ใช้
CREATE USER 'webpanel'@'localhost' IDENTIFIED BY 'your_strong_password';

-- ให้สิทธิ์
GRANT ALL PRIVILEGES ON web_control_panel.* TO 'webpanel'@'localhost';

-- Reload privileges
FLUSH PRIVILEGES;

-- ออกจาก MySQL
EXIT;
```

---

## การตั้งค่า Backend

### 1. สร้าง Virtual Environment

```bash
cd /opt/web-control-panel/backend

# สร้าง virtual environment
python3 -m venv venv

# เปิดใช้งาน
source venv/bin/activate
```

### 2. ติดตั้ง Python Packages

```bash
# ติดตั้ง dependencies
pip install --upgrade pip
pip install -r requirements.txt
```

### 3. สร้างไฟล์ `.env`

```bash
# คัดลอกจาก example
cp dotenv_example .env

# แก้ไขไฟล์ .env
nano .env
```

**ตัวอย่างไฟล์ `.env`:**

```bash
# Flask Configuration
FLASK_APP=app.py
FLASK_ENV=production
SECRET_KEY=your_very_long_random_secret_key_here_at_least_32_characters

# Database Configuration
DATABASE_URL=mysql+pymysql://webpanel:your_strong_password@localhost/web_control_panel

# JWT Configuration
JWT_SECRET_KEY=another_very_long_random_secret_key_here
JWT_ACCESS_TOKEN_EXPIRES=3600
JWT_REFRESH_TOKEN_EXPIRES=2592000

# File Manager
FILE_MANAGER_ROOT=/var/www/html

# DNS Configuration
BIND_CONFIG_PATH=/etc/bind/named.conf.local
BIND_ZONES_PATH=/var/named/zones
BIND_SERVICE_NAME=named

# Apache Configuration
APACHE_SITES_AVAILABLE=/etc/apache2/sites-available
APACHE_SITES_ENABLED=/etc/apache2/sites-enabled
APACHE_SERVICE_NAME=apache2

# Email Configuration
POSTFIX_CONFIG_PATH=/etc/postfix
DOVECOT_CONFIG_PATH=/etc/dovecot
MAIL_DOMAIN=your-domain.com

# System
LOG_LEVEL=INFO
LOG_FILE=/var/log/web-control-panel/app.log
```

### 4. สร้างโฟลเดอร์ Logs

```bash
# สร้างโฟลเดอร์สำหรับ logs
sudo mkdir -p /var/log/web-control-panel
sudo chown -R $USER:$USER /var/log/web-control-panel
```

### 5. กำหนดสิทธิ์ SUDO (สำหรับจัดการบริการ)

```bash
# แก้ไขไฟล์ sudoers
sudo visudo
```

เพิ่มบรรทัดนี้ (แทนที่ `username` ด้วยชื่อผู้ใช้ของคุณ):

```
username ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart apache2
username ALL=(ALL) NOPASSWD: /usr/bin/systemctl reload apache2
username ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart named
username ALL=(ALL) NOPASSWD: /usr/bin/systemctl reload named
username ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart postfix
username ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart dovecot
username ALL=(ALL) NOPASSWD: /usr/sbin/a2ensite *
username ALL=(ALL) NOPASSWD: /usr/sbin/a2dissite *
```

### 6. เริ่มต้นฐานข้อมูล

```bash
# เปิดใช้งาน virtual environment
source venv/bin/activate

# รัน Flask DB migration
flask db init
flask db migrate -m "Initial migration"
flask db upgrade
```

### 7. สร้างผู้ใช้ Admin แรก

```bash
# เข้า Python shell
python3

# รันคำสั่งนี้
```

```python
from app import app, db
from models.user import User
import bcrypt

with app.app_context():
    # สร้างผู้ใช้ admin
    hashed_password = bcrypt.hashpw('admin123'.encode('utf-8'), bcrypt.gensalt())
    admin = User(
        username='admin',
        password_hash=hashed_password.decode('utf-8'),
        email='admin@example.com',
        is_admin=True
    )
    db.session.add(admin)
    db.session.commit()
    print("Admin user created successfully!")
```

กด `Ctrl+D` เพื่อออก

---

## การตั้งค่า Frontend

### 1. ติดตั้ง Dependencies

```bash
cd /opt/web-control-panel/frontend

# ติดตั้ง packages
npm install
```

### 2. Build สำหรับ Production

```bash
# Build
npm run build
```

ไฟล์ที่ build เสร็จจะอยู่ในโฟลเดอร์ `build/`

---

## การรันระบบ

### Development Mode

#### รัน Backend (Development)

```bash
cd /opt/web-control-panel/backend
source venv/bin/activate
python app.py
```

เซิร์ฟเวอร์จะรันที่: `http://localhost:5000`

#### รัน Frontend (Development)

```bash
cd /opt/web-control-panel/frontend
npm start
```

เว็บจะเปิดที่: `http://localhost:3000`

---

## การตั้งค่า Production

### 1. ติดตั้ง Gunicorn (Python WSGI Server)

```bash
cd /opt/web-control-panel/backend
source venv/bin/activate
pip install gunicorn
```

### 2. สร้าง Systemd Service สำหรับ Backend

```bash
sudo nano /etc/systemd/system/web-control-panel.service
```

เพิ่มเนื้อหานี้:

```ini
[Unit]
Description=Web Control Panel Backend
After=network.target mariadb.service

[Service]
Type=notify
User=www-data
Group=www-data
WorkingDirectory=/opt/web-control-panel/backend
Environment="PATH=/opt/web-control-panel/backend/venv/bin"
ExecStart=/opt/web-control-panel/backend/venv/bin/gunicorn \
    --workers 4 \
    --bind 127.0.0.1:5000 \
    --timeout 120 \
    --access-logfile /var/log/web-control-panel/access.log \
    --error-logfile /var/log/web-control-panel/error.log \
    app:app

Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### 3. เปลี่ยนเจ้าของไฟล์

```bash
sudo chown -R www-data:www-data /opt/web-control-panel
sudo chown -R www-data:www-data /var/log/web-control-panel
```

### 4. เริ่มบริการ

```bash
# Reload systemd
sudo systemctl daemon-reload

# เปิดใช้งานบริการ
sudo systemctl enable web-control-panel

# เริ่มบริการ
sudo systemctl start web-control-panel

# ตรวจสอบสถานะ
sudo systemctl status web-control-panel
```

### 5. ตั้งค่า Apache เป็น Reverse Proxy

```bash
# เปิดใช้งาน Modules
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod ssl

# สร้างไฟล์ Virtual Host
sudo nano /etc/apache2/sites-available/web-control-panel.conf
```

เพิ่มเนื้อหานี้:

```apache
<VirtualHost *:80>
    ServerName your-domain.com
    ServerAdmin admin@your-domain.com

    # Redirect to HTTPS
    Redirect permanent / https://your-domain.com/
</VirtualHost>

<VirtualHost *:443>
    ServerName your-domain.com
    ServerAdmin admin@your-domain.com

    # SSL Configuration
    SSLEngine on
    SSLCertificateFile /etc/ssl/certs/your-cert.crt
    SSLCertificateKeyFile /etc/ssl/private/your-key.key

    # Serve React build files
    DocumentRoot /opt/web-control-panel/frontend/build
    
    <Directory /opt/web-control-panel/frontend/build>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
        
        # React Router support
        FallbackResource /index.html
    </Directory>

    # Proxy API requests to Flask backend
    ProxyPreserveHost On
    ProxyPass /api http://127.0.0.1:5000/api
    ProxyPassReverse /api http://127.0.0.1:5000/api

    # Logs
    ErrorLog ${APACHE_LOG_DIR}/web-control-panel-error.log
    CustomLog ${APACHE_LOG_DIR}/web-control-panel-access.log combined
</VirtualHost>
```

### 6. เปิดใช้งาน Site

```bash
# เปิดใช้งาน site
sudo a2ensite web-control-panel.conf

# ปิด default site
sudo a2dissite 000-default.conf

# ตรวจสอบ configuration
sudo apache2ctl configtest

# Reload Apache
sudo systemctl reload apache2
```

### 7. ติดตั้ง SSL Certificate (Let's Encrypt)

```bash
# ติดตั้ง Certbot
sudo apt install -y certbot python3-certbot-apache

# ขอใบรับรอง SSL
sudo certbot --apache -d your-domain.com

# Auto-renewal (จะถูกตั้งค่าอัตโนมัติ)
sudo certbot renew --dry-run
```

### 8. ตั้งค่า Firewall

```bash
# อนุญาตพอร์ตที่จำเป็น
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 53/tcp    # DNS
sudo ufw allow 53/udp    # DNS
sudo ufw allow 25/tcp    # SMTP (ถ้าใช้งานอีเมล)
sudo ufw allow 587/tcp   # SMTP Submission
sudo ufw allow 993/tcp   # IMAPS
sudo ufw allow 995/tcp   # POP3S

# เปิดใช้งาน Firewall
sudo ufw enable

# ตรวจสอบสถานะ
sudo ufw status
```

---

## การตรวจสอบการทำงาน

### 1. ตรวจสอบบริการต่างๆ

```bash
# ตรวจสอบ Web Control Panel
sudo systemctl status web-control-panel

# ตรวจสอบ Apache
sudo systemctl status apache2

# ตรวจสอบ BIND
sudo systemctl status named

# ตรวจสอบ MariaDB
sudo systemctl status mariadb

# ตรวจสอบ Postfix (ถ้าใช้งาน)
sudo systemctl status postfix

# ตรวจสอบ Dovecot (ถ้าใช้งาน)
sudo systemctl status dovecot
```

### 2. ตรวจสอบ Logs

```bash
# Backend logs
tail -f /var/log/web-control-panel/error.log

# Apache logs
tail -f /var/log/apache2/web-control-panel-error.log

# BIND logs
tail -f /var/log/syslog | grep named

# Mail logs
tail -f /var/log/mail.log
```

### 3. ทดสอบการเข้าถึง

เปิดเว็บเบราว์เซอร์และเข้าไปที่:
```
https://your-domain.com
```

เข้าสู่ระบบด้วย:
- **Username**: admin
- **Password**: admin123

> **⚠️ สำคัญ**: เปลี่ยนรหัสผ่าน admin ทันทีหลังเข้าสู่ระบบครั้งแรก!

---

## การอัปเดตระบบ

### 1. อัปเดต Backend

```bash
cd /opt/web-control-panel/backend

# Pull โค้ดใหม่
git pull origin main

# เปิดใช้งาน virtual environment
source venv/bin/activate

# อัปเดต dependencies
pip install -r requirements.txt

# รัน migrations
flask db upgrade

# Restart service
sudo systemctl restart web-control-panel
```

### 2. อัปเดต Frontend

```bash
cd /opt/web-control-panel/frontend

# Pull โค้ดใหม่
git pull origin main

# อัปเดต dependencies
npm install

# Build ใหม่
npm run build

# Reload Apache
sudo systemctl reload apache2
```

---

## การสำรองข้อมูล

### 1. สำรองฐานข้อมูล

```bash
# สร้างโฟลเดอร์สำหรับ backup
mkdir -p /opt/backups/database

# Backup database
mysqldump -u root -p web_control_panel > /opt/backups/database/backup_$(date +%Y%m%d_%H%M%S).sql

# หรือใช้ script อัตโนมัติ
sudo nano /opt/backups/backup-db.sh
```

**สคริปต์สำรองอัตโนมัติ:**

```bash
#!/bin/bash
BACKUP_DIR="/opt/backups/database"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="web_control_panel"
DB_USER="root"

# สร้างโฟลเดอร์ถ้ายังไม่มี
mkdir -p $BACKUP_DIR

# Backup
mysqldump -u $DB_USER -p$DB_PASSWORD $DB_NAME | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# ลบ backup เก่าเกิน 7 วัน
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete

echo "Backup completed: backup_$DATE.sql.gz"
```

```bash
# ให้สิทธิ์รัน
chmod +x /opt/backups/backup-db.sh

# ตั้ง Cron job ให้รันทุกวันเวลา 2:00
crontab -e
```

เพิ่มบรรทัด:
```
0 2 * * * /opt/backups/backup-db.sh
```

### 2. สำรองไฟล์

```bash
# Backup ไฟล์ configuration
tar -czf /opt/backups/config_$(date +%Y%m%d).tar.gz \
    /opt/web-control-panel/backend/.env \
    /etc/apache2/sites-available/ \
    /etc/bind/

# Backup ไฟล์เว็บไซต์
tar -czf /opt/backups/www_$(date +%Y%m%d).tar.gz /var/www/
```

---

## การแก้ไขปัญหาที่พบบ่อย

### ปัญหา: Backend ไม่สามารถเชื่อมต่อฐานข้อมูล

**วิธีแก้:**
1. ตรวจสอบว่า MariaDB ทำงานอยู่
2. ตรวจสอบ DATABASE_URL ในไฟล์ .env
3. ตรวจสอบสิทธิ์ผู้ใช้ฐานข้อมูล

### ปัญหา: Permission denied

**วิธีแก้:**
```bash
# ตั้งค่าสิทธิ์ที่ถูกต้อง
sudo chown -R www-data:www-data /opt/web-control-panel
sudo chmod -R 755 /opt/web-control-panel
```

### ปัญหา: DNS ไม่ทำงาน

**วิธีแก้:**
1. ตรวจสอบว่า BIND ทำงานอยู่
2. ตรวจสอบ configuration ใน `/etc/bind/`
3. ดู logs: `tail -f /var/log/syslog | grep named`

### ปัญหา: Apache ไม่ start

**วิธีแก้:**
```bash
# ตรวจสอบ configuration
sudo apache2ctl configtest

# ดู error logs
sudo tail -f /var/log/apache2/error.log
```

---

## การรักษาความปลอดภัย

### 1. อัปเดตระบบสม่ำเสมอ

```bash
sudo apt update && sudo apt upgrade -y
```

### 2. ใช้ Firewall

ดูขั้นตอนการตั้งค่า UFW ด้านบน

### 3. ใช้ Strong Passwords

- ใช้รหัสผ่านยาว ≥ 12 ตัวอักษร
- ผสมตัวพิมพ์ใหญ่-เล็ก ตัวเลข และอักขระพิเศษ
- เปลี่ยนรหัสผ่านเป็นระยะ

### 4. จำกัดการเข้าถึง SSH

```bash
# แก้ไข SSH config
sudo nano /etc/ssh/sshd_config
```

เปลี่ยนพอร์ต และปิด root login:
```
Port 2222
PermitRootLogin no
PasswordAuthentication no  # ใช้ SSH key แทน
```

```bash
# Restart SSH
sudo systemctl restart sshd
```

### 5. ติดตั้ง Fail2ban

```bash
# ติดตั้ง
sudo apt install -y fail2ban

# สร้าง configuration
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# เริ่มบริการ
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

---

## ข้อมูลเพิ่มเติม

- **Documentation**: [USER_MANUAL.md](./USER_MANUAL.md)
- **Feature Guide**: [FEATURES_GUIDE.md](./FEATURES_GUIDE.md)
- **Admin Guide**: [ADMIN_GUIDE.md](./ADMIN_GUIDE.md)
- **Troubleshooting**: [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

---

**เวอร์ชัน:** 2.0.0  
**อัปเดตล่าสุด:** ตุลาคม 2025

© 2025 Web Control Panel. สงวนลิขสิทธิ์.





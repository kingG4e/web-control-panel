# คู่มือสำหรับผู้ดูแลระบบ (Admin Guide)

## สารบัญ
1. [การจัดการผู้ใช้](#1-การจัดการผู้ใช้)
2. [การจัดการระบบ](#2-การจัดการระบบ)
3. [การสำรองและกู้คืนข้อมูล](#3-การสำรองและกู้คืนข้อมูล)
4. [การตรวจสอบและบำรุงรักษา](#4-การตรวจสอบและบำรุงรักษา)
5. [ความปลอดภัย](#5-ความปลอดภัย)
6. [การแก้ไขปัญหา](#6-การแก้ไขปัญหา)
7. [การปรับแต่งประสิทธิภาพ](#7-การปรับแต่งประสิทธิภาพ)
8. [การอัปเดตระบบ](#8-การอัปเดตระบบ)

---

## 1. การจัดการผู้ใช้

### 1.1 สร้างผู้ใช้ใหม่

**ผ่าน Web Interface:**

1. เข้าสู่ระบบในฐานะ Admin
2. ไปที่ **User Management**
3. คลิก **"Create User"**
4. กรอกข้อมูล:
   - Username
   - Email
   - Password
   - Full Name
   - Role (User/Admin)
   - Storage Quota (MB)
5. คลิก **"Create"**

**ผ่าน Command Line:**

```bash
# เข้า Flask shell
cd /opt/web-control-panel/backend
source venv/bin/activate
flask shell
```

```python
from models.user import User
from models.database import db
import bcrypt

# สร้างผู้ใช้
password = 'secure_password'
hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

user = User(
    username='newuser',
    email='user@example.com',
    password_hash=hashed.decode('utf-8'),
    full_name='New User',
    is_admin=False,
    storage_quota_mb=10240  # 10 GB
)

db.session.add(user)
db.session.commit()
print(f"User created with ID: {user.id}")
```

### 1.2 การจัดการสิทธิ์ผู้ใช้

**เปลี่ยนเป็น Admin:**

```python
from models.user import User
from models.database import db

user = User.query.filter_by(username='username').first()
user.is_admin = True
db.session.commit()
```

**ลดสิทธิ์จาก Admin:**

```python
user = User.query.filter_by(username='username').first()
user.is_admin = False
db.session.commit()
```

### 1.3 การรีเซ็ตรหัสผ่านผู้ใช้

**ผ่าน Web Interface:**

1. ไปที่ User Management
2. เลือกผู้ใช้
3. คลิก **"Reset Password"**
4. กรอกรหัสผ่านใหม่
5. คลิก **"Reset"**

**ผ่าน Command Line:**

```python
from models.user import User
from models.database import db
import bcrypt

user = User.query.filter_by(username='username').first()
new_password = 'new_secure_password'
hashed = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt())
user.password_hash = hashed.decode('utf-8')
db.session.commit()
print("Password reset successfully")
```

### 1.4 การจัดการโควต้า

**ตั้งค่าโควต้า:**

```python
user = User.query.filter_by(username='username').first()
user.storage_quota_mb = 20480  # 20 GB
db.session.commit()
```

**ตรวจสอบการใช้งาน:**

```python
from services.quota_service import QuotaService

usage = QuotaService.calculate_user_usage(user.id)
print(f"Used: {usage['total_used_mb']} MB")
print(f"Limit: {user.storage_quota_mb} MB")
print(f"Percentage: {usage['percentage']}%")
```

### 1.5 การลบผู้ใช้

**⚠️ คำเตือน:** การลบผู้ใช้จะลบข้อมูลทั้งหมดของผู้ใช้นั้น รวมถึง:
- Virtual Hosts
- DNS Zones
- Email Accounts
- Databases
- Files

**ผ่าน Web Interface:**

1. ไปที่ User Management
2. เลือกผู้ใช้
3. คลิก **"Delete"**
4. ยืนยันการลบ

**ผ่าน Command Line:**

```python
from models.user import User
from models.database import db

user = User.query.filter_by(username='username').first()
if user:
    # ลบทรัพยากรที่เกี่ยวข้อง
    # (ควรมี cascade delete ใน models)
    db.session.delete(user)
    db.session.commit()
    print("User deleted successfully")
```

---

## 2. การจัดการระบบ

### 2.1 การตรวจสอบสุขภาพระบบ

**System Health Check:**

```bash
# ตรวจสอบบริการทั้งหมด
sudo systemctl status web-control-panel
sudo systemctl status apache2
sudo systemctl status mariadb
sudo systemctl status named
sudo systemctl status postfix
sudo systemctl status dovecot

# ตรวจสอบ disk space
df -h

# ตรวจสอบ memory
free -h

# ตรวจสอบ CPU
top
# หรือ
htop

# ตรวจสอบ network
netstat -tulpn
# หรือ
ss -tulpn
```

**ผ่าน API:**

```bash
curl http://localhost:5000/api/system/health
```

### 2.2 การจัดการบริการ

**Apache:**

```bash
# ตรวจสอบ configuration
sudo apache2ctl configtest

# Reload (ไม่มีดาวน์ไทม์)
sudo systemctl reload apache2

# Restart
sudo systemctl restart apache2

# ดู error logs
sudo tail -f /var/log/apache2/error.log
```

**MariaDB/MySQL:**

```bash
# เข้าสู่ MySQL console
sudo mysql -u root -p

# ตรวจสอบสถานะ
sudo systemctl status mariadb

# Restart
sudo systemctl restart mariadb

# ดู error logs
sudo tail -f /var/log/mysql/error.log
```

**BIND DNS:**

```bash
# ตรวจสอบ configuration
sudo named-checkconf

# ตรวจสอบ zone file
sudo named-checkzone example.com /var/named/zones/example.com.zone

# Reload zones (ไม่มีดาวน์ไทม์)
sudo systemctl reload named

# ดู logs
sudo tail -f /var/log/syslog | grep named
```

**Postfix (Email):**

```bash
# ตรวจสอบ configuration
sudo postfix check

# Reload
sudo systemctl reload postfix

# ดู mail queue
sudo postqueue -p

# ส่งเมลที่ค้างในคิว
sudo postqueue -f

# ลบเมลทั้งหมดในคิว (ระวัง!)
sudo postsuper -d ALL

# ดู logs
sudo tail -f /var/log/mail.log
```

### 2.3 การตรวจสอบ Logs

**Application Logs:**

```bash
# Backend logs
tail -f /var/log/web-control-panel/error.log
tail -f /var/log/web-control-panel/access.log

# ดู logs แบบ realtime
sudo journalctl -u web-control-panel -f
```

**System Logs:**

```bash
# System messages
sudo tail -f /var/log/syslog

# Authentication logs
sudo tail -f /var/log/auth.log

# Kernel messages
sudo dmesg -T
```

**การหา Error:**

```bash
# หา error ใน logs
grep -i error /var/log/web-control-panel/error.log

# หา critical errors
grep -i critical /var/log/syslog

# นับจำนวน errors
grep -c "ERROR" /var/log/web-control-panel/error.log
```

### 2.4 การตรวจสอบการใช้ทรัพยากร

**Disk Usage:**

```bash
# ดูการใช้พื้นที่ทั้งหมด
df -h

# ดูขนาดโฟลเดอร์
du -sh /var/www/*
du -sh /var/lib/mysql/*

# หาไฟล์ใหญ่สุด 10 อันดับ
find / -type f -size +100M -exec ls -lh {} \; 2>/dev/null | sort -k5 -hr | head -10

# หาโฟลเดอร์ที่ใช้พื้นที่มาก
du -h / | sort -hr | head -20
```

**Memory Usage:**

```bash
# ดู memory usage
free -h

# ดูรายละเอียด
cat /proc/meminfo

# ดูโปรเซสที่ใช้ memory มากสุด
ps aux --sort=-%mem | head -10
```

**CPU Usage:**

```bash
# ดูโปรเซสที่ใช้ CPU มากสุด
ps aux --sort=-%cpu | head -10

# ดู load average
uptime

# ดูรายละเอียด CPU
lscpu
```

### 2.5 การจัดการ Firewall

**UFW (Uncomplicated Firewall):**

```bash
# ตรวจสอบสถานะ
sudo ufw status verbose

# อนุญาตพอร์ต
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp

# ปฏิเสธพอร์ต
sudo ufw deny 3306/tcp  # MySQL (ถ้าไม่ต้องการเข้าจากภายนอก)

# อนุญาต IP เฉพาะ
sudo ufw allow from 192.168.1.100

# ลบ rule
sudo ufw delete allow 80/tcp

# รีเซ็ต (ลบทุก rules)
sudo ufw reset

# เปิดใช้งาน
sudo ufw enable
```

---

## 3. การสำรองและกู้คืนข้อมูล

### 3.1 การสำรองฐานข้อมูล

**Manual Backup:**

```bash
# สร้างโฟลเดอร์สำหรับ backup
sudo mkdir -p /opt/backups/database

# Backup ฐานข้อมูลหลัก
sudo mysqldump -u root -p web_control_panel | gzip > /opt/backups/database/web_control_panel_$(date +%Y%m%d_%H%M%S).sql.gz

# Backup ทุกฐานข้อมูล
sudo mysqldump -u root -p --all-databases | gzip > /opt/backups/database/all_databases_$(date +%Y%m%d_%H%M%S).sql.gz
```

**Automated Backup Script:**

```bash
sudo nano /opt/backups/backup-db.sh
```

เพิ่มเนื้อหา:

```bash
#!/bin/bash

# Configuration
BACKUP_DIR="/opt/backups/database"
MYSQL_USER="root"
MYSQL_PASSWORD="your_password"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup main database
mysqldump -u $MYSQL_USER -p$MYSQL_PASSWORD web_control_panel | gzip > $BACKUP_DIR/web_control_panel_$DATE.sql.gz

# Backup all databases
mysqldump -u $MYSQL_USER -p$MYSQL_PASSWORD --all-databases | gzip > $BACKUP_DIR/all_databases_$DATE.sql.gz

# Delete old backups
find $BACKUP_DIR -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete

# Log
echo "Backup completed at $(date)" >> $BACKUP_DIR/backup.log
```

```bash
# ให้สิทธิ์รัน
sudo chmod +x /opt/backups/backup-db.sh

# ทดสอบ
sudo /opt/backups/backup-db.sh
```

**ตั้ง Cron Job:**

```bash
sudo crontab -e
```

เพิ่มบรรทัด (รันทุกวันเวลา 2:00 น.):

```
0 2 * * * /opt/backups/backup-db.sh
```

### 3.2 การกู้คืนฐานข้อมูล

**จาก Backup:**

```bash
# แตกไฟล์
gunzip /opt/backups/database/web_control_panel_20251009_020000.sql.gz

# กู้คืน
mysql -u root -p web_control_panel < /opt/backups/database/web_control_panel_20251009_020000.sql

# หรือแบบไม่ต้องแตกไฟล์
gunzip < /opt/backups/database/web_control_panel_20251009_020000.sql.gz | mysql -u root -p web_control_panel
```

### 3.3 การสำรองไฟล์

**Backup Configuration Files:**

```bash
#!/bin/bash

BACKUP_DIR="/opt/backups/config"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup web control panel config
tar -czf $BACKUP_DIR/webpanel_config_$DATE.tar.gz \
    /opt/web-control-panel/backend/.env \
    /opt/web-control-panel/backend/config.py

# Backup Apache config
tar -czf $BACKUP_DIR/apache_config_$DATE.tar.gz \
    /etc/apache2/sites-available/ \
    /etc/apache2/sites-enabled/

# Backup BIND config
tar -czf $BACKUP_DIR/bind_config_$DATE.tar.gz \
    /etc/bind/ \
    /var/named/zones/

# Backup Postfix/Dovecot config
tar -czf $BACKUP_DIR/mail_config_$DATE.tar.gz \
    /etc/postfix/ \
    /etc/dovecot/

echo "Config backup completed at $(date)"
```

**Backup Website Files:**

```bash
# Backup ทุกเว็บไซต์
tar -czf /opt/backups/websites/www_$(date +%Y%m%d).tar.gz /var/www/

# Backup เว็บไซต์เฉพาะ
tar -czf /opt/backups/websites/example.com_$(date +%Y%m%d).tar.gz /var/www/example.com/
```

### 3.4 การสำรองแบบครบวงจร (Full System Backup)

```bash
#!/bin/bash

BACKUP_ROOT="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Database
mysqldump -u root -p --all-databases | gzip > $BACKUP_ROOT/full_backup_$DATE/databases.sql.gz

# Files
tar -czf $BACKUP_ROOT/full_backup_$DATE/www.tar.gz /var/www/
tar -czf $BACKUP_ROOT/full_backup_$DATE/config.tar.gz \
    /opt/web-control-panel/backend/.env \
    /etc/apache2/ \
    /etc/bind/ \
    /etc/postfix/ \
    /etc/dovecot/

# System info
df -h > $BACKUP_ROOT/full_backup_$DATE/disk_usage.txt
dpkg --get-selections > $BACKUP_ROOT/full_backup_$DATE/installed_packages.txt
```

### 3.5 Backup ไปยัง Remote Server

**ใช้ rsync:**

```bash
# Backup ไป remote server
rsync -avz --delete /opt/backups/ user@backup-server:/backups/web-control-panel/

# หรือผ่าน SSH
rsync -avz -e "ssh -p 2222" /opt/backups/ user@backup-server:/backups/
```

**ใช้ scp:**

```bash
scp /opt/backups/database/backup.sql.gz user@backup-server:/backups/
```

---

## 4. การตรวจสอบและบำรุงรักษา

### 4.1 การตรวจสอบความสมบูรณ์ของฐานข้อมูล

**Check Database Tables:**

```sql
-- เช็คทุกตาราง
mysqlcheck -u root -p --all-databases

-- เช็คและซ่อม
mysqlcheck -u root -p --all-databases --auto-repair

-- Optimize tables
mysqlcheck -u root -p --all-databases --optimize
```

**MySQL Console:**

```sql
-- เช็คตาราง
CHECK TABLE users;

-- ซ่อมตาราง
REPAIR TABLE users;

-- Optimize
OPTIMIZE TABLE users;

-- Analyze (อัปเดต statistics)
ANALYZE TABLE users;
```

### 4.2 การทำความสะอาดระบบ

**ลบ Log Files เก่า:**

```bash
# หา log files ที่เก่ากว่า 30 วัน
find /var/log -type f -name "*.log" -mtime +30

# ลบ
find /var/log -type f -name "*.log" -mtime +30 -delete

# ลบ compressed logs
find /var/log -type f -name "*.gz" -mtime +90 -delete
```

**ลบ Temporary Files:**

```bash
# ลบ tmp files
sudo rm -rf /tmp/*

# ลบ apt cache
sudo apt clean

# ลบ packages ที่ไม่ใช้แล้ว
sudo apt autoremove -y
```

**ลบ Email Queue ที่เก่า:**

```bash
# ดู queue
sudo postqueue -p

# ลบเมลที่ค้าง
sudo postsuper -d ALL deferred
```

### 4.3 การตรวจสอบไฟล์ระบบ

**หาไฟล์ที่ถูกแก้ไขล่าสุด:**

```bash
# หาไฟล์ที่แก้ไขใน 24 ชม.ที่ผ่านมา
find /var/www -type f -mtime -1

# หาไฟล์ที่แก้ไขใน 1 ชม.ที่ผ่านมา
find /var/www -type f -mmin -60
```

**ตรวจสอบสิทธิ์ไฟล์:**

```bash
# หาไฟล์ที่มีสิทธิ์ 777 (อันตราย)
find /var/www -type f -perm 0777

# หาไฟล์ที่ถูก execute
find /var/www -type f -perm /u=x,g=x,o=x

# แก้ไขสิทธิ์ให้ถูกต้อง
find /var/www -type f -exec chmod 644 {} \;
find /var/www -type d -exec chmod 755 {} \;
```

### 4.4 การ Monitor แบบ Realtime

**ติดตั้ง Monitoring Tools:**

```bash
# htop - Better top
sudo apt install htop

# iotop - Disk I/O monitoring
sudo apt install iotop

# nethogs - Network monitoring per process
sudo apt install nethogs

# glances - All-in-one monitoring
sudo apt install glances
```

**ใช้งาน:**

```bash
# CPU & Memory
htop

# Disk I/O
sudo iotop

# Network per process
sudo nethogs

# All-in-one
glances
```

---

## 5. ความปลอดภัย

### 5.1 การตรวจสอบความปลอดภัย

**Check Failed Login Attempts:**

```bash
# ดูความพยายามล็อกอินที่ล้มเหลว
sudo grep "Failed password" /var/log/auth.log | tail -20

# นับจำนวน
sudo grep "Failed password" /var/log/auth.log | wc -l

# ดู IP ที่พยายามโจมตี
sudo grep "Failed password" /var/log/auth.log | awk '{print $(NF-3)}' | sort | uniq -c | sort -nr
```

**Check Suspicious Processes:**

```bash
# ดูโปรเซสทั้งหมด
ps aux

# หาโปรเซสที่ใช้ CPU/Memory สูง
ps aux --sort=-%cpu | head -10
ps aux --sort=-%mem | head -10

# ดูโปรเซสที่รันโดยผู้ใช้ www-data
ps aux | grep www-data
```

**Check Open Ports:**

```bash
# ดูพอร์ตที่เปิด
sudo netstat -tulpn
# หรือ
sudo ss -tulpn

# ดูพอร์ตที่เปิดจากภายนอก
sudo nmap -sT localhost
```

### 5.2 การติดตั้ง Fail2ban

Fail2ban ช่วยป้องกัน brute-force attacks

```bash
# ติดตั้ง
sudo apt install fail2ban

# สร้าง local config
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# แก้ไข config
sudo nano /etc/fail2ban/jail.local
```

**Configuration:**

```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log

[apache-auth]
enabled = true
port = http,https
logpath = /var/log/apache2/*error.log

[postfix]
enabled = true
port = smtp,ssmtp
logpath = /var/log/mail.log
```

```bash
# เริ่มบริการ
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# ตรวจสอบสถานะ
sudo fail2ban-client status

# ดูรายละเอียด jail
sudo fail2ban-client status sshd

# ปลด ban IP
sudo fail2ban-client set sshd unbanip 192.168.1.100
```

### 5.3 การตั้งค่า SSL/TLS

**เปิดใช้งาน SSL Protocols ที่ปลอดภัย:**

```bash
sudo nano /etc/apache2/mods-available/ssl.conf
```

```apache
# แก้ไข
SSLProtocol all -SSLv2 -SSLv3 -TLSv1 -TLSv1.1
SSLCipherSuite HIGH:!aNULL:!MD5:!3DES
SSLHonorCipherOrder on
```

```bash
# Reload Apache
sudo systemctl reload apache2
```

**ทดสอบ SSL:**

```bash
# ตรวจสอบผ่าน command line
openssl s_client -connect example.com:443 -tls1_2

# หรือใช้ online tools
# https://www.ssllabs.com/ssltest/
```

### 5.4 การอัปเดตความปลอดภัย

```bash
# อัปเดต security patches
sudo apt update
sudo apt upgrade -y

# ดู security updates ที่มี
sudo apt list --upgradable

# อัปเดตเฉพาะ security updates
sudo unattended-upgrade

# ตั้งค่า auto security updates
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

### 5.5 การสแกนหาไวรัส/มัลแวร์

**ติดตั้ง ClamAV:**

```bash
sudo apt install clamav clamav-daemon

# อัปเดต virus definitions
sudo freshclam

# สแกนไฟล์
sudo clamscan -r /var/www/

# สแกนและลบไฟล์ที่ติดไวรัส
sudo clamscan -r --remove /var/www/

# สแกนและย้ายไปกักกัน
sudo clamscan -r --move=/quarantine /var/www/
```

---

## 6. การแก้ไขปัญหา

### 6.1 ปัญหา Apache ไม่ start

**ตรวจสอบ:**

```bash
# ตรวจสอบ configuration
sudo apache2ctl configtest

# ดู error logs
sudo tail -50 /var/log/apache2/error.log

# ตรวจสอบว่าพอร์ตถูกใช้งานอยู่หรือไม่
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :443
```

**แก้ไข:**

```bash
# ถ้า configuration ผิด - แก้ไขไฟล์ที่มีปัญหา

# ถ้าพอร์ตถูกใช้งาน - หาโปรเซสและหยุด
sudo kill $(sudo lsof -t -i:80)

# Restart Apache
sudo systemctl restart apache2
```

### 6.2 ปัญหา MySQL ไม่ start

**ตรวจสอบ:**

```bash
# ดู error logs
sudo tail -50 /var/log/mysql/error.log

# ตรวจสอบ disk space
df -h /var/lib/mysql

# ตรวจสอบ memory
free -h
```

**แก้ไข:**

```bash
# ถ้า disk เต็ม - ลบไฟล์ที่ไม่จำเป็น

# ถ้า memory ไม่พอ - ปรับแต่ง MySQL config
sudo nano /etc/mysql/mariadb.conf.d/50-server.cnf
```

```ini
[mysqld]
# ลด memory usage
innodb_buffer_pool_size = 128M
key_buffer_size = 16M
max_connections = 50
```

### 6.3 ปัญหา DNS ไม่ทำงาน

**ตรวจสอบ:**

```bash
# ตรวจสอบ BIND config
sudo named-checkconf

# ตรวจสอบ zone files
sudo named-checkzone example.com /var/named/zones/example.com.zone

# ดู logs
sudo tail -f /var/log/syslog | grep named

# ทดสอบ query
dig @localhost example.com
```

**แก้ไข:**

```bash
# ถ้า config ผิด - แก้ไขไฟล์

# ถ้า zone file ผิด - แก้ไข zone file

# Reload BIND
sudo systemctl reload named
```

### 6.4 ปัญหาอีเมลส่งไม่ออก

**ตรวจสอบ:**

```bash
# ดู mail queue
sudo postqueue -p

# ดู logs
sudo tail -f /var/log/mail.log

# ทดสอบส่งเมล
echo "Test email" | mail -s "Test" user@example.com

# ตรวจสอบพอร์ต
telnet mail.example.com 25
```

**แก้ไข:**

```bash
# ถ้าเมลค้างในคิว - ส่งใหม่
sudo postqueue -f

# ถ้า configuration ผิด - แก้ไข
sudo nano /etc/postfix/main.cf

# Reload Postfix
sudo systemctl reload postfix
```

---

## 7. การปรับแต่งประสิทธิภาพ

### 7.1 ปรับแต่ง Apache

**Enable MPM Event (แทน Prefork):**

```bash
# ปิด mpm_prefork
sudo a2dismod mpm_prefork

# เปิด mpm_event
sudo a2enmod mpm_event

# แก้ไข config
sudo nano /etc/apache2/mods-available/mpm_event.conf
```

```apache
<IfModule mpm_event_module>
    StartServers             2
    MinSpareThreads          25
    MaxSpareThreads          75
    ThreadLimit              64
    ThreadsPerChild          25
    MaxRequestWorkers        150
    MaxConnectionsPerChild   1000
</IfModule>
```

**Enable Compression:**

```bash
sudo a2enmod deflate
```

**Enable Caching:**

```bash
sudo a2enmod cache
sudo a2enmod cache_disk
sudo a2enmod expires
sudo a2enmod headers
```

### 7.2 ปรับแต่ง MySQL/MariaDB

```bash
sudo nano /etc/mysql/mariadb.conf.d/50-server.cnf
```

**สำหรับเซิร์ฟเวอร์ 8GB RAM:**

```ini
[mysqld]
# Connection Settings
max_connections = 100

# Buffer Pool
innodb_buffer_pool_size = 2G
innodb_buffer_pool_instances = 2

# Log Files
innodb_log_file_size = 256M
innodb_log_buffer_size = 16M

# Query Cache (MariaDB 10.1)
query_cache_type = 1
query_cache_size = 64M
query_cache_limit = 2M

# Thread Cache
thread_cache_size = 16

# Table Cache
table_open_cache = 2000
table_definition_cache = 1000

# Temp Tables
tmp_table_size = 64M
max_heap_table_size = 64M

# Sort Buffer
sort_buffer_size = 2M
read_rnd_buffer_size = 1M

# Other
innodb_flush_log_at_trx_commit = 2
innodb_flush_method = O_DIRECT
```

### 7.3 ปรับแต่ง PHP

```bash
sudo nano /etc/php/8.1/fpm/php.ini
```

```ini
; Memory
memory_limit = 256M

; Upload
upload_max_filesize = 64M
post_max_size = 64M

; Execution
max_execution_time = 300
max_input_time = 300

; OPcache (สำคัญ!)
opcache.enable=1
opcache.memory_consumption=128
opcache.interned_strings_buffer=8
opcache.max_accelerated_files=4000
opcache.revalidate_freq=60
```

### 7.4 ตั้งค่า Swap (ถ้า RAM ไม่พอ)

```bash
# สร้าง swap file (4GB)
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# ทำให้ permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# ปรับ swappiness (0-100, ต่ำ = ใช้ swap น้อย)
sudo sysctl vm.swappiness=10
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
```

---

## 8. การอัปเดตระบบ

### 8.1 อัปเดต Web Control Panel

**Backup ก่อนอัปเดต:**

```bash
# Backup database
mysqldump -u root -p web_control_panel > /opt/backups/pre-update_$(date +%Y%m%d).sql

# Backup code
tar -czf /opt/backups/webpanel_pre-update_$(date +%Y%m%d).tar.gz /opt/web-control-panel/
```

**อัปเดต Backend:**

```bash
cd /opt/web-control-panel/backend

# Pull โค้ดใหม่
git pull origin main

# Activate virtualenv
source venv/bin/activate

# อัปเดต dependencies
pip install -r requirements.txt --upgrade

# รัน database migrations
flask db upgrade

# Restart service
sudo systemctl restart web-control-panel
```

**อัปเดต Frontend:**

```bash
cd /opt/web-control-panel/frontend

# Pull โค้ดใหม่
git pull origin main

# อัปเดต dependencies
npm install

# Build
npm run build

# Reload Apache
sudo systemctl reload apache2
```

### 8.2 อัปเดต System Packages

```bash
# อัปเดต package list
sudo apt update

# อัปเดตทุกอย่าง
sudo apt upgrade -y

# อัปเดต distribution
sudo apt dist-upgrade -y

# ลบ packages ที่ไม่ใช้
sudo apt autoremove -y

# Reboot ถ้าจำเป็น
sudo reboot
```

### 8.3 Rolling Back (กู้คืนเวอร์ชันเก่า)

**ถ้าอัปเดตผิดพลาด:**

```bash
# Backend
cd /opt/web-control-panel/backend
git log  # ดู commit history
git checkout <commit-hash>  # ย้อนกลับไปยัง commit ที่ดี
source venv/bin/activate
flask db downgrade  # ย้อน migration ถ้าจำเป็น
sudo systemctl restart web-control-panel

# หรือกู้คืนจาก backup
cd /opt/web-control-panel
sudo rm -rf backend/
sudo tar -xzf /opt/backups/webpanel_pre-update_20251009.tar.gz
sudo systemctl restart web-control-panel
```

---

## Best Practices สำหรับ Admin

### ✅ ควรทำ

1. **สำรองข้อมูลเป็นประจำ**
   - ฐานข้อมูล: ทุกวัน
   - Configuration: ทุกครั้งที่เปลี่ยนแปลง
   - Files: อย่างน้อยสัปดาห์ละครั้ง

2. **ตรวจสอบ Logs เป็นประจำ**
   - Application logs: ทุกวัน
   - Security logs: ทุกวัน
   - System logs: ทุกสัปดาห์

3. **อัปเดตระบบ**
   - Security updates: ทันที
   - System packages: ทุกสัปดาห์
   - Application: ตามตาราง

4. **Monitor ทรัพยากร**
   - CPU, RAM, Disk: realtime
   - ตั้ง alerts เมื่อใกล้เต็ม

5. **ทดสอบ Backups**
   - ทดสอบกู้คืนอย่างน้อยเดือนละครั้ง

### ❌ ไม่ควรทำ

1. ❌ อย่าให้ root login ผ่าน SSH
2. ❌ อย่าใช้รหัสผ่านง่ายๆ
3. ❌ อย่าเปิดพอร์ตที่ไม่จำเป็น
4. ❌ อย่าลืม update security patches
5. ❌ อย่าลบ logs ที่ยังไม่ได้สำรอง
6. ❌ อย่า test ใน production server
7. ❌ อย่าให้สิทธิ์ 777 กับไฟล์

---

## Emergency Contacts & Resources

**ปัญหาฉุกเฉิน:**
- 📞 Support: xxx-xxx-xxxx
- 📧 Email: support@example.com

**ทรัพยากรเพิ่มเติม:**
- Apache Docs: https://httpd.apache.org/docs/
- MySQL Docs: https://dev.mysql.com/doc/
- BIND Docs: https://bind9.readthedocs.io/
- Postfix Docs: http://www.postfix.org/documentation.html

---

**เวอร์ชัน:** 2.0.0  
**อัปเดตล่าสุด:** ตุลาคม 2025

© 2025 Web Control Panel. สงวนลิขสิทธิ์.




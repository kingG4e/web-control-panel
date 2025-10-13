# คู่มือการใช้งานฟีเจอร์ Web Control Panel

## สารบัญ
1. [DNS Management](#1-dns-management)
2. [Virtual Host Management](#2-virtual-host-management)
3. [SSL Certificate Management](#3-ssl-certificate-management)
4. [Email Management](#4-email-management)
5. [File Manager](#5-file-manager)
6. [Database Management](#6-database-management)
7. [User Management](#7-user-management)
8. [System Monitoring](#8-system-monitoring)
9. [Quota Management](#9-quota-management)

---

## 1. DNS Management

DNS Management ช่วยให้คุณจัดการระบบชื่อโดเมน (Domain Name System) สำหรับเว็บไซต์และบริการต่างๆ

### 1.1 สร้าง DNS Zone

DNS Zone คือกลุ่มของ DNS Records สำหรับโดเมนหนึ่งๆ

**ขั้นตอน:**

1. ไปที่เมนู **DNS Management**
2. คลิกปุ่ม **"Create Zone"** มุมขวาบน
3. กรอกข้อมูลดังนี้:

| ฟิลด์ | คำอธิบาย | ตัวอย่าง |
|------|---------|----------|
| **Domain** | ชื่อโดเมนที่ต้องการจัดการ | example.com |
| **Primary Nameserver** | Name Server หลัก | ns1.example.com |
| **Admin Email** | อีเมลผู้ดูแล (ใช้ . แทน @) | admin.example.com |
| **Serial** | หลายครั้งจะสร้างอัตโนมัติ | 2025100901 |
| **Refresh** | ระยะเวลาที่ Secondary NS จะ refresh | 3600 (1 hour) |
| **Retry** | ระยะเวลาที่จะลองใหม่ถ้า refresh ล้มเหลว | 1800 (30 min) |
| **Expire** | ระยะเวลาที่ Zone จะหมดอายุ | 604800 (1 week) |
| **TTL** | Time To Live เริ่มต้นสำหรับ records | 86400 (24 hours) |

4. คลิก **"Create Zone"**

**ตัวอย่าง Zone File:**
```
$ORIGIN example.com.
$TTL 86400
@   IN  SOA ns1.example.com. admin.example.com. (
            2025100901  ; Serial
            3600        ; Refresh
            1800        ; Retry
            604800      ; Expire
            86400 )     ; Minimum TTL
```

### 1.2 จัดการ DNS Records

DNS Records กำหนดว่าชื่อโดเมนจะชี้ไปที่ไหน

#### ประเภทของ DNS Records

##### A Record (Address Record)
ชี้ชื่อโดเมนไปยัง IPv4 Address

**ตัวอย่าง:**
```
Name: www
Type: A
Value: 192.168.1.100
TTL: 3600
```

ผลลัพธ์: www.example.com → 192.168.1.100

**กรณีใช้งาน:**
- ชี้ www ไปยังเว็บเซิร์ฟเวอร์
- ชี้ subdomain ไปยัง IP ต่างๆ

##### AAAA Record (IPv6 Address)
ชี้ชื่อโดเมนไปยัง IPv6 Address

**ตัวอย่าง:**
```
Name: www
Type: AAAA
Value: 2001:0db8:85a3::8a2e:0370:7334
TTL: 3600
```

##### CNAME Record (Canonical Name)
สร้างชื่อเล่นของโดเมน (alias)

**ตัวอย่าง:**
```
Name: blog
Type: CNAME
Value: www.example.com
TTL: 3600
```

ผลลัพธ์: blog.example.com → www.example.com → 192.168.1.100

**กรณีใช้งาน:**
- ชี้หลาย subdomain ไปยังที่เดียวกัน
- ชี้ไปยังบริการภายนอก (เช่น blog.example.com → yourblog.wordpress.com)

**⚠️ ข้อควรระวัง:** 
- ห้ามสร้าง CNAME สำหรับ root domain (@)
- ห้ามมี Record อื่นที่ชื่อเดียวกันกับ CNAME

##### MX Record (Mail Exchange)
กำหนดเซิร์ฟเวอร์อีเมล

**ตัวอย่าง:**
```
Name: @
Type: MX
Value: mail.example.com
Priority: 10
TTL: 3600
```

**Priority:** ค่าน้อย = ความสำคัญสูง (ระบบจะลองส่งที่ Priority ต่ำก่อน)

**ตัวอย่างหลาย MX:**
```
@  IN  MX  10  mail1.example.com.
@  IN  MX  20  mail2.example.com.
@  IN  MX  30  mail3.example.com.
```

##### TXT Record (Text)
เก็บข้อความ ใช้สำหรับการยืนยันและตั้งค่าต่างๆ

**ตัวอย่าง SPF (Sender Policy Framework):**
```
Name: @
Type: TXT
Value: v=spf1 mx a ip4:192.168.1.100 ~all
TTL: 3600
```

**ตัวอย่าง DKIM:**
```
Name: default._domainkey
Type: TXT
Value: v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GN...
TTL: 3600
```

**ตัวอย่าง DMARC:**
```
Name: _dmarc
Type: TXT
Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@example.com
TTL: 3600
```

##### NS Record (Name Server)
กำหนด Name Server สำหรับ Zone

**ตัวอย่าง:**
```
Name: @
Type: NS
Value: ns1.example.com
TTL: 86400

Name: @
Type: NS
Value: ns2.example.com
TTL: 86400
```

##### PTR Record (Pointer)
ใช้สำหรับ Reverse DNS (IP → Domain)

**ตัวอย่าง:**
```
Name: 100.1.168.192.in-addr.arpa
Type: PTR
Value: www.example.com
TTL: 3600
```

##### SRV Record (Service)
ระบุตำแหน่งของบริการ

**รูปแบบ:**
```
_service._protocol.name TTL class SRV priority weight port target
```

**ตัวอย่าง:**
```
_sip._tcp.example.com. 86400 IN SRV 10 60 5060 sipserver.example.com.
```

### 1.3 การแก้ไข DNS Record

1. ไปที่ DNS Zone ที่ต้องการ
2. คลิกที่ Record ที่ต้องการแก้ไข
3. คลิกปุ่ม **"Edit"**
4. แก้ไขข้อมูล
5. คลิก **"Save"**

> **หมายเหตุ:** การเปลี่ยนแปลง DNS อาจใช้เวลาในการ propagate (แพร่กระจาย) ไปทั่วอินเทอร์เน็ต ซึ่งอาจใช้เวลา 24-48 ชั่วโมง

### 1.4 การลบ DNS Record

1. เลือก Record ที่ต้องการลบ
2. คลิกปุ่ม **"Delete"**
3. ยืนยันการลบ

### 1.5 การตรวจสอบ DNS

#### ใช้เครื่องมือภายนอก

**ตรวจสอบ A Record:**
```bash
dig example.com A
# หรือ
nslookup example.com
```

**ตรวจสอบ MX Record:**
```bash
dig example.com MX
```

**ตรวจสอบ TXT Record:**
```bash
dig example.com TXT
```

**ตรวจสอบจาก Name Server โดยตรง:**
```bash
dig @ns1.example.com example.com
```

### 1.6 ตัวอย่างการตั้งค่า DNS สำหรับเว็บไซต์

**สำหรับเว็บไซต์พื้นฐาน:**
```
; A Records
@       IN  A       192.168.1.100
www     IN  A       192.168.1.100

; NS Records
@       IN  NS      ns1.example.com.
@       IN  NS      ns2.example.com.

; MX Record
@       IN  MX  10  mail.example.com.

; Mail server A record
mail    IN  A       192.168.1.101

; SPF Record
@       IN  TXT     "v=spf1 mx a ~all"
```

---

## 2. Virtual Host Management

Virtual Host Management ช่วยให้คุณรันหลายเว็บไซต์บนเซิร์ฟเวอร์เดียวกัน

### 2.1 สร้าง Virtual Host

**ขั้นตอน:**

1. ไปที่เมนู **Virtual Hosts**
2. คลิกปุ่ม **"Create Virtual Host"**
3. กรอกข้อมูล:

| ฟิลด์ | คำอธิบาย | ตัวอย่าง |
|------|---------|----------|
| **Server Name** | ชื่อโดเมนหลัก | www.example.com |
| **Server Alias** | ชื่อโดเมนรอง (ไม่บังคับ) | example.com *.example.com |
| **Document Root** | โฟลเดอร์ที่เก็บไฟล์เว็บไซต์ | /var/www/example.com/public_html |
| **Port** | พอร์ตที่ใช้งาน | 80 (HTTP) หรือ 443 (HTTPS) |
| **Admin Email** | อีเมลผู้ดูแล | webmaster@example.com |

4. คลิก **"Create"**

### 2.2 ตัวอย่าง Virtual Host Configuration

**HTTP (Port 80):**
```apache
<VirtualHost *:80>
    ServerName www.example.com
    ServerAlias example.com
    ServerAdmin webmaster@example.com
    
    DocumentRoot /var/www/example.com/public_html
    
    <Directory /var/www/example.com/public_html>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
    
    ErrorLog ${APACHE_LOG_DIR}/example.com-error.log
    CustomLog ${APACHE_LOG_DIR}/example.com-access.log combined
</VirtualHost>
```

**HTTPS (Port 443):**
```apache
<VirtualHost *:443>
    ServerName www.example.com
    ServerAlias example.com
    ServerAdmin webmaster@example.com
    
    DocumentRoot /var/www/example.com/public_html
    
    SSLEngine on
    SSLCertificateFile /etc/ssl/certs/example.com.crt
    SSLCertificateKeyFile /etc/ssl/private/example.com.key
    SSLCertificateChainFile /etc/ssl/certs/ca-bundle.crt
    
    <Directory /var/www/example.com/public_html>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
    
    ErrorLog ${APACHE_LOG_DIR}/example.com-ssl-error.log
    CustomLog ${APACHE_LOG_DIR}/example.com-ssl-access.log combined
</VirtualHost>
```

### 2.3 การเปิดใช้งาน SSL

1. เลือก Virtual Host ที่ต้องการ
2. คลิกปุ่ม **"Enable SSL"**
3. เลือกใบรับรอง SSL ที่มีอยู่ หรือคลิก **"Create New Certificate"**
4. บันทึกการตั้งค่า

### 2.4 การตั้งค่า Redirect HTTP → HTTPS

**วิธีที่ 1: ผ่าน Virtual Host Configuration**
```apache
<VirtualHost *:80>
    ServerName www.example.com
    Redirect permanent / https://www.example.com/
</VirtualHost>
```

**วิธีที่ 2: ผ่าน .htaccess**
```apache
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

### 2.5 การตั้งค่า PHP

**ตั้งค่า PHP version (ถ้ารองรับหลาย version):**
```apache
<FilesMatch \.php$>
    SetHandler "proxy:unix:/var/run/php/php8.1-fpm.sock|fcgi://localhost"
</FilesMatch>
```

**ตั้งค่า PHP.ini:**
```apache
php_value upload_max_filesize 64M
php_value post_max_size 64M
php_value max_execution_time 300
php_value memory_limit 256M
```

### 2.6 การตั้งค่า URL Rewrite

**สำหรับ WordPress:**
```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /
    RewriteRule ^index\.php$ - [L]
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /index.php [L]
</IfModule>
```

**สำหรับ Laravel:**
```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteRule ^ index.php [L]
</IfModule>
```

### 2.7 การตั้งค่า Security Headers

```apache
# XSS Protection
Header set X-XSS-Protection "1; mode=block"

# Prevent Clickjacking
Header set X-Frame-Options "SAMEORIGIN"

# Content Type Security
Header set X-Content-Type-Options "nosniff"

# HSTS (HTTPS Only)
Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"

# Content Security Policy
Header set Content-Security-Policy "default-src 'self';"
```

---

## 3. SSL Certificate Management

SSL Certificate ช่วยเข้ารหัสการสื่อสารระหว่างเว็บเซิร์ฟเวอร์และผู้ใช้

### 3.1 ประเภทของ SSL Certificate

1. **Self-Signed Certificate**: สร้างเองฟรี แต่เบราว์เซอร์จะเตือน (เหมาะสำหรับทดสอบ)
2. **Let's Encrypt**: ฟรี ต่ออายุอัตโนมัติได้ (แนะนำสำหรับเว็บ production)
3. **Commercial Certificate**: ซื้อจาก CA (Certificate Authority) เชิงพาณิชย์

### 3.2 สร้าง Self-Signed Certificate

**ขั้นตอน:**

1. ไปที่ **SSL Certificates**
2. คลิก **"Create Certificate"**
3. เลือก **"Self-Signed"**
4. กรอกข้อมูล:

| ฟิลด์ | ตัวอย่าง |
|------|----------|
| **Common Name (CN)** | www.example.com |
| **Organization (O)** | My Company Ltd |
| **Organizational Unit (OU)** | IT Department |
| **Country (C)** | TH |
| **State (ST)** | Bangkok |
| **Locality (L)** | Bangkok |
| **Validity Days** | 365 |

5. คลิก **"Generate"**

**ผ่าน Command Line:**
```bash
# สร้าง Private Key
openssl genrsa -out example.com.key 2048

# สร้าง Certificate Signing Request (CSR)
openssl req -new -key example.com.key -out example.com.csr

# สร้าง Self-Signed Certificate
openssl x509 -req -days 365 -in example.com.csr -signkey example.com.key -out example.com.crt
```

### 3.3 ติดตั้ง Let's Encrypt Certificate

**ขั้นตอน:**

1. ไปที่ **SSL Certificates**
2. คลิก **"Create Certificate"**
3. เลือก **"Let's Encrypt"**
4. กรอกข้อมูล:
   - **Domain**: example.com
   - **Additional Domains**: www.example.com, blog.example.com
   - **Email**: admin@example.com
5. คลิก **"Issue Certificate"**

> **ข้อกำหนด:**
> - โดเมนต้องชี้มายัง IP ของเซิร์ฟเวอร์
> - พอร์ต 80 ต้องเปิดให้ Let's Encrypt verify ได้

**ผ่าน Command Line:**
```bash
# ติดตั้ง Certbot
sudo apt install certbot python3-certbot-apache

# ขอใบรับรอง
sudo certbot --apache -d example.com -d www.example.com

# หรือแบบ standalone
sudo certbot certonly --standalone -d example.com -d www.example.com
```

### 3.4 การต่ออายุ SSL Certificate

**Let's Encrypt (อัตโนมัติ):**

1. ไปที่ **SSL Certificates**
2. เลือกใบรับรองที่ใกล้หมดอายุ
3. คลิก **"Renew"**

**หรือตั้ง Cron Job อัตโนมัติ:**
```bash
# ทดสอบการต่ออายุ
sudo certbot renew --dry-run

# ตั้ง Cron Job (วิ่งทุกวัน เวลา 3:00)
crontab -e

# เพิ่มบรรทัดนี้
0 3 * * * certbot renew --quiet --post-hook "systemctl reload apache2"
```

### 3.5 การตรวจสอบ SSL Certificate

**ตรวจสอบวันหมดอายุ:**
```bash
openssl x509 -in /etc/ssl/certs/example.com.crt -noout -dates
```

**ตรวจสอบผ่านเว็บ:**
```bash
echo | openssl s_client -servername example.com -connect example.com:443 2>/dev/null | openssl x509 -noout -dates
```

**ตรวจสอบผ่านเครื่องมือออนไลน์:**
- https://www.ssllabs.com/ssltest/
- https://www.digicert.com/help/

### 3.6 การติดตั้ง Commercial SSL Certificate

1. สร้าง CSR (Certificate Signing Request)
2. ซื้อใบรับรอง SSL จาก CA
3. ดาวน์โหลดไฟล์ใบรับรอง
4. อัปโหลดไฟล์ผ่าน Web Control Panel:
   - Certificate (.crt)
   - Private Key (.key)
   - CA Bundle/Chain (.ca-bundle)
5. เลือก Virtual Host และเปิดใช้งาน

---

## 4. Email Management

Email Management ช่วยให้คุณจัดการระบบอีเมลสำหรับโดเมนของคุณ

### 4.1 สร้าง Email Domain

**ขั้นตอน:**

1. ไปที่ **Email Management**
2. คลิกแท็บ **"Domains"**
3. คลิก **"Add Domain"**
4. กรอกชื่อโดเมน: `example.com`
5. คลิก **"Create"**

### 4.2 ตั้งค่า DNS สำหรับอีเมล

**Records ที่จำเป็น:**

```
; MX Record
@       IN  MX  10  mail.example.com.

; A Record for mail server
mail    IN  A       192.168.1.100

; SPF Record
@       IN  TXT     "v=spf1 mx a ip4:192.168.1.100 ~all"

; DKIM Record (สร้างจาก Email Management)
default._domainkey  IN  TXT  "v=DKIM1; k=rsa; p=MIGfMA0..."

; DMARC Record
_dmarc  IN  TXT     "v=DMARC1; p=quarantine; rua=mailto:dmarc@example.com"
```

### 4.3 สร้าง Email Account

**ขั้นตอน:**

1. เลือก Email Domain
2. คลิกแท็บ **"Accounts"**
3. คลิก **"Add Account"**
4. กรอกข้อมูล:

| ฟิลด์ | ตัวอย่าง |
|------|----------|
| **Email Address** | user@example.com |
| **Password** | Strong_P@ssw0rd |
| **Full Name** | John Doe |
| **Quota (MB)** | 1000 (1 GB) |

5. คลิก **"Create Account"**

### 4.4 Email Forwarder

Email Forwarder ส่งต่ออีเมลไปยังที่อยู่อื่น

**ตัวอย่างการใช้งาน:**
- info@example.com → admin@gmail.com
- support@example.com → team@example.com
- sales@example.com → john@example.com, mary@example.com

**ขั้นตอน:**

1. คลิกแท็บ **"Forwarders"**
2. คลิก **"Add Forwarder"**
3. กรอกข้อมูล:
   - **Source**: info@example.com
   - **Destination**: admin@gmail.com
4. คลิก **"Create"**

**ส่งต่อไปหลายที่อยู่:**
- เพิ่ม Forwarder หลายรายการที่มี Source เดียวกัน
- หรือใส่ Destination คั่นด้วยเครื่องหมายคอมมา

### 4.5 Email Alias

Email Alias เป็นชื่อเล่นของอีเมลที่มีอยู่แล้ว

**ตัวอย่าง:**
- admin@example.com → user@example.com
- webmaster@example.com → user@example.com

**ความแตกต่างกับ Forwarder:**
- Alias: อีเมลที่ส่งมาจะเข้า Inbox ตรงๆ ไม่มีการส่งต่อ
- Forwarder: มีการส่งต่ออีเมล

### 4.6 ตั้งค่า Email Client

**IMAP/SMTP Settings:**

| การตั้งค่า | ค่า |
|-----------|-----|
| **IMAP Server** | mail.example.com |
| **IMAP Port** | 993 (SSL) หรือ 143 (STARTTLS) |
| **SMTP Server** | mail.example.com |
| **SMTP Port** | 465 (SSL) หรือ 587 (STARTTLS) |
| **Username** | user@example.com |
| **Password** | รหัสผ่านของคุณ |
| **Authentication** | Required |

**ตัวอย่าง Thunderbird:**
1. เปิด Thunderbird
2. เลือก **"Set up an existing email account"**
3. กรอกข้อมูล:
   - Your name: John Doe
   - Email address: user@example.com
   - Password: รหัสผ่านของคุณ
4. คลิก **"Continue"**
5. เลือก **"IMAP"**
6. แก้ไข Server settings ตามด้านบน
7. คลิก **"Done"**

### 4.7 การใช้งาน Webmail (Roundcube)

**ขั้นตอน:**

1. เปิดเบราว์เซอร์ไปที่: `https://your-domain.com/webmail`
2. กรอก:
   - **Username**: user@example.com
   - **Password**: รหัสผ่านของคุณ
3. คลิก **"Login"**

**ฟีเจอร์ของ Roundcube:**
- อ่านและส่งอีเมล
- จัดการโฟลเดอร์
- Address Book (สมุดที่อยู่)
- Filters (กรองอีเมล)
- Signatures (ลายเซ็น)

### 4.8 การตั้งค่า Email Filter (Sieve)

Email Filter ช่วยจัดระเบียบอีเมลอัตโนมัติ

**ตัวอย่างการใช้งาน:**
- ย้ายอีเมลจากผู้ส่งคนใดคนหนึ่งไปยังโฟลเดอร์
- ลบ spam อัตโนมัติ
- Forward อีเมลตามเงื่อนไข

**ตัวอย่าง Sieve Script:**
```sieve
require ["fileinto", "reject"];

# ย้ายอีเมลจาก boss ไปโฟลเดอร์ Important
if address :is "from" "boss@company.com" {
    fileinto "INBOX.Important";
}

# ลบ spam
if header :contains "subject" "[SPAM]" {
    discard;
}

# Auto-reply when on vacation
if header :contains "subject" "urgent" {
    redirect "emergency@example.com";
}
```

---

## 5. File Manager

File Manager ช่วยให้คุณจัดการไฟล์บนเซิร์ฟเวอร์ผ่านหน้าเว็บ

### 5.1 การอัปโหลดไฟล์

**วิธีที่ 1: Upload ปกติ**
1. ไปที่โฟลเดอร์ที่ต้องการ
2. คลิกปุ่ม **"Upload"**
3. เลือกไฟล์
4. คลิก **"Upload"**

**วิธีที่ 2: Drag & Drop**
1. ลากไฟล์จากคอมพิวเตอร์
2. วางในพื้นที่ File Manager

**ขีดจำกัด:**
- ขนาดไฟล์สูงสุด: 100 MB (ต่อไฟล์)
- ประเภทไฟล์ที่อนุญาต: ทุกประเภท (ยกเว้นไฟล์ที่เป็นอันตราย)

### 5.2 การสร้างและจัดการโฟลเดอร์

**สร้างโฟลเดอร์:**
1. คลิกปุ่ม **"New Folder"**
2. ตั้งชื่อโฟลเดอร์
3. กด Enter

**เปลี่ยนชื่อ:**
1. คลิกขวาที่ไฟล์/โฟลเดอร์
2. เลือก **"Rename"**
3. ใส่ชื่อใหม่

**ย้ายไฟล์:**
1. คลิกที่ไฟล์
2. ลากไปยังโฟลเดอร์ปลายทาง

**คัดลอก:**
1. คลิกขวาที่ไฟล์
2. เลือก **"Copy"**
3. ไปยังโฟลเดอร์ปลายทาง
4. คลิกขวา → **"Paste"**

### 5.3 การแก้ไขไฟล์

File Manager มี Code Editor ในตัว รองรับ Syntax Highlighting

**ขั้นตอน:**
1. คลิกที่ไฟล์ที่ต้องการแก้ไข
2. คลิก **"Edit"**
3. แก้ไขโค้ด
4. กด **Ctrl+S** หรือคลิก **"Save"**

**รองรับภาษา:**
- HTML, CSS, JavaScript
- PHP, Python, Ruby
- JSON, XML, YAML
- และอื่นๆ อีกมากมาย

**Keyboard Shortcuts:**
- `Ctrl+S`: Save
- `Ctrl+F`: Find
- `Ctrl+H`: Find and Replace
- `Ctrl+Z`: Undo
- `Ctrl+Y`: Redo

### 5.4 การตั้งค่าสิทธิ์ (Permissions)

สิทธิ์ไฟล์ใน Linux มี 3 ระดับ:
- **Owner**: เจ้าของไฟล์
- **Group**: กลุ่มของไฟล์
- **Others**: ผู้ใช้อื่นๆ

สิทธิ์แบ่งเป็น:
- **Read (r)**: อ่านได้ (4)
- **Write (w)**: เขียนได้ (2)
- **Execute (x)**: รันได้ (1)

**ตัวอย่างสิทธิ์:**

| สิทธิ์ | เลข | การใช้งาน |
|-------|------|----------|
| -rw-r--r-- | 644 | ไฟล์ปกติ (owner อ่าน-เขียน, อื่นๆ อ่านอย่างเดียว) |
| -rw-rw-r-- | 664 | ไฟล์ที่กลุ่มแก้ไขได้ |
| -rwxr-xr-x | 755 | โปรแกรม/สคริปต์ที่รันได้ |
| drwxr-xr-x | 755 | โฟลเดอร์ปกติ |
| -rw------- | 600 | ไฟล์ส่วนตัว (เฉพาะ owner) |

**วิธีเปลี่ยนสิทธิ์:**
1. คลิกขวาที่ไฟล์/โฟลเดอร์
2. เลือก **"Permissions"**
3. เลือกสิทธิ์ที่ต้องการ
4. คลิก **"Save"**

### 5.5 การบีบอัดและแตกไฟล์

**สร้าง Archive (บีบอัด):**
1. เลือกไฟล์/โฟลเดอร์ที่ต้องการ (กด Ctrl เพื่อเลือกหลายรายการ)
2. คลิกขวา → **"Compress"**
3. เลือกรูปแบบ:
   - .zip
   - .tar.gz
   - .tar.bz2
4. ตั้งชื่อไฟล์
5. คลิก **"Compress"**

**แตกไฟล์ (Extract):**
1. คลิกขวาที่ไฟล์ archive
2. เลือก **"Extract"**
3. เลือกปลายทาง
4. คลิก **"Extract"**

### 5.6 การค้นหาไฟล์

1. คลิกปุ่ม **"Search"** (หรือกด Ctrl+F)
2. พิมพ์ชื่อไฟล์ที่ต้องการหา
3. เลือกตัวเลือกเพิ่มเติม:
   - ค้นหาใน subfolder
   - Case sensitive
   - ค้นหาตามประเภทไฟล์
4. กด Enter

### 5.7 การดูข้อมูลไฟล์

**ดูรายละเอียด:**
1. คลิกขวาที่ไฟล์
2. เลือก **"Properties"**

**ข้อมูลที่แสดง:**
- ชื่อไฟล์
- ขนาด
- ประเภท (MIME type)
- สิทธิ์
- เจ้าของ
- วันที่สร้าง/แก้ไข

---

## 6. Database Management

Database Management ช่วยให้คุณจัดการฐานข้อมูล MySQL/MariaDB

### 6.1 สร้างฐานข้อมูล

**ขั้นตอน:**

1. ไปที่ **Database Management**
2. คลิกปุ่ม **"Create Database"**
3. กรอกข้อมูล:

| ฟิลด์ | ตัวอย่าง | คำอธิบาย |
|------|----------|----------|
| **Database Name** | myapp_db | ชื่อฐานข้อมูล (ตัวอักษร, ตัวเลข, _ เท่านั้น) |
| **Character Set** | utf8mb4 | รองรับภาษาทุกภาษา รวม emoji |
| **Collation** | utf8mb4_unicode_ci | การเรียงลำดับและเปรียบเทียบ |

4. คลิก **"Create"**

**Character Set แนะนำ:**
- **utf8mb4**: แนะนำสำหรับทุกกรณี (รองรับ emoji)
- **utf8**: เก่ากว่า utf8mb4 (ไม่รองรับ emoji)
- **latin1**: สำหรับภาษาอังกฤษเท่านั้น

### 6.2 สร้าง Database User

**ขั้นตอน:**

1. คลิกแท็บ **"Users"**
2. คลิก **"Create User"**
3. กรอกข้อมูล:

| ฟิลด์ | ตัวอย่าง | คำอธิบาย |
|------|----------|----------|
| **Username** | myapp_user | ชื่อผู้ใช้ |
| **Host** | localhost | โฮสต์ที่อนุญาต |
| **Password** | Strong_P@ss123 | รหัสผ่าน |

**ค่า Host:**
- `localhost`: เฉพาะจากเซิร์ฟเวอร์เดียวกัน (แนะนำ)
- `%`: จากไหนก็ได้ (อันตราย ไม่แนะนำ)
- `192.168.1.%`: จาก IP ในช่วง 192.168.1.x
- `192.168.1.100`: จาก IP เฉพาะเจาะจง

4. คลิก **"Create"**

### 6.3 การให้สิทธิ์ (Grant Privileges)

**ขั้นตอน:**

1. เลือกฐานข้อมูล
2. คลิกแท็บ **"Privileges"**
3. คลิก **"Grant Privileges"**
4. เลือกผู้ใช้
5. เลือกสิทธิ์:

**สิทธิ์หลัก:**

| สิทธิ์ | คำอธิบาย | กรณีใช้งาน |
|-------|---------|------------|
| **SELECT** | อ่านข้อมูล | จำเป็นสำหรับทุก application |
| **INSERT** | เพิ่มข้อมูล | แอปที่ต้องสร้างข้อมูลใหม่ |
| **UPDATE** | แก้ไขข้อมูล | แอปที่ต้องอัปเดตข้อมูล |
| **DELETE** | ลบข้อมูล | แอปที่ต้องลบข้อมูล |
| **CREATE** | สร้างตาราง | แอปที่ต้องสร้างโครงสร้าง |
| **DROP** | ลบตาราง | ระวัง! อันตราย |
| **ALTER** | แก้ไขโครงสร้างตาราง | Migration scripts |
| **INDEX** | จัดการ indexes | ปรับปรุงประสิทธิภาพ |
| **ALL PRIVILEGES** | สิทธิ์ทั้งหมด | ผู้ดูแลฐานข้อมูล |

6. คลิก **"Grant"**

**ตัวอย่าง SQL:**
```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON myapp_db.* TO 'myapp_user'@'localhost';
FLUSH PRIVILEGES;
```

### 6.4 การนำเข้าฐานข้อมูล (Import)

**ขั้นตอน:**

1. เลือกฐานข้อมูล
2. คลิกแท็บ **"Import"**
3. คลิก **"Choose File"**
4. เลือกไฟล์ SQL (.sql หรือ .sql.gz)
5. คลิก **"Import"**

**ผ่าน Command Line:**
```bash
mysql -u username -p database_name < backup.sql
```

**Import ไฟล์ใหญ่:**
```bash
# แบ่งไฟล์ออกเป็นส่วนๆ
split -l 10000 large_backup.sql small_backup_

# Import ทีละส่วน
for file in small_backup_*; do
    mysql -u username -p database_name < $file
done
```

### 6.5 การส่งออกฐานข้อมูล (Export/Backup)

**ขั้นตอน:**

1. เลือกฐานข้อมูล
2. คลิกแท็บ **"Export"**
3. เลือกตัวเลือก:
   - **Tables**: เลือกตารางที่ต้องการ (หรือทั้งหมด)
   - **Format**: SQL, CSV, JSON
   - **Compression**: None, gzip, zip
   - **Include**: Structure, Data, หรือทั้งคู่
4. คลิก **"Export"**

**ผ่าน Command Line:**
```bash
# Backup ทั้งฐานข้อมูล
mysqldump -u username -p database_name > backup.sql

# Backup พร้อม compress
mysqldump -u username -p database_name | gzip > backup.sql.gz

# Backup เฉพาะ structure (ไม่มีข้อมูล)
mysqldump -u username -p --no-data database_name > structure.sql

# Backup เฉพาะข้อมูล
mysqldump -u username -p --no-create-info database_name > data.sql
```

### 6.6 การรัน SQL Queries

**ขั้นตอน:**

1. เลือกฐานข้อมูล
2. คลิกแท็บ **"SQL"**
3. พิมพ์ SQL query
4. คลิก **"Run"** (หรือกด Ctrl+Enter)

**ตัวอย่าง Queries:**

**CREATE Table:**
```sql
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**INSERT Data:**
```sql
INSERT INTO users (username, email, password) 
VALUES ('john_doe', 'john@example.com', 'hashed_password');
```

**SELECT Data:**
```sql
SELECT * FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY);
```

**UPDATE Data:**
```sql
UPDATE users SET email = 'newemail@example.com' WHERE username = 'john_doe';
```

**DELETE Data:**
```sql
DELETE FROM users WHERE created_at < DATE_SUB(NOW(), INTERVAL 1 YEAR);
```

### 6.7 การเชื่อมต่อจาก Application

**PHP:**
```php
<?php
$host = 'localhost';
$dbname = 'myapp_db';
$username = 'myapp_user';
$password = 'Strong_P@ss123';

// PDO
try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die("Connection failed: " . $e->getMessage());
}

// MySQLi
$mysqli = new mysqli($host, $username, $password, $dbname);
if ($mysqli->connect_error) {
    die("Connection failed: " . $mysqli->connect_error);
}
?>
```

**Python:**
```python
import mysql.connector

conn = mysql.connector.connect(
    host='localhost',
    database='myapp_db',
    user='myapp_user',
    password='Strong_P@ss123'
)

cursor = conn.cursor()
cursor.execute("SELECT * FROM users")
rows = cursor.fetchall()

conn.close()
```

**Node.js:**
```javascript
const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'myapp_user',
    password: 'Strong_P@ss123',
    database: 'myapp_db'
});

connection.connect((err) => {
    if (err) throw err;
    console.log('Connected!');
});
```

---

## 7. User Management

User Management ช่วยให้ผู้ดูแลระบบจัดการผู้ใช้และสิทธิ์

### 7.1 สร้างผู้ใช้ใหม่

**ขั้นตอน (เฉพาะ Admin):**

1. ไปที่ **User Management**
2. คลิก **"Create User"**
3. กรอกข้อมูล:

| ฟิลด์ | ตัวอย่าง |
|------|----------|
| **Username** | john_doe |
| **Email** | john@example.com |
| **Password** | Strong_P@ss123 |
| **Full Name** | John Doe |
| **Role** | User หรือ Admin |
| **Storage Quota** | 10240 MB (10 GB) |

4. คลิก **"Create"**

### 7.2 บทบาท (Roles)

**User (ผู้ใช้ทั่วไป):**
- จัดการ Virtual Hosts ของตัวเอง
- จัดการ DNS Zones ของตัวเอง
- จัดการ Email ของตัวเอง
- จัดการไฟล์ของตัวเอง
- ดู Dashboard และสถิติของตัวเอง

**Admin (ผู้ดูแลระบบ):**
- ทุกอย่างของ User
- จัดการผู้ใช้ทั้งหมด
- ดูและแก้ไขทรัพยากรของทุกคน
- ดู System Logs
- จัดการ System Settings
- ควบคุมบริการระบบ

### 7.3 การแก้ไขข้อมูลผู้ใช้

1. เลือกผู้ใช้ที่ต้องการแก้ไข
2. คลิก **"Edit"**
3. แก้ไขข้อมูล
4. คลิก **"Save"**

### 7.4 การรีเซ็ตรหัสผ่าน (Admin)

1. เลือกผู้ใช้
2. คลิก **"Reset Password"**
3. กรอกรหัสผ่านใหม่
4. คลิก **"Reset"**

### 7.5 การเปลี่ยนรหัสผ่านของตัวเอง

1. คลิกชื่อผู้ใช้มุมบนขวา
2. เลือก **"Change Password"**
3. กรอก:
   - รหัสผ่านเก่า
   - รหัสผ่านใหม่
   - ยืนยันรหัสผ่านใหม่
4. คลิก **"Change Password"**

---

## 8. System Monitoring

System Monitoring ช่วยให้คุณติดตามสถานะและประสิทธิภาพของระบบ

### 8.1 Dashboard

Dashboard แสดงภาพรวมของระบบ:

- **System Health Score**: คะแนนสุขภาพระบบ (0-100)
- **CPU Usage**: การใช้งาน CPU (%)
- **Memory Usage**: การใช้งาน RAM (%)
- **Disk Usage**: การใช้งานพื้นที่ (%)
- **Network Traffic**: ข้อมูลเครือข่าย (รับ/ส่ง)
- **Active Services**: บริการที่กำลังทำงาน

### 8.2 System Metrics

คลิกที่ **"System"** → **"Metrics"** เพื่อดูข้อมูลละเอียด:

**CPU:**
- Load Average (1, 5, 15 นาที)
- CPU Cores
- CPU Speed

**Memory:**
- Total RAM
- Used RAM
- Free RAM
- Cached

**Disk:**
- Total Space
- Used Space
- Free Space
- Partitions

**Network:**
- Bytes Sent
- Bytes Received
- Packets
- Errors

### 8.3 Service Status

ตรวจสอบสถานะบริการ:

| บริการ | สถานะ | การทำงาน |
|--------|------|----------|
| Apache | 🟢 Running | เว็บเซิร์ฟเวอร์ |
| MySQL/MariaDB | 🟢 Running | ฐานข้อมูล |
| BIND | 🟢 Running | DNS Server |
| Postfix | 🟢 Running | อีเมล (SMTP) |
| Dovecot | 🟢 Running | อีเมล (IMAP/POP3) |

**การจัดการบริการ (Admin):**
- **Start**: เริ่มบริการ
- **Stop**: หยุดบริการ
- **Restart**: รีสตาร์ทบริการ
- **Reload**: โหลด configuration ใหม่

### 8.4 Logs

ดู Logs ของระบบ (เฉพาะ Admin):

**Application Logs:**
- Error logs
- Access logs
- Debug logs

**System Logs:**
- Apache error/access logs
- MySQL error logs
- Mail logs
- DNS logs

**การกรอง Logs:**
- ตามระดับ (INFO, WARNING, ERROR)
- ตามวันที่
- ตามคำค้นหา

---

## 9. Quota Management

Quota Management ช่วยจำกัดการใช้ทรัพยากรของแต่ละผู้ใช้

### 9.1 ดูโควต้าของตัวเอง

1. ไปที่ **"Quota"** ในเมนู
2. ดูข้อมูล:
   - **Storage Used**: พื้นที่ที่ใช้ไป
   - **Storage Limit**: พื้นที่ทั้งหมด
   - **Percentage**: เปอร์เซ็นต์การใช้งาน

**แผนภูมิแสดง:**
- ไฟล์เว็บไซต์
- ฐานข้อมูล
- อีเมล
- Backups

### 9.2 การตั้งค่าโควต้า (Admin)

1. ไปที่ **User Management**
2. เลือกผู้ใช้
3. คลิก **"Edit Quota"**
4. ตั้งค่า:
   - Storage Quota (MB)
   - Database Quota (MB)
   - Email Quota (MB)
5. คลิก **"Save"**

### 9.3 เมื่อโควต้าใกล้เต็ม

**ที่ 80%:**
- แจ้งเตือนทางอีเมล
- แสดงข้อความบนหน้าเว็บ

**ที่ 90%:**
- แจ้งเตือนซ้ำ
- แนะนำให้ลบไฟล์

**ที่ 100%:**
- ไม่สามารถอัปโหลดไฟล์เพิ่มได้
- ไม่สามารถสร้างฐานข้อมูลใหม่ได้
- อีเมลอาจถูกปฏิเสธ

**วิธีแก้ไข:**
- ลบไฟล์ที่ไม่จำเป็น
- ลบอีเมลเก่า
- ลบฐานข้อมูลที่ไม่ใช้
- ติดต่อ Admin เพื่อขอเพิ่มโควต้า

---

## เคล็ดลับและ Best Practices

### DNS
- ใช้ TTL สูง (86400) สำหรับ records ที่ไม่ค่อยเปลี่ยน
- ใช้ TTL ต่ำ (300-600) เมื่อจะเปลี่ยนแปลง IP
- ตั้ง MX records ให้มี backup
- ใช้ SPF, DKIM, DMARC สำหรับความปลอดภัยอีเมล

### Virtual Hosts
- ใช้ชื่อ ServerName ที่ชัดเจน
- เปิดใช้งาน SSL สำหรับทุกเว็บไซต์
- ตั้งค่า redirect HTTP → HTTPS
- ใช้ security headers

### SSL
- ใช้ Let's Encrypt สำหรับ production (ฟรี)
- ตั้ง auto-renewal
- ตรวจสอบใบรับรอง SSL ก่อนหมดอายุ
- ใช้ SSL Labs ตรวจสอบคะแนน

### Email
- ตั้ง SPF, DKIM, DMARC ให้ครบ
- ใช้รหัสผ่านที่แข็งแรง
- ตั้ง quota ให้เหมาะสม
- สำรองอีเมลเป็นประจำ

### Files
- ตั้งสิทธิ์ไฟล์ให้ถูกต้อง (644/755)
- อย่าให้สิทธิ์ 777
- สำรองไฟล์สำคัญ
- ลบไฟล์เก่าที่ไม่ใช้

### Database
- ใช้ strong passwords
- ให้สิทธิ์เท่าที่จำเป็น
- สำรองฐานข้อมูลทุกวัน
- ใช้ UTF8MB4 สำหรับ character set

---

**เวอร์ชัน:** 2.0.0  
**อัปเดตล่าสุด:** ตุลาคม 2025

© 2025 Web Control Panel. สงวนลิขสิทธิ์.




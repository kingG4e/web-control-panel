# 🌐 Roundcube Webmail Integration Guide

This guide will help you integrate Roundcube webmail client with your Web Control Panel.

## 📋 Prerequisites

- Ubuntu/Debian server with Apache2
- MySQL/MariaDB database server
- PHP 7.4 or higher
- Web Control Panel already installed

## 🚀 Installation Steps

### 1. Install Roundcube

```bash
# Update package lists
sudo apt update

# Install Roundcube and dependencies
sudo apt install roundcube roundcube-core roundcube-mysql

# Install additional PHP modules if needed
sudo apt install php-mysql php-mbstring php-intl php-xml php-zip
```

### 2. Configure Roundcube Database

Run the configuration script:

```bash
# Navigate to your web control panel directory
cd /path/to/web-control-panel

# Run the Roundcube configuration script
sudo python3 backend/configure_roundcube.py
```

The script will:
- ✅ Find your Roundcube installation
- 🗄️ Create and configure the database
- ⚙️ Generate configuration files
- 🌐 Configure Apache virtual hosts
- 🔐 Set up security settings

### 3. Manual Configuration (Alternative)

If you prefer manual configuration:

#### Database Setup
```sql
-- Connect to MySQL as root
mysql -u root -p

-- Create database and user
CREATE DATABASE roundcube CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'roundcube'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON roundcube.* TO 'roundcube'@'localhost';
FLUSH PRIVILEGES;
EXIT;

-- Initialize database schema
mysql -u roundcube -p roundcube < /usr/share/roundcube/SQL/mysql.initial.sql
```

#### Configuration File
Create `/usr/share/roundcube/config/config.inc.php`:

```php
<?php
$config = array();

// Database configuration
$config['db_dsnw'] = 'mysql://roundcube:your_password@localhost/roundcube';

// IMAP configuration
$config['default_host'] = 'localhost';
$config['default_port'] = 143;

// SMTP configuration
$config['smtp_server'] = 'localhost';
$config['smtp_port'] = 587;
$config['smtp_user'] = '%u';
$config['smtp_pass'] = '%p';

// General settings
$config['product_name'] = 'Webmail';
$config['des_key'] = 'your_24_character_des_key_here';
$config['plugins'] = array('archive', 'zipdownload');

// Security
$config['session_lifetime'] = 30;
$config['ip_check'] = true;
$config['referer_check'] = true;

// Features
$config['enable_installer'] = false;
$config['auto_create_user'] = true;
?>
```

### 4. Apache Configuration

#### Option A: Subdomain (Recommended)
Create `/etc/apache2/sites-available/webmail.conf`:

```apache
<VirtualHost *:80>
    ServerName webmail.yourdomain.com
    DocumentRoot /usr/share/roundcube
    
    <Directory /usr/share/roundcube>
        Options -Indexes
        AllowOverride All
        Require all granted
    </Directory>
    
    # Security headers
    Header always set X-Content-Type-Options nosniff
    Header always set X-Frame-Options DENY
    Header always set X-XSS-Protection "1; mode=block"
</VirtualHost>

<VirtualHost *:443>
    ServerName webmail.yourdomain.com
    DocumentRoot /usr/share/roundcube
    
    SSLEngine on
    SSLCertificateFile /path/to/your/certificate.crt
    SSLCertificateKeyFile /path/to/your/private.key
    
    <Directory /usr/share/roundcube>
        Options -Indexes
        AllowOverride All
        Require all granted
    </Directory>
    
    # Security headers
    Header always set X-Content-Type-Options nosniff
    Header always set X-Frame-Options DENY
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
</VirtualHost>
```

#### Option B: Directory Alias
Create `/etc/apache2/conf-available/roundcube.conf`:

```apache
Alias /roundcube /usr/share/roundcube

<Directory /usr/share/roundcube>
    Options -Indexes
    AllowOverride All
    Require all granted
</Directory>
```

Enable the configuration:

```bash
# For subdomain
sudo a2ensite webmail
sudo systemctl reload apache2

# For directory alias
sudo a2enconf roundcube
sudo systemctl reload apache2
```

### 5. Mail Server Configuration

Ensure your mail server (Postfix + Dovecot) is properly configured:

#### Postfix Configuration
Add to `/etc/postfix/main.cf`:
```
# Virtual mailbox settings
virtual_mailbox_domains = /etc/postfix/virtual_domains
virtual_mailbox_base = /var/mail/vhosts
virtual_mailbox_maps = /etc/postfix/virtual_mailboxes
virtual_minimum_uid = 100
virtual_uid_maps = static:5000
virtual_gid_maps = static:5000
```

#### Dovecot Configuration
Update `/etc/dovecot/dovecot.conf`:
```
# Authentication
auth_mechanisms = plain login
passdb {
  driver = passwd-file
  args = /etc/dovecot/users
}
userdb {
  driver = passwd-file
  args = /etc/dovecot/users
}

# Mail location
mail_location = maildir:/var/mail/vhosts/%d/%n
```

## 🔧 Web Control Panel Integration

The Web Control Panel includes several features for Roundcube integration:

### Backend API Endpoints
- `GET /api/roundcube/status` - Check Roundcube status
- `GET /api/roundcube/webmail-url` - Get webmail URL
- `POST /api/roundcube/configure` - Configure Roundcube
- `GET /api/roundcube/domains` - List domains with webmail

### Frontend Features
- ✅ Roundcube status monitoring
- 🔗 Direct webmail access buttons
- ⚙️ Configuration management
- 👥 Per-account webmail access

## 🌐 Access URLs

After configuration, you can access webmail at:

- **Subdomain**: `https://webmail.yourdomain.com`
- **Directory**: `https://yourdomain.com/roundcube`
- **IP Address**: `http://your-server-ip/roundcube`

## 🔐 Security Considerations

1. **SSL/TLS Certificate**: Always use HTTPS for webmail access
2. **Strong Passwords**: Use secure database passwords
3. **File Permissions**: Ensure proper file permissions on config files
4. **Firewall**: Configure firewall rules appropriately
5. **Regular Updates**: Keep Roundcube updated

## 🐛 Troubleshooting

### Common Issues

#### 1. Database Connection Error
```
Error: Database connection failed
```
**Solution**: Check database credentials in `config.inc.php`

#### 2. Login Failed
```
Error: Login failed for user
```
**Solutions**:
- Verify IMAP/SMTP server settings
- Check mail server logs: `sudo tail -f /var/log/mail.log`
- Ensure email account exists in mail server

#### 3. Permission Denied
```
Error: Permission denied
```
**Solution**: Check file permissions:
```bash
sudo chown -R www-data:www-data /usr/share/roundcube
sudo chmod -R 755 /usr/share/roundcube
sudo chmod 640 /usr/share/roundcube/config/config.inc.php
```

#### 4. Plugin Errors
```
Error: Plugin not found
```
**Solution**: Install missing plugins:
```bash
sudo apt install roundcube-plugins
```

### Log Files
- **Roundcube**: `/usr/share/roundcube/logs/`
- **Apache**: `/var/log/apache2/`
- **Mail Server**: `/var/log/mail.log`

## 📚 Additional Resources

- [Roundcube Official Documentation](https://roundcube.net/doc/)
- [Postfix Configuration Guide](http://www.postfix.org/documentation.html)
- [Dovecot Configuration Guide](https://doc.dovecot.org/)

## 🆘 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review log files for error messages
3. Verify your mail server configuration
4. Test with a simple email client first

---

**Note**: This integration provides a seamless webmail experience within your Web Control Panel, allowing users to access their email accounts directly from the management interface.
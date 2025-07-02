# Web Control Panel - Backend

A comprehensive web control panel backend built with Flask for managing web hosting services including virtual hosts, DNS, SSL certificates, email, databases, and FTP accounts.

## 🚀 Features

- **Virtual Host Management** - Create, configure, and manage Apache virtual hosts
- **DNS Management** - Manage BIND DNS zones and records
- **SSL Certificate Management** - Automatic SSL certificate generation and renewal
- **Email Management** - Configure email domains, accounts, and forwarders
- **Database Management** - MySQL database creation and management
- **FTP Account Management** - Create and manage FTP user accounts
- **User Management** - Multi-user system with role-based permissions
- **File Manager** - Web-based file management system
- **System Monitoring** - Real-time system statistics and service status

## 🏗️ Architecture

```
backend/
├── app.py                 # Main application factory
├── config.py             # Configuration management
├── requirements.txt      # Python dependencies
├── routes/              # API route blueprints
│   ├── auth.py          # Authentication routes
│   ├── user.py          # User management routes
│   ├── virtual_host.py  # Virtual host routes
│   ├── dns.py           # DNS management routes
│   ├── ssl.py           # SSL certificate routes
│   ├── email.py         # Email management routes
│   ├── database.py      # Database management routes
│   ├── ftp.py           # FTP management routes
│   ├── files.py         # File management routes
│   ├── system.py        # System monitoring routes
│   ├── notifications.py # Notification routes
│   └── roundcube.py     # Roundcube integration routes
├── services/            # Business logic services
│   ├── auth_service.py      # Authentication service
│   ├── user_service.py      # User management service
│   ├── virtual_host_service.py  # Virtual host service
│   ├── apache_service.py    # Apache configuration service
│   ├── bind_service.py      # DNS management service
│   ├── ssl_service.py       # SSL certificate service
│   ├── email_service.py     # Email management service
│   ├── mysql_service.py     # Database management service
│   ├── ftp_service.py       # FTP management service
│   ├── file_service.py      # File management service
│   ├── linux_user_service.py # Linux user management
│   └── roundcube_service.py # Roundcube integration
├── models/              # Database models
│   ├── user.py          # User model
│   ├── virtual_host.py  # Virtual host model
│   ├── dns.py           # DNS models
│   ├── ssl_certificate.py # SSL certificate model
│   ├── email.py         # Email models
│   ├── database.py      # Database model
│   ├── ftp.py           # FTP model
│   └── notification.py  # Notification model
└── utils/               # Utility modules
    ├── logger.py        # Logging configuration
    ├── auth.py          # Authentication utilities
    ├── permissions.py   # Permission management
    ├── security.py      # Security utilities
    └── error_handlers.py # Error handling
```

## 🛠️ Installation

### Prerequisites

- Python 3.8+
- MySQL/MariaDB (optional, SQLite is used by default)
- Apache2 (for virtual host management)
- BIND9 (for DNS management)
- vsftpd (for FTP management)

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd web-control-panel/backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Initialize the database**
   ```bash
   python recreate_db.py
   python create_admin_user.py
   ```

6. **Run the application**
   ```bash
   python app.py
   ```

## ⚙️ Configuration

The application uses a configuration system with different environments:

### Environment Variables

```bash
# Flask Configuration
SECRET_KEY=your-secret-key
FLASK_DEBUG=True
DATABASE_URL=sqlite:///controlpanel.db

# Authentication
JWT_SECRET_KEY=your-jwt-secret

# Email Configuration
MAIL_SERVER=localhost
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=your-email
MAIL_PASSWORD=your-password

# System Paths
APACHE_CONFIG_DIR=/etc/apache2/sites-available
BIND_CONFIG_DIR=/etc/bind
SSL_CERT_PATH=/etc/ssl/certs
FTP_CONFIG_DIR=/etc/vsftpd
```

### Configuration Classes

- `DevelopmentConfig` - Development environment
- `TestingConfig` - Testing environment  
- `ProductionConfig` - Production environment

## 🔐 Authentication

The system supports multiple authentication methods:

1. **Database Authentication** - Users stored in SQLite/MySQL
2. **System Authentication** - Linux PAM authentication
3. **JWT Tokens** - Stateless authentication for API access

### User Roles

- **Admin** - Full system access
- **User** - Limited access to own resources
- **System User** - Linux system user integration

## 📡 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/user` - Get current user
- `POST /api/auth/register` - User registration

### Virtual Hosts
- `GET /api/virtual-hosts` - List virtual hosts
- `POST /api/virtual-hosts` - Create virtual host
- `PUT /api/virtual-hosts/{id}` - Update virtual host
- `DELETE /api/virtual-hosts/{id}` - Delete virtual host

### DNS Management
- `GET /api/dns/zones` - List DNS zones
- `POST /api/dns/zones` - Create DNS zone
- `GET /api/dns/zones/{id}/records` - List DNS records
- `POST /api/dns/zones/{id}/records` - Create DNS record

### SSL Certificates
- `GET /api/ssl/certificates` - List SSL certificates
- `POST /api/ssl/certificates` - Create SSL certificate
- `PUT /api/ssl/certificates/{id}/renew` - Renew certificate

### Email Management
- `GET /api/email/domains` - List email domains
- `POST /api/email/domains/{id}/accounts` - Create email account
- `GET /api/email/domains/{id}/forwarders` - List email forwarders

### Database Management
- `GET /api/databases` - List databases
- `POST /api/databases` - Create database
- `DELETE /api/databases/{id}` - Delete database

### File Management
- `GET /api/files/list` - List files
- `POST /api/files/upload` - Upload file
- `DELETE /api/files/delete` - Delete file

### System Monitoring
- `GET /api/system/stats` - System statistics
- `GET /api/system/services` - Service status
- `GET /api/dashboard/stats` - Dashboard statistics

## 🔧 Development

### Code Style

The project uses:
- **Black** for code formatting
- **Flake8** for linting
- **Type hints** for better code documentation

### Running Tests

```bash
pytest
```

### Code Formatting

```bash
black .
flake8 .
```

## 🚀 Deployment

### Production Setup

1. **Use production configuration**
   ```bash
   export FLASK_ENV=production
   ```

2. **Set up a production database**
   ```bash
   export DATABASE_URL=mysql://user:password@localhost/controlpanel
   ```

3. **Configure reverse proxy (nginx)**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://127.0.0.1:5000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

4. **Use WSGI server**
   ```bash
   pip install gunicorn
   gunicorn -w 4 -b 127.0.0.1:5000 app:app
   ```

### Docker Deployment

```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 5000

CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "app:app"]
```

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📞 Support

For support and questions, please open an issue on GitHub. 
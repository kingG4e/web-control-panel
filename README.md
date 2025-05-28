# Web Hosting Control Panel Installation Guide

## System Requirements
- Ubuntu Server 20.04 LTS or newer
- Python 3.8+
- Node.js 16+
- PostgreSQL 12+
- Nginx

## Installation Steps

### 1. System Dependencies
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install system dependencies
sudo apt install -y python3-pip python3-venv nginx postgresql postgresql-contrib

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt install -y nodejs
```

### 2. Clone Repository
```bash
git clone https://github.com/yourusername/controlpanel.git
cd controlpanel
```

### 3. Backend Setup
```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Setup database
sudo -u postgres psql
CREATE DATABASE controlpanel;
CREATE USER cpanel WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE controlpanel TO cpanel;
\q

# Run migrations
python manage.py db upgrade
```

### 4. Frontend Setup
```bash
cd frontend
npm install
npm run build
```

### 5. Configure Nginx
```bash
sudo nano /etc/nginx/sites-available/controlpanel

# Add this configuration:
server {
    listen 80;
    server_name your_domain.com;

    location / {
        root /path/to/controlpanel/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# Enable the site
sudo ln -s /etc/nginx/sites-available/controlpanel /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 6. Setup Systemd Service
```bash
sudo nano /etc/systemd/system/controlpanel.service

# Add this configuration:
[Unit]
Description=Control Panel Backend
After=network.target

[Service]
User=www-data
WorkingDirectory=/path/to/controlpanel/backend
Environment="PATH=/path/to/controlpanel/backend/venv/bin"
ExecStart=/path/to/controlpanel/backend/venv/bin/python app.py
Restart=always

[Install]
WantedBy=multi-user.target

# Start the service
sudo systemctl enable controlpanel
sudo systemctl start controlpanel
```

## Security Recommendations
1. Enable SSL/TLS using Let's Encrypt
2. Configure UFW firewall
3. Set up fail2ban
4. Regular system updates
5. Database backups

## Monitoring
1. Set up system monitoring using Prometheus/Grafana
2. Configure log rotation
3. Set up email alerts for critical events 
# Web Hosting Control Panel

A comprehensive web hosting control panel for managing websites, databases, DNS, FTP, and email services.

## Quick Start

```bash
# Clone the repository
git clone https://github.com/kingG4e/web-control-panel.git
cd web-control-panel

# Run the installation script (requires root/sudo)
sudo ./setup.sh
```

The setup script will:
1. Install MariaDB if not present
2. Configure the database automatically
3. Install all required dependencies
4. Start both backend and frontend servers

Access the control panel at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8889

Default database credentials:
- Database: cpanel
- Username: cpanel
- Password: cpanel
- Host: localhost
- Port: 3306

## Features

- Virtual Host Management
- Database Management (MariaDB)
- DNS Management
- FTP Account Management
- SSL Certificate Management
- Email Account Management
- User Management with Role-based Access Control
- Real-time System Monitoring
- Backup Management
- Security Features

## System Requirements

- Ubuntu Server 20.04 LTS or newer
- Minimum 2GB RAM
- 20GB free disk space
- Public IP address (for production use)
- Domain name (for production use)

## Manual Installation

If you prefer to install manually:

1. Install system dependencies:
```bash
# Install MariaDB
sudo apt-get update
sudo apt-get install -y mariadb-server mariadb-client

# Install Python and Node.js
sudo apt-get install -y python3 python3-pip python3-venv
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo bash -
sudo apt-get install -y nodejs
```

2. Configure MariaDB:
```bash
sudo mysql -e "CREATE DATABASE IF NOT EXISTS cpanel;"
sudo mysql -e "CREATE USER IF NOT EXISTS 'cpanel'@'localhost' IDENTIFIED BY 'cpanel';"
sudo mysql -e "GRANT ALL PRIVILEGES ON cpanel.* TO 'cpanel'@'localhost';"
sudo mysql -e "FLUSH PRIVILEGES;"
```

3. Set up the application:
```bash
# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Install and build frontend
cd frontend
npm install
npm run build
```

4. Start the servers:
```bash
# Start backend (in a new terminal)
python backend/app.py

# Start frontend (in another terminal)
cd frontend && npm start
```

## Security Recommendations

1. Change default database password
2. Enable SSL/TLS using Let's Encrypt
3. Configure UFW firewall
4. Set up fail2ban
5. Regular system updates
6. Regular database backups

## Monitoring

The control panel includes built-in monitoring for:
- System resources (CPU, Memory, Disk)
- Service status
- Security events
- Access logs

## Backup and Restore

Backup scripts are included for:
- Database backup
- Configuration backup
- Website content backup

## Uninstallation

To remove the control panel:

```bash
sudo ./uninstall.sh
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- Issue Tracker: [GitHub Issues](https://github.com/kingG4e/web-control-panel/issues)
- Email: your.email@example.com

## Authors

- kingG4e - Initial work 
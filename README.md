# Web Hosting Control Panel

A comprehensive web hosting control panel with support for managing databases, email accounts, SSL certificates, DNS records, virtual hosts, and FTP accounts.

## Features

- Database Management (MySQL/PostgreSQL)
- Email Account Management
- SSL Certificate Management
- DNS Record Management
- Virtual Host Management
- FTP/SFTP Account Management
- System User Integration with SSO
- Modern React-based UI

## Quick Installation

```bash
# Download installer
wget https://raw.githubusercontent.com/kingG4e/web-control-panel/main/install.sh

# Make it executable
chmod +x install.sh

# Run installer
sudo ./install.sh
```

The installer will:
1. Install all required dependencies
2. Set up the database
3. Configure Nginx
4. Set up SSL with Let's Encrypt
5. Create systemd service
6. Configure firewall

## System Requirements

- Ubuntu Server 20.04 LTS or newer
- Python 3.8+
- Node.js 16+
- PostgreSQL 12+
- Nginx

## Manual Installation

See [INSTALL.md](INSTALL.md) for detailed installation instructions.

## Development

### Backend Setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py db upgrade
python app.py
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## Management Commands

After installation, use these commands to manage the control panel:
```bash
cpanel start   # Start the control panel
cpanel stop    # Stop the control panel
cpanel restart # Restart the control panel
cpanel status  # Check control panel status
cpanel logs    # View control panel logs
```

## Security

- Uses system user authentication
- SSL/TLS encryption
- Firewall configuration
- Regular security updates
- Database backup support

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 
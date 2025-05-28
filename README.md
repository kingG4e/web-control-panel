# Web Hosting Control Panel

A comprehensive web hosting control panel for managing websites, databases, DNS, FTP, and email services.

## Features

- Virtual Host Management
- Database Management (MySQL/PostgreSQL)
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

## Quick Installation

1. Download the latest release:
```bash
git clone https://github.com/yourusername/controlpanel.git
cd controlpanel
```

2. Run the installation script:
```bash
sudo chmod +x install.sh
sudo ./install.sh
```

3. Follow the installation prompts:
   - Enter your domain name (or use default 'localhost')
   - Enter admin email
   - Choose installation directory

4. Save the credentials from the generated admin_credentials.txt file

## Manual Installation

See [INSTALL.md](INSTALL.md) for detailed installation instructions.

## Configuration

The control panel can be configured through the .env file in the installation directory. Common configuration options:

- `DB_HOST`: Database host
- `DB_USER`: Database user
- `DB_PASSWORD`: Database password
- `DB_NAME`: Database name
- `SECRET_KEY`: Application secret key
- `JWT_SECRET_KEY`: JWT token secret key
- `DEBUG`: Debug mode (True/False)
- `PORT`: Backend port
- `DOMAIN_NAME`: Your domain name
- `NGINX_PORT`: Nginx listening port
- `SSL_ENABLED`: SSL status

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

See [BACKUP.md](BACKUP.md) for detailed instructions.

## Uninstallation

To remove the control panel:

```bash
sudo chmod +x uninstall.sh
sudo ./uninstall.sh
```

## Troubleshooting

Common issues and solutions can be found in [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- Documentation: [docs/](docs/)
- Issue Tracker: [GitHub Issues](https://github.com/yourusername/controlpanel/issues)
- Wiki: [GitHub Wiki](https://github.com/yourusername/controlpanel/wiki)

## Acknowledgments

- Flask team
- React team
- All contributors 
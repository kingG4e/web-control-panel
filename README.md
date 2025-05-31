# Control Panel

A comprehensive server management control panel with features for managing Virtual Hosts, DNS, Email, Database, SSL Certificates, and FTP.

## Features

- Virtual Hosts Management
- DNS Zone and Records Management
- Email Domain and Account Management
- Database Management
- SSL Certificate Management
- FTP User Management
- User Authentication and Authorization
- Rate Limiting
- Audit Logging
- Security Headers

## Requirements

- Python 3.8+
- Node.js 16+
- Redis Server
- Linux Operating System

## Quick Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/controlpanel.git
cd controlpanel
```

2. Run the setup script:
```bash
chmod +x setup.sh
./setup.sh
```

The setup script will:
- Install required dependencies
- Set up Python virtual environment
- Install Python packages
- Install and build frontend
- Configure environment variables
- Create and start systemd service

## Manual Installation

If you prefer to install manually:

1. Set up Python environment:
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

2. Set up frontend:
```bash
cd frontend
npm install
npm run build
cd ..
```

3. Create environment file:
```bash
cat > .env << EOL
FLASK_APP=backend/app.py
FLASK_ENV=production
SECRET_KEY=your_secret_key
JWT_SECRET_KEY=your_jwt_secret
DATABASE_URL=sqlite:///instance/controlpanel.db
REDIS_URL=redis://localhost:6379/0
EOL
```

4. Start the application:
```bash
python backend/app.py
```

## Usage

After installation:

1. Access the control panel at `http://localhost:5000`
2. Log in with default credentials:
   - Username: admin
   - Password: admin123
3. Change the default password immediately after first login

## API Documentation

The API endpoints are organized by feature:

- Authentication: `/api/auth/*`
- Virtual Hosts: `/api/virtual-hosts/*`
- DNS: `/api/dns/*`
- Email: `/api/email/*`
- Database: `/api/databases/*`
- SSL: `/api/ssl/*`
- FTP: `/api/ftp/*`

For detailed API documentation, see [API.md](API.md)

## Security

- All passwords are hashed using bcrypt
- JWT authentication for API access
- Rate limiting on sensitive endpoints
- Security headers enabled
- Input validation and sanitization
- Audit logging for all important actions

## Development

To run in development mode:

1. Start backend:
```bash
source venv/bin/activate
export FLASK_ENV=development
python backend/app.py
```

2. Start frontend development server:
```bash
cd frontend
npm start
```

The frontend will be available at `http://localhost:3000`

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details 
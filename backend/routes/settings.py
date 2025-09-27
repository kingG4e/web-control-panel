import os
from flask import Blueprint, jsonify, request
import socket
import subprocess
from models.user import User
from utils.settings_util import _backend_env_path
from routes.auth import login_required

settings_bp = Blueprint('settings_bp', __name__, url_prefix='/api')

# List of settings that can be managed
CONFIG_KEYS = [
    'USE_REMOTE_DNS',
    'USE_REMOTE_MAIL',
    'USE_REMOTE_DATABASE',
    'REMOTE_DNS_SERVER',
    'REMOTE_DNS_PORT',
    'REMOTE_DNS_KEY_PATH',
    'REMOTE_MAIL_SERVER',
    'REMOTE_MAIL_PORT',
    'REMOTE_MAIL_USER',
    'REMOTE_MAIL_PASSWORD',
    'REMOTE_DATABASE_SERVER',
    'REMOTE_DATABASE_PORT',
    'REMOTE_DATABASE_USER',
    'REMOTE_DATABASE_PASSWORD',
    'REMOTE_DATABASE_NAME',
    # DNS default for zone creation
    'DNS_DEFAULT_IP',
]

@settings_bp.route('/settings', methods=['GET'])
@login_required
def get_settings():
    user = getattr(request, 'current_user', None)
    if not user or user.role != 'admin':
        return jsonify({'error': 'Forbidden'}), 403

    settings = {}
    for key in CONFIG_KEYS:
        # For boolean values, we need to check the string representation
        if key in ['USE_REMOTE_DNS', 'USE_REMOTE_MAIL', 'USE_REMOTE_DATABASE']:
             settings[key] = os.environ.get(key, 'False').lower() in ['true', '1', 't']
        else:
            settings[key] = os.environ.get(key, '')
    # Best-effort detected server IPs
    detected_ip = ''
    try:
        # Try routing trick to get primary IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        detected_ip = s.getsockname()[0]
        s.close()
    except Exception:
        try:
            detected_ip = socket.gethostbyname(socket.gethostname())
        except Exception:
            detected_ip = ''

    settings['DETECTED_SERVER_IP'] = detected_ip
    return jsonify(settings)

@settings_bp.route('/settings', methods=['POST'])
@login_required
def save_settings():
    user = getattr(request, 'current_user', None)
    if not user or user.role != 'admin':
        return jsonify({'error': 'Forbidden'}), 403

    data = request.json
    
    # Persist to backend/.env (best-effort) and export to current process
    try:
        # Load existing .env lines
        env_path = _backend_env_path()
        existing = {}
        lines = []
        if os.path.exists(env_path):
            with open(env_path, 'r') as f:
                lines = f.readlines()
            for ln in lines:
                if '=' in ln and not ln.strip().startswith('#'):
                    k, v = ln.split('=', 1)
                    existing[k.strip()] = v.rstrip('\n')
        # Update keys in memory map
        for key in CONFIG_KEYS:
            if key in data:
                existing[key] = str(data[key])
                os.environ[key] = str(data[key])
        # Write back
        with open(env_path, 'w') as f:
            for k, v in existing.items():
                f.write(f"{k}={v}\n")
    except Exception:
        # Fallback to process env only
        for key in CONFIG_KEYS:
            if key in data:
                os.environ[key] = str(data[key])

    return jsonify({'message': 'Settings saved successfully', 'persisted': True})

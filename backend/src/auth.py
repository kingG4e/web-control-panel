import os
import pwd
import spwd
import crypt
from functools import wraps
from flask import jsonify, request, session
import pam

def authenticate_linux_user(username, password):
    """Authenticate user using Linux PAM"""
    auth = pam.pam()
    return auth.authenticate(username, password)

def get_user_info(username):
    """Get user information from Linux system"""
    try:
        return pwd.getpwnam(username)
    except KeyError:
        return None

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'username' not in session:
            return jsonify({'error': 'Unauthorized'}), 401
        return f(*args, **kwargs)
    return decorated_function

def init_auth_routes(app):
    @app.route('/api/auth/login', methods=['POST'])
    def login():
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({'error': 'Missing credentials'}), 400
            
        try:
            if authenticate_linux_user(username, password):
                user_info = get_user_info(username)
                if user_info:
                    session['username'] = username
                    return jsonify({
                        'message': 'Login successful',
                        'user': {
                            'username': username,
                            'uid': user_info.pw_uid,
                            'home': user_info.pw_dir,
                            'shell': user_info.pw_shell
                        }
                    })
            return jsonify({'error': 'Invalid credentials'}), 401
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    @app.route('/api/auth/logout', methods=['POST'])
    def logout():
        session.clear()
        return jsonify({'message': 'Logged out successfully'})

    @app.route('/api/auth/user', methods=['GET'])
    @login_required
    def get_current_user():
        username = session.get('username')
        user_info = get_user_info(username)
        if user_info:
            return jsonify({
                'username': username,
                'uid': user_info.pw_uid,
                'home': user_info.pw_dir,
                'shell': user_info.pw_shell
            })
        return jsonify({'error': 'User not found'}), 404 
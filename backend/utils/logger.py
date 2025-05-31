import logging
from logging.handlers import RotatingFileHandler
import os
from datetime import datetime

def setup_logger(app):
    """Configure logging for the application"""
    
    # Create logs directory if it doesn't exist
    if not os.path.exists('logs'):
        os.makedirs('logs')

    # Set up file handlers
    file_handler = RotatingFileHandler(
        'logs/app.log',
        maxBytes=1024 * 1024,  # 1MB
        backupCount=10
    )
    
    # Set up error file handler
    error_handler = RotatingFileHandler(
        'logs/error.log',
        maxBytes=1024 * 1024,  # 1MB
        backupCount=10
    )

    # Set up formatters
    formatter = logging.Formatter(
        '[%(asctime)s] %(levelname)s in %(module)s: %(message)s'
    )
    file_handler.setFormatter(formatter)
    error_handler.setFormatter(formatter)

    # Set log levels
    file_handler.setLevel(logging.INFO)
    error_handler.setLevel(logging.ERROR)

    # Add handlers to app logger
    app.logger.addHandler(file_handler)
    app.logger.addHandler(error_handler)
    
    # Set overall log level
    app.logger.setLevel(logging.INFO)

    # Log application startup
    app.logger.info('Application startup')

def log_request():
    """Log incoming request details"""
    from flask import request, current_app
    current_app.logger.info(
        f'Request: {request.method} {request.url} - '
        f'IP: {request.remote_addr}'
    )

def log_response(response):
    """Log outgoing response details"""
    from flask import request, current_app
    current_app.logger.info(
        f'Response: {response.status_code} - '
        f'Path: {request.path}'
    )
    return response

def log_error(error):
    """Log error details"""
    from flask import request, current_app
    current_app.logger.error(
        f'Error: {str(error)} - '
        f'Path: {request.path} - '
        f'Method: {request.method}'
    )

def audit_log(user, action, details=None):
    """Log user actions for audit purposes"""
    from flask import current_app
    log_entry = {
        'timestamp': datetime.utcnow().isoformat(),
        'user': user.username if user else 'anonymous',
        'action': action,
        'details': details or {}
    }
    current_app.logger.info(f'AUDIT: {log_entry}') 
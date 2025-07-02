import logging
import logging.handlers
import os
import sys
from typing import Optional

def setup_logger(name: str, level: Optional[str] = None) -> logging.Logger:
    """
    Setup a logger with proper formatting and handlers.
    
    Args:
        name: Logger name
        level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    
    Returns:
        Configured logger instance
    """
    logger = logging.getLogger(name)
    
    # Don't add handlers if they already exist
    if logger.handlers:
        return logger
    
    # Set log level
    log_level = level or os.environ.get('LOG_LEVEL', 'INFO')
    logger.setLevel(getattr(logging, log_level.upper()))
    
    # Create formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    # File handler (if log directory exists)
    log_dir = os.environ.get('LOG_DIR', 'logs')
    if os.path.exists(log_dir) or os.access('.', os.W_OK):
        try:
            os.makedirs(log_dir, exist_ok=True)
            file_handler = logging.handlers.RotatingFileHandler(
                os.path.join(log_dir, f'{name}.log'),
                maxBytes=10*1024*1024,  # 10MB
                backupCount=5
            )
            file_handler.setFormatter(formatter)
            logger.addHandler(file_handler)
        except Exception as e:
            logger.warning(f"Could not setup file logging: {e}")
    
    return logger

def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance.
    
    Args:
        name: Logger name
    
    Returns:
        Logger instance
    """
    return logging.getLogger(name)

class LoggerMixin:
    """Mixin class to add logging capabilities to any class."""
    
    @property
    def logger(self) -> logging.Logger:
        """Get logger for this class."""
        return get_logger(self.__class__.__name__)

def log_function_call(func):
    """Decorator to log function calls."""
    def wrapper(*args, **kwargs):
        logger = get_logger(func.__module__)
        logger.debug(f"Calling {func.__name__} with args={args}, kwargs={kwargs}")
        try:
            result = func(*args, **kwargs)
            logger.debug(f"{func.__name__} returned {result}")
            return result
        except Exception as e:
            logger.error(f"{func.__name__} raised {type(e).__name__}: {e}")
            raise
    return wrapper

def log_execution_time(func):
    """Decorator to log function execution time."""
    import time
    from functools import wraps
    
    @wraps(func)
    def wrapper(*args, **kwargs):
        logger = get_logger(func.__module__)
        start_time = time.time()
        try:
            result = func(*args, **kwargs)
            execution_time = time.time() - start_time
            logger.debug(f"{func.__name__} executed in {execution_time:.4f} seconds")
            return result
        except Exception as e:
            execution_time = time.time() - start_time
            logger.error(f"{func.__name__} failed after {execution_time:.4f} seconds: {e}")
            raise
    return wrapper

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
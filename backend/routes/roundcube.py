from flask import Blueprint, request, jsonify, redirect
from models.virtual_host import VirtualHost
from models.email import EmailDomain, EmailAccount
from models.database import db
from services.roundcube_service import RoundcubeService
from utils.auth import token_required
from utils.permissions import check_virtual_host_permission
import logging

roundcube_bp = Blueprint('roundcube', __name__)
roundcube_service = RoundcubeService()

@roundcube_bp.route('/api/roundcube/status', methods=['GET'])
@token_required
def get_roundcube_status(current_user):
    """Get Roundcube installation and configuration status.
    ---
    tags:
      - roundcube
    responses:
      200:
        description: Roundcube status
    """
    try:
        status = roundcube_service.check_roundcube_status()
        return jsonify({
            'success': True,
            'data': status
        })
    except Exception as e:
        logging.error(f"Error checking Roundcube status: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@roundcube_bp.route('/api/roundcube/configure', methods=['POST'])
@token_required
def configure_roundcube(current_user):
    """Configure Roundcube database and settings"""
    try:
        data = request.get_json()
        
        # Configure database
        result = roundcube_service.configure_roundcube_database(
            db_host=data.get('db_host', 'localhost'),
            db_name=data.get('db_name', 'roundcube'),
            db_user=data.get('db_user', 'roundcube'),
            db_password=data.get('db_password')
        )
        
        if result:
            return jsonify({
                'success': True,
                'message': 'Roundcube configured successfully'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to configure Roundcube'
            }), 500
            
    except Exception as e:
        logging.error(f"Error configuring Roundcube: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@roundcube_bp.route('/api/roundcube/webmail-url', methods=['GET'])
@token_required
def get_webmail_url(current_user):
    """Get webmail access URL"""
    try:
        email = request.args.get('email')
        domain = request.args.get('domain')
        
        url = roundcube_service.get_webmail_login_url(email=email, domain=domain)
        
        return jsonify({
            'success': True,
            'data': {
                'url': url,
                'email': email
            }
        })
        
    except Exception as e:
        logging.error(f"Error getting webmail URL: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@roundcube_bp.route('/api/roundcube/webmail-redirect', methods=['GET'])
@token_required
def webmail_redirect(current_user):
    """Redirect to webmail with pre-authentication"""
    try:
        email = request.args.get('email')
        domain = request.args.get('domain')
        
        # Verify user has access to this email account
        if email:
            # Extract domain from email
            email_domain = email.split('@')[1] if '@' in email else domain
            
            # Check if user owns a virtual host with this domain
            virtual_host = VirtualHost.query.filter_by(
                domain=email_domain,
                user_id=current_user.id
            ).first()
            
            if not virtual_host:
                return jsonify({
                    'success': False,
                    'error': 'Access denied to this email domain'
                }), 403
        
        url = roundcube_service.get_webmail_login_url(email=email, domain=domain)
        
        # If it's a list, use the first URL
        if isinstance(url, list):
            url = url[0]
        
        return redirect(url)
        
    except Exception as e:
        logging.error(f"Error redirecting to webmail: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@roundcube_bp.route('/api/roundcube/create-user', methods=['POST'])
@token_required
def create_webmail_user(current_user):
    """Create webmail user account"""
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({
                'success': False,
                'error': 'Email and password are required'
            }), 400
        
        # Extract domain from email
        domain = email.split('@')[1] if '@' in email else None
        if not domain:
            return jsonify({
                'success': False,
                'error': 'Invalid email format'
            }), 400
        
        # Check if user owns a virtual host with this domain
        virtual_host = VirtualHost.query.filter_by(
            domain=domain,
            user_id=current_user.id
        ).first()
        
        if not virtual_host:
            return jsonify({
                'success': False,
                'error': 'Access denied to this email domain'
            }), 403
        
        # Create webmail user
        result = roundcube_service.create_webmail_user(email, password)
        
        if result:
            return jsonify({
                'success': True,
                'message': 'Webmail user created successfully'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to create webmail user'
            }), 500
            
    except Exception as e:
        logging.error(f"Error creating webmail user: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@roundcube_bp.route('/api/roundcube/configure-domain', methods=['POST'])
@token_required
def configure_domain_webmail(current_user):
    """Configure webmail for a specific domain"""
    try:
        data = request.get_json()
        domain = data.get('domain')
        
        if not domain:
            return jsonify({
                'success': False,
                'error': 'Domain is required'
            }), 400
        
        # Check if user owns this virtual host
        virtual_host = VirtualHost.query.filter_by(
            domain=domain,
            user_id=current_user.id
        ).first()
        
        if not virtual_host:
            return jsonify({
                'success': False,
                'error': 'Access denied to this domain'
            }), 403
        
        # Configure Nginx for this domain
        result = roundcube_service.configure_nginx_roundcube(domain)
        
        if result:
            return jsonify({
                'success': True,
                'message': f'Webmail configured for domain {domain}',
                'webmail_url': f'https://webmail.{domain}'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to configure webmail for domain'
            }), 500
            
    except Exception as e:
        logging.error(f"Error configuring domain webmail: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@roundcube_bp.route('/api/roundcube/domains', methods=['GET'])
@token_required
def get_webmail_domains(current_user):
    """Get all domains with webmail access for current user"""
    try:
        # Get all virtual hosts for current user
        virtual_hosts = VirtualHost.query.filter_by(user_id=current_user.id).all()
        
        domains_data = []
        for vh in virtual_hosts:
            # Check if domain has email accounts
            email_domain = EmailDomain.query.filter_by(domain=vh.domain).first()
            account_count = 0
            if email_domain:
                account_count = EmailAccount.query.filter_by(domain_id=email_domain.id).count()
            
            domains_data.append({
                'id': vh.id,
                'domain': vh.domain,
                'status': vh.status,
                'email_accounts': account_count,
                'webmail_url': roundcube_service.get_webmail_login_url(domain=vh.domain),
                'created_at': vh.created_at.isoformat() if vh.created_at else None
            })
        
        return jsonify({
            'success': True,
            'data': domains_data
        })
        
    except Exception as e:
        logging.error(f"Error getting webmail domains: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@roundcube_bp.route('/api/roundcube/test-connection', methods=['POST'])
@token_required
def test_roundcube_connection(current_user):
    """Test Roundcube connection and configuration"""
    try:
        data = request.get_json()
        domain = data.get('domain')
        
        # Test basic connectivity
        status = roundcube_service.check_roundcube_status()
        
        if not status.get('installed'):
            return jsonify({
                'success': False,
                'error': 'Roundcube is not installed',
                'status': status
            }), 500
        
        if not status.get('configured'):
            return jsonify({
                'success': False,
                'error': 'Roundcube is not configured',
                'status': status
            }), 500
        
        # Test URL accessibility
        webmail_urls = roundcube_service.get_roundcube_url(domain)
        
        return jsonify({
            'success': True,
            'message': 'Roundcube connection test successful',
            'status': status,
            'webmail_urls': webmail_urls
        })
        
    except Exception as e:
        logging.error(f"Error testing Roundcube connection: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
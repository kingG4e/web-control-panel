from flask import Blueprint, jsonify, request
from services.quota_monitoring_service import QuotaMonitoringService
from services.email_service import EmailService
from utils.auth import token_required, admin_required
from models.database import db
from models.user import User
from models.email import EmailAccount
import traceback

quota_bp = Blueprint('quota', __name__)
quota_monitoring_service = QuotaMonitoringService()
email_service = EmailService()


@quota_bp.route('/api/quota/usage/<username>', methods=['GET'])
@token_required
def get_user_quota_usage(current_user, username):
    """Get quota usage for a specific user."""
    try:
        # Check permissions - user can only see their own quota or admin can see all
        if not (current_user.is_admin or current_user.role == 'admin' or 
                current_user.username == 'root' or current_user.username == username):
            return jsonify({'error': 'Permission denied'}), 403
        
        # Get storage usage
        storage_usage = quota_monitoring_service.get_user_storage_usage(username)
        if not storage_usage:
            return jsonify({'error': 'User not found or quota not available'}), 404
        
        # Get email accounts for this user
        email_accounts = []
        if current_user.is_admin or current_user.role == 'admin':
            # Admin can see all email accounts
            email_accounts = EmailAccount.query.filter_by(
                username=username
            ).all()
        else:
            # Regular user can only see their own email accounts
            from models.email import EmailDomain
            email_accounts = EmailAccount.query.join(EmailDomain).filter(
                EmailAccount.username == username,
                EmailDomain.domain == current_user.email.split('@')[1] if current_user.email else None
            ).all()
        
        # Get email quota usage
        email_usage = []
        for account in email_accounts:
            email_quota_info = quota_monitoring_service.get_email_quota_usage(account.id, email_service)
            if email_quota_info:
                email_usage.append(email_quota_info)
        
        response_data = {
            'username': username,
            'storage': storage_usage,
            'email_accounts': email_usage,
            'summary': {
                'total_storage_usage_mb': storage_usage['usage_mb'],
                'total_storage_quota_mb': storage_usage.get('quota_soft_mb'),
                'total_email_usage_mb': sum(acc['usage_mb'] for acc in email_usage),
                'total_email_quota_mb': sum(acc['quota_mb'] for acc in email_usage),
                'last_updated': storage_usage['last_updated']
            }
        }
        
        return jsonify(response_data)
        
    except Exception as e:
        print(f"Error getting quota usage for {username}: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@quota_bp.route('/api/quota/usage', methods=['GET'])
@token_required
@admin_required
def get_all_users_quota_usage(current_user):
    """Get quota usage for all users (admin only)."""
    try:
        # Check for a 'refresh' query parameter to force a cache refresh
        force_refresh = request.args.get('refresh', 'false').lower() == 'true'

        # Get all users quota usage (uses cache by default)
        all_usage = quota_monitoring_service.get_all_users_quota_usage(force_refresh=force_refresh)
        
        # Get quota alerts, passing the already fetched data to avoid a second slow call
        alerts = quota_monitoring_service.get_quota_alerts(all_usage_data=all_usage)
        
        response_data = {
            'users': all_usage,
            'alerts': alerts,
            'stats': {
                'total_users': len(all_usage),
                'users_with_quota': len([u for u in all_usage.values() if u.get('quota_soft_mb')]),
                'warning_count': len(alerts['warning']),
                'critical_count': len(alerts['critical']),
                'exceeded_count': len(alerts['exceeded']),
                'last_updated': list(all_usage.values())[0]['last_updated'] if all_usage else None
            }
        }
        
        return jsonify(response_data)
        
    except Exception as e:
        print(f"Error getting all users quota usage: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@quota_bp.route('/api/quota/alerts', methods=['GET'])
@token_required
@admin_required
def get_quota_alerts(current_user):
    """Get quota alerts for users approaching or exceeding limits."""
    try:
        threshold = request.args.get('threshold', 80.0, type=float)
        alerts = quota_monitoring_service.get_quota_alerts(threshold)
        
        return jsonify({
            'alerts': alerts,
            'threshold_percent': threshold,
            'timestamp': quota_monitoring_service.get_all_users_quota_usage().get(
                list(quota_monitoring_service.get_all_users_quota_usage().keys())[0]
            )['last_updated'] if quota_monitoring_service.get_all_users_quota_usage() else None
        })
        
    except Exception as e:
        print(f"Error getting quota alerts: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@quota_bp.route('/api/quota/email/<int:account_id>', methods=['GET'])
@token_required
def get_email_quota_usage(current_user, account_id):
    """Get quota usage for a specific email account."""
    try:
        # Get email account
        account = EmailAccount.query.get_or_404(account_id)
        
        # Check permissions
        if not (current_user.is_admin or current_user.role == 'admin' or 
                current_user.username == 'root' or 
                account.username == current_user.username):
            return jsonify({'error': 'Permission denied'}), 403
        
        # Get quota usage
        email_quota_info = quota_monitoring_service.get_email_quota_usage(account_id, email_service)
        if not email_quota_info:
            return jsonify({'error': 'Email account not found or quota not available'}), 404
        
        return jsonify(email_quota_info)
        
    except Exception as e:
        print(f"Error getting email quota usage for account {account_id}: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@quota_bp.route('/api/quota/refresh/<username>', methods=['POST'])
@token_required
@admin_required
def refresh_user_quota(current_user, username):
    """Force refresh quota usage for a specific user (admin only)."""
    try:
        # Force refresh by getting fresh data
        storage_usage = quota_monitoring_service.get_user_storage_usage(username)
        if not storage_usage:
            return jsonify({'error': 'User not found or quota not available'}), 404
        
        return jsonify({
            'message': f'Quota usage refreshed for {username}',
            'data': storage_usage
        })
        
    except Exception as e:
        print(f"Error refreshing quota for {username}: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@quota_bp.route('/api/quota/set/<username>', methods=['POST'])
@token_required
@admin_required
def set_user_quota(current_user, username):
    """Set storage quota for a specific user (admin only)."""
    try:
        data = request.get_json()
        if data is None:
            return jsonify({'error': 'Invalid JSON body'}), 400
            
        soft_limit_mb = data.get('soft_limit_mb')
        hard_limit_mb = data.get('hard_limit_mb')
        
        # Basic validation
        if soft_limit_mb is None or hard_limit_mb is None:
            return jsonify({'error': 'Missing soft_limit_mb or hard_limit_mb'}), 400
        
        try:
            soft_limit_mb = int(soft_limit_mb)
            hard_limit_mb = int(hard_limit_mb)
            if soft_limit_mb < 0 or hard_limit_mb < 0:
                raise ValueError("Limits must be non-negative")
            if soft_limit_mb > hard_limit_mb:
                return jsonify({'error': 'Soft limit cannot be greater than hard limit'}), 400
        except (ValueError, TypeError):
            return jsonify({'error': 'Quota limits must be valid integers'}), 400

        result = quota_monitoring_service.set_user_quota(username, soft_limit_mb, hard_limit_mb)
        
        return jsonify(result)
        
    except Exception as e:
        error_message = f"Failed to process request to set quota for {username}: {e}"
        print(error_message)
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@quota_bp.route('/api/quota/stats', methods=['GET'])
@token_required
@admin_required
def get_quota_statistics(current_user):
    """Get quota usage statistics (admin only)."""
    try:
        all_usage = quota_monitoring_service.get_all_users_quota_usage()
        
        if not all_usage:
            return jsonify({'error': 'No quota data available'}), 404
        
        # Calculate statistics
        total_usage_mb = sum(u['usage_mb'] for u in all_usage.values())
        total_quota_mb = sum(u.get('quota_soft_mb', 0) for u in all_usage.values() if u.get('quota_soft_mb'))
        
        users_with_quota = [u for u in all_usage.values() if u.get('quota_soft_mb')]
        avg_usage_percent = 0
        if users_with_quota:
            avg_usage_percent = sum(u.get('quota_usage_percent', 0) for u in users_with_quota) / len(users_with_quota)
        
        # Find top users by usage
        top_users = sorted(
            all_usage.values(), 
            key=lambda x: x['usage_mb'], 
            reverse=True
        )[:10]
        
        stats = {
            'total_users': len(all_usage),
            'users_with_quota': len(users_with_quota),
            'total_storage_usage_mb': round(total_usage_mb, 2),
            'total_storage_quota_mb': round(total_quota_mb, 2),
            'overall_usage_percent': round((total_usage_mb / total_quota_mb * 100), 2) if total_quota_mb > 0 else 0,
            'average_usage_percent': round(avg_usage_percent, 2),
            'top_users_by_usage': [
                {
                    'username': u['username'],
                    'usage_mb': u['usage_mb'],
                    'quota_mb': u.get('quota_soft_mb'),
                    'usage_percent': u.get('quota_usage_percent')
                } for u in top_users
            ],
            'last_updated': list(all_usage.values())[0]['last_updated'] if all_usage else None
        }
        
        return jsonify(stats)
        
    except Exception as e:
        print(f"Error getting quota statistics: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

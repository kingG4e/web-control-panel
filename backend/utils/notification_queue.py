import queue
import threading

# Global notification queues for each user
notification_queues = {}
notification_lock = threading.Lock()

def get_user_queue(user_id):
    """Get or create queue for specific user"""
    with notification_lock:
        if user_id not in notification_queues:
            print(f"Creating new queue for user {user_id}")
            notification_queues[user_id] = queue.Queue()
        else:
            print(f"Using existing queue for user {user_id}")
        return notification_queues[user_id]

def push_notification(notification):
    """Push notification to appropriate queues"""
    user_id = notification.user_id
    
    # Push to specific user's queue
    if user_id and user_id in notification_queues:
        print(f"Pushing notification to user {user_id}'s queue: {notification.title}")
        notification_queues[user_id].put(notification)
    
    # For global notifications, push to all queues
    elif notification.is_global:
        print(f"Pushing global notification to all queues: {notification.title}")
        with notification_lock:
            for uid, q in notification_queues.items():
                print(f"- Pushing to user {uid}'s queue")
                q.put(notification)
    else:
        print(f"Warning: No queue found for user {user_id}, notification not delivered: {notification.title}")

def remove_user_queue(user_id):
    """Remove user's queue when they logout"""
    with notification_lock:
        if user_id in notification_queues:
            print(f"Removing queue for user {user_id}")
            del notification_queues[user_id]
        else:
            print(f"No queue found to remove for user {user_id}")

def list_active_queues():
    """Debug helper to list all active queues"""
    with notification_lock:
        print("\nActive notification queues:")
        for user_id in notification_queues:
            print(f"- User {user_id}")
        print("Total queues:", len(notification_queues)) 
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

const NotificationDropdown = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      
      // Try authenticated endpoint first
      let response = await fetch('/api/notifications?limit=10', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      // If authentication fails, try public endpoint
      if (!response.ok) {
        response = await fetch('/api/notifications-public?limit=10');
      }
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setNotifications(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      // Try public endpoint as fallback
      try {
        const response = await fetch('/api/notifications-public?limit=10');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setNotifications(data.data || []);
          }
        }
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch unread count
  const fetchUnreadCount = async () => {
    try {
      // Try authenticated endpoint first
      let response = await fetch('/api/notifications/unread-count', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      // If authentication fails, try public endpoint
      if (!response.ok) {
        response = await fetch('/api/notifications/unread-count-public');
      }
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Handle both response formats
          const count = data.data?.count || data.count || 0;
          setUnreadCount(count);
        }
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
      // Try public endpoint as fallback
      try {
        const response = await fetch('/api/notifications/unread-count-public');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setUnreadCount(data.count || 0);
          }
        }
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    console.log('🔔 markAsRead called with ID:', notificationId);
    try {
      // Try authenticated endpoint first
      let response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      // If authentication fails, try public endpoint
      if (!response.ok) {
        console.log('Auth failed, trying public endpoint...');
        response = await fetch(`/api/notifications/${notificationId}/read-public`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }
      
      if (response.ok) {
        console.log('✅ Successfully marked as read');
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId ? { ...notif, is_read: true } : notif
          )
        );
        fetchUnreadCount();
      } else {
        console.log('❌ Failed to mark as read:', response.status);
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      // Fallback: update UI only
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId ? { ...notif, is_read: true } : notif
        )
      );
      fetchUnreadCount();
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    console.log('🔔 markAllAsRead called');
    try {
      // Try authenticated endpoint first
      let response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      // If authentication fails, try public endpoint
      if (!response.ok) {
        console.log('Auth failed, trying public endpoint...');
        response = await fetch('/api/notifications/mark-all-read-public', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }
      
      if (response.ok) {
        console.log('✅ Successfully marked all as read');
        setNotifications(prev => 
          prev.map(notif => ({ ...notif, is_read: true }))
        );
        setUnreadCount(0);
      } else {
        console.log('❌ Failed to mark all as read:', response.status);
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      // Fallback: update UI only
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, is_read: true }))
      );
      setUnreadCount(0);
    }
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch unread count on mount
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isOpen && notifications.length === 0) {
      fetchNotifications();
    }
  }, [isOpen]);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  // Delete notification function
  const deleteNotification = async (notificationId) => {
    console.log('🗑️ deleteNotification called with ID:', notificationId);
    try {
      // Try authenticated endpoint first
      let response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      // If authentication fails, try public endpoint
      if (!response.ok) {
        console.log('Auth failed, trying public endpoint...');
        response = await fetch(`/api/notifications/${notificationId}/delete-public`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }
      
      // If any endpoint works
      if (response.ok) {
        console.log('✅ Successfully deleted notification');
        setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
        fetchUnreadCount();
      } else {
        console.log('❌ Failed to delete:', response.status);
        // Fallback: remove from UI
        setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
        fetchUnreadCount();
      }
      
    } catch (error) {
      console.error('Failed to delete notification:', error);
      // Fallback: remove from UI
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
      fetchUnreadCount();
    }
  };



  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Bell Button */}
      <button
        onClick={toggleDropdown}
        className={`relative p-3 rounded-lg transition-colors ${
          unreadCount > 0 
            ? 'text-[var(--accent-color)] bg-[var(--accent-color)]/10 hover:bg-[var(--accent-color)]/20' 
            : 'text-[var(--secondary-text)] hover:text-[var(--primary-text)] hover:bg-[var(--hover-bg)]'
        } ${isOpen ? 'bg-[var(--accent-color)]/15' : ''}`}
        title={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
      >
        <svg 
          className="w-5 h-5" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" 
          />
        </svg>
        
        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-[var(--warning-color)] text-white text-xs font-medium rounded-full min-w-[1.25rem] h-5 flex items-center justify-center px-1 shadow-sm">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-[var(--card-bg)] rounded-lg shadow-[var(--shadow-lg)] border border-[var(--border-color)] z-[85] max-h-[32rem] overflow-hidden notification-dropdown">
          {/* Header */}
          <div className="px-6 py-4 border-b border-[var(--border-color)] bg-[var(--card-bg)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-[var(--accent-color)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <h3 className="text-base font-semibold text-[var(--primary-text)]">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-1 text-xs font-medium bg-[var(--warning-color)] text-white rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      markAllAsRead();
                    }}
                    className="text-xs font-medium text-[var(--accent-color)] hover:text-[var(--accent-hover)] transition-colors px-2 py-1 rounded hover:bg-[var(--hover-bg)]"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    fetchNotifications();
                  }}
                  className="p-1.5 rounded-lg text-[var(--secondary-text)] hover:text-[var(--primary-text)] hover:bg-[var(--hover-bg)] transition-colors"
                  disabled={loading}
                  title="Refresh notifications"
                >
                  <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--accent-color)] border-t-transparent mx-auto"></div>
                <p className="text-sm text-[var(--secondary-text)] mt-3">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-[var(--hover-bg)] rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-[var(--tertiary-text)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-[var(--secondary-text)] mb-1">All caught up!</p>
                <p className="text-xs text-[var(--tertiary-text)]">No new notifications</p>
              </div>
            ) : (
              notifications.map((notification) => {
                // Get notification type styling
                const getTypeIcon = (type) => {
                  switch (type) {
                    case 'success':
                      return { 
                        icon: (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ), 
                        color: 'text-[var(--success-color)]', 
                        bgColor: 'bg-[var(--success-bg)]' 
                      };
                    case 'warning':
                      return { 
                        icon: (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                        ), 
                        color: 'text-[var(--warning-color)]', 
                        bgColor: 'bg-[var(--warning-bg)]' 
                      };
                    case 'error':
                      return { 
                        icon: (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        ), 
                        color: 'text-[var(--danger-color)]', 
                        bgColor: 'bg-[var(--error-bg)]' 
                      };
                    case 'info':
                    default:
                      return { 
                        icon: (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ), 
                        color: 'text-[var(--info-color)]', 
                        bgColor: 'bg-[var(--info-bg)]' 
                      };
                  }
                };

                const typeStyle = getTypeIcon(notification.type);

                return (
                  <div
                    key={notification.id}
                    className={`px-6 py-4 border-b border-[var(--border-color)] hover:bg-[var(--hover-bg)] transition-colors notification-item ${
                      !notification.is_read ? 'bg-[var(--accent-color)]/5 border-l-4 border-l-[var(--warning-color)]' : 'border-l-4 border-l-transparent'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      {/* Type Icon */}
                      <div className={`flex-shrink-0 w-8 h-8 rounded-lg ${typeStyle.bgColor} flex items-center justify-center mt-0.5`}>
                        <span className={typeStyle.color}>{typeStyle.icon}</span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-1">
                          <h4 className={`text-sm font-semibold ${!notification.is_read ? 'text-[var(--primary-text)]' : 'text-[var(--secondary-text)]'} pr-2 line-clamp-2`}>
                            {notification.title}
                          </h4>
                          {!notification.is_read && (
                            <div className="w-2 h-2 bg-[var(--warning-color)] rounded-full flex-shrink-0 mt-1"></div>
                          )}
                        </div>
                        
                        <p className="text-sm text-[var(--secondary-text)] mb-3 leading-relaxed line-clamp-3">
                          {notification.message}
                        </p>

                        {/* Footer */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <span className="text-xs text-[var(--tertiary-text)] font-medium">
                              {notification.time_ago || 'Just now'}
                            </span>
                            {notification.category && (
                              <>
                                <span className="text-xs text-[var(--tertiary-text)]">•</span>
                                <span className="text-xs text-[var(--tertiary-text)] capitalize">
                                  {notification.category}
                                </span>
                              </>
                            )}
                            {notification.priority === 'critical' && (
                              <>
                                <span className="text-xs text-[var(--tertiary-text)]">•</span>
                                <span className="text-xs text-[var(--danger-color)] font-medium">Critical</span>
                              </>
                            )}
                          </div>

                          <div className="flex items-center space-x-2">
                            {/* Action Button */}
                            {notification.action_url && notification.action_text && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (notification.action_url.startsWith('http')) {
                                    window.open(notification.action_url, '_blank');
                                  } else {
                                    window.location.href = notification.action_url;
                                  }
                                }}
                                className="text-xs font-medium text-[var(--accent-color)] hover:text-[var(--accent-hover)] transition-colors px-2 py-1 rounded hover:bg-[var(--hover-bg)]"
                              >
                                {notification.action_text}
                              </button>
                            )}

                            {/* Mark as read button */}
                            {!notification.is_read && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead(notification.id);
                                }}
                                className="text-xs text-[var(--tertiary-text)] hover:text-[var(--secondary-text)] transition-colors p-1 rounded hover:bg-[var(--hover-bg)]"
                                title="Mark as read"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                            )}

                            {/* Delete button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notification.id);
                              }}
                              className="text-xs text-[var(--tertiary-text)] hover:text-[var(--danger-color)] transition-colors p-1 rounded hover:bg-[var(--hover-bg)]"
                              title="Delete notification"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>


        </div>
              )}
    </div>
  );
};

export default NotificationDropdown; 
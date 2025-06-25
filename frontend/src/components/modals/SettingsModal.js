import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const SettingsModal = ({ isOpen, onClose }) => {
  const { theme, themePreference, changeTheme, language, changeLanguage } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('general');
  const [accountStats, setAccountStats] = useState(null);
  const [accountDetails, setAccountDetails] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [settings, setSettings] = useState({
    notifications: {
      emailNotifications: true,
      pushNotifications: true,
      notifyOnLogin: true,
      notifyOnBackup: true,
      notifyOnError: true
    },
    security: {
      twoFactorAuth: false,
      sessionTimeout: '30',
      passwordExpiry: '90',
      minPasswordLength: '12',
      requireSpecialChars: true
    },
    customization: {
      sidebarCollapsed: false,
      denseTable: false,
      animationsEnabled: true,
      showBreadcrumbs: true
    }
  });

  useEffect(() => {
    if (activeTab === 'account' && !accountStats && !user?.is_admin) {
      fetchAccountStats();
      fetchAccountDetails();
    }
  }, [activeTab, user]);

  const fetchAccountStats = async () => {
    try {
      setIsLoadingStats(true);
      setLoadError(null);
      const response = await api.get('/api/users/account-stats', {
        timeout: 5000,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      setAccountStats(response.data);
    } catch (error) {
      console.error('Failed to fetch account stats:', error);
      const errorMessage = error.response?.data?.details || error.response?.data?.error || error.message;
      setLoadError(`Failed to load account statistics: ${errorMessage}`);
      setAccountStats({
        virtualHosts: '-',
        databases: '-',
        ftpAccounts: '-',
        sslCertificates: '-'
      });
    } finally {
      setIsLoadingStats(false);
    }
  };

  const fetchAccountDetails = async () => {
    try {
      const response = await api.get('/api/users/account-details', {
        timeout: 5000,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      setAccountDetails(response.data);
    } catch (error) {
      console.error('Failed to fetch account details:', error);
    }
  };

  const retryLoading = () => {
    setAccountStats(null);
    setAccountDetails(null);
    fetchAccountStats();
    fetchAccountDetails();
  };

  const handleExportData = async () => {
    try {
      setIsExporting(true);
      const response = await api.get('/api/users/export-data', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `account-data-${new Date().toISOString()}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to export data:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      if (deleteConfirm !== user?.username) {
        alert('Please type your username correctly to confirm deletion');
        return;
      }

      setIsDeleting(true);
      console.log('Attempting to delete account...');
      
      const response = await api.delete('/api/users/delete-account');
      console.log('Delete response:', response);
      
      // Any 2xx status code is considered success
      if (response.status >= 200 && response.status < 300) {
        console.log('Account deleted successfully');
        await logout();
        onClose();
        navigate('/login?deleted=true');
        return;
      }
      
      // If we get here, it's an error
      console.error('Delete failed with status:', response.status);
      console.error('Response data:', response.data);
      throw new Error(response.data?.error || response.data?.message || 'Failed to delete account');
      
    } catch (error) {
      console.error('Delete account error:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response,
        stack: error.stack
      });
      
      // Try to get the most specific error message
      const errorMessage = 
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        'Failed to delete account';
      
      alert(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSave = () => {
    localStorage.setItem('userSettings', JSON.stringify(settings));
    onClose();
  };

  const updateSettings = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  const tabs = [
    {
      id: 'general',
      label: 'General',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    },
    ...((!user?.is_admin && user?.role !== 'admin' && user?.username !== 'root') ? [{
      id: 'account',
      label: 'Account',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    }] : []),
    {
      id: 'security',
      label: 'Security',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      )
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      )
    },
    {
      id: 'customization',
      label: 'Customization',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
      )
    }
  ].flat();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[120] overflow-y-auto">
      <div className="min-h-full flex items-center justify-center p-4">
        <div className="bg-[var(--secondary-bg)] rounded-xl border border-[var(--border-color)] w-full max-w-4xl max-h-[90vh] overflow-hidden my-8">
          <div className="flex h-full">
            {/* Sidebar */}
            <div className="w-64 border-r border-[var(--border-color)] p-4">
              <h2 className="text-xl font-bold text-[var(--primary-text)] mb-6">Settings</h2>
              <nav className="space-y-1">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-indigo-500 text-white'
                        : 'text-[var(--secondary-text)] hover:text-[var(--primary-text)] hover:bg-[var(--border-color)]'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col max-h-[90vh]">
              <div className="flex-1 overflow-y-auto p-6">
                {activeTab === 'general' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-medium text-[var(--primary-text)]">General Settings</h3>
                    <div className="grid gap-6">
                      <div>
                        <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">
                          Language
                        </label>
                        <select
                          value={language}
                          onChange={(e) => changeLanguage(e.target.value)}
                          className="w-full px-4 py-2 bg-[var(--primary-bg)] border border-[var(--border-color)] rounded-lg text-[var(--primary-text)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="en">English</option>
                          <option value="th">ไทย</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">
                          Theme
                        </label>
                        <select
                          value={themePreference}
                          onChange={(e) => changeTheme(e.target.value)}
                          className="w-full px-4 py-2 bg-[var(--primary-bg)] border border-[var(--border-color)] rounded-lg text-[var(--primary-text)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="light">Light</option>
                          <option value="dark">Dark</option>
                          <option value="system">System</option>
                        </select>
                        <p className="mt-2 text-sm text-[var(--secondary-text)]">
                          {themePreference === 'system' ? 'Follows your system theme preference' : `Using ${themePreference} theme`}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'account' && !user?.is_admin && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-medium text-[var(--primary-text)]">Account Overview</h3>
                    
                    {isLoadingStats ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary-text)] mx-auto mb-4"></div>
                        <p className="text-sm text-[var(--secondary-text)]">Loading...</p>
                        </div>
                    ) : loadError ? (
                      <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                        <p className="text-sm text-red-600 dark:text-red-400 mb-2">Error loading statistics</p>
                        <button
                          onClick={retryLoading}
                          className="text-sm text-indigo-600 hover:text-indigo-500 underline"
                        >
                          Try again
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Resource Usage Cards */}
                        <div>
                          <h4 className="text-sm font-medium text-[var(--secondary-text)] mb-3">Resource Usage</h4>
                          <div className="grid grid-cols-2 gap-3">
                            {/* Virtual Hosts Card */}
                            <div className="bg-[var(--secondary-bg)] rounded-lg p-4 border border-[var(--border-color)] hover:border-indigo-500/50 transition-colors cursor-default">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-[var(--secondary-text)]">Virtual Hosts</span>
                                <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                </svg>
                              </div>
                              <div className="text-2xl font-bold text-[var(--primary-text)] mb-1">
                                {accountStats?.virtualHosts || 0}
                              </div>
                            </div>

                            {/* Databases Card */}
                            <div className="bg-[var(--secondary-bg)] rounded-lg p-4 border border-[var(--border-color)] hover:border-blue-500/50 transition-colors cursor-default">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-[var(--secondary-text)]">Databases</span>
                                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                                </svg>
                              </div>
                              <div className="text-2xl font-bold text-[var(--primary-text)] mb-1">
                                {accountStats?.databases || 0}
                              </div>
                            </div>

                            {/* FTP Accounts Card */}
                            <div className="bg-[var(--secondary-bg)] rounded-lg p-4 border border-[var(--border-color)] hover:border-green-500/50 transition-colors cursor-default">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-[var(--secondary-text)]">FTP Accounts</span>
                                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                </svg>
                              </div>
                              <div className="text-2xl font-bold text-[var(--primary-text)] mb-1">
                                {accountStats?.ftpAccounts || 0}
                              </div>
                            </div>

                            {/* SSL Certificates Card */}
                            <div className="bg-[var(--secondary-bg)] rounded-lg p-4 border border-[var(--border-color)] hover:border-purple-500/50 transition-colors cursor-default">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-[var(--secondary-text)]">SSL Certificates</span>
                                <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                              </div>
                              <div className="text-2xl font-bold text-[var(--primary-text)] mb-1">
                                {accountStats?.sslCertificates || 0}
                              </div>
                            </div>
                        </div>
                        </div>

                        {/* Account Management */}
                        <div>
                          <h4 className="text-sm font-medium text-[var(--secondary-text)] mb-3">Account Management</h4>
                          <div className="space-y-2">
                            <button
                              onClick={handleExportData}
                              disabled={isExporting}
                              className="w-full text-left px-4 py-3 bg-[var(--secondary-bg)] rounded-lg hover:bg-[var(--border-color)] transition-colors flex justify-between items-center"
                            >
                              <div>
                                <p className="text-sm font-medium text-[var(--primary-text)]">Export Account Data</p>
                                <p className="text-xs text-[var(--secondary-text)]">Download all your data as JSON</p>
                              </div>
                              <svg className="w-5 h-5 text-[var(--secondary-text)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* Danger Zone */}
                        <div className="border-t border-[var(--border-color)] pt-6">
                          <h4 className="text-sm font-medium text-red-600 dark:text-red-400 mb-3">Danger Zone</h4>
                          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                            <p className="text-sm text-[var(--primary-text)] mb-3">
                              Delete your account permanently. This action cannot be undone.
                            </p>
                            <details className="group">
                              <summary className="cursor-pointer text-sm text-red-600 hover:text-red-700 font-medium">
                                Delete Account
                              </summary>
                              <div className="mt-3 space-y-3">
                                <p className="text-xs text-[var(--secondary-text)]">
                                  To confirm deletion, type your username <span className="font-mono bg-[var(--primary-bg)] px-1 rounded">{user?.username}</span> below:
                                </p>
                          <input
                                  type="text"
                                  placeholder="Enter your username to confirm"
                                  value={deleteConfirm}
                                  onChange={(e) => setDeleteConfirm(e.target.value)}
                                  className="w-full px-3 py-2 text-sm bg-[var(--primary-bg)] border border-red-300 dark:border-red-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                />
                                <button
                                  onClick={handleDeleteAccount}
                                  disabled={!deleteConfirm || deleteConfirm !== user?.username || isDeleting}
                                  className="w-full px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  {isDeleting ? 'Deleting Account...' : 'Delete Account Permanently'}
                                </button>
                              </div>
                            </details>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {activeTab === 'security' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-medium text-[var(--primary-text)]">Security Settings</h3>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium text-[var(--secondary-text)] mb-4">Authentication</h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                              <p className="text-sm font-medium text-[var(--secondary-text)]">Two-Factor Authentication</p>
                              <p className="text-sm text-[var(--tertiary-text)]">Add an extra layer of security to your account</p>
                        </div>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={settings.security.twoFactorAuth}
                            onChange={(e) => updateSettings('security', 'twoFactorAuth', e.target.checked)}
                                className="w-4 h-4 rounded border-[var(--border-color)] text-indigo-500"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-[var(--secondary-text)] mb-4">Password Settings</h4>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm text-[var(--secondary-text)] mb-2">
                              Minimum Password Length
                            </label>
                            <select
                              value={settings.security.minPasswordLength}
                              onChange={(e) => updateSettings('security', 'minPasswordLength', e.target.value)}
                              className="w-full px-4 py-2 bg-[var(--primary-bg)] border border-[var(--border-color)] rounded-lg"
                            >
                              <option value="8">8 characters</option>
                              <option value="12">12 characters</option>
                              <option value="16">16 characters</option>
                            </select>
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-[var(--secondary-text)]">Require Special Characters</p>
                              <p className="text-sm text-[var(--tertiary-text)]">Enforce special characters in passwords</p>
                            </div>
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                checked={settings.security.requireSpecialChars}
                                onChange={(e) => updateSettings('security', 'requireSpecialChars', e.target.checked)}
                                className="w-4 h-4 rounded border-[var(--border-color)] text-indigo-500"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-[var(--secondary-text)] mb-4">Session Settings</h4>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm text-[var(--secondary-text)] mb-2">
                          Session Timeout (minutes)
                        </label>
                            <select
                          value={settings.security.sessionTimeout}
                          onChange={(e) => updateSettings('security', 'sessionTimeout', e.target.value)}
                              className="w-full px-4 py-2 bg-[var(--primary-bg)] border border-[var(--border-color)] rounded-lg"
                            >
                              <option value="15">15 minutes</option>
                              <option value="30">30 minutes</option>
                              <option value="60">1 hour</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'notifications' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-medium text-[var(--primary-text)]">Notification Settings</h3>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium text-[var(--secondary-text)] mb-4">Notification Channels</h4>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-[var(--secondary-text)]">Email Notifications</p>
                              <p className="text-sm text-[var(--tertiary-text)]">Receive notifications via email</p>
                            </div>
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                checked={settings.notifications.emailNotifications}
                                onChange={(e) => updateSettings('notifications', 'emailNotifications', e.target.checked)}
                                className="w-4 h-4 rounded border-[var(--border-color)] text-indigo-500"
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-[var(--secondary-text)]">Push Notifications</p>
                              <p className="text-sm text-[var(--tertiary-text)]">Receive push notifications in browser</p>
                            </div>
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                checked={settings.notifications.pushNotifications}
                                onChange={(e) => updateSettings('notifications', 'pushNotifications', e.target.checked)}
                                className="w-4 h-4 rounded border-[var(--border-color)] text-indigo-500"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-[var(--secondary-text)] mb-4">Notification Events</h4>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-[var(--secondary-text)]">Login Activity</p>
                              <p className="text-sm text-[var(--tertiary-text)]">Get notified about new login attempts</p>
                            </div>
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                checked={settings.notifications.notifyOnLogin}
                                onChange={(e) => updateSettings('notifications', 'notifyOnLogin', e.target.checked)}
                                className="w-4 h-4 rounded border-[var(--border-color)] text-indigo-500"
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-[var(--secondary-text)]">Backup Completion</p>
                              <p className="text-sm text-[var(--tertiary-text)]">Get notified when backups are completed</p>
                            </div>
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                checked={settings.notifications.notifyOnBackup}
                                onChange={(e) => updateSettings('notifications', 'notifyOnBackup', e.target.checked)}
                                className="w-4 h-4 rounded border-[var(--border-color)] text-indigo-500"
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-[var(--secondary-text)]">System Errors</p>
                              <p className="text-sm text-[var(--tertiary-text)]">Get notified about system errors</p>
                            </div>
                            <div className="flex items-center">
                        <input
                                type="checkbox"
                                checked={settings.notifications.notifyOnError}
                                onChange={(e) => updateSettings('notifications', 'notifyOnError', e.target.checked)}
                                className="w-4 h-4 rounded border-[var(--border-color)] text-indigo-500"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'customization' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-medium text-[var(--primary-text)]">Customization Settings</h3>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium text-[var(--secondary-text)] mb-4">Interface Preferences</h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                              <p className="text-sm font-medium text-[var(--secondary-text)]">Collapsed Sidebar</p>
                              <p className="text-sm text-[var(--tertiary-text)]">Keep the sidebar collapsed by default</p>
                        </div>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={settings.customization.sidebarCollapsed}
                            onChange={(e) => updateSettings('customization', 'sidebarCollapsed', e.target.checked)}
                                className="w-4 h-4 rounded border-[var(--border-color)] text-indigo-500"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                              <p className="text-sm font-medium text-[var(--secondary-text)]">Dense Tables</p>
                              <p className="text-sm text-[var(--tertiary-text)]">Use compact table layout</p>
                        </div>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={settings.customization.denseTable}
                            onChange={(e) => updateSettings('customization', 'denseTable', e.target.checked)}
                                className="w-4 h-4 rounded border-[var(--border-color)] text-indigo-500"
                          />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-[var(--secondary-text)] mb-4">Visual Preferences</h4>
                        <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                              <p className="text-sm font-medium text-[var(--secondary-text)]">Enable Animations</p>
                              <p className="text-sm text-[var(--tertiary-text)]">Show interface animations</p>
                        </div>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={settings.customization.animationsEnabled}
                            onChange={(e) => updateSettings('customization', 'animationsEnabled', e.target.checked)}
                                className="w-4 h-4 rounded border-[var(--border-color)] text-indigo-500"
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-[var(--secondary-text)]">Show Breadcrumbs</p>
                              <p className="text-sm text-[var(--tertiary-text)]">Display navigation breadcrumbs</p>
                            </div>
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                checked={settings.customization.showBreadcrumbs}
                                onChange={(e) => updateSettings('customization', 'showBreadcrumbs', e.target.checked)}
                                className="w-4 h-4 rounded border-[var(--border-color)] text-indigo-500"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-[var(--border-color)] p-4 flex justify-end space-x-4">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-[var(--secondary-text)] hover:text-[var(--primary-text)] transition-colors"
                >
                  Cancel
                </button>
                <Button onClick={handleSave}>
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal; 
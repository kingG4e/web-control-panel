import React, { useState, useEffect } from 'react';
import {
  Cog6ToothIcon,
  UserIcon,
  ShieldCheckIcon,
  BellIcon,
  LanguageIcon,
  PaintBrushIcon,
  ChartBarIcon,
  TrashIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import BaseModal, { ModalSection, ModalSectionTitle, ModalInfoBox, ModalButton } from './BaseModal';
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
      const response = await api.get('/users/account-stats', {
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
      const response = await api.get('/users/account-details', {
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
      const response = await api.get('/users/export-data', { responseType: 'blob' });
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
      
      const response = await api.delete('/users/delete-account');
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
      icon: <Cog6ToothIcon className="w-5 h-5" />
    },
    {
      id: 'account',
      label: 'Account',
      icon: <UserIcon className="w-5 h-5" />
    },
    {
      id: 'security',
      label: 'Security',
      icon: <ShieldCheckIcon className="w-5 h-5" />
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: <BellIcon className="w-5 h-5" />
    }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="space-y-6">
            <ModalSectionTitle>General Settings</ModalSectionTitle>
            <div className="grid gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Language
                </label>
                <select
                  value={language}
                  onChange={(e) => changeLanguage(e.target.value)}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="en">English</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Theme
                </label>
                <select
                  value={themePreference}
                  onChange={(e) => changeTheme(e.target.value)}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="system">System</option>
                </select>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {themePreference === 'system' ? 'Follows your system theme preference' : `Using ${themePreference} theme`}
                </p>
              </div>
            </div>
          </div>
        );

      case 'account':
        return (
          <div className="space-y-6">
            <ModalSectionTitle>Account Overview</ModalSectionTitle>
            
            {isLoadingStats ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Loading...</p>
              </div>
            ) : loadError ? (
              <ModalInfoBox variant="error">
                <p className="mb-2">Error loading statistics</p>
                <ModalButton variant="primary" size="sm" onClick={retryLoading}>
                  Try again
                </ModalButton>
              </ModalInfoBox>
            ) : (
              <>
                {/* Resource Usage Cards */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Resource Usage</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Virtual Hosts Card */}
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-600 dark:text-gray-400">Virtual Hosts</span>
                        <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                        </svg>
                      </div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                        {accountStats?.virtualHosts || 0}
                      </div>
                    </div>

                    {/* Databases Card */}
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-600 dark:text-gray-400">Databases</span>
                        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                        </svg>
                      </div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                        {accountStats?.databases || 0}
                      </div>
                    </div>

                    {/* FTP Accounts Card */}
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-600 dark:text-gray-400">FTP Accounts</span>
                        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                      </div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                        {accountStats?.ftpAccounts || 0}
                      </div>
                    </div>

                    {/* SSL Certificates Card */}
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-600 dark:text-gray-400">SSL Certificates</span>
                        <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                        {accountStats?.sslCertificates || 0}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Account Management */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Account Management</h4>
                  <div className="space-y-2">
                    <button
                      onClick={handleExportData}
                      disabled={isExporting}
                      className="w-full text-left px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex justify-between items-center"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Export Account Data</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Download all your data as JSON</p>
                      </div>
                      <ArrowDownTrayIcon className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h4 className="text-sm font-medium text-red-600 dark:text-red-400 mb-3">Danger Zone</h4>
                  <ModalInfoBox variant="error">
                    <p className="mb-3">
                      Delete your account permanently. This action cannot be undone.
                    </p>
                    <details className="group">
                      <summary className="cursor-pointer text-sm text-red-600 hover:text-red-700 font-medium">
                        Delete Account
                      </summary>
                      <div className="mt-3 space-y-3">
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          To confirm deletion, type your username <span className="font-mono bg-gray-200 dark:bg-gray-700 px-1 rounded">{user?.username}</span> below:
                        </p>
                        <input
                          type="text"
                          placeholder="Enter your username to confirm"
                          value={deleteConfirm}
                          onChange={(e) => setDeleteConfirm(e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-red-300 dark:border-red-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                        <ModalButton
                          variant="danger"
                          onClick={handleDeleteAccount}
                          disabled={!deleteConfirm || deleteConfirm !== user?.username || isDeleting}
                          className="w-full"
                        >
                          {isDeleting ? 'Deleting Account...' : 'Delete Account Permanently'}
                        </ModalButton>
                      </div>
                    </details>
                  </ModalInfoBox>
                </div>
              </>
            )}
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            <ModalSectionTitle>Security Settings</ModalSectionTitle>
            <ModalInfoBox variant="info">
              <p>Security settings will be implemented in future updates.</p>
            </ModalInfoBox>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <ModalSectionTitle>Notification Settings</ModalSectionTitle>
            <ModalInfoBox variant="info">
              <p>Notification settings will be implemented in future updates.</p>
            </ModalInfoBox>
          </div>
        );

      default:
        return null;
    }
  };

  const footer = (
    <div className="flex justify-end gap-3">
      <ModalButton variant="ghost" onClick={onClose}>
        Close
      </ModalButton>
      <ModalButton variant="primary" onClick={handleSave}>
        Save Changes
      </ModalButton>
    </div>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Settings"
      titleIcon={<Cog6ToothIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />}
      footer={footer}
      maxWidth="max-w-4xl"
    >
      <div className="flex h-full">
        {/* Sidebar */}
        <div className="w-64 border-r border-gray-200 dark:border-gray-700 p-4">
          <nav className="space-y-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col max-h-[calc(90vh-8rem)]">
          <div className="flex-1 overflow-y-auto p-6">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </BaseModal>
  );
};

export default SettingsModal; 
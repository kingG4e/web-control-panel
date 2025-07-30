import React, { useState, useEffect } from 'react';
import {
  Cog6ToothIcon,
  UserIcon,
  ShieldCheckIcon,
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
      
      const response = await api.delete('/users/delete-account');
      
      // Any 2xx status code is considered success
      if (response.status >= 200 && response.status < 300) {
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

  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="space-y-6">
            <ModalSectionTitle>General Settings</ModalSectionTitle>
            <div className="grid gap-6">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--primary-text)' }}>
                  Language
                </label>
                <select
                  value={language}
                  onChange={(e) => changeLanguage(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--primary-text)',
                    focusRingColor: 'var(--focus-border)'
                  }}
                >
                  <option value="en">English</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--primary-text)' }}>
                  Theme
                </label>
                <select
                  value={themePreference}
                  onChange={(e) => changeTheme(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--primary-text)',
                    focusRingColor: 'var(--focus-border)'
                  }}
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="system">System</option>
                </select>
                <p className="mt-2 text-sm" style={{ color: 'var(--secondary-text)' }}>
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
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--accent-color)' }}></div>
                <p className="text-sm" style={{ color: 'var(--secondary-text)' }}>Loading...</p>
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
                  <h4 className="text-sm font-medium mb-3" style={{ color: 'var(--primary-text)' }}>Resource Usage</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Virtual Hosts Card */}
                    <div className="rounded-lg p-4 border" style={{ 
                      backgroundColor: 'var(--card-bg)', 
                      borderColor: 'var(--border-color)' 
                    }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs" style={{ color: 'var(--secondary-text)' }}>Virtual Hosts</span>
                        <svg className="w-4 h-4" style={{ color: 'var(--accent-color)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                        </svg>
                      </div>
                      <div className="text-2xl font-bold mb-1" style={{ color: 'var(--primary-text)' }}>
                        {accountStats?.virtualHosts || 0}
                      </div>
                    </div>

                    {/* Databases Card */}
                    <div className="rounded-lg p-4 border" style={{ 
                      backgroundColor: 'var(--card-bg)', 
                      borderColor: 'var(--border-color)' 
                    }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs" style={{ color: 'var(--secondary-text)' }}>Databases</span>
                        <svg className="w-4 h-4" style={{ color: 'var(--accent-color)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                        </svg>
                      </div>
                      <div className="text-2xl font-bold mb-1" style={{ color: 'var(--primary-text)' }}>
                        {accountStats?.databases || 0}
                      </div>
                    </div>



                    {/* SSL Certificates Card */}
                    <div className="rounded-lg p-4 border" style={{ 
                      backgroundColor: 'var(--card-bg)', 
                      borderColor: 'var(--border-color)' 
                    }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs" style={{ color: 'var(--secondary-text)' }}>SSL Certificates</span>
                        <svg className="w-4 h-4" style={{ color: 'var(--accent-color)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <div className="text-2xl font-bold mb-1" style={{ color: 'var(--primary-text)' }}>
                        {accountStats?.sslCertificates || 0}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Account Management */}
                <div>
                  <h4 className="text-sm font-medium mb-3" style={{ color: 'var(--primary-text)' }}>Account Management</h4>
                  <div className="space-y-2">
                    <button
                      onClick={handleExportData}
                      disabled={isExporting}
                      className="w-full text-left px-4 py-3 rounded-lg transition-colors flex justify-between items-center bg-[var(--card-bg)] border border-[var(--border-color)] hover:bg-[var(--hover-bg)]"
                    >
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--primary-text)' }}>Export Account Data</p>
                        <p className="text-xs" style={{ color: 'var(--secondary-text)' }}>Download all your data as JSON</p>
                      </div>
                      <ArrowDownTrayIcon className="w-5 h-5" style={{ color: 'var(--secondary-text)' }} />
                    </button>
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="pt-6" style={{ borderTop: '1px solid var(--border-color)' }}>
                  <h4 className="text-sm font-medium mb-3" style={{ color: 'var(--danger-color)' }}>Danger Zone</h4>
                  <ModalInfoBox variant="error">
                    <p className="mb-3">
                      Delete your account permanently. This action cannot be undone.
                    </p>
                    <details className="group">
                      <summary className="cursor-pointer text-sm font-medium" style={{ color: 'var(--danger-color)' }}>
                        Delete Account
                      </summary>
                      <div className="mt-3 space-y-3">
                        <p className="text-xs" style={{ color: 'var(--secondary-text)' }}>
                          To confirm deletion, type your username <span className="font-mono px-1 rounded" style={{ backgroundColor: 'var(--secondary-bg)' }}>{user?.username}</span> below:
                        </p>
                        <input
                          type="text"
                          placeholder="Enter your username to confirm"
                          value={deleteConfirm}
                          onChange={(e) => setDeleteConfirm(e.target.value)}
                          className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2"
                          style={{
                            backgroundColor: 'var(--input-bg)',
                            border: '1px solid var(--danger-color)',
                            color: 'var(--primary-text)',
                            focusRingColor: 'var(--danger-color)'
                          }}
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
      titleIcon={<Cog6ToothIcon className="w-6 h-6" style={{ color: 'var(--secondary-text)' }} />}
      footer={footer}
      maxWidth="max-w-4xl"
    >
      <div className="flex h-full">
        {/* Sidebar */}
        <div className="w-64 p-4" style={{ borderRight: '1px solid var(--border-color)' }}>
          <nav className="space-y-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white'
                    : 'bg-transparent hover:bg-[var(--hover-bg)] text-[var(--secondary-text)] hover:text-[var(--primary-text)]'
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
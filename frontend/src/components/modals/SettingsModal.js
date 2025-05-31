import React, { useState } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { useTheme } from '../../contexts/ThemeContext';

const SettingsModal = ({ isOpen, onClose }) => {
  const { theme, themePreference, changeTheme, language, changeLanguage } = useTheme();
  const [activeTab, setActiveTab] = useState('general');
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

  const handleSave = () => {
    // TODO: Save settings to backend
    console.log('Saving settings:', settings);
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
      id: 'security',
      label: 'Security',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
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
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm z-50">
      <div className="bg-[var(--secondary-bg)] rounded-xl border border-[var(--border-color)] w-full max-w-4xl max-h-[90vh] overflow-hidden">
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

              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-[var(--primary-text)]">Notification Preferences</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-[var(--secondary-text)]">Email Notifications</h4>
                        <p className="text-sm text-[var(--tertiary-text)]">Receive notifications via email</p>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.notifications.emailNotifications}
                          onChange={(e) => updateSettings('notifications', 'emailNotifications', e.target.checked)}
                          className="w-4 h-4 rounded border-[var(--border-color)] text-[var(--primary-text)] focus:ring-[var(--primary-text)] focus:ring-offset-[var(--primary-bg)]"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-[var(--secondary-text)]">Push Notifications</h4>
                        <p className="text-sm text-[var(--tertiary-text)]">Receive push notifications in browser</p>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.notifications.pushNotifications}
                          onChange={(e) => updateSettings('notifications', 'pushNotifications', e.target.checked)}
                          className="w-4 h-4 rounded border-[var(--border-color)] text-[var(--primary-text)] focus:ring-[var(--primary-text)] focus:ring-offset-[var(--primary-bg)]"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-[var(--secondary-text)]">Login Notifications</h4>
                        <p className="text-sm text-[var(--tertiary-text)]">Get notified of new login attempts</p>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.notifications.notifyOnLogin}
                          onChange={(e) => updateSettings('notifications', 'notifyOnLogin', e.target.checked)}
                          className="w-4 h-4 rounded border-[var(--border-color)] text-[var(--primary-text)] focus:ring-[var(--primary-text)] focus:ring-offset-[var(--primary-bg)]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-[var(--primary-text)]">Security Settings</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-[var(--secondary-text)]">Two-Factor Authentication</h4>
                        <p className="text-sm text-[var(--tertiary-text)]">Add an extra layer of security</p>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.security.twoFactorAuth}
                          onChange={(e) => updateSettings('security', 'twoFactorAuth', e.target.checked)}
                          className="w-4 h-4 rounded border-[var(--border-color)] text-[var(--primary-text)] focus:ring-[var(--primary-text)] focus:ring-offset-[var(--primary-bg)]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">
                        Session Timeout (minutes)
                      </label>
                      <input
                        type="number"
                        value={settings.security.sessionTimeout}
                        onChange={(e) => updateSettings('security', 'sessionTimeout', e.target.value)}
                        className="w-full px-4 py-2 bg-[var(--primary-bg)] border border-[var(--border-color)] rounded-lg text-[var(--primary-text)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">
                        Password Expiry (days)
                      </label>
                      <input
                        type="number"
                        value={settings.security.passwordExpiry}
                        onChange={(e) => updateSettings('security', 'passwordExpiry', e.target.value)}
                        className="w-full px-4 py-2 bg-[var(--primary-bg)] border border-[var(--border-color)] rounded-lg text-[var(--primary-text)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'customization' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-[var(--primary-text)]">Customization</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-[var(--secondary-text)]">Collapsed Sidebar</h4>
                        <p className="text-sm text-[var(--tertiary-text)]">Keep sidebar collapsed by default</p>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.customization.sidebarCollapsed}
                          onChange={(e) => updateSettings('customization', 'sidebarCollapsed', e.target.checked)}
                          className="w-4 h-4 rounded border-[var(--border-color)] text-[var(--primary-text)] focus:ring-[var(--primary-text)] focus:ring-offset-[var(--primary-bg)]"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-[var(--secondary-text)]">Dense Tables</h4>
                        <p className="text-sm text-[var(--tertiary-text)]">Compact table rows</p>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.customization.denseTable}
                          onChange={(e) => updateSettings('customization', 'denseTable', e.target.checked)}
                          className="w-4 h-4 rounded border-[var(--border-color)] text-[var(--primary-text)] focus:ring-[var(--primary-text)] focus:ring-offset-[var(--primary-bg)]"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-[var(--secondary-text)]">Enable Animations</h4>
                        <p className="text-sm text-[var(--tertiary-text)]">Show animations and transitions</p>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.customization.animationsEnabled}
                          onChange={(e) => updateSettings('customization', 'animationsEnabled', e.target.checked)}
                          className="w-4 h-4 rounded border-[var(--border-color)] text-[var(--primary-text)] focus:ring-[var(--primary-text)] focus:ring-offset-[var(--primary-bg)]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-[var(--border-color)] p-4 flex justify-end space-x-4">
              <Button
                variant="secondary"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal; 
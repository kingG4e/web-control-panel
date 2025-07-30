import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { email } from '../services/api';

// Inline SVG Icons
const ArrowLeftIcon = ({ className, style }) => (
  <svg className={className} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

const ArrowPathIcon = ({ className, style }) => (
  <svg className={className} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const PlusIcon = ({ className, style }) => (
  <svg className={className} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const EnvelopeIcon = ({ className, style }) => (
  <svg className={className} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const PencilIcon = ({ className, style }) => (
  <svg className={className} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const TrashIcon = ({ className, style }) => (
  <svg className={className} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const ForwardIcon = ({ className, style }) => (
  <svg className={className} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
  </svg>
);

const GlobeAltIcon = ({ className, style }) => (
  <svg className={className} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
  </svg>
);

const UserIcon = ({ className, style }) => (
  <svg className={className} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const XMarkIcon = ({ className, style }) => (
  <svg className={className} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const ExclamationTriangleIcon = ({ className, style }) => (
  <svg className={className} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const KeyIcon = ({ className, style }) => (
  <svg className={className} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
  </svg>
);

const CogIcon = ({ className, style }) => (
  <svg className={className} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const ComputerDesktopIcon = ({ className, style }) => (
  <svg className={className} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
  </svg>
);

const EmailSettings = () => {
  const [domains, setDomains] = useState([]);
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('domains');

  // Modal states
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showForwarderModal, setShowForwarderModal] = useState(false);
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);

  // Form data
  const [accountForm, setAccountForm] = useState({
    username: '',
    password: '',
    quota: 1024,
  });
  const [forwarderForm, setForwarderForm] = useState({
    source: '',
    destination: '',
  });
  const [passwordResetForm, setPasswordResetForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [quotaForm, setQuotaForm] = useState({
    quota: 1024,
  });

  // Switch to Accounts tab automatically when a domain with accounts is selected
  useEffect(() => {
    if (selectedDomain && (selectedDomain.accounts?.length || 0) > 0) {
      setActiveTab('accounts');
    }
  }, [selectedDomain]);

  useEffect(() => {
    fetchDomains();
  }, []);

  const fetchDomains = async () => {
    try {
      setLoading(true);
      const data = await email.getDomains();
      setDomains(data);
      if (data.length > 0 && !selectedDomain) {
        setSelectedDomain(data[0]);
      }
    } catch (err) {
      setError('Failed to fetch email domains');
      console.error('Error fetching domains:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (!selectedDomain) return;

    try {
      if (editingAccount) {
        // Update existing account
        await email.updateAccount(selectedDomain.virtual_host_id, editingAccount.id, accountForm);
      } else {
        // Create new account
        await email.createAccount(selectedDomain.virtual_host_id, accountForm);
      }
      setShowAccountModal(false);
      setAccountForm({ username: '', password: '', quota: 1024 });
    setEditingAccount(null);
      fetchDomains();
    } catch (err) {
      setError(editingAccount ? 'Failed to update account' : 'Failed to create account');
      console.error('Error with account:', err);
    }
  };

  const handleCreateForwarder = async (e) => {
    e.preventDefault();
    if (!selectedDomain) return;

    try {
      const response = await fetch(`/api/email/domains/${selectedDomain.virtual_host_id}/forwarders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(forwarderForm)
      });

      if (!response.ok) throw new Error('Failed to create forwarder');

      setShowForwarderModal(false);
      setForwarderForm({ source: '', destination: '' });
      fetchDomains();
    } catch (err) {
      setError('Failed to create forwarder');
      console.error('Error creating forwarder:', err);
    }
  };

  const handleDeleteAccount = async (accountId) => {
    if (!window.confirm('Are you sure you want to delete this email account?')) return;

    try {
      const response = await fetch(`/api/email/accounts/${accountId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete account');

      fetchDomains();
    } catch (err) {
      setError('Failed to delete account');
      console.error('Error deleting account:', err);
    }
  };

  const handleDeleteForwarder = async (forwarderId) => {
    if (!window.confirm('Are you sure you want to delete this forwarder?')) return;

    try {
      const response = await fetch(`/api/email/forwarders/${forwarderId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete forwarder');

      fetchDomains();
    } catch (err) {
      setError('Failed to delete forwarder');
      console.error('Error deleting forwarder:', err);
    }
  };

  const handleRefreshQuota = async (accountId) => {
    try {
      const response = await fetch(`/api/email/accounts/${accountId}/quota`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to refresh quota');

      fetchDomains();
    } catch (err) {
      setError('Failed to refresh quota');
      console.error('Error refreshing quota:', err);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (!selectedAccount) return;

    if (passwordResetForm.newPassword !== passwordResetForm.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (passwordResetForm.newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    try {
      const response = await fetch(`/api/email/accounts/${selectedAccount.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          password: passwordResetForm.newPassword
        })
      });

      if (!response.ok) throw new Error('Failed to reset password');

      setShowPasswordResetModal(false);
      setPasswordResetForm({ newPassword: '', confirmPassword: '' });
      setSelectedAccount(null);
      fetchDomains();
      setError(null);
    } catch (err) {
      setError('Failed to reset password');
      console.error('Error resetting password:', err);
    }
  };

  const handleQuotaUpdate = async (e) => {
    e.preventDefault();
    if (!selectedAccount) return;

    try {
      const response = await fetch(`/api/email/accounts/${selectedAccount.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          quota: quotaForm.quota
        })
      });

      if (!response.ok) throw new Error('Failed to update quota');

      setShowQuotaModal(false);
      setQuotaForm({ quota: 1024 });
      setSelectedAccount(null);
      fetchDomains();
      setError(null);
    } catch (err) {
      setError('Failed to update quota');
      console.error('Error updating quota:', err);
    }
  };

  const handleRoundcubeAccess = (account) => {
    // Open Roundcube webmail in new tab/window
    const roundcubeUrl = `http://${window.location.hostname}/roundcube/?_user=${account.email}`;
    window.open(roundcubeUrl, '_blank');
  };

  const formatQuotaUsage = (used, total) => {
    const percentage = (used / total) * 100;
    return {
      percentage: Math.min(percentage, 100),
      used: used.toFixed(1),
      total: total,
      color: percentage > 90 ? '#ef4444' : percentage > 70 ? '#f59e0b' : '#22c55e'
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--primary-bg)' }}>
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--primary-bg)' }}>
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: 'var(--primary-text)', marginBottom: '8px' }}>
              Email Management
            </h1>
            <p className="text-sm" style={{ color: 'var(--secondary-text)' }}>
              Manage email accounts and forwarders for your Virtual Hosts
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 rounded-lg border-l-4" style={{ 
            backgroundColor: 'rgba(239, 68, 68, 0.1)', 
            borderColor: '#ef4444',
            color: 'var(--primary-text)'
          }}>
            <div className="flex items-center">
              <ExclamationTriangleIcon className="w-5 h-5 mr-3" style={{ color: '#ef4444' }} />
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-auto p-1 rounded"
                style={{ color: '#ef4444' }}
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
          </div>
        </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="rounded-xl border p-6" style={{ 
            backgroundColor: 'var(--card-bg)', 
            borderColor: 'var(--border-color)' 
          }}>
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ 
                backgroundColor: 'rgba(59, 130, 246, 0.15)' 
              }}>
                <GlobeAltIcon className="w-6 h-6" style={{ color: '#3b82f6' }} />
              </div>
              <div className="ml-4">
                <h3 className="text-2xl font-bold" style={{ color: 'var(--primary-text)' }}>
                  {domains.length}
                </h3>
                <p className="text-sm" style={{ color: 'var(--secondary-text)' }}>
                  Virtual Hosts
                </p>
              </div>
        </div>
      </div>

          <div className="rounded-xl border p-6" style={{ 
            backgroundColor: 'var(--card-bg)', 
            borderColor: 'var(--border-color)' 
          }}>
                            <div className="flex items-center">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ 
                backgroundColor: 'rgba(34, 197, 94, 0.15)' 
              }}>
                <EnvelopeIcon className="w-6 h-6" style={{ color: '#22c55e' }} />
                    </div>
              <div className="ml-4">
                <h3 className="text-2xl font-bold" style={{ color: 'var(--primary-text)' }}>
                  {domains.reduce((total, domain) => total + (domain.accounts?.length || 0), 0)}
                </h3>
                <p className="text-sm" style={{ color: 'var(--secondary-text)' }}>
                  Email Accounts
                </p>
                              </div>
                            </div>
          </div>

          <div className="rounded-xl border p-6" style={{ 
            backgroundColor: 'var(--card-bg)', 
            borderColor: 'var(--border-color)' 
          }}>
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ 
                backgroundColor: 'rgba(251, 191, 36, 0.15)' 
              }}>
                <ForwardIcon className="w-6 h-6" style={{ color: '#fbbf24' }} />
              </div>
              <div className="ml-4">
                <h3 className="text-2xl font-bold" style={{ color: 'var(--primary-text)' }}>
                  {domains.reduce((total, domain) => total + (domain.forwarders?.length || 0), 0)}
                </h3>
                <p className="text-sm" style={{ color: 'var(--secondary-text)' }}>
                  Forwarders
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border p-6" style={{ 
            backgroundColor: 'var(--card-bg)', 
            borderColor: 'var(--border-color)' 
          }}>
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ 
                backgroundColor: 'rgba(168, 85, 247, 0.15)' 
              }}>
                <UserIcon className="w-6 h-6" style={{ color: '#a855f7' }} />
              </div>
              <div className="ml-4">
                <h3 className="text-2xl font-bold" style={{ color: 'var(--primary-text)' }}>
                  {(() => {
                    const totalQuota = domains.reduce((total, domain) => 
                      total + (domain.accounts?.reduce((acc, account) => acc + account.quota, 0) || 0), 0
                    );
                    return (totalQuota / 1024).toFixed(1);
                  })()}
                </h3>
                <p className="text-sm" style={{ color: 'var(--secondary-text)' }}>
                  Total Quota (GB)
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Domain List */}
          <div className="lg:col-span-1">
            <div className="rounded-xl border p-6" style={{ 
              backgroundColor: 'var(--card-bg)', 
              borderColor: 'var(--border-color)' 
            }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold" style={{ color: 'var(--primary-text)' }}>
                  Virtual Hosts
                </h2>
                <span className="text-sm px-2 py-1 rounded" style={{ 
                  backgroundColor: 'var(--secondary-bg)', 
                  color: 'var(--secondary-text)' 
                }}>
                  {domains.length}
                    </span>
              </div>

              <div className="space-y-2">
                {domains.length === 0 ? (
                  <div className="text-center py-8">
                    <GlobeAltIcon className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--secondary-text)' }} />
                    <p className="text-sm" style={{ color: 'var(--secondary-text)' }}>
                      No Virtual Hosts found
                    </p>
                    <p className="text-xs mt-2" style={{ color: 'var(--secondary-text)' }}>
                      <Link to="/virtual-hosts" style={{ color: 'var(--accent-color)' }}>
                        Create a Virtual Host first
                      </Link> to manage email
                    </p>
                  </div>
                ) : (
                  domains.map((domain) => (
                    <div
                      key={domain.id}
                      onClick={() => setSelectedDomain(domain)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedDomain?.id === domain.id ? 'ring-2' : ''
                      }`}
                      style={{
                        backgroundColor: selectedDomain?.id === domain.id 
                          ? 'rgba(59, 130, 246, 0.1)' 
                          : 'var(--secondary-bg)',
                        ringColor: selectedDomain?.id === domain.id ? '#3b82f6' : 'transparent'
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-sm" style={{ color: 'var(--primary-text)' }}>
                            {domain.domain}
                          </h3>
                          <p className="text-xs mt-1" style={{ color: 'var(--secondary-text)' }}>
                            {domain.accounts?.length || 0} accounts
                          </p>
                        </div>
                        <div className="text-xs px-2 py-1 rounded" style={{ 
                          backgroundColor: 'rgba(59, 130, 246, 0.15)', 
                          color: '#3b82f6' 
                        }}>
                          VHost
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {selectedDomain ? (
              <div className="space-y-6">
                {/* Domain Header */}
                <div className="rounded-xl border p-6" style={{ 
                  backgroundColor: 'var(--card-bg)', 
                  borderColor: 'var(--border-color)' 
                }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold" style={{ color: 'var(--primary-text)' }}>
                        {selectedDomain.domain}
                      </h2>
                      <p className="text-sm mt-1" style={{ color: 'var(--secondary-text)' }}>
                        Created: {new Date(selectedDomain.created_at).toLocaleDateString()}
                      </p>
                    </div>
                            <div className="flex items-center space-x-3">
                      <button
                                onClick={() => {
                          setEditingAccount(null);
                          setAccountForm({ username: '', password: '', quota: 1024 });
                          setShowAccountModal(true);
                        }}
                        className="px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
                        style={{ backgroundColor: 'var(--accent-color)', color: 'white' }}
                      >
                        <UserIcon className="w-4 h-4" />
                        <span>Add Account</span>
                      </button>
                              <button
                        onClick={() => setShowForwarderModal(true)}
                        className="px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
                        style={{ backgroundColor: 'var(--secondary-bg)', color: 'var(--primary-text)' }}
                              >
                        <ForwardIcon className="w-4 h-4" />
                        <span>Add Forwarder</span>
                      </button>
                    </div>
        </div>
      </div>

                {/* Tabs */}
                <div className="rounded-xl border" style={{ 
                  backgroundColor: 'var(--card-bg)', 
                  borderColor: 'var(--border-color)' 
                }}>
                  <div className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                    <div className="flex">
                      {[
                        { id: 'accounts', label: 'Email Accounts', count: selectedDomain.accounts?.length || 0 },
                        { id: 'forwarders', label: 'Forwarders', count: selectedDomain.forwarders?.length || 0 }
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`px-6 py-4 font-medium text-sm transition-colors ${
                            activeTab === tab.id ? 'border-b-2' : ''
                          }`}
                          style={{
                            color: activeTab === tab.id ? 'var(--accent-color)' : 'var(--secondary-text)',
                            borderColor: activeTab === tab.id ? 'var(--accent-color)' : 'transparent'
                          }}
                        >
                          {tab.label} ({tab.count})
                        </button>
                      ))}
            </div>
                </div>

                  <div className="p-6">
                    {activeTab === 'accounts' && (
                      <div>
                        {selectedDomain.accounts && selectedDomain.accounts.length > 0 ? (
                          <div className="space-y-4">
                            {selectedDomain.accounts.map((account) => {
                              const quotaInfo = formatQuotaUsage(account.used_quota || 0, account.quota);
                              return (
                                <div
                                  key={account.id}
                                  className="p-4 rounded-lg border"
                    style={{ 
                                    backgroundColor: 'var(--secondary-bg)', 
                                    borderColor: 'var(--border-color)' 
                                  }}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ 
                                        backgroundColor: 'rgba(59, 130, 246, 0.15)' 
                                      }}>
                                        <EnvelopeIcon className="w-5 h-5" style={{ color: '#3b82f6' }} />
              </div>
              <div>
                                        <h3 className="font-medium" style={{ color: 'var(--primary-text)' }}>
                                          {account.email}
                                        </h3>
                                        <div className="flex items-center space-x-2">
                                          <p className="text-sm" style={{ color: 'var(--secondary-text)' }}>
                                            Quota: {quotaInfo.used} MB / {quotaInfo.total} MB
                                          </p>
                                          <button
                                            onClick={() => handleRefreshQuota(account.id)}
                                            className="p-1 rounded transition-colors"
                                            style={{ color: 'var(--secondary-text)' }}
                                            title="Refresh quota usage"
                                          >
                                            <ArrowPathIcon className="w-3 h-3" />
                                          </button>
                </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                      <div className="w-24 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border-color)' }}>
                  <div 
                                          className="h-full transition-all"
                    style={{ 
                                            width: `${quotaInfo.percentage}%`, 
                                            backgroundColor: quotaInfo.color 
                    }}
                  />
                </div>
                                      <button
                                        onClick={() => {
                                          setEditingAccount(account);
                                          setAccountForm({
                                            username: account.username,
                                            password: '',
                                            quota: account.quota
                                          });
                                          setShowAccountModal(true);
                                        }}
                                        className="p-2 rounded transition-colors"
                                        style={{ color: 'var(--secondary-text)' }}
                                      >
                                        <PencilIcon className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteAccount(account.id)}
                                        className="p-2 rounded transition-colors"
                                        style={{ color: 'var(--secondary-text)' }}
                                      >
                                        <TrashIcon className="w-4 h-4" />
                                      </button>
          </div>

                                    <div className="flex items-center space-x-2 mt-3">
                                      <button
                                        onClick={() => {
                                          setSelectedAccount(account);
                                          setPasswordResetForm({ newPassword: '', confirmPassword: '' });
                                          setShowPasswordResetModal(true);
                                        }}
                                        className="px-3 py-1 rounded text-xs font-medium transition-colors flex items-center space-x-1"
                                        style={{ backgroundColor: 'rgba(251, 191, 36, 0.15)', color: '#f59e0b' }}
                                        title="Reset Password"
                                      >
                                        <KeyIcon className="w-3 h-3" />
                                        <span>Reset Password</span>
                                      </button>
                                      <button
                                        onClick={() => {
                                          setSelectedAccount(account);
                                          setQuotaForm({ quota: account.quota });
                                          setShowQuotaModal(true);
                                        }}
                                        className="px-3 py-1 rounded text-xs font-medium transition-colors flex items-center space-x-1"
                                        style={{ backgroundColor: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}
                                        title="Set Quota"
                                      >
                                        <CogIcon className="w-3 h-3" />
                                        <span>Set Quota</span>
                                      </button>
                                      <button
                                        onClick={() => handleRoundcubeAccess(account)}
                                        className="px-3 py-1 rounded text-xs font-medium transition-colors flex items-center space-x-1"
                                        style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }}
                                        title="Open Roundcube Webmail"
                                      >
                                        <ComputerDesktopIcon className="w-3 h-3" />
                                        <span>Webmail</span>
                                      </button>
            </div>
              </div>
              </div>
                              );
                            })}
              </div>
                        ) : (
                          <div className="text-center py-12">
                            <EnvelopeIcon className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--secondary-text)' }} />
                            <p className="text-sm" style={{ color: 'var(--secondary-text)' }}>
                              No email accounts yet
                            </p>
                            <button
                              onClick={() => setShowAccountModal(true)}
                              className="mt-2 text-sm underline"
                              style={{ color: 'var(--accent-color)' }}
                            >
                              Create your first account
                            </button>
              </div>
                        )}
            </div>
                    )}

                    {activeTab === 'forwarders' && (
                      <div>
                        {selectedDomain.forwarders && selectedDomain.forwarders.length > 0 ? (
                          <div className="space-y-4">
                            {selectedDomain.forwarders.map((forwarder) => (
                              <div
                                key={forwarder.id}
                                className="p-4 rounded-lg border"
                                style={{ 
                                  backgroundColor: 'var(--secondary-bg)', 
                                  borderColor: 'var(--border-color)' 
                                }}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ 
                                      backgroundColor: 'rgba(34, 197, 94, 0.15)' 
                                    }}>
                                      <ForwardIcon className="w-5 h-5" style={{ color: '#22c55e' }} />
                                    </div>
                                    <div>
                                      <h3 className="font-medium" style={{ color: 'var(--primary-text)' }}>
                                        {forwarder.source}@{selectedDomain.domain}
                                      </h3>
                                      <p className="text-sm" style={{ color: 'var(--secondary-text)' }}>
                                        → {forwarder.destination}
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteForwarder(forwarder.id)}
                                    className="p-2 rounded transition-colors"
                                    style={{ color: 'var(--secondary-text)' }}
                                  >
                                    <TrashIcon className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-12">
                            <ForwardIcon className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--secondary-text)' }} />
                            <p className="text-sm" style={{ color: 'var(--secondary-text)' }}>
                              No email forwarders yet
                            </p>
                            <button
                              onClick={() => setShowForwarderModal(true)}
                              className="mt-2 text-sm underline"
                              style={{ color: 'var(--accent-color)' }}
                            >
                              Create your first forwarder
                            </button>
            </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border p-12 text-center" style={{ 
                backgroundColor: 'var(--card-bg)', 
                borderColor: 'var(--border-color)' 
              }}>
                <GlobeAltIcon className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--secondary-text)' }} />
                <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--primary-text)' }}>
                  No Virtual Host Selected
                </h3>
                <p className="text-sm mb-4" style={{ color: 'var(--secondary-text)' }}>
                  Select a Virtual Host from the sidebar to manage its email accounts and forwarders
                </p>
              </div>
            )}
          </div>
          </div>
        </div>

      {/* Account Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          <div 
            className="fixed inset-0 transition-opacity"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            onClick={() => setShowAccountModal(false)}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div 
              className="relative w-full max-w-md transform rounded-xl shadow-2xl transition-all"
              style={{ backgroundColor: 'var(--card-bg)' }}
            >
              <div className="p-6">
                <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--primary-text)' }}>
                  {editingAccount ? 'Edit Email Account' : 'Add Email Account'}
                </h3>
                <form onSubmit={handleCreateAccount}>
                  <div className="space-y-4">
                <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--primary-text)' }}>
                        Username
                </label>
                      <div className="flex">
                <input
                          type="text"
                          value={accountForm.username}
                          onChange={(e) => setAccountForm(prev => ({ ...prev, username: e.target.value }))}
                          placeholder="user"
                          className="flex-1 px-3 py-2 rounded-l-lg border-r-0 border"
                          style={{ 
                            backgroundColor: 'var(--input-bg)', 
                            borderColor: 'var(--border-color)',
                            color: 'var(--primary-text)'
                          }}
                          disabled={editingAccount}
                    required
                />
                        <div 
                          className="px-3 py-2 rounded-r-lg border flex items-center"
                          style={{ 
                            backgroundColor: 'var(--secondary-bg)', 
                            borderColor: 'var(--border-color)',
                            color: 'var(--secondary-text)'
                          }}
                        >
                          @{selectedDomain?.domain}
                        </div>
                      </div>
              </div>
              <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--primary-text)' }}>
                  Password
                </label>
                <input
                  type="password"
                        value={accountForm.password}
                        onChange={(e) => setAccountForm(prev => ({ ...prev, password: e.target.value }))}
                        placeholder={editingAccount ? "Leave blank to keep current password" : "••••••••"}
                        className="w-full px-3 py-2 rounded-lg border"
                        style={{ 
                          backgroundColor: 'var(--input-bg)', 
                          borderColor: 'var(--border-color)',
                          color: 'var(--primary-text)'
                        }}
                    required={!editingAccount}
                />
              </div>
              <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--primary-text)' }}>
                    Quota (MB)
                </label>
                  <input
                    type="number"
                        value={accountForm.quota}
                        onChange={(e) => setAccountForm(prev => ({ ...prev, quota: parseInt(e.target.value) }))}
                    min="100"
                        max="10240"
                        className="w-full px-3 py-2 rounded-lg border"
                        style={{ 
                          backgroundColor: 'var(--input-bg)', 
                          borderColor: 'var(--border-color)',
                          color: 'var(--primary-text)'
                        }}
                    required
                  />
              </div>
                  </div>
                  <div className="flex items-center justify-end space-x-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowAccountModal(false)}
                      className="px-4 py-2 rounded-lg font-medium transition-colors"
                      style={{ backgroundColor: 'var(--secondary-bg)', color: 'var(--primary-text)' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg font-medium transition-colors"
                      style={{ backgroundColor: 'var(--accent-color)', color: 'white' }}
                    >
                      {editingAccount ? 'Update Account' : 'Create Account'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Forwarder Modal */}
      {showForwarderModal && (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          <div 
            className="fixed inset-0 transition-opacity"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            onClick={() => setShowForwarderModal(false)}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div 
              className="relative w-full max-w-md transform rounded-xl shadow-2xl transition-all"
              style={{ backgroundColor: 'var(--card-bg)' }}
            >
              <div className="p-6">
                <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--primary-text)' }}>
                  Add Email Forwarder
                </h3>
                <form onSubmit={handleCreateForwarder}>
                  <div className="space-y-4">
              <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--primary-text)' }}>
                        Source Address
                </label>
                      <div className="flex">
                <input
                          type="text"
                          value={forwarderForm.source}
                          onChange={(e) => setForwarderForm(prev => ({ ...prev, source: e.target.value }))}
                          placeholder="info"
                          className="flex-1 px-3 py-2 rounded-l-lg border-r-0 border"
                          style={{ 
                            backgroundColor: 'var(--input-bg)', 
                            borderColor: 'var(--border-color)',
                            color: 'var(--primary-text)'
                          }}
                          required
                        />
                        <div 
                          className="px-3 py-2 rounded-r-lg border flex items-center"
                          style={{ 
                            backgroundColor: 'var(--secondary-bg)', 
                            borderColor: 'var(--border-color)',
                            color: 'var(--secondary-text)'
                          }}
                        >
                          @{selectedDomain?.domain}
                </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--primary-text)' }}>
                        Destination Email
                      </label>
                  <input
                        type="email"
                        value={forwarderForm.destination}
                        onChange={(e) => setForwarderForm(prev => ({ ...prev, destination: e.target.value }))}
                        placeholder="user@example.com"
                        className="w-full px-3 py-2 rounded-lg border"
                        style={{ 
                          backgroundColor: 'var(--input-bg)', 
                          borderColor: 'var(--border-color)',
                          color: 'var(--primary-text)'
                        }}
                        required
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-end space-x-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowForwarderModal(false)}
                      className="px-4 py-2 rounded-lg font-medium transition-colors"
                      style={{ backgroundColor: 'var(--secondary-bg)', color: 'var(--primary-text)' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg font-medium transition-colors"
                      style={{ backgroundColor: 'var(--accent-color)', color: 'white' }}
                    >
                      Create Forwarder
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {showPasswordResetModal && (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          <div 
            className="fixed inset-0 transition-opacity"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            onClick={() => setShowPasswordResetModal(false)}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div 
              className="relative w-full max-w-md transform rounded-xl shadow-2xl transition-all"
              style={{ backgroundColor: 'var(--card-bg)' }}
            >
              <div className="p-6">
                <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--primary-text)' }}>
                  Reset Password
                </h3>
                <p className="text-sm mb-4" style={{ color: 'var(--secondary-text)' }}>
                  Reset password for: <strong>{selectedAccount?.email}</strong>
                </p>
                <form onSubmit={handlePasswordReset}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--primary-text)' }}>
                        New Password
                  </label>
                      <input
                        type="password"
                        value={passwordResetForm.newPassword}
                        onChange={(e) => setPasswordResetForm(prev => ({ ...prev, newPassword: e.target.value }))}
                        placeholder="Enter new password"
                        className="w-full px-3 py-2 rounded-lg border"
                        style={{ 
                          backgroundColor: 'var(--input-bg)', 
                          borderColor: 'var(--border-color)',
                          color: 'var(--primary-text)'
                        }}
                        required
                        minLength="6"
                      />
                </div>
                  <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--primary-text)' }}>
                        Confirm Password
                    </label>
                      <input
                        type="password"
                        value={passwordResetForm.confirmPassword}
                        onChange={(e) => setPasswordResetForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        placeholder="Confirm new password"
                        className="w-full px-3 py-2 rounded-lg border"
                        style={{ 
                          backgroundColor: 'var(--input-bg)', 
                          borderColor: 'var(--border-color)',
                          color: 'var(--primary-text)'
                        }}
                      required
                        minLength="6"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-end space-x-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowPasswordResetModal(false)}
                      className="px-4 py-2 rounded-lg font-medium transition-colors"
                      style={{ backgroundColor: 'var(--secondary-bg)', color: 'var(--primary-text)' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg font-medium transition-colors"
                      style={{ backgroundColor: '#f59e0b', color: 'white' }}
                    >
                      Reset Password
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
              </div>
                )}

      {/* Quota Management Modal */}
      {showQuotaModal && (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          <div 
            className="fixed inset-0 transition-opacity"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            onClick={() => setShowQuotaModal(false)}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div 
              className="relative w-full max-w-md transform rounded-xl shadow-2xl transition-all"
              style={{ backgroundColor: 'var(--card-bg)' }}
            >
              <div className="p-6">
                <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--primary-text)' }}>
                  Set Quota
                </h3>
                <p className="text-sm mb-4" style={{ color: 'var(--secondary-text)' }}>
                  Set quota for: <strong>{selectedAccount?.email}</strong>
                </p>
                <form onSubmit={handleQuotaUpdate}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--primary-text)' }}>
                        Quota (MB)
                      </label>
                      <input
                        type="number"
                        value={quotaForm.quota}
                        onChange={(e) => setQuotaForm(prev => ({ ...prev, quota: parseInt(e.target.value) }))}
                        min="100"
                        max="10240"
                        step="100"
                        className="w-full px-3 py-2 rounded-lg border"
                        style={{ 
                          backgroundColor: 'var(--input-bg)', 
                          borderColor: 'var(--border-color)',
                          color: 'var(--primary-text)'
                        }}
                        required
                      />
                      <p className="text-xs mt-1" style={{ color: 'var(--secondary-text)' }}>
                        Current quota: {selectedAccount?.quota} MB
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                      <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--primary-text)' }}>
                        Recommended Quotas:
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => setQuotaForm({ quota: 512 })}
                          className="p-2 rounded text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                          style={{ color: 'var(--secondary-text)' }}
                        >
                          512 MB - Basic
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuotaForm({ quota: 1024 })}
                          className="p-2 rounded text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                          style={{ color: 'var(--secondary-text)' }}
                        >
                          1 GB - Standard
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuotaForm({ quota: 2048 })}
                          className="p-2 rounded text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                          style={{ color: 'var(--secondary-text)' }}
                        >
                          2 GB - Professional
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuotaForm({ quota: 5120 })}
                          className="p-2 rounded text-left hover:bg-gray-100 dark:hover:bg-gray-700"
                          style={{ color: 'var(--secondary-text)' }}
                        >
                          5 GB - Enterprise
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-end space-x-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowQuotaModal(false)}
                      className="px-4 py-2 rounded-lg font-medium transition-colors"
                      style={{ backgroundColor: 'var(--secondary-bg)', color: 'var(--primary-text)' }}
                >
                  Cancel
                    </button>
                    <button
                    type="submit"
                      className="px-4 py-2 rounded-lg font-medium transition-colors"
                      style={{ backgroundColor: '#a855f7', color: 'white' }}
                  >
                      Update Quota
                    </button>
              </div>
            </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailSettings; 
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  PlusIcon, 
  TrashIcon, 
  MailIcon, 
  KeyIcon,
  CogIcon,
  ExternalLinkIcon,
  UserIcon,
  DatabaseIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/outline';

interface VirtualHost {
  id: number;
  domain: string;
  linux_username: string;
  status: string;
}

interface EmailAccount {
  id: number;
  domain_id: number;
  username: string;
  email: string;
  quota: number;
  used_quota: number;
  status: string;
  created_at: string;
  updated_at: string;
}

interface EmailDomain {
  id: number;
  domain: string;
  virtual_host_id: number;
  linux_username: string;
  status: string;
  accounts: EmailAccount[];
}

const EmailManager: React.FC = () => {
  const [virtualHosts, setVirtualHosts] = useState<VirtualHost[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string>('');
  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal states
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<EmailAccount | null>(null);

  // Form states
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newQuota, setNewQuota] = useState(1024);
  const [resetPassword, setResetPassword] = useState('');
  const [quotaValue, setQuotaValue] = useState(1024);

  useEffect(() => {
    fetchVirtualHosts();
  }, []);

  useEffect(() => {
    if (selectedDomain) {
      fetchEmailAccounts();
    }
  }, [selectedDomain]);

  const fetchVirtualHosts = async () => {
    try {
      const response = await axios.get('/api/virtual-hosts');
      setVirtualHosts(response.data);
      if (response.data.length > 0) {
        setSelectedDomain(response.data[0].domain);
      }
      setLoading(false);
    } catch (err) {
      setError('Unable to load domain list.');
      setLoading(false);
    }
  };

  const fetchEmailAccounts = async () => {
    if (!selectedDomain) return;
    
    try {
      const response = await axios.get('/api/email/domains');
      const domain = response.data.find((d: EmailDomain) => d.domain === selectedDomain);
      if (domain) {
        setEmailAccounts(domain.accounts || []);
      } else {
        setEmailAccounts([]);
      }
    } catch (err) {
      setError('Unable to load email list.');
    }
  };

  const createEmailAccount = async () => {
    if (!selectedDomain) return;
    
    try {
      const virtualHost = virtualHosts.find(vh => vh.domain === selectedDomain);
      if (!virtualHost) return;

      await axios.post(`/api/email/domains/${virtualHost.id}/accounts`, {
        username: newUsername,
        password: newPassword,
        quota: newQuota
      });

      setShowAddAccountModal(false);
      setNewUsername('');
      setNewPassword('');
      setNewQuota(1024);
      setSuccess('Email account created successfully.');
      fetchEmailAccounts();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Unable to create email account.');
    }
  };

  const updatePassword = async () => {
    if (!selectedAccount) return;
    
    try {
      await axios.put(`/api/email/accounts/${selectedAccount.id}`, {
        password: resetPassword
      });

      setShowResetPasswordModal(false);
      setResetPassword('');
      setSelectedAccount(null);
      setSuccess('Password changed successfully.');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Unable to change password.');
    }
  };

  const updateQuota = async () => {
    if (!selectedAccount) return;
    
    try {
      await axios.put(`/api/email/accounts/${selectedAccount.id}`, {
        quota: quotaValue
      });

      setShowQuotaModal(false);
      setQuotaValue(1024);
      setSelectedAccount(null);
      setSuccess('Quota updated successfully.');
      fetchEmailAccounts();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Unable to update quota.');
    }
  };

  const deleteAccount = async (accountId: number) => {
    if (!window.confirm('Are you sure you want to delete this email account?')) return;

    try {
      await axios.delete(`/api/email/accounts/${accountId}`);
      setSuccess('Email account deleted successfully.');
      fetchEmailAccounts();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Unable to delete email account.');
    }
  };

  const openRoundcube = async (email = null) => {
    try {
      // Get the proper Roundcube URL from backend
      const params = new URLSearchParams();
      if (email) params.append('email', email);
      if (selectedDomain) params.append('domain', selectedDomain);
      
      const response = await axios.get(`/api/roundcube/webmail-url?${params.toString()}`);
      
      if (response.data.success) {
        const url = Array.isArray(response.data.data.url) 
          ? response.data.data.url[0] 
          : response.data.data.url;
        window.open(url, '_blank');
      } else {
        // Fallback to default webmail URL
        window.open('/roundcube', '_blank');
      }
    } catch (error) {
      console.error('Error getting webmail URL:', error);
      // Fallback to default webmail URL
      window.open('/roundcube', '_blank');
    }
  };

  const formatQuota = (used: number, total: number) => {
    const usedMB = (used / 1024 / 1024).toFixed(2);
    const percentage = total > 0 ? (used / (total * 1024 * 1024)) * 100 : 0;
    return `${usedMB} MB / ${total} MB (${percentage.toFixed(1)}%)`;
  };

  const getQuotaColor = (used: number, total: number) => {
    const percentage = total > 0 ? (used / (total * 1024 * 1024)) * 100 : 0;
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Manage Email</h1>
        <button
          onClick={openRoundcube}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
        >
          <ExternalLinkIcon className="w-5 h-5 mr-2" />
          Open Roundcube Webmail
        </button>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
          <XCircleIcon className="w-5 h-5 mr-2" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
            ×
          </button>
        </div>
      )}

      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
          <CheckCircleIcon className="w-5 h-5 mr-2" />
          {success}
          <button onClick={() => setSuccess(null)} className="ml-auto text-green-500 hover:text-green-700">
            ×
          </button>
        </div>
      )}

      {/* Domain Selection */}
      <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Domain
        </label>
        <select
          value={selectedDomain}
          onChange={(e) => setSelectedDomain(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">-- Select Domain --</option>
          {virtualHosts.map((vh) => (
            <option key={vh.id} value={vh.domain}>
              {vh.domain}
            </option>
          ))}
        </select>
      </div>

      {selectedDomain && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Domain Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{selectedDomain}</h2>
                <p className="text-sm text-gray-500">
                  All email accounts under domain {selectedDomain}
                </p>
              </div>
              <button
                onClick={() => setShowAddAccountModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                Add Email Account
              </button>
            </div>
          </div>

          {/* Email Accounts List */}
          <div className="p-6">
            {emailAccounts.length === 0 ? (
              <div className="text-center py-12">
                <MailIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Email Accounts</h3>
                <p className="text-gray-500 mb-4">Start by creating your first email account</p>
                <button
                  onClick={() => setShowAddAccountModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center mx-auto transition-colors"
                >
                  <PlusIcon className="w-5 h-5 mr-2" />
                  Add Email Account
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {emailAccounts.map((account) => (
                  <div key={account.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <UserIcon className="w-5 h-5 text-gray-400 mr-2" />
                          <h3 className="text-lg font-medium text-gray-900">{account.email}</h3>
                          <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                            account.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {account.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="flex items-center text-sm text-gray-500 mb-2">
                          <DatabaseIcon className="w-4 h-4 mr-2" />
                          <span className={getQuotaColor(account.used_quota, account.quota)}>
                            Quota: {formatQuota(account.used_quota, account.quota)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500">
                          Created: {new Date(account.created_at).toLocaleDateString('en-US')}
                        </div>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => {
                            setSelectedAccount(account);
                            setResetPassword('');
                            setShowResetPasswordModal(true);
                          }}
                          className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-3 py-2 rounded-lg flex items-center transition-colors"
                          title="Reset Password"
                        >
                          <KeyIcon className="w-4 h-4 mr-1" />
                          Reset Password
                        </button>
                        <button
                          onClick={() => {
                            setSelectedAccount(account);
                            setQuotaValue(account.quota);
                            setShowQuotaModal(true);
                          }}
                          className="bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 py-2 rounded-lg flex items-center transition-colors"
                          title="Set Quota"
                        >
                          <CogIcon className="w-4 h-4 mr-1" />
                          Set Quota
                        </button>
                        <button
                          onClick={() => openRoundcube(account.email)}
                          className="bg-green-100 hover:bg-green-200 text-green-800 px-3 py-2 rounded-lg flex items-center transition-colors"
                          title="Open Webmail"
                        >
                          <ExternalLinkIcon className="w-4 h-4 mr-1" />
                          Webmail
                        </button>
                        <button
                          onClick={() => deleteAccount(account.id)}
                          className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-2 rounded-lg flex items-center transition-colors"
                          title="Delete Account"
                        >
                          <TrashIcon className="w-4 h-4 mr-1" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Account Modal */}
      {showAddAccountModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
          <div className="bg-white p-6 rounded-lg w-96 max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4">Add Email Account</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username
                </label>
                <div className="flex items-center">
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="username"
                    className="flex-1 p-3 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <span className="bg-gray-100 px-3 py-3 border-t border-b border-r border-gray-300 rounded-r-lg text-gray-600">
                    @{selectedDomain}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quota (MB)
                </label>
                <input
                  type="number"
                  value={newQuota}
                  onChange={(e) => setNewQuota(parseInt(e.target.value))}
                  min="1"
                  max="10240"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAddAccountModal(false);
                  setNewUsername('');
                  setNewPassword('');
                  setNewQuota(1024);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createEmailAccount}
                disabled={!newUsername || !newPassword}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Create Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && selectedAccount && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
          <div className="bg-white p-6 rounded-lg w-96 max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4">Reset Password</h2>
            <p className="text-gray-600 mb-4">
              Reset password for: <strong>{selectedAccount.email}</strong>
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <input
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="New Password"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowResetPasswordModal(false);
                  setSelectedAccount(null);
                  setResetPassword('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={updatePassword}
                disabled={!resetPassword}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Reset Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quota Modal */}
      {showQuotaModal && selectedAccount && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
          <div className="bg-white p-6 rounded-lg w-96 max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4">Set Quota</h2>
            <p className="text-gray-600 mb-4">
              Set quota for: <strong>{selectedAccount.email}</strong>
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quota (MB)
              </label>
              <input
                type="number"
                value={quotaValue}
                onChange={(e) => setQuotaValue(parseInt(e.target.value))}
                min="1"
                max="10240"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-sm text-gray-500 mt-2">
                Currently using: {formatQuota(selectedAccount.used_quota, selectedAccount.quota)}
              </p>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowQuotaModal(false);
                  setSelectedAccount(null);
                  setQuotaValue(1024);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={updateQuota}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Update Quota
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailManager;
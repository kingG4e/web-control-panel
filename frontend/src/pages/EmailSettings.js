import React, { useState } from 'react';
import PageLayout from '../components/layout/PageLayout';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { useData } from '../contexts/DataContext';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EnvelopeIcon,
  ArrowPathIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  ArrowPathRoundedSquareIcon,
} from '@heroicons/react/24/outline';

const EmailSettings = () => {
  const data = useData();
  const emailAccounts = data?.emailAccounts || [];

  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    quota: 1000,
    forwards_to: '',
    auto_reply: false,
    auto_reply_message: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    // TODO: Implement save logic
    setShowForm(false);
    setEditingAccount(null);
  };

  const actions = (
    <>
      <Button
        variant="outline"
        size="sm"
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
        }
      >
        Filter
      </Button>
      <Button
        variant="primary"
        size="sm"
        onClick={() => {
          setEditingAccount(null);
          setFormData({
            email: '',
            password: '',
            quota: 1000,
            forwards_to: '',
            auto_reply: false,
            auto_reply_message: '',
          });
          setShowForm(true);
        }}
        icon={<PlusIcon className="w-4 h-4" />}
      >
        Create Email Account
      </Button>
    </>
  );

  return (
    <PageLayout
      title="Email Settings"
      description="Manage email accounts and configurations"
      actions={actions}
    >
      <div className="space-y-6">
        {/* Top Actions Bar */}
        <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg overflow-hidden">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                variant="secondary"
                size="sm"
                icon={<DocumentTextIcon className="w-4 h-4" />}
              >
                View Logs
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={<Cog6ToothIcon className="w-4 h-4" />}
              >
                Settings
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={<ShieldCheckIcon className="w-4 h-4" />}
              >
                Security
              </Button>
            </div>
            <Button
              variant="primary"
              size="sm"
              icon={<PlusIcon className="w-4 h-4" />}
              onClick={() => {
                setEditingAccount(null);
                setFormData({
                  email: '',
                  password: '',
                  quota: 1000,
                  forwards_to: '',
                  auto_reply: false,
                  auto_reply_message: '',
                });
                setShowForm(true);
              }}
            >
              Create Email Account
            </Button>
          </div>
        </div>

        {/* Email Accounts */}
        {Array.isArray(emailAccounts) && emailAccounts.length > 0 ? (
          emailAccounts.map((domain) => (
            <Card key={domain.id}>
              <div className="flex items-center justify-between mb-6">
    <div>
                  <h3 className="text-lg font-medium text-[var(--primary-text)]">{domain.domain}</h3>
                  <p className="text-sm text-[var(--secondary-text)]">
                    {Array.isArray(domain.accounts) ? domain.accounts.length : 0} accounts
          </p>
        </div>
      </div>

              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-[var(--table-header-bg)] border-y border-[var(--border-color)]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--secondary-text)] uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--secondary-text)] uppercase tracking-wider">Quota</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--secondary-text)] uppercase tracking-wider">Forwards To</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--secondary-text)] uppercase tracking-wider">Auto Reply</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--secondary-text)] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
                  <tbody className="bg-[var(--card-bg)] divide-y divide-[var(--border-color)]">
                    {Array.isArray(domain.accounts) && domain.accounts.length > 0 ? (
                      domain.accounts.map((account) => (
                        <tr key={account.id} className="hover:bg-[var(--hover-bg)] transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <EnvelopeIcon className="w-5 h-5 text-[var(--accent-color)] mr-3" />
                              <span className="text-sm text-[var(--primary-text)]">{account.email}</span>
                    </div>
                  </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-[var(--primary-text)]">{account.quota} MB</span>
                              <div className="w-24 h-2 bg-[var(--border-color)] rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-[var(--accent-color)]"
                                  style={{ width: `${(account.used / account.quota) * 100}%` }}
                                />
                              </div>
                            </div>
                  </td>
                          <td className="px-6 py-4 text-sm text-[var(--primary-text)]">
                            {account.forwards_to || '-'}
                  </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              account.auto_reply
                                ? 'bg-[var(--success-color)]/10 text-[var(--success-color)]'
                                : 'bg-[var(--border-color)] text-[var(--secondary-text)]'
                            }`}>
                              {account.auto_reply ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                      <button
                                onClick={() => {
                                  setEditingAccount(account);
                                  setFormData({
                                    ...account,
                                    password: '',
                                  });
                                  setShowForm(true);
                                }}
                                className="text-[var(--secondary-text)] hover:text-[var(--accent-color)] transition-colors"
                      >
                                <PencilIcon className="w-5 h-5" />
                      </button>
                              <button
                                onClick={() => {}}
                                className="text-[var(--danger-color)] hover:text-[var(--danger-color)]/80 transition-colors"
                              >
                                <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="px-6 py-8 text-center text-[var(--secondary-text)]">
                          No email accounts found for this domain. Click "Create Email Account" to add one.
                        </td>
                      </tr>
                    )}
            </tbody>
          </table>
        </div>
            </Card>
          ))
        ) : (
          <div className="text-center py-8 text-[var(--secondary-text)]">
            No domains found. Add a domain first to create email accounts.
      </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Email Usage */}
          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-[var(--primary-text)]">Email Usage</h3>
              <Button
                variant="ghost"
                size="sm"
                icon={<ArrowPathIcon className="w-4 h-4" />}
              >
                Refresh
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-[var(--secondary-text)]">Storage Used</span>
                  <span className="text-[var(--primary-text)]">
                    {(() => {
                      if (!Array.isArray(emailAccounts)) return '0.0 GB / 10 GB';
                      const totalUsed = emailAccounts.reduce((total, domain) => {
                        if (!Array.isArray(domain.accounts)) return total;
                        return total + domain.accounts.reduce((acc, account) => acc + (account.used || 0), 0);
                      }, 0);
                      return `${(totalUsed / 1024).toFixed(1)} GB / 10 GB`;
                    })()}
                  </span>
                </div>
                <div className="h-2 bg-[var(--border-color)] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[var(--accent-color)] rounded-full" 
                    style={{ 
                      width: (() => {
                        if (!Array.isArray(emailAccounts)) return '0%';
                        const totalUsed = emailAccounts.reduce((total, domain) => {
                          if (!Array.isArray(domain.accounts)) return total;
                          return total + domain.accounts.reduce((acc, account) => acc + (account.used || 0), 0);
                        }, 0);
                        return `${(totalUsed / (10 * 1024)) * 100}%`;
                      })()
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-[var(--secondary-text)]">Active Accounts</span>
                  <span className="text-[var(--primary-text)]">
                    {(() => {
                      if (!Array.isArray(emailAccounts)) return '0 / 50';
                      const totalAccounts = emailAccounts.reduce((total, domain) => {
                        if (!Array.isArray(domain.accounts)) return total;
                        return total + domain.accounts.length;
                      }, 0);
                      return `${totalAccounts} / 50`;
                    })()}
                  </span>
                </div>
                <div className="h-2 bg-[var(--border-color)] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[var(--accent-color)] rounded-full" 
                    style={{ 
                      width: (() => {
                        if (!Array.isArray(emailAccounts)) return '0%';
                        const totalAccounts = emailAccounts.reduce((total, domain) => {
                          if (!Array.isArray(domain.accounts)) return total;
                          return total + domain.accounts.length;
                        }, 0);
                        return `${(totalAccounts / 50) * 100}%`;
                      })()
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Email Stats */}
          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-[var(--primary-text)]">Email Stats</h3>
              <Button
                variant="ghost"
                size="sm"
                icon={<ArrowPathIcon className="w-4 h-4" />}
              >
                Refresh
              </Button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--secondary-text)]">Total Domains</span>
                <span className="text-[var(--primary-text)]">
                  {Array.isArray(emailAccounts) ? emailAccounts.length : 0}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--secondary-text)]">Total Accounts</span>
                <span className="text-[var(--primary-text)]">
                  {Array.isArray(emailAccounts) ? emailAccounts.reduce((total, domain) => 
                    total + (Array.isArray(domain.accounts) ? domain.accounts.length : 0)
                  , 0) : 0}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--secondary-text)]">Auto-Reply Enabled</span>
                <span className="text-[var(--primary-text)]">
                  {(() => {
                    if (!Array.isArray(emailAccounts)) return '0';
                    return emailAccounts.reduce((total, domain) => {
                      if (!Array.isArray(domain.accounts)) return total;
                      return total + domain.accounts.filter(account => account.auto_reply).length;
                    }, 0);
                  })()}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--secondary-text)]">Forwarding Enabled</span>
                <span className="text-[var(--primary-text)]">
                  {(() => {
                    if (!Array.isArray(emailAccounts)) return '0';
                    return emailAccounts.reduce((total, domain) => {
                      if (!Array.isArray(domain.accounts)) return total;
                      return total + domain.accounts.filter(account => account.forwards_to).length;
                    }, 0);
                  })()}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg p-6">
            <h3 className="text-lg font-medium text-[var(--primary-text)] mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="secondary"
                size="sm"
                icon={<ArrowPathRoundedSquareIcon className="w-4 h-4" />}
                className="justify-start"
              >
                Sync All
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={<DocumentTextIcon className="w-4 h-4" />}
                className="justify-start"
              >
                View Logs
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={<ShieldCheckIcon className="w-4 h-4" />}
                className="justify-start"
              >
                Security
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={<Cog6ToothIcon className="w-4 h-4" />}
                className="justify-start"
              >
                Settings
              </Button>
            </div>
          </div>
        </div>

        {/* Email Account Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm z-50">
            <div className="bg-[var(--card-bg)] p-6 rounded-xl border border-[var(--border-color)] w-full max-w-md">
              <h2 className="text-xl font-bold text-[var(--primary-text)] mb-6">
                {editingAccount ? 'Edit Email Account' : 'Create Email Account'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input-field"
                    placeholder="user@example.com"
                    required
                />
              </div>
              <div>
                  <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">
                  Password
                </label>
                <input
                  type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="input-field"
                    placeholder={editingAccount ? 'Leave blank to keep current password' : 'Enter password'}
                    required={!editingAccount}
                />
              </div>
              <div>
                  <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">
                    Quota (MB)
                </label>
                  <input
                    type="number"
                    value={formData.quota}
                    onChange={(e) => setFormData({ ...formData, quota: parseInt(e.target.value) })}
                    className="input-field"
                    min="100"
                    max="10000"
                    step="100"
                    required
                  />
              </div>
              <div>
                  <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">
                    Forward To
                </label>
                <input
                  type="email"
                    value={formData.forwards_to}
                    onChange={(e) => setFormData({ ...formData, forwards_to: e.target.value })}
                    className="input-field"
                    placeholder="forward@example.com"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="auto_reply"
                    checked={formData.auto_reply}
                    onChange={(e) => setFormData({ ...formData, auto_reply: e.target.checked })}
                    className="rounded border-[var(--border-color)] text-[var(--accent-color)] focus:ring-[var(--accent-color)]"
                  />
                  <label htmlFor="auto_reply" className="ml-2 text-sm text-[var(--secondary-text)]">
                    Enable Auto-Reply
                  </label>
                </div>
                {formData.auto_reply && (
                  <div>
                    <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">
                      Auto-Reply Message
                    </label>
                    <textarea
                      value={formData.auto_reply_message}
                      onChange={(e) => setFormData({ ...formData, auto_reply_message: e.target.value })}
                      className="input-field"
                      rows={4}
                      placeholder="Thank you for your email. I am currently out of office..."
                      required
                />
              </div>
                )}
                <div className="flex justify-end space-x-3 mt-6">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setShowForm(false);
                      setEditingAccount(null);
                    }}
                >
                  Cancel
                  </Button>
                  <Button
                    variant="primary"
                    type="submit"
                  >
                    {editingAccount ? 'Save Changes' : 'Create Account'}
                  </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </PageLayout>
  );
};

export default EmailSettings; 
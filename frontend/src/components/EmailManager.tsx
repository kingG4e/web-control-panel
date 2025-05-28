import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PlusIcon, TrashIcon, MailIcon, ForwardIcon } from '@heroicons/react/outline';

interface EmailDomain {
  id: number;
  domain: string;
  status: string;
  created_at: string;
  updated_at: string;
  accounts: EmailAccount[];
  forwarders: EmailForwarder[];
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

interface EmailForwarder {
  id: number;
  domain_id: number;
  source: string;
  destination: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface EmailAlias {
  id: number;
  account_id: number;
  alias: string;
  status: string;
  created_at: string;
  updated_at: string;
}

const EmailManager: React.FC = () => {
  const [domains, setDomains] = useState<EmailDomain[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<EmailDomain | null>(null);
  const [showDomainModal, setShowDomainModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showForwarderModal, setShowForwarderModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [newDomain, setNewDomain] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newQuota, setNewQuota] = useState(1024);
  const [newSource, setNewSource] = useState('');
  const [newDestination, setNewDestination] = useState('');

  useEffect(() => {
    fetchDomains();
  }, []);

  const fetchDomains = async () => {
    try {
      const response = await axios.get('/api/email/domains');
      setDomains(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch email domains');
      setLoading(false);
    }
  };

  const createDomain = async () => {
    try {
      await axios.post('/api/email/domains', { domain: newDomain });
      setShowDomainModal(false);
      setNewDomain('');
      fetchDomains();
    } catch (err) {
      setError('Failed to create email domain');
    }
  };

  const createAccount = async () => {
    if (!selectedDomain) return;

    try {
      await axios.post(`/api/email/domains/${selectedDomain.id}/accounts`, {
        username: newUsername,
        password: newPassword,
        quota: newQuota
      });
      setShowAccountModal(false);
      setNewUsername('');
      setNewPassword('');
      setNewQuota(1024);
      fetchDomains();
    } catch (err) {
      setError('Failed to create email account');
    }
  };

  const createForwarder = async () => {
    if (!selectedDomain) return;

    try {
      await axios.post(`/api/email/domains/${selectedDomain.id}/forwarders`, {
        source: newSource,
        destination: newDestination
      });
      setShowForwarderModal(false);
      setNewSource('');
      setNewDestination('');
      fetchDomains();
    } catch (err) {
      setError('Failed to create email forwarder');
    }
  };

  const deleteDomain = async (domainId: number) => {
    if (!window.confirm('Are you sure you want to delete this domain and all its accounts?')) return;

    try {
      await axios.delete(`/api/email/domains/${domainId}`);
      fetchDomains();
    } catch (err) {
      setError('Failed to delete email domain');
    }
  };

  const deleteAccount = async (accountId: number) => {
    if (!window.confirm('Are you sure you want to delete this email account?')) return;

    try {
      await axios.delete(`/api/email/accounts/${accountId}`);
      fetchDomains();
    } catch (err) {
      setError('Failed to delete email account');
    }
  };

  const deleteForwarder = async (forwarderId: number) => {
    if (!window.confirm('Are you sure you want to delete this email forwarder?')) return;

    try {
      await axios.delete(`/api/email/forwarders/${forwarderId}`);
      fetchDomains();
    } catch (err) {
      setError('Failed to delete email forwarder');
    }
  };

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Email Manager</h1>
        <button
          onClick={() => setShowDomainModal(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded-md flex items-center"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Add Domain
        </button>
      </div>

      {/* Domain List */}
      <div className="grid gap-4">
        {domains.map((domain) => (
          <div key={domain.id} className="border rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-semibold">{domain.domain}</h2>
                <p className="text-gray-500">
                  Status: {domain.status} | Created: {new Date(domain.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setSelectedDomain(domain);
                    setShowAccountModal(true);
                  }}
                  className="bg-green-500 text-white px-3 py-2 rounded-md flex items-center"
                >
                  <MailIcon className="w-5 h-5 mr-2" />
                  Add Account
                </button>
                <button
                  onClick={() => {
                    setSelectedDomain(domain);
                    setShowForwarderModal(true);
                  }}
                  className="bg-yellow-500 text-white px-3 py-2 rounded-md flex items-center"
                >
                  <ForwardIcon className="w-5 h-5 mr-2" />
                  Add Forwarder
                </button>
                <button
                  onClick={() => deleteDomain(domain.id)}
                  className="bg-red-500 text-white px-3 py-2 rounded-md flex items-center"
                >
                  <TrashIcon className="w-5 h-5 mr-2" />
                  Delete
                </button>
              </div>
            </div>

            {/* Email Accounts */}
            <div className="mb-4">
              <h3 className="font-semibold mb-2">Email Accounts</h3>
              <div className="grid gap-2">
                {domain.accounts.map((account) => (
                  <div key={account.id} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                    <div>
                      <p className="font-medium">{account.email}</p>
                      <p className="text-sm text-gray-500">
                        Quota: {account.used_quota.toFixed(2)} MB / {account.quota} MB
                      </p>
                    </div>
                    <button
                      onClick={() => deleteAccount(account.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Email Forwarders */}
            <div>
              <h3 className="font-semibold mb-2">Email Forwarders</h3>
              <div className="grid gap-2">
                {domain.forwarders.map((forwarder) => (
                  <div key={forwarder.id} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                    <div>
                      <p className="font-medium">{forwarder.source}@{domain.domain}</p>
                      <p className="text-sm text-gray-500">
                        Forwards to: {forwarder.destination}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteForwarder(forwarder.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Domain Modal */}
      {showDomainModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h2 className="text-xl font-bold mb-4">Add Email Domain</h2>
            <input
              type="text"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="Domain name (e.g., example.com)"
              className="w-full p-2 border rounded mb-4"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowDomainModal(false)}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>
              <button
                onClick={createDomain}
                className="px-4 py-2 bg-blue-500 text-white rounded"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Account Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h2 className="text-xl font-bold mb-4">Create Email Account</h2>
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="Username"
              className="w-full p-2 border rounded mb-4"
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Password"
              className="w-full p-2 border rounded mb-4"
            />
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Quota (MB)</label>
              <input
                type="number"
                value={newQuota}
                onChange={(e) => setNewQuota(parseInt(e.target.value))}
                min="1"
                className="w-full p-2 border rounded"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowAccountModal(false)}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>
              <button
                onClick={createAccount}
                className="px-4 py-2 bg-blue-500 text-white rounded"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Forwarder Modal */}
      {showForwarderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h2 className="text-xl font-bold mb-4">Create Email Forwarder</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Source</label>
              <div className="flex items-center">
                <input
                  type="text"
                  value={newSource}
                  onChange={(e) => setNewSource(e.target.value)}
                  placeholder="source"
                  className="flex-1 p-2 border rounded-l"
                />
                <span className="bg-gray-100 p-2 border-t border-b border-r rounded-r">
                  @{selectedDomain?.domain}
                </span>
              </div>
            </div>
            <input
              type="email"
              value={newDestination}
              onChange={(e) => setNewDestination(e.target.value)}
              placeholder="Destination email"
              className="w-full p-2 border rounded mb-4"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowForwarderModal(false)}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>
              <button
                onClick={createForwarder}
                className="px-4 py-2 bg-blue-500 text-white rounded"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailManager; 
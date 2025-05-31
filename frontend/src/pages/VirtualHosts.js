import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  GlobeAltIcon,
  ServerIcon,
  CodeBracketIcon,
} from '@heroicons/react/24/outline';

function VirtualHosts() {
  const {
    virtualHosts,
    addVirtualHost,
    updateVirtualHost,
    deleteVirtualHost
  } = useData();

  const [showForm, setShowForm] = useState(false);
  const [editingHost, setEditingHost] = useState(null);
  const [formData, setFormData] = useState({
    domain: '',
    document_root: '',
    server_admin: '',
    php_version: '8.2',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (editingHost) {
        updateVirtualHost(editingHost.id, formData);
      } else {
        addVirtualHost(formData);
      }

      setShowForm(false);
      setEditingHost(null);
      setFormData({
        domain: '',
        document_root: '',
        server_admin: '',
        php_version: '8.2',
      });
    } catch (err) {
      console.error('Failed to save virtual host:', err);
    }
  };

  const handleEdit = (host) => {
    setEditingHost(host);
    setFormData({
      domain: host.domain,
      document_root: host.document_root,
      server_admin: host.server_admin,
      php_version: host.php_version,
    });
    setShowForm(true);
  };

  const handleDelete = async (hostId) => {
    if (!window.confirm('Are you sure you want to delete this virtual host? This action cannot be undone.')) {
      return;
    }

      try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      deleteVirtualHost(hostId);
      } catch (err) {
      console.error('Failed to delete virtual host:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[var(--primary-text)] mb-2">Virtual Hosts</h1>
          <p className="text-[var(--secondary-text)]">Manage your virtual hosts and configurations</p>
        </div>
        <button
          onClick={() => {
            setEditingHost(null);
            setFormData({
              domain: '',
              document_root: '',
              server_admin: '',
              php_version: '8.2',
            });
            setShowForm(true);
          }}
          className="btn-primary flex items-center"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Add New Host
        </button>
      </div>

      {/* Virtual Hosts Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {virtualHosts.map((host) => (
          <div key={host.id} className="stats-card">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-[var(--accent-color)]/10 rounded-lg flex items-center justify-center">
                  <GlobeAltIcon className="w-6 h-6 stat-icon" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[var(--primary-text)]">{host.domain}</h3>
                  <p className="text-sm text-[var(--secondary-text)]">{host.document_root}</p>
                </div>
                  </div>
              <div className="flex space-x-2">
                    <button
                  onClick={() => handleEdit(host)}
                  className="p-2 text-[var(--secondary-text)] hover:text-[var(--accent-color)] hover:bg-[var(--hover-bg)] rounded-lg transition-colors"
                    >
                  <PencilIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(host.id)}
                  className="p-2 text-[var(--danger-color)] hover:text-[var(--danger-color)] hover:bg-[var(--hover-bg)] rounded-lg transition-colors"
                    >
                  <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center text-sm text-[var(--secondary-text)]">
                <ServerIcon className="w-5 h-5 mr-2" />
                <span>Admin: {host.server_admin}</span>
              </div>
              <div className="flex items-center text-sm text-[var(--secondary-text)]">
                <CodeBracketIcon className="w-5 h-5 mr-2" />
                <span>PHP: {host.php_version}</span>
              </div>
              <div className="flex items-center mt-4">
                <div className={`w-2 h-2 rounded-full ${
                  host.status === 'active' ? 'bg-[var(--success-color)]' : 'bg-[var(--border-color)]'
                }`} />
                <span className="ml-2 text-sm text-[var(--secondary-text)] capitalize">{host.status}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm z-50">
          <div className="card w-full max-w-md">
            <h2 className="text-xl font-bold text-[var(--primary-text)] mb-6">
              {editingHost ? 'Edit Virtual Host' : 'Add New Virtual Host'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">
                  Domain Name
                </label>
                <input
                  type="text"
                  value={formData.domain}
                  onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                  className="input-field"
                  placeholder="example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">
                  Document Root
                </label>
                <input
                  type="text"
                  value={formData.document_root}
                  onChange={(e) => setFormData({ ...formData, document_root: e.target.value })}
                  className="input-field"
                  placeholder="/var/www/example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">
                  Server Admin
                </label>
                <input
                  type="email"
                  value={formData.server_admin}
                  onChange={(e) => setFormData({ ...formData, server_admin: e.target.value })}
                  className="input-field"
                  placeholder="admin@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">
                  PHP Version
                </label>
                <select
                  value={formData.php_version}
                  onChange={(e) => setFormData({ ...formData, php_version: e.target.value })}
                  className="input-field"
                  required
                >
                  <option value="8.2">PHP 8.2</option>
                  <option value="8.1">PHP 8.1</option>
                  <option value="8.0">PHP 8.0</option>
                  <option value="7.4">PHP 7.4</option>
                </select>
              </div>
              <div className="flex justify-end space-x-4 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingHost(null);
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  {editingHost ? 'Save Changes' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default VirtualHosts; 
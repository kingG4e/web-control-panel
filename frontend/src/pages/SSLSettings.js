import React, { useState } from 'react';
import PageLayout from '../components/layout/PageLayout';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { useData } from '../contexts/DataContext';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ShieldCheckIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  ArrowDownTrayIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';

const SSLSettings = () => {
  const data = useData();
  const sslCertificates = data?.sslCertificates || [];
  const [showForm, setShowForm] = useState(false);
  const [editingCert, setEditingCert] = useState(null);
  const [formData, setFormData] = useState({
    domain: '',
    type: 'lets_encrypt',
    auto_renew: true,
  });

  // Calculate stats
  const validCertificates = sslCertificates.filter(cert => cert.status === 'valid').length;
  const autoRenewEnabled = sslCertificates.filter(cert => cert.auto_renew).length;
  const totalCertificates = sslCertificates.length;
  const expiringSoonCerts = sslCertificates.filter(cert => cert.status === 'expiring_soon');

  const handleSubmit = async (e) => {
    e.preventDefault();
    // TODO: Implement save logic
    setShowForm(false);
    setEditingCert(null);
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
          setEditingCert(null);
          setFormData({
            domain: '',
            type: 'lets_encrypt',
            auto_renew: true,
          });
          setShowForm(true);
        }}
        icon={<PlusIcon className="w-4 h-4" />}
      >
        Add Certificate
      </Button>
    </>
  );

  return (
    <PageLayout
      title="SSL Certificates"
      description="Manage SSL certificates for your domains"
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
                icon={<DocumentDuplicateIcon className="w-4 h-4" />}
              >
                Import
              </Button>
            </div>
            <Button
              variant="primary"
              size="sm"
              icon={<PlusIcon className="w-4 h-4" />}
              onClick={() => {
                setEditingCert(null);
                setFormData({
                  domain: '',
                  type: 'lets_encrypt',
                  auto_renew: true,
                });
                setShowForm(true);
              }}
            >
              Add Certificate
            </Button>
          </div>
        </div>

        {/* Certificates List */}
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-[var(--table-header-bg)] border-y border-[var(--border-color)]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--secondary-text)] uppercase tracking-wider">Domain</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--secondary-text)] uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--secondary-text)] uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--secondary-text)] uppercase tracking-wider">Expiry</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--secondary-text)] uppercase tracking-wider">Auto Renew</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--secondary-text)] uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-[var(--card-bg)] divide-y divide-[var(--border-color)]">
                {Array.isArray(sslCertificates) && sslCertificates.map((cert) => (
                  <tr key={cert.id} className="hover:bg-[var(--hover-bg)] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <ShieldCheckIcon className="w-5 h-5 text-[var(--accent-color)] mr-3" />
                        <span className="text-sm text-[var(--primary-text)]">{cert.domain}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--accent-color)]/10 text-[var(--accent-color)]">
                        {cert.type === 'lets_encrypt' ? "Let's Encrypt" : 'Custom'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        cert.status === 'valid'
                          ? 'bg-[var(--success-color)]/10 text-[var(--success-color)]'
                          : cert.status === 'expired'
                          ? 'bg-[var(--danger-color)]/10 text-[var(--danger-color)]'
                          : 'bg-[var(--warning-color)]/10 text-[var(--warning-color)]'
                      }`}>
                        {cert.status.charAt(0).toUpperCase() + cert.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--primary-text)]">
                      {cert.expiry}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        cert.auto_renew
                          ? 'bg-[var(--success-color)]/10 text-[var(--success-color)]'
                          : 'bg-[var(--border-color)] text-[var(--secondary-text)]'
                      }`}>
                        {cert.auto_renew ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => {
                            setEditingCert(cert);
                            setFormData({
                              ...cert,
                            });
                            setShowForm(true);
                          }}
                          className="text-[var(--secondary-text)] hover:text-[var(--accent-color)] transition-colors"
                        >
                          <PencilIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => {}}
                          className="text-[var(--secondary-text)] hover:text-[var(--accent-color)] transition-colors"
                        >
                          <ArrowDownTrayIcon className="w-5 h-5" />
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
                ))}
                {(!Array.isArray(sslCertificates) || sslCertificates.length === 0) && (
                  <tr>
                    <td colSpan="6" className="px-6 py-4 text-center text-[var(--secondary-text)]">
                      No certificates found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Certificate Status */}
          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-[var(--primary-text)]">Certificate Status</h3>
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
                  <span className="text-[var(--secondary-text)]">Valid Certificates</span>
                  <span className="text-[var(--primary-text)]">{validCertificates} / {totalCertificates}</span>
                </div>
                <div className="h-2 bg-[var(--border-color)] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[var(--success-color)] rounded-full" 
                    style={{ width: totalCertificates ? `${(validCertificates / totalCertificates) * 100}%` : '0%' }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-[var(--secondary-text)]">Auto-Renewal</span>
                  <span className="text-[var(--primary-text)]">{autoRenewEnabled} / {totalCertificates}</span>
                </div>
                <div className="h-2 bg-[var(--border-color)] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[var(--accent-color)] rounded-full" 
                    style={{ width: totalCertificates ? `${(autoRenewEnabled / totalCertificates) * 100}%` : '0%' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Expiring Soon */}
          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-[var(--primary-text)]">Expiring Soon</h3>
              <Button
                variant="ghost"
                size="sm"
                icon={<ArrowPathIcon className="w-4 h-4" />}
              >
                Refresh
              </Button>
            </div>
            <div className="space-y-3">
              {Array.isArray(expiringSoonCerts) && expiringSoonCerts.map(cert => (
                <div key={cert.id} className="flex items-center justify-between text-sm">
                  <span className="text-[var(--secondary-text)]">{cert.domain}</span>
                  <span className="text-[var(--warning-color)]">{cert.expiry}</span>
                </div>
              ))}
              {(!Array.isArray(expiringSoonCerts) || expiringSoonCerts.length === 0) && (
                <div className="text-sm text-[var(--secondary-text)]">No certificates expiring soon</div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg p-6">
            <h3 className="text-lg font-medium text-[var(--primary-text)] mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="secondary"
                size="sm"
                icon={<ArrowPathIcon className="w-4 h-4" />}
                className="justify-start"
              >
                Renew All
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={<DocumentDuplicateIcon className="w-4 h-4" />}
                className="justify-start"
              >
                Import
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
                icon={<Cog6ToothIcon className="w-4 h-4" />}
                className="justify-start"
              >
                Settings
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Certificate Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm z-50">
          <div className="bg-[var(--card-bg)] p-6 rounded-xl border border-[var(--border-color)] w-full max-w-md">
            <h2 className="text-xl font-bold text-[var(--primary-text)] mb-6">
              {editingCert ? 'Edit Certificate' : 'Add Certificate'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">
                    Domain
                  </label>
                  <input
                    type="text"
                    value={formData.domain}
                    onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">
                    Certificate Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="input-field"
                  >
                    <option value="lets_encrypt">Let's Encrypt</option>
                    <option value="custom">Custom Certificate</option>
                  </select>
                </div>
                {formData.type === 'custom' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">
                        Certificate File
                      </label>
                      <input
                        type="file"
                        className="input-field"
                        accept=".crt,.pem"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">
                        Private Key File
                      </label>
                      <input
                        type="file"
                        className="input-field"
                        accept=".key"
                        required
                      />
                    </div>
                  </>
                )}
                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.auto_renew}
                      onChange={(e) => setFormData({ ...formData, auto_renew: e.target.checked })}
                      className="rounded border-[var(--border-color)] text-[var(--accent-color)] focus:ring-[var(--accent-color)]"
                    />
                    <span className="text-sm font-medium text-[var(--secondary-text)]">Enable Auto Renewal</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowForm(false);
                    setEditingCert(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                >
                  {editingCert ? 'Save Changes' : 'Add Certificate'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default SSLSettings; 
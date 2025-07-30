import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageLayout from '../components/layout/PageLayout';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { ssl, virtualHosts } from '../services/api';
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
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

const SSLSettings = () => {
  const [searchParams] = useSearchParams();
  const [sslCertificates, setSslCertificates] = useState([]);
  const [virtualHostsList, setVirtualHostsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCert, setEditingCert] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [formData, setFormData] = useState({
    domain: '',
    auto_renew: true,
  });

  // Check for domain parameter from URL and pre-fill form
  useEffect(() => {
    const domainParam = searchParams.get('domain');
    if (domainParam) {
      setFormData(prev => ({ ...prev, domain: domainParam }));
      setShowForm(true);
    }
  }, [searchParams]);

  // Fetch data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [certsData, hostsData] = await Promise.all([
        ssl.getCertificates(),
        virtualHosts.getAll().catch(() => []) // Virtual hosts might require auth
      ]);
      setSslCertificates(certsData || []);
      setVirtualHostsList(hostsData || []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to fetch SSL data');
      console.error('SSL data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const validCertificates = sslCertificates.filter(cert => cert.status === 'active').length;
  const autoRenewEnabled = sslCertificates.filter(cert => cert.auto_renewal).length;
  const totalCertificates = sslCertificates.length;
  
  // Check for certificates expiring in next 30 days
  const expiringSoonCerts = sslCertificates.filter(cert => {
    const expiryDate = new Date(cert.valid_until);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return expiryDate <= thirtyDaysFromNow && cert.status === 'active';
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(prev => ({ ...prev, form: true }));
      
      if (editingCert) {
        // Update existing certificate (renew)
        await ssl.renewCertificate(editingCert.id);
      } else {
        // Get document root for the domain
        const virtualHost = virtualHostsList.find(vh => vh.domain === formData.domain);
        const document_root = virtualHost ? virtualHost.document_root : null;
        
        // Create new certificate
        await ssl.createCertificate({
          domain: formData.domain,
          auto_renewal: formData.auto_renew,
          document_root: document_root
        });
      }
      
      await fetchData(); // Refresh data
    setShowForm(false);
    setEditingCert(null);
      setFormData({ domain: '', auto_renew: true });
    } catch (err) {
      setError(err.message || 'Failed to save certificate');
    } finally {
      setActionLoading(prev => ({ ...prev, form: false }));
    }
  };

  const handleDeleteCertificate = async (certId) => {
    if (!window.confirm('Are you sure you want to delete this SSL certificate?')) return;
    
    try {
      setActionLoading(prev => ({ ...prev, [certId]: true }));
      await ssl.deleteCertificate(certId);
      await fetchData(); // Refresh data
    } catch (err) {
      setError(err.message || 'Failed to delete certificate');
    } finally {
      setActionLoading(prev => ({ ...prev, [certId]: false }));
    }
  };

  const handleRenewCertificate = async (certId) => {
    try {
      setActionLoading(prev => ({ ...prev, [`renew_${certId}`]: true }));
      await ssl.renewCertificate(certId);
      await fetchData(); // Refresh data
    } catch (err) {
      setError(err.message || 'Failed to renew certificate');
    } finally {
      setActionLoading(prev => ({ ...prev, [`renew_${certId}`]: false }));
    }
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  };

  const getDaysUntilExpiry = (dateString) => {
    try {
      const expiryDate = new Date(dateString);
      const today = new Date();
      const diffTime = expiryDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch {
      return 0;
    }
  };

  const actions = (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={fetchData}
        disabled={loading}
        icon={<ArrowPathIcon className="w-4 h-4" />}
      >
        {loading ? 'Refreshing...' : 'Refresh'}
      </Button>
      <Button
        variant="primary"
        size="sm"
        onClick={() => {
          setEditingCert(null);
          setFormData({
            domain: '',
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
        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-500 mr-2" />
              <span className="text-red-800">{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-500 hover:text-red-700"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--secondary-text)]">Total Certificates</p>
                <p className="text-2xl font-bold text-[var(--primary-text)]">{totalCertificates}</p>
              </div>
              <ShieldCheckIcon className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--secondary-text)]">Active</p>
                <p className="text-2xl font-bold text-green-600">{validCertificates}</p>
              </div>
              <CheckCircleIcon className="w-8 h-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--secondary-text)]">Auto-Renewal</p>
                <p className="text-2xl font-bold text-blue-600">{autoRenewEnabled}</p>
              </div>
              <ArrowPathIcon className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--secondary-text)]">Expiring Soon</p>
                <p className="text-2xl font-bold text-orange-600">{expiringSoonCerts.length}</p>
              </div>
              <ExclamationTriangleIcon className="w-8 h-8 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Certificates List */}
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-[var(--table-header-bg)] border-y border-[var(--border-color)]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--secondary-text)] uppercase tracking-wider">Domain</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--secondary-text)] uppercase tracking-wider">Issuer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--secondary-text)] uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--secondary-text)] uppercase tracking-wider">Expires</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--secondary-text)] uppercase tracking-wider">Auto Renew</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--secondary-text)] uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-[var(--card-bg)] divide-y divide-[var(--border-color)]">
                {loading ? (
                  // Loading skeleton
                  [...Array(3)].map((_, i) => (
                    <tr key={i}>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-5 h-5 bg-[var(--border-color)] rounded mr-3 animate-pulse"></div>
                          <div className="w-24 h-4 bg-[var(--border-color)] rounded animate-pulse"></div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-20 h-6 bg-[var(--border-color)] rounded-full animate-pulse"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-16 h-6 bg-[var(--border-color)] rounded-full animate-pulse"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-20 h-4 bg-[var(--border-color)] rounded animate-pulse"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-16 h-6 bg-[var(--border-color)] rounded-full animate-pulse"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-5 h-5 bg-[var(--border-color)] rounded animate-pulse"></div>
                          <div className="w-5 h-5 bg-[var(--border-color)] rounded animate-pulse"></div>
                          <div className="w-5 h-5 bg-[var(--border-color)] rounded animate-pulse"></div>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : Array.isArray(sslCertificates) && sslCertificates.map((cert) => {
                  const daysUntilExpiry = getDaysUntilExpiry(cert.valid_until);
                  const isExpiringSoon = daysUntilExpiry <= 30 && daysUntilExpiry > 0;
                  const isExpired = daysUntilExpiry <= 0;
                  
                  return (
                  <tr key={cert.id} className="hover:bg-[var(--hover-bg)] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                          {cert.status === 'active' ? (
                            <CheckCircleIcon className="w-5 h-5 text-green-500 mr-3" />
                          ) : (
                            <ExclamationTriangleIcon className="w-5 h-5 text-red-500 mr-3" />
                          )}
                          <div>
                            <div className="text-sm font-medium text-[var(--primary-text)]">{cert.domain}</div>
                            {isExpiringSoon && (
                              <div className="text-xs text-orange-500">Expires in {daysUntilExpiry} days</div>
                            )}
                            {isExpired && (
                              <div className="text-xs text-red-500">Expired</div>
                            )}
                          </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {cert.issuer || "Let's Encrypt"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          cert.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                      }`}>
                          {cert.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-[var(--primary-text)]">
                          {formatDate(cert.valid_until)}
                        </div>
                        <div className={`text-xs ${
                          isExpired ? 'text-red-500' : 
                          isExpiringSoon ? 'text-orange-500' : 
                          'text-[var(--secondary-text)]'
                        }`}>
                          {isExpired ? 'Expired' : 
                           isExpiringSoon ? `${daysUntilExpiry} days left` : 
                           `${daysUntilExpiry} days left`}
                        </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          cert.auto_renewal
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                      }`}>
                          {cert.auto_renewal ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                        <button
                            onClick={() => handleRenewCertificate(cert.id)}
                            disabled={actionLoading[`renew_${cert.id}`]}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50"
                            title="Renew Certificate"
                          >
                            {actionLoading[`renew_${cert.id}`] ? (
                              <div className="w-4 h-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
                            ) : (
                              <ArrowPathIcon className="w-4 h-4" />
                            )}
                        </button>
                        <button
                            onClick={() => handleDeleteCertificate(cert.id)}
                            disabled={actionLoading[cert.id]}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                            title="Delete Certificate"
                        >
                            {actionLoading[cert.id] ? (
                              <div className="w-4 h-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent"></div>
                            ) : (
                              <TrashIcon className="w-4 h-4" />
                            )}
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[120] overflow-y-auto">
          <div className="min-h-full flex items-center justify-center p-4">
            <div className="bg-[var(--card-bg)] p-6 rounded-xl border border-[var(--border-color)] w-full max-w-md my-8">
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
                {!editingCert && (
                <div>
                  <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">
                    Certificate Type
                  </label>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center">
                        <ShieldCheckIcon className="w-5 h-5 text-blue-500 mr-2" />
                        <span className="text-blue-800">Let's Encrypt (Free SSL Certificate)</span>
                </div>
                      <p className="text-sm text-blue-600 mt-1">
                        Automatically issued and renewed SSL certificate
                      </p>
                    </div>
                    </div>
                )}
                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.auto_renew}
                      onChange={(e) => setFormData({ ...formData, auto_renew: e.target.checked })}
                      className="rounded border-[var(--border-color)] text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-[var(--secondary-text)]">Enable Auto Renewal</span>
                  </label>
                  <p className="text-xs text-[var(--secondary-text)] mt-1 ml-6">
                    Automatically renew certificate before expiration
                  </p>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowForm(false);
                    setEditingCert(null);
                  }}
                  disabled={actionLoading.form}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  disabled={actionLoading.form}
                >
                  {actionLoading.form ? (
                    <div className="flex items-center">
                      <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2"></div>
                      Processing...
                    </div>
                  ) : (
                    editingCert ? 'Renew Certificate' : 'Create Certificate'
                  )}
                </Button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default SSLSettings; 
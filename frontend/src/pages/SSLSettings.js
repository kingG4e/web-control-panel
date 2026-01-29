import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import PageLayout from '../components/layout/PageLayout';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import BaseModal, { ModalSection, ModalInfoBox, ModalButton } from '../components/modals/BaseModal';
import { ssl, virtualHosts } from '../services/api';
import {
  PlusIcon,
  ShieldCheckIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

// --- Utility Functions ---
const formatDate = (dateString) => {
  if (!dateString) return '-';
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

const SSLSettings = () => {
  const [searchParams] = useSearchParams();
  const [sslCertificates, setSslCertificates] = useState([]);
  const [virtualHostsList, setVirtualHostsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal States
  const [showForm, setShowForm] = useState(false);
  const [editingCert, setEditingCert] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ show: false, cert: null });
  
  // Loading States
  const [actionLoading, setActionLoading] = useState({});
  
  // Form Data
  const [formData, setFormData] = useState({
    domain: '',
    auto_renew: true,
  });

  useEffect(() => {
    const domainParam = searchParams.get('domain');
    if (domainParam) {
      setFormData(prev => ({ ...prev, domain: domainParam }));
      setShowForm(true);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [certsData, hostsData] = await Promise.all([
        ssl.getCertificates(),
        virtualHosts.getAll().catch(() => [])
      ]);
      setSslCertificates(certsData || []);
      setVirtualHostsList(hostsData || []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to fetch SSL data');
    } finally {
      setLoading(false);
    }
  };

  const validCertificates = sslCertificates.filter(cert => cert.status === 'active').length;
  const totalCertificates = sslCertificates.length;
  
  const expiringSoonCerts = sslCertificates.filter(cert => {
    const days = getDaysUntilExpiry(cert.valid_until);
    return days <= 30 && days > 0 && cert.status === 'active';
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingCert(null);
    setFormData({ domain: '', auto_renew: true });
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    try {
      setActionLoading(prev => ({ ...prev, form: true }));
      if (editingCert) {
        await ssl.renewCertificate(editingCert.id);
      } else {
        const virtualHost = virtualHostsList.find(vh => vh.domain === formData.domain);
        const document_root = virtualHost ? virtualHost.document_root : null;
        await ssl.createCertificate({
          domain: formData.domain,
          auto_renewal: formData.auto_renew,
          document_root: document_root
        });
      }
      await fetchData();
      resetForm();
    } catch (err) {
      setError(err.message || 'Failed to save certificate');
    } finally {
      setActionLoading(prev => ({ ...prev, form: false }));
    }
  };

  const handleDeleteCertificate = async () => {
    if (!deleteModal.cert) return;
    const certId = deleteModal.cert.id;
    try {
      setActionLoading(prev => ({ ...prev, [certId]: true }));
      await ssl.deleteCertificate(certId);
      setDeleteModal({ show: false, cert: null });
      await fetchData();
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
      await fetchData();
    } catch (err) {
      setError(err.message || 'Failed to renew certificate');
    } finally {
      setActionLoading(prev => ({ ...prev, [`renew_${certId}`]: false }));
    }
  };

  const actions = (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} icon={<ArrowPathIcon className="w-4 h-4" />}>
        {loading ? 'Refreshing...' : 'Refresh'}
      </Button>
      <Button variant="primary" size="sm" onClick={() => { setEditingCert(null); setShowForm(true); }} icon={<PlusIcon className="w-4 h-4" />}>
        Add Certificate
      </Button>
    </div>
  );

  return (
    <PageLayout title="SSL Certificates" description="Manage SSL certificates for your domains" actions={actions}>
      <div className="space-y-6">
        {error && (
          <div className="rounded-lg p-4 border" style={{ backgroundColor: 'var(--error-bg)', borderColor: 'var(--danger-color)' }}>
            <div className="flex items-center">
              <ExclamationTriangleIcon className="w-5 h-5 mr-2 text-[var(--danger-color)]" />
              <span className="text-[var(--danger-color)]">{error}</span>
              <button onClick={() => setError(null)} className="ml-auto text-[var(--danger-color)]">×</button>
            </div>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 flex items-center justify-between">
            <div><p className="text-sm text-[var(--secondary-text)]">Total Certificates</p><p className="text-2xl font-bold">{totalCertificates}</p></div>
            <ShieldCheckIcon className="w-8 h-8 text-[var(--info-color)]" />
          </Card>
          <Card className="p-4 flex items-center justify-between">
            <div><p className="text-sm text-[var(--secondary-text)]">Active</p><p className="text-2xl font-bold text-[var(--success-color)]">{validCertificates}</p></div>
            <CheckCircleIcon className="w-8 h-8 text-[var(--success-color)]" />
          </Card>
          <Card className="p-4 flex items-center justify-between">
            <div><p className="text-sm text-[var(--secondary-text)]">Expiring Soon</p><p className="text-2xl font-bold text-[var(--warning-color)]">{expiringSoonCerts.length}</p></div>
            <ExclamationTriangleIcon className="w-8 h-8 text-[var(--warning-color)]" />
          </Card>
        </div>

        {/* List Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-[var(--table-header-bg)] border-y border-[var(--border-color)]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--secondary-text)] uppercase">Domain</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--secondary-text)] uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--secondary-text)] uppercase">Expires</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--secondary-text)] uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {loading ? (
                  <tr><td colSpan="4" className="px-6 py-4 text-center">Loading...</td></tr>
                ) : sslCertificates.map((cert) => {
                  const days = getDaysUntilExpiry(cert.valid_until);
                  return (
                    <tr key={cert.id} className="hover:bg-[var(--hover-bg)] transition-colors">
                      <td className="px-6 py-4 text-sm font-medium">{cert.domain}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cert.status === 'active' ? 'badge-success-strong' : 'badge-error-strong'}`}>
                          {cert.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div>{formatDate(cert.valid_until)}</div>
                        <div className={`text-xs ${days <= 30 ? 'text-[var(--warning-color)]' : 'text-[var(--secondary-text)]'}`}>{days} days left</div>
                      </td>
                      <td className="px-6 py-4 flex gap-3">
                        <button onClick={() => handleRenewCertificate(cert.id)} disabled={actionLoading[`renew_${cert.id}`]} className="text-[var(--info-color)]">
                          <ArrowPathIcon className={`w-4 h-4 ${actionLoading[`renew_${cert.id}`] ? 'animate-spin' : ''}`} />
                        </button>
                        <button onClick={() => setDeleteModal({ show: true, cert })} className="text-[var(--danger-color)]">
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* --- MODALS --- */}
      {deleteModal.show && deleteModal.cert && createPortal(
        <BaseModal
          isOpen={deleteModal.show}
          onClose={() => setDeleteModal({ show: false, cert: null })}
          title="Delete SSL"
          maxWidth="max-w-md"
          footer={
            <div className="flex justify-end gap-3 w-full">
              <ModalButton variant="secondary" onClick={() => setDeleteModal({ show: false, cert: null })}>Cancel</ModalButton>
              <ModalButton variant="danger" onClick={handleDeleteCertificate}>Delete</ModalButton>
            </div>
          }
        >
          <ModalSection>
            <p className="text-sm text-[var(--secondary-text)] mb-4">Confirm deletion for <strong>{deleteModal.cert.domain}</strong>?</p>
            <ModalInfoBox variant="error">This action cannot be undone.</ModalInfoBox>
          </ModalSection>
        </BaseModal>,
        document.body
      )}

      {showForm && createPortal(
        <BaseModal
          isOpen={showForm}
          onClose={resetForm}
          title={editingCert ? 'Renew SSL' : 'Add SSL'}
          maxWidth="max-w-lg"
          footer={
            <div className="flex justify-end gap-3 w-full">
              <ModalButton variant="secondary" onClick={resetForm} disabled={actionLoading.form}>Cancel</ModalButton>
              <ModalButton variant="primary" onClick={handleSubmit} disabled={actionLoading.form}>Confirm</ModalButton>
            </div>
          }
        >
          <ModalSection>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-[var(--secondary-text)]">Domain</label>
                <input
                  type="text"
                  value={formData.domain}
                  onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                  className="input-field w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-color)]"
                  placeholder="example.com"
                  disabled={!!editingCert}
                />
              </div>
            </div>
          </ModalSection>
        </BaseModal>,
        document.body
      )}
    </PageLayout>
  );
};

export default SSLSettings;
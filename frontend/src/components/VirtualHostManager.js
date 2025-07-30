import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from './layout/PageLayout';
import { virtualHosts, ssl } from '../services/api';
import BaseModal from './modals/BaseModal';

const VirtualHostManager = () => {
  const navigate = useNavigate();
  const [hosts, setHosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [deleteModal, setDeleteModal] = useState({ show: false, host: null });
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [sslCertificates, setSslCertificates] = useState([]);
  const [sslLoading, setSslLoading] = useState({});

  useEffect(() => {
    fetchVirtualHosts();
    fetchSSLCertificates();
  }, []);

  const fetchSSLCertificates = async () => {
    try {
      const data = await ssl.getCertificates();
      setSslCertificates(data);
    } catch (err) {
      console.error('Failed to fetch SSL certificates:', err);
    }
  };

  const fetchVirtualHosts = async () => {
    try {
      setLoading(true);
      const data = await virtualHosts.getAll();
      setHosts(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch virtual hosts');
    } finally {
      setLoading(false);
    }
  };

  const handleSettings = (host) => {
    navigate(`/virtual-hosts/${host.id}/edit`);
  };

  const handleViewSite = (host) => {
    window.open(`http://${host.domain}`, '_blank');
  };

  const handleSSLSettings = (host) => {
    navigate(`/ssl?domain=${host.domain}`);
  };

  const handleDeleteClick = (host) => {
    setDeleteModal({ show: true, host });
    setDeleteConfirmText('');
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.host || deleteConfirmText !== 'DELETE') return;

    try {
      await virtualHosts.delete(deleteModal.host.id);
      await fetchVirtualHosts();
      setDeleteModal({ show: false, host: null });
      setDeleteConfirmText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete virtual host');
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModal({ show: false, host: null });
    setDeleteConfirmText('');
  };

  const handleToggleSSL = async (host) => {
    const hasSSL = sslCertificates.some(cert => cert.domain === host.domain);
    
    setSslLoading(prev => ({ ...prev, [host.id]: true }));
    
    try {
      if (hasSSL) {
        // Disable HTTPS - revoke certificate
        const certificate = sslCertificates.find(cert => cert.domain === host.domain);
        if (certificate) {
          await ssl.deleteCertificate(certificate.id);
          await fetchSSLCertificates();
        }
      } else {
        // Enable HTTPS - create Let's Encrypt certificate
        await ssl.createCertificate({
          domain: host.domain,
          auto_renewal: true,
          document_root: host.document_root
        });
        await fetchSSLCertificates();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${hasSSL ? 'disable' : 'enable'} HTTPS`);
    } finally {
      setSslLoading(prev => ({ ...prev, [host.id]: false }));
    }
  };

  // Filter and search hosts
  const filteredHosts = hosts.filter(host => {
    const matchesSearch = host.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         host.linux_username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || host.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  // Stats
  const stats = {
    total: hosts.length,
    active: hosts.filter(h => h.status === 'active').length,
    maintenance: hosts.filter(h => h.status === 'maintenance').length,
    inactive: hosts.filter(h => h.status === 'inactive').length,
  };

  if (loading) {
    return (
      <PageLayout title="Virtual Hosts" description="Loading virtual hosts...">
        <div className="space-y-6">
          {/* Stats Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-4 rounded-lg animate-pulse" style={{ backgroundColor: 'var(--card-bg)' }}>
                <div className="h-4 rounded w-1/2 mb-2" style={{ backgroundColor: 'var(--border-color)' }}></div>
                <div className="h-6 rounded w-1/3" style={{ backgroundColor: 'var(--border-color)' }}></div>
              </div>
            ))}
          </div>

          {/* Search & Filter Skeleton */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 h-10 rounded-lg animate-pulse" style={{ backgroundColor: 'var(--card-bg)' }}></div>
            <div className="w-32 h-10 rounded-lg animate-pulse" style={{ backgroundColor: 'var(--card-bg)' }}></div>
          </div>

          {/* Virtual Hosts Skeleton */}
          <div className="grid grid-cols-1 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-6 rounded-lg animate-pulse" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                <div className="h-6 rounded w-1/3 mb-4" style={{ backgroundColor: 'var(--border-color)' }}></div>
                <div className="space-y-2">
                  <div className="h-4 rounded w-1/2" style={{ backgroundColor: 'var(--border-color)' }}></div>
                  <div className="h-4 rounded w-2/3" style={{ backgroundColor: 'var(--border-color)' }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout title="Virtual Hosts" description="Manage your virtual hosts">
        <div className="border rounded-lg p-4" style={{ 
          backgroundColor: 'var(--error-bg)', 
          borderColor: 'var(--error-border)',
          color: 'var(--error-text)'
        }}>
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
            <button
              onClick={fetchVirtualHosts}
              className="ml-auto underline hover:no-underline transition-all"
            >
              Retry
            </button>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Virtual Hosts"
      description="Manage your virtual hosts and domains"
      actions={
        <button
          onClick={() => navigate('/virtual-hosts/new')}
          className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105"
          style={{ 
            backgroundColor: 'var(--accent-color)', 
            color: 'white' 
          }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Create Virtual Host</span>
        </button>
      }
    >
      <div className="space-y-6">
        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg border transition-all duration-200 hover:scale-105" 
               style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'var(--secondary-text)' }}>Total Hosts</p>
                <p className="text-2xl font-bold" style={{ color: 'var(--primary-text)' }}>{stats.total}</p>
              </div>
              <div className="p-2 rounded-full" style={{ backgroundColor: 'var(--accent-color)', opacity: 0.1 }}>
                <svg className="w-6 h-6" style={{ color: 'var(--accent-color)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                </svg>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg border transition-all duration-200 hover:scale-105" 
               style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'var(--secondary-text)' }}>Active</p>
                <p className="text-2xl font-bold" style={{ color: 'var(--success-color)' }}>{stats.active}</p>
              </div>
              <div className="p-2 rounded-full" style={{ backgroundColor: 'var(--success-bg)' }}>
                <svg className="w-6 h-6" style={{ color: 'var(--success-color)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg border transition-all duration-200 hover:scale-105" 
               style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'var(--secondary-text)' }}>Maintenance</p>
                <p className="text-2xl font-bold" style={{ color: 'var(--warning-color)' }}>{stats.maintenance}</p>
              </div>
              <div className="p-2 rounded-full" style={{ backgroundColor: 'var(--warning-bg)' }}>
                <svg className="w-6 h-6" style={{ color: 'var(--warning-color)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg border transition-all duration-200 hover:scale-105" 
               style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'var(--secondary-text)' }}>Inactive</p>
                <p className="text-2xl font-bold" style={{ color: 'var(--danger-color)' }}>{stats.inactive}</p>
              </div>
              <div className="p-2 rounded-full" style={{ backgroundColor: 'var(--danger-bg)' }}>
                <svg className="w-6 h-6" style={{ color: 'var(--danger-color)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" 
                 style={{ color: 'var(--secondary-text)' }} 
                 fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search virtual hosts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border transition-all duration-200 focus:ring-2 focus:ring-opacity-50"
              style={{ 
                backgroundColor: 'var(--input-bg)', 
                borderColor: 'var(--border-color)',
                color: 'var(--primary-text)',
                focusRingColor: 'var(--accent-color)'
              }}
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 rounded-lg border transition-all duration-200"
            style={{ 
              backgroundColor: 'var(--input-bg)', 
              borderColor: 'var(--border-color)',
              color: 'var(--primary-text)'
            }}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="maintenance">Maintenance</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Virtual Hosts List */}
        <div className="grid grid-cols-1 gap-4">
          {filteredHosts.length === 0 ? (
            <div className="text-center py-12">
              <div className="mb-4">
                <svg className="mx-auto w-16 h-16 opacity-50" 
                     style={{ color: 'var(--secondary-text)' }} 
                     fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                </svg>
              </div>
              <div className="mb-4" style={{ color: 'var(--secondary-text)' }}>
                {searchTerm || filterStatus !== 'all' ? 'No virtual hosts match your search criteria' : 'No virtual hosts found'}
              </div>
              {!searchTerm && filterStatus === 'all' && (
              <button
                onClick={() => navigate('/virtual-hosts/new')}
                  className="inline-flex items-center px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105"
                  style={{ 
                    backgroundColor: 'var(--accent-color)', 
                    color: 'white' 
                  }}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Create Your First Virtual Host
              </button>
              )}
            </div>
          ) : (
            filteredHosts.map((host) => (
              <div
                key={host.id}
                className="p-6 rounded-lg border transition-all duration-200 hover:scale-[1.01] hover:shadow-lg"
                style={{ 
                  backgroundColor: 'var(--card-bg)', 
                  borderColor: 'var(--border-color)' 
                }}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--primary-text)' }}>
                      {host.domain}
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{
                          backgroundColor: host.status === 'active' ? 'var(--success-bg)' :
                                          host.status === 'maintenance' ? 'var(--warning-bg)' :
                                          'var(--danger-bg)',
                          color: host.status === 'active' ? 'var(--success-color)' :
                                 host.status === 'maintenance' ? 'var(--warning-color)' :
                                 'var(--danger-color)'
                        }}>
                          <div className="w-1.5 h-1.5 rounded-full mr-1.5" style={{
                            backgroundColor: host.status === 'active' ? 'var(--success-color)' :
                                            host.status === 'maintenance' ? 'var(--warning-color)' :
                                            'var(--danger-color)'
                          }}></div>
                          {host.status}
                        </span>
                        
                        {/* SSL Status */}
                        {(() => {
                          const hasSSL = sslCertificates.some(cert => cert.domain === host.domain);
                          return hasSSL ? (
                            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{
                              backgroundColor: 'var(--success-bg)',
                              color: 'var(--success-color)'
                            }}>
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                              HTTPS
                            </span>
                          ) : (
                            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{
                              backgroundColor: 'var(--secondary-bg)',
                              color: 'var(--secondary-text)',
                              border: '1px solid var(--border-color)'
                            }}>
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                              </svg>
                              HTTP
                            </span>
                          );
                        })()}
                        
                        {host.php_version && (
                          <span className="ml-2 text-sm" style={{ color: 'var(--secondary-text)' }}>
                            PHP {host.php_version}
                          </span>
                        )}
                      </div>
                      <div className="text-sm" style={{ color: 'var(--secondary-text)' }}>
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <strong>User:</strong> {host.linux_username}
                        </div>
                      </div>
                      <div className="text-sm" style={{ color: 'var(--secondary-text)' }}>
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                          </svg>
                          <strong>Path:</strong> {host.document_root}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleSettings(host)}
                      className="flex items-center space-x-1 px-3 py-1 text-sm rounded transition-all duration-200 hover:scale-105"
                      style={{ 
                        backgroundColor: 'var(--secondary-bg)', 
                        color: 'var(--secondary-text)',
                        border: '1px solid var(--border-color)'
                      }}
                      title="Settings"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleViewSite(host)}
                      className="flex items-center space-x-1 px-3 py-1 text-sm rounded transition-all duration-200 hover:scale-105"
                      style={{
                        backgroundColor: 'var(--info-bg)',
                        color: 'var(--info-color)'
                      }}
                      title="View Site"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 919-9" />
                      </svg>
                    </button>
                    {(() => {
                      const hasSSL = sslCertificates.some(cert => cert.domain === host.domain);
                      const isLoading = sslLoading[host.id];
                      return (
                        <button
                          onClick={() => handleToggleSSL(host)}
                          disabled={isLoading}
                          className={`flex items-center space-x-1 px-3 py-1 text-sm rounded transition-all duration-200 hover:scale-105 ${
                            isLoading ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          style={{
                            backgroundColor: hasSSL ? 'var(--success-bg)' : 'var(--secondary-bg)',
                            color: hasSSL ? 'var(--success-color)' : 'var(--secondary-text)',
                            border: hasSSL ? 'none' : '1px solid var(--border-color)'
                          }}
                          title={hasSSL ? 'Disable HTTPS (Let\'s Encrypt)' : 'Enable HTTPS (Let\'s Encrypt)'}
                        >
                          {isLoading ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          )}
                          <span>{hasSSL ? 'HTTPS' : 'HTTP'}</span>
                        </button>
                      );
                    })()}
                    <button
                      onClick={() => handleSSLSettings(host)}
                      className="flex items-center space-x-1 px-3 py-1 text-sm rounded transition-all duration-200 hover:scale-105"
                      style={{
                        backgroundColor: 'var(--accent-color)',
                        color: 'white'
                      }}
                      title="SSL Settings"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteClick(host)}
                      className="flex items-center space-x-1 px-3 py-1 text-sm rounded transition-all duration-200 hover:scale-105"
                      style={{
                        backgroundColor: 'var(--danger-bg)',
                        color: 'var(--danger-color)'
                      }}
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {deleteModal.show && (
          <BaseModal
            isOpen={deleteModal.show}
            onClose={handleDeleteCancel}
            maxWidth="max-w-sm"
            title=""
            footer={null}
          >
            <div className="text-center px-6 py-6">
              {/* Warning Icon */}
              <div className="mx-auto w-12 h-12 mb-4 flex items-center justify-center rounded-full" style={{ backgroundColor: 'var(--danger-bg)' }}>
                <svg className="w-6 h-6" style={{ color: 'var(--danger-color)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>

              {/* Title and Domain */}
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--primary-text)' }}>
                Delete Virtual Host
              </h3>
              <p className="text-sm mb-4" style={{ color: 'var(--secondary-text)' }}>
                <span className="font-mono font-medium" style={{ color: 'var(--primary-text)' }}>
                  {deleteModal.host?.domain}
                </span>
              </p>

              {/* Confirmation Input */}
              <div className="mb-6">
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE to confirm"
                  className="w-full px-4 py-3 border rounded-lg text-center font-mono text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-opacity-50"
                  style={{ 
                    backgroundColor: 'var(--input-bg)', 
                    borderColor: deleteConfirmText === 'DELETE' ? 'var(--danger-color)' : 'var(--border-color)',
                    color: 'var(--primary-text)',
                    focusRingColor: 'var(--danger-color)'
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={handleDeleteCancel}
                  className="flex-1 px-4 py-2 text-sm rounded-lg border transition-all duration-200 hover:bg-opacity-80"
                  style={{ 
                    backgroundColor: 'var(--secondary-bg)', 
                    borderColor: 'var(--border-color)',
                    color: 'var(--secondary-text)' 
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deleteConfirmText !== 'DELETE'}
                  className={`flex-1 px-4 py-2 text-sm rounded-lg transition-all duration-200 ${
                    deleteConfirmText === 'DELETE' 
                      ? 'cursor-pointer hover:bg-opacity-80' 
                      : 'cursor-not-allowed opacity-50'
                  }`}
                  style={{
                    backgroundColor: deleteConfirmText === 'DELETE' ? 'var(--danger-color)' : 'var(--border-color)',
                    color: deleteConfirmText === 'DELETE' ? 'white' : 'var(--secondary-text)'
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </BaseModal>
        )}
      </div>
    </PageLayout>
  );
};

export default VirtualHostManager; 
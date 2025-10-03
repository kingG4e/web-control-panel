import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { signup } from '../services/api';

const MyRequests = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);
  const [formData, setFormData] = useState({
    domain: '',
    want_ssl: false,
    want_dns: false,
    want_email: false,
    want_mysql: false,
    storage_quota_mb: ''
  });

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      // Get all of user's requests
      if (user?.username) {
        const result = await signup.myRequests();
        if (result.data) {
          setRequests(result.data);
        } else {
          setRequests([]);
        }
      }
    } catch (e) {
      console.error('Failed to load requests:', e);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (request) => {
    setEditingRequest(request);
    setFormData({
      domain: request.domain,
      want_ssl: request.want_ssl,
      want_dns: request.want_dns,
      want_email: request.want_email,
      want_mysql: request.want_mysql,
      storage_quota_mb: request.storage_quota_mb || ''
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.domain) {
      alert('Please enter domain');
      return;
    }
    
    try {
      const payload = {
        domain: formData.domain,
        want_ssl: formData.want_ssl,
        want_dns: formData.want_dns,
        want_email: formData.want_email,
        want_mysql: formData.want_mysql,
        storage_quota_mb: formData.storage_quota_mb ? Number(formData.storage_quota_mb) : undefined
      };
      
      if (editingRequest) {
        await signup.update(editingRequest.id, payload);
        alert('Update request submitted successfully. It will be reviewed by an admin.');
      } else {
        const createPayload = {
          ...payload,
          username: user.username, // Username is already known by backend
          password: 'temp_password', // Will be handled by admin
        };
        await signup.submit(createPayload);
        alert('Request submitted successfully');
      }

      setShowForm(false);
      setEditingRequest(null);
      setFormData({
        domain: '',
        want_ssl: false,
        want_dns: false,
        want_email: false,
        want_mysql: false,
        storage_quota_mb: ''
      });
      loadRequests();
    } catch (err) {
      alert('Error: ' + (err.message || 'Unable to submit request'));
    }
  };

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--primary-text)]">My Requests</h2>
          <p className="text-[var(--secondary-text)] text-sm">Service requests and approval status</p>
        </div>
        <button
          onClick={() => {
            if (showForm) {
              setShowForm(false);
              setEditingRequest(null);
            } else {
              setEditingRequest(null);
              setFormData({
                domain: '',
                want_ssl: false,
                want_dns: false,
                want_email: false,
                want_mysql: false,
                storage_quota_mb: ''
              });
              setShowForm(true);
            }
          }}
          className="btn-primary px-4 py-2"
        >
          {showForm ? 'Cancel' : '+ New Request'}
        </button>
      </div>

      {/* Add New Request Form */}
      {showForm && (
        <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl p-6">
          <h3 className="text-lg font-semibold text-[var(--primary-text)] mb-4">{editingRequest ? 'Update Request' : 'Add New Request'}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm text-[var(--secondary-text)]">Domain <span className="text-red-500">*</span></label>
              <input 
                name="domain" 
                value={formData.domain} 
                onChange={onChange} 
                className="input-field mt-1" 
                placeholder="example.com" 
                required
                disabled={!!editingRequest}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">Required Services</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { key: 'want_ssl', label: 'SSL' },
                  { key: 'want_dns', label: 'DNS Zone' },
                  { key: 'want_email', label: 'Email' },
                  { key: 'want_mysql', label: 'MySQL' }
                ].map((opt) => (
                  <button
                    type="button"
                    key={opt.key}
                    onClick={() => setFormData(p => ({ ...p, [opt.key]: !p[opt.key] }))}
                    className={`w-full px-3 py-2 rounded border text-sm transition-colors
                      ${formData[opt.key]
                        ? 'bg-[var(--accent-color)]/10 border-[var(--accent-color)]/40 text-[var(--primary-text)]'
                        : 'bg-[var(--input-bg)] border-[var(--border-color)] text-[var(--secondary-text)]'}
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <span>{opt.label}</span>
                      <span className={`w-2.5 h-2.5 rounded-full ${formData[opt.key] ? 'bg-[var(--accent-color)]' : 'bg-[var(--border-color)]'}`}></span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm text-[var(--secondary-text)]">Storage Space (MB)</label>
              <input 
                name="storage_quota_mb" 
                value={formData.storage_quota_mb} 
                onChange={onChange} 
                className="input-field mt-1" 
                placeholder="1024" 
              />
            </div>

            <div className="md:col-span-2 flex justify-end space-x-3 pt-2">
              <button 
                type="button" 
                onClick={() => {
                  setShowForm(false);
                  setEditingRequest(null);
                }}
                className="px-4 py-2 border border-[var(--border-color)] rounded text-[var(--secondary-text)] hover:text-[var(--primary-text)] hover:bg-[var(--hover-bg)]"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="btn-primary px-4 py-2"
              >
                {editingRequest ? 'Submit Update' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Requests List */}
      {loading ? (
        <div className="p-6 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-color)] mx-auto mb-2"></div>
          <p className="text-[var(--secondary-text)]">Loading...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.length > 0 ? (
            requests.map((request) => (
              <div key={request.id} className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--primary-text)]">{request.domain || 'No domain specified'}</h3>
                    <p className="text-sm text-[var(--secondary-text)]">User: {request.username || user?.username}</p>
                    {request.full_name && (
                      <p className="text-sm text-[var(--secondary-text)]">Full Name: <span className="text-[var(--primary-text)]">{request.full_name}</span></p>
                    )}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border
                    ${request.status === 'pending' ? 'border-yellow-400/40 text-yellow-500 bg-yellow-500/10' : ''}
                    ${request.status === 'approved' ? 'border-green-500/40 text-green-500 bg-green-500/10' : ''}
                    ${request.status === 'rejected' ? 'border-red-500/40 text-red-500 bg-red-500/10' : ''}
                  `}>
                    {request.status === 'pending' && 'Pending'}
                    {request.status === 'approved' && 'Approved'}
                    {request.status === 'rejected' && 'Rejected'}
                  </span>
                </div>

                {/* Services requested */}
                {(request.want_ssl || request.want_dns || request.want_email || request.want_mysql) && (
                  <div className="mb-4">
                    <p className="text-sm text-[var(--secondary-text)] mb-2">Requested Services:</p>
                    <div className="flex flex-wrap gap-2">
                      {request.want_ssl && <span className="px-2 py-1 bg-[var(--accent-color)]/20 text-[var(--primary-text)] rounded text-xs">SSL</span>}
                      {request.want_dns && <span className="px-2 py-1 bg-[var(--accent-color)]/20 text-[var(--primary-text)] rounded text-xs">DNS Zone</span>}
                      {request.want_email && <span className="px-2 py-1 bg-[var(--accent-color)]/20 text-[var(--primary-text)] rounded text-xs">Email</span>}
                      {request.want_mysql && <span className="px-2 py-1 bg-[var(--accent-color)]/20 text-[var(--primary-text)] rounded text-xs">MySQL</span>}
                    </div>
                  </div>
                )}

                {/* Storage quota */}
                {request.storage_quota_mb && (
                  <div className="mb-4">
                    <p className="text-sm text-[var(--secondary-text)]">Storage Space: <span className="text-[var(--primary-text)]">{request.storage_quota_mb} MB</span></p>
                  </div>
                )}

                {/* Admin comment */}
                {request.admin_comment && (
                  <div className="p-3 bg-[var(--secondary-bg)] rounded border border-[var(--border-color)]">
                    <p className="text-sm text-[var(--secondary-text)]">Admin Notes:</p>
                    <p className="text-[var(--primary-text)] text-sm">{request.admin_comment}</p>
                  </div>
                )}

                {/* Timestamps */}
                <div className="mt-4 text-xs text-[var(--secondary-text)] border-t border-[var(--border-color)] pt-2">
                  <p>Submitted: {new Date(request.created_at).toLocaleString('en-US')}</p>
                  {request.approved_at && (
                    <p>Processed: {new Date(request.approved_at).toLocaleString('en-US')}</p>
                  )}
                </div>

                {request.status === 'approved' && (
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => handleEditClick(request)}
                      className="btn-secondary px-4 py-2"
                    >
                      Request Change
                    </button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="p-6 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-500/20 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-[var(--primary-text)] mb-2">No Requests Yet</h3>
              <p className="text-[var(--secondary-text)] mb-4">You don't have any service requests</p>
              <button
                onClick={() => setShowForm(true)}
                className="btn-primary px-4 py-2"
              >
                Create First Request
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MyRequests;

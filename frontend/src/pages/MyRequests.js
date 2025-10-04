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
    storage_quota_mb: '',
    email_username: '',
    email_password: '',
    email_quota: '',
    db_name: '',
    db_username: '',
    db_password: ''
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
      storage_quota_mb: request.storage_quota_mb || '',
      email_username: request.email_username || '',
      email_password: '',
      email_quota: request.email_quota || '',
      db_name: request.db_name ? request.db_name.replace(/^db_/, '') : '',
      db_username: request.db_username || '',
      db_password: request.db_password || ''
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
        storage_quota_mb: formData.storage_quota_mb ? Number(formData.storage_quota_mb) : undefined,
        email_username: formData.want_email && formData.email_username ? formData.email_username : undefined,
        email_password: formData.want_email && formData.email_password ? formData.email_password : undefined,
        email_quota: formData.want_email && formData.email_quota ? Number(formData.email_quota) : undefined,
        db_name: formData.want_mysql && formData.db_name ? `db_${formData.db_name}` : undefined,
        db_username: formData.want_mysql && formData.db_username ? formData.db_username : undefined,
        db_password: formData.want_mysql && formData.db_password ? formData.db_password : undefined
      };
      
      if (editingRequest) {
        await signup.update(editingRequest.id, payload);
        alert('Update request submitted successfully. It will be reviewed by an admin.');
      } else {
        // Logged-in users should use the additional request endpoint to avoid username conflicts
        await signup.submitAdditional(payload);
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
        storage_quota_mb: '',
        email_username: '',
        email_password: '',
        email_quota: '',
        db_name: '',
        db_username: '',
        db_password: ''
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
                storage_quota_mb: '',
                email_username: '',
                email_password: '',
                email_quota: '',
                db_name: '',
                db_username: '',
                db_password: ''
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

            {/* Email Account Fields - Only show when Email is selected */}
            {formData.want_email && (
              <>
                <div>
                  <label className="block text-sm text-[var(--secondary-text)]">Email Username</label>
                  <div className="flex">
                    <input 
                      name="email_username" 
                      value={formData.email_username} 
                      onChange={onChange} 
                      className="input-field mt-1 rounded-r-none border-r-0" 
                      placeholder="user" 
                      required={false}
                    />
                    <div className="px-3 py-2 rounded-r border border-l-0 bg-[var(--secondary-bg)] border-[var(--border-color)] text-[var(--secondary-text)] flex items-center">
                      @{formData.domain || 'domain.com'}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-[var(--secondary-text)]">Email Password</label>
                  <input 
                    name="email_password" 
                    type="password"
                    value={formData.email_password} 
                    onChange={onChange} 
                    className="input-field mt-1" 
                    placeholder="••••••••" 
                    required={false}
                  />
                </div>

                <div>
                  <label className="block text-sm text-[var(--secondary-text)]">Email Quota (MB)</label>
                  <input 
                    name="email_quota" 
                    type="number"
                    value={formData.email_quota} 
                    onChange={onChange} 
                    className="input-field mt-1" 
                    placeholder="1024" 
                    min="1"
                  />
                </div>
              </>
            )}

            {/* Database Fields - Only show when MySQL is selected */}
            {formData.want_mysql && (
              <>
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-[var(--secondary-text)]">Database Name</label>
                    <div className="flex mt-1">
                      <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-[var(--border-color)] bg-[var(--secondary-bg)] text-[var(--secondary-text)] text-sm">
                        db_
                      </span>
                      <input 
                        name="db_name" 
                        value={formData.db_name} 
                        onChange={onChange} 
                        className="input-field rounded-l-none" 
                        placeholder="mydatabase" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-[var(--secondary-text)]">Database Username</label>
                    <input 
                      name="db_username" 
                      value={formData.db_username} 
                      onChange={onChange} 
                      className="input-field mt-1" 
                      placeholder="my_user" 
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-[var(--secondary-text)]">Database Password</label>
                    <input 
                      name="db_password" 
                      type="password"
                      value={formData.db_password} 
                      onChange={onChange} 
                      className="input-field mt-1" 
                      placeholder="••••••••" 
                    />
                  </div>
                </div>
              </>
            )}

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
                    {request.want_email && (request.email_username || request.email_quota) && (
                      <div className="mt-2 text-xs text-[var(--secondary-text)]">
                        Email requested: <span className="text-[var(--primary-text)]">{request.email_username || '-'}@{request.domain}</span> {request.email_quota ? `(${request.email_quota}MB)` : ''}
                      </div>
                    )}
                    {request.want_mysql && (request.db_name || request.db_username) && (
                      <div className="mt-2 text-xs text-[var(--secondary-text)]">
                        Database requested: <span className="text-[var(--primary-text)]">{request.db_name || '-'}</span> {request.db_username ? `as ${request.db_username}` : ''}
                      </div>
                    )}
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

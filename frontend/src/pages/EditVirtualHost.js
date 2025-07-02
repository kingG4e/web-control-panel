import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { virtualHosts } from '../services/api.js';

// Inline SVG Icons
const ExclamationTriangleIcon = ({ className, style }) => (
  <svg className={className} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const EditVirtualHost = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  
  const [formData, setFormData] = useState({
    domain: '',
    document_root: '',
    server_admin: '',
    php_version: '8.1',
    status: 'active'
  });

  useEffect(() => {
    fetchVirtualHost();
  }, [id]);

  const fetchVirtualHost = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await virtualHosts.get(parseInt(id));
      setFormData({
        domain: data.domain || '',
        document_root: data.document_root || '',
        server_admin: data.server_admin || '',
        php_version: data.php_version || '8.1',
        status: data.status || 'active'
      });
    } catch (err) {
      console.error('Error fetching virtual host:', err);
      setError('Failed to load virtual host. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError(null);
      
      await virtualHosts.update(parseInt(id), formData);
      navigate('/virtual-hosts');
    } catch (err) {
      console.error('Error updating virtual host:', err);
      setError(err.message || 'Failed to update virtual host. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--primary-bg)' }}>
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="h-8 w-48 rounded animate-pulse" style={{ backgroundColor: 'var(--secondary-bg)' }}></div>
              <div className="h-4 w-64 rounded animate-pulse mt-2" style={{ backgroundColor: 'var(--secondary-bg)' }}></div>
            </div>
            <div className="w-20 h-10 rounded animate-pulse" style={{ backgroundColor: 'var(--secondary-bg)' }}></div>
          </div>
          <div className="rounded-lg border p-6" style={{ 
            backgroundColor: 'var(--card-bg)', 
            borderColor: 'var(--border-color)' 
          }}>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i}>
                  <div className="h-4 w-24 rounded animate-pulse mb-2" style={{ backgroundColor: 'var(--secondary-bg)' }}></div>
                  <div className="h-10 w-full rounded animate-pulse" style={{ backgroundColor: 'var(--secondary-bg)' }}></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--primary-bg)' }}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--primary-text)' }}>
              Edit Virtual Host
            </h1>
            <p className="mt-2 text-lg" style={{ color: 'var(--secondary-text)' }}>
              Update settings for {formData.domain}
            </p>
          </div>
          <Link
            to="/virtual-hosts"
            className="px-6 py-3 rounded-lg font-medium transition-all duration-200"
            style={{ 
              backgroundColor: 'var(--secondary-bg)', 
              color: 'var(--primary-text)',
              border: '1px solid var(--border-color)'
            }}
          >
            Back to Virtual Hosts
          </Link>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="rounded-lg p-4 border" style={{ 
            backgroundColor: 'var(--error-bg)', 
            borderColor: 'var(--error-border)'
          }}>
            <div className="flex items-center">
              <ExclamationTriangleIcon className="w-5 h-5 mr-3 flex-shrink-0" style={{ color: '#f87171' }} />
              <span style={{ color: 'var(--error-text)' }}>{error}</span>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="rounded-xl border p-8" style={{ 
          backgroundColor: 'var(--card-bg)', 
          borderColor: 'var(--border-color)' 
        }}>
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Domain */}
              <div>
                <label htmlFor="domain" className="block text-sm font-medium mb-2" style={{ color: 'var(--primary-text)' }}>
                  Domain Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  id="domain"
                  name="domain"
                  value={formData.domain}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-lg border transition-all duration-200 focus:ring-2 focus:ring-opacity-50"
                  style={{ 
                    backgroundColor: 'var(--input-bg)', 
                    borderColor: 'var(--border-color)',
                    color: 'var(--primary-text)',
                    focusRingColor: 'var(--accent-color)'
                  }}
                  placeholder="example.com"
                />
              </div>

              {/* Status */}
              <div>
                <label htmlFor="status" className="block text-sm font-medium mb-2" style={{ color: 'var(--primary-text)' }}>
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border transition-all duration-200 focus:ring-2 focus:ring-opacity-50"
                  style={{ 
                    backgroundColor: 'var(--input-bg)', 
                    borderColor: 'var(--border-color)',
                    color: 'var(--primary-text)',
                    focusRingColor: 'var(--accent-color)'
                  }}
                >
                  <option value="active">Active</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>

            {/* Document Root */}
            <div>
              <label htmlFor="document_root" className="block text-sm font-medium mb-2" style={{ color: 'var(--primary-text)' }}>
                Document Root <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                id="document_root"
                name="document_root"
                value={formData.document_root}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-lg border transition-all duration-200 focus:ring-2 focus:ring-opacity-50"
                style={{ 
                  backgroundColor: 'var(--input-bg)', 
                  borderColor: 'var(--border-color)',
                  color: 'var(--primary-text)',
                  focusRingColor: 'var(--accent-color)'
                }}
                placeholder="/var/www/example.com"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Server Admin */}
              <div>
                <label htmlFor="server_admin" className="block text-sm font-medium mb-2" style={{ color: 'var(--primary-text)' }}>
                  Server Admin Email
                </label>
                <input
                  type="email"
                  id="server_admin"
                  name="server_admin"
                  value={formData.server_admin}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border transition-all duration-200 focus:ring-2 focus:ring-opacity-50"
                  style={{ 
                    backgroundColor: 'var(--input-bg)', 
                    borderColor: 'var(--border-color)',
                    color: 'var(--primary-text)',
                    focusRingColor: 'var(--accent-color)'
                  }}
                  placeholder="admin@example.com"
                />
              </div>

              {/* PHP Version */}
              <div>
                <label htmlFor="php_version" className="block text-sm font-medium mb-2" style={{ color: 'var(--primary-text)' }}>
                  PHP Version
                </label>
                <select
                  id="php_version"
                  name="php_version"
                  value={formData.php_version}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border transition-all duration-200 focus:ring-2 focus:ring-opacity-50"
                  style={{ 
                    backgroundColor: 'var(--input-bg)', 
                    borderColor: 'var(--border-color)',
                    color: 'var(--primary-text)',
                    focusRingColor: 'var(--accent-color)'
                  }}
                >
                  <option value="7.4">PHP 7.4</option>
                  <option value="8.0">PHP 8.0</option>
                  <option value="8.1">PHP 8.1 (Recommended)</option>
                  <option value="8.2">PHP 8.2</option>
                </select>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t" style={{ borderColor: 'var(--border-color)' }}>
              <Link
                to="/virtual-hosts"
                className="px-6 py-3 rounded-lg border font-medium transition-all duration-200"
                style={{ 
                  backgroundColor: 'var(--secondary-bg)', 
                  borderColor: 'var(--border-color)',
                  color: 'var(--primary-text)'
                }}
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 sm:flex-none px-8 py-3 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ 
                  backgroundColor: saving ? '#6b7280' : 'var(--accent-color)', 
                  color: 'white'
                }}
              >
                {saving ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Updating...
                  </div>
                ) : (
                  'Update Virtual Host'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditVirtualHost; 
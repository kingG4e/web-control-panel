import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { virtualHosts } from '../services/api';
import {
  ServerIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

const SelectHost = () => {
  const navigate = useNavigate();
  const [hosts, setHosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchHosts();
  }, []);

    const fetchHosts = async () => {
      try {
        setLoading(true);
      const data = await virtualHosts.getAll();
      setHosts(data);
        setError(null);
      } catch (err) {
      setError(err.message || 'Failed to fetch virtual hosts');
      } finally {
        setLoading(false);
      }
    };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'text-[var(--success-color)]';
      case 'maintenance':
        return 'text-[var(--warning-color)]';
      case 'suspended':
        return 'text-[var(--danger-color)]';
      default:
        return 'text-[var(--secondary-text)]';
    }
  };

  const getStatusBg = (status) => {
    switch (status) {
      case 'active':
        return { backgroundColor: 'var(--success-color)', opacity: 0.1 };
      case 'maintenance':
        return { backgroundColor: 'var(--warning-color)', opacity: 0.1 };
      case 'suspended':
        return { backgroundColor: 'var(--danger-color)', opacity: 0.1 };
      default:
        return { backgroundColor: 'var(--secondary-bg)' };
    }
  };

  const filteredHosts = hosts.filter(host =>
    host.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
    host.linux_username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectHost = (host) => {
    // Store selected host in localStorage or context
    localStorage.setItem('selectedHost', JSON.stringify(host));
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--primary-bg)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[var(--accent-color)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[var(--secondary-text)]">Loading virtual hosts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--primary-bg)] flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl p-6 text-center" style={{ borderColor: 'var(--danger-color)' }}>
            <ExclamationTriangleIcon className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--danger-color)' }} />
            <h3 className="text-lg font-semibold text-[var(--primary-text)] mb-2">Unable to Load Hosts</h3>
            <p className="text-[var(--secondary-text)] mb-6">{error}</p>
            <button
              onClick={fetchHosts}
              className="inline-flex items-center px-6 py-3 text-white rounded-lg transition-colors font-medium"
              style={{ backgroundColor: 'var(--accent-color)' }}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--primary-bg)]">
      <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[var(--primary-text)] mb-2">
            Select Virtual Host
          </h1>
          <p className="text-[var(--secondary-text)]">
            Choose a virtual host to manage
          </p>
      </div>

      {/* Search */}
      <div className="mb-6">
          <div className="relative max-w-md mx-auto">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[var(--tertiary-text)]" />
          <input
            type="text"
              placeholder="Search hosts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-[var(--secondary-bg)] border border-[var(--border-color)] rounded-lg text-[var(--primary-text)] placeholder-[var(--tertiary-text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent transition-all duration-200"
            />
          </div>
        </div>

        {/* Hosts List */}
        {filteredHosts.length === 0 ? (
          <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] p-12 text-center">
            <ServerIcon className="w-16 h-16 mx-auto mb-4 text-[var(--tertiary-text)]" />
            <h3 className="text-lg font-semibold text-[var(--primary-text)] mb-2">
              {searchTerm ? 'No matching hosts found' : 'No virtual hosts available'}
            </h3>
            <p className="text-[var(--secondary-text)]">
              {searchTerm ? 'Try adjusting your search terms' : 'Create a virtual host to get started'}
            </p>
      </div>
        ) : (
          <div className="space-y-4">
        {filteredHosts.map((host) => (
              <button
            key={host.id}
                onClick={() => handleSelectHost(host)}
                className="w-full bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl p-6 text-left hover:border-[var(--accent-color)] hover:shadow-[var(--shadow-md)] transition-all duration-200 group"
          >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-[var(--primary-text)] group-hover:text-[var(--accent-color)] transition-colors">
                        {host.domain}
                      </h3>
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(host.status)}`}
                        style={getStatusBg(host.status)}
                      >
                        <div className="w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: host.status === 'active' ? 'var(--success-color)' : host.status === 'maintenance' ? 'var(--warning-color)' : 'var(--danger-color)' }}></div>
                        {host.status.charAt(0).toUpperCase() + host.status.slice(1)}
                      </span>
            </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                        <span className="text-[var(--secondary-text)]">User:</span>
                        <span className="text-[var(--primary-text)] ml-2 font-mono">{host.linux_username}</span>
                </div>
                      <div>
                        <span className="text-[var(--secondary-text)]">PHP:</span>
                        <span className="text-[var(--primary-text)] ml-2">{host.php_version || 'N/A'}</span>
              </div>
                      <div>
                        <span className="text-[var(--secondary-text)]">SSL:</span>
                        <span className={`ml-2 ${host.ssl_enabled ? 'text-[var(--success-color)]' : 'text-[var(--warning-color)]'}`}>
                          {host.ssl_enabled ? (
                            <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                          ) : (
                            <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                          <span className="ml-1">{host.ssl_enabled ? 'Enabled' : 'Disabled'}</span>
                        </span>
                </div>
              </div>
            </div>
                  
                  <ChevronRightIcon className="w-5 h-5 text-[var(--tertiary-text)] group-hover:text-[var(--accent-color)] transition-colors" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SelectHost; 
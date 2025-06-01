import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SelectHost = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  
  // Mock data - replace with API call
  const hosts = [
    {
      id: 1,
      domain: 'example.com',
      status: 'active',
      type: 'PHP',
      ssl: true,
      diskUsage: '2.1 GB',
      lastBackup: '2024-02-20',
      thumbnail: null
    },
    {
      id: 2,
      domain: 'test.com',
      status: 'maintenance',
      type: 'Node.js',
      ssl: true,
      diskUsage: '1.5 GB',
      lastBackup: '2024-02-19',
      thumbnail: null
    }
  ];

  const filteredHosts = hosts.filter(host =>
    host.domain.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectHost = (hostId) => {
    navigate(`/host/${hostId}/overview`);
  };

  const StatusBadge = ({ status }) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      maintenance: 'bg-yellow-100 text-yellow-800',
      suspended: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Select Website to Manage</h1>
          <p className="mt-1 text-[var(--text-secondary)]">Choose a website to configure and manage</p>
        </div>
        <button
          onClick={() => navigate('/host/new')}
          className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-dark)] transition-colors flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add New Website
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search websites..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg focus:outline-none focus:border-[var(--primary)] text-[var(--text-primary)]"
          />
          <svg
            className="absolute left-3 top-2.5 h-5 w-5 text-[var(--text-secondary)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* Websites Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredHosts.map((host) => (
          <div
            key={host.id}
            onClick={() => handleSelectHost(host.id)}
            className="bg-[var(--card-bg)] p-6 rounded-xl border border-[var(--border-color)] hover:border-[var(--primary)] cursor-pointer transition-all hover:shadow-lg"
          >
            {/* Website Preview */}
            <div className="aspect-video rounded-lg bg-[var(--secondary-bg)] mb-4 overflow-hidden">
              {host.thumbnail ? (
                <img
                  src={host.thumbnail}
                  alt={host.domain}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg className="w-12 h-12 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                </div>
              )}
            </div>

            {/* Website Info */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-[var(--text-primary)]">{host.domain}</h3>
                <div className="mt-2 flex items-center space-x-2">
                  <StatusBadge status={host.status} />
                  <span className="text-sm text-[var(--text-secondary)]">{host.type}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-[var(--text-secondary)]">
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7" />
                  </svg>
                  {host.diskUsage}
                </div>
                <div className="flex items-center">
                  {host.ssl && (
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SelectHost; 
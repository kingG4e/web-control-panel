import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const VirtualHosts = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Mock data - replace with actual API calls
  const websites = [
    {
      id: 1,
      domain: 'example.com',
      status: 'active',
      type: 'PHP',
      ssl: true,
      diskUsage: '2.1 GB',
      lastBackup: '2024-02-20',
    },
    {
      id: 2,
      domain: 'test.com',
      status: 'maintenance',
      type: 'Node.js',
      ssl: true,
      diskUsage: '1.5 GB',
      lastBackup: '2024-02-19',
    },
    // Add more mock data as needed
  ];

  const filteredWebsites = websites.filter(site => {
    const matchesSearch = site.domain.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || site.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Virtual Hosts</h1>
          <p className="mt-1 text-[var(--text-secondary)]">Manage your websites and domains</p>
        </div>
        <Link
          to="/virtual-hosts/new"
          className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-dark)] transition-colors"
        >
          Add New Website
        </Link>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <input
              type="text"
              placeholder="Search domains..."
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
        <div className="flex gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg focus:outline-none focus:border-[var(--primary)] text-[var(--text-primary)]"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="maintenance">Maintenance</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Websites Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredWebsites.map((site) => (
          <div
            key={site.id}
            className="bg-[var(--card-bg)] p-6 rounded-xl border border-[var(--border-color)] hover:border-[var(--primary)] transition-colors"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-medium text-[var(--text-primary)]">{site.domain}</h3>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center">
                    <StatusBadge status={site.status} />
                    <span className="ml-2 text-sm text-[var(--text-secondary)]">{site.type}</span>
                  </div>
                  <div className="flex items-center text-sm text-[var(--text-secondary)]">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7" />
                    </svg>
                    {site.diskUsage}
                  </div>
                  <div className="flex items-center text-sm text-[var(--text-secondary)]">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Last backup: {site.lastBackup}
                  </div>
      </div>
              </div>
              <div className="flex flex-col items-center space-y-2">
                {site.ssl && (
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                )}
              </div>
              </div>
              <div className="mt-4 flex justify-end space-x-2">
              <button className="px-3 py-1 text-sm bg-[var(--hover-bg)] text-[var(--text-primary)] rounded hover:bg-[var(--hover-bg-dark)] transition-colors">
                Edit
              </button>
              <button className="px-3 py-1 text-sm bg-[var(--primary)] text-white rounded hover:bg-[var(--primary-dark)] transition-colors">
                Manage
                </button>
              </div>
          </div>
        ))}
        </div>
    </div>
  );
};

export default VirtualHosts; 
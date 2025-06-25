import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { virtualHosts } from '../services/api';
import {
  PlusIcon,
  ServerIcon,
  Cog6ToothIcon,
  TrashIcon,
  PlayIcon,
  PauseIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const HostManagement = () => {
  const { hostId, tab = 'overview' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [host, setHost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHostData = async () => {
      if (!hostId) {
        setError('No host ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const hostData = await virtualHosts.get(hostId);
        setHost(hostData);
        setError(null);
      } catch (err) {
        console.error('Error fetching host data:', err);
        setError(err.message || 'Failed to fetch host data');
        // Set default empty state for better UX
        setHost({
    id: hostId,
          domain: 'Unknown',
          status: 'unknown',
          type: 'Unknown',
          ssl: false,
          diskUsage: '0 GB',
          lastBackup: 'Never',
          phpVersion: 'Unknown',
          webServer: 'Unknown',
          documentRoot: '/var/www/html'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchHostData();
  }, [hostId]);

  const tabs = [
    { id: 'overview', name: 'Overview', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    )},
    { id: 'files', name: 'Files', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    )},
    { id: 'dns', name: 'DNS', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
      </svg>
    )},
    { id: 'ssl', name: 'SSL', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    )},
    { id: 'databases', name: 'Databases', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
      </svg>
    )},
    { id: 'users', name: 'Users', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    )},
    { id: 'cron', name: 'Cron Jobs', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )},
    { id: 'logs', name: 'Logs', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )},
    { id: 'settings', name: 'Settings', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )}
  ];

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

  const handleAction = (action, hostId) => {
    console.log(`${action} host ${hostId}`);
    // Implement actual actions here
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--primary-bg)] p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-[var(--hover-bg)] rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-[var(--card-bg)] p-6 rounded-xl border border-[var(--border-color)]">
                  <div className="h-6 bg-[var(--hover-bg)] rounded w-2/3 mb-4"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-[var(--hover-bg)] rounded w-1/2"></div>
                    <div className="h-4 bg-[var(--hover-bg)] rounded w-3/4"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--primary-bg)] p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl p-6 text-center" style={{ borderColor: 'var(--danger-color)' }}>
            <ExclamationTriangleIcon className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--danger-color)' }} />
            <h3 className="text-lg font-semibold text-[var(--primary-text)] mb-2">Error Loading Host</h3>
            <p className="text-[var(--secondary-text)] mb-6">{error}</p>
            <button
              onClick={() => {
                // Implement retry logic here
              }}
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
      {/* Top Bar */}
      <div className="bg-[var(--card-bg)] border-b border-[var(--border-color)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/')}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div className="ml-4">
                <h1 className="text-lg font-medium text-[var(--text-primary)]">{host.domain}</h1>
                <div className="flex items-center mt-1">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(host.status)}`}
                    style={getStatusBg(host.status)}
                  >
                    <div className="w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: host.status === 'active' ? 'var(--success-color)' : host.status === 'maintenance' ? 'var(--warning-color)' : 'var(--danger-color)' }}></div>
                    {host.status.charAt(0).toUpperCase() + host.status.slice(1)}
                  </span>
                  <span className="ml-2 text-sm text-[var(--text-secondary)]">{host.type}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors">
                Start
              </button>
              <button className="px-3 py-1 text-sm bg-[var(--danger-color)] text-white rounded hover:bg-red-600 transition-colors">
                Stop
              </button>
              <button className="px-3 py-1 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors">
                Restart
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-[var(--card-bg)] border-b border-[var(--border-color)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-4" aria-label="Tabs">
            {tabs.map((tabItem) => {
              const isActive = tab === tabItem.id;
              return (
                <Link
                  key={tabItem.id}
                  to={`/host/${hostId}/${tabItem.id}`}
                  className={`
                    flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                    ${isActive 
                      ? 'bg-[var(--primary)] text-white' 
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)]'
                    }
                  `}
                >
                  {tabItem.icon}
                  <span className="ml-2">{tabItem.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {tab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Quick Stats */}
            <div className="bg-[var(--card-bg)] p-6 rounded-xl border border-[var(--border-color)]">
              <h2 className="text-lg font-medium text-[var(--text-primary)] mb-4">Quick Stats</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-secondary)]">Disk Usage</span>
                  <div className="flex items-center">
                    <div className="w-48 h-2 bg-[var(--hover-bg)] rounded-full overflow-hidden">
                      <div className="h-full bg-[var(--primary)]" style={{ width: '45%' }}></div>
                    </div>
                    <span className="ml-3 text-[var(--text-secondary)]">{host.diskUsage}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-secondary)]">Last Backup</span>
                  <span className="text-[var(--text-primary)]">{host.lastBackup}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-secondary)]">PHP Version</span>
                  <span className="text-[var(--text-primary)]">{host.phpVersion}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-secondary)]">Web Server</span>
                  <span className="text-[var(--text-primary)]">{host.webServer}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-[var(--card-bg)] p-6 rounded-xl border border-[var(--border-color)]">
              <h2 className="text-lg font-medium text-[var(--text-primary)] mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 gap-4">
                <button className="flex items-center justify-center px-4 py-2 bg-[var(--hover-bg)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--hover-bg-dark)] transition-colors">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Backup Now
                </button>
                <button className="flex items-center justify-center px-4 py-2 bg-[var(--hover-bg)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--hover-bg-dark)] transition-colors">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Open Website
                </button>
                <button className="flex items-center justify-center px-4 py-2 bg-[var(--hover-bg)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--hover-bg-dark)] transition-colors">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Config
                </button>
                <button className="flex items-center justify-center px-4 py-2 bg-[var(--hover-bg)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--hover-bg-dark)] transition-colors">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  SSL Status
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HostManagement; 
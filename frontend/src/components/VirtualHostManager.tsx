import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CogIcon, 
  GlobeAltIcon, 
  ShieldCheckIcon, 
  PlusIcon,
  ChartBarIcon,
  ClockIcon,
  ServerIcon,
  CodeBracketIcon,
  ArrowTopRightOnSquareIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import { virtualHosts } from '../services/api';

const VirtualHostManager = () => {
  const navigate = useNavigate();
  const [hosts, setHosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchVirtualHosts();
  }, []);

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

  const handleSettings = (host: any) => {
    navigate(`/virtual-hosts/${host.id}/edit`);
  };

  const handleViewSite = (host: any) => {
    window.open(`http://${host.domain}`, '_blank');
  };

  const handleSSLSettings = (host: any) => {
    console.log('SSL Settings:', host);
  };

  const handleDelete = async (hostId: number) => {
    if (!window.confirm('Are you sure you want to delete this virtual host?')) {
      return;
    }

    try {
      await virtualHosts.delete(hostId);
      await fetchVirtualHosts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete virtual host');
    }
  };

  // Filter hosts based on search and status
  const filteredHosts = hosts.filter(host => {
    const matchesSearch = host.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         host.linux_username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || host.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-[var(--success-color)]';
      case 'maintenance':
        return 'text-[var(--warning-color)]';
      default:
        return 'text-[var(--danger-color)]';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--success-color)' }} />;
      case 'maintenance':
        return <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--warning-color)' }} />;
      default:
        return <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--danger-color)' }} />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--primary-bg)] p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header Skeleton */}
        <div className="flex justify-between items-center">
            <div className="space-y-2">
              <div className="h-8 bg-[var(--hover-bg)] rounded-lg w-64 animate-pulse"></div>
              <div className="h-4 bg-[var(--hover-bg)] rounded w-96 animate-pulse"></div>
            </div>
            <div className="w-40 h-11 bg-[var(--hover-bg)] rounded-lg animate-pulse"></div>
        </div>
          
          {/* Stats Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-[var(--card-bg)] p-6 rounded-xl border border-[var(--border-color)] animate-pulse">
                <div className="h-4 bg-[var(--hover-bg)] rounded w-20 mb-2"></div>
                <div className="h-8 bg-[var(--hover-bg)] rounded w-16"></div>
              </div>
            ))}
          </div>

          {/* Cards Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-[var(--card-bg)] p-8 rounded-xl border border-[var(--border-color)] animate-pulse">
                <div className="h-6 bg-[var(--hover-bg)] rounded w-1/3 mb-4"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-[var(--hover-bg)] rounded w-1/2"></div>
                  <div className="h-4 bg-[var(--hover-bg)] rounded w-3/4"></div>
                  <div className="h-4 bg-[var(--hover-bg)] rounded w-2/3"></div>
              </div>
            </div>
          ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--primary-bg)] p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] p-8 text-center" style={{ borderColor: 'var(--danger-color)' }}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'var(--danger-color)', opacity: 0.1 }}>
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--danger-color)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            </div>
            <h3 className="text-lg font-semibold text-[var(--primary-text)] mb-2">Unable to Load Virtual Hosts</h3>
            <p className="text-[var(--secondary-text)] mb-6">{error}</p>
            <button
              onClick={fetchVirtualHosts}
              className="inline-flex items-center px-6 py-3 text-white rounded-lg transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
              style={{ backgroundColor: 'var(--accent-color)' }}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const stats = {
    total: hosts.length,
    active: hosts.filter(h => h.status === 'active').length,
    maintenance: hosts.filter(h => h.status === 'maintenance').length,
    inactive: hosts.filter(h => h.status !== 'active' && h.status !== 'maintenance').length
  };

  return (
    <div className="min-h-screen bg-[var(--primary-bg)]">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center space-y-4 lg:space-y-0">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-[var(--primary-text)]">
              Virtual Hosts
            </h1>
            <p className="text-[var(--secondary-text)] text-lg">
              Manage your web hosting environments with enterprise-grade controls
            </p>
          </div>
        <button
          onClick={() => navigate('/virtual-hosts/new')}
            className="inline-flex items-center px-6 py-3 text-white rounded-xl transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            style={{ backgroundColor: 'var(--accent-color)' }}
        >
            <PlusIcon className="w-5 h-5 mr-2" />
            Create Virtual Host
        </button>
      </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-[var(--card-bg)] p-6 rounded-xl border border-[var(--border-color)] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--secondary-text)]">Total Hosts</p>
                <p className="text-2xl font-bold text-[var(--primary-text)]">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-[var(--accent-color)] bg-opacity-20 rounded-lg flex items-center justify-center">
                <ServerIcon className="w-6 h-6" style={{ color: 'var(--accent-color)' }} />
              </div>
            </div>
          </div>

          <div className="bg-[var(--card-bg)] p-6 rounded-xl border border-[var(--border-color)] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--secondary-text)]">Active</p>
                <p className="text-2xl font-bold text-[var(--primary-text)]">{stats.active}</p>
              </div>
              <div className="w-12 h-12 bg-[var(--success-color)] bg-opacity-20 rounded-lg flex items-center justify-center">
                <ChartBarIcon className="w-6 h-6" style={{ color: 'var(--success-color)' }} />
              </div>
            </div>
          </div>

          <div className="bg-[var(--card-bg)] p-6 rounded-xl border border-[var(--border-color)] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--secondary-text)]">Maintenance</p>
                <p className="text-2xl font-bold text-[var(--primary-text)]">{stats.maintenance}</p>
              </div>
              <div className="w-12 h-12 bg-[var(--warning-color)] bg-opacity-20 rounded-lg flex items-center justify-center">
                <ClockIcon className="w-6 h-6" style={{ color: 'var(--warning-color)' }} />
              </div>
            </div>
          </div>

          <div className="bg-[var(--card-bg)] p-6 rounded-xl border border-[var(--border-color)] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--secondary-text)]">Inactive</p>
                <p className="text-2xl font-bold text-[var(--primary-text)]">{stats.inactive}</p>
              </div>
              <div className="w-12 h-12 bg-[var(--danger-color)] bg-opacity-20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--danger-color)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] p-6 shadow-[var(--shadow-sm)]">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[var(--tertiary-text)]" />
                <input
                  type="text"
                  placeholder="Search domains or usernames..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[var(--secondary-bg)] border border-[var(--border-color)] rounded-lg text-[var(--primary-text)] placeholder-[var(--tertiary-text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent transition-all duration-200"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <FunnelIcon className="w-5 h-5 text-[var(--secondary-text)]" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 bg-[var(--secondary-bg)] border border-[var(--border-color)] rounded-lg text-[var(--primary-text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent transition-all duration-200"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              
              <div className="text-sm text-[var(--secondary-text)]">
                {filteredHosts.length} of {hosts.length} hosts
              </div>
            </div>
          </div>
        </div>

        {/* Virtual Hosts Grid */}
        {filteredHosts.length === 0 ? (
          <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] p-12 text-center">
            <div className="w-16 h-16 bg-[var(--secondary-bg)] rounded-full flex items-center justify-center mx-auto mb-4">
              <ServerIcon className="w-8 h-8 text-[var(--tertiary-text)]" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--primary-text)] mb-2">
              {searchTerm || filterStatus !== 'all' ? 'No matching hosts found' : 'No virtual hosts yet'}
            </h3>
            <p className="text-[var(--secondary-text)] mb-6">
              {searchTerm || filterStatus !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'Create your first virtual host to get started with web hosting'
              }
            </p>
            {(!searchTerm && filterStatus === 'all') && (
            <button
              onClick={() => navigate('/virtual-hosts/new')}
                className="inline-flex items-center px-6 py-3 text-white rounded-lg transition-all duration-200 font-medium"
                style={{ backgroundColor: 'var(--accent-color)' }}
            >
                <PlusIcon className="w-5 h-5 mr-2" />
                Create Virtual Host
            </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredHosts.map((host) => (
              <div key={host.id} className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] p-8 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-all duration-200 group">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-bold text-[var(--primary-text)] group-hover:text-[var(--accent-color)] transition-colors">
                        {host.domain}
                      </h3>
                      <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(host.status)}`}>
                        {getStatusIcon(host.status)}
                        <span className="ml-1.5 capitalize">{host.status}</span>
                      </div>
                   </div>
                    <div className="flex items-center space-x-2 text-sm text-[var(--secondary-text)]">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>{host.linux_username}</span>
                    </div>
                </div>
                  
                  <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleViewSite(host)}
                      className="p-2 text-[var(--secondary-text)] hover:text-[var(--accent-color)] hover:bg-[var(--hover-bg)] rounded-lg transition-all duration-200"
                    title="View Site"
                  >
                      <ArrowTopRightOnSquareIcon className="w-5 h-5" />
                  </button>
                  <button
                      onClick={() => handleSettings(host)}
                      className="p-2 text-[var(--secondary-text)] hover:text-[var(--accent-color)] hover:bg-[var(--hover-bg)] rounded-lg transition-all duration-200"
                      title="Settings"
                    >
                      <CogIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(host.id)}
                      className="p-2 text-[var(--secondary-text)] hover:text-[var(--danger-color)] hover:bg-[var(--hover-bg)] rounded-lg transition-all duration-200"
                    title="Delete"
                  >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[var(--secondary-bg)] p-4 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <svg className="w-4 h-4 text-[var(--secondary-text)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                        <span className="text-xs font-medium text-[var(--secondary-text)] uppercase tracking-wide">Document Root</span>
                      </div>
                      <p className="text-sm font-mono text-[var(--primary-text)] break-all">
                        {host.document_root}
                      </p>
                    </div>
                    
                    <div className="bg-[var(--secondary-bg)] p-4 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <CodeBracketIcon className="w-4 h-4 text-[var(--secondary-text)]" />
                        <span className="text-xs font-medium text-[var(--secondary-text)] uppercase tracking-wide">Config</span>
                      </div>
                      <p className="text-sm font-mono text-[var(--primary-text)] break-all">
                        {host.config_file}
                      </p>
                    </div>
                  </div>

                  <div className="bg-[var(--secondary-bg)] p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <ShieldCheckIcon className="w-4 h-4 text-[var(--secondary-text)]" />
                        <span className="text-sm font-medium text-[var(--secondary-text)]">SSL Certificate</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          host.ssl_enabled 
                            ? 'text-[var(--success-color)]' 
                            : 'text-[var(--warning-color)]'
                        }`} style={{ backgroundColor: host.ssl_enabled ? 'var(--success-color)' : 'var(--warning-color)', opacity: 0.2 }}>
                          {host.ssl_enabled ? 'Enabled' : 'Disabled'}
                        </span>
                        <button
                          onClick={() => handleSSLSettings(host)}
                          className="text-[var(--accent-color)] hover:text-[var(--accent-hover)] text-sm font-medium transition-colors"
                        >
                          Configure
                  </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            </div>
        )}
      </div>
    </div>
  );
};

export default VirtualHostManager; 
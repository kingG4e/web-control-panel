import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  ChartBarIcon, 
  ServerIcon, 
  DatabaseIcon, 
  GlobeAltIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  DocumentTextIcon,
  CpuChipIcon,
  CircleStackIcon,
  ClockIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { system, virtualHosts as vhostApi } from '../services/api';
import QuotaDashboard from '../components/QuotaDashboard';

// Inline SVG Icons
const ServerIconSVG = ({ className, style }) => (
  <svg className={className} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
  </svg>
);

const CircleStackIconSVG = ({ className, style }) => (
  <svg className={className} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
  </svg>
);

const EnvelopeIcon = ({ className, style }) => (
  <svg className={className} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const ShieldCheckIconSVG = ({ className, style }) => (
  <svg className={className} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const FolderIcon = ({ className, style }) => (
  <svg className={className} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
  </svg>
);

const CheckCircleIconSVG = ({ className, style }) => (
  <svg className={className} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ExclamationTriangleIconSVG = ({ className, style }) => (
  <svg className={className} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const ArrowPathIconSVG = ({ className, style }) => (
  <svg className={className} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const ExclamationCircleIcon = ({ className, style }) => (
  <svg className={className} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ChartBarIconSVG = ({ className, style }) => (
  <svg className={className} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const CpuChipIconSVG = ({ className, style }) => (
  <svg className={className} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
  </svg>
);

const ClockIconSVG = ({ className, style }) => (
  <svg className={className} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CloudArrowUpIcon = ({ className, style }) => (
  <svg className={className} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
);

const CloudArrowDownIcon = ({ className, style }) => (
  <svg className={className} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 11l3 3m0 0l3-3m-3 3V8" />
  </svg>
);

const SignalIcon = ({ className, style }) => (
  <svg className={className} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.348 14.651a3.75 3.75 0 010-5.303m5.304 0a3.75 3.75 0 010 5.303m-7.425 2.122a7.5 7.5 0 010-10.606m9.546 0a7.5 7.5 0 010 10.606M12 12h.008v.008H12V12zm0 0h.008v.008H12V12z" />
  </svg>
);

const PlayIcon = ({ className, style }) => (
  <svg className={className} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M16 14h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const StopIcon = ({ className, style }) => (
  <svg className={className} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
  </svg>
);

const Dashboard = () => {
  const { user } = useAuth();
  const isPendingOnly = user && user.role === 'user' && !user.is_admin && user.username !== 'root' && user.is_active === false;
  const [dashboardData, setDashboardData] = useState({
    stats: {
      virtualHosts: 0,
      databases: 0,
      emailAccounts: 0,
      dnsRecords: 0,
      sslCertificates: 0,
      
      isAdmin: false
    },
    systemStatus: {
      cpu: 0,
      memory: 0,
      disk: 0,
      uptime: 0,
      loadAverage: [],
      networkStats: { upload: 0, download: 0 }
    },
    services: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Memoize the fetch function to prevent unnecessary re-renders
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Combine all API calls using Promise.allSettled for better error handling
      const [statsResult, systemResult, servicesResult] = await Promise.allSettled([
        system.getStats(),
        system.getSystemStats(),
        system.getServices()
      ]);

      const newData = { ...dashboardData };

      // Handle stats
      if (statsResult.status === 'fulfilled' && statsResult.value.success) {
        newData.stats = statsResult.value.data;
      } else if (statsResult.status === 'rejected') {
        console.error('Failed to fetch stats:', statsResult.reason);
      }

      // Fallback: if virtualHosts is 0, try to compute from list API
      try {
        if (!newData.stats || !Number.isFinite(newData.stats.virtualHosts) || newData.stats.virtualHosts === 0) {
          const vhosts = await vhostApi.getAll().catch(() => []);
          if (Array.isArray(vhosts)) {
            newData.stats = {
              ...newData.stats,
              virtualHosts: vhosts.length || 0
            };
          }
        }
      } catch (e) {
        // ignore fallback errors
      }

      // Handle system status
      if (systemResult.status === 'fulfilled' && systemResult.value.success) {
        newData.systemStatus = systemResult.value.data;
      } else if (systemResult.status === 'rejected') {
        console.error('Failed to fetch system stats:', systemResult.reason);
      }

      // Handle services
      if (servicesResult.status === 'fulfilled' && servicesResult.value.success) {
        newData.services = servicesResult.value.data || [];
      } else if (servicesResult.status === 'rejected') {
        console.error('Failed to fetch services:', servicesResult.reason);
      }

      setDashboardData(newData);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load and periodic refresh
  useEffect(() => {
    fetchDashboardData();
    
    // Set up periodic refresh (reduced frequency to 60 seconds)
    const interval = setInterval(fetchDashboardData, 60000);
    
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  // Memoize computed values
  const { stats, systemStatus, services } = dashboardData;
  
  const serviceStatusCounts = useMemo(() => {
    return services.reduce((acc, service) => {
      acc[service.status] = (acc[service.status] || 0) + 1;
      return acc;
    }, {});
  }, [services]);

  const systemHealthScore = useMemo(() => {
    const cpuScore = Math.max(0, 100 - systemStatus.cpu);
    const memoryScore = Math.max(0, 100 - systemStatus.memory);
    const diskScore = Math.max(0, 100 - systemStatus.disk);
    return Math.round((cpuScore + memoryScore + diskScore) / 3);
  }, [systemStatus]);

  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const StatCard = ({ title, value, subtitle, icon, color }) => (
    <div style={{
      backgroundColor: 'var(--card-bg)',
      borderRadius: '12px',
      padding: '24px',
      border: '1px solid var(--border-color)',
      transition: 'all 0.2s ease',
      cursor: 'pointer'
    }}
    onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
    onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ 
            fontSize: '14px', 
            fontWeight: '500', 
            color: 'var(--secondary-text)', 
            margin: '0 0 8px 0',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            {title}
          </h3>
          <p style={{ 
            fontSize: '32px', 
            fontWeight: 'bold', 
            color: 'var(--primary-text)', 
            margin: '0 0 4px 0' 
          }}>
            {loading ? '...' : value}
          </p>
          <p style={{ 
            fontSize: '12px', 
            color: 'var(--secondary-text)', 
            margin: 0 
          }}>
            {subtitle}
          </p>
        </div>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          backgroundColor: `${color}20`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {icon}
        </div>
      </div>
    </div>
  );

  const ProgressBar = ({ value, color }) => (
    <div style={{
      width: '100%',
      height: '8px',
      backgroundColor: 'var(--secondary-bg)',
      borderRadius: '4px',
      overflow: 'hidden'
    }}>
      <div style={{
        width: `${Math.min(value, 100)}%`,
        height: '100%',
        backgroundColor: color,
        transition: 'width 0.3s ease'
      }} />
            </div>
  );

  const ServiceStatus = ({ service }) => {
    // Add debugging
    // console.log('ServiceStatus component received service:', service);  // Hidden
    
    return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
      <span style={{ color: 'var(--primary-text)', fontSize: '14px' }}>{service.name}</span>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: service.status === 'running' ? '#22c55e' : '#ef4444'
        }} />
        <span style={{ 
          color: 'var(--secondary-text)', 
          fontSize: '12px',
          textTransform: 'capitalize'
        }}>
          {service.status || 'unknown'}
        </span>
              </div>
            </div>
    );
  };

  if (error) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--primary-bg)', padding: '24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{
            backgroundColor: 'var(--card-bg)',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid #ef4444',
            textAlign: 'center'
          }}>
            <h2 style={{ color: '#ef4444', marginBottom: '16px' }}>Error Loading Dashboard</h2>
            <p style={{ color: 'var(--secondary-text)', marginBottom: '16px' }}>{error}</p>
            <button
              onClick={fetchDashboardData}
              style={{
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                cursor: 'pointer'
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }



  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--primary-bg)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ 
            fontSize: '28px', 
            fontWeight: 'bold', 
            color: 'var(--primary-text)', 
            marginBottom: '8px' 
          }}>
            {stats.isAdmin ? 'Admin Dashboard' : 'Dashboard'}
          </h1>
          <p style={{ color: 'var(--secondary-text)', fontSize: '16px' }}>
            {stats.isAdmin 
              ? 'Welcome back, Administrator. You have full system access.'
              : `Welcome back, ${user?.username || 'User'}. Manage your resources below.`
            }
          </p>
        </div>

        {/* User Quota Card - only for non-admins */}
        {user && !user.is_admin && (
            <div className="mb-8">
                <QuotaDashboard />
            </div>
        )}

        {/* Admin Notice */}
        {stats.isAdmin && (
          <div style={{
            backgroundColor: 'var(--card-bg)',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '32px',
            border: '1px solid #f59e0b',
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
              <ShieldCheckIconSVG style={{ width: '24px', height: '24px', color: '#f59e0b', marginRight: '12px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--primary-text)', margin: 0 }}>
                Administrator Access
              </h3>
            </div>
            <p style={{ color: 'var(--secondary-text)', marginBottom: '16px' }}>
              You have full administrative privileges. You can view and manage all users' resources.
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                style={{
                  backgroundColor: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
                onClick={() => window.location.href = '/admin/users'}
              >
                Manage Users
              </button>
              <button
                style={{
                  backgroundColor: 'transparent',
                  color: '#f59e0b',
                  border: '1px solid #f59e0b',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
                onClick={() => window.location.href = '/admin/virtual-hosts'}
              >
                All Virtual Hosts
              </button>
              <button
                style={{
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
                onClick={() => window.location.href = '/admin/approvals'}
              >
                Signup Approvals
              </button>
            </div>
          </div>
      )}

      {/* Stats Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
          gap: '24px',
          marginBottom: '32px' 
        }}>
        <StatCard
          title="Virtual Hosts"
            value={stats.virtualHosts}
            subtitle={stats.isAdmin ? "Total in system" : "Your domains"}
            icon={<ServerIconSVG style={{ width: '24px', height: '24px', color: '#60a5fa' }} />}
            color="#60a5fa"
        />
        <StatCard
          title="Databases"
            value={stats.databases}
            subtitle={stats.isAdmin ? "Total databases" : "Your databases"}
            icon={<CircleStackIconSVG style={{ width: '24px', height: '24px', color: '#34d399' }} />}
            color="#34d399"
        />
        <StatCard
          title="Email Accounts"
            value={stats.emailAccounts}
            subtitle={stats.isAdmin ? "Total accounts" : "Your accounts"}
            icon={<EnvelopeIcon style={{ width: '24px', height: '24px', color: '#fbbf24' }} />}
            color="#fbbf24"
        />
        <StatCard
          title="SSL Certificates"
            value={stats.sslCertificates}
            subtitle={stats.isAdmin ? "Total certificates" : "Your certificates"}
            icon={<ShieldCheckIconSVG style={{ width: '24px', height: '24px', color: '#f87171' }} />}
            color="#f87171"
        />
      </div>

        {/* System Resources */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
          gap: '24px' 
        }}>
          <div style={{
            backgroundColor: 'var(--card-bg)',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid var(--border-color)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
              <CpuChipIconSVG style={{ width: '24px', height: '24px', color: '#60a5fa', marginRight: '12px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--primary-text)', margin: 0 }}>
                System Resources
              </h3>
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--secondary-text)', fontSize: '14px' }}>CPU Usage</span>
                <span style={{ color: 'var(--primary-text)', fontSize: '14px', fontWeight: '500' }}>
                  {systemStatus.cpu || 0}%
                </span>
              </div>
              <ProgressBar value={systemStatus.cpu || 0} color="#60a5fa" />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--secondary-text)', fontSize: '14px' }}>Memory Usage</span>
                <span style={{ color: 'var(--primary-text)', fontSize: '14px', fontWeight: '500' }}>
                  {systemStatus.memory || 0}%
                </span>
              </div>
              <ProgressBar value={systemStatus.memory || 0} color="#34d399" />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--secondary-text)', fontSize: '14px' }}>Disk Usage</span>
                <span style={{ color: 'var(--primary-text)', fontSize: '14px', fontWeight: '500' }}>
                  {systemStatus.disk || 0}%
                </span>
              </div>
              <ProgressBar value={systemStatus.disk || 0} color="#f87171" />
            </div>

            <div style={{ 
              marginTop: '20px', 
              paddingTop: '16px', 
              borderTop: '1px solid var(--border-color)',
              fontSize: '14px',
              color: 'var(--secondary-text)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>Uptime:</span>
                <span style={{ color: 'var(--primary-text)' }}>{formatUptime(systemStatus.uptime || 0)}</span>
          </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Load Average:</span>
                <span style={{ color: 'var(--primary-text)' }}>
                  {(systemStatus.loadAverage || []).join(', ') || '0.00, 0.00, 0.00'}
                </span>
              </div>
            </div>
          </div>

          <div style={{
            backgroundColor: 'var(--card-bg)',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid var(--border-color)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--primary-text)', margin: 0 }}>
                Service Status
              </h3>
              <button
                onClick={() => {
                  // console.log('Manual refresh triggered');  // Hidden
                  fetchDashboardData();
                }}
                style={{
                  backgroundColor: '#60a5fa',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <ArrowPathIconSVG style={{ width: '14px', height: '14px' }} />
                Refresh
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* console.log('Rendering services, current services state:', services) */}
              {services.length > 0 ? (
              services.map((service, index) => {
                // console.log(`Rendering service ${index}:`, service);  // Hidden
                return <ServiceStatus key={`${service.name}-${index}`} service={service} />;
              })
            ) : (
                <div style={{ textAlign: 'center', color: 'var(--secondary-text)', padding: '20px' }}>
                  {loading ? 'Loading services...' : 'No services data available'}
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default Dashboard; 
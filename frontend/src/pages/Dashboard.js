import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  ServerIcon,
  CircleStackIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  FolderIcon,
  ChartBarIcon,
  CpuChipIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorAlert from '../components/common/ErrorAlert';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [systemStats, setSystemStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const [statsRes, systemStatsRes, activitiesRes] = await Promise.all([
          axios.get('/api/stats'),
          axios.get('/api/system-stats'),
          axios.get('/api/recent-activities')
        ]);

        setStats([
          { name: 'Virtual Hosts', value: statsRes.data.virtualHosts, icon: ServerIcon, link: '/virtual-hosts' },
          { name: 'Databases', value: statsRes.data.databases, icon: CircleStackIcon, link: '/database' },
          { name: 'Email Accounts', value: statsRes.data.emailAccounts, icon: EnvelopeIcon, link: '/email' },
          { name: 'DNS Records', value: statsRes.data.dnsRecords, icon: GlobeAltIcon, link: '/dns' },
          { name: 'SSL Certificates', value: statsRes.data.sslCerts, icon: ShieldCheckIcon, link: '/ssl' },
          { name: 'FTP Accounts', value: statsRes.data.ftpAccounts, icon: FolderIcon, link: '/ftp' },
        ]);

        setSystemStats([
          { name: 'CPU Usage', value: systemStatsRes.data.cpuUsage, icon: CpuChipIcon },
          { name: 'Memory Usage', value: systemStatsRes.data.memoryUsage, icon: ChartBarIcon },
          { name: 'Disk Usage', value: systemStatsRes.data.diskUsage, icon: CircleStackIcon },
        ]);

        setRecentActivity(activitiesRes.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
    
    // Set up polling for system stats
    const pollInterval = setInterval(() => {
      axios.get('/api/system-stats')
        .then(res => {
          setSystemStats([
            { name: 'CPU Usage', value: res.data.cpuUsage, icon: CpuChipIcon },
            { name: 'Memory Usage', value: res.data.memoryUsage, icon: ChartBarIcon },
            { name: 'Disk Usage', value: res.data.diskUsage, icon: CircleStackIcon },
          ]);
        })
        .catch(err => console.error('Failed to update system stats:', err));
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(pollInterval);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return <ErrorAlert message={error} />;
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold text-[var(--primary-text)]">Welcome Back!</h1>
        <p className="text-[var(--secondary-text)]">Here's what's happening with your server</p>
      </div>
      
      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {stats.map((item) => (
          <a
            key={item.name}
            href={item.link}
            className="stats-card group"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0 p-3 bg-[var(--accent-color)]/10 rounded-lg">
                <item.icon
                  className="h-6 w-6 md:h-8 md:w-8 stat-icon"
                  aria-hidden="true"
                />
              </div>
              <div className="ml-4 md:ml-5 min-w-0 flex-1">
                <dl>
                  <dt className="stat-label truncate text-sm">
                    {item.name}
                  </dt>
                  <dd className="stat-value mt-1 md:mt-2 text-xl md:text-3xl">
                    {item.value}
                  </dd>
                </dl>
              </div>
            </div>
          </a>
        ))}
      </div>

      {/* System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* System Resources */}
        <div className="card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-semibold text-[var(--primary-text)]">System Resources</h2>
              <p className="text-sm text-[var(--secondary-text)]">Current resource utilization</p>
            </div>
            <button className="btn-secondary shrink-0">View Details</button>
          </div>
          <div className="space-y-4">
            {/* Resource Meters */}
            <div className="space-y-3">
              {systemStats.map((resource) => (
                <div key={resource.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--secondary-text)]">{resource.name}</span>
                    <span className="text-[var(--primary-text)] font-medium">{resource.value}%</span>
                  </div>
                  <div className="h-2 bg-[var(--border-color)] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        parseInt(resource.value) > 80 
                          ? 'bg-red-500' 
                          : parseInt(resource.value) > 60 
                            ? 'bg-yellow-500' 
                            : 'bg-[var(--accent-color)]'
                      }`}
                      style={{ width: `${resource.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-semibold text-[var(--primary-text)]">Recent Activity</h2>
              <p className="text-sm text-[var(--secondary-text)]">Latest system events</p>
            </div>
            <button className="btn-secondary shrink-0">View All</button>
          </div>
          <div className="space-y-4">
            {recentActivity.length === 0 ? (
              <div className="text-center py-8 text-[var(--secondary-text)]">
                No recent activity
              </div>
            ) : (
              recentActivity.map((activity, index) => (
                <div
                  key={activity.id}
                  className={`flex items-start gap-4 ${
                    index !== recentActivity.length - 1 ? 'pb-4 border-b border-[var(--border-color)]' : ''
                  }`}
                >
                  <div className={`p-2 rounded-lg ${
                    activity.status === 'success' 
                      ? 'bg-green-500' 
                      : activity.status === 'warning'
                        ? 'bg-yellow-500'
                        : activity.status === 'error'
                          ? 'bg-red-500'
                          : 'bg-[var(--accent-color)]'
                  }`}>
                    {activity.status === 'success' ? (
                      <CheckCircleIcon className="w-5 h-5 text-white" />
                    ) : activity.status === 'warning' ? (
                      <ExclamationCircleIcon className="w-5 h-5 text-white" />
                    ) : activity.status === 'error' ? (
                      <XCircleIcon className="w-5 h-5 text-white" />
                    ) : (
                      <InformationCircleIcon className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--primary-text)] line-clamp-2">
                      {activity.action}
                    </p>
                    <p className="mt-1 text-xs text-[var(--secondary-text)]">
                      {activity.description}
                    </p>
                    <p className="mt-1 text-xs text-[var(--tertiary-text)]">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 
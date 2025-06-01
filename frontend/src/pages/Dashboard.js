import React from 'react';
import { Link } from 'react-router-dom';
import {
  ServerIcon,
  CircleStackIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  FolderIcon,
  ChartBarIcon,
  CpuChipIcon,
} from '@heroicons/react/24/outline';

const stats = [
  { name: 'Virtual Hosts', value: '12', icon: ServerIcon, link: '/virtual-hosts' },
  { name: 'Databases', value: '8', icon: CircleStackIcon, link: '/database' },
  { name: 'Email Accounts', value: '24', icon: EnvelopeIcon, link: '/email' },
  { name: 'DNS Records', value: '48', icon: GlobeAltIcon, link: '/dns' },
  { name: 'SSL Certificates', value: '6', icon: ShieldCheckIcon, link: '/ssl' },
  { name: 'FTP Accounts', value: '15', icon: FolderIcon, link: '/ftp' },
];

const systemStats = [
  { name: 'CPU Usage', value: '24%', icon: CpuChipIcon },
  { name: 'Memory Usage', value: '42%', icon: ChartBarIcon },
  { name: 'Disk Usage', value: '68%', icon: CircleStackIcon },
];

const recentActivity = [
  {
    id: 1,
    action: 'Virtual Host Created',
    description: 'example.com was created successfully',
    status: 'success',
    timestamp: '2 minutes ago',
  },
  {
    id: 2,
    action: 'Database Backup',
    description: 'Automatic backup completed',
    status: 'success',
    timestamp: '1 hour ago',
  },
  {
    id: 3,
    action: 'SSL Certificate',
    description: 'Certificate renewed for mail.example.com',
    status: 'success',
    timestamp: '3 hours ago',
  },
];

const StatCard = ({ title, value, icon, trend, link }) => (
  <Link to={link} className="bg-[var(--card-bg)] p-6 rounded-xl border border-[var(--border-color)] hover:border-[var(--primary)] transition-colors">
    <div className="flex items-start justify-between">
      <div>
        <h3 className="text-[var(--text-secondary)] text-sm font-medium">{title}</h3>
        <div className="mt-2 flex items-baseline">
          <p className="text-2xl font-semibold text-[var(--text-primary)]">{value}</p>
          {trend && (
            <span className={`ml-2 text-sm font-medium ${trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
              {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </span>
          )}
        </div>
      </div>
      <div className="p-2 bg-[var(--primary)] bg-opacity-10 rounded-lg">
        {icon}
      </div>
    </div>
  </Link>
);

const QuickAction = ({ title, description, icon, link }) => (
  <Link to={link} className="flex items-start p-4 rounded-lg hover:bg-[var(--hover-bg)] transition-colors">
    <div className="flex-shrink-0 p-2 bg-[var(--primary)] bg-opacity-10 rounded-lg">
      {icon}
    </div>
    <div className="ml-4">
      <h3 className="text-[var(--text-primary)] font-medium">{title}</h3>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">{description}</p>
    </div>
  </Link>
);

const Dashboard = () => {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
    <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Dashboard</h1>
          <p className="mt-1 text-[var(--text-secondary)]">Overview of your server and websites</p>
        </div>
        <div className="flex space-x-3">
          <button className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-dark)] transition-colors">
            Add Website
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Websites"
          value="12"
          trend={5}
          link="/virtual-hosts"
          icon={
            <svg className="w-6 h-6 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
          }
        />
        <StatCard
          title="Databases"
          value="8"
          link="/database"
          icon={
            <svg className="w-6 h-6 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
          }
        />
        <StatCard
          title="DNS Zones"
          value="15"
          link="/dns"
          icon={
            <svg className="w-6 h-6 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
        />
        <StatCard
          title="SSL Certificates"
          value="10"
          trend={2}
          link="/ssl"
          icon={
            <svg className="w-6 h-6 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          }
        />
      </div>

      {/* System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[var(--card-bg)] p-6 rounded-xl border border-[var(--border-color)]">
          <h2 className="text-lg font-medium text-[var(--text-primary)]">System Status</h2>
          <div className="mt-4 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[var(--text-secondary)]">CPU Usage</span>
              <div className="flex items-center">
                <div className="w-48 h-2 bg-[var(--hover-bg)] rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--primary)]" style={{ width: '45%' }}></div>
                </div>
                <span className="ml-3 text-[var(--text-secondary)]">45%</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--text-secondary)]">Memory Usage</span>
              <div className="flex items-center">
                <div className="w-48 h-2 bg-[var(--hover-bg)] rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--primary)]" style={{ width: '60%' }}></div>
                </div>
                <span className="ml-3 text-[var(--text-secondary)]">60%</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--text-secondary)]">Disk Usage</span>
              <div className="flex items-center">
                <div className="w-48 h-2 bg-[var(--hover-bg)] rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--primary)]" style={{ width: '75%' }}></div>
                </div>
                <span className="ml-3 text-[var(--text-secondary)]">75%</span>
              </div>
          </div>
        </div>
      </div>

        <div className="bg-[var(--card-bg)] p-6 rounded-xl border border-[var(--border-color)]">
          <h2 className="text-lg font-medium text-[var(--text-primary)]">Quick Actions</h2>
          <div className="mt-4 grid grid-cols-1 gap-4">
            <QuickAction
              title="Create New Website"
              description="Set up a new virtual host with custom configurations"
              link="/virtual-hosts/new"
              icon={
                <svg className="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              }
            />
            <QuickAction
              title="Add Database"
              description="Create a new MySQL or PostgreSQL database"
              link="/database/new"
              icon={
                <svg className="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7" />
                </svg>
              }
            />
            <QuickAction
              title="Configure SSL"
              description="Set up SSL certificates for your domains"
              link="/ssl/new"
              icon={
                <svg className="w-5 h-5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              }
            />
                </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 
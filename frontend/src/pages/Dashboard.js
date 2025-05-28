import React from 'react';
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
  { name: 'Virtual Hosts', value: '12', icon: ServerIcon },
  { name: 'Databases', value: '8', icon: CircleStackIcon },
  { name: 'Email Accounts', value: '24', icon: EnvelopeIcon },
  { name: 'DNS Records', value: '48', icon: GlobeAltIcon },
  { name: 'SSL Certificates', value: '6', icon: ShieldCheckIcon },
  { name: 'FTP Accounts', value: '15', icon: FolderIcon },
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

function Dashboard() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h2>
      
      {/* Service Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((item) => (
          <div
            key={item.name}
            className="bg-white overflow-hidden shadow rounded-lg"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <item.icon
                    className="h-6 w-6 text-gray-400"
                    aria-hidden="true"
                  />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {item.name}
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {item.value}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* System Stats */}
      <div className="mt-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">System Status</h3>
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dl className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              {systemStats.map((item) => (
                <div key={item.name} className="flex items-center">
                  <item.icon className="h-8 w-8 text-gray-400 mr-3" />
                  <div>
                    <dt className="text-sm font-medium text-gray-500">{item.name}</dt>
                    <dd className="mt-1 text-2xl font-semibold text-gray-900">{item.value}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <ul className="divide-y divide-gray-200">
            {recentActivity.map((activity) => (
              <li key={activity.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-primary-600 truncate">
                    {activity.action}
                  </p>
                  <div className="ml-2 flex-shrink-0 flex">
                    <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      {activity.status}
                    </p>
                  </div>
                </div>
                <div className="mt-2 sm:flex sm:justify-between">
                  <div className="sm:flex">
                    <p className="text-sm text-gray-500">
                      {activity.description}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                    <p>{activity.timestamp}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Dashboard; 
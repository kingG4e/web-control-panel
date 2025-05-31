import React, { useState } from 'react';
import {
  DocumentTextIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ShieldExclamationIcon,
} from '@heroicons/react/24/outline';
import PageLayout from '../components/layout/PageLayout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const Logs = () => {
  const [logs] = useState([
    { id: 1, type: 'error', message: 'Database connection failed', timestamp: '2024-03-20 14:23:45', source: 'Database' },
    { id: 2, type: 'warning', message: 'High CPU usage detected', timestamp: '2024-03-20 14:22:30', source: 'System' },
    { id: 3, type: 'info', message: 'Backup completed successfully', timestamp: '2024-03-20 14:20:15', source: 'Backup' },
    { id: 4, type: 'security', message: 'Failed login attempt', timestamp: '2024-03-20 14:18:00', source: 'Security' },
    { id: 5, type: 'info', message: 'Service restarted', timestamp: '2024-03-20 14:15:30', source: 'System' },
  ]);

  const getLogIcon = (type) => {
    switch (type) {
      case 'error':
        return <ExclamationTriangleIcon className="w-5 h-5 text-[var(--danger-color)]" />;
      case 'warning':
        return <ExclamationTriangleIcon className="w-5 h-5 text-[var(--warning-color)]" />;
      case 'security':
        return <ShieldExclamationIcon className="w-5 h-5 text-[var(--warning-color)]" />;
      default:
        return <InformationCircleIcon className="w-5 h-5 text-[var(--info-color)]" />;
    }
  };

  const getLogColor = (type) => {
    switch (type) {
      case 'error':
        return 'bg-[var(--danger-color)]/10 text-[var(--danger-color)]';
      case 'warning':
        return 'bg-[var(--warning-color)]/10 text-[var(--warning-color)]';
      case 'security':
        return 'bg-[var(--warning-color)]/10 text-[var(--warning-color)]';
      default:
        return 'bg-[var(--info-color)]/10 text-[var(--info-color)]';
    }
  };

  const actions = (
    <div className="flex space-x-4">
      <select className="input-field text-sm">
        <option value="all">All Logs</option>
        <option value="error">Errors</option>
        <option value="warning">Warnings</option>
        <option value="info">Information</option>
        <option value="security">Security</option>
      </select>
      <Button
        variant="secondary"
        size="sm"
        icon={<DocumentTextIcon className="w-4 h-4" />}
      >
        Export Logs
      </Button>
    </div>
  );

  return (
    <PageLayout
      title="System Logs"
      description="Monitor system activities and events"
      actions={actions}
    >
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Total Logs', value: '2,451', color: 'info' },
          { label: 'Errors', value: '13', color: 'danger' },
          { label: 'Warnings', value: '45', color: 'warning' },
          { label: 'Security Events', value: '89', color: 'warning' }
        ].map((stat, index) => (
          <Card key={index}>
            <div className="flex items-center p-6">
              <div className={`p-3 bg-[var(--${stat.color}-color)]/10 rounded-lg`}>
                <DocumentTextIcon className={`w-6 h-6 text-[var(--${stat.color}-color)]`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-[var(--secondary-text)]">{stat.label}</p>
                <p className="text-2xl font-semibold text-[var(--primary-text)] mt-1">{stat.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Logs List */}
      <Card padding={false}>
        <div className="divide-y divide-[var(--border-color)]">
          {logs.map((log) => (
            <div key={log.id} className="p-4 hover:bg-[var(--hover-bg)] transition-colors">
              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  {getLogIcon(log.type)}
                </div>
                <div className="ml-4 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-[var(--primary-text)]">{log.message}</p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLogColor(log.type)}`}>
                      {log.type}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center text-sm text-[var(--secondary-text)]">
                    <span>{log.source}</span>
                    <span className="mx-2">•</span>
                    <span>{log.timestamp}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </PageLayout>
  );
};

export default Logs; 
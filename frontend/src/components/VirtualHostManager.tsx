import React from 'react';
import { CogIcon, GlobeAltIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import BaseManager from './common/BaseManager';

const VirtualHostManager: React.FC = () => {
  const columns = [
    { key: 'domain', label: 'Domain Name' },
    { key: 'status', label: 'Status' },
    { key: 'type', label: 'Server Type' },
    { key: 'ssl', label: 'SSL Status' },
    { key: 'lastUpdated', label: 'Last Updated' }
  ];

  const actions = [
    {
      icon: CogIcon,
      label: 'Settings',
      onClick: (host) => console.log('Settings:', host)
    },
    {
      icon: GlobeAltIcon,
      label: 'View Site',
      onClick: (host) => window.open(`https://${host.domain}`, '_blank')
    },
    {
      icon: ShieldCheckIcon,
      label: 'SSL Settings',
      onClick: (host) => console.log('SSL Settings:', host)
    }
  ];

  return (
    <BaseManager
      title="Virtual Hosts"
      entity="virtual host"
      columns={columns}
      actions={actions}
      endpoint="/api/virtual-hosts"
    />
  );
};

export default VirtualHostManager; 
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  ServerIcon,
  GlobeAltIcon,
  EnvelopeIcon,
  CircleStackIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  FolderIcon,
} from '@heroicons/react/24/outline';

const menuItems = [
  { path: '/', label: 'Dashboard', icon: HomeIcon },
  { path: '/virtual-hosts', label: 'Virtual Hosts', icon: ServerIcon },
  { path: '/dns', label: 'DNS Management', icon: GlobeAltIcon },
  { path: '/email', label: 'Email Settings', icon: EnvelopeIcon },
  { path: '/database', label: 'Database', icon: CircleStackIcon },
  { path: '/users', label: 'Users', icon: UserGroupIcon },
  { path: '/ssl', label: 'SSL Certificates', icon: ShieldCheckIcon },
  { path: '/ftp', label: 'FTP Management', icon: FolderIcon },
];

function Sidebar() {
  const location = useLocation();

  return (
    <div className="bg-secondary-800 text-white w-64 space-y-6 py-7 px-2 absolute inset-y-0 left-0 transform -translate-x-full md:relative md:translate-x-0 transition duration-200 ease-in-out">
      <div className="text-2xl font-semibold text-center mb-6">
        Control Panel
      </div>
      <nav className="space-y-1">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`
                flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200
                ${isActive
                  ? 'bg-secondary-700 text-white'
                  : 'text-secondary-300 hover:bg-secondary-700 hover:text-white'
                }
              `}
            >
              <Icon
                className={`
                  mr-3 h-6 w-6
                  ${isActive ? 'text-white' : 'text-secondary-400'}
                `}
                aria-hidden="true"
              />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default Sidebar; 
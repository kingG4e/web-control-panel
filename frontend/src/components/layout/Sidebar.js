import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const menuItems = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/virtual-hosts', label: 'Virtual Hosts', icon: '🌐' },
  { path: '/dns', label: 'DNS Management', icon: '🔍' },
  { path: '/email', label: 'Email Settings', icon: '📧' },
  { path: '/database', label: 'Database', icon: '💾' },
  { path: '/users', label: 'Users', icon: '👥' },
  { path: '/ssl', label: 'SSL Certificates', icon: '🔒' },
  { path: '/ftp', label: 'FTP Management', icon: '📁' },
];

function Sidebar() {
  const location = useLocation();

  return (
    <div className="bg-gray-800 text-white w-64 space-y-6 py-7 px-2 absolute inset-y-0 left-0 transform -translate-x-full md:relative md:translate-x-0 transition duration-200 ease-in-out">
      <div className="text-2xl font-semibold text-center mb-6">
        Control Panel
      </div>
      <nav>
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center space-x-3 py-3 px-4 rounded transition duration-200 ${
              location.pathname === item.path
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

export default Sidebar; 
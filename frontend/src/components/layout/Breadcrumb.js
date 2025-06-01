import React from 'react';
import { useLocation, Link } from 'react-router-dom';

const Breadcrumb = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  // Map of route to display names
  const routeNames = {
    'dashboard': 'Dashboard',
    'virtual-hosts': 'Virtual Hosts',
    'dns': 'DNS Management',
    'email': 'Email Settings',
    'database': 'Database',
    'users': 'User Settings',
    'ssl': 'SSL Settings',
    'ftp': 'FTP Management'
  };

  return (
    <div className="bg-[var(--secondary-bg)] border-b border-[var(--border-color)]">
      <div className="container mx-auto px-4 py-2 max-w-7xl">
        <div className="flex items-center text-sm">
          <Link 
            to="/" 
            className="text-[var(--text-primary)] hover:text-[var(--primary)]"
          >
            Home
          </Link>
          {pathnames.map((name, index) => {
            const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
            const isLast = index === pathnames.length - 1;
            
            return (
              <React.Fragment key={name}>
                <span className="mx-2 text-[var(--text-secondary)]">/</span>
                {isLast ? (
                  <span className="text-[var(--text-primary)] font-medium">
                    {routeNames[name] || name}
                  </span>
                ) : (
                  <Link
                    to={routeTo}
                    className="text-[var(--text-primary)] hover:text-[var(--primary)]"
                  >
                    {routeNames[name] || name}
                  </Link>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Breadcrumb; 
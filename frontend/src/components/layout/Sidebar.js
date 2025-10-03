import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { NavLink } from 'react-router-dom';

const menuGroups = [
    {
        title: 'System',
        items: [
            {
                name: 'Dashboard',
                path: '/dashboard',
                icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                )
            },
            {
                name: 'My Requests',
                path: '/my-requests',
                icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                )
            },
            {
                name: 'System Information',
                path: '/system-info',
                icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                )
            }
        ]
    },
    {
        title: 'Servers',
        items: [
            {
                name: 'Virtual Hosts',
                path: '/virtual-hosts',
                icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                )
            },
            {
                name: 'DNS Zones',
                path: '/dns',
                icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                )
            }
        ]
    },
    {
        title: 'Services',
        items: [
            {
                name: 'File Management',
                path: '/file-manager',
                icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                )
            },

            {
                name: 'Databases',
                path: '/database',
                icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                    </svg>
                )
            },
            {
                name: 'Mail Server',
                path: '/email',
                icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                )
            },
            {
                name: 'SSL Certificates',
                path: '/ssl',
                icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                )
            }
        ]
    },
    {
        title: 'Admin',
        items: [
            {
                name: 'Signup Approvals',
                path: '/admin/approvals',
                icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                )
            }
        ]
    },
    {
        title: 'System Settings',
        items: [
            {
                name: 'Users and Groups',
                path: '/users',
                icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                )
            },
            {
                name: 'Quota Management',
                path: '/admin/quota',
                icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                )
            },
            {
                name: 'Network Configuration',
                path: '/network',
                icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                    </svg>
                )
            },
            {
                name: 'Admin Settings',
                path: '/admin/settings',
                icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    </svg>
                )
            }
        ]
    }
];

const Sidebar = ({ isOpen, setIsOpen, isMobile, isPendingUser }) => {
  const { user } = useAuth();
  const isAdmin = user && (user.is_admin || user.role === 'admin' || user.username === 'root');
  
  // Status menu for pending users
  const statusMenuGroups = [
    {
      title: 'System',
      items: [
        {
          name: 'Dashboard',
          path: '/dashboard',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          )
        },
        {
          name: 'My Requests',
          path: '/my-requests',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          )
        }
      ]
    }
  ];
  
  // Filter menu groups based on user type
  const filteredGroups = isPendingUser ? statusMenuGroups : menuGroups.map(group => {
    if (group.title === 'System' && isAdmin) {
      return {
        ...group,
        items: group.items.filter(item => item.path !== '/my-requests')
      };
    }
    if (group.title === 'System Settings' && !isAdmin) {
      return {
        ...group,
        items: group.items.filter(item => !['/users', '/admin/quota', '/admin/settings'].includes(item.path))
      };
    }
    if (group.title === 'Admin' && !isAdmin) {
      return { ...group, items: [] };
    }
    return group;
  });

  // Hide any empty groups (e.g., Admin for non-admin users)
  const visibleGroups = filteredGroups.filter(group => Array.isArray(group.items) && group.items.length > 0);

  return (
        <aside 
            className={`
                flex flex-col bg-[var(--secondary-bg)] border-r border-[var(--border-color)] 
                transition-all duration-300 h-[calc(100vh-4rem)] z-[75]
                ${isMobile 
                  ? `fixed top-16 left-0 ${isOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full'}` 
                  : `relative ${isOpen ? 'w-64' : 'w-20'}`
                }
            `}
        >
            {/* Logo and Toggle */}
            <div className="flex items-center h-16 px-4 border-b border-[var(--border-color)]">
                <div className={`flex items-center space-x-3 ${!isOpen ? 'md:justify-center md:w-full' : ''}`}>
                    <svg className="w-8 h-8 text-[var(--accent-color)] flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M13.5 2C13.5 2.83 12.83 3.5 12 3.5C11.17 3.5 10.5 2.83 10.5 2C10.5 1.17 11.17 0.5 12 0.5C12.83 0.5 13.5 1.17 13.5 2ZM12 22C6.48 22 2 17.52 2 12C2 6.48 6.48 2 12 2C17.52 2 22 6.48 22 12C22 17.52 17.52 22 12 22ZM12 20C16.42 20 20 16.42 20 12C20 7.58 16.42 4 12 4C7.58 4 4 7.58 4 12C4 16.42 7.58 20 12 20Z"/>
                    </svg>
                    <span className={`text-lg font-semibold text-[var(--primary-text)] whitespace-nowrap transition-opacity duration-300 ${!isOpen || (!isMobile && !isOpen) ? 'opacity-0' : 'opacity-100'} ${!isMobile && !isOpen ? 'hidden' : ''}`}>
                        Control Panel
                    </span>
                </div>
                {isMobile && (
                    <button
                        onClick={() => setIsOpen(false)}
                        className="ml-auto p-2 rounded-lg hover:bg-[var(--hover-bg)] text-[var(--secondary-text)] hover:text-[var(--primary-text)] transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4 overflow-y-auto">
                {visibleGroups.map((group, groupIndex) => (
                    <div key={group.title} className={`px-3 ${groupIndex > 0 ? 'mt-6' : ''}`}>
                        <h2 className={`mb-2 px-3 text-xs font-semibold text-[var(--tertiary-text)] uppercase tracking-wider transition-opacity duration-300 ${!isOpen || (!isMobile && !isOpen) ? 'opacity-0' : 'opacity-100'} ${!isMobile && !isOpen ? 'hidden' : ''}`}>
                            {group.title}
                        </h2>
                        <div className="space-y-1">
                            {group.items.map((item) => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => {
                                        if (isMobile) {
                                            setIsOpen(false);
                                        }
                                    }}
                                    className={({ isActive }) =>
                                        `flex items-center px-3 py-2 rounded-lg transition-colors relative group
                                        ${isActive
                                            ? 'bg-[var(--accent-color)] text-white' 
                                            : 'text-[var(--secondary-text)] hover:text-[var(--primary-text)] hover:bg-[var(--hover-bg)]'
                                        }`
                                    }
                                >
                                    <div className="flex items-center">
                                        <span className="flex-shrink-0">{item.icon}</span>
                                        <span className={`ml-3 text-sm font-medium transition-opacity duration-300 ${!isOpen || (!isMobile && !isOpen) ? 'opacity-0' : 'opacity-100'} ${!isMobile && !isOpen ? 'hidden' : ''}`}>
                                            {item.name}
                                        </span>
                                    </div>
                                    {/* Tooltip for collapsed state */}
                                    {!isMobile && !isOpen && (
                                        <div className="hidden group-hover:block absolute left-full ml-2 px-2 py-1 bg-[var(--tooltip-bg)] text-[var(--tooltip-text)] text-xs rounded whitespace-nowrap z-[90]">
                                            {item.name}
                                        </div>
                                    )}
                                </NavLink>
                            ))}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Footer */}
            <div className={`p-4 border-t border-[var(--border-color)] ${!isOpen && !isMobile ? 'text-center' : ''}`}>
                <div className="text-xs text-[var(--tertiary-text)]">
                    v1.0.0
                </div>
            </div>
        </aside>
  );
};

export default Sidebar; 
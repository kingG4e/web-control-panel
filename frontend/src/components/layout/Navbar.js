import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import SettingsModal from '../modals/SettingsModal';
import NotificationDropdown from '../NotificationDropdown';

const Navbar = ({ onMenuClick }) => {
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await logout();
            // Force a hard redirect to ensure App.js re-evaluates authentication state
            window.location.href = '/login';
        } catch (error) {
            console.error('Error logging out:', error);
            // Force redirect even if logout fails
            window.location.href = '/login';
        }
    };

    // Get first letter of username for avatar
    const getInitial = () => {
        return user?.username ? user.username[0].toUpperCase() : '?';
    };

    return (
        <>
            <header className="navbar">
                <div className="navbar-content">
                    {/* Left section with menu button and breadcrumb */}
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={onMenuClick}
                            className="p-2 -ml-2 rounded-lg text-[var(--secondary-text)] hover:text-[var(--primary-text)] hover:bg-[var(--hover-bg)] transition-colors md:hidden"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                        <nav className="hidden md:flex items-center space-x-2 text-sm">
                            <span className="text-[var(--secondary-text)]">Control Panel</span>
                            <span className="text-[var(--tertiary-text)]">/</span>
                            <span className="text-[var(--primary-text)] font-medium">Dashboard</span>
                        </nav>
                    </div>

                    {/* Right section with search and profile */}
                    <div className="flex items-center space-x-4">
                        {/* Search */}
                        <div className="hidden md:flex items-center">
                            <div className="relative group">
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    className="w-64 pl-10 pr-4 py-2.5 bg-[var(--input-bg)] border border-[var(--border-color)] 
                                    rounded-lg text-[var(--primary-text)] placeholder-[var(--tertiary-text)] 
                                    transition-all duration-200 shadow-sm
                                    focus:outline-none focus:ring-2 focus:ring-[var(--focus-border)] focus:border-transparent
                                    hover:border-[var(--hover-border)] group-hover:border-[var(--hover-border)]"
                                />
                                <svg
                                    className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--tertiary-text)] 
                                    group-hover:text-[var(--secondary-text)] transition-colors duration-200"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                    />
                                </svg>
                            </div>
                        </div>

                        {/* Help */}
                        <button className="p-2 rounded-lg text-[var(--secondary-text)] hover:text-[var(--primary-text)] hover:bg-[var(--hover-bg)] transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </button>

                        {/* Notifications */}
                        <NotificationDropdown />

                        {/* Profile Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setIsProfileOpen(!isProfileOpen)}
                                className="flex items-center space-x-3 p-2 rounded-lg text-[var(--secondary-text)] hover:text-[var(--primary-text)] hover:bg-[var(--hover-bg)] transition-colors"
                            >
                                <div className="w-8 h-8 rounded-full bg-[var(--accent-color)] flex items-center justify-center text-white font-medium">
                                    {getInitial()}
                                </div>
                                <span className="hidden md:block text-sm font-medium">
                                    {user?.username || 'Loading...'}
                                </span>
                            </button>

                            {isProfileOpen && (
                                <div className="absolute right-0 mt-2 w-48 py-2 bg-[var(--card-bg)] rounded-lg shadow-[var(--card-shadow)] border border-[var(--border-color)] z-[85]">
                                    <div className="px-4 py-2">
                                        <div className="text-sm font-medium text-[var(--primary-text)]">{user?.username}</div>
                                        <div className="text-xs text-[var(--tertiary-text)]">
                                            {user?.role === 'admin' || user?.username === 'root' ? 'Administrator' : 'User'}
                                        </div>
                                    </div>
                                    <div className="border-t border-[var(--border-color)] my-2"></div>
                                    <button
                                        onClick={() => {
                                            setIsSettingsOpen(true);
                                            setIsProfileOpen(false);
                                        }}
                                        className="block w-full text-left px-4 py-2 text-sm text-[var(--secondary-text)] hover:bg-[var(--hover-bg)] hover:text-[var(--primary-text)] transition-colors"
                                    >
                                        Settings
                                    </button>
                                    <div className="border-t border-[var(--border-color)] my-2"></div>
                                    <button
                                        onClick={handleLogout}
                                        className="block w-full text-left px-4 py-2 text-sm text-[var(--danger-color)] hover:bg-[var(--hover-bg)] hover:text-[var(--danger-color)]/80 transition-colors"
                                    >
                                        Sign out
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <SettingsModal 
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            />
        </>
    );
};

export default Navbar; 
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SettingsModal from '../modals/SettingsModal';

const Navbar = ({ onMenuClick }) => {
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    return (
        <>
            <header className="navbar">
                <div className="navbar-content">
                    {/* Left section with menu button and breadcrumb */}
                    <div className="flex items-center space-x-2 md:space-x-4">
                        <button
                            onClick={onMenuClick}
                            className="p-2 rounded-lg text-[var(--secondary-text)] hover:text-[var(--primary-text)] hover:bg-[var(--hover-bg)] transition-colors md:hidden"
                            aria-label="Menu"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    <div className="flex items-center space-x-1 md:space-x-4">
                        {/* Mobile Search Button */}
                        <button 
                            onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
                            className="md:hidden p-2 rounded-lg text-[var(--secondary-text)] hover:text-[var(--primary-text)] hover:bg-[var(--hover-bg)] transition-colors"
                            aria-label="Search"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </button>

                        {/* Desktop Search */}
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
          
                        {/* Help - Hidden on mobile */}
                        <button className="hidden md:block p-2 rounded-lg text-[var(--secondary-text)] hover:text-[var(--primary-text)] hover:bg-[var(--hover-bg)] transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </button>

                        {/* Notifications */}
                        <button className="p-2 rounded-lg text-[var(--secondary-text)] hover:text-[var(--primary-text)] hover:bg-[var(--hover-bg)] transition-colors relative">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[var(--danger-color)] rounded-full"></span>
                        </button>

                        {/* Profile Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setIsProfileOpen(!isProfileOpen)}
                                className="flex items-center space-x-2 p-1.5 md:p-2 rounded-lg text-[var(--secondary-text)] hover:text-[var(--primary-text)] hover:bg-[var(--hover-bg)] transition-colors"
                            >
                                <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-[var(--accent-color)] flex items-center justify-center text-white font-medium">
                                    A
                                </div>
                                <span className="hidden md:block text-sm font-medium">Admin</span>
                            </button>

                            {isProfileOpen && (
                                <div className="absolute right-0 mt-2 w-48 py-2 bg-[var(--card-bg)] rounded-lg shadow-[var(--card-shadow)] border border-[var(--border-color)] z-50">
                                    <a
                                        href="#profile"
                                        className="block px-4 py-2 text-sm text-[var(--secondary-text)] hover:bg-[var(--hover-bg)] hover:text-[var(--primary-text)] transition-colors"
                                    >
                                        Your Profile
                                    </a>
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

                {/* Mobile Search Bar */}
                {isMobileSearchOpen && (
                    <div className="md:hidden px-4 py-3 border-t border-[var(--border-color)] bg-[var(--secondary-bg)]">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search..."
                                className="w-full pl-10 pr-4 py-2.5 bg-[var(--input-bg)] border border-[var(--border-color)] 
                                rounded-lg text-[var(--primary-text)] placeholder-[var(--tertiary-text)] 
                                transition-all duration-200 shadow-sm
                                focus:outline-none focus:ring-2 focus:ring-[var(--focus-border)] focus:border-transparent"
                            />
                            <svg
                                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--tertiary-text)]"
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
                )}
            </header>

            <SettingsModal 
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            />
        </>
    );
};

export default Navbar; 
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { DataProvider } from './contexts/DataContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Sidebar from './components/layout/Sidebar';
import Navbar from './components/layout/Navbar';
import VirtualHosts from './pages/VirtualHosts';
import CreateVirtualHost from './pages/CreateVirtualHost';
import DNSManagement from './pages/DNSManagement';
import EmailSettings from './pages/EmailSettings';
import Database from './pages/Database';
import UserSettings from './pages/UserSettings';
import Breadcrumb from './components/layout/Breadcrumb';
import FileManager from './pages/FileManager';

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const handleStorageChange = () => {
      setIsAuthenticated(!!localStorage.getItem('token'));
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  if (!isAuthenticated) {
  return (
      <ThemeProvider>
    <Router>
          <div className="min-h-screen bg-[var(--primary-bg)] flex items-center justify-center">
              <Routes>
                <Route
                path="/login" 
                element={<Login setIsAuthenticated={setIsAuthenticated} />} 
                />
                <Route 
                path="*" 
                element={<Navigate to="/login" />} 
                />
              </Routes>
            </div>
        </Router>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <Router>
        <DataProvider>
          <div className="flex flex-col h-screen bg-[var(--primary-bg)] overflow-hidden">
            {/* Top Header */}
            <Navbar onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
            
            <div className="flex flex-1 overflow-hidden">
              {/* Left Sidebar */}
              <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
              
              {/* Main Content Area */}
              <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <div className="flex-1 overflow-auto">
                  {/* Breadcrumb */}
                  <Breadcrumb />
                  
                  {/* Content Container */}
                  <div className="container mx-auto px-4 py-4 max-w-7xl">
                    <Routes>
                      <Route path="/" element={<Navigate to="/dashboard" replace />} />
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/virtual-hosts" element={<VirtualHosts />} />
                      <Route path="/virtual-hosts/new" element={<CreateVirtualHost />} />
                      <Route path="/dns" element={<DNSManagement />} />
                      <Route path="/email" element={<EmailSettings />} />
                      <Route path="/database" element={<Database />} />
                      <Route path="/users" element={<UserSettings />} />
                      <Route path="/file-manager" element={<FileManager />} />
                    </Routes>
                  </div>
                </div>
              </div>
        </div>
      </div>
        </DataProvider>
    </Router>
    </ThemeProvider>
  );
};

export default App; 
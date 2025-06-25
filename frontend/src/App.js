import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { DataProvider } from './contexts/DataContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Sidebar from './components/layout/Sidebar';
import Navbar from './components/layout/Navbar';
import VirtualHosts from './pages/VirtualHosts';
import CreateVirtualHost from './pages/CreateVirtualHost';
import EditVirtualHost from './pages/EditVirtualHost';
import DNSManagement from './pages/DNSManagement';
import EmailSettings from './pages/EmailSettings';
import Database from './pages/Database';
import UserSettings from './pages/UserSettings';
import SSLSettings from './pages/SSLSettings';

import Breadcrumb from './components/layout/Breadcrumb';
import FileManager from './pages/FileManager';
import ProtectedRoute from './components/ProtectedRoute';

const AppContent = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--primary-bg)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent-color)] mx-auto mb-4"></div>
          <p className="text-[var(--secondary-text)]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
          <div className="min-h-screen bg-[var(--primary-bg)] flex items-center justify-center">
            <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
          </div>
    );
  }

  return (
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
                      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                      <Route path="/virtual-hosts" element={<ProtectedRoute><VirtualHosts /></ProtectedRoute>} />
                      <Route path="/virtual-hosts/new" element={<ProtectedRoute><CreateVirtualHost /></ProtectedRoute>} />
                      <Route path="/virtual-hosts/:id/edit" element={<ProtectedRoute><EditVirtualHost /></ProtectedRoute>} />
                      <Route path="/dns" element={<ProtectedRoute><DNSManagement /></ProtectedRoute>} />
                      <Route path="/email" element={<ProtectedRoute><EmailSettings /></ProtectedRoute>} />
                      <Route path="/database" element={<ProtectedRoute><Database /></ProtectedRoute>} />
                      <Route path="/users" element={<ProtectedRoute><UserSettings /></ProtectedRoute>} />
                      <Route path="/ssl" element={<ProtectedRoute><SSLSettings /></ProtectedRoute>} />
                      
                      <Route path="/file-manager" element={<ProtectedRoute><FileManager /></ProtectedRoute>} />
                    </Routes>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DataProvider>
  );
};

const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppContent />
      </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App; 
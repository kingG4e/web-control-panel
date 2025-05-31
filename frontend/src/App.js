import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { DataProvider } from './contexts/DataContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Sidebar from './components/layout/Sidebar';
import Navbar from './components/layout/Navbar';
import VirtualHosts from './pages/VirtualHosts';
import DNSManagement from './pages/DNSManagement';
import EmailSettings from './pages/EmailSettings';
import Database from './pages/Database';
import UserSettings from './pages/UserSettings';
import SSLSettings from './pages/SSLSettings';
import FTPManagement from './pages/FTPManagement';
import LoadingSpinner from './components/common/LoadingSpinner';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
};

const Layout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { theme } = useTheme();

  return (
    <div className={`h-screen bg-[var(--primary-bg)] ${theme}`}>
      <div className="flex h-full">
        <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Navbar onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
          <main className="flex-1 overflow-y-auto">
            <div className="container mx-auto px-4 py-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/*"
              element={
                <PrivateRoute>
                  <DataProvider>
                    <Layout>
                      <Routes>
                        <Route path="/" element={<Navigate to="/dashboard" />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/virtual-hosts" element={<VirtualHosts />} />
                        <Route path="/dns" element={<DNSManagement />} />
                        <Route path="/email" element={<EmailSettings />} />
                        <Route path="/database" element={<Database />} />
                        <Route path="/users" element={<UserSettings />} />
                        <Route path="/ssl" element={<SSLSettings />} />
                        <Route path="/ftp" element={<FTPManagement />} />
                      </Routes>
                    </Layout>
                  </DataProvider>
                </PrivateRoute>
              }
            />
          </Routes>
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
};

export default App; 
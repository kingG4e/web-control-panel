import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { DataProvider } from './contexts/DataContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './pages/Login';
import Signup from './pages/Signup';
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
import AdminApprovals from './pages/AdminApprovals';
import AdminQuotaManagement from './pages/AdminQuotaManagement';
import PendingApproval from './pages/PendingApproval';
import MyRequests from './pages/MyRequests';
import { signup } from './services/api';

import Breadcrumb from './components/layout/Breadcrumb';
import FileManager from './pages/FileManager';
import ToastContainer from './components/common/ToastContainer';
import VirtualHostDetail from './pages/VirtualHostDetail';

const AppContent = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const isAdmin = user && (user.is_admin || user.role === 'admin' || user.username === 'root');
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [signupStatus, setSignupStatus] = React.useState(null);
  const [checkingStatus, setCheckingStatus] = React.useState(true);

  // Load actual signup/approval status for non-admin users
  React.useEffect(() => {
    const loadStatus = async () => {
      if (user && !(user.is_admin || user.role === 'admin' || user.username === 'root')) {
        try {
          const res = await signup.status(user.username);
          setSignupStatus(res.data || null);
        } catch (e) {
          setSignupStatus(null);
        }
      } else {
        setSignupStatus(null);
      }
      setCheckingStatus(false);
    };
    loadStatus();
  }, [user]);

  const isPendingApproval = !!(signupStatus && signupStatus.status === 'pending');

  if (isLoading || checkingStatus) {
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
          <Route path="/signup" element={<Signup />} />
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
          <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} isPendingUser={isPendingApproval} />
          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <div className="flex-1 overflow-auto">
              {/* Breadcrumb */}
              <Breadcrumb />
              {/* Content Container */}
              <div className="container mx-auto px-4 py-4 max-w-7xl">
                <ErrorBoundary>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/pending-approval" element={<PendingApproval />} />
                    {isPendingApproval ? (
                      <>
                        <Route path="/my-requests" element={<MyRequests />} />
                        {/* Redirect all feature routes to pending approval */}
                        <Route path="/admin/approvals" element={<Navigate to="/pending-approval" />} />
                        <Route path="/virtual-hosts" element={<Navigate to="/pending-approval" />} />
                        <Route path="/virtual-hosts/new" element={<Navigate to="/pending-approval" />} />
                        <Route path="/virtual-hosts/:id" element={<Navigate to="/pending-approval" />} />
                        <Route path="/virtual-hosts/:id/edit" element={<Navigate to="/pending-approval" />} />
                        <Route path="/dns" element={<Navigate to="/pending-approval" />} />
                        <Route path="/email" element={<Navigate to="/pending-approval" />} />
                        <Route path="/database" element={<Navigate to="/pending-approval" />} />
                        <Route path="/users" element={<Navigate to="/pending-approval" />} />
                        <Route path="/ssl" element={<Navigate to="/pending-approval" />} />
                        <Route path="/file-manager" element={<Navigate to="/pending-approval" />} />
                        <Route path="*" element={<Navigate to="/pending-approval" />} />
                      </>
                    ) : (
                      <>
                        <Route path="/admin/approvals" element={<AdminApprovals />} />
                    <Route path="/admin/quota" element={<AdminQuotaManagement />} />
                        <Route path="/virtual-hosts" element={<VirtualHosts />} />
                        <Route path="/virtual-hosts/new" element={isAdmin ? <CreateVirtualHost /> : <Navigate to="/virtual-hosts" />} />
                        <Route path="/virtual-hosts/:id" element={<VirtualHostDetail />} />
                        <Route path="/virtual-hosts/:id/edit" element={<EditVirtualHost />} />
                        <Route path="/dns" element={<DNSManagement />} />
                        <Route path="/email" element={<EmailSettings />} />
                        <Route path="/database" element={<Database />} />
                        <Route path="/users" element={<UserSettings />} />
                        <Route path="/ssl" element={<SSLSettings />} />
                        <Route path="/file-manager" element={<FileManager />} />
                        <Route path="/my-requests" element={<MyRequests />} />
                        {/* fallback */}
                        <Route path="*" element={<Navigate to="/dashboard" />} />
                      </>
                    )}
                  </Routes>
                </ErrorBoundary>
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
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <DataProvider>
            <Router>
              <div className="App">
                <ToastContainer />
                <AppContent />
              </div>
            </Router>
          </DataProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App; 
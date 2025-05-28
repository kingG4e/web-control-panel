import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Navbar from './components/layout/Navbar';
import Dashboard from './pages/Dashboard';
import VirtualHosts from './pages/VirtualHosts';
import DNSManagement from './pages/DNSManagement';
import EmailSettings from './pages/EmailSettings';
import Database from './pages/Database';
import Users from './pages/Users';
import SSLCertificates from './pages/SSLCertificates';
import FTPManagement from './pages/FTPManagement';
import Login from './pages/Login';
import axios from 'axios';

// Add token to all requests
axios.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Protected Route component
const ProtectedRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    if (!token) {
        return <Navigate to="/login" />;
    }
    return children;
};

function App() {
  return (
    <Router>
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Navbar />
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route
                  path="/dashboard/*"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route 
                  path="/virtual-hosts" 
                  element={
                    <ProtectedRoute>
                      <VirtualHosts />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/dns" 
                  element={
                    <ProtectedRoute>
                      <DNSManagement />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/email" 
                  element={
                    <ProtectedRoute>
                      <EmailSettings />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/database" 
                  element={
                    <ProtectedRoute>
                      <Database />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/users" 
                  element={
                    <ProtectedRoute>
                      <Users />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/ssl" 
                  element={
                    <ProtectedRoute>
                      <SSLCertificates />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/ftp" 
                  element={
                    <ProtectedRoute>
                      <FTPManagement />
                    </ProtectedRoute>
                  } 
                />
              </Routes>
            </div>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App; 
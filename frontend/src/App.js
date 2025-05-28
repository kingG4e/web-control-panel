import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Navbar from './components/layout/Navbar';
import Dashboard from './pages/Dashboard';
import VirtualHosts from './pages/VirtualHosts';
import DNSManagement from './pages/DNSManagement';

function App() {
  return (
    <Router>
      <div className="flex h-screen bg-gray-100">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Navbar />
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-200 p-6">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/virtual-hosts" element={<VirtualHosts />} />
              <Route path="/dns" element={<DNSManagement />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App; 
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PlusIcon, TrashIcon, ArrowPathIcon, ClockIcon } from '@heroicons/react/24/outline';

interface SSLCertificate {
  id: number;
  domain: string;
  issuer: string;
  valid_from: string;
  valid_until: string;
  auto_renewal: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

interface SSLCertificateLog {
  id: number;
  certificate_id: number;
  action: string;
  status: string;
  message: string;
  created_at: string;
}

const SSLManager: React.FC = () => {
  const [certificates, setCertificates] = useState<SSLCertificate[]>([]);
  const [selectedCertificate, setSelectedCertificate] = useState<SSLCertificate | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [logs, setLogs] = useState<SSLCertificateLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [newDomain, setNewDomain] = useState('');
  const [autoRenewal, setAutoRenewal] = useState(true);

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      const response = await axios.get('/api/ssl/certificates');
      setCertificates(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch SSL certificates');
      setLoading(false);
    }
  };

  const createCertificate = async () => {
    try {
      await axios.post('/api/ssl/certificates', {
        domain: newDomain,
        auto_renewal: autoRenewal
      });
      setShowCreateModal(false);
      setNewDomain('');
      setAutoRenewal(true);
      fetchCertificates();
    } catch (err) {
      setError('Failed to create SSL certificate');
    }
  };

  const renewCertificate = async (id: number) => {
    try {
      await axios.post(`/api/ssl/certificates/${id}/renew`);
      fetchCertificates();
    } catch (err) {
      setError('Failed to renew SSL certificate');
    }
  };

  const deleteCertificate = async (id: number) => {
    if (!window.confirm('Are you sure you want to revoke and delete this certificate?')) return;

    try {
      await axios.delete(`/api/ssl/certificates/${id}`);
      fetchCertificates();
    } catch (err) {
      setError('Failed to delete SSL certificate');
    }
  };

  const fetchLogs = async (id: number) => {
    try {
      const response = await axios.get(`/api/ssl/certificates/${id}/logs`);
      setLogs(response.data);
      setShowLogsModal(true);
    } catch (err) {
      setError('Failed to fetch certificate logs');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'revoked':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">SSL Certificates</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded-md flex items-center"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Add Certificate
        </button>
      </div>

      {/* Certificate List */}
      <div className="grid gap-4">
        {certificates.map((cert) => (
          <div key={cert.id} className="border rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-semibold">{cert.domain}</h2>
                <p className="text-gray-500">
                  Issuer: {cert.issuer} | Status:{' '}
                  <span className={`px-2 py-1 rounded-full text-sm ${getStatusColor(cert.status)}`}>
                    {cert.status}
                  </span>
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => renewCertificate(cert.id)}
                  className="bg-green-500 text-white px-3 py-2 rounded-md flex items-center"
                >
                  <ArrowPathIcon className="w-5 h-5 mr-2" />
                  Renew
                </button>
                <button
                  onClick={() => fetchLogs(cert.id)}
                  className="bg-yellow-500 text-white px-3 py-2 rounded-md flex items-center"
                >
                  <ClockIcon className="w-5 h-5 mr-2" />
                  Logs
                </button>
                <button
                  onClick={() => deleteCertificate(cert.id)}
                  className="bg-red-500 text-white px-3 py-2 rounded-md flex items-center"
                >
                  <TrashIcon className="w-5 h-5 mr-2" />
                  Delete
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Valid From</p>
                <p>{new Date(cert.valid_from).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-500">Valid Until</p>
                <p>{new Date(cert.valid_until).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-500">Auto Renewal</p>
                <p>{cert.auto_renewal ? 'Enabled' : 'Disabled'}</p>
              </div>
              <div>
                <p className="text-gray-500">Last Updated</p>
                <p>{new Date(cert.updated_at).toLocaleString()}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Certificate Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h2 className="text-xl font-bold mb-4">Add SSL Certificate</h2>
            <input
              type="text"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="Domain name (e.g., example.com)"
              className="w-full p-2 border rounded mb-4"
            />
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                id="autoRenewal"
                checked={autoRenewal}
                onChange={(e) => setAutoRenewal(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="autoRenewal">Enable auto-renewal</label>
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>
              <button
                onClick={createCertificate}
                className="px-4 py-2 bg-blue-500 text-white rounded"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logs Modal */}
      {showLogsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-[800px]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Certificate Logs</h2>
              <button
                onClick={() => setShowLogsModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left">Action</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">Message</th>
                    <th className="px-4 py-2 text-left">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-t">
                      <td className="px-4 py-2">{log.action}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded-full text-sm ${
                          log.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-2">{log.message}</td>
                      <td className="px-4 py-2">{new Date(log.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SSLManager; 
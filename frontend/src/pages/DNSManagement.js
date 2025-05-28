import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';

function DNSManagement() {
  const [zones, setZones] = useState([]);
  const [selectedZone, setSelectedZone] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showZoneForm, setShowZoneForm] = useState(false);
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [zoneFormData, setZoneFormData] = useState({
    domain_name: '',
    nameserver_ip: '127.0.0.1'
  });
  const [recordFormData, setRecordFormData] = useState({
    name: '',
    record_type: 'A',
    content: '',
    ttl: 3600,
    priority: null
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  useEffect(() => {
    fetchZones();
  }, []);

  const fetchZones = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/dns/zones');
      setZones(response.data);
      setIsLoading(false);
    } catch (err) {
      setError('Failed to fetch DNS zones');
      setIsLoading(false);
    }
  };

  const handleCreateZone = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/dns/zones', zoneFormData);
      setShowZoneForm(false);
      setZoneFormData({ domain_name: '', nameserver_ip: '127.0.0.1' });
      fetchZones();
    } catch (err) {
      setError('Failed to create DNS zone');
    }
  };

  const handleCreateRecord = async (e) => {
    e.preventDefault();
    if (!selectedZone) return;

    try {
      await axios.post(`http://localhost:5000/api/dns/zones/${selectedZone.id}/records`, recordFormData);
      setShowRecordForm(false);
      setRecordFormData({
        name: '',
        record_type: 'A',
        content: '',
        ttl: 3600,
        priority: null
      });
      fetchZones();
    } catch (err) {
      setError('Failed to create DNS record');
    }
  };

  const handleDeleteZone = async (zoneId) => {
    if (window.confirm('Are you sure you want to delete this zone?')) {
      try {
        await axios.delete(`http://localhost:5000/api/dns/zones/${zoneId}`);
        fetchZones();
      } catch (err) {
        setError('Failed to delete DNS zone');
      }
    }
  };

  const handleDeleteRecord = async (zoneId, recordId) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      try {
        await axios.delete(`http://localhost:5000/api/dns/zones/${zoneId}/records/${recordId}`);
        fetchZones();
      } catch (err) {
        setError('Failed to delete DNS record');
      }
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="container mx-auto px-4">
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">DNS Management</h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage DNS records for your domains
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary flex items-center"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Record
        </button>
      </div>

      {/* Zone Form Modal */}
      {showZoneForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add New DNS Zone</h2>
            <form onSubmit={handleCreateZone}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Domain Name
                </label>
                <input
                  type="text"
                  value={zoneFormData.domain_name}
                  onChange={(e) => setZoneFormData({ ...zoneFormData, domain_name: e.target.value })}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Nameserver IP
                </label>
                <input
                  type="text"
                  value={zoneFormData.nameserver_ip}
                  onChange={(e) => setZoneFormData({ ...zoneFormData, nameserver_ip: e.target.value })}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700"
                  required
                />
              </div>
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setShowZoneForm(false)}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Form Modal */}
      {showRecordForm && selectedZone && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add New DNS Record</h2>
            <form onSubmit={handleCreateRecord}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={recordFormData.name}
                  onChange={(e) => setRecordFormData({ ...recordFormData, name: e.target.value })}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Record Type
                </label>
                <select
                  value={recordFormData.record_type}
                  onChange={(e) => setRecordFormData({ ...recordFormData, record_type: e.target.value })}
                  className="shadow border rounded w-full py-2 px-3 text-gray-700"
                  required
                >
                  <option value="A">A</option>
                  <option value="AAAA">AAAA</option>
                  <option value="CNAME">CNAME</option>
                  <option value="MX">MX</option>
                  <option value="TXT">TXT</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Content
                </label>
                <input
                  type="text"
                  value={recordFormData.content}
                  onChange={(e) => setRecordFormData({ ...recordFormData, content: e.target.value })}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700"
                  required
                />
              </div>
              {recordFormData.record_type === 'MX' && (
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    Priority
                  </label>
                  <input
                    type="number"
                    value={recordFormData.priority || ''}
                    onChange={(e) => setRecordFormData({ ...recordFormData, priority: parseInt(e.target.value) })}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700"
                    required
                  />
                </div>
              )}
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setShowRecordForm(false)}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Zones List */}
      <div className="space-y-6">
        {zones.map((zone) => (
          <div key={zone.id} className="bg-white shadow-md rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-bold">{zone.domain_name}</h2>
                <p className="text-gray-500">Serial: {zone.serial}</p>
              </div>
              <div className="space-x-4">
                <button
                  onClick={() => {
                    setSelectedZone(zone);
                    setShowRecordForm(true);
                  }}
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                >
                  Add Record
                </button>
                <button
                  onClick={() => handleDeleteZone(zone.id)}
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                >
                  Delete Zone
                </button>
              </div>
            </div>

            {/* Records Table */}
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-2 px-4 text-left">Name</th>
                  <th className="py-2 px-4 text-left">Type</th>
                  <th className="py-2 px-4 text-left">Content</th>
                  <th className="py-2 px-4 text-left">TTL</th>
                  <th className="py-2 px-4 text-left">Priority</th>
                  <th className="py-2 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {zone.records.map((record) => (
                  <tr key={record.id} className="border-t">
                    <td className="py-2 px-4">{record.name}</td>
                    <td className="py-2 px-4">{record.record_type}</td>
                    <td className="py-2 px-4">{record.content}</td>
                    <td className="py-2 px-4">{record.ttl}</td>
                    <td className="py-2 px-4">{record.priority || '-'}</td>
                    <td className="py-2 px-4 text-center">
                      <button
                        onClick={() => handleDeleteRecord(zone.id, record.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Add DNS Record
            </h3>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  type="text"
                  className="input mt-1 block w-full"
                  placeholder="e.g., example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Type
                </label>
                <select className="input mt-1 block w-full">
                  {['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'PTR', 'SRV'].map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Value
                </label>
                <input
                  type="text"
                  className="input mt-1 block w-full"
                  placeholder="e.g., 192.168.1.100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  TTL (seconds)
                </label>
                <input
                  type="number"
                  className="input mt-1 block w-full"
                  placeholder="3600"
                />
              </div>
              <div className="mt-4 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default DNSManagement; 
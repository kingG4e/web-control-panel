import React, { useState, useEffect } from 'react';
import axios from 'axios';

function VirtualHosts() {
  const [virtualHosts, setVirtualHosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    domain_name: '',
    document_root: '',
    server_admin: ''
  });

  useEffect(() => {
    fetchVirtualHosts();
  }, []);

  const fetchVirtualHosts = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/virtual-hosts');
      setVirtualHosts(response.data);
      setIsLoading(false);
    } catch (err) {
      setError('Failed to fetch virtual hosts');
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/virtual-hosts', formData);
      setShowForm(false);
      setFormData({ domain_name: '', document_root: '', server_admin: '' });
      fetchVirtualHosts();
    } catch (err) {
      setError('Failed to create virtual host');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this virtual host?')) {
      try {
        await axios.delete(`http://localhost:5000/api/virtual-hosts/${id}`);
        fetchVirtualHosts();
      } catch (err) {
        setError('Failed to delete virtual host');
      }
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="container mx-auto px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Virtual Hosts</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Add New Virtual Host
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add New Virtual Host</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Domain Name
                </label>
                <input
                  type="text"
                  value={formData.domain_name}
                  onChange={(e) => setFormData({ ...formData, domain_name: e.target.value })}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Document Root
                </label>
                <input
                  type="text"
                  value={formData.document_root}
                  onChange={(e) => setFormData({ ...formData, document_root: e.target.value })}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Server Admin
                </label>
                <input
                  type="email"
                  value={formData.server_admin}
                  onChange={(e) => setFormData({ ...formData, server_admin: e.target.value })}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700"
                />
              </div>
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
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

      <div className="bg-white shadow-md rounded my-6">
        <table className="min-w-full table-auto">
          <thead>
            <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
              <th className="py-3 px-6 text-left">Domain Name</th>
              <th className="py-3 px-6 text-left">Document Root</th>
              <th className="py-3 px-6 text-left">Server Admin</th>
              <th className="py-3 px-6 text-left">Status</th>
              <th className="py-3 px-6 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="text-gray-600 text-sm font-light">
            {virtualHosts.map((host) => (
              <tr key={host.id} className="border-b border-gray-200 hover:bg-gray-100">
                <td className="py-3 px-6 text-left">{host.domain_name}</td>
                <td className="py-3 px-6 text-left">{host.document_root}</td>
                <td className="py-3 px-6 text-left">{host.server_admin}</td>
                <td className="py-3 px-6 text-left">
                  <span className={`py-1 px-3 rounded-full text-xs ${
                    host.status === 'active' ? 'bg-green-200 text-green-600' : 'bg-red-200 text-red-600'
                  }`}>
                    {host.status}
                  </span>
                </td>
                <td className="py-3 px-6 text-center">
                  <button
                    onClick={() => handleDelete(host.id)}
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
    </div>
  );
}

export default VirtualHosts; 
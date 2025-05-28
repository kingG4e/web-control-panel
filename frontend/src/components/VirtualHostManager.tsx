import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PlusIcon, TrashIcon, CogIcon, GlobeAltIcon, ShieldCheckIcon } from '@heroicons/react/outline';

interface VirtualHost {
    id: number;
    domain: string;
    server_name: string;
    document_root: string;
    php_version: string;
    status: string;
    ssl_enabled: boolean;
    ssl_certificate_id: number | null;
    created_at: string;
    updated_at: string;
}

interface VirtualHostAlias {
    id: number;
    virtual_host_id: number;
    alias_name: string;
    created_at: string;
}

interface VirtualHostConfig {
    id: number;
    virtual_host_id: number;
    config_type: string;
    config_key: string;
    config_value: string;
    created_at: string;
    updated_at: string;
}

const VirtualHostManager: React.FC = () => {
    const [virtualHosts, setVirtualHosts] = useState<VirtualHost[]>([]);
    const [selectedHost, setSelectedHost] = useState<VirtualHost | null>(null);
    const [aliases, setAliases] = useState<VirtualHostAlias[]>([]);
    const [configs, setConfigs] = useState<VirtualHostConfig[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Form states
    const [newDomain, setNewDomain] = useState('');
    const [newServerName, setNewServerName] = useState('');
    const [newDocumentRoot, setNewDocumentRoot] = useState('');
    const [newPhpVersion, setNewPhpVersion] = useState('8.2');
    const [newAlias, setNewAlias] = useState('');
    const [sslEnabled, setSslEnabled] = useState(false);

    useEffect(() => {
        fetchVirtualHosts();
    }, []);

    const fetchVirtualHosts = async () => {
        try {
            const response = await axios.get('/api/virtual-hosts');
            setVirtualHosts(response.data);
            setLoading(false);
        } catch (err) {
            setError('Failed to fetch virtual hosts');
            setLoading(false);
        }
    };

    const fetchHostDetails = async (hostId: number) => {
        try {
            const [aliasesRes, configsRes] = await Promise.all([
                axios.get(`/api/virtual-hosts/${hostId}/aliases`),
                axios.get(`/api/virtual-hosts/${hostId}/configs`)
            ]);
            setAliases(aliasesRes.data);
            setConfigs(configsRes.data);
        } catch (err) {
            setError('Failed to fetch host details');
        }
    };

    const createVirtualHost = async () => {
        try {
            await axios.post('/api/virtual-hosts', {
                domain: newDomain,
                server_name: newServerName,
                document_root: newDocumentRoot,
                php_version: newPhpVersion,
                ssl_enabled: sslEnabled
            });
            setShowCreateModal(false);
            resetForm();
            fetchVirtualHosts();
        } catch (err) {
            setError('Failed to create virtual host');
        }
    };

    const addAlias = async (hostId: number) => {
        if (!newAlias) return;
        try {
            await axios.post(`/api/virtual-hosts/${hostId}/aliases`, {
                alias_name: newAlias
            });
            setNewAlias('');
            fetchHostDetails(hostId);
        } catch (err) {
            setError('Failed to add alias');
        }
    };

    const deleteVirtualHost = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this virtual host?')) return;

        try {
            await axios.delete(`/api/virtual-hosts/${id}`);
            fetchVirtualHosts();
            if (selectedHost?.id === id) {
                setSelectedHost(null);
            }
        } catch (err) {
            setError('Failed to delete virtual host');
        }
    };

    const toggleSSL = async (host: VirtualHost) => {
        try {
            await axios.patch(`/api/virtual-hosts/${host.id}`, {
                ssl_enabled: !host.ssl_enabled
            });
            fetchVirtualHosts();
        } catch (err) {
            setError('Failed to toggle SSL');
        }
    };

    const resetForm = () => {
        setNewDomain('');
        setNewServerName('');
        setNewDocumentRoot('');
        setNewPhpVersion('8.2');
        setSslEnabled(false);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-green-100 text-green-800';
            case 'suspended':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) return <div className="p-4">Loading...</div>;
    if (error) return <div className="p-4 text-red-500">{error}</div>;

    return (
        <div className="p-4">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">Virtual Hosts</h1>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-blue-500 text-white px-4 py-2 rounded-md flex items-center"
                >
                    <PlusIcon className="w-5 h-5 mr-2" />
                    Add Virtual Host
                </button>
            </div>

            {/* Virtual Hosts List */}
            <div className="grid gap-4">
                {virtualHosts.map((host) => (
                    <div key={host.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h2 className="text-xl font-semibold">{host.domain}</h2>
                                <p className="text-gray-500">
                                    Status:{' '}
                                    <span className={`px-2 py-1 rounded-full text-sm ${getStatusColor(host.status)}`}>
                                        {host.status}
                                    </span>
                                </p>
                            </div>
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => toggleSSL(host)}
                                    className={`${
                                        host.ssl_enabled ? 'bg-green-500' : 'bg-gray-500'
                                    } text-white px-3 py-2 rounded-md flex items-center`}
                                >
                                    <ShieldCheckIcon className="w-5 h-5 mr-2" />
                                    SSL {host.ssl_enabled ? 'Enabled' : 'Disabled'}
                                </button>
                                <button
                                    onClick={() => {
                                        setSelectedHost(host);
                                        fetchHostDetails(host.id);
                                        setShowConfigModal(true);
                                    }}
                                    className="bg-yellow-500 text-white px-3 py-2 rounded-md flex items-center"
                                >
                                    <CogIcon className="w-5 h-5 mr-2" />
                                    Configure
                                </button>
                                <button
                                    onClick={() => deleteVirtualHost(host.id)}
                                    className="bg-red-500 text-white px-3 py-2 rounded-md flex items-center"
                                >
                                    <TrashIcon className="w-5 h-5 mr-2" />
                                    Delete
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-gray-500">Document Root</p>
                                <p>{host.document_root}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">PHP Version</p>
                                <p>{host.php_version}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Create Virtual Host Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white p-6 rounded-lg w-[600px]">
                        <h2 className="text-xl font-bold mb-4">Add Virtual Host</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Domain</label>
                                <input
                                    type="text"
                                    value={newDomain}
                                    onChange={(e) => setNewDomain(e.target.value)}
                                    placeholder="example.com"
                                    className="mt-1 w-full p-2 border rounded"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Server Name</label>
                                <input
                                    type="text"
                                    value={newServerName}
                                    onChange={(e) => setNewServerName(e.target.value)}
                                    placeholder="www.example.com"
                                    className="mt-1 w-full p-2 border rounded"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Document Root</label>
                                <input
                                    type="text"
                                    value={newDocumentRoot}
                                    onChange={(e) => setNewDocumentRoot(e.target.value)}
                                    placeholder="/var/www/example.com"
                                    className="mt-1 w-full p-2 border rounded"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">PHP Version</label>
                                <select
                                    value={newPhpVersion}
                                    onChange={(e) => setNewPhpVersion(e.target.value)}
                                    className="mt-1 w-full p-2 border rounded"
                                >
                                    <option value="8.2">PHP 8.2</option>
                                    <option value="8.1">PHP 8.1</option>
                                    <option value="8.0">PHP 8.0</option>
                                    <option value="7.4">PHP 7.4</option>
                                </select>
                            </div>
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="sslEnabled"
                                    checked={sslEnabled}
                                    onChange={(e) => setSslEnabled(e.target.checked)}
                                    className="mr-2"
                                />
                                <label htmlFor="sslEnabled">Enable SSL</label>
                            </div>
                        </div>
                        <div className="flex justify-end space-x-2 mt-4">
                            <button
                                onClick={() => {
                                    setShowCreateModal(false);
                                    resetForm();
                                }}
                                className="px-4 py-2 border rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={createVirtualHost}
                                className="px-4 py-2 bg-blue-500 text-white rounded"
                            >
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Configuration Modal */}
            {showConfigModal && selectedHost && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white p-6 rounded-lg w-[800px]">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Configure {selectedHost.domain}</h2>
                            <button
                                onClick={() => setShowConfigModal(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                ×
                            </button>
                        </div>

                        {/* Aliases Section */}
                        <div className="mb-6">
                            <h3 className="text-lg font-semibold mb-2">Aliases</h3>
                            <div className="flex space-x-2 mb-4">
                                <input
                                    type="text"
                                    value={newAlias}
                                    onChange={(e) => setNewAlias(e.target.value)}
                                    placeholder="subdomain.example.com"
                                    className="flex-1 p-2 border rounded"
                                />
                                <button
                                    onClick={() => addAlias(selectedHost.id)}
                                    className="px-4 py-2 bg-blue-500 text-white rounded"
                                >
                                    Add Alias
                                </button>
                            </div>
                            <div className="space-y-2">
                                {aliases.map((alias) => (
                                    <div key={alias.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                        <span>{alias.alias_name}</span>
                                        <button
                                            onClick={async () => {
                                                try {
                                                    await axios.delete(`/api/virtual-hosts/${selectedHost.id}/aliases/${alias.id}`);
                                                    fetchHostDetails(selectedHost.id);
                                                } catch (err) {
                                                    setError('Failed to delete alias');
                                                }
                                            }}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Configurations Section */}
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Custom Configurations</h3>
                            <div className="space-y-2">
                                {configs.map((config) => (
                                    <div key={config.id} className="p-2 bg-gray-50 rounded">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <span className="font-medium">{config.config_key}</span>
                                                <span className="text-gray-500 text-sm ml-2">({config.config_type})</span>
                                            </div>
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        await axios.delete(`/api/virtual-hosts/${selectedHost.id}/configs/${config.id}`);
                                                        fetchHostDetails(selectedHost.id);
                                                    } catch (err) {
                                                        setError('Failed to delete config');
                                                    }
                                                }}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                ×
                                            </button>
                                        </div>
                                        <pre className="mt-1 text-sm">{config.config_value}</pre>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VirtualHostManager; 
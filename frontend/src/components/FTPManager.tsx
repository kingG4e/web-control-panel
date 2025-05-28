import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PlusIcon, TrashIcon, FolderIcon, LockClosedIcon, CloudIcon } from '@heroicons/react/outline';

interface FTPAccount {
    id: number;
    username: string;
    home_directory: string;
    is_sftp: boolean;
    is_active: boolean;
    user_id: number;
    domain: string;
    permissions: string;
    quota_size_mb: number;
    access_rules: FTPAccessRule[];
    created_at: string;
    updated_at: string;
}

interface FTPAccessRule {
    id: number;
    directory_path: string;
    permissions: string;
    created_at: string;
}

const FTPManager: React.FC = () => {
    const [accounts, setAccounts] = useState<FTPAccount[]>([]);
    const [selectedAccount, setSelectedAccount] = useState<FTPAccount | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showRuleModal, setShowRuleModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Form states
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newHomeDirectory, setNewHomeDirectory] = useState('');
    const [newIsSFTP, setNewIsSFTP] = useState(true);
    const [newDomain, setNewDomain] = useState('');
    const [newPermissions, setNewPermissions] = useState('0755');
    const [newQuotaSizeMB, setNewQuotaSizeMB] = useState(0);
    const [newDirectoryPath, setNewDirectoryPath] = useState('');
    const [newRulePermissions, setNewRulePermissions] = useState('0755');

    useEffect(() => {
        fetchAccounts();
    }, []);

    const fetchAccounts = async () => {
        try {
            const response = await axios.get('/api/ftp/accounts', {
                params: { domain: 'example.com' } // TODO: Get domain from context/props
            });
            setAccounts(response.data);
            setLoading(false);
        } catch (err) {
            setError('Failed to fetch FTP accounts');
            setLoading(false);
        }
    };

    const createAccount = async () => {
        try {
            await axios.post('/api/ftp/accounts', {
                username: newUsername,
                password: newPassword,
                home_directory: newHomeDirectory,
                is_sftp: newIsSFTP,
                domain: newDomain,
                permissions: newPermissions,
                quota_size_mb: newQuotaSizeMB,
                user_id: 1 // TODO: Get from context/props
            });
            setShowCreateModal(false);
            resetForm();
            fetchAccounts();
        } catch (err) {
            setError('Failed to create FTP account');
        }
    };

    const deleteAccount = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this FTP account?')) return;

        try {
            await axios.delete(`/api/ftp/accounts/${id}`);
            fetchAccounts();
        } catch (err) {
            setError('Failed to delete FTP account');
        }
    };

    const addAccessRule = async (accountId: number) => {
        try {
            await axios.post(`/api/ftp/accounts/${accountId}/rules`, {
                directory_path: newDirectoryPath,
                permissions: newRulePermissions
            });
            setShowRuleModal(false);
            fetchAccounts();
        } catch (err) {
            setError('Failed to add access rule');
        }
    };

    const removeAccessRule = async (ruleId: number) => {
        try {
            await axios.delete(`/api/ftp/rules/${ruleId}`);
            fetchAccounts();
        } catch (err) {
            setError('Failed to remove access rule');
        }
    };

    const resetForm = () => {
        setNewUsername('');
        setNewPassword('');
        setNewHomeDirectory('');
        setNewIsSFTP(true);
        setNewDomain('');
        setNewPermissions('0755');
        setNewQuotaSizeMB(0);
        setNewDirectoryPath('');
        setNewRulePermissions('0755');
    };

    if (loading) return <div className="p-4">Loading...</div>;
    if (error) return <div className="p-4 text-red-500">{error}</div>;

    return (
        <div className="p-4">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">FTP/SFTP Management</h1>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-blue-500 text-white px-4 py-2 rounded-md flex items-center"
                >
                    <PlusIcon className="w-5 h-5 mr-2" />
                    Add Account
                </button>
            </div>

            {/* Accounts List */}
            <div className="grid gap-4">
                {accounts.map((account) => (
                    <div key={account.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h2 className="text-xl font-semibold">{account.username}</h2>
                                <p className="text-gray-500">
                                    {account.is_sftp ? 'SFTP' : 'FTP'} | {account.domain}
                                </p>
                                <p className="text-sm text-gray-500">
                                    <FolderIcon className="w-4 h-4 inline mr-1" />
                                    {account.home_directory}
                                </p>
                                <div className="mt-1">
                                    <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded mr-2">
                                        Permissions: {account.permissions}
                                    </span>
                                    {account.quota_size_mb > 0 && (
                                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                            Quota: {account.quota_size_mb}MB
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => {
                                        setSelectedAccount(account);
                                        setShowRuleModal(true);
                                    }}
                                    className="bg-yellow-500 text-white px-3 py-2 rounded-md flex items-center"
                                >
                                    <LockClosedIcon className="w-5 h-5 mr-2" />
                                    Access Rules
                                </button>
                                <button
                                    onClick={() => deleteAccount(account.id)}
                                    className="bg-red-500 text-white px-3 py-2 rounded-md flex items-center"
                                >
                                    <TrashIcon className="w-5 h-5 mr-2" />
                                    Delete
                                </button>
                            </div>
                        </div>

                        {/* Access Rules */}
                        {account.access_rules.length > 0 && (
                            <div className="mt-4">
                                <h3 className="text-lg font-semibold mb-2">Access Rules</h3>
                                <div className="grid gap-2">
                                    {account.access_rules.map((rule) => (
                                        <div key={rule.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                            <div>
                                                <span className="font-medium">{rule.directory_path}</span>
                                                <span className="text-sm text-gray-500 ml-2">({rule.permissions})</span>
                                            </div>
                                            <button
                                                onClick={() => removeAccessRule(rule.id)}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Create Account Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white p-6 rounded-lg w-[600px]">
                        <h2 className="text-xl font-bold mb-4">Add FTP/SFTP Account</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Username</label>
                                <input
                                    type="text"
                                    value={newUsername}
                                    onChange={(e) => setNewUsername(e.target.value)}
                                    className="mt-1 w-full p-2 border rounded"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Password</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="mt-1 w-full p-2 border rounded"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Home Directory</label>
                                <input
                                    type="text"
                                    value={newHomeDirectory}
                                    onChange={(e) => setNewHomeDirectory(e.target.value)}
                                    className="mt-1 w-full p-2 border rounded"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Domain</label>
                                <input
                                    type="text"
                                    value={newDomain}
                                    onChange={(e) => setNewDomain(e.target.value)}
                                    className="mt-1 w-full p-2 border rounded"
                                />
                            </div>
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="isSFTP"
                                    checked={newIsSFTP}
                                    onChange={(e) => setNewIsSFTP(e.target.checked)}
                                    className="mr-2"
                                />
                                <label htmlFor="isSFTP">Use SFTP (more secure)</label>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Permissions</label>
                                <input
                                    type="text"
                                    value={newPermissions}
                                    onChange={(e) => setNewPermissions(e.target.value)}
                                    placeholder="0755"
                                    className="mt-1 w-full p-2 border rounded"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Quota Size (MB)</label>
                                <input
                                    type="number"
                                    value={newQuotaSizeMB}
                                    onChange={(e) => setNewQuotaSizeMB(parseInt(e.target.value))}
                                    min="0"
                                    className="mt-1 w-full p-2 border rounded"
                                />
                                <p className="text-sm text-gray-500">0 for unlimited</p>
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
                            <button onClick={createAccount} className="px-4 py-2 bg-blue-500 text-white rounded">
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Access Rule Modal */}
            {showRuleModal && selectedAccount && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white p-6 rounded-lg w-[600px]">
                        <h2 className="text-xl font-bold mb-4">Add Access Rule for {selectedAccount.username}</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Directory Path</label>
                                <input
                                    type="text"
                                    value={newDirectoryPath}
                                    onChange={(e) => setNewDirectoryPath(e.target.value)}
                                    placeholder="/path/to/directory"
                                    className="mt-1 w-full p-2 border rounded"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Permissions</label>
                                <input
                                    type="text"
                                    value={newRulePermissions}
                                    onChange={(e) => setNewRulePermissions(e.target.value)}
                                    placeholder="0755"
                                    className="mt-1 w-full p-2 border rounded"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end space-x-2 mt-4">
                            <button
                                onClick={() => {
                                    setShowRuleModal(false);
                                    setSelectedAccount(null);
                                    resetForm();
                                }}
                                className="px-4 py-2 border rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => addAccessRule(selectedAccount.id)}
                                className="px-4 py-2 bg-blue-500 text-white rounded"
                            >
                                Add Rule
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FTPManager; 
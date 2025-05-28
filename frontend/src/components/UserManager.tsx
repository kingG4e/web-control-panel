import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PlusIcon, TrashIcon, UserIcon, KeyIcon, GlobeAltIcon } from '@heroicons/react/outline';

interface User {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    is_active: boolean;
    is_admin: boolean;
    roles: Role[];
    domain_permissions: DomainPermission[];
    created_at: string;
    updated_at: string;
}

interface Role {
    id: number;
    name: string;
    description: string;
    permissions: Permission[];
    created_at: string;
}

interface Permission {
    id: number;
    name: string;
    description: string;
    resource_type: string;
    action: string;
    created_at: string;
}

interface DomainPermission {
    id: number;
    domain: string;
    can_manage_vhost: boolean;
    can_manage_dns: boolean;
    can_manage_ssl: boolean;
    can_manage_email: boolean;
    can_manage_database: boolean;
    can_manage_ftp: boolean;
}

const UserManager: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showPermissionModal, setShowPermissionModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Form states
    const [newUsername, setNewUsername] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newFirstName, setNewFirstName] = useState('');
    const [newLastName, setNewLastName] = useState('');
    const [newIsAdmin, setNewIsAdmin] = useState(false);
    const [selectedRoles, setSelectedRoles] = useState<number[]>([]);
    const [newDomain, setNewDomain] = useState('');
    const [newDomainPermissions, setNewDomainPermissions] = useState({
        vhost: false,
        dns: false,
        ssl: false,
        email: false,
        database: false,
        ftp: false
    });

    useEffect(() => {
        fetchUsers();
        fetchRoles();
        fetchPermissions();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await axios.get('/api/users');
            setUsers(response.data);
            setLoading(false);
        } catch (err) {
            setError('Failed to fetch users');
            setLoading(false);
        }
    };

    const fetchRoles = async () => {
        try {
            const response = await axios.get('/api/roles');
            setRoles(response.data);
        } catch (err) {
            setError('Failed to fetch roles');
        }
    };

    const fetchPermissions = async () => {
        try {
            const response = await axios.get('/api/permissions');
            setPermissions(response.data);
        } catch (err) {
            setError('Failed to fetch permissions');
        }
    };

    const createUser = async () => {
        try {
            await axios.post('/api/users', {
                username: newUsername,
                email: newEmail,
                password: newPassword,
                first_name: newFirstName,
                last_name: newLastName,
                is_admin: newIsAdmin,
                roles: selectedRoles
            });
            setShowCreateModal(false);
            resetForm();
            fetchUsers();
        } catch (err) {
            setError('Failed to create user');
        }
    };

    const deleteUser = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this user?')) return;

        try {
            await axios.delete(`/api/users/${id}`);
            fetchUsers();
        } catch (err) {
            setError('Failed to delete user');
        }
    };

    const setDomainPermissions = async (userId: number) => {
        try {
            await axios.post(`/api/users/${userId}/domain-permissions`, {
                domain: newDomain,
                permissions: newDomainPermissions
            });
            setShowPermissionModal(false);
            fetchUsers();
        } catch (err) {
            setError('Failed to set domain permissions');
        }
    };

    const removeDomainPermissions = async (userId: number, domain: string) => {
        try {
            await axios.delete(`/api/users/${userId}/domain-permissions/${domain}`);
            fetchUsers();
        } catch (err) {
            setError('Failed to remove domain permissions');
        }
    };

    const resetForm = () => {
        setNewUsername('');
        setNewEmail('');
        setNewPassword('');
        setNewFirstName('');
        setNewLastName('');
        setNewIsAdmin(false);
        setSelectedRoles([]);
        setNewDomain('');
        setNewDomainPermissions({
            vhost: false,
            dns: false,
            ssl: false,
            email: false,
            database: false,
            ftp: false
        });
    };

    if (loading) return <div className="p-4">Loading...</div>;
    if (error) return <div className="p-4 text-red-500">{error}</div>;

    return (
        <div className="p-4">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">User Management</h1>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-blue-500 text-white px-4 py-2 rounded-md flex items-center"
                >
                    <PlusIcon className="w-5 h-5 mr-2" />
                    Add User
                </button>
            </div>

            {/* Users List */}
            <div className="grid gap-4">
                {users.map((user) => (
                    <div key={user.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h2 className="text-xl font-semibold">{user.username}</h2>
                                <p className="text-gray-500">
                                    {user.first_name} {user.last_name} | {user.email}
                                </p>
                                <div className="mt-1">
                                    {user.is_admin && (
                                        <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-sm mr-2">
                                            Admin
                                        </span>
                                    )}
                                    {user.roles.map((role) => (
                                        <span
                                            key={role.id}
                                            className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm mr-2"
                                        >
                                            {role.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => {
                                        setSelectedUser(user);
                                        setShowPermissionModal(true);
                                    }}
                                    className="bg-yellow-500 text-white px-3 py-2 rounded-md flex items-center"
                                >
                                    <KeyIcon className="w-5 h-5 mr-2" />
                                    Permissions
                                </button>
                                <button
                                    onClick={() => deleteUser(user.id)}
                                    className="bg-red-500 text-white px-3 py-2 rounded-md flex items-center"
                                >
                                    <TrashIcon className="w-5 h-5 mr-2" />
                                    Delete
                                </button>
                            </div>
                        </div>

                        {/* Domain Permissions */}
                        {user.domain_permissions.length > 0 && (
                            <div className="mt-4">
                                <h3 className="text-lg font-semibold mb-2">Domain Permissions</h3>
                                <div className="grid gap-2">
                                    {user.domain_permissions.map((perm) => (
                                        <div key={perm.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                            <div>
                                                <span className="font-medium">{perm.domain}</span>
                                                <div className="mt-1 space-x-2">
                                                    {perm.can_manage_vhost && (
                                                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                                            VHost
                                                        </span>
                                                    )}
                                                    {perm.can_manage_dns && (
                                                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                                            DNS
                                                        </span>
                                                    )}
                                                    {perm.can_manage_ssl && (
                                                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                                            SSL
                                                        </span>
                                                    )}
                                                    {perm.can_manage_email && (
                                                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                                            Email
                                                        </span>
                                                    )}
                                                    {perm.can_manage_database && (
                                                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                                            Database
                                                        </span>
                                                    )}
                                                    {perm.can_manage_ftp && (
                                                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                                            FTP
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => removeDomainPermissions(user.id, perm.domain)}
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

            {/* Create User Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white p-6 rounded-lg w-[600px]">
                        <h2 className="text-xl font-bold mb-4">Add User</h2>
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
                                <label className="block text-sm font-medium text-gray-700">Email</label>
                                <input
                                    type="email"
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
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
                                <label className="block text-sm font-medium text-gray-700">First Name</label>
                                <input
                                    type="text"
                                    value={newFirstName}
                                    onChange={(e) => setNewFirstName(e.target.value)}
                                    className="mt-1 w-full p-2 border rounded"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Last Name</label>
                                <input
                                    type="text"
                                    value={newLastName}
                                    onChange={(e) => setNewLastName(e.target.value)}
                                    className="mt-1 w-full p-2 border rounded"
                                />
                            </div>
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="isAdmin"
                                    checked={newIsAdmin}
                                    onChange={(e) => setNewIsAdmin(e.target.checked)}
                                    className="mr-2"
                                />
                                <label htmlFor="isAdmin">Admin User</label>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Roles</label>
                                <div className="mt-1 space-y-2">
                                    {roles.map((role) => (
                                        <div key={role.id} className="flex items-center">
                                            <input
                                                type="checkbox"
                                                id={`role-${role.id}`}
                                                checked={selectedRoles.includes(role.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedRoles([...selectedRoles, role.id]);
                                                    } else {
                                                        setSelectedRoles(selectedRoles.filter((id) => id !== role.id));
                                                    }
                                                }}
                                                className="mr-2"
                                            />
                                            <label htmlFor={`role-${role.id}`}>{role.name}</label>
                                        </div>
                                    ))}
                                </div>
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
                            <button onClick={createUser} className="px-4 py-2 bg-blue-500 text-white rounded">
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Domain Permissions Modal */}
            {showPermissionModal && selectedUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white p-6 rounded-lg w-[600px]">
                        <h2 className="text-xl font-bold mb-4">Set Domain Permissions for {selectedUser.username}</h2>
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
                                <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
                                <div className="space-y-2">
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            id="vhost"
                                            checked={newDomainPermissions.vhost}
                                            onChange={(e) =>
                                                setNewDomainPermissions({
                                                    ...newDomainPermissions,
                                                    vhost: e.target.checked
                                                })
                                            }
                                            className="mr-2"
                                        />
                                        <label htmlFor="vhost">Virtual Host Management</label>
                                    </div>
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            id="dns"
                                            checked={newDomainPermissions.dns}
                                            onChange={(e) =>
                                                setNewDomainPermissions({
                                                    ...newDomainPermissions,
                                                    dns: e.target.checked
                                                })
                                            }
                                            className="mr-2"
                                        />
                                        <label htmlFor="dns">DNS Management</label>
                                    </div>
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            id="ssl"
                                            checked={newDomainPermissions.ssl}
                                            onChange={(e) =>
                                                setNewDomainPermissions({
                                                    ...newDomainPermissions,
                                                    ssl: e.target.checked
                                                })
                                            }
                                            className="mr-2"
                                        />
                                        <label htmlFor="ssl">SSL Management</label>
                                    </div>
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            id="email"
                                            checked={newDomainPermissions.email}
                                            onChange={(e) =>
                                                setNewDomainPermissions({
                                                    ...newDomainPermissions,
                                                    email: e.target.checked
                                                })
                                            }
                                            className="mr-2"
                                        />
                                        <label htmlFor="email">Email Management</label>
                                    </div>
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            id="database"
                                            checked={newDomainPermissions.database}
                                            onChange={(e) =>
                                                setNewDomainPermissions({
                                                    ...newDomainPermissions,
                                                    database: e.target.checked
                                                })
                                            }
                                            className="mr-2"
                                        />
                                        <label htmlFor="database">Database Management</label>
                                    </div>
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            id="ftp"
                                            checked={newDomainPermissions.ftp}
                                            onChange={(e) =>
                                                setNewDomainPermissions({
                                                    ...newDomainPermissions,
                                                    ftp: e.target.checked
                                                })
                                            }
                                            className="mr-2"
                                        />
                                        <label htmlFor="ftp">FTP Management</label>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end space-x-2 mt-4">
                            <button
                                onClick={() => {
                                    setShowPermissionModal(false);
                                    setSelectedUser(null);
                                    resetForm();
                                }}
                                className="px-4 py-2 border rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => setDomainPermissions(selectedUser.id)}
                                className="px-4 py-2 bg-blue-500 text-white rounded"
                            >
                                Save Permissions
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManager; 
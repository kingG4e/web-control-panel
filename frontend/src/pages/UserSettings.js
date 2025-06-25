import React, { useState, useEffect } from 'react';
import PageLayout from '../components/layout/PageLayout';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorAlert from '../components/common/ErrorAlert';
import { useAuth } from '../contexts/AuthContext';
import { users, roles } from '../services/api';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  UserIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  KeyIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

const UserSettings = () => {
  const { user: currentUser } = useAuth();
  const [userList, setUserList] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Modal states
  const [showUserModal, setShowUserModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  
  // Form data
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirm_password: '',
    role: 'user',
    first_name: '',
    last_name: '',
    is_active: true,
  });

  // Permission form data
  const [permissionData, setPermissionData] = useState({
    domain: '',
    can_manage_vhost: false,
    can_manage_dns: false,
    can_manage_ssl: false,
    can_manage_email: false,
    can_manage_database: false,
    can_manage_ftp: false,
  });

  // Statistics
  const [stats, setStats] = useState({
    total_users: 0,
    active_users: 0,
    admin_users: 0,
    inactive_users: 0,
  });

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await users.getAll();
      setUserList(data);
      
      // Calculate stats from the new user list
      const stats = calculateStats(data);
      setStats(stats);
      
      setLoading(false);
      setError(null);
    } catch (err) {
      console.error('Fetch users error:', err);
      setError('Failed to fetch users: ' + (err.response?.data?.error || err.message));
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const roleData = await roles.getAll();
      setRoles(roleData);
    } catch (err) {
      console.error('Failed to fetch roles:', err);
    }
  };

  const calculateStats = (userList) => {
    const total = userList.length;
    const active = userList.filter(u => u.is_active).length;
    const admins = userList.filter(u => u.role === 'admin' || u.is_admin).length;
    const inactive = total - active;

    return {
      total_users: total,
      active_users: active,
      admin_users: admins,
      inactive_users: inactive,
    };
  };

  const handleCreateUser = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      email: '',
      password: '',
      confirm_password: '',
      role: 'user',
      first_name: '',
      last_name: '',
      is_active: true,
    });
    setShowUserModal(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      confirm_password: '',
      role: user.role || 'user',
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      is_active: user.is_active !== false,
    });
    setShowUserModal(true);
  };

  const handleDeleteUser = (user) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const confirmDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      const success = await users.delete(selectedUser.id);
      
      if (success) {
        // Optimistically remove user from UI immediately
        setUserList(prev => prev.filter(u => u.id !== selectedUser.id));
        const updatedStats = calculateStats(userList.filter(u => u.id !== selectedUser.id));
        setStats(updatedStats);
        
        setSuccess(`User ${selectedUser.username} deleted successfully`);
        setShowDeleteModal(false);
        setSelectedUser(null);
        
        // Optionally refresh from server in background
        fetchUsers();
        
        // Clear any existing errors
        setError(null);
        
        // Show success message for 3 seconds
        setTimeout(() => {
          setSuccess(null);
        }, 3000);
      }
    } catch (err) {
      console.error('Delete user error:', err);
      setError('Failed to delete user: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleSubmitUser = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.username || !formData.email) {
      setError('Username and email are required');
      return;
    }

    if (!editingUser && !formData.password) {
      setError('Password is required for new users');
      return;
    }

    if (formData.password && formData.password !== formData.confirm_password) {
      setError('Passwords do not match');
      return;
    }

    try {
      const userData = {
        username: formData.username,
        email: formData.email,
        role: formData.role,
        first_name: formData.first_name,
        last_name: formData.last_name,
        is_active: formData.is_active,
      };

      if (formData.password) {
        userData.password = formData.password;
      }

      if (editingUser) {
        await users.update(editingUser.id, userData);
        setSuccess(`User ${formData.username} updated successfully`);
      } else {
        await users.create(userData);
        setSuccess(`User ${formData.username} created successfully`);
      }

      setShowUserModal(false);
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      setError('Failed to save user: ' + (err.response?.data?.error || err.message));
    }
  };

  const handlePermissions = (user) => {
    setSelectedUser(user);
    setPermissionData({
      domain: '',
      can_manage_vhost: false,
      can_manage_dns: false,
      can_manage_ssl: false,
      can_manage_email: false,
      can_manage_database: false,
      can_manage_ftp: false,
    });
    setShowPermissionModal(true);
  };

  const handleSubmitPermissions = async (e) => {
    e.preventDefault();
    
    if (!permissionData.domain) {
      setError('Domain is required');
      return;
    }

    try {
      const permissions = {
        vhost: permissionData.can_manage_vhost,
        dns: permissionData.can_manage_dns,
        ssl: permissionData.can_manage_ssl,
        email: permissionData.can_manage_email,
        database: permissionData.can_manage_database,
        ftp: permissionData.can_manage_ftp,
      };

      await users.setDomainPermissions(selectedUser.id, {
        domain: permissionData.domain,
        permissions: permissions,
      });

      setSuccess(`Permissions set for ${selectedUser.username} on ${permissionData.domain}`);
      setShowPermissionModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (err) {
      setError('Failed to set permissions: ' + (err.response?.data?.error || err.message));
    }
  };

  const getUserStatusBadge = (user) => {
    const isActive = user.is_active !== false;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        isActive
          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
          : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      }`}>
        {isActive ? 'Active' : 'Inactive'}
      </span>
    );
  };

  const getRoleBadge = (role) => {
    const isAdmin = role === 'admin';
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        isAdmin
          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
      }`}>
        {role ? role.charAt(0).toUpperCase() + role.slice(1) : 'User'}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const actions = (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={fetchUsers}
        icon={<ArrowPathIcon className="w-4 h-4" />}
      >
        Refresh
      </Button>
      <Button
        variant="primary"
        size="sm"
        onClick={handleCreateUser}
        icon={<PlusIcon className="w-4 h-4" />}
      >
        Add User
      </Button>
    </>
  );

  if (loading) {
    return (
      <PageLayout title="User Management" description="Loading users...">
        <div className="flex justify-center items-center min-h-64">
          <LoadingSpinner />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="User Management"
      description="Manage users and their permissions"
      actions={actions}
    >
      <div className="space-y-6">
        {/* Alert Messages */}
        {error && (
          <ErrorAlert 
            message={error} 
            onClose={() => setError(null)} 
          />
        )}
        
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4 dark:bg-green-900/20 dark:border-green-800">
            <div className="flex">
              <CheckCircleIcon className="h-5 w-5 text-green-400" />
              <div className="ml-3">
                <p className="text-sm text-green-800 dark:text-green-300">{success}</p>
              </div>
            </div>
          </div>
        )}

        {/* Top Actions Bar */}
        <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg overflow-hidden">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                variant="secondary"
                size="sm"
                icon={<DocumentTextIcon className="w-4 h-4" />}
              >
                View Logs
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={<Cog6ToothIcon className="w-4 h-4" />}
              >
                Settings
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={<ShieldCheckIcon className="w-4 h-4" />}
              >
                Global Permissions
              </Button>
            </div>
            <Button
              variant="primary"
              size="sm"
              icon={<PlusIcon className="w-4 h-4" />}
              onClick={handleCreateUser}
            >
              Add User
            </Button>
          </div>
        </div>

        {/* Users List */}
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-[var(--table-header-bg)] border-y border-[var(--border-color)]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--secondary-text)] uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--secondary-text)] uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--secondary-text)] uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--secondary-text)] uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--secondary-text)] uppercase tracking-wider">Last Login</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[var(--secondary-text)] uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-[var(--card-bg)] divide-y divide-[var(--border-color)]">
                {userList.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-[var(--secondary-text)]">
                      No users found. Click "Add User" to create the first user.
                    </td>
                  </tr>
                ) : (
                  userList.map((user) => (
                    <tr key={user.id} className="hover:bg-[var(--hover-bg)] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <UserIcon className="w-5 h-5 text-[var(--accent-color)] mr-3" />
                          <div>
                            <div className="text-sm font-medium text-[var(--primary-text)]">
                              {user.username}
                            </div>
                            {(user.first_name || user.last_name) && (
                              <div className="text-xs text-[var(--secondary-text)]">
                                {user.first_name} {user.last_name}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--primary-text)]">
                        {user.email}
                      </td>
                      <td className="px-6 py-4">
                        {getRoleBadge(user.role)}
                      </td>
                      <td className="px-6 py-4">
                        {getUserStatusBadge(user)}
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--secondary-text)]">
                        {formatDate(user.last_login)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => handleEditUser(user)}
                            className="text-[var(--secondary-text)] hover:text-[var(--accent-color)] transition-colors"
                            title="Edit User"
                          >
                            <PencilIcon className="w-5 h-5" />
                          </button>

                          {user.username !== 'root' && (
                            <>
                              <button
                                onClick={() => handlePermissions(user)}
                                className="text-[var(--secondary-text)] hover:text-[var(--accent-color)] transition-colors"
                                title="Manage Permissions"
                              >
                                <KeyIcon className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user)}
                                className="text-[var(--danger-color)] hover:text-[var(--danger-color)]/80 transition-colors"
                                title="Delete User"
                              >
                                <TrashIcon className="w-5 h-5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* User Stats */}
          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-[var(--primary-text)]">User Statistics</h3>
              <Button
                variant="ghost"
                size="sm"
                icon={<ArrowPathIcon className="w-4 h-4" />}
                onClick={fetchUsers}
              >
                Refresh
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-[var(--secondary-text)]">Active Users</span>
                  <span className="text-[var(--primary-text)]">{stats.active_users} / {stats.total_users}</span>
                </div>
                <div className="h-2 bg-[var(--border-color)] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 rounded-full transition-all duration-300" 
                    style={{ width: `${stats.total_users > 0 ? (stats.active_users / stats.total_users) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-[var(--secondary-text)]">Admins</span>
                  <span className="text-[var(--primary-text)]">{stats.admin_users} / {stats.total_users}</span>
                </div>
                <div className="h-2 bg-[var(--border-color)] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[var(--accent-color)] rounded-full transition-all duration-300" 
                    style={{ width: `${stats.total_users > 0 ? (stats.admin_users / stats.total_users) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-[var(--primary-text)]">Recent Activity</h3>
              <Button
                variant="ghost"
                size="sm"
                icon={<ArrowPathIcon className="w-4 h-4" />}
                onClick={fetchUsers}
              >
                Refresh
              </Button>
            </div>
            <div className="space-y-3">
              {userList
                .filter(user => user.last_login)
                .sort((a, b) => new Date(b.last_login) - new Date(a.last_login))
                .slice(0, 3)
                .map(user => (
                  <div key={user.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <UserIcon className="w-4 h-4 text-[var(--accent-color)]" />
                      <span className="text-[var(--primary-text)]">{user.username}</span>
                    </div>
                    <span className="text-[var(--secondary-text)]">
                      {formatDate(user.last_login)}
                    </span>
                  </div>
                ))}
              {userList.filter(user => user.last_login).length === 0 && (
                <div className="text-sm text-[var(--secondary-text)] text-center py-4">
                  No recent login activity
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg p-6">
            <h3 className="text-lg font-medium text-[var(--primary-text)] mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="secondary"
                size="sm"
                icon={<UserGroupIcon className="w-4 h-4" />}
                className="justify-start"
                onClick={() => {
                  // TODO: Implement bulk import
                  setError('Bulk import feature coming soon');
                }}
              >
                Bulk Import
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={<DocumentTextIcon className="w-4 h-4" />}
                className="justify-start"
                onClick={() => {
                  // TODO: Implement view logs
                  setError('View logs feature coming soon');
                }}
              >
                View Logs
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={<ShieldCheckIcon className="w-4 h-4" />}
                className="justify-start"
                onClick={() => {
                  // TODO: Implement global permissions
                  setError('Global permissions feature coming soon');
                }}
              >
                Permissions
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={<Cog6ToothIcon className="w-4 h-4" />}
                className="justify-start"
                onClick={() => {
                  // TODO: Implement settings
                  setError('Settings feature coming soon');
                }}
              >
                Settings
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* User Form Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[120] overflow-y-auto">
          <div className="min-h-full flex items-center justify-center p-4">
            <div className="bg-[var(--card-bg)] p-6 rounded-xl border border-[var(--border-color)] w-full max-w-md my-8">
              <h2 className="text-xl font-bold text-[var(--primary-text)] mb-6">
                {editingUser ? 'Edit User' : 'Add User'}
              </h2>
              <form onSubmit={handleSubmitUser} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      className="input-field"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">
                    Username *
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">
                    Role
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="input-field"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-4 w-4 text-[var(--accent-color)] focus:ring-[var(--accent-color)] border-[var(--border-color)] rounded"
                  />
                  <label htmlFor="is_active" className="ml-2 block text-sm text-[var(--secondary-text)]">
                    Active
                  </label>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">
                    Password {!editingUser && '*'}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="input-field"
                    required={!editingUser}
                    placeholder={editingUser ? 'Leave blank to keep current password' : ''}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">
                    Confirm Password {!editingUser && '*'}
                  </label>
                  <input
                    type="password"
                    value={formData.confirm_password}
                    onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                    className="input-field"
                    required={!editingUser}
                  />
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setShowUserModal(false);
                      setEditingUser(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    type="submit"
                  >
                    {editingUser ? 'Save Changes' : 'Create User'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Permission Modal */}
      {showPermissionModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[120] overflow-y-auto">
          <div className="min-h-full flex items-center justify-center p-4">
            <div className="bg-[var(--card-bg)] p-6 rounded-xl border border-[var(--border-color)] w-full max-w-md my-8">
              <h2 className="text-xl font-bold text-[var(--primary-text)] mb-6">
                Set Domain Permissions for {selectedUser.username}
              </h2>
              <form onSubmit={handleSubmitPermissions} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">
                    Domain *
                  </label>
                  <input
                    type="text"
                    value={permissionData.domain}
                    onChange={(e) => setPermissionData({ ...permissionData, domain: e.target.value })}
                    className="input-field"
                    placeholder="example.com"
                    required
                  />
                </div>
                
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-[var(--primary-text)]">Permissions</h3>
                  
                  {[
                    { key: 'can_manage_vhost', label: 'Virtual Hosts' },
                    { key: 'can_manage_dns', label: 'DNS Management' },
                    { key: 'can_manage_ssl', label: 'SSL Certificates' },
                    { key: 'can_manage_email', label: 'Email Management' },
                    { key: 'can_manage_database', label: 'Database Management' },
                    { key: 'can_manage_ftp', label: 'FTP Management' },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center">
                      <input
                        type="checkbox"
                        id={key}
                        checked={permissionData[key]}
                        onChange={(e) => setPermissionData({ 
                          ...permissionData, 
                          [key]: e.target.checked 
                        })}
                        className="h-4 w-4 text-[var(--accent-color)] focus:ring-[var(--accent-color)] border-[var(--border-color)] rounded"
                      />
                      <label htmlFor={key} className="ml-2 block text-sm text-[var(--secondary-text)]">
                        {label}
                      </label>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setShowPermissionModal(false);
                      setSelectedUser(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    type="submit"
                  >
                    Set Permissions
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[120] overflow-y-auto">
          <div className="min-h-full flex items-center justify-center p-4">
            <div className="bg-[var(--card-bg)] p-6 rounded-xl border border-[var(--border-color)] w-full max-w-md my-8">
              <div className="flex items-center mb-4">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-500 mr-3" />
                <h2 className="text-xl font-bold text-[var(--primary-text)]">
                  Confirm Delete
                </h2>
              </div>
              
              <p className="text-[var(--secondary-text)] mb-6">
                Are you sure you want to delete user <strong>{selectedUser.username}</strong>? 
                This action cannot be undone and will remove all associated data and permissions.
              </p>
              
              <div className="flex justify-end space-x-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedUser(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={confirmDeleteUser}
                >
                  Delete User
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default UserSettings; 
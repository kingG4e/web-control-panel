import React, { useState, useEffect, useMemo } from 'react';
import PageLayout from '../components/layout/PageLayout';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorAlert from '../components/common/ErrorAlert';
import { useAuth } from '../contexts/AuthContext';
import { users } from '../services/api';
import {
  PlusIcon,
  ArrowPathIcon,
  UserIcon,
  UserGroupIcon,
  PencilIcon,
  TrashIcon,
  KeyIcon,
  XMarkIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

// ------------------ Helper Components ------------------
const StatBox = ({ title, value, icon: Icon, accent = 'text-[var(--accent-color)]' }) => (
  <div className="flex items-center p-4 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg gap-4">
    <div className={`p-2 rounded-full bg-[var(--border-color)] ${accent}`}>
      <Icon className="w-6 h-6" />
    </div>
    <div>
      <p className="text-sm text-[var(--secondary-text)]">{title}</p>
      <p className="text-lg font-semibold text-[var(--primary-text)]">{value}</p>
    </div>
  </div>
);

// -------------------------------------------------------

const UserSettings = () => {
  useAuth(); // initialize context (authentication already handled globally)
  const [userList, setUserList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  // Modal states
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [targetUser, setTargetUser] = useState(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [permUser, setPermUser] = useState(null);

  // Form data
  const initialForm = {
    username: '',
    email: '',
    password: '',
    confirm_password: '',
    role: 'user',
    first_name: '',
    last_name: '',
    is_active: true,
  };
  const [formData, setFormData] = useState(initialForm);
  const initialPerm = {
    domain: '',
    can_manage_vhost: false,
    can_manage_dns: false,
    can_manage_ssl: false,
    can_manage_email: false,
    can_manage_database: false,
    can_manage_ftp: false,
  };
  const [permData, setPermData] = useState(initialPerm);

  // ---------- Derived data ----------
  const filteredUsers = useMemo(() => {
    return userList.filter((u) => {
      const matchesSearch =
        searchTerm === '' ||
        u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === '' || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [userList, searchTerm, roleFilter]);

  const availableRoles = useMemo(() => Array.from(new Set(userList.map((u) => u.role))), [userList]);

  const stats = useMemo(() => {
    const total = userList.length;
    const active = userList.filter((u) => u.is_active).length;
    const admins = userList.filter((u) => u.role === 'admin' || u.is_admin).length;
    const inactive = total - active;
    return { total, active, admins, inactive };
  }, [userList]);

  // ---------- Effects ----------
  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // ---------- API Calls ----------
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await users.getAll();
      setUserList(data);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setLoading(false);
    }
  };

  const upsertUser = async () => {
    // basic validation
    if (!formData.username || !formData.email) {
      setError('Username & email are required');
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
      const payload = { ...formData };
      if (!payload.password) delete payload.password;
      if (editingUser) {
        await users.update(editingUser.id, payload);
        setSuccess('User updated');
      } else {
        await users.create(payload);
        setSuccess('User created');
      }
      setShowUserModal(false);
      setFormData(initialForm);
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const deleteUser = async () => {
    if (!targetUser) return;
    try {
      if (targetUser.id) {
        await users.delete(targetUser.id);
      } else {
        await users.deleteSystem(targetUser.username);
      }
      setSuccess('User deleted');
      setShowDeleteConfirm(false);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const openPermissionModal = (user) => {
    setPermUser(user);
    setPermData(initialPerm);
    setShowPermissionModal(true);
  };

  const submitPermissions = async () => {
    if (!permData.domain) {
      setError('Domain is required');
      return;
    }
    try {
      const permissions = {
        vhost: permData.can_manage_vhost,
        dns: permData.can_manage_dns,
        ssl: permData.can_manage_ssl,
        email: permData.can_manage_email,
        database: permData.can_manage_database,
        ftp: permData.can_manage_ftp,
      };
      await users.setDomainPermissions(permUser.id, { domain: permData.domain, permissions });
      setSuccess(`Permissions set for ${permUser.username}`);
      setShowPermissionModal(false);
      setPermUser(null);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  // ---------- Render helpers ----------
  const formatDate = (d) => (d ? new Date(d).toLocaleString() : 'Never');
  const RoleBadge = ({ role }) => (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
        role === 'admin'
          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
      }`}
    >
      {role === 'system_user' ? 'User' : role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
  );

  const StatusBadge = ({ active }) => (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
        active
          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
          : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      }`}
    >
      {active ? 'Active' : 'Inactive'}
    </span>
  );

  // ------------------------------------------------------

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
      description="Manage users, roles and view statistics."
    >
      {/* Alerts */}
      {error && <ErrorAlert message={error} onClose={() => setError(null)} />}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4 flex items-center gap-2 dark:bg-green-900/20 dark:border-green-800">
          <CheckCircleIcon className="h-5 w-5 text-green-500" />
          <p className="text-sm text-green-800 dark:text-green-300">{success}</p>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatBox title="Total Users" value={stats.total} icon={UserGroupIcon} />
        <StatBox title="Active Users" value={stats.active} icon={CheckCircleIcon} accent="text-green-500" />
        <StatBox title="Admins" value={stats.admins} icon={KeyIcon} accent="text-blue-500" />
        <StatBox title="Inactive Users" value={stats.inactive} icon={UserIcon} accent="text-red-500" />
      </div>

      {/* User Management Section */}
      <>
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field w-full sm:w-64"
            />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="input-field w-full sm:w-40"
            >
              <option value="">All Roles</option>
              {availableRoles.map((r) => (
                <option key={r} value={r}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </option>
              ))}
            </select>
            {(searchTerm || roleFilter) && (
              <Button variant="ghost" size="sm" onClick={() => { setSearchTerm(''); setRoleFilter(''); }}>
                Clear
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" icon={<ArrowPathIcon className="w-4 h-4" />} onClick={fetchUsers}>
              Refresh
            </Button>
            {/* <Button variant="primary" size="sm" icon={<PlusIcon className="w-4 h-4" />} onClick={() => setShowUserModal(true)}>
              New User
            </Button> */}
          </div>
        </div>

        {/* User Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--table-header-bg)] border-b border-[var(--border-color)]">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold">User</th>
                  <th className="px-6 py-3 text-left font-semibold">Email</th>
                  <th className="px-6 py-3 text-left font-semibold">Role</th>
                  <th className="px-6 py-3 text-left font-semibold">Status</th>
                  <th className="px-6 py-3 text-left font-semibold">Last Login</th>
                  <th className="px-6 py-3 text-left font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-[var(--secondary-text)]">
                      {userList.length === 0 ? 'No users found.' : 'No users match your search.'}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-[var(--hover-bg)]">
                      <td className="px-6 py-4 flex items-center gap-2">
                        <UserIcon className="w-5 h-5 text-[var(--accent-color)]" />
                        <span>{u.username}</span>
                      </td>
                      <td className="px-6 py-4">{u.email}</td>
                      <td className="px-6 py-4"><RoleBadge role={u.role} /></td>
                      <td className="px-6 py-4"><StatusBadge active={u.is_active !== false} /></td>
                      <td className="px-6 py-4 text-[var(--secondary-text)]">{formatDate(u.last_login)}</td>
                      <td className="px-6 py-4 flex gap-3">
                        <button title="Edit" onClick={() => { setEditingUser(u); setFormData({ ...initialForm, ...u, password: '', confirm_password: '' }); setShowUserModal(true); }} className="text-[var(--secondary-text)] hover:text-[var(--accent-color)]">
                          <PencilIcon className="w-5 h-5" />
                        </button>
                        {u.username !== 'root' && (
                          <>
                            <button title="Permissions" onClick={() => openPermissionModal(u)} className="text-[var(--secondary-text)] hover:text-[var(--accent-color)]">
                              <KeyIcon className="w-5 h-5" />
                            </button>
                            <button title="Delete" onClick={() => { setTargetUser(u); setShowDeleteConfirm(true); }} className="text-[var(--danger-color)] hover:text-[var(--danger-color)]/80">
                              <TrashIcon className="w-5 h-5" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </>

      {/* User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-[var(--card-bg)] w-full max-w-md p-6 rounded-xl border border-[var(--border-color)] relative">
            <button className="absolute top-3 right-3 text-[var(--secondary-text)] hover:text-[var(--primary-text)]" onClick={() => { setShowUserModal(false); setEditingUser(null); }}>
              <XMarkIcon className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold mb-4">{editingUser ? 'Edit User' : 'New User'}</h2>
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              {/* Form Fields */}
              {[
                { label: 'Username', key: 'username', type: 'text', required: true },
                { label: 'Email', key: 'email', type: 'email', required: true },
                { label: 'First Name', key: 'first_name', type: 'text' },
                { label: 'Last Name', key: 'last_name', type: 'text' },
              ].map(({ label, key, type, required }) => (
                <div key={key}>
                  <label className="block text-sm mb-1 text-[var(--secondary-text)]">{label}{required && ' *'}</label>
                  <input
                    type={type}
                    value={formData[key]}
                    onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                    className="input-field w-full"
                    required={required}
                  />
                </div>
              ))}
              {/* Role & Status */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm mb-1 text-[var(--secondary-text)]">Role</label>
                  <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="input-field w-full">
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input type="checkbox" id="is_active" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="h-4 w-4 text-[var(--accent-color)] border-[var(--border-color)]" />
                  <label htmlFor="is_active" className="text-sm text-[var(--secondary-text)]">Active</label>
                </div>
              </div>
              {/* Password fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { label: 'Password', key: 'password' },
                  { label: 'Confirm Password', key: 'confirm_password' },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <label className="block text-sm mb-1 text-[var(--secondary-text)]">{label}{!editingUser && ' *'}</label>
                    <input
                      type="password"
                      value={formData[key]}
                      onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                      className="input-field w-full"
                      required={!editingUser}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="secondary" onClick={() => { setShowUserModal(false); setEditingUser(null); }}>Cancel</Button>
              <Button variant="primary" onClick={upsertUser}>{editingUser ? 'Save' : 'Create'}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-[var(--card-bg)] w-full max-w-sm p-6 rounded-xl border border-[var(--border-color)] text-center">
            <p className="mb-6 text-[var(--secondary-text)]">Delete user <strong>{targetUser?.username}</strong>? This action cannot be undone.</p>
            <div className="flex justify-center gap-3">
              <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
              <Button variant="danger" onClick={deleteUser}>Delete</Button>
            </div>
          </div>
        </div>
      )}

      {/* Permission Modal */}
      {showPermissionModal && permUser && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-[var(--card-bg)] w-full max-w-md p-6 rounded-xl border border-[var(--border-color)] relative">
            <button className="absolute top-3 right-3 text-[var(--secondary-text)] hover:text-[var(--primary-text)]" onClick={() => { setShowPermissionModal(false); setPermUser(null); }}>
              <XMarkIcon className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold mb-4">Set Permissions for {permUser.username}</h2>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div>
                <label className="block text-sm mb-1 text-[var(--secondary-text)]">Domain *</label>
                <input type="text" value={permData.domain} onChange={(e) => setPermData({ ...permData, domain: e.target.value })} className="input-field w-full" placeholder="example.com" />
              </div>
              <div className="space-y-2">
                {[
                  { key: 'can_manage_vhost', label: 'Virtual Hosts' },
                  { key: 'can_manage_dns', label: 'DNS' },
                  { key: 'can_manage_ssl', label: 'SSL Certificates' },
                  { key: 'can_manage_email', label: 'Email' },
                  { key: 'can_manage_database', label: 'Database' },
                  { key: 'can_manage_ftp', label: 'FTP' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-2">
                    <input type="checkbox" id={key} checked={permData[key]} onChange={(e) => setPermData({ ...permData, [key]: e.target.checked })} className="h-4 w-4 text-[var(--accent-color)] border-[var(--border-color)]" />
                    <label htmlFor={key} className="text-sm text-[var(--secondary-text)]">{label}</label>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="secondary" onClick={() => { setShowPermissionModal(false); setPermUser(null); }}>Cancel</Button>
              <Button variant="primary" onClick={submitPermissions}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default UserSettings; 
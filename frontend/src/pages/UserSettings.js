import React, { useState } from 'react';
import PageLayout from '../components/layout/PageLayout';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { useData } from '../contexts/DataContext';
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
} from '@heroicons/react/24/outline';

const UserSettings = () => {
  const { users } = useData();
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    role: 'user',
    password: '',
    confirm_password: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    // TODO: Implement save logic
    setShowForm(false);
    setEditingUser(null);
  };

  const actions = (
    <>
      <Button
        variant="outline"
        size="sm"
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
        }
      >
        Filter
      </Button>
      <Button
        variant="primary"
        size="sm"
        onClick={() => {
          setEditingUser(null);
          setFormData({
            username: '',
            email: '',
            role: 'user',
            password: '',
            confirm_password: '',
          });
          setShowForm(true);
        }}
        icon={<PlusIcon className="w-4 h-4" />}
      >
        Add User
      </Button>
    </>
  );

  return (
    <PageLayout
      title="User Management"
      description="Manage users and their permissions"
      actions={actions}
    >
      <div className="space-y-6">
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
                Permissions
              </Button>
            </div>
            <Button
              variant="primary"
              size="sm"
              icon={<PlusIcon className="w-4 h-4" />}
              onClick={() => {
                setEditingUser(null);
                setFormData({
                  username: '',
                  email: '',
                  role: 'user',
                  password: '',
                  confirm_password: '',
                });
                setShowForm(true);
              }}
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
                {users?.map((user) => (
                  <tr key={user.id} className="hover:bg-[var(--hover-bg)] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <UserIcon className="w-5 h-5 text-[var(--accent-color)] mr-3" />
                        <span className="text-sm text-[var(--primary-text)]">{user.username}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--primary-text)]">
                      {user.email}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.role === 'admin'
                          ? 'bg-[var(--accent-color)]/10 text-[var(--accent-color)]'
                          : 'bg-[var(--border-color)] text-[var(--secondary-text)]'
                      }`}>
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.status === 'active'
                          ? 'bg-[var(--success-color)]/10 text-[var(--success-color)]'
                          : 'bg-[var(--danger-color)]/10 text-[var(--danger-color)]'
                      }`}>
                        {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--secondary-text)]">
                      {user.last_login || 'Never'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => {
                            setEditingUser(user);
                            setFormData({
                              ...user,
                              password: '',
                              confirm_password: '',
                            });
                            setShowForm(true);
                          }}
                          className="text-[var(--secondary-text)] hover:text-[var(--accent-color)] transition-colors"
                        >
                          <PencilIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => {}}
                          className="text-[var(--secondary-text)] hover:text-[var(--accent-color)] transition-colors"
                        >
                          <KeyIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => {}}
                          className="text-[var(--danger-color)] hover:text-[var(--danger-color)]/80 transition-colors"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
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
              >
                Refresh
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-[var(--secondary-text)]">Active Users</span>
                  <span className="text-[var(--primary-text)]">8 / 10</span>
                </div>
                <div className="h-2 bg-[var(--border-color)] rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--success-color)] rounded-full" style={{ width: '80%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-[var(--secondary-text)]">Admins</span>
                  <span className="text-[var(--primary-text)]">2 / 10</span>
                </div>
                <div className="h-2 bg-[var(--border-color)] rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--accent-color)] rounded-full" style={{ width: '20%' }}></div>
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
              >
                Refresh
              </Button>
            </div>
            <div className="space-y-3">
              {users?.slice(0, 3).map(user => (
                <div key={user.id} className="flex items-center justify-between text-sm">
                  <span className="text-[var(--secondary-text)]">{user.username}</span>
                  <span className="text-[var(--primary-text)]">{user.last_login || 'Never'}</span>
                </div>
              ))}
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
              >
                Bulk Import
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={<DocumentTextIcon className="w-4 h-4" />}
                className="justify-start"
              >
                View Logs
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={<ShieldCheckIcon className="w-4 h-4" />}
                className="justify-start"
              >
                Permissions
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={<Cog6ToothIcon className="w-4 h-4" />}
                className="justify-start"
              >
                Settings
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* User Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm z-50">
          <div className="bg-[var(--card-bg)] p-6 rounded-xl border border-[var(--border-color)] w-full max-w-md">
            <h2 className="text-xl font-bold text-[var(--primary-text)] mb-6">
              {editingUser ? 'Edit User' : 'Add User'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">
                    Username
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
                    Email
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
                <div>
                  <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="input-field"
                    required={!editingUser}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={formData.confirm_password}
                    onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                    className="input-field"
                    required={!editingUser}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowForm(false);
                    setEditingUser(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                >
                  {editingUser ? 'Save Changes' : 'Add User'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default UserSettings; 
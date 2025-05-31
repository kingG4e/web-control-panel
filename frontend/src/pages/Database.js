import React, { useState } from 'react';
import PageLayout from '../components/layout/PageLayout';
import Button from '../components/ui/Button';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import Table, { TableHeader, TableBody, TableRow, TableCell, TableHeaderCell } from '../components/ui/Table';
import { useData } from '../contexts/DataContext';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CircleStackIcon,
  UserIcon,
  KeyIcon,
  ServerIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  CommandLineIcon,
} from '@heroicons/react/24/outline';

const Database = () => {
  const {
    databases,
    addDatabase,
    updateDatabase,
    deleteDatabase
  } = useData();

  const [selectedDatabases, setSelectedDatabases] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingDb, setEditingDb] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'mysql',
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci',
    username: '',
    password: '',
  });

  const handleSelectDatabase = (id) => {
    setSelectedDatabases(prev => 
      prev.includes(id) 
        ? prev.filter(dbId => dbId !== id)
        : [...prev, id]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (editingDb) {
        updateDatabase(editingDb.id, formData);
      } else {
        addDatabase(formData);
      }

      setShowForm(false);
      setEditingDb(null);
      setFormData({
        name: '',
        type: 'mysql',
        charset: 'utf8mb4',
        collation: 'utf8mb4_unicode_ci',
        username: '',
        password: '',
      });
    } catch (err) {
      console.error('Failed to save database:', err);
    }
  };

  const handleEdit = (db) => {
    setEditingDb(db);
    setFormData({
      name: db.name,
      type: db.type || 'mysql',
      charset: db.charset,
      collation: db.collation,
      username: db.users?.[0]?.username || '',
      password: '',
    });
    setShowForm(true);
  };

  const handleDelete = async (dbId) => {
    if (!window.confirm('Are you sure you want to delete this database? This action cannot be undone.')) {
      return;
    }

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      deleteDatabase(dbId);
    } catch (err) {
      console.error('Failed to delete database:', err);
    }
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
          setEditingDb(null);
          setFormData({
            name: '',
            type: 'mysql',
            charset: 'utf8mb4',
            collation: 'utf8mb4_unicode_ci',
            username: '',
            password: '',
          });
          setShowForm(true);
        }}
        icon={<PlusIcon className="w-4 h-4" />}
      >
        Create Database
      </Button>
    </>
  );

  return (
    <PageLayout
      title="Database Management"
      description="Create and manage your databases"
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
                icon={<CommandLineIcon className="w-4 h-4" />}
              >
                Console
              </Button>
            </div>
            <Button
              variant="primary"
              size="sm"
              icon={<PlusIcon className="w-4 h-4" />}
              onClick={() => {
                setEditingDb(null);
                setFormData({
                  name: '',
                  type: 'mysql',
                  charset: 'utf8mb4',
                  collation: 'utf8mb4_unicode_ci',
                  username: '',
                  password: '',
                });
                setShowForm(true);
              }}
            >
              Create Database
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg overflow-hidden">
          {/* Selection Actions */}
          <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                variant="secondary"
                size="sm"
                disabled={selectedDatabases.length === 0}
                icon={<TrashIcon className="w-4 h-4" />}
              >
                Delete Selected
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={selectedDatabases.length === 0}
                icon={<CircleStackIcon className="w-4 h-4" />}
              >
                Backup Selected
              </Button>
      </div>
            <span className="text-sm text-[var(--secondary-text)]">
              {selectedDatabases.length} selected
            </span>
          </div>

          {/* Database Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
              <tr>
                  <th className="w-4 p-4">
                    <input
                      type="checkbox"
                      className="rounded border-[var(--border-color)] text-[var(--accent-color)] focus:ring-[var(--accent-color)]"
                      onChange={(e) => {
                        setSelectedDatabases(
                          e.target.checked && Array.isArray(databases) ? databases.map(db => db.id) : []
                        );
                      }}
                      checked={Array.isArray(databases) && selectedDatabases.length === databases.length && databases.length > 0}
                    />
                </th>
                  <th className="px-6 py-3 bg-[var(--secondary-bg)] text-left text-xs font-medium text-[var(--secondary-text)] uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 bg-[var(--secondary-bg)] text-left text-xs font-medium text-[var(--secondary-text)] uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 bg-[var(--secondary-bg)] text-left text-xs font-medium text-[var(--secondary-text)] uppercase tracking-wider">Charset</th>
                  <th className="px-6 py-3 bg-[var(--secondary-bg)] text-left text-xs font-medium text-[var(--secondary-text)] uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 bg-[var(--secondary-bg)] text-left text-xs font-medium text-[var(--secondary-text)] uppercase tracking-wider">Users</th>
                  <th className="px-6 py-3 bg-[var(--secondary-bg)] text-left text-xs font-medium text-[var(--secondary-text)] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {Array.isArray(databases) && databases.map((db) => (
                  <tr key={db.id} className="hover:bg-[var(--hover-bg)] transition-colors">
                    <td className="w-4 p-4">
                      <input
                        type="checkbox"
                        className="rounded border-[var(--border-color)] text-[var(--accent-color)] focus:ring-[var(--accent-color)]"
                        checked={selectedDatabases.includes(db.id)}
                        onChange={() => handleSelectDatabase(db.id)}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <CircleStackIcon className="w-5 h-5 text-[var(--accent-color)] mr-3" />
                        <span className="text-sm font-medium text-[var(--primary-text)]">{db.name}</span>
                    </div>
                  </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--accent-color)]/10 text-[var(--accent-color)]">
                        {db.type}
                      </span>
                  </td>
                    <td className="px-6 py-4 text-sm text-[var(--primary-text)]">
                      {db.charset}_{db.collation}
                  </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        db.status === 'active'
                          ? 'bg-[var(--success-color)]/10 text-[var(--success-color)]'
                          : 'bg-[var(--border-color)] text-[var(--secondary-text)]'
                      }`}>
                      {db.status}
                    </span>
                  </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-1">
                        {db.users?.map((user) => (
                          <div
                            key={user.id}
                            className="w-6 h-6 rounded-full bg-[var(--accent-color)]/10 flex items-center justify-center"
                            title={user.username}
                      >
                            <UserIcon className="w-4 h-4 text-[var(--accent-color)]" />
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                      <button
                          onClick={() => handleEdit(db)}
                          className="text-[var(--secondary-text)] hover:text-[var(--accent-color)] transition-colors"
                      >
                          <PencilIcon className="w-5 h-5" />
                      </button>
                      <button
                          onClick={() => {}}
                          className="text-[var(--secondary-text)] hover:text-[var(--accent-color)] transition-colors"
                      >
                          <CommandLineIcon className="w-5 h-5" />
                      </button>
                      <button
                          onClick={() => handleDelete(db.id)}
                          className="text-[var(--danger-color)] hover:text-[var(--danger-color)]/80 transition-colors"
                      >
                          <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
                {(!Array.isArray(databases) || databases.length === 0) && (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-[var(--secondary-text)]">
                      No databases found. Click "Create Database" to add one.
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>
      </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Database Status */}
          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-[var(--primary-text)]">Database Status</h3>
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
                  <span className="text-[var(--secondary-text)]">Active Databases</span>
                  <span className="text-[var(--primary-text)]">
                    {Array.isArray(databases) ? databases.filter(db => db.status === 'active').length : 0} / {Array.isArray(databases) ? databases.length : 0}
                  </span>
                </div>
                <div className="h-2 bg-[var(--border-color)] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[var(--success-color)] rounded-full" 
                    style={{ 
                      width: Array.isArray(databases) && databases.length > 0
                        ? `${(databases.filter(db => db.status === 'active').length / databases.length) * 100}%`
                        : '0%'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Database Types */}
          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-[var(--primary-text)]">Database Types</h3>
              <Button
                variant="ghost"
                size="sm"
                icon={<ArrowPathIcon className="w-4 h-4" />}
              >
                Refresh
              </Button>
            </div>
            <div className="space-y-3">
              {Array.isArray(databases) && databases.length > 0 ? (
                Object.entries(
                  databases.reduce((acc, db) => ({
                    ...acc,
                    [db.type]: (acc[db.type] || 0) + 1
                  }), {})
                ).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between text-sm">
                    <span className="text-[var(--secondary-text)]">{type}</span>
                    <span className="text-[var(--primary-text)]">{count}</span>
                  </div>
                ))
              ) : (
                <div className="text-sm text-[var(--secondary-text)]">No databases available</div>
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
                icon={<CircleStackIcon className="w-4 h-4" />}
                className="justify-start"
              >
                Backup All
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
                icon={<CommandLineIcon className="w-4 h-4" />}
                className="justify-start"
              >
                Console
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

        {/* Database Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm z-50">
            <div className="bg-[var(--card-bg)] p-6 rounded-xl border border-[var(--border-color)] w-full max-w-md">
              <h2 className="text-xl font-bold text-[var(--primary-text)] mb-6">
                {editingDb ? 'Edit Database' : 'Create Database'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">
                  Database Name
                </label>
                <input
                  type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-field"
                    placeholder="my_database"
                    required
                />
              </div>
              <div>
                  <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">
                    Database Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="input-field"
                  >
                    <option value="mysql">MySQL</option>
                    <option value="postgresql">PostgreSQL</option>
                    <option value="mongodb">MongoDB</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">
                    Charset
                  </label>
                  <select
                    value={formData.charset}
                    onChange={(e) => setFormData({ ...formData, charset: e.target.value })}
                    className="input-field"
                  >
                    <option value="utf8mb4">UTF-8 Unicode (utf8mb4)</option>
                    <option value="utf8">UTF-8 (utf8)</option>
                    <option value="latin1">Latin1 (latin1)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">
                    Collation
                  </label>
                  <select
                    value={formData.collation}
                    onChange={(e) => setFormData({ ...formData, collation: e.target.value })}
                    className="input-field"
                  >
                    <option value="utf8mb4_unicode_ci">utf8mb4_unicode_ci</option>
                    <option value="utf8mb4_general_ci">utf8mb4_general_ci</option>
                    <option value="utf8_unicode_ci">utf8_unicode_ci</option>
                    <option value="utf8_general_ci">utf8_general_ci</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">
                    Database User
                </label>
                <input
                  type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="input-field"
                    placeholder="database_user"
                    required
                />
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
                    placeholder={editingDb ? 'Leave blank to keep current password' : 'Enter password'}
                    required={!editingDb}
                />
              </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setShowForm(false);
                      setEditingDb(null);
                    }}
                >
                  Cancel
                  </Button>
                  <Button
                    variant="primary"
                    type="submit"
                  >
                    {editingDb ? 'Save Changes' : 'Create Database'}
                  </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </PageLayout>
  );
};

export default Database; 
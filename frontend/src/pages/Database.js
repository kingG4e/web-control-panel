import React, { useState } from 'react';
import { Link } from 'react-router-dom';
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

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
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

  const filteredDatabases = databases.filter(db => {
    const matchesSearch = db.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || db.type.toLowerCase() === filterType.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedDatabases(filteredDatabases.map(db => db.id));
    } else {
      setSelectedDatabases([]);
    }
  };

  const handleSelect = (dbId) => {
    if (selectedDatabases.includes(dbId)) {
      setSelectedDatabases(selectedDatabases.filter(id => id !== dbId));
    } else {
      setSelectedDatabases([...selectedDatabases, dbId]);
    }
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

  const DatabaseActions = () => (
    <div className="flex items-center space-x-2">
      <button
        disabled={selectedDatabases.length === 0}
        className={`px-3 py-1 rounded text-sm ${
          selectedDatabases.length === 0
            ? 'bg-[var(--disabled-bg)] text-[var(--disabled-text)]'
            : 'bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)]'
        } transition-colors`}
      >
        Backup
      </button>
      <button
        disabled={selectedDatabases.length === 0}
        className={`px-3 py-1 rounded text-sm ${
          selectedDatabases.length === 0
            ? 'bg-[var(--disabled-bg)] text-[var(--disabled-text)]'
            : 'bg-red-500 text-white hover:bg-red-600'
        } transition-colors`}
      >
        Delete
      </button>
    </div>
  );

  return (
    <PageLayout
      title="Database Management"
      description="Create and manage your databases"
    >
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
    <div>
            <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Databases</h1>
            <p className="mt-1 text-[var(--text-secondary)]">Manage your MySQL and PostgreSQL databases</p>
          </div>
          <Link
            to="/database/new"
            className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-dark)] transition-colors"
          >
            Create Database
          </Link>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Search databases..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg focus:outline-none focus:border-[var(--primary)] text-[var(--text-primary)]"
              />
              <svg
                className="absolute left-3 top-2.5 h-5 w-5 text-[var(--text-secondary)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
      </div>
          <div className="flex gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg focus:outline-none focus:border-[var(--primary)] text-[var(--text-primary)]"
            >
              <option value="all">All Types</option>
              <option value="mysql">MySQL</option>
              <option value="postgresql">PostgreSQL</option>
            </select>
            <DatabaseActions />
          </div>
          </div>

        {/* Database Table */}
        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border-color)] bg-[var(--secondary-bg)]">
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedDatabases.length === filteredDatabases.length}
                      onChange={handleSelectAll}
                      className="rounded border-[var(--border-color)]"
                    />
                </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-[var(--text-secondary)]">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-[var(--text-secondary)]">Type</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-[var(--text-secondary)]">Size</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-[var(--text-secondary)]">Tables</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-[var(--text-secondary)]">Last Backup</th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-[var(--text-secondary)]">Actions</th>
              </tr>
            </thead>
              <tbody>
                {filteredDatabases.map((db) => (
                  <tr
                    key={db.id}
                    className="border-b border-[var(--border-color)] hover:bg-[var(--hover-bg)] transition-colors"
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedDatabases.includes(db.id)}
                        onChange={() => handleSelect(db.id)}
                        className="rounded border-[var(--border-color)]"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <span className="font-medium text-[var(--text-primary)]">{db.name}</span>
                    </div>
                  </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--primary)] bg-opacity-10 text-[var(--primary)]">
                        {db.type}
                    </span>
                  </td>
                    <td className="px-6 py-4 text-[var(--text-secondary)]">{db.size}</td>
                    <td className="px-6 py-4 text-[var(--text-secondary)]">{db.tables}</td>
                    <td className="px-6 py-4 text-[var(--text-secondary)]">{db.lastBackup}</td>
                    <td className="px-6 py-4 text-right">
                    <div className="flex justify-end space-x-2">
                        <button className="p-1 hover:bg-[var(--hover-bg)] rounded transition-colors">
                          <svg className="w-5 h-5 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                      </button>
                        <button className="p-1 hover:bg-[var(--hover-bg)] rounded transition-colors">
                          <svg className="w-5 h-5 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
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
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import PageLayout from '../components/layout/PageLayout';
import Button from '../components/ui/Button';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import Table, { TableHeader, TableBody, TableRow, TableCell, TableHeaderCell } from '../components/ui/Table';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { database as dbApi, virtualHosts } from '../services/api';
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
  GlobeAltIcon,
  ExclamationCircleIcon,
  EyeIcon,
  ShieldCheckIcon,
  LockClosedIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

// Debounce utility function
const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

const Database = () => {
  const { user } = useAuth();
  const {
    databases,
    addDatabase,
    updateDatabase,
    deleteDatabase,
    setDatabases
  } = useData();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userDomains, setUserDomains] = useState([]);
  const [userDatabases, setUserDatabases] = useState([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterDomain, setFilterDomain] = useState('all');
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
    domain: '',
  });

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((term) => {
      setDebouncedSearchTerm(term);
    }, 300),
    []
  );

  // Update debounced search term when search term changes
  useEffect(() => {
    debouncedSearch(searchTerm);
  }, [searchTerm, debouncedSearch]);

  // Memoize filtered databases for better performance
  const filteredDatabases = useMemo(() => {
    return userDatabases.filter(db => {
      const matchesSearch = db.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      const matchesType = filterType === 'all' || db.type?.toLowerCase() === filterType.toLowerCase();
      const matchesDomain = filterDomain === 'all' || 
        (db.associated_domain === filterDomain) ||
        (db.name.includes(filterDomain.replace(/\./g, '_')));
      return matchesSearch && matchesType && matchesDomain;
    });
  }, [userDatabases, debouncedSearchTerm, filterType, filterDomain]);

  // Memoize user permission functions
  const getUserPermissionLevel = useCallback((database) => {
    if (user?.role === 'admin') return 'admin';
    if (database.owner_id === user?.id) return 'owner';
    return 'viewer';
  }, [user]);

  const canEditDatabase = useCallback((database) => {
    return user?.role === 'admin' || database.owner_id === user?.id;
  }, [user]);

  const canDeleteDatabase = useCallback((database) => {
    return user?.role === 'admin' || database.owner_id === user?.id;
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch user's virtual hosts to get their domains
      const virtualHostsData = await virtualHosts.getAll();
      const userVirtualHosts = virtualHostsData.filter(vh => 
        vh.user_id === user.id || (user.role === 'admin')
      );
      setUserDomains(userVirtualHosts);

      // Fetch all databases and filter for user's databases
      const allDatabases = await dbApi.getDatabases();
      
      // Handle response format
      let databaseList = [];
      if (allDatabases.success && Array.isArray(allDatabases.data)) {
        databaseList = allDatabases.data;
      } else if (Array.isArray(allDatabases)) {
        databaseList = allDatabases;
      }
      
      // Filter databases based on user ownership or domain association
      let filteredDatabases = [];
      
      if (user.role === 'admin') {
        // Admins can see all databases
        filteredDatabases = databaseList;
      } else {
        // Regular users can only see databases associated with their domains
        const userDomainNames = userVirtualHosts.map(vh => vh.domain);
        filteredDatabases = databaseList.filter(db => {
          // Check if database belongs to user's domains
          return userDomainNames.some(domain => 
            db.name.includes(domain.replace(/\./g, '_')) || 
            db.associated_domain === domain ||
            db.owner_id === user.id
          );
        });
      }
      
      setUserDatabases(filteredDatabases);
      setDatabases(filteredDatabases);
    } catch (err) {
      setError('Failed to fetch databases. Please ensure you have proper permissions and the database service is running.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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
      // Add user_id and domain association to form data
      const submitData = {
        ...formData,
        user_id: user.id,
        associated_domain: formData.domain || null
      };

      if (editingDb) {
        // console.log("Updating (not implemented yet)");
      } else {
        await dbApi.createDatabase(submitData);
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
        domain: '',
      });
      fetchUserData();
    } catch (err) {
      console.error('Failed to save database:', err);
      setError(err.response?.data?.error || 'Failed to save database');
    }
  };

  const handleEdit = (db) => {
    // Check if user has permission to edit this database
    if (!canEditDatabase(db)) {
      setError('You do not have permission to edit this database.');
      return;
    }

    setEditingDb(db);
    setFormData({
      name: db.name,
      type: db.type || 'mysql',
      charset: db.charset,
      collation: db.collation,
      username: db.users?.[0]?.username || '',
      password: '',
      domain: db.associated_domain || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (dbId) => {
    const database = userDatabases.find(db => db.id === dbId);
    
    // Check if user has permission to delete this database
    if (!canDeleteDatabase(database)) {
      setError('You do not have permission to delete this database.');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this database? This action cannot be undone.')) {
      return;
    }
    try {
      await dbApi.deleteDatabase(dbId);
      fetchUserData();
    } catch (err) {
      console.error('Failed to delete database:', err);
      setError(err.response?.data?.error || 'Failed to delete database');
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
      description="Manage your databases securely"
      actions={
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-dark)] transition-colors flex items-center"
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          Create Database
        </button>
      }
    >
      <div className="space-y-6">
        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
            <ExclamationCircleIcon className="w-5 h-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-red-800 font-medium">Access Error</h4>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* User Domains Info */}
        {user?.role !== 'admin' && userDomains.length > 0 && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start">
              <GlobeAltIcon className="w-5 h-5 text-blue-500 mr-3 mt-0.5" />
              <div>
                <h4 className="text-blue-800 font-medium">Your Domains</h4>
                <p className="text-blue-700 text-sm mt-1">
                  You can create databases for the following domains:
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {userDomains.map(domain => (
                    <span 
                      key={domain.id}
                      className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                    >
                      {domain.domain}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Search your databases..."
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
            <select
              value={filterDomain}
              onChange={(e) => setFilterDomain(e.target.value)}
              className="px-4 py-2 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg focus:outline-none focus:border-[var(--primary)] text-[var(--text-primary)]"
            >
              <option value="all">All Domains</option>
              {userDomains.map(domain => (
                <option key={domain.id} value={domain.domain}>{domain.domain}</option>
              ))}
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
                      checked={selectedDatabases.length === filteredDatabases.length && filteredDatabases.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-[var(--border-color)]"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-[var(--text-secondary)]">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-[var(--text-secondary)]">Type</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-[var(--text-secondary)]">Domain</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-[var(--text-secondary)]">Size</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-[var(--text-secondary)]">Permission</th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-[var(--text-secondary)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan="7" className="text-center py-8">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mr-3"></div>
                        Loading your databases...
                      </div>
                    </td>
                  </tr>
                )}
                {!loading && error && (
                  <tr>
                    <td colSpan="7" className="text-center py-8 text-red-500">
                      {error}
                    </td>
                  </tr>
                )}
                {!loading && !error && filteredDatabases.length === 0 && (
                  <tr>
                    <td colSpan="7" className="text-center py-8">
                      <div className="flex flex-col items-center">
                        <CircleStackIcon className="w-12 h-12 text-gray-400 mb-4" />
                        <p className="text-[var(--text-secondary)] text-lg">No databases found</p>
                        <p className="text-[var(--text-secondary)] text-sm">
                          {userDomains.length === 0 ? 
                            'You need to create a virtual host first' :
                            'Create your first database to get started'
                          }
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
                {!loading && !error && filteredDatabases.map((db) => (
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
                        <CircleStackIcon className="w-5 h-5 text-blue-500 mr-3" />
                        <div>
                          <span className="font-medium text-[var(--text-primary)]">{db.name}</span>
                          {db.owner_id === user.id && (
                            <div className="flex items-center mt-1">
                              <UserIcon className="w-3 h-3 text-green-500 mr-1" />
                              <span className="text-xs text-green-600">Owner</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--primary)] bg-opacity-10 text-[var(--primary)]">
                        {db.type || 'MySQL'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {db.associated_domain ? (
                        <div className="flex items-center">
                          <GlobeAltIcon className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm text-[var(--text-secondary)]">{db.associated_domain}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">No domain</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                      {db.size_mb ? `${db.size_mb.toFixed(2)} MB` : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {getUserPermissionLevel(db) === 'admin' && (
                          <div className="flex items-center text-purple-600">
                            <ShieldCheckIcon className="w-4 h-4 mr-1" />
                            <span className="text-xs">Admin</span>
                          </div>
                        )}
                        {getUserPermissionLevel(db) === 'owner' && (
                          <div className="flex items-center text-green-600">
                            <UserIcon className="w-4 h-4 mr-1" />
                            <span className="text-xs">Owner</span>
                          </div>
                        )}
                        {getUserPermissionLevel(db) === 'viewer' && (
                          <div className="flex items-center text-gray-500">
                            <EyeIcon className="w-4 h-4 mr-1" />
                            <span className="text-xs">View</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end space-x-2">
                        {canEditDatabase(db) ? (
                          <button 
                            onClick={() => handleEdit(db)}
                            className="p-1 hover:bg-[var(--hover-bg)] rounded transition-colors"
                            title="Edit Database"
                          >
                            <PencilIcon className="w-5 h-5 text-[var(--text-secondary)]" />
                          </button>
                        ) : (
                          <button 
                            disabled
                            className="p-1 rounded transition-colors opacity-50 cursor-not-allowed"
                            title="No edit permission"
                          >
                            <LockClosedIcon className="w-5 h-5 text-gray-400" />
                          </button>
                        )}
                        {canDeleteDatabase(db) ? (
                          <button 
                            onClick={() => handleDelete(db.id)}
                            className="p-1 hover:bg-red-50 rounded transition-colors"
                            title="Delete Database"
                          >
                            <TrashIcon className="w-5 h-5 text-red-500" />
                          </button>
                        ) : (
                          <button 
                            disabled
                            className="p-1 rounded transition-colors opacity-50 cursor-not-allowed"
                            title="No delete permission"
                          >
                            <LockClosedIcon className="w-5 h-5 text-gray-400" />
                          </button>
                        )}
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
              <h3 className="text-lg font-medium text-[var(--primary-text)]">Your Database Status</h3>
              <Button
                variant="ghost"
                size="sm"
                icon={<ArrowPathIcon className="w-4 h-4" />}
                onClick={fetchUserData}
              >
                Refresh
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-[var(--secondary-text)]">Total Databases</span>
                  <span className="text-[var(--primary-text)] font-medium">
                    {userDatabases.length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-[var(--secondary-text)]">Your Domains</span>
                  <span className="text-[var(--primary-text)] font-medium">
                    {userDomains.length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--secondary-text)]">Permission Level</span>
                  <span className="text-[var(--primary-text)] font-medium">
                    {user?.role === 'admin' ? 'Administrator' : 'Domain Owner'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Database Types */}
          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-[var(--primary-text)]">Database Types</h3>
            </div>
            <div className="space-y-3">
              {userDatabases.length > 0 ? (
                Object.entries(
                  userDatabases.reduce((acc, db) => ({
                    ...acc,
                    [db.type || 'MySQL']: (acc[db.type || 'MySQL'] || 0) + 1
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
                disabled={selectedDatabases.length === 0}
              >
                Backup
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
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[120] overflow-y-auto">
            <div className="min-h-full flex items-center justify-center p-4">
              <div className="bg-[var(--card-bg)] p-6 rounded-xl border border-[var(--border-color)] w-full max-w-md my-8">
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
                  
                  {/* Domain Selection */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">
                      Associated Domain
                    </label>
                    <select
                      value={formData.domain}
                      onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                      className="input-field"
                      required={user?.role !== 'admin'}
                    >
                      <option value="">Select a domain</option>
                      {userDomains.map(domain => (
                        <option key={domain.id} value={domain.domain}>
                          {domain.domain}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-[var(--secondary-text)] mt-1">
                      Database will be associated with this domain
                    </p>
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
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default Database; 
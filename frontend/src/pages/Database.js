import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import PageLayout from '../components/layout/PageLayout';
import Button from '../components/ui/Button';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import Table, { TableHeader, TableBody, TableRow, TableCell, TableHeaderCell } from '../components/ui/Table';
import BaseModal from '../components/modals/BaseModal';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import api, { database as dbApi, virtualHosts } from '../services/api';
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
  MagnifyingGlassIcon,
  ShieldExclamationIcon,
  LockOpenIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon
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
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'mysql',
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci',
    username: '',
    password: '',
    domain: '',
    owner_id: '', // For admin to specify database owner
    // Connection settings
    host: 'localhost',
    port: '3306',
    // Encryption settings
    use_ssl: true,
    ssl_mode: 'REQUIRED',
    ssl_ca: '',
    ssl_cert: '',
    ssl_key: '',
    ssl_verify_cert: true,
    // Security settings
    connection_timeout: 30,
    max_connections: 10,
    // Authentication
    auth_plugin: 'mysql_native_password',
    // Advanced settings
    use_compression: true,
    use_persistent_connections: true,
    auto_reconnect: true,
  });
  const [dbToDelete, setDbToDelete] = useState(null); // For delete confirmation

  const [allDbUsers, setAllDbUsers] = useState([]);
  const [userSelectionMode, setUserSelectionMode] = useState('create'); // 'create' or 'existing'
  const [selectedDbUserId, setSelectedDbUserId] = useState('');
  const [allUsers, setAllUsers] = useState([]); // For admin to select database owner
  const [manageUsersOpen, setManageUsersOpen] = useState(false); // For database users management modal
  const [editingUser, setEditingUser] = useState(null);
  const [editingUserForm, setEditingUserForm] = useState({ password: '', host: '%' });
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false);
  const [userToEdit, setUserToEdit] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);

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

  // Fetch DB users when the form is opened (admins only)
  useEffect(() => {
    if (showForm && user?.role === 'admin') {
      const fetchUsers = async () => {
        try {
          const res = await dbApi.getAllUsers();
          if (res.success && Array.isArray(res.data)) {
            setAllDbUsers(res.data);
          } else if (Array.isArray(res)) {
            // Fallback in case API returns array directly
            setAllDbUsers(res);
          }
        } catch (err) {
          console.error("Failed to fetch database users:", err);
        }
      };
      fetchUsers();
    }
  }, [showForm, user]);

  // Fetch all users for admin to select database owner
  useEffect(() => {
    if (showForm && user?.role === 'admin') {
      const fetchAllUsers = async () => {
        try {
          const res = await api.get('/users');
          if (res.data && Array.isArray(res.data)) {
            setAllUsers(res.data);
          }
        } catch (err) {
          console.error("Failed to fetch users:", err);
        }
      };
      fetchAllUsers();
    }
  }, [showForm, user]);

  // Fetch database users on page load (admins only)
  useEffect(() => {
    if (user?.role === 'admin') {
      const fetchDbUsers = async () => {
        try {
          const res = await dbApi.getAllUsers();
          if (res.success && Array.isArray(res.data)) {
            setAllDbUsers(res.data);
          } else if (Array.isArray(res)) {
            setAllDbUsers(res);
          }
        } catch (err) {
          console.error("Failed to fetch database users:", err);
        }
      };
      fetchDbUsers();
    }
  }, [user]);

  // Set form data when edit modal opens
  useEffect(() => {
    if (showEditUserModal && userToEdit) {
      setEditingUserForm({ password: '', host: userToEdit.host || '%' });
    }
  }, [showEditUserModal, userToEdit]);


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

      // Fetch databases (backend now filters correctly for the current user)
      const dbResponse = await dbApi.getDatabases();
      
      let databaseList = [];
      if (dbResponse.success && Array.isArray(dbResponse.data)) {
        databaseList = dbResponse.data;
      } else if (Array.isArray(dbResponse)) {
        // Fallback for older API versions
        databaseList = dbResponse;
      }
      
      setUserDatabases(databaseList);
      setDatabases(databaseList);
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
    setError(null);
    try {
      if (editingDb) {
        const updatedData = {
          charset: formData.charset,
          collation: formData.collation,
          associated_domain: formData.domain || null
        };
        await dbApi.updateDatabase(editingDb.id, updatedData);

      } else {
        // 1. Create the database first
        const dbData = {
          name: formData.name,
          charset: formData.charset,
          collation: formData.collation,
          owner_id: formData.owner_id || user.id, // Use specified owner_id or current user
          associated_domain: formData.domain || null,
        };
        const newDbResponse = await dbApi.createDatabase(dbData);

        if (newDbResponse.success && newDbResponse.data) {
          const newDb = newDbResponse.data;
          
          // 2. Associate user with the new database
          if (userSelectionMode === 'create' && formData.username && formData.password) {
            // Create a new user and associate
            const createUserRes = await dbApi.createUser(newDb.id, {
              username: formData.username,
              password: formData.password,
              host: '%',
            });
            if (!createUserRes?.success) {
              const errorMsg = createUserRes?.error || 'Failed to create database user';
              throw new Error(errorMsg);
            }
          } else if (userSelectionMode === 'existing' && selectedDbUserId) {
            // Associate an existing user
            const associateRes = await dbApi.associateUser(newDb.id, selectedDbUserId);
            if (!associateRes?.success) {
              throw new Error(associateRes?.error || 'Failed to associate database user');
            }
          }

        } else {
          throw new Error(newDbResponse.error || 'Failed to create database.');
        }
      }

      // Reset form and refetch data
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
        owner_id: '',
        host: 'localhost',
        port: '3306',
        use_ssl: true,
        ssl_mode: 'REQUIRED',
        ssl_ca: '',
        ssl_cert: '',
        ssl_key: '',
        ssl_verify_cert: true,
        connection_timeout: 30,
        max_connections: 10,
        auth_plugin: 'mysql_native_password',
        use_compression: true,
        use_persistent_connections: true,
        auto_reconnect: true,
      });
      fetchUserData();
    } catch (err) {
      console.error('Failed to save database:', err);
      const errorMessage = err.message || err.response?.data?.error || 'Failed to save database';
      setError(errorMessage);
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
      host: db.host || 'localhost',
      port: db.port || '3306',
      use_ssl: db.use_ssl !== false,
      ssl_mode: db.ssl_mode || 'REQUIRED',
      ssl_ca: db.ssl_ca || '',
      ssl_cert: db.ssl_cert || '',
      ssl_key: db.ssl_key || '',
      ssl_verify_cert: db.ssl_verify_cert !== false,
      connection_timeout: db.connection_timeout || 30,
      max_connections: db.max_connections || 10,
      auth_plugin: db.auth_plugin || 'mysql_native_password',
      use_compression: db.use_compression !== false,
      use_persistent_connections: db.use_persistent_connections !== false,
      auto_reconnect: db.auto_reconnect !== false,
    });
    setShowForm(true);
  };

  const handleDeleteRequest = (db) => {
    if (!canDeleteDatabase(db)) {
      setError('You do not have permission to delete this database.');
      return;
    }
    setDbToDelete(db);
  };

  const confirmDelete = async () => {
    if (!dbToDelete) return;

    try {
      await dbApi.deleteDatabase(dbToDelete.id);
      setDbToDelete(null);
      fetchUserData();
    } catch (err) {
      console.error('Failed to delete database:', err);
      setError(err.response?.data?.error || 'Failed to delete database');
      setDbToDelete(null); // Close modal on error
    }
  };



  // ฟังก์ชันสำหรับเปิด phpMyAdmin
  const handleViewPhpMyAdmin = (database) => {
    // Get default IP from environment or use localhost as fallback
    const defaultIP = process.env.REACT_APP_DEFAULT_IP || 'localhost';
    const phpmyadminUrl = `http://${defaultIP}/phpmyadmin`;
    
    // เปิด phpMyAdmin ในแท็บใหม่
    window.open(phpmyadminUrl, '_blank');
  };


  const handleSyncDatabases = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/databases/sync');
      if (response.data.success) {
        alert(`Successfully imported ${response.data.imported_count} new databases.`);
        fetchUserData(); // Refresh the list
      } else {
        throw new Error(response.data.error || 'Sync failed');
      }
    } catch (err) {
      setError(err.message || 'Failed to sync databases with server.');
      console.error('Sync error:', err);
    } finally {
      setLoading(false);
    }
  };





  const DatabaseActions = () => (
    <div className="flex items-center space-x-2">
      <button
        disabled={selectedDatabases.length === 0}
        className={`px-3 py-1 rounded text-sm ${
          selectedDatabases.length === 0
            ? 'bg-[var(--disabled-bg)] text-[var(--disabled-text)]'
            : 'text-white'
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

  const getSecurityLevel = (db) => {
    if (db.use_ssl && db.ssl_verify_cert) return 'high';
    if (db.use_ssl) return 'medium';
    return 'low';
  };

  const getSecurityIcon = (level) => {
    switch (level) {
      case 'high':
        return <ShieldCheckIcon className="w-4 h-4 text-green-500" />;
      case 'medium':
        return <ShieldExclamationIcon className="w-4 h-4 text-yellow-500" />;
      case 'low':
        return <ExclamationCircleIcon className="w-4 h-4 text-red-500" />;
      default:
        return <ShieldExclamationIcon className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSecurityText = (level) => {
    switch (level) {
      case 'high':
        return 'High Security';
      case 'medium':
        return 'Medium Security';
      case 'low':
        return 'Low Security';
      default:
        return 'Unknown';
    }
  };

  return (
    <PageLayout
      title="Database Management"
      description="Manage your databases securely"
      actions={
        <div className="flex items-center space-x-2">
          {user?.role === 'admin' && (
            <Button
              variant="secondary"
              onClick={handleSyncDatabases}
              icon={<ArrowPathIcon className="w-4 h-4" />}
            >
              Sync with Server
            </Button>
          )}
          {user?.role === 'admin' && (
            <button
              onClick={() => {
                setFormData({
                  name: '',
                  type: 'mysql',
                  charset: 'utf8mb4',
                  collation: 'utf8mb4_unicode_ci',
                  username: '',
                  password: '',
                  domain: '',
                  owner_id: '',
                  host: 'localhost',
                  port: '3306',
                  use_ssl: true,
                  ssl_mode: 'REQUIRED',
                  ssl_ca: '',
                  ssl_cert: '',
                  ssl_key: '',
                  ssl_verify_cert: true,
                  connection_timeout: 30,
                  max_connections: 10,
                  auth_plugin: 'mysql_native_password',
                  use_compression: true,
                  use_persistent_connections: true,
                  auto_reconnect: true,
                });
                setShowForm(true);
              }}
              className="px-4 py-2 rounded-lg transition-colors flex items-center"
              style={{ backgroundColor: 'var(--accent-color)', color: 'white' }}
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Create Database
            </button>
          )}
        </div>
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
          <div className="p-4 bg-[var(--info-bg)] border border-[var(--info-border)] rounded-lg">
            <div className="flex items-start">
              <GlobeAltIcon className="w-5 h-5 text-[var(--info-color)] mr-3 mt-0.5" />
              <div>
                <h4 className="text-[var(--info-color)] font-medium">Your Domains</h4>
                <p className="text-[var(--info-text)] text-sm mt-1">
                  You can create databases for the following domains:
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {userDomains.map(domain => (
                    <span 
                      key={domain.id}
                      className="px-2 py-1 bg-[var(--info-bg)] text-[var(--info-color)] text-xs rounded"
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
                        <div className="animate-spin w-6 h-6 border-2 border-[var(--accent-color)] border-t-transparent rounded-full mr-3"></div>
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
                        <CircleStackIcon className="w-5 h-5 text-[var(--accent-color)] mr-3" />
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
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium badge badge-info-strong">
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
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center">
                          {getSecurityIcon(getSecurityLevel(db))}
                          <span className="text-xs ml-1 text-[var(--text-secondary)]">
                            {getSecurityText(getSecurityLevel(db))}
                          </span>
                        </div>
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
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end space-x-2">
                        <button 
                          onClick={() => handleViewPhpMyAdmin(db)}
                          className="p-1 hover:bg-[var(--hover-bg)] rounded transition-colors"
                          title="View in phpMyAdmin"
                        >
                          <ServerIcon className="w-5 h-5 text-[var(--accent-color)]" />
                        </button>
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
                            onClick={() => handleDeleteRequest(db)}
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

        {/* Database User Management - Admin Only */}
        {user?.role === 'admin' && (
          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-[var(--primary-text)]">Database Users Management</h3>
              <Button
                variant={manageUsersOpen ? "secondary" : "primary"}
                size="sm"
                icon={<UserIcon className="w-4 h-4" />}
                onClick={() => setManageUsersOpen(!manageUsersOpen)}
              >
                {manageUsersOpen ? 'Hide Users' : 'Manage Users'}
              </Button>
            </div>
            <div className="text-sm text-[var(--secondary-text)] mb-4">
              Manage existing database users on the server. You can create, edit, or delete database users.
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[var(--secondary-bg)] rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-[var(--primary-text)] font-medium">Total Users</h4>
                    <p className="text-[var(--secondary-text)] text-sm">Database users on server</p>
                  </div>
                  <div className="text-2xl font-bold text-[var(--primary)]">
                    {allDbUsers.length}
                  </div>
                </div>
              </div>
              <div className="bg-[var(--secondary-bg)] rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-[var(--primary-text)] font-medium">Active Users</h4>
                    <p className="text-[var(--secondary-text)] text-sm">Currently active</p>
                  </div>
                  <div className="text-2xl font-bold text-green-500">
                    {allDbUsers.filter(user => user.status === 'active').length}
                  </div>
                </div>
              </div>
              <div className="bg-[var(--secondary-bg)] rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-[var(--primary-text)] font-medium">Inactive Users</h4>
                    <p className="text-[var(--secondary-text)] text-sm">Disabled users</p>
                  </div>
                  <div className="text-2xl font-bold text-red-500">
                    {allDbUsers.filter(user => user.status !== 'active').length}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Database Users Management Section - Admin Only */}
        {user?.role === 'admin' && manageUsersOpen && (
          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg p-6 mb-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-[var(--primary-text)]">Database Users Management</h3>
              <div className="flex space-x-3">
                <Button
                  variant="primary"
                  size="sm"
                  icon={<UserIcon className="w-4 h-4" />}
                  onClick={() => {
                    setEditingUser({ id: null, username: '', password: '', host: '%' });
                    setEditingUserForm({ password: '', host: '%' });
                  }}
                >
                  Create User
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<ArrowPathIcon className="w-4 h-4" />}
                  onClick={async () => {
                    if (user?.role !== 'admin') return;
                    try {
                      const res = await dbApi.getAllUsers();
                      if (res.success && Array.isArray(res.data)) {
                        setAllDbUsers(res.data);
                      } else if (Array.isArray(res)) {
                        setAllDbUsers(res);
                      }
                    } catch (err) {
                      console.error('Failed to refresh users:', err);
                      setError(err.message || 'Failed to refresh users');
                    }
                  }}
                >
                  Refresh
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setManageUsersOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
            
            {allDbUsers.length === 0 ? (
              <div className="text-center py-12">
                <UserIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-[var(--text-secondary)] text-lg mb-2">No database users found</p>
                <p className="text-[var(--text-secondary)] text-sm">Create your first database user to get started</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--border-color)] bg-[var(--secondary-bg)]">
                      <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">Username</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">Host</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">Created</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-[var(--text-secondary)]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allDbUsers.map((dbUser) => (
                      <tr key={dbUser.id} className="border-b border-[var(--border-color)] hover:bg-[var(--secondary-bg)]">
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            <UserIcon className="w-4 h-4 text-[var(--primary)] mr-2" />
                            <span className="font-medium text-[var(--primary-text)]">{dbUser.username}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-[var(--text-primary)] font-mono text-sm">{dbUser.host}</td>
                        <td className="py-3 px-4 text-[var(--text-secondary)] text-sm">
                          {dbUser.created_at ? new Date(dbUser.created_at).toLocaleDateString() : 'Unknown'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={<PencilIcon className="w-4 h-4" />}
                              onClick={() => {
                                setUserToEdit(dbUser);
                                setShowEditUserModal(true);
                              }}
                              className="text-[var(--accent-color)] hover:text-[var(--accent-hover)]"
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={<TrashIcon className="w-4 h-4" />}
                              onClick={() => {
                                setUserToDelete(dbUser);
                                setShowDeleteUserModal(true);
                              }}
                              className="text-red-600 hover:text-red-700"
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Database User Form Section - Admin Only */}
        {user?.role === 'admin' && editingUser !== null && (
          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg p-6 mb-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-[var(--primary-text)]">
                {editingUser?.id ? 'Edit Database User' : 'Create Database User'}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingUser(null);
                  setEditingUserForm({ password: '', host: '%' });
                }}
              >
                Cancel
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={editingUser?.username || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                  className="input-field"
                  placeholder="database_user"
                  disabled={editingUser?.id} // Can't change username for existing users
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={editingUserForm.password}
                  onChange={(e) => setEditingUserForm({ ...editingUserForm, password: e.target.value })}
                  className="input-field"
                  placeholder={editingUser?.id ? 'Leave blank to keep current password' : 'Enter password'}
                  required={!editingUser?.id}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">
                  Host
                </label>
                <select
                  value={editingUserForm.host}
                  onChange={(e) => setEditingUserForm({ ...editingUserForm, host: e.target.value })}
                  className="input-field"
                >
                  <option value="%">Any Host (%)</option>
                  <option value="localhost">Localhost</option>
                  <option value="127.0.0.1">127.0.0.1</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <Button
                variant="secondary"
                onClick={() => {
                  setEditingUser(null);
                  setEditingUserForm({ password: '', host: '%' });
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={async () => {
                  if (user?.role !== 'admin') return;
                  try {
                    if (editingUser?.id) {
                      // Update existing user
                      const updateData = {
                        password: editingUserForm.password,
                        host: editingUserForm.host
                      };
                      await dbApi.updateDbUser(editingUser.id, updateData);
                    } else {
                      // Create new user
                      const createData = {
                        username: editingUser.username,
                        password: editingUserForm.password,
                        host: editingUserForm.host
                      };
                      await dbApi.createDbUser(createData);
                    }
                    
                    // Refresh users list
                    const res = await dbApi.getAllUsers();
                    if (res.success && Array.isArray(res.data)) {
                      setAllDbUsers(res.data);
                    } else if (Array.isArray(res)) {
                      setAllDbUsers(res);
                    }
                    
                    setEditingUser(null);
                    setEditingUserForm({ password: '', host: '%' });
                  } catch (err) {
                    console.error('Failed to save database user:', err);
                    setError(err.message || 'Failed to save database user');
                  }
                }}
              >
                {editingUser?.id ? 'Update User' : 'Create User'}
              </Button>
            </div>
          </div>
        )}

        {/* Edit User Modal - Admin Only */}
        {user?.role === 'admin' && (
          <BaseModal
            isOpen={showEditUserModal}
            onClose={() => {
              setShowEditUserModal(false);
              setUserToEdit(null);
              setEditingUserForm({ password: '', host: '%' });
            }}
            title="Edit Database User"
          footer={
            <div className="flex justify-end space-x-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowEditUserModal(false);
                  setUserToEdit(null);
                  setEditingUserForm({ password: '', host: '%' });
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={async () => {
                  if (user?.role !== 'admin') return;
                  try {
                    const updateData = {
                      password: editingUserForm.password,
                      host: editingUserForm.host
                    };
                    await dbApi.updateDbUser(userToEdit.id, updateData);
                    
                    // Refresh users list
                    const res = await dbApi.getAllUsers();
                    if (res.success && Array.isArray(res.data)) {
                      setAllDbUsers(res.data);
                    } else if (Array.isArray(res)) {
                      setAllDbUsers(res);
                    }
                    
                    setShowEditUserModal(false);
                    setUserToEdit(null);
                    setEditingUserForm({ password: '', host: '%' });
                  } catch (err) {
                    console.error('Failed to update user:', err);
                    setError(err.message || 'Failed to update user');
                  }
                }}
              >
                Update User
              </Button>
            </div>
          }
        >
          <div className="space-y-4 p-6">
            <div>
              <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">
                Username
              </label>
              <input
                type="text"
                value={userToEdit?.username || ''}
                className="input-field"
                disabled
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">
                New Password
              </label>
              <input
                type="password"
                value={editingUserForm.password}
                onChange={(e) => setEditingUserForm({ ...editingUserForm, password: e.target.value })}
                className="input-field"
                placeholder="Leave blank to keep current password"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">
                Host
              </label>
              <select
                value={editingUserForm.host}
                onChange={(e) => setEditingUserForm({ ...editingUserForm, host: e.target.value })}
                className="input-field"
              >
                <option value="%">Any Host (%)</option>
                <option value="localhost">Localhost</option>
                <option value="127.0.0.1">127.0.0.1</option>
              </select>
            </div>
            </div>
          </BaseModal>
        )}

        {/* Delete User Modal - Admin Only */}
        {user?.role === 'admin' && (
          <BaseModal
            isOpen={showDeleteUserModal}
            onClose={() => {
              setShowDeleteUserModal(false);
              setUserToDelete(null);
            }}
            title="Delete Database User"
          footer={
            <div className="flex justify-end space-x-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDeleteUserModal(false);
                  setUserToDelete(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={async () => {
                  if (user?.role !== 'admin') return;
                  try {
                    await dbApi.deleteDbUser(userToDelete.id);
                    
                    // Refresh users list
                    const res = await dbApi.getAllUsers();
                    if (res.success && Array.isArray(res.data)) {
                      setAllDbUsers(res.data);
                    } else if (Array.isArray(res)) {
                      setAllDbUsers(res);
                    }
                    
                    setShowDeleteUserModal(false);
                    setUserToDelete(null);
                  } catch (err) {
                    console.error('Failed to delete user:', err);
                    setError(err.message || 'Failed to delete user');
                  }
                }}
              >
                Delete User
              </Button>
            </div>
          }
        >
          <div className="p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <TrashIcon className="w-8 h-8 text-red-500" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-[var(--primary-text)]">
                  Delete Database User
                </h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  This action cannot be undone.
                </p>
              </div>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">
                Are you sure you want to delete the database user <strong>{userToDelete?.username}</strong>?
                This will permanently remove the user from the MySQL server.
              </p>
            </div>
          </div>
        </BaseModal>
        )}

        {/* Database Form Modal */}
        <BaseModal
          isOpen={showForm}
          onClose={() => {
            setShowForm(false);
            setEditingDb(null);
          }}
          title={editingDb ? 'Edit Database' : 'Create Database'}
          footer={
            <div className="flex justify-end space-x-3">
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
                onClick={handleSubmit}
              >
                {editingDb ? 'Save Changes' : 'Create Database'}
              </Button>
            </div>
          }
        >
          <form onSubmit={handleSubmit} className="space-y-6 p-6">
              {/* Basic Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                
                {user?.role === 'admin' && (
                  <div>
                    <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">
                      Database Owner
                    </label>
                    <select
                      value={formData.owner_id}
                      onChange={(e) => setFormData({ ...formData, owner_id: e.target.value })}
                      className="input-field"
                    >
                      <option value="">-- Select Owner (defaults to current user) --</option>
                      {allUsers.map(userItem => (
                        <option key={userItem.id} value={userItem.id}>
                          {userItem.username} ({userItem.email || 'No email'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
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
                    <option value="mariadb">MariaDB</option>
                  </select>
                </div>
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

              {/* --- Authentication Section --- */}
              <div className="border border-[var(--border-color)] rounded-lg p-4">
                <h3 className="text-lg font-medium text-[var(--primary-text)] mb-4 flex items-center">
                  <KeyIcon className="w-5 h-5 mr-2" />
                  Authentication
                </h3>

                {/* User selection mode */}
                <div className="flex items-center space-x-4 mb-4">
                  <label className="flex items-center">
                    <input 
                      type="radio" 
                      name="userSelectionMode" 
                      value="create" 
                      checked={userSelectionMode === 'create'}
                      onChange={() => setUserSelectionMode('create')}
                      className="form-radio"
                    />
                    <span className="ml-2 text-sm">Create New User</span>
                  </label>
                  <label className="flex items-center">
                    <input 
                      type="radio" 
                      name="userSelectionMode" 
                      value="existing" 
                      checked={userSelectionMode === 'existing'}
                      onChange={() => setUserSelectionMode('existing')}
                      className="form-radio"
                      disabled={allDbUsers.length === 0}
                    />
                    <span className="ml-2 text-sm">Use Existing User</span>
                  </label>
                </div>

                {userSelectionMode === 'create' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="input-field pr-10"
                          placeholder={editingDb ? 'Leave blank to keep current password' : 'Enter password'}
                          required={!editingDb}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2"
                        >
                          {showPassword ? (
                            <EyeSlashIcon className="w-4 h-4 text-[var(--text-secondary)]" />
                          ) : (
                            <EyeIcon className="w-4 h-4 text-[var(--text-secondary)]" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">
                      Select User
                    </label>
                    <select
                      value={selectedDbUserId}
                      onChange={(e) => setSelectedDbUserId(e.target.value)}
                      className="input-field"
                      required
                    >
                      <option value="">-- Choose a user --</option>
                      {allDbUsers.map(userItem => (
                        <option key={userItem.id} value={userItem.id}>{userItem.username}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Encryption & Security */}
              <div className="border border-[var(--border-color)] rounded-lg p-4">
                <h3 className="text-lg font-medium text-[var(--primary-text)] mb-4 flex items-center">
                  <ShieldCheckIcon className="w-5 h-5 mr-2" />
                  Encryption & Security
                </h3>
                
                {/* SSL/TLS Settings */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-[var(--secondary-text)]">
                        Use SSL/TLS Encryption
                      </label>
                      <p className="text-xs text-[var(--text-secondary)]">
                        Encrypt database connections for security
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.use_ssl}
                        onChange={(e) => setFormData({ ...formData, use_ssl: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--accent-color)]/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-color)]"></div>
                    </label>
                  </div>

                  {formData.use_ssl && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">
                          SSL Mode
                        </label>
                        <select
                          value={formData.ssl_mode}
                          onChange={(e) => setFormData({ ...formData, ssl_mode: e.target.value })}
                          className="input-field"
                        >
                          <option value="DISABLED">DISABLED</option>
                          <option value="PREFERRED">PREFERRED</option>
                          <option value="REQUIRED">REQUIRED</option>
                          <option value="VERIFY_CA">VERIFY_CA</option>
                          <option value="VERIFY_IDENTITY">VERIFY_IDENTITY</option>
                        </select>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="ssl_verify_cert"
                          checked={formData.ssl_verify_cert}
                          onChange={(e) => setFormData({ ...formData, ssl_verify_cert: e.target.checked })}
                          className="rounded border-[var(--border-color)]"
                        />
                        <label htmlFor="ssl_verify_cert" className="ml-2 text-sm text-[var(--secondary-text)]">
                          Verify SSL Certificate
                        </label>
                      </div>
                    </div>
                  )}

                  {/* SSL Certificate Files */}
                  {formData.use_ssl && ['VERIFY_CA', 'VERIFY_IDENTITY'].includes(formData.ssl_mode) && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">
                          CA Certificate
                        </label>
                        <input
                          type="text"
                          value={formData.ssl_ca}
                          onChange={(e) => setFormData({ ...formData, ssl_ca: e.target.value })}
                          className="input-field"
                          placeholder="/path/to/ca-cert.pem"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">
                          Client Certificate
                        </label>
                        <input
                          type="text"
                          value={formData.ssl_cert}
                          onChange={(e) => setFormData({ ...formData, ssl_cert: e.target.value })}
                          className="input-field"
                          placeholder="/path/to/client-cert.pem"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">
                          Client Key
                        </label>
                        <input
                          type="text"
                          value={formData.ssl_key}
                          onChange={(e) => setFormData({ ...formData, ssl_key: e.target.value })}
                          className="input-field"
                          placeholder="/path/to/client-key.pem"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Advanced Settings Toggle */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                  className="flex items-center text-[var(--primary)] hover:text-[var(--primary-dark)] transition-colors"
                >
                  <Cog6ToothIcon className="w-4 h-4 mr-2" />
                  {showAdvancedSettings ? 'Hide' : 'Show'} Advanced Settings
                </button>
              </div>

              {/* Advanced Settings */}
              {showAdvancedSettings && (
                <div className="border border-[var(--border-color)] rounded-lg p-4 space-y-4">
                  <h3 className="text-lg font-medium text-[var(--primary-text)] flex items-center">
                    <CommandLineIcon className="w-5 h-5 mr-2" />
                    Advanced Settings
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">
                        Connection Timeout (seconds)
                      </label>
                      <input
                        type="number"
                        value={formData.connection_timeout}
                        onChange={(e) => setFormData({ ...formData, connection_timeout: parseInt(e.target.value) })}
                        className="input-field"
                        min="1"
                        max="300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--secondary-text)] mb-2">
                        Max Connections
                      </label>
                      <input
                        type="number"
                        value={formData.max_connections}
                        onChange={(e) => setFormData({ ...formData, max_connections: parseInt(e.target.value) })}
                        className="input-field"
                        min="1"
                        max="100"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="use_compression"
                        checked={formData.use_compression}
                        onChange={(e) => setFormData({ ...formData, use_compression: e.target.checked })}
                        className="rounded border-[var(--border-color)]"
                      />
                      <label htmlFor="use_compression" className="ml-2 text-sm text-[var(--secondary-text)]">
                        Use Compression
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="use_persistent_connections"
                        checked={formData.use_persistent_connections}
                        onChange={(e) => setFormData({ ...formData, use_persistent_connections: e.target.checked })}
                        className="rounded border-[var(--border-color)]"
                      />
                      <label htmlFor="use_persistent_connections" className="ml-2 text-sm text-[var(--secondary-text)]">
                        Persistent Connections
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="auto_reconnect"
                        checked={formData.auto_reconnect}
                        onChange={(e) => setFormData({ ...formData, auto_reconnect: e.target.checked })}
                        className="rounded border-[var(--border-color)]"
                      />
                      <label htmlFor="auto_reconnect" className="ml-2 text-sm text-[var(--secondary-text)]">
                        Auto Reconnect
                      </label>
                    </div>
                  </div>

                  {/* Database Settings */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <option value="ascii">ASCII (ascii)</option>
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
                        <option value="latin1_swedish_ci">latin1_swedish_ci</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Summary */}
              <div className="bg-[var(--secondary-bg)] border border-[var(--border-color)] rounded-lg p-4">
                <h3 className="text-lg font-medium text-[var(--primary-text)] mb-3 flex items-center">
                  <ShieldCheckIcon className="w-5 h-5 mr-2" />
                  Security Summary
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <span className="text-sm text-[var(--secondary-text)] mr-2">SSL/TLS:</span>
                    {formData.use_ssl ? (
                      <div className="flex items-center text-green-600">
                        <CheckCircleIcon className="w-4 h-4 mr-1" />
                        <span className="text-sm">Enabled ({formData.ssl_mode})</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-red-600">
                        <XCircleIcon className="w-4 h-4 mr-1" />
                        <span className="text-sm">Disabled</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm text-[var(--secondary-text)] mr-2">Certificate Verification:</span>
                    {formData.use_ssl && formData.ssl_verify_cert ? (
                      <div className="flex items-center text-green-600">
                        <CheckCircleIcon className="w-4 h-4 mr-1" />
                        <span className="text-sm">Enabled</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-yellow-600">
                        <XCircleIcon className="w-4 h-4 mr-1" />
                        <span className="text-sm">Disabled</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
          </form>
        </BaseModal>

        {/* Delete Confirmation Modal */}
        <BaseModal
          isOpen={!!dbToDelete}
          onClose={() => setDbToDelete(null)}
          title="Confirm Deletion"
          titleIcon={<ExclamationTriangleIcon className="w-6 h-6 text-red-500" />}
          footer={
            <div className="flex justify-end space-x-3">
              <Button variant="secondary" onClick={() => setDbToDelete(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={confirmDelete}>
                Delete Database
              </Button>
            </div>
          }
        >
          <div className="p-6">
            <p className="text-sm text-[var(--secondary-text)]">
              Are you sure you want to permanently delete the database{' '}
              <strong className="text-[var(--primary-text)]">{dbToDelete?.name}</strong>?
            </p>
            <p className="text-sm text-[var(--secondary-text)] mt-2">
              All associated data and database users will be permanently removed. This action cannot be undone.
            </p>
          </div>
        </BaseModal>

      </div>
    </PageLayout>
  );
};

export default Database; 
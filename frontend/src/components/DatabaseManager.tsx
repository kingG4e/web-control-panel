import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PlusIcon, TrashIcon, ArrowDownTrayIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';

interface Database {
  id: number;
  name: string;
  charset: string;
  collation: string;
  size: number;
  status: string;
  created_at: string;
  updated_at: string;
  users: DatabaseUser[];
  backups: DatabaseBackup[];
}

interface DatabaseUser {
  id: number;
  database_id: number;
  username: string;
  host: string;
  privileges: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface DatabaseBackup {
  id: number;
  database_id: number;
  filename: string;
  size: number;
  backup_type: string;
  status: string;
  created_at: string;
}

const DatabaseManager: React.FC = () => {
  const [databases, setDatabases] = useState<Database[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<Database | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [newDatabaseName, setNewDatabaseName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    fetchDatabases();
  }, []);

  const fetchDatabases = async () => {
    try {
      const response = await axios.get('/api/databases');
      setDatabases(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch databases');
      setLoading(false);
    }
  };

  const createDatabase = async () => {
    try {
      await axios.post('/api/databases', { name: newDatabaseName });
      setShowCreateModal(false);
      setNewDatabaseName('');
      fetchDatabases();
    } catch (err) {
      setError('Failed to create database');
    }
  };

  const createDatabaseUser = async () => {
    if (!selectedDatabase) return;

    try {
      await axios.post(`/api/databases/${selectedDatabase.id}/users`, {
        username: newUsername,
        password: newPassword,
      });
      setShowUserModal(false);
      setNewUsername('');
      setNewPassword('');
      fetchDatabases();
    } catch (err) {
      setError('Failed to create database user');
    }
  };

  const createBackup = async (databaseId: number) => {
    try {
      await axios.post(`/api/databases/${databaseId}/backups`);
      fetchDatabases();
    } catch (err) {
      setError('Failed to create backup');
    }
  };

  const restoreBackup = async (databaseId: number, backupId: number) => {
    try {
      await axios.post(`/api/databases/${databaseId}/backups/${backupId}/restore`);
      fetchDatabases();
    } catch (err) {
      setError('Failed to restore backup');
    }
  };

  const deleteDatabase = async (databaseId: number) => {
    if (!window.confirm('Are you sure you want to delete this database?')) return;

    try {
      await axios.delete(`/api/databases/${databaseId}`);
      fetchDatabases();
    } catch (err) {
      setError('Failed to delete database');
    }
  };

  const deleteDatabaseUser = async (databaseId: number, userId: number) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      await axios.delete(`/api/databases/${databaseId}/users/${userId}`);
      fetchDatabases();
    } catch (err) {
      setError('Failed to delete database user');
    }
  };

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Database Manager</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded-md flex items-center"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Create Database
        </button>
      </div>

      {/* Database List */}
      <div className="grid gap-4">
        {databases.map((database) => (
          <div key={database.id} className="border rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-semibold">{database.name}</h2>
                <p className="text-gray-500">
                  Size: {database.size.toFixed(2)} MB | Created: {new Date(database.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => createBackup(database.id)}
                  className="bg-green-500 text-white px-3 py-2 rounded-md flex items-center"
                >
                  <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
                  Backup
                </button>
                <button
                  onClick={() => deleteDatabase(database.id)}
                  className="bg-red-500 text-white px-3 py-2 rounded-md flex items-center"
                >
                  <TrashIcon className="w-5 h-5 mr-2" />
                  Delete
                </button>
              </div>
            </div>

            {/* Users */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold">Users</h3>
                <button
                  onClick={() => {
                    setSelectedDatabase(database);
                    setShowUserModal(true);
                  }}
                  className="bg-blue-500 text-white px-3 py-1 rounded-md text-sm"
                >
                  Add User
                </button>
              </div>
              <div className="grid gap-2">
                {database.users.map((user) => (
                  <div key={user.id} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                    <div>
                      <p className="font-medium">{user.username}</p>
                      <p className="text-sm text-gray-500">Host: {user.host} | Privileges: {user.privileges}</p>
                    </div>
                    <button
                      onClick={() => deleteDatabaseUser(database.id, user.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Backups */}
            <div>
              <h3 className="font-semibold mb-2">Backups</h3>
              <div className="grid gap-2">
                {database.backups.map((backup) => (
                  <div key={backup.id} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                    <div>
                      <p className="font-medium">{backup.filename}</p>
                      <p className="text-sm text-gray-500">
                        Size: {backup.size.toFixed(2)} MB | Created: {new Date(backup.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => restoreBackup(database.id, backup.id)}
                      className="bg-yellow-500 text-white px-3 py-1 rounded-md text-sm flex items-center"
                    >
                      <ArrowUpTrayIcon className="w-4 h-4 mr-1" />
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Database Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h2 className="text-xl font-bold mb-4">Create Database</h2>
            <input
              type="text"
              value={newDatabaseName}
              onChange={(e) => setNewDatabaseName(e.target.value)}
              placeholder="Database name"
              className="w-full p-2 border rounded mb-4"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>
              <button
                onClick={createDatabase}
                className="px-4 py-2 bg-blue-500 text-white rounded"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h2 className="text-xl font-bold mb-4">Create Database User</h2>
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="Username"
              className="w-full p-2 border rounded mb-4"
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Password"
              className="w-full p-2 border rounded mb-4"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowUserModal(false)}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>
              <button
                onClick={createDatabaseUser}
                className="px-4 py-2 bg-blue-500 text-white rounded"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatabaseManager; 
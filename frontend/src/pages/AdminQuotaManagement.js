import React, { useState, useEffect, useCallback } from 'react';
import { quotaApi } from '../services/quotaApi';
import { useAuth } from '../contexts/AuthContext';
import BaseModal, { ModalSection, ModalButton } from '../components/modals/BaseModal';
import { UsersIcon, CheckCircleIcon, ExclamationTriangleIcon, NoSymbolIcon as NoEntryIcon } from '@heroicons/react/24/outline';


const QuotaEditModal = ({ user, isOpen, onClose, onSave }) => {
    const [softLimit, setSoftLimit] = useState('');
    const [hardLimit, setHardLimit] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) {
            setSoftLimit(user.quota_soft_mb || '');
            setHardLimit(user.quota_hard_mb || '');
        }
        setError('');
    }, [user, isOpen]);

    if (!user) return null;

    const handleSave = async () => {
        setError('');
        const soft = parseInt(softLimit, 10);
        const hard = parseInt(hardLimit, 10);

        if (isNaN(soft) || isNaN(hard) || soft < 0 || hard < 0) {
            setError('Please enter valid, non-negative numbers for quota limits.');
            return;
        }

        if (soft > hard) {
            setError('Soft limit cannot be greater than hard limit.');
            return;
        }

        setLoading(true);
        try {
            await onSave(user.username, soft, hard);
            onClose();
        } catch (err) {
            setError(err.response?.data?.error || err.message || 'Failed to save quota.');
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={`Manage Quota for ${user.username}`}
            footer={
                <div className="flex justify-end space-x-2">
                    <ModalButton variant="secondary" onClick={onClose}>Cancel</ModalButton>
                    <ModalButton onClick={handleSave} disabled={loading}>
                        {loading ? 'Saving...' : 'Save Changes'}
                    </ModalButton>
                </div>
            }
        >
            <ModalSection>
                <div className="space-y-4">
                    {error && (
                        <div className="p-3 rounded-md" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                            {error}
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--primary-text)' }}>
                            Soft Limit (MB)
                        </label>
                        <input
                            type="number"
                            value={softLimit}
                            onChange={(e) => setSoftLimit(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border"
                            style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-color)', color: 'var(--primary-text)' }}
                            placeholder="e.g., 2000"
                        />
                        <p className="text-xs mt-1" style={{ color: 'var(--secondary-text)' }}>
                            User will receive a warning when they exceed this limit.
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--primary-text)' }}>
                            Hard Limit (MB)
                        </label>
                        <input
                            type="number"
                            value={hardLimit}
                            onChange={(e) => setHardLimit(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border"
                            style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-color)', color: 'var(--primary-text)' }}
                            placeholder="e.g., 2500"
                        />
                         <p className="text-xs mt-1" style={{ color: 'var(--secondary-text)' }}>
                            User will be blocked from writing new files when they exceed this limit.
                        </p>
                    </div>
                </div>
            </ModalSection>
        </BaseModal>
    );
};

const QuotaUsageBar = ({ usage, quota }) => {
    if (quota === null || quota === undefined || quota <= 0) {
        return <div className="text-sm" style={{ color: 'var(--secondary-text)' }}>N/A</div>;
    }

    const percentage = Math.min((usage / quota) * 100, 100);
    
    let barColor = 'bg-green-500';
    if (percentage > 95) barColor = 'bg-red-500';
    else if (percentage > 80) barColor = 'bg-yellow-500';

    return (
        <div className="flex items-center space-x-2">
            <div className="w-2/3">
                <div className="w-full rounded-full h-2" style={{ backgroundColor: 'var(--secondary-bg)' }}>
                    <div
                        className={`h-2 rounded-full transition-all duration-300 ${barColor}`}
                        style={{ width: `${percentage}%` }}
                    ></div>
                </div>
            </div>
            <div className="w-1/3 text-right">
                <span className="text-sm font-medium" style={{ color: 'var(--primary-text)' }}>
                    {percentage.toFixed(1)}%
                </span>
            </div>
        </div>
    );
};


const QuotaUsageTable = ({ users, onRefresh, onEditQuota }) => {
    const [sortField, setSortField] = useState('username');
    const [sortDirection, setSortDirection] = useState('asc');
    const [searchTerm, setSearchTerm] = useState('');

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const filteredAndSortedUsers = Object.values(users)
        .filter(user => 
            user.username.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => {
            let aVal = a[sortField];
            let bVal = b[sortField];
            
            if (sortField === 'quota_usage_percent') {
                aVal = aVal || 0;
                bVal = bVal || 0;
            }
            
            if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

    const getUsageColor = (percentage) => {
        if (!percentage) return '';
        if (percentage > 100) return 'text-red-500 font-bold';
        if (percentage > 95) return 'text-red-500';
        if (percentage > 80) return 'text-yellow-500';
        return 'text-green-500';
    };

    return (
        <div className="space-y-4">
            {/* Search */}
            <div className="flex items-center space-x-4">
                <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="px-3 py-2 rounded-lg focus:outline-none"
                    style={{
                        backgroundColor: 'var(--input-bg)',
                        color: 'var(--primary-text)',
                        border: '1px solid var(--border-color)'
                    }}
                />
                <button
                    onClick={onRefresh}
                    className="px-4 py-2 rounded-lg focus:outline-none focus:ring-2 transition-colors"
                    style={{
                        backgroundColor: 'var(--accent-color)',
                        color: '#fff'
                    }}
                >
                    Refresh
                </button>
            </div>

            {/* Table */}
            <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                <table className="min-w-full">
                    <thead style={{ backgroundColor: 'var(--secondary-bg)' }}>
                        <tr>
                            <th 
                                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer"
                                style={{ color: 'var(--secondary-text)' }}
                                onClick={() => handleSort('username')}
                            >
                                Username
                                {sortField === 'username' && (
                                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                )}
                            </th>
                            <th 
                                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer"
                                style={{ color: 'var(--secondary-text)' }}
                                onClick={() => handleSort('usage_mb')}
                            >
                                Usage (MB)
                                {sortField === 'usage_mb' && (
                                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                )}
                            </th>
                            <th 
                                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer"
                                style={{ color: 'var(--secondary-text)' }}
                                onClick={() => handleSort('quota_soft_mb')}
                            >
                                Quota (MB)
                                {sortField === 'quota_soft_mb' && (
                                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                )}
                            </th>
                            <th 
                                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer"
                                style={{ color: 'var(--secondary-text)' }}
                                onClick={() => handleSort('quota_usage_percent')}
                            >
                                Usage %
                                {sortField === 'quota_usage_percent' && (
                                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                )}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--secondary-text)' }}>
                                Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--secondary-text)' }}>
                                Last Updated
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--secondary-text)' }}>
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredAndSortedUsers.map((user) => (
                            <tr key={user.username}>
                                <td className="px-6 py-4 whitespace-nowrap border-t" style={{ borderColor: 'var(--border-color)' }}>
                                    <div className="text-sm font-medium" style={{ color: 'var(--primary-text)' }}>
                                        {user.username}
                                    </div>
                                    <div className="text-sm" style={{ color: 'var(--secondary-text)' }}>
                                        {user.home_directory}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm border-t" style={{ color: 'var(--primary-text)', borderColor: 'var(--border-color)' }}>
                                    {user.usage_mb.toFixed(1)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm border-t" style={{ color: 'var(--primary-text)', borderColor: 'var(--border-color)' }}>
                                    {user.quota_soft_mb ? `${user.quota_soft_mb.toFixed(1)} MB` : <span style={{color: 'var(--secondary-text)'}}>No Quota</span>}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap border-t" style={{ borderColor: 'var(--border-color)' }}>
                                    <QuotaUsageBar usage={user.usage_mb} quota={user.quota_soft_mb} />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap border-t" style={{ borderColor: 'var(--border-color)' }}>
                                    {user.quota_usage_percent > 100 ? (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(248,113,113,0.15)', color: '#ef4444' }}>
                                            Exceeded
                                        </span>
                                    ) : user.quota_usage_percent > 95 ? (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(248,113,113,0.15)', color: '#ef4444' }}>
                                            Critical
                                        </span>
                                    ) : user.quota_usage_percent > 80 ? (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(250,204,21,0.15)', color: '#ca8a04' }}>
                                            Warning
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(34,197,94,0.15)', color: '#16a34a' }}>
                                            Normal
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm border-t" style={{ color: 'var(--secondary-text)', borderColor: 'var(--border-color)' }}>
                                    {new Date(user.last_updated).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm border-t text-center" style={{ borderColor: 'var(--border-color)' }}>
                                    <button
                                        onClick={() => onEditQuota(user)}
                                        className="px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 text-xs"
                                        style={{ backgroundColor: 'var(--accent-color)', color: 'white' }}
                                    >
                                        <span>Manage</span>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const QuotaStatistics = ({ stats }) => {
    if (!stats) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="rounded-xl border p-6 flex items-center" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                <div className="w-12 h-12 rounded-lg flex items-center justify-center mr-4" style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)' }}>
                    <UsersIcon className="w-6 h-6" style={{ color: '#3b82f6' }} />
                </div>
                <div>
                    <div className="text-3xl font-bold" style={{ color: '#60a5fa' }}>{stats.total_users || 0}</div>
                    <div className="text-sm" style={{ color: 'var(--secondary-text)' }}>Total Users</div>
                </div>
            </div>
            <div className="rounded-xl border p-6 flex items-center" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                <div className="w-12 h-12 rounded-lg flex items-center justify-center mr-4" style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)' }}>
                    <CheckCircleIcon className="w-6 h-6" style={{ color: '#22c55e' }} />
                </div>
                <div>
                    <div className="text-3xl font-bold" style={{ color: '#22c55e' }}>{stats.users_with_quota || 0}</div>
                    <div className="text-sm" style={{ color: 'var(--secondary-text)' }}>Users with Quota</div>
                </div>
            </div>
            <div className="rounded-xl border p-6 flex items-center" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                <div className="w-12 h-12 rounded-lg flex items-center justify-center mr-4" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)' }}>
                    <ExclamationTriangleIcon className="w-6 h-6" style={{ color: '#f59e0b' }} />
                </div>
                <div>
                    <div className="text-3xl font-bold" style={{ color: '#f59e0b' }}>{(stats.warning_count || 0) + (stats.critical_count || 0)}</div>
                    <div className="text-sm" style={{ color: 'var(--secondary-text)' }}>Warnings</div>
                </div>
            </div>
            <div className="rounded-xl border p-6 flex items-center" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                <div className="w-12 h-12 rounded-lg flex items-center justify-center mr-4" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)' }}>
                    <NoEntryIcon className="w-6 h-6" style={{ color: '#ef4444' }} />
                </div>
                <div>
                    <div className="text-3xl font-bold" style={{ color: '#ef4444' }}>{stats.exceeded_count || 0}</div>
                    <div className="text-sm" style={{ color: 'var(--secondary-text)' }}>Exceeded</div>
                </div>
            </div>
        </div>
    );
};

const AdminQuotaManagement = () => {
    const { user } = useAuth();
    const [quotaData, setQuotaData] = useState(null);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshInterval, setRefreshInterval] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    const fetchQuotaData = useCallback(async (forceRefresh = false) => {
        try {
            setLoading(true);
            const data = await quotaApi.getAllUsersQuotaUsage(forceRefresh);
            
            setQuotaData(data);
            setStats(data.stats);
            setError(null);
        } catch (err) {
            setError(err.response?.data?.error || err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const initialFetch = () => fetchQuotaData();
        initialFetch();
        
        // Auto-refresh (without forcing) every 60 seconds
        const interval = setInterval(() => fetchQuotaData(false), 60000);
        
        return () => clearInterval(interval);
    }, [fetchQuotaData]);

    const handleManualRefresh = () => {
        fetchQuotaData(true);
    };

    const handleOpenEditModal = (user) => {
        setSelectedUser(user);
        setIsEditModalOpen(true);
    };

    const handleCloseEditModal = () => {
        setSelectedUser(null);
        setIsEditModalOpen(false);
    };

    const handleSaveQuota = async (username, softLimit, hardLimit) => {
        await quotaApi.setUserQuota(username, softLimit, hardLimit);
        // Refresh data after saving, and force bypass cache
        fetchQuotaData(true);
    };

    // Check if user is admin
    if (!user.is_admin && user.role !== 'admin') {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--primary-bg)' }}>
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--primary-text)' }}>Access Denied</h1>
                    <p style={{ color: 'var(--secondary-text)' }}>You don't have permission to access this page.</p>
                </div>
            </div>
        );
    }

    if (loading && !quotaData) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--primary-bg)' }}>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--accent-color)' }}></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--primary-bg)' }}>
                <div className="rounded-lg p-6 max-w-md border" style={{ backgroundColor: 'var(--card-bg)', borderColor: '#ef4444' }}>
                    <div style={{ color: '#b91c1c' }}>
                        <strong>Error:</strong> {error}
                    </div>
                    <button
                        onClick={handleManualRefresh}
                        className="mt-4 w-full px-4 py-2 rounded-lg transition-colors"
                        style={{ backgroundColor: '#ef4444', color: '#fff' }}
                    >
                        Try again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen" style={{ backgroundColor: 'var(--primary-bg)' }}>
            <div className="max-w-7xl mx-auto p-6">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-semibold" style={{ color: 'var(--primary-text)' }}>Quota Management</h1>
                    <p className="mt-2" style={{ color: 'var(--secondary-text)' }}>
                        Monitor and manage disk quota usage for all users
                    </p>
                </div>

                {/* Statistics */}
                {stats && <QuotaStatistics stats={stats} />}

                {/* Quota Usage Table */}
                {quotaData && (
                    <div className="rounded-xl border p-6" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                        <h2 className="text-xl font-semibold mb-6" style={{ color: 'var(--primary-text)' }}>User Quota Usage</h2>
                        <QuotaUsageTable 
                            users={quotaData.users} 
                            onRefresh={handleManualRefresh}
                            onEditQuota={handleOpenEditModal}
                        />
                    </div>
                )}

                {/* Alerts Summary */}
                {quotaData?.alerts && (
                    <div className="mt-8 space-y-6">
                        {quotaData.alerts.exceeded && quotaData.alerts.exceeded.length > 0 && (
                            <div className="rounded-lg p-6 border" style={{ backgroundColor: 'var(--card-bg)', borderColor: '#ef4444' }}>
                                <h3 className="text-lg font-medium mb-4" style={{ color: '#ef4444' }}>
                                    Quota Exceeded ({quotaData.alerts.exceeded.length} users)
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {quotaData.alerts.exceeded.map((alert, index) => (
                                        <div key={index} className="rounded-lg p-4 border" style={{ backgroundColor: 'var(--card-bg)', borderColor: '#ef4444' }}>
                                            <div className="font-medium" style={{ color: 'var(--primary-text)' }}>{alert.username}</div>
                                            <div className="text-sm" style={{ color: 'var(--secondary-text)' }}>
                                                {alert.usage_mb.toFixed(1)} MB used
                                                {alert.quota_mb && ` (${alert.usage_percent.toFixed(1)}% of ${alert.quota_mb} MB)`}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {quotaData.alerts.critical && quotaData.alerts.critical.length > 0 && (
                            <div className="rounded-lg p-6 border" style={{ backgroundColor: 'var(--card-bg)', borderColor: '#fb923c' }}>
                                <h3 className="text-lg font-medium mb-4" style={{ color: '#fb923c' }}>
                                    Critical Usage ({quotaData.alerts.critical.length} users)
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {quotaData.alerts.critical.map((alert, index) => (
                                        <div key={index} className="rounded-lg p-4 border" style={{ backgroundColor: 'var(--card-bg)', borderColor: '#fb923c' }}>
                                            <div className="font-medium" style={{ color: 'var(--primary-text)' }}>{alert.username}</div>
                                            <div className="text-sm" style={{ color: 'var(--secondary-text)' }}>
                                                {alert.usage_mb.toFixed(1)} MB used
                                                {alert.quota_mb && ` (${alert.usage_percent.toFixed(1)}% of ${alert.quota_mb} MB)`}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
            <QuotaEditModal
                user={selectedUser}
                isOpen={isEditModalOpen}
                onClose={handleCloseEditModal}
                onSave={handleSaveQuota}
            />
        </div>
    );
};

export default AdminQuotaManagement;

import React, { useState, useEffect, useCallback } from 'react';
import { quotaApi } from '../services/quotaApi';
import { useAuth } from '../contexts/AuthContext';

const QuotaUsageBar = ({ usage, quota, label, color = 'blue' }) => {
    if (!quota || quota <= 0) return <div className="text-sm" style={{ color: 'var(--secondary-text)' }}>No quota set</div>;

    const percentage = Math.min((usage / quota) * 100, 100);
    const barColor = percentage > 95 ? 'bg-red-500' :
                    percentage > 80 ? 'bg-yellow-500' :
                    // fallback to blue; dynamic tailwind color string kept minimal
                    (color === 'green' ? 'bg-green-500' : 'bg-blue-500');

    return (
        <div className="space-y-1">
            <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--secondary-text)' }}>{label}</span>
                <span className="font-medium" style={{ color: 'var(--primary-text)' }}>
                    {usage.toFixed(1)} MB / {quota} MB
                </span>
            </div>
            <div className="w-full rounded-full h-2" style={{ backgroundColor: 'var(--secondary-bg)' }}>
                <div
                    className={`h-2 rounded-full transition-all duration-300 ${barColor}`}
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
            <div className="text-xs text-right" style={{ color: 'var(--secondary-text)' }}>
                {percentage.toFixed(1)}% used
            </div>
        </div>
    );
};

const QuotaAlert = ({ alert, type }) => {
    const alertVars = {
        warning: { border: '#facc15', text: '#92400e' },
        critical: { border: '#fb923c', text: '#7c2d12' },
        exceeded: { border: '#f87171', text: '#7f1d1d' }
    };
    const icon = type === 'warning' ? '⚠️' : type === 'critical' ? '🚨' : '❌';
    const colors = alertVars[type] || alertVars.warning;

    return (
        <div className="p-3 rounded-lg border" style={{ backgroundColor: 'var(--card-bg)', borderColor: colors.border }}>
            <div className="flex items-center space-x-2">
                <span className="text-lg" style={{ color: colors.text }}>{icon}</span>
                <div>
                    <div className="font-medium" style={{ color: 'var(--primary-text)' }}>{alert.username}</div>
                    <div className="text-sm" style={{ color: 'var(--secondary-text)' }}>
                        {alert.usage_mb.toFixed(1)} MB used
                        {alert.quota_mb && ` (${((alert.usage_percent || 0).toFixed(1))}% of ${alert.quota_mb} MB)`}
                    </div>
                </div>
            </div>
        </div>
    );
};

const QuotaDashboard = () => {
    const { user } = useAuth();
    const [quotaData, setQuotaData] = useState(null);
    const [alerts, setAlerts] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshInterval, setRefreshInterval] = useState(null);

    const fetchQuotaData = useCallback(async () => {
        try {
            setLoading(true);
            const data = await quotaApi.getUserQuotaUsage(user.username);
            setQuotaData(data);
            
            // Fetch alerts if admin
            if (user.is_admin || user.role === 'admin') {
                const alertsData = await quotaApi.getQuotaAlerts();
                setAlerts(alertsData.alerts);
            }
        } catch (err) {
            setError(err.response?.data?.error || err.message);
        } finally {
            setLoading(false);
        }
    }, [user.username, user.is_admin, user.role]);

    const startAutoRefresh = useCallback(() => {
        // Refresh every 30 seconds
        const interval = setInterval(fetchQuotaData, 30000);
        setRefreshInterval(interval);
        return () => clearInterval(interval);
    }, [fetchQuotaData]);

    useEffect(() => {
        fetchQuotaData();
        const cleanup = startAutoRefresh();
        return cleanup;
    }, [fetchQuotaData, startAutoRefresh]);

    const handleManualRefresh = () => {
        fetchQuotaData();
    };

    if (loading && !quotaData) {
        return (
            <div className="min-h-screen" style={{ backgroundColor: 'var(--primary-bg)' }}>
                <div className="max-w-7xl mx-auto p-6">
                    <div className="flex items-center justify-center p-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--accent-color)' }}></div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen" style={{ backgroundColor: 'var(--primary-bg)' }}>
                <div className="max-w-7xl mx-auto p-6">
                    <div className="p-4 border rounded-lg" style={{ backgroundColor: 'var(--card-bg)', borderColor: '#ef4444' }}>
                        <div style={{ color: '#b91c1c' }}>
                            <strong>Error:</strong> {error}
                        </div>
                        <button
                            onClick={handleManualRefresh}
                            className="mt-2 text-sm underline"
                            style={{ color: '#b91c1c' }}
                        >
                            Try again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!quotaData) {
        return (
            <div className="text-center p-8 text-gray-500">
                No quota data available
            </div>
        );
    }

    const { storage, email_accounts, summary } = quotaData;

    return (
        <div className="min-h-screen" style={{ backgroundColor: 'var(--primary-bg)' }}>
            <div className="max-w-7xl mx-auto p-6">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-semibold mb-2" style={{ color: 'var(--primary-text)' }}>Quota Dashboard</h2>
                        <p className="text-sm" style={{ color: 'var(--secondary-text)' }}>
                            Last updated: {new Date(summary.last_updated).toLocaleString()}
                        </p>
                    </div>
                    <button
                        onClick={handleManualRefresh}
                        className="px-3 py-2 text-sm rounded-lg border hover:bg-[var(--hover-bg)] focus:outline-none focus:ring-2"
                        style={{ color: 'var(--primary-text)', borderColor: 'var(--border-color)' }}
                    >
                        Refresh
                    </button>
                </div>

                {/* Content */}
                <div className="space-y-6">
                    {/* Storage Quota */}
                    <div className="rounded-xl border p-6" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                        <h3 className="text-lg font-medium mb-4" style={{ color: 'var(--primary-text)' }}>Storage Usage</h3>
                        <QuotaUsageBar
                            usage={storage.usage_mb}
                            quota={storage.quota_soft_mb}
                            label="Home Directory"
                            color="blue"
                        />
                        <div className="mt-3 text-sm" style={{ color: 'var(--secondary-text)' }}>
                            <div>Directory: {storage.home_directory}</div>
                            {storage.quota_hard_mb && (
                                <div>Hard Limit: {storage.quota_hard_mb} MB</div>
                            )}
                        </div>
                    </div>

                    {/* Email Quota */}
                    {email_accounts.length > 0 && (
                        <div className="rounded-xl border p-6" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                            <h3 className="text-lg font-medium mb-4" style={{ color: 'var(--primary-text)' }}>Email Accounts</h3>
                            <div className="space-y-4">
                                {email_accounts.map((account) => (
                                    <div key={account.email_account_id} className="border-l-4 pl-4" style={{ borderColor: 'var(--accent-color)' }}>
                                        <div className="font-medium mb-2" style={{ color: 'var(--primary-text)' }}>{account.email}</div>
                                        <QuotaUsageBar
                                            usage={account.usage_mb}
                                            quota={account.quota_mb}
                                            label="Mailbox"
                                            color="green"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Summary */}
                    <div className="rounded-xl border p-6" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                        <h3 className="text-lg font-medium mb-4" style={{ color: 'var(--primary-text)' }}>Summary</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="text-center p-3 rounded-lg" style={{ backgroundColor: 'var(--secondary-bg)' }}>
                                <div className="text-2xl font-bold" style={{ color: 'var(--accent-color)' }}>
                                    {summary.total_storage_usage_mb.toFixed(1)}
                                </div>
                                <div className="text-sm" style={{ color: 'var(--accent-color)' }}>MB Used</div>
                            </div>
                            <div className="text-center p-3 rounded-lg" style={{ backgroundColor: 'var(--secondary-bg)' }}>
                                <div className="text-2xl font-bold" style={{ color: 'var(--accent-color)' }}>
                                    {summary.total_email_usage_mb.toFixed(1)}
                                </div>
                                <div className="text-sm" style={{ color: 'var(--accent-color)' }}>MB Email</div>
                            </div>
                        </div>
                    </div>

                    {/* Alerts (Admin Only) */}
                    {(user.is_admin || user.role === 'admin') && (
                        <div className="space-y-4">
                            {alerts.exceeded && alerts.exceeded.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-medium mb-3" style={{ color: 'var(--primary-text)' }}>Quota Exceeded</h3>
                                    <div className="space-y-2">
                                        {alerts.exceeded.map((alert, index) => (
                                            <QuotaAlert key={index} alert={alert} type="exceeded" />
                                        ))}
                                    </div>
                                </div>
                            )}
                            {alerts.critical && alerts.critical.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-medium mb-3" style={{ color: 'var(--primary-text)' }}>Critical Usage</h3>
                                    <div className="space-y-2">
                                        {alerts.critical.map((alert, index) => (
                                            <QuotaAlert key={index} alert={alert} type="critical" />
                                        ))}
                                    </div>
                                </div>
                            )}
                            {alerts.warning && alerts.warning.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-medium mb-3" style={{ color: 'var(--primary-text)' }}>Warning</h3>
                                    <div className="space-y-2">
                                        {alerts.warning.map((alert, index) => (
                                            <QuotaAlert key={index} alert={alert} type="warning" />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default QuotaDashboard;

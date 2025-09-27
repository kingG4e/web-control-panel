import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { quotaApi } from '../services/quotaApi';
import { FolderIcon } from '@heroicons/react/24/outline';

const QuotaDashboard = () => {
    const { user } = useAuth();
    const [quotaData, setQuotaData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchQuota = async () => {
            if (!user?.username) return;

            try {
                setLoading(true);
                const data = await quotaApi.getUserQuotaUsage(user.username);
                if (data && data.storage) {
                    setQuotaData(data.storage);
                } else {
                    setError('Quota data is not available.');
                }
            } catch (err) {
                setError(err.response?.data?.error || 'Could not fetch quota information.');
            } finally {
                setLoading(false);
            }
        };

        fetchQuota();
    }, [user]);

    const getUsageColor = (percentage) => {
        if (percentage > 95) return '#ef4444'; // red-500
        if (percentage > 80) return '#f59e0b'; // yellow-500
        return '#22c55e'; // green-500
    };

    if (loading) {
        return (
            <div className="rounded-xl border p-6 h-full flex items-center justify-center" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
                <p style={{ color: 'var(--secondary-text)' }}>Loading Quota...</p>
            </div>
        );
    }
    
    // Do not render the card if there is an error or no quota is set
    if (error || !quotaData || quotaData.quota_soft_mb === null) {
        return null;
    }

    const usagePercent = quotaData.quota_usage_percent || 0;
    const strokeColor = getUsageColor(usagePercent);

    return (
        <div className="rounded-xl border p-6" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-center mb-4">
                <FolderIcon className="w-6 h-6 mr-3" style={{ color: '#60a5fa' }} />
                <h3 className="text-lg font-semibold" style={{ color: 'var(--primary-text)' }}>
                    Disk Quota
                </h3>
            </div>
            <div className="flex items-center justify-center space-x-8">
                <div className="relative w-32 h-32">
                    <svg className="w-full h-full" viewBox="0 0 36 36">
                        <path
                            d="M18 2.0845
                            a 15.9155 15.9155 0 0 1 0 31.831
                            a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="var(--secondary-bg)"
                            strokeWidth="3"
                        />
                        <path
                            d="M18 2.0845
                            a 15.9155 15.9155 0 0 1 0 31.831
                            a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke={strokeColor}
                            strokeWidth="3"
                            strokeDasharray={`${usagePercent}, 100`}
                            strokeLinecap="round"
                            transform="rotate(90 18 18)"
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-bold" style={{ color: 'var(--primary-text)' }}>
                            {usagePercent.toFixed(1)}%
                        </span>
                    </div>
                </div>
                <div>
                    <div className="mb-2">
                        <span className="text-sm" style={{ color: 'var(--secondary-text)' }}>Usage: </span>
                        <span className="font-medium" style={{ color: 'var(--primary-text)' }}>
                            {quotaData.usage_mb.toFixed(1)} MB
                        </span>
                    </div>
                    <div>
                        <span className="text-sm" style={{ color: 'var(--secondary-text)' }}>Quota: </span>
                        <span className="font-medium" style={{ color: 'var(--primary-text)' }}>
                            {quotaData.quota_soft_mb.toFixed(1)} MB
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuotaDashboard;

import api from './api';

// Quota Monitoring API
export const quotaApi = {
    // Get quota usage for a specific user
    getUserQuotaUsage: async (username) => {
        const response = await api.get(`/quota/usage/${username}`);
        return response.data;
    },

    // Get quota usage for all users (admin only)
    getAllUsersQuotaUsage: async () => {
        const response = await api.get('/quota/usage');
        return response.data;
    },

    // Get quota alerts
    getQuotaAlerts: async (threshold = 80.0) => {
        const response = await api.get('/quota/alerts', { 
            params: { threshold } 
        });
        return response.data;
    },

    // Get email quota usage for a specific account
    getEmailQuotaUsage: async (accountId) => {
        const response = await api.get(`/quota/email/${accountId}`);
        return response.data;
    },

    // Force refresh quota for a user (admin only)
    refreshUserQuota: async (username) => {
        const response = await api.post(`/quota/refresh/${username}`);
        return response.data;
    },

    // Get quota statistics (admin only)
    getQuotaStatistics: async () => {
        const response = await api.get('/quota/stats');
        return response.data;
    }
};

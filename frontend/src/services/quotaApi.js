import api from './api';

// Quota Monitoring API
export const quotaApi = {
    // Get quota usage for a specific user
    getUserQuotaUsage: async (username) => {
        const response = await api.get(`/quota/usage/${username}`);
        return response.data;
    },

    // Get quota usage for all users (admin only)
    getAllUsersQuotaUsage: async (forceRefresh = false) => {
        const params = forceRefresh ? { refresh: 'true' } : {};
        try {
            const response = await api.get('/quota/usage', { params, timeout: 45000 });
            return response.data;
        } catch (err) {
            // Retry once with a higher timeout if the first attempt timed out
            if (err.code === 'ECONNABORTED' || /timeout/i.test(err.message || '')) {
                const response = await api.get('/quota/usage', { params, timeout: 70000 });
                return response.data;
            }
            throw err;
        }
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

    // Set quota for a specific user (admin only)
    setUserQuota: async (username, softLimitMb, hardLimitMb) => {
        const response = await api.post(`/quota/set/${username}`, {
            soft_limit_mb: softLimitMb,
            hard_limit_mb: hardLimitMb,
        });
        return response.data;
    }
};

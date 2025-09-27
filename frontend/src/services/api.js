import axios from 'axios';

// Prefer explicit API base via env, fallback to dev-server proxy path
const apiHost = process.env.REACT_APP_API_URL
  ? process.env.REACT_APP_API_URL.replace(/\/+$/,'')
  : '';
const API_URL = apiHost ? `${apiHost}/api` : '/api';

// Create axios instance with default config
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    },
    timeout: 30000 // 30 second timeout
});

// Add token to requests if available
api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle response errors with better cancellation handling
api.interceptors.response.use(
    response => response,
    async error => {
        // Handle cancellation errors gracefully
        if (axios.isCancel(error) || error.code === 'ERR_CANCELED') {
            console.debug('Request was canceled:', error.message);
            return Promise.reject(new Error('Request canceled'));
        }

        const originalRequest = error.config || {};

        // Attempt token refresh once on 401 errors
        if (
            error.response?.status === 401 &&
            !originalRequest._retry &&
            !['/auth/login', '/auth/register', '/auth/refresh'].includes(originalRequest.url)
        ) {
            originalRequest._retry = true;
            try {
                const newToken = await auth.refresh();
                if (newToken) {
                    originalRequest.headers = originalRequest.headers || {};
                    originalRequest.headers.Authorization = `Bearer ${newToken}`;
                }
                return api(originalRequest);
            } catch (refreshError) {
                localStorage.removeItem('token');
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }

        // Handle authentication errors
        if (error.response?.status === 401) {
            // Do not redirect for login/register/refresh requests or when already on the login page
            const isAuthEndpoint = ['/auth/login', '/auth/register', '/auth/refresh'].includes(originalRequest.url);
            const isOnLoginPage = typeof window !== 'undefined' && window.location?.pathname === '/login';
            if (!isAuthEndpoint && !isOnLoginPage) {
                localStorage.removeItem('token');
                window.location.href = '/login';
            }
        }

        // Surface backend error message (if provided) and preserve original error shape
        const serverErrorMessage = error.response?.data?.error || error.response?.data?.message;
        if (serverErrorMessage) {
            const normalized = typeof serverErrorMessage === 'string'
                ? serverErrorMessage
                : JSON.stringify(serverErrorMessage);
            error.message = normalized;
            error.status = error.response?.status;
            return Promise.reject(error);
        }

        return Promise.reject(error);
    }
);

// Utility to create cancellable requests
export const createCancellableRequest = () => {
    const controller = new AbortController();
    
    const request = (config) => {
        return api({
            ...config,
            signal: controller.signal
        }).catch(error => {
            if (error.name === 'AbortError' || axios.isCancel(error)) {
                throw new Error('Request canceled');
            }
            throw error;
        });
    };
    
    return {
        request,
        cancel: () => controller.abort(),
        signal: controller.signal
    };
};

// Auth API
export const auth = {
    login: async (username, password) => {
        const response = await api.post('/auth/login', { username, password });
        localStorage.setItem('token', response.data.token);
        return response.data;
    },

    register: async (username, password) => {
        const response = await api.post('/auth/register', { username, password });
        return response.data;
    },

    refresh: async () => {
        const response = await api.post('/auth/refresh');
        const newToken = response.data.token;
        if (newToken) {
            localStorage.setItem('token', newToken);
        }
        return newToken;
    },

    logout: () => {
        localStorage.removeItem('token');
        window.location.href = '/login';
    },
    
    getCurrentUser: async () => {
        const response = await api.get('/auth/user');
        return response.data;
    }
};

// Signup Requests API
export const signup = {
    submit: async (data) => {
        const response = await api.post('/signup', data);
        return response.data;
    },
    list: async (status) => {
        const params = {};
        if (status) params.status = status;
        const response = await api.get('/signup', { params });
        return response.data;
    },
    approve: async (id, data) => {
        const response = await api.post(`/signup/${id}/approve`, data || {});
        return response.data;
    },
    reject: async (id, comment) => {
        const response = await api.post(`/signup/${id}/reject`, { comment });
        return response.data;
    },
    status: async (username) => {
        const response = await api.get('/signup/status', { params: { username } });
        return response.data;
    },
    myRequests: async () => {
        const response = await api.get('/signup/my-requests');
        return response.data;
    },
    submitAdditional: async (data) => {
        const response = await api.post('/signup/additional', data);
        return response.data;
    },
    update: async (id, data) => {
        const response = await api.put(`/signup/${id}`, data);
        return response.data;
    }
};

// Users API
export const users = {
    getAll: async () => {
        const response = await api.get('/users');
        return response.data;
    },
    
    get: async (id) => {
        const response = await api.get(`/users/${id}`);
        return response.data;
    },
    
    create: async (data) => {
        const response = await api.post('/users', data);
        return response.data;
    },
    
    update: async (id, data) => {
        const response = await api.put(`/users/${id}`, data);
        return response.data;
    },
    
    delete: async (id) => {
        const response = await api.delete(`/users/${id}`);
        // Return true for 204 No Content
        return response.status === 204 ? true : response.data;
    },
    
    getStats: async () => {
        const response = await api.get('/users/stats');
        return response.data;
    },
    
    getPermissions: async (id) => {
        const response = await api.get(`/users/${id}/permissions`);
        return response.data;
    },
    
    setDomainPermissions: async (id, data) => {
        const response = await api.post(`/users/${id}/domain-permissions`, data);
        return response.data;
    },
    
    removeDomainPermissions: async (id, domain) => {
        const response = await api.delete(`/users/${id}/domain-permissions/${domain}`);
        return response.data;
    },
    
    deleteAccount: async (id) => {
        const response = await api.delete(`/users/${id}/delete-account`);
        return response.data;
    },
    
    // NEW: delete Linux system user by username
    deleteSystem: async (username) => {
        const response = await api.delete(`/system-users/${username}`);
        return response.data;
    }
};

// Virtual Hosts API
export const virtualHosts = {
  getAll: async () => {
    const response = await api.get('/virtual-hosts');
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to fetch virtual hosts');
  },
  
  get: async (id) => {
    const response = await api.get(`/virtual-hosts/${id}`);
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to fetch virtual host');
  },
  
  create: async (data) => {
    const response = await api.post('/virtual-hosts', data);
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to create virtual host');
  },
  
  update: async (id, data) => {
    const response = await api.put(`/virtual-hosts/${id}`, data);
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to update virtual host');
  },
  
  delete: async (id) => {
    const response = await api.delete(`/virtual-hosts/${id}`);
    if (response.data.success) {
      return response.data;
    }
    throw new Error(response.data.error || 'Failed to delete virtual host');
  }
};

// DNS API
export const dns = {
    getZones: async () => {
        const response = await api.get('/dns/zones');
        return response.data;
    },
    
    getZone: async (id) => {
        const response = await api.get(`/dns/zones/${id}`);
        return response.data;
    },
    
    createZone: async (data) => {
        const response = await api.post('/dns/zones', data);
        return response.data;
    },
    
    updateZone: async (id, data) => {
        const response = await api.put(`/dns/zones/${id}`, data);
        return response.data;
    },
    
    deleteZone: async (id) => {
        const response = await api.delete(`/dns/zones/${id}`);
        return response.data;
    },
    
    getRecords: async (zoneId) => {
        const response = await api.get(`/dns/zones/${zoneId}/records`);
        return response.data;
    },
    
    createRecord: async (zoneId, data) => {
        const response = await api.post(`/dns/zones/${zoneId}/records`, data);
        return response.data;
    },
    
    updateRecord: async (zoneId, recordId, data) => {
        const response = await api.put(`/dns/zones/${zoneId}/records/${recordId}`, data);
        return response.data;
    },
    
    deleteRecord: async (zoneId, recordId) => {
        const response = await api.delete(`/dns/zones/${zoneId}/records/${recordId}`);
        return response.data;
    },
    
    getZoneFile: async (zoneId) => {
        const response = await api.get(`/dns/zones/${zoneId}/zonefile`);
        return response.data;
    },
    
    reloadBind: async () => {
        const response = await api.post('/dns/reload');
        return response.data;
    },
    
    rebuildDns: async () => {
        const response = await api.post('/dns/rebuild');
        return response.data;
    }
};

// Email API
export const email = {
    getDomains: async () => {
        const response = await api.get('/email/domains');
        return response.data;
    },
    
    createDomain: async (data) => {
        const response = await api.post('/email/domains', data);
        return response.data;
    },
    
    deleteDomain: async (id) => {
        const response = await api.delete(`/email/domains/${id}`);
        return response.data;
    },
    
    getAccounts: async (domainId) => {
        const response = await api.get(`/email/domains/${domainId}/accounts`);
        return response.data;
    },
    
    createAccount: async (domainId, data) => {
        const response = await api.post(`/email/domains/${domainId}/accounts`, data);
        return response.data;
    },
    
    updateAccount: async (domainId, accountId, data) => {
        // Backend update endpoint expects /email/accounts/:id
        const response = await api.put(`/email/accounts/${accountId}`, data);
        return response.data;
    },
    
    deleteAccount: async (domainId, accountId) => {
        // Backend delete endpoint expects /email/accounts/:id
        const response = await api.delete(`/email/accounts/${accountId}`);
        return response.data;
    }
};

// Roundcube / Webmail API
export const roundcube = {
    status: async () => {
        const response = await api.get('/roundcube/status');
        return response.data;
    },
    webmailUrl: async ({ email, domain } = {}) => {
        const params = {};
        if (email) params.email = email;
        if (domain) params.domain = domain;
        const response = await api.get('/roundcube/webmail-url', { params });
        return response.data;
    },
    redirectUrl: ({ email, domain } = {}) => {
        const params = new URLSearchParams();
        if (email) params.set('email', email);
        if (domain) params.set('domain', domain);
        const qs = params.toString();
        return `${API_URL}/roundcube/webmail-redirect${qs ? `?${qs}` : ''}`;
    },
};

// Database API
export const database = {
    getDatabases: async () => {
        const response = await api.get('/databases');
        return response.data;
    },
    
    createDatabase: async (data) => {
        const response = await api.post('/databases', data);
        return response.data;
    },
    
    deleteDatabase: async (id) => {
        const response = await api.delete(`/databases/${id}`);
        return response.data;
    },
    
    getUsers: async (dbId) => {
        const response = await api.get(`/databases/${dbId}/users`);
        return response.data;
    },
    
    createUser: async (dbId, data) => {
        const response = await api.post(`/databases/${dbId}/users`, data);
        return response.data;
    },
    
    updateUser: async (dbId, userId, data) => {
        const response = await api.put(`/databases/${dbId}/users/${userId}`, data);
        return response.data;
    },
    
    deleteUser: async (dbId, userId) => {
        const response = await api.delete(`/databases/${dbId}/users/${userId}`);
        return response.data;
    },
    
    // New function to get all database users
    getAllUsers: async () => {
        const response = await api.get('/database-users');
        return response.data;
    },

    associateUser: async (dbId, userId) => {
        const response = await api.post(`/databases/${dbId}/users/${userId}`);
        return response.data;
    },

    updateDatabase: async (id, data) => {
        const response = await api.put(`/databases/${id}`, data);
        return response.data;
    }
};

// SSL API
export const ssl = {
    getCertificates: async () => {
        const response = await api.get('/ssl/certificates');
        return response.data;
    },
    
    createCertificate: async (data) => {
        const response = await api.post('/ssl/certificates', data);
        return response.data;
    },
    
    deleteCertificate: async (id) => {
        const response = await api.delete(`/ssl/certificates/${id}`);
        return response.data;
    },
    
    renewCertificate: async (id) => {
        const response = await api.post(`/ssl/certificates/${id}/renew`);
        return response.data;
    }
};



// System API
export const system = {
    getStats: async () => {
        const response = await api.get('/dashboard/stats');
        return response.data;
    },
    
    getSystemStats: async () => {
        const response = await api.get('/dashboard/system-stats');
        return response.data;
    },
    
    getActivities: async () => {
        const response = await api.get('/dashboard/activities');
        return response.data;
    },
    
    getServerInfo: async () => {
        const response = await api.get('/dashboard/server-info');
        return response.data;
    },
    
    getServices: async () => {
        const response = await api.get('/dashboard/services');
        return response.data;
    }
};

// File Management API
export const fileApi = {
    // List directory contents
    listDirectory: async (path, domain = null) => {
        const params = { path };
        if (domain) params.domain = domain;
        const response = await api.get('/files/list', { params });
        return response.data;
    },
    
    // Get user's domains
    getUserDomains: async () => {
        const response = await api.get('/files/domains');
        return response.data;
    },
    
    // Get domain directory structure
    getDomainStructure: async (domain) => {
        const response = await api.get('/files/domain-structure', { params: { domain } });
        return response.data;
    },
    
    // Read file content
    readFile: async (path, domain = null) => {
        const params = { path };
        if (domain) params.domain = domain;
        const response = await api.get('/files/read', { params });
        return response.data;
    },
    
    // Write file content
    writeFile: async (path, content, domain = null) => {
        const data = { path, content };
        if (domain) data.domain = domain;
        const response = await api.post('/files/write', data);
        return response.data;
    },
    
    // Create directory
    createDirectory: async (path, domain = null) => {
        const data = { path };
        if (domain) data.domain = domain;
        const response = await api.post('/files/create-directory', data);
        return response.data;
    },
    
    // Delete file or directory
    deleteItem: async (path, domain = null) => {
        const params = { path };
        if (domain) params.domain = domain;
        const response = await api.delete('/files/delete', { params });
        return response.data;
    },
    
    // Rename file or directory
    renameItem: async (oldPath, newPath, domain = null) => {
        const data = { oldPath, newPath };
        if (domain) data.domain = domain;
        const response = await api.post('/files/rename', data);
        return response.data;
    },
    
    // Upload file
    uploadFile: async (path, file, domain = null) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('path', path || '/');
        if (domain) formData.append('domain', domain);
        const response = await api.post('/files/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },
    
    // Download file
    downloadFile: async (path, domain = null) => {
        const params = { path };
        if (domain) params.domain = domain;
        const response = await api.get('/files/download', { 
            params,
            responseType: 'blob'
        });
        return response;
    },
    
    // Copy item
    copyItem: async (sourcePath, destPath, domain = null) => {
        const data = { sourcePath, destPath };
        if (domain) data.domain = domain;
        const response = await api.post('/files/copy', data);
        return response.data;
    },
    
    // Get file info
    getFileInfo: async (path, domain = null) => {
        const params = { path };
        if (domain) params.domain = domain;
        const response = await api.get('/files/get-file-info', { params });
        return response.data;
    }
};

export default api; 
import axios from 'axios';
import { getApiUrl } from '../utils/config';

const API_URL = getApiUrl();

// Create axios instance with default config
const api = axios.create({
    baseURL: API_URL,
  headers: {
        'Content-Type': 'application/json'
    }
});

// Add token to requests if available
api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle response errors
api.interceptors.response.use(
    response => response,
    error => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
    return Promise.reject(error);
  }
);

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
    
    logout: () => {
        localStorage.removeItem('token');
        window.location.href = '/login';
    },
    
    getCurrentUser: async () => {
        const response = await api.get('/users/me');
        return response.data;
    }
};

// Users API
export const users = {
    getAll: async () => {
        const response = await api.get('/api/users');
        return response.data;
    },
    
    get: async (id) => {
        const response = await api.get(`/api/users/${id}`);
        return response.data;
    },
    
    create: async (data) => {
        const response = await api.post('/api/users', data);
        return response.data;
    },
    
    update: async (id, data) => {
        const response = await api.put(`/api/users/${id}`, data);
        return response.data;
    },
    
    delete: async (id) => {
        const response = await api.delete(`/api/users/${id}`);
        // Return true for 204 No Content
        return response.status === 204 ? true : response.data;
    },
    
    getStats: async () => {
        const response = await api.get('/api/users/stats');
        return response.data;
    },
    
    getPermissions: async (id) => {
        const response = await api.get(`/api/users/${id}/permissions`);
        return response.data;
    },
    
    setDomainPermissions: async (id, data) => {
        const response = await api.post(`/api/users/${id}/domain-permissions`, data);
        return response.data;
    },
    
    removeDomainPermissions: async (id, domain) => {
        const response = await api.delete(`/api/users/${id}/domain-permissions/${domain}`);
        return response.data;
    },
    
    deleteAccount: async (id) => {
        const response = await api.delete(`/api/users/${id}/delete-account`);
        return response.data;
    }
};

// Virtual Hosts API
export const virtualHosts = {
  getAll: async () => {
    const response = await api.get('/api/virtual-hosts');
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to fetch virtual hosts');
  },
  
  get: async (id) => {
    const response = await api.get(`/api/virtual-hosts/${id}`);
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to fetch virtual host');
  },
  
  create: async (data) => {
    const response = await api.post('/api/virtual-hosts', data);
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to create virtual host');
  },
  
  update: async (id, data) => {
    const response = await api.put(`/api/virtual-hosts/${id}`, data);
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to update virtual host');
  },
  
  delete: async (id) => {
    const response = await api.delete(`/api/virtual-hosts/${id}`);
    if (response.data.success) {
      return response.data;
    }
    throw new Error(response.data.error || 'Failed to delete virtual host');
  }
};

// DNS API
export const dns = {
    getZones: async () => {
        const response = await api.get('/api/dns/zones');
        return response.data;
    },
    
    getZone: async (id) => {
        const response = await api.get(`/api/dns/zones/${id}`);
        return response.data;
    },
    
    createZone: async (data) => {
        const response = await api.post('/api/dns/zones', data);
        return response.data;
    },
    
    updateZone: async (id, data) => {
        const response = await api.put(`/api/dns/zones/${id}`, data);
        return response.data;
    },
    
    deleteZone: async (id) => {
        const response = await api.delete(`/api/dns/zones/${id}`);
        return response.data;
    },
    
    getRecords: async (zoneId) => {
        const response = await api.get(`/api/dns/zones/${zoneId}/records`);
        return response.data;
    },
    
    createRecord: async (zoneId, data) => {
        const response = await api.post(`/api/dns/zones/${zoneId}/records`, data);
        return response.data;
    },
    
    updateRecord: async (zoneId, recordId, data) => {
        const response = await api.put(`/api/dns/zones/${zoneId}/records/${recordId}`, data);
        return response.data;
    },
    
    deleteRecord: async (zoneId, recordId) => {
        const response = await api.delete(`/api/dns/zones/${zoneId}/records/${recordId}`);
        return response.data;
    },
    
    getZoneFile: async (zoneId) => {
        const response = await api.get(`/api/dns/zones/${zoneId}/zonefile`);
        return response.data;
    },
    
    reloadBind: async () => {
        const response = await api.post('/api/dns/reload');
        return response.data;
    },
    
    rebuildDns: async () => {
        const response = await api.post('/api/dns/rebuild');
        return response.data;
    }
};

// Email API
export const email = {
    getDomains: async () => {
        const response = await api.get('/api/email/domains');
        return response.data;
    },
    
    createDomain: async (data) => {
        const response = await api.post('/api/email/domains', data);
        return response.data;
    },
    
    deleteDomain: async (id) => {
        const response = await api.delete(`/api/email/domains/${id}`);
        return response.data;
    },
    
    getAccounts: async (domainId) => {
        const response = await api.get(`/api/email/domains/${domainId}/accounts`);
        return response.data;
    },
    
    createAccount: async (domainId, data) => {
        const response = await api.post(`/api/email/domains/${domainId}/accounts`, data);
        return response.data;
    },
    
    updateAccount: async (domainId, accountId, data) => {
        const response = await api.put(`/api/email/domains/${domainId}/accounts/${accountId}`, data);
        return response.data;
    },
    
    deleteAccount: async (domainId, accountId) => {
        const response = await api.delete(`/api/email/domains/${domainId}/accounts/${accountId}`);
        return response.data;
    }
};

// Database API
export const database = {
    getDatabases: async () => {
        const response = await api.get('/api/databases');
        return response.data;
    },
    
    createDatabase: async (data) => {
        const response = await api.post('/api/databases', data);
        return response.data;
    },
    
    deleteDatabase: async (id) => {
        const response = await api.delete(`/api/databases/${id}`);
        return response.data;
    },
    
    getUsers: async (dbId) => {
        const response = await api.get(`/api/databases/${dbId}/users`);
        return response.data;
    },
    
    createUser: async (dbId, data) => {
        const response = await api.post(`/api/databases/${dbId}/users`, data);
        return response.data;
    },
    
    updateUser: async (dbId, userId, data) => {
        const response = await api.put(`/api/databases/${dbId}/users/${userId}`, data);
        return response.data;
    },
    
    deleteUser: async (dbId, userId) => {
        const response = await api.delete(`/api/databases/${dbId}/users/${userId}`);
        return response.data;
    }
};

// SSL API
export const ssl = {
    getCertificates: async () => {
        const response = await api.get('/api/ssl/certificates');
        return response.data;
    },
    
    createCertificate: async (data) => {
        const response = await api.post('/api/ssl/certificates', data);
        return response.data;
    },
    
    deleteCertificate: async (id) => {
        const response = await api.delete(`/api/ssl/certificates/${id}`);
        return response.data;
    },
    
    renewCertificate: async (id) => {
        const response = await api.post(`/api/ssl/certificates/${id}/renew`);
        return response.data;
    }
};

// FTP API
export const ftp = {
    getAccounts: async () => {
        const response = await api.get('/api/ftp/accounts');
        return response.data;
    },
    
    createAccount: async (data) => {
        const response = await api.post('/api/ftp/accounts', data);
        return response.data;
    },
    
    updateAccount: async (id, data) => {
        const response = await api.put(`/api/ftp/accounts/${id}`, data);
        return response.data;
    },
    
    deleteAccount: async (id) => {
        const response = await api.delete(`/api/ftp/accounts/${id}`);
        return response.data;
    }
};

// System API
export const system = {
    getStats: async () => {
        const response = await api.get('/api/dashboard/stats');
        return response.data;
    },
    
    getSystemStats: async () => {
        const response = await api.get('/api/dashboard/system-stats');
        return response.data;
    },
    
    getActivities: async () => {
        const response = await api.get('/api/dashboard/activities');
        return response.data;
    },
    
    getServerInfo: async () => {
        const response = await api.get('/api/dashboard/server-info');
        return response.data;
    },
    
    getServices: async () => {
        const response = await api.get('/api/dashboard/services');
        return response.data;
    }
};

// File Management API
export const fileApi = {
    // List directory contents
    listDirectory: async (path, domain = null) => {
        const params = { path };
        if (domain) params.domain = domain;
        const response = await api.get('/api/files/list', { params });
        return response.data;
    },
    
    // Get user's domains
    getUserDomains: async () => {
        const response = await api.get('/api/files/domains');
        return response.data;
    },
    
    // Get domain directory structure
    getDomainStructure: async (domain) => {
        const response = await api.get('/api/files/domain-structure', { params: { domain } });
        return response.data;
    },
    
    // Read file content
    readFile: async (path, domain = null) => {
        const params = { path };
        if (domain) params.domain = domain;
        const response = await api.get('/api/files/read', { params });
        return response.data;
    },
    
    // Write file content
    writeFile: async (path, content, domain = null) => {
        const data = { path, content };
        if (domain) data.domain = domain;
        const response = await api.post('/api/files/write', data);
        return response.data;
    },
    
    // Create directory
    createDirectory: async (path, domain = null) => {
        const data = { path };
        if (domain) data.domain = domain;
        const response = await api.post('/api/files/create-directory', data);
        return response.data;
    },
    
    // Delete file or directory
    deleteItem: async (path, domain = null) => {
        const params = { path };
        if (domain) params.domain = domain;
        const response = await api.delete('/api/files/delete', { params });
        return response.data;
    },
    
    // Rename file or directory
    renameItem: async (oldPath, newPath, domain = null) => {
        const data = { oldPath, newPath };
        if (domain) data.domain = domain;
        const response = await api.post('/api/files/rename', data);
        return response.data;
    },
    
    // Upload file
    uploadFile: async (path, file, domain = null) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('path', path || '/');
        if (domain) formData.append('domain', domain);
        const response = await api.post('/api/files/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },
    
    // Download file
    downloadFile: async (path, domain = null) => {
        const params = { path };
        if (domain) params.domain = domain;
        const response = await api.get('/api/files/download', { 
            params,
            responseType: 'blob'
        });
        return response;
    },
    
    // Copy item
    copyItem: async (sourcePath, destPath, domain = null) => {
        const data = { sourcePath, destPath };
        if (domain) data.domain = domain;
        const response = await api.post('/api/files/copy', data);
        return response.data;
    },
    
    // Get file info
    getFileInfo: async (path, domain = null) => {
        const params = { path };
        if (domain) params.domain = domain;
        const response = await api.get('/api/files/get-file-info', { params });
        return response.data;
    }
};

export default api; 
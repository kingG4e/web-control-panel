import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

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
    login: async (username: string, password: string) => {
        const response = await api.post('/auth/login', { username, password });
        localStorage.setItem('token', response.data.token);
        return response.data;
    },
    
    register: async (username: string, password: string) => {
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

// Virtual Hosts API
export const virtualHosts = {
    getAll: async () => {
        const response = await api.get('/virtual-hosts');
        return response.data;
    },
    
    get: async (id: number) => {
        const response = await api.get(`/virtual-hosts/${id}`);
        return response.data;
    },
    
    create: async (data: any) => {
        const response = await api.post('/virtual-hosts', data);
        return response.data;
    },
    
    update: async (id: number, data: any) => {
        const response = await api.put(`/virtual-hosts/${id}`, data);
        return response.data;
    },
    
    delete: async (id: number) => {
        const response = await api.delete(`/virtual-hosts/${id}`);
        return response.data;
    }
};

// DNS API
export const dns = {
    getZones: async () => {
        const response = await api.get('/dns/zones');
        return response.data;
    },
    
    getZone: async (id: number) => {
        const response = await api.get(`/dns/zones/${id}`);
        return response.data;
    },
    
    createZone: async (data: any) => {
        const response = await api.post('/dns/zones', data);
        return response.data;
    },
    
    updateZone: async (id: number, data: any) => {
        const response = await api.put(`/dns/zones/${id}`, data);
        return response.data;
    },
    
    deleteZone: async (id: number) => {
        const response = await api.delete(`/dns/zones/${id}`);
        return response.data;
    },
    
    getRecords: async (zoneId: number) => {
        const response = await api.get(`/dns/zones/${zoneId}/records`);
        return response.data;
    },
    
    createRecord: async (zoneId: number, data: any) => {
        const response = await api.post(`/dns/zones/${zoneId}/records`, data);
        return response.data;
    },
    
    updateRecord: async (zoneId: number, recordId: number, data: any) => {
        const response = await api.put(`/dns/zones/${zoneId}/records/${recordId}`, data);
        return response.data;
    },
    
    deleteRecord: async (zoneId: number, recordId: number) => {
        const response = await api.delete(`/dns/zones/${zoneId}/records/${recordId}`);
        return response.data;
    }
};

// Email API
export const email = {
    getDomains: async () => {
        const response = await api.get('/email/domains');
        return response.data;
    },
    
    createDomain: async (data: any) => {
        const response = await api.post('/email/domains', data);
        return response.data;
    },
    
    deleteDomain: async (id: number) => {
        const response = await api.delete(`/email/domains/${id}`);
        return response.data;
    },
    
    getAccounts: async (domainId: number) => {
        const response = await api.get(`/email/domains/${domainId}/accounts`);
        return response.data;
    },
    
    createAccount: async (domainId: number, data: any) => {
        const response = await api.post(`/email/domains/${domainId}/accounts`, data);
        return response.data;
    },
    
    updateAccount: async (domainId: number, accountId: number, data: any) => {
        const response = await api.put(`/email/domains/${domainId}/accounts/${accountId}`, data);
        return response.data;
    },
    
    deleteAccount: async (domainId: number, accountId: number) => {
        const response = await api.delete(`/email/domains/${domainId}/accounts/${accountId}`);
        return response.data;
    }
};

// Database API
export const database = {
    getDatabases: async () => {
        const response = await api.get('/databases');
        return response.data;
    },
    
    createDatabase: async (data: any) => {
        const response = await api.post('/databases', data);
        return response.data;
    },
    
    deleteDatabase: async (id: number) => {
        const response = await api.delete(`/databases/${id}`);
        return response.data;
    },
    
    getUsers: async () => {
        const response = await api.get('/databases/users');
        return response.data;
    },
    
    createUser: async (data: any) => {
        const response = await api.post('/databases/users', data);
        return response.data;
    },
    
    updateUser: async (id: number, data: any) => {
        const response = await api.put(`/databases/users/${id}`, data);
        return response.data;
    },
    
    deleteUser: async (id: number) => {
        const response = await api.delete(`/databases/users/${id}`);
        return response.data;
    }
};

// SSL Certificates API
export const ssl = {
    getCertificates: async () => {
        const response = await api.get('/ssl/certificates');
        return response.data;
    },
    
    getCertificate: async (id: number) => {
        const response = await api.get(`/ssl/certificates/${id}`);
        return response.data;
    },
    
    createCertificate: async (data: any) => {
        const response = await api.post('/ssl/certificates', data);
        return response.data;
    },
    
    deleteCertificate: async (id: number) => {
        const response = await api.delete(`/ssl/certificates/${id}`);
        return response.data;
    },
    
    renewCertificate: async (id: number) => {
        const response = await api.post(`/ssl/certificates/${id}/renew`);
        return response.data;
    }
};

// FTP API
export const ftp = {
    getUsers: async () => {
        const response = await api.get('/ftp/users');
        return response.data;
    },
    
    createUser: async (data: any) => {
        const response = await api.post('/ftp/users', data);
        return response.data;
    },
    
    updateUser: async (id: number, data: any) => {
        const response = await api.put(`/ftp/users/${id}`, data);
        return response.data;
    },
    
    deleteUser: async (id: number) => {
        const response = await api.delete(`/ftp/users/${id}`);
        return response.data;
    }
};

export default {
    auth,
    virtualHosts,
    dns,
    email,
    database,
    ssl,
    ftp
}; 
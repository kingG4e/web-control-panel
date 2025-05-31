import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const dashboardApi = {
  getStats: () => api.get('/stats'),
  getSystemStats: () => api.get('/system-stats'),
  getRecentActivities: () => api.get('/recent-activities'),
};

export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getCurrentUser: () => api.get('/users/me'),
};

export const virtualHostApi = {
  getAll: () => api.get('/virtual-hosts'),
  create: (data) => api.post('/virtual-hosts', data),
  update: (id, data) => api.put(`/virtual-hosts/${id}`, data),
  delete: (id) => api.delete(`/virtual-hosts/${id}`),
};

export const dnsApi = {
  getZones: () => api.get('/dns/zones'),
  getRecords: (zoneId) => api.get(`/dns/zones/${zoneId}/records`),
  createZone: (data) => api.post('/dns/zones', data),
  createRecord: (zoneId, data) => api.post(`/dns/zones/${zoneId}/records`, data),
  updateRecord: (zoneId, recordId, data) => api.put(`/dns/zones/${zoneId}/records/${recordId}`, data),
  deleteRecord: (zoneId, recordId) => api.delete(`/dns/zones/${zoneId}/records/${recordId}`),
};

export const emailApi = {
  getAccounts: () => api.get('/email/accounts'),
  createAccount: (data) => api.post('/email/accounts', data),
  updateAccount: (id, data) => api.put(`/email/accounts/${id}`, data),
  deleteAccount: (id) => api.delete(`/email/accounts/${id}`),
  getForwarders: () => api.get('/email/forwarders'),
  createForwarder: (data) => api.post('/email/forwarders', data),
};

export const databaseApi = {
  getDatabases: () => api.get('/databases'),
  createDatabase: (data) => api.post('/databases', data),
  deleteDatabase: (id) => api.delete(`/databases/${id}`),
  getUsers: () => api.get('/databases/users'),
  createUser: (data) => api.post('/databases/users', data),
  updateUser: (id, data) => api.put(`/databases/users/${id}`, data),
};

export const sslApi = {
  getCertificates: () => api.get('/ssl/certificates'),
  createCertificate: (data) => api.post('/ssl/certificates', data),
  renewCertificate: (id) => api.post(`/ssl/certificates/${id}/renew`),
  deleteCertificate: (id) => api.delete(`/ssl/certificates/${id}`),
};

export const ftpApi = {
  getAccounts: () => api.get('/ftp/accounts'),
  createAccount: (data) => api.post('/ftp/accounts', data),
  updateAccount: (id, data) => api.put(`/ftp/accounts/${id}`, data),
  deleteAccount: (id) => api.delete(`/ftp/accounts/${id}`),
};

export default api; 
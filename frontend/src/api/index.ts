import axios from 'axios';
import { VirtualHost, Database, SSLCertificate, User } from '../types';

declare const process: {
  env: {
    REACT_APP_API_URL?: string;
  };
};

// Create axios instance with default config
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: (username: string, password: string) =>
    api.post<{ token: string; user: User }>('/auth/login', { username, password }),
  register: (username: string, password: string) =>
    api.post<{ message: string }>('/auth/register', { username, password }),
  me: () => api.get<User>('/users/me'),
};

// Virtual Hosts API
export const virtualHostsApi = {
  getAll: () => api.get<VirtualHost[]>('/virtual-hosts'),
  getOne: (id: number) => api.get<VirtualHost>(`/virtual-hosts/${id}`),
  create: (data: Partial<VirtualHost>) => api.post<VirtualHost>('/virtual-hosts', data),
  update: (id: number, data: Partial<VirtualHost>) =>
    api.patch<VirtualHost>(`/virtual-hosts/${id}`, data),
  delete: (id: number) => api.delete(`/virtual-hosts/${id}`),
};

// Database API
export const databaseApi = {
  getAll: () => api.get<Database[]>('/databases'),
  getOne: (id: number) => api.get<Database>(`/databases/${id}`),
  create: (data: Partial<Database>) => api.post<Database>('/databases', data),
  update: (id: number, data: Partial<Database>) =>
    api.patch<Database>(`/databases/${id}`, data),
  delete: (id: number) => api.delete(`/databases/${id}`),
};

// SSL Certificates API
export const sslApi = {
  getAll: () => api.get<SSLCertificate[]>('/ssl'),
  getOne: (id: number) => api.get<SSLCertificate>(`/ssl/${id}`),
  create: (data: Partial<SSLCertificate>) => api.post<SSLCertificate>('/ssl', data),
  update: (id: number, data: Partial<SSLCertificate>) =>
    api.patch<SSLCertificate>(`/ssl/${id}`, data),
  delete: (id: number) => api.delete(`/ssl/${id}`),
}; 
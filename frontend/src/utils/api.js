import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000';

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    }
});

// Add a request interceptor
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

// Add a response interceptor
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            // Handle 401 Unauthorized
            if (error.response.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
            }
            // Handle 403 Forbidden
            else if (error.response.status === 403) {
                console.error('Access forbidden');
            }
            // Handle 404 Not Found
            else if (error.response.status === 404) {
                console.error('Resource not found');
            }
            // Handle 500 Internal Server Error
            else if (error.response.status >= 500) {
                console.error('Server error');
            }
        } else if (error.request) {
            // Network error
            console.error('Network error');
        } else {
            console.error('Error', error.message);
        }
        return Promise.reject(error);
    }
);

export default api; 
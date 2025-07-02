/**
 * Configuration utility for API URL detection
 */

// Get API URL from environment or use current host
export const getApiUrl = () => {
    // If REACT_APP_API_URL is set, use it
    if (process.env.REACT_APP_API_URL) {
        return process.env.REACT_APP_API_URL;
    }
    
    // If running in development, use current host with port 5000
    if (process.env.NODE_ENV === 'development') {
        const protocol = window.location.protocol;
        const host = window.location.hostname;
        return `${protocol}//${host}:5000`;
    }
    
    // Default fallback
    return 'http://localhost:5000';
};

// Get current environment
export const getEnvironment = () => {
    return process.env.REACT_APP_ENV || process.env.NODE_ENV || 'development';
};

// Check if running in development
export const isDevelopment = () => {
    return getEnvironment() === 'development';
};

// Check if running in production
export const isProduction = () => {
    return getEnvironment() === 'production';
};

// Get configuration object
export const getConfig = () => {
    return {
        apiUrl: getApiUrl(),
        environment: getEnvironment(),
        isDevelopment: isDevelopment(),
        isProduction: isProduction()
    };
};

export default getConfig; 
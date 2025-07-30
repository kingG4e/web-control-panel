import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import axios from 'axios';

const API_URL = '/api';
axios.defaults.baseURL = API_URL;
axios.defaults.headers.common['Content-Type'] = 'application/json';

// Global error handlers for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  // Check if this is a cancellation error that we can safely ignore
  const isCancellationError = 
    event.reason?.message?.includes('Canceled') ||
    event.reason?.message?.includes('cancelled') ||
    event.reason?.message?.includes('aborted') ||
    event.reason?.name === 'AbortError' ||
    event.reason?.code === 'ERR_CANCELED';

  if (isCancellationError) {
    // Log for debugging but don't show to user
    console.debug('Request canceled (this is normal):', event.reason);
    event.preventDefault(); // Prevent the error from being logged to console
    return;
  }

  // Log other unhandled rejections for debugging
  console.error('Unhandled promise rejection:', event.reason);
  
  // Optionally show user-friendly error for non-cancellation errors
  if (event.reason?.message && !event.reason.message.includes('Network Error')) {
    console.warn('Promise rejection that may need attention:', event.reason);
  }
});

// Global error handler for JavaScript errors
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import axios from 'axios';

const API_URL = '/api';
axios.defaults.baseURL = API_URL;
axios.defaults.headers.common['Content-Type'] = 'application/json';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import axios from 'axios';

import { getApiUrl } from './utils/config';

const API_URL = getApiUrl();
axios.defaults.baseURL = API_URL;
axios.defaults.headers.common['Content-Type'] = 'application/json';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

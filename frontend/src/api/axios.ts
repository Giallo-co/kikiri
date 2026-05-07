import axios from 'axios';
import { logApiError } from '../utils/apiError';

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const normalizedBaseUrl = rawBaseUrl.replace(/\/$/, '');
const API_BASE_URL = normalizedBaseUrl.endsWith('/user')
  ? normalizedBaseUrl
  : `${normalizedBaseUrl}/user`;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('kikiri_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    logApiError('Axios response interceptor', error);
    if (error.response?.status === 401) {
      localStorage.removeItem('kikiri_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

const api = axios.create({
  baseURL: apiBaseUrl,
});

// Attach the JWT from localStorage to every outgoing request automatically,
// so individual API calls don't need to handle auth headers themselves
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If the server returns 401, the token is expired or invalid —
    // clear it and force a page reload to redirect the user to login
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

export default api;

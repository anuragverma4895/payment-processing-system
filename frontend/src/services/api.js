import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor - attach JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor - handle auth errors
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

// Auth
export const authAPI = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
};

// Orders
export const orderAPI = {
  create: (data) => api.post('/orders', data),
  getAll: (params) => api.get('/orders', { params }),
  getById: (orderId) => api.get(`/orders/${orderId}`),
  adminGetAll: (params) => api.get('/orders/admin/all', { params }),
};

// Payments
export const paymentAPI = {
  initiate: (data, idempotencyKey) =>
    api.post('/payments', data, { headers: { 'Idempotency-Key': idempotencyKey } }),
  retry: (data, idempotencyKey) =>
    api.post('/payments/retry', data, { headers: { 'Idempotency-Key': idempotencyKey } }),
  getMyPayments: (params) => api.get('/payments/my', { params }),
  getById: (paymentId) => api.get(`/payments/${paymentId}`),
  adminGetAll: (params) => api.get('/payments/admin/all', { params }),
  getDashboardStats: () => api.get('/payments/admin/dashboard'),
};

// Transactions
export const transactionAPI = {
  getMyLogs: (params) => api.get('/transactions/my', { params }),
  adminGetLogs: (params) => api.get('/transactions', { params }),
};

export default api;
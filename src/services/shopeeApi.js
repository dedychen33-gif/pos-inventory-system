import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_SHOPEE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor untuk menambah token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('shopee_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor untuk handle error
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.message || error.message || 'Terjadi kesalahan';
    return Promise.reject(new Error(message));
  }
);

// Dashboard API
export const dashboardApi = {
  getSummary: () => api.get('/dashboard/summary'),
  getChart: (params) => api.get('/dashboard/chart', { params }),
};

// Products API
export const productsApi = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  getLowStock: (params) => api.get('/products/low-stock', { params }),
  sync: () => api.post('/products/sync'),
  export: (params) => api.get('/products/export', { params, responseType: 'blob' }),
  updateStock: (id, stock) => api.put(`/products/${id}/stock`, { stock }),
};

// Orders API
export const ordersApi = {
  getAll: (params) => api.get('/orders', { params }),
  getById: (id) => api.get(`/orders/${id}`),
  getReport: (params) => api.get('/orders/report', { params }),
  updateStatus: (id, status) => api.put(`/orders/${id}/status`, { status }),
  sync: () => api.post('/orders/sync'),
  export: (params) => api.get('/orders/export', { params, responseType: 'blob' }),
};

// Inventory API
export const inventoryApi = {
  getAll: (params) => api.get('/inventory', { params }),
  getLogs: (params) => api.get('/inventory/logs', { params }),
  updateStock: (id, data) => api.put(`/inventory/${id}/stock`, data),
  bulkUpdate: (items) => api.post('/inventory/bulk-update', { items }),
};

// Auth API
export const authApi = {
  getAuthUrl: () => api.get('/auth/shopee/url'),
  callback: (code, shopId) => api.post('/auth/shopee/callback', { code, shopId }),
  getStatus: () => api.get('/auth/status'),
};

export default api;

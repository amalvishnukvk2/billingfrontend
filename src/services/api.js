import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL 

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 — try refresh once, then redirect to login
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

// URLs that should NEVER trigger a refresh attempt
const NO_REFRESH_URLS = ['/auth/login', '/auth/logout', '/auth/refresh', '/settings/public'];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const requestUrl = originalRequest?.url || '';

    // Only attempt refresh on 401, and never for auth/public endpoints
    const shouldRefresh =
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !NO_REFRESH_URLS.some((u) => requestUrl.includes(u));

    if (!shouldRefresh) {
      return Promise.reject(error);
    }

    // If already refreshing, queue this request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const { data } = await axios.post(
        `${API_URL}/auth/refresh`,
        {},
        { withCredentials: true }
      );
      const newToken = data.accessToken;
      localStorage.setItem('accessToken', newToken);
      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      processQueue(null, newToken);
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      // Refresh failed — clear local state and send to login
      processQueue(refreshError, null);
      localStorage.removeItem('accessToken');
      delete api.defaults.headers.common['Authorization'];
      // Only redirect if we're not already on the login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;

// API helpers
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

export const productAPI = {
  getAll: (params) => api.get('/products', { params }),
  getOne: (id) => api.get(`/products/${id}`),
  getBySKU: (sku) => api.get(`/products/sku/${sku}`),
  getByBarcode: (barcode) => api.get(`/products/barcode/${barcode}`),
  create: (data) => api.post('/products', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, data) => api.patch(`/products/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (id) => api.delete(`/products/${id}`),
  getLowStock: () => api.get('/products/low-stock'),
  exportCSV: () => api.get('/products/export/csv', { responseType: 'blob' }),
  importCSV: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/products/import/csv', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

export const categoryAPI = {
  getAll: () => api.get('/categories'),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.patch(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
};

export const inventoryAPI = {
  getAll: (params) => api.get('/inventory', { params }),
  adjust: (data) => api.post('/inventory/adjustments', data),
  getMovements: (params) => api.get('/inventory/movements', { params }),
};

export const saleAPI = {
  create: (data) => api.post('/sales', data),
  getAll: (params) => api.get('/sales', { params }),
  getOne: (id) => api.get(`/sales/${id}`),
  cancel: (id, data) => api.post(`/sales/${id}/cancel`, data),
  processReturn: (id, data) => api.post(`/sales/${id}/returns`, data),
  addPayment: (id, data) => api.post(`/sales/${id}/payments`, data),
};

export const customerAPI = {
  getAll: (params) => api.get('/customers', { params }),
  getOne: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.patch(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
  getHistory: (id, params) => api.get(`/customers/${id}/history`, { params }),
  recordPayment: (id, data) => api.post(`/customers/${id}/payments`, data),
};

export const reportAPI = {
  getDashboard: (params) => api.get('/reports/dashboard', { params }),
  getSales: (params) => api.get('/reports/sales', { params }),
  getProfit: (params) => api.get('/reports/profit', { params }),
  getInventory: () => api.get('/reports/inventory'),
  getProducts: (params) => api.get('/reports/products', { params }),
  getCashiers: (params) => api.get('/reports/cashiers', { params }),
  getCustomerOutstanding: () => api.get('/reports/customer-outstanding'),
};

export const settingsAPI = {
  getPublic: () => api.get('/settings/public'),   // no auth required
  get: () => api.get('/settings'),
  update: (data) => api.patch('/settings', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

export const userAPI = {
  getAll: () => api.get('/users'),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.patch(`/users/${id}`, data),
  changePassword: (id, data) => api.patch(`/users/${id}/password`, data),
  delete: (id) => api.delete(`/users/${id}`),
};

export const returnAPI = {
  getAll: (params) => api.get('/returns', { params }),
  getOne: (id) => api.get(`/returns/${id}`),
};

export const exportAPI = {
  salesBlob: (params) => api.get('/reports/export/sales', { params, responseType: 'blob' }),
  inventoryBlob: () => api.get('/reports/export/inventory', { responseType: 'blob' }),
  downloadBlob: (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },
};

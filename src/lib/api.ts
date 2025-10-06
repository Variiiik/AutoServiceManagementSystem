import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://192.168.2.10:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  
  register: (data: {
    email: string;
    password: string;
    fullName: string;
    role: string;
    phone?: string;
  }) => api.post('/auth/register', data),
  
  getCurrentUser: () => api.get('/auth/me'),
};

// Customers API
export const customersAPI = {
  getAll: () => api.get('/customers'),
  getById: (id: number) => api.get(`/customers/${id}`),
  create: (data: any) => api.post('/customers', data),
  update: (id: number, data: any) => api.put(`/customers/${id}`, data),
  delete: (id: number) => api.delete(`/customers/${id}`),
};

// Vehicles API
export const vehiclesAPI = {
  getAll: () => api.get('/vehicles'),
  getById: (id: number) => api.get(`/vehicles/${id}`),
  create: (data: any) => api.post('/vehicles', data),
  update: (id: number, data: any) => api.put(`/vehicles/${id}`, data),
  delete: (id: number) => api.delete(`/vehicles/${id}`),
};

// Work Orders API
export const workOrdersAPI = {
  getAll: () => api.get('/work-orders'),
  getById: (id: number) => api.get(`/work-orders/${id}`),
  create: (data: any) => api.post('/work-orders', data),
  update: (id: number, data: any) => api.put(`/work-orders/${id}`, data),
  delete: (id: number) => api.delete(`/work-orders/${id}`),
  getParts: (id: number) => api.get(`/work-orders/${id}/parts`),
  addPart: (id: number, data: any) => api.post(`/work-orders/${id}/parts`, data),
};

// Inventory API
export const inventoryAPI = {
  getAll: () => api.get('/inventory'),
  getById: (id: number) => api.get(`/inventory/${id}`),
  create: (data: any) => api.post('/inventory', data),
  update: (id: number, data: any) => api.put(`/inventory/${id}`, data),
  updateStock: (id: number, stock_quantity: number) => 
    api.patch(`/inventory/${id}/stock`, { stock_quantity }),
  delete: (id: number) => api.delete(`/inventory/${id}`),
};

// Appointments API
export const appointmentsAPI = {
  getAll: () => api.get('/appointments'),
  getById: (id: number) => api.get(`/appointments/${id}`),
  create: (data: any) => api.post('/appointments', data),
  update: (id: number, data: any) => api.put(`/appointments/${id}`, data),
  updateStatus: (id: number, status: string) => 
    api.patch(`/appointments/${id}/status`, { status }),
  delete: (id: number) => api.delete(`/appointments/${id}`),
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getRecentOrders: () => api.get('/dashboard/recent-orders'),
  getTodayAppointments: () => api.get('/dashboard/today-appointments'),
  getLowStock: () => api.get('/dashboard/low-stock'),
};
// NormalizePlate
export function normalizePlate(s: string | undefined | null): string {
  if (!s) return '';
  return s.replace(/[\s-]/g, '').toUpperCase();
};

export default api;
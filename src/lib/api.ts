// client/src/lib/api.ts
import axios from 'axios';

/**
 * DEV:
 *  - Vite proxy suunab /api -> http://localhost:5000 (vt vite.config.ts)
 * PROD:
 *  - Express serveerib fronti + API sama originilt, seega /api töötab otse
 *
 * Kui soovid vajadusel üle sõita, lisa .env: VITE_API_URL=https://minu-domeen.ee/api
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
  timeout: 20000,
});

/** Soovi korral saad käsitsi seada/eemaldada Authorization päist */
export function setAuthToken(token?: string) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

// Attach Bearer token automaatselt iga päringu külge
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Global 401 handler
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      // vajadusel eemalda ka instantsi päis
      setAuthToken(undefined);
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// -------- AUTH --------
export const authAPI = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  register: (data: { email: string; password: string; fullName: string; role: 'admin' | 'mechanic'; phone?: string }) =>
    api.post('/auth/register', data),
  getCurrentUser: () => api.get('/auth/me'),
  changePassword: (payload: { currentPassword: string; newPassword: string }) =>
    api.post('/auth/change-password', payload).then(r => r.data),
};

// --- SELF / PROFILE ---
export const meAPI = {
  get: () => api.get('/users/me').then(r => r.data),
  update: (payload: { fullName?: string; email?: string; phone?: string }) =>
    api.put('/users/me', payload).then(r => r.data),
};

// --- USERS (admin) ---
export type AppUser = {
  id: string | number;
  fullName: string;
  email: string;
  role: 'admin' | 'mechanic';
  phone?: string;
  isActive?: boolean;
  createdAt?: string;
};

export const usersAPI = {
  list: (q?: { search?: string; page?: number; limit?: number }) =>
    api.get('/users', { params: q }).then(r => r.data as { items: AppUser[]; total: number }),
  update: (id: string | number, payload: Partial<Pick<AppUser, 'fullName' | 'email' | 'role' | 'isActive' | 'phone'>>) =>
    api.patch(`/users/${id}`, payload).then(r => r.data as AppUser),
  resetPassword: (id: string | number) =>
    api.post(`/users/${id}/reset-password`).then(r => r.data as { tempPassword?: string }),
};

// --- ROLES / PERMISSIONS (admin) ---
export type Role = { id: string; name: string; description?: string };
export type Permission = { key: string; label: string };

export const rolesAPI = {
  listRoles: () => api.get('/roles').then(r => r.data as Role[]),
  listPermissions: () => api.get('/roles/permissions').then(r => r.data as Permission[]),
  getRolePermissions: (roleId: string) =>
    api.get(`/roles/${roleId}/permissions`).then(r => r.data as string[]), // array of keys
  setRolePermissions: (roleId: string, keys: string[]) =>
    api.put(`/roles/${roleId}/permissions`, { permissions: keys }).then(r => r.data),
};

// -------- CUSTOMERS --------
export const customersAPI = {
  getAll: () => api.get('/customers'),
  getById: (id: string | number) => api.get(`/customers/${id}`),
  create: (data: any) => api.post('/customers', data),
  update: (id: string | number, data: any) => api.put(`/customers/${id}`, data),
  delete: (id: string | number) => api.delete(`/customers/${id}`),
};

// -------- VEHICLES --------
export const vehiclesAPI = {
  getAll: () => api.get('/vehicles'),
  getById: (id: string | number) => api.get(`/vehicles/${id}`),
  create: (data: any) => api.post('/vehicles', data),
  update: (id: string | number, data: any) => api.put(`/vehicles/${id}`, data),
  delete: (id: string | number) => api.delete(`/vehicles/${id}`),
  // optional helper kui tahad numbriga otsida:
  findByPlate: (plate: string) => api.get(`/vehicles?plate=${encodeURIComponent(plate)}`),
};

// -------- WORK ORDERS --------
export const workOrdersAPI = {
  getAll: () => api.get('/work-orders'),
  getById: (id: string | number) => api.get(`/work-orders/${id}`),
  create: (data: any) => api.post('/work-orders', data),
  update: (id: string | number, data: any) => api.put(`/work-orders/${id}`, data),
  delete: (id: string | number) => api.delete(`/work-orders/${id}`),

  getParts: (orderId: string | number) => api.get(`/work-orders/${orderId}/parts`),
  addPart: (orderId: string | number, data: any) => api.post(`/work-orders/${orderId}/parts`, data),
  updatePart: (
    orderId: string | number,
    partId: string | number,
    data: { quantity_used?: number; unit_price?: number; cost_price?: number; custom_name?: string; custom_sku?: string }
  ) => api.patch(`/work-orders/${orderId}/parts/${partId}`, data),
  deletePart: (orderId: string | number, partId: string | number) =>
    api.delete(`/work-orders/${orderId}/parts/${partId}`),

  /** Tööaja nupud: start, pause, resume, stop */
  timerAction: (id: string | number, action: 'start' | 'pause' | 'resume' | 'stop') =>
    api.patch(`/work-orders/${id}/timer`, { action }),
};

// -------- INVENTORY --------
export const inventoryAPI = {
  getAll: () => api.get('/inventory'),
  getById: (id: string | number) => api.get(`/inventory/${id}`),
  create: (data: any) => api.post('/inventory', data),
  update: (id: string | number, data: any) => api.put(`/inventory/${id}`, data),
  updateStock: (id: string | number, stock_quantity: number) =>
    api.patch(`/inventory/${id}/stock`, { stock_quantity }),
  delete: (id: string | number) => api.delete(`/inventory/${id}`),
};

// -------- APPOINTMENTS --------
export const appointmentsAPI = {
  getAll: () => api.get('/appointments'),
  getById: (id: string | number) => api.get(`/appointments/${id}`),
  create: (data: any) => api.post('/appointments', data),
  update: (id: string | number, data: any) => api.put(`/appointments/${id}`, data),
  updateStatus: (id: string | number, status: string) => api.patch(`/appointments/${id}/status`, { status }),
  delete: (id: string | number) => api.delete(`/appointments/${id}`),
};

// -------- DASHBOARD --------
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getRecentOrders: () => api.get('/dashboard/recent-orders'),
  getTodayAppointments: () => api.get('/dashboard/today-appointments'),
  getLowStock: () => api.get('/dashboard/low-stock'),
};

// Utility
export function normalizePlate(s: string | undefined | null): string {
  if (!s) return '';
  return s.replace(/[\s-]/g, '').toUpperCase();
}

export default api;

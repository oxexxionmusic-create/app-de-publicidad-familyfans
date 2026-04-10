import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API_BASE = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_BASE,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ffm_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('ffm_token');
      localStorage.removeItem('ffm_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  saveCreatorProfile: (formData) => api.post('/auth/creator-profile', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

// Deposits
export const depositsAPI = {
  create: (formData) => api.post('/deposits', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  list: () => api.get('/deposits'),
  approve: (id) => api.put(`/admin/deposits/${id}/approve`),
  reject: (id, note) => api.put(`/admin/deposits/${id}/reject?note=${encodeURIComponent(note || '')}`),
};

// Campaigns
export const campaignsAPI = {
  create: (data) => api.post('/campaigns', data),
  list: (status) => api.get('/campaigns', { params: { status } }),
  available: () => api.get('/campaigns/available'),
  get: (id) => api.get(`/campaigns/${id}`),
  cancel: (id) => api.put(`/campaigns/${id}/cancel`),
};

// Applications
export const applicationsAPI = {
  create: (formData) => api.post('/applications', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  list: (campaignId) => api.get('/applications', { params: { campaign_id: campaignId } }),
  accept: (id) => api.put(`/applications/${id}/accept`),
  reject: (id) => api.put(`/applications/${id}/reject`),
};

// Deliverables
export const deliverablesAPI = {
  submit: (formData) => api.post('/deliverables', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  list: (campaignId) => api.get('/deliverables', { params: { campaign_id: campaignId } }),
  approve: (id) => api.put(`/admin/deliverables/${id}/approve`),
  reject: (id, note) => api.put(`/admin/deliverables/${id}/reject?note=${encodeURIComponent(note || '')}`),
};

// KYC
export const kycAPI = {
  submit: (formData) => api.post('/kyc', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  list: () => api.get('/kyc'),
  approve: (id) => api.put(`/admin/kyc/${id}/approve`),
  reject: (id, note) => api.put(`/admin/kyc/${id}/reject?note=${encodeURIComponent(note || '')}`),
};

// Withdrawals
export const withdrawalsAPI = {
  request: (data) => api.post('/withdrawals', data),
  list: () => api.get('/withdrawals'),
  approve: (id) => api.put(`/admin/withdrawals/${id}/approve`),
  reject: (id) => api.put(`/admin/withdrawals/${id}/reject`),
};

// Transactions
export const transactionsAPI = {
  list: () => api.get('/transactions'),
};

// Subscriptions
export const subscriptionsAPI = {
  setPlan: (data) => api.post('/subscriptions/plan', data),
  subscribe: (formData) => api.post('/subscriptions/subscribe', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  list: () => api.get('/subscriptions'),
};

// Premium Content
export const premiumContentAPI = {
  create: (formData) => api.post('/premium-content', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  get: (creatorId) => api.get(`/premium-content/${creatorId}`),
};

// Music Financing
export const musicFinancingAPI = {
  request: (formData) => api.post('/music-financing', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  list: () => api.get('/music-financing'),
  approve: (id, message, amount) => api.put(`/admin/music-financing/${id}/approve?message=${encodeURIComponent(message || '')}&amount=${amount || 0}`),
  reject: (id, message) => api.put(`/admin/music-financing/${id}/reject?message=${encodeURIComponent(message || '')}`),
};

// Admin
export const adminAPI = {
  stats: () => api.get('/admin/stats'),
  users: (role) => api.get('/admin/users', { params: { role } }),
  settings: () => api.get('/admin/settings'),
  updateSettings: (formData) => api.put('/admin/settings', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  changeRole: (userId, formData) => api.put(`/admin/users/${userId}/role`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  toggleTop10: (userId, formData) => api.put(`/admin/users/${userId}/top10`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  recalculateRankings: () => api.post('/admin/rankings/recalculate'),
};

// Explore
export const exploreAPI = {
  creators: (params) => api.get('/explore/creators', { params }),
  creator: (id) => api.get(`/explore/creators/${id}`),
};

// Payment Info
export const paymentInfoAPI = {
  get: () => api.get('/payment-info'),
};

// Rankings
export const rankingsAPI = {
  get: () => api.get('/rankings'),
};

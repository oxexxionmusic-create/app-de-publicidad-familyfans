import axios from 'axios';

const API_BASE = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ffm_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ==================== AUTH ====================
export const authAPI = {
  register: (data) => api.post('/api/auth/register', data),
  login: (data) => api.post('/api/auth/login', data),
  me: () => api.get('/api/auth/me'),
  saveCreatorProfile: (formData) => 
    api.post('/api/auth/creator-profile', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  updateProfilePhoto: (formData) =>
    api.post('/api/auth/profile-photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

// ==================== CAMPAIGNS ====================
export const campaignsAPI = {
  list: (status) => api.get(`/api/campaigns${status ? `?status=${status}` : ''}`),
  available: () => api.get('/api/campaigns/available'),
  create: (data) => api.post('/api/campaigns', data),
  getById: (id) => api.get(`/api/campaigns/${id}`),
  cancel: (id) => api.put(`/api/campaigns/${id}/cancel`),
  uploadMedia: (id, formData) =>
    api.post(`/api/campaigns/${id}/media`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

// ==================== APPLICATIONS ====================
export const applicationsAPI = {
  list: (campaignId) => 
    api.get(`/api/applications${campaignId ? `?campaign_id=${campaignId}` : ''}`),
  create: (formData) =>
    api.post('/api/applications', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  accept: (id) => api.put(`/api/applications/${id}/accept`),
  reject: (id) => api.put(`/api/applications/${id}/reject`),
};

// ==================== DELIVERABLES ====================
export const deliverablesAPI = {
  list: (campaignId) =>
    api.get(`/api/deliverables${campaignId ? `?campaign_id=${campaignId}` : ''}`),
  submit: (formData) =>
    api.post('/api/deliverables', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  approve: (id) => api.put(`/admin/deliverables/${id}/approve`),
  reject: (id, note) => api.put(`/admin/deliverables/${id}/reject?note=${encodeURIComponent(note)}`),
};

// ==================== DELIVERABLE ACTIONS ====================
export const deliverableActionsAPI = {
  releaseFinal: (id) => api.put(`/admin/deliverables/${id}/release-final`),
  claimBonus: (id) => api.put(`/deliverables/${id}/claim-bonus`),
};

// ==================== TRANSACTIONS ====================
export const transactionsAPI = {
  list: () => api.get('/api/transactions'),
};

// ==================== DEPOSITS ====================
export const depositsAPI = {
  list: () => api.get('/api/deposits'),
  create: (formData) =>
    api.post('/api/deposits', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  approve: (id) => api.put(`/admin/deposits/${id}/approve`),
  reject: (id, note) => api.put(`/admin/deposits/${id}/reject?note=${encodeURIComponent(note)}`),
};

// ==================== WITHDRAWALS ====================
export const withdrawalsAPI = {
  list: () => api.get('/api/withdrawals'),
  request: (data) => api.post('/api/withdrawals', data),
  approve: (id) => api.put(`/admin/withdrawals/${id}/approve`),
  reject: (id) => api.put(`/admin/withdrawals/${id}/reject`),
};

// ==================== KYC ====================
export const kycAPI = {
  list: () => api.get('/api/kyc'),
  submit: (formData) =>
    api.post('/api/kyc', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  approve: (id) => api.put(`/admin/kyc/${id}/approve`),
  reject: (id, note) => api.put(`/admin/kyc/${id}/reject?note=${encodeURIComponent(note)}`),
};

// ==================== SUBSCRIPTIONS ====================
export const subscriptionsAPI = {
  list: () => api.get('/api/subscriptions'),
  setPlan: (data) => api.post('/api/subscriptions/plan', data),
  subscribe: (formData) =>
    api.post('/api/subscriptions/subscribe', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

// ==================== PREMIUM CONTENT ====================
export const premiumContentAPI = {
  create: (formData) =>
    api.post('/api/premium-content', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  get: (creatorId) => api.get(`/api/premium-content/${creatorId}`),
};

// ==================== MUSIC FINANCING ====================
export const musicFinancingAPI = {
  list: () => api.get('/api/music-financing'),
  request: (formData) =>
    api.post('/api/music-financing', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  approve: (id, message, amount) =>
    api.put(`/admin/music-financing/${id}/approve?message=${encodeURIComponent(message)}&amount=${amount}`),
  reject: (id, message) =>
    api.put(`/admin/music-financing/${id}/reject?message=${encodeURIComponent(message)}`),
};

// ==================== CURATOR ====================
export const curatorAPI = {
  playlists: () => api.get('/api/curator/playlists'),
  registerPlaylist: (formData) =>
    api.post('/api/curator/playlist', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  requests: () => api.get('/api/curator/requests'),
  requestPayment: (formData) =>
    api.post('/api/curator/payment-request', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  approveRequest: (id) => api.put(`/admin/curator/requests/${id}/approve`),
  rejectRequest: (id, note) =>
    api.put(`/admin/curator/requests/${id}/reject?note=${encodeURIComponent(note)}`),
};

// ==================== REFERRALS ====================
export const referralsAPI = {
  get: () => api.get('/api/referrals'),
};

// ==================== LEVEL REQUESTS ====================
export const levelRequestsAPI = {
  list: () => api.get('/api/creator/level-requests'),
  request: (formData) =>
    api.post('/api/creator/level-request', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  approve: (id) => api.put(`/admin/level-requests/${id}/approve`),
  reject: (id) => api.put(`/admin/level-requests/${id}/reject`),
};

// ==================== PROFILE PHOTO ====================
export const profilePhotoAPI = {
  upload: (formData) =>
    api.post('/api/auth/profile-photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

// ==================== ADMIN ====================
export const adminAPI = {
  stats: () => api.get('/api/admin/stats'),
  settings: () => api.get('/api/admin/settings'),
  updateSettings: (formData) =>
    api.put('/api/admin/settings', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  users: (role) => api.get(`/api/admin/users${role ? `?role=${role}` : ''}`),
  toggleTop10: (userId, formData) =>
    api.put(`/api/admin/users/${userId}/top10`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  changeRole: (userId, formData) =>
    api.put(`/api/admin/users/${userId}/role`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export const adminWalletAPI = {
  get: () => api.get('/api/admin/wallet'),
};

export const rankingBoardsAPI = {
  list: () => api.get('/api/ranking-boards'),
  create: (formData) =>
    api.post('/api/admin/ranking-boards', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  addCreator: (boardId, formData) =>
    api.put(`/api/admin/ranking-boards/${boardId}/add-creator`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export const adminLevelAPI = {
  setLevel: (userId, formData) =>
    api.put(`/api/admin/users/${userId}/level`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

// ==================== PAYMENT INFO ====================
export const paymentInfoAPI = {
  get: () => api.get('/api/payment-info'),
};

// ==================== EXPLORE ====================
export const exploreAPI = {
  creators: (niche, region) =>
    api.get(`/api/explore/creators${niche ? `?niche=${niche}${region ? `&region=${region}` : ''}` : ''}`),
  creator: (id) => api.get(`/api/explore/creators/${id}`),
};

// ==================== MEDIA & CLOUDINARY (NUEVO) ====================
export const mediaAPI = {
  upload: (formData) =>
    api.post('/api/media/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        formData.onProgress?.(percentCompleted);
      },
    }),
  list: (creatorId) => api.get(`/api/media${creatorId ? `?creator_id=${creatorId}` : ''}`),
  delete: (ids) => api.delete('/api/media', { data: { media_ids: ids } }),
  getSecureUrl: (publicId, resourceType = 'image') =>
    api.post('/api/media/secure-url', { public_id: publicId, resource_type: resourceType }),
};

export const cloudinaryAPI = {
  getSignature: (params) => api.post('/api/cloudinary/sign-upload', params),
  getUsage: () => api.get('/api/cloudinary/usage'),
};

// ==================== CHAT (NUEVO) ====================
export const chatAPI = {
  sendMessage: (data) => api.post('/api/chat/send', data),
  sendAudio: (formData) =>
    api.post('/api/chat/send/audio', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  sendMedia: (formData) =>
    api.post('/api/chat/send/media', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getConversations: () => api.get('/api/chat/conversations'),
  getMessages: (userId, limit = 50, before = null) =>
    api.get(`/api/chat/messages/${userId}?limit=${limit}${before ? `&before=${before}` : ''}`),
  payForContent: (messageId, payment) =>
    api.post(`/api/chat/messages/${messageId}/pay`, payment),
  deleteMessage: (messageId) => api.delete(`/api/chat/messages/${messageId}`),
  markAsRead: (messageIds) => api.post('/api/chat/mark-read', { message_ids: messageIds }),
};

export default api;
export { API_BASE };

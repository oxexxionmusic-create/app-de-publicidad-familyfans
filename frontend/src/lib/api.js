// src/lib/api.js
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

// ==================== AUTH ====================
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  saveCreatorProfile: (formData) => api.post('/auth/creator-profile', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  uploadProfilePhoto: (formData) => api.post('/auth/profile-photo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

// ==================== DEPOSITS ====================
export const depositsAPI = {
  create: (formData) => api.post('/deposits', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  list: () => api.get('/deposits'),
  approve: (id) => api.put(`/admin/deposits/${id}/approve`),
  reject: (id, note) => api.put(`/admin/deposits/${id}/reject?note=${encodeURIComponent(note || '')}`),
};

// ==================== CAMPAIGNS ====================
export const campaignsAPI = {
  create: (data) => api.post('/campaigns', data),
  list: (status) => api.get('/campaigns', { params: { status } }),
  available: () => api.get('/campaigns/available'),
  get: (id) => api.get(`/campaigns/${id}`),
  cancel: (id) => api.put(`/campaigns/${id}/cancel`),
  // Subir material multimedia (audio de instrucciones, imagen de referencia) a Cloudinary
  uploadMedia: (campaignId, formData) => api.post(`/campaigns/${campaignId}/media`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

// ==================== APPLICATIONS ====================
export const applicationsAPI = {
  create: (formData) => api.post('/applications', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  list: (campaignId) => api.get('/applications', { params: { campaign_id: campaignId } }),
  accept: (id) => api.put(`/applications/${id}/accept`),
  reject: (id) => api.put(`/applications/${id}/reject`),
};

// ==================== DELIVERABLES ====================
export const deliverablesAPI = {
  submit: (formData) => api.post('/deliverables', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  list: (campaignId) => api.get('/deliverables', { params: { campaign_id: campaignId } }),
  approve: (id) => api.put(`/admin/deliverables/${id}/approve`),
  reject: (id, note) => api.put(`/admin/deliverables/${id}/reject?note=${encodeURIComponent(note || '')}`),
};

// ==================== KYC ====================
export const kycAPI = {
  submit: (formData) => api.post('/kyc', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  list: () => api.get('/kyc'),
  approve: (id) => api.put(`/admin/kyc/${id}/approve`),
  reject: (id, note) => api.put(`/admin/kyc/${id}/reject?note=${encodeURIComponent(note || '')}`),
};

// ==================== WITHDRAWALS ====================
export const withdrawalsAPI = {
  request: (data) => api.post('/withdrawals', data),
  list: () => api.get('/withdrawals'),
  approve: (id) => api.put(`/admin/withdrawals/${id}/approve`),
  reject: (id) => api.put(`/admin/withdrawals/${id}/reject`),
};

// ==================== TRANSACTIONS ====================
export const transactionsAPI = {
  list: () => api.get('/transactions'),
};

// ==================== SUBSCRIPTIONS ====================
export const subscriptionsAPI = {
  setPlan: (data) => api.post('/subscriptions/plan', data),
  subscribe: (formData) => api.post('/subscriptions/subscribe', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  list: () => api.get('/subscriptions'),
};

// ==================== PREMIUM CONTENT ====================
export const premiumContentAPI = {
  create: (formData) => api.post('/premium-content', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  get: (creatorId) => api.get(`/premium-content/${creatorId}`),
  // Obtener URL firmada para contenido (con blur si no está pagado)
  getSignedUrl: (publicId, resourceType = 'image') =>
    api.get(`/media/signed-url/${publicId}`, { params: { resource_type: resourceType } }),
  // Eliminar contenido premium (solo el creador o admin)
  delete: (id) => api.delete(`/premium-content/${id}`),
};

// ==================== MEDIA (CLOUDINARY) ====================
export const mediaAPI = {
  // Solicitar firma para subir directamente a Cloudinary
  signUpload: (params) => api.post('/cloudinary/sign-upload', params),
  // Subir video (a través del backend) - Soporta onUploadProgress
  uploadVideo: (formData, options = {}) => api.post('/media/upload/video', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    ...options,
  }),
  // Subir imagen (a través del backend) - Soporta onUploadProgress
  uploadImage: (formData, options = {}) => api.post('/media/upload/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    ...options,
  }),
  // Obtener URL firmada para un recurso
  getSignedUrl: (publicId, resourceType = 'video', expiresIn = 3600) =>
    api.get(`/media/signed-url/${publicId}`, { params: { resource_type: resourceType, expires_in: expiresIn } }),
  // Eliminar recurso
  deleteMedia: (publicId, resourceType = 'video') =>
    api.delete(`/media/delete/${publicId}`, { params: { resource_type: resourceType } }),
  // Obtener información de un recurso
  getInfo: (publicId) => api.get(`/media/info/${publicId}`),
  // Listar todos los medios (admin) – endpoint opcional
  listAll: (params) => api.get('/admin/media', { params }),
};

// ==================== STORAGE QUOTA ====================
export const storageAPI = {
  // Obtener uso de almacenamiento de un creador (o usuario actual)
  getUsage: (creatorId) => api.get(`/creator/storage/${creatorId}`),
  // Ajustar límite manualmente (admin) – endpoint opcional
  setLimit: (creatorId, data) => api.put(`/admin/storage/${creatorId}/limit`, data),
  // Obtener uso de todos los creadores (admin) – endpoint opcional
  getAllUsage: () => api.get('/admin/storage'),
};

// ==================== MUSIC FINANCING ====================
export const musicFinancingAPI = {
  request: (formData) => api.post('/music-financing', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  list: () => api.get('/music-financing'),
  approve: (id, message, amount) => api.put(`/admin/music-financing/${id}/approve?message=${encodeURIComponent(message || '')}&amount=${amount || 0}`),
  reject: (id, message) => api.put(`/admin/music-financing/${id}/reject?message=${encodeURIComponent(message || '')}`),
};

// ==================== ADMIN ====================
export const adminAPI = {
  stats: () => api.get('/admin/stats'),
  users: (role) => api.get('/admin/users', { params: { role } }),
  settings: () => api.get('/admin/settings'),
  updateSettings: (formData) => api.put('/admin/settings', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  changeRole: (userId, formData) => api.put(`/admin/users/${userId}/role`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  toggleTop10: (userId, formData) => api.put(`/admin/users/${userId}/top10`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  recalculateRankings: () => api.post('/admin/rankings/recalculate'),
};

// ==================== EXPLORE ====================
export const exploreAPI = {
  creators: (params) => api.get('/explore/creators', { params }),
  creator: (id) => api.get(`/explore/creators/${id}`),
};

// ==================== PAYMENT INFO ====================
export const paymentInfoAPI = {
  get: () => api.get('/payment-info'),
};

// ==================== RANKINGS ====================
export const rankingsAPI = {
  get: () => api.get('/rankings'),
};

// ==================== CURATOR ====================
export const curatorAPI = {
  registerPlaylist: (formData) => api.post('/curator/playlist', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  playlists: () => api.get('/curator/playlists'),
  requestPayment: (formData) => api.post('/curator/payment-request', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  requests: () => api.get('/curator/requests'),
  approveRequest: (id) => api.put(`/admin/curator/requests/${id}/approve`),
  rejectRequest: (id, note) => api.put(`/admin/curator/requests/${id}/reject?note=${encodeURIComponent(note || '')}`),
};

// ==================== REFERRALS ====================
export const referralsAPI = {
  get: () => api.get('/referrals'),
};

// ==================== LEVEL REQUESTS ====================
export const levelRequestsAPI = {
  request: (formData) => api.post('/creator/level-request', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  list: () => api.get('/creator/level-requests'),
  approve: (id) => api.put(`/admin/level-requests/${id}/approve`),
  reject: (id) => api.put(`/admin/level-requests/${id}/reject`),
};

// ==================== PROFILE PHOTO ====================
export const profilePhotoAPI = {
  upload: (formData) => api.post('/auth/profile-photo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

// ==================== ADMIN WALLET ====================
export const adminWalletAPI = {
  get: () => api.get('/admin/wallet'),
};

// ==================== RANKING BOARDS ====================
export const rankingBoardsAPI = {
  list: () => api.get('/ranking-boards'),
  create: (formData) => api.post('/admin/ranking-boards', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  addCreator: (boardId, formData) => api.put(`/admin/ranking-boards/${boardId}/add-creator`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

// ==================== DELIVERABLE ACTIONS ====================
export const deliverableActionsAPI = {
  releaseFinal: (id) => api.put(`/admin/deliverables/${id}/release-final`),
  claimBonus: (id) => api.put(`/deliverables/${id}/claim-bonus`),
};

// ==================== ADMIN SET LEVEL ====================
export const adminLevelAPI = {
  setLevel: (userId, formData) => api.put(`/admin/users/${userId}/level`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

// ==================== MICRO TASKS ====================
export const microTasksAPI = {
  submit: (formData) => api.post('/micro-tasks', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  list: () => api.get('/micro-tasks'),
  approve: (id) => api.put(`/admin/micro-tasks/${id}/approve`),
  reject: (id) => api.put(`/admin/micro-tasks/${id}/reject`),
};

// ==================== CHAT ====================
export const chatAPI = {
  // Enviar mensaje
  sendMessage: (data) => api.post('/chat/messages', data),
  // Obtener conversaciones del usuario actual
  getConversations: () => api.get('/chat/conversations'),
  // Obtener mensajes con un usuario específico
  getMessages: (otherUserId, limit = 50, before) =>
    api.get(`/chat/messages/${otherUserId}`, { params: { limit, before } }),
  // Marcar mensaje como leído
  markAsRead: (messageId) => api.put(`/chat/messages/${messageId}/read`),
  // Pagar para desbloquear contenido de pago en chat
  payForContent: (messageId) => api.post('/chat/pay', { message_id: messageId }),
  // Obtener URL firmada para archivos multimedia del chat
  getChatMediaUrl: (publicId, resourceType = 'image') =>
    api.get(`/chat/media/signed/${publicId}`, { params: { resource_type: resourceType } }),
  // Obtener todas las conversaciones (admin) – endpoint opcional
  getAllConversations: () => api.get('/admin/chat/conversations'),
};

// ==================== CAMPAIGN MEDIA (para anunciantes) ====================
export const campaignMediaAPI = {
  upload: (campaignId, formData) => api.post(`/campaigns/${campaignId}/media`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

import axios from 'axios';
const BASE = import.meta.env.VITE_API_URL || 'https://api.qala.studio';
const api = axios.create({ baseURL: BASE, withCredentials: true });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('qala_token');
  if (token) cfg.headers.authorization = `Bearer ${token}`;
  cfg.headers['rid'] = cfg.headers['rid'] || 'session';
  return cfg;
});

api.interceptors.response.use(r => r, async err => {
  if (err.response?.status === 401 && !err.config._retry) {
    err.config._retry = true;
    try {
      const res = await axios.post(`${BASE}/auth/session/refresh`, {}, {
        headers: { 'rid': 'session' },
        withCredentials: true,
      });
      const t = res.headers['st-access-token'];
      if (t) {
        localStorage.setItem('qala_token', t);
        err.config.headers.authorization = `Bearer ${t}`;
        return api.request(err.config);
      }
    } catch {
      // Refresh failed - session truly expired
      localStorage.removeItem('qala_token');
      localStorage.removeItem('qala_refresh');
      window.location.href = '/login?reason=session_expired';
      return Promise.reject(err);
    }
  }
  return Promise.reject(err);
});

export const authAPI = {
  signin:  (email, password) => axios.post(`${BASE}/auth/signin`,
    { formFields: [{ id:'email', value:email }, { id:'password', value:password }] },
    { headers: { 'Content-Type':'application/json', rid:'emailpassword' }, withCredentials: true }),
  signup:  (email, password) => axios.post(`${BASE}/auth/signup`,
    { formFields: [{ id:'email', value:email }, { id:'password', value:password }] },
    { headers: { 'Content-Type':'application/json', rid:'emailpassword' }, withCredentials: true }),
  signout: () => api.post('/auth/signout'),
  me:      () => api.get('/api/me/'),
};

const ph = pid => pid ? { 'X-Profile-Id': String(pid) } : {};
export const onboardingAPI = {
  snapshot:    pid => api.get('/api/seller/onboarding/', { headers: ph(pid) }),
  flags:       pid => api.get('/api/seller/onboarding/flags/', { headers: ph(pid) }),
  getStudio:   pid => api.get('/api/seller/onboarding/studio/', { headers: ph(pid) }),
  putStudio:   (pid,d) => api.put('/api/seller/onboarding/studio/', d, { headers: ph(pid) }),
  patchStudio: (pid,d) => api.patch('/api/seller/onboarding/studio/', d, { headers: ph(pid) }),
  addContact:  (pid,d) => api.post('/api/seller/onboarding/studio/contacts/', d, { headers: ph(pid) }),
  patchContact:(pid,id,d) => api.patch(`/api/seller/onboarding/studio/contacts/${id}/`, d, { headers: ph(pid) }),
  delContact:  (pid,id) => api.delete(`/api/seller/onboarding/studio/contacts/${id}/`, { headers: ph(pid) }),
  putUSPs:     (pid,d) => api.put('/api/seller/onboarding/studio/usps/', d, { headers: ph(pid) }),
  uploadMedia:       (pid,f) => api.post('/api/seller/onboarding/studio/media/', f, { headers: ph(pid) }),
  delMedia:          (pid,id) => api.delete(`/api/seller/onboarding/studio/media/${id}/`, { headers: ph(pid) }),
  uploadStudioMedia: (pid,f) => api.post('/api/seller/onboarding/studio/media/', f, { headers: ph(pid) }),
  delStudioMedia:    (pid,id) => api.delete(`/api/seller/onboarding/studio/media/${id}/`, { headers: ph(pid) }),
  getProducts: pid => api.get('/api/seller/onboarding/products/', { headers: ph(pid) }),
  putProducts: (pid,d) => api.put('/api/seller/onboarding/products/', d, { headers: ph(pid) }),
  getFabrics:  pid => api.get('/api/seller/onboarding/fabrics/', { headers: ph(pid) }),
  putFabrics:  (pid,d) => api.put('/api/seller/onboarding/fabrics/', d, { headers: ph(pid) }),
  getBrands:   pid => api.get('/api/seller/onboarding/brands/', { headers: ph(pid) }),
  addBrand:    (pid,d) => api.post('/api/seller/onboarding/brands/', d, { headers: ph(pid) }),
  patchBrand:  (pid,id,d) => api.patch(`/api/seller/onboarding/brands/${id}/`, d, { headers: ph(pid) }),
  delBrand:    (pid,id) => api.delete(`/api/seller/onboarding/brands/${id}/`, { headers: ph(pid) }),
  getAwards:   pid => api.get('/api/seller/onboarding/awards/', { headers: ph(pid) }),
  addAward:    (pid,d) => api.post('/api/seller/onboarding/awards/', d, { headers: ph(pid) }),
  delAward:    (pid,id) => api.delete(`/api/seller/onboarding/awards/${id}/`, { headers: ph(pid) }),
  getCrafts:   pid => api.get('/api/seller/onboarding/crafts/', { headers: ph(pid) }),
  addCraft:    (pid,d) => api.post('/api/seller/onboarding/crafts/', d, { headers: ph(pid) }),
  patchCraft:  (pid,id,d) => api.patch(`/api/seller/onboarding/crafts/${id}/`, d, { headers: ph(pid) }),
  delCraft:    (pid,id) => api.delete(`/api/seller/onboarding/crafts/${id}/`, { headers: ph(pid) }),
  submitCrafts:(pid) => api.post('/api/seller/onboarding/crafts/submit/', {}, { headers: ph(pid) }),
  getCollab:   pid => api.get('/api/seller/onboarding/collab/', { headers: ph(pid) }),
  putCollab:   (pid,d) => api.put('/api/seller/onboarding/collab/', d, { headers: ph(pid) }),
  putBuyerReqs:(pid,d) => api.put('/api/seller/onboarding/collab/buyer-requirements/', d, { headers: ph(pid) }),
  getProduction:pid => api.get('/api/seller/onboarding/production/', { headers: ph(pid) }),
  putProduction:(pid,d) => api.put('/api/seller/onboarding/production/', d, { headers: ph(pid) }),
  putMOQ:      (pid,d) => api.put('/api/seller/onboarding/production/moq/', d, { headers: ph(pid) }),
  getProcess:  pid => api.get('/api/seller/onboarding/process/', { headers: ph(pid) }),
  putProcess:  (pid,d) => api.put('/api/seller/onboarding/process/', d, { headers: ph(pid) }),
  uploadBTS:   (pid,f) => api.post('/api/seller/onboarding/process/media/', f, { headers: ph(pid) }),
  delBTS:      (pid,id) => api.delete(`/api/seller/onboarding/process/media/${id}/`, { headers: ph(pid) }),

  // Seller — own studio inquiries (buyers who clicked "Get a Callback")
  getStudioInquiries: pid => api.get('/api/seller/studio-inquiries/', { headers: ph(pid) }),
};

export const adminAPI = {
  listSellers:   () => api.get('/api/admin/sellers/'),
  createSeller:  d => api.post('/api/admin/sellers/', d),
  listProfiles:  () => api.get('/api/admin/seller-profiles/'),
  getOnboarding: pid => api.get(`/api/admin/seller-profiles/${pid}/onboarding/`),
  flagField:     (pid,d) => api.post(`/api/admin/seller-profiles/${pid}/flag/`, d),
  editSection:   (pid, section, d) => api.patch(`/api/admin/seller-profiles/${pid}/edit/${section}/`, d),
  // Discovery
  getDiscoveryBuyers:       () => api.get('/api/admin/discovery/buyers/'),
  getDiscoveryBuyer:        id => api.get(`/api/admin/discovery/buyers/${id}/`),
  getDiscoveryInquiries:    () => api.get('/api/admin/discovery/inquiries/'),
  getAdminStudioInquiries:  () => api.get('/api/admin/discovery/studio-inquiries/'),
};

// ─── DISCOVERY API ─────────────────────────────────────────────────────────────
const SESSION_KEY = 'qala_session_token';

export const discoveryAPI = {
  getStoredSession: () => localStorage.getItem(SESSION_KEY),
  saveSession:      token => localStorage.setItem(SESSION_KEY, token),
  clearSession:     () => localStorage.removeItem(SESSION_KEY),

  getImages: () =>
    axios.get(`${BASE}/api/discovery/images/`),

  submitReadinessCheck: data =>
    axios.post(`${BASE}/api/discovery/readiness-check/`, data, {
      headers: { 'Content-Type': 'application/json' },
    }),

  getRecommendations: sessionToken =>
    axios.get(`${BASE}/api/discovery/recommendations/`, {
      params: { session_token: sessionToken },
    }),

  editRecommendations: (sessionToken, data) =>
    axios.post(`${BASE}/api/discovery/recommendations/edit/`, {
      ...data, session_token: sessionToken,
    }, { headers: { 'Content-Type': 'application/json' } }),

  getSession: sessionToken =>
    axios.get(`${BASE}/api/discovery/session/`, {
      params: { session_token: sessionToken },
    }),

  linkSession: sessionToken =>
    api.post('/api/discovery/link-session/', { session_token: sessionToken }),

  submitCustomInquiry: data =>
    axios.post(`${BASE}/api/discovery/custom-inquiry/`, data, {
      headers: { 'Content-Type': 'application/json' },
    }),

  // Public studio profile
  getStudioProfile: profileId =>
    axios.get(`${BASE}/api/discovery/studios/${profileId}/`),

  studioInquiry: (profileId, data) =>
    axios.post(`${BASE}/api/discovery/studios/${profileId}/inquire/`, data, {
      headers: { 'Content-Type': 'application/json' },
    }),

  // Feature 6 — Studio Directory
  getStudioDirectory: ({ craft = '', fabric = '', productType = '' } = {}) => {
    const params = {};
    if (craft)       params.craft        = craft;
    if (fabric)      params.fabric       = fabric;
    if (productType) params.product_type = productType;
    return axios.get(`${BASE}/api/studios/directory/`, { params });
  },
};
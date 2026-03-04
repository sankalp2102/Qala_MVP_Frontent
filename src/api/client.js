import axios from 'axios';
const BASE = 'http://34.169.72.66:8000';
const api = axios.create({ baseURL: BASE });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('qala_token');
  if (token) cfg.headers.authorization = `Bearer ${token}`;
  return cfg;
});
api.interceptors.response.use(r => r, async err => {
  if (err.response?.status === 401) {
    const refresh = localStorage.getItem('qala_refresh');
    if (refresh) {
      try {
        const res = await axios.post(`${BASE}/auth/session/refresh`, {}, { headers: { 'st-refresh-token': refresh }});
        const t = res.headers['st-access-token'];
        if (t) { localStorage.setItem('qala_token', t); err.config.headers.authorization = `Bearer ${t}`; return api.request(err.config); }
      } catch { localStorage.clear(); window.location.href = '/login'; }
    }
  }
  return Promise.reject(err);
});

export const authAPI = {
  signin: (email, password) => axios.post(`${BASE}/auth/signin`,
    { formFields: [{ id:'email', value:email }, { id:'password', value:password }] },
    { headers: { 'Content-Type':'application/json', rid:'emailpassword' } }),
  signup: (email, password) => axios.post(`${BASE}/auth/signup`,
    { formFields: [{ id:'email', value:email }, { id:'password', value:password }] },
    { headers: { 'Content-Type':'application/json', rid:'emailpassword' } }),
  signout: () => api.post('/auth/signout'),
  me: () => api.get('/api/me/'),
};

const ph = pid => pid ? { 'X-Profile-Id': String(pid) } : {};
export const onboardingAPI = {
  snapshot:    pid => api.get('/api/seller/onboarding/', { headers: ph(pid) }),
  flags:       pid => api.get('/api/seller/onboarding/flags/', { headers: ph(pid) }),
  getStudio:   pid => api.get('/api/seller/onboarding/studio/', { headers: ph(pid) }),
  putStudio:   (pid,d) => api.put('/api/seller/onboarding/studio/', d, { headers: ph(pid) }),
  patchStudio: (pid,d) => api.patch('/api/seller/onboarding/studio/', d, { headers: ph(pid) }),
  addContact:  (pid,d) => api.post('/api/seller/onboarding/studio/contacts/', d, { headers: ph(pid) }),
  delContact:  (pid,id) => api.delete(`/api/seller/onboarding/studio/contacts/${id}/`, { headers: ph(pid) }),
  putUSPs:     (pid,d) => api.put('/api/seller/onboarding/studio/usps/', d, { headers: ph(pid) }),
  uploadMedia:      (pid,f) => api.post('/api/seller/onboarding/studio/media/', f, { headers: ph(pid) }),
  delMedia:         (pid,id) => api.delete(`/api/seller/onboarding/studio/media/${id}/`, { headers: ph(pid) }),
  uploadStudioMedia:(pid,f) => api.post('/api/seller/onboarding/studio/media/', f, { headers: ph(pid) }),
  delStudioMedia:   (pid,id) => api.delete(`/api/seller/onboarding/studio/media/${id}/`, { headers: ph(pid) }),
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
};

export const adminAPI = {
  listSellers:   () => api.get('/api/admin/sellers/'),
  createSeller:  d => api.post('/api/admin/sellers/', d),
  listProfiles:  () => api.get('/api/admin/seller-profiles/'),
  getOnboarding: pid => api.get(`/api/admin/seller-profiles/${pid}/onboarding/`),
  flagField:     (pid,d) => api.post(`/api/admin/seller-profiles/${pid}/flag/`, d),
  editSection:   (pid, section, d) => api.patch(`/api/admin/seller-profiles/${pid}/edit/${section}/`, d),
};

import axios from 'axios';
const BASE = import.meta.env.VITE_API_URL || 'https://api.qala.studio';

// Bug fix (Aug 2026): the backend's custom_exception_handler (core/utils.py)
// had a bug where every field-validation error — from EVERY endpoint in the
// app, this handler is global — came back as Python's raw dict repr instead
// of a clean structured error: "{'years_in_operation': [ErrorDetail(string=
// 'A valid number is required.', code='invalid')], ...}" dumped straight into
// a toast. Now fixed at the source to return { status, message, code,
// details: { field: ['message', ...] } } for a field-validation error, or
// { status, message, code } (no details) for a plain detail-message error
// (permission denials, throttling, etc).
//
// Several places across the app had already started hand-extracting a
// specific field's message (e.g. err.response?.data?.image?.[0]) assuming a
// FLAT shape that never actually matched what the backend returns even
// before this fix (it was wrapped in the same broken envelope) — this single
// helper is the one correct way to pull a readable message out of any error
// this app can receive, used consistently instead of repeating the same
// extraction logic (correctly or not) in every catch block.
export function extractErrorMessage(err, fallback = 'Something went wrong — please try again.') {
  const data = err?.response?.data;
  if (!data) return fallback;
  if (data.details && typeof data.details === 'object') {
    const parts = Object.entries(data.details).flatMap(([field, msgs]) => {
      const text = Array.isArray(msgs) ? msgs.join(' ') : String(msgs);
      if (!text) return [];
      const label = field.replace(/_/g, ' ');
      return [field === 'non_field_errors' ? text : `${label}: ${text}`];
    });
    if (parts.length) return parts.join(' · ');
  }
  // Some views return { error: '...' } directly via Response(...) rather
  // than raising a DRF exception — that bypasses custom_exception_handler
  // entirely (it only processes raised exceptions), so this shape never
  // gets the { message, details } treatment above. A real, separate
  // pattern used throughout seller_profile/views.py, not a bug — this
  // just needs to be read on its own terms.
  if (typeof data.error === 'string' && data.error) return data.error;
  if (typeof data.message === 'string' && data.message && data.message !== 'Validation error') {
    return data.message;
  }
  return fallback;
}

/* ════════════════════════════════════════════════════════════════════════════
   Auth token transport — HEADER-BASED (st-auth-mode: header)
   ────────────────────────────────────────────────────────────────────────────
   SuperTokens sessions are carried in headers, not cookies:
     • login / refresh return the access + refresh tokens in the
       `st-access-token` / `st-refresh-token` response headers,
     • both are held in localStorage,
     • requests send the access token as `Authorization: Bearer <token>`,
     • refresh sends the refresh token as `Authorization: Bearer <token>`.
   Nothing depends on cookies, so this behaves identically same-origin and
   cross-origin (localhost dev and the qala.studio → api.qala.studio split in
   production), avoiding the SameSite / cookie-vs-Bearer drift that expired
   sessions mid-session. The buyer "access_key" flow is a separate Django-signed
   token and is deliberately left untouched by the refresh machinery below.
   ════════════════════════════════════════════════════════════════════════════ */
const ACCESS_KEY  = 'qala_token';          // access token (or access-key token)
const REFRESH_KEY = 'qala_refresh_token';  // SuperTokens refresh token
const TYPE_KEY    = 'qala_token_type';      // 'session' | 'access_key'

export const authTokens = {
  access:      () => localStorage.getItem(ACCESS_KEY),
  refresh:     () => localStorage.getItem(REFRESH_KEY),
  isAccessKey: () => localStorage.getItem(TYPE_KEY) === 'access_key',

  // Persist rotated tokens SuperTokens returns on a response. Never touches
  // access-key sessions (those aren't SuperTokens tokens and don't rotate).
  capture(headers) {
    if (this.isAccessKey()) return;
    const at = headers?.['st-access-token'];
    const rt = headers?.['st-refresh-token'];
    if (at) localStorage.setItem(ACCESS_KEY, at);
    if (rt) localStorage.setItem(REFRESH_KEY, rt);
  },

  // Store a fresh SuperTokens session (login / refresh). No-op without an access
  // token, so a failed login response can't leave a half-written session.
  setSession(accessToken, refreshToken) {
    if (!accessToken) return;
    localStorage.setItem(ACCESS_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
    localStorage.setItem(TYPE_KEY, 'session');
  },

  // Persist an access-key session (buyer auto-created/logged-in from the
  // Qalawati chat flow — see discovery/chat_views.py::ChatContactView).
  // Distinct from setSession(): this is a signed access-key token, not a
  // SuperTokens session, so it's flagged with TYPE_KEY = 'access_key' and
  // sent as `Authorization: AccessKey <token>` (see request interceptor
  // below), matching core.authentication.AccessKeyAuthentication.
  setAccessKeySession(token) {
    if (!token) return;
    localStorage.setItem(ACCESS_KEY, token);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.setItem(TYPE_KEY, 'access_key');
  },

  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(TYPE_KEY);
  },
};

// Header-based auth needs no cookies. Not sending them also prevents a stale
// session cookie from being validated ahead of the Bearer token.
const api = axios.create({ baseURL: BASE, withCredentials: false });

// ── Request interceptor: attach token + transfer-mode headers ──
api.interceptors.request.use(cfg => {
  const token = authTokens.access();
  if (token) {
    cfg.headers.authorization = authTokens.isAccessKey()
      ? `AccessKey ${token}`
      : `Bearer ${token}`;
  }
  cfg.headers['rid'] = cfg.headers['rid'] || 'session';
  cfg.headers['st-auth-mode'] = 'header';
  return cfg;
});

// ── Single-flight refresh: one refresh at a time; queued retries wait for it ──
let isRefreshing = false;
let refreshQueue = [];
function flushQueue(token, error) {
  refreshQueue.forEach(cb => cb(token, error));
  refreshQueue = [];
}

function forceLogin() {
  authTokens.clear();
  if (!window.location.pathname.startsWith('/login')) {
    window.location.href = '/login?reason=session_expired';
  }
}

// ── Response interceptor: capture rotated tokens + refresh once on 401 ──
api.interceptors.response.use(
  res => { authTokens.capture(res.headers); return res; },
  async err => {
    const originalRequest = err.config;
    if (err.response?.status !== 401 || !originalRequest || originalRequest._retry) {
      return Promise.reject(err);
    }
    originalRequest._retry = true;

    // Access-key sessions can't be refreshed — go straight to login.
    if (authTokens.isAccessKey()) {
      forceLogin();
      return Promise.reject(err);
    }

    // A refresh is already running — wait for it, then retry with the new token.
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push((token, qErr) => {
          if (qErr || !token) return reject(qErr || err);
          originalRequest.headers.authorization = `Bearer ${token}`;
          resolve(api.request(originalRequest));
        });
      });
    }

    const refreshToken = authTokens.refresh();
    if (!refreshToken) {
      // No refresh token (e.g. a legacy cookie-based session) — needs one re-login.
      forceLogin();
      return Promise.reject(err);
    }

    isRefreshing = true;
    try {
      // Header-mode refresh: the refresh token travels as a Bearer token, so the
      // call succeeds cross-origin without any cookie.
      const res = await axios.post(`${BASE}/auth/session/refresh`, {}, {
        headers: {
          'rid': 'session',
          'st-auth-mode': 'header',
          'authorization': `Bearer ${refreshToken}`,
        },
      });
      const newAccess  = res.headers['st-access-token'];
      const newRefresh = res.headers['st-refresh-token'];
      if (!newAccess) throw new Error('Refresh succeeded but returned no access token');
      authTokens.setSession(newAccess, newRefresh || refreshToken);
      flushQueue(newAccess, null);
      originalRequest.headers.authorization = `Bearer ${newAccess}`;
      return api.request(originalRequest);
    } catch (refreshErr) {
      flushQueue(null, refreshErr);
      forceLogin();
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  },
);

export const authAPI = {
  signin: (email, password) => {
    const p = axios.post(`${BASE}/auth/signin`,
      { formFields: [{ id:'email', value:email }, { id:'password', value:password }] },
      { headers: { 'Content-Type':'application/json', 'rid':'emailpassword', 'st-auth-mode':'header' } },
    );
    p.then(r => authTokens.setSession(r.headers['st-access-token'], r.headers['st-refresh-token'])).catch(() => {});
    return p;
  },
  signup: (email, password) => {
    const p = axios.post(`${BASE}/auth/signup`,
      { formFields: [{ id:'email', value:email }, { id:'password', value:password }] },
      { headers: { 'Content-Type':'application/json', 'rid':'emailpassword', 'st-auth-mode':'header' } },
    );
    p.then(r => authTokens.setSession(r.headers['st-access-token'], r.headers['st-refresh-token'])).catch(() => {});
    return p;
  },
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
  getDyes:     pid => api.get('/api/seller/onboarding/dyes/', { headers: ph(pid) }),
  putDyes:     (pid,d) => api.put('/api/seller/onboarding/dyes/', d, { headers: ph(pid) }),
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
  getCoordinator: pid => api.get('/api/seller/onboarding/collab/coordinator/', { headers: ph(pid) }),
  putCoordinator: (pid,d) => api.put('/api/seller/onboarding/collab/coordinator/', d, { headers: ph(pid) }),
  getProduction:pid => api.get('/api/seller/onboarding/production/', { headers: ph(pid) }),
  putProduction:(pid,d) => api.put('/api/seller/onboarding/production/', d, { headers: ph(pid) }),
  putMOQ:      (pid,d) => api.put('/api/seller/onboarding/production/moq/', d, { headers: ph(pid) }),
  getProcess:  pid => api.get('/api/seller/onboarding/process/', { headers: ph(pid) }),
  putProcess:  (pid,d) => api.put('/api/seller/onboarding/process/', d, { headers: ph(pid) }),
  uploadBTS:   (pid,f) => api.post('/api/seller/onboarding/process/media/', f, { headers: ph(pid) }),
  delBTS:      (pid,id) => api.delete(`/api/seller/onboarding/process/media/${id}/`, { headers: ph(pid) }),
  getProjects:        pid => api.get('/api/seller/onboarding/projects/', { headers: ph(pid) }),
  addProject:         (pid,d) => api.post('/api/seller/onboarding/projects/', d, { headers: ph(pid) }),
  patchProject:       (pid,id,d) => api.patch(`/api/seller/onboarding/projects/${id}/`, d, { headers: ph(pid) }),
  delProject:         (pid,id) => api.delete(`/api/seller/onboarding/projects/${id}/`, { headers: ph(pid) }),
  uploadProjectPhoto: (pid,projectId,f) => api.post(`/api/seller/onboarding/projects/${projectId}/photos/`, f, { headers: ph(pid) }),
  delProjectPhoto:    (pid,projectId,photoId) => api.delete(`/api/seller/onboarding/projects/${projectId}/photos/${photoId}/`, { headers: ph(pid) }),

  // ── Section G (v6) — product library + collections ──
  getStudioProducts:  pid => api.get('/api/seller/onboarding/product-library/', { headers: ph(pid) }),
  addStudioProduct:   (pid,d) => api.post('/api/seller/onboarding/product-library/', d, { headers: ph(pid) }),
  patchStudioProduct: (pid,id,d) => api.patch(`/api/seller/onboarding/product-library/${id}/`, d, { headers: ph(pid) }),
  delStudioProduct:   (pid,id) => api.delete(`/api/seller/onboarding/product-library/${id}/`, { headers: ph(pid) }),
  uploadProductPhoto: (pid,productId,f) => api.post(`/api/seller/onboarding/product-library/${productId}/photos/`, f, { headers: ph(pid) }),
  delProductPhoto:    (pid,productId,photoId) => api.delete(`/api/seller/onboarding/product-library/${productId}/photos/${photoId}/`, { headers: ph(pid) }),
  bulkImportProducts: (pid,f) => api.post('/api/seller/onboarding/product-library/bulk-import/', f, { headers: ph(pid) }),
  bulkDeleteProducts: (pid,body) => api.post('/api/seller/onboarding/product-library/bulk-delete/', body, { headers: ph(pid) }),
  getImageImportJob:  (pid,jid) => api.get(jid ? `/api/seller/onboarding/product-library/image-jobs/${jid}/` : '/api/seller/onboarding/product-library/image-jobs/', { headers: ph(pid) }),
  retryImageImport:   (pid) => api.post('/api/seller/onboarding/product-library/image-jobs/', {}, { headers: ph(pid) }),
  downloadProductTemplate: pid => api.get('/api/seller/onboarding/product-library/import-template/', { headers: ph(pid), responseType: 'blob' }),
  getCollections:     pid => api.get('/api/seller/onboarding/collections/', { headers: ph(pid) }),
  addCollection:      (pid,d) => api.post('/api/seller/onboarding/collections/', d, { headers: ph(pid) }),
  patchCollection:    (pid,id,d) => api.patch(`/api/seller/onboarding/collections/${id}/`, d, { headers: ph(pid) }),
  delCollection:      (pid,id) => api.delete(`/api/seller/onboarding/collections/${id}/`, { headers: ph(pid) }),
  getStudioInquiries: pid => api.get('/api/seller/studio-inquiries/', { headers: ph(pid) }),
  getSellerCollections: pid => api.get('/api/seller/onboarding/collections/', { headers: ph(pid) }),
};

export const adminAPI = {
  listSellers:   () => api.get('/api/admin/sellers/'),
  createSeller:  d => api.post('/api/admin/sellers/', d),
  listProfiles:  () => api.get('/api/admin/seller-profiles/'),
  getOnboarding: pid => api.get(`/api/admin/seller-profiles/${pid}/onboarding/`),
  flagField:     (pid,d) => api.post(`/api/admin/seller-profiles/${pid}/flag/`, d),
  toggleVerified: pid   => api.post(`/api/admin/seller-profiles/${pid}/toggle-verified/`),
  togglePublish:  (pid, d) => api.post(`/api/admin/seller-profiles/${pid}/toggle-publish/`, d),
  getVisibilityOverrides: pid => api.get(`/api/admin/seller-profiles/${pid}/visibility-overrides/`),
  deleteStudioMedia: (pid, mediaId) => api.delete(`/api/admin/seller-profiles/${pid}/studio-media/${mediaId}/`),
  deleteBTSMedia:    (pid, mediaId) => api.delete(`/api/admin/seller-profiles/${pid}/bts-media/${mediaId}/`),
  editSection:   (pid, section, d) => api.patch(`/api/admin/seller-profiles/${pid}/edit/${section}/`, d),
  getDiscoveryBuyers:       (params)      => api.get('/api/admin/discovery/buyers/', { params }),
  getDiscoveryBuyer:        id => api.get(`/api/admin/discovery/buyers/${id}/`),
  getDiscoveryInquiries:    () => api.get('/api/admin/discovery/inquiries/'),
  getAdminStudioInquiries:  () => api.get('/api/admin/discovery/studio-inquiries/'),
  convertInquiryToProject: id => api.post(`/api/admin/discovery/studio-inquiries/${id}/convert-to-project/`),
  listAccessKeys:    ()  => api.get('/api/admin/chat/access-keys/'),
  generateAccessKeys: d  => api.post('/api/admin/chat/access-keys/', d),
  updateAccessKey:   (id, d) => api.patch(`/api/admin/chat/access-keys/${id}/`, d),
  listContacts: () => api.get('/api/admin/chat/contacts/'),
  listAccessRequests:       ()       => api.get('/api/admin/access-requests/'),
  updateAccessRequest: (id, data)    => api.patch(`/api/admin/access-requests/${id}/`, data),
  approveAndGenerateKey: id          => api.post(`/api/admin/access-requests/${id}/generate-key/`),
};

export const buyerAPI = {
  getSessions: () => api.get('/api/buyer/sessions/'),
  getProfile:  () => api.get('/api/me/customer/'),
  updateProfile: d => api.patch('/api/me/customer/', d),
};

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

  // Legacy — lookup by numeric profile ID (keep for existing recommendation/directory links)
  getStudioProfile: profileId =>
    axios.get(`${BASE}/api/discovery/studios/${profileId}/`),

  // v3 — lookup by slug for /:studioSlug routes
  getStudioProfileBySlug: slug =>
    axios.get(`${BASE}/api/discovery/studios/by-slug/${slug}/`),

  studioInquiry: (profileId, data, file = null) => {
    if (file) {
      const fd = new FormData();
      fd.append('name',          data.name);
      fd.append('email',         data.email);
      fd.append('answers',       JSON.stringify(data.answers || []));
      if (data.session_token) fd.append('session_token', data.session_token);
      fd.append('attachment',    file);
      return axios.post(`${BASE}/api/discovery/studios/${profileId}/inquire/`, fd);
    }
    return axios.post(`${BASE}/api/discovery/studios/${profileId}/inquire/`, data, {
      headers: { 'Content-Type': 'application/json' },
    });
  },

  getStudioDirectory: ({ craft = '', fabric = '', productType = '' } = {}) => {
    const params = {};
    if (craft)       params.craft        = craft;
    if (fabric)      params.fabric       = fabric;
    if (productType) params.product_type = productType;
    return axios.get(`${BASE}/api/studios/directory/`, { params });
  },
};

export const chatAPI = {
  start: (accessKey = null) =>
    api.post('/api/discovery/chat/start/',
      accessKey ? { access_key: accessKey } : {}
    ),

  sendMessage: (sessionId, message, images = null, selectedImageIds = null) =>
    axios.post(`${BASE}/api/discovery/chat/message/`,
      {
        session_id: sessionId,
        message,
        ...(images?.length    && { images }),
        ...(selectedImageIds  && { selected_image_ids: selectedImageIds }),
      },
      { headers: { 'Content-Type': 'application/json' } }
    ),

  getSession: (sessionId) =>
    axios.get(`${BASE}/api/discovery/chat/session/`, {
      params: { session_id: sessionId },
    }),

  match: (sessionId) =>
    axios.post(`${BASE}/api/discovery/chat/match/`,
      { session_id: sessionId },
      { headers: { 'Content-Type': 'application/json' } }
    ),

  saveContact: (sessionId, data) =>
    axios.post(`${BASE}/api/discovery/chat/contact/`,
      { session_id: sessionId, ...data },
      { headers: { 'Content-Type': 'application/json' } }
    ),

  requestAccess: data =>
    axios.post(`${BASE}/api/discovery/access-request/`, data,
      { headers: { 'Content-Type': 'application/json' } }
    ),

  getIntroduced: (sessionId, sellerProfileId, contact = {}) =>
    api.post('/api/discovery/get-introduced/',
      {
        session_id:        sessionId,
        seller_profile_id: sellerProfileId,
        access_key_code:   localStorage.getItem('qala_access_key') || '',
        name:  contact.name  || '',
        email: contact.email || '',
        phone: contact.phone || '',
      }
    ),
};

export const projectsAPI = {
  // ── Buyer ──────────────────────────────────────────────────────────────────
  listProjects:          ()              => api.get('/api/buyer/projects/'),
  createProject:         data            => api.post('/api/buyer/projects/', data),
  getProject:            id              => api.get(`/api/buyer/projects/${id}/`),
  updateProject:         (id, data)      => api.patch(`/api/buyer/projects/${id}/`, data),
  getBrief:              id              => api.get(`/api/buyer/projects/${id}/brief/`),
  updateBrief:           (id, data)      => api.patch(`/api/buyer/projects/${id}/brief/`, data),
  uploadMoodboard:       (id, form)      => api.post(`/api/buyer/projects/${id}/brief/moodboards/`, form),
  deleteMoodboard:       (id, mid)       => api.delete(`/api/buyer/projects/${id}/brief/moodboards/${mid}/`),
  submitBrief:           id              => api.post(`/api/buyer/projects/${id}/brief/submit/`),
  getProposals:          id              => api.get(`/api/buyer/projects/${id}/proposals/`),
  acceptProposal:        (id, pid, data) => api.post(`/api/buyer/projects/${id}/proposals/${pid}/accept/`, data),
  actOnProposal:         (id, pid, data) => api.post(`/api/buyer/projects/${id}/proposals/${pid}/action/`, data),
  getOrders:             id              => api.get(`/api/buyer/projects/${id}/orders/`),
  getOrder:              (id, oid)       => api.get(`/api/buyer/projects/${id}/orders/${oid}/`),
  getContracts:          id              => api.get(`/api/buyer/projects/${id}/contracts/`),
  getActivity:           id              => api.get(`/api/buyer/projects/${id}/activity/`),

  // ── Seller ─────────────────────────────────────────────────────────────────
  getEnquiries:          ()              => api.get('/api/seller/projects/enquiries/'),
  getEnquiry:            id              => api.get(`/api/seller/projects/enquiries/${id}/`),
  getActiveProjects:     ()              => api.get('/api/seller/projects/active/'),
  createProposal:        (id, data)      => api.post(`/api/seller/projects/${id}/proposals/`, data),
  updateProposal:        (id, pid, data) => api.patch(`/api/seller/projects/${id}/proposals/${pid}/`, data),
  updateProposalJSON:    (id, pid, data) => api.patch(`/api/seller/projects/${id}/proposals/${pid}/`, data, { headers: { 'Content-Type': 'application/json' } }),
  submitProposal:        (id, pid)       => api.post(`/api/seller/projects/${id}/proposals/${pid}/submit/`),
  respondToEnquiry:      (id, data)      => api.post(`/api/seller/projects/enquiries/${id}/respond/`, data),
  getEnquiryMessages:    id              => api.get(`/api/seller/projects/enquiries/${id}/messages/`),
  sendEnquiryMessage:    (id, data)      => api.post(`/api/seller/projects/enquiries/${id}/messages/`, data),
  getProposalActivity:   (id, pid)       => api.get(`/api/seller/projects/${id}/proposals/${pid}/activity/`),
  dispatchOrder:         (id, oid, data) => api.patch(`/api/seller/projects/${id}/orders/${oid}/dispatch/`, data),
  markOrderStageDone:    (id, oid, data) => api.post(`/api/seller/projects/${id}/orders/${oid}/stage/`, data),
  delayOrder:            (id, oid, data) => api.patch(`/api/seller/projects/${id}/orders/${oid}/delay/`, data),
  schedulePickup:        (id, oid, data) => api.post(`/api/seller/projects/${id}/orders/${oid}/pickup/`, data),

  // ── Admin ──────────────────────────────────────────────────────────────────
  adminListProjects:     (params)        => api.get('/api/admin/projects/', { params }),
  adminCreateProject:    data            => api.post('/api/admin/projects/', data),
  adminGetProject:       id              => api.get(`/api/admin/projects/${id}/`),
  adminUpdateProject:    (id, data)      => api.patch(`/api/admin/projects/${id}/`, data),
  adminDeleteProject:    (id, confirmName) => api.delete(`/api/admin/projects/${id}/`, { data: { confirm_name: confirmName } }),
  adminUpdateBrief:      (id, data)      => api.patch(`/api/admin/projects/${id}/brief/`, data),
  adminUploadMoodboard:  (id, form)      => api.post(`/api/admin/projects/${id}/brief/moodboards/`, form),
  adminDeleteMoodboard:  (id, mid)       => api.delete(`/api/admin/projects/${id}/brief/moodboards/${mid}/`),
  adminGetShareStudios:  id              => api.get(`/api/admin/projects/${id}/share/`),
  adminShareBrief:       (id, data)      => api.post(`/api/admin/projects/${id}/share/`, data),
  adminMatchStudios:     id              => api.get(`/api/admin/projects/${id}/match/`),
  adminGetAssignments:   id              => api.get(`/api/admin/projects/${id}/studio-assignments/`),
  adminAssignStudios:    (id, data)      => api.post(`/api/admin/projects/${id}/studio-assignments/`, data),
  adminUpdateAssignment: (id, aid, data) => api.patch(`/api/admin/projects/${id}/studio-assignments/${aid}/`, data),
  adminGetEnquiryMessages: (id, aid)     => api.get(`/api/admin/projects/${id}/studio-assignments/${aid}/messages/`),
  adminSendEnquiryMessage: (id, aid, data) => api.post(`/api/admin/projects/${id}/studio-assignments/${aid}/messages/`, data),
  adminRemoveAssignment: (id, aid)       => api.delete(`/api/admin/projects/${id}/studio-assignments/${aid}/`),
  adminGetProposals:     id              => api.get(`/api/admin/projects/${id}/proposals/`),
  adminUpdateProposal:   (id, pid, data) => api.patch(`/api/admin/projects/${id}/proposals/${pid}/`, data),
  adminSendProposal:     (id, pid)       => api.post(`/api/admin/projects/${id}/proposals/${pid}/send-to-buyer/`),
  adminGetMilestones:    (id, pid)       => api.get(`/api/admin/projects/${id}/proposals/${pid}/milestones/`),
  adminCreateMilestone:  (id, pid, data) => api.post(`/api/admin/projects/${id}/proposals/${pid}/milestones/`, data),
  adminUpdateMilestone:  (id, pid, mid, data) => api.patch(`/api/admin/projects/${id}/proposals/${pid}/milestones/${mid}/`, data),
  adminDeleteMilestone:  (id, pid, mid) => api.delete(`/api/admin/projects/${id}/proposals/${pid}/milestones/${mid}/`),
  adminMarkMilestonePaid: (id, pid, mid) => api.post(`/api/admin/projects/${id}/proposals/${pid}/milestones/${mid}/mark-paid/`),
  adminGetProposalActivity: (id, pid)    => api.get(`/api/admin/projects/${id}/proposals/${pid}/activity/`),
  adminCreateOrder:      (id, data)      => api.post(`/api/admin/projects/${id}/orders/`, data),
  adminUpdateOrder:      (id, oid, data) => api.patch(`/api/admin/projects/${id}/orders/${oid}/`, data),
  adminUploadOrderDoc:   (id, oid, form) => api.post(`/api/admin/projects/${id}/orders/${oid}/documents/`, form),
  adminUploadContract:   (id, form)      => api.post(`/api/admin/projects/${id}/contracts/`, form),
  adminGetOrders:        (params)        => api.get('/api/admin/orders/', { params }),
  adminGetCustomers:     (params)        => api.get('/api/admin/customers/', { params }),
  adminRequestRevision:  (id, pid, data) => api.post(`/api/admin/projects/${id}/proposals/${pid}/request-revision/`, data),
};

export const walletAPI = {
  getBuyerWallet:  () => api.get('/api/buyer/wallet/'),
  getSellerWallet: () => api.get('/api/seller/wallet/'),
};

export const adminLibraryAPI = {
  getStats: () =>
    api.get('/api/admin/library/stats/'),

  listEntries: ({ category = '', search = '', page = 1, page_size = 50 } = {}) => {
    const params = { page, page_size };
    if (category) params.category = category;
    if (search)   params.search   = search;
    return api.get('/api/admin/library/', { params });
  },

  getEntry: (id) =>
    api.get(`/api/admin/library/${id}/`),

  deleteEntry: (id) =>
    api.delete(`/api/admin/library/${id}/`),

  uploadExcel: (formData) =>
    api.post('/api/admin/library/upload-excel/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  uploadImages: (formData) =>
    api.post('/api/admin/library/upload-images/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};
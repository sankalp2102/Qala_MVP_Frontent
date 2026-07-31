// src/api/parityClient.js
//
// publicAPI — the no-login proposal link (spec §7 / Phase 3).
//
// Kept in its own file, using its own bare axios instance with NO auth
// interceptor, on purpose: it must never attach a Bearer token, since the
// whole point of the public link is that it works with zero session.
// Mixing this into the main `api` instance in client.js risks a future
// edit accidentally wiring auth into it.
//
// walletAPI (buyer + seller payment history, Phase 4) is NOT here — it
// needs auth like everything else, so per the guide doc it's added as a
// small block directly inside the existing api/client.js instead of
// spinning up a second authenticated instance here.

import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || 'https://api.qala.studio';

// Bare instance — no request/response interceptors, no stored token ever
// attached. This is the whole point of the public link.
const publicClient = axios.create({ baseURL: BASE, withCredentials: false });

export const publicAPI = {
  getProposal:    token         => publicClient.get(`/api/public/proposals/${token}/`),
  acceptProposal: (token, data) => publicClient.post(`/api/public/proposals/${token}/accept/`, data || {}),
  actOnProposal:  (token, data) => publicClient.post(`/api/public/proposals/${token}/action/`, data),
};
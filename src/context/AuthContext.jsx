import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, discoveryAPI } from '../api/client';

const SESSION_KEY = 'qala_session_token';

// After a customer logs in, silently link any in-progress anonymous session
async function _tryLinkSession() {
  const token = localStorage.getItem(SESSION_KEY);
  if (!token) return;
  try { await discoveryAPI.linkSession(token); } catch { /* non-fatal */ }
}

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only try to restore session if there's evidence of a prior login.
    // Without a token, the user is anonymous — skip the me() call entirely.
    const token = localStorage.getItem('qala_token');
    if (!token) {
      setLoading(false);
      return;
    }
    authAPI.me()
      .then(r => setUser(r.data))
      .catch(() => {
        // Refresh also failed (interceptor already tried) — session is truly dead
        localStorage.removeItem('qala_token');
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const r = await authAPI.signin(email, password);
    if (r.data.status !== 'OK') throw new Error(r.data.formFields?.[0]?.error || 'Login failed');
    // Token is captured by client.js interceptor on the signin response
    const me = await authAPI.me();
    setUser(me.data);
    // If customer, silently link any anonymous discovery session
    if (me.data?.role === 'customer') {
      _tryLinkSession();
    }
    return me.data;
  };

  // Log in via a Django-signed access-key token (no SuperTokens session).
  // Called by DiscoverV2 after a valid access key is accepted by the backend.
  const loginWithAccessKey = (token, userData) => {
    localStorage.setItem('qala_token', token);
    // Store token type so the interceptor sends the right Authorization header
    localStorage.setItem('qala_token_type', 'access_key');
    setUser(userData);
  };

  const logout = async () => {
    const tokenType = localStorage.getItem('qala_token_type');
    // Only call SuperTokens signout if this was a SuperTokens session
    if (tokenType !== 'access_key') {
      try { await authAPI.signout(); } catch {}
    }
    localStorage.removeItem('qala_token');
    localStorage.removeItem('qala_token_type');
    setUser(null);
  };

  return (
    <Ctx.Provider value={{ user, setUser, login, loginWithAccessKey, logout, loading }}>
      {children}
    </Ctx.Provider>
  );
}
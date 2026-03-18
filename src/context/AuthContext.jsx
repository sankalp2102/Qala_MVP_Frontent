import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../api/client';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try to restore session — either from Bearer token or cookies.
    // The interceptor in client.js handles 401 → refresh automatically,
    // so me() will succeed if there's a valid refresh token (even if
    // the access token is expired or missing from localStorage).
    authAPI.me()
      .then(r => setUser(r.data))
      .catch(() => {
        // Only clear if refresh also failed (interceptor already tried)
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
    return me.data;
  };

  const logout = async () => {
    try { await authAPI.signout(); } catch {}
    localStorage.removeItem('qala_token');
    setUser(null);
  };

  return <Ctx.Provider value={{ user, setUser, login, logout, loading }}>{children}</Ctx.Provider>;
}

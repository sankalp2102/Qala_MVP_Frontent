import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../api/client';

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
    return me.data;
  };

  const logout = async () => {
    try { await authAPI.signout(); } catch {}
    localStorage.removeItem('qala_token');
    setUser(null);
  };

  return <Ctx.Provider value={{ user, setUser, login, logout, loading }}>{children}</Ctx.Provider>;
}

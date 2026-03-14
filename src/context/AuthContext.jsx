import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../api/client';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('qala_token');
    if (token) {
      authAPI.me().then(r => setUser(r.data)).catch(() => localStorage.clear()).finally(() => setLoading(false));
    } else setLoading(false);
  }, []);

  const login = async (email, password) => {
    const r = await authAPI.signin(email, password);
    if (r.data.status !== 'OK') throw new Error(r.data.formFields?.[0]?.error || 'Login failed');
    const token = r.headers['st-access-token'];
    if (token) localStorage.setItem('qala_token', token);
    const me = await authAPI.me();
    setUser(me.data);
    return me.data;
  };

  const logout = async () => {
    try { await authAPI.signout(); } catch {}
    localStorage.clear();
    setUser(null);
  };

  return <Ctx.Provider value={{ user, setUser, login, logout, loading }}>{children}</Ctx.Provider>;
}

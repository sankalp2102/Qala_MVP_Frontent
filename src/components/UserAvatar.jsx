import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function roleHome(role) {
  if (role === 'admin')    return '/admin';
  if (role === 'seller')   return '/dashboard';
  if (role === 'customer') return '/buyer';
  return '/';
}

function getInitial(user) {
  if (!user) return '?';
  const name = user.profile?.full_name || user.profile?.business_name || '';
  if (name.trim()) return name.trim()[0].toUpperCase();
  return user.email?.[0]?.toUpperCase() || '?';
}

export default function UserAvatar({ loginStyle = {}, hideWhenLoggedOut = false }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = e => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    nav('/');
  };

  // Not logged in
  if (!user) {
    if (hideWhenLoggedOut) return null;
    return (
      <button
        onClick={() => nav('/login')}
        style={{
          fontSize: 12, color: 'var(--text3)', letterSpacing: '0.08em',
          textTransform: 'uppercase', cursor: 'pointer', fontWeight: 500,
          border: '1px solid var(--border)', borderRadius: 6, padding: '6px 14px',
          background: 'none', transition: 'color 0.2s, border-color 0.2s',
          fontFamily: 'var(--font-body)',
          ...loginStyle,
        }}
        className="login-link"
      >
        Sign In / Sign Up
      </button>
    );
  }

  const initial = getInitial(user);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Avatar circle */}
      <button
        onClick={() => setOpen(o => !o)}
        title={user.email}
        style={{
          width: 34, height: 34, borderRadius: '50%',
          background: open ? 'var(--gold-d)' : 'var(--gold)',
          color: '#fff',
          border: 'none', cursor: 'pointer',
          fontFamily: 'var(--font-display)',
          fontSize: 15, fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.18s, transform 0.15s',
          transform: open ? 'scale(0.95)' : 'scale(1)',
          flexShrink: 0,
          letterSpacing: 0,
        }}
      >
        {initial}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          boxShadow: '0 8px 32px rgba(26,22,18,0.13)',
          minWidth: 180,
          zIndex: 9999,
          overflow: 'hidden',
          animation: 'avatarDrop 0.15s ease',
        }}>
          <style>{`
            @keyframes avatarDrop {
              from { opacity: 0; transform: translateY(-6px); }
              to   { opacity: 1; transform: translateY(0); }
            }
            .avatar-item:hover { background: var(--surface2) !important; color: var(--gold) !important; }
          `}</style>

          {/* Email label */}
          <div style={{
            padding: '11px 16px 9px',
            borderBottom: '1px solid var(--border)',
            fontSize: 11, color: 'var(--text4)',
            letterSpacing: '0.04em',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {user.email}
          </div>

          {/* Dashboard */}
          <button
            className="avatar-item"
            onClick={() => { setOpen(false); nav(roleHome(user.role)); }}
            style={{
              width: '100%', textAlign: 'left', padding: '11px 16px',
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13.5, fontWeight: 500, color: 'var(--text)',
              fontFamily: 'var(--font-body)',
              display: 'flex', alignItems: 'center', gap: 10,
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            <span style={{ fontSize: 15 }}>⊞</span> Dashboard
          </button>

          {/* Divider */}
          <div style={{ height: 1, background: 'var(--border)', margin: '0 12px' }} />

          {/* Sign out */}
          <button
            className="avatar-item"
            onClick={handleLogout}
            style={{
              width: '100%', textAlign: 'left', padding: '11px 16px',
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13.5, color: 'var(--text2)',
              fontFamily: 'var(--font-body)',
              display: 'flex', alignItems: 'center', gap: 10,
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            <span style={{ fontSize: 15 }}>→</span> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
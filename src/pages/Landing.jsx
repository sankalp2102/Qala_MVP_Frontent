import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect } from 'react';

export default function Landing() {
  const nav = useNavigate();
  const { user } = useAuth();
  useEffect(() => { if (user) nav(user.role === 'admin' ? '/admin' : '/dashboard'); }, [user]);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#000',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 24,
    }}>
      

      {/* Wordmark */}
      <h1 style={{
        fontFamily: 'var(--font-display)',
        fontSize: 48, fontWeight: 700,
        color: '#fff', letterSpacing: '0.12em',
        margin: 0,
      }}>QALA</h1>

      {/* Enter link — minimal */}
      <button
        onClick={() => nav('/login')}
        style={{
          marginTop: 16,
          background: 'none', border: '1px solid #333',
          color: '#606060', padding: '10px 28px',
          borderRadius: 8, fontSize: 13, cursor: 'pointer',
          fontFamily: 'var(--font-body)', letterSpacing: '0.06em',
          transition: 'border-color .2s, color .2s',
        }}
        onMouseEnter={e => { e.target.style.borderColor = '#fff'; e.target.style.color = '#fff'; }}
        onMouseLeave={e => { e.target.style.borderColor = '#333'; e.target.style.color = '#606060'; }}
      >
        Enter
      </button>
    </div>
  );
}

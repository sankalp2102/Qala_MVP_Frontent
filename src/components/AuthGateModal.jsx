import { useState } from 'react';
import { authAPI, discoveryAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import qalaLogo from '../assets/qala-logo.png';

export default function AuthGateModal({ onClose, onSuccess, studioName }) {
  const [tab, setTab]   = useState('signup');
  const [email, setEmail] = useState('');
  const [pass,  setPass]  = useState('');
  const [err,   setErr]   = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const submit = async e => {
    e.preventDefault();
    setErr(''); setLoading(true);
    try {
      if (tab === 'signup') {
        const r = await authAPI.signup(email, pass);
        if (r.data.status !== 'OK') {
          setErr(r.data.formFields?.[0]?.error || 'Signup failed'); return;
        }
      }
      await login(email, pass);

      // Link the anonymous session to this user
      const tok = discoveryAPI.getStoredSession();
      if (tok) {
        try { await discoveryAPI.linkSession(tok); } catch {}
      }
      onSuccess?.();
    } catch(e) {
      setErr(e.response?.data?.formFields?.[0]?.error || e.message || 'Something went wrong');
    } finally { setLoading(false); }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(159,101,71,0.4)',
          backdropFilter: 'blur(4px)', zIndex: 1000,
          animation: 'fadeIn 0.2s ease',
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '100%', maxWidth: 440,
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 20, padding: '36px',
        zIndex: 1001, animation: 'modalIn 0.25s ease',
      }}>
        <style>{`
          @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
          @keyframes modalIn { from{opacity:0;transform:translate(-50%,-48%)} to{opacity:1;transform:translate(-50%,-50%)} }
        `}</style>

        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 16, right: 16,
            background: 'none', border: '1px solid var(--border)',
            color: 'var(--text3)', width: 30, height: 30,
            borderRadius: '50%', cursor: 'pointer', fontSize: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-body)',
          }}
        >×</button>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <img src={qalaLogo} alt="Qala" className="qala-logo" style={{ marginBottom: 16 }} />
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
            Save your matches
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.6 }}>
            {studioName
              ? `Create a free account to connect with ${studioName} and keep your recommendations saved.`
              : 'Create a free account to save your studio matches and get a call-back.'}
          </p>
        </div>

        {/* Tab switcher */}
        <div style={{
          display: 'flex', background: 'var(--surface2)',
          borderRadius: 8, padding: 3, marginBottom: 24,
          border: '1px solid var(--border)',
        }}>
          {[['signup','Create Account'],['signin','Sign In']].map(([k,l]) => (
            <button key={k} onClick={() => { setTab(k); setErr(''); }}
              style={{
                flex: 1, padding: '8px', borderRadius: 6,
                border: 'none', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.15s',
                background: tab === k ? 'var(--surface4)' : 'transparent',
                color: tab === k ? 'var(--text)' : 'var(--text3)',
                fontFamily: 'var(--font-body)',
              }}
            >{l}</button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="field">
            <label>Email</label>
            <input type="email" placeholder="you@example.com"
              value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" placeholder="••••••••"
              value={pass} onChange={e => setPass(e.target.value)} required />
            {tab === 'signup' && <span className="hint">Min 8 chars · 1 number · 1 uppercase</span>}
          </div>

          {err && (
            <div style={{
              background: 'var(--red-dim)', border: '1px solid rgba(255,85,85,0.3)',
              borderLeft: '3px solid var(--red)', borderRadius: 8,
              padding: '10px 14px', fontSize: 13, color: 'var(--red)',
            }}>{err}</div>
          )}

          <button className="btn btn-primary" type="submit" disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: 4 }}>
            {loading
              ? <><span className="spinner" style={{ width:16, height:16 }} /> Please wait…</>
              : tab === 'signup' ? 'Create Account & Connect →' : 'Sign In & Connect →'
            }
          </button>
        </form>

        <p style={{ marginTop: 16, textAlign: 'center', fontSize: 12, color: 'var(--text4)', lineHeight: 1.6 }}>
          Your discovery progress is saved automatically.
          No spam — only studio responses.
        </p>
      </div>
    </>
  );
}

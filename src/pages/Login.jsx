import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api/client';
import PasswordInput from '../components/PasswordInput';
import qalaLogo from '../assets/qala-logo.png';

export default function Login() {
  const [tab, setTab]     = useState('signin');
  const [email, setEmail] = useState('');
  const [pass, setPass]   = useState('');
  const sessionExpired = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get('reason') === 'session_expired';
  const [err, setErr]     = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();
  const location = useLocation();

  const submit = async e => {
    e.preventDefault(); setErr(''); setLoading(true);
    try {
      if (tab === 'signin') {
        const user = await login(email, pass);
        const redirect = new URLSearchParams(location.search).get('redirect');
        if (redirect) nav(redirect);
        else if (user.role === 'admin') nav('/admin');
        else if (user.role === 'seller') nav('/dashboard');
        else nav('/buyer');
      } else {
        const r = await authAPI.signup(email, pass);
        if (r.data.status === 'OK') {
          await login(email, pass);
          nav('/buyer');
        } else {
          setErr(r.data.formFields?.[0]?.error || 'Signup failed');
        }
      }
    } catch (e) {
      setErr(e.response?.data?.formFields?.[0]?.error || e.message || 'Something went wrong');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)' }}>
      <div style={{ width:'100%', maxWidth:440, padding:'48px 40px' }} className="fade-up">

        {/* Logo */}
        <Link to="/" style={{ display:'block', marginBottom:40, textDecoration:'none' }}>
          <img src={qalaLogo} alt="Qala" className="qala-logo" />
        </Link>

        {/* heading */}
        <h2 style={{ fontFamily:'var(--font-display)', fontSize:38, fontWeight:700, color:'var(--text)', marginBottom:6 }}>
          {tab === 'signin' ? 'Welcome back' : 'Create account'}
        </h2>
        <p style={{ color:'var(--text3)', fontSize:14, marginBottom:32 }}>
          {tab === 'signin' ? 'Sign in to your Qala account.' : 'Register as a buyer or customer.'}
        </p>

        {/* tab switcher */}
        <div style={{ display:'flex', background:'var(--surface2)', borderRadius:'var(--radius)', padding:3, marginBottom:28, border:'1px solid var(--border)' }}>
          {[['signin','Sign In'],['signup','Sign Up']].map(([k,l]) => (
            <button key={k} onClick={() => { setTab(k); setErr(''); }}
              style={{
                flex:1, padding:'9px', borderRadius:8, border:'none',
                fontSize:13.5, fontWeight:600, cursor:'pointer', transition:'all 0.18s',
                background: tab===k ? 'var(--surface4)' : 'transparent',
                color: tab===k ? 'var(--text)' : 'var(--text3)',
                boxShadow: tab===k ? 'var(--shadow)' : 'none',
                fontFamily:'var(--font-body)',
              }}>
              {l}
            </button>
          ))}
        </div>

        {/* form */}
        <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:18 }}>
          <div className="field">
            <label>Email Address</label>
            <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
          </div>
          <div className="field">
            <label>Password</label>
            <PasswordInput placeholder="••••••••" value={pass} onChange={e => setPass(e.target.value)} required />
            {tab === 'signup' && <span className="hint">Min 8 chars · 1 number · 1 uppercase</span>}
          </div>

          {sessionExpired && !err && (
            <div style={{ background:'rgba(255,170,0,0.08)', border:'1px solid rgba(255,170,0,0.25)', borderLeft:'3px solid #FFAA00', borderRadius:'var(--radius)', padding:'11px 14px', fontSize:13, color:'#996600', marginBottom:4 }}>
              Your session expired. Please sign in again to continue.
            </div>
          )}
          {err && (
            <div style={{ background:'var(--red-dim)', border:'1px solid rgba(224,85,85,0.3)', borderLeft:'3px solid var(--red)', borderRadius:'var(--radius)', padding:'11px 14px', fontSize:13, color:'var(--red)' }}>
              {err}
            </div>
          )}

          <button className="btn btn-primary" type="submit" disabled={loading}
            style={{ width:'100%', justifyContent:'center', padding:'13px', fontSize:15, marginTop:4 }}>
            {loading
              ? <><span className="spinner" style={{ width:18, height:18 }} /> Signing in…</>
              : tab === 'signin' ? 'Sign In →' : 'Create Account →'
            }
          </button>
        </form>

        <div style={{ marginTop:28, textAlign:'center' }}>
          <Link to="/" style={{ fontSize:13, color:'var(--text3)', textDecoration:'none' }}>
            ← Back to home
          </Link>
        </div>

      </div>
    </div>
  );
}

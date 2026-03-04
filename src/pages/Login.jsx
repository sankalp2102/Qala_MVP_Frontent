import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api/client';

export default function Login() {
  const [tab, setTab]     = useState('signin');
  const [email, setEmail] = useState('');
  const [pass, setPass]   = useState('');
  const [err, setErr]     = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();

  const submit = async e => {
    e.preventDefault(); setErr(''); setLoading(true);
    try {
      if (tab === 'signin') {
        const user = await login(email, pass);
        nav(user.role === 'admin' ? '/admin' : '/dashboard');
      } else {
        const r = await authAPI.signup(email, pass);
        if (r.data.status === 'OK') {
          await login(email, pass);
          nav('/dashboard');
        } else {
          setErr(r.data.formFields?.[0]?.error || 'Signup failed');
        }
      }
    } catch (e) {
      setErr(e.response?.data?.formFields?.[0]?.error || e.message || 'Something went wrong');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', display:'grid', gridTemplateColumns:'1fr 1fr' }}>

      {/* LEFT PANEL */}
      <div style={{
        position:'relative', overflow:'hidden',
        background:'linear-gradient(160deg, #0E0C08 0%, #0A0A0B 60%, #0D1210 100%)',
        display:'flex', flexDirection:'column', justifyContent:'space-between',
        padding:'48px 56px',
      }}>
        {/* decorative elements */}
        <div style={{ position:'absolute', top:-100, right:-100, width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle, rgba(200,165,90,0.06) 0%, transparent 70%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:-60, left:-60, width:280, height:280, borderRadius:'50%', background:'radial-gradient(circle, rgba(42,153,133,0.08) 0%, transparent 70%)', pointerEvents:'none' }} />
        {/* gold line top */}
        <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'linear-gradient(90deg, transparent, var(--gold), transparent)' }} />

        {/* logo */}
        <Link to="/" style={{ display:'flex', alignItems:'center', gap:10, textDecoration:'none' }}>
          <div style={{ width:36, height:36, borderRadius:9, background:'linear-gradient(135deg,var(--gold),var(--gold-d))', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <span style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, color:'#0A0A0B' }}>Q</span>
          </div>
          <span style={{ fontFamily:'var(--font-display)', fontSize:26, fontWeight:700, color:'var(--text)', letterSpacing:'0.06em' }}>QALA</span>
        </Link>

        {/* main copy */}
        <div>
          <div style={{ display:'inline-block', background:'var(--gold-dim)', border:'1px solid rgba(200,165,90,0.2)', borderRadius:20, padding:'4px 14px', fontSize:11, color:'var(--gold)', fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:24 }}>
            Craft Marketplace
          </div>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:54, fontWeight:700, lineHeight:1.1, color:'var(--text)', marginBottom:20 }}>
            The craft<br/>marketplace<br/>for <em style={{ color:'var(--gold)' }}>India.</em>
          </h2>
          <p style={{ color:'var(--text3)', fontSize:15, lineHeight:1.8, maxWidth:380 }}>
            From hand block printing in Jaipur to Chanderi weaving in Madhya Pradesh — your studio deserves to be discovered.
          </p>
        </div>

        {/* account type guide */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:'var(--radius)', padding:'18px 20px' }}>
          <div style={{ fontSize:11, fontWeight:600, color:'var(--text3)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:14 }}>Account Types</div>
          {[
            { icon:'🎨', type:'Seller', note:'Created by admin — sign in to fill your profile' },
            { icon:'👜', type:'Buyer',  note:'Self signup — create account on the right' },
            { icon:'⚙️', type:'Admin',  note:'Use your admin credentials to sign in' },
          ].map(a => (
            <div key={a.type} style={{ display:'flex', gap:10, alignItems:'flex-start', marginBottom:10 }}>
              <span style={{ fontSize:14, marginTop:1 }}>{a.icon}</span>
              <div>
                <span style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{a.type}</span>
                <span style={{ fontSize:12, color:'var(--text3)', marginLeft:8 }}>{a.note}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT PANEL — form */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'48px 64px', background:'var(--bg)' }}>
        <div style={{ width:'100%', maxWidth:400 }} className="fade-up">

          {/* heading */}
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:38, fontWeight:700, color:'var(--text)', marginBottom:6 }}>
            {tab === 'signin' ? 'Welcome back' : 'Create account'}
          </h2>
          <p style={{ color:'var(--text3)', fontSize:14, marginBottom:32 }}>
            {tab === 'signin' ? 'Sign in to your QALA account.' : 'Register as a buyer or customer.'}
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
              <input type="password" placeholder="••••••••" value={pass} onChange={e => setPass(e.target.value)} required />
              {tab === 'signup' && <span className="hint">Min 8 chars · 1 number · 1 uppercase</span>}
            </div>

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
    </div>
  );
}

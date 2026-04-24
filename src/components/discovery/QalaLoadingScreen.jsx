import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authAPI, buyerAPI, discoveryAPI } from '../../api/client';
import qalaLogo from '../../assets/qala-logo.png';

const STAGES = [
  { at: 0,    header: 'Reading your requirements',       item: null },
  { at: 1200, header: 'Analysing your preferences',      item: 'Product types' },
  { at: 2400, header: 'Finding the right fit',           item: 'Craft techniques' },
  { at: 3600, header: 'Matching studios to your vision', item: 'Fabric preferences' },
  { at: 4800, header: 'Almost there…',                   item: 'Aesthetic direction' },
  { at: 5600, header: 'Found your matches!',             item: 'Batch size & timeline' },
];

const MIN_DURATION = 7200;

export default function QalaLoadingScreen({ onDone, dataReady, sessionToken }) {
  const { setUser } = useAuth();
  const { user }    = useAuth();

  const [elapsed,   setElapsed]   = useState(0);
  const [stageIdx,  setStageIdx]  = useState(0);
  const [items,     setItems]     = useState([]);
  const [fadeOut,   setFadeOut]   = useState(false);

  // form view: 'signup' | 'signin'
  const [view,      setView]      = useState('signup');

  // signup fields
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');

  // ui state
  const [submitting, setSubmitting] = useState(false);
  const [formDone,   setFormDone]   = useState(false);
  const [error,      setError]      = useState('');

  const isTypingRef    = useRef(false);
  const startRef       = useRef(Date.now());
  const doneRef        = useRef(false);
  const rafRef         = useRef(null);
  const addedStagesRef = useRef(new Set()); // tracks which stage items already added

  // ── Animation loop — never paused ────────────────────────────────────────
  useEffect(() => {
    const tick = () => {
      const e = Date.now() - startRef.current;
      setElapsed(e);

      for (let i = STAGES.length - 1; i >= 0; i--) {
        if (e >= STAGES[i].at) {
          // Use ref to guard — state update is async and fires multiple times per stage
          if (!addedStagesRef.current.has(i)) {
            addedStagesRef.current.add(i);
            setStageIdx(i);
            if (STAGES[i].item) setItems(p => [...p, STAGES[i].item]);
          }
          break;
        }
      }

      if (e >= MIN_DURATION && dataReady && !doneRef.current && !isTypingRef.current) {
        doneRef.current = true;
        setFadeOut(true);
        setTimeout(() => onDone(), 350);
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [dataReady, onDone]);

  // ── Sign up ───────────────────────────────────────────────────────────────
  const handleSignup = async (e) => {
    e.preventDefault();
    if (!firstName || !email || !password) return;
    setError('');
    setSubmitting(true);
    isTypingRef.current = false;

    try {
      // 1. Create SuperTokens account
      const r = await authAPI.signup(email, password);
      if (r.data.status !== 'OK') {
        const msg = r.data.formFields?.[0]?.error || 'Signup failed.';
        // Email already exists — offer to sign in
        if (msg.toLowerCase().includes('already exists') || msg.toLowerCase().includes('already registered')) {
          setError('This email is already registered.');
          setView('signin');
          setPassword('');
        } else {
          setError(msg);
        }
        setSubmitting(false);
        return;
      }

      // 2. Sign in immediately
      await authAPI.signin(email, password);
      const me = await authAPI.me();
      setUser(me.data);

      // 3. Save name to CustomerProfile
      const fullName = [firstName, lastName].filter(Boolean).join(' ');
      try { await buyerAPI.updateProfile({ full_name: fullName }); } catch {}

      // 4. Link anonymous session to new account
      if (sessionToken) {
        try { await discoveryAPI.linkSession(sessionToken); } catch {}
      }

      setFormDone(true);
    } catch (err) {
      setError(err.response?.data?.formFields?.[0]?.error || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Sign in ───────────────────────────────────────────────────────────────
  const handleSignin = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setError('');
    setSubmitting(true);
    isTypingRef.current = false;

    try {
      const r = await authAPI.signin(email, password);
      if (r.data.status !== 'OK') {
        setError(r.data.formFields?.[0]?.error || 'Incorrect email or password.');
        setSubmitting(false);
        return;
      }
      const me = await authAPI.me();
      setUser(me.data);

      // Link session to existing account
      if (sessionToken) {
        try { await discoveryAPI.linkSession(sessionToken); } catch {}
      }

      setFormDone(true);
    } catch (err) {
      setError(err.response?.data?.formFields?.[0]?.error || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => { isTypingRef.current = false; };

  const currentHeader = STAGES[stageIdx]?.header || STAGES[0].header;
  const progress      = Math.min(elapsed / MIN_DURATION, 1);
  const showForm      = !user && !formDone;
  const skipDisabled  = elapsed < 6000;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', overflowY: 'auto',
      opacity: fadeOut ? 0 : 1,
      transition: fadeOut ? 'opacity 0.35s ease' : 'none',
    }}>
      <style>{`
        @keyframes weaveOver {
          0%{left:-40px;opacity:0} 5%{opacity:1}
          45%{left:50%;transform:translateY(-2px)} 50%{left:50%;transform:translateY(0)}
          95%{opacity:1} 100%{left:calc(100% + 40px);opacity:0}
        }
        @keyframes weaveUnder {
          0%{left:-40px;opacity:0} 5%{opacity:1}
          45%{left:50%;transform:translateY(2px)} 50%{left:50%;transform:translateY(0)}
          95%{opacity:1} 100%{left:calc(100% + 40px);opacity:0}
        }
        @keyframes qItemIn   { from{opacity:0;transform:scale(0.88)} to{opacity:1;transform:scale(1)} }
        @keyframes qHeaderIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
        @keyframes qFormIn   { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:none} }
        .q-weft::before {
          content:'';position:absolute;height:4px;width:35px;
          background:#7A8C6E;border-radius:2px;
          animation:weaveOver 3s ease-in-out infinite;
        }
        .q-weft::after {
          content:'';position:absolute;height:4px;width:35px;
          background:#7A8C6E;border-radius:2px;
          animation:weaveUnder 3s ease-in-out infinite;animation-delay:1.5s;
        }
        .q-weft-0::before{animation-delay:0s}   .q-weft-0::after{animation-delay:1.5s}
        .q-weft-1::before{animation-delay:0.4s} .q-weft-1::after{animation-delay:1.9s}
        .q-weft-2::before{animation-delay:0.8s} .q-weft-2::after{animation-delay:2.3s}
        .q-weft-3::before{animation-delay:1.2s} .q-weft-3::after{animation-delay:2.7s}
        .q-weft-4::before{animation-delay:1.6s} .q-weft-4::after{animation-delay:3.1s}
        .q-input {
          padding:11px 13px;font-size:13px;font-family:var(--font-body);
          border:1.5px solid rgba(26,22,18,0.12);border-radius:8px;
          background:#fff;color:var(--text);width:100%;
          transition:border-color 0.2s,box-shadow 0.2s;outline:none;
          box-sizing:border-box;
        }
        .q-input::placeholder{color:rgba(26,22,18,0.35);}
        .q-input:focus{border-color:#7A8C6E;box-shadow:0 0 0 3px rgba(122,140,110,0.08);}
        .q-btn {
          width:100%;padding:12px;font-size:14px;font-weight:600;
          font-family:var(--font-body);background:#1A1612;color:#F5F0E8;
          border:none;border-radius:8px;cursor:pointer;
          transition:background 0.2s;letter-spacing:0.02em;
        }
        .q-btn:hover:not(:disabled){background:#7A8C6E;}
        .q-btn:disabled{opacity:0.55;cursor:not-allowed;}
        .q-link {
          background:none;border:none;cursor:pointer;
          color:#7A8C6E;font-size:13px;font-family:var(--font-body);
          padding:0;text-decoration:underline;
          transition:color 0.15s;
        }
        .q-link:hover{color:#6A7A5E;}
        @media(max-width:640px){
          .q-name-row{flex-direction:column!important;}
        }
      `}</style>

      <div style={{ width:'100%', maxWidth:860, display:'flex', flexDirection:'column', alignItems:'center' }}>

        {/* Logo */}
        <img src={qalaLogo} alt="Qala" className="qala-logo" style={{ marginBottom:28, height:22 }} />

        {/* Weaving animation */}
        <div style={{ width:260, height:160, position:'relative', marginBottom:32, flexShrink:0 }}>
          {[20,55,90,125,160,195,230].map((left,i) => (
            <div key={i} style={{
              position:'absolute', width:3, height:'100%', left,
              background:'linear-gradient(180deg,transparent 0%,rgba(184,92,56,0.25) 10%,rgba(184,92,56,0.35) 50%,rgba(184,92,56,0.25) 90%,transparent 100%)',
            }} />
          ))}
          {[25,55,85,115,145].map((top,i) => (
            <div key={i} className={`q-weft q-weft-${i}`} style={{ position:'absolute', height:4, width:'100%', left:0, top }} />
          ))}
        </div>

        {/* Stage header */}
        <h1 key={currentHeader} style={{
          fontFamily:'var(--font-display)', fontSize:'clamp(20px,3.5vw,30px)',
          fontWeight:400, color:'var(--text)', textAlign:'center',
          marginBottom:20, lineHeight:1.3, animation:'qHeaderIn 0.4s ease both',
        }}>
          {currentHeader}
        </h1>

        {/* Checked items */}
        <div style={{ display:'flex', flexWrap:'wrap', justifyContent:'center', gap:'8px 18px', marginBottom:24, minHeight:26 }}>
          {items.map(item => (
            <div key={item} style={{ display:'flex', alignItems:'center', gap:7, animation:'qItemIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both' }}>
              <div style={{ width:18, height:18, borderRadius:'50%', background:'var(--gold)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <span style={{ color:'#fff', fontSize:10, fontWeight:700 }}>✓</span>
              </div>
              <span style={{ fontSize:12, color:'var(--text2)' }}>{item}</span>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div style={{ width:'100%', maxWidth:300, height:3, background:'var(--border)', borderRadius:2, marginBottom:28 }}>
          <div style={{ height:'100%', borderRadius:2, background:'var(--gold)', width:`${progress*100}%`, transition:'width 0.3s ease' }} />
        </div>

        {/* ── Form card — only for non-logged-in users ── */}
        {showForm && (
          <div style={{
            background:'#fff', border:'1.5px solid rgba(26,22,18,0.08)',
            borderRadius:12, padding:'28px 32px',
            width:'100%', maxWidth:520,
            animation:'qFormIn 0.5s ease both',
          }}>

            {/* ── Signed up / signed in success ── */}
            {formDone ? (
              <div style={{ textAlign:'center', padding:'8px 0' }}>
                <div style={{ width:40, height:40, borderRadius:'50%', background:'var(--gold)', display:'inline-flex', alignItems:'center', justifyContent:'center', marginBottom:12 }}>
                  <span style={{ color:'#fff', fontSize:18, fontWeight:700 }}>✓</span>
                </div>
                <div style={{ fontSize:16, fontWeight:600, color:'var(--text)', marginBottom:4 }}>You're in!</div>
                <div style={{ fontSize:13, color:'var(--text3)' }}>Taking you to your results…</div>
              </div>

            ) : view === 'signup' ? (
              /* ── Signup view ── */
              <>
                <div style={{ marginBottom:20 }}>
                  <div style={{ fontSize:16, fontWeight:600, color:'var(--text)', marginBottom:4 }}>Create your account</div>
                  <div style={{ fontSize:13, color:'var(--text3)', lineHeight:1.5 }}>Sign up to save your matches and revisit them anytime.</div>
                </div>

                <form onSubmit={handleSignup}>
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>

                    {/* Name row */}
                    <div className="q-name-row" style={{ display:'flex', gap:10 }}>
                      <input
                        className="q-input" type="text"
                        placeholder="First name *"
                        value={firstName} onChange={e => setFirstName(e.target.value)}
                        onFocus={() => { isTypingRef.current = true; }}
                        onBlur={() => { isTypingRef.current = false; }}
                        autoComplete="given-name"
                        required
                      />
                      <input
                        className="q-input" type="text"
                        placeholder="Last name (optional)"
                        value={lastName} onChange={e => setLastName(e.target.value)}
                        onFocus={() => { isTypingRef.current = true; }}
                        onBlur={() => { isTypingRef.current = false; }}
                        autoComplete="family-name"
                      />
                    </div>

                    {/* Email */}
                    <input
                      className="q-input" type="email"
                      placeholder="Email address *"
                      value={email} onChange={e => setEmail(e.target.value)}
                      onFocus={() => { isTypingRef.current = true; }}
                      onBlur={() => { isTypingRef.current = false; }}
                      autoComplete="email"
                      required
                    />

                    {/* Password */}
                    <div>
                      <input
                        className="q-input" type="password"
                        placeholder="Password *"
                        value={password} onChange={e => setPassword(e.target.value)}
                        onFocus={() => { isTypingRef.current = true; }}
                        onBlur={() => { isTypingRef.current = false; }}
                        autoComplete="new-password"
                        required
                      />
                      <div style={{ fontSize:11, color:'var(--text4)', marginTop:5 }}>
                        Min 8 chars · 1 number · 1 uppercase
                      </div>
                    </div>

                    {/* Error */}
                    {error && (
                      <div style={{ fontSize:12, color:'var(--red)', background:'var(--red-dim)', border:'1px solid rgba(201,64,64,0.2)', borderRadius:6, padding:'8px 12px', lineHeight:1.5 }}>
                        {error}{' '}
                        {error.includes('already registered') && (
                          <button type="button" className="q-link" onClick={() => { setError(''); setView('signin'); setPassword(''); }}>
                            Sign in instead
                          </button>
                        )}
                      </div>
                    )}

                    {/* Submit */}
                    <button type="submit" className="q-btn" disabled={submitting || !firstName || !email || !password}>
                      {submitting ? 'Creating account…' : 'Create Account →'}
                    </button>

                    {/* Footer links */}
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:2 }}>
                      <span style={{ fontSize:12, color:'var(--text3)' }}>
                        Already have an account?{' '}
                        <button type="button" className="q-link" onClick={() => { setError(''); setView('signin'); setPassword(''); }}>
                          Sign in
                        </button>
                      </span>
                      <button type="button" onClick={handleSkip} disabled={skipDisabled} style={{ background:'none', border:'none', fontSize:12, color:skipDisabled ? 'rgba(26,22,18,0.25)' : 'var(--text4)', cursor:skipDisabled ? 'not-allowed' : 'pointer', fontFamily:'var(--font-body)', textDecoration:'underline' }}>
                        {skipDisabled ? `Skip (${Math.ceil((6000 - elapsed) / 1000)}s)` : 'Skip for now'}
                      </button>
                    </div>

                  </div>
                </form>
              </>

            ) : (
              /* ── Sign in view ── */
              <>
                <div style={{ marginBottom:20 }}>
                  <div style={{ fontSize:16, fontWeight:600, color:'var(--text)', marginBottom:4 }}>Sign in to your account</div>
                  <div style={{ fontSize:13, color:'var(--text3)', lineHeight:1.5 }}>Welcome back — sign in to save your results.</div>
                </div>

                <form onSubmit={handleSignin}>
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>

                    <input
                      className="q-input" type="email"
                      placeholder="Email address"
                      value={email} onChange={e => setEmail(e.target.value)}
                      onFocus={() => { isTypingRef.current = true; }}
                      onBlur={() => { isTypingRef.current = false; }}
                      autoComplete="email"
                      required
                    />

                    <input
                      className="q-input" type="password"
                      placeholder="Password"
                      value={password} onChange={e => setPassword(e.target.value)}
                      onFocus={() => { isTypingRef.current = true; }}
                      onBlur={() => { isTypingRef.current = false; }}
                      autoComplete="current-password"
                      required
                    />

                    {/* Error */}
                    {error && (
                      <div style={{ fontSize:12, color:'var(--red)', background:'var(--red-dim)', border:'1px solid rgba(201,64,64,0.2)', borderRadius:6, padding:'8px 12px' }}>
                        {error}
                      </div>
                    )}

                    <button type="submit" className="q-btn" disabled={submitting || !email || !password}>
                      {submitting ? 'Signing in…' : 'Sign In →'}
                    </button>

                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:2 }}>
                      <span style={{ fontSize:12, color:'var(--text3)' }}>
                        New here?{' '}
                        <button type="button" className="q-link" onClick={() => { setError(''); setView('signup'); setPassword(''); }}>
                          Create account
                        </button>
                      </span>
                      <button type="button" onClick={handleSkip} disabled={skipDisabled} style={{ background:'none', border:'none', fontSize:12, color:skipDisabled ? 'rgba(26,22,18,0.25)' : 'var(--text4)', cursor:skipDisabled ? 'not-allowed' : 'pointer', fontFamily:'var(--font-body)', textDecoration:'underline' }}>
                        {skipDisabled ? `Skip (${Math.ceil((6000 - elapsed) / 1000)}s)` : 'Skip for now'}
                      </button>
                    </div>

                  </div>
                </form>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
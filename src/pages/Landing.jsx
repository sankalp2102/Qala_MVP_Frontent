// src/pages/Landing.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate }                  from 'react-router-dom';
import { useAuth }                      from '../context/AuthContext';
import { chatAPI }                      from '../api/client';
import qalaLogo from '../assets/qala-logo.png';
import QalawatiIntro from '../components/discovery/QalawatiIntro';
import studioBlockprint from '../assets/Block-print houses.jpg';
import craftHandblock   from '../assets/Handblock printing.jpg';
import craftEmbroidery  from '../assets/Hand embroidery.jpg';
import craftNaturalDye  from '../assets/Natural dye and resist.jpg';
// Hero swatches — background-removed versions of the existing garment-N.jpg
// photos (garment-N.png, now replacing the old garment-N.jpg files directly). The original JPGs are fully opaque
// rectangles, so the drop-shadow filter was casting a shadow around the
// whole white backdrop, not just the garment — that's what made them look
// like boxy cards despite the white roughly matching the page background.
// These PNGs have real alpha transparency (flood-fill cutout, connectivity-
// restricted so white pattern details fully enclosed by the garment, e.g.
// garment-4's white checks/stripes, survive even though they're the same
// color as the true background).
import heroGarment1 from '../assets/garment-1.png';  // blue shirt
import heroGarment2 from '../assets/garment-2.png';  // pink/tan bag
import heroGarment3 from '../assets/garment-3.png';  // magenta tie-dye garment
import heroGarment4 from '../assets/garment-4.png';  // teal/yellow checkered fabric
import heroGarment5 from '../assets/garment-5.png';  // striped embroidered shirt
import studioEmbroidery from '../assets/Embroidery collectives.jpg';
import studioHandloom   from '../assets/Handloom weavers.jpg';

const CHAT_SESSION_KEY   = 'qala_chat_session_id';

function getGreeting(name) {
  const h = new Date().getHours();
  const time = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return name ? `${time}, ${name.split(' ')[0]}.` : `${time}.`;
}
const LANDING_FIRST_MSG  = 'qala_landing_first_msg';
const LANDING_FIRST_IMG  = 'qala_landing_first_img';
const LANDING_FIRST_MIME = 'qala_landing_first_mime';
const ACCENT = 'var(--sage)';

// ── Fabric-pattern swatch fills — exact SVG patterns from the prototype ──
function PatternDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }}>
      <defs>
        <pattern id="p-shibori" width="26" height="26" patternUnits="userSpaceOnUse"><rect width="26" height="26" fill="#37487A"/><circle cx="13" cy="13" r="6" fill="none" stroke="#EAF0FB" strokeWidth="2"/><circle cx="0" cy="0" r="4" fill="none" stroke="#EAF0FB" strokeWidth="1.5"/><circle cx="26" cy="26" r="4" fill="none" stroke="#EAF0FB" strokeWidth="1.5"/></pattern>
        <pattern id="p-bandhani" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="#A8392F"/><circle cx="4" cy="4" r="1.6" fill="#F7E7D8"/><circle cx="12" cy="12" r="1.6" fill="#F7E7D8"/></pattern>
        <pattern id="p-block" width="30" height="30" patternUnits="userSpaceOnUse"><rect width="30" height="30" fill="#EFE7D6"/><path d="M15 6 C19 10 19 14 15 18 C11 14 11 10 15 6 Z" fill="#2E4374"/><circle cx="15" cy="23" r="2" fill="#9B7235"/></pattern>
        <linearGradient id="p-tiedye" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#B0407E"/><stop offset="55%" stopColor="#D98AB0"/><stop offset="100%" stopColor="#E9C8B0"/></linearGradient>
        <pattern id="p-check" width="28" height="28" patternUnits="userSpaceOnUse"><rect width="28" height="28" fill="#E8D78A"/><rect width="14" height="14" fill="#3F8E84"/><rect x="14" y="14" width="14" height="14" fill="#3F8E84"/></pattern>
        <pattern id="p-kantha" width="22" height="10" patternUnits="userSpaceOnUse"><rect width="22" height="10" fill="#F0E6D2"/><path d="M0 5 q5 -4 11 0 t11 0" fill="none" stroke="#C4644A" strokeWidth="1.4"/></pattern>
      </defs>
    </svg>
  );
}
function ScrollArrow({ to }) {
  return (
    <a
      onClick={() => document.getElementById(to)?.scrollIntoView({ behavior: 'smooth' })}
      style={{
        position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        color: 'var(--ink-warm-mute)', cursor: 'pointer', textDecoration: 'none',
        animation: 'landBob 1.9s ease-in-out infinite',
      }}
      onMouseEnter={e => { e.currentTarget.style.color = 'var(--qw)'; }}
      onMouseLeave={e => { e.currentTarget.style.color = 'var(--ink-warm-mute)'; }}
      aria-label="Scroll down"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
    </a>
  );
}
function Swatch({ fill, img, label, style, className }) {
  // Real garment photos: plain floating image, no card box, no float
  // animation, no hover label — just the photo with a soft drop-shadow so
  // it doesn't look like a boxed thumbnail.
  if (img) {
    return (
      <div className={className} style={{ position: 'absolute', width: 118, height: 150, ...style }}>
        <img src={img} alt="" style={{
          width: '100%', height: '100%', objectFit: 'contain',
          filter: 'drop-shadow(0 14px 28px rgba(42,36,32,0.16))',
        }} />
      </div>
    );
  }

  // SVG pattern fills (gate section) keep the original card treatment.
  return (
    <div className={className} style={{
      position: 'absolute', width: 118, height: 150, borderRadius: 10, overflow: 'hidden',
      boxShadow: '0 14px 40px rgba(42,36,32,0.10)', cursor: 'default',
      animation: 'landFloat 7s ease-in-out infinite', ...style,
    }}
      onMouseEnter={e => { e.currentTarget.querySelector('.swlab').style.transform = 'translateY(0)'; }}
      onMouseLeave={e => { e.currentTarget.querySelector('.swlab').style.transform = 'translateY(100%)'; }}
    >
      <svg width="100%" height="100%"><rect width="100%" height="100%" fill={`url(#${fill})`} /></svg>
      <div className="swlab" style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: 'rgba(42,36,32,0.78)', color: '#fff',
        fontSize: 9.5, lineHeight: 1.35, padding: '6px 8px',
        transform: 'translateY(100%)', transition: 'transform 0.25s',
      }}>{label}</div>
    </div>
  );
}
const STEPS = [
  { t: 'Share your vision', d: "Tell Qala what you want to make, in plain words, and it becomes a precise, production-ready brief." },
  { t: 'Matched to the studio', d: 'Qala finds the studios that can truly make it: right craft, quality, minimums and timeline.' },
  { t: 'Co-create the piece', d: 'Refine every detail together in a shared studio space, with a live render before anything is cut.' },
  { t: 'Sample, then sign off', d: "Approve a virtual render, then a physical sample. Nothing goes to production until it's right." },
  { t: 'Made & delivered', d: 'Qala oversees production and quality checks, then handles export, duties and delivery, right to your door.' },
];
const CRAFTS = [
  { img: craftHandblock, pos: 'center', t: 'Handblock printing', d: 'Hand-carved wooden blocks, natural dyes, the slight human variation that reads unmistakably handmade.', m: 'Bagru · Sanganer · Ajrakh' },
  { img: craftEmbroidery, pos: 'center', t: 'Hand embroidery', d: 'Chikankari, Kantha, Phulkari, Kutch mirror work: surface that reads special, not costume.', m: 'Lucknow · Bengal · Kutch' },
  { img: craftNaturalDye, pos: 'center', t: 'Natural dye & resist', d: 'Indigo vats, madder, shibori and Bandhani: colour grown, not just printed on.', m: 'Kutch · Gujarat · Rajasthan' },
];
const PAINS = [
  { t: 'No more ghosting', d: "Vetted studios and Qala in the middle, so you're never left chasing a reply." },
  { t: 'Your design stays yours', d: 'Designs and IP are protected: never leaked, shared, or quietly copied.' },
  { t: 'Consistent, every run', d: 'What you approve is what ships: sample, bulk and every reorder held to one standard.' },
  { t: 'Delivered on time', d: 'Realistic dates up front and a timeline Qala manages, so you never miss a season.' },
  { t: 'One accountable partner', d: "Qala oversees production, QC, export and delivery; if it slips, it's on us, not you." },
  { t: 'Authentic craft, always', d: 'The real technique from genuine artisan studios, never a factory imitation.' },
];

export default function Landing() {
  const { user, loginWithAccessKey } = useAuth();
  const navigate = useNavigate();

  const [phase,      setPhase]      = useState('key');
  const [visible,    setVisible]    = useState(false);
  const [introDone,  setIntroDone]  = useState(false);
  const [transition, setTransition] = useState(false);

  const [accessKey,  setAccessKey]  = useState('');
  const [keyError,   setKeyError]   = useState('');
  const [keyShake,   setKeyShake]   = useState(false);
  const [starting,   setStarting]   = useState(false);
  const [sessionId,  setSessionId]  = useState(null);

  const [message,    setMessage]    = useState('');
  const [sending,    setSending]    = useState(false);
  const [pendingImg, setPendingImg] = useState(null);
  const fileRef = useRef(null);
  const taRef   = useRef(null);

  // Request access modal state
  const [showAccessReq,    setShowAccessReq]    = useState(false);
  const [accessReqForm,    setAccessReqForm]    = useState({ name: '', email: '', link: '' });
  const [accessReqErr,     setAccessReqErr]     = useState({});
  const [accessReqSending, setAccessReqSending] = useState(false);
  const [accessReqDone,    setAccessReqDone]    = useState(false);

  useEffect(() => { setTimeout(() => setVisible(true), 60); }, []);

  // Browsers restore the previous scroll position on refresh (scroll
  // restoration), which lands a reload halfway down this now much-taller
  // page — right on the gate. Force it back to the top of the hero.
  useEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!user) return;
    if (user.role === 'admin')    { navigate('/admin');     return; }
    if (user.role === 'seller')   { navigate('/dashboard'); return; }
    if (user.role === 'customer') { setPhase('intro'); }
  }, [user]);

  async function handleKeySubmit() {
    if (!accessKey.trim() || starting) return;
    setStarting(true); setKeyError('');
    try {
      const res  = await chatAPI.start(`QS-${accessKey.trim()}`);
      const data = res.data;
      // If a previous session exists for this key, resume it
      const resumeId = data.existing_session_id || null;
      const id = resumeId || data.session?.session_id;
      setSessionId(id);
      sessionStorage.setItem(CHAT_SESSION_KEY, id);
      if (resumeId) sessionStorage.setItem('qala_resume_session', 'true');
      if (data.has_contact) localStorage.setItem('qala_has_contact', 'true');
      else localStorage.removeItem('qala_has_contact');
      // Store the full key code so studio profile can send it with Get Introduced
      localStorage.setItem('qala_access_key', `QS-${accessKey.trim()}`);
      if (data.access_token && data.user) loginWithAccessKey(data.access_token, data.user);
      setTransition(true);
      setTimeout(() => { setPhase('intro'); setTransition(false); }, 320);
    } catch (err) {
      setKeyError(err.response?.data?.error || 'Invalid access key.');
      setKeyShake(true);
      setTimeout(() => setKeyShake(false), 600);
    } finally { setStarting(false); }
  }

  async function handleMessageSubmit() {
    if ((!message.trim() && !pendingImg) || sending) return;
    setSending(true);
    try {
      let sid = sessionId;
      if (!sid) {
        const res = await chatAPI.start(null);
        sid = res.data.session?.session_id;
        sessionStorage.setItem(CHAT_SESSION_KEY, sid);
      }
      if (message.trim()) sessionStorage.setItem(LANDING_FIRST_MSG, message.trim());
      if (pendingImg) {
        sessionStorage.setItem(LANDING_FIRST_IMG,  pendingImg.data);
        sessionStorage.setItem(LANDING_FIRST_MIME, pendingImg.mime);
      }
      navigate('/discover');
    } catch { setSending(false); }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      phase === 'key' ? handleKeySubmit() : handleMessageSubmit();
    }
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setPendingImg({ data: ev.target.result.split(',')[1], mime: file.type || 'image/jpeg' });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function handleAccessReqSubmit() {
    const errs = {};
    if (!accessReqForm.name.trim())  errs.name  = 'Required';
    if (!accessReqForm.email.trim()) errs.email = 'Required';
    else if (!/^[^@]+@[^@]+\.[^@]+$/.test(accessReqForm.email)) errs.email = 'Invalid email';
    if (!accessReqForm.link.trim())  errs.link  = 'Required';
    if (Object.keys(errs).length) { setAccessReqErr(errs); return; }
    setAccessReqSending(true);
    try {
      await chatAPI.requestAccess({
        name:  accessReqForm.name.trim(),
        email: accessReqForm.email.trim(),
        link:  accessReqForm.link.trim(),
      });
      setAccessReqDone(true);
    } catch {
      setAccessReqErr({ email: 'Something went wrong. Please try again.' });
    } finally { setAccessReqSending(false); }
  }

  const fadeIn = {
    opacity:    visible && !transition ? 1 : 0,
    transform:  visible && !transition ? 'translateY(0)' : 'translateY(14px)',
    transition: 'opacity 0.5s ease, transform 0.5s ease',
  };

  const canSendKey = accessKey.trim().length > 0 && !starting;
  const canSendMsg = (message.trim() || pendingImg) && !sending;

  // ── PHASE — INTRO (Qalawati welcome, plays once right after the key is accepted) ──
  if (phase === 'intro') {
    return (
      <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', flexDirection: 'column' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 13, padding: '0 22px', height: 60,
          borderBottom: '0.5px solid var(--border-warm)', flexShrink: 0, background: '#fff',
        }}>
          <img src={qalaLogo} alt="Qala" style={{ height: 18, width: 'auto' }} />
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', padding: '20px 0' }}>
          <style>{`
            .landing-textarea::placeholder { color: var(--ink-warm-mute); }
            @keyframes spin  { to { transform: rotate(360deg); } }
          `}</style>

          <QalawatiIntro onComplete={() => setIntroDone(true)} />

          {introDone && (
            <div style={{
              position: 'relative', zIndex: 1, width: '100%', maxWidth: 720,
              display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 20px',
              opacity: introDone ? 1 : 0, transform: introDone ? 'translateY(0)' : 'translateY(10px)',
              transition: 'opacity 0.5s ease, transform 0.5s ease',
            }}>
              <div style={{
                width: '100%',
                border: '1.5px solid var(--border-warm-s)',
                borderRadius: 'var(--r-16)', background: '#fff',
                padding: '12px 14px 8px',
                boxSizing: 'border-box',
                boxShadow: '0 4px 24px rgba(42,36,32,0.06)',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}>
                {pendingImg && (
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                    <img
                      src={`data:${pendingImg.mime};base64,${pendingImg.data}`}
                      alt=""
                      style={{ height:48, borderRadius: 'var(--r)', border:'1px solid var(--border-warm)' }}
                    />
                    <button onClick={() => setPendingImg(null)} style={{ fontSize:11, color:'var(--ink-warm-mute)', background:'none', border:'none', cursor:'pointer' }}>
                      remove
                    </button>
                  </div>
                )}

                <textarea
                  ref={taRef}
                  value={message}
                  onChange={e => {
                    setMessage(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Share your ideas with us. We will help you shape them and find the right production partner."
                  rows={2}
                  autoFocus
                  className="landing-textarea"
                  style={{
                    width:'100%', border:'none', background:'transparent',
                    fontSize:13, color:'var(--ink-warm)', lineHeight:1.65,
                    fontFamily:'var(--font-body)', resize:'none', outline:'none',
                    minHeight:44, maxHeight:100, scrollbarWidth:'none',
                  }}
                />

                <div style={{
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  marginTop:8, paddingTop:8,
                  borderTop:'1px solid var(--border-warm)',
                }}>
                  <button
                    onClick={() => fileRef.current?.click()}
                    style={{
                      display:'flex', alignItems:'center', gap:6,
                      fontSize:12, color:'var(--ink-warm-mute)',
                      background:'none', border:'none', cursor:'pointer',
                      fontFamily:'var(--font-body)', padding:'4px 0',
                      transition:'color 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--ink-warm)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--ink-warm-mute)'; }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66L9.64 16.34a2 2 0 01-2.83-2.83l8.49-8.48"/>
                    </svg>
                    Attach
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleFileChange} />

                  <button
                    onClick={handleMessageSubmit}
                    disabled={!canSendMsg}
                    style={{
                      width:36, height:36, borderRadius: 'var(--r-8)', border:'none',
                      background: canSendMsg ? ACCENT : 'rgba(122,140,110,0.22)',
                      cursor: canSendMsg ? 'pointer' : 'not-allowed',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      flexShrink:0, transition:'background 0.18s',
                    }}
                  >
                    {sending
                      ? <div style={{ width:12,height:12,border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin 0.7s linear infinite' }} />
                      : <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    }
                  </button>
                </div>
              </div>

              {/* Suggestion chips */}
              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: 8,
                justifyContent: 'center', marginTop: 14,
              }}>
                {['Make a collection', 'Make some samples', 'Get some pieces made'].map(chip => (
                  <button
                    key={chip}
                    onClick={async () => {
                      setMessage(chip);
                      await new Promise(r => setTimeout(r, 50));
                      setSending(true);
                      try {
                        let sid = sessionId;
                        if (!sid) {
                          const res = await chatAPI.start(null);
                          sid = res.data.session?.session_id;
                          sessionStorage.setItem(CHAT_SESSION_KEY, sid);
                        }
                        sessionStorage.setItem(LANDING_FIRST_MSG, chip);
                        navigate('/discover');
                      } catch { setSending(false); }
                    }}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 'var(--r-full)',
                      border: '1px solid var(--border-warm-s)',
                      background: '#fff',
                      fontSize: 13, color: 'var(--ink-warm-mid)',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-body)',
                      transition: 'border-color 0.15s, background 0.15s, color 0.15s',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.color = ACCENT; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-warm-s)'; e.currentTarget.style.color = 'var(--ink-warm-mid)'; }}
                  >
                    {chip}
                  </button>
                ))}
              </div>

              <div style={{ marginTop:20, opacity:0.3 }}>
                <img src={qalaLogo} alt="Qala" style={{ height:15, width:'auto' }} />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── PHASE — KEY (full marketing page, carbon-copied section-for-section
  //     from the prototype, ending in the real passcode gate) ──
  if (phase === 'key') {
    const shell = { maxWidth: 1180, margin: '0 auto', padding: '0 clamp(16px,4vw,28px)' };
    const eyebrow = { fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--qw)', textAlign: 'center', marginBottom: 14 };
    const secH = { fontFamily: 'var(--font-display)', fontSize: 'clamp(22px,3.2vw,32px)', fontWeight: 500, textAlign: 'center', maxWidth: 780, margin: '0 auto 8px', whiteSpace: 'normal' };
    const secSub = { fontSize: 14, color: 'var(--ink-warm-mid)', textAlign: 'center', maxWidth: 560, margin: '0 auto 46px' };
    return (
      <div style={{ background: '#fff', color: 'var(--ink-warm)', fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.6 }}>
        <PatternDefs />
        <style>{`
          @keyframes landFloat { 0%,100% { translate: 0 0; } 50% { translate: 0 -14px; } }
          @keyframes landBob { 0%,100% { transform: translateX(-50%) translateY(0); } 50% { transform: translateX(-50%) translateY(7px); } }
          .land-nav-a { font-size: 12.5px; color: var(--ink-warm-mid); cursor: pointer; text-decoration: none; transition: color .15s; }
          .land-nav-a:hover { color: var(--ink-warm); }
          .land-nav-code { font-size: 12px; padding: 8px 16px; border: 0.5px solid var(--border-warm-s); border-radius: 20px; cursor: pointer; transition: all .15s; }
          .land-nav-code:hover { border-color: var(--qw-b); color: var(--qw); }
          .land-step-n { font-family: var(--font-display); font-size: 13px; color: #fff; background: var(--qw); width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; }
          .land-pain { display: flex; gap: 12px; align-items: flex-start; padding: 16px 18px; border: 0.5px solid var(--border-warm-s); border-radius: 12px; }
          .land-craft { border: 0.5px solid var(--border-warm-s); border-radius: 14px; overflow: hidden; }
          @media (max-width: 860px) {
            .land-steps { grid-template-columns: repeat(2,1fr) !important; }
            .land-crafts { grid-template-columns: 1fr !important; }
            .land-pains { grid-template-columns: 1fr !important; }
            .land-swatch { display: none !important; }
          }
        `}</style>

        {/* ── Nav ── */}
        <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255,255,255,0.86)', backdropFilter: 'blur(8px)', borderBottom: '0.5px solid var(--border-warm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', height: 58, ...shell }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 500, letterSpacing: '0.1em' }}>Qala</div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 24 }}>
              <a className="land-nav-a" onClick={() => document.getElementById('land-how').scrollIntoView({ behavior: 'smooth' })}>How it works</a>
              <a className="land-nav-a" onClick={() => document.getElementById('land-craft').scrollIntoView({ behavior: 'smooth' })}>The craft</a>
              <a className="land-nav-a" onClick={() => document.getElementById('land-studios').scrollIntoView({ behavior: 'smooth' })}>Studios</a>
              <a className="land-nav-a" onClick={() => document.getElementById('land-assurance').scrollIntoView({ behavior: 'smooth' })}>Assurance</a>
              <div className="land-nav-code" onClick={() => document.getElementById('land-gate').scrollIntoView({ behavior: 'smooth' })}>Enter access code</div>
            </div>
          </div>
        </div>

        {/* ── Hero ── */}
        <section style={{ position: 'relative', overflow: 'hidden', minHeight: 'calc(100vh - 58px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0', textAlign: 'center' }}>
          <Swatch className="land-swatch" img={heroGarment1} label="Indigo shibori · Kutch" style={{ top: '16%', left: '2%', transform: 'rotate(-6deg)', animationDelay: '0s' }} />
          <Swatch className="land-swatch" img={heroGarment2} label="Bandhani · Gujarat" style={{ top: '7%', left: '25%', width: 96, height: 120, transform: 'rotate(5deg)', animationDelay: '1.1s' }} />
          <Swatch className="land-swatch" img={heroGarment4} label="Handblock · Bagru" style={{ bottom: '12%', left: '6%', width: 104, height: 132, transform: 'rotate(7deg)', animationDelay: '0.5s' }} />
          <Swatch className="land-swatch" img={heroGarment3} label="Tie-dye · Rajasthan" style={{ top: '15%', right: '3%', transform: 'rotate(6deg)', animationDelay: '0.8s' }} />
          <Swatch className="land-swatch" img={heroGarment5} label="Handloom check · Bengaluru" style={{ bottom: '13%', right: '7%', width: 100, height: 128, transform: 'rotate(-7deg)', animationDelay: '1.6s' }} />
          <div style={shell}>
            <h1 className="land-hero-h" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(32px,5.2vw,54px)', fontWeight: 500, lineHeight: 1.08, maxWidth: 780, margin: '0 auto', letterSpacing: '-0.01em' }}>
              Manufacture with the world's <span style={{ fontStyle: 'italic', color: 'var(--qw)' }}>finest craft.</span>
            </h1>
            <p style={{ fontSize: 15, color: 'var(--ink-warm-mid)', maxWidth: 540, margin: '20px auto 0', lineHeight: 1.65 }}>
              Qala is the platform where independent brands and retailers manufacture seamlessly with India's finest craft studios: handblock print, natural dye, handloom, hand embroidery.
            </p>
          </div>
          <ScrollArrow to="land-how" />
        </section>

        {/* ── How it works ── */}
        <section id="land-how" style={{ position: 'relative', minHeight: 'calc(100vh - 58px)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '64px 0', borderTop: '0.5px solid var(--border-warm)' }}>
          <div style={shell}>
            <div style={eyebrow}>How Qala works</div>
            <h2 className="land-sec-h" style={secH}>Your vision, taken all the way.</h2>
            <p style={secSub}>You bring the idea; Qala runs the entire make. The right studio, the spec, the samples, production, compliance and shipping, all taken care of.</p>
            <div className="land-steps" style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 18 }}>
              {STEPS.map((s, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div className="land-step-n">{i + 1}</div>
                  <div style={{ fontSize: 13.5, fontWeight: 500, marginBottom: 5 }}>{s.t}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-warm-mute)', lineHeight: 1.55 }}>{s.d}</div>
                </div>
              ))}
            </div>
          </div>
          <ScrollArrow to="land-craft" />
        </section>

        {/* ── The craft ── */}
        <section id="land-craft" style={{ position: 'relative', minHeight: 'calc(100vh - 58px)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '64px 0', borderTop: '0.5px solid var(--border-warm)', background: 'var(--cream)' }}>
          <div style={shell}>
            <div style={eyebrow}>The craft</div>
            <h2 className="land-sec-h" style={secH}>Heritage techniques, made for a contemporary wardrobe.</h2>
            <p style={secSub}>Centuries-old techniques, the kind global fashion is turning back to. A few of the traditions you can build with:</p>
            <div className="land-crafts" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18 }}>
              {CRAFTS.map((c, i) => (
                <div key={i} className="land-craft">
                  <div style={{ height: 140, backgroundImage: `url(${c.img})`, backgroundSize: 'cover', backgroundPosition: c.pos }} />
                  <div style={{ padding: '15px 17px' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600 }}>{c.t}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-warm-mid)', marginTop: 5, lineHeight: 1.55 }}>{c.d}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--ink-warm-mute)', marginTop: 9, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{c.m}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <ScrollArrow to="land-studios" />
        </section>

        {/* ── Studios ── */}
        <section id="land-studios" style={{ position: 'relative', minHeight: 'calc(100vh - 58px)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '64px 0', borderTop: '0.5px solid var(--border-warm)' }}>
          <div style={shell}>
            <div style={eyebrow}>The studios</div>
            <h2 className="land-sec-h" style={secH}>Vetted studios, not faceless factories.</h2>
            <p style={secSub}>Every studio in Qala's network is chosen by hand, for craft mastery and integrity, not just capacity. Many carry GI-tagged heritage, fair-trade practice, and skills passed down generations.</p>
            <div className="land-crafts" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18 }}>
              {[
                { img: studioBlockprint, pos: 'center', t: 'Block-print houses', d: 'Families who have carved blocks and printed by hand for generations, with their own in-house dye.', m: 'Bagru · Sanganer · Kutch' },
                { img: studioEmbroidery, pos: 'center', t: 'Embroidery collectives', d: 'Women-led ateliers carrying Chikankari, mirror work and Suf, often hundreds of artisans deep.', m: 'Lucknow · Kutch · Punjab' },
                { img: studioHandloom, pos: 'center 38%', t: 'Handloom weavers', d: 'Looms that build the pattern into the cloth itself: Chanderi, Kota Doria, fine cotton-silks.', m: 'Bengal · Madhya Pradesh · South' },
              ].map((c, i) => (
                <div key={i} className="land-craft">
                  <div style={{ height: 140, backgroundImage: `url(${c.img})`, backgroundSize: 'cover', backgroundPosition: c.pos }} />
                  <div style={{ padding: '15px 17px' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600 }}>{c.t}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-warm-mid)', marginTop: 5, lineHeight: 1.55 }}>{c.d}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--ink-warm-mute)', marginTop: 9, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{c.m}</div>
                  </div>
                </div>
              ))}
            </div>
            <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--ink-warm-mute)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 30 }}>
              GI-tagged heritage &nbsp;·&nbsp; Fair-trade practice &nbsp;·&nbsp; GOTS &amp; OEKO-TEX where it counts
            </p>
          </div>
          <ScrollArrow to="land-assurance" />
        </section>

        {/* ── Assurance ── */}
        <section id="land-assurance" style={{ position: 'relative', minHeight: 'calc(100vh - 58px)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '64px 0', borderTop: '0.5px solid var(--border-warm)', background: 'var(--cream)' }}>
          <div style={shell}>
            <div style={eyebrow}>Qala Assurance</div>
            <h2 className="land-sec-h" style={secH}>The things you never have to worry about.</h2>
            <p style={secSub}>Manufacturing with crafts across continents is hard. Qala takes that risk off your plate.</p>
            <div className="land-pains" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14, maxWidth: 760, margin: '0 auto' }}>
              {PAINS.map((p, i) => (
                <div key={i} className="land-pain">
                  <div style={{ color: 'var(--pl)', flexShrink: 0, marginTop: 1 }}>✓</div>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 500 }}>{p.t}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-warm-mute)', marginTop: 3, lineHeight: 1.5 }}>{p.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <ScrollArrow to="land-gate" />
        </section>

        {/* ── Gate ── */}
        <section id="land-gate" style={{ position: 'relative', textAlign: 'center', minHeight: 'calc(100vh - 58px)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '64px 0' }}>
          <Swatch className="land-swatch" fill="p-tiedye" label="Tie-dye · Rajasthan" style={{ top: '15%', left: '5%', transform: 'rotate(7deg)' }} />
          <Swatch className="land-swatch" fill="p-block" label="Handblock · Bagru" style={{ bottom: '15%', right: '6%', transform: 'rotate(-6deg)' }} />
          <div style={shell}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(30px,5vw,46px)', fontWeight: 500, lineHeight: 1.1, margin: '8px 0 14px' }}>Get inside.</h2>
            <p style={{ fontSize: 15, color: 'var(--ink-warm-mid)', maxWidth: 510, margin: '0 auto 30px', lineHeight: 1.65 }}>
              Qala stays invite-only, so the network stays curated and the studios stay yours.
            </p>
            <div style={{
              width: '100%', maxWidth: 440, margin: '0 auto',
              border: `1.5px solid ${keyError ? 'var(--red)' : 'rgba(122,140,110,0.5)'}`,
              borderRadius: 14, background: '#F9F9F8',
              display: 'flex', alignItems: 'center',
              padding: '6px 6px 6px 18px', height: 55,
              animation: keyShake ? 'shake 0.5s ease' : 'none',
              transition: 'border-color 0.2s', boxSizing: 'border-box',
            }}>
              <span style={{ fontSize: 14, color: 'var(--ink-warm)', opacity: 0.5, fontFamily: 'var(--font-body)', letterSpacing: '1.4px', userSelect: 'none', flexShrink: 0, whiteSpace: 'nowrap' }}>QS-</span>
              <input
                type="text" value={accessKey}
                onChange={e => { setAccessKey(e.target.value.toUpperCase()); setKeyError(''); }}
                onKeyDown={handleKeyDown} placeholder="0000" maxLength={4} autoFocus
                style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 14, color: 'var(--ink-warm)', fontFamily: 'var(--font-body)', outline: 'none', padding: '0 8px', letterSpacing: '1.4px', textTransform: 'uppercase' }}
              />
              <button
                onClick={handleKeySubmit} disabled={!canSendKey} aria-label="Enter"
                style={{ width: 42, height: 42, borderRadius: 10, border: 'none', background: canSendKey ? '#7A8C6E' : 'rgba(122,140,110,0.25)', cursor: canSendKey ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.2s' }}
                onMouseEnter={e => { if (canSendKey) e.currentTarget.style.background = '#6B7D5F'; }}
                onMouseLeave={e => { if (canSendKey) e.currentTarget.style.background = '#7A8C6E'; }}
              >
                {starting
                  ? <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.35)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  : <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                }
              </button>
            </div>
            <div style={{ fontSize: 12.5, marginTop: 14, minHeight: 18, textAlign: 'center' }}>
              {keyError && <span style={{ color: 'var(--red)' }}>{keyError}</span>}
            </div>
            <button
              onClick={() => { setShowAccessReq(true); setAccessReqDone(false); setAccessReqErr({}); setAccessReqForm({ name: '', email: '', link: '' }); }}
              style={{ marginTop: 2, fontSize: 12, color: 'var(--ink-warm-mute)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--font-body)', textDecoration: 'underline', textUnderlineOffset: '3px' }}
            >
              Request access →
            </button>
          </div>
        </section>

        <div style={{ borderTop: '0.5px solid var(--border-warm)', padding: '30px 0', textAlign: 'center', color: 'var(--ink-warm-mute)', fontSize: 11.5 }}>
          Qala · The custom manufacturing platform for brands &amp; retailers · Made with India's craft studios
        </div>

        {/* Request Access modal — reused as-is */}
        {showAccessReq && (
          <>
            <div onClick={() => setShowAccessReq(false)} style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(26,22,18,0.45)', backdropFilter: 'blur(4px)' }} />
            <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 401, background: '#fff', border: '1px solid rgba(26,22,18,0.1)', borderRadius: 20, padding: '32px 28px 26px', width: 'min(420px, 92vw)', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
              {accessReqDone ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: 36, marginBottom: 14 }}>&#10003;</div>
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 500, marginBottom: 8 }}>Request received</p>
                  <p style={{ fontSize: 13.5, color: 'rgba(26,22,18,0.55)', lineHeight: 1.6 }}>We'll be in touch shortly.</p>
                  <button onClick={() => setShowAccessReq(false)} style={{ marginTop: 22, padding: '10px 28px', borderRadius: 8, border: '1px solid rgba(26,22,18,0.15)', background: 'none', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Close</button>
                </div>
              ) : (
                <>
                  <p style={{ margin: '0 0 5px', fontSize: 20, fontWeight: 500, fontFamily: 'var(--font-display)' }}>Request Access</p>
                  <p style={{ margin: '0 0 22px', fontSize: 13, color: 'rgba(26,22,18,0.5)', lineHeight: 1.55 }}>Tell us about your business and we shall send you the access code.</p>
                  {[
                    { key: 'name', label: 'Business Name', required: true },
                    { key: 'email', label: 'Email', required: true },
                    { key: 'link', label: 'Website / Instagram', required: true },
                  ].map(({ key, label, required }) => (
                    <div key={key} style={{ marginBottom: 14 }}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(26,22,18,0.5)', display: 'block', marginBottom: 5, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                        {label}{required && <span style={{ color: ACCENT, marginLeft: 2 }}>*</span>}
                      </label>
                      <input
                        type={key === 'email' ? 'email' : 'text'} value={accessReqForm[key]}
                        onChange={e => { setAccessReqForm(f => ({ ...f, [key]: e.target.value })); setAccessReqErr(er => ({ ...er, [key]: '' })); }}
                        style={{ width: '100%', padding: '10px 13px', boxSizing: 'border-box', border: `1px solid ${accessReqErr[key] ? 'var(--red)' : 'rgba(26,22,18,0.15)'}`, borderRadius: 8, background: '#fff', fontSize: 14, fontFamily: 'var(--font-body)', outline: 'none', transition: 'border-color 0.15s' }}
                        onFocus={e => { e.target.style.borderColor = ACCENT; }}
                        onBlur={e => { e.target.style.borderColor = accessReqErr[key] ? 'var(--red)' : 'rgba(26,22,18,0.15)'; }}
                      />
                      {accessReqErr[key] && <span style={{ fontSize: 11, color: 'var(--red)', marginTop: 3, display: 'block' }}>{accessReqErr[key]}</span>}
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                    <button onClick={() => setShowAccessReq(false)} style={{ flex: 1, padding: 11, borderRadius: 8, border: '1px solid rgba(26,22,18,0.15)', background: 'none', fontSize: 13, color: 'rgba(26,22,18,0.5)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Cancel</button>
                    <button
                      onClick={handleAccessReqSubmit} disabled={accessReqSending}
                      style={{ flex: 2, padding: 11, borderRadius: 8, border: 'none', background: accessReqSending ? 'rgba(122,140,110,0.4)' : ACCENT, color: '#fff', fontSize: 13, fontWeight: 500, cursor: accessReqSending ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)', transition: 'background 0.18s' }}
                    >
                      {accessReqSending ? 'Sending…' : 'Send Request'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

}
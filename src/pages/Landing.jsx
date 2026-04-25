// src/pages/Landing.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate }                  from 'react-router-dom';
import { useAuth }                      from '../context/AuthContext';
import { chatAPI }                      from '../api/client';
import qalaLogo from '../assets/qala-logo.png';
import g1 from '../assets/garment-1.jpg';
import g2 from '../assets/garment-2.jpg';
import g3 from '../assets/garment-3.jpg';
import g4 from '../assets/garment-4.jpg';
import g5 from '../assets/garment-5.jpg';

const CHAT_SESSION_KEY   = 'qala_chat_session_id';
const LANDING_FIRST_MSG  = 'qala_landing_first_msg';
const LANDING_FIRST_IMG  = 'qala_landing_first_img';
const LANDING_FIRST_MIME = 'qala_landing_first_mime';
const ACCENT = '#7A8C6E';

const GARMENTS = [
  { key: 'g1', src: g1, hideInPhase2: false, style: { top: '2vh',    left: '0vw',  width: 'clamp(220px,27vw,370px)', transform: 'rotate(-6deg)' } },
  { key: 'g2', src: g2, hideInPhase2: true,  style: { top: '1vh',    left: '50%',  width: 'clamp(120px,13vw,190px)', transform: 'translateX(-50%) rotate(4deg)' } },
  { key: 'g3', src: g3, hideInPhase2: false, style: { top: '1vh',    right: '0vw', width: 'clamp(210px,25vw,340px)', transform: 'rotate(3deg)' } },
  { key: 'g4', src: g4, hideInPhase2: false, style: { bottom: '2vh', left: '0vw',  width: 'clamp(200px,24vw,330px)', transform: 'rotate(5deg)' } },
  { key: 'g5', src: g5, hideInPhase2: false, style: { bottom: '1vh', right: '0vw', width: 'clamp(190px,22vw,310px)', transform: 'rotate(-4deg)' } },
];

export default function Landing() {
  const { user, loginWithAccessKey } = useAuth();
  const navigate = useNavigate();

  const [phase,      setPhase]      = useState('key');
  const [visible,    setVisible]    = useState(false);
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

  useEffect(() => {
    if (!user) return;
    if (user.role === 'admin')    { navigate('/admin');     return; }
    if (user.role === 'seller')   { navigate('/dashboard'); return; }
    if (user.role === 'customer') { setPhase('message'); }
  }, [user]);

  async function handleKeySubmit() {
    if (!accessKey.trim() || starting) return;
    setStarting(true); setKeyError('');
    try {
      const res  = await chatAPI.start(accessKey.trim());
      const data = res.data;
      const id   = data.session?.session_id;
      setSessionId(id);
      sessionStorage.setItem(CHAT_SESSION_KEY, id);
      if (data.access_token && data.user) loginWithAccessKey(data.access_token, data.user);
      setTransition(true);
      setTimeout(() => { setPhase('message'); setTransition(false); }, 320);
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

  const canSendKey = accessKey.trim() && !starting;
  const canSendMsg = (message.trim() || pendingImg) && !sending;

  return (
    <div style={{
      minHeight: '100vh', background: '#FFFFFF',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
      fontFamily: 'var(--font-body)',
    }}>
      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes shake {
          0%,100%{ transform:translateX(0) }
          20%{ transform:translateX(-7px) }
          40%{ transform:translateX(7px)  }
          60%{ transform:translateX(-5px) }
          80%{ transform:translateX(5px)  }
        }
        .land-garment {
          pointer-events:none; user-select:none;
          object-fit:contain; position:absolute; z-index:0;
        }
        @media(max-width:700px){
          .land-garment{ opacity:0.25!important; width:clamp(70px,18vw,110px)!important; }
        }
      `}</style>

      {/* Garment decorations */}
      {GARMENTS.map(g => (
        <img
          key={g.key}
          src={g.src}
          alt=""
          className="land-garment"
          style={{
            ...g.style,
            opacity: g.hideInPhase2 && phase === 'message' ? 0 : 1,
            transition: 'opacity 0.4s ease',
          }}
          onError={e => { e.currentTarget.style.display = 'none'; }}
        />
      ))}

      {/* Centre card */}
      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: phase === 'message' ? 720 : 520,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '0 20px',
        transition: 'max-width 0.3s ease',
        ...fadeIn,
      }}>

        {/* ── PHASE 1 — KEY ── */}
        {phase === 'key' && (
          <>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 400, color: '#1A1612',
              textAlign: 'center', lineHeight: 1.28,
              marginBottom: 28, letterSpacing: '-0.01em',
            }}>
              <span style={{ display: 'block', fontSize: 'clamp(26px,3.8vw,38px)', whiteSpace: 'nowrap' }}>The Custom Manufacturing Platform</span>
              <span style={{ display: 'block', fontSize: 'clamp(22px,3.2vw,32px)', whiteSpace: 'nowrap', color: 'rgba(26,22,18,0.7)' }}>for Brands &amp; Retailers</span>
            </h1>

            <div style={{
              width: '100%',
              border: `1.5px solid ${keyError ? '#C94040' : 'rgba(122,140,110,0.5)'}`,
              borderRadius: 14, background: '#F9F9F8',
              display: 'flex', alignItems: 'center',
              padding: '6px 6px 6px 18px', gap: 8,
              animation: keyShake ? 'shake 0.5s ease' : 'none',
              transition: 'border-color 0.2s',
              boxSizing: 'border-box',
            }}>
              <input
                type="text"
                value={accessKey}
                onChange={e => { setAccessKey(e.target.value); setKeyError(''); }}
                onKeyDown={handleKeyDown}
                placeholder="Enter your access code"
                autoFocus
                style={{
                  flex: 1, border: 'none', background: 'transparent',
                  fontSize: 14, color: '#1A1612',
                  fontFamily: 'var(--font-body)', outline: 'none',
                  padding: '9px 0', letterSpacing: '0.02em',
                }}
              />
              <button
                onClick={handleKeySubmit}
                disabled={!canSendKey}
                style={{
                  width: 40, height: 40, borderRadius: 10, border: 'none',
                  background: canSendKey ? ACCENT : 'rgba(122,140,110,0.25)',
                  cursor: canSendKey ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, transition: 'background 0.18s',
                }}
              >
                {starting
                  ? <div style={{ width:14,height:14,border:'2px solid rgba(255,255,255,0.35)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin 0.7s linear infinite' }} />
                  : <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                }
              </button>
            </div>

            {keyError && (
              <p style={{ fontSize:12, color:'#C94040', marginTop:8, textAlign:'center' }}>{keyError}</p>
            )}

            <button
              onClick={() => { setShowAccessReq(true); setAccessReqDone(false); setAccessReqErr({}); setAccessReqForm({ name:'', email:'', link:'' }); }}
              style={{
                marginTop: 14, fontSize: 12,
                color: 'rgba(26,22,18,0.38)',
                background: 'none', border: 'none', padding: 0,
                borderBottom: '1px solid rgba(26,22,18,0.12)',
                paddingBottom: 1, cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => { e.target.style.color = 'rgba(26,22,18,0.65)'; }}
              onMouseLeave={e => { e.target.style.color = 'rgba(26,22,18,0.38)'; }}
            >
              Request Access code
            </button>
          </>
        )}

        {/* ── PHASE 2 — FIRST MESSAGE ── */}
        {phase === 'message' && (
          <>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(18px,2.6vw,28px)',
              fontWeight: 400, color: '#1A1612',
              textAlign: 'center', lineHeight: 1.22,
              whiteSpace: 'nowrap',
              marginBottom: 12, letterSpacing: '-0.01em',
            }}>
              What Do You Want To Make?
            </h1>

            <p style={{
              fontSize: 13.5, color: 'rgba(26,22,18,0.52)',
              textAlign: 'center', lineHeight: 1.68,
              marginBottom: 26, maxWidth: 560,
            }}>
              Share your ideas with us. We&rsquo;ll help you shape them into a clear brief and introduce
              you to production studios best suited to bring your vision to life.
            </p>

            <div style={{
              width: '100%',
              border: '1px solid rgba(26,22,18,0.1)',
              borderRadius: 14, background: '#F9F9F8',
              padding: '16px 16px 10px',
              boxSizing: 'border-box',
              boxShadow: '0 2px 20px rgba(26,22,18,0.05)',
            }}>
              <div style={{ width:28, height:3, background: ACCENT, borderRadius:2, marginBottom:12 }} />

              {pendingImg && (
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                  <img
                    src={`data:${pendingImg.mime};base64,${pendingImg.data}`}
                    alt=""
                    style={{ height:48, borderRadius:6, border:'1px solid rgba(26,22,18,0.1)' }}
                  />
                  <button onClick={() => setPendingImg(null)} style={{ fontSize:11, color:'rgba(26,22,18,0.4)', background:'none', border:'none', cursor:'pointer' }}>
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
                  e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
                }}
                onKeyDown={handleKeyDown}
                placeholder={"Eg: I'm launching my brand with an 8-piece collection. Mix of linen and cotton, some with block printing. Can you help me build out the specs for each piece?\n\nFeel free to attach any references if you wish."}
                rows={4}
                autoFocus
                style={{
                  width:'100%', border:'none', background:'transparent',
                  fontSize:13, color:'#1A1612', lineHeight:1.65,
                  fontFamily:'var(--font-body)', resize:'none', outline:'none',
                  minHeight:80, maxHeight:160, scrollbarWidth:'none',
                }}
              />

              <div style={{
                display:'flex', alignItems:'center', justifyContent:'space-between',
                marginTop:10, paddingTop:10,
                borderTop:'1px solid rgba(26,22,18,0.07)',
              }}>
                <button
                  onClick={() => fileRef.current?.click()}
                  style={{
                    display:'flex', alignItems:'center', gap:6,
                    fontSize:12, color:'rgba(26,22,18,0.42)',
                    background:'none', border:'none', cursor:'pointer',
                    fontFamily:'var(--font-body)', padding:'4px 0',
                    transition:'color 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'rgba(26,22,18,0.75)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'rgba(26,22,18,0.42)'; }}
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
                    width:36, height:36, borderRadius:9, border:'none',
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

            <div style={{ marginTop:26, opacity:0.3 }}>
              <img src={qalaLogo} alt="Qala" style={{ height:15, width:'auto' }} />
            </div>
          </>
        )}
      </div>

      {/* ── Request Access modal — inside the root div ── */}
      {showAccessReq && (
        <>
          <div
            onClick={() => setShowAccessReq(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 400,
              background: 'rgba(26,22,18,0.45)',
              backdropFilter: 'blur(4px)',
            }}
          />
          <div style={{
            position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)',
            zIndex: 401,
            background: '#FFFFFF',
            border: '1px solid rgba(26,22,18,0.1)',
            borderRadius: 18,
            padding: '32px 28px 26px',
            width: 'min(420px, 92vw)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
          }}>
            {accessReqDone ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 36, marginBottom: 14 }}>&#10003;</div>
                <p style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 20, fontWeight: 500, color: '#1A1612', marginBottom: 8,
                }}>
                  Request received
                </p>
                <p style={{ fontSize: 13.5, color: 'rgba(26,22,18,0.55)', lineHeight: 1.6 }}>
                  We'll be in touch shortly.
                </p>
                <button
                  onClick={() => setShowAccessReq(false)}
                  style={{
                    marginTop: 22, padding: '10px 28px',
                    borderRadius: 8, border: '1px solid rgba(26,22,18,0.15)',
                    background: 'none', fontSize: 13, cursor: 'pointer',
                    fontFamily: 'var(--font-body)', color: '#1A1612',
                  }}
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <p style={{
                  margin: '0 0 5px', fontSize: 20, fontWeight: 500,
                  color: '#1A1612', fontFamily: 'var(--font-display)',
                }}>
                  Request Access
                </p>
                <p style={{ margin: '0 0 22px', fontSize: 13, color: 'rgba(26,22,18,0.5)', lineHeight: 1.55 }}>
                  Tell us a bit about yourself and we'll send you an access code.
                </p>

                {[
                  { key: 'name',  label: 'Name',                 placeholder: 'Your name',                           required: true  },
                  { key: 'email', label: 'Email',                placeholder: 'you@yourbrand.com',                   required: true  },
                  { key: 'link',  label: 'Website / Instagram',  placeholder: 'https://yourbrand.com or @yourbrand', required: false },
                ].map(({ key, label, placeholder, required }) => (
                  <div key={key} style={{ marginBottom: 14 }}>
                    <label style={{
                      fontSize: 11, fontWeight: 600, color: 'rgba(26,22,18,0.5)',
                      display: 'block', marginBottom: 5,
                      letterSpacing: '0.05em', textTransform: 'uppercase',
                    }}>
                      {label}{required && <span style={{ color: ACCENT, marginLeft: 2 }}>*</span>}
                    </label>
                    <input
                      type={key === 'email' ? 'email' : 'text'}
                      value={accessReqForm[key]}
                      onChange={e => { setAccessReqForm(f => ({ ...f, [key]: e.target.value })); setAccessReqErr(er => ({ ...er, [key]: '' })); }}
                      placeholder={placeholder}
                      style={{
                        width: '100%', padding: '10px 13px', boxSizing: 'border-box',
                        border: `1px solid ${accessReqErr[key] ? '#C94040' : 'rgba(26,22,18,0.15)'}`,
                        borderRadius: 9, background: '#F9F9F8',
                        fontSize: 14, color: '#1A1612',
                        fontFamily: 'var(--font-body)', outline: 'none',
                        transition: 'border-color 0.15s',
                      }}
                      onFocus={e  => { e.target.style.borderColor = ACCENT; }}
                      onBlur={e   => { e.target.style.borderColor = accessReqErr[key] ? '#C94040' : 'rgba(26,22,18,0.15)'; }}
                    />
                    {accessReqErr[key] && (
                      <span style={{ fontSize: 11, color: '#C94040', marginTop: 3, display: 'block' }}>
                        {accessReqErr[key]}
                      </span>
                    )}
                  </div>
                ))}

                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <button
                    onClick={() => setShowAccessReq(false)}
                    style={{
                      flex: 1, padding: '11px', borderRadius: 8,
                      border: '1px solid rgba(26,22,18,0.15)', background: 'none',
                      fontSize: 13, color: 'rgba(26,22,18,0.5)', cursor: 'pointer',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAccessReqSubmit}
                    disabled={accessReqSending}
                    style={{
                      flex: 2, padding: '11px', borderRadius: 8, border: 'none',
                      background: accessReqSending ? 'rgba(122,140,110,0.4)' : ACCENT,
                      color: '#fff', fontSize: 13, fontWeight: 500,
                      cursor: accessReqSending ? 'not-allowed' : 'pointer',
                      fontFamily: 'var(--font-body)', transition: 'background 0.18s',
                    }}
                  >
                    {accessReqSending ? 'Sending\u2026' : 'Send Request'}
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
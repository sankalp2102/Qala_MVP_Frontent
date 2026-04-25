// src/components/discovery/Brief.jsx
import { useState, useEffect } from 'react';
import { discoveryAPI, chatAPI } from '../../api/client';

const SAGE = '#7A8C6E';

function parseFields(text) {
  return text
    .split('\n')
    .filter(l => l.trim())
    .map(l => {
      const idx = l.indexOf(':');
      if (idx === -1) return null;
      return { key: l.slice(0, idx).trim(), val: l.slice(idx + 1).trim() };
    })
    .filter(Boolean)
    .filter(f => f.val);
}

function parseBrief(text) {
  const pieces = [];
  const re = /PIECE:\s*([^\n]+)\n([\s\S]*?)PIECE_END/g;
  let overviewText = text;
  let m;
  while ((m = re.exec(text)) !== null) {
    pieces.push({ name: m[1].trim(), fields: parseFields(m[2]) });
    overviewText = overviewText.replace(m[0], '');
  }
  overviewText = overviewText.replace(/BRIEF_START|BRIEF_END/g, '').trim();
  return { overview: parseFields(overviewText), pieces };
}

function FieldRows({ fields }) {
  if (!fields?.length) return null;
  return (
    <div>
      {fields.map((f, i) => (
        <div key={i} style={{
          display: 'flex', gap: 16,
          padding: '9px 18px',
          borderBottom: '0.5px solid var(--border)',
          alignItems: 'flex-start',
        }}>
          <span style={{
            fontSize: 11, fontWeight: 600, color: 'var(--text3)',
            letterSpacing: '0.06em', textTransform: 'uppercase',
            minWidth: 100, flexShrink: 0, paddingTop: 1,
            fontFamily: 'var(--font-body)',
          }}>
            {f.key}
          </span>
          <span style={{
            fontSize: 13, color: 'var(--text)',
            fontFamily: 'var(--font-body)', lineHeight: 1.5,
          }}>
            {f.val}
          </span>
        </div>
      ))}
    </div>
  );
}

const LOADING_MESSAGES = [
  'Scanning studios\u2026',
  'Matching your brief\u2026',
  'Checking availability\u2026',
  'Loading your results\u2026',
];

export default function Brief({ rawText, sessionToken, sessionId, onAdjust, onMatchComplete, highlightFindStudios }) {
  const [tab, setTab] = useState(0);

  const { overview, pieces } = parseBrief(rawText);
  const hasPieces = pieces.length > 0;
  const tabs = hasPieces ? ['Overview', ...pieces.map(p => p.name)] : null;
  const currentFields = hasPieces ? (tab === 0 ? overview : pieces[tab - 1].fields) : overview;

  const colField = overview.find(f => /collection|garment/i.test(f.key));
  const subtitle = [colField?.val, hasPieces ? `${pieces.length} pieces` : null, 'Ready for matching']
    .filter(Boolean).join(' \u00b7 ');

  // ── State ──────────────────────────────────────────────────────────────────
  const [matching,      setMatching]      = useState(false);
  const [matchError,    setMatchError]    = useState('');
  const [loadingStep,   setLoadingStep]   = useState(0);
  const [pulse,         setPulse]         = useState(false);
  const [showContact,   setShowContact]   = useState(false);
  const [contactForm,   setContactForm]   = useState({ name: '', email: '', phone: '', brand: '', country: '' });
  const [contactErr,    setContactErr]    = useState({});
  const [savingContact, setSavingContact] = useState(false);

  useEffect(() => {
    if (highlightFindStudios) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 2000);
      return () => clearTimeout(t);
    }
  }, [highlightFindStudios]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleContactChange(field, val) {
    setContactForm(f => ({ ...f, [field]: val }));
    setContactErr(e => ({ ...e, [field]: '' }));
  }

  async function proceedToMatch() {
    setShowContact(false);
    setMatching(true);
    setMatchError('');
    setLoadingStep(0);

    const msgInterval = setInterval(() => {
      setLoadingStep(s => Math.min(s + 1, LOADING_MESSAGES.length - 1));
    }, 600);

    try {
      // Minimum visible loading time — just long enough to feel intentional
      const minWait   = new Promise(r => setTimeout(r, 1200));
      const matchCall = chatAPI.match(sessionId);
      const [, matchRes] = await Promise.all([minWait, matchCall]);
      const data = matchRes.data;

      if (data.session_token) {
        discoveryAPI.saveSession(data.session_token);
        // Reveal immediately — image preload happens in the background via
        // handleMatchComplete in DiscoverV2, so the user isn't blocked.
        setMatching(false);
        onMatchComplete?.(data.session_token);
      } else {
        setMatchError('No studios found. Try adjusting the brief.');
        setMatching(false);
      }
    } catch (err) {
      setMatchError(err.response?.data?.error || 'Something went wrong. Please try again.');
      setMatching(false);
    } finally {
      clearInterval(msgInterval);
    }
  }

  async function handleContactSubmit() {
    const errs = {};
    if (!contactForm.name.trim())  errs.name  = 'Required';
    if (!contactForm.email.trim()) errs.email = 'Required';
    else if (!/^[^@]+@[^@]+\.[^@]+$/.test(contactForm.email)) errs.email = 'Invalid email';
    if (Object.keys(errs).length) { setContactErr(errs); return; }

    setSavingContact(true);
    try {
      await chatAPI.saveContact(sessionId, {
        name:    contactForm.name.trim(),
        email:   contactForm.email.trim(),
        phone:   contactForm.phone.trim(),
        brand:   contactForm.brand.trim(),
        country: contactForm.country.trim(),
      });
    } catch { /* non-fatal */ }
    finally { setSavingContact(false); }
    proceedToMatch();
  }

  function handleFindStudios() {
    if (!sessionId) return;
    setShowContact(true);
    setContactErr({});
  }

  function handleAdjust() {
    onAdjust?.("I'd like to change something in the brief");
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{
      border: '1px solid var(--border2)',
      borderRadius: 12,
      overflow: 'hidden',
      marginTop: 10,
      maxWidth: 420,
      width: '100%',
      position: 'relative',
    }}>

      {/* Dark header */}
      <div style={{ background: '#111', padding: '14px 18px' }}>
        <p style={{
          margin: 0, fontSize: 10, fontWeight: 600,
          letterSpacing: '0.12em', color: '#fff',
          textTransform: 'uppercase', fontFamily: 'var(--font-body)',
        }}>
          Production Brief
        </p>
        <p style={{ margin: '3px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.45)', fontFamily: 'var(--font-body)' }}>
          {subtitle}
        </p>
      </div>

      {/* Tabs (multi-piece only) */}
      {hasPieces && (
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', overflowX: 'auto', background: 'var(--surface)' }}>
          {tabs.map((t, i) => (
            <button key={i} onClick={() => setTab(i)} style={{
              padding: '10px 15px', fontSize: 12, whiteSpace: 'nowrap',
              border: 'none', borderBottom: `2px solid ${tab === i ? SAGE : 'transparent'}`,
              background: 'none', color: tab === i ? SAGE : 'var(--text3)',
              cursor: 'pointer', fontFamily: 'var(--font-body)',
              fontWeight: tab === i ? 500 : 400, transition: 'color 0.15s',
            }}>
              {t}
            </button>
          ))}
        </div>
      )}

      {/* Field rows */}
      <div style={{ background: 'var(--surface)' }}>
        <FieldRows fields={currentFields} />
      </div>

      {/* Loading overlay */}
      {matching && (
        <div style={{
          position: 'absolute', inset: 0, background: '#111', borderRadius: 12,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 20, zIndex: 10,
        }}>
          <style>{`
            @keyframes briefSpin { to { transform: rotate(360deg); } }
            @keyframes briefFadeMsg { 0%,100%{opacity:0.4} 50%{opacity:1} }
          `}</style>
          <div style={{
            width: 36, height: 36,
            border: '2px solid rgba(255,255,255,0.1)', borderTopColor: SAGE,
            borderRadius: '50%', animation: 'briefSpin 0.9s linear infinite',
          }} />
          <p style={{
            margin: 0, fontSize: 13, fontWeight: 500,
            color: 'rgba(255,255,255,0.75)', fontFamily: 'var(--font-body)',
            letterSpacing: '0.02em', animation: 'briefFadeMsg 1.4s ease-in-out infinite',
          }}>
            {LOADING_MESSAGES[loadingStep]}
          </p>
          <div style={{ display: 'flex', gap: 6 }}>
            {LOADING_MESSAGES.map((_, i) => (
              <div key={i} style={{
                width: 5, height: 5, borderRadius: '50%',
                background: i === loadingStep ? SAGE : 'rgba(255,255,255,0.15)',
                transition: 'background 0.3s',
              }} />
            ))}
          </div>
        </div>
      )}

      {/* Match error */}
      {matchError && (
        <p style={{
          fontSize: 12, color: 'var(--red)', padding: '8px 18px 0',
          margin: 0, background: 'var(--surface)', fontFamily: 'var(--font-body)',
        }}>
          {matchError}
        </p>
      )}

      {/* CTAs */}
      <div style={{
        display: 'flex', gap: 8, padding: '12px 18px',
        background: 'var(--surface)', borderTop: '1px solid var(--border)',
      }}>
        <button
          onClick={handleFindStudios}
          disabled={matching}
          style={{
            flex: 1, padding: '11px', borderRadius: 8, border: 'none',
            background: SAGE, color: '#fff', fontSize: 13, fontWeight: 500,
            cursor: matching ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-body)',
            transition: 'opacity 0.15s, box-shadow 0.15s',
            boxShadow: pulse ? '0 0 0 4px rgba(196,86,58,0.35), 0 0 0 8px rgba(196,86,58,0.15)' : 'none',
            animation: pulse ? 'briefPulse 0.5s ease-in-out 3' : 'none',
          }}
          onMouseEnter={e => { if (!matching) e.currentTarget.style.opacity = '0.88'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
        >
          <style>{`@keyframes briefPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.03)} }`}</style>
          Find Studios →
        </button>
        <button
          onClick={handleAdjust}
          disabled={matching}
          style={{
            flex: 1, padding: '11px', borderRadius: 8,
            border: '1px solid var(--border2)', background: 'none',
            color: 'var(--text)', fontSize: 13,
            cursor: matching ? 'not-allowed' : 'pointer',
            opacity: matching ? 0.4 : 1,
            fontFamily: 'var(--font-body)',
            transition: 'background 0.15s, opacity 0.15s',
          }}
          onMouseEnter={e => { if (!matching) e.currentTarget.style.background = 'var(--surface2)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
        >
          Adjust Brief
        </button>
      </div>

      {/* Contact form modal — fixed overlay */}
      {showContact && (
        <>
          <div
            onClick={() => { setShowContact(false); proceedToMatch(); }}
            style={{
              position: 'fixed', inset: 0, zIndex: 200,
              background: 'rgba(26,22,18,0.5)',
              backdropFilter: 'blur(3px)',
            }}
          />
          <div style={{
            position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)',
            zIndex: 201,
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: '26px 24px 20px',
            width: 'min(400px, 92vw)',
            boxShadow: '0 16px 56px rgba(0,0,0,0.22)',
            maxHeight: '90vh', overflowY: 'auto',
          }}>
            <p style={{
              fontSize: 17, fontWeight: 600, color: 'var(--text)',
              fontFamily: 'var(--font-display)', margin: '0 0 5px',
            }}>
              While we find studios for your vision
            </p>
            <p style={{ fontSize: 12.5, color: 'var(--text3)', marginBottom: 18, lineHeight: 1.55 }}>
              Please let us know your contact details.
            </p>

            {[
              { key: 'name',    label: 'Full Name',       placeholder: 'Your name',        required: true  },
              { key: 'email',   label: 'Email ID',        placeholder: 'you@brand.com',     required: true  },
              { key: 'phone',   label: 'Phone No',        placeholder: '+91 98765 43210',   required: false },
              { key: 'brand',   label: 'Brand / Company', placeholder: 'Your brand name',   required: false },
              { key: 'country', label: 'Country',         placeholder: 'India, USA, UK…', required: false },
            ].map(({ key, label, placeholder, required }) => (
              <div key={key} style={{ marginBottom: 12 }}>
                <label style={{
                  fontSize: 11, fontWeight: 600, color: 'var(--text3)',
                  display: 'block', marginBottom: 4, letterSpacing: '0.04em',
                }}>
                  {label}{required && <span style={{ color: SAGE, marginLeft: 2 }}>*</span>}
                </label>
                <input
                  type={key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text'}
                  value={contactForm[key]}
                  onChange={e => handleContactChange(key, e.target.value)}
                  placeholder={placeholder}
                  style={{
                    width: '100%', padding: '9px 12px', boxSizing: 'border-box',
                    border: `1px solid ${contactErr[key] ? '#C94040' : 'var(--border)'}`,
                    borderRadius: 8, background: 'var(--surface2)',
                    fontSize: 13, color: 'var(--text)',
                    fontFamily: 'var(--font-body)', outline: 'none',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e  => { e.target.style.borderColor = SAGE; }}
                  onBlur={e   => { e.target.style.borderColor = contactErr[key] ? '#C94040' : 'var(--border)'; }}
                />
                {contactErr[key] && (
                  <span style={{ fontSize: 11, color: '#C94040', marginTop: 3, display: 'block' }}>
                    {contactErr[key]}
                  </span>
                )}
              </div>
            ))}

            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
              <button
                onClick={() => { setShowContact(false); proceedToMatch(); }}
                disabled={savingContact}
                style={{
                  flex: 1, padding: '10px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'none',
                  fontSize: 12.5, color: 'var(--text3)', cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                }}
              >
                Skip →
              </button>
              <button
                onClick={handleContactSubmit}
                disabled={savingContact}
                style={{
                  flex: 2, padding: '10px', borderRadius: 8,
                  border: 'none', background: SAGE, color: '#fff',
                  fontSize: 13, fontWeight: 500,
                  cursor: savingContact ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-body)',
                  opacity: savingContact ? 0.7 : 1,
                  transition: 'opacity 0.15s',
                }}
              >
                {savingContact ? 'Saving…' : 'Find Studios →'}
              </button>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
// src/components/discovery/Brief.jsx
//
// Matching itself — firing chatAPI.match, polling for recommendations, and
// the progress animation while that happens — moved OUT of this card and
// into DiscoverV2.jsx's handleMatchComplete (Oct 2026). Reasons: (1) the
// progress indicator needed to look like an actual message FROM Qalawati in
// the chat thread, not a box stuck inside this card; (2) the old flow had
// two back-to-back waits — this card's own ~4.2s checklist, THEN a second,
// separate recommendations-poll in DiscoverV2 after this card's modal had
// already closed — which is exactly the "animation ends, then still nothing
// for several seconds" gap that was reported. Now there's one wait, driven
// by the real request, and the animation only ends once results are truly
// in hand. This card's job is just: show the brief, collect contact details
// if needed, then hand off via onMatchComplete(sessionId).
import { useState, useEffect } from 'react';
import { chatAPI, authTokens } from '../../api/client';

const SAGE = 'var(--sage)';

function parseFields(text) {
  return text.split('\n').filter(l => l.trim()).map(l => {
    const idx = l.indexOf(':');
    if (idx === -1) return null;
    return { key: l.slice(0, idx).trim(), val: l.slice(idx + 1).trim() };
  }).filter(Boolean).filter(f => f.val);
}

function parseBrief(text) {
  // Flatten all PIECE blocks — no tabs, everything shown in one list
  let flat = text;
  const re = /PIECE:\s*([^\n]+)\n([\s\S]*?)PIECE_END/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    flat = flat.replace(m[0], `\nPiece: ${m[1].trim()}\n` + m[2]);
  }
  flat = flat.replace(/BRIEF_START|BRIEF_END/g, '').trim();
  return { fields: parseFields(flat) };
}

function FieldRows({ fields }) {
  if (!fields?.length) return null;
  return (
    <div>
      {fields.map((f, i) => (
        <div key={i} style={{
          display: 'flex', gap: 16, padding: '9px 18px',
          borderBottom: '0.5px solid var(--border)', alignItems: 'flex-start',
        }}>
          <span style={{
            fontSize: 11, fontWeight: 600, color: 'var(--text3)',
            letterSpacing: '0.06em', textTransform: 'uppercase',
            minWidth: 100, flexShrink: 0, paddingTop: 1,
            fontFamily: 'var(--font-body)',
          }}>{f.key}</span>
          <span style={{
            fontSize: 13, color: 'var(--text)',
            fontFamily: 'var(--font-body)', lineHeight: 1.5,
          }}>{f.val}</span>
        </div>
      ))}
    </div>
  );
}

export default function Brief({ rawText, sessionToken, sessionId, onAdjust, onMatchComplete, highlightFindStudios, referenceImages, skipContactForm }) {
  const { fields } = parseBrief(rawText);
  const colField = fields.find(f => /collection|garment/i.test(f.key));
  const subtitle = [colField?.val, 'Ready for matching'].filter(Boolean).join(' · ');

  // ── State ──────────────────────────────────────────────────────────────────
  const [pulse,           setPulse]           = useState(false);
  const [showContact,     setShowContact]     = useState(false);
  const [contactForm,     setContactForm]     = useState({ name: '', email: '', phone: '' });
  const [contactErr,      setContactErr]      = useState({});
  const [savingContact,   setSavingContact]   = useState(false);
  // Guards against a double-click firing onMatchComplete twice — the real
  // progress indicator now lives in the chat thread, not on this button, so
  // this card has nothing else to show while matching is in flight.
  const [triggered,       setTriggered]       = useState(false);

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

  function handleFindStudios() {
    if (!sessionId || triggered) return;

    if (skipContactForm) {
      // Contact details already on file — skip the form, hand off straight away.
      setTriggered(true);
      onMatchComplete?.(sessionId);
      return;
    }

    setContactForm({ name: '', email: '', phone: '' });
    setContactErr({});
    setShowContact(true);
  }

  async function handleContactSubmit() {
    const errs = {};
    if (!contactForm.name.trim())  errs.name  = 'Required';
    if (!contactForm.email.trim()) errs.email = 'Required';
    else if (!/^[^@]+@[^@]+\.[^@]+$/.test(contactForm.email)) errs.email = 'Invalid email';
    if (Object.keys(errs).length) { setContactErr(errs); return; }

    setSavingContact(true);
    try {
      const r = await chatAPI.saveContact(sessionId, {
        name:  contactForm.name.trim(),
        email: contactForm.email.trim(),
        phone: contactForm.phone.trim(),
      });
      // Backend silently created + logged in a buyer account for this
      // email the moment they submitted contact details (see
      // discovery/chat_views.py::ChatContactView / _auto_create_buyer_account).
      // Adopt the session immediately so they land on their dashboard
      // already authenticated instead of hitting a login screen.
      if (r?.data?.auth_token) {
        authTokens.setAccessKeySession(r.data.auth_token);
      }
      // Persist so the form is skipped on future visits with same key
      localStorage.setItem('qala_has_contact', 'true');
    } catch { /* non-fatal */ }
    finally { setSavingContact(false); }
    setShowContact(false);
    setTriggered(true);
    onMatchComplete?.(sessionId);
  }

  function handleAdjust() {
    onAdjust?.("I'd like to change something in the brief");
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{
      border: '1px solid var(--border2)',
      borderRadius: 'var(--r-lg)', overflow: 'hidden',
      marginTop: 10, maxWidth: 420, width: '100%',
      position: 'relative',
    }}>
      {/* Dark header */}
      <div style={{ background: '#111', padding: '14px 18px' }}>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', color: '#fff', textTransform: 'uppercase', fontFamily: 'var(--font-body)' }}>
          Your Making Brief
        </p>
        <p style={{ margin: '3px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.45)', fontFamily: 'var(--font-body)' }}>
          {subtitle}
        </p>
      </div>

      {/* Fields — flat list, no tabs */}
      <div style={{ background: 'var(--surface)' }}>
        <FieldRows fields={fields} />
      </div>

      {/* Reference images — moodboard / sketches / samples shared in chat */}
      {referenceImages?.length > 0 && (
        <div style={{
          background: 'var(--surface)', borderTop: '0.5px solid var(--border)',
          padding: '10px 18px 12px',
        }}>
          <p style={{
            fontSize: 10, fontWeight: 600, color: 'var(--text3)',
            letterSpacing: '0.08em', textTransform: 'uppercase',
            margin: '0 0 8px', fontFamily: 'var(--font-body)',
          }}>
            References
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {referenceImages.map((img, i) => (
              <img
                key={i}
                src={`data:${img.mime || 'image/jpeg'};base64,${img.data}`}
                alt={`Reference ${i + 1}`}
                style={{
                  height: 72, width: 72,
                  objectFit: 'cover',
                  borderRadius: 'var(--r-8)',
                  border: '0.5px solid var(--border)',
                  flexShrink: 0,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* CTAs */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 18px', background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
        <button
          onClick={handleFindStudios}
          disabled={triggered}
          style={{
            flex: 1, padding: '11px', borderRadius: 'var(--r-8)', border: 'none',
            background: SAGE, color: '#fff', fontSize: 13, fontWeight: 500,
            cursor: triggered ? 'not-allowed' : 'pointer',
            opacity: triggered ? 0.6 : 1,
            fontFamily: 'var(--font-body)', transition: 'opacity 0.15s, box-shadow 0.15s',
            boxShadow: pulse ? '0 0 0 4px rgba(122,140,110,0.35),0 0 0 8px rgba(122,140,110,0.15)' : 'none',
            animation: pulse ? 'briefPulse 0.5s ease-in-out 3' : 'none',
          }}
          onMouseEnter={e => { if (!triggered) e.currentTarget.style.opacity = '0.88'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = triggered ? '0.6' : '1'; }}
        >
          <style>{`@keyframes briefPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.03)}}`}</style>
          {triggered ? 'Finding your studio…' : 'Find my studio →'}
        </button>
        <button
          onClick={handleAdjust}
          disabled={triggered}
          style={{
            flex: 1, padding: '11px', borderRadius: 'var(--r-8)',
            border: '1px solid var(--border2)', background: 'none',
            color: 'var(--text)', fontSize: 13,
            cursor: triggered ? 'not-allowed' : 'pointer',
            opacity: triggered ? 0.4 : 1,
            fontFamily: 'var(--font-body)', transition: 'background 0.15s, opacity 0.15s',
          }}
          onMouseEnter={e => { if (!triggered) e.currentTarget.style.background = 'var(--surface2)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
        >
          Adjust Brief
        </button>
      </div>

      {/* Contact form modal — collects details, then hands off to
          DiscoverV2.jsx's handleMatchComplete, which now owns the whole
          match+poll sequence and shows its own progress as a chat message. */}
      {showContact && (
        <>
          <div
            onClick={() => setShowContact(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 200,
              background: 'rgba(26,22,18,0.5)', backdropFilter: 'blur(3px)',
            }}
          />
          <div style={{
            position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)',
            zIndex: 201, background: 'var(--bg)',
            border: '1px solid var(--border)', borderRadius: 'var(--r-16)',
            padding: '26px 24px 20px',
            width: 'min(400px, 92vw)',
            boxShadow: '0 16px 56px rgba(0,0,0,0.22)',
            maxHeight: '90vh', overflowY: 'auto',
          }}>
            <p style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-display)', margin: '0 0 5px' }}>
              While we look for the right studios
            </p>
            <p style={{ fontSize: 12.5, color: 'var(--text3)', marginBottom: 18, lineHeight: 1.55 }}>
              Please let us know your contact details to get started.
            </p>

            {[
              { key: 'name',  label: 'Name',    placeholder: 'Your name',       required: true  },
              { key: 'email', label: 'Email ID', placeholder: 'you@brand.com',   required: true  },
              { key: 'phone', label: 'Phone No', placeholder: '+91 98765 43210', required: false },
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
                    border: `1px solid ${contactErr[key] ? 'var(--red)' : 'var(--border)'}`,
                    borderRadius: 'var(--r-8)', background: 'var(--surface2)',
                    fontSize: 13, color: 'var(--text)',
                    fontFamily: 'var(--font-body)', outline: 'none',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e  => { e.target.style.borderColor = SAGE; }}
                  onBlur={e   => { e.target.style.borderColor = contactErr[key] ? 'var(--red)' : 'var(--border)'; }}
                />
                {contactErr[key] && (
                  <span style={{ fontSize: 11, color: 'var(--red)', marginTop: 3, display: 'block' }}>
                    {contactErr[key]}
                  </span>
                )}
              </div>
            ))}

            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
              <button
                onClick={handleContactSubmit}
                disabled={savingContact}
                style={{
                  flex: 1, padding: '10px', borderRadius: 'var(--r-8)',
                  border: 'none', background: SAGE, color: '#fff',
                  fontSize: 13, fontWeight: 500,
                  cursor: savingContact ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-body)',
                  opacity: savingContact ? 0.7 : 1, transition: 'opacity 0.15s',
                }}
              >
                {savingContact ? 'Saving…' : 'Show Studios →'}
              </button>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
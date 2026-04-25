// src/components/discovery/Brief.jsx
import { useState, useEffect } from 'react';
import { discoveryAPI, chatAPI } from '../../api/client';

const SAGE = '#7A8C6E';

function parseFields(text) {
  return text.split('\n').filter(l => l.trim()).map(l => {
    const idx = l.indexOf(':');
    if (idx === -1) return null;
    return { key: l.slice(0, idx).trim(), val: l.slice(idx + 1).trim() };
  }).filter(Boolean).filter(f => f.val);
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

const LOADING_MESSAGES = [
  'Scanning studios…',
  'Matching your brief…',
  'Checking availability…',
  'Loading your results…',
];

export default function Brief({ rawText, sessionToken, sessionId, onAdjust, onMatchComplete, highlightFindStudios }) {
  const [tab, setTab] = useState(0);

  const { overview, pieces } = parseBrief(rawText);
  const hasPieces = pieces.length > 0;
  const tabs = hasPieces ? ['Overview', ...pieces.map(p => p.name)] : null;
  const currentFields = hasPieces ? (tab === 0 ? overview : pieces[tab - 1].fields) : overview;
  const colField = overview.find(f => /collection|garment/i.test(f.key));
  const subtitle = [colField?.val, hasPieces ? `${pieces.length} pieces` : null, 'Ready for matching']
    .filter(Boolean).join(' · ');

  // ── State ──────────────────────────────────────────────────────────────────
  const [matching,        setMatching]        = useState(false);
  const [matchError,      setMatchError]      = useState('');
  const [loadingStep,     setLoadingStep]     = useState(0);
  const [pulse,           setPulse]           = useState(false);
  const [showContact,     setShowContact]     = useState(false);
  const [matchingInModal, setMatchingInModal] = useState(false);
  const [contactNotes,    setContactNotes]    = useState('');
  const [savingContact,   setSavingContact]   = useState(false);

  useEffect(() => {
    if (highlightFindStudios) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 2000);
      return () => clearTimeout(t);
    }
  }, [highlightFindStudios]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  async function proceedToMatch() {
    // Keep modal open — switch to loading state inside it
    setMatchingInModal(true);
    setMatchError('');
    setLoadingStep(0);

    const msgInterval = setInterval(() => {
      setLoadingStep(s => Math.min(s + 1, LOADING_MESSAGES.length - 1));
    }, 600);

    try {
      const minWait   = new Promise(r => setTimeout(r, 3200));
      const matchCall = chatAPI.match(sessionId);
      const [, matchRes] = await Promise.all([minWait, matchCall]);
      const data = matchRes.data;

      if (data.session_token) {
        discoveryAPI.saveSession(data.session_token);
        setMatchingInModal(false);
        setShowContact(false);
        onMatchComplete?.(data.session_token);
      } else {
        setMatchError('No studios found. Try adjusting the brief.');
        setMatchingInModal(false);
      }
    } catch (err) {
      setMatchError(err.response?.data?.error || 'Something went wrong. Please try again.');
      setMatchingInModal(false);
    } finally {
      clearInterval(msgInterval);
    }
  }

  async function handleContactSubmit() {
    setSavingContact(true);
    try {
      await chatAPI.saveContact(sessionId, { notes: contactNotes.trim() });
    } catch { /* non-fatal */ }
    finally { setSavingContact(false); }
    proceedToMatch();
  }

  function handleFindStudios() {
    if (!sessionId) return;
    setContactNotes('');
    setShowContact(true);
    setMatchingInModal(false);
  }

  function handleAdjust() {
    onAdjust?.("I'd like to change something in the brief");
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{
      border: '1px solid var(--border2)',
      borderRadius: 12, overflow: 'hidden',
      marginTop: 10, maxWidth: 420, width: '100%',
      position: 'relative',
    }}>
      {/* Dark header */}
      <div style={{ background: '#111', padding: '14px 18px' }}>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', color: '#fff', textTransform: 'uppercase', fontFamily: 'var(--font-body)' }}>
          Production Brief
        </p>
        <p style={{ margin: '3px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.45)', fontFamily: 'var(--font-body)' }}>
          {subtitle}
        </p>
      </div>

      {/* Tabs */}
      {hasPieces && (
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', overflowX: 'auto', background: 'var(--surface)' }}>
          {tabs.map((t, i) => (
            <button key={i} onClick={() => setTab(i)} style={{
              padding: '10px 15px', fontSize: 12, whiteSpace: 'nowrap',
              border: 'none', borderBottom: `2px solid ${tab === i ? SAGE : 'transparent'}`,
              background: 'none', color: tab === i ? SAGE : 'var(--text3)',
              cursor: 'pointer', fontFamily: 'var(--font-body)',
              fontWeight: tab === i ? 500 : 400, transition: 'color 0.15s',
            }}>{t}</button>
          ))}
        </div>
      )}

      {/* Fields */}
      <div style={{ background: 'var(--surface)' }}>
        <FieldRows fields={currentFields} />
      </div>

      {/* Loading overlay on brief card (unused now — kept for fallback) */}
      {matching && (
        <div style={{
          position: 'absolute', inset: 0, background: '#111', borderRadius: 12,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 20, zIndex: 10,
        }}>
          <style>{`@keyframes briefSpin{to{transform:rotate(360deg)}} @keyframes briefFade{0%,100%{opacity:.4}50%{opacity:1}}`}</style>
          <div style={{ width:36,height:36,border:'2px solid rgba(255,255,255,0.1)',borderTopColor:SAGE,borderRadius:'50%',animation:'briefSpin 0.9s linear infinite' }} />
          <p style={{ margin:0,fontSize:13,fontWeight:500,color:'rgba(255,255,255,0.75)',fontFamily:'var(--font-body)',animation:'briefFade 1.4s ease-in-out infinite' }}>
            {LOADING_MESSAGES[loadingStep]}
          </p>
        </div>
      )}

      {matchError && !showContact && (
        <p style={{ fontSize:12,color:'var(--red)',padding:'8px 18px 0',margin:0,background:'var(--surface)',fontFamily:'var(--font-body)' }}>
          {matchError}
        </p>
      )}

      {/* CTAs */}
      <div style={{ display:'flex',gap:8,padding:'12px 18px',background:'var(--surface)',borderTop:'1px solid var(--border)' }}>
        <button
          onClick={handleFindStudios}
          disabled={matching}
          style={{
            flex:1,padding:'11px',borderRadius:8,border:'none',
            background:SAGE,color:'#fff',fontSize:13,fontWeight:500,
            cursor:matching?'not-allowed':'pointer',
            fontFamily:'var(--font-body)',transition:'opacity 0.15s, box-shadow 0.15s',
            boxShadow:pulse?'0 0 0 4px rgba(122,140,110,0.35),0 0 0 8px rgba(122,140,110,0.15)':'none',
            animation:pulse?'briefPulse 0.5s ease-in-out 3':'none',
          }}
          onMouseEnter={e => { if (!matching) e.currentTarget.style.opacity='0.88'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity='1'; }}
        >
          <style>{`@keyframes briefPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.03)}}`}</style>
          Find Studios →
        </button>
        <button
          onClick={handleAdjust}
          disabled={matching}
          style={{
            flex:1,padding:'11px',borderRadius:8,
            border:'1px solid var(--border2)',background:'none',
            color:'var(--text)',fontSize:13,
            cursor:matching?'not-allowed':'pointer',
            opacity:matching?0.4:1,
            fontFamily:'var(--font-body)',transition:'background 0.15s,opacity 0.15s',
          }}
          onMouseEnter={e => { if (!matching) e.currentTarget.style.background='var(--surface2)'; }}
          onMouseLeave={e => { e.currentTarget.style.background='none'; }}
        >
          Adjust Brief
        </button>
      </div>

      {/* Contact form modal — stays open and shows loading while matching runs */}
      {showContact && (
        <>
          <div
            onClick={() => { if (!matchingInModal) setShowContact(false); }}
            style={{
              position:'fixed',inset:0,zIndex:200,
              background:'rgba(26,22,18,0.5)',backdropFilter:'blur(3px)',
            }}
          />
          <div style={{
            position:'fixed',top:'50%',left:'50%',
            transform:'translate(-50%,-50%)',
            zIndex:201,background:'var(--bg)',
            border:'1px solid var(--border)',borderRadius:16,
            padding:'26px 24px 20px',
            width:'min(400px,92vw)',
            boxShadow:'0 16px 56px rgba(0,0,0,0.22)',
            maxHeight:'90vh',overflowY:'auto',
          }}>
            <style>{`
              @keyframes modalSpin{to{transform:rotate(360deg)}}
              @keyframes modalPulse{0%,100%{opacity:0.4}50%{opacity:1}}
            `}</style>

            {matchingInModal ? (
              /* Loading state */
              <div style={{ textAlign:'center',padding:'20px 0 10px' }}>
                <div style={{
                  width:44,height:44,margin:'0 auto 18px',
                  border:'3px solid var(--surface3)',borderTopColor:SAGE,
                  borderRadius:'50%',animation:'modalSpin 0.85s linear infinite',
                }} />
                <p style={{ fontSize:15,fontWeight:600,color:'var(--text)',fontFamily:'var(--font-display)',marginBottom:6 }}>
                  Finding your studios…
                </p>
                <p style={{ fontSize:12.5,color:'var(--text3)',lineHeight:1.55,animation:'modalPulse 1.4s ease-in-out infinite' }}>
                  {LOADING_MESSAGES[loadingStep]}
                </p>
                {matchError && <p style={{ fontSize:12,color:'#C94040',marginTop:12 }}>{matchError}</p>}
              </div>
            ) : (
              /* Form state */
              <>
                <p style={{ fontSize:17,fontWeight:600,color:'var(--text)',fontFamily:'var(--font-display)',margin:'0 0 5px' }}>
                  Anything else you’d like us to know?
                </p>
                <p style={{ fontSize:12.5,color:'var(--text3)',marginBottom:18,lineHeight:1.55 }}>
                  Is there anything you’d like the Qala team or the studio to know? (optional)
                </p>

                <textarea
                  value={contactNotes}
                  onChange={e => setContactNotes(e.target.value)}
                  placeholder="e.g. We need the pieces by June, prefer handloom weaves, open to visiting the studio…"
                  rows={4}
                  autoFocus
                  style={{
                    width:'100%',padding:'10px 12px',boxSizing:'border-box',
                    border:'1px solid var(--border)',
                    borderRadius:8,background:'var(--surface2)',
                    fontSize:13,color:'var(--text)',lineHeight:1.6,
                    fontFamily:'var(--font-body)',outline:'none',resize:'vertical',
                    minHeight:90,transition:'border-color 0.15s',
                  }}
                  onFocus={e  => { e.target.style.borderColor=SAGE; }}
                  onBlur={e   => { e.target.style.borderColor='var(--border)'; }}
                />

                <div style={{ display:'flex',gap:10,marginTop:6 }}>
                  <button
                    onClick={handleContactSubmit}
                    disabled={savingContact}
                    style={{
                      flex:1,padding:'10px',borderRadius:8,
                      border:'none',background:SAGE,color:'#fff',
                      fontSize:13,fontWeight:500,
                      cursor:savingContact?'not-allowed':'pointer',
                      fontFamily:'var(--font-body)',
                      opacity:savingContact?0.7:1,transition:'opacity 0.15s',
                    }}
                  >
                    {savingContact?'Saving…':'Find Studios →'}
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
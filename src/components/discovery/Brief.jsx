// src/components/discovery/Brief.jsx
// Production brief card — parsed from BRIEF_START...BRIEF_END markers in Claude's text.
// Simple briefs: flat field rows.
// Multi-piece briefs: tabs (Overview + one per piece).
// Adapted from the Qala artifact — CTAs wire into real backend endpoints.

import { useState, useEffect } from 'react';
import { discoveryAPI, chatAPI } from '../../api/client';

const RUST = '#C4563A';

// ── Helpers ──────────────────────────────────────────────────────────────────

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
  // Extract piece blocks
  const pieces = [];
  const re = /PIECE:\s*([^\n]+)\n([\s\S]*?)PIECE_END/g;
  let overviewText = text;
  let m;
  while ((m = re.exec(text)) !== null) {
    pieces.push({ name: m[1].trim(), fields: parseFields(m[2]) });
    overviewText = overviewText.replace(m[0], '');
  }
  // Strip BRIEF_START / BRIEF_END markers
  overviewText = overviewText.replace(/BRIEF_START|BRIEF_END/g, '').trim();
  return { overview: parseFields(overviewText), pieces };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FieldRows({ fields }) {
  if (!fields?.length) return null;
  return (
    <div>
      {fields.map((f, i) => (
        <div key={i} style={{
          display: 'flex', gap: 16,
          padding: '10px 18px',
          borderBottom: i < fields.length - 1 ? '1px solid var(--border)' : 'none',
        }}>
          <span style={{
            fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
            color: 'var(--text3)', minWidth: 110, flexShrink: 0,
            textTransform: 'uppercase', paddingTop: 2,
            fontFamily: 'var(--font-body)',
          }}>
            {f.key}
          </span>
          <span style={{
            fontSize: 13, color: 'var(--text)',
            lineHeight: 1.55, fontFamily: 'var(--font-body)',
          }}>
            {f.val}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Brief({ rawText, sessionToken, sessionId, onAdjust, onMatchComplete, highlightFindStudios }) {
  const [tab, setTab] = useState(0);

  const { overview, pieces } = parseBrief(rawText);
  const hasPieces = pieces.length > 0;

  const tabs = hasPieces
    ? ['Overview', ...pieces.map((p, i) => `${p.name}`)]
    : null;

  const currentFields = hasPieces
    ? (tab === 0 ? overview : pieces[tab - 1].fields)
    : overview;

  // Build subtitle
  const colField = overview.find(f => /collection|garment/i.test(f.key));
  const subtitle = [
    colField?.val,
    hasPieces ? `${pieces.length} pieces` : null,
    'Ready for matching',
  ].filter(Boolean).join(' · ');

  const [matching, setMatching]       = useState(false);
  const [matchError, setMatchError]   = useState('');
  const [loadingStep, setLoadingStep] = useState(0);
  const [pulse, setPulse]             = useState(false);

  // Parent can trigger a pulse by setting highlightFindStudios=true
  useEffect(() => {
    if (highlightFindStudios) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 2000);
      return () => clearTimeout(t);
    }
  }, [highlightFindStudios]);

  const LOADING_MESSAGES = [
    'Scanning studios…',
    'Matching your brief…',
    'Checking availability…',
    'Loading your results…',
  ];

  async function handleFindStudios() {
    if (!sessionId) return;
    setMatching(true);
    setMatchError('');
    setLoadingStep(0);

    const msgInterval = setInterval(() => {
      setLoadingStep(s => Math.min(s + 1, LOADING_MESSAGES.length - 1));
    }, 500);

    try {
      const minWait   = new Promise(r => setTimeout(r, 2000));
      const matchCall = chatAPI.match(sessionId);

      const [, matchRes] = await Promise.all([minWait, matchCall]);
      const data = matchRes.data;

      if (data.session_token) {
        discoveryAPI.saveSession(data.session_token);

        // Preload hero images while still on the loading screen
        try {
          const axios = (await import('axios')).default;
          const recsRes = await axios.get(
            `${import.meta.env.VITE_API_URL || 'https://api.qala.studio'}/api/discovery/recommendations/`,
            { params: { session_token: data.session_token } }
          );
          const recs = recsRes.data?.recommendations || [];
          const imageUrls = recs
            .map(r => r.hero_images?.[0]?.url)
            .filter(Boolean);

          await Promise.allSettled(
            imageUrls.map(url => new Promise(resolve => {
              const img = new Image();
              img.onload = img.onerror = resolve;
              img.src = url.startsWith('http')
                ? url
                : `${import.meta.env.VITE_API_URL || 'https://api.qala.studio'}${url}`;
            }))
          );
        } catch {
          // Image preload failure is non-fatal
        }

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

  function handleAdjust() {
    onAdjust?.("I'd like to change something in the brief");
  }

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
        <p style={{
          margin: '3px 0 0', fontSize: 11,
          color: 'rgba(255,255,255,0.45)',
          fontFamily: 'var(--font-body)',
        }}>
          {subtitle}
        </p>
      </div>

      {/* Tabs (multi-piece only) */}
      {hasPieces && (
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border)',
          overflowX: 'auto',
          background: 'var(--surface)',
        }}>
          {tabs.map((t, i) => (
            <button
              key={i}
              onClick={() => setTab(i)}
              style={{
                padding: '10px 15px',
                fontSize: 12,
                whiteSpace: 'nowrap',
                border: 'none',
                borderBottom: `2px solid ${tab === i ? RUST : 'transparent'}`,
                background: 'none',
                color: tab === i ? RUST : 'var(--text3)',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                fontWeight: tab === i ? 500 : 400,
                transition: 'color 0.15s',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {/* Field rows */}
      <div style={{ background: 'var(--surface)' }}>
        <FieldRows fields={currentFields} />
      </div>

      {/* Loading overlay — shown during matching + image preload */}
      {matching && (
        <div style={{
          position: 'absolute', inset: 0,
          background: '#111',
          borderRadius: 12,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 20, zIndex: 10,
        }}>
          <style>{`
            @keyframes briefSpin {
              to { transform: rotate(360deg); }
            }
            @keyframes briefFadeMsg {
              0%,100% { opacity: 0.4; }
              50%      { opacity: 1; }
            }
          `}</style>

          {/* Spinner ring */}
          <div style={{
            width: 36, height: 36,
            border: '2px solid rgba(255,255,255,0.1)',
            borderTopColor: RUST,
            borderRadius: '50%',
            animation: 'briefSpin 0.9s linear infinite',
          }} />

          {/* Cycling message */}
          <p style={{
            margin: 0,
            fontSize: 13, fontWeight: 500,
            color: 'rgba(255,255,255,0.75)',
            fontFamily: 'var(--font-body)',
            letterSpacing: '0.02em',
            animation: 'briefFadeMsg 1.4s ease-in-out infinite',
          }}>
            {LOADING_MESSAGES[loadingStep]}
          </p>

          {/* Subtle dots row */}
          <div style={{ display: 'flex', gap: 6 }}>
            {LOADING_MESSAGES.map((_, i) => (
              <div key={i} style={{
                width: 5, height: 5, borderRadius: '50%',
                background: i === loadingStep ? RUST : 'rgba(255,255,255,0.15)',
                transition: 'background 0.3s',
              }} />
            ))}
          </div>
        </div>
      )}

      {/* CTAs */}
      {matchError && (
        <p style={{
          fontSize: 12, color: 'var(--red)',
          padding: '8px 18px 0', margin: 0,
          background: 'var(--surface)',
          fontFamily: 'var(--font-body)',
        }}>
          {matchError}
        </p>
      )}
      <div style={{
        display: 'flex', gap: 8, padding: '12px 18px',
        background: 'var(--surface)',
        borderTop: '1px solid var(--border)',
      }}>
        <button
          onClick={handleFindStudios}
          disabled={matching}
          style={{
            flex: 1, padding: '11px',
            borderRadius: 8, border: 'none',
            background: RUST, color: '#fff',
            fontSize: 13, fontWeight: 500,
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
            flex: 1, padding: '11px',
            borderRadius: 8,
            border: '1px solid var(--border2)',
            background: 'none',
            color: 'var(--text)',
            fontSize: 13,
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
    </div>
  );
}
// src/components/discovery/StudiosPanel.jsx
// Used in two modes:
//   inline=false (default): slides in from right as a fixed overlay panel
//   inline=true: renders as a normal flex column (used in 40:60 split layout)
//
// Changes vs previous version:
//   - Removed "Show All Results" button from both modes (no longer links to /discover/results)
//   - Added mandatory DirectoryCard at the end of the inline studio list
//   - DirectoryCard also appears as the last snap item on mobile scroll feed

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { discoveryAPI } from '../../api/client';
import RecommendationCard from './RecommendationCard';
import { Spinner } from '../Spinner';

// ── Directory CTA card ────────────────────────────────────────────────────────
// Identical style to the DirectoryCTACard on the DiscoverResults page.
// Always rendered last in the studio list. Navigates to /directory.

function DirectoryCard({ navigate }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderColor: hovered ? 'var(--border3)' : 'var(--border)',
        borderRadius: 16,
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textAlign: 'center',
        padding: '48px 28px',
        transition: 'border-color 0.2s',
        // Mobile snap
        scrollSnapAlign: 'start',
      }}
    >
      <div style={{
        fontSize: 10, color: 'var(--text4)',
        letterSpacing: '0.14em', textTransform: 'uppercase',
        fontWeight: 600, marginBottom: 10,
      }}>
        Want to explore more?
      </div>

      <h3 style={{
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(20px, 2.5vw, 28px)',
        fontWeight: 300, color: 'var(--text)',
        lineHeight: 1.2, marginBottom: 10,
        letterSpacing: '-0.01em',
      }}>
        Browse the full{' '}
        <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Studio Directory</em>
      </h3>

      <p style={{
        fontSize: 13, color: 'var(--text3)',
        lineHeight: 1.7, maxWidth: 280, marginBottom: 24,
      }}>
        Explore every studio on Qala — filter by craft, fabric, and product type at your own pace.
      </p>

      <button
        onClick={() => navigate('/directory')}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '12px 28px', borderRadius: 8,
          background: '#1A1612', color: '#F5F0E8',
          border: 'none', fontSize: 13, fontWeight: 500,
          fontFamily: 'var(--font-body)', letterSpacing: '0.04em',
          cursor: 'pointer', transition: 'background 0.18s ease',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#8FA083'; }}
        onMouseLeave={e => { e.currentTarget.style.background = '#1A1612'; }}
      >
        Browse all studios →
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function StudiosPanel({ sessionToken, onClose, buyerSummary, inline = false }) {
  const [recs, setRecs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!sessionToken) return;
    setLoading(true);
    discoveryAPI.getRecommendations(sessionToken)
      .then(r => {
        setRecs(r.data?.recommendations || []);
        setLoading(false);
      })
      .catch(() => {
        setError('Could not load studios.');
        setLoading(false);
      });
  }, [sessionToken]);

  function handleContact(rec) {
    discoveryAPI.saveSession(sessionToken);
    navigate(`/studio/${rec.seller_profile_id}`);
  }

  // ── Inline mode ───────────────────────────────────────────────────────────
  if (inline) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        height: '100%',
        background: 'var(--bg)',
        borderLeft: '0.5px solid var(--border)',
        position: 'relative',
      }}>
        {/* Header */}
        <div style={{
          padding: '13px 20px',
          borderBottom: '0.5px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
          background: 'var(--surface)',
        }}>
          <div>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: 20, fontWeight: 500, color: 'var(--text)',
            }}>
              Your Matches
            </div>
            {recs.length > 0 && (
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>
                {recs.length} studio{recs.length !== 1 ? 's' : ''} found
              </div>
            )}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              title="Back to chat"
              style={{
                background: 'none', border: '1px solid var(--border)',
                borderRadius: 8, width: 32, height: 32,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--text2)',
                transition: 'background 0.15s', flexShrink: 0,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface2)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          )}
        </div>

        {/* Scrollable cards */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 24px' }}>
          {loading && <Spinner full />}

          {error && (
            <div style={{
              textAlign: 'center', padding: '40px 20px',
              color: 'var(--text3)', fontSize: 14,
            }}>
              {error}
            </div>
          )}

          {!loading && !error && recs.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '40px 20px',
              color: 'var(--text3)', fontSize: 14, lineHeight: 1.6,
            }}>
              No exact matches found.<br/>
              Try being more flexible on craft or fabric.
            </div>
          )}

          {!loading && (
            <>
              <style>{`
                @media (max-width: 767px) {
                  .studios-feed {
                    scroll-snap-type: y mandatory;
                    overflow-y: scroll;
                    height: 100vh;
                    gap: 0 !important;
                  }
                  .studios-feed > * {
                    scroll-snap-align: start;
                    min-height: 85vh;
                    border-bottom: 1px solid var(--border);
                  }
                }
              `}</style>
              <div className="studios-feed" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Matched studio cards */}
                {recs.slice(0, 5).map((rec, i) => (
                  <RecommendationCard
                    key={rec.id || i}
                    rec={rec}
                    position={i + 1}
                    isBonus={rec.is_bonus_visual}
                    onContact={handleContact}
                    buyerSummary={buyerSummary}
                  />
                ))}
                {/* Mandatory directory card — always last */}
                <DirectoryCard navigate={navigate} />
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Overlay mode (default) — fixed panel sliding in from right ────────────
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(26,22,18,0.4)',
          zIndex: 100,
          backdropFilter: 'blur(2px)',
          animation: 'fadeIn 0.2s ease',
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 'min(480px, 95vw)',
        background: 'var(--bg)',
        zIndex: 101,
        display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 40px rgba(26,22,18,0.15)',
        animation: 'slideInRight 0.3s cubic-bezier(0.4,0,0.2,1)',
      }}>
        <style>{`
          @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
          @keyframes slideInRight {
            from { transform: translateX(100%) }
            to   { transform: translateX(0) }
          }
        `}</style>

        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: 22, fontWeight: 500, color: 'var(--text)',
            }}>
              Your Matches
            </div>
            {recs.length > 0 && (
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                {recs.length} studio{recs.length !== 1 ? 's' : ''} found
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: '1px solid var(--border)',
              borderRadius: 8, width: 36, height: 36,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--text2)',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface2)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 24px' }}>
          {loading && <Spinner full />}

          {error && (
            <div style={{
              textAlign: 'center', padding: '40px 20px',
              color: 'var(--text3)', fontSize: 14,
            }}>
              {error}
            </div>
          )}

          {!loading && !error && recs.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '40px 20px',
              color: 'var(--text3)', fontSize: 14, lineHeight: 1.6,
            }}>
              No exact matches found.<br/>
              Try being more flexible on craft or fabric.
            </div>
          )}

          {!loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {recs.map((rec, i) => (
                <RecommendationCard
                  key={rec.id || i}
                  rec={rec}
                  position={i + 1}
                  isBonus={rec.is_bonus_visual}
                  onContact={handleContact}
                  buyerSummary={buyerSummary}
                />
              ))}
              {/* Mandatory directory card */}
              <DirectoryCard navigate={navigate} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
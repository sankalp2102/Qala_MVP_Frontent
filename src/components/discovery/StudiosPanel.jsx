// src/components/discovery/StudiosPanel.jsx
// Slides in from the right when matching is complete.
// Fetches recommendations from the existing V1 endpoint and renders cards.

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { discoveryAPI } from '../../api/client';
import RecommendationCard from './RecommendationCard';
import { Spinner } from '../Spinner';

export default function StudiosPanel({ sessionToken, onClose, buyerSummary }) {
  const [recs, setRecs]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);
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

  function handleViewAll() {
    discoveryAPI.saveSession(sessionToken);
    navigate('/discover/results');
  }

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
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 80px' }}>
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

          {!loading && recs.length > 0 && (
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
            </div>
          )}
        </div>

        {/* Footer CTA */}
        {!loading && recs.length > 0 && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            padding: '16px',
            background: 'linear-gradient(transparent, var(--bg) 30%)',
          }}>
            <button
              onClick={handleViewAll}
              style={{
                width: '100%', padding: '14px',
                borderRadius: 10, background: '#1A1612',
                color: '#F5F0E8', border: 'none',
                fontSize: 13, fontWeight: 600,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                cursor: 'pointer', fontFamily: 'var(--font-body)',
                transition: 'background 0.18s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#C46E49'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#1A1612'; }}
            >
              View Full Results →
            </button>
          </div>
        )}
      </div>
    </>
  );
}
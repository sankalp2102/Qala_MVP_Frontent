import { useState } from 'react';

const RANKING_STYLES = {
  high:   { bg: 'rgba(90,232,122,0.08)', color: '#5AE87A', border: 'rgba(90,232,122,0.2)',  label: 'Strong Match' },
  medium: { bg: 'rgba(232,184,80,0.08)', color: '#E8B850', border: 'rgba(232,184,80,0.2)',  label: 'Good Match' },
  low:    { bg: 'rgba(160,160,160,0.08)',color: '#A0A0A0', border: 'rgba(160,160,160,0.2)', label: 'Possible Match' },
};

export default function RecommendationCard({ rec, position, isBonus, onContact }) {
  const rank = RANKING_STYLES[rec.ranking] || RANKING_STYLES.medium;
  const hero = rec.hero_images?.[0];

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 16,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      transition: 'border-color 0.2s',
      height: '100%',
      position: 'relative',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border3)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
    >
      {/* position badge */}
      <div style={{
        position: 'absolute', top: 14, left: 14, zIndex: 2,
        width: 28, height: 28, borderRadius: '50%',
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700, color: '#fff', border: '1px solid var(--border2)',
      }}>
        {isBonus ? '★' : position}
      </div>

      {/* ranking badge */}
      <div style={{
        position: 'absolute', top: 14, right: 14, zIndex: 2,
        padding: '4px 10px', borderRadius: 20,
        background: rank.bg, color: rank.color,
        border: `1px solid ${rank.border}`,
        fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
      }}>
        {isBonus ? 'Visual Match' : rank.label}
      </div>

      {/* Hero image — taller to fill the larger card */}
      <div style={{ height: 260, background: 'var(--surface2)', flexShrink: 0, overflow: 'hidden' }}>
        {hero ? (
          <img
            src={hero.url}
            alt={rec.studio_name}
            loading = "lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 40, opacity: 0.15,
          }}>🏛</div>
        )}
      </div>

      {/* Card body */}
      <div style={{ padding: '22px 24px', flex: 1, display: 'flex', flexDirection: 'column', gap: 14, overflow: 'auto' }}>

        {/* Studio name + location */}
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
            {rec.studio_name || 'Studio'}
          </h3>
          {rec.location && (
            <div style={{ fontSize: 12, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4 }}>
              📍 {rec.location}
            </div>
          )}
        </div>

        {/* Craft tags */}
        {rec.primary_crafts?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {rec.primary_crafts.slice(0, 5).map(c => (
              <span key={c} style={{
                padding: '4px 12px', borderRadius: 12,
                background: 'var(--surface3)', border: '1px solid var(--border)',
                fontSize: 11, color: 'var(--text2)',
              }}>{c}</span>
            ))}
          </div>
        )}

        {/* Match reasoning */}
        {rec.match_reasoning && Object.keys(rec.match_reasoning).length > 0 && (
          <div style={{
            background: 'var(--surface2)', borderRadius: 10,
            padding: '14px 16px', fontSize: 13, color: 'var(--text2)', lineHeight: 1.7,
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
              Why this studio
            </div>
            {Object.values(rec.match_reasoning).filter(Boolean).slice(0, 2).map((r, i) => (
              <div key={i} style={{ marginBottom: 5 }}>· {typeof r === 'string' ? r : JSON.stringify(r)}</div>
            ))}
          </div>
        )}

        {/* Two-column: Best at + Keep in mind */}
        <div style={{ display: 'flex', gap: 16 }}>
          {/* Best at */}
          {rec.what_best_at?.length > 0 && (
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
                Best at
              </div>
              {rec.what_best_at.slice(0, 3).map((w, i) => (
                <div key={i} style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 5, display: 'flex', gap: 6 }}>
                  <span style={{ color: 'var(--green)', flexShrink: 0 }}>✓</span> {w}
                </div>
              ))}
            </div>
          )}

          {/* Keep in mind */}
          {rec.what_to_keep_in_mind?.length > 0 && (
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
                Keep in mind
              </div>
              {rec.what_to_keep_in_mind.slice(0, 3).map((w, i) => (
                <div key={i} style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 5, display: 'flex', gap: 6 }}>
                  <span style={{ color: 'var(--amber)', flexShrink: 0 }}>!</span> {w}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bonus mismatches */}
        {isBonus && rec.mismatches?.length > 0 && (
          <div style={{
            background: 'rgba(232,184,80,0.05)', border: '1px solid rgba(232,184,80,0.15)',
            borderRadius: 8, padding: '10px 12px',
          }}>
            <div style={{ fontSize: 10, color: 'var(--amber)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
              Visual match — some differences
            </div>
            {rec.mismatches.map((m, i) => (
              <div key={i} style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>· {m}</div>
            ))}
          </div>
        )}

        <div style={{ flex: 1 }} />

        {/* CTA */}
        <button
          onClick={() => onContact(rec)}
          style={{
            display: 'block', width: '100%', padding: '14px', borderRadius: 8,
            background: '#fff', color: '#000', border: 'none',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'var(--font-body)', transition: 'background 0.2s',
            letterSpacing: '0.04em', textAlign: 'center',
            boxSizing: 'border-box',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#E0E0E0'}
          onMouseLeave={e => e.currentTarget.style.background = '#fff'}
        >
          View Profile →
        </button>
      </div>
    </div>
  );
}
import { useState } from 'react';

const RANKING_STYLES = {
  high:   { bg: 'rgba(58,158,98,0.08)',   color: '#3A9E62', border: 'rgba(58,158,98,0.25)',   label: 'Strong Match' },
  medium: { bg: 'rgba(200,138,40,0.08)',  color: '#C88A28', border: 'rgba(200,138,40,0.25)',  label: 'Good Match' },
  low:    { bg: 'rgba(160,160,160,0.08)', color: '#8A7060', border: 'rgba(160,160,160,0.2)',  label: 'Possible Match' },
};

function ImageGallery({ images, studioName }) {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const imgs = images?.filter(Boolean) || [];

  if (imgs.length === 0) return (
    <div style={{
      width: '100%', aspectRatio: '16/9',
      background: 'var(--surface2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 48, opacity: 0.15,
    }}>🏛</div>
  );

  const src = (img) => img?.url || img;

  return (
    <>
      <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '12px 12px 0 0' }}
        onClick={() => setLightbox(true)}
      >
        <img
          src={src(imgs[active])}
          alt={studioName}
          style={{
            width: '100%', aspectRatio: '16/9', objectFit: 'cover',
            display: 'block', cursor: 'zoom-in',
            transition: 'transform 0.4s ease',
          }}
          onMouseEnter={e => e.target.style.transform = 'scale(1.03)'}
          onMouseLeave={e => e.target.style.transform = 'none'}
        />
        {imgs.length > 1 && (
          <div style={{
            position: 'absolute', bottom: 12, right: 12,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
            color: '#fff', fontSize: 11, padding: '4px 10px', borderRadius: 20, fontWeight: 600,
          }}>
            {active + 1} / {imgs.length}
          </div>
        )}
      </div>

      {imgs.length > 1 && (
        <div style={{
          display: 'flex', gap: 8, padding: '12px 0 0',
          overflowX: 'auto', scrollbarWidth: 'none',
        }}>
          {imgs.map((img, i) => (
            <button key={i} onClick={() => setActive(i)} style={{
              flexShrink: 0, width: 64, height: 48,
              borderRadius: 8, overflow: 'hidden', padding: 0, border: 'none',
              outline: active === i ? '2px solid #C46E49' : '2px solid transparent',
              outlineOffset: 2, cursor: 'pointer', transition: 'outline 0.15s',
            }}>
              <img src={src(img)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </button>
          ))}
        </div>
      )}

      {lightbox && (
        <div onClick={() => setLightbox(false)} style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.92)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <button onClick={() => setLightbox(false)} style={{
            position: 'absolute', top: 20, right: 24,
            background: 'none', border: 'none', color: '#fff', fontSize: 28, cursor: 'pointer',
          }}>✕</button>
          {active > 0 && (
            <button onClick={e => { e.stopPropagation(); setActive(a => a - 1); }} style={{
              position: 'absolute', left: 24, background: 'rgba(255,255,255,0.12)',
              border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer',
              width: 48, height: 48, borderRadius: '50%',
            }}>←</button>
          )}
          <img src={src(imgs[active])} alt={studioName}
            style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }}
            onClick={e => e.stopPropagation()}
          />
          {active < imgs.length - 1 && (
            <button onClick={e => { e.stopPropagation(); setActive(a => a + 1); }} style={{
              position: 'absolute', right: 24, background: 'rgba(255,255,255,0.12)',
              border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer',
              width: 48, height: 48, borderRadius: '50%',
            }}>→</button>
          )}
        </div>
      )}
    </>
  );
}

export default function RecommendationCard({ rec, position, onContact, isBonus }) {
  const [keepExpanded, setKeepExpanded] = useState(false);
  const rank = RANKING_STYLES[rec.ranking] || RANKING_STYLES.medium;

  const matchReasons = rec.match_reasoning
    ? Object.values(rec.match_reasoning).filter(v => v && typeof v === 'string')
    : [];
  const keepInMind = rec.what_to_keep_in_mind || [];
  const bestAt = rec.what_best_at || [];

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 16, overflow: 'hidden',
      height: '100%', display: 'flex', flexDirection: 'column',
    }}>

      {/* Image gallery */}
      <div style={{ flexShrink: 0, position: 'relative' }}>
        <ImageGallery images={rec.hero_images} studioName={rec.studio_name} />
        {/* Position badge */}
        <div style={{
          position: 'absolute', top: 14, left: 14, zIndex: 2,
          width: 30, height: 30, borderRadius: '50%',
          background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, color: '#fff',
          border: '1px solid rgba(255,255,255,0.2)',
        }}>{isBonus ? '★' : position}</div>
        {/* Match badge */}
        <div style={{
          position: 'absolute', top: 14, right: 14, zIndex: 2,
          padding: '5px 12px', borderRadius: 20,
          background: isBonus ? 'rgba(200,138,40,0.12)' : rank.bg,
          color: isBonus ? '#C88A28' : rank.color,
          border: `1px solid ${isBonus ? 'rgba(200,138,40,0.3)' : rank.border}`,
          fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
          backdropFilter: 'blur(6px)',
        }}>{isBonus ? 'Visual Match' : rank.label}</div>
      </div>

      {/* Body */}
      <div style={{ padding: '28px 32px 32px', flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* Name + meta */}
        <div style={{ marginBottom: 16 }}>
          <h3 style={{
            fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700,
            color: 'var(--text)', letterSpacing: '-0.01em', marginBottom: 6, lineHeight: 1.2,
          }}>{rec.studio_name || 'Studio'}</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            {rec.location && (
              <span style={{ fontSize: 13, color: 'var(--text3)' }}>📍 {rec.location}</span>
            )}
            {rec.years_in_operation && (
              <span style={{ fontSize: 13, color: 'var(--text3)' }}>· {rec.years_in_operation} yrs</span>
            )}
          </div>
        </div>

        {/* Craft chips */}
        {rec.primary_crafts?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 24 }}>
            {rec.primary_crafts.slice(0, 5).map(c => (
              <span key={c} style={{
                padding: '4px 12px', borderRadius: 20,
                background: 'var(--surface2)', border: '1px solid var(--border)',
                fontSize: 12, color: 'var(--text2)', fontWeight: 500,
              }}>{c}</span>
            ))}
          </div>
        )}

        {/* ★ WHY WE'RE RECOMMENDING — highlighted */}
        {matchReasons.length > 0 && (
          <div style={{
            background: 'rgba(196,110,73,0.05)',
            border: '1px solid rgba(196,110,73,0.2)',
            borderLeft: '3px solid #C46E49',
            borderRadius: '0 10px 10px 0',
            padding: '16px 20px', marginBottom: 24,
          }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: '#C46E49',
              letterSpacing: '0.12em', textTransform: 'uppercase',
              marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6,
            }}>★ Why we're recommending this studio</div>
            {matchReasons.slice(0, 4).map((r, i) => (
              <div key={i} style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, display: 'flex', gap: 8, marginBottom: 5 }}>
                <span style={{ color: '#C46E49', flexShrink: 0 }}>·</span> {r}
              </div>
            ))}
          </div>
        )}

        {/* Two-column: best-at + keep-in-mind */}
        {(bestAt.length > 0 || keepInMind.length > 0) && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: bestAt.length > 0 && keepInMind.length > 0 ? '1fr 1fr' : '1fr',
            gap: 20, marginBottom: 28,
          }}>
            {bestAt.length > 0 && (
              <div>
                <div style={{
                  fontSize: 10, fontWeight: 700, color: 'var(--text3)',
                  letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10,
                }}>✓ What they're best at</div>
                {bestAt.slice(0, 4).map((w, i) => (
                  <div key={i} style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, display: 'flex', gap: 8, marginBottom: 5 }}>
                    <span style={{ color: 'var(--green)', flexShrink: 0 }}>·</span> {w}
                  </div>
                ))}
              </div>
            )}
            {keepInMind.length > 0 && (
              <div>
                <button
                  onClick={() => setKeepExpanded(p => !p)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: 0, display: 'flex', alignItems: 'center', gap: 6,
                    fontSize: 10, fontWeight: 700, color: 'var(--amber)',
                    letterSpacing: '0.12em', textTransform: 'uppercase',
                    marginBottom: 10, fontFamily: 'var(--font-body)', width: '100%',
                  }}
                >
                  ⚠ What to keep in mind
                  <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--text4)' }}>
                    {keepExpanded ? '▲' : '▼'}
                  </span>
                </button>
                {keepExpanded ? keepInMind.map((w, i) => (
                  <div key={i} style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.6, display: 'flex', gap: 8, marginBottom: 5 }}>
                    <span style={{ color: 'var(--amber)', flexShrink: 0 }}>·</span>
                    {typeof w === 'object' ? w.text : w}
                  </div>
                )) : (
                  <div style={{ fontSize: 12, color: 'var(--text4)', fontStyle: 'italic' }}>
                    {keepInMind.length} note{keepInMind.length !== 1 ? 's' : ''} — click to expand
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Bonus mismatches */}
        {isBonus && rec.mismatches?.length > 0 && (
          <div style={{
            background: 'var(--amber-dim)', border: '1px solid rgba(200,138,40,0.2)',
            borderRadius: 10, padding: '14px 16px', marginBottom: 24,
          }}>
            <div style={{ fontSize: 10, color: 'var(--amber)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
              Visual match — some differences
            </div>
            {rec.mismatches.map((m, i) => (
              <div key={i} style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 3, display: 'flex', gap: 6 }}>
                <span>·</span> {typeof m === 'object' ? m.explanation || m.text : m}
              </div>
            ))}
          </div>
        )}

        <div style={{ flex: 1 }} />

        {/* CTAs */}
        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <button
            onClick={() => onContact(rec)}
            style={{
              flex: 1, padding: '14px 20px', borderRadius: 10,
              background: '#C46E49', color: '#fff', border: 'none',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'var(--font-body)', transition: 'background 0.2s, transform 0.15s',
              letterSpacing: '0.03em',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#B05E3C'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#C46E49'; e.currentTarget.style.transform = 'none'; }}
          >Get a Call-back →</button>
          <button style={{
            padding: '14px 18px', borderRadius: 10,
            background: 'transparent', color: 'var(--text3)',
            border: '1px solid var(--border)', fontSize: 13,
            cursor: 'pointer', fontFamily: 'var(--font-body)',
            transition: 'border-color 0.2s, color 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border3)'; e.currentTarget.style.color = 'var(--text)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text3)'; }}
          >View profile</button>
        </div>
      </div>
    </div>
  );
}
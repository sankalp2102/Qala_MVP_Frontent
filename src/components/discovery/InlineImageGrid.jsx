// src/components/discovery/InlineImageGrid.jsx
// Renders 4-6 studio images inline inside a chat bubble.
// User taps to select — selected IDs are passed back up.

import { useState } from 'react';
import { mediaUrl } from '../../utils/mediaUrl';

export default function InlineImageGrid({ images = [], onSelect }) {
  const [selected, setSelected] = useState(new Set());

  function toggle(id) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      const ids = [...next];
      onSelect?.(ids);
      return next;
    });
  }

  if (!images.length) return null;

  return (
    <div style={{ marginTop: 10 }}>
      <p style={{
        fontSize: 11, color: 'var(--text3)', marginBottom: 8,
        letterSpacing: '0.06em', textTransform: 'uppercase',
      }}>
        Tap images that resonate
      </p>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 6,
      }}>
        {images.map(img => {
          const isSelected = selected.has(img.id);
          return (
            <button
              key={img.id}
              onClick={() => toggle(img.id)}
              style={{
                padding: 0,
                border: isSelected
                  ? '2px solid var(--gold)'
                  : '2px solid transparent',
                borderRadius: 8,
                overflow: 'hidden',
                cursor: 'pointer',
                background: 'var(--surface2)',
                position: 'relative',
                aspectRatio: '1',
                transition: 'border-color 0.18s, transform 0.18s',
                transform: isSelected ? 'scale(0.97)' : 'scale(1)',
              }}
            >
              <img
                src={mediaUrl(img.url)}
                alt={img.studio_name || ''}
                style={{
                  width: '100%', height: '100%',
                  objectFit: 'cover', display: 'block',
                }}
                onError={e => { e.target.style.display = 'none'; }}
              />
              {isSelected && (
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'rgba(184,92,56,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: 'var(--gold)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              )}
              {img.studio_name && (
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
                  padding: '8px 4px 4px',
                  fontSize: 9, color: 'rgba(255,255,255,0.85)',
                  textAlign: 'center', lineHeight: 1.2,
                }}>
                  {img.studio_name}
                </div>
              )}
            </button>
          );
        })}
      </div>
      {selected.size > 0 && (
        <p style={{
          fontSize: 11, color: 'var(--gold)', marginTop: 6,
          fontWeight: 500,
        }}>
          {selected.size} selected — send your next message to continue
        </p>
      )}
    </div>
  );
}
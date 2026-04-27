// src/components/discovery/InlineImageGrid.jsx
// Renders 4-8 studio images inline inside a chat bubble.
//
// FIX: Selection state is now fully controlled by the parent (DiscoverV2).
//   - selectedIds prop (array of ints) comes down from parent
//   - onSelect(ids) fires on every tap so parent can update its state
//   - onConfirm() fires when user clicks the confirm button — parent sends the message
//
// This means all InlineImageGrids in the conversation share the same selection
// source of truth. When the user sends, the parent clears selectedIds for all
// grids simultaneously.

import { mediaUrl } from '../../utils/mediaUrl';

export default function InlineImageGrid({
  images = [],
  selectedIds = [],   // controlled by parent — array of selected image IDs
  onSelect,           // onSelect(newIds: int[]) — called on every tap
  onConfirm,          // onConfirm() — called when user clicks "These look great"
}) {
  if (!images.length) return null;

  function toggle(id) {
    const isSelected = selectedIds.includes(id);
    const next = isSelected
      ? selectedIds.filter(x => x !== id)
      : [...selectedIds, id];
    onSelect?.(next);
  }

  const hasSelection = selectedIds.length > 0;

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
          const isSelected = selectedIds.includes(img.id);
          return (
            <button
              key={img.id}
              onClick={() => toggle(img.id)}
              style={{
                padding: 0,
                border: isSelected
                  ? '2.5px solid var(--gold)'
                  : '2px solid transparent',
                borderRadius: 8,
                overflow: 'hidden',
                cursor: 'pointer',
                background: 'var(--surface2)',
                position: 'relative',
                aspectRatio: '1',
                transition: 'border-color 0.15s, transform 0.15s',
                transform: isSelected ? 'scale(0.96)' : 'scale(1)',
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

              {/* Selection overlay */}
              {isSelected && (
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'rgba(184,92,56,0.22)',
                  display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
                  padding: 5,
                }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%',
                    background: 'var(--gold)', border: '2px solid white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M1.5 5l2.5 2.5 4.5-4.5"
                        stroke="#fff" strokeWidth="1.8"
                        strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              )}

              {/* Studio name label */}
              {img.studio_name && (
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  background: 'linear-gradient(transparent, rgba(0,0,0,0.65))',
                  padding: '10px 5px 4px',
                  fontSize: 9, color: 'rgba(255,255,255,0.88)',
                  textAlign: 'center', lineHeight: 1.2,
                }}>
                  {img.studio_name}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Confirm button — appears once at least one image is tapped */}
      <div style={{
        marginTop: 10,
        height: hasSelection ? 'auto' : 0,
        overflow: 'hidden',
        transition: 'height 0.2s ease',
      }}>
        {hasSelection && (
          <button
            onClick={onConfirm}
            style={{
              width: '100%',
              padding: '10px 16px',
              borderRadius: 8,
              background: '#1A1612',
              color: '#F5F0E8',
              border: 'none',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.05em',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#C46E49'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#1A1612'; }}
          >
            <span style={{
              width: 20, height: 20, borderRadius: '50%',
              background: 'var(--gold)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: 'white',
              flexShrink: 0,
            }}>
              {selectedIds.length}
            </span>
            These look great →
          </button>
        )}
      </div>
    </div>
  );
}
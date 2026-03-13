import { useState, useEffect } from 'react';
import { discoveryAPI } from '../../api/client';

export default function ImageGrid({ selected, onToggle }) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    discoveryAPI.getImages()
      .then(r => setImages(r.data.images || []))
      .catch(() => setImages([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text3)', fontSize: 13 }}>
      <span className="spinner" style={{ width: 24, height: 24 }} />
      <div style={{ marginTop: 12 }}>Loading studio images…</div>
    </div>
  );

  if (!images.length) return (
    <div style={{
      textAlign: 'center', padding: '60px 0',
      color: 'var(--text3)', fontSize: 13,
      border: '1px dashed var(--border2)', borderRadius: 12,
    }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>🖼</div>
      <div>No studio images available yet.</div>
      <div style={{ marginTop: 6, fontSize: 12, opacity: 0.6 }}>You can continue without selecting images.</div>
    </div>
  );

  return (
    <div>
      {selected.length > 0 && (
        <div style={{
          marginBottom: 16, fontSize: 12, color: 'var(--text3)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{
            background: 'var(--gold)', borderRadius: 12,
            padding: '2px 10px', color: '#fff', fontWeight: 500, fontSize: 11,
          }}>
            {selected.length} selected
          </span>
          <span>Pick images that match your aesthetic direction</span>
        </div>
      )}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: 10,
      }}>
        {images.map(img => {
          const isSelected = selected.includes(img.id);
          return (
            <button
              key={img.id}
              onClick={() => onToggle(img.id)}
              style={{
                position: 'relative', aspectRatio: '3/4', overflow: 'hidden',
                borderRadius: 10, border: `2px solid ${isSelected ? 'rgba(255,255,255,0.8)' : 'transparent'}`,
                cursor: 'pointer', padding: 0, background: 'var(--surface2)',
                transition: 'border-color 0.15s, transform 0.15s',
                transform: isSelected ? 'scale(0.97)' : 'scale(1)',
              }}
            >
              <img
                src={img.image_url}
                alt={img.caption || img.studio_name}
                loading="lazy"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              {/* Hover overlay */}
              <div style={{
                position: 'absolute', inset: 0,
                background: isSelected ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0)',
                transition: 'background 0.15s',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {isSelected && (
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: '#fff', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 14,
                  }}>✓</div>
                )}
              </div>

            </button>
          );
        })}
      </div>
    </div>
  );
}

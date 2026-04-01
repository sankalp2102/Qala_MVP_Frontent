import { useState, useEffect, useRef, useCallback } from 'react';

const PAGE_SIZE    = 20;   // images per batch
const EAGER_COUNT  = 20;   // all first batch loaded with high priority

// Silently preload images into browser cache using Image() object
// so they appear instantly when user scrolls to them
function preloadImages(images) {
  images.forEach(img => {
    if (!img.image_url) return;
    const image = new window.Image();
    image.src = img.image_url;
  });
}

// ── Skeleton card (Option 5) ─────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{
      aspectRatio: '3/4',
      borderRadius: 10,
      overflow: 'hidden',
      background: 'linear-gradient(90deg, var(--surface2) 25%, var(--surface3) 50%, var(--surface2) 75%)',
      backgroundSize: '200% 100%',
      animation: 'imgGridShimmer 1.4s infinite',
    }} />
  );
}

// ── Single image card (Options 4, 6, 7, 9) ──────────────────────────────────
function ImageCard({ img, index, isSelected, onToggle, batchOffset }) {
  const [loaded, setLoaded] = useState(false);
  const globalIndex = batchOffset + index;
  const isEager     = globalIndex < EAGER_COUNT;

  // Stagger delay only for first batch first 12 (Option 7)
  const staggerDelay = batchOffset === 0 && index < EAGER_COUNT
    ? `${index * 50}ms`
    : '0ms';

  return (
    <div className="img-grid-item">
      <button
        onClick={() => onToggle(img.id)}
        style={{
          position: 'relative', aspectRatio: '3/4', overflow: 'hidden',
          borderRadius: 10,
          border: `2px solid ${isSelected ? 'rgba(255,255,255,0.8)' : 'transparent'}`,
          cursor: 'pointer', padding: 0, background: 'var(--surface2)',
          transition: 'border-color 0.15s, transform 0.15s',
          transform: isSelected ? 'scale(0.97)' : 'scale(1)',
          display: 'block', width: '100%',
        }}
      >
        {/* Skeleton visible until image fully loaded (Options 5 + 9) */}
        {!loaded && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(90deg, var(--surface2) 25%, var(--surface3) 50%, var(--surface2) 75%)',
            backgroundSize: '200% 100%',
            animation: 'imgGridShimmer 1.4s infinite',
            borderRadius: 8,
          }} />
        )}

        {/* Image hidden until fully loaded then fades in sharp (Options 6 + 9) */}
        <img
          src={img.image_url}
          alt={img.caption || img.studio_name}
          loading={isEager ? 'eager' : 'lazy'}
          fetchpriority={isEager ? 'high' : 'auto'}
          onLoad={() => setLoaded(true)}
          style={{
            width: '100%', height: '100%', objectFit: 'cover', display: 'block',
            opacity: loaded ? 1 : 0,
            transition: loaded ? `opacity 0.4s ease ${staggerDelay}` : 'none',
          }}
        />

        {/* Selected overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: isSelected ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0)',
          transition: 'background 0.15s',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
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
    </div>
  );
}

// ── Main ImageGrid ────────────────────────────────────────────────────────────
export default function ImageGrid({ selected, onToggle, prefetchedImages, prefetchLoading }) {
  const [page,    setPage]    = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef           = useRef(null);

  const allImages     = prefetchedImages || [];
  const loading       = prefetchLoading !== undefined ? prefetchLoading : false;
  const visibleImages = allImages.slice(0, page * PAGE_SIZE);

  useEffect(() => {
    setHasMore(visibleImages.length < allImages.length);
  }, [visibleImages.length, allImages.length]);

  // Silently preload the NEXT batch into browser cache
  // so when user scrolls they appear instantly without skeleton wait
  useEffect(() => {
    if (!allImages.length) return;
    const nextStart = page * PAGE_SIZE;
    const nextBatch = allImages.slice(nextStart, nextStart + PAGE_SIZE);
    if (nextBatch.length > 0) {
      // Small delay so current batch renders first
      const timer = setTimeout(() => preloadImages(nextBatch), 800);
      return () => clearTimeout(timer);
    }
  }, [page, allImages]);

  // Infinite scroll — IntersectionObserver (Option 2)
  const loadMore = useCallback(() => {
    if (hasMore) setPage(p => p + 1);
  }, [hasMore]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin: '600px' }  // trigger 600px before sentinel is visible
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  // Skeleton grid while loading (Option 5)
  if (loading) return (
    <>
      <style>{`
        @keyframes imgGridShimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @media (max-width: 600px) {
          .img-grid { display: block !important; columns: 2; column-gap: 10px; }
          .img-grid-item { break-inside: avoid; margin-bottom: 10px; }
          .img-grid-item button { aspect-ratio: unset !important; }
        }
      `}</style>
      <div className="img-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: 10,
      }}>
        {Array.from({ length: PAGE_SIZE }).map((_, i) => (
          <div key={i} className="img-grid-item"><SkeletonCard /></div>
        ))}
      </div>
    </>
  );

  if (!allImages.length) return (
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
    <>
      <style>{`
        @keyframes imgGridShimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @media (max-width: 600px) {
          .img-grid { display: block !important; columns: 2; column-gap: 10px; }
          .img-grid-item { break-inside: avoid; margin-bottom: 10px; }
          .img-grid-item button { aspect-ratio: unset !important; }
        }
      `}</style>

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

      <div className="img-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: 10,
      }}>
        {visibleImages.map((img, index) => (
          <ImageCard
            key={img.id}
            img={img}
            index={index % PAGE_SIZE}
            batchOffset={Math.floor(index / PAGE_SIZE) * PAGE_SIZE}
            isSelected={selected.includes(img.id)}
            onToggle={onToggle}
          />
        ))}

        {/* Skeleton placeholders at bottom while more loading */}
        {hasMore && Array.from({ length: 4 }).map((_, i) => (
          <div key={`sk-${i}`} className="img-grid-item"><SkeletonCard /></div>
        ))}
      </div>

      {/* Sentinel triggers next batch on scroll (Option 2) */}
      <div ref={sentinelRef} style={{ height: 1 }} />
    </>
  );
}

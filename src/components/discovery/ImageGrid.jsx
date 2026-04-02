import { useState, useEffect, useRef, useCallback } from 'react';

const BATCH_SIZE   = 20;  // images added to DOM per batch
const REVEAL_AT    = 15;  // add next batch when this many in current batch have loaded
const SCROLL_AHEAD = 400; // px before sentinel — fallback for fast scrollers

// ── Skeleton card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{
      aspectRatio: '3/4', borderRadius: 10, overflow: 'hidden',
      background: 'linear-gradient(90deg, var(--surface2) 25%, var(--surface3) 50%, var(--surface2) 75%)',
      backgroundSize: '200% 100%',
      animation: 'imgGridShimmer 1.4s infinite',
    }} />
  );
}

// ── Single image card ─────────────────────────────────────────────────────────
// onLoad is passed in so the parent can count loaded images per batch
function ImageCard({ img, index, isSelected, onToggle, onLoad, isFirstBatch }) {
  const [loaded, setLoaded] = useState(false);

  const handleLoad = () => {
    setLoaded(true);
    onLoad();
  };

  // Stagger only for first batch — gives intentional "filling in" feel
  const staggerDelay = isFirstBatch ? `${(index % BATCH_SIZE) * 40}ms` : '0ms';

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
        {/* Shimmer skeleton until loaded */}
        {!loaded && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(90deg, var(--surface2) 25%, var(--surface3) 50%, var(--surface2) 75%)',
            backgroundSize: '200% 100%',
            animation: 'imgGridShimmer 1.4s infinite',
            borderRadius: 8,
          }} />
        )}

        <img
          src={img.image_url}
          alt={img.caption || img.studio_name}
          loading="eager"
          fetchpriority={isFirstBatch ? 'high' : 'auto'}
          onLoad={handleLoad}
          style={{
            width: '100%', height: '100%', objectFit: 'cover', display: 'block',
            opacity: loaded ? 1 : 0,
            transition: loaded ? `opacity 0.3s ease ${staggerDelay}` : 'none',
          }}
        />

        {/* Selection overlay */}
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
  const allImages = prefetchedImages || [];
  const loading   = prefetchLoading !== undefined ? prefetchLoading : false;

  // visibleCount = how many images are currently in the DOM
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  // loadedInBatch = how many images in the CURRENT batch have fired onLoad
  const loadedInBatchRef = useRef(0);
  // which batch we're currently filling (0-indexed)
  const currentBatchRef  = useRef(0);
  const sentinelRef      = useRef(null);

  // Reset counters when image list changes (profile switch, new fetch)
  useEffect(() => {
    setVisibleCount(BATCH_SIZE);
    loadedInBatchRef.current = 0;
    currentBatchRef.current  = 0;
  }, [allImages]);

  const revealNextBatch = useCallback(() => {
    setVisibleCount(v => {
      const next = v + BATCH_SIZE;
      return next > allImages.length ? allImages.length : next;
    });
    loadedInBatchRef.current = 0;
    currentBatchRef.current += 1;
  }, [allImages.length]);

  // Called by each ImageCard when its image fires onLoad
  const handleImageLoad = useCallback((batchIndex) => {
    // Only count loads for the current batch to avoid stale increments
    if (batchIndex !== currentBatchRef.current) return;
    loadedInBatchRef.current += 1;
    // When REVEAL_AT images in the batch have loaded → add next batch to DOM
    if (
      loadedInBatchRef.current >= REVEAL_AT &&
      visibleCount < allImages.length
    ) {
      revealNextBatch();
    }
  }, [visibleCount, allImages.length, revealNextBatch]);

  // Fallback: IntersectionObserver for fast scrollers who outrun the load-trigger
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || visibleCount >= allImages.length) return;
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) revealNextBatch(); },
      { rootMargin: `${SCROLL_AHEAD}px` }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleCount, allImages.length, revealNextBatch]);

  // ── Loading state ──────────────────────────────────────────────────────────
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
        {Array.from({ length: BATCH_SIZE }).map((_, i) => (
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

  const visibleImages = allImages.slice(0, visibleCount);
  const hasMore       = visibleCount < allImages.length;

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
        {visibleImages.map((img, index) => {
          const batchIndex = Math.floor(index / BATCH_SIZE);
          return (
            <ImageCard
              key={img.id}
              img={img}
              index={index}
              isSelected={selected.includes(img.id)}
              onToggle={onToggle}
              onLoad={() => handleImageLoad(batchIndex)}
              isFirstBatch={batchIndex === 0}
            />
          );
        })}

        {/* A few skeleton cards at the bottom while next batch is pending */}
        {hasMore && Array.from({ length: 4 }).map((_, i) => (
          <div key={`sk-${i}`} className="img-grid-item"><SkeletonCard /></div>
        ))}
      </div>

      {/* Sentinel — fallback trigger for fast scrollers */}
      {hasMore && <div ref={sentinelRef} style={{ height: 1 }} />}
    </>
  );
}

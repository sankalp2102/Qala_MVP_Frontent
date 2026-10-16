import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { mediaUrl } from '../../utils/mediaUrl';

// ── Shared full-catalog lightbox ────────────────────────────────────────────
// Extracted from StudioProfile.jsx's Lightbox (studio-v3-lb-*) so the match
// card's "+N" tile can open the exact same full-catalog viewer the studio
// profile page's portfolio grid opens — same controls, same hover-for-details
// treatment on the open image, same filmstrip — instead of a separate,
// visually different popup. Self-contained (styles inlined via the <style>
// tag below) so it works on any page, not just under the .studio-v3 scope.
export const isVideoAsset = (item) =>
  item?.mime_type?.startsWith('video/') || /\.(mp4|mov|avi|webm|mkv)$/i.test(item?.url || '');

export default function MediaLightbox({ images, startIndex, onClose }) {
  const [idx, setIdx]     = useState(startIndex);
  const [muted, setMuted] = useState(true);
  const [frameHover, setFrameHover] = useState(false);
  const videoRef          = useRef(null);

  useEffect(() => {
    const handler = e => {
      if (e.key === 'Escape')     onClose();
      if (e.key === 'ArrowRight') setIdx(i => Math.min(i + 1, images.length - 1));
      if (e.key === 'ArrowLeft')  setIdx(i => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [images.length, onClose]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  }, [idx]);

  const current = images[idx];
  const isVideo = isVideoAsset(current);
  // Serve compressed derivatives — originals stay stored, just not served here.
  const lbSrc = isVideo
    ? (current?.compressed_video_url || current?.url)
    : (current?.thumbnail_url || current?.url);
  // Same shape/limit as the grid card's hover tags — a piece shows the same
  // details whether you're hovering the grid thumbnail or the opened image.
  const lbTags = [...(current?.crafts_used || []), ...(current?.fabrics_used || [])].slice(0, 4);

  const ctrl = {
    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
    color: '#fff', borderRadius: '50%', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };

  return createPortal(
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      background: 'rgba(15,10,8,0.95)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'mediaLbIn 0.2s ease',
    }}>
      <style>{`@keyframes mediaLbIn { from { opacity: 0 } to { opacity: 1 } }`}</style>

      <button onClick={onClose} style={{ ...ctrl, position: 'absolute', top: 20, right: 24, width: 40, height: 40, fontSize: 18 }}>×</button>

      <div style={{ position: 'absolute', top: 24, left: '50%', transform: 'translateX(-50%)', fontSize: 12, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em' }}>
        {idx + 1} / {images.length}
      </div>

      {isVideo && (
        <button onClick={e => { e.stopPropagation(); setMuted(m => !m); }}
          title={muted ? 'Unmute' : 'Mute'}
          style={{ ...ctrl, position: 'absolute', top: 20, left: 24, width: 40, height: 40, fontSize: 15 }}>
          {muted ? '🔇' : '🔊'}
        </button>
      )}

      {idx > 0 && (
        <button onClick={e => { e.stopPropagation(); setIdx(i => i - 1); }}
          style={{ ...ctrl, position: 'absolute', left: 20, width: 44, height: 44, fontSize: 20 }}>‹</button>
      )}

      <div
        onClick={e => e.stopPropagation()}
        onMouseEnter={() => setFrameHover(true)}
        onMouseLeave={() => setFrameHover(false)}
        style={{ position: 'relative', maxWidth: '88vw', maxHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        {isVideo ? (
          <video ref={videoRef} key={lbSrc} src={mediaUrl(lbSrc)} autoPlay loop muted={muted} playsInline
            style={{ maxWidth: '88vw', maxHeight: '80vh', borderRadius: 'var(--r-8)', display: 'block', outline: 'none' }} />
        ) : (
          <img src={mediaUrl(lbSrc)} alt=""
            style={{ maxWidth: '88vw', maxHeight: '80vh', width: 'auto', height: 'auto', objectFit: 'contain', display: 'block', borderRadius: 'var(--r-8)' }} />
        )}

        {(current?.product_name || lbTags.length > 0) && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(10,6,4,0.82) 0%, transparent 45%)',
            opacity: frameHover ? 1 : 0, transition: 'opacity 0.2s',
            display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
            padding: 20, pointerEvents: 'none', borderRadius: 'var(--r-8)',
          }}>
            {current?.product_name && (
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 500, color: '#fff', marginBottom: 6 }}>
                {current.product_name}
              </div>
            )}
            {lbTags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {lbTags.map((t, i) => (
                  <span key={i} style={{
                    fontSize: 11, color: 'rgba(255,255,255,0.85)', background: 'rgba(255,255,255,0.15)',
                    padding: '3px 9px', borderRadius: 14, backdropFilter: 'blur(4px)',
                  }}>
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {idx < images.length - 1 && (
        <button onClick={e => { e.stopPropagation(); setIdx(i => i + 1); }}
          style={{ ...ctrl, position: 'absolute', right: 20, width: 44, height: 44, fontSize: 20 }}>›</button>
      )}

      <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8, maxWidth: '90vw', overflowX: 'auto', padding: '4px 0' }}>
        {images.map((img, i) => {
          const isVid = isVideoAsset(img);
          const stripSrc = isVid ? (img?.compressed_video_url || img?.url) : (img?.thumbnail_url || img?.url);
          const frame = {
            width: 52, height: 40, borderRadius: 'var(--r-5)', cursor: 'pointer', flexShrink: 0,
            border: i === idx ? '2px solid var(--sage)' : '2px solid transparent',
            opacity: i === idx ? 1 : 0.5, transition: 'all 0.15s',
          };
          return isVid ? (
            <div key={i} onClick={e => { e.stopPropagation(); setIdx(i); }}
              style={{ ...frame, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 14, color: '#fff' }}>▶</span>
            </div>
          ) : (
            <img key={i} src={mediaUrl(stripSrc)} alt="" onClick={e => { e.stopPropagation(); setIdx(i); }}
              style={{ ...frame, objectFit: 'cover' }} />
          );
        })}
      </div>
    </div>,
    document.body
  );
}
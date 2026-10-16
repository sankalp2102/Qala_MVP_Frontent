// src/components/discovery/QalawatiAvatar.jsx
//
// Shared Qalawati avatar mark — extracted here so QalawatiIntro.jsx and
// ChatMessage.jsx (the per-message AI avatar) use the exact same artwork
// instead of two copies of this SVG drifting apart over time.
//
// Redesign (Oct 2026, qala-brief-spec.docx v1.0 / qala-welcome-screen.html):
// replaces the old mannequin-mark SVG with the spec's embroidery-hoop motif
// — outer terracotta circle, inner hoop ring, five petal-like ellipses at
// 72° intervals, a central knot, and a threaded needle pointing upper-right
// — reproduced from the prototype's E_AV_SVG/avatar-svg markup exactly.
const AVATAR_SVG = `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <circle cx="32" cy="32" r="32" fill="#D4836A"/>
  <circle cx="27" cy="37" r="17" fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="2.5"/>
  <circle cx="27" cy="37" r="14.5" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.28)" stroke-width="0.8"/>
  <rect x="23.5" y="18.8" width="7" height="3.5" rx="1.75" fill="rgba(255,255,255,0.9)"/>
  <ellipse cx="27" cy="32.5" rx="2.2" ry="3.5" fill="#fff" opacity="0.88"/>
  <ellipse cx="31.3" cy="35.6" rx="2.2" ry="3.5" fill="#fff" opacity="0.88" transform="rotate(72 31.3 35.6)"/>
  <ellipse cx="29.6" cy="40.6" rx="2.2" ry="3.5" fill="#fff" opacity="0.88" transform="rotate(144 29.6 40.6)"/>
  <ellipse cx="24.4" cy="40.6" rx="2.2" ry="3.5" fill="#fff" opacity="0.88" transform="rotate(216 24.4 40.6)"/>
  <ellipse cx="22.7" cy="35.6" rx="2.2" ry="3.5" fill="#fff" opacity="0.88" transform="rotate(288 22.7 35.6)"/>
  <circle cx="27" cy="37" r="2.8" fill="#fff"/>
  <path d="M46.5 10 L32.5 27 L31.2 30.2 L34 27.2 Z" fill="#fff"/>
  <ellipse cx="46.5" cy="10" rx="1.8" ry="0.85" fill="#C4644A" transform="rotate(-48 46.5 10)"/>
  <path d="M45.5 9 Q54 3 57.5 11 Q60 19 54 24.5" fill="none" stroke="#fff" stroke-width="1.2" stroke-linecap="round" opacity="0.75"/>
</svg>`;

// `pulse` adds the spec's two concentric ripple rings (::before/::after in
// the prototype, reproduced here as real sibling elements since dangerously-
// set inner HTML can't carry pseudo-elements) plus a slow breathing scale on
// the mark itself — used for the welcome screen and the Stage-3 presence
// header. Per-message chat avatars (ChatMessage.jsx) pass no `pulse`, same
// static mark as before.
export default function QalawatiAvatar({ size = 36, pulse = false, style } = {}) {
  if (!pulse) {
    return (
      <div
        style={{ width: size, height: size, flexShrink: 0, ...style }}
        dangerouslySetInnerHTML={{ __html: AVATAR_SVG }}
      />
    );
  }
  const ringSize = size * 1.67; // matches spec ratio: 96px mark -> 160px max ripple
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0, ...style }}>
      <style>{`
        @keyframes qwRipple { 0% { width: ${size}px; height: ${size}px; opacity: 0.9; } 100% { width: ${ringSize}px; height: ${ringSize}px; opacity: 0; } }
        @keyframes qwBreathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.04); } }
        .qw-ripple { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); border-radius: 50%; background: rgba(212,131,106,0.22); animation: qwRipple 3s ease-out infinite; pointer-events: none; }
        .qw-ripple.b { background: rgba(212,131,106,0.12); animation-delay: 1.2s; }
      `}</style>
      <div className="qw-ripple" />
      <div className="qw-ripple b" />
      <div
        style={{ position: 'relative', width: size, height: size, zIndex: 1, animation: 'qwBreathe 4s ease-in-out infinite' }}
        dangerouslySetInnerHTML={{ __html: AVATAR_SVG }}
      />
    </div>
  );
}
// src/pages/legal/LegalPageLayout.jsx
//
// Shared chrome for legal pages (Terms & Conditions, Refund & Cancellation
// Policy) — same nav bar, fonts and color tokens as Landing.jsx, so these
// read as part of the same site rather than a bolted-on document viewer.
// Content itself lives in each page file; this only provides the frame
// (nav → title/last-updated → content slot → footer with a link to the
// other legal page and back home).
import { Link, useNavigate } from 'react-router-dom';

const shell = { maxWidth: 760, margin: '0 auto', padding: '0 clamp(16px,4vw,28px)' };

export function LegalSection({ n, title, children }) {
  return (
    <div style={{ marginTop: 34 }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--ink-warm)', marginBottom: 12 }}>
        {n ? `${n}. ` : ''}{title}
      </h2>
      <div style={{ fontSize: 14.5, lineHeight: 1.75, color: 'var(--ink-warm-mid)' }}>
        {children}
      </div>
    </div>
  );
}

export function LegalList({ items, ordered = false }) {
  const Tag = ordered ? 'ol' : 'ul';
  return (
    <Tag style={{ margin: '8px 0 0', paddingLeft: 20 }}>
      {items.map((it, i) => (
        <li key={i} style={{ marginBottom: 8 }}>{it}</li>
      ))}
    </Tag>
  );
}

export default function LegalPageLayout({ title, lastUpdated, otherPolicy, children }) {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: '#fff', color: 'var(--ink-warm)', fontFamily: 'var(--font-body)' }}>
      {/* ── Nav — same sticky, blurred bar as Landing.jsx ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255,255,255,0.86)', backdropFilter: 'blur(8px)', borderBottom: '0.5px solid var(--border-warm)' }}>
        <div style={{ display: 'flex', alignItems: 'center', height: 58, ...shell }}>
          <Link to="/" style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 500, letterSpacing: '0.1em', color: 'var(--ink-warm)', textDecoration: 'none' }}>Qala</Link>
          <div
            onClick={() => navigate('/')}
            style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--ink-warm-mid)', cursor: 'pointer' }}
          >
            ← Back to qala.studio
          </div>
        </div>
      </div>

      {/* ── Title ── */}
      <div style={{ ...shell, padding: '52px clamp(16px,4vw,28px) 0' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px,4.4vw,40px)', fontWeight: 500, letterSpacing: '-0.01em', marginBottom: 8 }}>
          {title}
        </h1>
        <p style={{ fontSize: 13, color: 'var(--ink-warm-mute)' }}>Last updated: {lastUpdated}</p>
        <div style={{ borderTop: '0.5px solid var(--border-warm-s)', marginTop: 24 }} />
      </div>

      {/* ── Content ── */}
      <div style={{ ...shell, padding: '0 clamp(16px,4vw,28px) 60px' }}>
        {children}
      </div>

      {/* ── Footer — same line as Landing.jsx, plus a link across to the
             other legal page and back home. ── */}
      <div style={{ borderTop: '0.5px solid var(--border-warm)', padding: '30px 0', textAlign: 'center', color: 'var(--ink-warm-mute)', fontSize: 11.5 }}>
        <div style={{ marginBottom: 10 }}>
          <Link to="/" style={{ color: 'var(--ink-warm-mid)', textDecoration: 'underline', textUnderlineOffset: 3 }}>qala.studio</Link>
          {' · '}
          <Link to={otherPolicy.to} style={{ color: 'var(--ink-warm-mid)', textDecoration: 'underline', textUnderlineOffset: 3 }}>{otherPolicy.label}</Link>
        </div>
        Qala · The custom manufacturing platform for brands &amp; retailers · Made with India's craft studios
      </div>
    </div>
  );
}
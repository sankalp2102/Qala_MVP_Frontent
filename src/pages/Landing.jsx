import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { discoveryAPI } from '../api/client';
import qalaLogo from '../assets/qala-logo.png';
import UserAvatar from '../components/UserAvatar';

// Animated weave background using canvas
function WeaveCanvas() {
  const ref = useRef();
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;
    let t = 0;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      const { width: W, height: H } = canvas;
      ctx.clearRect(0, 0, W, H);

      const cols = 28;
      const rows = 18;
      const cw = W / cols;
      const ch = H / rows;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const phase = (c + r) * 0.4 + t;
          const alpha = (Math.sin(phase) * 0.5 + 0.5) * 0.06 + 0.015;
          const isWarp = (c + r) % 2 === 0;
          ctx.strokeStyle = `rgba(159,101,71,${alpha})`;
          ctx.lineWidth = isWarp ? 1 : 0.5;
          ctx.beginPath();
          if (isWarp) {
            ctx.moveTo(c * cw + cw / 2, r * ch);
            ctx.lineTo(c * cw + cw / 2, (r + 1) * ch);
          } else {
            ctx.moveTo(c * cw, r * ch + ch / 2);
            ctx.lineTo((c + 1) * cw, r * ch + ch / 2);
          }
          ctx.stroke();
        }
      }
      t += 0.008;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={ref} style={{ position:'absolute', inset:0, zIndex:0, pointerEvents:'none' }} />;
}

export default function Landing() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [hasSession, setHasSession] = useState(false);
  const [visible, setVisible]       = useState(false);

  useEffect(() => {
    if (user?.role === 'admin')  { nav('/admin');     return; }
    if (user?.role === 'seller') { nav('/dashboard'); return; }
    // customers stay on landing — they see the avatar
    const tok = discoveryAPI.getStoredSession();
    if (tok) setHasSession(true);
    setTimeout(() => setVisible(true), 80);

    // Silently preload Q1 images in background so they're cached before user gets there
    const CACHE_KEY = 'qala_img_cache_v1';
    try {
      const existing = sessionStorage.getItem(CACHE_KEY);
      if (existing) return; // already cached this session — skip
    } catch {}

    discoveryAPI.getImages()
      .then(r => {
        const all = (r.data.images || []).filter(
          img => !(img.mime_type?.startsWith('video/') ||
                   /\.(mp4|mov|avi|webm|mkv)$/i.test(img.image_url || ''))
        );
        // Shuffle once per session for random feel
        const shuffled = [...all].sort(() => Math.random() - 0.5);
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(shuffled));
        } catch {}
        // Preload first 20 images silently into browser cache
        shuffled.slice(0, 20).forEach(img => {
          if (!img.image_url) return;
          const image = new window.Image();
          image.src = img.image_url;
        });
      })
      .catch(() => {});
  }, [user]);

  const S = {
    page: {
      minHeight: '100vh', background: '#F8F5F1', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      position: 'relative',
    },
    hero: {
      flex: 1, position: 'relative', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', padding: '80px 24px 60px',
    },
    nav: {
      position: 'absolute', top: 0, left: 0, right: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '28px 48px', zIndex: 10,
    },
    logo: {
      display: 'flex', alignItems: 'center', gap: 10,
      fontFamily: 'var(--font-display)', fontSize: 22,
      fontWeight: 400, color: 'var(--text)', letterSpacing: '0.1em',
    },
    logoMark: {
      width: 32, height: 32, borderRadius: 8,
      border: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 16, fontFamily: 'var(--font-display)', fontWeight: 400,
    },
    loginLink: {
      fontSize: 12, color: 'var(--text3)', letterSpacing: '0.08em',
      textTransform: 'uppercase', cursor: 'pointer', fontWeight: 500,
      border: '1px solid var(--border)', borderRadius: 6, padding: '6px 14px',
      background: 'none', transition: 'color 0.2s, border-color 0.2s',
    },
    eyebrow: {
      display: 'inline-flex', alignItems: 'center', gap: 8,
      border: '1px solid var(--border)', borderRadius: 20,
      padding: '5px 14px', fontSize: 11, color: 'var(--text3)',
      letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 500,
      marginBottom: 32, background: 'rgba(255,255,255,0.6)',
    },
    dot: {
      width: 5, height: 5, borderRadius: '50%',
      background: 'var(--gold)', opacity: 0.8,
      animation: 'pulse 2s ease-in-out infinite',
    },
    headline: {
      fontFamily: 'var(--font-display)', fontSize: 'clamp(38px, 5.5vw, 80px)',
      fontWeight: 400, color: 'var(--text)', lineHeight: 1.08,
      textAlign: 'center', maxWidth: 820, marginBottom: 20,
      letterSpacing: '-0.01em',
    },
    sub: {
      fontSize: 'clamp(13px, 1.5vw, 16px)', color: 'var(--text3)',
      textAlign: 'center', letterSpacing: '0.18em',
      textTransform: 'uppercase', fontWeight: 400, marginBottom: 52,
    },
    ctaWrap: {
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
    },
    cta: {
      padding: '16px 48px', background: '#1A1612', color: '#F5F0E8',
      border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500,
      letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer',
      transition: 'transform 0.2s, box-shadow 0.2s, background 0.2s',
      fontFamily: 'var(--font-body)',
    },
    resumeChip: {
      display: 'flex', alignItems: 'center', gap: 8,
      border: '1px solid var(--border)', borderRadius: 20,
      padding: '8px 18px', cursor: 'pointer', background: 'rgba(255,255,255,0.6)',
      fontSize: 12, color: 'var(--text2)', transition: 'border-color 0.2s',
      fontFamily: 'var(--font-body)',
    },
    // Process strip
    strip: {
      borderTop: '1px solid var(--border)',
      padding: '60px 48px 72px',
      display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 0, position: 'relative', zIndex: 1,
      background: 'rgba(255,255,255,0.5)',
    },
    stepNum: {
      fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 400,
      color: 'rgba(196,110,73,0.12)', lineHeight: 1, marginBottom: 16,
      letterSpacing: '-0.02em',
    },
    stepLabel: {
      fontSize: 10, fontWeight: 400, color: 'var(--text3)',
      letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12,
    },
    stepTitle: {
      fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400,
      color: 'var(--text)', marginBottom: 10, letterSpacing: '-0.01em',
    },
    stepDesc: {
      fontSize: 13, color: 'var(--text3)', lineHeight: 1.7, maxWidth: 260,
    },
    stepDivider: {
      position: 'absolute', top: '50%', width: 1,
      height: 80, background: 'var(--border)',
      transform: 'translateY(-50%)',
    },
  };

  const transBase = {
    transition: 'opacity 0.7s ease, transform 0.7s ease',
    opacity: visible ? 1 : 0,
    transform: visible ? 'none' : 'translateY(24px)',
  };

  const steps = [
    { num: '01', label: 'DISCOVER', title: 'Start with your idea.\nWe\'ll take it from there.', desc: 'Tell us what you\'re looking to make, even if it\'s not fully defined. We help you find studios you can trust to bring it to life.' },
    { num: '02', label: 'CONNECT', title: 'Get matched with studios\nthat understand your vision.', desc: 'We recommend designer-led studios based on your style, craft technique, and batch size — so you don\'t have to figure India out alone.' },
    { num: '03', label: 'CREATE', title: 'Make your collection\nwithout the usual chaos.', desc: 'Work directly with studios while Qala stays involved — so you can focus on creating, while we keep production on track.' },
  ];

  return (
    <div style={S.page}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:0.6} 50%{opacity:1} }
        @keyframes floatY { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        .cta-btn:hover { transform: translateY(-2px) !important; box-shadow: 0 8px 40px rgba(196,110,73,0.3) !important; background: #C46E49 !important; }
        .cta-btn:active { transform: translateY(0) !important; }
        .resume-chip:hover { border-color: var(--border2) !important; background: rgba(255,255,255,0.9) !important; }
        .login-link:hover { color: var(--text) !important; border-color: var(--border2) !important; }
        @media (max-width: 768px) {
          .process-strip { grid-template-columns: 1fr !important; padding: 48px 24px !important; gap: 40px !important; }
          .step-divider { display: none !important; }
          .nav-wrap { padding: 20px 24px !important; }
        }
      `}</style>

      {/* Nav */}
      <div style={S.nav} className="nav-wrap">
        <div style={S.logo}>
          <img src={qalaLogo} alt="Qala" className="qala-logo" />
        </div>
        <UserAvatar loginStyle={S.loginLink} />
      </div>

      {/* Hero */}
      <section style={S.hero}>
        <WeaveCanvas />

        {/* Radial glow */}
        <div style={{
          position: 'absolute', top: '40%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 600, height: 400,
          background: 'radial-gradient(ellipse, rgba(196,110,73,0.06) 0%, transparent 70%)',
          pointerEvents: 'none', zIndex: 0,
        }} />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ ...S.eyebrow, ...transBase, transitionDelay: '0s' }}>
            <div style={S.dot} />
            Craft Marketplace · India
          </div>

          <h1 style={{ ...S.headline, ...transBase, transitionDelay: '0.1s', maxWidth: 900 }}>
            The <span style={{ color: 'var(--gold)' }}>Custom Manufacturing</span> Platform for Brands & Retailers
          </h1>

          <p style={{
            ...S.sub,
            ...transBase,
            transitionDelay: '0.2s',
            textTransform: 'none',
            letterSpacing: '0.01em',
            maxWidth: 720,
            lineHeight: 1.7,
            fontSize: 'clamp(14px, 1.6vw, 18px)',
            marginBottom: 20,
          }}>
            From vision to finished product; manufacture with India's finest production houses. Embroidery, Handloom, Block printing, Natural dyes & more.
          </p>

          {/* Three pillars */}
          <div style={{
            ...transBase,
            transitionDelay: '0.25s',
            display: 'flex', alignItems: 'center', gap: 12,
            marginBottom: 44,
          }}>
            {[
              'Small batches',
              'Luxury grade',
              'Fully managed',
            ].reduce((acc, pill, i) => {
              if (i > 0) acc.push(
                <span key={`d${i}`} style={{ color: 'var(--border2)', fontSize: 14, lineHeight: 1 }}>·</span>
              );
              acc.push(
                <span key={pill} style={{
                  fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600,
                  color: 'var(--text3)', letterSpacing: '0.14em', textTransform: 'uppercase',
                }}>{pill}</span>
              );
              return acc;
            }, [])}
          </div>

          <div style={{ ...S.ctaWrap, ...transBase, transitionDelay: '0.3s' }}>
            <button
              className="cta-btn"
              style={S.cta}
              onClick={() => nav('/discover')}
            >
              Tell us What you want to Make
            </button>

            {hasSession && (
              <button
                className="resume-chip"
                style={S.resumeChip}
                onClick={() => nav('/discover/results')}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
                Continue where you left off
              </button>
            )}
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{
          position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          opacity: 0.4, animation: 'floatY 2.5s ease-in-out infinite',
        }}>
          <div style={{ width: 1, height: 40, background: 'var(--border2)' }} />
          <span style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text3)' }}>How It Works</span>
        </div>
      </section>

      {/* Process Strip */}
      <section style={S.strip} className="process-strip">
        {steps.map((step, i) => (
          <div key={i} style={{ padding: '0 40px', position: 'relative' }}>
            {i > 0 && (
              <div className="step-divider" style={{ ...S.stepDivider, left: 0 }} />
            )}
            <div style={S.stepNum}>{step.num}</div>
            <div style={{
              ...S.stepLabel,
              fontSize: 13,
              fontWeight: 800,
              color: 'var(--gold)',
              letterSpacing: '0.18em',
              marginBottom: 14,
              fontFamily: 'var(--font-body)',
            }}>{step.label}</div>
            <div style={S.stepTitle}>{step.title.split('\n').map((l, j) => <span key={j}>{l}{j === 0 && <br />}</span>)}</div>
            <p style={S.stepDesc}>{step.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
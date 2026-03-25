import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { discoveryAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import qalaLogo from '../assets/qala-logo.png';

// ─── Lightbox ────────────────────────────────────────────────────────────────
function Lightbox({ images, startIndex, onClose }) {
  const [idx, setIdx] = useState(startIndex);

  useEffect(() => {
    const handler = e => {
      if (e.key === 'Escape')      onClose();
      if (e.key === 'ArrowRight')  setIdx(i => Math.min(i + 1, images.length - 1));
      if (e.key === 'ArrowLeft')   setIdx(i => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [images.length, onClose]);

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(15,10,8,0.95)', backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'lbIn 0.2s ease',
      }}
    >
      <style>{`@keyframes lbIn{from{opacity:0}to{opacity:1}}`}</style>

      {/* Close */}
      <button onClick={onClose} style={{
        position: 'absolute', top: 20, right: 24,
        background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
        color: '#fff', width: 40, height: 40, borderRadius: '50%',
        fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>×</button>

      {/* Counter */}
      <div style={{
        position: 'absolute', top: 24, left: '50%', transform: 'translateX(-50%)',
        fontSize: 12, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em',
      }}>{idx + 1} / {images.length}</div>

      {/* Prev */}
      {idx > 0 && (
        <button onClick={e => { e.stopPropagation(); setIdx(i => i - 1); }} style={{
          position: 'absolute', left: 20, background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.15)', color: '#fff',
          width: 44, height: 44, borderRadius: '50%', fontSize: 20, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>‹</button>
      )}

      {/* Image — constrained container prevents overflow */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '88vw', maxHeight: '80vh',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <img
          src={images[idx]?.url}
          style={{
            maxWidth: '88vw', maxHeight: '80vh',
            width: 'auto', height: 'auto',
            objectFit: 'contain', display: 'block', borderRadius: 8,
          }}
          alt=""
        />
      </div>

      {/* Next */}
      {idx < images.length - 1 && (
        <button onClick={e => { e.stopPropagation(); setIdx(i => i + 1); }} style={{
          position: 'absolute', right: 20, background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.15)', color: '#fff',
          width: 44, height: 44, borderRadius: '50%', fontSize: 20, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>›</button>
      )}

      {/* Thumbnails */}
      <div style={{
        position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: 8, maxWidth: '90vw', overflowX: 'auto', padding: '4px 0',
      }}>
        {images.map((img, i) => (
          <img
            key={i}
            src={img.url}
            onClick={e => { e.stopPropagation(); setIdx(i); }}
            style={{
              width: 52, height: 40, objectFit: 'cover', borderRadius: 5, cursor: 'pointer',
              flexShrink: 0,
              border: i === idx ? '2px solid var(--gold)' : '2px solid transparent',
              opacity: i === idx ? 1 : 0.5,
              transition: 'all 0.15s',
            }}
            alt=""
          />
        ))}
      </div>
    </div>,
    document.body
  );
}

// ─── Image Gallery ────────────────────────────────────────────────────────────
function Gallery({ images }) {
  const [lb, setLb] = useState(null);
  if (!images?.length) return null;

  const first = images.slice(0, 1);
  const rest  = images.slice(1, 5);

  return (
    <>
      {lb !== null && <Lightbox images={images} startIndex={lb} onClose={() => setLb(null)} />}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, borderRadius: 12, overflow: 'hidden' }}>
        {/* Main big image */}
        <div
          style={{ gridRow: '1 / 3', cursor: 'pointer', overflow: 'hidden', position: 'relative', minHeight: 300 }}
          onClick={() => setLb(0)}
        >
          <img src={first[0]?.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.4s ease' }}
            onMouseEnter={e => e.target.style.transform = 'scale(1.04)'}
            onMouseLeave={e => e.target.style.transform = 'scale(1)'}
          />
        </div>
        {/* Grid of 4 thumbnails */}
        {rest.map((img, i) => (
          <div key={i}
            style={{ cursor: 'pointer', overflow: 'hidden', position: 'relative', height: 148 }}
            onClick={() => setLb(i + 1)}
          >
            <img src={img.url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.4s ease' }}
              onMouseEnter={e => e.target.style.transform = 'scale(1.06)'}
              onMouseLeave={e => e.target.style.transform = 'scale(1)'}
            />
            {/* "View all" overlay on last */}
            {i === 3 && images.length > 5 && (
              <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(15,10,8,0.65)', backdropFilter: 'blur(2px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', gap: 4,
              }}>
                <span style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>+{images.length - 5}</span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.1em' }}>VIEW ALL</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

// ─── Tag chip ─────────────────────────────────────────────────────────────────
function Tag({ children, gold }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '4px 12px', borderRadius: 20,
      background: gold ? 'var(--gold-dim)' : 'var(--surface2)',
      border: `1px solid ${gold ? 'rgba(196,110,73,0.3)' : 'var(--border)'}`,
      color: gold ? 'var(--gold)' : 'var(--text2)',
      fontSize: 12, fontWeight: gold ? 600 : 400,
    }}>{children}</span>
  );
}

// ─── Section block ────────────────────────────────────────────────────────────
function Section({ title, children, style }) {
  return (
    <div style={{ marginBottom: 36, ...style }}>
      <div style={{
        fontSize: 10, fontWeight: 700, color: 'var(--gold)',
        letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 14,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span>{title}</span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>
      {children}
    </div>
  );
}

// ─── Inquiry Form ─────────────────────────────────────────────────────────────
function InquiryForm({ studio, onClose, onSuccess }) {
  const { user } = useAuth();
  const [name,    setName]    = useState(user?.name  || '');
  const [email,   setEmail]   = useState(user?.email || '');
  const [answers, setAnswers] = useState(
    (studio.pre_call_questions || []).map(q => ({ question: q.question, answer: '' }))
  );
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  const submit = async e => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) { setErr('Name and email are required'); return; }
    setErr(''); setSubmitting(true);
    try {
      const { discoveryAPI } = await import('../api/client');
      const tok = discoveryAPI.getStoredSession();
      await discoveryAPI.studioInquiry(studio.studio_id, {
        name, email,
        answers: answers.filter(a => a.answer.trim()),
        session_token: tok || undefined,
      });
      onSuccess?.();
    } catch (e) {
      setErr(e.response?.data?.errors ? JSON.stringify(e.response.data.errors) : 'Something went wrong. Try again.');
    } finally { setSubmitting(false); }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 8000,
      background: 'rgba(26,14,8,0.6)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, animation: 'lbIn 0.2s ease',
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)', borderRadius: 20,
          padding: '36px 40px', width: '100%', maxWidth: 520,
          border: '1px solid var(--border)',
          maxHeight: '90vh', overflowY: 'auto',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
            Connect with Studio
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
            {studio.studio_name}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.6 }}>
            Introduce yourself and answer the studio's questions. They'll get back to you directly.
          </p>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Name + Email */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="field">
              <label>Your Name *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Alex Rivera" required />
            </div>
            <div className="field">
              <label>Email *</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@brand.com" required />
            </div>
          </div>

          {/* Pre-call questions */}
          {answers.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>
                Studio's pre-call questions
              </div>
              {answers.map((a, i) => (
                <div className="field" key={i} style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 13, color: 'var(--text2)' }}>{a.question}</label>
                  <textarea
                    rows={2}
                    value={a.answer}
                    onChange={e => setAnswers(arr => arr.map((x, j) => j === i ? { ...x, answer: e.target.value } : x))}
                    placeholder="Your answer…"
                    style={{ resize: 'vertical', minHeight: 64 }}
                  />
                </div>
              ))}
            </div>
          )}

          {err && (
            <div style={{
              background: 'var(--red-dim)', border: '1px solid rgba(201,64,64,0.25)',
              borderLeft: '3px solid var(--red)', borderRadius: 8,
              padding: '10px 14px', fontSize: 13, color: 'var(--red)',
            }}>{err}</div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="submit" className="btn btn-primary" disabled={submitting}
              style={{ flex: 1, justifyContent: 'center', padding: '13px' }}>
              {submitting
                ? <><span className="spinner" style={{ width: 15, height: 15 }} /> Sending…</>
                : 'Send Introduction →'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={onClose} style={{ padding: '13px 20px' }}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Craft Carousel ───────────────────────────────────────────────────────────
// Navigation: vertical list on right (click) + keyboard arrows. No arrow buttons per PRD.
function CraftCarousel({ crafts }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const handler = e => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown')
        setActive(i => Math.min(i + 1, crafts.length - 1));
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp')
        setActive(i => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [crafts.length]);

  const c = crafts[active];
  const BASE = 'https://api.qala.studio';
  const imageUrl = c.image_url
    ? (c.image_url.startsWith('http') ? c.image_url : BASE + c.image_url)
    : null;

  return (
    <div style={{ display: 'flex', gap: 0, border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', background: 'var(--surface)' }}>

      {/* LEFT — large image + details */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* Image */}
        <div style={{ width: '100%', aspectRatio: '16/9', background: 'var(--surface2)', overflow: 'hidden', position: 'relative' }}>
          {imageUrl ? (
            <img
              key={imageUrl}
              src={imageUrl}
              alt={c.craft_name}
              loading="lazy"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'opacity 0.3s ease' }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, opacity: 0.15 }}>🧵</div>
          )}
        </div>

        {/* Details */}
        <div style={{ padding: '22px 24px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400, color: 'var(--text)', marginBottom: 6 }}>
            {c.craft_name}
          </div>

          {c.specialization && (
            <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 16 }}>{c.specialization}</p>
          )}

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: (c.limitations || c.delay_likelihood) ? 16 : 0 }}>
            {c.sampling_time_weeks && (
              <div>
                <div style={{ fontSize: 10, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>Sampling</div>
                <div style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 500 }}>{c.sampling_time_weeks} {c.sampling_time_weeks == 1 ? 'week' : 'weeks'}</div>
              </div>
            )}
            {c.production_timeline_months_50units && (
              <div>
                <div style={{ fontSize: 10, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>50 units</div>
                <div style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 500 }}>{c.production_timeline_months_50units} mo</div>
              </div>
            )}
            {c.innovation_level && (
              <div>
                <div style={{ fontSize: 10, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>Approach</div>
                <div style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 500, textTransform: 'capitalize' }}>{c.innovation_level} innovation</div>
              </div>
            )}
            {c.delay_likelihood && (
              <div>
                <div style={{ fontSize: 10, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>Delay likelihood</div>
                <div style={{ fontSize: 13, fontWeight: 500, textTransform: 'capitalize', color: c.delay_likelihood === 'high' ? 'var(--red, #c94040)' : c.delay_likelihood === 'medium' ? 'var(--amber, #b97a2a)' : 'var(--green, #4a7a4a)' }}>
                  {c.delay_likelihood}
                </div>
              </div>
            )}
          </div>

          {c.limitations && (
            <div style={{ padding: '10px 14px', background: 'var(--surface2)', borderRadius: 8, border: '1px solid var(--border)', fontSize: 12, color: 'var(--text3)', lineHeight: 1.6, marginBottom: c.delay_common_reasons ? 10 : 0 }}>
              <span style={{ fontWeight: 500, color: 'var(--text2)' }}>Well-known limitations: </span>{c.limitations}
            </div>
          )}

          {c.delay_common_reasons && (
            <div style={{ padding: '10px 14px', background: 'var(--surface2)', borderRadius: 8, border: '1px solid var(--border)', fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>
              <span style={{ fontWeight: 500, color: 'var(--text2)' }}>Common delay reasons: </span>{c.delay_common_reasons}
            </div>
          )}
          {/* No arrow buttons — navigation via right-side list + keyboard arrows */}
        </div>
      </div>

      {/* RIGHT — vertical craft list */}
      {crafts.length > 1 && (
        <div style={{
          width: 180, flexShrink: 0,
          borderLeft: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
          overflowY: 'auto',
        }}>
          <div style={{ padding: '14px 16px 10px', fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: '1px solid var(--border)' }}>
            All Crafts
          </div>
          {crafts.map((craft, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              style={{
                padding: '14px 16px', textAlign: 'left', border: 'none',
                borderBottom: i < crafts.length - 1 ? '1px solid var(--border)' : 'none',
                background: active === i ? 'var(--gold-dim)' : 'transparent',
                cursor: 'pointer', transition: 'background 0.15s',
                fontFamily: 'var(--font-body)',
              }}
              onMouseEnter={e => { if (active !== i) e.currentTarget.style.background = 'var(--surface2)'; }}
              onMouseLeave={e => { if (active !== i) e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{
                fontSize: 13, fontWeight: active === i ? 500 : 400,
                color: active === i ? 'var(--gold)' : 'var(--text2)',
                lineHeight: 1.4,
              }}>{craft.craft_name}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────
function Skeleton({ w = '100%', h = 16, r = 6, style }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: 'linear-gradient(90deg, var(--surface2) 25%, var(--surface3) 50%, var(--surface2) 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
      ...style,
    }} />
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function StudioProfile() {
  const { id } = useParams();
  const nav = useNavigate();

  const [studio,  setStudio]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [inquiryDone, setInquiryDone] = useState(false);
  const [btsOpen, setBtsOpen] = useState(false);
  const [btsLightboxOpen, setBtsLightboxOpen] = useState(false);
  const [btsStartIndex, setBtsStartIndex] = useState(0);
  const heroRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    discoveryAPI.getStudioProfile(id)
      .then(r => setStudio(r.data))
      .catch(e => {
        if (e.response?.status === 404) setError('This studio profile is not available.');
        else setError('Could not load studio profile. Please try again.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const allImages = studio
    ? [...(studio.work_images || []), ...(studio.bts_images || [])]
    : [];

  // ── Loading ──
  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      {/* Topbar placeholder */}
      <div style={{ height: 64, background: 'var(--surface)', borderBottom: '1px solid var(--border)' }} />
      {/* Hero placeholder */}
      <div style={{ height: 480, background: 'var(--surface2)' }} />
      <div className="studio-layout" style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 24px', display: 'grid', gridTemplateColumns: '1fr 320px', gap: 40 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Skeleton h={44} w="60%" r={8} />
          <Skeleton h={20} w="40%" />
          <Skeleton h={16} w="80%" />
          <Skeleton h={16} w="72%" />
          <Skeleton h={16} w="65%" />
        </div>
        <div><Skeleton h={280} r={16} /></div>
      </div>
    </div>
  );

  // ── Error ──
  if (error) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
      <div style={{ fontSize: 48, opacity: 0.3 }}>🏛</div>
      <p style={{ color: 'var(--text3)', fontSize: 15 }}>{error}</p>
      <button className="btn btn-ghost" onClick={() => nav(-1)}>← Go back</button>
    </div>
  );

  const s = studio;
  const heroUrl = s.hero_image?.url;
  const hasWork = s.work_images?.length > 0;
  const hasBts  = s.bts_images?.length  > 0;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <style>{`
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
        .profile-fade { animation: fadeUp 0.5s ease both; }
        .profile-fade-1 { animation-delay: 0.05s; }
        .profile-fade-2 { animation-delay: 0.12s; }
        .profile-fade-3 { animation-delay: 0.2s; }
        .profile-fade-4 { animation-delay: 0.28s; }
        @keyframes lbIn{from{opacity:0}to{opacity:1}}
        @media (max-width: 900px) {
          .studio-layout { grid-template-columns: 1fr !important; }
          .studio-sidebar { position: static !important; }
        }
      `}</style>

      {/* ── Sticky top bar ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: scrolled ? 'rgba(248,245,241,0.96)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent',
        transition: 'all 0.3s ease',
        padding: '0 32px', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => nav(-1)} style={{
            background: 'none', border: 'none', color: 'var(--text3)',
            fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            fontFamily: 'var(--font-body)', padding: '6px 0',
          }}>← Back</button>
          {scrolled && s.studio_name && (
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
              {s.studio_name}
            </span>
          )}
        </div>
        <Link to="/">
          <img src={qalaLogo} alt="Qala" className="qala-logo" />
        </Link>
      </div>

      {/* ── Hero ── */}
      <div ref={heroRef} style={{ position: 'relative', height: 480, overflow: 'hidden', background: 'var(--surface2)' }}>
        {heroUrl ? (
          <img src={heroUrl} alt={s.studio_name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.15, fontSize: 72 }}>🏛</div>
        )}
        {/* gradient overlay for readability */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, transparent 30%, rgba(15,10,8,0.7) 100%)',
        }} />
        {/* Studio name over hero */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 48px 40px' }}>
          <div className="profile-fade profile-fade-1" style={{
            fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)',
            letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8,
          }}>
            {s.location_city && s.location_state ? `${s.location_city}, ${s.location_state}` : s.location_city || s.location_state || ''}
          </div>
          <h1 className="profile-fade profile-fade-2" style={{
            fontFamily: 'var(--font-display)', fontSize: 'clamp(32px, 5vw, 58px)',
            fontWeight: 700, color: '#fff', lineHeight: 1.1, letterSpacing: '-0.01em',
            textShadow: '0 2px 24px rgba(0,0,0,0.4)',
          }}>
            {s.studio_name}
          </h1>
          {s.short_description && (
            <p className="profile-fade profile-fade-3" style={{
              marginTop: 12, fontSize: 14, color: 'rgba(255,255,255,0.7)',
              lineHeight: 1.6, maxWidth: 560,
            }}>
              {s.short_description}
            </p>
          )}
        </div>
      </div>

      {/* ── Main layout ── */}
      <div className="studio-layout" style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 24px', display: 'grid', gridTemplateColumns: '1fr 320px', gap: 40, alignItems: 'start' }}>

        {/* ── LEFT COLUMN ── */}
        <div style={{ minWidth: 0 }}>

          {/* Work portfolio gallery */}
          {hasWork && (
            <div className="profile-fade profile-fade-2" style={{ marginBottom: 44 }}>
              <Section title="Portfolio">
                <Gallery images={s.work_images} />
              </Section>
            </div>
          )}

          {/* Section 3: Top Strengths — "What We're Known For" */}
          {s.usps?.length > 0 && (
            <div className="profile-fade profile-fade-2" style={{ marginBottom: 44 }}>
              <Section title="What We're Known For">
                <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '8px 0', background: 'var(--surface)' }}>
                  {s.usps.slice(0, 4).map((usp, i) => (
                    <div key={i} style={{
                      display: 'flex', gap: 14, alignItems: 'flex-start',
                      padding: '14px 22px',
                      borderBottom: i < Math.min(s.usps.length, 4) - 1 ? '1px solid var(--border)' : 'none',
                    }}>
                      <span style={{ color: 'var(--gold)', fontSize: 18, lineHeight: 1, marginTop: 1, flexShrink: 0 }}>•</span>
                      <span style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.65 }}>{usp}</span>
                    </div>
                  ))}
                </div>
              </Section>
            </div>
          )}

          {/* Section 5A: Crafts carousel */}
          {s.crafts?.length > 0 && (
            <div className="profile-fade profile-fade-3" style={{ marginBottom: 44 }}>
              <Section title="Crafts & Specialisations">
                <CraftCarousel crafts={s.crafts} />
              </Section>
            </div>
          )}

          {/* Products */}
          {s.product_types?.length > 0 && (
            <div className="profile-fade profile-fade-4" style={{ marginBottom: 44 }}>
              <Section title="Garment Categories">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {s.product_types.map(p => (
                    <Tag key={p}>{p.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</Tag>
                  ))}
                </div>
              </Section>
            </div>
          )}

          {/* Fabrics */}
          {s.fabrics?.length > 0 && (
            <div className="profile-fade" style={{ marginBottom: 44 }}>
              <Section title="Fabrics">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {s.fabrics.map(f => (
                    <Tag key={f.fabric_name}>{f.fabric_name}</Tag>
                  ))}
                </div>
              </Section>
            </div>
          )}

          {/* Section 6A: Past Buyers */}
          {s.brands?.length > 0 && (
            <div className="profile-fade" style={{ marginBottom: 44 }}>
              <Section title="Brands We've Worked With">
                <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '8px 0', background: 'var(--surface)' }}>
                  {s.brands.map((b, i) => (
                    <div key={i} style={{
                      display: 'flex', gap: 14, alignItems: 'flex-start',
                      padding: '14px 22px',
                      borderBottom: i < s.brands.length - 1 ? '1px solid var(--border)' : 'none',
                    }}>
                      <span style={{ color: 'var(--gold)', fontSize: 18, lineHeight: 1, marginTop: 1, flexShrink: 0 }}>•</span>
                      <span style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.65 }}>
                        {b.scope
                          ? <>{b.scope} for <strong style={{ color: 'var(--text)', fontWeight: 600 }}>{b.brand_name}</strong></>
                          : <strong style={{ color: 'var(--text)', fontWeight: 600 }}>{b.brand_name}</strong>
                        }
                      </span>
                    </div>
                  ))}
                </div>
              </Section>
            </div>
          )}

          {/* Awards */}
          {s.awards?.length > 0 && (
            <div className="profile-fade" style={{ marginBottom: 44 }}>
              <Section title="Recognition">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {s.awards.map((a, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 16px',
                      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8,
                      fontSize: 13, color: 'var(--text2)',
                    }}>
                      <span style={{ color: 'var(--gold)', fontSize: 16 }}>★</span>
                      {a.link
                        ? <a href={a.link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold)', textDecoration: 'underline', textDecorationColor: 'rgba(196,110,73,0.4)' }}>{a.award_name}</a>
                        : <span>{a.award_name}</span>
                      }
                    </div>
                  ))}
                </div>
              </Section>
            </div>
          )}

          {/* BTS images */}
          {hasBts && (
            <div className="profile-fade" style={{ marginBottom: 44 }}>
              <Section title="Inside Our Studio">
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8 }}>
                  {s.bts_images.slice(0, 8).map((img, i) => (
                    <img key={i} src={img.url} alt="" loading="lazy"
                      onClick={() => { setBtsStartIndex(i); setBtsLightboxOpen(true); }}
                      style={{ width: 140, height: 100, objectFit: 'cover', borderRadius: 8, flexShrink: 0, cursor: 'pointer', transition: 'transform 0.2s' }}
                      onMouseEnter={e => e.target.style.transform = 'scale(1.03)'}
                      onMouseLeave={e => e.target.style.transform = 'scale(1)'}
                    />
                  ))}
                </div>
              </Section>
            </div>
          )}

          {/* Section 7: Who You'll Be Working With — BuyerCoordinator */}
          {s.coordinator && (
            <div className="profile-fade" style={{ marginBottom: 44 }}>
              <Section title="Who You'll Be Working With">
                <div style={{
                  border: '1px solid var(--border)', borderRadius: 12,
                  padding: '28px 28px', background: 'var(--surface)',
                  display: 'flex', gap: 24, alignItems: 'flex-start',
                }}>
                  {/* Photo */}
                  {s.coordinator.image_url && (
                    <div style={{ flexShrink: 0 }}>
                      <img
                        src={s.coordinator.image_url}
                        alt={s.coordinator.name}
                        loading="lazy"
                        style={{
                          width: 88, height: 88, borderRadius: '50%',
                          objectFit: 'cover', display: 'block',
                          border: '2px solid var(--border)',
                        }}
                      />
                    </div>
                  )}
                  {/* Text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
                      {s.coordinator.name}
                    </div>
                    {s.coordinator.position && (
                      <div style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 500, letterSpacing: '0.04em', marginBottom: 12 }}>
                        {s.coordinator.position}
                      </div>
                    )}
                    {s.coordinator.writeup && (
                      <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.75, margin: 0 }}>
                        {s.coordinator.writeup}
                      </p>
                    )}
                  </div>
                </div>
              </Section>
            </div>
          )}

          {/* Working style */}
          {s.poc_working_style && (
            <div className="profile-fade" style={{ marginBottom: 44 }}>
              <Section title="Working Style">
                <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.75, fontStyle: 'italic' }}>
                  "{s.poc_working_style}"
                </p>
              </Section>
            </div>
          )}

        </div>

        {/* ── RIGHT COLUMN — Sticky sidebar ── */}
        <div className="studio-sidebar" style={{ position: 'sticky', top: 80, display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>

          {/* Contact card */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 16, padding: '28px 24px',
            boxShadow: 'var(--shadow-gold)',
          }}>
            {inquiryDone ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>✉️</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
                  Introduction sent!
                </div>
                <p style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.6 }}>
                  {s.studio_name} will receive your message and get back to you.
                </p>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                    Connect with this studio
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.6 }}>
                    Introduce yourself and your project. They'll get back to you directly.
                  </p>
                </div>

                {/* Pre-call questions preview */}
                {s.pre_call_questions?.length > 0 && (
                  <div style={{ marginBottom: 18, padding: '12px 14px', background: 'var(--surface2)', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
                      They'll ask you
                    </div>
                    {s.pre_call_questions.slice(0, 2).map((q, i) => (
                      <div key={i} style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4, display: 'flex', gap: 6 }}>
                        <span style={{ color: 'var(--gold)', flexShrink: 0 }}>?</span>
                        {q.question}
                      </div>
                    ))}
                    {s.pre_call_questions.length > 2 && (
                      <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 4 }}>+{s.pre_call_questions.length - 2} more questions</div>
                    )}
                  </div>
                )}

                <button
                  className="btn btn-primary"
                  onClick={() => setInquiryOpen(true)}
                  style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: 14 }}
                >
                  Send Introduction →
                </button>
              </>
            )}
          </div>

          {/* Studio quick facts */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 16, padding: '22px 24px',
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 16 }}>Studio at a glance</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {s.location_city && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--text4)' }}>Location</span>
                  <span style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 500 }}>
                    {[s.location_city, s.location_state].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
              {s.years_in_operation && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--text4)' }}>Experience</span>
                  <span style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 500 }}>{s.years_in_operation} yrs</span>
                </div>
              )}
              {s.production?.monthly_capacity_units && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--text4)' }}>Monthly capacity</span>
                  <span style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 500 }}>{s.production.monthly_capacity_units.toLocaleString()} units</span>
                </div>
              )}
              {s.production?.has_strict_minimums !== null && s.production?.has_strict_minimums !== undefined && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--text4)' }}>MOQ</span>
                  <span style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 500 }}>
                    {s.production.has_strict_minimums ? 'Fixed minimums' : 'Flexible'}
                  </span>
                </div>
              )}
            </div>

            {/* MOQ entries */}
            {s.production?.moq_entries?.length > 0 && (
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>MOQ Details</div>
                {s.production.moq_entries.map((m, i) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 5 }}>
                    <span style={{ color: 'var(--text2)', fontWeight: 500 }}>{m.craft_or_category}</span>
                    {m.moq_condition && <span style={{ color: 'var(--text4)' }}> — {m.moq_condition}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* ── Portfolio lightbox (all work + bts images) ── */}
      {btsOpen && (
        <Lightbox
          images={allImages}
          startIndex={0}
          onClose={() => setBtsOpen(false)}
        />
      )}

      {/* ── BTS lightbox ── */}
      {btsLightboxOpen && (
        <Lightbox
          images={s.bts_images}
          startIndex={btsStartIndex}
          onClose={() => setBtsLightboxOpen(false)}
        />
      )}

      {/* ── Inquiry form modal ── */}
      {inquiryOpen && (
        <InquiryForm
          studio={s}
          onClose={() => setInquiryOpen(false)}
          onSuccess={() => { setInquiryOpen(false); setInquiryDone(true); }}
        />
      )}
    </div>
  );
}

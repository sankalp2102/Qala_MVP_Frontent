import { useState, useEffect, useRef, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { discoveryAPI, chatAPI, buyerAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import qalaLogo from '../assets/qala-logo.png';
import { mediaUrl, mediaOnError } from '../utils/mediaUrl';
import UserAvatar from '../components/UserAvatar';
import { RESERVED_PATHS } from '../App';

// ─── Badge helpers ────────────────────────────────────────────────────────────
// Badge display logic per brief §5 & §6:
//   qala_badge set → show that value (admin-assigned, overrides everything)
//   else is_primary → auto-show "Expert"
//   else → no badge
function resolveBadge(craft) {
  if (craft.qala_badge) return craft.qala_badge;
  if (craft.is_primary)  return 'expert';
  return null;
}

const BADGE_STYLES = {
  expert:  { bg: 'rgba(122,140,110,0.15)', border: 'rgba(122,140,110,0.35)', color: 'var(--gold)',    label: 'Expert'  },
  master:  { bg: 'rgba(139,94,60,0.15)',   border: 'rgba(139,94,60,0.4)',    color: '#C48050',        label: 'Master'  },
  skilled: { bg: 'rgba(74,122,106,0.15)',  border: 'rgba(74,122,106,0.35)', color: '#4A7A6A',        label: 'Skilled' },
};

function CraftBadge({ badge, small }) {
  const s = BADGE_STYLES[badge];
  if (!s) return null;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: small ? '2px 8px' : '3px 10px',
      borderRadius: 20,
      background: s.bg,
      border: `1px solid ${s.border}`,
      color: s.color,
      fontSize: small ? 10 : 11,
      fontWeight: 600,
      letterSpacing: '0.04em',
    }}>
      {s.label}
    </span>
  );
}

// ─── Fabric category label map ────────────────────────────────────────────────
const FABRIC_CATEGORY_LABELS = {
  cotton:      'Cotton',
  silk:        'Silk',
  linen:       'Linen & Bast',
  wool:        'Wool',
  regenerated: 'Regenerated',
  handcrafted: 'Handcrafted',
  other:       'Other',
};

// ─── Lightbox ─────────────────────────────────────────────────────────────────
function Lightbox({ images, startIndex, onClose }) {
  const [idx, setIdx]     = useState(startIndex);
  const [muted, setMuted] = useState(true);
  const videoRef          = useRef(null);

  useEffect(() => {
    const handler = e => {
      if (e.key === 'Escape')      onClose();
      if (e.key === 'ArrowRight')  setIdx(i => Math.min(i + 1, images.length - 1));
      if (e.key === 'ArrowLeft')   setIdx(i => Math.max(i - 1, 0));
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
  const isVideo = current?.mime_type?.startsWith('video/') ||
    /\.(mp4|mov|avi|webm|mkv)$/i.test(current?.url || '');
  // Use compressed/thumbnail version in lightbox — originals still stored, just not served
  const lbSrc = isVideo
    ? (current?.compressed_video_url || current?.url)
    : (current?.thumbnail_url || current?.url);

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

      <button onClick={onClose} style={{
        position: 'absolute', top: 20, right: 24,
        background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
        color: '#fff', width: 40, height: 40, borderRadius: '50%',
        fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>×</button>

      <div style={{
        position: 'absolute', top: 24, left: '50%', transform: 'translateX(-50%)',
        fontSize: 12, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em',
      }}>{idx + 1} / {images.length}</div>

      {isVideo && (
        <button
          onClick={e => { e.stopPropagation(); setMuted(m => !m); }}
          style={{
            position: 'absolute', top: 20, left: 24,
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
            color: '#fff', width: 40, height: 40, borderRadius: '50%',
            fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          title={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? '🔇' : '🔊'}
        </button>
      )}

      {idx > 0 && (
        <button onClick={e => { e.stopPropagation(); setIdx(i => i - 1); }} style={{
          position: 'absolute', left: 20, background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.15)', color: '#fff',
          width: 44, height: 44, borderRadius: '50%', fontSize: 20, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>‹</button>
      )}

      <div
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '88vw', maxHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        {isVideo ? (
          <video
            ref={videoRef}
            key={lbSrc}
            src={mediaUrl(lbSrc)}
            autoPlay loop muted={muted} playsInline
            style={{ maxWidth: '88vw', maxHeight: '80vh', borderRadius: 8, display: 'block', outline: 'none' }}
          />
        ) : (
          <img
            src={mediaUrl(lbSrc)}
            style={{ maxWidth: '88vw', maxHeight: '80vh', width: 'auto', height: 'auto', objectFit: 'contain', display: 'block', borderRadius: 8 }}
            alt=""
          />
        )}
      </div>

      {idx < images.length - 1 && (
        <button onClick={e => { e.stopPropagation(); setIdx(i => i + 1); }} style={{
          position: 'absolute', right: 20, background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.15)', color: '#fff',
          width: 44, height: 44, borderRadius: '50%', fontSize: 20, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>›</button>
      )}

      <div style={{
        position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: 8, maxWidth: '90vw', overflowX: 'auto', padding: '4px 0',
      }}>
        {images.map((img, i) => {
          const isVid = img?.mime_type?.startsWith('video/') || /\.(mp4|mov|avi|webm|mkv)$/i.test(img?.url || '');
          const stripSrc = isVid
            ? (img?.compressed_video_url || img?.url)
            : (img?.thumbnail_url || img?.url);
          return isVid ? (
            <div key={i} onClick={e => { e.stopPropagation(); setIdx(i); }} style={{
              width: 52, height: 40, borderRadius: 5, cursor: 'pointer', flexShrink: 0,
              border: i === idx ? '2px solid var(--gold)' : '2px solid transparent',
              opacity: i === idx ? 1 : 0.5,
              background: 'rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}>
              <span style={{ fontSize: 14, color: '#fff' }}>▶</span>
            </div>
          ) : (
            <img key={i} src={mediaUrl(stripSrc)} onClick={e => { e.stopPropagation(); setIdx(i); }}
              style={{
                width: 52, height: 40, objectFit: 'cover', borderRadius: 5, cursor: 'pointer', flexShrink: 0,
                border: i === idx ? '2px solid var(--gold)' : '2px solid transparent',
                opacity: i === idx ? 1 : 0.5,
                transition: 'all 0.15s',
              }}
              alt=""
            />
          );
        })}
      </div>
    </div>,
    document.body
  );
}

// ─── Portfolio Grid ───────────────────────────────────────────────────────────
// v3.1: hover overlay (name + tags), See-more toggle, and a brief-gated match
// layer (banner / match dots / "other work" divider) that only renders when a
// buyer brief is present. No brief is wired yet (matching is a later module), so
// today this renders as a plain, match-free grid.
const PORTFOLIO_VISIBLE = 9;

function scoreWork(item, brief) {
  if (!brief) return 0;
  let score = 0;
  const crafts  = (item.crafts_used || []).map(x => String(x).toLowerCase());
  const fabrics = (item.fabrics_used || []).map(x => String(x).toLowerCase());
  const has = (arr, needle) => arr.some(x => x.includes(needle) || needle.includes(x));
  (brief.crafts   || []).forEach(c => { if (has(crafts,  String(c).toLowerCase())) score += 8; });
  (brief.fabrics  || []).forEach(f => { if (has(fabrics, String(f).toLowerCase())) score += 4; });
  return score;
}

function PortfolioCard({ item, topMatch, onClick }) {
  const isVideo = item?.mime_type?.startsWith('video/') || /\.(mp4|mov|avi|webm|mkv)$/i.test(item?.url || '');
  const cardSrc      = !isVideo ? (item.thumbnail_url || item.url) : item.url;
  const cardVideoSrc = isVideo ? (item.compressed_video_url || item.url) : null;
  const tags = [...(item.crafts_used || []), ...(item.fabrics_used || [])].slice(0, 4);

  return (
    <div onClick={onClick}
      style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--surface2)', cursor: 'pointer', aspectRatio: '4/3' }}
      onMouseEnter={e => { const o = e.currentTarget.querySelector('.pf-hover'); if (o) o.style.opacity = 1; const v = e.currentTarget.querySelector('video'); if (v) v.play().catch(() => {}); }}
      onMouseLeave={e => { const o = e.currentTarget.querySelector('.pf-hover'); if (o) o.style.opacity = 0; const v = e.currentTarget.querySelector('video'); if (v) { v.pause(); v.currentTime = 0; } }}
    >
      {isVideo ? (
        <video src={mediaUrl(cardVideoSrc)} muted playsInline preload="metadata" loop
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      ) : (
        <img src={mediaUrl(cardSrc)} alt={item.product_name || ''} loading="lazy"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      )}

      {topMatch && (
        <div title="Strong match for your brief" style={{ position: 'absolute', top: 10, right: 10, width: 10, height: 10, borderRadius: '50%', background: 'var(--gold)', boxShadow: '0 0 0 3px rgba(122,140,110,0.3)' }} />
      )}

      {(item.product_name || tags.length > 0) && (
        <div className="pf-hover" style={{
          position: 'absolute', inset: 0, opacity: 0, transition: 'opacity 0.2s ease',
          background: 'linear-gradient(to top, rgba(15,10,8,0.9) 0%, rgba(15,10,8,0.35) 55%, transparent 100%)',
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '14px 14px 12px',
        }}>
          {item.product_name && (
            <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', lineHeight: 1.3, marginBottom: tags.length ? 8 : 0 }}>{item.product_name}</div>
          )}
          {tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {tags.map((t, i) => (
                <span key={i} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'rgba(255,255,255,0.16)', color: '#fff', backdropFilter: 'blur(4px)' }}>{t}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PortfolioGrid({ items, brief = null }) {
  const [lb, setLb]     = useState(null);
  const [open, setOpen] = useState(false);
  if (!items?.length) return null;

  // Score + split only when a brief is present; otherwise keep upload order.
  let matched = items, other = [];
  if (brief) {
    const scored = items.map((it, i) => ({ it, i, score: scoreWork(it, brief) }))
      .sort((a, b) => b.score - a.score);
    matched = scored.filter(x => x.score > 0).map(x => x.it);
    other   = scored.filter(x => x.score === 0).map(x => x.it);
  }
  const ordered = brief ? [...matched, ...other] : items;
  const dividerAt = brief && matched.length > 0 && other.length > 0 ? matched.length : -1;
  const visibleCount = open ? ordered.length : PORTFOLIO_VISIBLE;

  const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 };

  return (
    <>
      {lb !== null && <Lightbox images={ordered} startIndex={lb} onClose={() => setLb(null)} />}

      {/* Brief context — only when a brief is present */}
      {brief && (brief.crafts?.length || brief.fabrics?.length) > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Matched to your brief</span>
          {[...(brief.crafts || []), ...(brief.fabrics || [])].map((p, i) => (
            <span key={i} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: 'var(--gold-dim)', border: '1px solid rgba(122,140,110,0.25)', color: 'var(--gold)' }}>{p}</span>
          ))}
        </div>
      )}

      <div style={gridStyle}>
        {ordered.slice(0, visibleCount).map((item, i) => (
          <Fragment key={i}>
            {i === dividerAt && (
              <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 12, margin: '8px 0 2px' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                <span style={{ fontSize: 11, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Other work from this studio</span>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>
            )}
            <PortfolioCard item={item} topMatch={brief && i < 3 && i < matched.length} onClick={() => setLb(i)} />
          </Fragment>
        ))}
      </div>

      {ordered.length > PORTFOLIO_VISIBLE && (
        <button onClick={() => setOpen(o => !o)} style={{
          display: 'flex', alignItems: 'center', gap: 6, margin: '18px auto 0',
          background: 'none', border: '1px solid var(--border)', borderRadius: 20, padding: '8px 18px',
          cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text2)',
        }}>
          {open ? 'See less' : `See ${ordered.length - PORTFOLIO_VISIBLE} more`}
          <span style={{ display: 'inline-block', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}>▾</span>
        </button>
      )}
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
      border: `1px solid ${gold ? 'rgba(122,140,110,0.3)' : 'var(--border)'}`,
      color: gold ? 'var(--gold)' : 'var(--text2)',
      fontSize: 12, fontWeight: gold ? 600 : 400,
    }}>{children}</span>
  );
}

// ─── Section block ────────────────────────────────────────────────────────────
function Section({ title, children, style, orange }) {
  return (
    <div style={{ marginBottom: 36, ...style }}>
      <div style={{
        fontSize: 10, fontWeight: 700,
        color: orange ? '#C46E49' : 'var(--gold)',
        letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 14,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span>{title}</span>
        <div style={{ flex: 1, height: 1, background: orange ? 'rgba(196,110,73,0.2)' : 'var(--border)' }} />
      </div>
      {children}
    </div>
  );
}

// ─── BrandStrip — kept in file but not rendered (v3 removes Brands section) ──
function BrandCard({ brand }) {
  const [imgErr, setImgErr] = useState(false);
  const img  = mediaUrl(brand.image_url);
  const showImage = img && !imgErr;
  const initial = (brand.brand_name || '?')[0].toUpperCase();
  return (
    <div style={{ position: 'relative', flexShrink: 0, width: 200, height: 260, borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border2)', background: showImage ? '#1A1612' : 'var(--surface2)' }}>
      {showImage ? (
        <img src={img} alt={brand.brand_name} draggable={false} onError={() => setImgErr(true)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.92 }} />
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(145deg, var(--surface3) 0%, var(--surface4) 100%)' }} />
      )}
      <div style={{ position: 'absolute', inset: 0, background: showImage ? 'linear-gradient(to top, rgba(15,8,4,0.82) 0%, rgba(15,8,4,0.2) 45%, transparent 100%)' : 'linear-gradient(to top, rgba(26,14,8,0.75) 0%, rgba(26,14,8,0.1) 60%, transparent 100%)' }} />
      <div style={{ position: 'absolute', bottom: -8, left: 10, fontFamily: 'var(--font-display)', fontSize: 80, fontWeight: 700, lineHeight: 1, color: showImage ? 'rgba(255,255,255,0.07)' : 'rgba(122,140,110,0.1)', pointerEvents: 'none', userSelect: 'none' }}>{initial}</div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 16px 16px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, fontStyle: 'italic', color: showImage ? '#F5F0E8' : 'var(--text)', lineHeight: 1.2, marginBottom: 4 }}>{brand.brand_name}</div>
        {brand.scope && <div style={{ fontSize: 11, color: showImage ? 'rgba(245,240,232,0.7)' : 'var(--text3)', lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{brand.scope}</div>}
      </div>
      <div style={{ position: 'absolute', top: 0, left: 0, width: 3, height: 36, background: 'var(--gold)', borderRadius: '0 0 3px 0' }} />
    </div>
  );
}

// ─── Fabric & Dye Tabs ────────────────────────────────────────────────────────
// v3.1: horizontal fibre tabs + a Dyes tab appended at the end
function FabricTabs({ fabrics, dyes }) {
  const hasFabrics = fabrics?.length > 0;
  const hasDyes    = dyes?.length > 0;
  if (!hasFabrics && !hasDyes) return null;

  // Build category → fabrics map (preserve order of first appearance)
  const categoryOrder = [];
  const categoryMap   = {};
  (fabrics || []).forEach(f => {
    const cat = f.category || 'other';
    if (!categoryMap[cat]) { categoryMap[cat] = []; categoryOrder.push(cat); }
    categoryMap[cat].push(f);
  });

  const tabs = [...categoryOrder];
  if (hasDyes) tabs.push('dyes');

  const [activeTab, setActiveTab] = useState(tabs[0] || 'other');

  return (
    <div>
      {/* Tab bar */}
      <div className="fabric-tabs-bar" style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 16, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {tabs.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveTab(cat)}
            style={{
              flexShrink: 0, padding: '8px 16px', border: 'none',
              borderBottom: activeTab === cat ? '2px solid var(--gold)' : '2px solid transparent',
              background: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)',
              fontSize: 12, fontWeight: activeTab === cat ? 600 : 400,
              color: activeTab === cat ? 'var(--gold)' : 'var(--text3)',
              transition: 'all 0.15s', marginBottom: -1,
            }}
          >
            {cat === 'dyes' ? 'Dyes' : (FABRIC_CATEGORY_LABELS[cat] || cat)}
          </button>
        ))}
      </div>
      {/* Chips for active tab */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {activeTab === 'dyes'
          ? dyes.map(d => <Tag key={d.dye_name}>{d.dye_name}</Tag>)
          : (categoryMap[activeTab] || []).map(f => <Tag key={f.fabric_name} gold={f.is_primary}>{f.fabric_name}</Tag>)
        }
      </div>
    </div>
  );
}

// ─── Craft Widget ─────────────────────────────────────────────────────────────
// v3.1: horizontal group tabs (Printing & Dyeing / Surface Work / Weaving),
// detail = image + name + approach. Stats row removed per prototype.
const CRAFT_GROUPS = [
  { key: 'printing', label: 'Printing & Dyeing', types: ['printing', 'dyeing'] },
  { key: 'surface',  label: 'Surface Work',      types: ['surface'] },
  { key: 'weaving',  label: 'Weaving',           types: ['weaving', 'spinning'] },
];

function CraftCarousel({ crafts }) {
  // Build only the groups that actually have crafts, in prototype order.
  const groups = CRAFT_GROUPS
    .map(g => ({ ...g, items: crafts.filter(c => g.types.includes(c.technique_type)) }))
    .filter(g => g.items.length > 0);

  // Any craft whose technique_type doesn't map to a known group goes into a
  // fallback "Other" group so nothing is silently dropped.
  const known = new Set(CRAFT_GROUPS.flatMap(g => g.types));
  const leftover = crafts.filter(c => !known.has(c.technique_type));
  if (leftover.length) groups.push({ key: 'other', label: 'Other', items: leftover });

  const [gIdx, setGIdx] = useState(0);
  const [cIdx, setCIdx] = useState(0);

  if (groups.length === 0) return null;
  const group = groups[Math.min(gIdx, groups.length - 1)];
  const c     = group.items[Math.min(cIdx, group.items.length - 1)];
  const imageUrl = mediaUrl(c.thumbnail_url || c.image_url);
  const badge    = resolveBadge(c);

  return (
    <div>
      {/* Group tabs — only if more than one group */}
      {groups.length > 1 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          {groups.map((g, i) => (
            <button key={g.key} onClick={() => { setGIdx(i); setCIdx(0); }} style={{
              padding: '7px 15px', borderRadius: 20, cursor: 'pointer',
              border: `1.5px solid ${gIdx === i ? '#8FA083' : 'var(--border)'}`,
              background: gIdx === i ? 'rgba(122,140,110,0.08)' : 'transparent',
              color: gIdx === i ? '#8FA083' : 'var(--text3)',
              fontFamily: 'var(--font-body)', fontSize: 12.5, fontWeight: gIdx === i ? 600 : 400,
              transition: 'all 0.15s',
            }}>{g.label}</button>
          ))}
        </div>
      )}

      <div className="craft-carousel-wrap" style={{ display: 'flex', gap: 0, border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', background: 'var(--surface)' }}>
        {/* LEFT — image + name + approach */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ width: '100%', aspectRatio: '16/9', background: 'linear-gradient(160deg,#2C4A3A,#1A3028,#3A5C48)', overflow: 'hidden', position: 'relative' }}>
            {imageUrl && (
              <img key={imageUrl} src={imageUrl} alt={c.craft_name} loading="eager"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            )}
          </div>
          <div style={{ padding: '22px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400, color: 'var(--text)' }}>{c.craft_name}</div>
              {badge && <CraftBadge badge={badge} />}
            </div>
            {c.specialization && (
              <p style={{ fontSize: 13.5, color: 'var(--text2)', lineHeight: 1.7, margin: 0 }}>{c.specialization}</p>
            )}
          </div>
        </div>

        {/* RIGHT — craft list for the active group */}
        {group.items.length > 1 && (
          <div className="craft-sidebar" style={{ width: 190, flexShrink: 0, borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            {group.items.map((craft, i) => {
              const b = resolveBadge(craft);
              return (
                <button key={i} onClick={() => setCIdx(i)} style={{
                  padding: '13px 16px', textAlign: 'left', border: 'none',
                  borderBottom: i < group.items.length - 1 ? '1px solid var(--border)' : 'none',
                  background: cIdx === i ? 'var(--gold-dim)' : 'transparent',
                  cursor: 'pointer', transition: 'background 0.15s', fontFamily: 'var(--font-body)',
                }}
                  onMouseEnter={e => { if (cIdx !== i) e.currentTarget.style.background = 'var(--surface2)'; }}
                  onMouseLeave={e => { if (cIdx !== i) e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{ fontSize: 13, fontWeight: cIdx === i ? 500 : 400, color: cIdx === i ? 'var(--gold)' : 'var(--text2)', lineHeight: 1.4, marginBottom: b ? 4 : 0 }}>
                    {craft.craft_name}
                  </div>
                  {b && <CraftBadge badge={b} small />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Get Introduced Popup ─────────────────────────────────────────────────────
// v3: two-button popup — Send Project Details or Connect Without Brief
function IntroPopup({ studio, onClose }) {
  const [sessions,     setSessions]     = useState([]);
  const [loadingSess,  setLoadingSess]  = useState(true);
  const [selectedSess, setSelectedSess] = useState('');
  const [submitting,   setSubmitting]   = useState(false);
  const [done,         setDone]         = useState(false);
  const [err,          setErr]          = useState('');

  useEffect(() => {
    buyerAPI.getSessions()
      .then(r => setSessions(r.data?.sessions || []))
      .catch(() => setSessions([]))
      .finally(() => setLoadingSess(false));
  }, []);

  const introduce = async (withSession) => {
    setErr('');
    setSubmitting(true);
    try {
      const sessionId = withSession ? selectedSess : null;
      await chatAPI.getIntroduced(sessionId, studio.studio_id);
      setDone(true);
    } catch (e) {
      setErr('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 8500,
        background: 'rgba(26,14,8,0.6)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20, animation: 'lbIn 0.2s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)', borderRadius: 20,
          padding: '36px 36px 28px', width: '100%', maxWidth: 460,
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {done ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 14 }}>✓</div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 500, color: 'var(--text)', marginBottom: 8 }}>
              Introduction Requested
            </p>
            <p style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.65, marginBottom: 24 }}>
              The Qala team will get you introduced to {studio.studio_name} soon.
            </p>
            <button onClick={onClose} style={{ padding: '10px 28px', borderRadius: 8, border: '1px solid var(--border)', background: 'none', fontSize: 13, color: 'var(--text)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              Close
            </button>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600, color: 'var(--gold)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
                Connect with Studio
              </div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: 'var(--text)', marginBottom: 6, lineHeight: 1.2 }}>
                Share your project with {studio.studio_name}?
              </h2>
              <p style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.65 }}>
                They'll know exactly what you're looking for.
              </p>
            </div>

            {/* Session dropdown — only shown if buyer has sessions */}
            {!loadingSess && sessions.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Select a Project Brief
                </label>
                <select
                  value={selectedSess}
                  onChange={e => setSelectedSess(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 8,
                    border: '1px solid var(--border)', background: 'var(--surface2)',
                    fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text)',
                    cursor: 'pointer',
                  }}
                >
                  <option value="">— Choose a session —</option>
                  {sessions.map(s => (
                    <option key={s.session_token} value={s.session_token}>
                      {s.name || s.product_types?.slice(0,2).join(', ') || 'Discovery session'} · {new Date(s.created_at).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {err && (
              <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 14, padding: '8px 12px', background: 'var(--red-dim)', borderRadius: 6, border: '1px solid rgba(201,64,64,0.2)' }}>
                {err}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Send Project Details — only shown if sessions exist and one is selected */}
              {!loadingSess && sessions.length > 0 && (
                <button
                  disabled={submitting || !selectedSess}
                  onClick={() => introduce(true)}
                  style={{
                    width: '100%', padding: '13px', borderRadius: 8,
                    border: 'none', background: selectedSess ? 'var(--gold)' : 'var(--surface3)',
                    color: selectedSess ? '#fff' : 'var(--text4)',
                    fontSize: 14, fontWeight: 500, cursor: selectedSess ? 'pointer' : 'not-allowed',
                    fontFamily: 'var(--font-body)', transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  {submitting
                    ? <><span style={{ width: 13, height: 13, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', display: 'inline-block', animation: 'introSpin 0.7s linear infinite' }} /> Sending…</>
                    : 'Send Project Details'}
                </button>
              )}

              {/* Connect Without Brief — always shown */}
              <button
                disabled={submitting}
                onClick={() => introduce(false)}
                style={{
                  width: '100%', padding: '13px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'transparent',
                  color: 'var(--text)', fontSize: 14, fontWeight: 500,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-body)', transition: 'background 0.15s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
                onMouseEnter={e => { if (!submitting) e.currentTarget.style.background = 'var(--surface2)'; }}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {submitting
                  ? <><span style={{ width: 13, height: 13, borderRadius: '50%', border: '2px solid rgba(0,0,0,0.15)', borderTopColor: 'var(--text)', display: 'inline-block', animation: 'introSpin 0.7s linear infinite' }} /> Sending…</>
                  : 'Connect Without Brief'}
              </button>

              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text4)', fontFamily: 'var(--font-body)', padding: '4px 0' }}>
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
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
  // Support both /studio/:id (legacy) and /:studioSlug (v3)
  const { id, studioSlug } = useParams();
  const nav = useNavigate();

  const [studio,       setStudio]       = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [introOpen,    setIntroOpen]    = useState(false);
  const [moqExpanded,  setMoqExpanded]  = useState(false);
  const [btsLightboxOpen, setBtsLightboxOpen] = useState(false);
  const [btsStartIndex,   setBtsStartIndex]   = useState(0);
  const heroRef  = useRef(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); }, [id, studioSlug]);

  useEffect(() => {
    // Guard: if studioSlug matches a reserved path, don't try to fetch a studio
    if (studioSlug && RESERVED_PATHS.has(studioSlug)) {
      nav('/', { replace: true });
      return;
    }

    setLoading(true);
    setError('');

    const req = studioSlug
      ? discoveryAPI.getStudioProfileBySlug(studioSlug)
      : discoveryAPI.getStudioProfile(id);

    req
      .then(r => setStudio(r.data))
      .catch(e => {
        if (e.response?.status === 404) setError('This studio profile is not available.');
        else setError('Could not load studio profile. Please try again.');
      })
      .finally(() => setLoading(false));
  }, [id, studioSlug]);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // ── Loading ──
  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      <div style={{ height: 64, background: 'var(--surface)', borderBottom: '1px solid var(--border)' }} />
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

  const s       = studio;
  const heroUrl = s.hero_image?.url;
  const hasWork = s.work_images?.length > 0;
  const hasBts  = s.bts_images?.length  > 0;

  // Categories — show section if any category group has data
  const hasOccasions   = s.occasions?.length   > 0;
  const hasGenderFocus = s.gender_focus?.length > 0;
  const hasGarments    = s.garment_types?.length    > 0;
  const hasAccessories = s.accessory_types?.length   > 0;
  const hasHomeFurn    = s.home_furnishings?.length  > 0;
  const hasCategories  = hasOccasions || hasGenderFocus || hasGarments || hasAccessories || hasHomeFurn;

  const catRows = [
    ['Occasions',        s.occasions],
    ['Gender',           s.gender_focus],
    ['Garment Styles',   s.garment_types],
    ['Accessories',      s.accessory_types],
    ['Home Furnishings', s.home_furnishings],
  ].filter(([, arr]) => arr?.length > 0);

  const hasFabricsOrDyes = s.fabrics?.length > 0 || s.dyes?.length > 0;

  // How They Work — collaboration modes + design capabilities
  const cd = s.collab_design;
  const collabModes = cd ? [
    ['Catalog',          cd.catalogue_collab, 'Browse existing designs and adapt colourway, fabric, or detail for your label.'],
    ['Co-creation',      cd.co_creation,      'Bring a direction or moodboard — they co-develop the design with their material expertise.'],
    ['Production House', cd.production_house, 'Execute from a ready tech pack or physical samples.'],
  ] : [];
  const designCaps = cd ? [
    ['In-house fashion designer', cd.has_fashion_designer],
    ['Textile design expertise',  cd.has_textile_design],
    ['Design from scratch',       cd.has_design_from_scratch],
  ].filter(([, on]) => on) : [];
  const hasHowTheyWork = collabModes.some(([, on]) => on != null) || designCaps.length > 0;

  // Certifications — stored as JSON array text or comma string
  const certs = (() => {
    const raw = s.production?.certifications;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try { const p = JSON.parse(raw); return Array.isArray(p) ? p : [String(raw)]; }
    catch { return String(raw).split(',').map(x => x.trim()).filter(Boolean); }
  })();

  const hasRecognition = s.awards?.length > 0 || certs.length > 0;

  // Sustainability & Ethics — v3: two Qala-authored questions, studio answers.
  // Fixed labels; render a row only when that answer has content.
  const sustainRows = [
    ['How they approach sustainable production', s.sustainability],
    ['How they take care of their team',         s.team_care],
  ].filter(([, a]) => a && String(a).trim());
  const hasSustainability = sustainRows.length > 0;

  // Sidebar "at a glance" derived values
  const prod = s.production || {};
  const weeksRange = (min, max, fallback) => {
    if (min && max) return min === max ? `${min} weeks` : `${min}–${max} weeks`;
    if (min) return `${min}+ weeks`;
    return fallback || null;
  };
  const samplingLabel   = weeksRange(prod.sampling_time_weeks_min, prod.sampling_time_weeks_max, prod.avg_sampling_time_range);
  const productionLabel = weeksRange(prod.production_time_weeks_min, prod.production_time_weeks_max, null);
  const pricingFilled   = prod.pricing_tier ? (String(prod.pricing_tier).match(/\$/g) || []).length : 0;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <style>{`
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
        @keyframes lbIn{from{opacity:0}to{opacity:1}}
        @keyframes introSpin{to{transform:rotate(360deg)}}
        .profile-fade { animation: fadeUp 0.5s ease both; }
        .profile-fade-1 { animation-delay: 0.05s; }
        .profile-fade-2 { animation-delay: 0.12s; }
        .profile-fade-3 { animation-delay: 0.2s; }
        .profile-fade-4 { animation-delay: 0.28s; }
        .craft-tab-pills { display: none; }
        .fabric-tabs-bar::-webkit-scrollbar { display: none; }
        @media (max-width: 900px) {
          .studio-layout { grid-template-columns: 1fr !important; }
          .studio-sidebar { position: static !important; }
        }
        @media (max-width: 640px) {
          .craft-carousel-wrap { flex-direction: column !important; }
          .craft-sidebar { display: none !important; }
          .craft-tab-pills { display: flex !important; overflow-x: auto; gap: 8px; padding-bottom: 2px; scrollbar-width: none; margin-bottom: 12px; flex-wrap: nowrap; }
          .craft-tab-pills::-webkit-scrollbar { display: none; }
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link to="/"><img src={qalaLogo} alt="Qala" className="qala-logo" /></Link>
          <UserAvatar hideWhenLoggedOut />
        </div>
      </div>

      {/* ── Hero — v3: no location line ── */}
      <div ref={heroRef} style={{ position: 'relative', height: 480, overflow: 'hidden', background: 'var(--surface2)' }}>
        {heroUrl ? (
          <img src={mediaUrl(heroUrl)} alt={s.studio_name} fetchpriority="high" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.15, fontSize: 72 }}>🏛</div>
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 30%, rgba(15,10,8,0.7) 100%)' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 48px 40px' }}>
          {/* Location removed from hero per v3 brief — moved to sidebar only */}
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

          {/* Portfolio — v3: PortfolioGrid with product_name + craft/fabric chips */}
          {hasWork && (
            <div className="profile-fade profile-fade-2" style={{ marginBottom: 44 }}>
              <Section title="Portfolio">
                <PortfolioGrid items={s.work_images} />
              </Section>
            </div>
          )}

          {/* USPs — v3: max 3, orange heading + box */}
          {s.usps?.length > 0 && (
            <div className="profile-fade profile-fade-2" style={{ marginBottom: 44 }}>
              <Section title="What They're Known For" orange>
                <div style={{
                  border: '1px solid rgba(196,110,73,0.2)',
                  borderRadius: 12, padding: '8px 0',
                  background: 'rgba(196,110,73,0.03)',
                }}>
                  {s.usps.slice(0, 3).map((usp, i) => (
                    <div key={i} style={{
                      display: 'flex', gap: 14, alignItems: 'flex-start',
                      padding: '14px 22px',
                      borderBottom: i < s.usps.slice(0, 3).length - 1 ? '1px solid rgba(196,110,73,0.1)' : 'none',
                    }}>
                      <span style={{ color: '#C46E49', fontSize: 18, lineHeight: 1, marginTop: 1, flexShrink: 0 }}>•</span>
                      <span style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.65 }}>{usp}</span>
                    </div>
                  ))}
                </div>
              </Section>
            </div>
          )}

          {/* Crafts — v3: badges, no limitations/delay, Innovation label, 100 units */}
          {s.crafts?.length > 0 && (
            <div className="profile-fade profile-fade-3" style={{ marginBottom: 44 }}>
              <Section title="Crafts & Specialisations">
                <CraftCarousel crafts={s.crafts} />
              </Section>
            </div>
          )}

          {/* Fabrics & Dyes — v3.1: fibre tabs + Dyes tab */}
          {hasFabricsOrDyes && (
            <div className="profile-fade" style={{ marginBottom: 44 }}>
              <Section title="Fabrics & Dyes">
                <FabricTabs fabrics={s.fabrics} dyes={s.dyes} />
              </Section>
            </div>
          )}

          {/* Categories — v3.1: Occasions, Gender, Garment Styles, Accessories, Home Furnishings */}
          {hasCategories && (
            <div className="profile-fade profile-fade-4" style={{ marginBottom: 44 }}>
              <Section title="Categories">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {catRows.map(([label, arr]) => (
                    <div key={label} style={{ display: 'flex', gap: 16, alignItems: 'baseline', flexWrap: 'wrap' }}>
                      <div style={{ width: 120, flexShrink: 0, fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.08em', paddingTop: 4 }}>{label}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, flex: 1, minWidth: 200 }}>
                        {arr.map((x, i) => <Tag key={i}>{x}</Tag>)}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            </div>
          )}

          {/* Brands section REMOVED in v3 — BrandCard kept in file for future use */}

          {/* Recognition / Press — v3.1: certification tags + press list */}
          {hasRecognition && (
            <div className="profile-fade" style={{ marginBottom: 44 }}>
              <Section title="Recognition">
                {certs.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: s.awards?.length ? 14 : 0 }}>
                    {certs.map((cert, i) => (
                      <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 20, background: 'var(--gold-dim)', border: '1px solid rgba(122,140,110,0.25)', color: 'var(--gold)' }}>
                        <span style={{ fontSize: 11 }}>✦</span>{cert}
                      </span>
                    ))}
                  </div>
                )}
                {s.awards?.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {s.awards.map((a, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
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
                )}
              </Section>
            </div>
          )}

          {/* Sustainability & Ethics — v3: fixed questions, studio-authored answers */}
          {hasSustainability && (
            <div className="profile-fade" style={{ marginBottom: 44 }}>
              <Section title="Sustainability & Ethics">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                  {sustainRows.map(([label, answer], i) => (
                    <div key={i}>
                      <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text4)', marginBottom: 7 }}>{label}</div>
                      <div style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{answer}</div>
                    </div>
                  ))}
                </div>
              </Section>
            </div>
          )}

          {/* BTS / Inside the Studio */}
          {hasBts && (
            <div className="profile-fade" style={{ marginBottom: 44 }}>
              <Section title="Inside the Studio">
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8 }}>
                  {s.bts_images.slice(0, 8).map((img, i) => {
                    const isVideo = img.mime_type?.startsWith('video/') || /\.(mp4|mov|avi|webm|mkv)$/i.test(img.url || '');
                    // Images: compressed thumbnail; Videos: compressed mp4; Lightbox uses compressed too
                    const tileSrc      = !isVideo ? (img.thumbnail_url || img.url) : img.url;
                    const tileVideoSrc = isVideo ? (img.compressed_video_url || img.url) : null;
                    return (
                      <div key={i} style={{ width: 140, height: 100, borderRadius: 8, flexShrink: 0, cursor: 'pointer', overflow: 'hidden', position: 'relative', background: 'var(--surface2)', transition: 'transform 0.2s' }}
                        onClick={() => { setBtsStartIndex(i); setBtsLightboxOpen(true); }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; const v = e.currentTarget.querySelector('video'); if (v) v.play().catch(() => {}); }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; const v = e.currentTarget.querySelector('video'); if (v) { v.pause(); v.currentTime = 0; } }}
                      >
                        {isVideo ? (
                          <>
                            <video src={mediaUrl(tileVideoSrc)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} muted playsInline preload="metadata" loop onError={mediaOnError(img.url)} />
                            <div className="bts-play-hint" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.18)', pointerEvents: 'none' }}>
                              <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontSize: 10, marginLeft: 2, color: '#1A1612' }}>▶</span>
                              </div>
                            </div>
                          </>
                        ) : (
                          <img src={mediaUrl(tileSrc)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={mediaOnError(img.url)} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </Section>
            </div>
          )}


          {/* How They Work — v3.1: collaboration modes + design capabilities + QC */}
          {hasHowTheyWork && (
            <div className="profile-fade" style={{ marginBottom: 44 }}>
              <Section title="How They Work">

                {collabModes.some(([, on]) => on != null) && (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Collaboration Modes</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: designCaps.length ? 28 : 0 }}>
                      {collabModes.map(([title, on, desc]) => (
                        <div key={title} style={{
                          border: `1px solid ${on ? 'rgba(122,140,110,0.3)' : 'var(--border)'}`, borderRadius: 12,
                          padding: '16px 18px', background: on ? 'rgba(122,140,110,0.04)' : 'var(--surface)',
                          opacity: on ? 1 : 0.55,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                            {on && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#7A8C6E', flexShrink: 0 }} />}
                            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{title}</span>
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>
                            {desc}{!on && <span style={{ fontStyle: 'italic' }}> Not currently available.</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {designCaps.length > 0 && (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Design Capabilities</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 28 }}>
                      {designCaps.map(([label]) => (
                        <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, padding: '7px 14px', borderRadius: 20, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text2)' }}>
                          <span style={{ color: 'var(--gold)' }}>✓</span>{label}
                        </span>
                      ))}
                    </div>
                  </>
                )}

                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Quality Control</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    ['Pre-production check', 'Fabric, trims, and colour verified against the approved sample before cutting begins.'],
                    ['In-line inspection', 'Technique, stitching, and placement checked at key stages of production.'],
                    ['Final check before dispatch', 'Every piece measured and finished against the approved sample before packing.'],
                  ].map(([title, desc]) => (
                    <div key={title} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <span style={{ color: 'var(--gold)', flexShrink: 0, marginTop: 1, fontSize: 14 }}>✓</span>
                      <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                        <span style={{ fontWeight: 600, color: 'var(--text)' }}>{title}</span>
                        <span style={{ color: 'var(--text3)' }}> — {desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            </div>
          )}

          {/* Who You'll Be Working With */}
          {s.coordinator && (
            <div className="profile-fade" style={{ marginBottom: 44 }}>
              <Section title="Who You'll Be Working With">
                <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '28px 28px', background: 'var(--surface)', display: 'flex', gap: 24, alignItems: 'flex-start' }}>
                  {s.coordinator.image_url && (
                    <div style={{ flexShrink: 0 }}>
                      <img src={mediaUrl(s.coordinator.image_url)} alt={s.coordinator.name} style={{ width: 88, height: 88, borderRadius: '50%', objectFit: 'cover', display: 'block', border: '2px solid var(--border)' }} />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{s.coordinator.name}</div>
                    {s.coordinator.position && <div style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 500, letterSpacing: '0.04em', marginBottom: 12 }}>{s.coordinator.position}</div>}
                    {s.coordinator.writeup && <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.75, margin: 0 }}>{s.coordinator.writeup}</p>}
                  </div>
                </div>
              </Section>
            </div>
          )}

        </div>

        {/* ── RIGHT COLUMN — Sticky sidebar ── */}
        <div className="studio-sidebar" style={{ position: 'sticky', top: 80, display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>

          {/* CTA Contact card — v3: new copy + IntroPopup */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 16, padding: '28px 24px',
            boxShadow: 'var(--shadow-gold)',
          }}>
            <div style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>
                Connect with Studio
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 500, color: 'var(--text)', marginBottom: 6 }}>
                Found them interesting?
              </div>
              <p style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.6, marginBottom: 18 }}>
                Let's get you introduced.
              </p>
            </div>
            <button
              onClick={() => setIntroOpen(true)}
              style={{
                width: '100%', padding: '13px', borderRadius: 8,
                border: 'none', background: 'var(--gold)', color: '#fff',
                fontSize: 14, fontWeight: 500, cursor: 'pointer',
                fontFamily: 'var(--font-body)', transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              Get Introduced
            </button>
          </div>

          {/* Studio at a Glance — v3.1 sidebar */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '22px 24px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 16 }}>Studio at a Glance</div>

            {/* Two-stat block: capacity + artisans */}
            {(prod.monthly_capacity_units || prod.artisan_count) && (
              <div style={{ display: 'flex', alignItems: 'stretch', marginBottom: 18 }}>
                {prod.monthly_capacity_units != null && (
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, color: 'var(--text)', lineHeight: 1 }}>{prod.monthly_capacity_units.toLocaleString()}</div>
                    <div style={{ fontSize: 10, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>Units / mo</div>
                  </div>
                )}
                {prod.monthly_capacity_units != null && prod.artisan_count != null && (
                  <div style={{ width: 1, background: 'var(--border)', margin: '2px 0' }} />
                )}
                {prod.artisan_count != null && (
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, color: 'var(--text)', lineHeight: 1 }}>{prod.artisan_count}</div>
                    <div style={{ fontSize: 10, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>Artisans</div>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* Minimums — with accordion */}
              {prod.has_strict_minimums !== null && prod.has_strict_minimums !== undefined && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--text4)' }}>Minimums</span>
                    <button onClick={() => setMoqExpanded(x => !x)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', padding: 0 }}>
                      <span style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 500 }}>{prod.has_strict_minimums ? 'Fixed' : 'Flexible'}</span>
                      <span style={{ fontSize: 10, color: 'var(--text4)', transition: 'transform 0.2s', display: 'inline-block', transform: moqExpanded ? 'rotate(180deg)' : 'none' }}>▾</span>
                    </button>
                  </div>
                  {moqExpanded && (
                    <div style={{ marginTop: 10, padding: '12px 14px', background: 'var(--surface2)', borderRadius: 8, border: '1px solid var(--border)' }}>
                      {prod.moq_entries?.length > 0 ? (
                        prod.moq_entries.map((m, i) => (
                          <div key={i} style={{ fontSize: 12, color: 'var(--text3)', marginBottom: i < prod.moq_entries.length - 1 ? 6 : 10 }}>
                            <span style={{ color: 'var(--text2)', fontWeight: 500 }}>{m.craft_or_category}</span>
                            {m.moq_condition && <span style={{ color: 'var(--text4)' }}> — {m.moq_condition}</span>}
                          </div>
                        ))
                      ) : (
                        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10 }}>No specific minimums listed.</div>
                      )}
                      <div style={{ fontSize: 11, color: 'var(--text4)', fontStyle: 'italic', borderTop: '1px solid var(--border)', paddingTop: 8 }}>*minimums are flexible as per availability</div>
                    </div>
                  )}
                </div>
              )}

              {samplingLabel && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--text4)' }}>Avg. sampling time</span>
                  <span style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 500 }}>{samplingLabel}</span>
                </div>
              )}

              {productionLabel && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--text4)' }}>Production (100 pcs)</span>
                  <span style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 500 }}>{productionLabel}</span>
                </div>
              )}

              {s.establishment_year && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--text4)' }}>Established</span>
                  <span style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 500 }}>{s.establishment_year}</span>
                </div>
              )}

              {prod.pricing_tier && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--text4)' }}>Pricing</span>
                  <span style={{ letterSpacing: '1px' }}>
                    {[0,1,2,3].map(i => (
                      <span key={i} style={{ fontSize: 15, fontWeight: 700, color: i < pricingFilled ? 'var(--gold)' : 'var(--border)' }}>$</span>
                    ))}
                  </span>
                </div>
              )}

            </div>
          </div>

        </div>
      </div>

      {/* BTS lightbox */}
      {btsLightboxOpen && (
        <Lightbox
          images={s.bts_images}
          startIndex={btsStartIndex}
          onClose={() => setBtsLightboxOpen(false)}
        />
      )}

      {/* Get Introduced popup — v3 */}
      {introOpen && (
        <IntroPopup
          studio={s}
          onClose={() => setIntroOpen(false)}
        />
      )}
    </div>
  );
}
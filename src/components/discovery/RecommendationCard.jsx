import { useState } from 'react';
import { mediaUrl, mediaOnError } from '../../utils/mediaUrl';
import MediaLightbox from './MediaLightbox';

const RANKING_STYLES = {
  high:   { bg: 'rgba(90,232,122,0.08)', color: 'var(--green-bright)', border: 'rgba(90,232,122,0.2)',  label: 'Strong Match' },
  medium: { bg: 'rgba(232,184,80,0.08)', color: 'var(--amber-l)', border: 'rgba(232,184,80,0.2)',  label: 'Good Match' },
  low:    { bg: 'rgba(160,160,160,0.08)',color: '#A0A0A0', border: 'rgba(160,160,160,0.2)', label: 'Possible Match' },
};

const BATCH_LABELS = {
  under_30: 'Under 30 pieces',
  '30_100': '30–100 pieces',
  over_100: '100+ pieces',
  not_sure: '',
};

// ── Real proficiency badges ──────────────────────────────────────────────
// Qala's two actual rating scales on studio data — not invented for this
// redesign, just not previously surfaced on the match card:
//   - qala_badge (craft_profiles)   — Qala-assigned Skilled / Expert / Master
//   - expertise_level (fabric_profiles) — seller-declared Moderate / High / Pro
const QALA_BADGE_TONE = { master: 'dark', expert: 'sage', skilled: 'amber' };
const QALA_BADGE_LABEL = { master: 'Master', expert: 'Expert', skilled: 'Skilled' };
const EXPERTISE_TONE  = { pro: 'dark', high: 'sage', moderate: 'amber' };
const EXPERTISE_LABEL = { pro: 'Pro', high: 'High', moderate: 'Moderate' };

function BadgePill({ text, tone, small }) {
  if (!text) return null;
  const toneStyle = {
    dark:  { background: 'var(--text)', color: 'var(--surface2)' },
    sage:  { background: 'rgba(122,140,110,0.16)', color: 'var(--sage)' },
    amber: { background: 'rgba(232,184,80,0.14)', color: 'var(--amber)' },
  }[tone] || { background: 'var(--surface3)', color: 'var(--text2)' };
  return (
    <span style={{
      fontSize: small ? 9.5 : 10, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase',
      padding: small ? '1px 7px' : '2px 8px', borderRadius: 10, whiteSpace: 'nowrap',
      fontFamily: 'var(--font-body)',
      ...toneStyle,
    }}>
      {text}
    </span>
  );
}

// ── Fit row ───────────────────────────────────────────────────────────────
// core_capability_fit / craft_approach_fit are real high/medium/low ratings
// computed per-recommendation by matching_v2.py (see that file's
// _craft_approach_fit for how). moq_fit and visual_affinity are left out
// here deliberately — the backend doesn't have a reliable signal for
// either yet (see the same docstring), so this only shows ratings that
// actually mean something, never a placeholder "unrated" dot.
const FIT_LABELS = { core_capability_fit: 'Core capability', craft_approach_fit: 'Craft approach' };

function FitDot({ level }) {
  const fill = level === 'high' ? 'var(--sage)' : level === 'medium' ? 'var(--amber-l)' : 'transparent';
  const border = level === 'high' ? 'var(--sage)' : level === 'medium' ? 'var(--amber-l)' : 'var(--border2)';
  return (
    <span style={{
      width: 9, height: 9, borderRadius: '50%', flexShrink: 0,
      border: `1.5px solid ${border}`, background: fill,
    }} />
  );
}

function FitRow({ rec }) {
  const items = Object.keys(FIT_LABELS)
    .map(key => [key, rec[key]])
    .filter(([, level]) => level === 'high' || level === 'medium' || level === 'low');
  if (items.length === 0) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px 16px',
      padding: '9px 12px', background: 'var(--surface3)', border: '0.5px solid var(--border)',
      borderRadius: 10, marginTop: 14, fontSize: 12, color: 'var(--text2)',
    }}>
      {items.map(([key, level]) => (
        <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <FitDot level={level} />
          {FIT_LABELS[key]}
        </span>
      ))}
    </div>
  );
}

function buildWhyLines(rec, buyerSummary, isBonus) {
  if (isBonus || !buyerSummary) return [];
  const lines = [];
  const isPrimary = rec.core_capability_fit === 'high';

  // Product line — from match_reasoning if available
  const productMatch = rec.match_reasoning?.product_match;
  if (productMatch && typeof productMatch === 'string') {
    const transformed = productMatch
      .replace(/^Strong match for /i, 'Can make ')
      .replace(/^Partial match for your product types$/i, 'Can make some of your product types');
    lines.push(transformed);
  }

  // Fabric line
  const buyerFabrics = (buyerSummary.fabrics || []).slice(0, 3);
  const studioPrimaryFabrics = (rec.primary_fabrics || []).slice(0, 3);
  if (buyerFabrics.length > 0) {
    if (isPrimary) {
      lines.push(`Works extensively with ${buyerFabrics.join(', ')}`);
    } else {
      const extras = studioPrimaryFabrics.filter(f => !buyerFabrics.includes(f)).slice(0, 2);
      const extrasText = extras.length > 0 ? ` among others like ${extras.join(', ')}` : '';
      lines.push(`Works with ${buyerFabrics.join(', ')}${extrasText}`);
    }
  }

  // Craft line
  const buyerCrafts = (buyerSummary.crafts || []).slice(0, 3);
  if (buyerCrafts.length > 0) {
    if (isPrimary) {
      lines.push(`Strong capability & experience in ${buyerCrafts.join(', ')}`);
    } else {
      lines.push(`Comfortable with ${buyerCrafts.join(', ')} techniques`);
    }
  }

  // Batch size line
  const batchKey = buyerSummary.batch_size;
  const batchLabel = BATCH_LABELS[batchKey];
  if (batchLabel) {
    lines.push(`Comfortable with your batch size — ${batchLabel}`);
  }

  // Visual affinity
  if (rec.match_reasoning?.visual_affinity === true) {
    lines.push('Their aesthetic aligns with the images you selected');
  }

  return lines;
}

// Case-insensitive "is this tag one the buyer asked for" check, used to
// highlight the craft/fabric chips that actually matched the brief —
// visual parity with the artifact's "in brief" chip treatment, built off
// data we already have (buyerSummary.crafts / .fabrics) rather than any
// new field.
function isHit(tag, buyerList) {
  if (!tag || !buyerList?.length) return false;
  const t = tag.toLowerCase();
  return buyerList.some(b => typeof b === 'string' && (b.toLowerCase() === t || t.includes(b.toLowerCase()) || b.toLowerCase().includes(t)));
}

// Same hover-overlay data the studio profile's own portfolio grid shows
// (PortfolioCard in StudioProfile.jsx: product name + up to 4 craft/fabric
// tags) — hero_images now carries product_name/crafts_used/fabrics_used
// too (see serializers.py), so the match card can show the exact same
// details on hover instead of a bare image.
function tileTags(item) {
  return [...(item?.crafts_used || []), ...(item?.fabrics_used || [])].slice(0, 4);
}

// Renders one collage tile (main or secondary). Kept separate from the
// single-hero fallback below so a studio with only one photo still gets
// the plain single-image hero exactly as before.
function CollageTile({ item, alt, big, showShimmer, imgLoaded, onImgLoad, onClick, moreCount }) {
  const [hovering, setHovering] = useState(false);
  const isVideo = item?.mime_type?.startsWith('video/') || /\.(mp4|mov|avi|webm|mkv)$/i.test(item?.url || '');
  if (!item) return <div style={{ width: '100%', height: '100%', background: 'var(--surface3)' }} />;
  const tags = tileTags(item);
  const hasOverlay = Boolean(item.product_name || tags.length > 0);

  return (
    <div
      style={{ position: 'relative', width: '100%', height: '100%', cursor: onClick ? 'pointer' : 'default' }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onClick={onClick}
    >
      {isVideo ? (
        <video
          src={mediaUrl(item.url)}
          muted playsInline autoPlay loop
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <>
          {showShimmer && !imgLoaded && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 1,
              background: 'linear-gradient(90deg, var(--surface2) 25%, var(--surface3) 50%, var(--surface2) 75%)',
              backgroundSize: '200% 100%',
              animation: 'heroShimmer 1.4s ease-in-out infinite',
            }} />
          )}
          <img
            src={mediaUrl(item.url)}
            alt={alt}
            fetchpriority={big ? 'high' : 'auto'}
            onLoad={onImgLoad}
            style={{
              width: '100%', height: '100%', objectFit: 'cover', display: 'block',
              opacity: showShimmer ? (imgLoaded ? 1 : 0) : 1,
              transition: showShimmer ? 'opacity 0.3s ease' : 'none',
            }}
            onError={mediaOnError(item.url)}
          />
        </>
      )}

      {/* Hover overlay — same product name + craft/fabric tags shown on
          hover in the studio profile's own portfolio grid. */}
      {hasOverlay && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(10,6,4,0.78) 0%, transparent 55%)',
          opacity: hovering ? 1 : 0, transition: 'opacity 0.25s',
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
          padding: 12, pointerEvents: 'none',
        }}>
          {item.product_name && (
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 500, color: '#fff', marginBottom: 5, lineHeight: 1.3 }}>
              {item.product_name}
            </div>
          )}
          {tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {tags.map((t, i) => (
                <span key={i} style={{
                  fontSize: 10, color: 'rgba(255,255,255,0.8)', background: 'rgba(255,255,255,0.15)',
                  padding: '2px 7px', borderRadius: 10, backdropFilter: 'blur(4px)',
                }}>
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* "+N" — same full-catalog affordance as the studio profile's own
          portfolio grid (there it's implicit in "See N more"; here, since
          the card only has room for 3 tiles, it sits on the last one). */}
      {moreCount > 0 && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(10,6,4,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: '#fff',
        }}>
          +{moreCount}
        </div>
      )}
    </div>
  );
}

// Sorts "in brief" (hit) chips to the front, stable otherwise — same
// signal that colors them green, just also used to order them so the
// buyer sees what matched before what didn't.
function sortHitsFirst(chips) {
  return chips.map((c, i) => ({ ...c, i })).sort((a, b) => (b.hit - a.hit) || (a.i - b.i));
}

export default function RecommendationCard({ rec, position, isBonus, onContact, onGetIntroduced, buyerSummary, revealDelayMs = 0, flash = false }) {
  const [activeTab, setActiveTab] = useState('why');
  const rank = RANKING_STYLES[rec.ranking] || RANKING_STYLES.medium;
  const images = (rec.hero_images || []).filter(Boolean);
  const hero = images[0];
  const [imgLoaded, setImgLoaded] = useState(false);
  // Full-catalog lightbox — same viewer the studio profile page's portfolio
  // grid opens (see MediaLightbox.jsx), opened either from the "+N" tile
  // or by clicking any of the 2-3 visible collage tiles.
  const [lbIndex, setLbIndex] = useState(null);
  const whyLines = buildWhyLines(rec, buyerSummary, isBonus);
  const bestAt = (rec.what_best_at || []).filter(Boolean);
  const craftProfiles = (rec.craft_profiles || []).filter(c => c?.craft_name);
  const fabricProfiles = (rec.fabric_profiles || []).filter(f => f?.fabric_name);
  const dyeProfiles = (rec.dye_profiles || []).filter(d => d?.dye_name);
  const categories = rec.categories || {};

  const buyerCrafts    = buyerSummary?.crafts        || [];
  const buyerFabrics   = buyerSummary?.fabrics       || [];
  const buyerProducts  = buyerSummary?.product_types || [];
  const craftChips  = sortHitsFirst((rec.primary_crafts  || []).slice(0, 3).map(c => ({ label: c, hit: isHit(c, buyerCrafts) })));
  const fabricChips = sortHitsFirst((rec.primary_fabrics || []).slice(0, 2).map(f => ({ label: f, hit: isHit(f, buyerFabrics) })));
  const categoryChips = sortHitsFirst([
    ...(categories.garment_types || []),
    ...(categories.occasions || []),
    ...(categories.gender_focus || []),
  ].map(label => ({ label, hit: isHit(label, buyerProducts) })));

  // For bonus cards, only show "best at" tab — Techniques/Fabrics/Dyes
  // below read from real craft_profiles/fabric_profiles/dye_profiles, same
  // as a regular card, so they're included there too whenever there's
  // something to show. Regular cards get Categories instead of "What
  // They're Best At" (that field is specifically for the visual-match
  // bonus cards; a regular match's equivalent real data is the studio's
  // actual garment/occasion/gender categories).
  const tabs = isBonus
    ? [{ key: 'best', label: "What They're Best At" }]
    : [
        { key: 'why',        label: 'Why Recommended' },
        { key: 'techniques', label: 'Techniques' },
        { key: 'fabrics',    label: 'Fabrics & Dyes' },
        { key: 'categories', label: 'Categories' },
      ];

  // USP blurb from studio details
  const blurb = rec.short_description || null;

  // Meta row — Since <year> · MOQ <n> pcs · Samples in <range>. All three
  // are real fields (years_in_operation was already in the API response
  // but never rendered; moq_summary/sampling_summary are new — see
  // serializers.py). Each is independently optional.
  const metaParts = [
    rec.establishment_year ? `Since ${rec.establishment_year}` : null,
    rec.moq_summary ? `MOQ ${rec.moq_summary}` : null,
    rec.sampling_summary ? `Samples in ${rec.sampling_summary}` : null,
  ].filter(Boolean);

  return (
    <div className={`rec-card${flash ? ' rec-card-flash' : ''}`} style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-16)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      transition: 'border-color 0.2s',
      height: '100%',
      position: 'relative',
      animation: 'cardRise 0.45s ease both',
      animationDelay: `${revealDelayMs}ms`,
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border3)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
    >
      <style>{`
        @media (max-width: 600px) {
          .rec-card { height: auto !important; }
          .rec-card-body { padding: 16px !important; }
        }
        @keyframes cardRise {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes cardFlashPulse {
          0%   { box-shadow: 0 0 0 0 rgba(122,140,110,0.5); }
          70%  { box-shadow: 0 0 0 7px rgba(122,140,110,0); }
          100% { box-shadow: 0 0 0 0 rgba(122,140,110,0); }
        }
        .rec-card-flash { animation: cardRise 0.45s ease both, cardFlashPulse 1.6s ease-out 1; }
      `}</style>
      {/* position badge */}
      <div style={{
        position: 'absolute', top: 14, left: 14, zIndex: 2,
        width: 28, height: 28, borderRadius: '50%',
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700, color: '#fff', border: '1px solid var(--border2)',
      }}>
        {isBonus ? '★' : position}
      </div>
      {!isBonus && position === 1 && (
        <div style={{
          position: 'absolute', top: 14, left: 50, zIndex: 2,
          padding: '5px 12px', borderRadius: 14,
          background: 'rgba(255,255,255,0.92)', color: 'var(--sage)',
          fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
          fontFamily: 'var(--font-body)',
        }}>
          Closest to your brief
        </div>
      )}

      {/* Hero — collage of up to 3 real portfolio photos when the studio has
          more than one, single photo (unchanged behaviour) otherwise. No
          fake/placeholder tiles are ever added just to fill the grid.
          Already sorted brief-first by the backend (serializers.py); any
          photos beyond the 3 visible tiles are reachable via the "+N" tile,
          which opens the full catalog in the same lightbox the studio
          profile page uses. */}
      {images.length >= 2 ? (
        <div style={{
          height: 220, background: 'var(--border)', flexShrink: 0,
          display: 'grid',
          gridTemplateColumns: images.length >= 3 ? '1.4fr 1fr' : '1fr 1fr',
          gridTemplateRows: images.length >= 3 ? '1fr 1fr' : '1fr',
          gap: 2,
        }}>
          <div style={{ position: 'relative', overflow: 'hidden', gridRow: images.length >= 3 ? 'span 2' : 'auto' }}>
            <CollageTile item={hero} alt={rec.studio_name} big showShimmer imgLoaded={imgLoaded} onImgLoad={() => setImgLoaded(true)} onClick={() => setLbIndex(0)} />
          </div>
          <div style={{ position: 'relative', overflow: 'hidden' }}>
            <CollageTile item={images[1]} alt={rec.studio_name} onClick={() => setLbIndex(1)} />
          </div>
          {images.length >= 3 && (
            <div style={{ position: 'relative', overflow: 'hidden' }}>
              <CollageTile
                item={images[2]}
                alt={rec.studio_name}
                onClick={() => setLbIndex(2)}
                moreCount={images.length > 3 ? images.length - 3 : 0}
              />
            </div>
          )}
        </div>
      ) : (
        <div style={{ height: 220, background: 'var(--surface2)', flexShrink: 0, overflow: 'hidden', position: 'relative' }}>
          <style>{`@keyframes heroShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
          <CollageTile item={hero} alt={rec.studio_name} big showShimmer imgLoaded={imgLoaded} onImgLoad={() => setImgLoaded(true)} onClick={hero ? () => setLbIndex(0) : undefined} />
        </div>
      )}

      {lbIndex !== null && images.length > 0 && (
        <MediaLightbox images={images} startIndex={lbIndex} onClose={() => setLbIndex(null)} />
      )}

      {/* Card body */}
      <div className="rec-card-body" style={{ padding: '24px 28px', flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* Studio name + location + years */}
        <div style={{ marginBottom: 6 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, color: 'var(--text)', marginBottom: 2, lineHeight: 1.2 }}>
            {rec.studio_name || 'Studio'}
          </h3>
            {(rec.location || metaParts.length > 0) && (
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                {[rec.location, ...metaParts].filter(Boolean).join('  ·  ')}
              </div>
            )}
        </div>

        {/* Blurb / tagline */}
        {blurb && (
          <div style={{ fontSize: 13, color: 'var(--text2)', fontStyle: 'italic', lineHeight: 1.5, marginBottom: 10 }}>
            &ldquo;{blurb}&rdquo;
          </div>
        )}

        {/* Craft + fabric tags — tags the buyer's own brief asked for are
            highlighted (checkmark + tinted), same "in brief" treatment as
            the reference design, driven by buyerSummary we already have. */}
        {(craftChips.length > 0 || fabricChips.length > 0) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 2 }}>
            {craftChips.map(({ label, hit }) => (
              <span key={label} style={{
                padding: '4px 12px', borderRadius: 'var(--r-lg)',
                background: hit ? 'rgba(122,140,110,0.14)' : 'rgba(122,140,110,0.08)',
                border: `1px solid ${hit ? 'var(--sage)' : 'rgba(196,110,73,0.2)'}`,
                fontSize: 11, color: 'var(--sage)', fontWeight: hit ? 600 : 500,
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}>
                {hit && '✓ '}{label}
              </span>
            ))}
            {fabricChips.map(({ label, hit }) => (
              <span key={label} style={{
                padding: '4px 12px', borderRadius: 'var(--r-lg)',
                background: hit ? 'rgba(122,140,110,0.14)' : 'var(--surface3)',
                border: `1px solid ${hit ? 'var(--sage)' : 'var(--border)'}`,
                fontSize: 11, color: hit ? 'var(--sage)' : 'var(--text2)', fontWeight: hit ? 600 : 400,
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}>
                {hit && '✓ '}{label}
              </span>
            ))}
          </div>
        )}

        {/* Fit row — real core_capability_fit / craft_approach_fit ratings.
            Renders nothing if neither is a real rating yet (see FitRow). */}
        <FitRow rec={rec} />

        <div style={{ height: 16 }} />

        {/* ── Tabs ─────────────────────────────────────────────── */}
        <div style={{ borderBottom: '1px solid var(--border)', display: 'flex', gap: 0, marginBottom: 16, overflowX: 'auto' }}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                padding: '10px 16px', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap',
                color: activeTab === t.key ? 'var(--sage)' : 'var(--text3)',
                background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: activeTab === t.key ? '2px solid var(--sage)' : '2px solid transparent',
                fontFamily: 'var(--font-body)', transition: 'color 0.15s, border-color 0.15s',
                marginBottom: -1,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab content ──────────────────────────────────────── */}
        <div style={{ flex: 1, minHeight: 120 }}>

          {/* Why Recommended */}
          {activeTab === 'why' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {whyLines.length > 0 ? whyLines.map((line, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
                  <span style={{ color: 'var(--text4)', flexShrink: 0, marginTop: 1 }}>·</span>
                  <span>{line}</span>
                </div>
              )) : (
                <div style={{ fontSize: 13, color: 'var(--text4)' }}>Match details not available.</div>
              )}
            </div>
          )}

          {/* Techniques — real per-craft data (specialization, sampling &
              production time, limitations) plus Qala's own Skilled/Expert/
              Master rating. Falls back to the plain primary_crafts name
              list only if craft_profiles came back empty. */}
          {activeTab === 'techniques' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {craftProfiles.length > 0 ? craftProfiles.slice(0, 5).map((c, i) => (
                <div key={i} style={{ paddingBottom: 12, borderBottom: i < craftProfiles.length - 1 ? '0.5px solid var(--border)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{c.craft_name}</span>
                    <BadgePill text={QALA_BADGE_LABEL[c.qala_badge]} tone={QALA_BADGE_TONE[c.qala_badge]} />
                  </div>
                  {(c.sampling_time || c.production_timeline) && (
                    <div style={{ fontSize: 11.5, color: 'var(--text3)', marginTop: 4 }}>
                      {[c.sampling_time && `Samples in ${c.sampling_time}`, c.production_timeline && `~${c.production_timeline} for 50 units`].filter(Boolean).join(' · ')}
                    </div>
                  )}
                  {c.specialization && (
                    <div style={{ fontSize: 12.5, color: 'var(--text2)', marginTop: 5, lineHeight: 1.6 }}>{c.specialization}</div>
                  )}
                </div>
              )) : (rec.primary_crafts || []).length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {rec.primary_crafts.map(c => (
                    <span key={c} style={{ padding: '6px 13px', borderRadius: 14, background: 'var(--surface3)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text2)' }}>{c}</span>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--text4)' }}>Details coming soon.</div>
              )}
            </div>
          )}

          {/* Fabrics & Dyes — real Moderate/High/Pro expertise per fabric
              and per dye, combined in one tab (same section grouping as
              the studio profile page's own Fabrics & Dyes area). */}
          {activeTab === 'fabrics' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {fabricProfiles.length > 0 ? fabricProfiles.map((f, i) => (
                  <span key={i} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7,
                    padding: '6px 12px', borderRadius: 14,
                    background: 'var(--surface3)', border: '1px solid var(--border)',
                    fontSize: 12, color: 'var(--text2)',
                  }}>
                    {f.fabric_name}
                    <BadgePill text={EXPERTISE_LABEL[f.expertise_level]} tone={EXPERTISE_TONE[f.expertise_level]} small />
                  </span>
                )) : (rec.primary_fabrics || []).length > 0 ? (
                  rec.primary_fabrics.map(f => (
                    <span key={f} style={{ padding: '6px 13px', borderRadius: 14, background: 'var(--surface3)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text2)' }}>{f}</span>
                  ))
                ) : (
                  <div style={{ fontSize: 13, color: 'var(--text4)' }}>Details coming soon.</div>
                )}
              </div>
              {dyeProfiles.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {dyeProfiles.map((d, i) => (
                    <span key={i} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 7,
                      padding: '6px 12px', borderRadius: 14,
                      background: 'var(--surface3)', border: '1px solid var(--border)',
                      fontSize: 12, color: 'var(--text2)',
                    }}>
                      {d.dye_name}
                      <BadgePill text={EXPERTISE_LABEL[d.expertise_level]} tone={EXPERTISE_TONE[d.expertise_level]} small />
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Categories — the studio's real garment/occasion/gender
              categories (same taxonomy as the studio profile's Categories
              section). Chips the buyer's own product types hit are
              highlighted + sorted first, same treatment as the top chip
              row. Regular-card tab; bonus (visual-match) cards keep
              "What They're Best At" below instead, unchanged. */}
          {activeTab === 'categories' && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {categoryChips.length > 0 ? categoryChips.map(({ label, hit }) => (
                <span key={label} style={{
                  padding: '6px 13px', borderRadius: 14,
                  background: hit ? 'rgba(122,140,110,0.14)' : 'var(--surface3)',
                  border: `1px solid ${hit ? 'var(--sage)' : 'var(--border)'}`,
                  fontSize: 12, color: hit ? 'var(--sage)' : 'var(--text2)', fontWeight: hit ? 600 : 400,
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                }}>
                  {hit && '✓ '}{label}
                </span>
              )) : (
                <div style={{ fontSize: 13, color: 'var(--text4)' }}>Details coming soon.</div>
              )}
            </div>
          )}

          {/* What They're Best At — bonus (visual-match) cards only */}
          {activeTab === 'best' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {bestAt.length > 0 ? bestAt.slice(0, 5).map((w, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
                  <span style={{ color: 'var(--green-bright)', flexShrink: 0, marginTop: 1 }}>✓</span>
                  <span>{typeof w === 'string' ? w : w.explanation}</span>
                </div>
              )) : (
                <div style={{ fontSize: 13, color: 'var(--text4)' }}>Details coming soon.</div>
              )}
            </div>
          )}
        </div>

        {/* Bonus mismatches */}
        {isBonus && rec.mismatches?.length > 0 && (
          <div style={{
            background: 'rgba(232,184,80,0.05)', border: '1px solid rgba(232,184,80,0.15)',
            borderRadius: 'var(--r-8)', padding: '10px 12px', marginTop: 14,
          }}>
            <div style={{ fontSize: 10, color: 'var(--amber)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
              Visual match — some differences
            </div>
            {rec.mismatches.map((m, i) => (
              <div key={i} style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>· {typeof m === 'string' ? m : m.explanation}</div>
            ))}
          </div>
        )}

        {/* CTAs — Get Introduced opens the exact same IntroPopup flow the
            studio profile page's own "Get Introduced" button opens (see
            StudioProfile.jsx's IntroPopup); this just navigates there with
            autoOpenIntro so it pops open on arrival instead of duplicating
            that flow's validation here. */}
        <div style={{ display: 'flex', gap: 10, marginTop: 'auto', paddingTop: 14 }}>
          <button
            onClick={() => (onGetIntroduced || onContact)(rec)}
            style={{
              flex: 1, minWidth: 0, padding: '14px 18px', borderRadius: 'var(--r-8)',
              background: 'var(--sage)', color: '#fff', border: 'none',
              fontSize: 12, fontWeight: 500, cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              letterSpacing: '0.04em', textAlign: 'center',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--sage-muted)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--sage)'; }}
          >
            Get Introduced
          </button>
          <button
            onClick={() => onContact(rec)}
            className="cta-btn"
            style={{
              flex: 1, minWidth: 0, padding: '14px 18px', borderRadius: 'var(--r-8)',
              background: 'var(--text)', color: 'var(--surface2)', border: 'none',
              fontSize: 12, fontWeight: 500, cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              letterSpacing: '0.04em', textAlign: 'center',
              transition: 'transform 0.2s, box-shadow 0.2s, background 0.2s',
              boxSizing: 'border-box',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--sage-muted)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 40px rgba(122,140,110,0.3)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--text)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            View Profile →
          </button>
        </div>
      </div>
    </div>
  );
}
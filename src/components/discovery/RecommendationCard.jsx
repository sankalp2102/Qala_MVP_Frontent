import { useState } from 'react';
import { mediaUrl, mediaOnError } from '../../utils/mediaUrl';

const RANKING_STYLES = {
  high:   { bg: 'rgba(90,232,122,0.08)', color: '#5AE87A', border: 'rgba(90,232,122,0.2)',  label: 'Strong Match' },
  medium: { bg: 'rgba(232,184,80,0.08)', color: '#E8B850', border: 'rgba(232,184,80,0.2)',  label: 'Good Match' },
  low:    { bg: 'rgba(160,160,160,0.08)',color: '#A0A0A0', border: 'rgba(160,160,160,0.2)', label: 'Possible Match' },
};

const BATCH_LABELS = {
  under_30: 'Under 30 pieces',
  '30_100': '30–100 pieces',
  over_100: '100+ pieces',
  not_sure: '',
};

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

export default function RecommendationCard({ rec, position, isBonus, onContact, buyerSummary }) {
  const [activeTab, setActiveTab] = useState('why');
  const rank = RANKING_STYLES[rec.ranking] || RANKING_STYLES.medium;
  const hero = rec.hero_images?.[0];
  const whyLines = buildWhyLines(rec, buyerSummary, isBonus);
  const bestAt = (rec.what_best_at || []).filter(Boolean);

  // For bonus cards, only show "best at" tab
  const tabs = isBonus
    ? [{ key: 'best', label: "What They're Best At" }]
    : [
        { key: 'why',  label: 'Why Recommended' },
        { key: 'best', label: "What They're Best At" },
      ];

  // USP blurb from studio details
  const blurb = rec.short_description || null;

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 16,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      transition: 'border-color 0.2s',
      height: '100%',
      position: 'relative',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border3)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
    >
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

      {/* ranking badge */}
      <div style={{
        position: 'absolute', top: 14, right: 14, zIndex: 2,
        padding: '4px 10px', borderRadius: 20,
        background: rank.bg, color: rank.color,
        border: `1px solid ${rank.border}`,
        fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
      }}>
        {isBonus ? 'Visual Match' : rank.label}
      </div>

      {/* Hero image */}
      <div style={{ height: 220, background: 'var(--surface2)', flexShrink: 0, overflow: 'hidden' }}>
        {hero ? (
          <img
            src={mediaUrl(hero.url)}
            alt={rec.studio_name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={mediaOnError(hero.url)}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            background: 'var(--surface3)',
          }} />
        )}
      </div>

      {/* Card body */}
      <div style={{ padding: '24px 28px', flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* Studio name + location + years */}
        <div style={{ marginBottom: 6 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, color: 'var(--text)', marginBottom: 2, lineHeight: 1.2 }}>
            {rec.studio_name || 'Studio'}
          </h3>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>
            {[rec.location, rec.years_in_operation ? `Est. ${Math.round(new Date().getFullYear() - rec.years_in_operation)}` : null].filter(Boolean).join(' · ')}
          </div>
        </div>

        {/* Blurb / tagline */}
        {blurb && (
          <div style={{ fontSize: 13, color: 'var(--text2)', fontStyle: 'italic', lineHeight: 1.5, marginBottom: 10 }}>
            &ldquo;{blurb}&rdquo;
          </div>
        )}

        {/* Craft + fabric tags */}
        {(rec.primary_crafts?.length > 0 || rec.primary_fabrics?.length > 0) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            {(rec.primary_crafts || []).slice(0, 3).map(c => (
              <span key={c} style={{
                padding: '4px 12px', borderRadius: 12,
                background: 'rgba(196,110,73,0.08)', border: '1px solid rgba(196,110,73,0.2)',
                fontSize: 11, color: '#B85C38', fontWeight: 500,
              }}>{c}</span>
            ))}
            {(rec.primary_fabrics || []).slice(0, 2).map(f => (
              <span key={f} style={{
                padding: '4px 12px', borderRadius: 12,
                background: 'var(--surface3)', border: '1px solid var(--border)',
                fontSize: 11, color: 'var(--text2)',
              }}>{f}</span>
            ))}
          </div>
        )}

        {/* ── Tabs ─────────────────────────────────────────────── */}
        <div style={{ borderBottom: '1px solid var(--border)', display: 'flex', gap: 0, marginBottom: 16 }}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                padding: '10px 16px', fontSize: 13, fontWeight: 500,
                color: activeTab === t.key ? '#B85C38' : 'var(--text3)',
                background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: activeTab === t.key ? '2px solid #B85C38' : '2px solid transparent',
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

          {/* What They're Best At */}
          {activeTab === 'best' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {bestAt.length > 0 ? bestAt.slice(0, 5).map((w, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
                  <span style={{ color: '#5AE87A', flexShrink: 0, marginTop: 1 }}>✓</span>
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
            borderRadius: 8, padding: '10px 12px', marginTop: 14,
          }}>
            <div style={{ fontSize: 10, color: 'var(--amber)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
              Visual match — some differences
            </div>
            {rec.mismatches.map((m, i) => (
              <div key={i} style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>· {typeof m === 'string' ? m : m.explanation}</div>
            ))}
          </div>
        )}

        {/* CTA */}
        <button
          onClick={() => onContact(rec)}
          className="cta-btn"
          style={{
            display: 'block', width: '100%', padding: '14px 24px', borderRadius: 8,
            background: '#1A1612', color: '#F5F0E8', border: 'none',
            fontSize: 12, fontWeight: 500, cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            letterSpacing: '0.06em', textTransform: 'uppercase', textAlign: 'center',
            transition: 'transform 0.2s, box-shadow 0.2s, background 0.2s',
            boxSizing: 'border-box', marginTop: 16,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#C46E49'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 40px rgba(196,110,73,0.3)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#1A1612'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          View Profile →
        </button>
      </div>
    </div>
  );
}

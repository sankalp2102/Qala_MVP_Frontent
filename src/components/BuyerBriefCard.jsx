// src/components/BuyerBriefCard.jsx
//
// The "Buyer's Brief" card, extracted from the studio-side EnquiryDetail so
// the admin side shows the exact same layout. Takes a brief in the project
// Brief model's field names (preferred_fabrics, occasion_tags, ...). Use
// snapshotToBrief() to feed it an Introduction Request's brief_snapshot.

import { useState } from 'react';
import { mediaUrl } from '../utils/mediaUrl';

const S = {
  card: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '24px 28px', marginBottom: 20 },
  cardTitle: { fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--text)' },
  label: { fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 },
  value: { fontSize: 14, fontWeight: 500, color: 'var(--text)' },
  divider: { height: 1, background: 'var(--border)', margin: '18px 0' },
  chip: { fontSize: 12, color: 'var(--text2)', background: 'var(--gold-dim)', border: '1px solid var(--gold-l)', borderRadius: 'var(--r-20)', padding: '3px 10px', marginRight: 4, display: 'inline-block', marginBottom: 4 },
  chipPlain: { fontSize: 12, color: 'var(--text2)', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r-20)', padding: '3px 10px', marginRight: 4, display: 'inline-block', marginBottom: 4 },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 },
};

function fmt(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const arr = v => (Array.isArray(v) ? v : v ? [v] : []).filter(Boolean);

// Introduction Request brief_snapshot (BuyerProfile field names) -> Brief shape.
export function snapshotToBrief(snap = {}) {
  return {
    project_type: snap.process_stage || null,
    gender: arr(snap.gender).join(', ') || null,
    bulk_quantity: snap.batch_size || null,
    target_landing_price_local: snap.target_landing_price_local,
    target_landing_currency: snap.target_landing_currency,
    target_bulk_delivery_date: snap.target_bulk_delivery_date,
    buyer_location: snap.buyer_location,
    occasion_tags: arr(snap.occasion),
    garment_types: arr(snap.garment_types).length ? arr(snap.garment_types) : arr(snap.product_types),
    preferred_fabrics: arr(snap.fabrics_required),
    preferred_dyes: arr(snap.dyes_required),
    printing_required: arr(snap.printing_required),
    dyeing_techniques_required: arr(snap.dyeing_techniques_required),
    embellishment_required: arr(snap.embellishment_required),
    weaving_required: arr(snap.weaving_required),
    spinning_required: arr(snap.spinning_required),
    crafts: arr(snap.crafts),
    timeline: snap.timeline,
    additional_specs: snap.references || null,
  };
}

function Group({ label, items }) {
  const list = arr(items);
  return (
    <div>
      <div style={{ ...S.label, marginBottom: 6 }}>{label}</div>
      <div>
        {list.length
          ? list.map((t, i) => <span key={i} style={S.chipPlain}>{t}</span>)
          : <span style={{ fontSize: 12, color: 'var(--text4)' }}>Not specified</span>}
      </div>
    </div>
  );
}

const IMG_RE = /\.(jpe?g|png|gif|webp|avif|bmp)(\?.*)?$/i;
const isImage = m => (m.mime_type || '').startsWith('image/') || IMG_RE.test(m.file_name || m.name || '') || IMG_RE.test(m.url || '');

function Lightbox({ src, onClose }) {
  if (!src) return null;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(20,18,15,0.82)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, cursor: 'zoom-out' }}>
      <img src={src} alt="" style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 8, boxShadow: '0 10px 40px rgba(0,0,0,0.4)' }} />
    </div>
  );
}

export default function BuyerBriefCard({ brief = {}, referenceImages = [], matchScore, action, note, title = "Buyer's Brief", style }) {
  const [zoom, setZoom] = useState(null);
  const price = brief.target_landing_price_local
    ? `${brief.target_landing_currency || ''} ${brief.target_landing_price_local}`.trim() : '—';
  const qty = brief.bulk_quantity
    ? (isNaN(Number(brief.bulk_quantity)) ? String(brief.bulk_quantity) : `${Number(brief.bulk_quantity).toLocaleString()} units`)
    : '—';
  const printingDyeing = [...arr(brief.printing_required), ...arr(brief.dyeing_techniques_required)];
  const weavingSpinning = [...arr(brief.weaving_required), ...arr(brief.spinning_required), ...arr(brief.crafts)];
  const moodboards = arr(brief.moodboards);
  const images = [
    ...moodboards.filter(m => m.url && isImage(m)).map(m => mediaUrl(m.url)),
    ...arr(referenceImages),
  ];
  const files = moodboards.filter(m => !(m.url && isImage(m)));

  return (
    <div style={{ ...S.card, ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}>
        <div style={S.cardTitle}>{title}</div>
        {action}
      </div>
      {note && <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>{note}</div>}

      <div style={{ ...S.grid4, marginBottom: 20 }}>
        <div><div style={S.label}>Project type</div><div style={S.value}>{brief.project_type || '—'}</div></div>
        <div><div style={S.label}>Gender</div><div style={S.value}>{brief.gender || '—'}</div></div>
        <div><div style={S.label}>Quantity</div><div style={S.value}>{qty}</div></div>
        <div><div style={S.label}>Target price</div><div style={S.value}>{price}</div></div>
      </div>
      <div style={S.grid4}>
        <div><div style={S.label}>Bulk delivery</div><div style={S.value}>{fmt(brief.target_bulk_delivery_date)}</div></div>
        <div><div style={S.label}>Delivery location</div><div style={S.value}>{brief.buyer_location || '—'}</div></div>
        {brief.timeline ? <div><div style={S.label}>Timeline</div><div style={S.value}>{brief.timeline}</div></div> : null}
        {typeof matchScore === 'number' && (
          <div><div style={S.label}>Match Score</div><div style={{ ...S.value, color: 'var(--gold)', fontSize: 18 }}>{Math.round(matchScore)}%</div></div>
        )}
      </div>

      {arr(brief.occasion_tags).length > 0 && (
        <>
          <div style={S.divider} />
          <div style={{ ...S.label, marginBottom: 6 }}>Occasion</div>
          <div>{arr(brief.occasion_tags).map((t, i) => <span key={i} style={S.chip}>{t}</span>)}</div>
        </>
      )}
      {arr(brief.garment_types).length > 0 && (
        <>
          <div style={S.divider} />
          <div style={{ ...S.label, marginBottom: 6 }}>Product / garment types</div>
          <div>{arr(brief.garment_types).map((t, i) => <span key={i} style={S.chip}>{t}</span>)}</div>
        </>
      )}

      <div style={S.divider} />
      <div style={S.grid4}>
        <Group label="Fabrics" items={brief.preferred_fabrics} />
        <Group label="Printing & dyeing" items={printingDyeing} />
        <Group label="Surface work" items={brief.embellishment_required} />
        <Group label="Dyes" items={brief.preferred_dyes} />
      </div>
      {weavingSpinning.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <Group label="Weaving, spinning & crafts" items={weavingSpinning} />
        </div>
      )}

      {(images.length > 0 || files.length > 0) && (
        <>
          <div style={S.divider} />
          <div style={{ ...S.label, marginBottom: 8 }}>References</div>
          {images.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: files.length ? 10 : 0 }}>
              {images.map((src, i) => (
                <button key={i} type="button" onClick={() => setZoom(src)} style={{ width: 120, height: 120, padding: 0, borderRadius: 'var(--r-8)', overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--surface2)', cursor: 'zoom-in' }}>
                  <img src={src} alt={`Reference ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={e => { e.currentTarget.style.display = 'none'; }} />
                </button>
              ))}
            </div>
          )}
          {files.map((m, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '7px 10px', marginBottom: 5 }}>
              <span style={{ fontSize: 12, fontWeight: 500, flex: 1 }}>{m.file_name || m.name}</span>
              {m.url && <a href={mediaUrl(m.url)} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--gold)' }}>Open</a>}
            </div>
          ))}
        </>
      )}
      {(brief.additional_specs || brief.product_description) && (
        <>
          <div style={S.divider} />
          <div style={{ ...S.label, marginBottom: 6 }}>Buyer notes</div>
          <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>
            {brief.additional_specs || brief.product_description}
          </p>
        </>
      )}
      <Lightbox src={zoom} onClose={() => setZoom(null)} />
    </div>
  );
}
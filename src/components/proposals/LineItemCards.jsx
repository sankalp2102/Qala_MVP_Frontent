/*
 * src/components/proposals/LineItemCards.jsx
 *
 * Matches studio-proposal.html's Section 4 (Costing) structure: three fixed,
 * color-coded, collapsible phase cards — Design (sage #7A8C6E), Sampling
 * (gold #C4953A), Production (purple #5B4B8A) — each with its own table and
 * its own "+ Add item" button, instead of one flat list where order type is
 * picked per item. Adding an item inside a phase card sets its order_type
 * automatically; the old "pick order type, then domain" two-step config only
 * still applies to product domain (apparel/home_furnishings/jewellery/
 * accessories), which items within any phase can still mix.
 *
 * Used by the seller ProposalBuilder (Step 4) and the admin ProposalReviewPanel
 * so both stay in lockstep, sharing the same shape and the shared calculator.
 */
import { useState } from 'react';
import { getCats, GENDERS, TECHNIQUES, MATERIALS, JEW_MATERIALS, ACC_MATERIALS, GST_OPTIONS } from '../../utils/calculator';

export const ORDER_TYPES    = [['designing', 'Designing'], ['sampling', 'Sampling'], ['production', 'Production']];
export const DOMAIN_OPTIONS = [['apparel', 'Apparel'], ['home_furnishings', 'Home Furnishings'], ['jewellery', 'Jewellery'], ['accessories', 'Accessories']];

const OT_LABEL = Object.fromEntries(ORDER_TYPES);
const DM_LABEL = Object.fromEntries(DOMAIN_OPTIONS);

// Matches studio-proposal.html's phase cards exactly — colors, order, copy.
const PHASES = [
  { key: 'designing',  label: 'Design',     color: '#7A8C6E', hint: 'Tech packs · Mockups · Design files' },
  { key: 'sampling',   label: 'Sampling',   color: '#C4953A', hint: 'Physical samples · Prototypes' },
  { key: 'production', label: 'Production', color: '#5B4B8A', hint: 'Bulk manufacturing' },
];

/** A fresh, unconfigured item. Order type + domain are picked in the card. */
export function mkItem() {
  return {
    _id: Date.now() + Math.random(),
    order_type: '', product_domain: '', _configured: false,
    name: '', category: '', gender: 'Women', material: '', technique: 'Woven',
    weight_per_pc: '', qty: '', cost_per_pc_inr: '', gst_rate: '0', declared_value_usd: '',
  };
}

/** Stamp legacy items (saved before per-item) so they render configured. */
export function normalizeItems(items, fallbackType, fallbackDomain) {
  return (items || []).map(it => {
    const product_domain = it.product_domain || fallbackDomain || 'apparel';
    const order_type     = it.order_type || fallbackType || 'production';
    return {
      ...it,
      order_type, product_domain,
      _configured: it._configured ?? true,
      category: it.category || getCats(product_domain)[0],
      _id: it._id ?? (Date.now() + Math.random()),
    };
  });
}

/** Derive a proposal-level summary value ("mixed" when items differ). */
export function summarize(items, key, fallback) {
  const vals = [...new Set((items || []).filter(i => i[key]).map(i => i[key]))];
  if (vals.length === 1) return vals[0];
  if (vals.length > 1)   return 'mixed';
  return fallback;
}

/* ── styles ── */
const cellCtl = { padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface2)', fontSize: 12, color: 'var(--text)', fontFamily: 'var(--font-body)', width: '100%', boxSizing: 'border-box' };
const th = { fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'left', padding: '0 8px 8px', whiteSpace: 'nowrap' };
const td = { padding: '4px 8px 4px 0', verticalAlign: 'top' };

function fmtINR0(n) {
  const v = Number(n) || 0;
  return `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

/** One editable table row for an item already assigned to a phase.
   Always renders the phase's full fixed column set (Gender/Material/
   Technique included) even for non-apparel items — shows a "—" placeholder
   instead of omitting the cell, so rows never misalign against the header
   when a phase mixes domains (e.g. one apparel item, one jewellery item). */
function ItemRow({ item, onChange, onRemove, isDesigning, isSampling }) {
  const upd = (k, v) => onChange({ ...item, [k]: v });

  const domain     = item.product_domain || 'apparel';
  const isApparel  = domain === 'apparel';
  const isJew      = domain === 'jewellery';
  const isAcc      = domain === 'accessories';
  const isHF       = domain === 'home_furnishings';
  const mats       = isJew ? JEW_MATERIALS : isAcc ? ACC_MATERIALS : MATERIALS;
  const cats       = getCats(domain);
  const dash       = <span style={{ color: 'var(--text4)' }}>—</span>;

  return (
    <tr>
      <td style={td}><input value={item.name} onChange={e => upd('name', e.target.value)} placeholder="e.g. Wide-leg trousers" style={{ ...cellCtl, minWidth: 130 }} /></td>
      {!isDesigning && (
        <td style={td}>
          <select value={domain} onChange={e => upd('product_domain', e.target.value)} style={{ ...cellCtl, minWidth: 100 }}>
            {DOMAIN_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </td>
      )}
      <td style={td}>
        <select value={item.category || cats[0]} onChange={e => upd('category', e.target.value)} style={{ ...cellCtl, minWidth: 110 }}>
          {cats.map(c => <option key={c}>{c}</option>)}
        </select>
      </td>
      {!isDesigning && (
        <td style={td}>
          {isApparel
            ? <select value={item.gender} onChange={e => upd('gender', e.target.value)} style={{ ...cellCtl, minWidth: 70 }}>{GENDERS.map(g => <option key={g}>{g}</option>)}</select>
            : dash}
        </td>
      )}
      {!isDesigning && (
        <td style={td}>
          {!isHF
            ? <select value={item.material || mats[0]} onChange={e => upd('material', e.target.value)} style={{ ...cellCtl, minWidth: 100 }}>{mats.map(m => <option key={m}>{m}</option>)}</select>
            : dash}
        </td>
      )}
      {!isDesigning && (
        <td style={td}>
          {isApparel
            ? <select value={item.technique} onChange={e => upd('technique', e.target.value)} style={{ ...cellCtl, minWidth: 90 }}>{TECHNIQUES.map(t => <option key={t}>{t}</option>)}</select>
            : dash}
        </td>
      )}
      {!isDesigning && (
        <td style={td}><input type="number" min="1" value={item.qty} onChange={e => upd('qty', e.target.value)} placeholder="0" style={{ ...cellCtl, width: 54 }} /></td>
      )}
      <td style={td}><input type="number" min="0" value={item.cost_per_pc_inr} onChange={e => upd('cost_per_pc_inr', e.target.value)} placeholder="0" style={{ ...cellCtl, width: 82 }} /></td>
      <td style={td}>
        <select value={item.gst_rate} onChange={e => upd('gst_rate', e.target.value)} style={{ ...cellCtl, width: 60 }}>
          {GST_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </td>
      {!isDesigning && (
        <td style={td}><input type="number" min="0" step="0.01" value={item.weight_per_pc} onChange={e => upd('weight_per_pc', e.target.value)} placeholder="0.00" style={{ ...cellCtl, width: 66 }} /></td>
      )}
      <td style={{ ...td, textAlign: 'right', paddingRight: 0 }}>
        <button type="button" onClick={() => onRemove(item._id)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 17, lineHeight: 1 }}>×</button>
      </td>
    </tr>
  );
}

/** One color-coded, collapsible phase card — Design / Sampling / Production. */
function PhaseCard({ phase, items, onAdd, onUpdate, onRemove, note, onNoteChange }) {
  const [open, setOpen] = useState(true);
  const isDesigning = phase.key === 'designing';
  const isSampling  = phase.key === 'sampling';
  const NOTE_PLACEHOLDER = {
    designing:  "What's included in design — e.g. number of tech packs, revision rounds, file formats delivered…",
    sampling:   'Sampling specifics — e.g. number of sets, pieces per set, what\'s included, turnaround notes…',
    production: 'Production specifics — e.g. MOQ per style, colour options, finishing details, packaging…',
  };

  const subtotal = items.reduce((sum, it) => sum + (parseFloat(it.cost_per_pc_inr) || 0) * (isDesigning ? 1 : (parseFloat(it.qty) || 0)), 0);

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 10, marginBottom: 12, overflow: 'hidden' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', cursor: 'pointer', background: 'var(--surface)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: phase.color, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{phase.label}</div>
            <div style={{ fontSize: 11, color: 'var(--text4)' }}>{phase.hint}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600 }}>
            {items.length === 0 ? '—' : `${items.length} item${items.length > 1 ? 's' : ''} · ${fmtINR0(subtotal)}`}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text4)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>▾</span>
        </div>
      </div>

      {open && (
        <div style={{ padding: '4px 18px 16px', borderTop: '1px solid var(--border)' }}>
          {items.length > 0 && (
            <div style={{ overflowX: 'auto', marginTop: 12, marginBottom: 10 }}>
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr>
                    <th style={th}>{isDesigning ? 'Item / description' : 'Item'}</th>
                    {!isDesigning && <th style={th}>Domain</th>}
                    <th style={th}>{isDesigning ? 'Category' : 'Sub-type'}</th>
                    {!isDesigning && <th style={th}>Gender</th>}
                    {!isDesigning && <th style={th}>Material</th>}
                    {!isDesigning && <th style={th}>Technique</th>}
                    {!isDesigning && <th style={th}>Qty</th>}
                    <th style={th}>{isDesigning ? 'Fee (₹)' : 'Cost/pc (₹)'}</th>
                    <th style={th}>GST</th>
                    {!isDesigning && <th style={th}>Wt/pc (kg)</th>}
                    <th style={th}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(it => (
                    <ItemRow key={it._id} item={it} onChange={onUpdate} onRemove={onRemove} isDesigning={isDesigning} isSampling={isSampling} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {items.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--text4)', fontStyle: 'italic', padding: '10px 0' }}>No items in this phase yet.</div>
          )}
          <button
            type="button"
            onClick={() => onAdd(phase.key)}
            style={{ fontSize: 12, color: phase.color, background: `${phase.color}18`, border: `1px solid ${phase.color}40`, borderRadius: 6, padding: '7px 16px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600 }}
          >
            + Add item
          </button>

          <div style={{ marginTop: 12 }}>
            <textarea
              value={note || ''}
              onChange={e => onNoteChange(phase.key, e.target.value)}
              placeholder={NOTE_PLACEHOLDER[phase.key]}
              rows={2}
              style={{ width: '100%', fontSize: 12, padding: '9px 12px', borderRadius: 8, border: '1px solid #E8E4DF', fontFamily: 'var(--font-body)', color: 'var(--text)', background: '#fff', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.5, outline: 'none' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function LineItemCards({ items, onChange, phaseNotes, onPhaseNoteChange }) {
  const updOne = (next) => onChange(items.map(it => it._id === next._id ? next : it));
  const remove = (id)   => onChange(items.filter(it => it._id !== id));

  // Adding inside a phase card sets order_type automatically — the old
  // "pick order type first" step is implied by which card you clicked
  // "+ Add item" in, matching studio-proposal.html where each phase card
  // has its own Add button, not one shared list.
  const addToPhase = (orderType) => {
    const fresh = mkItem();
    onChange([...items, {
      ...fresh,
      order_type: orderType,
      product_domain: 'apparel',
      _configured: true,
      category: getCats('apparel')[0],
      material: 'Cotton',
    }]);
  };

  return (
    <div>
      {PHASES.map(phase => (
        <PhaseCard
          key={phase.key}
          phase={phase}
          items={items.filter(it => it.order_type === phase.key)}
          onAdd={addToPhase}
          onUpdate={updOne}
          onRemove={remove}
          note={phaseNotes?.[phase.key]}
          onNoteChange={onPhaseNoteChange}
        />
      ))}
    </div>
  );
}
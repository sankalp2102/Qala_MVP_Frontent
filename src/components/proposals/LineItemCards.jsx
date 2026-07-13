/*
 * src/components/proposals/LineItemCards.jsx
 *
 * Per-item proposal line items. Order type and product domain are chosen PER
 * ITEM (not globally), so one proposal can mix — e.g. an apparel production run
 * plus a jewellery sample. Only shipping method stays global on the parent.
 *
 * Each new item opens in a two-phase card:
 *   1. configure — pick Order Type, then Product Domain
 *   2. details   — the fields relevant to that combination
 *
 * Fields by order type:
 *   designing  → name, qty, design fee              (a service line — never ships)
 *   sampling   → + weight, GST, declared value ($)  (ships; duty on declared value)
 *   production → + weight, GST                       (ships; duty on production value)
 *
 * Fields by domain: apparel → gender + technique; others → material.
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

const OT_HINT = {
  designing:  'Design service — no shipping. Enter a design fee.',
  sampling:   'Ships to buyer. Declared value per piece needed for customs.',
  production: 'Full bulk run. Ships to buyer.',
};

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
const field = { display: 'flex', flexDirection: 'column', gap: 4 };
const flabel = { fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.06em' };
const control = { padding: '7px 9px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface2)', fontSize: 12, color: 'var(--text)', fontFamily: 'var(--font-body)', width: '100%' };

function Chip({ children, tone = 'gold' }) {
  const bg = tone === 'gold' ? 'var(--gold-dim)' : 'var(--surface3)';
  const fg = tone === 'gold' ? 'var(--gold)' : 'var(--text3)';
  return <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 20, background: bg, color: fg, whiteSpace: 'nowrap' }}>{children}</span>;
}

function Pick({ opts, val, onPick }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {opts.map(([v, l]) => (
        <button key={v} type="button" onClick={() => onPick(v)} style={{
          padding: '7px 15px', borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer',
          fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: val === v ? 600 : 400, transition: 'all .15s',
          background: val === v ? 'var(--gold)' : 'var(--surface2)', color: val === v ? '#fff' : 'var(--text2)',
        }}>{l}</button>
      ))}
    </div>
  );
}

function Labeled({ label, children }) {
  return <div style={field}><span style={flabel}>{label}</span>{children}</div>;
}

function LineItemCard({ item, index, onChange, onRemove }) {
  const [editingConfig, setEditingConfig] = useState(false);
  const upd = (k, v) => onChange({ ...item, [k]: v });

  const domain    = item.product_domain;
  const type      = item.order_type;
  const isApparel = domain === 'apparel';
  const isJew     = domain === 'jewellery';
  const isAcc     = domain === 'accessories';
  const isHF      = domain === 'home_furnishings';
  const mats      = isJew ? JEW_MATERIALS : isAcc ? ACC_MATERIALS : MATERIALS;
  const cats      = domain ? getCats(domain) : [];

  /* Phase 1 — configure (also reused when editing an existing item's combo) */
  if (!item._configured || editingConfig) {
    const ready = !!type && !!domain;
    const confirm = () => {
      onChange({
        ...item, _configured: true,
        category: item.category || getCats(domain)[0],
        // Material only applies to apparel / jewellery / accessories — not HF.
        material: isHF ? '' : (item.material || (isJew ? 'Fashion / Imitation' : isAcc ? 'Fabric' : 'Cotton')),
      });
      setEditingConfig(false);
    };
    return (
      <div style={{ border: '1px dashed var(--gold)', borderRadius: 10, padding: '16px 18px', background: 'var(--surface2)', marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{item._configured ? `Item ${index + 1} — change type` : `New item ${index + 1}`}</div>
          <button type="button" onClick={() => onRemove(item._id)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={{ ...flabel, marginBottom: 6 }}>1 · Order type</div>
            <Pick opts={ORDER_TYPES} val={type} onPick={v => upd('order_type', v)} />
            {type && <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 6 }}>{OT_HINT[type]}</div>}
          </div>
          <div>
            <div style={{ ...flabel, marginBottom: 6 }}>2 · Product domain</div>
            <Pick opts={DOMAIN_OPTIONS} val={domain} onPick={v => upd('product_domain', v)} />
          </div>
          <div>
            <button type="button" disabled={!ready} onClick={confirm} className="btn btn-primary"
              style={{ fontSize: 13, opacity: ready ? 1 : 0.5, cursor: ready ? 'pointer' : 'not-allowed' }}>
              Continue →
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* Phase 2 — details */
  const isDesigning = type === 'designing';
  const isSampling  = type === 'sampling';
  const costLabel   = isDesigning ? 'Design fee (₹)' : 'Cost/pc (₹)';

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', background: 'var(--surface)', marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)' }}>Item {index + 1}</span>
          <Chip>{OT_LABEL[type]}</Chip>
          <Chip tone="grey">{DM_LABEL[domain]}</Chip>
          <button type="button" onClick={() => setEditingConfig(true)} style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', fontSize: 11, textDecoration: 'underline', padding: 0 }}>change</button>
        </div>
        <button type="button" onClick={() => onRemove(item._id)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
        <div style={{ ...field, gridColumn: '1 / -1' }}>
          <span style={flabel}>Item name</span>
          <input value={item.name} onChange={e => upd('name', e.target.value)} placeholder="e.g. Wide-leg trousers" style={control} />
        </div>

        <Labeled label={isHF ? 'Item Type' : 'Category'}>
          <select value={item.category || cats[0]} onChange={e => upd('category', e.target.value)} style={control}>
            {cats.map(c => <option key={c}>{c}</option>)}
          </select>
        </Labeled>

        {isApparel && (
          <Labeled label="Gender">
            <select value={item.gender} onChange={e => upd('gender', e.target.value)} style={control}>{GENDERS.map(g => <option key={g}>{g}</option>)}</select>
          </Labeled>
        )}

        {!isHF && (
          <Labeled label={isJew ? 'Material Type' : 'Material'}>
            <select value={item.material || mats[0]} onChange={e => upd('material', e.target.value)} style={control}>{mats.map(m => <option key={m}>{m}</option>)}</select>
          </Labeled>
        )}

        {isApparel && (
          <Labeled label="Technique">
            <select value={item.technique} onChange={e => upd('technique', e.target.value)} style={control}>{TECHNIQUES.map(t => <option key={t}>{t}</option>)}</select>
          </Labeled>
        )}

        {!isDesigning && (
          <Labeled label="Wt/pc (kg)">
            <input type="number" min="0" step="0.01" value={item.weight_per_pc} onChange={e => upd('weight_per_pc', e.target.value)} placeholder="0.00" style={control} />
          </Labeled>
        )}

        <Labeled label="Qty">
          <input type="number" min="1" value={item.qty} onChange={e => upd('qty', e.target.value)} placeholder="0" style={control} />
        </Labeled>

        <Labeled label={costLabel}>
          <input type="number" min="0" value={item.cost_per_pc_inr} onChange={e => upd('cost_per_pc_inr', e.target.value)} placeholder="0" style={control} />
        </Labeled>

        {!isDesigning && (
          <Labeled label="GST">
            <select value={item.gst_rate} onChange={e => upd('gst_rate', e.target.value)} style={control}>
              {GST_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Labeled>
        )}

        {isSampling && (
          <Labeled label="Decl. val ($)">
            <input type="number" min="0" step="0.01" value={item.declared_value_usd} onChange={e => upd('declared_value_usd', e.target.value)} placeholder="0" style={control} />
          </Labeled>
        )}
      </div>
    </div>
  );
}

export default function LineItemCards({ items, onChange }) {
  const updOne = (next) => onChange(items.map(it => it._id === next._id ? next : it));
  const remove = (id)   => onChange(items.filter(it => it._id !== id));
  const add    = ()     => onChange([...items, mkItem()]);

  return (
    <div>
      {items.length === 0 && (
        <div style={{ textAlign: 'center', padding: '18px', color: 'var(--text4)', fontStyle: 'italic', fontSize: 12, border: '1px dashed var(--border)', borderRadius: 10, marginBottom: 12 }}>
          No items yet — add your first item below.
        </div>
      )}
      {items.map((it, i) => (
        <LineItemCard key={it._id} item={it} index={i} onChange={updOne} onRemove={remove} />
      ))}
      <button type="button" onClick={add} style={{ fontSize: 13, color: 'var(--gold)', background: 'var(--gold-dim)', border: '1px solid rgba(200,165,90,0.25)', borderRadius: 8, padding: '9px 18px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600 }}>
        + Add item
      </button>
    </div>
  );
}
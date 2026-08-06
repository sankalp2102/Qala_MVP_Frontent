import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectsAPI, adminAPI } from '../../api/client';
import {
  calcLandingCost, fetchForex, sanitizeForex,
  fmtUSD, fmtINR, fmtPct,
} from '../../utils/calculator';
import LineItemCards, { normalizeItems, summarize } from '../../components/proposals/LineItemCards';

// src/components/projects/BriefForm.jsx
// Shared brief edit form used by buyer (ProjectDetail) and admin (AdminProjectDetail).

const CURRENCIES = ['USD','EUR','GBP','INR','AED','SGD'];

function BriefForm({ projectId, brief, isAdmin, onSaved }) {
  const [form, setForm]   = useState({
    buyer_brand_name:           brief?.buyer_brand_name            || '',
    buyer_location:             brief?.buyer_location              || '',
    product_category:           brief?.product_category            || '',
    product_description:        brief?.product_description         || '',
    materials_keywords:         brief?.materials_keywords          || [],
    bulk_quantity:              brief?.bulk_quantity               || '',
    budget_currency:            brief?.budget_currency             || 'USD',
    target_landing_price_usd:   brief?.target_landing_price_usd   || '',
    target_sample_delivery_date: brief?.target_sample_delivery_date || '',
    target_bulk_delivery_date:   brief?.target_bulk_delivery_date  || '',
    additional_specs:           brief?.additional_specs            || '',
  });
  const [kwInput, setKwInput] = useState('');
  const [saving, setSaving]   = useState(false);
  const [errors, setErrors]   = useState({});

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: false })); };

  const addKeyword = () => {
    const kw = kwInput.trim();
    if (!kw || form.materials_keywords.includes(kw)) return;
    set('materials_keywords', [...form.materials_keywords, kw]);
    setKwInput('');
  };
  const removeKeyword = kw => set('materials_keywords', form.materials_keywords.filter(k => k !== kw));

  // All fields below are required. Reference link + attachments (elsewhere) are optional.
  const REQUIRED = [
    'buyer_brand_name', 'buyer_location', 'product_category', 'product_description',
    'bulk_quantity', 'budget_currency', 'target_landing_price_usd',
    'target_sample_delivery_date', 'target_bulk_delivery_date', 'additional_specs',
  ];
  const validate = () => {
    const e = {};
    REQUIRED.forEach(k => { if (!String(form[k] ?? '').trim()) e[k] = true; });
    if (!form.materials_keywords.length) e.materials_keywords = true;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        bulk_quantity:   form.bulk_quantity   ? parseInt(form.bulk_quantity)   : null,
        target_landing_price_usd:   form.target_landing_price_usd   || null,
        target_sample_delivery_date: form.target_sample_delivery_date || null,
        target_bulk_delivery_date:   form.target_bulk_delivery_date   || null,
      };
      if (isAdmin) {
        await projectsAPI.adminUpdateBrief(projectId, payload);
      } else {
        await projectsAPI.updateBrief(projectId, payload);
      }
      onSaved();
    } catch {} finally { setSaving(false); }
  };

  const inp = { fontSize: 13 };
  const inpErr = k => (errors[k] ? { ...inp, borderColor: 'var(--red)' } : inp);
  const sel = { width: '100%', padding: '9px 12px', borderRadius: 'var(--r-8)', border: '1px solid var(--border)', background: 'var(--surface2)', fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--text)' };
  const req = <span style={{ color: 'var(--red)' }}> *</span>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

      {/* Buyer / brand */}
      <div className="field">
        <label style={{ fontSize: 11 }}>Buyer Name{req}</label>
        <input value={form.buyer_brand_name} onChange={e => set('buyer_brand_name', e.target.value)} placeholder="Maison Éclat" style={inpErr('buyer_brand_name')} />
      </div>
      <div className="field">
        <label style={{ fontSize: 11 }}>Location (City, Country){req}</label>
        <input value={form.buyer_location} onChange={e => set('buyer_location', e.target.value)} placeholder="Paris, France" style={inpErr('buyer_location')} />
      </div>

      {/* Product */}
      <div className="field">
        <label style={{ fontSize: 11 }}>Product Type{req}</label>
        <input value={form.product_category} onChange={e => set('product_category', e.target.value)} placeholder="Women's RTW · 5 pieces" style={inpErr('product_category')} />
      </div>
      <div className="field" style={{ gridColumn: '1 / -1' }}>
        <label style={{ fontSize: 11 }}>Product Description{req}</label>
        <textarea rows={3} value={form.product_description} onChange={e => set('product_description', e.target.value)}
          placeholder="A 5-piece linen collection for summer — kurta, wide-leg trousers, jacket…"
          style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--r-8)', border: `1px solid ${errors.product_description ? 'var(--red)' : 'var(--border)'}`, background: 'var(--surface2)', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text)', resize: 'vertical' }} />
      </div>

      {/* Materials keywords */}
      <div style={{ gridColumn: '1 / -1' }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: errors.materials_keywords ? 'var(--red)' : 'var(--text3)', display: 'block', marginBottom: 6 }}>Materials / Keywords{req}</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {form.materials_keywords.map(kw => (
            <span key={kw} style={{ fontSize: 12, padding: '3px 10px', background: 'var(--surface3)', borderRadius: 'var(--r-20)', color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 6 }}>
              {kw}
              <button onClick={() => removeKeyword(kw)} style={{ background: 'none', border: 'none', color: 'var(--text4)', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={kwInput} onChange={e => setKwInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addKeyword()}
            placeholder="e.g. 100% Linen, Natural dyes, Handblock print — press Enter to add"
            style={{ flex: 1, padding: '7px 10px', borderRadius: 'var(--r)', border: `1px solid ${errors.materials_keywords ? 'var(--red)' : 'var(--border)'}`, background: 'var(--surface2)', fontSize: 12, fontFamily: 'var(--font-body)', color: 'var(--text)' }} />
          <button onClick={addKeyword} className="btn btn-ghost" style={{ fontSize: 12, padding: '7px 12px', width: 'auto', flexShrink: 0 }}>Add</button>
        </div>
      </div>

      {/* Quantity */}
      <div className="field">
        <label style={{ fontSize: 11 }}>Bulk Quantity (sets){req}</label>
        <input type="number" value={form.bulk_quantity} onChange={e => set('bulk_quantity', e.target.value)} placeholder="100" min="0" style={inpErr('bulk_quantity')} />
      </div>
      <div className="field">
        <label style={{ fontSize: 11 }}>Buyer Currency{req}</label>
        <select value={form.budget_currency} onChange={e => set('budget_currency', e.target.value)} style={errors.budget_currency ? { ...sel, borderColor: 'var(--red)' } : sel}>
          {CURRENCIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Target landing price */}
      <div className="field">
        <label style={{ fontSize: 11 }}>Target Landing Price{req}</label>
        <input type="number" value={form.target_landing_price_usd} onChange={e => set('target_landing_price_usd', e.target.value)} placeholder="519" style={inpErr('target_landing_price_usd')} />
      </div>

      {/* Delivery dates */}
      <div className="field">
        <label style={{ fontSize: 11 }}>Target Sample Delivery Date{req}</label>
        <input type="date" value={form.target_sample_delivery_date} onChange={e => set('target_sample_delivery_date', e.target.value)} style={inpErr('target_sample_delivery_date')} />
      </div>
      <div className="field">
        <label style={{ fontSize: 11 }}>Target Bulk Delivery Date{req}</label>
        <input type="date" value={form.target_bulk_delivery_date} onChange={e => set('target_bulk_delivery_date', e.target.value)} style={inpErr('target_bulk_delivery_date')} />
      </div>

      {/* Additional specs */}
      <div className="field" style={{ gridColumn: '1 / -1' }}>
        <label style={{ fontSize: 11 }}>Additional Notes{req}</label>
        <textarea rows={3} value={form.additional_specs} onChange={e => set('additional_specs', e.target.value)}
          placeholder="Open to studio's creative direction. Minimal packaging preferred…"
          style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--r-8)', border: `1px solid ${errors.additional_specs ? 'var(--red)' : 'var(--border)'}`, background: 'var(--surface2)', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text)', resize: 'vertical' }} />
      </div>

      {/* Actions */}
      <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10, alignItems: 'center' }}>
        <button onClick={save} disabled={saving} className="btn btn-primary" style={{ fontSize: 13 }}>
          {saving ? 'Saving…' : 'Save Brief'}
        </button>
        {Object.keys(errors).some(k => errors[k]) && (
          <span style={{ fontSize: 12, color: 'var(--red)' }}>Please fill all required fields.</span>
        )}
      </div>
    </div>
  );
}


function fmt(iso) {
  return iso ? new Date(iso).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : '—';
}

function TabBtn({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '9px 18px', border: 'none',
      borderBottom: active ? '2px solid var(--gold)' : '2px solid transparent',
      background: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)',
      fontSize: 13, fontWeight: active ? 600 : 400,
      color: active ? 'var(--gold)' : 'var(--text3)',
      transition: 'all 0.15s', marginBottom: -1,
    }}>{label}</button>
  );
}

// ── Brief Tab ─────────────────────────────────────────────────────────────────
function BriefTab({ project, onRefresh }) {
  const [editing, setEditing] = useState(false);

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '24px 28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>Brief</div>
        {!editing && (
          <button onClick={() => setEditing(true)} className="btn btn-ghost" style={{ fontSize: 12, width: 'auto' }}>Edit Brief</button>
        )}
      </div>

      {editing ? (
        <BriefForm
          projectId={project.id}
          brief={project.brief}
          isAdmin
          onSaved={() => { setEditing(false); onRefresh(); }}
        />
      ) : (
        <BriefDisplay brief={project.brief || {}} />
      )}
    </div>
  );
}

function BriefDisplay({ brief }) {
  const rows = [
    ['Buyer',           brief.buyer_brand_name || '—'],
    ['Location',        brief.buyer_location   || '—'],
    ['Product Type',    brief.product_category  || '—'],
    ['Bulk qty',        brief.bulk_quantity    ? `${brief.bulk_quantity} sets`  : '—'],
    ['Buyer currency',  brief.budget_currency  || '—'],
    ['Target landing',  brief.target_landing_price_usd ? `$${parseFloat(brief.target_landing_price_usd).toLocaleString()}` : '—'],
    ['Sample delivery', fmt(brief.target_sample_delivery_date)],
    ['Bulk delivery',   fmt(brief.target_bulk_delivery_date)],
  ];
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        {rows.map(([l, v]) => (
          <div key={l}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>{l}</div>
            <div style={{ fontSize: 13, color: 'var(--text)' }}>{v}</div>
          </div>
        ))}
      </div>
      {brief.materials_keywords?.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Materials / Keywords</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {brief.materials_keywords.map(k => <span key={k} style={{ fontSize: 11, padding: '3px 9px', background: 'var(--surface3)', borderRadius: 'var(--r-20)', color: 'var(--text2)' }}>{k}</span>)}
          </div>
        </div>
      )}
      {brief.product_description && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Product Description</div>
          <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.65 }}>{brief.product_description}</div>
        </div>
      )}
      {brief.additional_specs && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Additional Notes</div>
          <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.65 }}>{brief.additional_specs}</div>
        </div>
      )}
    </div>
  );
}

// ── Proposal Review Tab ───────────────────────────────────────────────────────
function ProposalReviewPanel({ proposal, projectId, brief, onRefresh, onClose }) {
  const [reviewTab, setReviewTab] = useState('costing');
  const [actionError, setActionError] = useState(null);
  const errorBannerRef = useRef(null);

  useEffect(() => {
    if (actionError && errorBannerRef.current) {
      // The step right before this (saveChanges' onRefresh) re-fetches and
      // re-renders the whole project, which can shift scroll position away
      // from the actions section — the error was confirmed to be set
      // correctly in state, it just wasn't visible without scrolling.
      errorBannerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [actionError]);

  // Two different error shapes exist across the backend: some endpoints
  // return {status:'error', message:'...'} (a plain string), others
  // return {status:'error', errors:{field: ['msg', ...]}} (raw DRF
  // serializer validation errors, e.g. AdminProposalDetailView.patch()).
  // Checking only .message meant the second shape silently fell through
  // to a generic fallback with no indication of which field was wrong.
  const extractError = (e, fallback) => {
    const data = e?.response?.data;
    if (!data) return fallback;
    if (data.message) return data.message;
    if (data.errors && typeof data.errors === 'object') {
      const parts = Object.entries(data.errors).map(([field, msgs]) =>
        `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`
      );
      if (parts.length) return parts.join(' · ');
    }
    return fallback;
  };
  // Forex: the studio's saved rate is the only source of truth once a
  // proposal has one — no live-fetch code path may ever override it. The
  // previous approach (useState seeded once + a mount-effect guarded by
  // an if-check) relied on effect-timing to protect the saved value; the
  // diagnostic below caught it silently failing to do so in practice
  // (admin recalculating against a different day's live rate than what
  // the studio actually submitted with). This version has no path that
  // can touch forex if proposal.forex_rate_usd_inr is present — it's a
  // plain derived read, not state that anything can later overwrite.
  const savedForex = proposal.forex_rate_usd_inr ? sanitizeForex(proposal.forex_rate_usd_inr) : null;
  const [liveForex, setLiveForex] = useState(null);
  const forex = savedForex ?? liveForex ?? 91.62;
  useEffect(() => {
    if (!savedForex) fetchForex().then(setLiveForex);
  }, [savedForex]);
  const [lcCurrency, setLcCurrency] = useState('usd');
  const [pfPct,     setPfPct]     = useState(parseFloat(proposal.platform_fee_pct) || 0.15);
  // Per-phase rates — the backend has carried platform_fee_design_pct /
  // _sampling_pct / _production_pct since early on, but no UI ever read or
  // wrote them; the admin panel only ever had one flat slider. Matches the
  // prototype's 3-slider Platform Fee card.
  const [pfPctDesign,     setPfPctDesign]     = useState(parseFloat(proposal.platform_fee_design_pct) || 0.04);
  const [pfPctSampling,   setPfPctSampling]   = useState(parseFloat(proposal.platform_fee_sampling_pct) || 0.10);
  const [pfPctProduction, setPfPctProduction] = useState(parseFloat(proposal.platform_fee_production_pct) || 0.15);
  const _legacyType   = proposal.order_type    && proposal.order_type    !== 'mixed' ? proposal.order_type    : 'production';
  const _legacyDomain = proposal.product_domain && proposal.product_domain !== 'mixed' ? proposal.product_domain : 'apparel';
  const [lineItems, setLineItems] = useState(() => normalizeItems(proposal.line_items, _legacyType, _legacyDomain));
  const [boxes,     setBoxes]     = useState(proposal.boxes || []);
  const [orderType] = useState(_legacyType);
  const [domain]    = useState(_legacyDomain);
  const [shipping,  setShipping]  = useState(proposal.shipping_method || 'dhl');
  const [designDate, setDesignDate] = useState(proposal.design_handover_date || '');
  const [sampleDate, setSampleDate] = useState(proposal.sample_dispatch_date || '');
  const [bulkDate,   setBulkDate]   = useState(proposal.bulk_dispatch_date   || '');
  const [sowClauses, setSowClauses] = useState(proposal.sow_clauses || []);
  const [validUntil, setValidUntil] = useState(proposal.valid_until || '');
  const [adminNotes, setAdminNotes] = useState(proposal.admin_notes || '');
  const [revMsg,     setRevMsg]     = useState('');
  const [saving,     setSaving]     = useState(false);
  const [sending,    setSending]    = useState(false);
  const [revising,   setRevising]   = useState(false);
  const [showRevForm, setShowRevForm] = useState(false);
  // Live "can this actually be sent" state — fed by MilestonesEditor's
  // onChange, so the Actions card can show real ✓/✗ status instead of
  // admin only finding out why it failed after clicking Approve & send.
  const [milestonesSnapshot, setMilestonesSnapshot] = useState(null); // null = not loaded yet
  const m1 = milestonesSnapshot?.find(m => m.phase === 'design') || null;
  const m1Ready = !!(m1 && m1.payment_link_url);
  const validUntilReady = !!validUntil;
  const [firstPayLink, setFirstPayLink] = useState('');
  const [savingLink, setSavingLink] = useState(false);
  useEffect(() => { if (m1 && firstPayLink === '') setFirstPayLink(m1.payment_link_url || ''); }, [m1]);
  const saveFirstPayLink = async () => {
    if (!m1) return;
    setSavingLink(true);
    try {
      await projectsAPI.adminUpdateMilestone(projectId, proposal.id, m1.id, { payment_link_url: firstPayLink });
      setMilestonesSnapshot(ms => ms.map(m => m.id === m1.id ? { ...m, payment_link_url: firstPayLink } : m));
    } catch {} finally { setSavingLink(false); }
  };

  const numItems = lineItems.map(it => ({
    ...it,
    qty:             parseFloat(it.qty)              || 0,
    cost_per_pc_inr: parseFloat(it.cost_per_pc_inr)  || 0,
    weight_per_pc:   parseFloat(it.weight_per_pc)    || 0,
    declared_value_usd: parseFloat(it.declared_value_usd) || 0,
  }));
  const numBoxes = boxes.map(b => ({
    ...b, length_cm: parseFloat(b.length_cm)||0, width_cm: parseFloat(b.width_cm)||0,
    height_cm: parseFloat(b.height_cm)||0, qty: parseInt(b.qty)||1,
  }));
  const result = calcLandingCost({
    lineItems: numItems, boxes: numBoxes, domain, orderType, shipping, forex, pfPct, advancePct: 0.5,
    pfPctByPhase: { designing: pfPctDesign, sampling: pfPctSampling, production: pfPctProduction },
  });

  const hasShippable = lineItems.some(it => it._configured && it.order_type && it.order_type !== 'designing');

  const inp = (w) => ({ padding:'5px 7px',borderRadius: 'var(--r)',border:'1px solid var(--border)',background:'var(--surface3)',fontSize:11,color:'var(--text)',fontFamily:'var(--font-body)',width:w });
  const togBtn = (val, cur) => ({
    padding:'5px 12px',borderRadius: 'var(--r)',border:'1px solid var(--border)',fontSize:12,cursor:'pointer',fontFamily:'var(--font-body)',transition:'all 0.15s',
    background: cur === val ? 'var(--gold)' : 'var(--surface2)',
    color:      cur === val ? '#fff' : 'var(--text2)',
  });

  // Same fix ProposalBuilder.jsx (seller side) already had — DecimalField's
  // max_digits counts ALL significant digits, both sides of the decimal
  // combined. Sending a raw JS float like 12122.260060052451 (5 digits +
  // 12 decimal-place digits = 17 total) fails max_digits=12 even though
  // the actual dollar amount is nowhere near that large — it's floating
  // point noise, not magnitude. Round before sending, same as the seller side.
  const r2 = (v) => v != null ? Math.round(v * 100) / 100 : null;

  const saveChanges = async () => {
    setSaving(true);
    setActionError(null);
    try {
      await projectsAPI.adminUpdateProposal(projectId, proposal.id, {
        order_type: summarize(lineItems, 'order_type', orderType), product_domain: summarize(lineItems, 'product_domain', domain), shipping_method: shipping,
        line_items: lineItems, boxes,
        forex_rate_usd_inr: forex,
        platform_fee_pct: pfPct,
        platform_fee_design_pct: pfPctDesign,
        platform_fee_sampling_pct: pfPctSampling,
        platform_fee_production_pct: pfPctProduction,
        calculated_landing_cost_usd: result.hasItems ? r2(result.landingCostUSD) : null,
        studio_payout_inr: result.hasItems ? r2(result.payoutTotalINR) : null,
        studio_payout_base_inr: result.hasItems ? r2(result.payoutBaseINR) : null,
        studio_payout_gst_inr: result.hasItems ? r2(result.payoutGSTINR) : null,
        design_handover_date: designDate || null,
        sample_dispatch_date: sampleDate || null,
        bulk_dispatch_date:   bulkDate   || null,
        sow_clauses: sowClauses,
        admin_notes: adminNotes,
        valid_until: validUntil || null,
      });
      // Refreshes the underlying project data (so this panel and the
      // proposals list reflect what was just saved) WITHOUT closing the
      // panel — previously onRefresh() did both at once, which is why
      // "Save changes (stay in review)" didn't actually stay in review.
      onRefresh();
      return true;
    } catch (e) {
      setActionError(extractError(e, 'Could not save changes — check your connection and try again.'));
      return false;
    } finally { setSaving(false); }
  };

  const approve = async () => {
    if (sending) return; // guards against a double-click firing two overlapping requests
    if (!window.confirm('Approve and send this proposal to the buyer?')) return;
    setSending(true);
    setActionError(null);
    const saved_ok = await saveChanges();
    if (!saved_ok) { setSending(false); return; } // saveChanges already surfaced its own error
    try {
      await projectsAPI.adminSendProposal(projectId, proposal.id);
      // Only close the panel once the actual send genuinely succeeded —
      // previously saveChanges() closed it as a side effect BEFORE this
      // call even ran, so a failed send here (e.g. missing valid_until or
      // the Milestone-1 payment link — see AdminProposalSendToBuyerView's
      // validation) was invisible: the panel had already vanished and the
      // error was swallowed with nothing shown.
      onClose();
    } catch (e) {
      const msg = extractError(e, 'Could not send to buyer — check Milestones for a valid-until date, a Design-phase payment link, and that each phase\'s milestones total exactly 100%.');
      setActionError(msg);
      // Belt-and-suspenders: also alert() the exact message. The on-page
      // banner should show this too, but if it's ever not visible for any
      // reason, this guarantees the actual reason isn't lost.
      alert(msg);
    } finally { setSending(false); }
  };

  const requestRevision = async () => {
    if (!revMsg.trim()) return;
    setRevising(true);
    setActionError(null);
    try {
      await projectsAPI.adminRequestRevision(projectId, proposal.id, { revision_message: revMsg });
      onClose();
    } catch (e) {
      setActionError(extractError(e, 'Could not send the revision request — try again.'));
    } finally { setRevising(false); }
  };

  const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : '—';

  const targetUSD = brief?.target_landing_price_usd ? parseFloat(brief.target_landing_price_usd) : null;

  return (
    <div>
      {/* Brief strip — quick-reference chips matching the prototype's
         navbar-adjacent strip. Was missing entirely before. */}
      <div style={{ background: 'var(--admin, var(--purple))', borderRadius: 'var(--r-10)', padding: '12px 18px', marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
        {[
          ['Project', proposal.project_name || brief?.project?.name],
          ['Buyer', brief?.buyer_brand_name],
          ['Studio', proposal.studio_name],
          ['Target price', targetUSD ? fmtUSD(targetUSD) : null],
          ['Bulk delivery', fmtDate(brief?.target_bulk_delivery_date)],
        ].map(([l, v]) => (
          <div key={l}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.10em', textTransform: 'uppercase', color: 'rgba(255,255,255,.55)', marginBottom: 3 }}>{l}</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>{v || '—'}</div>
          </div>
        ))}
      </div>

      {/* Status banner — matches the prototype's color-coded states (spec §6.1) */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, borderRadius: 'var(--r-10)', padding: '12px 16px', marginBottom: 16,
        background: proposal.status === 'sent_to_buyer' ? 'var(--green-dim)' : proposal.status === 'accepted' ? 'var(--green-dim)' : 'var(--amber-dim)',
        border: `1px solid ${['sent_to_buyer','accepted'].includes(proposal.status) ? 'var(--green)' : 'var(--amber)'}`,
      }}>
        <span style={{
          width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
          background: ['sent_to_buyer','accepted'].includes(proposal.status) ? 'var(--green)' : 'var(--amber)',
        }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: ['sent_to_buyer','accepted'].includes(proposal.status) ? 'var(--green)' : 'var(--amber)' }}>
            {proposal.status === 'sent_to_buyer' ? 'Sent to buyer — awaiting response'
              : proposal.status === 'accepted' ? 'Accepted by buyer'
              : proposal.status === 'declined' ? 'Declined by buyer'
              : proposal.status === 'revision_req' ? 'Revision requested — awaiting studio'
              : 'Proposal under review'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>
            {proposal.status === 'sent_to_buyer' ? 'Buyer has been emailed — check the live feed below for their response.'
              : proposal.status === 'accepted' ? 'Project has moved to In Production.'
              : 'Studio submitted · Review before sending to buyer'}
          </div>
        </div>
        <span style={{ fontSize: 11, color: 'var(--text4)' }}>Submitted {fmtDate(proposal.submitted_at)}</span>
      </div>

      <div style={{ display:'grid',gridTemplateColumns:'minmax(0,1fr) 340px',gap:24,alignItems:'start' }}>
        <div>

      {/* Buyer's Brief — full card, matching qala-admin-proposal.html exactly.
         The previous version here only showed 7 basic fields (no gender,
         occasion, product types, fabrics/printing/surface-work/dyes tags,
         references, buyer notes, or the Qala-guidance box) — genuinely
         missing most of the prototype's actual content, not just styled
         differently. */}
      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--r-10)', marginBottom: 16, overflow: 'hidden' }}>
        <div style={{ padding: '13px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600 }}>Buyer's brief</span>
          <span style={{ fontSize: 11, background: 'var(--surface2)', color: 'var(--text3)', borderRadius: 'var(--r-full)', padding: '3px 10px' }}>Read-only · from project creation</span>
        </div>
        <div style={{ padding: '16px 18px' }}>
          <div style={{ marginBottom: 13, paddingBottom: 13, borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
              {[
                ['Project type', brief?.project_type],
                ['Gender', brief?.gender],
                ['Est. qty', brief?.bulk_quantity ? `${brief.bulk_quantity}` : null],
                ['Target price', brief?.target_landing_price_local ? `${brief.target_landing_currency || ''} ${brief.target_landing_price_local}` : (targetUSD ? fmtUSD(targetUSD) : null)],
                ['Bulk delivery', fmtDate(brief?.target_bulk_delivery_date)],
                ['Delivery location', brief?.buyer_location],
              ].map(([l, v]) => (
                <div key={l} style={{ background: 'var(--surface)', borderRadius: 'var(--r-8)', padding: '9px 11px' }}>
                  <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text4)', marginBottom: 2 }}>{l}</div>
                  <div style={{ fontSize: 13, color: 'var(--text)' }}>{v || '—'}</div>
                </div>
              ))}
              <div style={{ gridColumn: 'span 2', background: 'var(--surface)', borderRadius: 'var(--r-8)', padding: '9px 11px' }}>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text4)', marginBottom: 2 }}>Price basis</div>
                <div style={{ fontSize: 13, color: 'var(--text)' }}>All-in landed cost{brief?.garment_types?.[0] ? ` · per ${brief.garment_types[0].toLowerCase()}` : ''}</div>
              </div>
            </div>
          </div>

          {(brief?.occasion_tags || []).length > 0 && (
            <div style={{ marginBottom: 13, paddingBottom: 13, borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.10em', color: 'var(--text4)', marginBottom: 6, display: 'block' }}>Occasion</span>
              <div>{brief.occasion_tags.map(t => <span key={t} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 'var(--r-full)', background: 'var(--gold-dim)', color: 'var(--gold-d, var(--gold))', border: '1px solid var(--gold-l)', marginRight: 4, display: 'inline-block' }}>{t}</span>)}</div>
            </div>
          )}
          {(brief?.garment_types || []).length > 0 && (
            <div style={{ marginBottom: 13, paddingBottom: 13, borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.10em', color: 'var(--text4)', marginBottom: 6, display: 'block' }}>Product / garment types</span>
              <div>{brief.garment_types.map(t => <span key={t} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 'var(--r-full)', background: 'var(--gold-dim)', color: 'var(--gold-d, var(--gold))', border: '1px solid var(--gold-l)', marginRight: 4, display: 'inline-block' }}>{t}</span>)}</div>
            </div>
          )}
          <div style={{ marginBottom: 13, paddingBottom: 13, borderBottom: '1px solid var(--border)' }}>
            {(brief?.preferred_fabrics || []).length > 0 && <><span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.10em', color: 'var(--text4)', marginBottom: 6, display: 'block' }}>Fabrics</span><div style={{ marginBottom: 9 }}>{brief.preferred_fabrics.map(t => <span key={t} style={{ fontSize: 11, padding: '2px 8px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r-full)', color: 'var(--text2)', marginRight: 4, display: 'inline-block' }}>{t}</span>)}</div></>}
            {(brief?.printing_required || []).length > 0 && <><span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.10em', color: 'var(--text4)', marginBottom: 6, display: 'block' }}>Printing & dyeing</span><div style={{ marginBottom: 9 }}>{brief.printing_required.map(t => <span key={t} style={{ fontSize: 11, padding: '2px 8px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r-full)', color: 'var(--text2)', marginRight: 4, display: 'inline-block' }}>{t}</span>)}</div></>}
            {(brief?.embellishment_required || []).length > 0 && <><span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.10em', color: 'var(--text4)', marginBottom: 6, display: 'block' }}>Surface work</span><div style={{ marginBottom: 9 }}>{brief.embellishment_required.map(t => <span key={t} style={{ fontSize: 11, padding: '2px 8px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r-full)', color: 'var(--text2)', marginRight: 4, display: 'inline-block' }}>{t}</span>)}</div></>}
            {(brief?.preferred_dyes || []).length > 0 && <><span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.10em', color: 'var(--text4)', marginBottom: 6, display: 'block' }}>Dyes</span><div>{brief.preferred_dyes.map(t => <span key={t} style={{ fontSize: 11, padding: '2px 8px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r-full)', color: 'var(--text2)', marginRight: 4, display: 'inline-block' }}>{t}</span>)}</div></>}
          </div>

          {(brief?.moodboards || []).length > 0 && (
            <div style={{ marginBottom: 13, paddingBottom: 13, borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.10em', color: 'var(--text4)', marginBottom: 6, display: 'block' }}>References</span>
              {brief.moodboards.map((m, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'var(--surface)', borderRadius: 'var(--r)', padding: '7px 10px', marginBottom: 5 }}>
                  <span style={{ fontSize: 16 }}>🖼</span><span style={{ fontSize: 12, fontWeight: 500, flex: 1 }}>{m.file_name || m.name}</span>
                  {m.file_size_kb && <span style={{ fontSize: 11, color: 'var(--text4)' }}>{m.file_size_kb < 1024 ? `${m.file_size_kb} KB` : `${(m.file_size_kb/1024).toFixed(1)} MB`}</span>}
                </div>
              ))}
            </div>
          )}
          {(brief?.additional_specs || brief?.product_description) && (
            <div style={{ marginBottom: brief?.admin_notes ? 13 : 0, paddingBottom: brief?.admin_notes ? 13 : 0, borderBottom: brief?.admin_notes ? '1px solid var(--border)' : 'none' }}>
              <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.10em', color: 'var(--text4)', marginBottom: 6, display: 'block' }}>Buyer notes</span>
              <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{brief.additional_specs || brief.product_description}</div>
            </div>
          )}
          {brief?.admin_notes && (
            <div style={{ background: 'var(--admin-dim)', border: '1px solid var(--admin-dim2)', borderRadius: 'var(--r-8)', padding: '10px 13px' }}>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--admin)', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 5 }}>
                🔒 Qala guidance <span style={{ fontSize: 10, fontWeight: 400, color: 'rgba(91,75,138,.6)', textTransform: 'none', letterSpacing: 0 }}>— visible to studio, not shared with buyer</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--admin)', lineHeight: 1.6 }}>{brief.admin_notes}</div>
            </div>
          )}
        </div>
      </div>

      {/* Studio submission — wrapped in its own card with a header, matching
         qala-admin-proposal.html's card pattern (this was previously just
         a loose tabs bar with no card/heading at all). Tabs now use the
         prototype's exact segmented-pill style (.stabs/.stab) instead of
         underline-tabs, which didn't match the prototype's design. */}
      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--r-10)', marginBottom: 16, overflow: 'hidden' }}>
        <div style={{ padding: '13px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600 }}>Studio submission</span>
          <span style={{ fontSize: 11, background: 'var(--amber-dim)', color: 'var(--amber)', borderRadius: 'var(--r-full)', padding: '3px 10px' }}>Under review</span>
        </div>
        <div style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 'var(--r)', overflow: 'hidden', background: 'var(--surface)', marginBottom: 16 }}>
            {[['costing','Costing & items'],['projects','Past work'],['timelines','Timelines'],['concept','Concept'],['sow','SOW clauses']].map(([key,label]) => (
              <button key={key} onClick={() => setReviewTab(key)} style={{
                flex: 1, padding:'7px 5px', border:'none', cursor:'pointer', fontFamily:'var(--font-body)', fontSize:12,
                fontWeight: reviewTab===key ? 600 : 400, textAlign: 'center', whiteSpace: 'nowrap',
                color: reviewTab===key ? 'var(--text)' : 'var(--text3)',
                background: reviewTab===key ? 'var(--bg)' : 'transparent',
                boxShadow: reviewTab===key ? '0 0 0 1px var(--border)' : 'none',
              }}>{label}</button>
            ))}
          </div>

          {reviewTab === 'costing' && (
            <div style={{ background:'var(--amber-dim)',border:'1px solid var(--amber)',borderRadius: 'var(--r-8)',padding:'10px 14px',fontSize:12,color:'var(--amber)',marginBottom:16 }}>
              🛡 You can edit any value before sending to buyer — items, costs, GST, shipping. All changes recalculate landing cost in real time. Studio's original figures are preserved internally.
            </div>
          )}

          {reviewTab === 'costing' && (
            <div>
              {/* Config — only shipping is global now */}
              <div style={{ background:'var(--surface)',border:'1px solid var(--border)',borderRadius: 'var(--r-10)',padding:'16px 18px',marginBottom:14 }}>
                <div style={{fontSize:10,fontWeight:700,color:'var(--text4)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:8}}>Shipping method</div>
                <div style={{display:'flex',gap:6}}>
                  {[['dhl','DHL Express'],['shipglobal','ShipGlobal']].map(([v,l]) => (
                    <button key={v} onClick={() => setShipping(v)} style={togBtn(v,shipping)}>{l}</button>
                  ))}
                </div>
                <div style={{marginTop:10,fontSize:11,color:'var(--text4)'}}>Order type and product domain are set per line item below.</div>
              </div>

              {/* Line items — per-item order type + domain */}
              <div style={{ background:'var(--surface)',border:'1px solid var(--border)',borderRadius: 'var(--r-10)',padding:'16px 18px',marginBottom:14 }}>
                <div style={{fontSize:12,fontWeight:600,color:'var(--text)',marginBottom:4}}>Line items (studio entered)</div>
                <div style={{fontSize:11,color:'var(--text4)',marginBottom:12}}>$1 = ₹{forex.toFixed(2)} (est.)</div>
                <LineItemCards items={lineItems} onChange={setLineItems} />
              </div>

              {/* Shipping boxes — only when any item ships */}
              {hasShippable && (
              <div style={{ background:'var(--surface)',border:'1px solid var(--border)',borderRadius: 'var(--r-10)',padding:'16px 18px',marginBottom:14 }}>
                <div style={{fontSize:12,fontWeight:600,color:'var(--text)',marginBottom:12}}>Shipping boxes (studio entered)</div>
                <div style={{display:'flex',gap:8,marginBottom:10,flexWrap:'wrap'}}>
                  {[{label:'M',length_cm:50,width_cm:40,height_cm:30},{label:'L',length_cm:60,width_cm:40,height_cm:40}].map(b => (
                    <button key={b.label} onClick={() => setBoxes(bx=>[...bx,{...b,_id:Date.now(),qty:1}])}
                      style={{fontSize:11,padding:'5px 10px',borderRadius: 'var(--r)',border:'1px solid var(--border)',background:'var(--surface2)',color:'var(--text2)',cursor:'pointer',fontFamily:'var(--font-body)'}}>
                      + {b.label} box ({b.length_cm}×{b.width_cm}×{b.height_cm})
                    </button>
                  ))}
                  <button onClick={() => setBoxes(bx=>[...bx,{_id:Date.now(),label:'Custom',length_cm:'',width_cm:'',height_cm:'',qty:1}])}
                    style={{fontSize:11,padding:'5px 10px',borderRadius: 'var(--r)',border:'1px dashed var(--border)',background:'none',color:'var(--text3)',cursor:'pointer',fontFamily:'var(--font-body)'}}>
                    + Custom
                  </button>
                </div>
                {boxes.length === 0 ? (
                  <div style={{fontSize:11,color:'var(--text4)',fontStyle:'italic'}}>No boxes added by studio.</div>
                ) : (
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                    <thead><tr style={{background:'var(--surface2)'}}>
                      {['Label','L','W','H','Vol.wt','Qty',''].map(h=><th key={h} style={{padding:'5px 6px',textAlign:'left',fontWeight:600,color:'var(--text3)',fontSize:10}}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {boxes.map((b,i) => {
                        const l=parseFloat(b.length_cm)||0,w=parseFloat(b.width_cm)||0,h=parseFloat(b.height_cm)||0;
                        return (
                          <tr key={b._id||i} style={{borderBottom:'1px solid var(--border)'}}>
                            <td style={{padding:'4px 6px'}}><input value={b.label} onChange={e => setBoxes(bx=>bx.map((x,xi)=>xi===i?{...x,label:e.target.value}:x))} style={inp(56)} /></td>
                            {['length_cm','width_cm','height_cm'].map(k => (
                              <td key={k} style={{padding:'4px 4px'}}><input type="number" value={b[k]} onChange={e => setBoxes(bx=>bx.map((x,xi)=>xi===i?{...x,[k]:e.target.value}:x))} style={inp(50)} /></td>
                            ))}
                            <td style={{padding:'4px 8px',color:'var(--text3)'}}>{l&&w&&h?(l*w*h/5000).toFixed(2)+' kg':'—'}</td>
                            <td style={{padding:'4px 4px'}}><input type="number" value={b.qty} onChange={e => setBoxes(bx=>bx.map((x,xi)=>xi===i?{...x,qty:Math.max(1,parseInt(e.target.value)||1)}:x))} style={inp(44)} /></td>
                            <td style={{padding:'4px 4px'}}><button onClick={() => setBoxes(bx=>bx.filter((_,xi)=>xi!==i))} style={{background:'none',border:'none',color:'var(--red)',cursor:'pointer',fontSize:16}}>×</button></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
              )}

            </div>
          )}

          {/* ── Timelines tab ── */}
          {reviewTab === 'projects' && (
            <div>
              {(proposal.past_projects || []).length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--text4)', fontStyle: 'italic' }}>No past work attached to this proposal.</div>
              ) : proposal.past_projects.map((coll, i) => {
                const pieces = coll.pieces || [];
                return (
                  <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-10)', marginBottom: 10, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', background: 'var(--surface)' }}>
                      <div style={{ position: 'relative', width: 60, height: 34, flexShrink: 0 }}>
                        {pieces.slice(0, 3).map((p, j) => (
                          <div key={j} style={{ position: 'absolute', width: 32, height: 32, borderRadius: 'var(--r)', background: p.image_url ? `url(${p.image_url}) center/cover` : 'var(--surface3)', border: '2px solid var(--surface)', left: j * 14, top: j === 0 ? 2 : j === 1 ? 1 : 0, zIndex: 3 - j }} />
                        ))}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{coll.name || coll.collection_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', margin: '2px 0 6px' }}>{pieces.length} piece{pieces.length !== 1 ? 's' : ''}{coll.year ? ` · ${coll.year}` : ''}</div>
                        {(coll.tags || []).length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>{coll.tags.map(t => <span key={t} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 'var(--r-full)', background: 'var(--gold-dim)', color: 'var(--gold-d, var(--gold))', border: '1px solid var(--gold-l)' }}>{t}</span>)}</div>}
                      </div>
                    </div>
                    <div style={{ padding: 14, borderTop: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text4)', marginBottom: 10, display: 'block' }}>Pieces in this collection</span>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px,1fr))', gap: 8, marginBottom: 14 }}>
                        {pieces.map((p, j) => (
                          <div key={j}>
                            <div style={{ width: '100%', aspectRatio: '1', borderRadius: 'var(--r-8)', background: p.image_url ? `url(${p.image_url}) center/cover` : 'var(--surface3)' }} />
                            <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                          </div>
                        ))}
                      </div>
                      {coll.note && (
                        <>
                          <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text4)', marginBottom: 8, display: 'block' }}>Studio note — why this is relevant</span>
                          <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.65, fontStyle: 'italic', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-8)', padding: '10px 14px' }}>"{coll.note}"</div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {reviewTab === 'timelines' && (
            <div>
              <div style={{fontSize:12,color:'var(--text4)',marginBottom:16}}>ℹ Dates entered by the studio (dispatch commits). You can edit these if corrections are needed. +10 days = estimated delivery shown to buyer.</div>
              {[
                ['Designing','Design handover date',designDate,setDesignDate],
                ['Sampling','Sample dispatch date',sampleDate,setSampleDate],
                ['Bulk production','Bulk dispatch date',bulkDate,setBulkDate],
              ].map(([section,label,val,setter]) => (
                <div key={section} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius: 'var(--r-10)',padding:'16px 18px',marginBottom:12}}>
                  <div style={{fontWeight:600,color:'var(--text)',marginBottom:12}}>{section}</div>
                  <div className="field">
                    <label style={{fontSize:12}}>{label}</label>
                    <input type="date" value={val} onChange={e=>setter(e.target.value)} style={{fontSize:13}} />
                  </div>
                  {val && <div style={{fontSize:11,color:'var(--teal)',marginTop:4}}>
                    Estimated delivery to buyer: {new Date(new Date(val).getTime()+10*86400000).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
                  </div>}
                </div>
              ))}
            </div>
          )}

          {/* ── Concept tab ── */}
          {reviewTab === 'concept' && (
            <div>
              {proposal.concept_pdf_url || proposal.concept_pdf_name ? (
                <div style={{display:'flex',alignItems:'center',gap:12,padding:'14px 18px',background:'var(--surface)',border:'1px solid var(--border)',borderRadius: 'var(--r-10)',marginBottom:16}}>
                  <span style={{fontSize:24}}>📄</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:500,color:'var(--text)'}}>{proposal.concept_pdf_name}</div>
                    <div style={{fontSize:11,color:'var(--text4)'}}>Uploaded by studio</div>
                  </div>
                  {proposal.concept_pdf_url && (
                    <a href={proposal.concept_pdf_url} target="_blank" rel="noopener noreferrer"
                      style={{fontSize:12,color:'var(--gold)',textDecoration:'none',padding:'6px 14px',background:'var(--gold-dim)',borderRadius: 'var(--r)',border:'1px solid rgba(200,165,90,0.2)'}}>
                      Preview
                    </a>
                  )}
                </div>
              ) : (
                <div style={{fontSize:12,color:'var(--text4)',fontStyle:'italic',marginBottom:16}}>No concept PDF uploaded.</div>
              )}

              {proposal.concept_title && (
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:10,fontWeight:700,color:'var(--text4)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:4}}>Concept title (studio entered)</div>
                  <div style={{fontSize:15,fontWeight:600,color:'var(--text)'}}>{proposal.concept_title}</div>
                </div>
              )}

              {proposal.concept_description && (
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:10,fontWeight:700,color:'var(--text4)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>Concept description</div>
                  <div style={{fontSize:13,color:'var(--text)',lineHeight:1.7,background:'var(--surface)',border:'1px solid var(--border)',borderRadius: 'var(--r-8)',padding:'12px 14px'}}>{proposal.concept_description}</div>
                </div>
              )}

              {proposal.past_projects?.length > 0 && (
                <div>
                  <div style={{fontSize:10,fontWeight:700,color:'var(--text4)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:10}}>Past projects linked by studio</div>
                  {proposal.past_projects.map((p,i) => (
                    <div key={i} style={{padding:'10px 14px',background:'var(--surface)',border:'1px solid var(--border)',borderRadius: 'var(--r-8)',marginBottom:8}}>
                      <div style={{fontSize:13,fontWeight:600,color:'var(--text)'}}>{p.name} {p.year && `· ${p.year}`}</div>
                      {p.description && <div style={{fontSize:12,color:'var(--text3)',marginTop:2}}>{p.description}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── SOW tab ── */}
          {reviewTab === 'sow' && (
            <div>
              <div style={{background:'var(--surface2)',borderRadius: 'var(--r-8)',padding:'12px 14px',marginBottom:16,fontSize:12,color:'var(--text3)'}}>
                📋 Standard Qala SOW is auto-included. Below are project-specific clauses from the studio. You may add, edit, or remove any clause before sending to buyer.
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:14}}>
                {sowClauses.length === 0 && <div style={{fontSize:12,color:'var(--text4)',fontStyle:'italic'}}>No project-specific clauses added.</div>}
                {sowClauses.map((clause,i) => (
                  <div key={i} style={{display:'flex',gap:8,alignItems:'flex-start'}}>
                    <textarea rows={2} value={clause} onChange={e=>setSowClauses(c=>c.map((x,xi)=>xi===i?e.target.value:x))}
                      style={{flex:1,padding:'9px 12px',borderRadius: 'var(--r-8)',border:'1px solid var(--border)',background:'var(--surface2)',fontFamily:'var(--font-body)',fontSize:13,color:'var(--text)',resize:'vertical'}} />
                    <button onClick={() => setSowClauses(c=>c.filter((_,xi)=>xi!==i))} style={{background:'none',border:'none',color:'var(--red)',cursor:'pointer',fontSize:18,paddingTop:6}}>×</button>
                  </div>
                ))}
              </div>
              <button onClick={() => setSowClauses(c=>[...c,''])} style={{fontSize:12,color:'var(--gold)',background:'var(--gold-dim)',border:'1px solid rgba(200,165,90,0.2)',borderRadius: 'var(--r)',padding:'6px 14px',cursor:'pointer',fontFamily:'var(--font-body)'}}>
                + Add
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Admin notes — 3rd card in the main column, matching the
         prototype's card-header/card-body pattern, right after Studio
         submission's tabs (not a page-wide footer below everything). */}
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--r-10)', marginTop: 16, overflow: 'hidden' }}>
            <div style={{ padding: '13px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600 }}>Admin notes</span>
              <span style={{ fontSize: 11, color: 'var(--text4)' }}>Internal only · never shared</span>
            </div>
            <div style={{ padding: '16px 18px' }}>
              <textarea rows={2} value={adminNotes} onChange={e=>setAdminNotes(e.target.value)}
                placeholder="Pricing concerns, anomalies, review comments…"
                style={{width:'100%',padding:'9px 12px',borderRadius: 'var(--r-8)',border:'1px solid var(--border)',background:'var(--surface2)',fontFamily:'var(--font-body)',fontSize:13,color:'var(--text)',resize:'vertical',boxSizing:'border-box',minHeight:72}} />
            </div>
          </div>

        </div>

        {/* ══ RIGHT SIDEBAR — matches qala-admin-proposal.html's side-col:
           Landing Cost / Platform Fee / Studio Payout / Payment Schedule /
           Actions as separate always-visible cards, not buried in tabs. ══ */}
        <div style={{ display:'flex', flexDirection:'column', gap:16, position:'sticky', top:80 }}>

          {/* Landing Cost */}
          <SideCard title="Landing cost" headerExtra={
            <div style={{ display: 'flex', border: '1px solid var(--border2)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
              <button onClick={() => setLcCurrency('usd')} style={{ padding: '3px 8px', fontSize: 10, border: 'none', cursor: 'pointer', background: lcCurrency === 'usd' ? 'var(--gold)' : 'var(--bg)', color: lcCurrency === 'usd' ? '#fff' : 'var(--text2)' }}>USD</button>
              <button onClick={() => setLcCurrency('inr')} style={{ padding: '3px 8px', fontSize: 10, border: 'none', borderLeft: '1px solid var(--border2)', cursor: 'pointer', background: lcCurrency === 'inr' ? 'var(--gold)' : 'var(--bg)', color: lcCurrency === 'inr' ? '#fff' : 'var(--text2)' }}>INR</button>
            </div>
          }>
            <div style={{background:'var(--surface2)',borderRadius: 'var(--r-10)',padding:'14px 16px',marginBottom:14,textAlign:'center'}}>
              <div style={{fontSize:10,fontWeight:700,color:'var(--text4)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>Buyer landing cost (total)</div>
              <div style={{fontFamily:'var(--font-display)',fontSize:26,fontWeight:700,color:'var(--text)'}}>
                {result.hasItems ? (lcCurrency === 'usd' ? fmtUSD(result.landingCostUSD) : fmtINR(result.landingCostUSD * forex)) : (lcCurrency === 'usd' ? '$—' : '₹—')}
              </div>
              {targetUSD && result.hasItems && (
                <div style={{fontSize:11,color:result.landingCostUSD>targetUSD?'var(--red)':'var(--green)',marginTop:4}}>
                  {result.landingCostUSD > targetUSD
                    ? `▲ ${fmtUSD(result.landingCostUSD - targetUSD)} above target`
                    : `▼ ${fmtUSD(targetUSD - result.landingCostUSD)} below target`}
                </div>
              )}
              {proposal.calculated_landing_cost_usd && result.hasItems && Math.abs(parseFloat(proposal.calculated_landing_cost_usd) - result.landingCostUSD) > 0.5 && (
                <div style={{ marginTop: 8, fontSize: 11, color: 'var(--red)', background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 'var(--r)', padding: '6px 9px', textAlign: 'left' }}>
                  ⚠ Studio submitted {fmtUSD(parseFloat(proposal.calculated_landing_cost_usd))} — this now recalculates to {fmtUSD(result.landingCostUSD)}. Forex at submission: {proposal.forex_rate_usd_inr ? `₹${parseFloat(proposal.forex_rate_usd_inr).toFixed(4)}` : '—'} · Forex used now: ₹{forex.toFixed(4)}.
                </div>
              )}
            </div>

            {!result.hasItems ? (
              <div style={{fontSize:11,color:'var(--text4)'}}>Add items in Costing to calculate.</div>
            ) : (
              <div style={{fontSize:12}}>
                <div style={{fontSize:10,fontWeight:700,color:'var(--text4)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:8}}>Cost build-up</div>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4,fontWeight:600,color:'var(--text2)'}}>
                  <span>Studio charges</span><span>{lcCurrency === 'usd' ? fmtUSD(result.totalProdUSD) : fmtINR(result.totalProdUSD * forex)}</span>
                </div>
                {[['designing','Design','var(--ph-d, var(--sage))'],['sampling','Sampling','var(--ph-s, var(--amber-d))'],['production','Production','var(--ph-p, var(--purple))']].map(([key,label,color]) => (
                  result.byPhase[key].prodUSD > 0 && (
                    <div key={key} style={{display:'flex',justifyContent:'space-between',marginBottom:3,paddingLeft:10,color}}>
                      <span>{label}</span><span>{lcCurrency === 'usd' ? fmtUSD(result.byPhase[key].prodUSD) : fmtINR(result.byPhase[key].prodUSD * forex)}</span>
                    </div>
                  )
                ))}
                <div style={{display:'flex',justifyContent:'space-between',marginTop:6,marginBottom:4,color:'var(--text3)'}}>
                  <span>Shipping · {shipping==='dhl'?'Express':'Economical'}</span><span style={{color:'var(--text)',fontWeight:500}}>{lcCurrency === 'usd' ? fmtUSD(result.shippingUSD) : fmtINR(result.shippingUSD * forex)}</span>
                </div>
                {!result.isSG && (
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:4,color:'var(--text3)'}}>
                    <span>Import duties</span><span style={{color:'var(--text)',fontWeight:500}}>{lcCurrency === 'usd' ? fmtUSD(result.totalDutyUSD) : fmtINR(result.totalDutyUSD * forex)}</span>
                  </div>
                )}
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4,color:'var(--text3)'}}>
                  <span>Platform services</span><span style={{color:'var(--text)',fontWeight:500}}>{lcCurrency === 'usd' ? fmtUSD(result.pfTotalFinal) : fmtINR(result.pfTotalFinal * forex)}</span>
                </div>
                {[['designing','Design',pfPctDesign,'var(--ph-d, var(--sage))'],['sampling','Sampling',pfPctSampling,'var(--ph-s, var(--amber-d))'],['production','Production',pfPctProduction,'var(--ph-p, var(--purple))']].map(([key,label,rate,color]) => (
                  result.byPhase[key].pfTotal > 0 && (
                    <div key={key} style={{display:'flex',justifyContent:'space-between',marginBottom:3,paddingLeft:10,color}}>
                      <span>{label} <span style={{color:'var(--text4)'}}>({fmtPct(rate)})</span></span><span>{lcCurrency === 'usd' ? fmtUSD(result.byPhase[key].pfTotal) : fmtINR(result.byPhase[key].pfTotal * forex)}</span>
                    </div>
                  )
                ))}
                <div style={{borderTop:'1px solid var(--border)',paddingTop:6,marginTop:6,display:'flex',justifyContent:'space-between',fontWeight:700,color:'var(--text)'}}>
                  <span>Landing cost</span><span>{lcCurrency === 'usd' ? fmtUSD(result.landingCostUSD) : fmtINR(result.landingCostUSD * forex)}</span>
                </div>
              </div>
            )}
            <div style={{marginTop:12,fontSize:10,color:'var(--text4)'}}>$1 = ₹{forex.toFixed(2)} (est.)</div>
          </SideCard>

          {/* Platform Fee — 3 independently editable phase rates (spec §6.4),
             replacing the single flat slider that used to be inside the
             Costing tab. Backend fields for this already existed
             (platform_fee_design/sampling/production_pct) — just never had
             a UI before. */}
          <SideCard title="Platform fee" badge="Per phase · editable">
            <div style={{fontSize:11,color:'var(--text3)',marginBottom:12,lineHeight:1.6}}>Standard rates apply. Override any phase — changes reflect in landing cost immediately.</div>
            {[
              ['Design', pfPctDesign, setPfPctDesign, 'var(--ph-d, var(--sage))'],
              ['Sampling', pfPctSampling, setPfPctSampling, 'var(--ph-s, var(--amber-d))'],
              ['Production', pfPctProduction, setPfPctProduction, 'var(--ph-p, var(--purple))'],
            ].map(([label, val, setVal, color]) => (
              <div key={label} style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                <div style={{display:'flex',alignItems:'center',gap:6,width:70,flexShrink:0}}>
                  <span style={{width:7,height:7,borderRadius:'50%',background:color}} />
                  <span style={{fontSize:11,fontWeight:600,color:'var(--text2)'}}>{label}</span>
                </div>
                <input type="range" min="0" max="15" step="0.5" value={val*100}
                  onChange={e=>setVal(parseFloat(e.target.value)/100)}
                  style={{flex:1,accentColor:color}} />
                <input type="number" min="0" max="30" step="0.5" value={Math.round(val*1000)/10}
                  onChange={e=>setVal((parseFloat(e.target.value)||0)/100)}
                  style={{width:48,fontSize:11,padding:'4px 6px',borderRadius: 'var(--r)',border:'1px solid var(--border)',background:'var(--surface2)',color:'var(--text)',fontFamily:'var(--font-body)'}} />
              </div>
            ))}
            <div style={{fontSize:10,color:'var(--text4)',marginTop:6}}>% applied to studio charges incl. GST · per phase</div>
          </SideCard>

          {/* Studio Payout */}
          <SideCard title="Studio payout" badge="INR · incl. GST">
            <div style={{background:'var(--surface2)',borderRadius: 'var(--r-10)',padding:'14px 16px',marginBottom:12,textAlign:'center'}}>
              <div style={{fontSize:10,fontWeight:700,color:'var(--text4)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:4}}>Total payout</div>
              <div style={{fontFamily:'var(--font-display)',fontSize:20,fontWeight:700,color:'var(--text)'}}>{fmtINR(result.payoutTotalINR)}</div>
              <div style={{fontSize:10,color:'var(--text4)',marginTop:2}}>Studio receives after Qala deducts platform fee</div>
            </div>
            {[['designing','Design','var(--ph-d, var(--sage))'],['sampling','Sampling','var(--ph-s, var(--amber-d))'],['production','Production','var(--ph-p, var(--purple))']].map(([key,label,color]) => (
              result.payoutByPhase[key] > 0 && (
                <div key={key} style={{display:'flex',justifyContent:'space-between',marginBottom:6,fontSize:12}}>
                  <span style={{color}}>{label}</span><span style={{fontWeight:600,color:'var(--text)'}}>{fmtINR(result.payoutByPhase[key])}</span>
                </div>
              )
            ))}
          </SideCard>

          {/* Payment Schedule — moved here from a tab so it's always visible,
             matching the prototype's side-col card. */}
          <SideCard title="Payment schedule" badge="Editable">
            <div style={{fontSize:11,color:'var(--text3)',marginBottom:12,lineHeight:1.6}}>Must total 100% per phase. Milestone 1 (Design) needs a payment link before this can be sent.</div>
            <MilestonesEditor projectId={projectId} proposalId={proposal.id} onChange={setMilestonesSnapshot} />
          </SideCard>

          {/* Actions — required fields clearly marked, live checklist so
             admin sees exactly why "Approve & send" would fail BEFORE
             clicking it, not after a 400 comes back. */}
          <SideCard title="Actions">
            <div style={{fontSize:12,color:'var(--text3)',marginBottom:12,lineHeight:1.6}}>
              Once approved, proposal is emailed to the buyer with the studio in CC.
            </div>

            <label style={{fontSize:11,fontWeight:600,color:'var(--text3)',marginBottom:5,display:'block'}}>
              Valid until <span style={{color:'var(--red)'}}>*</span> <span style={{fontWeight:400,color:'var(--text4)'}}>(required to send)</span>
            </label>
            <input type="date" value={validUntil} onChange={e=>setValidUntil(e.target.value)}
              style={{
                width:'100%',fontSize:12,padding:'7px 10px',borderRadius: 'var(--r)',
                border: `1px solid ${validUntilReady ? 'var(--border)' : 'var(--red)'}`,
                background:'var(--surface2)',color:'var(--text)',fontFamily:'var(--font-body)',
                marginBottom:14, boxSizing:'border-box',
              }} />

            <label style={{fontSize:11,fontWeight:600,color:'var(--text3)',marginBottom:5,display:'block'}}>
              First payment link <span style={{fontWeight:400,color:'var(--text4)'}}>(Design milestone)</span>
            </label>
            <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
              <input type="url" placeholder="https://pay.stripe.com/…" value={firstPayLink} onChange={e => setFirstPayLink(e.target.value)}
                style={{ flex: 1, fontSize: 12, padding: '7px 10px', borderRadius: 'var(--r)', border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', fontFamily: 'var(--font-body)', boxSizing: 'border-box' }} />
              <button onClick={saveFirstPayLink} disabled={savingLink || !m1} className="btn btn-ghost" style={{ fontSize: 11, padding: '0 12px', width: 'auto' }}>
                {savingLink ? '…' : 'Save'}
              </button>
            </div>
            <div style={{fontSize:10,color:'var(--text4)',marginBottom:14}}>Buyer sees a <strong>Pay now</strong> button after accepting.{m1 ? ` First milestone: ${fmtUSD((parseFloat(m1.percentage) || 0) / 100 * (result.byPhase?.designing?.subtotal || 0))}.` : ''}</div>

            {/* Pre-flight checklist — live, not discovered after a failed send */}
            <div style={{background:'var(--surface2)',borderRadius: 'var(--r-8)',padding:'10px 12px',marginBottom:14}}>
              <div style={{fontSize:10,fontWeight:700,color:'var(--text4)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>Before you can send</div>
              {[
                ['Valid until date set', validUntilReady],
                ['Design milestone has a payment link', milestonesSnapshot === null ? null : m1Ready],
                ['Each phase\'s milestones total 100%', milestonesSnapshot === null ? null : ['design','sampling','production'].every(ph => {
                  const items = milestonesSnapshot.filter(m => m.phase === ph);
                  if (items.length === 0) return true; // no items in this phase — nothing to validate
                  const total = items.reduce((s, m) => s + (parseFloat(m.percentage) || 0), 0);
                  return Math.abs(total - 100) < 0.01;
                })],
              ].map(([label, ok]) => (
                <div key={label} style={{display:'flex',alignItems:'center',gap:7,fontSize:12,marginBottom:4,color: ok===null?'var(--text4)':ok?'var(--green)':'var(--red)'}}>
                  <span>{ok===null?'…':ok?'✓':'✗'}</span><span>{label}</span>
                </div>
              ))}
            </div>

            {actionError && (
              <div ref={errorBannerRef} style={{background:'var(--red-dim)',border:'1px solid var(--red)',color:'var(--red)',borderRadius: 'var(--r-8)',padding:'10px 16px',fontSize:13,marginBottom:14}}>
                ⚠ {actionError}
              </div>
            )}

            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              <button onClick={saveChanges} disabled={saving} className="btn btn-ghost" style={{fontSize:13}}>
                {saving ? 'Saving…' : 'Save changes (stay in review)'}
              </button>
              {['submitted','under_review','revision_req'].includes(proposal.status) && (
                <>
                  <button onClick={approve} disabled={sending} className="btn btn-primary" style={{fontSize:13,background:'var(--green)'}}>
                    {sending ? 'Sending…' : '✓ Approve & send to buyer'}
                  </button>
                  <button onClick={() => setShowRevForm(!showRevForm)} className="btn btn-ghost" style={{fontSize:13,color:'var(--amber)'}}>
                    ↩ Request studio revision
                  </button>
                </>
              )}
            </div>

            {showRevForm && (
              <div style={{marginTop:14,background:'var(--surface)',border:'1px solid var(--amber)',borderRadius: 'var(--r-10)',padding:'16px 18px'}}>
                <div style={{fontSize:13,fontWeight:600,color:'var(--text)',marginBottom:10}}>Revision request message</div>
                <textarea rows={3} value={revMsg} onChange={e=>setRevMsg(e.target.value)}
                  placeholder="Explain what the studio needs to revise…"
                  style={{width:'100%',padding:'9px 12px',borderRadius: 'var(--r-8)',border:'1px solid var(--border)',background:'var(--surface2)',fontFamily:'var(--font-body)',fontSize:13,color:'var(--text)',resize:'vertical',marginBottom:10,boxSizing:'border-box'}} />
                <button onClick={requestRevision} disabled={revising||!revMsg.trim()} className="btn btn-primary" style={{fontSize:13,background:'var(--amber)'}}>
                  {revising ? 'Sending…' : 'Send revision request'}
                </button>
              </div>
            )}
          </SideCard>

          <BuyerActivityFeed projectId={projectId} proposalId={proposal.id} />

        </div>
      </div>
    </div>
  );
}

function SideCard({ title, badge, headerExtra, children }) {
  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius: 'var(--r-lg)', padding:'16px 18px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
        <span style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>{title}</span>
        {headerExtra}
        {badge && <span style={{ fontSize:10, fontWeight:600, color:'var(--gold)', background:'var(--gold-dim)', padding:'2px 8px', borderRadius: 'var(--r-20)' }}>{badge}</span>}
      </div>
      {children}
    </div>
  );
}

// ── Milestones editor (spec §6.6, §8.2) ────────────────────────────────────
// Payment links are pasted manually — no live Stripe integration in v1.
// "Mark paid" is likewise a manual admin action, not a webhook.
const MILESTONE_PHASES = [['design','Design'],['sampling','Sampling'],['production','Production']];
// Matches qala-admin-proposal.html's MS_TRIGGERS exactly.
const MILESTONE_TRIGGER_OPTIONS = {
  design: ['Design start', 'Design approved', 'Design handover', 'Custom'],
  sampling: ['Sampling start', 'Samples approved', 'Samples delivered', 'Custom'],
  production: ['Production start', 'Ready for dispatch', 'Delivered', 'Custom'],
};

function MilestonesEditor({ projectId, proposalId, onChange }) {
  const [milestones, setMilestones] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,    setError]    = useState(null);
  const [addingPhase, setAddingPhase] = useState(null);

  const load = () => {
    setLoading(true);
    projectsAPI.adminGetMilestones(projectId, proposalId)
      .then(r => { setMilestones(r.data.milestones || []); onChange?.(r.data.milestones || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [projectId, proposalId]);

  // Matches the prototype's addMilestone(phase) exactly — clicking
  // "+ Add milestone" creates a blank row immediately (first trigger
  // preset, 0%), not a separate form with its own phase/amount fields.
  const addMilestone = async (phase) => {
    setAddingPhase(phase);
    setError(null);
    try {
      await projectsAPI.adminCreateMilestone(projectId, proposalId, {
        phase, trigger_label: MILESTONE_TRIGGER_OPTIONS[phase][0], percentage: 0,
        sort_order: milestones.filter(m => m.phase === phase).length + 1,
      });
      load();
    } catch (e) {
      setError(e?.response?.data?.message || 'Could not add milestone — check the phase total doesn\'t exceed 100%.');
    } finally { setAddingPhase(null); }
  };

  const updateMilestone = async (mid, data) => {
    setMilestones(ms => ms.map(m => m.id === mid ? { ...m, ...data } : m));
    try { await projectsAPI.adminUpdateMilestone(projectId, proposalId, mid, data); } catch {}
  };

  const removeMilestone = async (mid) => {
    setMilestones(ms => ms.filter(m => m.id !== mid));
    try { await projectsAPI.adminDeleteMilestone(projectId, proposalId, mid); } catch {}
  };

  const byPhase = MILESTONE_PHASES.map(([key, label]) => ({
    key, label,
    items: milestones.filter(m => m.phase === key),
  }));

  if (loading) return <div style={{ fontSize: 12, color: 'var(--text4)' }}>Loading milestones…</div>;

  const phaseDot = { design: 'var(--ph-d, var(--sage))', sampling: 'var(--ph-s, var(--amber-d))', production: 'var(--ph-p, var(--purple))' };

  return (
    <div>
      {error && <div style={{ fontSize:12, color:'var(--red)', marginBottom:10 }}>{error}</div>}
      {byPhase.map(({ key, label, items }, i) => {
        const total = items.reduce((s, m) => s + (parseFloat(m.percentage) || 0), 0);
        return (
        <div key={key} style={{ marginBottom: 14, paddingBottom: i < byPhase.length - 1 ? 14 : 0, borderBottom: i < byPhase.length - 1 ? '1px solid var(--border)' : 'none' }}>
          <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:9 }}>
            <span style={{ width:7, height:7, borderRadius:'50%', background: phaseDot[key], flexShrink: 0 }} />
            <span style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>{label}</span>
            {items.length > 0 && Math.abs(total - 100) > 0.01 && (
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--red)', background: 'var(--red-dim)', borderRadius: 'var(--r-full)', padding: '2px 8px', marginLeft: 'auto' }}>{total}% — needs 100%</span>
            )}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom: 9 }}>
            {items.map(m => {
              const isCustom = !MILESTONE_TRIGGER_OPTIONS[key].slice(0, -1).includes(m.trigger_label);
              return (
                <div key={m.id}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 64px auto', alignItems:'center', gap:7 }}>
                    <select
                      value={isCustom ? 'Custom' : m.trigger_label}
                      onChange={e => updateMilestone(m.id, { trigger_label: e.target.value === 'Custom' ? '' : e.target.value })}
                      style={{ width: '100%', fontSize:12, padding:'7px 9px', borderRadius: 'var(--r-8)', border:'1px solid var(--border)', background:'var(--bg)', color:'var(--text)', fontFamily:'var(--font-body)', boxSizing:'border-box' }}>
                      {MILESTONE_TRIGGER_OPTIONS[key].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <input type="number" min="0" max="100" placeholder="%" value={m.percentage}
                      onChange={e => updateMilestone(m.id, { percentage: e.target.value })}
                      style={{ width: '100%', fontSize:14, fontWeight:700, textAlign:'center', padding:'7px 5px', borderRadius: 'var(--r-8)', border:'1px solid var(--border2)', background:'var(--bg)', color:'var(--text)', fontFamily:'var(--font-body)', boxSizing:'border-box' }} />
                    <button onClick={() => removeMilestone(m.id)} style={{ background:'none', border:'none', color:'var(--text4)', cursor:'pointer', fontSize:15, padding:'0 2px', flexShrink:0 }}>×</button>
                  </div>
                  {isCustom && (
                    <input type="text" placeholder="Describe the milestone condition…" value={m.trigger_label}
                      onChange={e => updateMilestone(m.id, { trigger_label: e.target.value })}
                      style={{ width: '100%', marginTop: 4, fontSize:12, padding:'6px 9px', borderRadius: 'var(--r-8)', border:'1px solid var(--border)', background:'var(--bg)', color:'var(--text)', fontFamily:'var(--font-body)', boxSizing:'border-box' }} />
                  )}
                </div>
              );
            })}
          </div>
          <button onClick={() => addMilestone(key)} disabled={addingPhase === key} className="btn btn-ghost" style={{ fontSize:12, padding:'6px 15px', width: 'auto', borderRadius: 'var(--r-full)', color: 'var(--admin, var(--gold))', background: 'var(--admin-dim, var(--gold-dim))', border: '1px solid var(--admin-dim2, var(--gold-l))' }}>
            {addingPhase === key ? 'Adding…' : '+ Add milestone'}
          </button>
        </div>
        );
      })}
    </div>
  );
}

// ── Live buyer-response feed (spec §6.8, §9) ───────────────────────────────
// Polls every 4s while mounted — matches the prototype's polling cadence.
// Production note in the spec suggests WebSocket/SSE later; polling is fine for v1.
const ACTIVITY_META = {
  accepted:            { icon: '✓', color: 'var(--green)', label: 'Proposal accepted' },
  question:            { icon: '?', color: 'var(--amber)', label: 'Question asked' },
  changes_requested:   { icon: '✎', color: 'var(--amber)', label: 'Changes requested' },
  declined:            { icon: '✕', color: 'var(--red)',   label: 'Proposal declined' },
};

function relTime(iso) {
  if (!iso) return '—';
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day:'numeric', month:'short' });
}

function BuyerActivityFeed({ projectId, proposalId }) {
  const [activity, setActivity] = useState([]);
  const [loaded,   setLoaded]   = useState(false);

  useEffect(() => {
    let alive = true;
    const poll = () => {
      projectsAPI.adminGetProposalActivity(projectId, proposalId)
        .then(r => { if (alive) { setActivity(r.data.activity || []); setLoaded(true); } })
        .catch(() => { if (alive) setLoaded(true); });
    };
    poll();
    const id = setInterval(poll, 4000);
    return () => { alive = false; clearInterval(id); };
  }, [projectId, proposalId]);

  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius: 'var(--r-lg)', padding:'16px 18px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
        <span style={{ fontSize:13, fontWeight:700, color:'var(--text)', flex: 1 }}>Buyer responses</span>
        <span style={{ width:7, height:7, borderRadius:'50%', background:'var(--green)', display:'inline-block' }} />
        <span style={{ fontSize:11, color:'var(--text4)' }}>Live</span>
      </div>
      {!loaded ? (
        <div style={{ fontSize: 12, color: 'var(--text4)' }}>Loading…</div>
      ) : activity.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--text4)', textAlign: 'center', padding: '10px 4px' }}>No buyer responses yet — waiting for buyer to open the proposal.</div>
      ) : (
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {activity.map(a => {
          const meta = ACTIVITY_META[a.type] || { icon: '•', color: 'var(--text3)', label: a.type };
          return (
            <div key={a.id} style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
              <span style={{
                width:22, height:22, borderRadius:'50%', flexShrink:0,
                background: `${meta.color}22`, color: meta.color,
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700,
              }}>{meta.icon}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, color:'var(--text)' }}>
                  <strong>{meta.label}</strong>{a.buyer_name ? ` — ${a.buyer_name}` : ''}
                </div>
                {a.message && <div style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>{a.message}</div>}
                <div style={{ fontSize:10, color:'var(--text4)', marginTop:2 }}>{relTime(a.created_at)}</div>
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AdminProjectDetail() {
  const { projectId } = useParams();
  const nav           = useNavigate();
  const [project, setProject] = useState(null);
  const [buyers,  setBuyers]  = useState([]);
  const [buyerQuery, setBuyerQuery]   = useState('');
  const [buyerOpen,  setBuyerOpen]    = useState(false);
  const buyerSearchRef = useRef();
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState('brief');
  const [studios, setStudios] = useState([]);
  const [sharing, setSharing] = useState(false);
  const [selectedStudio, setSelectedStudio] = useState('');
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [deleteOpen,   setDeleteOpen]   = useState(false);
  const [deleteText,   setDeleteText]   = useState('');
  const [deleteStage,  setDeleteStage]  = useState(1); // 1 = "are you sure", 2 = type-to-confirm
  const [deleting,     setDeleting]     = useState(false);
  const [deleteError,  setDeleteError]  = useState(null);

  const load = () => {
    setLoading(true);
    projectsAPI.adminGetProject(projectId)
      .then(r => setProject(r.data.project))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [projectId]);

  const searchBuyers = async (q) => {
    setBuyerQuery(q);
    try {
      const r = await adminAPI.getDiscoveryBuyers(q ? { q } : {});
      setBuyers(r.data.buyers || []);
    } catch {}
  };

  useEffect(() => {
    const handler = (e) => { if (buyerSearchRef.current && !buyerSearchRef.current.contains(e.target)) setBuyerOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadStudios = async () => {
    try { const r = await projectsAPI.adminGetShareStudios(projectId); setStudios(r.data.studios || []); } catch {}
  };

  const shareBrief = async () => {
    if (!selectedStudio) return;
    setSharing(true);
    try { await projectsAPI.adminShareBrief(projectId, { studio_id: parseInt(selectedStudio) }); load(); }
    catch {} finally { setSharing(false); }
  };

  const updateProject = async (data) => {
    try { await projectsAPI.adminUpdateProject(projectId, data); load(); } catch {}
  };

  const deleteProject = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await projectsAPI.adminDeleteProject(projectId, deleteText);
      nav('/admin/projects');
    } catch (e) {
      setDeleteError(e?.response?.data?.message || 'Could not delete this project.');
      setDeleting(false);
    }
  };

  const closeDeleteModal = () => {
    setDeleteOpen(false);
    setDeleteStage(1);
    setDeleteText('');
    setDeleteError(null);
  };

  if (loading) return <div style={{ padding: 40, color: 'var(--text3)', fontSize: 14 }}>Loading…</div>;
  if (!project) return <div style={{ padding: 40, color: 'var(--red)', fontSize: 14 }}>Not found.</div>;

  const proposals = project.proposals || [];
  const orders    = project.orders    || [];
  const activity  = project.activity  || [];

  return (
    <div style={{ padding: 'clamp(20px,3vw,40px) clamp(16px,4vw,48px)' }}>
      <button onClick={() => nav('/admin/projects')} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 13, cursor: 'pointer', marginBottom: 20, padding: 0 }}>
        ← All Projects
      </button>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>{project.name}</h1>
          <div style={{ fontSize: 13, color: 'var(--text3)' }}>
            {project.buyer_email || 'No buyer'} · {project.studio_name ? `Studio: ${project.studio_name}` : 'No studio'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {/* Link chat buyer — only relevant for projects admin created
             manually (spec: a buyer's self-serve brief already has its
             buyer_profile/buyer_user set correctly at creation, so this
             would only let admin accidentally re-point an already-correct
             link). Also: this used to fetch every BuyerProfile in the
             system with no limit or search — hundreds of one-message chat
             bounces in a flat <select> reads as noise. Now searches
             server-side and caps at 50. */}
          {project.created_by_admin && (
            <div style={{ position: 'relative' }} ref={buyerSearchRef}>
              <input
                value={buyerQuery}
                onFocus={() => { setBuyerOpen(true); if (buyers.length === 0) searchBuyers(''); }}
                onChange={e => searchBuyers(e.target.value)}
                placeholder="Link chat buyer…"
                style={{ padding: '8px 12px', borderRadius: 'var(--r-8)', border: '1px solid var(--border)', background: 'var(--surface2)', fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--text)', width: 220 }}
              />
              {buyerOpen && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-8)', boxShadow: 'var(--shadow-lg)', maxHeight: 260, overflowY: 'auto', marginTop: 4 }}>
                  <div
                    onClick={() => { updateProject({ buyer_profile: null }); setBuyerQuery(''); setBuyerOpen(false); }}
                    style={{ padding: '9px 14px', fontSize: 13, color: 'var(--text3)', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                  >
                    — Unlink —
                  </div>
                  {buyers.map(b => {
                    const label = b.name || b.user_email
                      || [b.product_types?.[0], b.batch_size].filter(Boolean).join(' · ')
                      || `Chat ${new Date(b.created_at).toLocaleDateString()}`;
                    return (
                      <div
                        key={b.id}
                        onClick={() => { updateProject({ buyer_profile: b.id }); setBuyerQuery(label); setBuyerOpen(false); }}
                        style={{ padding: '9px 14px', fontSize: 13, cursor: 'pointer', background: project.buyer_profile === b.id ? 'var(--gold-dim)' : 'transparent' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                        onMouseLeave={e => e.currentTarget.style.background = project.buyer_profile === b.id ? 'var(--gold-dim)' : 'transparent'}
                      >
                        {label}{b.matching_complete ? '' : ' (in progress)'}
                      </div>
                    );
                  })}
                  {buyers.length === 0 && <div style={{ padding: '9px 14px', fontSize: 12, color: 'var(--text4)' }}>No matches.</div>}
                </div>
              )}
            </div>
          )}
          <select value={project.stage} onChange={e => updateProject({ stage: e.target.value })}
            style={{ padding: '8px 14px', borderRadius: 'var(--r-8)', border: '1px solid var(--border)', background: 'var(--surface2)', fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--text)' }}>
            {['draft','brief_submitted','studio_assigned','in_production','completed','cancelled'].map(s => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <button
            onClick={() => setDeleteOpen(true)}
            className="btn btn-ghost"
            style={{ fontSize: 12, padding: '8px 14px', color: 'var(--red)', border: '1px solid var(--red)', width: 'auto', flexShrink: 0 }}
          >
            Delete Project
          </button>
        </div>
      </div>

      {/* Delete confirmation — two steps: acknowledge, then type the exact
         project name. The second step is also enforced server-side (see
         AdminProjectDetailView.delete), so this isn't just a UI speed bump. */}
      {deleteOpen && (
        <div onClick={closeDeleteModal} style={{ position:'fixed', inset:0, background:'rgba(26,22,18,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'#fff', borderRadius: 'var(--r-16)', maxWidth:440, width:'100%', padding:'28px 26px', boxShadow:'var(--shadow-lg)' }}>
            {deleteStage === 1 ? (
              <>
                <div style={{ fontSize: 28, marginBottom: 10 }}>⚠️</div>
                <div style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:600, color:'var(--text)', marginBottom:10 }}>
                  Delete "{project.name}"?
                </div>
                <p style={{ fontSize:13, color:'var(--text3)', lineHeight:1.6, marginBottom:20 }}>
                  This permanently deletes the project along with its brief, all proposals, milestones,
                  orders, contracts, and activity history. Studios currently assigned will lose access.
                  <strong style={{ color: 'var(--red)' }}> This cannot be undone.</strong>
                </p>
                <div style={{ display:'flex', gap:10 }}>
                  <button onClick={() => setDeleteStage(2)} className="btn btn-primary" style={{ fontSize:13, flex:1, background:'var(--red)', borderColor:'var(--red)' }}>
                    I understand, continue
                  </button>
                  <button onClick={closeDeleteModal} className="btn btn-ghost" style={{ fontSize:13, width: "auto", flexShrink: 0 }}>Cancel</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:600, color:'var(--text)', marginBottom:10 }}>
                  Type the project name to confirm
                </div>
                <p style={{ fontSize:13, color:'var(--text3)', marginBottom:14 }}>
                  Type <strong style={{ color:'var(--text)' }}>{project.name}</strong> exactly as shown.
                </p>
                <input
                  autoFocus
                  value={deleteText}
                  onChange={e => setDeleteText(e.target.value)}
                  placeholder={project.name}
                  style={{ width:'100%', fontSize:14, padding:'10px 12px', borderRadius: 'var(--r-8)', border:'1px solid var(--border2)', fontFamily:'var(--font-body)', marginBottom: 10, boxSizing:'border-box' }}
                />
                {deleteError && <div style={{ fontSize:12, color:'var(--red)', marginBottom:10 }}>{deleteError}</div>}
                <div style={{ display:'flex', gap:10 }}>
                  <button
                    onClick={deleteProject}
                    disabled={deleting || deleteText !== project.name}
                    className="btn btn-primary"
                    style={{ fontSize:13, flex:1, background:'var(--red)', borderColor:'var(--red)', opacity: deleteText !== project.name ? 0.5 : 1 }}
                  >
                    {deleting ? 'Deleting…' : 'Permanently delete'}
                  </button>
                  <button onClick={closeDeleteModal} className="btn btn-ghost" style={{ fontSize:13, width: "auto", flexShrink: 0 }}>Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid var(--border)', marginBottom: 24, display: 'flex', gap: 0, overflowX: 'auto' }}>
        {[['brief','Brief'],['share','Share Brief'],['proposals','Proposals'],['orders','Orders'],['activity','Activity']].map(([key, label]) => (
          <TabBtn key={key} label={`${label}${key==='proposals'&&proposals.length?` (${proposals.length})`:''}${key==='orders'&&orders.length?` (${orders.length})`:''}`}
            active={tab === key}
            onClick={() => { setTab(key); setSelectedProposal(null); if (key === 'share') loadStudios(); }}
          />
        ))}
      </div>

      {/* Brief */}
      {tab === 'brief' && <BriefTab project={project} onRefresh={load} />}

      {/* Share */}
      {tab === 'share' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{
            background: 'var(--gold-dim)', border: '1px solid var(--gold)', borderRadius: 'var(--r-lg)',
            padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Assign multiple studios with real match scores</div>
              <div style={{ fontSize: 13, color: 'var(--text3)' }}>Spec §3.2/§3.3 — scores 2–3 studios against this brief so you can compare before assigning.</div>
            </div>
            <button onClick={() => nav(`/admin/projects/${projectId}/assign-studios`)} className="btn btn-primary" style={{ fontSize: 13, padding: '9px 20px', whiteSpace: 'nowrap' }}>
              Open Assign Studios →
            </button>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '24px 28px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Quick single-studio share</div>
            <div style={{ fontSize: 12, color: 'var(--text4)', marginBottom: 16 }}>Legacy path — shares the brief to one studio directly, without going through match scoring.</div>
            {project.studio_name && <div style={{ fontSize: 13, color: 'var(--teal)', marginBottom: 14 }}>✓ Currently assigned: {project.studio_name}</div>}
            <div style={{ display: 'flex', gap: 12 }}>
              <select value={selectedStudio} onChange={e => setSelectedStudio(e.target.value)}
                style={{ flex: 1, padding: '9px 14px', borderRadius: 'var(--r-8)', border: '1px solid var(--border)', background: 'var(--surface2)', fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--text)' }}>
                <option value="">Select a studio…</option>
                {studios.map(s => <option key={s.studio_id} value={s.studio_id}>{s.studio_name}{s.location ? ` — ${s.location}` : ''}</option>)}
              </select>
              <button onClick={shareBrief} disabled={sharing || !selectedStudio} className="btn btn-primary" style={{ fontSize: 13, padding: '9px 20px' }}>
                {sharing ? 'Sharing…' : 'Share Brief →'}
              </button>
            </div>
            {studios.length === 0 && <div style={{ fontSize: 12, color: 'var(--text4)', marginTop: 10 }}>Studios load when you open this tab.</div>}
          </div>
        </div>
      )}

      {/* Proposals */}
      {tab === 'proposals' && (
        <div>
          {selectedProposal ? (
            <div>
              <button onClick={() => setSelectedProposal(null)} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 13, cursor: 'pointer', marginBottom: 16, padding: 0 }}>
                ← All Proposals
              </button>
              <ProposalReviewPanel proposal={selectedProposal} projectId={projectId} brief={project?.brief} onRefresh={load} onClose={() => { load(); setSelectedProposal(null); }} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {proposals.length === 0 ? <div style={{ fontSize: 13, color: 'var(--text4)', fontStyle: 'italic' }}>No proposals yet.</div> : proposals.map(p => (
                <div key={p.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '18px 22px', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
                  onClick={() => setSelectedProposal(p)}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-lg)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{p.studio_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text4)' }}>
                        {p.status?.replace(/_/g,' ')} · {p.line_items?.length || 0} items
                        {p.calculated_landing_cost_usd && ` · Landing cost: ${fmtUSD(parseFloat(p.calculated_landing_cost_usd))}`}
                        {p.submitted_at && ` · Submitted ${fmt(p.submitted_at)}`}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--gold)', background: 'var(--gold-dim)', padding: '3px 10px', borderRadius: 'var(--r-20)', textTransform: 'uppercase' }}>
                      Review →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Orders */}
      {tab === 'orders' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {orders.length === 0 ? <div style={{ fontSize: 13, color: 'var(--text4)', fontStyle: 'italic' }}>No orders yet.</div>
          : orders.map(o => (
            <div key={o.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-10)', padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', textTransform: 'capitalize' }}>{o.order_type?.replace(/_/g,' ')} Order</div>
                <span style={{ fontSize: 11, color: 'var(--text3)', background: 'var(--surface2)', padding: '2px 8px', borderRadius: 'var(--r)', textTransform: 'capitalize' }}>{o.status?.replace(/_/g,' ')}</span>
              </div>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                {o.committed_dispatch_date && <div><div style={{ fontSize: 10, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Dispatch</div><div style={{ fontSize: 13, color: 'var(--text2)' }}>{fmt(o.committed_dispatch_date)}</div></div>}
                {o.estimated_delivery_date && <div><div style={{ fontSize: 10, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Est. Delivery</div><div style={{ fontSize: 13, color: 'var(--text2)' }}>{fmt(o.estimated_delivery_date)}</div></div>}
                {o.awb_number && <div><div style={{ fontSize: 10, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>AWB</div><div style={{ fontSize: 13, color: 'var(--gold)', fontFamily: 'monospace' }}>{o.awb_number}</div></div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Activity */}
      {tab === 'activity' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {activity.length === 0 ? <div style={{ fontSize: 13, color: 'var(--text4)' }}>No activity yet.</div>
          : activity.map((log, i) => (
            <div key={log.id} style={{ display: 'flex', gap: 16, paddingBottom: 20 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--gold)', border: '2px solid var(--bg)' }} />
                {i < activity.length - 1 && <div style={{ width: 1, flex: 1, background: 'var(--border)', marginTop: 4 }} />}
              </div>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 2 }}>{log.description}</div>
                <div style={{ fontSize: 11, color: 'var(--text4)' }}>{fmt(log.created_at)} · {log.actor_role}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
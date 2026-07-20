import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectsAPI, adminAPI } from '../../api/client';
import {
  calcLandingCost, fetchForex,
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
  const sel = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--text)' };
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
          style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${errors.product_description ? 'var(--red)' : 'var(--border)'}`, background: 'var(--surface2)', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text)', resize: 'vertical' }} />
      </div>

      {/* Materials keywords */}
      <div style={{ gridColumn: '1 / -1' }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: errors.materials_keywords ? 'var(--red)' : 'var(--text3)', display: 'block', marginBottom: 6 }}>Materials / Keywords{req}</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {form.materials_keywords.map(kw => (
            <span key={kw} style={{ fontSize: 12, padding: '3px 10px', background: 'var(--surface3)', borderRadius: 20, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 6 }}>
              {kw}
              <button onClick={() => removeKeyword(kw)} style={{ background: 'none', border: 'none', color: 'var(--text4)', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={kwInput} onChange={e => setKwInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addKeyword()}
            placeholder="e.g. 100% Linen, Natural dyes, Handblock print — press Enter to add"
            style={{ flex: 1, padding: '7px 10px', borderRadius: 7, border: `1px solid ${errors.materials_keywords ? 'var(--red)' : 'var(--border)'}`, background: 'var(--surface2)', fontSize: 12, fontFamily: 'var(--font-body)', color: 'var(--text)' }} />
          <button onClick={addKeyword} className="btn btn-ghost" style={{ fontSize: 12, padding: '7px 12px' }}>Add</button>
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
          style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `1px solid ${errors.additional_specs ? 'var(--red)' : 'var(--border)'}`, background: 'var(--surface2)', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text)', resize: 'vertical' }} />
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
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '24px 28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>Brief</div>
        {!editing && (
          <button onClick={() => setEditing(true)} className="btn btn-ghost" style={{ fontSize: 12 }}>Edit Brief</button>
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
            {brief.materials_keywords.map(k => <span key={k} style={{ fontSize: 11, padding: '3px 9px', background: 'var(--surface3)', borderRadius: 20, color: 'var(--text2)' }}>{k}</span>)}
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
function ProposalReviewPanel({ proposal, projectId, brief, onRefresh }) {
  const [reviewTab, setReviewTab] = useState('costing');
  const [forex,     setForex]     = useState(parseFloat(proposal.forex_rate_usd_inr) || 91.62);
  const [pfPct,     setPfPct]     = useState(parseFloat(proposal.platform_fee_pct) || 0.15);
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
  const [adminNotes, setAdminNotes] = useState(proposal.admin_notes || '');
  const [revMsg,     setRevMsg]     = useState('');
  const [saving,     setSaving]     = useState(false);
  const [sending,    setSending]    = useState(false);
  const [revising,   setRevising]   = useState(false);
  const [showRevForm, setShowRevForm] = useState(false);

  useEffect(() => { fetchForex().then(setForex); }, []);

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
  const result = calcLandingCost({ lineItems: numItems, boxes: numBoxes, domain, orderType, shipping, forex, pfPct, advancePct: 0.5 });

  const hasShippable = lineItems.some(it => it._configured && it.order_type && it.order_type !== 'designing');

  const inp = (w) => ({ padding:'5px 7px',borderRadius:6,border:'1px solid var(--border)',background:'var(--surface3)',fontSize:11,color:'var(--text)',fontFamily:'var(--font-body)',width:w });
  const togBtn = (val, cur) => ({
    padding:'5px 12px',borderRadius:6,border:'1px solid var(--border)',fontSize:12,cursor:'pointer',fontFamily:'var(--font-body)',transition:'all 0.15s',
    background: cur === val ? 'var(--gold)' : 'var(--surface2)',
    color:      cur === val ? '#fff' : 'var(--text2)',
  });

  const saveChanges = async () => {
    setSaving(true);
    try {
      await projectsAPI.adminUpdateProposal(projectId, proposal.id, {
        order_type: summarize(lineItems, 'order_type', orderType), product_domain: summarize(lineItems, 'product_domain', domain), shipping_method: shipping,
        line_items: lineItems, boxes,
        forex_rate_usd_inr: forex,
        platform_fee_pct: pfPct,
        calculated_landing_cost_usd: result.hasItems ? result.landingCostUSD : null,
        studio_payout_inr: result.hasItems ? result.payoutTotalINR : null,
        studio_payout_base_inr: result.hasItems ? result.payoutBaseINR : null,
        studio_payout_gst_inr: result.hasItems ? result.payoutGSTINR : null,
        design_handover_date: designDate || null,
        sample_dispatch_date: sampleDate || null,
        bulk_dispatch_date:   bulkDate   || null,
        sow_clauses: sowClauses,
        admin_notes: adminNotes,
      });
      onRefresh();
    } catch {} finally { setSaving(false); }
  };

  const approve = async () => {
    if (!window.confirm('Approve and send this proposal to the buyer?')) return;
    setSending(true);
    try { await saveChanges(); await projectsAPI.adminSendProposal(projectId, proposal.id); onRefresh(); }
    catch {} finally { setSending(false); }
  };

  const requestRevision = async () => {
    if (!revMsg.trim()) return;
    setRevising(true);
    try { await projectsAPI.adminRequestRevision(projectId, proposal.id, { revision_message: revMsg }); onRefresh(); }
    catch {} finally { setRevising(false); }
  };

  const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : '—';

  const targetUSD = brief?.target_landing_price_usd ? parseFloat(brief.target_landing_price_usd) : null;

  return (
    <div>
      {/* Header — brief context */}
      <div style={{ background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:10,padding:'14px 18px',marginBottom:16 }}>
        <div style={{ fontSize:10,fontWeight:700,color:'var(--text4)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:10 }}>Buyer's brief — read-only context</div>
        <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:12 }}>
          {[
            ['Project',        brief?.project?.name || '—'],
            ['Buyer',          brief?.buyer_brand_name || '—'],
            ['Product Type',   brief?.product_category || '—'],
            ['Bulk qty',       brief?.bulk_quantity   ? `${brief.bulk_quantity} sets` : '—'],
            ['Target landing', targetUSD ? fmtUSD(targetUSD) : '—'],
            ['Sample delivery', fmtDate(brief?.target_sample_delivery_date)],
            ['Bulk delivery',   fmtDate(brief?.target_bulk_delivery_date)],
          ].map(([l,v]) => (
            <div key={l}>
              <div style={{fontSize:9,fontWeight:700,color:'var(--text4)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:3}}>{l}</div>
              <div style={{fontSize:12,color:'var(--text)'}}>{v}</div>
            </div>
          ))}
          {brief?.materials_keywords?.length > 0 && (
            <div style={{ gridColumn:'1/-1' }}>
              <div style={{fontSize:9,fontWeight:700,color:'var(--text4)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:5}}>Materials / keywords</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
                {brief.materials_keywords.map(k => <span key={k} style={{fontSize:11,padding:'2px 8px',background:'var(--surface3)',borderRadius:12,color:'var(--text2)'}}>{k}</span>)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status badge */}
      <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:16 }}>
        <span style={{ fontSize:12,fontWeight:600,color:'var(--amber)',background:'var(--amber-dim)',padding:'4px 12px',borderRadius:20,textTransform:'capitalize' }}>
          {proposal.status?.replace(/_/g,' ')} — Studio submitted
        </span>
        <span style={{ fontSize:11,color:'var(--text4)' }}>Submitted {fmtDate(proposal.submitted_at)}</span>
      </div>

      <div style={{ background:'var(--amber-dim)',border:'1px solid var(--amber)',borderRadius:8,padding:'10px 14px',fontSize:12,color:'var(--amber)',marginBottom:16 }}>
        🛡 You can edit any value below. You're working on a draft copy — the studio's original submission is preserved.
      </div>

      {/* Review tabs */}
      <div style={{ borderBottom:'1px solid var(--border)',marginBottom:20,display:'flex',gap:0,overflowX:'auto' }}>
        {[['costing','Costing & items'],['timelines','Timelines'],['concept','Concept'],['sow','SOW clauses']].map(([key,label]) => (
          <button key={key} onClick={() => setReviewTab(key)} style={{
            padding:'8px 16px',border:'none',
            borderBottom: reviewTab===key ? '2px solid var(--gold)' : '2px solid transparent',
            background:'none',cursor:'pointer',fontFamily:'var(--font-body)',fontSize:13,
            fontWeight: reviewTab===key ? 600 : 400,
            color: reviewTab===key ? 'var(--gold)' : 'var(--text3)',
            transition:'all 0.15s',marginBottom:-1,
          }}>{label}</button>
        ))}
      </div>

      <div style={{ display:'grid',gridTemplateColumns:'minmax(0,1fr) 240px',gap:20,alignItems:'start' }}>
        <div>
          {/* ── Costing tab ── */}
          {reviewTab === 'costing' && (
            <div>
              {/* Config — only shipping is global now */}
              <div style={{ background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,padding:'16px 18px',marginBottom:14 }}>
                <div style={{fontSize:10,fontWeight:700,color:'var(--text4)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:8}}>Shipping method</div>
                <div style={{display:'flex',gap:6}}>
                  {[['dhl','DHL Express'],['shipglobal','ShipGlobal']].map(([v,l]) => (
                    <button key={v} onClick={() => setShipping(v)} style={togBtn(v,shipping)}>{l}</button>
                  ))}
                </div>
                <div style={{marginTop:10,fontSize:11,color:'var(--text4)'}}>Order type and product domain are set per line item below.</div>
              </div>

              {/* Line items — per-item order type + domain */}
              <div style={{ background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,padding:'16px 18px',marginBottom:14 }}>
                <div style={{fontSize:12,fontWeight:600,color:'var(--text)',marginBottom:4}}>Line items (studio entered)</div>
                <div style={{fontSize:11,color:'var(--text4)',marginBottom:12}}>$1 = ₹{forex.toFixed(2)} (est.)</div>
                <LineItemCards items={lineItems} onChange={setLineItems} />
              </div>

              {/* Shipping boxes — only when any item ships */}
              {hasShippable && (
              <div style={{ background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,padding:'16px 18px',marginBottom:14 }}>
                <div style={{fontSize:12,fontWeight:600,color:'var(--text)',marginBottom:12}}>Shipping boxes (studio entered)</div>
                <div style={{display:'flex',gap:8,marginBottom:10,flexWrap:'wrap'}}>
                  {[{label:'M',length_cm:50,width_cm:40,height_cm:30},{label:'L',length_cm:60,width_cm:40,height_cm:40}].map(b => (
                    <button key={b.label} onClick={() => setBoxes(bx=>[...bx,{...b,_id:Date.now(),qty:1}])}
                      style={{fontSize:11,padding:'5px 10px',borderRadius:6,border:'1px solid var(--border)',background:'var(--surface2)',color:'var(--text2)',cursor:'pointer',fontFamily:'var(--font-body)'}}>
                      + {b.label} box ({b.length_cm}×{b.width_cm}×{b.height_cm})
                    </button>
                  ))}
                  <button onClick={() => setBoxes(bx=>[...bx,{_id:Date.now(),label:'Custom',length_cm:'',width_cm:'',height_cm:'',qty:1}])}
                    style={{fontSize:11,padding:'5px 10px',borderRadius:6,border:'1px dashed var(--border)',background:'none',color:'var(--text3)',cursor:'pointer',fontFamily:'var(--font-body)'}}>
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

              {/* Platform fee */}
              <div style={{ background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,padding:'16px 18px',marginBottom:14 }}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                  <div style={{fontSize:13,fontWeight:600,color:'var(--text)'}}>Platform fee <span style={{fontSize:11,fontWeight:400,color:'var(--text4)'}}>(Admin control)</span></div>
                  <div style={{fontSize:20,fontWeight:700,color:'var(--gold)'}}>{fmtPct(pfPct)}</div>
                </div>
                <input type="range" min="0" max="15" step="0.5" value={pfPct*100} onChange={e=>setPfPct(parseFloat(e.target.value)/100)} style={{width:'100%',accentColor:'var(--gold)'}} />
                <div style={{display:'flex',gap:6,marginTop:8,flexWrap:'wrap'}}>
                  {[[0,'0% (waive)'],[5,'5%'],[7.5,'7.5%'],[10,'10%'],[15,'15% (standard)']].map(([v,l]) => (
                    <button key={v} onClick={() => setPfPct(v/100)} style={{fontSize:10,padding:'3px 9px',borderRadius:4,border:'1px solid var(--border)',cursor:'pointer',fontFamily:'var(--font-body)',
                      background: Math.abs(pfPct*100-v)<0.1?'var(--gold)':'var(--surface2)',
                      color:      Math.abs(pfPct*100-v)<0.1?'#fff':'var(--text3)'}}>
                      {l}
                    </button>
                  ))}
                </div>
                {result.hasItems && (
                  <div style={{fontSize:11,color:'var(--text4)',marginTop:8}}>
                    Buyer protection {fmtPct(result.bpRate)} · Platform & tech {fmtPct(result.tcRate)} · Payment proc. {fmtPct(result.pgcRate)}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Timelines tab ── */}
          {reviewTab === 'timelines' && (
            <div>
              <div style={{fontSize:12,color:'var(--text4)',marginBottom:16}}>ℹ Dates entered by the studio (dispatch commits). You can edit these if corrections are needed. +10 days = estimated delivery shown to buyer.</div>
              {[
                ['Designing','Design handover date',designDate,setDesignDate],
                ['Sampling','Sample dispatch date',sampleDate,setSampleDate],
                ['Bulk production','Bulk dispatch date',bulkDate,setBulkDate],
              ].map(([section,label,val,setter]) => (
                <div key={section} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,padding:'16px 18px',marginBottom:12}}>
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
                <div style={{display:'flex',alignItems:'center',gap:12,padding:'14px 18px',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,marginBottom:16}}>
                  <span style={{fontSize:24}}>📄</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:500,color:'var(--text)'}}>{proposal.concept_pdf_name}</div>
                    <div style={{fontSize:11,color:'var(--text4)'}}>Uploaded by studio</div>
                  </div>
                  {proposal.concept_pdf_url && (
                    <a href={proposal.concept_pdf_url} target="_blank" rel="noopener noreferrer"
                      style={{fontSize:12,color:'var(--gold)',textDecoration:'none',padding:'6px 14px',background:'var(--gold-dim)',borderRadius:6,border:'1px solid rgba(200,165,90,0.2)'}}>
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
                  <div style={{fontSize:13,color:'var(--text)',lineHeight:1.7,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:8,padding:'12px 14px'}}>{proposal.concept_description}</div>
                </div>
              )}

              {proposal.past_projects?.length > 0 && (
                <div>
                  <div style={{fontSize:10,fontWeight:700,color:'var(--text4)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:10}}>Past projects linked by studio</div>
                  {proposal.past_projects.map((p,i) => (
                    <div key={i} style={{padding:'10px 14px',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:8,marginBottom:8}}>
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
              <div style={{background:'var(--surface2)',borderRadius:8,padding:'12px 14px',marginBottom:16,fontSize:12,color:'var(--text3)'}}>
                📋 The standard Qala SOW is auto-included. The following are project-specific clauses added by the studio. You may add, edit, or remove clauses before sending to buyer.
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:14}}>
                {sowClauses.length === 0 && <div style={{fontSize:12,color:'var(--text4)',fontStyle:'italic'}}>No project-specific clauses added.</div>}
                {sowClauses.map((clause,i) => (
                  <div key={i} style={{display:'flex',gap:8,alignItems:'flex-start'}}>
                    <textarea rows={2} value={clause} onChange={e=>setSowClauses(c=>c.map((x,xi)=>xi===i?e.target.value:x))}
                      style={{flex:1,padding:'9px 12px',borderRadius:8,border:'1px solid var(--border)',background:'var(--surface2)',fontFamily:'var(--font-body)',fontSize:13,color:'var(--text)',resize:'vertical'}} />
                    <button onClick={() => setSowClauses(c=>c.filter((_,xi)=>xi!==i))} style={{background:'none',border:'none',color:'var(--red)',cursor:'pointer',fontSize:18,paddingTop:6}}>×</button>
                  </div>
                ))}
              </div>
              <button onClick={() => setSowClauses(c=>[...c,''])} style={{fontSize:12,color:'var(--gold)',background:'var(--gold-dim)',border:'1px solid rgba(200,165,90,0.2)',borderRadius:6,padding:'6px 14px',cursor:'pointer',fontFamily:'var(--font-body)'}}>
                + Add
              </button>
            </div>
          )}

          {/* Admin notes + actions */}
          <div style={{marginTop:20,borderTop:'1px solid var(--border)',paddingTop:16}}>
            <div style={{fontSize:12,fontWeight:600,color:'var(--text)',marginBottom:8}}>Admin notes <span style={{fontWeight:400,color:'var(--text4)'}}>(internal only)</span></div>
            <textarea rows={3} value={adminNotes} onChange={e=>setAdminNotes(e.target.value)}
              placeholder="Internal notes — not shared with buyer or studio"
              style={{width:'100%',padding:'9px 12px',borderRadius:8,border:'1px solid var(--border)',background:'var(--surface2)',fontFamily:'var(--font-body)',fontSize:13,color:'var(--text)',resize:'vertical',marginBottom:14,boxSizing:'border-box'}} />

            <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
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
              <div style={{marginTop:14,background:'var(--surface)',border:'1px solid var(--amber)',borderRadius:10,padding:'16px 18px'}}>
                <div style={{fontSize:13,fontWeight:600,color:'var(--text)',marginBottom:10}}>Revision request message</div>
                <textarea rows={3} value={revMsg} onChange={e=>setRevMsg(e.target.value)}
                  placeholder="Explain what the studio needs to revise…"
                  style={{width:'100%',padding:'9px 12px',borderRadius:8,border:'1px solid var(--border)',background:'var(--surface2)',fontFamily:'var(--font-body)',fontSize:13,color:'var(--text)',resize:'vertical',marginBottom:10,boxSizing:'border-box'}} />
                <button onClick={requestRevision} disabled={revising||!revMsg.trim()} className="btn btn-primary" style={{fontSize:13,background:'var(--amber)'}}>
                  {revising ? 'Sending…' : 'Send revision request'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right — live landing cost */}
        <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,padding:'18px 16px',position:'sticky',top:80}}>
          <div style={{fontSize:10,fontWeight:700,color:'var(--gold)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:8}}>Landing Cost (USD)</div>
          <div style={{fontFamily:'var(--font-display)',fontSize:28,fontWeight:700,color:'var(--text)',marginBottom:4}}>
            {result.hasItems ? fmtUSD(result.landingCostUSD) : '$—'}
          </div>
          {targetUSD && result.hasItems && (
            <div style={{fontSize:11,color:result.landingCostUSD>targetUSD?'var(--red)':'var(--green)',marginBottom:12}}>
              {result.landingCostUSD > targetUSD
                ? `▲ ${fmtUSD(result.landingCostUSD - targetUSD)} above target`
                : `▼ ${fmtUSD(targetUSD - result.landingCostUSD)} below target`}
              <div style={{color:'var(--text4)',marginTop:2}}>vs buyer target {fmtUSD(targetUSD)}</div>
            </div>
          )}
          {!result.hasItems && <div style={{fontSize:11,color:'var(--text4)',marginBottom:12}}>Add items to calculate</div>}

          {result.hasItems && (
            <div style={{fontSize:12}}>
              {[['Production',fmtUSD(result.totalProdUSD)],['Shipping',fmtUSD(result.shippingUSD)],...(!result.isSG?[['Import duties',fmtUSD(result.totalDutyUSD)]]:[[]]),[`Qala (${fmtPct(pfPct)})`,fmtUSD(result.pfTotal)]].filter(([,v])=>v).map(([l,v]) => (
                <div key={l} style={{display:'flex',justifyContent:'space-between',marginBottom:5,color:'var(--text3)'}}>
                  <span>{l}</span><span style={{color:'var(--text)',fontWeight:500}}>{v}</span>
                </div>
              ))}
              <div style={{borderTop:'1px solid var(--border)',paddingTop:6,marginTop:6,display:'flex',justifyContent:'space-between',fontWeight:700,color:'var(--text)'}}>
                <span>Landing cost</span><span>{fmtUSD(result.landingCostUSD)}</span>
              </div>
              <div style={{marginTop:14,paddingTop:12,borderTop:'1px solid var(--border)'}}>
                <div style={{fontSize:10,fontWeight:700,color:'var(--text4)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:6}}>Studio Payout</div>
                <div style={{fontSize:16,fontWeight:700,color:'var(--text)'}}>{fmtINR(result.payoutTotalINR)}</div>
                <div style={{fontSize:10,color:'var(--text4)',marginTop:2}}>{fmtINR(result.payoutBaseINR)} + {fmtINR(result.payoutGSTINR)} GST</div>
                <div style={{display:'flex',gap:6,marginTop:8}}>
                  {[['Advance 50%',result.advanceINR],['On dispatch',result.balanceINR]].map(([l,v]) => (
                    <div key={l} style={{flex:1,background:'var(--surface2)',borderRadius:7,padding:'7px 8px'}}>
                      <div style={{fontSize:9,color:'var(--text4)',marginBottom:2}}>{l}</div>
                      <div style={{fontSize:11,fontWeight:600,color:'var(--text)'}}>{fmtINR(v)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <div style={{marginTop:12,fontSize:10,color:'var(--text4)'}}>$1 = ₹{forex.toFixed(2)} (est.)</div>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AdminProjectDetail() {
  const { projectId } = useParams();
  const nav           = useNavigate();
  const [project, setProject] = useState(null);
  const [buyers,  setBuyers]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState('brief');
  const [studios, setStudios] = useState([]);
  const [sharing, setSharing] = useState(false);
  const [selectedStudio, setSelectedStudio] = useState('');
  const [selectedProposal, setSelectedProposal] = useState(null);

  const load = () => {
    setLoading(true);
    projectsAPI.adminGetProject(projectId)
      .then(r => setProject(r.data.project))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    adminAPI.getDiscoveryBuyers()
      .then(r => setBuyers(r.data.buyers || []))
      .catch(() => {});
  }, [projectId]);

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
          {/* Phase 4 fix: this dropdown is fed by AdminDiscoveryBuyerListView,
             which returns discovery.BuyerProfile records (see `name`/`user_email`
             fields below) — but it was previously wired to update `buyer_user`,
             a different field (core.User FK) that this data was never a valid
             value for, and read `b.first_name`/`b.last_name`/`b.email`, none of
             which exist on this endpoint's response (only `b.name`, already
             joined server-side, and `b.user_email`). Net effect in production:
             every option in this dropdown rendered with a blank label, and
             selecting one silently failed to link anything useful.
             Fixed to target `buyer_profile` (writable as of the Phase 3 backend
             change) and to build a useful label from fields that actually exist
             — falling back to product/batch/date context since many chat buyers
             are anonymous and have no name on file. */}
          <select value={project.buyer_profile || ''} onChange={e => updateProject({ buyer_profile: e.target.value || null })}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--text)' }}>
            <option value="">Link chat buyer…</option>
            {buyers.map(b => {
              const label = b.name || b.user_email
                || [b.product_types?.[0], b.batch_size].filter(Boolean).join(' · ')
                || `Chat ${new Date(b.created_at).toLocaleDateString()}`;
              return (
                <option key={b.id} value={b.id}>
                  {label}{b.matching_complete ? '' : ' (in progress)'}
                </option>
              );
            })}
          </select>
          <select value={project.stage} onChange={e => updateProject({ stage: e.target.value })}
            style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--text)' }}>
            {['draft','brief_submitted','studio_assigned','in_production','completed','cancelled'].map(s => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
      </div>

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
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '24px 28px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--text)', marginBottom: 16 }}>Share Brief with Studio</div>
          {project.studio_name && <div style={{ fontSize: 13, color: 'var(--teal)', marginBottom: 14 }}>✓ Currently assigned: {project.studio_name}</div>}
          <div style={{ display: 'flex', gap: 12 }}>
            <select value={selectedStudio} onChange={e => setSelectedStudio(e.target.value)}
              style={{ flex: 1, padding: '9px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--text)' }}>
              <option value="">Select a studio…</option>
              {studios.map(s => <option key={s.studio_id} value={s.studio_id}>{s.studio_name}{s.location ? ` — ${s.location}` : ''}</option>)}
            </select>
            <button onClick={shareBrief} disabled={sharing || !selectedStudio} className="btn btn-primary" style={{ fontSize: 13, padding: '9px 20px' }}>
              {sharing ? 'Sharing…' : 'Share Brief →'}
            </button>
          </div>
          {studios.length === 0 && <div style={{ fontSize: 12, color: 'var(--text4)', marginTop: 10 }}>Studios load when you open this tab.</div>}
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
              <ProposalReviewPanel proposal={selectedProposal} projectId={projectId} brief={project?.brief} onRefresh={() => { load(); setSelectedProposal(null); }} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {proposals.length === 0 ? <div style={{ fontSize: 13, color: 'var(--text4)', fontStyle: 'italic' }}>No proposals yet.</div> : proposals.map(p => (
                <div key={p.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 22px', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
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
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--gold)', background: 'var(--gold-dim)', padding: '3px 10px', borderRadius: 20, textTransform: 'uppercase' }}>
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
            <div key={o.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', textTransform: 'capitalize' }}>{o.order_type?.replace(/_/g,' ')} Order</div>
                <span style={{ fontSize: 11, color: 'var(--text3)', background: 'var(--surface2)', padding: '2px 8px', borderRadius: 6, textTransform: 'capitalize' }}>{o.status?.replace(/_/g,' ')}</span>
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
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectsAPI } from '../../api/client';
import {
  calcLandingCost, fetchForex, getCats,
  GENDERS, TECHNIQUES, MATERIALS, GST_OPTIONS,
  JEW_MATERIALS, ACC_MATERIALS,
  fmtUSD, fmtINR, fmtPct,
} from '../../utils/calculator';

// ── Helpers ───────────────────────────────────────────────────────────────────

function mkItem(domain) {
  return {
    _id: Date.now() + Math.random(),
    name: '', category: getCats(domain)[0],
    gender: 'Women', material: domain === 'jewellery' ? 'Fashion / Imitation' : 'Cotton',
    technique: 'Woven', weight_per_pc: '', qty: '',
    cost_per_pc_inr: '', gst_rate: '0.12', declared_value_usd: '',
  };
}

function mkBox() {
  return { _id: Date.now() + Math.random(), label: 'Custom', length_cm: '', width_cm: '', height_cm: '', qty: 1 };
}

const STD_BOXES = [
  { label: 'XS', length_cm: 30, width_cm: 20, height_cm: 20, vol: 2.4,  box: 0.4 },
  { label: 'S',  length_cm: 45, width_cm: 30, height_cm: 25, vol: 6.75, box: 0.7 },
  { label: 'M',  length_cm: 50, width_cm: 40, height_cm: 30, vol: 12.0, box: 1.0 },
  { label: 'L',  length_cm: 60, width_cm: 40, height_cm: 40, vol: 19.2, box: 1.4 },
];

const DOMAIN_OPTIONS  = [['apparel','Apparel'],['home_furnishings','Home Furnishings'],['jewellery','Jewellery'],['accessories','Accessories']];
const ORDER_TYPES     = [['designing','Designing'],['sampling','Sampling'],['production','Production']];
const SHIP_OPTIONS    = [['dhl','DHL Express'],['shipglobal','ShipGlobal (Economical)']];

function fmtDate(iso) {
  return iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
}

// ── Shared components ─────────────────────────────────────────────────────────

function Toggle({ opts, val, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {opts.map(([v, l]) => (
        <button key={v} onClick={() => onChange(v)} style={{
          padding: '7px 16px', borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer',
          fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: val === v ? 600 : 400, transition: 'all 0.15s',
          background: val === v ? 'var(--gold)' : 'var(--surface2)',
          color:      val === v ? '#fff' : 'var(--text2)',
        }}>{l}</button>
      ))}
    </div>
  );
}

function SLabel({ children, required }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
      {children}{required && <span style={{ color: 'var(--red)', marginLeft: 3 }}>*</span>}
    </div>
  );
}

// ── STEP NAVIGATOR ────────────────────────────────────────────────────────────

const STEPS = [
  { n: 1, label: "Buyer's brief" },
  { n: 2, label: 'Concept' },
  { n: 3, label: 'Past projects' },
  { n: 4, label: 'Offerings & costing', required: true },
  { n: 5, label: 'Timelines', required: true },
  { n: 6, label: 'Terms (SOW)' },
  { n: 7, label: 'Review & submit' },
];

function StepNav({ current, onChange, completedSteps }) {
  return (
    <div style={{ width: 200, flexShrink: 0 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Proposal sections</div>
      {STEPS.map(s => {
        const done    = completedSteps.has(s.n);
        const active  = current === s.n;
        return (
          <div key={s.n} onClick={() => onChange(s.n)} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
            borderRadius: 8, marginBottom: 4, cursor: 'pointer',
            background: active ? 'var(--gold-dim)' : 'transparent',
            transition: 'background 0.15s',
          }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--surface2)'; }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
          >
            <div style={{
              width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700,
              background: done ? 'var(--green)' : active ? 'var(--gold)' : 'var(--surface3)',
              color: done || active ? '#fff' : 'var(--text3)',
            }}>
              {done ? '✓' : s.n}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? 'var(--gold)' : 'var(--text2)' }}>{s.label}</div>
              {s.required && <div style={{ fontSize: 10, color: 'var(--text4)' }}>Required</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── LIVE CALC PANEL ───────────────────────────────────────────────────────────

function CalcPanel({ result, forex, brief, pfPct }) {
  const targetUSD = brief?.target_landing_price_usd ? parseFloat(brief.target_landing_price_usd) : null;
  const diff = targetUSD && result.hasItems ? result.landingCostUSD - targetUSD : null;

  return (
    <div style={{ width: 220, flexShrink: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 16px', position: 'sticky', top: 80, alignSelf: 'flex-start' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Buyer Landing Cost</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
        {result.hasItems ? fmtUSD(result.landingCostUSD) : '$—'}
      </div>
      {targetUSD && (
        <div style={{ fontSize: 11, marginBottom: 12, color: diff > 0 ? 'var(--red)' : 'var(--green)' }}>
          {diff > 0 ? `▲ ${fmtUSD(diff)} above target` : `▼ ${fmtUSD(Math.abs(diff))} below target`}
          <div style={{ color: 'var(--text4)', marginTop: 2 }}>Target: {fmtUSD(targetUSD)}</div>
        </div>
      )}
      {!result.hasItems && (
        <div style={{ fontSize: 11, color: 'var(--text4)', marginBottom: 12 }}>
          {targetUSD ? `Buyer target ${fmtUSD(targetUSD)}` : 'Add items to calculate'}
        </div>
      )}

      {result.hasItems && (
        <div style={{ fontSize: 12, borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 4 }}>
          {[
            ['Production', fmtUSD(result.totalProdUSD)],
            [result.isSG ? 'ShipGlobal' : 'DHL Express', fmtUSD(result.shippingUSD)],
            ...(!result.isSG ? [['Import duties', fmtUSD(result.totalDutyUSD)]] : []),
            [`Qala fee (${fmtPct(pfPct)})`, fmtUSD(result.pfTotal)],
          ].map(([l, v]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, color: 'var(--text3)' }}>
              <span>{l}</span><span style={{ color: 'var(--text)', fontWeight: 500 }}>{v}</span>
            </div>
          ))}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 6, marginTop: 6, display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--text)' }}>
            <span>Landing</span><span>{fmtUSD(result.landingCostUSD)}</span>
          </div>

          <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Your Payout</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{fmtINR(result.payoutTotalINR)}</div>
            <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 2 }}>{fmtINR(result.payoutBaseINR)} + {fmtINR(result.payoutGSTINR)} GST</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              {[['Advance 50%', result.advanceINR], ['On dispatch', result.balanceINR]].map(([l, v]) => (
                <div key={l} style={{ flex: 1, background: 'var(--surface2)', borderRadius: 7, padding: '7px 8px' }}>
                  <div style={{ fontSize: 9, color: 'var(--text4)', marginBottom: 2 }}>{l}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>{fmtINR(v)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <div style={{ marginTop: 12, fontSize: 10, color: 'var(--text4)' }}>$1 = ₹{forex.toFixed(2)} (est.)</div>
    </div>
  );
}

// ── LINE ITEMS TABLE ──────────────────────────────────────────────────────────

function LineItemsTable({ items, domain, orderType, onChange, onAdd, onRemove }) {
  const cats      = getCats(domain);
  const isApparel = domain === 'apparel';
  const isJew     = domain === 'jewellery';
  const isAcc     = domain === 'accessories';
  const mats      = isJew ? JEW_MATERIALS : isAcc ? ACC_MATERIALS : MATERIALS;

  const upd = (id, k, v) => onChange(items.map(it => it._id === id ? {...it, [k]: v} : it));
  const inp = (w) => ({ padding: '5px 6px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--surface2)', fontSize: 11, color: 'var(--text)', fontFamily: 'var(--font-body)', width: w });

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, minWidth: 680 }}>
        <thead>
          <tr style={{ background: 'var(--surface2)', borderRadius: 6 }}>
            {['Item name','Category',...(isApparel?['Gender','Technique']:['Material']),'Wt/pc (kg)','Qty','Cost/pc (₹)','GST',...(orderType==='sampling'?['Decl. val ($)']:[]),''].map(h => (
              <th key={h} style={{ padding: '7px 6px', textAlign: 'left', fontWeight: 600, color: 'var(--text3)', whiteSpace: 'nowrap', fontSize: 10 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map(it => (
            <tr key={it._id} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '5px 4px' }}><input value={it.name} onChange={e => upd(it._id,'name',e.target.value)} placeholder="Item name" style={inp(110)} /></td>
              <td style={{ padding: '5px 4px' }}><select value={it.category} onChange={e => upd(it._id,'category',e.target.value)} style={inp(120)}>{cats.map(c=><option key={c}>{c}</option>)}</select></td>
              {isApparel && <td style={{ padding: '5px 4px' }}><select value={it.gender} onChange={e => upd(it._id,'gender',e.target.value)} style={inp(68)}>{GENDERS.map(g=><option key={g}>{g}</option>)}</select></td>}
              {isApparel && <td style={{ padding: '5px 4px' }}><select value={it.technique} onChange={e => upd(it._id,'technique',e.target.value)} style={inp(90)}>{TECHNIQUES.map(t=><option key={t}>{t}</option>)}</select></td>}
              {!isApparel && <td style={{ padding: '5px 4px' }}><select value={it.material} onChange={e => upd(it._id,'material',e.target.value)} style={inp(110)}>{mats.map(m=><option key={m}>{m}</option>)}</select></td>}
              <td style={{ padding: '5px 4px' }}><input type="number" value={it.weight_per_pc} onChange={e => upd(it._id,'weight_per_pc',e.target.value)} placeholder="0.00" min="0" step="0.01" style={inp(60)} /></td>
              <td style={{ padding: '5px 4px' }}><input type="number" value={it.qty} onChange={e => upd(it._id,'qty',e.target.value)} placeholder="0" min="1" style={inp(50)} /></td>
              <td style={{ padding: '5px 4px' }}><input type="number" value={it.cost_per_pc_inr} onChange={e => upd(it._id,'cost_per_pc_inr',e.target.value)} placeholder="0" min="0" style={inp(72)} /></td>
              <td style={{ padding: '5px 4px' }}><select value={it.gst_rate} onChange={e => upd(it._id,'gst_rate',e.target.value)} style={inp(58)}>{GST_OPTIONS.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></td>
              {orderType === 'sampling' && (
                <td style={{ padding: '5px 4px' }}><input type="number" value={it.declared_value_usd} onChange={e => upd(it._id,'declared_value_usd',e.target.value)} placeholder="0" min="0" step="0.01" style={inp(70)} /></td>
              )}
              <td style={{ padding: '5px 4px' }}><button onClick={() => onRemove(it._id)} style={{ background:'none',border:'none',color:'var(--red)',cursor:'pointer',fontSize:16,lineHeight:1 }}>×</button></td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr><td colSpan={isApparel?10:9} style={{ textAlign:'center',padding:'16px',color:'var(--text4)',fontStyle:'italic',fontSize:12 }}>No items yet — click + Add item below</td></tr>
          )}
        </tbody>
      </table>
      <button onClick={onAdd} style={{ marginTop:8,fontSize:12,color:'var(--gold)',background:'var(--gold-dim)',border:'1px solid rgba(200,165,90,0.2)',borderRadius:6,padding:'6px 14px',cursor:'pointer',fontFamily:'var(--font-body)' }}>
        + Add item
      </button>
    </div>
  );
}

// ── BOXES TABLE ───────────────────────────────────────────────────────────────

function BoxesTable({ boxes, onChange }) {
  const upd = (id, k, v) => onChange(boxes.map(b => b._id === id ? {...b, [k]: v} : b));
  const rm  = (id) => onChange(boxes.filter(b => b._id !== id));
  const add = (std) => onChange([...boxes, { ...mkBox(), ...std, qty: 1 }]);
  const addCustom = () => onChange([...boxes, mkBox()]);
  const inp = (w) => ({ padding:'5px 6px',borderRadius:5,border:'1px solid var(--border)',background:'var(--surface2)',fontSize:11,color:'var(--text)',fontFamily:'var(--font-body)',width:w });

  return (
    <div>
      {/* Standard sizes quick-add */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: 'var(--text4)', marginBottom: 8 }}>Standard sizes — 5-ply corrugated</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {STD_BOXES.map(b => (
            <button key={b.label} onClick={() => add(b)} style={{ fontSize: 12, padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font-body)', textAlign: 'left' }}>
              <div style={{ fontWeight: 600 }}>{b.label} — {b.length_cm}×{b.width_cm}×{b.height_cm} cm</div>
              <div style={{ fontSize: 10, color: 'var(--text4)' }}>Vol {b.vol} kg · Box {b.box} kg</div>
            </button>
          ))}
          <button onClick={addCustom} style={{ fontSize: 12, padding: '6px 12px', borderRadius: 6, border: '1px dashed var(--border)', background: 'none', color: 'var(--text3)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            Custom size
          </button>
        </div>
      </div>

      {boxes.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--text4)', fontStyle: 'italic', padding: '8px 0' }}>No boxes added</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ background: 'var(--surface2)' }}>
              {['Size','L (cm)','W (cm)','H (cm)','Vol. wt','Box wt','Qty',''].map(h => (
                <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: 'var(--text3)', fontSize: 10 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {boxes.map(b => {
              const l = parseFloat(b.length_cm) || 0, w = parseFloat(b.width_cm) || 0, h = parseFloat(b.height_cm) || 0;
              const vol = l && w && h ? (l*w*h/5000).toFixed(2)+' kg' : '—';
              const bwt = l && w && h ? (Math.round(2*(l*w+l*h+w*h)/10000*1.1*10)/10).toFixed(1)+' kg' : '—';
              return (
                <tr key={b._id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '5px 6px' }}><input value={b.label} onChange={e => upd(b._id,'label',e.target.value)} style={inp(60)} /></td>
                  {['length_cm','width_cm','height_cm'].map(k => (
                    <td key={k} style={{ padding: '5px 6px' }}><input type="number" value={b[k]} onChange={e => upd(b._id,k,e.target.value)} min="0" style={inp(56)} /></td>
                  ))}
                  <td style={{ padding: '5px 8px', color: 'var(--text3)' }}>{vol}</td>
                  <td style={{ padding: '5px 8px', color: 'var(--text3)' }}>{bwt}</td>
                  <td style={{ padding: '5px 6px' }}><input type="number" value={b.qty} onChange={e => upd(b._id,'qty',Math.max(1,parseInt(e.target.value)||1))} min="1" style={inp(46)} /></td>
                  <td style={{ padding: '5px 6px' }}><button onClick={() => rm(b._id)} style={{ background:'none',border:'none',color:'var(--red)',cursor:'pointer',fontSize:16 }}>×</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 8 }}>
        Vol. wt = L×W×H ÷ 5000 · Chargeable = max(actual, vol) + 10% margin · Rounds to 0.5 kg (≤30 kg) or 1 kg (&gt;30 kg)
      </div>
    </div>
  );
}

// ── MAIN PROPOSALBUILDER ──────────────────────────────────────────────────────

export default function ProposalBuilder() {
  const { projectId, proposalId } = useParams();
  const nav  = useNavigate();
  const pdfRef = useRef();

  const [enquiry,    setEnquiry]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [step,       setStep]       = useState(1);
  const [completed,  setCompleted]  = useState(new Set());
  const [forex,      setForex]      = useState(91.62);

  // Form state
  const [orderType,    setOrderType]    = useState('production');
  const [domain,       setDomain]       = useState('apparel');
  const [shipping,     setShipping]     = useState('dhl');
  const [lineItems,    setLineItems]    = useState([]);
  const [boxes,        setBoxes]        = useState([]);
  const [designDate,   setDesignDate]   = useState('');
  const [sampleDate,   setSampleDate]   = useState('');
  const [bulkDate,     setBulkDate]     = useState('');
  const [conceptPdf,   setConceptPdf]   = useState(null);
  const [conceptPdfName, setConceptPdfName] = useState('');
  const [conceptTitle, setConceptTitle] = useState('');
  const [conceptDesc,  setConceptDesc]  = useState('');
  const [pastProjects, setPastProjects] = useState([]);
  const [sowClauses,   setSowClauses]   = useState([]);
  const [clarNotes,    setClarNotes]    = useState('');

  const numItems = lineItems.map(it => ({
    ...it,
    qty:              parseFloat(it.qty)              || 0,
    cost_per_pc_inr:  parseFloat(it.cost_per_pc_inr)  || 0,
    weight_per_pc:    parseFloat(it.weight_per_pc)    || 0,
    declared_value_usd: parseFloat(it.declared_value_usd) || 0,
  }));
  const numBoxes = boxes.map(b => ({
    ...b, length_cm: parseFloat(b.length_cm)||0, width_cm: parseFloat(b.width_cm)||0,
    height_cm: parseFloat(b.height_cm)||0, qty: parseInt(b.qty)||1,
  }));
  const result = calcLandingCost({ lineItems: numItems, boxes: numBoxes, domain, orderType, shipping, forex, pfPct: 0.15, advancePct: 0.5 });

  useEffect(() => {
    fetchForex().then(setForex);
    projectsAPI.getEnquiry(projectId).then(r => {
      const e = r.data.enquiry;
      setEnquiry(e);
      const p = (e.my_proposals || []).find(x => x.id === proposalId);
      if (p) {
        setOrderType(p.order_type         || 'production');
        setDomain(p.product_domain        || 'apparel');
        setShipping(p.shipping_method     || 'dhl');
        setLineItems(p.line_items         || []);
        setBoxes(p.boxes                  || []);
        setDesignDate(p.design_handover_date || '');
        setSampleDate(p.sample_dispatch_date || '');
        setBulkDate(p.bulk_dispatch_date     || '');
        setConceptTitle(p.concept_title      || '');
        setConceptDesc(p.concept_description || '');
        setConceptPdfName(p.concept_pdf_name || '');
        setPastProjects(p.past_projects   || []);
        setSowClauses(p.sow_clauses       || []);
        setClarNotes(p.clarification_notes || '');
        if (p.forex_rate_usd_inr) setForex(parseFloat(p.forex_rate_usd_inr));
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [projectId, proposalId]);

  const markComplete = (n) => setCompleted(c => new Set([...c, n]));

  const r2 = (v) => v != null ? Math.round(v * 100) / 100 : null;

  const buildPayload = () => ({
    order_type:           orderType,
    product_domain:       domain,
    shipping_method:      shipping,
    line_items:           lineItems,
    boxes,
    forex_rate_usd_inr:   Math.round(forex * 10000) / 10000,
    calculated_landing_cost_usd: result.hasItems ? r2(result.landingCostUSD) : null,
    studio_payout_inr:    result.hasItems ? r2(result.payoutTotalINR) : null,
    studio_payout_base_inr: result.hasItems ? r2(result.payoutBaseINR) : null,
    studio_payout_gst_inr:  result.hasItems ? r2(result.payoutGSTINR)  : null,
    design_handover_date: designDate || null,
    sample_dispatch_date: sampleDate || null,
    bulk_dispatch_date:   bulkDate   || null,
    concept_title:        conceptTitle,
    concept_description:  conceptDesc,
    past_projects:        pastProjects,
    sow_clauses:          sowClauses,
    clarification_notes:  clarNotes,
    advance_pct:          0.5,
  });

  const saveDraft = async () => {
    setSaving(true);
    try {
      const payload = buildPayload();
      if (conceptPdf) {
        // Has file — use FormData
        const fd = new FormData();
        Object.entries(payload).forEach(([k, v]) => {
          if (v !== null && v !== undefined)
            fd.append(k, typeof v === 'object' ? JSON.stringify(v) : v);
        });
        fd.append('concept_pdf', conceptPdf);
        await projectsAPI.updateProposal(projectId, proposalId, fd);
      } else {
        // No file — send as JSON so JSONFields parse correctly
        await projectsAPI.updateProposalJSON(projectId, proposalId, payload);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {} finally { setSaving(false); }
  };

  const goNext = async (n) => {
    await saveDraft();
    markComplete(n);
    setStep(n + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = (n) => {
    setStep(n - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = async () => {
    if (!lineItems.some(it => it.qty && it.cost_per_pc_inr)) {
      alert('Please add at least one item with quantity and cost before submitting.');
      return;
    }
    if (!window.confirm('Submit this proposal to Qala for review? You cannot edit it after submission.')) return;
    setSubmitting(true);
    try {
      await saveDraft();
      await projectsAPI.submitProposal(projectId, proposalId);
      nav(`/dashboard/enquiries/${projectId}`);
    } catch { setSubmitting(false); }
  };

  const addPP = () => setPastProjects([...pastProjects, { name: '', description: '', year: '' }]);
  const updPP = (i, k, v) => setPastProjects(pastProjects.map((p, pi) => pi === i ? {...p, [k]: v} : p));
  const rmPP  = (i) => setPastProjects(pastProjects.filter((_, pi) => pi !== i));
  const addSOW = () => setSowClauses([...sowClauses, '']);
  const updSOW = (i, v) => setSowClauses(sowClauses.map((c, ci) => ci === i ? v : c));
  const rmSOW  = (i) => setSowClauses(sowClauses.filter((_, ci) => ci !== i));

  if (loading) return <div style={{ padding: 40, color: 'var(--text3)', fontSize: 14 }}>Loading…</div>;
  if (!enquiry) return <div style={{ padding: 40, color: 'var(--red)', fontSize: 14 }}>Not found.</div>;

  const brief = enquiry.brief || {};
  const stepBtn = { fontSize: 13, padding: '10px 20px' };

  const NavBtns = ({ n, skipLabel, onSkip, continueLabel, onContinue, disableContinue }) => (
    <div style={{ display: 'flex', gap: 10, marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border)', alignItems: 'center' }}>
      {n > 1 && <button onClick={() => goBack(n)} className="btn btn-ghost" style={stepBtn}>← Back</button>}
      {onSkip && <button onClick={onSkip} className="btn btn-ghost" style={{ ...stepBtn, color: 'var(--text3)' }}>{skipLabel || 'Skip for now'}</button>}
      {/* Change 4: save draft available on every step */}
      <button onClick={saveDraft} disabled={saving} className="btn btn-ghost" style={{ ...stepBtn, color: 'var(--text3)', fontSize: 12 }}>
        {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save draft'}
      </button>
      <div style={{ flex: 1 }} />
      <button onClick={onContinue || (() => goNext(n))} disabled={disableContinue} className="btn btn-primary" style={stepBtn}>
        {continueLabel || 'Continue →'}
      </button>
    </div>
  );

  // Step content
  const renderStep = () => {
    switch (step) {
      // ── Step 1: Buyer Brief (read-only) ──────────────────────────────────
      case 1: return (
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>01 — Buyer's brief</h2>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20 }}>Project details from the buyer. Review carefully before building your proposal.</div>

          {/* Core info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
            {[
              ['Project name',  enquiry.name],
              ['Buyer / Brand', brief.buyer_brand_name || '—'],
              ['Location',      brief.buyer_location   || '—'],
              ['Category',      brief.product_category  || '—'],
              ['Brief received', fmtDate(enquiry.created_at)],
            ].map(([l, v]) => (
              <div key={l}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>{l}</div>
                <div style={{ fontSize: 14, color: 'var(--text)' }}>{v}</div>
              </div>
            ))}
          </div>

          {brief.product_description && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Product description</div>
              <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.7, background: 'var(--surface2)', borderRadius: 8, padding: '12px 14px' }}>{brief.product_description}</div>
            </div>
          )}

          {brief.materials_keywords?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Materials requested</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {brief.materials_keywords.map(k => <span key={k} style={{ fontSize: 12, padding: '4px 12px', background: 'var(--surface3)', borderRadius: 20, color: 'var(--text2)' }}>{k}</span>)}
              </div>
            </div>
          )}

          {/* Change 3: qty + delivery in one row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
            {[
              ['Sample qty',            brief.sample_quantity != null ? `${brief.sample_quantity} set${brief.sample_quantity !== 1 ? 's' : ''}` : '—'],
              ['Bulk qty',              brief.bulk_quantity   != null ? `${brief.bulk_quantity} sets` : '—'],
              ['Budget',                brief.budget_min || brief.budget_max
                ? `${brief.budget_currency || ''} ${brief.budget_min || '?'} – ${brief.budget_max || '?'}`
                : '—'],
              ['Target landing price',  brief.target_landing_price_usd
                ? `${brief.target_landing_currency || ''} ${brief.target_landing_price_local || ''} ≈ ${fmtUSD(parseFloat(brief.target_landing_price_usd))} per set`
                : '—'],
              ['Target sample delivery', fmtDate(brief.target_sample_delivery_date)],
              ['Target bulk delivery',   fmtDate(brief.target_bulk_delivery_date)],
            ].map(([l, v]) => (
              <div key={l}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>{l}</div>
                <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: l.includes('qty') || l.includes('price') ? 600 : 400 }}>{v}</div>
              </div>
            ))}
          </div>

          {brief.additional_specs && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Additional notes</div>
              <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.65, background: 'var(--surface2)', borderRadius: 8, padding: '10px 14px' }}>{brief.additional_specs}</div>
            </div>
          )}

          {/* Change 3: reference link */}
          {brief.reference_url && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Reference link</div>
              <a href={brief.reference_url} target="_blank" rel="noreferrer"
                style={{ fontSize: 13, color: 'var(--gold)', wordBreak: 'break-all', display: 'block' }}>
                {brief.reference_url}
              </a>
            </div>
          )}

          {/* Change 3: attachments */}
          {brief.moodboards?.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Attachments from buyer</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {brief.moodboards.map(m => {
                  const icon = m.mime_type?.startsWith('image/') ? '🖼' : m.mime_type === 'application/pdf' ? '📄' : m.mime_type?.startsWith('video/') ? '🎬' : '📎';
                  return (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--surface2)', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 16 }}>{icon}</span>
                      <a href={m.url} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: 'var(--gold)', textDecoration: 'none', flex: 1 }}>{m.file_name}</a>
                      <span style={{ fontSize: 11, color: 'var(--text4)' }}>{m.file_size_kb ? (m.file_size_kb < 1024 ? `${m.file_size_kb} KB` : `${(m.file_size_kb/1024).toFixed(1)} MB`) : ''}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <NavBtns n={1} continueLabel="Continue to concept →" />
        </div>
      );

      // ── Step 2: Concept ────────────────────────────────────────────────────
      case 2: return (
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>02 — Concept</h2>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 24 }}>Share your creative vision. Upload a PDF — mood references, fabric direction, colour palette, silhouettes.</div>

          <div className="field" style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12 }}>Concept title (optional)</label>
            <input value={conceptTitle} onChange={e => setConceptTitle(e.target.value)} placeholder="e.g. Earth Memory" style={{ fontSize: 13 }} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <SLabel>Concept description</SLabel>
            <textarea rows={4} value={conceptDesc} onChange={e => setConceptDesc(e.target.value)}
              placeholder="Describe your creative direction, materials, mood, colour story…"
              style={{ width: '100%', padding: '10px 13px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text)', resize: 'vertical', boxSizing: 'border-box' }} />
          </div>

          <div>
            <SLabel>Concept PDF / moodboard</SLabel>
            <input ref={pdfRef} type="file" accept=".pdf,image/*" onChange={e => { const f = e.target.files?.[0]; if(f) { setConceptPdf(f); setConceptPdfName(f.name); } }} style={{ display: 'none' }} />
            {conceptPdfName ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'var(--surface2)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <span style={{ fontSize: 20 }}>📄</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{conceptPdfName}</div>
                  {conceptPdf && <div style={{ fontSize: 11, color: 'var(--text4)' }}>{(conceptPdf.size/1024/1024).toFixed(1)} MB · Uploaded</div>}
                </div>
                <button onClick={() => { setConceptPdf(null); setConceptPdfName(''); }} style={{ background: 'none', border: 'none', color: 'var(--text4)', cursor: 'pointer', fontSize: 18 }}>×</button>
              </div>
            ) : (
              <button onClick={() => pdfRef.current?.click()} style={{ width: '100%', padding: '24px', borderRadius: 8, border: '2px dashed var(--border)', background: 'var(--surface2)', color: 'var(--text3)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13, textAlign: 'center' }}>
                📎 Drop your concept PDF here, or browse<br/>
                <span style={{ fontSize: 11, color: 'var(--text4)' }}>PDF up to 20 MB</span>
              </button>
            )}
          </div>

          <NavBtns n={2} onSkip={() => { markComplete(2); setStep(3); }} />
        </div>
      );

      // ── Step 3: Past projects ──────────────────────────────────────────────
      case 3: return (
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>03 — Past projects</h2>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 24 }}>Show the buyer work closest to this project. Add up to 3 past projects.</div>

          {/* Change 1: import from Section G portfolio */}
          {enquiry.studio_projects?.length > 0 && pastProjects.length < 3 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Import from your portfolio</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {enquiry.studio_projects.map(sp => {
                  const alreadyAdded = pastProjects.some(p => p._imported_id === sp.id);
                  const yr = sp.month_year ? sp.month_year.slice(0, 4) : '';
                  const desc = [sp.fabrics_used, sp.techniques_used, sp.about].filter(Boolean).join(' · ').slice(0, 120);
                  return (
                    <div key={sp.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--surface2)', borderRadius: 8, border: `1px solid ${alreadyAdded ? 'var(--green)' : 'var(--border)'}` }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{sp.name}</div>
                        {desc && <div style={{ fontSize: 11, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{desc}</div>}
                        {yr && <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 2 }}>{yr}</div>}
                      </div>
                      <button
                        disabled={alreadyAdded || pastProjects.length >= 3}
                        onClick={() => {
                          if (alreadyAdded || pastProjects.length >= 3) return;
                          setPastProjects(prev => [...prev, {
                            _imported_id: sp.id,
                            name:        sp.name,
                            year:        yr,
                            description: [sp.fabrics_used, sp.techniques_used, sp.about].filter(Boolean).join(' · ').slice(0, 200),
                          }]);
                        }}
                        style={{
                          fontSize: 12, padding: '6px 14px', borderRadius: 6, cursor: alreadyAdded || pastProjects.length >= 3 ? 'default' : 'pointer',
                          border: '1px solid var(--border)', fontFamily: 'var(--font-body)',
                          background: alreadyAdded ? 'var(--green)' : 'var(--surface)',
                          color: alreadyAdded ? '#fff' : 'var(--text2)',
                          flexShrink: 0,
                        }}>
                        {alreadyAdded ? '✓ Added' : '+ Import'}
                      </button>
                    </div>
                  );
                })}
              </div>
              {pastProjects.length < 3 && (
                <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 8 }}>
                  Or add a project manually below.
                </div>
              )}
            </div>
          )}

          {/* Manual / imported entries */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
            {pastProjects.map((p, i) => (
              <div key={i} style={{ background: 'var(--surface2)', borderRadius: 10, padding: '16px 18px', border: '1px solid var(--border)', position: 'relative' }}>
                {p._imported_id && (
                  <div style={{ fontSize: 10, color: 'var(--green)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                    Imported from portfolio — editable
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, marginBottom: 10 }}>
                  <div className="field" style={{ margin: 0 }}>
                    <label style={{ fontSize: 10 }}>Project name</label>
                    <input value={p.name} onChange={e => updPP(i,'name',e.target.value)} placeholder="Project name" style={{ fontSize: 12 }} />
                  </div>
                  <div className="field" style={{ margin: 0 }}>
                    <label style={{ fontSize: 10 }}>Year</label>
                    <input type="number" value={p.year} onChange={e => updPP(i,'year',e.target.value)} placeholder="2024" style={{ fontSize: 12 }} />
                  </div>
                  <button onClick={() => rmPP(i)} style={{ alignSelf: 'flex-end', background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 20, paddingBottom: 4 }}>×</button>
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <label style={{ fontSize: 10 }}>Brief description / materials / technique</label>
                  <input value={p.description} onChange={e => updPP(i,'description',e.target.value)} placeholder="e.g. Natural dyes · Linen · Handblock print" style={{ fontSize: 12 }} />
                </div>
              </div>
            ))}
          </div>

          {pastProjects.length < 3 && (
            <button onClick={addPP} style={{ fontSize: 13, color: 'var(--gold)', background: 'var(--gold-dim)', border: '1px solid rgba(200,165,90,0.2)', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              + Add a project manually
            </button>
          )}

          <NavBtns n={3} onSkip={() => { markComplete(3); setStep(4); }} />
        </div>
      );

      // ── Step 4: Costing ────────────────────────────────────────────────────
      case 4: return (
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>04 — Offerings & costing</h2>
            <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 4 }}>Add the items you'll produce and your costs. The buyer's landing cost updates live on the right.</div>
            {brief.target_landing_price_usd && (
              <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20 }}>
                Buyer's target landing price <strong>{brief.target_landing_currency} {brief.target_landing_price_local}</strong> per set ≈ <strong>{fmtINR(parseFloat(brief.target_landing_price_usd) * forex)}</strong> at current rate
              </div>
            )}

            {/* Order config */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 20px', marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
                <div>
                  <SLabel>Order type</SLabel>
                  <Toggle opts={ORDER_TYPES} val={orderType} onChange={v => { setOrderType(v); setLineItems([]); }} />
                  <div style={{ fontSize:10, color:'var(--text4)', marginTop:6 }}>
                    {orderType === 'designing' && 'No shipping required — handover date only'}
                    {orderType === 'sampling' && 'Declared value per item required for customs'}
                    {orderType === 'production' && 'Full bulk production run'}
                  </div>
                </div>
                <div><SLabel>Product domain</SLabel><Toggle opts={DOMAIN_OPTIONS} val={domain}    onChange={v => { setDomain(v);    setLineItems([]); }} /></div>
                <div><SLabel>Shipping method</SLabel><Toggle opts={SHIP_OPTIONS}  val={shipping}  onChange={setShipping} /></div>
              </div>
              <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text4)', background: 'var(--surface2)', borderRadius: 7, padding: '8px 12px' }}>
                ℹ Shipping, import duties, and insurance are handled end-to-end by Qala. Enter your studio costs only — the calculator adds everything else automatically.
              </div>
            </div>

            {/* Line items */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 20px', marginBottom: 16 }}>
              <SLabel required>Items & costing</SLabel>
              <div style={{ fontSize: 11, color: 'var(--text4)', marginBottom: 12 }}>Enter each product you'll be making, with weight and cost per piece. Weight is used to calculate shipping.</div>
              <LineItemsTable
                items={lineItems} domain={domain} orderType={orderType}
                onChange={setLineItems}
                onAdd={() => setLineItems(li => [...li, mkItem(domain)])}
                onRemove={id => setLineItems(li => li.filter(it => it._id !== id))}
              />
            </div>

            {/* Boxes */}
            {orderType !== 'designing' && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 20px', marginBottom: 16 }}>
                <SLabel>Shipping box details</SLabel>
                <div style={{ fontSize: 11, color: 'var(--text4)', marginBottom: 12 }}>Box dimensions determine volumetric weight, which affects shipping cost.</div>
                <BoxesTable boxes={boxes} onChange={setBoxes} />
              </div>
            )}

            <NavBtns n={4}
              disableContinue={!lineItems.some(it => it.qty && it.cost_per_pc_inr)}
              continueLabel="Continue →"
            />
          </div>

          {/* Live calc panel */}
          <CalcPanel result={result} forex={forex} brief={brief} pfPct={0.15} />
        </div>
      );

      // ── Step 5: Timelines ──────────────────────────────────────────────────
      case 5: return (
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>05 — Timelines</h2>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 8 }}>Enter dispatch dates — when goods leave your studio. Qala adds 7 days shipping + 3 days buffer to show estimated delivery.</div>
          <div style={{ fontSize: 12, color: 'var(--text4)', background: 'var(--surface2)', borderRadius: 7, padding: '10px 14px', marginBottom: 24 }}>
            📦 Dates you commit to are <strong>dispatch dates</strong> (when goods leave your studio). Qala handles transit.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {orderType !== 'sampling' && orderType !== 'production' && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 20px' }}>
                <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>Designing</div>
                <div className="field">
                  <label style={{ fontSize: 12 }}>Design completion / handover date</label>
                  <input type="date" value={designDate} onChange={e => setDesignDate(e.target.value)} style={{ fontSize: 13 }} />
                </div>
              </div>
            )}

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                  Sampling ({brief.sample_quantity ? `${brief.sample_quantity} set · ` : ''}all pieces)
                </div>
                {brief.target_sample_delivery_date && (
                  <div style={{ fontSize: 11, color: 'var(--text4)' }}>Buyer's target delivery: {fmtDate(brief.target_sample_delivery_date)}</div>
                )}
              </div>
              <div className="field">
                <label style={{ fontSize: 12 }}>Sample dispatch date (committed)</label>
                <input type="date" value={sampleDate} onChange={e => setSampleDate(e.target.value)} style={{ fontSize: 13 }} />
              </div>
              {sampleDate && (
                <div style={{ fontSize: 11, color: 'var(--teal)', marginTop: 4 }}>
                  Estimated delivery to buyer: {fmtDate(new Date(new Date(sampleDate).getTime() + 10*86400000).toISOString())}
                </div>
              )}
            </div>

            {(orderType === 'production' || orderType === 'sampling') && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                    Bulk production ({brief.bulk_quantity ? `${brief.bulk_quantity} sets` : ''})
                  </div>
                  {brief.target_bulk_delivery_date && (
                    <div style={{ fontSize: 11, color: 'var(--text4)' }}>Buyer's target delivery: {fmtDate(brief.target_bulk_delivery_date)}</div>
                  )}
                </div>
                <div className="field">
                  <label style={{ fontSize: 12 }}>Bulk dispatch date (committed)</label>
                  <input type="date" value={bulkDate} onChange={e => setBulkDate(e.target.value)} style={{ fontSize: 13 }} />
                </div>
                {bulkDate && (
                  <div style={{ fontSize: 11, color: 'var(--teal)', marginTop: 4 }}>
                    Estimated delivery to buyer: {fmtDate(new Date(new Date(bulkDate).getTime() + 10*86400000).toISOString())}
                  </div>
                )}
              </div>
            )}
          </div>

          <NavBtns n={5}
            disableContinue={!sampleDate && !bulkDate && !designDate}
            continueLabel="Continue →"
          />
        </div>
      );

      // ── Step 6: SOW ────────────────────────────────────────────────────────
      case 6: return (
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>06 — Terms (SOW)</h2>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 24 }}>A standard Qala SOW applies to all engagements. Add project-specific clauses here if needed.</div>

          <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px', marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>Qala standard SOW</div>
              <span style={{ fontSize: 11, color: 'var(--green)', background: 'var(--green-dim)', padding: '2px 8px', borderRadius: 10 }}>Auto-included</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>
              The standard Qala Statement of Work governs all projects — covering payment milestones, quality standards, dispute resolution, IP ownership, and delivery obligations. It is automatically attached to every proposal.
            </div>
          </div>

          <SLabel>Project-specific clauses (optional)</SLabel>
          <div style={{ fontSize: 11, color: 'var(--text4)', marginBottom: 14 }}>Add terms specific to this project — material behaviour, craft limitations, process disclosures.</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            {sowClauses.map((clause, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <textarea rows={2} value={clause} onChange={e => updSOW(i, e.target.value)}
                  placeholder="e.g. Indigo-dyed fabric may exhibit colour bleeding in initial washes, characteristic of natural indigo…"
                  style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text)', resize: 'vertical' }} />
                <button onClick={() => rmSOW(i)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 18, paddingTop: 6 }}>×</button>
              </div>
            ))}
          </div>
          <button onClick={addSOW} style={{ fontSize: 13, color: 'var(--gold)', background: 'var(--gold-dim)', border: '1px solid rgba(200,165,90,0.2)', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            + Add
          </button>

          <NavBtns n={6} onSkip={() => { markComplete(6); setStep(7); }} continueLabel="Review proposal →" />
        </div>
      );

      // ── Step 7: Review & Submit ────────────────────────────────────────────
      case 7: return (
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>07 — Review & submit</h2>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 24 }}>Review your proposal before submitting to Qala.</div>

          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
            {[
              ['Concept',       conceptTitle || (conceptPdfName ? conceptPdfName : '—')],
              ['Past projects', pastProjects.length > 0 ? `${pastProjects.length} added` : 'Not added'],
              ['Items',         lineItems.filter(it=>it.qty&&it.cost_per_pc_inr).length > 0
                ? `${lineItems.filter(it=>it.qty&&it.cost_per_pc_inr).length} items added`
                : '⚠ None — required'],
              ['Dispatch dates', sampleDate || bulkDate || designDate ? 'Added' : '⚠ None — required'],
              ['Landing cost',   result.hasItems ? fmtUSD(result.landingCostUSD) : '—'],
              ['Studio payout',  result.hasItems ? fmtINR(result.payoutTotalINR) : '—'],
            ].map(([l, v]) => (
              <div key={l} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{l}</div>
                <div style={{ fontSize: 14, color: v.startsWith('⚠') ? 'var(--red)' : 'var(--text)', fontWeight: 500 }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Clarifications */}
          <div style={{ marginBottom: 20 }}>
            <SLabel>Clarifications / Questions for Qala</SLabel>
            <textarea rows={3} value={clarNotes} onChange={e => setClarNotes(e.target.value)}
              placeholder="Any questions about the brief, or notes you'd like Qala to pass on to the buyer…"
              style={{ width: '100%', padding: '10px 13px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text)', resize: 'vertical', boxSizing: 'border-box' }} />
          </div>

          <div style={{ display: 'flex', gap: 10, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
            <button onClick={() => goBack(7)} className="btn btn-ghost" style={stepBtn}>← Back</button>
            <button onClick={saveDraft} disabled={saving} className="btn btn-ghost" style={stepBtn}>
              {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save draft'}
            </button>
            <button onClick={submit} disabled={submitting || !lineItems.some(it=>it.qty&&it.cost_per_pc_inr)} className="btn btn-primary" style={{ ...stepBtn, padding: '10px 28px' }}>
              {submitting ? 'Submitting…' : 'Submit proposal →'}
            </button>
          </div>
        </div>
      );

      default: return null;
    }
  };

  return (
    <div style={{ padding: 'clamp(16px,3vw,36px) clamp(14px,4vw,44px)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <button onClick={() => nav(`/dashboard/enquiries/${projectId}`)} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 10 }}>
            ← Enquiries
          </button>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text4)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>Qala</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Create Proposal</h1>
          <div style={{ fontSize: 12, color: 'var(--text4)' }}>
            {saving ? '↺ Saving…' : saved ? '✓ Draft saved' : 'Draft'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
        {/* Step navigator */}
        <StepNav current={step} onChange={setStep} completedSteps={completed} />

        {/* Step content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {renderStep()}
        </div>
      </div>
    </div>
  );
}
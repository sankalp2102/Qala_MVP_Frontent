import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectsAPI } from '../../api/client';
import PaymentModal from '../../components/proposals/PaymentModal';
import ProposalCarbonCopy from '../../components/proposals/ProposalCarbonCopy';

const STAGE_LABELS = {
  draft: 'Draft', brief_submitted: 'Brief Submitted',
  studio_assigned: 'Studio Assigned', in_production: 'In Production',
  completed: 'Completed', cancelled: 'Cancelled',
};
const STAGE_COLORS = {
  draft:           { bg: 'var(--surface3)',  text: 'var(--text3)'  },
  brief_submitted: { bg: 'var(--amber-dim)', text: 'var(--amber)'  },
  studio_assigned: { bg: 'var(--gold-dim)',  text: 'var(--gold)'   },
  in_production:   { bg: 'var(--teal-dim)',  text: 'var(--teal)'   },
  completed:       { bg: 'var(--green-dim)', text: 'var(--green)'  },
  cancelled:       { bg: 'var(--red-dim)',   text: 'var(--red)'    },
};
const ORDER_TYPES  = { design:'Design', sampling:'Sampling', bulk:'Bulk Production', rerun:'Rerun' };
const ORDER_STATUS = { pending:'Pending', confirmed:'Confirmed', in_progress:'In Progress', dispatched:'Dispatched', delivered:'Delivered', cancelled:'Cancelled' };
const ORDER_STATUS_COLORS = {
  pending:'var(--text3)', confirmed:'var(--amber)', in_progress:'var(--teal)',
  dispatched:'var(--gold)', delivered:'var(--green)', cancelled:'var(--red)',
};

function fmt(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
}
function StageBadge({ stage }) {
  const c = STAGE_COLORS[stage] || STAGE_COLORS.draft;
  return <span style={{ fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:20, background:c.bg, color:c.text, textTransform:'uppercase' }}>{STAGE_LABELS[stage] || stage}</span>;
}
function Tab({ label, active, onClick, count }) {
  return (
    <button onClick={onClick} style={{
      padding:'9px 18px', border:'none',
      borderBottom: active ? '2px solid var(--gold)' : '2px solid transparent',
      background:'none', cursor:'pointer', fontFamily:'var(--font-body)',
      fontSize:13, fontWeight: active ? 600 : 400,
      color: active ? 'var(--gold)' : 'var(--text3)',
      transition:'all 0.15s', marginBottom:-1, display:'flex', alignItems:'center', gap:6,
    }}>
      {label}
      {count > 0 && <span style={{ fontSize:10, background: active ? 'var(--gold)' : 'var(--surface3)', color: active ? '#fff' : 'var(--text3)', borderRadius:10, padding:'1px 6px' }}>{count}</span>}
    </button>
  );
}

// ── Brief tab ──────────────────────────────────────────────────────────────
function BriefTab({ project, onRefresh }) {
  const brief = project.brief || {};
  const [editing, setEditing] = useState(false);
  const [form,    setForm]    = useState({});
  const [saving,  setSaving]  = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors,  setErrors]  = useState({});
  const fileRef = useRef();

  const canEdit = ['draft','brief_submitted'].includes(project.stage);

  const startEdit = () => {
    setForm({
      buyer_brand_name:           brief.buyer_brand_name            || '',
      buyer_location:             brief.buyer_location              || '',
      product_category:           brief.product_category            || '',
      product_description:        brief.product_description         || '',
      bulk_quantity:              brief.bulk_quantity               || '',
      budget_currency:            brief.budget_currency             || 'USD',
      target_landing_price_usd:   brief.target_landing_price_usd   || '',
      target_sample_delivery_date: brief.target_sample_delivery_date || '',
      target_bulk_delivery_date:   brief.target_bulk_delivery_date  || '',
      additional_specs:           brief.additional_specs            || '',
    });
    setErrors({});
    setEditing(true);
  };

  const REQUIRED = [
    'buyer_brand_name', 'buyer_location', 'product_category', 'product_description',
    'bulk_quantity', 'budget_currency', 'target_landing_price_usd',
    'target_sample_delivery_date', 'target_bulk_delivery_date', 'additional_specs',
  ];
  const validate = () => {
    const e = {};
    REQUIRED.forEach(k => { if (!String(form[k] ?? '').trim()) e[k] = true; });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const saveBrief = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await projectsAPI.updateBrief(project.id, {
        ...form,
        bulk_quantity:   form.bulk_quantity   ? parseInt(form.bulk_quantity)   : null,
        target_landing_price_usd:   form.target_landing_price_usd   || null,
        target_sample_delivery_date: form.target_sample_delivery_date || null,
        target_bulk_delivery_date:   form.target_bulk_delivery_date   || null,
      });
      setEditing(false);
      onRefresh();
    } catch {} finally { setSaving(false); }
  };

  const submitBrief = async () => {
    if (!window.confirm('Submit this brief to Qala? They will then assign a studio.')) return;
    setSubmitting(true);
    try {
      await projectsAPI.submitBrief(project.id);
      onRefresh();
    } catch {} finally { setSubmitting(false); }
  };

  const uploadMoodboard = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('file_name', file.name);
    fd.append('mime_type', file.type);
    fd.append('file_size_kb', Math.ceil(file.size / 1024));
    try { await projectsAPI.uploadMoodboard(project.id, fd); onRefresh(); } catch {}
    e.target.value = '';
  };

  const deleteMoodboard = async (mid) => {
    try { await projectsAPI.deleteMoodboard(project.id, mid); onRefresh(); } catch {}
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
      {/* Brief fields */}
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'24px 28px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:600, color:'var(--text)' }}>Brief Details</div>
          {canEdit && !editing && (
            <button onClick={startEdit} className="btn btn-ghost" style={{ fontSize:12 }}>Edit</button>
          )}
        </div>

        {editing ? (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            {[
              ['buyer_brand_name',  'Buyer Name',         'text',   'Maison Éclat'],
              ['buyer_location',    'Location',           'text',   'Paris, France'],
              ['product_category',  'Product Type',       'text',   "Women's RTW"],
              ['bulk_quantity',     'Bulk Qty',           'number', '100'],
              ['budget_currency',   'Buyer Currency',     'text',   'USD'],
              ['target_landing_price_usd',   'Target Landing Price', 'number', '519'],
              ['target_sample_delivery_date','Sample Delivery',     'date',   ''],
              ['target_bulk_delivery_date',  'Bulk Delivery',       'date',   ''],
            ].map(([key, label, type, ph]) => (
              <div key={key} className="field">
                <label style={{ fontSize:11 }}>{label} <span style={{ color:'var(--red)' }}>*</span></label>
                <input type={type} value={form[key] || ''} placeholder={ph}
                  onChange={e => { setForm(f => ({...f, [key]: e.target.value})); setErrors(er => ({...er, [key]: false})); }}
                  style={{ fontSize:13, ...(errors[key] ? { borderColor:'var(--red)' } : {}) }} />
              </div>
            ))}
            <div className="field" style={{ gridColumn:'1 / -1' }}>
              <label style={{ fontSize:11 }}>Product Description <span style={{ color:'var(--red)' }}>*</span></label>
              <textarea rows={3} value={form.product_description || ''}
                onChange={e => { setForm(f => ({...f, product_description: e.target.value})); setErrors(er => ({...er, product_description: false})); }}
                style={{ fontSize:13, resize:'vertical', width:'100%', padding:'9px 12px', borderRadius:8, border:`1px solid ${errors.product_description ? 'var(--red)' : 'var(--border)'}`, background:'var(--surface2)', fontFamily:'var(--font-body)', color:'var(--text)' }} />
            </div>
            <div className="field" style={{ gridColumn:'1 / -1' }}>
              <label style={{ fontSize:11 }}>Additional Notes <span style={{ color:'var(--red)' }}>*</span></label>
              <textarea rows={3} value={form.additional_specs || ''}
                onChange={e => { setForm(f => ({...f, additional_specs: e.target.value})); setErrors(er => ({...er, additional_specs: false})); }}
                style={{ fontSize:13, resize:'vertical', width:'100%', padding:'9px 12px', borderRadius:8, border:`1px solid ${errors.additional_specs ? 'var(--red)' : 'var(--border)'}`, background:'var(--surface2)', fontFamily:'var(--font-body)', color:'var(--text)' }} />
            </div>
            <div style={{ gridColumn:'1 / -1', display:'flex', gap:10, alignItems:'center' }}>
              <button onClick={saveBrief} disabled={saving} className="btn btn-primary" style={{ fontSize:13 }}>{saving ? 'Saving…' : 'Save Brief'}</button>
              <button onClick={() => setEditing(false)} className="btn btn-ghost" style={{ fontSize:13 }}>Cancel</button>
              {Object.keys(errors).some(k => errors[k]) && (
                <span style={{ fontSize:12, color:'var(--red)' }}>Please fill all required fields.</span>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            {[
              ['Buyer Name',          brief.buyer_brand_name || '—'],
              ['Location',            brief.buyer_location   || '—'],
              ['Product Type',        brief.product_category  || '—'],
              ['Bulk Qty',            brief.bulk_quantity    ? `${brief.bulk_quantity} sets`  : '—'],
              ['Buyer Currency',      brief.budget_currency  || '—'],
              ['Target Landing Price', brief.target_landing_price_usd ? `$${Number(brief.target_landing_price_usd).toLocaleString()}` : '—'],
              ['Sample Delivery',     brief.target_sample_delivery_date || '—'],
              ['Bulk Delivery',       brief.target_bulk_delivery_date   || '—'],
            ].map(([label, val]) => (
              <div key={label}>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--text4)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>{label}</div>
                <div style={{ fontSize:14, color:'var(--text)' }}>{val}</div>
              </div>
            ))}
            {brief.materials_keywords?.length > 0 && (
              <div style={{ gridColumn:'1 / -1' }}>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--text4)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>Materials / Keywords</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {brief.materials_keywords.map(k => <span key={k} style={{ fontSize:11, padding:'3px 9px', background:'var(--surface3)', borderRadius:20, color:'var(--text2)' }}>{k}</span>)}
                </div>
              </div>
            )}
            {brief.product_description && (
              <div style={{ gridColumn:'1 / -1' }}>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--text4)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>Product Description</div>
                <div style={{ fontSize:14, color:'var(--text)', lineHeight:1.65 }}>{brief.product_description}</div>
              </div>
            )}
            {brief.additional_specs && (
              <div style={{ gridColumn:'1 / -1' }}>
                <div style={{ fontSize:10, fontWeight:700, color:'var(--text4)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>Additional Notes</div>
                <div style={{ fontSize:14, color:'var(--text)', lineHeight:1.65, whiteSpace:'pre-wrap' }}>{brief.additional_specs}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Moodboards */}
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'24px 28px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:600, color:'var(--text)' }}>Moodboards</div>
          {canEdit && (
            <>
              <input ref={fileRef} type="file" accept="image/*,.pdf" onChange={uploadMoodboard} style={{ display:'none' }} />
              <button onClick={() => fileRef.current?.click()} className="btn btn-ghost" style={{ fontSize:12 }}>+ Upload</button>
            </>
          )}
        </div>
        {(brief.moodboards || []).length === 0 ? (
          <div style={{ fontSize:13, color:'var(--text4)', fontStyle:'italic' }}>No moodboards uploaded yet.</div>
        ) : (
          <div style={{ display:'flex', flexWrap:'wrap', gap:12 }}>
            {(brief.moodboards || []).map(m => (
              <div key={m.id} style={{ position:'relative', width:100, height:100, borderRadius:8, overflow:'hidden', border:'1px solid var(--border)', background:'var(--surface2)' }}>
                {m.mime_type?.startsWith('image/') ? (
                  <img src={m.url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                ) : (
                  <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28 }}>📄</div>
                )}
                {canEdit && (
                  <button onClick={() => deleteMoodboard(m.id)} style={{
                    position:'absolute', top:4, right:4,
                    background:'rgba(0,0,0,0.6)', border:'none', color:'#fff',
                    width:20, height:20, borderRadius:'50%', fontSize:12,
                    cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
                  }}>×</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit button */}
      {canEdit && (
        <button onClick={submitBrief} disabled={submitting} className="btn btn-primary" style={{ fontSize:14, padding:'12px 28px', alignSelf:'flex-start' }}>
          {submitting ? 'Submitting…' : 'Submit Brief to Qala →'}
        </button>
      )}
    </div>
  );
}

// ── Proposals tab ──────────────────────────────────────────────────────────
// Renders each proposal via the shared ProposalCarbonCopy component — the
// exact same prototype-exact rendering used by the public /p/:token page.
// This used to be a separate, much simpler hand-built card here that had
// drifted completely from the prototype (no concept box, no cost
// accordion, no real timeline, plain bullet-list terms, no persistent
// payment-status section). Rather than hand-maintain two copies of the
// same rendering, this now reuses the one verified implementation.
function ProposalsTab({ project, onRefresh }) {
  const proposals = project.proposals || [];
  const visible   = proposals.filter(p => ['sent_to_buyer','accepted','declined','negotiating'].includes(p.status));

  if (visible.length === 0) return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'40px 32px', textAlign:'center' }}>
      <div style={{ fontSize:32, marginBottom:12 }}>📬</div>
      <div style={{ fontSize:14, color:'var(--text3)' }}>No proposals received yet. Qala will share one once a studio responds to your brief.</div>
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
      {visible.map(p => (
        <div key={p.id} style={{ border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
          <ProposalCarbonCopy
            proposal={p}
            embedded
            navContext={`${project.name} · ${p.studio_name}`}
            onAccept={async (notes) => {
              await projectsAPI.acceptProposal(project.id, p.id, { notes });
              onRefresh();
            }}
            onAction={async (type, message) => {
              const payload = { type };
              if (type === 'question' || type === 'changes_requested') payload.message = message;
              if (type === 'declined' && message) payload.message = message;
              await projectsAPI.actOnProposal(project.id, p.id, payload);
              onRefresh();
            }}
          />
        </div>
      ))}
    </div>
  );
}

// ── Orders tab ─────────────────────────────────────────────────────────────
function OrdersTab({ project }) {
  const orders = project.orders || [];
  if (orders.length === 0) return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'40px 32px', textAlign:'center' }}>
      <div style={{ fontSize:32, marginBottom:12 }}>📦</div>
      <div style={{ fontSize:14, color:'var(--text3)' }}>No orders yet. Orders will appear here once your project is in production.</div>
    </div>
  );
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      {orders.map(o => (
        <div key={o.id} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'20px 24px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, flexWrap:'wrap', gap:8 }}>
            <div style={{ display:'flex', gap:10, alignItems:'center' }}>
              <div style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:600, color:'var(--text)' }}>{ORDER_TYPES[o.order_type] || o.order_type}</div>
              <span style={{ fontSize:11, fontWeight:600, color: ORDER_STATUS_COLORS[o.status] || 'var(--text3)', background:'var(--surface2)', padding:'2px 8px', borderRadius:6 }}>{ORDER_STATUS[o.status] || o.status}</span>
            </div>
            <div style={{ fontSize:12, color:'var(--text4)' }}>{fmt(o.created_at)}</div>
          </div>
          <div style={{ display:'flex', gap:24, flexWrap:'wrap' }}>
            {o.committed_dispatch_date && <div><div style={{ fontSize:10, color:'var(--text4)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:3 }}>Dispatch</div><div style={{ fontSize:13, color:'var(--text2)' }}>{fmt(o.committed_dispatch_date)}</div></div>}
            {o.estimated_delivery_date && <div><div style={{ fontSize:10, color:'var(--text4)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:3 }}>Est. Delivery</div><div style={{ fontSize:13, color:'var(--text2)' }}>{fmt(o.estimated_delivery_date)}</div></div>}
            {o.carrier && <div><div style={{ fontSize:10, color:'var(--text4)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:3 }}>Carrier</div><div style={{ fontSize:13, color:'var(--text2)' }}>{o.carrier}</div></div>}
            {o.awb_number && <div><div style={{ fontSize:10, color:'var(--text4)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:3 }}>AWB</div><div style={{ fontSize:13, color:'var(--gold)', fontFamily:'monospace' }}>{o.awb_number}</div></div>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Activity tab ───────────────────────────────────────────────────────────
function ActivityTab({ project }) {
  const logs = project.activity || [];
  if (logs.length === 0) return <div style={{ fontSize:13, color:'var(--text4)' }}>No activity yet.</div>;
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
      {logs.map((log, i) => (
        <div key={log.id} style={{ display:'flex', gap:16, paddingBottom:20, position:'relative' }}>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0 }}>
            <div style={{ width:10, height:10, borderRadius:'50%', background:'var(--gold)', border:'2px solid var(--bg)', zIndex:1 }} />
            {i < logs.length - 1 && <div style={{ width:1, flex:1, background:'var(--border)', marginTop:4 }} />}
          </div>
          <div style={{ paddingTop:0 }}>
            <div style={{ fontSize:13, color:'var(--text)', marginBottom:2 }}>{log.description}</div>
            <div style={{ fontSize:11, color:'var(--text4)' }}>{fmt(log.created_at)} · {log.actor_role}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Contracts tab ──────────────────────────────────────────────────────────
function ContractsTab({ project }) {
  const contracts = project.contracts || [];
  if (contracts.length === 0) return <div style={{ fontSize:13, color:'var(--text4)', fontStyle:'italic' }}>No contracts uploaded yet.</div>;
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      {contracts.map(c => (
        <div key={c.id} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'14px 18px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontSize:13, fontWeight:500, color:'var(--text)', marginBottom:3 }}>{c.file_name}</div>
            <div style={{ fontSize:11, color:'var(--text4)' }}>{c.contract_type?.replace(/_/g,' ')} · {fmt(c.uploaded_at)}</div>
          </div>
          {c.url && (
            <a href={c.url} target="_blank" rel="noopener noreferrer" style={{ fontSize:12, color:'var(--gold)', textDecoration:'none', padding:'6px 14px', background:'var(--gold-dim)', borderRadius:6, border:'1px solid rgba(200,165,90,0.2)' }}>
              View →
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function ProjectDetail() {
  const { projectId } = useParams();
  const nav           = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState('brief');

  const load = () => {
    setLoading(true);
    projectsAPI.getProject(projectId)
      .then(r => setProject(r.data.project))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [projectId]);

  if (loading) return <div style={{ padding:40, color:'var(--text3)', fontSize:14 }}>Loading…</div>;
  if (!project) return <div style={{ padding:40, color:'var(--red)', fontSize:14 }}>Project not found.</div>;

  const tabCounts = {
    proposals: (project.proposals || []).filter(p => ['sent_to_buyer','accepted','declined','negotiating'].includes(p.status)).length,
    orders:    (project.orders    || []).length,
    contracts: (project.contracts || []).length,
    activity:  (project.activity  || []).length,
  };

  return (
    <div style={{ padding:'clamp(20px, 3vw, 40px) clamp(16px, 4vw, 48px)' }}>
      {/* Back */}
      <button onClick={() => nav('/buyer/projects')} style={{ background:'none', border:'none', color:'var(--text3)', fontSize:13, cursor:'pointer', marginBottom:20, padding:0, display:'flex', alignItems:'center', gap:6 }}>
        ← All Projects
      </button>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:30, fontWeight:700, color:'var(--text)', marginBottom:8 }}>{project.name}</h1>
          <div style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
            <StageBadge stage={project.stage} />
            {project.studio_name && <span style={{ fontSize:13, color:'var(--text3)' }}>Studio: <span style={{ color:'var(--gold)' }}>{project.studio_name}</span></span>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom:'1px solid var(--border)', marginBottom:28, display:'flex', gap:0, overflowX:'auto' }}>
        {[['brief','Brief'],['proposals','Proposals'],['orders','Orders'],['contracts','Contracts'],['activity','Activity']].map(([key, label]) => (
          <Tab key={key} label={label} active={tab===key} onClick={() => setTab(key)} count={tabCounts[key] || 0} />
        ))}
      </div>

      {/* Tab content */}
      {tab === 'brief'     && <BriefTab     project={project} onRefresh={load} />}
      {tab === 'proposals' && <ProposalsTab project={project} onRefresh={load} />}
      {tab === 'orders'    && <OrdersTab    project={project} />}
      {tab === 'contracts' && <ContractsTab project={project} />}
      {tab === 'activity'  && <ActivityTab  project={project} />}
    </div>
  );
}
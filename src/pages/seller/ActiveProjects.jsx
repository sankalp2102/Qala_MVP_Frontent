// src/pages/seller/ActiveProjects.jsx
//
// Restyled against seller-console.html's Projects view — sticky topbar,
// filter row, project-list-card rows with a real scope/progress pill
// track. This page was previously built independently of that prototype
// (giant hero header, no filter row, no pill track) — this pass brings
// the visual language in line with every other seller page
// (SellerHome/ActivityHistory/EnquiryDetail/OrderDetail/Earnings/
// SellerProfile/SellerSettings all already match it).
//
// One thing deliberately NOT copied: the prototype's separate
// "Project Detail" page and its "Completed" filter tab. There's no
// live route for a standalone project-detail page, and
// SellerActiveProjectsView only ever returns studio_assigned/
// in_production projects — completed/cancelled ones aren't fetched
// here at all. Rather than add a route or fabricate a Completed tab
// with nothing behind it (that's a feature, not a restyle), this keeps
// the existing click-to-expand-in-place interaction and a filter row
// built only from the real stages this endpoint actually returns.
//
// The scope/progress pill track is real, not decorative: it's derived
// from each project's actual orders (type + status), not a fixed
// 5-stage placeholder — a project with only a Design order shows only
// a Design pill, done/current per that order's real status.

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectsAPI } from '../../api/client';

const ORDER_TYPES  = { design:'Design', sampling:'Sampling', bulk:'Bulk Production', rerun:'Rerun' };
const ORDER_STATUS_COLORS = {
  pending:'var(--text3)', confirmed:'var(--amber)', in_progress:'var(--teal)',
  dispatched:'var(--gold)', delivered:'var(--green)', cancelled:'var(--red)',
};
// Short pill label for the scope track — "Bulk Production" is too long for
// a compact pill; the prototype's own track uses one-word stage names.
const SCOPE_LABEL = { design:'Design', sampling:'Sample', bulk:'Production', rerun:'Rerun' };
const STAGE_LABEL = { studio_assigned:'Studio Assigned', in_production:'In Production' };

// Feature (visual parity pass): one pill per DISTINCT real order type on
// this project, in a fixed craft order, state derived from that order's
// actual status — not a fabricated 5-stage placeholder track.
function ScopeTrack({ orders }) {
  const order = ['design', 'sampling', 'bulk', 'rerun'];
  const present = order.filter(t => orders.some(o => o.order_type === t));
  if (present.length === 0) return null;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:6, flexWrap:'wrap' }}>
      {present.map((t, i) => {
        const o = orders.find(x => x.order_type === t);
        const done = ['delivered', 'dispatched'].includes(o.status);
        const active = ['pending', 'confirmed', 'in_progress'].includes(o.status);
        return (
          <span key={t} style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
            <span style={{
              fontSize: 10.5, fontWeight: 600, padding: '2px 9px', borderRadius: 'var(--r-20)',
              background: done ? 'var(--green-dim)' : active ? 'var(--gold-dim)' : 'var(--surface2)',
              color: done ? 'var(--green)' : active ? 'var(--gold)' : 'var(--text4)',
              border: `1px solid ${done ? 'var(--green)' : active ? 'var(--gold)' : 'var(--border2)'}`,
            }}>
              {SCOPE_LABEL[t]}{done ? ' ✓' : active ? ' →' : ''}
            </span>
            {i < present.length - 1 && <span style={{ color:'var(--text4)', fontSize:11 }}>·</span>}
          </span>
        );
      })}
    </div>
  );
}

function fmt(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
}

function DispatchModal({ order, projectId, onClose, onDone }) {
  const [form, setForm] = useState({
    committed_dispatch_date: order.committed_dispatch_date || '',
    carrier:    order.carrier    || '',
    awb_number: order.awb_number || '',
    notes:      order.notes      || '',
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await projectsAPI.dispatchOrder(projectId, order.id, form);
      onDone();
      onClose();
    } catch { setSaving(false); }
  };

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:8000, background:'rgba(26,14,8,0.6)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'var(--surface)', borderRadius: 'var(--r-16)', padding:'28px 32px', width:'100%', maxWidth:440, border:'1px solid var(--border)' }}>
        <div style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:600, color:'var(--text)', marginBottom:20 }}>Update Dispatch</div>
        {[
          ['committed_dispatch_date', 'Dispatch Date', 'date'],
          ['carrier',    'Carrier',    'text'],
          ['awb_number', 'AWB Number', 'text'],
        ].map(([key, label, type]) => (
          <div key={key} className="field" style={{ marginBottom:14 }}>
            <label style={{ fontSize:12 }}>{label}</label>
            <input type={type} value={form[key]} onChange={e => setForm(f => ({...f, [key]: e.target.value}))} style={{ fontSize:13 }} />
          </div>
        ))}
        <div className="field" style={{ marginBottom:20 }}>
          <label style={{ fontSize:12 }}>Notes</label>
          <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))}
            style={{ width:'100%', padding:'9px 12px', borderRadius: 'var(--r-8)', border:'1px solid var(--border)', background:'var(--surface2)', fontFamily:'var(--font-body)', fontSize:13, color:'var(--text)', resize:'vertical' }} />
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={save} disabled={saving} className="btn btn-primary" style={{ fontSize:13, flex:1 }}>{saving ? 'Saving…' : 'Mark as Dispatched'}</button>
          <button onClick={onClose} className="btn btn-ghost" style={{ fontSize:13 }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function ActiveProjects() {
  const nav = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [dispatch, setDispatch] = useState(null); // { order, projectId }
  const [expanded, setExpanded] = useState({});

  const load = () => {
    setLoading(true);
    projectsAPI.getActiveProjects()
      .then(r => setProjects(r.data.projects || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggle = (id) => setExpanded(e => ({...e, [id]: !e[id]}));
  const [filter, setFilter] = useState('all');
  const visible = filter === 'all' ? projects : projects.filter(p => p.stage === filter);
  const counts = {
    all: projects.length,
    studio_assigned: projects.filter(p => p.stage === 'studio_assigned').length,
    in_production: projects.filter(p => p.stage === 'in_production').length,
  };

  if (loading) return <div style={{ padding:40, color:'var(--text3)', fontSize:14 }}>Loading…</div>;

  return (
    <div>
      <div style={{ height:56, borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', padding:'0 28px' }}>
        <div style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:600 }}>Projects</div>
      </div>
      <div style={{ padding:28 }}>
      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontFamily:'var(--font-display)', fontSize:26, fontWeight:600, color:'var(--text)', marginBottom:6 }}>Projects</h1>
        <p style={{ fontSize:13, color:'var(--text3)' }}>All your projects with an accepted proposal — click one to see its orders.</p>
      </div>

      {projects.length > 0 && (
        <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
          {[['all', `All (${counts.all})`], ['studio_assigned', `Studio Assigned (${counts.studio_assigned})`], ['in_production', `In Production (${counts.in_production})`]].map(([key, label]) => (
            <div key={key} onClick={() => setFilter(key)} style={{
              padding:'6px 14px', borderRadius:'var(--r-20)', fontSize:12, fontWeight:500, cursor:'pointer',
              border:`1px solid ${filter === key ? 'var(--gold)' : 'var(--border2)'}`,
              background: filter === key ? 'var(--gold)' : 'transparent',
              color: filter === key ? '#fff' : 'var(--text2)',
            }}>{label}</div>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius: 'var(--r-lg)', padding:'48px 32px', textAlign:'center' }}>
          <div style={{ fontSize:40, marginBottom:16 }}>🏭</div>
          <div style={{ fontFamily:'var(--font-display)', fontSize:22, color:'var(--text)', marginBottom:8 }}>{projects.length === 0 ? 'No active projects' : 'No projects in this view'}</div>
          <p style={{ fontSize:14, color:'var(--text3)' }}>{projects.length === 0 ? 'Projects will appear here once a buyer accepts your proposal.' : 'Try a different filter above.'}</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {visible.map(p => {
            const orders = p.orders || [];
            const acceptedProposal = (p.proposals || []).find(x => x.status === 'accepted');
            const isExpanded = expanded[p.id];
            return (
              <div key={p.id} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow:'hidden' }}>
                {/* Project header — plc-title / plc-meta / scope pills, matching the
                    prototype's project-list-card row; the ▾/▴ toggle replaces the
                    prototype's "View Project →" link, since there's no separate
                    detail route to link to — this project's own orders expand
                    in place instead. */}
                <div style={{ padding:'18px 22px', display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:16, cursor:'pointer' }} onClick={() => toggle(p.id)}>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontFamily:'var(--font-display)', fontSize:17, fontWeight:600, color:'var(--text)', marginBottom:3 }}>{p.name}</div>
                    <div style={{ fontSize:12, color:'var(--text3)' }}>
                      {p.buyer_name ? `${p.buyer_name} · ` : ''}{orders.length} order{orders.length !== 1 ? 's' : ''} · Updated {fmt(p.updated_at)}
                    </div>
                    <ScopeTrack orders={orders} />
                  </div>
                  <div style={{ display:'flex', gap:10, alignItems:'center', flexShrink:0 }}>
                    <span style={{ fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius: 'var(--r-20)', background: p.stage === 'in_production' ? 'var(--gold-dim)' : 'var(--amber-dim)', color: p.stage === 'in_production' ? 'var(--gold)' : 'var(--amber)' }}>
                      {STAGE_LABEL[p.stage] || p.stage?.replace(/_/g,' ')}
                    </span>
                    <button className="btn btn-sm btn-outline" onClick={e => { e.stopPropagation(); toggle(p.id); }}>
                      {isExpanded ? 'Hide Details ▴' : 'View Details ▾'}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ borderTop:'1px solid var(--border)', padding:'20px 24px' }}>
                    {/* Accepted proposal summary */}
                    {acceptedProposal && (
                      <div style={{ background:'var(--surface2)', borderRadius: 'var(--r-10)', padding:'14px 18px', marginBottom:20, display:'flex', gap:24, flexWrap:'wrap' }}>
                        <div style={{ fontSize:10, color:'var(--gold)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', width:'100%', marginBottom:4 }}>Accepted Proposal</div>
                        {[['Sampling', acceptedProposal.costing_sampling],['Bulk', acceptedProposal.costing_bulk]].filter(([,v])=>v).map(([l,v])=>(
                          <div key={l}><div style={{ fontSize:10, color:'var(--text4)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:3 }}>{l} Cost</div><div style={{ fontSize:14, fontWeight:600, color:'var(--text)' }}>{acceptedProposal.costing_currency} {Number(v).toLocaleString()}</div></div>
                        ))}
                        {[['Sampling', acceptedProposal.timeline_sampling_weeks],['Bulk', acceptedProposal.timeline_bulk_weeks]].filter(([,v])=>v).map(([l,v])=>(
                          <div key={`t-${l}`}><div style={{ fontSize:10, color:'var(--text4)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:3 }}>{l} Timeline</div><div style={{ fontSize:14, fontWeight:600, color:'var(--text)' }}>{v} weeks</div></div>
                        ))}
                      </div>
                    )}

                    {/* Orders */}
                    {orders.length === 0 ? (
                      <div style={{ fontSize:13, color:'var(--text4)', fontStyle:'italic' }}>No orders created yet. Qala will create orders once the project starts.</div>
                    ) : (
                      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                        <div style={{ fontSize:11, fontWeight:700, color:'var(--text4)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>Orders</div>
                        {orders.map(o => (
                          <div key={o.id} style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius: 'var(--r-10)', padding:'14px 18px' }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10, flexWrap:'wrap', gap:8 }}>
                              <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                                <span style={{ fontSize:14, fontWeight:600, color:'var(--text)' }}>{ORDER_TYPES[o.order_type] || o.order_type}</span>
                                <span style={{ fontSize:11, fontWeight:600, color: ORDER_STATUS_COLORS[o.status] || 'var(--text3)', background:'var(--surface)', padding:'2px 8px', borderRadius: 'var(--r)' }}>
                                  {o.status?.replace(/_/g,' ')}
                                </span>
                              </div>
                              {['pending','confirmed','in_progress'].includes(o.status) && o.order_type !== 'design' && (
                                <button onClick={() => setDispatch({ order:o, projectId:p.id })} className="btn btn-primary" style={{ fontSize:12, padding:'6px 14px' }}>
                                  Update Dispatch
                                </button>
                              )}
                            </div>
                            <div style={{ display:'flex', gap:20, flexWrap:'wrap' }}>
                              {o.committed_dispatch_date && <div><div style={{ fontSize:10, color:'var(--text4)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:2 }}>Dispatch</div><div style={{ fontSize:13, color:'var(--text2)' }}>{fmt(o.committed_dispatch_date)}</div></div>}
                              {o.estimated_delivery_date && <div><div style={{ fontSize:10, color:'var(--text4)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:2 }}>Est. Delivery</div><div style={{ fontSize:13, color:'var(--text2)' }}>{fmt(o.estimated_delivery_date)}</div></div>}
                              {o.awb_number && <div><div style={{ fontSize:10, color:'var(--text4)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:2 }}>AWB</div><div style={{ fontSize:13, color:'var(--gold)', fontFamily:'monospace' }}>{o.awb_number}</div></div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {dispatch && (
        <DispatchModal
          order={dispatch.order}
          projectId={dispatch.projectId}
          onClose={() => setDispatch(null)}
          onDone={load}
        />
      )}
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectsAPI } from '../../api/client';

const ORDER_TYPES  = { design:'Design', sampling:'Sampling', bulk:'Bulk Production', rerun:'Rerun' };
const ORDER_STATUS_COLORS = {
  pending:'var(--text3)', confirmed:'var(--amber)', in_progress:'var(--teal)',
  dispatched:'var(--gold)', delivered:'var(--green)', cancelled:'var(--red)',
};

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

  if (loading) return <div style={{ padding:40, color:'var(--text3)', fontSize:14 }}>Loading…</div>;

  return (
    <div style={{ padding:'clamp(20px, 3vw, 40px) clamp(16px, 4vw, 48px)' }}>
      <div style={{ marginBottom:32 }}>
        <h1 style={{ fontFamily:'var(--font-display)', fontSize:36, fontWeight:700, color:'var(--text)', marginBottom:6 }}>
          Active <em style={{ color:'var(--gold)' }}>Projects</em>
        </h1>
        <p style={{ fontSize:14, color:'var(--text3)' }}>Projects where your proposal has been accepted and work is underway.</p>
      </div>

      {projects.length === 0 ? (
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius: 'var(--r-lg)', padding:'48px 32px', textAlign:'center' }}>
          <div style={{ fontSize:40, marginBottom:16 }}>🏭</div>
          <div style={{ fontFamily:'var(--font-display)', fontSize:22, color:'var(--text)', marginBottom:8 }}>No active projects</div>
          <p style={{ fontSize:14, color:'var(--text3)' }}>Projects will appear here once a buyer accepts your proposal.</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {projects.map(p => {
            const orders = p.orders || [];
            const acceptedProposal = (p.proposals || []).find(x => x.status === 'accepted');
            const isExpanded = expanded[p.id];
            return (
              <div key={p.id} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow:'hidden' }}>
                {/* Project header */}
                <div style={{ padding:'20px 24px', display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer' }} onClick={() => toggle(p.id)}>
                  <div>
                    <div style={{ fontFamily:'var(--font-display)', fontSize:17, fontWeight:600, color:'var(--text)', marginBottom:4 }}>{p.name}</div>
                    <div style={{ fontSize:12, color:'var(--text3)' }}>
                      {orders.length} order{orders.length !== 1 ? 's' : ''} · Updated {fmt(p.updated_at)}
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                    <span style={{ fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius: 'var(--r-20)', background:'var(--teal-dim)', color:'var(--teal)', textTransform:'uppercase' }}>
                      {p.stage?.replace(/_/g,' ')}
                    </span>
                    <span style={{ color:'var(--text4)', fontSize:18, transition:'transform 0.2s', display:'inline-block', transform: isExpanded ? 'rotate(180deg)' : 'none' }}>▾</span>
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
  );
}
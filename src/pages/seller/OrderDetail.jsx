// src/pages/seller/OrderDetail.jsx
//
// Rebuilt against seller-console__2_.html's Order Detail view — stage
// track, phase tracker sidebar, update log, plus the Delay and Pickup
// modals from the same prototype file.
//
// Real backing added this session (see PLACEMENT_GUIDE): Order.stage_log,
// Order.boxes/pickup_*, Order.delay_reason — none of these existed before,
// so nothing here is fabricated. STAGE_DEFINITIONS below is a UI-level
// concept (which stages exist per order type) — the actual completion
// state (which ones are done, when, with what note) is 100% real,
// persisted via POST .../stage/.
//
// Not backed and deliberately omitted rather than faked: the prototype's
// "bonus nudge" (2% early-dispatch bonus banner) — no bonus-calculation
// logic exists anywhere in the backend. Would need a real rule (checked
// against Order.committed_dispatch_date vs actual dispatch) before this
// could show a real number instead of a hardcoded one.

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectsAPI } from '../../api/client';

const STAGE_DEFINITIONS = {
  design: [
    'Order placed & confirmed',
    'Design work started',
    'Initial concepts & references ready',
    'Final tech pack & files complete',
    'Delivered to Qala',
  ],
  sampling: [
    'Order placed & confirmed',
    'Sampling started',
    'Samples ready for dispatch',
    'Samples dispatched',
  ],
  bulk: [
    'Order placed & confirmed',
    'Production started',
    'QC complete',
    'Ready for pickup',
    'Dispatched',
  ],
  rerun: [
    'Order placed & confirmed',
    'Production started',
    'Ready for pickup',
    'Dispatched',
  ],
};

const S = {
  topbar: { height: 56, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 28px' },
  topbarTitle: { fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600 },
  content: { padding: 28 },
  breadcrumb: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text3)', marginBottom: 20, cursor: 'pointer' },

  card: { background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--r-10)', overflow: 'hidden', marginBottom: 16 },
  cardHeader: { padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  cardHeaderSm: { padding: '12px 16px', borderBottom: '1px solid var(--border)' },
  cardBody: { padding: 20 },

  badge: (bg, color) => ({ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 'var(--r-20)', fontSize: 11, fontWeight: 600 }),
  detailLabel: { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text4)', marginBottom: 4 },
  detailValue: { fontSize: 14, color: 'var(--text)' },

  stageItem: { display: 'flex', gap: 12 },
  stageSpine: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  stageDot: (state) => ({ width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0, background: state === 'done' ? 'var(--green)' : state === 'current' ? 'var(--gold)' : 'var(--surface2)', color: state === 'future' ? 'var(--text4)' : '#fff', border: state === 'future' ? '1.5px solid var(--border2)' : 'none' }),
  stageLine: { width: 2, flex: 1, background: 'var(--border2)', minHeight: 24, margin: '2px 0' },
  stageTitle: (state) => ({ fontSize: 13, fontWeight: 600, color: state === 'future' ? 'var(--text4)' : 'var(--text)' }),
  stageTs: { fontSize: 11, color: 'var(--text4)', marginTop: 2 },

  input: { width: '100%', background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 'var(--r)', fontSize: 13, color: 'var(--text)', padding: '7px 10px', outline: 'none', boxSizing: 'border-box', resize: 'vertical' },

  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(15,12,20,.42)', zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modal: { background: 'var(--bg)', borderRadius: 'var(--r-lg)', width: '100%', maxWidth: 460, boxShadow: '0 12px 48px rgba(0,0,0,.22)' },
  modalWide: { maxWidth: 660 },
  modalHead: { padding: '18px 20px 14px', borderBottom: '1px solid var(--border)' },
  modalTitle: { fontSize: 15, fontWeight: 600, color: 'var(--text)' },
  modalSub: { fontSize: 12, color: 'var(--text3)', marginTop: 6, lineHeight: 1.5 },
  modalBody: { padding: '16px 20px' },
  modalFoot: { padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'flex-end' },
  fg: { marginBottom: 14 },
  fl: { fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginBottom: 6, display: 'block' },
};

function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'; }
function fmtDateTime(d) { return d ? new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'; }

function DelayModal({ order, projectId, onClose, onDone }) {
  const [reason, setReason] = useState('');
  const [newDate, setNewDate] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (!reason.trim() || !newDate) return;
    setSaving(true);
    try {
      await projectsAPI.delayOrder(projectId, order.id, { committed_dispatch_date: newDate, delay_reason: reason });
      onDone();
    } finally { setSaving(false); }
  };
  return (
    <div style={S.modalOverlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={S.modal}>
        <div style={S.modalHead}>
          <div style={S.modalTitle}>Adjust your timeline</div>
          <div style={S.modalSub}>Things come up — that's okay. Tell us what's happening and when you'll be ready. We'll handle the communication with the buyer and keep everything on track.</div>
        </div>
        <div style={S.modalBody}>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 14 }}>{order.order_type} order</div>
          <div style={S.fg}>
            <label style={S.fl}>Reason for delay <span style={{ color: 'var(--red)' }}>*</span></label>
            <textarea style={S.input} rows={3} placeholder="e.g. Fabric sourcing delayed by 4 days due to supplier issue" value={reason} onChange={e => setReason(e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div><label style={S.fl}>Original dispatch date</label><input style={{ ...S.input, background: 'var(--surface)', color: 'var(--text3)' }} type="text" readOnly value={fmtDate(order.committed_dispatch_date)} /></div>
            <div><label style={S.fl}>New proposed date <span style={{ color: 'var(--red)' }}>*</span></label><input style={S.input} type="date" value={newDate} onChange={e => setNewDate(e.target.value)} /></div>
          </div>
          <div style={{ display: 'flex', gap: 8, background: 'var(--amber-dim)', border: '1px solid rgba(200,138,40,.18)', borderRadius: 'var(--r)', padding: '9px 12px', fontSize: 12, color: 'var(--amber)', lineHeight: 1.5 }}>
            The buyer will be notified and can accept the new date or escalate to Qala.
          </div>
        </div>
        <div style={S.modalFoot}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={saving || !reason.trim() || !newDate} onClick={submit}>{saving ? 'Updating…' : 'Update my timeline'}</button>
        </div>
      </div>
    </div>
  );
}

function PickupModal({ order, projectId, onClose, onDone }) {
  const [boxes, setBoxes] = useState([{ contents: '', length_cm: '', width_cm: '', height_cm: '', weight_kg: '' }]);
  const [pickupDate, setPickupDate] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const updateBox = (i, field, val) => setBoxes(bs => bs.map((b, j) => j === i ? { ...b, [field]: val } : b));
  const addBox = () => setBoxes(bs => [...bs, { contents: '', length_cm: '', width_cm: '', height_cm: '', weight_kg: '' }]);
  const removeBox = (i) => setBoxes(bs => bs.length > 1 ? bs.filter((_, j) => j !== i) : bs);

  const submit = async () => {
    if (!pickupDate || boxes.some(b => !b.contents)) return;
    setSaving(true);
    try {
      await projectsAPI.schedulePickup(projectId, order.id, { boxes, pickup_date: pickupDate, pickup_address: address, pickup_notes: notes });
      onDone();
    } finally { setSaving(false); }
  };

  return (
    <div style={S.modalOverlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ ...S.modal, ...S.modalWide }}>
        <div style={S.modalHead}>
          <div style={S.modalTitle}>Schedule Pickup</div>
          <div style={S.modalSub}>Add details for each box. Qala reviews and books the courier — shipping label and packing list sent to you within 24 hours.</div>
        </div>
        <div style={S.modalBody}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text2)', marginBottom: 14 }}>{order.order_type} order</div>
          <div style={{ display: 'grid', gridTemplateColumns: '20px 2fr 1fr 1fr 1fr 1fr 24px', gap: 6, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text4)', marginBottom: 6 }}>
            <div></div><div>Contents</div><div style={{ textAlign: 'center' }}>L cm</div><div style={{ textAlign: 'center' }}>W cm</div><div style={{ textAlign: 'center' }}>H cm</div><div style={{ textAlign: 'center' }}>Wt kg</div><div></div>
          </div>
          {boxes.map((b, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '20px 2fr 1fr 1fr 1fr 1fr 24px', gap: 6, alignItems: 'center', marginBottom: 6 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)' }}>{i + 1}</div>
              <input style={S.input} type="text" placeholder="e.g. Linen shirts in polybags" value={b.contents} onChange={e => updateBox(i, 'contents', e.target.value)} />
              <input style={{ ...S.input, textAlign: 'center' }} type="number" value={b.length_cm} onChange={e => updateBox(i, 'length_cm', e.target.value)} />
              <input style={{ ...S.input, textAlign: 'center' }} type="number" value={b.width_cm} onChange={e => updateBox(i, 'width_cm', e.target.value)} />
              <input style={{ ...S.input, textAlign: 'center' }} type="number" value={b.height_cm} onChange={e => updateBox(i, 'height_cm', e.target.value)} />
              <input style={{ ...S.input, textAlign: 'center' }} type="number" step="0.1" value={b.weight_kg} onChange={e => updateBox(i, 'weight_kg', e.target.value)} />
              <button style={{ background: 'none', border: 'none', color: 'var(--text4)', cursor: 'pointer' }} onClick={() => removeBox(i)}>✕</button>
            </div>
          ))}
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 4, fontSize: 12 }} onClick={addBox}>+ Add another box</button>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 10, marginBottom: 14 }}>Total boxes: <strong>{boxes.length}</strong></div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div><label style={S.fl}>Requested dispatch date <span style={{ color: 'var(--red)' }}>*</span></label><input style={S.input} type="date" value={pickupDate} onChange={e => setPickupDate(e.target.value)} /></div>
            <div><label style={S.fl}>Pickup address</label><input style={S.input} type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Studio address" /></div>
          </div>
          <div style={S.fg}><label style={S.fl}>Notes for courier (optional)</label><textarea style={S.input} rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Fragile, preferred pickup window 10am–2pm" /></div>
          <div style={{ display: 'flex', gap: 8, background: 'var(--green-dim)', border: '1px solid rgba(46,158,98,.18)', borderRadius: 'var(--r)', padding: '9px 12px', fontSize: 12, color: 'var(--green)', lineHeight: 1.5 }}>
            Qala will review and confirm the pickup within 24 hours. You'll also receive export docs to print and hand to the courier.
          </div>
        </div>
        <div style={S.modalFoot}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={saving || !pickupDate || boxes.some(b => !b.contents)} onClick={submit}>{saving ? 'Submitting…' : 'Submit Pickup Request'}</button>
        </div>
      </div>
    </div>
  );
}

export default function OrderDetail() {
  const { projectId, orderId } = useParams();
  const nav = useNavigate();
  const [project, setProject] = useState(null);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [marking, setMarking] = useState(false);
  const [showDelay, setShowDelay] = useState(false);
  const [showPickup, setShowPickup] = useState(false);

  const load = () => {
    projectsAPI.getActiveProjects().then(r => {
      const p = (r.data.projects || []).find(pr => pr.id === projectId);
      setProject(p);
      setOrder((p?.orders || []).find(o => o.id === orderId));
    }).finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [projectId, orderId]);

  if (loading || !order) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--text4)', fontSize: 14 }}>Loading…</div>;

  const stages = STAGE_DEFINITIONS[order.order_type] || STAGE_DEFINITIONS.bulk;
  const doneCount = (order.stage_log || []).length;

  const markDone = async () => {
    const label = stages[doneCount];
    if (!label) return;
    setMarking(true);
    try {
      const r = await projectsAPI.markOrderStageDone(projectId, orderId, { label, note: note.trim() || null });
      setOrder(r.data.order);
      setNote('');
    } finally { setMarking(false); }
  };

  return (
    <div>
      <div style={S.topbar}><div style={S.topbarTitle}>Order Detail</div></div>
      <div style={S.content}>
        <div style={S.breadcrumb} onClick={() => nav('/dashboard/active')}>← Projects <span>/</span> <span onClick={(e) => { e.stopPropagation(); nav('/dashboard/active'); }} style={{ cursor: 'pointer' }}>{project?.name}</span> <span>/</span> <span style={{ color: 'var(--text)' }}>{order.order_type} order</span></div>

        <div style={S.card}>
          <div style={S.cardHeader}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={S.badge('var(--admin-dim)', 'var(--admin)')}>{order.order_type} order</span>
                <span style={{ fontSize: 12, color: 'var(--text4)' }}>{order.id.slice(0, 8).toUpperCase()}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>{project?.name} · {project?.buyer_name}</div>
            </div>
            <span style={S.badge('var(--amber-dim)', 'var(--amber)')}>{order.status}</span>
          </div>
          <div style={S.cardBody}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
              <div><div style={S.detailLabel}>Deliver By</div><div style={{ ...S.detailValue, fontWeight: 500, color: 'var(--amber)' }}>{fmtDate(order.committed_dispatch_date)}</div></div>
              <div><div style={S.detailLabel}>Carrier</div><div style={S.detailValue}>{order.carrier || '—'}</div></div>
              <div><div style={S.detailLabel}>AWB</div><div style={S.detailValue}>{order.awb_number || '—'}</div></div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, alignItems: 'start' }}>
          <div style={S.card}>
            <div style={S.cardHeader}><div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600 }}>Order Progress</div><span style={{ fontSize: 12, color: 'var(--text3)' }}>Update each stage as you go</span></div>
            <div style={S.cardBody}>
              {stages.map((label, i) => {
                const done = order.stage_log?.[i];
                const state = done ? 'done' : i === doneCount ? 'current' : 'future';
                return (
                  <div key={label} style={S.stageItem}>
                    <div style={S.stageSpine}>
                      <div style={S.stageDot(state)}>{state === 'done' ? '✓' : i + 1}</div>
                      {i < stages.length - 1 && <div style={S.stageLine} />}
                    </div>
                    <div style={{ paddingBottom: 20, flex: 1 }}>
                      <div style={S.stageTitle(state)}>{label}</div>
                      {done ? (
                        <div style={S.stageTs}>{fmtDateTime(done.completed_at)}{done.note ? <em style={{ color: 'var(--text3)' }}> · "{done.note}"</em> : null}</div>
                      ) : state === 'current' ? (
                        <div>
                          <div style={S.stageTs}>Current stage — mark when done</div>
                          <textarea style={{ ...S.input, marginTop: 10, minHeight: 60 }} placeholder="Optional note for the buyer…" value={note} onChange={e => setNote(e.target.value)} />
                          <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
                            <button className="btn btn-primary btn-sm" disabled={marking} onClick={markDone}>{marking ? 'Saving…' : '✓ Mark stage done'}</button>
                            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--text3)', marginLeft: 'auto' }} onClick={() => setShowDelay(true)}>Adjust timeline</button>
                          </div>
                        </div>
                      ) : (
                        <div style={S.stageTs}>Unlocks after the stage above is marked done</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div style={S.card}>
              <div style={S.cardHeaderSm}><div style={{ fontSize: 13, fontWeight: 600 }}>Actions</div></div>
              <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button className="btn btn-outline btn-sm" onClick={() => setShowPickup(true)}>📦 Schedule Pickup</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowDelay(true)}>⏱ Report a delay</button>
              </div>
            </div>
            <div style={S.card}>
              <div style={S.cardHeaderSm}><div style={{ fontSize: 13, fontWeight: 600 }}>Update log</div></div>
              <div style={{ padding: '4px 16px 14px' }}>
                {(order.stage_log || []).length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--text4)', padding: '8px 0' }}>No stages marked done yet.</div>
                ) : order.stage_log.map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: i < order.stage_log.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', marginTop: 4, flexShrink: 0 }} />
                    <div><div style={{ fontSize: 11, color: 'var(--text2)' }}>{s.label}</div><div style={{ fontSize: 10, color: 'var(--text4)' }}>{fmtDateTime(s.completed_at)}</div></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showDelay && <DelayModal order={order} projectId={projectId} onClose={() => setShowDelay(false)} onDone={() => { setShowDelay(false); load(); }} />}
      {showPickup && <PickupModal order={order} projectId={projectId} onClose={() => setShowPickup(false)} onDone={() => { setShowPickup(false); load(); }} />}
    </div>
  );
}
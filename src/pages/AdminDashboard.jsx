import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { adminAPI } from '../api/client';
import { DashLayout } from '../components/DashLayout';
import { Spinner } from '../components/Spinner';
import { useToast } from '../hooks/useToast';
import { Toast } from '../components/Toast';

const sLabel = { submitted:'Submitted', in_progress:'In Progress', not_started:'Not Started', flagged:'Flagged', approved:'Approved' };
const sBadge = s => ({ submitted:'badge-green', in_progress:'badge-orange', not_started:'badge-gray', flagged:'badge-red', approved:'badge-teal' }[s]||'badge-gray');

// Maps model name → URL section slug for the edit API
const MODEL_TO_SECTION = {
  studio_details:    'studio',
  product_types:     'products',
  collab_design:     'collab',
  production_scale:  'production',
  process_readiness: 'process',
};

// Keys we never show or edit
const SKIP_KEYS = [
  'id','seller_profile','created_at','updated_at',
  'is_flagged','flag_reason','flagged_by','flagged_at','flag_resolved',
  'file','mime_type','file_size_kb',
];

function SectionBadges({ statuses }) {
  if (!statuses) return null;
  return (
    <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginTop:10 }}>
      {['a','b','c','d','e','f'].map(k => {
        const s = statuses[`section_${k}_status`] || 'not_started';
        return <span key={k} className={`badge ${sBadge(s)}`} style={{ fontSize:10 }}>{k.toUpperCase()}: {sLabel[s]}</span>;
      })}
    </div>
  );
}

/* ── OVERVIEW ── */
function Overview() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading]   = useState(true);
  const nav = useNavigate();

  useEffect(() => {
    adminAPI.listProfiles().then(r=>setProfiles(r.data||[])).catch(()=>{}).finally(()=>setLoading(false));
  }, []);

  if (loading) return <Spinner full />;

  const avgPct   = profiles.length ? Math.round(profiles.reduce((a,p)=>a+(p.completion_percentage||0),0)/profiles.length) : 0;
  const complete = profiles.filter(p=>(p.completion_percentage||0)===100).length;
  const flagged  = profiles.filter(p=>['a','b','c','d','e','f'].some(k=>p.section_statuses?.[`section_${k}_status`]==='flagged')).length;

  return (
    <div style={{ padding:'40px 48px' }}>
      <div className="fade-up" style={{ marginBottom:40 }}>
        <h1 style={{ fontFamily:'var(--font-display)', fontSize:42, fontWeight:700, color:'var(--text)', marginBottom:6 }}>
          Admin <em style={{ color:'var(--gold)' }}>Dashboard</em>
        </h1>
        <p style={{ color:'var(--text3)', fontSize:15 }}>Review and manage all seller profiles.</p>
      </div>

      {/* Stats row */}
      <div className="fade-up" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:36 }}>
        {[
          { label:'Total Profiles',   value:profiles.length, color:'var(--text)'  },
          { label:'Fully Complete',   value:complete,        color:'var(--green)' },
          { label:'Avg Completion',   value:`${avgPct}%`,    color:'var(--gold)'  },
          { label:'Flagged Sections', value:flagged,         color:'var(--red)'   },
        ].map((s,i) => (
          <div key={s.label} className={`card fade-up fade-up-${i+1}`} style={{ textAlign:'center', padding:'20px' }}>
            <div style={{ fontFamily:'var(--font-display)', fontSize:36, fontWeight:700, color:s.color, lineHeight:1 }}>{s.value}</div>
            <div style={{ fontSize:12, color:'var(--text3)', marginTop:6, letterSpacing:'0.04em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Profile list */}
      {profiles.length === 0 ? (
        <div className="card" style={{ textAlign:'center', padding:56 }}>
          <p style={{ color:'var(--text3)', marginBottom:20 }}>No seller profiles yet.</p>
          <button className="btn btn-primary" onClick={()=>nav('create-seller')}>+ Create Seller Account</button>
        </div>
      ) : (
        <div style={{ display:'grid', gap:14 }}>
          {profiles.map((p,i) => {
            const pct        = p.completion_percentage||0;
            const hasFlagged = ['a','b','c','d','e','f'].some(k=>p.section_statuses?.[`section_${k}_status`]==='flagged');
            return (
              <div key={p.profile_id||p.id} className={`card card-hover fade-up fade-up-${(i%3)+1}`}
                onClick={()=>nav(`review/${p.profile_id||p.id}`)}
                style={{ cursor:'pointer', borderLeft:`3px solid ${pct===100?'var(--gold)':hasFlagged?'var(--red)':'var(--border)'}` }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:4 }}>
                      <div style={{ width:36, height:36, borderRadius:9, background:'linear-gradient(135deg,var(--teal),var(--teal-l))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:'var(--bg)', flexShrink:0 }}>
                        {(p.business_name||p.email||'S')[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight:600, fontSize:15, color:'var(--text)' }}>{p.business_name || `Profile #${p.profile_id||p.id}`}</div>
                        <div style={{ fontSize:12, color:'var(--text3)' }}>{p.email}</div>
                      </div>
                    </div>
                    <SectionBadges statuses={p.section_statuses} />
                  </div>
                  <div style={{ textAlign:'right', marginLeft:24 }}>
                    <div style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:700, color:pct===100?'var(--gold)':pct>0?'var(--amber)':'var(--text3)' }}>
                      {pct}<span style={{ fontSize:14 }}>%</span>
                    </div>
                    <div style={{ fontSize:11, color:'var(--text4)', marginTop:2 }}>Complete</div>
                  </div>
                </div>
                {pct>0 && <div style={{ marginTop:14 }}><div className="prog-bar"><div className="prog-bar-fill" style={{ width:`${pct}%` }} /></div></div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── PROFILE REVIEW ── */
function ProfileReview() {
  const [profiles, setProfiles]   = useState([]);
  const [selected, setSelected]   = useState(null);
  const [onboarding, setOnboarding] = useState(null);
  const [showFlag, setShowFlag]   = useState(false);
  const [flagForm, setFlagForm]   = useState({ model:'studio_details', field:'studio_name', reason:'' });
  const [flagging, setFlagging]   = useState(false);
  const { toasts, success, error } = useToast();

  useEffect(() => {
    adminAPI.listProfiles().then(r => {
      const profs = r.data || [];
      setProfiles(profs);
      if (profs.length) { setSelected(profs[0]); loadOnboarding(profs[0]); }
    }).catch(() => {});
  }, []);

  const loadOnboarding = p => {
    setOnboarding(null);
    adminAPI.getOnboarding(p.profile_id||p.id).then(r=>setOnboarding(r.data)).catch(()=>{});
  };

  const selectProfile = p => { setSelected(p); loadOnboarding(p); setShowFlag(false); };

  const submitFlag = async () => {
    if (!flagForm.reason) { error('Reason is required'); return; }
    setFlagging(true);
    try {
      await adminAPI.flagField(selected.profile_id||selected.id, flagForm);
      success('Flag raised!');
      setShowFlag(false);
      setFlagForm(f => ({...f, reason:''}));
      loadOnboarding(selected);
    } catch(e) {
      error(e.response?.data?.detail || 'Failed to raise flag');
    } finally {
      setFlagging(false);
    }
  };

  // ── DataRow — single read-only key/value row ──
  const DataRow = ({ k, v }) => {
    if (SKIP_KEYS.includes(k))                         return null;
    if (typeof v === 'object')                         return null;
    if (v === null || v === undefined || v === '')     return null;
    return (
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'9px 12px', background:'var(--surface2)', borderRadius:7, marginBottom:5, gap:16 }}>
        <span style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.06em', flexShrink:0 }}>{k.replace(/_/g,' ')}</span>
        <span style={{ fontSize:13, color:'var(--text)', textAlign:'right', wordBreak:'break-word', maxWidth:'65%' }}>{String(v)}</span>
      </div>
    );
  };

  // ── Block — section card with Flag + Edit buttons ──
  const Block = ({ title, data, model, profileId, onSaved }) => {
    const [editing, setEditing] = useState(false);
    const [form, setForm]       = useState({});
    const [saving, setSaving]   = useState(false);

    if (!data) return null;

    // Only editable keys — skip objects, skip meta fields
    const editableKeys = Object.entries(data).filter(([k, v]) =>
      !SKIP_KEYS.includes(k) && typeof v !== 'object'
    );

    const startEdit = () => {
      const initial = {};
      editableKeys.forEach(([k, v]) => { initial[k] = v ?? ''; });
      setForm(initial);
      setEditing(true);
    };

    const saveEdit = async () => {
      setSaving(true);
      const section = MODEL_TO_SECTION[model];
      if (!section) { error('Cannot edit this section directly.'); setSaving(false); return; }
      try {
        await adminAPI.editSection(profileId, section, form);
        success('Changes saved!');
        setEditing(false);
        onSaved();
      } catch(e) {
        error(e.response?.data ? JSON.stringify(e.response.data) : 'Save failed');
      } finally {
        setSaving(false);
      }
    };

    return (
      <div style={{ marginBottom:24 }}>
        {/* Section header with Flag + Edit buttons */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <div style={{ fontFamily:'var(--font-display)', fontSize:17, fontWeight:600, color:'var(--gold)' }}>{title}</div>
          <div style={{ display:'flex', gap:8 }}>
            <button
              className="btn btn-ghost btn-sm"
              style={{ fontSize:11 }}
              onClick={() => { setFlagForm(f=>({...f, model})); setShowFlag(true); setEditing(false); }}>
              Flag
            </button>
            {MODEL_TO_SECTION[model] && (
              <button
                className="btn btn-ghost btn-sm"
                style={{ fontSize:11, color: editing ? 'var(--text3)' : 'var(--teal)', borderColor: editing ? 'var(--border)' : 'var(--teal)' }}
                onClick={() => editing ? setEditing(false) : startEdit()}>
                {editing ? 'Cancel' : 'Edit'}
              </button>
            )}
          </div>
        </div>

        {/* Edit form */}
        {editing ? (
          <div style={{ background:'var(--surface2)', borderRadius:'var(--radius)', padding:'16px 18px', marginBottom:8, border:'1px solid var(--teal)', borderOpacity:0.3 }}>
            <div style={{ fontSize:11, fontWeight:600, color:'var(--teal)', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:14 }}>
              Editing — changes save directly to seller's profile
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
              {editableKeys.map(([k]) => (
                <div className="field" key={k}>
                  <label style={{ fontSize:11 }}>{k.replace(/_/g,' ')}</label>
                  <input
                    value={form[k] ?? ''}
                    onChange={e => setForm(f => ({...f, [k]: e.target.value}))}
                    style={{ fontSize:13 }}
                  />
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button className="btn btn-primary btn-sm" onClick={saveEdit} disabled={saving}>
                {saving ? <span className="spinner" style={{width:13,height:13}} /> : 'Save Changes'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          // Read-only view
          Object.entries(data).map(([k,v]) => <DataRow key={k} k={k} v={v} />)
        )}
      </div>
    );
  };

  // ── CraftBlock — crafts section with per-craft edit ──
  const CraftBlock = ({ crafts, profileId, onSaved }) => {
    const [editingId, setEditingId] = useState(null);
    const [form, setForm]           = useState({});
    const [saving, setSaving]       = useState(false);

    if (!crafts?.length) return null;

    const craftEditableKeys = craft => Object.entries(craft).filter(([k, v]) =>
      !SKIP_KEYS.includes(k) && typeof v !== 'object' && k !== 'seller_profile'
    );

    const startEdit = craft => {
      const initial = {};
      craftEditableKeys(craft).forEach(([k, v]) => { initial[k] = v ?? ''; });
      setForm(initial);
      setEditingId(craft.id);
    };

    const saveCraft = async craftId => {
      setSaving(true);
      try {
        await adminAPI.editSection(profileId, `craft/${craftId}`, form);
        success('Craft updated!');
        setEditingId(null);
        onSaved();
      } catch(e) {
        error(e.response?.data ? JSON.stringify(e.response.data) : 'Save failed');
      } finally {
        setSaving(false);
      }
    };

    return (
      <>
        <hr style={{ border:'none', borderTop:'1px solid var(--border)', margin:'4px 0 20px' }} />
        <div style={{ fontFamily:'var(--font-display)', fontSize:17, fontWeight:600, color:'var(--gold)', marginBottom:12 }}>
          Section C — Crafts ({crafts.length})
        </div>
        {crafts.map(c => (
          <div key={c.id} style={{ padding:'14px 16px', background:'var(--surface2)', borderRadius:'var(--radius)', marginBottom:10, border:'1px solid var(--border)', borderLeft:`3px solid ${c.is_primary?'var(--gold)':'var(--border)'}` }}>
            {/* Craft header */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: editingId===c.id ? 14 : 0 }}>
              <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                <span style={{ fontWeight:600, fontSize:14, color:'var(--text)' }}>{c.craft_name}</span>
                {c.is_primary && <span className="badge badge-gold" style={{ fontSize:10 }}>Primary</span>}
                {c.innovation_level && <span className="badge badge-gray" style={{ fontSize:10 }}>{c.innovation_level} innovation</span>}
                {c.sampling_time_weeks && <span style={{ fontSize:12, color:'var(--text3)' }}>{c.sampling_time_weeks}wk</span>}
              </div>
              <button
                className="btn btn-ghost btn-sm"
                style={{ fontSize:11, color: editingId===c.id ? 'var(--text3)' : 'var(--teal)', borderColor: editingId===c.id ? 'var(--border)' : 'var(--teal)' }}
                onClick={() => editingId===c.id ? setEditingId(null) : startEdit(c)}>
                {editingId===c.id ? 'Cancel' : 'Edit'}
              </button>
            </div>

            {/* Craft specialization preview */}
            {editingId !== c.id && c.specialization && (
              <div style={{ fontSize:12, color:'var(--text3)', marginTop:6 }}>{c.specialization}</div>
            )}

            {/* Craft edit form */}
            {editingId === c.id && (
              <div>
                <div style={{ fontSize:11, fontWeight:600, color:'var(--teal)', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:12 }}>
                  Editing craft
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
                  {craftEditableKeys(c).map(([k]) => (
                    <div className="field" key={k}>
                      <label style={{ fontSize:11 }}>{k.replace(/_/g,' ')}</label>
                      <input
                        value={form[k] ?? ''}
                        onChange={e => setForm(f => ({...f, [k]: e.target.value}))}
                        style={{ fontSize:13 }}
                      />
                    </div>
                  ))}
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => saveCraft(c.id)} disabled={saving}>
                    {saving ? <span className="spinner" style={{width:13,height:13}} /> : 'Save Craft'}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </>
    );
  };

  const pid = selected?.profile_id || selected?.id;

  return (
    <div style={{ padding:'40px 48px' }}>
      <Toast toasts={toasts} />

      <div className="fade-up" style={{ marginBottom:32 }}>
        <h1 style={{ fontFamily:'var(--font-display)', fontSize:34, fontWeight:700, color:'var(--text)', marginBottom:6 }}>
          Profile <em style={{ color:'var(--gold)' }}>Review</em>
        </h1>
        <p style={{ color:'var(--text3)', fontSize:14 }}>Select a seller profile to review, flag, or edit their onboarding data.</p>
      </div>

      {/* Profile picker */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:28 }}>
        {profiles.map(p => (
          <button key={p.profile_id||p.id} onClick={() => selectProfile(p)}
            className={`btn btn-sm ${(selected?.profile_id||selected?.id)===(p.profile_id||p.id) ? 'btn-primary' : 'btn-ghost'}`}>
            {p.business_name || p.email || `#${p.profile_id||p.id}`}
          </button>
        ))}
      </div>

      {selected && (
        <>
          {/* Selected profile header */}
          <div className="card card-gold fade-up" style={{ marginBottom:20, padding:'20px 24px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontWeight:700, fontSize:16, color:'var(--text)', marginBottom:4 }}>
                  {selected.business_name || selected.email || `Profile #${pid}`}
                </div>
                <div style={{ fontSize:13, color:'var(--text3)' }}>
                  {selected.seller_email || selected.email} · {selected.completion_percentage||0}% complete
                </div>
                <SectionBadges statuses={selected.section_statuses} />
              </div>
              <button className="btn btn-terra" onClick={() => setShowFlag(!showFlag)}>
                Flag a Field
              </button>
            </div>
          </div>

          {/* Flag form */}
          {showFlag && (
            <div className="card fade-up" style={{ marginBottom:20, borderColor:'rgba(224,85,85,0.3)' }}>
              <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:600, color:'var(--red)', marginBottom:16 }}>
                Flag a Field
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                <div className="field">
                  <label>Model / Section</label>
                  <select value={flagForm.model} onChange={e => setFlagForm(f=>({...f, model:e.target.value}))}>
                    {['studio_details','product_types','collab_design','production_scale','process_readiness','craft','fabric_answer','brand_experience','award_mention','studio_contact','studio_usp','moq_entry','buyer_requirement'].map(m =>
                      <option key={m} value={m}>{m.replace(/_/g,' ')}</option>
                    )}
                  </select>
                </div>
                <div className="field">
                  <label>Field Name</label>
                  <input
                    value={flagForm.field}
                    onChange={e => setFlagForm(f=>({...f, field:e.target.value}))}
                    placeholder="e.g. studio_name"
                  />
                </div>
              </div>
              <div className="field" style={{ marginBottom:14 }}>
                <label>Reason (shown to seller)</label>
                <textarea
                  value={flagForm.reason}
                  onChange={e => setFlagForm(f=>({...f, reason:e.target.value}))}
                  rows={3}
                  placeholder="Explain what needs to be corrected..."
                />
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button className="btn btn-danger" onClick={submitFlag} disabled={flagging}>
                  {flagging ? <span className="spinner" style={{width:15,height:15}} /> : 'Raise Flag'}
                </button>
                <button className="btn btn-ghost" onClick={() => setShowFlag(false)}>Cancel</button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Onboarding data */}
      {!onboarding && selected
        ? <Spinner full />
        : onboarding && (
          <div className="card fade-up">

            <Block
              title="Section A — Studio Details"
              data={onboarding.studio_details}
              model="studio_details"
              profileId={pid}
              onSaved={() => loadOnboarding(selected)}
            />

            {onboarding.studio_details?.id && (
              <hr style={{ border:'none', borderTop:'1px solid var(--border)', margin:'4px 0 20px' }} />
            )}

            <Block
              title="Section D — Collaboration"
              data={onboarding.collab_design}
              model="collab_design"
              profileId={pid}
              onSaved={() => loadOnboarding(selected)}
            />

            <hr style={{ border:'none', borderTop:'1px solid var(--border)', margin:'4px 0 20px' }} />

            <Block
              title="Section E — Production Scale"
              data={onboarding.production_scale}
              model="production_scale"
              profileId={pid}
              onSaved={() => loadOnboarding(selected)}
            />

            <hr style={{ border:'none', borderTop:'1px solid var(--border)', margin:'4px 0 20px' }} />

            <Block
              title="Section F — Process Readiness"
              data={onboarding.process_readiness}
              model="process_readiness"
              profileId={pid}
              onSaved={() => loadOnboarding(selected)}
            />

            <CraftBlock
              crafts={onboarding.crafts}
              profileId={pid}
              onSaved={() => loadOnboarding(selected)}
            />

          </div>
        )
      }
    </div>
  );
}

/* ── CREATE SELLER ── */
function CreateSeller() {
  const { toasts, success, error } = useToast();
  const [form, setForm] = useState({ email:'', password:'', business_name:'', business_email:'', initial_profile_name:'' });
  const [saving, setSaving] = useState(false);
  const nav = useNavigate();

  const submit = async e => {
    e.preventDefault(); setSaving(true);
    try {
      await adminAPI.createSeller(form);
      success('Seller created!');
      setTimeout(() => nav('/admin'), 1200);
    } catch(e) {
      error(e.response?.data ? JSON.stringify(e.response.data) : 'Failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding:'40px 48px', maxWidth:520 }}>
      <Toast toasts={toasts} />
      <div className="fade-up" style={{ marginBottom:36 }}>
        <h1 style={{ fontFamily:'var(--font-display)', fontSize:34, fontWeight:700, color:'var(--text)', marginBottom:8 }}>Create Seller</h1>
        <p style={{ color:'var(--text3)', fontSize:14 }}>Creates a SuperTokens account + Django user + first profile automatically.</p>
      </div>
      <form onSubmit={submit} className="fade-up" style={{ display:'flex', flexDirection:'column', gap:16 }}>
        <div className="field">
          <label>Email *</label>
          <input type="email" placeholder="seller@studio.com" required
            value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} />
        </div>
        <div className="field">
          <label>Password *</label>
          <input type="password" placeholder="Min 8 chars · 1 number · 1 uppercase" required
            value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} />
        </div>
        <div className="field">
          <label>Business Name *</label>
          <input placeholder="e.g. Priya Craft Studio" required
            value={form.business_name} onChange={e => setForm(f => ({...f, business_name: e.target.value}))} />
        </div>
        <div className="field">
          <label>Business Email</label>
          <input type="email" placeholder="Optional"
            value={form.business_email} onChange={e => setForm(f => ({...f, business_email: e.target.value}))} />
        </div>
        <div className="field">
          <label>First Profile Name</label>
          <input placeholder="Default"
            value={form.initial_profile_name} onChange={e => setForm(f => ({...f, initial_profile_name: e.target.value}))} />
        </div>
        <button className="btn btn-primary btn-lg" type="submit" disabled={saving} style={{ marginTop:8 }}>
          {saving ? <><span className="spinner" style={{width:16,height:16}} />Creating…</> : 'Create Seller Account →'}
        </button>
      </form>
    </div>
  );
}


/* ── DISCOVERY OVERVIEW ── */
function DiscoveryOverview() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const nav = useNavigate();

  useEffect(() => {
    adminAPI.getDiscoveryBuyers()
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner full />;
  if (!data)   return <div style={{ padding: 40, color: 'var(--red)' }}>Failed to load discovery data.</div>;

  const { stats, top_crafts, top_products, buyers } = data;

  const filtered = buyers.filter(b => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (b.name || '').toLowerCase().includes(q) ||
      (b.user_email || '').toLowerCase().includes(q) ||
      (b.product_types || []).some(p => p.toLowerCase().includes(q)) ||
      (b.crafts || []).some(c => c.toLowerCase().includes(q))
    );
  });

  const journeyLabel = {
    figuring_it_out:    'Figuring It Out',
    build_with_support: 'Build with Support',
    ready_to_produce:   'Ready to Produce',
  };

  const batchLabel = {
    under_30: '< 30 pcs',
    '30_100': '30–100 pcs',
    over_100: '100+ pcs',
    not_sure: 'Not sure',
  };

  const timelineLabel = {
    '1_3_months':    '1–3 months',
    '3_6_months':    '3–6 months',
    '6_plus_months': '6+ months',
    not_sure:        'Not sure',
    flexible:        'Flexible',
  };

  return (
    <div style={{ padding: '40px 48px' }}>
      <div className="fade-up" style={{ marginBottom: 40 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 42, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
          Discovery <em style={{ color: 'var(--gold)' }}>Insights</em>
        </h1>
        <p style={{ color: 'var(--text3)', fontSize: 15 }}>All buyer sessions, matches, and what they're looking for.</p>
      </div>

      {/* Stats row */}
      <div className="fade-up" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 36 }}>
        {[
          { label: 'Total Buyers',    value: stats.total,        color: 'var(--text)'  },
          { label: 'Got Matches',     value: stats.has_match,    color: 'var(--green)' },
          { label: 'Zero Match',      value: stats.zero_match,   color: 'var(--red)'   },
          { label: 'Registered Users',value: stats.linked_users, color: 'var(--gold)'  },
        ].map((s, i) => (
          <div key={s.label} className={`card fade-up fade-up-${i+1}`} style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6, letterSpacing: '0.04em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Top crafts + products */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 36 }}>

        {/* Top crafts */}
        <div className="card fade-up">
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--gold)', marginBottom: 16 }}>
            Most Requested Crafts
          </div>
          {top_crafts.length === 0
            ? <div style={{ fontSize: 13, color: 'var(--text4)' }}>No data yet.</div>
            : top_crafts.map((c, i) => (
              <div key={c.craft} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: 'var(--text4)', width: 16, textAlign: 'right', flexShrink: 0 }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500, textTransform: 'capitalize' }}>{c.craft}</span>
                    <span style={{ fontSize: 12, color: 'var(--text3)' }}>{c.count}</span>
                  </div>
                  <div style={{ height: 3, background: 'var(--surface3)', borderRadius: 2 }}>
                    <div style={{
                      height: '100%', borderRadius: 2, background: 'var(--gold)',
                      width: `${Math.round((c.count / (top_crafts[0]?.count || 1)) * 100)}%`,
                    }} />
                  </div>
                </div>
              </div>
            ))
          }
        </div>

        {/* Top products */}
        <div className="card fade-up">
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--gold)', marginBottom: 16 }}>
            Most Requested Products
          </div>
          {top_products.length === 0
            ? <div style={{ fontSize: 13, color: 'var(--text4)' }}>No data yet.</div>
            : top_products.map((p, i) => (
              <div key={p.product} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: 'var(--text4)', width: 16, textAlign: 'right', flexShrink: 0 }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500, textTransform: 'capitalize' }}>{p.product.replace(/_/g, ' ')}</span>
                    <span style={{ fontSize: 12, color: 'var(--text3)' }}>{p.count}</span>
                  </div>
                  <div style={{ height: 3, background: 'var(--surface3)', borderRadius: 2 }}>
                    <div style={{
                      height: '100%', borderRadius: 2, background: 'var(--teal)',
                      width: `${Math.round((p.count / (top_products[0]?.count || 1)) * 100)}%`,
                    }} />
                  </div>
                </div>
              </div>
            ))
          }
        </div>
      </div>

      {/* Buyer list */}
      <div className="card fade-up">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--gold)' }}>
            All Buyer Sessions ({buyers.length})
          </div>
          <input
            placeholder="Search by name, email, product, craft..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '8px 14px', fontSize: 13,
              color: 'var(--text)', width: 280, fontFamily: 'var(--font-body)',
            }}
          />
        </div>

        {filtered.length === 0
          ? <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text4)', fontSize: 13 }}>No buyers found.</div>
          : (
            <div style={{ display: 'grid', gap: 10 }}>
              {filtered.map(b => (
                <div
                  key={b.id}
                  onClick={() => nav(`discovery/${b.id}`)}
                  className="card-hover"
                  style={{
                    padding: '16px 20px', background: 'var(--surface2)',
                    borderRadius: 10, cursor: 'pointer',
                    border: `1px solid ${b.zero_match ? 'rgba(224,85,85,0.25)' : b.rec_count > 0 ? 'rgba(90,232,122,0.15)' : 'var(--border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>
                        {b.name || b.user_email || 'Anonymous'}
                      </span>
                      {b.user_email && b.name && (
                        <span style={{ fontSize: 12, color: 'var(--text4)' }}>{b.user_email}</span>
                      )}
                      <span style={{
                        fontSize: 10, fontWeight: 600, letterSpacing: '0.06em',
                        padding: '2px 8px', borderRadius: 10, textTransform: 'uppercase',
                        background: b.zero_match ? 'var(--red-dim)' : b.rec_count > 0 ? 'rgba(90,232,122,0.1)' : 'var(--surface3)',
                        color: b.zero_match ? 'var(--red)' : b.rec_count > 0 ? 'var(--green)' : 'var(--text4)',
                      }}>
                        {b.zero_match ? 'No match' : b.rec_count > 0 ? `${b.rec_count} match${b.rec_count !== 1 ? 'es' : ''}` : 'Pending'}
                      </span>
                      {b.journey_stage && (
                        <span style={{ fontSize: 10, color: 'var(--text4)', padding: '2px 8px', borderRadius: 10, background: 'var(--surface3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          {journeyLabel[b.journey_stage] || b.journey_stage}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {(b.product_types || []).slice(0, 4).map(p => (
                        <span key={p} style={{ fontSize: 11, color: 'var(--text3)', background: 'var(--surface)', padding: '2px 8px', borderRadius: 6, textTransform: 'capitalize' }}>
                          {p.replace(/_/g, ' ')}
                        </span>
                      ))}
                      {(b.crafts || []).slice(0, 3).map(c => (
                        <span key={c} style={{ fontSize: 11, color: 'var(--gold)', background: 'var(--gold-dim)', padding: '2px 8px', borderRadius: 6 }}>
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {b.batch_size && (
                      <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 2 }}>{batchLabel[b.batch_size] || b.batch_size}</div>
                    )}
                    {b.timeline && (
                      <div style={{ fontSize: 12, color: 'var(--text4)', marginBottom: 4 }}>{timelineLabel[b.timeline] || b.timeline}</div>
                    )}
                    <div style={{ fontSize: 11, color: 'var(--text4)' }}>
                      {new Date(b.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        }
      </div>
    </div>
  );
}


/* ── DISCOVERY BUYER DETAIL ── */
function DiscoveryBuyerDetail() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();

  // Get buyer id from URL
  const buyerId = window.location.pathname.split('/').pop();

  useEffect(() => {
    adminAPI.getDiscoveryBuyer(buyerId)
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [buyerId]);

  if (loading) return <Spinner full />;
  if (!data)   return (
    <div style={{ padding: 40 }}>
      <button className="btn btn-ghost btn-sm" onClick={() => nav('/admin/discovery')} style={{ marginBottom: 20 }}>← Back</button>
      <div style={{ color: 'var(--red)', fontSize: 13 }}>Failed to load buyer.</div>
    </div>
  );

  const { buyer, recommendations, inquiries } = data;

  const Field = ({ label, value }) => {
    if (!value || (Array.isArray(value) && value.length === 0)) return null;
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '9px 12px', background: 'var(--surface2)', borderRadius: 7, marginBottom: 5, gap: 16 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>{label}</span>
        <span style={{ fontSize: 13, color: 'var(--text)', textAlign: 'right', wordBreak: 'break-word' }}>
          {Array.isArray(value) ? value.join(', ') : String(value)}
        </span>
      </div>
    );
  };

  const rankColor = r => ({ high: 'var(--green)', medium: 'var(--amber)', low: 'var(--red)' }[r] || 'var(--text3)');

  return (
    <div style={{ padding: '40px 48px' }}>
      <button className="btn btn-ghost btn-sm" onClick={() => nav('/admin/discovery')} style={{ marginBottom: 24 }}>
        ← Back to Discovery
      </button>

      {/* Header */}
      <div className="card card-gold fade-up" style={{ marginBottom: 24, padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 4 }}>
              {buyer.name || buyer.user_email || 'Anonymous Buyer'}
            </div>
            {buyer.user_email && <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 4 }}>{buyer.user_email}</div>}
            <div style={{ fontSize: 12, color: 'var(--text4)' }}>
              Session: {buyer.session_token} · {new Date(buyer.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {buyer.journey_stage && (
              <span className="badge badge-teal" style={{ fontSize: 11 }}>{buyer.journey_stage.replace(/_/g, ' ')}</span>
            )}
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 12,
              background: recommendations.length > 0 ? 'rgba(90,232,122,0.1)' : 'var(--red-dim)',
              color: recommendations.length > 0 ? 'var(--green)' : 'var(--red)',
            }}>
              {recommendations.length > 0 ? `${recommendations.length} match${recommendations.length !== 1 ? 'es' : ''}` : 'No match'}
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

        {/* Questionnaire answers */}
        <div className="card fade-up">
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--gold)', marginBottom: 16 }}>
            Questionnaire Answers
          </div>
          <Field label="Products"          value={buyer.product_types} />
          <Field label="Fabrics"           value={buyer.fabrics} />
          <Field label="Fabric flexible"   value={buyer.fabric_is_flexible ? 'Yes' : null} />
          <Field label="Fabric not sure"   value={buyer.fabric_not_sure ? 'Yes' : null} />
          <Field label="Craft interest"    value={buyer.craft_interest} />
          <Field label="Crafts"            value={buyer.crafts} />
          <Field label="Craft flexible"    value={buyer.craft_is_flexible ? 'Yes' : null} />
          <Field label="Craft not sure"    value={buyer.craft_not_sure ? 'Yes' : null} />
          <Field label="Experimentation"   value={buyer.experimentation} />
          <Field label="Process stage"     value={buyer.process_stage} />
          <Field label="Design support"    value={buyer.design_support} />
          <Field label="Timeline"          value={buyer.timeline} />
          <Field label="Batch size"        value={buyer.batch_size} />

          {buyer.zero_match_suggestions?.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--red)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
                Zero Match Suggestions
              </div>
              {buyer.zero_match_suggestions.map((s, i) => (
                <div key={i} style={{ fontSize: 12, color: 'var(--text3)', padding: '8px 12px', background: 'var(--surface2)', borderRadius: 6, marginBottom: 6, borderLeft: '2px solid var(--amber)' }}>
                  {s.message} <span style={{ color: 'var(--green)' }}>({s.studios_count} studios)</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Matches + Inquiries */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Matched studios */}
          <div className="card fade-up">
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--gold)', marginBottom: 16 }}>
              Matched Studios ({recommendations.length})
            </div>
            {recommendations.length === 0
              ? <div style={{ fontSize: 13, color: 'var(--text4)' }}>No matches found for this buyer.</div>
              : recommendations.map(r => (
                <div key={r.rank_position} style={{ padding: '12px 14px', background: 'var(--surface2)', borderRadius: 8, marginBottom: 8, borderLeft: `3px solid ${rankColor(r.ranking)}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>#{r.rank_position} {r.studio_name || `Studio #${r.studio_id}`}</span>
                      {r.location && <span style={{ fontSize: 12, color: 'var(--text4)', marginLeft: 8 }}>{r.location}</span>}
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: rankColor(r.ranking), textTransform: 'uppercase' }}>{r.ranking}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {[
                      { label: 'Capability', value: r.core_capability_fit },
                      { label: 'MOQ', value: r.moq_fit },
                      { label: 'Craft', value: r.craft_approach_fit },
                      { label: 'Visual', value: r.visual_affinity },
                    ].map(f => (
                      <span key={f.label} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: 'var(--surface)', color: rankColor(f.value) }}>
                        {f.label}: {f.value}
                      </span>
                    ))}
                  </div>
                  {r.what_best_at?.length > 0 && (
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>{r.what_best_at.join(' · ')}</div>
                  )}
                </div>
              ))
            }
          </div>

          {/* Custom inquiries */}
          {inquiries.length > 0 && (
            <div className="card fade-up">
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--gold)', marginBottom: 16 }}>
                Custom Inquiries ({inquiries.length})
              </div>
              {inquiries.map(inq => (
                <div key={inq.id} style={{ padding: '12px 14px', background: 'var(--surface2)', borderRadius: 8, marginBottom: 10, borderLeft: '3px solid var(--teal)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{inq.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--text4)' }}>{new Date(inq.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text4)', marginBottom: 8 }}>{inq.email}</div>
                  <div style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.6 }}>{inq.message}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


/* ── DISCOVERY INQUIRIES ── */
function DiscoveryInquiries() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const nav = useNavigate();

  useEffect(() => {
    adminAPI.getDiscoveryInquiries()
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner full />;
  if (!data)   return <div style={{ padding: 40, color: 'var(--red)' }}>Failed to load inquiries.</div>;

  const filtered = data.inquiries.filter(inq => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      inq.name.toLowerCase().includes(q) ||
      inq.email.toLowerCase().includes(q) ||
      inq.message.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ padding: '40px 48px' }}>
      <div className="fade-up" style={{ marginBottom: 36 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 42, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
          Custom <em style={{ color: 'var(--gold)' }}>Inquiries</em>
        </h1>
        <p style={{ color: 'var(--text3)', fontSize: 15 }}>Buyers who couldn't find a match and reached out directly.</p>
      </div>

      <div className="card fade-up">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--gold)' }}>
            {data.count} Inquir{data.count !== 1 ? 'ies' : 'y'}
          </div>
          <input
            placeholder="Search name, email, message..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '8px 14px', fontSize: 13,
              color: 'var(--text)', width: 280, fontFamily: 'var(--font-body)',
            }}
          />
        </div>

        {filtered.length === 0
          ? <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text4)', fontSize: 13 }}>No inquiries found.</div>
          : (
            <div style={{ display: 'grid', gap: 14 }}>
              {filtered.map(inq => (
                <div key={inq.id} style={{ padding: '20px 24px', background: 'var(--surface2)', borderRadius: 10, border: '1px solid var(--border)', borderLeft: '3px solid var(--teal)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)', marginBottom: 2 }}>{inq.name}</div>
                      <div style={{ fontSize: 13, color: 'var(--text4)' }}>{inq.email}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12, color: 'var(--text4)' }}>
                        {new Date(inq.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                      {inq.buyer && (
                        <button
                          onClick={() => nav(`discovery/${inq.buyer.id}`)}
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: 11, marginTop: 4 }}
                        >View session →</button>
                      )}
                    </div>
                  </div>

                  <div style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.7, marginBottom: inq.buyer ? 12 : 0 }}>
                    {inq.message}
                  </div>

                  {inq.buyer && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 10, color: 'var(--text4)', alignSelf: 'center' }}>Their brief:</span>
                      {(inq.buyer.product_types || []).map(p => (
                        <span key={p} style={{ fontSize: 11, color: 'var(--text3)', background: 'var(--surface)', padding: '2px 8px', borderRadius: 6, textTransform: 'capitalize' }}>
                          {p.replace(/_/g, ' ')}
                        </span>
                      ))}
                      {(inq.buyer.crafts || []).map(c => (
                        <span key={c} style={{ fontSize: 11, color: 'var(--gold)', background: 'var(--gold-dim)', padding: '2px 8px', borderRadius: 6 }}>
                          {c}
                        </span>
                      ))}
                      {inq.buyer.batch_size && (
                        <span style={{ fontSize: 11, color: 'var(--text4)', background: 'var(--surface)', padding: '2px 8px', borderRadius: 6 }}>
                          {inq.buyer.batch_size.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        }
      </div>
    </div>
  );
}



/* ── MAIN EXPORT ── */
export default function AdminDashboard() {
  const navItems = [
    { to: '/admin',                  icon: '', label: 'Overview',        end: true },
    { to: '/admin/review',           icon: '', label: 'Review Profile'            },
    { to: '/admin/create-seller',    icon: '', label: 'Create Seller'             },
    { to: '/admin/discovery',        icon: '', label: 'Discovery'                 },
    { to: '/admin/discovery/inquiries', icon: '', label: 'Inquiries'              },
  ];
  return (
    <DashLayout nav={navItems}>
      <Routes>
        <Route index                        element={<Overview />}               />
        <Route path="review"                element={<ProfileReview />}          />
        <Route path="review/:pid"           element={<ProfileReview />}          />
        <Route path="create-seller"         element={<CreateSeller />}           />
        <Route path="discovery"             element={<DiscoveryOverview />}      />
        <Route path="discovery/:buyerId"    element={<DiscoveryBuyerDetail />}   />
        <Route path="discovery/inquiries"   element={<DiscoveryInquiries />}     />
      </Routes>
    </DashLayout>
  );
}
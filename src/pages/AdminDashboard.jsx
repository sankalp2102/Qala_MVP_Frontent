import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { adminAPI, onboardingAPI } from '../api/client';
import { DashLayout } from '../components/DashLayout';
import { Spinner } from '../components/Spinner';
import { useToast } from '../hooks/useToast';
import { Toast } from '../components/Toast';
import PasswordInput from '../components/PasswordInput';
import { mediaUrl } from '../utils/mediaUrl';

const sLabel = { submitted:'Submitted', in_progress:'In Progress', not_started:'Not Started', flagged:'Flagged', approved:'Approved' };
const sBadge = s => ({ submitted:'badge-green', in_progress:'badge-orange', not_started:'badge-gray', flagged:'badge-red', approved:'badge-teal' }[s]||'badge-gray');

const MODEL_TO_SECTION = {
  studio_details:    'studio',
  product_types:     'products',
  collab_design:     'collab',
  production_scale:  'production',
  process_readiness: 'process',
};

const FLAG_FIELD_OPTIONS = {
  studio_details:    ['studio_name', 'location', 'years', 'website', 'poc'],
  collab_design:     ['designer', 'references', 'iterations'],
  production_scale:  ['capacity', 'minimums'],
  process_readiness: ['steps'],
};

const SKIP_KEYS = [
  'id','seller_profile','created_at','updated_at',
  'is_flagged','flag_reason','flagged_by','flagged_at','flag_resolved',
  'file','mime_type','file_size_kb',
];

// ─────────────────────────────────────────────────────────────────────────────
// CSV UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

function escapeCSV(val) {
  if (val === null || val === undefined) return '';
  const s = Array.isArray(val) ? val.join('; ') : String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function buildStudioRow(profile, onboarding) {
  const sd = onboarding?.studio_details    || {};
  const co = onboarding?.collab_design     || {};
  const pr = onboarding?.production_scale  || {};
  const pc = onboarding?.process_readiness || {};
  const pt = onboarding?.product_types     || {};

  const contacts  = (sd.contacts || []).map(c => `${c.name} (${c.role}): ${c.email||''} ${c.phone||''}`).join(' | ');
  const usps      = (sd.usps     || []).map(u => u.strength).join('; ');
  const brands    = (onboarding?.brand_experiences || []).map(b => `${b.brand_name}${b.scope ? ' — '+b.scope : ''}`).join('; ');
  const awards    = (onboarding?.awards            || []).map(a => a.award_name).join('; ');
  const fabrics   = (onboarding?.fabric_answers    || []).filter(f => f.works_with).map(f => f.fabric_name).join('; ');
  const crafts    = (onboarding?.crafts            || []).map(c => `${c.craft_name}${c.is_primary ? ' (primary)' : ''}`).join('; ');
  const moqs      = (pr.moq_entries                || []).map(m => `${m.craft_or_category}: ${m.moq_condition}`).join('; ');
  const buyerReqs = (co.buyer_requirements         || []).map(r => r.question).join('; ');
  const productList = Object.entries(pt)
    .filter(([k, v]) => v === true && !['id','is_flagged','flag_reason','flag_resolved'].includes(k))
    .map(([k]) => k.replace(/_/g, ' ')).join('; ');

  const studioMed = (sd.media_files || []);
  const heroUrl   = mediaUrl(studioMed.find(m => m.media_type === 'hero')?.file || '');
  const workUrls  = studioMed.filter(m => m.media_type === 'work_dump').map(m => mediaUrl(m.file)).join(' | ');
  const brandImgs = (onboarding?.brand_experiences || []).filter(b => b.image).map(b => `${b.brand_name}: ${mediaUrl(b.image)}`).join(' | ');
  const craftImgs = (onboarding?.crafts || []).filter(c => c.image).map(c => `${c.craft_name}: ${mediaUrl(c.image)}`).join(' | ');
  const btsUrls   = (pc.bts_media || []).map(m => mediaUrl(m.file)).join(' | ');

  return {
    'Profile ID':               profile.profile_id || profile.id || '',
    'Business Name':            profile.business_name || '',
    'Email':                    profile.email || '',
    'Completion %':             profile.completion_percentage || 0,
    'Section A Status':         profile.section_statuses?.section_a_status || '',
    'Section B Status':         profile.section_statuses?.section_b_status || '',
    'Section C Status':         profile.section_statuses?.section_c_status || '',
    'Section D Status':         profile.section_statuses?.section_d_status || '',
    'Section E Status':         profile.section_statuses?.section_e_status || '',
    'Section F Status':         profile.section_statuses?.section_f_status || '',
    'Studio Name':              sd.studio_name || '',
    'City':                     sd.location_city || '',
    'State':                    sd.location_state || '',
    'Years in Operation':       sd.years_in_operation || '',
    'Website':                  sd.website_url || '',
    'Instagram':                sd.instagram_url || '',
    'POC Working Style':        sd.poc_working_style || '',
    'Directory Description':    sd.short_description || '',
    'Contacts':                 contacts,
    'USPs':                     usps,
    'Hero Image URL':           heroUrl,
    'Work Sample URLs':         workUrls,
    'Products':                 productList,
    'Fabrics':                  fabrics,
    'Brands Worked With':       brands,
    'Brand Image URLs':         brandImgs,
    'Awards':                   awards,
    'Crafts':                   crafts,
    'Craft Image URLs':         craftImgs,
    'Has Fashion Designer':          co.has_fashion_designer ?? '',
    'Can Develop from References':   co.can_develop_from_references ?? '',
    'Max Sampling Iterations':       co.max_sampling_iterations || '',
    'Buyer Requirements':            buyerReqs,
    'Monthly Capacity (units)':      pr.monthly_capacity_units || '',
    'Has Strict Minimums':           pr.has_strict_minimums ?? '',
    'MOQ Entries':                   moqs,
    'Production Steps':             pc.production_steps || '',
    'BTS Media URLs':               btsUrls,
  };
}

function downloadCSV(rows, filename) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const lines   = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => headers.map(h => escapeCSV(row[h])).join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────────────────────

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
  const [profiles,      setProfiles]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [downloading,   setDownloading]   = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    adminAPI.listProfiles().then(r=>setProfiles(r.data||[])).catch(()=>{}).finally(()=>setLoading(false));
  }, []);

  const downloadAll = async () => {
    setDownloading(true);
    try {
      const rows = await Promise.all(
        profiles.map(async p => {
          const pid = p.profile_id || p.id;
          try {
            const r = await adminAPI.getOnboarding(pid);
            return buildStudioRow(p, r.data);
          } catch {
            return buildStudioRow(p, {});
          }
        })
      );
      const date = new Date().toISOString().split('T')[0];
      downloadCSV(rows, `qala_all_studios_${date}.csv`);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <Spinner full />;

  const avgPct   = profiles.length ? Math.round(profiles.reduce((a,p)=>a+(p.completion_percentage||0),0)/profiles.length) : 0;
  const complete = profiles.filter(p=>(p.completion_percentage||0)===100).length;
  const flagged  = profiles.filter(p=>['a','b','c','d','e','f'].some(k=>p.section_statuses?.[`section_${k}_status`]==='flagged')).length;

  return (
    <div style={{ padding:'clamp(20px, 3vw, 40px) clamp(16px, 4vw, 48px)' }}>
      <div className="fade-up" style={{ marginBottom:40, display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:42, fontWeight:700, color:'var(--text)', marginBottom:6 }}>
            Admin <em style={{ color:'var(--gold)' }}>Dashboard</em>
          </h1>
          <p style={{ color:'var(--text3)', fontSize:15 }}>Review and manage all seller profiles.</p>
        </div>
        {profiles.length > 0 && (
          <button
            onClick={downloadAll}
            disabled={downloading}
            style={{
              display:'flex', alignItems:'center', gap:8,
              padding:'10px 20px', borderRadius:8, fontSize:13, fontWeight:600,
              background: downloading ? 'var(--border)' : '#C46E49',
              color: downloading ? 'var(--text3)' : '#fff',
              border:'none', cursor: downloading ? 'not-allowed' : 'pointer',
              fontFamily:'var(--font-body)', transition:'all 0.2s', flexShrink:0,
            }}
          >
            {downloading
              ? <><span className="spinner" style={{width:14,height:14,borderColor:'rgba(255,255,255,0.3)',borderTopColor:'#fff'}} /> Downloading…</>
              : '↓ Download All Studios CSV'
            }
          </button>
        )}
      </div>

      {/* Stats row */}
      <div className="fade-up" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:16, marginBottom:36 }}>
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
  const [profiles,    setProfiles]    = useState([]);
  const [selected,    setSelected]    = useState(null);
  const [onboarding,  setOnboarding]  = useState(null);
  const [showFlag,    setShowFlag]    = useState(false);
  const [flagForm,    setFlagForm]    = useState({ model:'studio_details', field:'studio_name', reason:'' });
  const [flagging,    setFlagging]    = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [verifyConfirm, setVerifyConfirm] = useState(false);
  const [toggling,    setToggling]    = useState(false);
  const [publishOverrides, setPublishOverrides] = useState({}); // "model:id" → bool
  const { toasts, success, error } = useToast();
  const { pid: urlPid } = useParams();

  const loadOnboarding = p => {
    const pid = p.profile_id || p.id;
    setOnboarding(null);
    setPublishOverrides({});
    // Load onboarding data and visibility overrides in parallel
    Promise.all([
      adminAPI.getOnboarding(pid),
      adminAPI.getVisibilityOverrides(pid),
    ]).then(([onboardingRes, overridesRes]) => {
      setOnboarding(onboardingRes.data);
      setPublishOverrides(overridesRes.data || {});
    }).catch(() => {
      adminAPI.getOnboarding(pid).then(r => setOnboarding(r.data)).catch(() => {});
    });
  };

  useEffect(() => {
    adminAPI.listProfiles().then(r => {
      const profs = r.data || [];
      setProfiles(profs);
      const target = urlPid
        ? profs.find(p => String(p.profile_id || p.id) === String(urlPid)) || profs[0]
        : profs[0];
      if (target) { setSelected(target); loadOnboarding(target); }
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlPid]);

  const selectProfile = p => {
    setSelected(p); loadOnboarding(p); setShowFlag(false); setVerifyConfirm(false);
  };

  const toggleVerified = async () => {
    if (!selected) return;
    setToggling(true);
    try {
      const res = await adminAPI.toggleVerified(selected.profile_id || selected.id);
      const newState = res.data.is_verified;
      // Update selected and profiles list in-place — no full reload needed
      setSelected(s => ({ ...s, is_verified: newState }));
      setProfiles(ps => ps.map(p =>
        (p.profile_id || p.id) === (selected.profile_id || selected.id)
          ? { ...p, is_verified: newState }
          : p
      ));
      success(newState ? 'Studio verified — now visible in directory & matching.' : 'Studio unverified — hidden from directory & matching.');
    } catch(e) {
      error(e.response?.data?.detail || 'Toggle failed. Try again.');
    } finally {
      setToggling(false);
      setVerifyConfirm(false);
    }
  };

  const togglePublish = async (model, objectId) => {
    const key = `${model}:${objectId}`;
    const profileId = selected?.profile_id || selected?.id;
    if (!profileId) return;
    const current = publishOverrides[key] !== false; // default true = published
    setPublishOverrides(o => ({ ...o, [key]: !current })); // optimistic
    try {
      const res = await adminAPI.togglePublish(profileId, { model, object_id: objectId });
      setPublishOverrides(o => ({ ...o, [key]: res.data.is_published }));
      success(res.data.is_published ? 'Item visible to buyers.' : 'Item hidden from buyers.');
    } catch(e) {
      setPublishOverrides(o => ({ ...o, [key]: current })); // revert
      error(e.response?.data?.detail || 'Toggle failed. Try again.');
    }
  };

  const itemPublished = (model, objectId) =>
    publishOverrides[`${model}:${objectId}`] !== false;

  const submitFlag = async () => {
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

  const downloadSingle = () => {
    if (!onboarding || !selected) return;
    setDownloading(true);
    try {
      const row  = buildStudioRow(selected, onboarding);
      const name = (selected.business_name || `studio_${selected.profile_id||selected.id}`).replace(/\s+/g,'_').toLowerCase();
      downloadCSV([row], `qala_${name}.csv`);
    } finally {
      setDownloading(false);
    }
  };

  // ── DataRow ──
  const DataRow = ({ k, v }) => {
    if (SKIP_KEYS.includes(k))                     return null;
    if (typeof v === 'object')                     return null;
    if (v === null || v === undefined || v === '') return null;
    return (
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'9px 12px', background:'var(--surface2)', borderRadius:7, marginBottom:5, gap:16 }}>
        <span style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.06em', flexShrink:0 }}>{k.replace(/_/g,' ')}</span>
        <span style={{ fontSize:13, color:'var(--text)', textAlign:'right', wordBreak:'break-word', maxWidth:'65%' }}>{String(v)}</span>
      </div>
    );
  };

  // ── Block ──
  const Block = ({ title, data, model, profileId, onSaved }) => {
    const [editing, setEditing] = useState(false);
    const [form,    setForm]    = useState({});
    const [saving,  setSaving]  = useState(false);

    if (!data) return null;

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

        {editing ? (
          <div style={{ background:'var(--surface2)', borderRadius:'var(--radius)', padding:'16px 18px', marginBottom:8, border:'1px solid var(--teal)' }}>
            <div style={{ fontSize:11, fontWeight:600, color:'var(--teal)', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:14 }}>
              Editing — changes save directly to seller's profile
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:12, marginBottom:14 }}>
              {editableKeys.map(([k]) => (
                <div className="field" key={k} style={ k === 'short_description' ? { gridColumn: '1 / -1' } : {} }>
                  <label style={{ fontSize:11 }}>{k.replace(/_/g,' ')}</label>
                  {k === 'short_description' ? (
                    <textarea
                      value={form[k] ?? ''}
                      onChange={e => setForm(f => ({...f, [k]: e.target.value}))}
                      style={{ fontSize:13, resize:'vertical', minHeight:80 }}
                      placeholder="Short directory card blurb (max ~180 chars)"
                      maxLength={200}
                    />
                  ) : (
                    <input
                      value={form[k] ?? ''}
                      onChange={e => setForm(f => ({...f, [k]: e.target.value}))}
                      style={{ fontSize:13 }}
                    />
                  )}
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
          Object.entries(data).map(([k,v]) => <DataRow key={k} k={k} v={v} />)
        )}
      </div>
    );
  };

  // ── USPBlock — Section A.6 Studio Strengths ──
  const USPBlock = ({ usps, profileId, onSaved }) => {
    const [editing, setEditing] = useState(false);
    const [items,   setItems]   = useState([]);
    const [saving,  setSaving]  = useState(false);

    const startEdit = () => {
      setItems((usps || []).map(u => ({ strength: u.strength })));
      setEditing(true);
    };
    const cancel = () => setEditing(false);
    const setItem = (i, val) => setItems(prev => prev.map((it, idx) => idx === i ? { strength: val } : it));
    const addItem = () => { if (items.length < 5) setItems(prev => [...prev, { strength: '' }]); };
    const removeItem = i => setItems(prev => prev.filter((_, idx) => idx !== i));
    const save = async () => {
      setSaving(true);
      try {
        await adminAPI.editSection(profileId, 'usps', items.filter(it => it.strength.trim()).map((it, i) => ({ order: i + 1, strength: it.strength.trim() })));
        success('USPs saved!');
        setEditing(false);
        onSaved();
      } catch(e) { error(e.response?.data?.error || 'Save failed'); }
      finally { setSaving(false); }
    };

    if (!usps?.length && !editing) return (
      <div style={{ marginBottom:24 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <div style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Studio Strengths (USPs)</div>
          <button className="btn btn-ghost btn-sm" style={{ fontSize:11, color:'var(--teal)', borderColor:'var(--teal)' }} onClick={startEdit}>+ Add</button>
        </div>
        <div style={{ fontSize:12, color:'var(--text4)', fontStyle:'italic' }}>No USPs added yet.</div>
      </div>
    );

    return (
      <div style={{ marginBottom:24 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <div style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Studio Strengths (USPs)</div>
          {!editing && <button className="btn btn-ghost btn-sm" style={{ fontSize:11, color:'var(--teal)', borderColor:'var(--teal)' }} onClick={startEdit}>Edit</button>}
        </div>

        {editing ? (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {items.map((it, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:11, fontWeight:700, color:'var(--gold)', minWidth:20 }}>{i + 1}.</span>
                <input
                  value={it.strength}
                  onChange={e => setItem(i, e.target.value)}
                  placeholder={`Strength ${i + 1}`}
                  style={{ flex:1, fontSize:13, padding:'7px 10px', borderRadius:6, border:'1px solid var(--border)', background:'var(--surface)', fontFamily:'var(--font-body)', color:'var(--text)' }}
                />
                <button onClick={() => removeItem(i)} style={{ background:'none', border:'none', color:'var(--text4)', fontSize:16, cursor:'pointer', padding:'0 4px', lineHeight:1 }}>×</button>
              </div>
            ))}
            {items.length < 5 && (
              <button onClick={addItem} style={{ alignSelf:'flex-start', fontSize:12, color:'var(--teal)', background:'none', border:'1px dashed var(--teal)', borderRadius:6, padding:'5px 12px', cursor:'pointer', fontFamily:'var(--font-body)' }}>+ Add Strength</button>
            )}
            <div style={{ display:'flex', gap:8, marginTop:4 }}>
              <button className="btn btn-ghost btn-sm" style={{ fontSize:11, color:'var(--teal)', borderColor:'var(--teal)' }} onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
              <button className="btn btn-ghost btn-sm" style={{ fontSize:11 }} onClick={cancel}>Cancel</button>
            </div>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {usps.map((u, i) => (
              <div key={u.id || i} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'8px 12px', background:'var(--surface2)', borderRadius:7, border:'1px solid var(--border)' }}>
                <span style={{ fontSize:11, fontWeight:700, color:'var(--gold)', minWidth:18 }}>{i + 1}.</span>
                <span style={{ fontSize:13, color:'var(--text2)', lineHeight:1.5 }}>{u.strength}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ── BuyerRequirementsBlock — Section D.4 Pre-Call Questions ──
  const BuyerRequirementsBlock = ({ requirements, profileId, onSaved }) => {
    const [editing, setEditing] = useState(false);
    const [items,   setItems]   = useState([]);
    const [saving,  setSaving]  = useState(false);

    const startEdit = () => {
      setItems((requirements || []).map(r => ({ question: r.question })));
      setEditing(true);
    };
    const cancel = () => setEditing(false);
    const setItem = (i, val) => setItems(prev => prev.map((it, idx) => idx === i ? { question: val } : it));
    const addItem = () => { if (items.length < 5) setItems(prev => [...prev, { question: '' }]); };
    const removeItem = i => setItems(prev => prev.filter((_, idx) => idx !== i));
    const save = async () => {
      setSaving(true);
      try {
        await adminAPI.editSection(profileId, 'buyer-requirements', items.filter(it => it.question.trim()).map((it, i) => ({ order: i + 1, question: it.question.trim() })));
        success('Pre-call questions saved!');
        setEditing(false);
        onSaved();
      } catch(e) { error(e.response?.data?.error || 'Save failed'); }
      finally { setSaving(false); }
    };

    if (!requirements?.length && !editing) return (
      <div style={{ marginBottom:24 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <div style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Pre-Call Questions for Buyers</div>
          <button className="btn btn-ghost btn-sm" style={{ fontSize:11, color:'var(--teal)', borderColor:'var(--teal)' }} onClick={startEdit}>+ Add</button>
        </div>
        <div style={{ fontSize:12, color:'var(--text4)', fontStyle:'italic' }}>No pre-call questions added yet.</div>
      </div>
    );

    return (
      <div style={{ marginBottom:24 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <div style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Pre-Call Questions for Buyers</div>
          {!editing && <button className="btn btn-ghost btn-sm" style={{ fontSize:11, color:'var(--teal)', borderColor:'var(--teal)' }} onClick={startEdit}>Edit</button>}
        </div>

        {editing ? (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {items.map((it, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:11, fontWeight:700, color:'var(--teal)', minWidth:26 }}>Q{i + 1}</span>
                <input
                  value={it.question}
                  onChange={e => setItem(i, e.target.value)}
                  placeholder={`Question ${i + 1}`}
                  style={{ flex:1, fontSize:13, padding:'7px 10px', borderRadius:6, border:'1px solid var(--border)', background:'var(--surface)', fontFamily:'var(--font-body)', color:'var(--text)' }}
                />
                <button onClick={() => removeItem(i)} style={{ background:'none', border:'none', color:'var(--text4)', fontSize:16, cursor:'pointer', padding:'0 4px', lineHeight:1 }}>×</button>
              </div>
            ))}
            {items.length < 5 && (
              <button onClick={addItem} style={{ alignSelf:'flex-start', fontSize:12, color:'var(--teal)', background:'none', border:'1px dashed var(--teal)', borderRadius:6, padding:'5px 12px', cursor:'pointer', fontFamily:'var(--font-body)' }}>+ Add Question</button>
            )}
            <div style={{ display:'flex', gap:8, marginTop:4 }}>
              <button className="btn btn-ghost btn-sm" style={{ fontSize:11, color:'var(--teal)', borderColor:'var(--teal)' }} onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
              <button className="btn btn-ghost btn-sm" style={{ fontSize:11 }} onClick={cancel}>Cancel</button>
            </div>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {requirements.map((r, i) => (
              <div key={r.id || i} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'8px 12px', background:'var(--surface2)', borderRadius:7, border:'1px solid var(--border)' }}>
                <span style={{ fontSize:11, fontWeight:700, color:'var(--teal)', minWidth:18 }}>Q{i + 1}</span>
                <span style={{ fontSize:13, color:'var(--text2)', lineHeight:1.5 }}>{r.question}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ── BuyerCoordinatorBlock — Section D.5 Buyer Coordinator ──
  const BuyerCoordinatorBlock = ({ coordinator, profileId, onSaved }) => {
    const [editing, setEditing] = useState(false);
    const [form,    setForm]    = useState({});
    const [saving,  setSaving]  = useState(false);

    const startEdit = () => {
      setForm({ name: coordinator?.name || '', position: coordinator?.position || '', writeup: coordinator?.writeup || '' });
      setEditing(true);
    };
    const cancel = () => setEditing(false);
    const save = async () => {
      setSaving(true);
      try {
        await adminAPI.editSection(profileId, 'buyer-coordinator', form);
        success('Buyer coordinator saved!');
        setEditing(false);
        onSaved();
      } catch(e) { error(e.response?.data?.error || 'Save failed'); }
      finally { setSaving(false); }
    };

    const imgSrc = coordinator?.image ? mediaUrl(coordinator.image) : null;

    if (!coordinator && !editing) return (
      <div style={{ marginBottom:24 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <div style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Buyer Coordinator</div>
          <button className="btn btn-ghost btn-sm" style={{ fontSize:11, color:'var(--teal)', borderColor:'var(--teal)' }} onClick={startEdit}>+ Add</button>
        </div>
        <div style={{ fontSize:12, color:'var(--text4)', fontStyle:'italic' }}>No coordinator added yet.</div>
      </div>
    );

    return (
      <div style={{ marginBottom:24 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <div style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Buyer Coordinator</div>
          {!editing && <button className="btn btn-ghost btn-sm" style={{ fontSize:11, color:'var(--teal)', borderColor:'var(--teal)' }} onClick={startEdit}>Edit</button>}
        </div>

        {editing ? (
          <div style={{ display:'flex', flexDirection:'column', gap:10, padding:'12px 14px', background:'var(--surface2)', borderRadius:8, border:'1px solid var(--border)' }}>
            <div className="field" style={{ margin:0 }}>
              <label style={{ fontSize:11 }}>Name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Coordinator name" />
            </div>
            <div className="field" style={{ margin:0 }}>
              <label style={{ fontSize:11 }}>Position</label>
              <input value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))} placeholder="e.g. Design Liaison" />
            </div>
            <div className="field" style={{ margin:0 }}>
              <label style={{ fontSize:11 }}>Writeup</label>
              <textarea value={form.writeup} onChange={e => setForm(f => ({ ...f, writeup: e.target.value }))} placeholder="Short bio or description…" rows={3} style={{ resize:'vertical', fontSize:13, padding:'8px 10px', borderRadius:6, border:'1px solid var(--border)', background:'var(--surface)', fontFamily:'var(--font-body)', color:'var(--text)', width:'100%' }} />
            </div>
            {imgSrc && <div style={{ fontSize:11, color:'var(--text4)' }}>Photo is set by the studio — not editable here.</div>}
            <div style={{ display:'flex', gap:8, marginTop:2 }}>
              <button className="btn btn-ghost btn-sm" style={{ fontSize:11, color:'var(--teal)', borderColor:'var(--teal)' }} onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
              <button className="btn btn-ghost btn-sm" style={{ fontSize:11 }} onClick={cancel}>Cancel</button>
            </div>
          </div>
        ) : (
          <div style={{ display:'flex', alignItems:'flex-start', gap:14, padding:'12px 14px', background:'var(--surface2)', borderRadius:8, border:'1px solid var(--border)' }}>
            {imgSrc ? (
              <img src={imgSrc} alt={coordinator.name} style={{ width:52, height:52, borderRadius:'50%', objectFit:'cover', flexShrink:0, border:'1px solid var(--border)' }} onError={e => { e.target.style.display='none'; }} />
            ) : (
              <div style={{ width:52, height:52, borderRadius:'50%', background:'var(--surface3)', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, color:'var(--text4)' }}>👤</div>
            )}
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:600, fontSize:14, color:'var(--text)', marginBottom:2 }}>{coordinator.name}</div>
              {coordinator.position && <div style={{ fontSize:12, color:'var(--gold)', marginBottom:6 }}>{coordinator.position}</div>}
              {coordinator.writeup  && <div style={{ fontSize:12, color:'var(--text3)', lineHeight:1.6 }}>{coordinator.writeup}</div>}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── ProductsBlock — Section B ──
  const ProductsBlock = ({ productTypes, fabrics, brands, awards, togglePublish, itemPublished }) => {
    const pt = productTypes || {};
    const productList = Object.entries(pt)
      .filter(([k, v]) => v === true && !['id','is_flagged','flag_reason','flag_resolved'].includes(k))
      .map(([k]) => k.replace(/_/g, ' '));
    const fabricList = (fabrics || []).filter(f => f.works_with).map(f => f.fabric_name);
    const brandList  = (brands  || []);
    const awardList  = (awards  || []);

    if (!productList.length && !fabricList.length && !brandList.length && !awardList.length) return null;

    const Chip = ({ label, color }) => (
      <span style={{
        fontSize: 11, padding: '3px 10px', borderRadius: 6, textTransform: 'capitalize',
        background: color === 'gold' ? 'var(--gold-dim)' : color === 'teal' ? 'var(--teal-dim)' : 'var(--surface)',
        color: color === 'gold' ? 'var(--gold)' : color === 'teal' ? 'var(--teal)' : 'var(--text3)',
      }}>{label}</span>
    );

    return (
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily:'var(--font-display)', fontSize:17, fontWeight:600, color:'var(--gold)', marginBottom:16 }}>
          Section B — Products &amp; Fabrics
        </div>
        {productList.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>Product Types</div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {productList.map(p => <Chip key={p} label={p} />)}
            </div>
          </div>
        )}
        {fabricList.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>Fabrics</div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {(fabrics || []).filter(f => f.works_with).map(f => {
                const pub = !togglePublish || itemPublished('fabric_answer', f.id);
                return (
                  <span key={f.id} style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11, padding:'3px 10px', borderRadius:6,
                    background: pub ? 'var(--teal-dim)' : 'var(--surface)', color: pub ? 'var(--teal)' : 'var(--text4)',
                    opacity: pub ? 1 : 0.6, border: pub ? 'none' : '1px dashed var(--border)',
                  }}>
                    {f.fabric_name}
                    {!pub && <span style={{ fontSize:9, fontWeight:700, color:'var(--red)' }}>HIDDEN</span>}
                    {togglePublish && (
                      <button onClick={() => togglePublish('fabric_answer', f.id)} title={pub ? 'Hide' : 'Show'}
                        style={{ background:'none', border:'none', cursor:'pointer', fontSize:11, padding:0, lineHeight:1, color: pub ? 'var(--text3)' : 'var(--red)' }}>
                        {pub ? '👁' : '🚫'}
                      </button>
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        )}
        {brandList.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>Brands Worked With</div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {brandList.map(b => {
                const pub = !togglePublish || itemPublished('brand_experience', b.id);
                return (
                  <div key={b.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 12px', background:'var(--surface2)', borderRadius:7, gap:12, opacity: pub ? 1 : 0.55, border: pub ? '1px solid transparent' : '1px dashed var(--red)' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      {b.image && <img src={mediaUrl(b.image)} alt={b.brand_name} style={{ width:36, height:36, objectFit:'cover', borderRadius:5, border:'1px solid var(--border)' }} onError={e => { e.target.style.display='none'; }} />}
                      <span style={{ fontWeight:600, fontSize:13, color: pub ? 'var(--text)' : 'var(--text3)' }}>{b.brand_name}</span>
                      {!pub && <span style={{ fontSize:9, fontWeight:700, color:'var(--red)', letterSpacing:'0.04em' }}>HIDDEN</span>}
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      {b.scope && <span style={{ fontSize:12, color:'var(--text3)' }}>{b.scope}</span>}
                      {togglePublish && (
                        <button onClick={() => togglePublish('brand_experience', b.id)} title={pub ? 'Hide from buyers' : 'Show to buyers'}
                          style={{ background:'none', border:'none', cursor:'pointer', fontSize:14, padding:'2px 4px', color: pub ? 'var(--text3)' : 'var(--red)', opacity:0.7, transition:'opacity 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.opacity='1'} onMouseLeave={e => e.currentTarget.style.opacity='0.7'}>
                          {pub ? '👁' : '🚫'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {awardList.length > 0 && (
          <div>
            <div style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>Awards</div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {awardList.map(a => {
                const pub = !togglePublish || itemPublished('award_mention', a.id);
                return (
                  <span key={a.id} style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11, padding:'3px 10px', borderRadius:6,
                    background: pub ? 'var(--gold-dim)' : 'var(--surface)', color: pub ? 'var(--gold)' : 'var(--text4)',
                    opacity: pub ? 1 : 0.6, border: pub ? 'none' : '1px dashed var(--border)',
                  }}>
                    {a.award_name}
                    {!pub && <span style={{ fontSize:9, fontWeight:700, color:'var(--red)' }}>HIDDEN</span>}
                    {togglePublish && (
                      <button onClick={() => togglePublish('award_mention', a.id)} title={pub ? 'Hide' : 'Show'}
                        style={{ background:'none', border:'none', cursor:'pointer', fontSize:11, padding:0, lineHeight:1, color: pub ? 'var(--text3)' : 'var(--red)' }}>
                        {pub ? '👁' : '🚫'}
                      </button>
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── MediaViewer ──
  const MediaViewer = ({ files, title, mediaType, profileId, onDeleted, togglePublish, itemPublished }) => {
    const [lightbox, setLightbox] = useState(null);
    const [deleting, setDeleting] = useState(null);
    if (!files?.length) return null;

    const handleDelete = async (fileId) => {
      if (!confirm('Delete this file permanently?')) return;
      setDeleting(fileId);
      try {
        if (mediaType === 'bts') {
          await adminAPI.deleteBTSMedia(profileId, fileId);
        } else {
          await adminAPI.deleteStudioMedia(profileId, fileId);
        }
        success('File deleted');
        if (onDeleted) onDeleted();
      } catch(e) {
        error(e.response?.data?.detail || 'Delete failed');
      } finally {
        setDeleting(null);
      }
    };

    return (
      <div style={{ marginBottom: 16 }}>
        {title && <div style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>{title}</div>}
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {files.map((f, i) => {
            const url  = f.file  ? mediaUrl(f.file)  : null;
            const url2 = f.image ? mediaUrl(f.image) : null;
            const src  = url || url2;
            const isVideo = (f.mime_type || '').startsWith('video/');
            const mediaModel = mediaType === 'bts' ? 'bts_media' : 'studio_media';
            const published  = !togglePublish || !f.id || itemPublished(mediaModel, f.id);
            if (!src) return null;
            return (
              <div key={f.id || i} style={{ position:'relative', width:88, height:88, borderRadius:8, overflow:'hidden', background:'var(--surface3)', border:`1px solid ${published ? 'var(--border)' : 'var(--red)'}`, flexShrink:0, opacity: published ? 1 : 0.55 }}>
                <div onClick={() => setLightbox({ src, isVideo })} style={{ cursor:'pointer', width:'100%', height:'100%' }}>
                  {isVideo
                    ? <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:4 }}>
                        <span style={{ fontSize:20 }}>▶</span>
                        <span style={{ fontSize:9, color:'var(--text4)' }}>VIDEO</span>
                      </div>
                    : <img src={src} alt={f.caption || f.file_name || ''} style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e => { e.target.style.display='none'; }} />
                  }
                </div>
                {f.media_type && <span style={{ position:'absolute', bottom:3, left:3, fontSize:8, fontWeight:700, background:'rgba(0,0,0,0.6)', color:'#fff', padding:'1px 5px', borderRadius:3, textTransform:'uppercase' }}>{f.media_type}</span>}
                {!published && <span style={{ position:'absolute', bottom:3, right:3, fontSize:7, fontWeight:700, background:'var(--red)', color:'#fff', padding:'1px 4px', borderRadius:3, letterSpacing:'0.04em' }}>HIDDEN</span>}
                {/* Eye toggle */}
                {togglePublish && f.id && (
                  <button
                    onClick={(e) => { e.stopPropagation(); togglePublish(mediaModel, f.id); }}
                    title={published ? 'Hide from buyers' : 'Show to buyers'}
                    style={{
                      position:'absolute', top:3, right: profileId ? 27 : 3, width:20, height:20, borderRadius:'50%',
                      background: published ? 'rgba(0,0,0,0.6)' : 'rgba(201,64,64,0.85)', border:'none', color:'#fff',
                      fontSize:10, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
                      opacity:0.8, transition:'opacity 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '0.8'}
                  >
                    {published ? '👁' : '🚫'}
                  </button>
                )}
                {/* Delete button */}
                {profileId && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(f.id); }}
                    disabled={deleting === f.id}
                    style={{
                      position:'absolute', top:3, right:3, width:20, height:20, borderRadius:'50%',
                      background:'rgba(0,0,0,0.6)', border:'none', color:'#fff',
                      fontSize:11, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
                      opacity: deleting === f.id ? 0.5 : 0.7,
                      transition:'opacity 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}
                  >
                    {deleting === f.id ? '…' : '✕'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {lightbox && (
          <div onClick={() => setLightbox(null)} style={{
            position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:9999,
            display:'flex', alignItems:'center', justifyContent:'center',
            padding:24, overflow:'hidden',
          }}>
            {lightbox.isVideo
              ? <video
                  src={lightbox.src} controls autoPlay
                  style={{ maxWidth:'90vw', maxHeight:'85vh', borderRadius:8, display:'block' }}
                  onClick={e => e.stopPropagation()}
                />
              : <img
                  src={lightbox.src} alt=""
                  style={{ maxWidth:'90vw', maxHeight:'85vh', borderRadius:8, objectFit:'contain', display:'block', width:'auto', height:'auto' }}
                  onClick={e => e.stopPropagation()}
                  onError={e => { e.target.src = ''; e.target.alt = 'Failed to load image'; e.target.style.background = 'var(--surface3)'; e.target.style.padding = '40px'; e.target.style.color = 'var(--text3)'; }}
                />
            }
            <button onClick={() => setLightbox(null)} style={{ position:'fixed', top:20, right:24, background:'none', border:'none', color:'#fff', fontSize:28, cursor:'pointer', lineHeight:1 }}>✕</button>
          </div>
        )}
      </div>
    );
  };

  // ── CraftBlock ──
  const CraftBlock = ({ crafts, profileId, onSaved, togglePublish, itemPublished }) => {
    const [editingId, setEditingId] = useState(null);
    const [form,      setForm]      = useState({});
    const [saving,    setSaving]    = useState(false);

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
        {crafts.map(c => {
          const pub = !togglePublish || itemPublished('craft', c.id);
          return (
          <div key={c.id} style={{ padding:'14px 16px', background:'var(--surface2)', borderRadius:'var(--radius)', marginBottom:10, border:`1px solid ${pub ? 'var(--border)' : 'var(--red)'}`, borderLeft:`3px solid ${c.is_primary?'var(--gold)':'var(--border)'}`, opacity: pub ? 1 : 0.6 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: editingId===c.id ? 14 : 0 }}>
              <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                <span style={{ fontWeight:600, fontSize:14, color:'var(--text)' }}>{c.craft_name}</span>
                {c.is_primary && <span className="badge badge-gold" style={{ fontSize:10 }}>Primary</span>}
                {c.innovation_level && <span className="badge badge-gray" style={{ fontSize:10 }}>{c.innovation_level} innovation</span>}
                {c.sampling_time_weeks && <span style={{ fontSize:12, color:'var(--text3)' }}>{c.sampling_time_weeks}wk</span>}
                {!pub && <span style={{ fontSize:9, fontWeight:700, color:'var(--red)', letterSpacing:'0.04em', textTransform:'uppercase' }}>Hidden</span>}
              </div>
              <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                {togglePublish && (
                  <button
                    onClick={() => togglePublish('craft', c.id)}
                    title={pub ? 'Hide from buyers' : 'Show to buyers'}
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize:13, padding:'3px 8px', color: pub ? 'var(--text3)' : 'var(--red)', borderColor: pub ? 'var(--border)' : 'var(--red)' }}>
                    {pub ? '👁' : '🚫'}
                  </button>
                )}
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize:11, color: editingId===c.id ? 'var(--text3)' : 'var(--teal)', borderColor: editingId===c.id ? 'var(--border)' : 'var(--teal)' }}
                  onClick={() => editingId===c.id ? setEditingId(null) : startEdit(c)}>
                  {editingId===c.id ? 'Cancel' : 'Edit'}
                </button>
              </div>
            </div>
            {editingId !== c.id && c.specialization && (
              <div style={{ fontSize:12, color:'var(--text3)', marginTop:6 }}>{c.specialization}</div>
            )}
            {editingId !== c.id && c.image && (
              <MediaViewer files={[{ id: c.id, image: c.image, mime_type: 'image/jpeg', file_name: c.craft_name }]} />
            )}
            {editingId === c.id && (
              <div>
                <div style={{ fontSize:11, fontWeight:600, color:'var(--teal)', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:12 }}>
                  Editing craft
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:10, marginBottom:12 }}>
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
          );
        })}
      </>
    );
  };

  const pid = selected?.profile_id || selected?.id;

  return (
    <div style={{ padding:'clamp(20px, 3vw, 40px) clamp(16px, 4vw, 48px)' }}>
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
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
                  <div style={{ fontWeight:700, fontSize:16, color:'var(--text)' }}>
                    {selected.business_name || selected.email || `Profile #${pid}`}
                  </div>
                  {/* Verified badge */}
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
                    padding: '3px 10px', borderRadius: 20,
                    background: selected.is_verified ? 'rgba(58,158,98,0.1)' : 'rgba(26,22,18,0.06)',
                    color: selected.is_verified ? 'var(--green)' : 'var(--text4)',
                    border: `1px solid ${selected.is_verified ? 'rgba(58,158,98,0.25)' : 'var(--border)'}`,
                  }}>
                    {selected.is_verified ? '✓ Verified' : '○ Not Verified'}
                  </span>
                </div>
                <div style={{ fontSize:13, color:'var(--text3)' }}>
                  {selected.seller_email || selected.email} · {selected.completion_percentage||0}% complete
                </div>
                <SectionBadges statuses={selected.section_statuses} />
              </div>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                {/* Verify / Unverify toggle */}
                <button
                  onClick={() => setVerifyConfirm(true)}
                  disabled={toggling}
                  style={{
                    padding:'9px 16px', borderRadius:8, fontSize:12, fontWeight:600,
                    background: selected.is_verified ? 'rgba(201,64,64,0.08)' : 'rgba(58,158,98,0.1)',
                    color: selected.is_verified ? 'var(--red)' : 'var(--green)',
                    border: `1px solid ${selected.is_verified ? 'rgba(201,64,64,0.3)' : 'rgba(58,158,98,0.3)'}`,
                    cursor: toggling ? 'not-allowed' : 'pointer',
                    fontFamily:'var(--font-body)', transition:'all 0.2s',
                  }}
                >
                  {toggling
                    ? <span className="spinner" style={{width:13,height:13}} />
                    : selected.is_verified ? 'Unverify Studio' : 'Verify Studio'
                  }
                </button>
                {onboarding && (
                  <button
                    onClick={downloadSingle}
                    disabled={downloading}
                    style={{
                      padding:'9px 18px', borderRadius:8, fontSize:12, fontWeight:600,
                      background:'transparent', color:'#C46E49',
                      border:'1px solid #C46E49', cursor:'pointer',
                      fontFamily:'var(--font-body)', transition:'all 0.2s',
                    }}
                  >
                    ↓ Download CSV
                  </button>
                )}
                <button className="btn btn-terra" onClick={() => setShowFlag(!showFlag)}>
                  Flag a Field
                </button>
              </div>
            </div>
          </div>

          {/* Verify confirmation modal */}
          {verifyConfirm && (
            <div style={{
              position:'fixed', inset:0, zIndex:9000,
              background:'rgba(26,14,8,0.55)', backdropFilter:'blur(6px)',
              display:'flex', alignItems:'center', justifyContent:'center', padding:20,
            }} onClick={() => setVerifyConfirm(false)}>
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  background:'var(--surface)', borderRadius:16,
                  padding:'32px 36px', width:'100%', maxWidth:420,
                  border:'1px solid var(--border)', boxShadow:'var(--shadow-lg)',
                }}
              >
                <div style={{ fontSize:28, marginBottom:14, textAlign:'center' }}>
                  {selected.is_verified ? '⚠️' : '✅'}
                </div>
                <div style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:700, color:'var(--text)', marginBottom:10, textAlign:'center' }}>
                  {selected.is_verified ? 'Unverify this studio?' : 'Verify this studio?'}
                </div>
                <p style={{ fontSize:13, color:'var(--text3)', lineHeight:1.65, textAlign:'center', marginBottom:24 }}>
                  {selected.is_verified
                    ? <>Unverifying <strong style={{color:'var(--text)'}}>{selected.business_name}</strong> will immediately hide them from the directory, search results, and all buyer matching. This takes effect instantly.</>
                    : <>Verifying <strong style={{color:'var(--text)'}}>{selected.business_name}</strong> will make them visible in the directory and eligible for buyer matching. Make sure their profile is complete before proceeding.</>
                  }
                </p>
                <div style={{ display:'flex', gap:10 }}>
                  <button
                    onClick={toggleVerified}
                    disabled={toggling}
                    style={{
                      flex:1, padding:'12px', borderRadius:8, fontSize:13, fontWeight:600,
                      background: selected.is_verified ? 'var(--red)' : 'var(--green)',
                      color:'#fff', border:'none', cursor: toggling ? 'not-allowed' : 'pointer',
                      fontFamily:'var(--font-body)', transition:'all 0.2s',
                    }}
                  >
                    {toggling
                      ? <><span className="spinner" style={{width:14,height:14,borderColor:'rgba(255,255,255,0.3)',borderTopColor:'#fff'}} /> Working…</>
                      : selected.is_verified ? 'Yes, Unverify' : 'Yes, Verify'
                    }
                  </button>
                  <button
                    onClick={() => setVerifyConfirm(false)}
                    className="btn btn-ghost"
                    style={{ flex:1, justifyContent:'center' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Flag form */}
          {showFlag && (
            <div className="card fade-up" style={{ marginBottom:20, borderColor:'rgba(224,85,85,0.3)' }}>
              <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:600, color:'var(--red)', marginBottom:16 }}>
                Flag a Field
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:12, marginBottom:12 }}>
                <div className="field">
                  <label>Model / Section</label>
                  <select value={flagForm.model} onChange={e => {
                    const m = e.target.value;
                    const fieldOpts = FLAG_FIELD_OPTIONS[m];
                    setFlagForm(f=>({...f, model: m, field: fieldOpts ? fieldOpts[0] : ''}));
                  }}>
                    {['studio_details','product_types','collab_design','production_scale','process_readiness','craft','fabric_answer','brand_experience','award_mention','studio_contact','studio_usp','studio_media','moq_entry','buyer_requirement','bts_media'].map(m =>
                      <option key={m} value={m}>{m.replace(/_/g,' ')}</option>
                    )}
                  </select>
                </div>
                <div className="field">
                  <label>Field to flag</label>
                  {FLAG_FIELD_OPTIONS[flagForm.model] ? (
                    <select value={flagForm.field} onChange={e => setFlagForm(f=>({...f, field:e.target.value}))}>
                      {FLAG_FIELD_OPTIONS[flagForm.model].map(f =>
                        <option key={f} value={f}>{f.replace(/_/g,' ')}</option>
                      )}
                    </select>
                  ) : (
                    <input
                      value={flagForm.field}
                      onChange={e => setFlagForm(f=>({...f, field:e.target.value}))}
                      placeholder="Leave blank to flag entire row"
                    />
                  )}
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

            <Block title="Section A — Studio Details" data={onboarding.studio_details} model="studio_details" profileId={pid} onSaved={() => loadOnboarding(selected)} />
            <USPBlock usps={onboarding.studio_details?.usps} profileId={pid} onSaved={() => loadOnboarding(selected)} />
            <MediaViewer files={onboarding.studio_details?.media_files} title="Studio Media (Hero / Work Samples)" mediaType="studio" profileId={pid} onDeleted={() => loadOnboarding(selected)} togglePublish={togglePublish} itemPublished={itemPublished} />

            <hr style={{ border:'none', borderTop:'1px solid var(--border)', margin:'4px 0 20px' }} />
            <ProductsBlock
              productTypes={onboarding.product_types}
              fabrics={onboarding.fabric_answers}
              brands={onboarding.brand_experiences}
              awards={onboarding.awards}
              togglePublish={togglePublish}
              itemPublished={itemPublished}
            />

            <CraftBlock crafts={onboarding.crafts} profileId={pid} onSaved={() => loadOnboarding(selected)} togglePublish={togglePublish} itemPublished={itemPublished} />

            <hr style={{ border:'none', borderTop:'1px solid var(--border)', margin:'4px 0 20px' }} />
            <Block title="Section D — Collaboration" data={onboarding.collab_design} model="collab_design" profileId={pid} onSaved={() => loadOnboarding(selected)} />
            <BuyerRequirementsBlock requirements={onboarding.collab_design?.buyer_requirements} profileId={pid} onSaved={() => loadOnboarding(selected)} />
            <BuyerCoordinatorBlock coordinator={onboarding.collab_design?.buyer_coordinator} profileId={pid} onSaved={() => loadOnboarding(selected)} />

            <hr style={{ border:'none', borderTop:'1px solid var(--border)', margin:'4px 0 20px' }} />
            <Block title="Section E — Production Scale" data={onboarding.production_scale} model="production_scale" profileId={pid} onSaved={() => loadOnboarding(selected)} />

            <hr style={{ border:'none', borderTop:'1px solid var(--border)', margin:'4px 0 20px' }} />
            <Block title="Section F — Process Readiness" data={onboarding.process_readiness} model="process_readiness" profileId={pid} onSaved={() => loadOnboarding(selected)} />
            <MediaViewer files={onboarding.process_readiness?.bts_media} title="BTS / Process Media" mediaType="bts" profileId={pid} onDeleted={() => loadOnboarding(selected)} togglePublish={togglePublish} itemPublished={itemPublished} />

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
    <div style={{ padding:'clamp(20px, 3vw, 40px) clamp(16px, 4vw, 48px)', maxWidth:520 }}>
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
          <PasswordInput placeholder="Min 8 chars · 1 number · 1 uppercase" required
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

  const journeyLabel = { figuring_it_out:'Figuring It Out', build_with_support:'Build with Support', ready_to_produce:'Ready to Produce' };
  const batchLabel   = { under_30:'< 30 pcs', '30_100':'30–100 pcs', over_100:'100+ pcs', not_sure:'Not sure' };
  const timelineLabel= { '1_3_months':'1–3 months', '3_6_months':'3–6 months', '6_plus_months':'6+ months', not_sure:'Not sure', flexible:'Flexible' };

  return (
    <div style={{ padding: 'clamp(20px, 3vw, 40px) clamp(16px, 4vw, 48px)' }}>
      <div className="fade-up" style={{ marginBottom: 40 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 42, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
          Discovery <em style={{ color: 'var(--gold)' }}>Insights</em>
        </h1>
        <p style={{ color: 'var(--text3)', fontSize: 15 }}>All buyer sessions, matches, and what they're looking for.</p>
      </div>

      <div className="fade-up" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 36 }}>
        {[
          { label: 'Total Buyers',     value: stats.total,        color: 'var(--text)'  },
          { label: 'Got Matches',      value: stats.has_match,    color: 'var(--green)' },
          { label: 'Zero Match',       value: stats.zero_match,   color: 'var(--red)'   },
          { label: 'Registered Users', value: stats.linked_users, color: 'var(--gold)'  },
        ].map((s, i) => (
          <div key={s.label} className={`card fade-up fade-up-${i+1}`} style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6, letterSpacing: '0.04em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 36 }}>
        <div className="card fade-up">
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--gold)', marginBottom: 16 }}>Most Requested Crafts</div>
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
                    <div style={{ height: '100%', borderRadius: 2, background: 'var(--gold)', width: `${Math.round((c.count / (top_crafts[0]?.count || 1)) * 100)}%` }} />
                  </div>
                </div>
              </div>
            ))
          }
        </div>
        <div className="card fade-up">
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--gold)', marginBottom: 16 }}>Most Requested Products</div>
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
                    <div style={{ height: '100%', borderRadius: 2, background: 'var(--teal)', width: `${Math.round((p.count / (top_products[0]?.count || 1)) * 100)}%` }} />
                  </div>
                </div>
              </div>
            ))
          }
        </div>
      </div>

      <div className="card fade-up">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--gold)' }}>
            All Buyer Sessions ({buyers.length})
          </div>
          <input
            placeholder="Search by name, email, product, craft..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: 'var(--text)', width: 280, fontFamily: 'var(--font-body)' }}
          />
        </div>
        {filtered.length === 0
          ? <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text4)', fontSize: 13 }}>No buyers found.</div>
          : (
            <div style={{ display: 'grid', gap: 10 }}>
              {filtered.map(b => (
                <div key={b.id} onClick={() => nav(`/admin/discovery/${b.id}`)} className="card-hover"
                  style={{ padding: '16px 20px', background: 'var(--surface2)', borderRadius: 10, cursor: 'pointer', border: `1px solid ${b.zero_match ? 'rgba(224,85,85,0.25)' : b.rec_count > 0 ? 'rgba(90,232,122,0.15)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{b.name || b.user_email || 'Anonymous'}</span>
                      {b.user_email && b.name && <span style={{ fontSize: 12, color: 'var(--text4)' }}>{b.user_email}</span>}
                      <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', padding: '2px 8px', borderRadius: 10, textTransform: 'uppercase', background: b.zero_match ? 'var(--red-dim)' : b.rec_count > 0 ? 'rgba(90,232,122,0.1)' : 'var(--surface3)', color: b.zero_match ? 'var(--red)' : b.rec_count > 0 ? 'var(--green)' : 'var(--text4)' }}>
                        {b.zero_match ? 'No match' : b.rec_count > 0 ? `${b.rec_count} match${b.rec_count !== 1 ? 'es' : ''}` : 'Pending'}
                      </span>
                      {b.journey_stage && <span style={{ fontSize: 10, color: 'var(--text4)', padding: '2px 8px', borderRadius: 10, background: 'var(--surface3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{journeyLabel[b.journey_stage] || b.journey_stage}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {(b.product_types || []).slice(0, 4).map(p => <span key={p} style={{ fontSize: 11, color: 'var(--text3)', background: 'var(--surface)', padding: '2px 8px', borderRadius: 6, textTransform: 'capitalize' }}>{p.replace(/_/g, ' ')}</span>)}
                      {(b.crafts || []).slice(0, 3).map(c => <span key={c} style={{ fontSize: 11, color: 'var(--gold)', background: 'var(--gold-dim)', padding: '2px 8px', borderRadius: 6 }}>{c}</span>)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {b.batch_size && <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 2 }}>{batchLabel[b.batch_size] || b.batch_size}</div>}
                    {b.timeline && <div style={{ fontSize: 12, color: 'var(--text4)', marginBottom: 4 }}>{timelineLabel[b.timeline] || b.timeline}</div>}
                    <div style={{ fontSize: 11, color: 'var(--text4)' }}>{new Date(b.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
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
  const { buyerId } = useParams();

  useEffect(() => {
    adminAPI.getDiscoveryBuyer(buyerId).then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [buyerId]);

  if (loading) return <Spinner full />;
  if (!data) return (
    <div style={{ padding: 40 }}>
      <button className="btn btn-ghost btn-sm" onClick={() => nav('/admin/discovery')} style={{ marginBottom: 20 }}>← Back</button>
      <div style={{ color: 'var(--red)', fontSize: 13 }}>Failed to load buyer.</div>
    </div>
  );

  const { buyer, recommendations, inquiries, visual_images = [] } = data;
  const Field = ({ label, value }) => {
    if (!value || (Array.isArray(value) && value.length === 0)) return null;
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '9px 12px', background: 'var(--surface2)', borderRadius: 7, marginBottom: 5, gap: 16 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>{label}</span>
        <span style={{ fontSize: 13, color: 'var(--text)', textAlign: 'right', wordBreak: 'break-word' }}>{Array.isArray(value) ? value.join(', ') : String(value)}</span>
      </div>
    );
  };
  const rankColor = r => ({ high: 'var(--green)', medium: 'var(--amber)', low: 'var(--red)' }[r] || 'var(--text3)');

  return (
    <div style={{ padding: 'clamp(20px, 3vw, 40px) clamp(16px, 4vw, 48px)' }}>
      <button className="btn btn-ghost btn-sm" onClick={() => nav('/admin/discovery')} style={{ marginBottom: 24 }}>← Back to Discovery</button>
      <div className="card card-gold fade-up" style={{ marginBottom: 24, padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 4 }}>{buyer.name || buyer.user_email || 'Anonymous Buyer'}</div>
            {buyer.user_email && <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 4 }}>{buyer.user_email}</div>}
            <div style={{ fontSize: 12, color: 'var(--text4)' }}>Session: {buyer.session_token} · {new Date(buyer.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {buyer.journey_stage && <span className="badge badge-teal" style={{ fontSize: 11 }}>{{ figuring_it_out:'Figuring It Out', build_with_support:'Build with Support', ready_to_produce:'Ready to Produce' }[buyer.journey_stage] || buyer.journey_stage.replace(/_/g, ' ')}</span>}
            <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 12, background: recommendations.length > 0 ? 'rgba(90,232,122,0.1)' : 'var(--red-dim)', color: recommendations.length > 0 ? 'var(--green)' : 'var(--red)' }}>
              {recommendations.length > 0 ? `${recommendations.length} match${recommendations.length !== 1 ? 'es' : ''}` : 'No match'}
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 20 }}>
        <div className="card fade-up">
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--gold)', marginBottom: 16 }}>Questionnaire Answers</div>
          <Field label="Products"         value={buyer.product_types} />
          <Field label="Fabrics"          value={buyer.fabrics} />
          <Field label="Fabric flexible"  value={buyer.fabric_is_flexible ? 'Yes' : null} />
          <Field label="Fabric not sure"  value={buyer.fabric_not_sure ? 'Yes' : null} />
          <Field label="Craft interest"   value={buyer.craft_interest} />
          <Field label="Crafts"           value={buyer.crafts} />
          <Field label="Craft flexible"   value={buyer.craft_is_flexible ? 'Yes' : null} />
          <Field label="Craft not sure"   value={buyer.craft_not_sure ? 'Yes' : null} />
          <Field label="Visual selections" value={buyer.visual_selection_ids?.length > 0 ? `${buyer.visual_selection_ids.length} image${buyer.visual_selection_ids.length !== 1 ? 's' : ''} selected` : null} />
          {visual_images.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                Visual Selections — Q1 ({visual_images.length})
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {visual_images.map(img => (
                  <div key={img.id} style={{ position: 'relative', aspectRatio: '1', borderRadius: 6, overflow: 'hidden', background: 'var(--surface3)', border: '1px solid var(--border)' }}
                    title={img.studio_name || ''}>
                    {img.image_url
                      ? <img src={img.image_url} alt={img.studio_name || ''} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={e => { e.target.style.display = 'none'; }} />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, opacity: 0.3 }}>🖼</div>
                    }
                    {img.studio_name && (
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.55)', padding: '3px 5px' }}>
                        <div style={{ fontSize: 9, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{img.studio_name}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {visual_images.length === 0 && buyer.visual_selection_ids?.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', background: 'var(--surface2)', borderRadius: 7, marginBottom: 5 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Visual Selections</span>
              <span style={{ fontSize: 13, color: 'var(--text4)' }}>{buyer.visual_selection_ids.length} selected (images unavailable)</span>
            </div>
          )}
          <Field label="Experimentation"  value={buyer.experimentation} />
          <Field label="Process stage"    value={buyer.process_stage} />
          <Field label="Design support"   value={buyer.design_support} />
          <Field label="Timeline"         value={buyer.timeline} />
          <Field label="Batch size"       value={buyer.batch_size} />
          {buyer.zero_match_suggestions?.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--red)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>Zero Match Suggestions</div>
              {buyer.zero_match_suggestions.map((s, i) => (
                <div key={i} style={{ fontSize: 12, color: 'var(--text3)', padding: '8px 12px', background: 'var(--surface2)', borderRadius: 6, marginBottom: 6, borderLeft: '2px solid var(--amber)' }}>
                  {s.message} <span style={{ color: 'var(--green)' }}>({s.studios_count} studios)</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card fade-up">
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--gold)', marginBottom: 16 }}>Matched Studios ({recommendations.length})</div>
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
                    {[{label:'Capability',value:r.core_capability_fit},{label:'MOQ',value:r.moq_fit},{label:'Craft',value:r.craft_approach_fit},{label:'Visual',value:r.visual_affinity}].map(f => (
                      <span key={f.label} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: 'var(--surface)', color: rankColor(f.value) }}>{f.label}: {f.value}</span>
                    ))}
                  </div>
                  {r.what_best_at?.length > 0 && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>{r.what_best_at.join(' · ')}</div>}
                </div>
              ))
            }
          </div>

          {inquiries.length > 0 && (
            <div className="card fade-up">
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--gold)', marginBottom: 16 }}>Custom Inquiries ({inquiries.length})</div>
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


/* ── STUDIO INQUIRIES ── */
function StudioInquiries() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const nav = useNavigate();

  useEffect(() => {
    adminAPI.getAdminStudioInquiries().then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner full />;
  if (!data)   return <div style={{ padding: 40, color: 'var(--red)' }}>Failed to load studio inquiries.</div>;

  const filtered = data.inquiries.filter(inq => {
    if (!search) return true;
    const q = search.toLowerCase();
    return inq.name.toLowerCase().includes(q) || inq.email.toLowerCase().includes(q) || inq.studio?.name?.toLowerCase().includes(q) || inq.answers?.some(a => a.answer?.toLowerCase().includes(q));
  });

  return (
    <div style={{ padding: 'clamp(20px, 3vw, 40px) clamp(16px, 4vw, 48px)' }}>
      <div className="fade-up" style={{ marginBottom: 36 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 42, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
          Studio <em style={{ color: 'var(--gold)' }}>Inquiries</em>
        </h1>
        <p style={{ color: 'var(--text3)', fontSize: 15 }}>Buyers who clicked "Get a Callback" on a studio profile.</p>
      </div>
      <div className="card fade-up">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--gold)' }}>{data.count} Inquir{data.count !== 1 ? 'ies' : 'y'}</div>
          <input placeholder="Search name, email, studio..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: 'var(--text)', width: 280, fontFamily: 'var(--font-body)' }} />
        </div>
        {filtered.length === 0
          ? <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text4)', fontSize: 13 }}>No studio inquiries found.</div>
          : (
            <div style={{ display: 'grid', gap: 14 }}>
              {filtered.map(inq => (
                <div key={inq.id} style={{ padding: '20px 24px', background: 'var(--surface2)', borderRadius: 10, border: '1px solid var(--border)', borderLeft: '3px solid var(--gold)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)', marginBottom: 2 }}>{inq.name}</div>
                      <div style={{ fontSize: 13, color: 'var(--text4)' }}>{inq.email}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12, color: 'var(--text4)', marginBottom: 4 }}>{new Date(inq.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                      {inq.buyer && <button onClick={() => nav(`/admin/discovery/${inq.buyer.id}`)} className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}>View session →</button>}
                    </div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, color: 'var(--gold)', background: 'var(--gold-dim)', padding: '3px 10px', borderRadius: 6, letterSpacing: '0.04em' }}>
                      Studio: {inq.studio?.name}
                    </span>
                  </div>
                  {inq.answers?.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                      {inq.answers.map((a, i) => (
                        <div key={i} style={{ fontSize: 13 }}>
                          <div style={{ color: 'var(--text4)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>{a.question}</div>
                          <div style={{ color: 'var(--text2)', lineHeight: 1.6 }}>{a.answer}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {inq.attachment_url && (
                    <div style={{ marginBottom: 12 }}>
                      <a
                        href={mediaUrl(`/media/${inq.attachment_url}`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 7,
                          fontSize: 12, color: 'var(--gold)', textDecoration: 'none',
                          background: 'var(--gold-dim)', border: '1px solid rgba(200,160,60,0.25)',
                          borderRadius: 6, padding: '6px 12px', fontWeight: 500,
                        }}
                      >
                        📎 View attached file
                      </a>
                    </div>
                  )}
                  {inq.buyer && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 10, color: 'var(--text4)', alignSelf: 'center' }}>Their brief:</span>
                      {(inq.buyer.product_types || []).map(p => <span key={p} style={{ fontSize: 11, color: 'var(--text3)', background: 'var(--surface)', padding: '2px 8px', borderRadius: 6 }}>{p.replace(/_/g, ' ')}</span>)}
                      {(inq.buyer.crafts || []).map(c => <span key={c} style={{ fontSize: 11, color: 'var(--gold)', background: 'var(--gold-dim)', padding: '2px 8px', borderRadius: 6 }}>{c}</span>)}
                      {inq.buyer.timeline && <span style={{ fontSize: 11, color: 'var(--teal)', background: 'var(--teal-dim)', padding: '2px 8px', borderRadius: 6 }}>{inq.buyer.timeline.replace(/_/g, ' ')}</span>}
                      {inq.buyer.batch_size && <span style={{ fontSize: 11, color: 'var(--text3)', background: 'var(--surface)', padding: '2px 8px', borderRadius: 6 }}>{inq.buyer.batch_size.replace(/_/g, ' ')} pcs</span>}
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

/* ── DISCOVERY INQUIRIES ── */
function DiscoveryInquiries() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const nav = useNavigate();

  useEffect(() => {
    adminAPI.getDiscoveryInquiries().then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner full />;
  if (!data)   return <div style={{ padding: 40, color: 'var(--red)' }}>Failed to load inquiries.</div>;

  const filtered = data.inquiries.filter(inq => {
    if (!search) return true;
    const q = search.toLowerCase();
    return inq.name.toLowerCase().includes(q) || inq.email.toLowerCase().includes(q) || inq.message.toLowerCase().includes(q);
  });

  return (
    <div style={{ padding: 'clamp(20px, 3vw, 40px) clamp(16px, 4vw, 48px)' }}>
      <div className="fade-up" style={{ marginBottom: 36 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 42, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
          Custom <em style={{ color: 'var(--gold)' }}>Inquiries</em>
        </h1>
        <p style={{ color: 'var(--text3)', fontSize: 15 }}>Buyers who couldn't find a match and reached out directly.</p>
      </div>
      <div className="card fade-up">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--gold)' }}>{data.count} Inquir{data.count !== 1 ? 'ies' : 'y'}</div>
          <input placeholder="Search name, email, message..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: 'var(--text)', width: 280, fontFamily: 'var(--font-body)' }} />
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
                      <div style={{ fontSize: 12, color: 'var(--text4)' }}>{new Date(inq.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                      {inq.buyer && <button onClick={() => nav(`/admin/discovery/${inq.buyer.id}`)} className="btn btn-ghost btn-sm" style={{ fontSize: 11, marginTop: 4 }}>View session →</button>}
                    </div>
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.7, marginBottom: inq.buyer ? 12 : 0 }}>{inq.message}</div>
                  {inq.buyer && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 10, color: 'var(--text4)', alignSelf: 'center' }}>Their brief:</span>
                      {(inq.buyer.product_types || []).map(p => <span key={p} style={{ fontSize: 11, color: 'var(--text3)', background: 'var(--surface)', padding: '2px 8px', borderRadius: 6, textTransform: 'capitalize' }}>{p.replace(/_/g, ' ')}</span>)}
                      {(inq.buyer.crafts || []).map(c => <span key={c} style={{ fontSize: 11, color: 'var(--gold)', background: 'var(--gold-dim)', padding: '2px 8px', borderRadius: 6 }}>{c}</span>)}
                      {inq.buyer.batch_size && <span style={{ fontSize: 11, color: 'var(--text4)', background: 'var(--surface)', padding: '2px 8px', borderRadius: 6 }}>{inq.buyer.batch_size.replace(/_/g, ' ')}</span>}
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

// ─────────────────────────────────────────────────────────────────────────────
// STUDIO DESCRIPTIONS PAGE
// ─────────────────────────────────────────────────────────────────────────────
function StudioDescriptions() {
  const { success, error } = useToast();
  const [studios, setStudios]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [forms, setForms]       = useState({});   // { [profile_id]: string }
  const [saving, setSaving]     = useState({});   // { [profile_id]: bool }
  const [saved,  setSaved]      = useState({});   // { [profile_id]: bool }

  useEffect(() => {
    adminAPI.listProfiles()
      .then(r => {
        const list = r.data || [];
        setStudios(list);
        // Pre-fill form state with existing descriptions
        const init = {};
        list.forEach(s => { init[s.profile_id] = s.short_description || ''; });
        setForms(init);
      })
      .catch(() => error('Failed to load studios'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (profileId) => {
    setSaving(s => ({ ...s, [profileId]: true }));
    setSaved(s => ({ ...s, [profileId]: false }));
    try {
      await adminAPI.editSection(profileId, 'studio', {
        short_description: forms[profileId] || '',
      });
      setSaved(s => ({ ...s, [profileId]: true }));
      success('Description saved!');
      // Reset saved tick after 3s
      setTimeout(() => setSaved(s => ({ ...s, [profileId]: false })), 3000);
    } catch(e) {
      error(e.response?.data ? JSON.stringify(e.response.data) : 'Save failed');
    } finally {
      setSaving(s => ({ ...s, [profileId]: false }));
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
      <Spinner />
    </div>
  );

  const filled   = studios.filter(s => forms[s.profile_id]?.trim()).length;
  const total    = studios.length;

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 500, color: 'var(--text)', marginBottom: 6 }}>
          Studio Descriptions
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.6 }}>
          Write a short bio for each studio. This appears on the studio's public profile page, overlaid on the hero image.
          Keep it under 180 characters — punchy and specific.
        </p>
        <div style={{
          marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 14px', borderRadius: 20,
          background: filled === total ? 'rgba(90,232,122,0.08)' : 'rgba(232,184,80,0.08)',
          border: `1px solid ${filled === total ? 'rgba(90,232,122,0.2)' : 'rgba(232,184,80,0.2)'}`,
          fontSize: 12, color: filled === total ? 'var(--green)' : 'var(--amber)',
          fontWeight: 500,
        }}>
          {filled} / {total} studios have descriptions
        </div>
      </div>

      {/* Studio list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {studios.map(studio => {
          const pid      = studio.profile_id;
          const val      = forms[pid] ?? '';
          const charLeft = 180 - val.length;
          const isSaving = saving[pid];
          const isSaved  = saved[pid];
          const hasDesc  = val.trim().length > 0;

          return (
            <div key={pid} style={{
              background: 'var(--surface)',
              border: `1px solid ${hasDesc ? 'var(--border)' : 'rgba(232,184,80,0.25)'}`,
              borderRadius: 12, padding: '20px 22px',
              transition: 'border-color 0.2s',
            }}>
              {/* Studio name + status */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-display)' }}>
                    {studio.business_name || studio.profile_name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 2 }}>
                    {studio.business_name} · ID {pid}
                  </div>
                </div>
                {!hasDesc && (
                  <span style={{
                    fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
                    textTransform: 'uppercase', color: 'var(--amber)',
                    padding: '3px 8px', borderRadius: 4,
                    background: 'rgba(232,184,80,0.1)',
                    border: '1px solid rgba(232,184,80,0.2)',
                  }}>No description</span>
                )}
              </div>

              {/* Textarea */}
              <textarea
                value={val}
                onChange={e => {
                  if (e.target.value.length <= 180) {
                    setForms(f => ({ ...f, [pid]: e.target.value }));
                    setSaved(s => ({ ...s, [pid]: false }));
                  }
                }}
                placeholder={`Write a short bio for ${studio.business_name || studio.profile_name}…`}
                style={{
                  width: '100%', minHeight: 80, resize: 'vertical',
                  fontFamily: 'var(--font-body)', fontSize: 13,
                  color: 'var(--text)', background: 'var(--bg)',
                  border: '1px solid var(--border2)', borderRadius: 8,
                  padding: '10px 12px', lineHeight: 1.6,
                  outline: 'none', boxSizing: 'border-box',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--gold)'}
                onBlur={e => e.target.style.borderColor = 'var(--border2)'}
              />

              {/* Footer: char count + save button */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                <span style={{
                  fontSize: 11,
                  color: charLeft < 20 ? 'var(--red)' : 'var(--text4)',
                }}>
                  {charLeft} characters remaining
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {isSaved && (
                    <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 500 }}>
                      ✓ Saved
                    </span>
                  )}
                  <button
                    onClick={() => handleSave(pid)}
                    disabled={isSaving}
                    style={{
                      padding: '8px 20px', borderRadius: 6,
                      background: isSaving ? 'var(--surface3)' : '#1A1612',
                      color: isSaving ? 'var(--text4)' : '#F5F0E8',
                      border: 'none', fontSize: 12, fontWeight: 500,
                      cursor: isSaving ? 'default' : 'pointer',
                      fontFamily: 'var(--font-body)', transition: 'background 0.18s',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}
                    onMouseEnter={e => { if (!isSaving) e.currentTarget.style.background = '#C46E49'; }}
                    onMouseLeave={e => { if (!isSaving) e.currentTarget.style.background = '#1A1612'; }}
                  >
                    {isSaving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

  const navItems = [
    { to: '/admin',                              icon: '', label: 'Overview',         end: true },
    { to: '/admin/review',                       icon: '', label: 'Review Profile'              },
    { to: '/admin/create-seller',                icon: '', label: 'Create Seller'               },
    { to: '/admin/discovery',                    icon: '', label: 'Discovery',          end: true  },
    { to: '/admin/discovery/inquiries',          icon: '', label: 'Inquiries'                   },
    { to: '/admin/discovery/studio-inquiries',   icon: '', label: 'Studio Inquiries'            },
    { to: '/admin/studio-descriptions',          icon: '', label: 'Studio Descriptions'         },
  ];
  return (
    <DashLayout nav={navItems}>
      <Routes>
        <Route index                                 element={<Overview />}               />
        <Route path="review"                         element={<ProfileReview />}          />
        <Route path="review/:pid"                    element={<ProfileReview />}          />
        <Route path="create-seller"                  element={<CreateSeller />}           />
        <Route path="discovery"                      element={<DiscoveryOverview />}      />
        <Route path="discovery/inquiries"            element={<DiscoveryInquiries />}     />
        <Route path="discovery/studio-inquiries"     element={<StudioInquiries />}        />
        <Route path="discovery/:buyerId"             element={<DiscoveryBuyerDetail />}   />
        <Route path="studio-descriptions"             element={<StudioDescriptions />}     />
      </Routes>
    </DashLayout>
  );
}
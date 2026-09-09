import { useState, useEffect, useRef, Fragment } from 'react';
import { Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { adminAPI, projectsAPI, onboardingAPI, extractErrorMessage } from '../api/client';
import { DashLayout } from '../components/DashLayout';
import { Spinner } from '../components/Spinner';
import { useToast } from '../hooks/useToast';
import { Toast } from '../components/Toast';
import PasswordInput from '../components/PasswordInput';
import { mediaUrl } from '../utils/mediaUrl';
import LibraryManager from '../components/LibraryManager';
import AdminProjectsList from './admin/AdminProjectsList';
import AdminCreateProjectWizard from './admin/AdminCreateProjectWizard';
import AdminProposalReview from './admin/AdminProposalReview';
import AdminProjectDetail from './admin/AdminProjectDetail';
import AdminAssignStudios from './admin/AdminAssignStudios';
import AdminOrdersDashboard from './admin/AdminOrdersDashboard';

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
              padding:'10px 20px', borderRadius: 'var(--r-8)', fontSize:13, fontWeight:600,
              background: downloading ? 'var(--border)' : 'var(--sage-muted)',
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
                      <div style={{ width:36, height:36, borderRadius: 'var(--r-8)', background:'linear-gradient(135deg,var(--teal),var(--teal-l))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:'var(--bg)', flexShrink:0 }}>
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
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'9px 12px', background:'var(--surface2)', borderRadius: 'var(--r)', marginBottom:5, gap:16 }}>
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

  // ── PricingTierBlock — Qala-assigned pricing tier ──
  const PricingTierBlock = ({ currentTier, profileId, onSaved }) => {
    const [tier,   setTier]   = useState(currentTier || '');
    const [saving, setSaving] = useState(false);

    const TIERS = [
      { value: '',     label: 'Not assigned' },
      { value: '$',    label: '$ — Entry level',       desc: 'Accessible, high-volume, lean finishing' },
      { value: '$$',   label: '$$ — Mid range',         desc: 'Balanced craft and finish, moderate complexity' },
      { value: '$$$',  label: '$$$ — Premium',          desc: 'Strong craft expertise, refined execution' },
      { value: '$$$$', label: '$$$$ — Luxury',          desc: 'Master-level craft, high design capability, impeccable finish' },
    ];

    const save = async () => {
      setSaving(true);
      try {
        await adminAPI.editSection(profileId, 'studio', { pricing_tier: tier || null });
        success('Pricing tier saved!');
        onSaved();
      } catch (e) {
        error(e.response?.data ? JSON.stringify(e.response.data) : 'Save failed');
      } finally { setSaving(false); }
    };

    return (
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--gold)' }}>
            Pricing Tier
            <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text4)', marginLeft: 10, fontFamily: 'var(--font-body)' }}>
              Qala-assigned · not visible to seller
            </span>
          </div>
        </div>
        <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 18px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {TIERS.map(t => (
              <button
                key={t.value}
                onClick={() => setTier(t.value)}
                style={{
                  padding: '8px 16px', borderRadius: 'var(--r-8)', cursor: 'pointer',
                  fontFamily: 'var(--font-body)', fontSize: 13,
                  border: `1px solid ${tier === t.value ? 'rgba(200,165,90,0.5)' : 'var(--border2)'}`,
                  background: tier === t.value ? 'var(--gold-dim)' : 'var(--surface3)',
                  color: tier === t.value ? 'var(--gold)' : 'var(--text3)',
                  fontWeight: tier === t.value ? 700 : 400,
                  transition: 'all .15s',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
          {tier && TIERS.find(t => t.value === tier)?.desc && (
            <div style={{ fontSize: 12, color: 'var(--text4)', marginBottom: 14 }}>
              {TIERS.find(t => t.value === tier).desc}
            </div>
          )}
          <button className="btn btn-primary btn-sm" onClick={save} disabled={saving || tier === (currentTier || '')}>
            {saving ? <span className="spinner" style={{ width: 13, height: 13 }} /> : 'Save Tier'}
          </button>
        </div>
      </div>
    );
  };
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
                  style={{ flex:1, fontSize:13, padding:'7px 10px', borderRadius: 'var(--r)', border:'1px solid var(--border)', background:'var(--surface)', fontFamily:'var(--font-body)', color:'var(--text)' }}
                />
                <button onClick={() => removeItem(i)} style={{ background:'none', border:'none', color:'var(--text4)', fontSize:16, cursor:'pointer', padding:'0 4px', lineHeight:1 }}>×</button>
              </div>
            ))}
            {items.length < 5 && (
              <button onClick={addItem} style={{ alignSelf:'flex-start', fontSize:12, color:'var(--teal)', background:'none', border:'1px dashed var(--teal)', borderRadius: 'var(--r)', padding:'5px 12px', cursor:'pointer', fontFamily:'var(--font-body)' }}>+ Add Strength</button>
            )}
            <div style={{ display:'flex', gap:8, marginTop:4 }}>
              <button className="btn btn-ghost btn-sm" style={{ fontSize:11, color:'var(--teal)', borderColor:'var(--teal)' }} onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
              <button className="btn btn-ghost btn-sm" style={{ fontSize:11 }} onClick={cancel}>Cancel</button>
            </div>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {usps.map((u, i) => (
              <div key={u.id || i} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'8px 12px', background:'var(--surface2)', borderRadius: 'var(--r)', border:'1px solid var(--border)' }}>
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
                  style={{ flex:1, fontSize:13, padding:'7px 10px', borderRadius: 'var(--r)', border:'1px solid var(--border)', background:'var(--surface)', fontFamily:'var(--font-body)', color:'var(--text)' }}
                />
                <button onClick={() => removeItem(i)} style={{ background:'none', border:'none', color:'var(--text4)', fontSize:16, cursor:'pointer', padding:'0 4px', lineHeight:1 }}>×</button>
              </div>
            ))}
            {items.length < 5 && (
              <button onClick={addItem} style={{ alignSelf:'flex-start', fontSize:12, color:'var(--teal)', background:'none', border:'1px dashed var(--teal)', borderRadius: 'var(--r)', padding:'5px 12px', cursor:'pointer', fontFamily:'var(--font-body)' }}>+ Add Question</button>
            )}
            <div style={{ display:'flex', gap:8, marginTop:4 }}>
              <button className="btn btn-ghost btn-sm" style={{ fontSize:11, color:'var(--teal)', borderColor:'var(--teal)' }} onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
              <button className="btn btn-ghost btn-sm" style={{ fontSize:11 }} onClick={cancel}>Cancel</button>
            </div>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {requirements.map((r, i) => (
              <div key={r.id || i} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'8px 12px', background:'var(--surface2)', borderRadius: 'var(--r)', border:'1px solid var(--border)' }}>
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
          <div style={{ display:'flex', flexDirection:'column', gap:10, padding:'12px 14px', background:'var(--surface2)', borderRadius: 'var(--r-8)', border:'1px solid var(--border)' }}>
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
              <textarea value={form.writeup} onChange={e => setForm(f => ({ ...f, writeup: e.target.value }))} placeholder="Short bio or description…" rows={3} style={{ resize:'vertical', fontSize:13, padding:'8px 10px', borderRadius: 'var(--r)', border:'1px solid var(--border)', background:'var(--surface)', fontFamily:'var(--font-body)', color:'var(--text)', width:'100%' }} />
            </div>
            {imgSrc && <div style={{ fontSize:11, color:'var(--text4)' }}>Photo is set by the studio — not editable here.</div>}
            <div style={{ display:'flex', gap:8, marginTop:2 }}>
              <button className="btn btn-ghost btn-sm" style={{ fontSize:11, color:'var(--teal)', borderColor:'var(--teal)' }} onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
              <button className="btn btn-ghost btn-sm" style={{ fontSize:11 }} onClick={cancel}>Cancel</button>
            </div>
          </div>
        ) : (
          <div style={{ display:'flex', alignItems:'flex-start', gap:14, padding:'12px 14px', background:'var(--surface2)', borderRadius: 'var(--r-8)', border:'1px solid var(--border)' }}>
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
        fontSize: 11, padding: '3px 10px', borderRadius: 'var(--r)', textTransform: 'capitalize',
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
                  <span key={f.id} style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11, padding:'3px 10px', borderRadius: 'var(--r)',
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
                  <div key={b.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 12px', background:'var(--surface2)', borderRadius: 'var(--r)', gap:12, opacity: pub ? 1 : 0.55, border: pub ? '1px solid transparent' : '1px dashed var(--red)' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      {b.image && <img src={mediaUrl(b.image)} alt={b.brand_name} style={{ width:36, height:36, objectFit:'cover', borderRadius: 'var(--r-5)', border:'1px solid var(--border)' }} onError={e => { e.target.style.display='none'; }} />}
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
                  <span key={a.id} style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11, padding:'3px 10px', borderRadius: 'var(--r)',
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
              <div key={f.id || i} style={{ position:'relative', width:88, height:88, borderRadius: 'var(--r-8)', overflow:'hidden', background:'var(--surface3)', border:`1px solid ${published ? 'var(--border)' : 'var(--red)'}`, flexShrink:0, opacity: published ? 1 : 0.55 }}>
                <div onClick={() => setLightbox({ src, isVideo })} style={{ cursor:'pointer', width:'100%', height:'100%' }}>
                  {isVideo
                    ? <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:4 }}>
                        <span style={{ fontSize:20 }}>▶</span>
                        <span style={{ fontSize:9, color:'var(--text4)' }}>VIDEO</span>
                      </div>
                    : <img src={src} alt={f.caption || f.file_name || ''} style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e => { e.target.style.display='none'; }} />
                  }
                </div>
                {f.media_type && <span style={{ position:'absolute', bottom:3, left:3, fontSize:8, fontWeight:700, background:'rgba(0,0,0,0.6)', color:'#fff', padding:'1px 5px', borderRadius: 'var(--r-4)', textTransform:'uppercase' }}>{f.media_type}</span>}
                {!published && <span style={{ position:'absolute', bottom:3, right:3, fontSize:7, fontWeight:700, background:'var(--red)', color:'#fff', padding:'1px 4px', borderRadius: 'var(--r-4)', letterSpacing:'0.04em' }}>HIDDEN</span>}
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
                  style={{ maxWidth:'90vw', maxHeight:'85vh', borderRadius: 'var(--r-8)', display:'block' }}
                  onClick={e => e.stopPropagation()}
                />
              : <img
                  src={lightbox.src} alt=""
                  style={{ maxWidth:'90vw', maxHeight:'85vh', borderRadius: 'var(--r-8)', objectFit:'contain', display:'block', width:'auto', height:'auto' }}
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
                    padding: '3px 10px', borderRadius: 'var(--r-20)',
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
                    padding:'9px 16px', borderRadius: 'var(--r-8)', fontSize:12, fontWeight:600,
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
                      padding:'9px 18px', borderRadius: 'var(--r-8)', fontSize:12, fontWeight:600,
                      background:'transparent', color:'var(--sage-muted)',
                      border:'1px solid var(--sage-muted)', cursor:'pointer',
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
                  background:'var(--surface)', borderRadius: 'var(--r-16)',
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
                      flex:1, padding:'12px', borderRadius: 'var(--r-8)', fontSize:13, fontWeight:600,
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
            <PricingTierBlock currentTier={onboarding.studio_details?.pricing_tier} profileId={pid} onSaved={() => loadOnboarding(selected)} />
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
                  <div style={{ height: 3, background: 'var(--surface3)', borderRadius: 'var(--r-2)' }}>
                    <div style={{ height: '100%', borderRadius: 'var(--r-2)', background: 'var(--gold)', width: `${Math.round((c.count / (top_crafts[0]?.count || 1)) * 100)}%` }} />
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
                  <div style={{ height: 3, background: 'var(--surface3)', borderRadius: 'var(--r-2)' }}>
                    <div style={{ height: '100%', borderRadius: 'var(--r-2)', background: 'var(--teal)', width: `${Math.round((p.count / (top_products[0]?.count || 1)) * 100)}%` }} />
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
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r-8)', padding: '8px 14px', fontSize: 13, color: 'var(--text)', width: 280, fontFamily: 'var(--font-body)' }}
          />
        </div>
        {filtered.length === 0
          ? <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text4)', fontSize: 13 }}>No buyers found.</div>
          : (
            <div style={{ display: 'grid', gap: 10 }}>
              {filtered.map(b => (
                <div key={b.id} onClick={() => nav(`/admin/discovery/${b.id}`)} className="card-hover"
                  style={{ padding: '16px 20px', background: 'var(--surface2)', borderRadius: 'var(--r-10)', cursor: 'pointer', border: `1px solid ${b.zero_match ? 'rgba(224,85,85,0.25)' : b.rec_count > 0 ? 'rgba(90,232,122,0.15)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{b.name || b.user_email || 'Anonymous'}</span>
                      {b.user_email && b.name && <span style={{ fontSize: 12, color: 'var(--text4)' }}>{b.user_email}</span>}
                      <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', padding: '2px 8px', borderRadius: 'var(--r-10)', textTransform: 'uppercase', background: b.zero_match ? 'var(--red-dim)' : b.rec_count > 0 ? 'rgba(90,232,122,0.1)' : 'var(--surface3)', color: b.zero_match ? 'var(--red)' : b.rec_count > 0 ? 'var(--green)' : 'var(--text4)' }}>
                        {b.zero_match ? 'No match' : b.rec_count > 0 ? `${b.rec_count} match${b.rec_count !== 1 ? 'es' : ''}` : 'Pending'}
                      </span>
                      {b.journey_stage && <span style={{ fontSize: 10, color: 'var(--text4)', padding: '2px 8px', borderRadius: 'var(--r-10)', background: 'var(--surface3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{journeyLabel[b.journey_stage] || b.journey_stage}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {(b.product_types || []).slice(0, 4).map(p => <span key={p} style={{ fontSize: 11, color: 'var(--text3)', background: 'var(--surface)', padding: '2px 8px', borderRadius: 'var(--r)', textTransform: 'capitalize' }}>{p.replace(/_/g, ' ')}</span>)}
                      {(b.crafts || []).slice(0, 3).map(c => <span key={c} style={{ fontSize: 11, color: 'var(--gold)', background: 'var(--gold-dim)', padding: '2px 8px', borderRadius: 'var(--r)' }}>{c}</span>)}
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '9px 12px', background: 'var(--surface2)', borderRadius: 'var(--r)', marginBottom: 5, gap: 16 }}>
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
            <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 'var(--r-lg)', background: recommendations.length > 0 ? 'rgba(90,232,122,0.1)' : 'var(--red-dim)', color: recommendations.length > 0 ? 'var(--green)' : 'var(--red)' }}>
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
                  <div key={img.id} style={{ position: 'relative', aspectRatio: '1', borderRadius: 'var(--r)', overflow: 'hidden', background: 'var(--surface3)', border: '1px solid var(--border)' }}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', background: 'var(--surface2)', borderRadius: 'var(--r)', marginBottom: 5 }}>
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
                <div key={i} style={{ fontSize: 12, color: 'var(--text3)', padding: '8px 12px', background: 'var(--surface2)', borderRadius: 'var(--r)', marginBottom: 6, borderLeft: '2px solid var(--amber)' }}>
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
                <div key={r.rank_position} style={{ padding: '12px 14px', background: 'var(--surface2)', borderRadius: 'var(--r-8)', marginBottom: 8, borderLeft: `3px solid ${rankColor(r.ranking)}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>#{r.rank_position} {r.studio_name || `Studio #${r.studio_id}`}</span>
                      {r.location && <span style={{ fontSize: 12, color: 'var(--text4)', marginLeft: 8 }}>{r.location}</span>}
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: rankColor(r.ranking), textTransform: 'uppercase' }}>{r.ranking}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {[{label:'Capability',value:r.core_capability_fit},{label:'MOQ',value:r.moq_fit},{label:'Craft',value:r.craft_approach_fit},{label:'Visual',value:r.visual_affinity}].map(f => (
                      <span key={f.label} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 'var(--r)', background: 'var(--surface)', color: rankColor(f.value) }}>{f.label}: {f.value}</span>
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
                <div key={inq.id} style={{ padding: '12px 14px', background: 'var(--surface2)', borderRadius: 'var(--r-8)', marginBottom: 10, borderLeft: '3px solid var(--teal)' }}>
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
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r-8)', padding: '8px 14px', fontSize: 13, color: 'var(--text)', width: 280, fontFamily: 'var(--font-body)' }} />
        </div>
        {filtered.length === 0
          ? <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text4)', fontSize: 13 }}>No inquiries found.</div>
          : (
            <div style={{ display: 'grid', gap: 14 }}>
              {filtered.map(inq => (
                <div key={inq.id} style={{ padding: '20px 24px', background: 'var(--surface2)', borderRadius: 'var(--r-10)', border: '1px solid var(--border)', borderLeft: '3px solid var(--teal)' }}>
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
                      {(inq.buyer.product_types || []).map(p => <span key={p} style={{ fontSize: 11, color: 'var(--text3)', background: 'var(--surface)', padding: '2px 8px', borderRadius: 'var(--r)', textTransform: 'capitalize' }}>{p.replace(/_/g, ' ')}</span>)}
                      {(inq.buyer.crafts || []).map(c => <span key={c} style={{ fontSize: 11, color: 'var(--gold)', background: 'var(--gold-dim)', padding: '2px 8px', borderRadius: 'var(--r)' }}>{c}</span>)}
                      {inq.buyer.batch_size && <span style={{ fontSize: 11, color: 'var(--text4)', background: 'var(--surface)', padding: '2px 8px', borderRadius: 'var(--r)' }}>{inq.buyer.batch_size.replace(/_/g, ' ')}</span>}
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
          padding: '6px 14px', borderRadius: 'var(--r-20)',
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
              borderRadius: 'var(--r-lg)', padding: '20px 22px',
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
                    padding: '3px 8px', borderRadius: 'var(--r-4)',
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
                  border: '1px solid var(--border2)', borderRadius: 'var(--r-8)',
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
                      padding: '8px 20px', borderRadius: 'var(--r)',
                      background: isSaving ? 'var(--surface3)' : 'var(--text)',
                      color: isSaving ? 'var(--text4)' : 'var(--surface2)',
                      border: 'none', fontSize: 12, fontWeight: 500,
                      cursor: isSaving ? 'default' : 'pointer',
                      fontFamily: 'var(--font-body)', transition: 'background 0.18s',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}
                    onMouseEnter={e => { if (!isSaving) e.currentTarget.style.background = 'var(--sage-muted)'; }}
                    onMouseLeave={e => { if (!isSaving) e.currentTarget.style.background = 'var(--text)'; }}
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


// ─────────────────────────────────────────────────────────────────────────────
// ACCESS KEYS PAGE
// ─────────────────────────────────────────────────────────────────────────────
function AccessKeys() {
  const { success, error } = useToast();
  const [keys, setKeys]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [newKeys, setNewKeys]   = useState([]);  // just-generated keys to display
  const [form, setForm]         = useState({ count: 1, tokens_allocated: 500000, notes: '' });
  const [copied, setCopied]     = useState({});
  const [expanded, setExpanded] = useState({});

  const load = () => {
    setLoading(true);
    adminAPI.listAccessKeys()
      .then(r => setKeys(r.data.keys || []))
      .catch(() => error('Failed to load keys'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await adminAPI.generateAccessKeys({
        count:            form.count,
        tokens_allocated: form.tokens_allocated,
        notes:            form.notes,
      });
      const generated = res.data.keys || [];
      setNewKeys(generated);
      success(`${generated.length} key${generated.length > 1 ? 's' : ''} generated`);
      load();
    } catch (e) {
      error(e.response?.data?.error || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }

  async function handleRevoke(id) {
    try {
      await adminAPI.updateAccessKey(id, { status: 'revoked' });
      success('Key revoked');
      load();
    } catch { error('Failed to revoke'); }
  }

  async function handleActivate(id) {
    try {
      await adminAPI.updateAccessKey(id, { status: 'active' });
      success('Key activated');
      load();
    } catch { error('Failed to activate'); }
  }

  function copyKey(code, id) {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(p => ({ ...p, [id]: true }));
      setTimeout(() => setCopied(p => ({ ...p, [id]: false })), 2000);
    });
  }

  function copyAll() {
    const text = newKeys.map(k => k.key_code).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      success('All keys copied');
    });
  }

  const statusColor = s => ({
    active:  { bg: 'rgba(90,210,120,0.1)',  text: 'var(--green)' },
    revoked: { bg: 'rgba(232,80,80,0.1)',   text: 'var(--red)' },
    expired: { bg: 'rgba(200,160,60,0.1)',  text: 'var(--amber-deep)' },
  }[s] || { bg: 'var(--surface2)', text: 'var(--text3)' });

  const active  = keys.filter(k => k.status === 'active').length;
  const revoked = keys.filter(k => k.status === 'revoked').length;

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>
            Access Keys
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text3)' }}>
            Generate keys to share with buyers. Keys gate access to the chat — no account needed.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 'var(--r-lg)', background: 'rgba(90,210,120,0.1)', color: 'var(--green)', fontWeight: 500 }}>
              {active} active
            </span>
            <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 'var(--r-lg)', background: 'rgba(232,80,80,0.1)', color: 'var(--red)', fontWeight: 500 }}>
              {revoked} revoked
            </span>
          </div>
        </div>
        <button
          onClick={() => { setShowModal(true); setNewKeys([]); }}
          style={{
            padding: '9px 18px', borderRadius: 'var(--r-8)', border: 'none',
            background: 'var(--text)', color: 'var(--surface2)',
            fontSize: 13, fontWeight: 500, cursor: 'pointer',
            fontFamily: 'var(--font-body)', whiteSpace: 'nowrap',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--sage)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--text)'; }}
        >
          + Generate Keys
        </button>
      </div>

      {/* Keys table */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner /></div>
      ) : keys.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text3)', fontSize: 14 }}>
          No keys yet. Generate some above.
        </div>
      ) : (
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '200px 1fr 90px 150px 100px 90px',
            padding: '10px 16px', background: 'var(--surface2)',
            borderBottom: '1px solid var(--border)',
            fontSize: 11, fontWeight: 600, color: 'var(--text3)',
            letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            <span>Key Code</span>
            <span>Owner / Label</span>
            <span>Status</span>
            <span>Tokens</span>
            <span>Created</span>
            <span></span>
          </div>
          {keys.map((k, i) => {
            const sc      = statusColor(k.status);
            const pct     = k.tokens_allocated > 0 ? Math.round((k.tokens_used / k.tokens_allocated) * 100) : 0;
            const date    = new Date(k.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
            const isOpen  = expanded[k.id];
            return (
              <div key={k.id} style={{ borderBottom: i < keys.length - 1 ? '1px solid var(--border)' : 'none' }}>
                {/* Main row */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '200px 1fr 90px 150px 100px 90px',
                  padding: '12px 16px', alignItems: 'center',
                  background: 'var(--surface)',
                }}>
                  {/* Key code */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: 'var(--text)', letterSpacing: '0.08em' }}>
                      {k.key_code}
                    </span>
                    <button
                      onClick={() => copyKey(k.key_code, k.id)}
                      style={{
                        fontSize: 10, padding: '2px 7px', borderRadius: 'var(--r-4)',
                        border: '1px solid var(--border)', background: 'var(--surface2)',
                        cursor: 'pointer', color: copied[k.id] ? 'var(--green)' : 'var(--text3)',
                        fontFamily: 'var(--font-body)', transition: 'all 0.15s', flexShrink: 0,
                      }}
                    >
                      {copied[k.id] ? '✓' : 'Copy'}
                    </button>
                  </div>

                  {/* Owner / label */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {k.user ? (
                      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>
                        {k.user.name || k.user.email}
                      </span>
                    ) : k.access_request ? (
                      // Bug fix (Aug 2026): "we can't see whom a
                      // previously-generated key is connected to" — this
                      // used to have no structured answer at all, only
                      // whatever text happened to be typed into `notes`
                      // (which a later manual edit could also overwrite).
                      // Now reads the real AccessRequest link directly.
                      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>
                        {k.access_request.name}
                        <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text4)', marginLeft: 5 }}>
                          (requested access)
                        </span>
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--text4)', fontStyle: 'italic' }}>
                        Anonymous
                      </span>
                    )}
                    {k.access_request?.email && (
                      <span style={{ fontSize: 11, color: 'var(--text4)' }}>{k.access_request.email}</span>
                    )}
                    {k.notes && (
                      <span style={{ fontSize: 11, color: 'var(--text4)' }}>{k.notes}</span>
                    )}
                  </div>

                  {/* Status */}
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '3px 10px',
                    borderRadius: 'var(--r-lg)', background: sc.bg, color: sc.text,
                    textTransform: 'capitalize', display: 'inline-block',
                  }}>
                    {k.status}
                  </span>

                  {/* Tokens */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 10, color: 'var(--text4)' }}>{(k.tokens_used||0).toLocaleString()} used</span>
                      <span style={{ fontSize: 10, color: 'var(--text4)' }}>{pct}%</span>
                    </div>
                    <div style={{ height: 3, background: 'var(--surface3)', borderRadius: 'var(--r-2)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 'var(--r-2)', width: `${pct}%`, background: pct>80?'var(--red)':pct>50?'var(--amber-deep)':'var(--green)' }} />
                    </div>
                  </div>

                  {/* Date */}
                  <span style={{ fontSize: 12, color: 'var(--text3)' }}>{date}</span>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                    {k.sessions_count > 0 && (
                      <button
                        onClick={() => setExpanded(p => ({ ...p, [k.id]: !p[k.id] }))}
                        style={{
                          fontSize: 10, padding: '3px 8px', borderRadius: 'var(--r-4)',
                          border: '1px solid var(--border)', background: isOpen ? 'var(--surface3)' : 'var(--surface2)',
                          cursor: 'pointer', color: 'var(--text3)', fontFamily: 'var(--font-body)',
                        }}
                      >
                        {k.sessions_count} {k.sessions_count === 1 ? 'session' : 'sessions'} {isOpen ? '▲' : '▼'}
                      </button>
                    )}
                    {k.status === 'active' ? (
                      <button onClick={() => handleRevoke(k.id)} style={{ fontSize: 11, padding: '4px 9px', borderRadius: 'var(--r)', border: '1px solid rgba(232,80,80,0.3)', background: 'rgba(232,80,80,0.06)', color: 'var(--red)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                        Revoke
                      </button>
                    ) : k.status === 'revoked' ? (
                      <button onClick={() => handleActivate(k.id)} style={{ fontSize: 11, padding: '4px 9px', borderRadius: 'var(--r)', border: '1px solid rgba(90,210,120,0.3)', background: 'rgba(90,210,120,0.06)', color: 'var(--green)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                        Activate
                      </button>
                    ) : null}
                  </div>
                </div>

                {/* Expandable sessions */}
                {isOpen && k.sessions?.length > 0 && (
                  <div style={{ background: 'var(--surface2)', borderTop: '1px solid var(--border)', padding: '10px 16px 12px 32px' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
                      Sessions
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {k.sessions.map(s => (
                        <div key={s.session_id} style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '7px 12px', borderRadius: 'var(--r-8)',
                          background: 'var(--surface)', border: '0.5px solid var(--border)',
                          fontSize: 12,
                        }}>
                          <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text3)', flexShrink: 0 }}>
                            {s.session_id.slice(0, 8)}…
                          </span>
                          <span style={{
                            fontSize: 10, padding: '2px 8px', borderRadius: 'var(--r-10)',
                            background: s.stage === 'matched' ? 'rgba(90,210,120,0.1)' : 'var(--surface3)',
                            color: s.stage === 'matched' ? 'var(--green)' : 'var(--text3)',
                            fontWeight: 500, textTransform: 'capitalize', flexShrink: 0,
                          }}>
                            {s.stage}
                          </span>
                          <span style={{ color: 'var(--text2)', flex: 1 }}>
                            {s.user_email ? s.user_email : 'Anonymous user'}
                          </span>
                          <span style={{ color: 'var(--text4)', flexShrink: 0 }}>
                            {(s.tokens_used || 0).toLocaleString()} tokens
                          </span>
                          <span style={{ color: 'var(--text4)', flexShrink: 0, fontSize: 11 }}>
                            {new Date(s.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Generate modal */}
      {showModal && (
        <>
          <div
            onClick={() => setShowModal(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, backdropFilter: 'blur(2px)' }}
          />
          <div style={{
            position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)',
            background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: 'var(--r-16)', padding: '28px 28px 24px',
            width: 420, zIndex: 101,
            boxShadow: '0 12px 48px rgba(0,0,0,0.2)',
          }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 500, color: 'var(--text)', marginBottom: 20 }}>
              Generate Access Keys
            </h3>

            {/* Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 500, display: 'block', marginBottom: 5 }}>
                  Number of keys (max 50)
                </label>
                <input
                  type="number" min={1} max={50}
                  value={form.count}
                  onChange={e => setForm(f => ({ ...f, count: Math.min(50, Math.max(1, parseInt(e.target.value) || 1)) }))}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: 'var(--r-8)',
                    border: '1px solid var(--border)', background: 'var(--surface2)',
                    fontSize: 14, color: 'var(--text)', fontFamily: 'var(--font-body)',
                    outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 500, display: 'block', marginBottom: 5 }}>
                  Token budget per key
                </label>
                <select
                  value={form.tokens_allocated}
                  onChange={e => setForm(f => ({ ...f, tokens_allocated: parseInt(e.target.value) }))}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: 'var(--r-8)',
                    border: '1px solid var(--border)', background: 'var(--surface2)',
                    fontSize: 14, color: 'var(--text)', fontFamily: 'var(--font-body)',
                    outline: 'none', boxSizing: 'border-box', cursor: 'pointer',
                  }}
                >
                  <option value={200000}>200,000 tokens (~4 chats)</option>
                  <option value={500000}>500,000 tokens (~10 chats)</option>
                  <option value={1000000}>1,000,000 tokens (~20 chats)</option>
                  <option value={5000000}>5,000,000 tokens (unlimited)</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 500, display: 'block', marginBottom: 5 }}>
                  Label / notes (optional)
                </label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="e.g. Spring 2026 buyers, Lakme buyers..."
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: 'var(--r-8)',
                    border: '1px solid var(--border)', background: 'var(--surface2)',
                    fontSize: 14, color: 'var(--text)', fontFamily: 'var(--font-body)',
                    outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  flex: 1, padding: '10px', borderRadius: 'var(--r-8)',
                  border: '1px solid var(--border)', background: 'none',
                  fontSize: 13, color: 'var(--text)', cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating}
                style={{
                  flex: 2, padding: '10px', borderRadius: 'var(--r-8)', border: 'none',
                  background: generating ? 'var(--surface3)' : 'var(--text)',
                  color: generating ? 'var(--text3)' : 'var(--surface2)',
                  fontSize: 13, fontWeight: 500,
                  cursor: generating ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-body)', transition: 'background 0.15s',
                }}
              >
                {generating ? 'Generating…' : `Generate ${form.count} Key${form.count > 1 ? 's' : ''}`}
              </button>
            </div>

            {/* Newly generated keys */}
            {newKeys.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>
                    Generated keys — copy and share these now
                  </span>
                  <button
                    onClick={copyAll}
                    style={{
                      fontSize: 11, padding: '3px 10px', borderRadius: 'var(--r)',
                      border: '1px solid var(--border)', background: 'var(--surface2)',
                      cursor: 'pointer', color: 'var(--text2)', fontFamily: 'var(--font-body)',
                    }}
                  >
                    Copy all
                  </button>
                </div>
                <div style={{
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  borderRadius: 'var(--r-8)', padding: '12px 14px',
                  display: 'flex', flexDirection: 'column', gap: 6,
                  maxHeight: 180, overflowY: 'auto',
                }}>
                  {newKeys.map((k, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 600, color: 'var(--text)', letterSpacing: '0.08em' }}>
                        {k.key_code}
                      </span>
                      <button
                        onClick={() => copyKey(k.key_code, `new-${i}`)}
                        style={{
                          fontSize: 10, padding: '2px 8px', borderRadius: 'var(--r-4)',
                          border: '1px solid var(--border)', background: 'var(--surface)',
                          cursor: 'pointer', color: copied[`new-${i}`] ? 'var(--green)' : 'var(--text3)',
                          fontFamily: 'var(--font-body)',
                        }}
                      >
                        {copied[`new-${i}`] ? 'Copied ✓' : 'Copy'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// CONTACTS PAGE
// ─────────────────────────────────────────────────────────────────────────────
function Contacts() {
  const { error } = useToast();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [copied, setCopied]     = useState({});
  const [search, setSearch]     = useState('');

  useEffect(() => {
    adminAPI.listContacts()
      .then(r => setContacts(r.data.contacts || []))
      .catch(() => error('Failed to load contacts'))
      .finally(() => setLoading(false));
  }, []);

  function copyEmail(email, id) {
    navigator.clipboard.writeText(email).then(() => {
      setCopied(p => ({ ...p, [id]: true }));
      setTimeout(() => setCopied(p => ({ ...p, [id]: false })), 2000);
    });
  }

  function exportCSV() {
    const headers = ['Name', 'Email', 'Phone', 'Brand', 'Country', 'Stage', 'Key', 'Date'];
    const rows = filtered.map(c => [
      c.contact_name || '',
      c.contact_email || '',
      c.contact_phone || '',
      c.contact_brand || '',
      c.contact_country || '',
      c.stage || '',
      c.key_code || '',
      new Date(c.created_at).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = `qala-contacts-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  }

  const filtered = contacts.filter(c => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (c.contact_name  || '').toLowerCase().includes(q) ||
      (c.contact_email || '').toLowerCase().includes(q) ||
      (c.contact_brand || '').toLowerCase().includes(q) ||
      (c.contact_country || '').toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>
            Contacts
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text3)' }}>
            Buyers who filled in their details before finding studios.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, email, brand…"
            style={{
              padding: '8px 12px', borderRadius: 'var(--r-8)',
              border: '1px solid var(--border)', background: 'var(--surface2)',
              fontSize: 13, color: 'var(--text)', fontFamily: 'var(--font-body)',
              outline: 'none', width: 220,
            }}
          />
          <button
            onClick={exportCSV}
            disabled={filtered.length === 0}
            style={{
              padding: '8px 16px', borderRadius: 'var(--r-8)',
              border: '1px solid var(--border)', background: 'var(--surface2)',
              fontSize: 13, color: 'var(--text)', cursor: filtered.length === 0 ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-body)', opacity: filtered.length === 0 ? 0.4 : 1,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { if (filtered.length) e.currentTarget.style.background = 'var(--surface3)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface2)'; }}
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total contacts', value: contacts.length },
          { label: 'Reached matching', value: contacts.filter(c => c.stage === 'matched').length },
          { label: 'Showing today', value: filtered.length },
        ].map(s => (
          <div key={s.label} style={{
            flex: 1, padding: '12px 16px',
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--r-10)',
          }}>
            <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-display)' }}>
              {s.value}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner /></div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text3)', fontSize: 14 }}>
          {contacts.length === 0 ? 'No contacts yet.' : 'No results for that search.'}
        </div>
      ) : (
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
          {/* Header row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '160px 200px 120px 150px 90px 80px 100px 36px',
            padding: '10px 16px', background: 'var(--surface2)',
            borderBottom: '1px solid var(--border)',
            fontSize: 11, fontWeight: 600, color: 'var(--text3)',
            letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            <span>Name</span>
            <span>Email</span>
            <span>Phone</span>
            <span>Brand</span>
            <span>Country</span>
            <span>Stage</span>
            <span>Date</span>
            <span></span>
          </div>
          {filtered.map((ct, i) => {
            const date = new Date(ct.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
            return (
              <div key={ct.session_id} style={{
                display: 'grid',
                gridTemplateColumns: '160px 200px 120px 150px 90px 80px 100px 36px',
                padding: '11px 16px', alignItems: 'center',
                background: 'var(--surface)',
                borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ct.contact_name || '—'}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ct.contact_email}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ct.contact_phone || '—'}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ct.contact_brand || '—'}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                  {ct.contact_country || '—'}
                </span>
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 'var(--r-10)',
                  background: ct.stage === 'matched' ? 'rgba(90,210,120,0.1)' : 'var(--surface3)',
                  color: ct.stage === 'matched' ? 'var(--green)' : 'var(--text3)',
                  textTransform: 'capitalize', display: 'inline-block', whiteSpace: 'nowrap',
                }}>
                  {ct.stage}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text4)' }}>{date}</span>
                <button
                  onClick={() => copyEmail(ct.contact_email, ct.session_id)}
                  title="Copy email"
                  style={{
                    width: 28, height: 28, borderRadius: 'var(--r)',
                    border: '1px solid var(--border)', background: 'var(--surface2)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: copied[ct.session_id] ? 'var(--green)' : 'var(--text3)',
                    fontSize: 11, fontFamily: 'var(--font-body)',
                    transition: 'all 0.15s',
                  }}
                >
                  {copied[ct.session_id] ? '✓' : '⧉'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// ACCESS REQUESTS PAGE
// ─────────────────────────────────────────────────────────────────────────────
// Feature (Sep 2026) — "Get Introduced" admin-approval gate. A buyer
// clicking "Get Introduced" lands here as pending_review, with a
// point-in-time snapshot of their brief that admin can edit before
// approving (which builds the real Project + Brief and notifies the
// buyer) or rejecting (internal-only — nothing goes to the buyer or the
// studio, matching how the studio was never told a request existed in
// the first place until approval).
const IR_INPUT = { width: '100%', padding: '7px 10px', border: '1px solid var(--surface4)', borderRadius: 'var(--r-5)', background: '#fff', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none' };
const IR_BTN_BASE = { padding: '8px 16px', borderRadius: 'var(--r)', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)', border: 'none' };

function IRField({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text3)', fontWeight: 600, marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  );
}

function IntroductionRequests() {
  const { success, error } = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [detail, setDetail]     = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editSnap, setEditSnap]   = useState({});
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving]       = useState(false);

  const load = () => {
    setLoading(true);
    adminAPI.listIntroductionRequests()
      .then(r => setRequests(r.data.requests || []))
      .catch(() => error('Failed to load requests'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  async function toggleExpand(id) {
    if (expanded === id) { setExpanded(null); setDetail(null); return; }
    setExpanded(id);
    setDetail(null);
    setDetailLoading(true);
    try {
      const r = await adminAPI.getIntroductionRequest(id);
      setDetail(r.data);
      setEditSnap(r.data.brief_snapshot || {});
      setEditNotes(r.data.admin_notes || '');
    } catch (e) {
      error(extractErrorMessage(e, 'Failed to load request detail'));
      setExpanded(null);
    } finally {
      setDetailLoading(false);
    }
  }

  async function saveEdits(id) {
    setSaving(true);
    try {
      await adminAPI.patchIntroductionRequest(id, { brief_snapshot: editSnap, admin_notes: editNotes });
      success('Saved');
    } catch (e) {
      error(extractErrorMessage(e, 'Failed to save changes'));
    } finally {
      setSaving(false);
    }
  }

  async function handleApprove(id) {
    setSaving(true);
    try {
      // Save whatever's currently in the edit form first — approving
      // should use the admin's latest edits, not whatever was last
      // explicitly saved, in case they tweaked something and went
      // straight to Approve without clicking Save first.
      await adminAPI.patchIntroductionRequest(id, { brief_snapshot: editSnap, admin_notes: editNotes });
      const r = await adminAPI.approveIntroductionRequest(id);
      success(r.data.buyer_notified ? 'Approved — buyer notified' : 'Approved, but the buyer email failed — check manually');
      setExpanded(null); setDetail(null);
      load();
    } catch (e) {
      error(extractErrorMessage(e, 'Failed to approve'));
    } finally {
      setSaving(false);
    }
  }

  async function handleReject(id) {
    setSaving(true);
    try {
      await adminAPI.rejectIntroductionRequest(id, editNotes);
      success('Rejected');
      setExpanded(null); setDetail(null);
      load();
    } catch (e) {
      error(extractErrorMessage(e, 'Failed to reject'));
    } finally {
      setSaving(false);
    }
  }

  const statusColor = s => ({
    pending_review: { bg: 'rgba(200,160,60,0.1)', text: 'var(--amber-deep)' },
    approved:       { bg: 'rgba(90,210,120,0.1)', text: 'var(--green)' },
    rejected:       { bg: 'rgba(232,80,80,0.1)',  text: 'var(--red)' },
  }[s] || { bg: 'var(--surface2)', text: 'var(--text3)' });

  const arrToText = arr => (Array.isArray(arr) ? arr : []).join(', ');
  const textToArr = txt => txt.split(',').map(s => s.trim()).filter(Boolean);

  const pending = requests.filter(r => r.status === 'pending_review').length;
  const isPending = detail?.status === 'pending_review';

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>
          Introduction Requests
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text3)' }}>
          Buyers requesting an introduction to a studio — review and edit the brief before the studio is notified.
        </p>
        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 'var(--r-lg)', background: 'rgba(200,160,60,0.1)', color: 'var(--amber-deep)', fontWeight: 500 }}>
            {pending} pending
          </span>
        </div>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text3)', fontSize: 13 }}>Loading…</div>
      ) : requests.length === 0 ? (
        <div style={{ color: 'var(--text3)', fontSize: 13 }}>No introduction requests yet.</div>
      ) : (
        requests.map(r => (
          <div key={r.id} style={{ border: '1px solid var(--surface4)', borderRadius: 'var(--r)', marginBottom: 10, background: '#fff', overflow: 'hidden' }}>
            <div
              onClick={() => toggleExpand(r.id)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', cursor: 'pointer' }}
            >
              <div>
                <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--text)' }}>
                  {r.name} <span style={{ color: 'var(--text3)', fontWeight: 400 }}>→ {r.studio_name}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                  {r.email} · {new Date(r.created_at).toLocaleDateString()}
                </div>
              </div>
              <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 'var(--r-lg)', fontWeight: 500, ...statusColor(r.status) }}>
                {r.status.replace('_', ' ')}
              </span>
            </div>

            {expanded === r.id && (
              <div style={{ borderTop: '1px solid var(--surface4)', padding: 18, background: 'var(--bg)' }}>
                {detailLoading ? (
                  <div style={{ fontSize: 13, color: 'var(--text3)' }}>Loading details…</div>
                ) : detail && (
                  <>
                    {!isPending && (
                      <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 14 }}>
                        This request was {detail.status}
                        {detail.reviewed_at ? ` on ${new Date(detail.reviewed_at).toLocaleDateString()}` : ''}.
                        {detail.project_id && ' Project created.'}
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                      <IRField label="Garment types">
                        <input disabled={!isPending} value={arrToText(editSnap.garment_types)} onChange={e => setEditSnap(s => ({ ...s, garment_types: textToArr(e.target.value) }))} style={IR_INPUT} placeholder="Comma-separated" />
                      </IRField>
                      <IRField label="Fabrics">
                        <input disabled={!isPending} value={arrToText(editSnap.fabrics_required)} onChange={e => setEditSnap(s => ({ ...s, fabrics_required: textToArr(e.target.value) }))} style={IR_INPUT} placeholder="Comma-separated" />
                      </IRField>
                      <IRField label="Crafts / techniques">
                        <input disabled={!isPending} value={arrToText(editSnap.crafts)} onChange={e => setEditSnap(s => ({ ...s, crafts: textToArr(e.target.value) }))} style={IR_INPUT} placeholder="Comma-separated" />
                      </IRField>
                      <IRField label="Dyes">
                        <input disabled={!isPending} value={arrToText(editSnap.dyes_required)} onChange={e => setEditSnap(s => ({ ...s, dyes_required: textToArr(e.target.value) }))} style={IR_INPUT} placeholder="Comma-separated" />
                      </IRField>
                      <IRField label="Timeline">
                        <input disabled={!isPending} value={editSnap.timeline || ''} onChange={e => setEditSnap(s => ({ ...s, timeline: e.target.value }))} style={IR_INPUT} />
                      </IRField>
                      <IRField label="Batch size">
                        <input disabled={!isPending} value={editSnap.batch_size || ''} onChange={e => setEditSnap(s => ({ ...s, batch_size: e.target.value }))} style={IR_INPUT} />
                      </IRField>
                      <IRField label="Target landing price">
                        <input disabled={!isPending} type="number" step="0.01" value={editSnap.target_landing_price_local ?? ''} onChange={e => setEditSnap(s => ({ ...s, target_landing_price_local: e.target.value === '' ? null : Number(e.target.value) }))} style={IR_INPUT} placeholder="e.g. 80" />
                      </IRField>
                      <IRField label="Currency">
                        <input disabled={!isPending} value={editSnap.target_landing_currency || ''} onChange={e => setEditSnap(s => ({ ...s, target_landing_currency: e.target.value.toUpperCase() }))} style={IR_INPUT} placeholder="USD" />
                      </IRField>
                      <IRField label="Target delivery date">
                        <input disabled={!isPending} type="date" value={editSnap.target_bulk_delivery_date || ''} onChange={e => setEditSnap(s => ({ ...s, target_bulk_delivery_date: e.target.value }))} style={IR_INPUT} />
                      </IRField>
                      <IRField label="Delivery location">
                        <input disabled={!isPending} value={editSnap.buyer_location || ''} onChange={e => setEditSnap(s => ({ ...s, buyer_location: e.target.value }))} style={IR_INPUT} />
                      </IRField>
                    </div>

                    <IRField label="Admin notes">
                      <textarea disabled={!isPending} rows={2} value={editNotes} onChange={e => setEditNotes(e.target.value)} style={{ ...IR_INPUT, resize: 'vertical' }} placeholder="Internal only — visible to admins, never sent to the buyer or studio" />
                    </IRField>

                    {isPending && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                        <button onClick={() => saveEdits(r.id)} disabled={saving} style={{ ...IR_BTN_BASE, background: '#fff', border: '1px solid var(--surface4)', color: 'var(--text2)' }}>
                          Save changes
                        </button>
                        <button onClick={() => handleApprove(r.id)} disabled={saving} style={{ ...IR_BTN_BASE, background: 'var(--sage)', color: '#fff' }}>
                          Approve
                        </button>
                        <button onClick={() => handleReject(r.id)} disabled={saving} style={{ ...IR_BTN_BASE, background: 'rgba(232,80,80,0.08)', color: 'var(--red)', border: '1px solid rgba(232,80,80,0.25)' }}>
                          Reject
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

// Feature (Sep 2026) — Trade Show Enquiry Desk, Part 1. Backs onto the
// isolated `tradeshow` Django app — nothing here touches discovery,
// seller_profile, or projects. Two things happen on submit: the enquiry
// saves, and Email 1 fires immediately (server-side, see
// tradeshow/email.py) — this screen doesn't compose or preview the
// email itself, just triggers it.
// Feature (Sep 2026) — Part 2. The full review screen for a single
// enquiry: upload the buyer's photographed order sheet, review what the
// AI read off it against the actual photo, fill in what's left, submit,
// and schedule Email 2. Deliberately a full-screen swap (not an inline
// expansion like IntroductionRequests uses) — a brand's catalog can run
// past 100 styles, too large to expand inline in a list without making
// the list itself unusable.
const SIZES = ['XS', 'S', 'M', 'L', 'XL'];

// Feature (Sep 2026) — the show is US-based, but this team spans both
// the US and India; whoever schedules Email 2 needs to see and set a
// time that unambiguously means Eastern Time, regardless of their own
// browser's timezone. A plain <input type="datetime-local"> and
// .toLocaleString() both silently use the VIEWER's local timezone with
// no indication that's what's happening — confirmed as the actual
// source of the confusion (an India-based admin scheduling "11am" and
// seeing it displayed back as a different, unlabeled number is exactly
// this: the same instant, correctly converted, but with nothing telling
// them what they're looking at).
//
// easternWallClockToUTC takes plain date/time values with NO timezone
// of their own (a date input and a time input are both timezone-free by
// nature) and interprets them AS Eastern wall-clock time specifically,
// converting to the correct UTC instant — DST-aware via a real
// Intl-computed offset for that specific date, not a hardcoded -05:00.
function easternWallClockToUTC(dateStr, timeStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [h, min] = timeStr.split(':').map(Number);
  const guessUTC = new Date(Date.UTC(y, m - 1, d, h, min));
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(guessUTC);
  const get = type => parts.find(p => p.type === type).value;
  const nyH = get('hour') === '24' ? 0 : +get('hour');  // Intl can report midnight as "24"
  const nyAsUTC = Date.UTC(+get('year'), +get('month') - 1, +get('day'), nyH, +get('minute'));
  const targetAsUTC = Date.UTC(y, m - 1, d, h, min);
  return new Date(guessUTC.getTime() + (targetAsUTC - nyAsUTC));
}

// The display-side counterpart — always renders in Eastern regardless
// of the viewer's own timezone, with an explicit EST/EDT label so it's
// self-evident what's being shown, not something the reader has to
// already know or guess.
function formatEastern(isoOrDate) {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', year: 'numeric', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true, timeZoneName: 'short',
  }).format(d);
}

// The reverse direction — given a real UTC instant (from
// enquiry.scheduled_send_at), what date and time does that read as in
// Eastern wall-clock terms. Used to pre-fill the picker with the
// CURRENT schedule when rescheduling, rather than a fresh default that
// might not match what's actually set.
function utcToEasternWallClock(isoString) {
  const d = new Date(isoString);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d);
  const get = type => parts.find(p => p.type === type).value;
  const hour = get('hour') === '24' ? '00' : get('hour');
  return { dateStr: `${get('year')}-${get('month')}-${get('day')}`, timeStr: `${hour}:${get('minute')}` };
}

function TradeShowEnquiryDetail({ enquiryId, onBack }) {
  const { success, error } = useToast();
  const [step, setStep] = useState(1); // 1: photos, 2: order sheet, 3: details/submit
  const [enquiry, setEnquiry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orderSheet, setOrderSheet] = useState([]);
  const [sheetLoading, setSheetLoading] = useState(true);
  const [showFullCatalog, setShowFullCatalog] = useState(false);
  const [editBuffer, setEditBuffer] = useState({});
  const [uploading, setUploading] = useState(false);
  const [savingSheet, setSavingSheet] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [paymentLink, setPaymentLink] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduling, setScheduling] = useState(false);
  const fileInputRef = useRef(null);

  const loadEnquiry = () => {
    adminAPI.getTradeShowEnquiry(enquiryId)
      .then(r => {
        setEnquiry(r.data);
        setDeliveryDate(r.data.delivery_date || '');
        setPaymentLink(r.data.payment_link || '');
        setDepositAmount(r.data.deposit_amount ?? '');
        // Bug fix (Sep 2026): the schedule picker used to start as two
        // genuinely empty strings, relying on native date/time inputs to
        // show an unambiguous "blank" state — Safari instead renders an
        // empty date/time input showing today's date and the current
        // time, which reads as a pre-filled value even though nothing
        // has actually been set. Always showing a REAL, concrete value
        // removes that ambiguity entirely — what's in the fields is
        // always exactly what would be submitted, on every browser, with
        // nothing left to a rendering quirk. Only fills once (guarded by
        // scheduleDate === ''), so it never overwrites an edit already
        // in progress when this re-runs during photo-processing polling.
        if (scheduleDate === '') {
          if (r.data.scheduled_send_at) {
            const { dateStr, timeStr } = utcToEasternWallClock(r.data.scheduled_send_at);
            setScheduleDate(dateStr);
            setScheduleTime(timeStr);
          } else if (r.data.quote_sent_date) {
            setScheduleDate(r.data.quote_sent_date);
            setScheduleTime('11:00');
          }
        }
      })
      .catch(() => error('Failed to load enquiry'))
      .finally(() => setLoading(false));
  };
  const loadOrderSheet = () => {
    setSheetLoading(true);
    adminAPI.getTradeShowOrderSheet(enquiryId)
      .then(r => setOrderSheet(r.data))
      .catch(() => error('Failed to load order sheet'))
      .finally(() => setSheetLoading(false));
  };
  useEffect(() => { loadEnquiry(); loadOrderSheet(); }, [enquiryId]);

  // Feature: while any uploaded photo is still being AI-read (processed:
  // false), quietly re-poll every 4s so newly-extracted lines show up
  // without admin needing to hit refresh themselves. Stops on its own
  // once every photo is done.
  useEffect(() => {
    const anyUnprocessed = (enquiry?.photos || []).some(p => !p.processed);
    if (!anyUnprocessed) return;
    const t = setInterval(() => { loadEnquiry(); loadOrderSheet(); }, 4000);
    return () => clearInterval(t);
  }, [enquiry?.photos]);

  // Feature (Sep 2026): deposit amount defaults to 50% of the order
  // total, computed from the (now-locked, post-submit) order sheet —
  // checking enquiry.deposit_amount == null against the SERVER's own
  // value, not local state, so this can't misfire mid-load and clobber
  // a real saved value with a freshly computed default. The
  // depositAmount === '' guard is what stops it from running again
  // after admin has actually typed something, even if that something
  // happens to match the computed default exactly. Only applies to
  // Order type — Enquiry never shows or needs this field at all.
  useEffect(() => {
    if (enquiry?.enquiry_type === 'order' && enquiry?.submission_status === 'submitted' && orderSheet.length > 0 && enquiry.deposit_amount == null && depositAmount === '') {
      const total = orderSheet.reduce((sum, r) => sum + (Number(r.landed_price || 0) * (r.total_pieces || 0)), 0);
      setDepositAmount((total * 0.5).toFixed(2));
    }
  }, [enquiry, orderSheet]);

  async function handlePhotoUpload(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const fd = new FormData();
      files.forEach(f => fd.append('images', f));
      await adminAPI.uploadTradeShowPhotos(enquiryId, fd);
      success(`${files.length} photo${files.length === 1 ? '' : 's'} uploaded — reading in the background`);
      loadEnquiry();
    } catch (e) {
      error(extractErrorMessage(e, 'Upload failed'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function editLine(sku, patch) {
    setEditBuffer(b => ({ ...b, [sku]: { ...(b[sku] || {}), ...patch } }));
  }
  function getLineValue(row, field) {
    return editBuffer[row.qala_sku]?.[field] ?? row[field];
  }

  async function saveOrderSheetEdits() {
    const skus = Object.keys(editBuffer);
    if (!skus.length) { success('Nothing to save'); return; }
    setSavingSheet(true);
    try {
      const lines = skus.map(sku => {
        const row = orderSheet.find(r => r.qala_sku === sku);
        return {
          qala_sku: sku,
          quantities_by_size: getLineValue(row, 'quantities_by_size'),
          remarks: getLineValue(row, 'remarks'),
        };
      });
      await adminAPI.patchTradeShowOrderSheet(enquiryId, lines);
      success('Order sheet saved');
      setEditBuffer({});
      loadOrderSheet();
    } catch (e) {
      error(extractErrorMessage(e, 'Failed to save'));
    } finally {
      setSavingSheet(false);
    }
  }

  async function handleSubmitOrder() {
    if (!deliveryDate) { error('Delivery date is required to submit'); return; }
    // Feature (Sep 2026) — payment link is only meaningful for Order
    // type: it's what Email 2's Order variant sends the buyer to
    // actually pay against. Enquiry type never mentions a payment link
    // anywhere in its email at all (see email.py's Enquiry-variant
    // Email 2 body) — asking for it there would be requiring something
    // nothing downstream ever uses.
    if (enquiry.enquiry_type === 'order' && !paymentLink.trim()) {
      error('Payment link is required to submit an order');
      return;
    }
    setSubmitting(true);
    try {
      await adminAPI.submitTradeShowEnquiry(enquiryId, { delivery_date: deliveryDate, payment_link: paymentLink });
      success('Order submitted — invoice and order sheet generated');
      loadEnquiry();
    } catch (e) {
      error(extractErrorMessage(e, 'Failed to submit'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSchedule() {
    // Bug fix (Sep 2026): only Order type actually needs a real deposit
    // amount — the field isn't even shown for anything else. Rather
    // than teach the backend endpoint about enquiry_type (it deals in
    // dates and a number, nothing more), a non-Order schedule call just
    // sends a plain "0" below — keeps the requirement check here simple
    // and matching, without the backend needing to branch on type at
    // all.
    if (enquiry.enquiry_type === 'order' && (depositAmount === '' || depositAmount === null)) {
      error('Deposit amount is required to schedule an order');
      return;
    }
    // Bug fix (Sep 2026): the fields are now always pre-filled with a
    // real value the moment the enquiry loads (see loadEnquiry) — there
    // is no longer a legitimate "both blank, use the server default"
    // state to special-case here. This is a plain required-field check,
    // not branching logic, and it's what actually stops the exact
    // failure mode this whole redesign was fixing: submitting whatever
    // happens to be showing, confident it matches what's on screen.
    if (!scheduleDate || !scheduleTime) { error('Pick a date and time to schedule.'); return; }
    setScheduling(true);
    try {
      const body = {
        scheduled_send_at: easternWallClockToUTC(scheduleDate, scheduleTime).toISOString(),
        deposit_amount: enquiry.enquiry_type === 'order' ? depositAmount : '0',
      };
      const r = await adminAPI.scheduleTradeShowEnquiry(enquiryId, body);
      success('Scheduled — Email 2 will send automatically');
      setEnquiry(r.data);
      // Feature (Sep 2026) — return to Order Booth's list once Email 2
      // is scheduled, at explicit request. The toast above already
      // confirms what just happened, so there's nothing left to review
      // on this screen before leaving it.
      onBack();
    } catch (e) {
      error(extractErrorMessage(e, 'Failed to schedule'));
    } finally {
      setScheduling(false);
    }
  }

  if (loading || !enquiry) {
    return <div style={{ padding: 32, fontSize: 13, color: 'var(--text3)' }}>Loading…</div>;
  }

  const isSubmitted = enquiry.submission_status === 'submitted';
  const visibleRows = showFullCatalog ? orderSheet : orderSheet.filter(r => {
    const qty = getLineValue(r, 'quantities_by_size');
    const remarks = getLineValue(r, 'remarks');
    return (qty && Object.values(qty).some(v => v > 0)) || (remarks && remarks.trim());
  });
  const totalPieces = orderSheet.reduce((sum, r) => {
    const qty = getLineValue(r, 'quantities_by_size') || {};
    return sum + Object.values(qty).reduce((s, v) => s + (Number(v) || 0), 0);
  }, 0);

  const STATUS_LABEL = {
    pending: 'Pending', processing: 'Processing photos',
    needs_review: 'Needs review', submitted: 'Submitted',
  };

  // Feature (Sep 2026): once submitted, the wizard steps are done —
  // there's nothing left to navigate between, just the review/schedule
  // state. Jumping straight there rather than leaving the person sitting
  // on whatever step they happened to submit from.
  const effectiveStep = isSubmitted ? 4 : step;

  const STEPS = [
    { n: 1, label: 'Photos' },
    { n: 2, label: 'Order sheet' },
    { n: 3, label: 'Details' },
  ];

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: '32px 24px' }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--sage)', fontSize: 13, cursor: 'pointer', marginBottom: 16, padding: 0 }}>
        ← Back to all enquiries
      </button>

      <div className="ts-header-row" style={{ marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>
            {enquiry.enquiry_number} — {enquiry.store_name}
          </h2>
          <div style={{ fontSize: 13, color: 'var(--text3)' }}>{enquiry.brand_name} · {enquiry.buyer_name} · {enquiry.buyer_email}</div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <span style={{
            fontSize: 11, padding: '3px 10px', borderRadius: 'var(--r-lg)', fontWeight: 500,
            background: enquiry.enquiry_type === 'order' ? 'rgba(90,150,210,0.12)' : enquiry.enquiry_type === 'interest' ? 'rgba(150,120,200,0.12)' : 'rgba(200,160,60,0.12)',
            color: enquiry.enquiry_type === 'order' ? '#3B6BA5' : enquiry.enquiry_type === 'interest' ? '#7A5FA6' : 'var(--amber-deep)',
          }}>
            {enquiry.enquiry_type === 'order' ? 'Order' : enquiry.enquiry_type === 'interest' ? 'Interest' : 'Enquiry'}
          </span>
          {enquiry.enquiry_type !== 'interest' && (
            <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 'var(--r-lg)', fontWeight: 500, background: 'var(--surface2)', color: 'var(--text2)' }}>
              {STATUS_LABEL[enquiry.submission_status] || enquiry.submission_status}
            </span>
          )}
          <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 'var(--r-lg)', fontWeight: 500, background: enquiry.email_sent ? 'rgba(90,210,120,0.1)' : 'rgba(232,80,80,0.1)', color: enquiry.email_sent ? 'var(--green)' : 'var(--red)' }}>
            Email 1: {enquiry.email_sent ? 'sent' : 'failed'}
          </span>
          {/* Feature (Sep 2026): Interest-type enquiries never get an
              Email 2 at all — see email.py's send_enquiry_confirmation
              docstring — so this badge would be permanently misleading
              ("not scheduled") for something that was never going to be
              scheduled in the first place. Hidden entirely for this type
              rather than showing a status that doesn't really apply. */}
          {enquiry.enquiry_type !== 'interest' && (
            <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 'var(--r-lg)', fontWeight: 500, background: enquiry.email2_sent ? 'rgba(90,210,120,0.1)' : 'var(--surface2)', color: enquiry.email2_sent ? 'var(--green)' : 'var(--text3)' }}>
              Email 2: {enquiry.email2_sent ? 'sent' : enquiry.scheduled_send_at ? 'scheduled' : 'not scheduled'}
            </span>
          )}
        </div>
      </div>

      {/* Feature (Sep 2026): Interest-type enquiries stop here entirely —
          no photo upload, no digital order sheet, no submit, no schedule.
          Email 1 (with the brand's lookbook and linesheet attached) is
          the whole flow for this type; nothing downstream of it applies,
          so nothing downstream of it renders. */}
      {enquiry.enquiry_type === 'interest' ? (
        <div style={{ border: '1px solid var(--surface4)', borderRadius: 'var(--r)', background: '#fff', padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
            {enquiry.email_sent ? 'Email sent — nothing further needed' : 'Email failed to send'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text3)' }}>
            {enquiry.email_sent
              ? `Thanked ${enquiry.buyer_name} for their interest in ${enquiry.brand_name}, with the lookbook and linesheet attached. This enquiry type doesn't have a follow-up email.`
              : 'Check the SendGrid configuration and the brand\'s lookbook/linesheet are uploaded in /admin/, then try creating the enquiry again.'}
          </div>
        </div>
      ) : (
      <>

      {/* ── Step indicator ── */}
      {!isSubmitted && (
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
          {STEPS.map((s, i) => (
            <Fragment key={s.n}>
              <div
                onClick={() => s.n < effectiveStep && setStep(s.n)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  cursor: s.n < effectiveStep ? 'pointer' : 'default', opacity: s.n <= effectiveStep ? 1 : 0.4,
                }}
              >
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 600,
                  background: s.n === effectiveStep ? 'var(--sage)' : s.n < effectiveStep ? 'rgba(122,140,110,0.15)' : 'var(--surface2)',
                  color: s.n === effectiveStep ? '#fff' : s.n < effectiveStep ? 'var(--sage)' : 'var(--text3)',
                }}>
                  {s.n < effectiveStep ? '✓' : s.n}
                </div>
                <span style={{ fontSize: 13, fontWeight: s.n === effectiveStep ? 600 : 400, color: s.n === effectiveStep ? 'var(--text)' : 'var(--text3)' }}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && <div style={{ flex: 1, height: 1, background: 'var(--surface4)', margin: '0 14px' }} />}
            </Fragment>
          ))}
        </div>
      )}

      {/* ── Step 1: Photo upload ── */}
      {effectiveStep === 1 && (
        <div style={{ border: '1px solid var(--surface4)', borderRadius: 'var(--r)', background: '#fff', padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Upload order sheet photos</h3>
          <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 14 }}>Photograph every page the buyer marked up — one or several at once.</p>
          <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handlePhotoUpload} disabled={uploading} style={{ fontSize: 13 }} />
          {uploading && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>Uploading…</div>}
          {(enquiry.photos || []).length > 0 && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
              {enquiry.photos.map(p => (
                <a key={p.id} href={mediaUrl(p.image)} target="_blank" rel="noreferrer" style={{ position: 'relative', display: 'block' }}>
                  <img src={mediaUrl(p.image)} alt="" style={{ width: 84, height: 84, objectFit: 'cover', borderRadius: 'var(--r-5)', border: '1px solid var(--surface4)' }} />
                  {!p.processed && (
                    <span style={{ position: 'absolute', bottom: 2, right: 2, fontSize: 9, background: 'rgba(0,0,0,0.65)', color: '#fff', padding: '1px 5px', borderRadius: 6 }}>reading…</span>
                  )}
                </a>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
            <button onClick={() => setStep(2)} style={{ ...IR_BTN_BASE, background: '#1A1A1A', color: '#fff' }}>
              Next: Order sheet →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Digital order sheet — matches the printed linesheet's own design ── */}
      {effectiveStep === 2 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 600 }}>Digital order sheet</h3>
              <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>Total pieces: {totalPieces}</p>
            </div>
            <label style={{ fontSize: 12, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input type="checkbox" checked={showFullCatalog} onChange={e => setShowFullCatalog(e.target.checked)} />
              Show full catalog ({orderSheet.length} styles)
            </label>
          </div>

          {sheetLoading ? (
            <div style={{ fontSize: 13, color: 'var(--text3)' }}>Loading…</div>
          ) : visibleRows.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text3)', padding: '20px 0' }}>
              {orderSheet.length === 0 ? 'Catalog not loaded for this brand yet.' : 'Nothing marked yet — go back and upload a photo, or check "show full catalog" to add something by hand.'}
            </div>
          ) : (
            <div className="ts-2col" style={{ gap: 16 }}>
              {visibleRows.map(row => {
                const qty = getLineValue(row, 'quantities_by_size') || {};
                const remarks = getLineValue(row, 'remarks') || '';
                const uncertain = row.ai_confidence === 'uncertain';
                return (
                  <div key={row.qala_sku} style={{
                    display: 'flex', gap: 0, border: '1px solid var(--surface4)', borderRadius: 'var(--r-5)',
                    background: '#fff', overflow: 'hidden', position: 'relative',
                  }}>
                    {uncertain && (
                      <span style={{ position: 'absolute', top: 8, right: 8, fontSize: 9, padding: '2px 7px', borderRadius: 8, background: 'rgba(200,160,60,0.15)', color: 'var(--amber-deep)', fontWeight: 600 }}>
                        needs a look
                      </span>
                    )}
                    <div style={{ width: 110, flexShrink: 0, background: '#F4F1EC' }}>
                      {row.image_url ? (
                        <img src={mediaUrl(row.image_url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', minHeight: 180 }} />
                      )}
                    </div>
                    <div style={{ flex: 1, padding: '12px 14px' }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{row.product_name}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--text3)', marginBottom: 6 }}>{row.qala_sku}</div>
                      {(row.fabric_material || row.dyes_used) && (
                        <div style={{ fontSize: 10.5, color: 'var(--text3)', lineHeight: 1.5 }}>
                          {[row.fabric_material, row.dyes_used].filter(Boolean).join(' · ')}
                        </div>
                      )}
                      {row.technique_used && <div style={{ fontSize: 10.5, color: 'var(--text3)', lineHeight: 1.5 }}>{row.technique_used}</div>}
                      {row.landed_price != null && (
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: '#B23A3A', marginTop: 6 }}>
                          Landed ${Number(row.landed_price).toFixed(0)}
                        </div>
                      )}

                      <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text3)', fontWeight: 600, marginTop: 10, marginBottom: 4 }}>
                        Quantity × Size
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {SIZES.map(s => (
                          <div key={s} style={{ flex: 1, border: '1px solid var(--surface4)', borderRadius: 4, textAlign: 'center', padding: '4px 2px' }}>
                            <div style={{ fontSize: 8.5, color: 'var(--text3)', marginBottom: 2 }}>{s}</div>
                            <input
                              type="number" min="0" disabled={isSubmitted}
                              value={qty[s] ?? ''}
                              onChange={e => editLine(row.qala_sku, { quantities_by_size: { ...qty, [s]: e.target.value === '' ? undefined : Number(e.target.value) } })}
                              style={{ width: '100%', border: 'none', outline: 'none', textAlign: 'center', fontSize: 12, background: 'transparent' }}
                            />
                          </div>
                        ))}
                      </div>

                      <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text3)', fontWeight: 600, marginTop: 10, marginBottom: 4 }}>
                        Remarks
                      </div>
                      <textarea
                        rows={2} disabled={isSubmitted}
                        value={remarks}
                        onChange={e => editLine(row.qala_sku, { remarks: e.target.value })}
                        style={{ width: '100%', border: '1px solid var(--surface4)', borderRadius: 4, padding: 6, fontSize: 11, resize: 'vertical', fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(1)} style={{ ...IR_BTN_BASE, background: '#fff', border: '1px solid var(--surface4)', color: 'var(--text2)' }}>
                ← Back
              </button>
              {!isSubmitted && Object.keys(editBuffer).length > 0 && (
                <button onClick={saveOrderSheetEdits} disabled={savingSheet} style={{ ...IR_BTN_BASE, background: 'var(--sage)', color: '#fff' }}>
                  {savingSheet ? 'Saving…' : `Save changes (${Object.keys(editBuffer).length})`}
                </button>
              )}
            </div>
            <button onClick={() => setStep(3)} style={{ ...IR_BTN_BASE, background: '#1A1A1A', color: '#fff' }}>
              Next: Details →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Delivery date, payment link, submit ── */}
      {effectiveStep === 3 && (
        <div style={{ border: '1px solid var(--surface4)', borderRadius: 'var(--r)', background: '#fff', padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Order details</h3>
          {/* Feature (Sep 2026) — payment link only applies to Order
              type: it's what the Order variant of Email 2 sends the
              buyer to actually pay against. The Enquiry variant never
              mentions a payment link at all, so asking for it there
              would be requiring something nothing downstream reads —
              hidden entirely for that type, not just optional. */}
          <div className={enquiry.enquiry_type === 'order' ? 'ts-2col' : ''} style={{ gap: 14, marginBottom: 16 }}>
            <IRField label="Delivery date">
              <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} style={IR_INPUT} />
            </IRField>
            {enquiry.enquiry_type === 'order' && (
              <IRField label="Payment link *">
                <input type="url" value={paymentLink} onChange={e => setPaymentLink(e.target.value)} placeholder="https://..." style={IR_INPUT} />
              </IRField>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => setStep(2)} style={{ ...IR_BTN_BASE, background: '#fff', border: '1px solid var(--surface4)', color: 'var(--text2)' }}>
              ← Back
            </button>
            <button
              onClick={handleSubmitOrder}
              disabled={submitting || !deliveryDate || (enquiry.enquiry_type === 'order' && !paymentLink.trim())}
              style={{ ...IR_BTN_BASE, background: '#1A1A1A', color: '#fff', opacity: (submitting || !deliveryDate || (enquiry.enquiry_type === 'order' && !paymentLink.trim())) ? 0.6 : 1 }}
            >
              {submitting ? 'Submitting…' : 'Submit order'}
            </button>
          </div>
        </div>
      )}

      {/* ── After submission: review documents + schedule ── */}
      {isSubmitted && (
        <div style={{ border: '1px solid var(--surface4)', borderRadius: 'var(--r)', background: '#fff', padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Review &amp; schedule Email 2</h3>

          {/* Feature (Sep 2026): its own visually separate section,
              deliberately not folded into the scheduling controls below
              even though both get sent together — it's a distinct
              decision (how much to ask for) from timing (when to send),
              and the boxed styling here makes that visible rather than
              just implied by field order. Order type only — Enquiry
              never mentions a deposit anywhere in its email, matching
              the same reasoning as payment_link at Submit. */}
          {enquiry.enquiry_type === 'order' && (
            <div style={{ border: '1px solid var(--surface4)', borderRadius: 'var(--r-5)', background: 'var(--surface2)', padding: 16, marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Deposit amount</div>
              <input
                type="number" min="0" step="0.01"
                value={depositAmount}
                onChange={e => setDepositAmount(e.target.value)}
                placeholder="0.00"
                style={{ ...IR_INPUT, maxWidth: 200 }}
              />
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
                Defaults to 50% of the order total — adjust if this order needs a different deposit.
              </div>
            </div>
          )}

          {/* Feature (Sep 2026): actual inline previews, not just download
              links — browsers render a PDF natively inside an iframe, so
              this needs no viewer library or extra dependency. The plain
              link stays alongside each preview since a full-tab open is
              sometimes just more useful (printing, zooming, mobile). */}
          <div className="ts-2col" style={{ gap: 16, marginBottom: 16 }}>
            {enquiry.order_sheet_pdf && (
              <div>
                <a href={mediaUrl(enquiry.order_sheet_pdf)} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: 'var(--sage)', display: 'block', marginBottom: 6 }}>
                  📄 Order sheet PDF — open full size
                </a>
                <iframe
                  src={mediaUrl(enquiry.order_sheet_pdf)}
                  title="Order sheet preview"
                  style={{ width: '100%', height: 480, border: '1px solid var(--surface4)', borderRadius: 'var(--r-5)' }}
                />
              </div>
            )}
            {enquiry.invoice_pdf && (
              <div>
                <a href={mediaUrl(enquiry.invoice_pdf)} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: 'var(--sage)', display: 'block', marginBottom: 6 }}>
                  📄 Invoice {enquiry.invoice_number} — open full size
                </a>
                <iframe
                  src={mediaUrl(enquiry.invoice_pdf)}
                  title="Invoice preview"
                  style={{ width: '100%', height: 480, border: '1px solid var(--surface4)', borderRadius: 'var(--r-5)' }}
                />
              </div>
            )}
          </div>
          {enquiry.email2_sent ? (
            <div style={{ fontSize: 13, color: 'var(--green)' }}>Email 2 sent {enquiry.email2_sent_at ? `on ${formatEastern(enquiry.email2_sent_at)}` : ''}.</div>
          ) : enquiry.scheduled_send_at ? (
            // Bug fix (Sep 2026): "Reschedule" removed entirely at
            // explicit request — once a real date/time is set, this is
            // now a plain, locked confirmation, not an editable form.
            // Nothing here calls handleSchedule again; there's simply no
            // button to do so. If a genuine correction is ever needed,
            // that's a direct backend action, not something exposed in
            // this UI anymore.
            <div style={{ fontSize: 13, color: 'var(--text)', padding: '10px 12px', background: 'var(--surface2)', borderRadius: 'var(--r-5)' }}>
              Email 2 will send on <strong>{formatEastern(enquiry.scheduled_send_at)}</strong>.
            </div>
          ) : (
            <>
              {/* Feature (Sep 2026): separate date + time inputs, not a
                  single datetime-local — that native input silently uses
                  the BROWSER's own timezone with no way to label it
                  otherwise, which is exactly what made this confusing
                  for an India-based admin scheduling a US show's email.
                  A plain date and a plain time have no timezone of their
                  own; easternWallClockToUTC is what explicitly says
                  "these numbers mean Eastern," not the input itself. */}
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>
                Send at — Eastern Time
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} style={IR_INPUT} />
                <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} style={IR_INPUT} />
              </div>
              {/* Feature (Sep 2026) — a live, always-visible preview of
                  what the two fields actually resolve to, not something
                  you have to trust blindly and only find out after
                  submitting. Recomputed on every keystroke — cheap, pure
                  functions, no reason to debounce. */}
              {scheduleDate && scheduleTime && (
                <div style={{ fontSize: 12, color: 'var(--sage)', marginBottom: 10, padding: '6px 10px', background: 'rgba(122,140,110,0.08)', borderRadius: 'var(--r-5)' }}>
                  → This sends at <strong>{formatEastern(easternWallClockToUTC(scheduleDate, scheduleTime))}</strong>
                </div>
              )}
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 10 }}>
                Whatever date and time you enter here means US Eastern Time, not your own
                local time — this holds regardless of where you're working from.
              </div>
              <button onClick={handleSchedule} disabled={scheduling} style={{ ...IR_BTN_BASE, background: 'var(--sage)', color: '#fff' }}>
                {scheduling ? 'Scheduling…' : 'Schedule Email 2'}
              </button>
            </>
          )}
        </div>
      )}
      </>
      )}
    </div>
  );
}

function TradeShowEnquiryDesk() {
  const [selectedEnquiryId, setSelectedEnquiryId] = useState(null);
  return (
    <>
      {/* Feature (Sep 2026) — mobile support, since photographing the
          printed sheet naturally happens on a phone at the booth.
          Matches DashLayout's own pattern (a plain <style> tag with real
          @media queries, not a JS viewport hook) — a <style> tag applies
          globally to the rendered DOM regardless of which component
          tree it sits in, so defining these classes once here covers
          both TradeShowEnquiryList and TradeShowEnquiryDetail below.
          Deliberately narrow in scope: only the handful of 2-column
          grids and flex rows that actually break on a ~375px screen get
          a class — everything else (buttons, badges, inputs) already
          reads fine at that width without changing anything. */}
      <style>{`
        .ts-2col { display: grid; grid-template-columns: 1fr 1fr; }
        .ts-header-row { display: flex; justify-content: space-between; align-items: flex-start; }
        .ts-list-row { display: flex; justify-content: space-between; align-items: center; }
        @media (max-width: 640px) {
          .ts-2col { grid-template-columns: 1fr; }
          .ts-header-row { flex-direction: column; align-items: flex-start; gap: 12px; }
          .ts-header-row > div:last-child { justify-content: flex-start; width: 100%; }
          .ts-list-row { flex-direction: column; align-items: flex-start; gap: 8px; }
          .ts-list-row > div:last-child { flex-wrap: wrap; }
        }
      `}</style>
      {selectedEnquiryId ? (
        <TradeShowEnquiryDetail enquiryId={selectedEnquiryId} onBack={() => setSelectedEnquiryId(null)} />
      ) : (
        <TradeShowEnquiryList onOpenEnquiry={setSelectedEnquiryId} />
      )}
    </>
  );
}

// Renamed from the original TradeShowEnquiryDesk — this is now just the
// "create + list" screen; TradeShowEnquiryDesk above is the thin
// list-vs-detail switch, matching the pattern of not needing a real
// router entry for a sub-view within one admin section.
function TradeShowEnquiryList({ onOpenEnquiry }) {
  const { success, error } = useToast();
  const [brands, setBrands] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  // Feature (Sep 2026) — filter by enquiry type and by brand on the
  // list below. Both default to 'all' — matches the previous (only)
  // behavior until someone actually picks a filter.
  const [typeFilter, setTypeFilter] = useState('all');
  const [brandFilter, setBrandFilter] = useState('all');
  // Feature (Sep 2026): "tomorrow" needs to mean tomorrow in US Eastern
  // time specifically, not the browser's own local timezone — matching
  // the same EST-anchoring already used server-side for Celery Beat's
  // 11am scheduling. new Date().setDate(+1) alone would give tomorrow
  // in whatever timezone the admin's computer happens to be set to,
  // which is wrong here since the buyers and brands this is sent to are
  // US-based regardless of where the enquiry gets entered from.
  function tomorrowInEastern() {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(now);
    const y = +parts.find(p => p.type === 'year').value;
    const m = +parts.find(p => p.type === 'month').value;
    const d = +parts.find(p => p.type === 'day').value;
    const est = new Date(Date.UTC(y, m - 1, d));
    est.setUTCDate(est.getUTCDate() + 1);
    return est.toISOString().slice(0, 10);
  }
  const defaultQuoteSendDate = tomorrowInEastern();
  const dateInputRef = useRef(null);
  // Feature (Sep 2026): no more `brand` in form state — it's derived
  // from enquiry_number's letter prefix, not a separate selection. This
  // removes the exact mismatch this used to allow: someone picking the
  // wrong brand from a dropdown while typing a correct-looking number.
  // There's only one field to get right now, not two that have to agree.
  const [form, setForm] = useState({
    enquiry_number: '', store_name: '',
    buyer_name: '', buyer_email: '', quote_sent_date: defaultQuoteSendDate,
    // Feature (Sep 2026) — required, no default: this changes what the
    // buyer actually reads in both emails, so it must be a real choice
    // made at the desk, not a silent fallback. Locked after Email 1
    // sends in practice — nothing in the app has an edit path back to
    // an already-created enquiry, so there's no separate check needed
    // to enforce that.
    enquiry_type: '',
  });

  const load = () => {
    setLoading(true);
    Promise.all([
      adminAPI.listTradeShowBrands(),
      adminAPI.listTradeShowEnquiries(),
    ])
      .then(([b, e]) => { setBrands(b.data); setEnquiries(e.data); })
      .catch(() => error('Failed to load'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  // Same derivation as the backend (views.py::_brand_from_enquiry_number)
  // — kept in sync deliberately so what's shown here as "detected" is
  // never different from what the server will actually use. This is
  // purely a live preview for the person typing; the real, authoritative
  // match happens server-side on submit regardless of what this shows.
  const detectedPrefix = (form.enquiry_number.trim().match(/^[A-Za-z]+/) || [''])[0].toUpperCase();
  const detectedBrand = brands.find(b => b.enquiry_prefix.toUpperCase() === detectedPrefix);

  const canSubmit = detectedBrand && form.enquiry_number.trim() && form.store_name.trim()
    && form.buyer_name.trim() && form.buyer_email.trim() && form.quote_sent_date && form.enquiry_type;

  async function handleSubmit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      const r = await adminAPI.createTradeShowEnquiry(form);
      success(r.data.email_sent ? 'Enquiry saved — confirmation email sent' : 'Enquiry saved, but the email failed — check the brand has an email set in /admin/');
      setForm({ enquiry_number: '', store_name: '', buyer_name: '', buyer_email: '', quote_sent_date: tomorrowInEastern(), enquiry_type: '' });
      load();
    } catch (e) {
      error(extractErrorMessage(e, 'Failed to save enquiry'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>
          Order Booth
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text3)' }}>
          Take a buyer's enquiry at the show — saving it sends them an immediate confirmation email.
        </p>
      </div>

      <div style={{ border: '1px solid var(--surface4)', borderRadius: 'var(--r)', background: '#fff', padding: 20, marginBottom: 32 }}>
        <div style={{ marginBottom: 18 }}>
          <IRField label="Interest, Enquiry, or Order">
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { value: 'interest', label: 'Interest' },
                { value: 'enquiry', label: 'Enquiry' },
                { value: 'order', label: 'Order' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, enquiry_type: opt.value }))}
                  style={{
                    flex: 1, padding: '9px 0', borderRadius: 'var(--r-5)', fontSize: 13, fontWeight: 500,
                    cursor: 'pointer', border: form.enquiry_type === opt.value ? '1px solid var(--sage)' : '1px solid var(--surface4)',
                    background: form.enquiry_type === opt.value ? 'rgba(122,140,110,0.1)' : '#fff',
                    color: form.enquiry_type === opt.value ? 'var(--sage)' : 'var(--text2)',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </IRField>
        </div>

        <div className="ts-2col" style={{ gap: 14, marginBottom: 14 }}>
          <IRField label="Enquiry number/order number">
            <input value={form.enquiry_number} onChange={e => setForm(f => ({ ...f, enquiry_number: e.target.value }))} style={IR_INPUT} placeholder="e.g. KK001" />
          </IRField>
          {/* Feature (Sep 2026): brand is now DERIVED from the enquiry
              number typed on the left, not a separate manual pick — see
              detectedBrand above. This box is read-only feedback, not
              an input; the actual field submitted is still just
              enquiry_number, and the server derives brand itself
              independently (views.py), so this preview being right
              doesn't matter for correctness — it just tells the person
              upfront whether what they're typing will resolve to
              something, before they hit submit. */}
          <IRField label="Detected brand">
            <div style={{
              ...IR_INPUT, display: 'flex', alignItems: 'center', minHeight: 34,
              color: form.enquiry_number.trim() ? (detectedBrand ? 'var(--text)' : 'var(--red)') : 'var(--text3)',
              background: 'var(--bg)',
            }}>
              {!form.enquiry_number.trim()
                ? 'Type the enquiry number →'
                : detectedBrand
                  ? `${detectedBrand.name} (${detectedBrand.enquiry_prefix})`
                  : `No brand matches "${detectedPrefix || '?'}"`}
            </div>
          </IRField>
        </div>

        <div style={{ marginBottom: 14 }}>
          <IRField label="Store name">
            <input value={form.store_name} onChange={e => setForm(f => ({ ...f, store_name: e.target.value }))} style={IR_INPUT} placeholder="e.g. Larkin &amp; Field Boutique" />
          </IRField>
        </div>

        <div className="ts-2col" style={{ gap: 14, marginBottom: 14 }}>
          <IRField label="Buyer name">
            <input value={form.buyer_name} onChange={e => setForm(f => ({ ...f, buyer_name: e.target.value }))} style={IR_INPUT} placeholder="Full name" />
          </IRField>
          <IRField label="Buyer email">
            <input type="email" value={form.buyer_email} onChange={e => setForm(f => ({ ...f, buyer_email: e.target.value }))} style={IR_INPUT} placeholder="name@store.com" />
          </IRField>
        </div>

        <div style={{ marginBottom: 18 }}>
          <IRField label="Quote send date">
            {/* Bug fix / request (Sep 2026): a bare <input type="date">
                relies on the browser's own tiny, low-contrast calendar
                icon (and Firefox doesn't render one in a clickable spot
                the same way Chrome/Safari do) — easy to miss, especially
                moving fast at a show. Kept the real native date input
                underneath (proven, keyboard-accessible, works correctly
                on mobile) rather than building a custom calendar picker
                from scratch right before a deadline — just made it
                properly visible and click-anywhere-to-open instead of
                rebuilding the whole interaction. */}
            <div
              onClick={() => dateInputRef.current?.showPicker ? dateInputRef.current.showPicker() : dateInputRef.current?.focus()}
              style={{
                ...IR_INPUT, position: 'relative', display: 'flex', alignItems: 'center',
                cursor: 'pointer', padding: '7px 38px 7px 10px',
              }}
            >
              <input
                ref={dateInputRef}
                type="date"
                value={form.quote_sent_date}
                onChange={e => setForm(f => ({ ...f, quote_sent_date: e.target.value }))}
                style={{
                  border: 'none', background: 'transparent', outline: 'none',
                  font: 'inherit', color: 'inherit', width: '100%', padding: 0,
                }}
              />
              <svg
                width="18" height="18" viewBox="0 0 24 24" fill="none"
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
              >
                <rect x="3" y="5" width="18" height="16" rx="2.5" stroke="var(--sage)" strokeWidth="1.8" />
                <path d="M3 9.5H21" stroke="var(--sage)" strokeWidth="1.8" />
                <path d="M8 3V6.5" stroke="var(--sage)" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M16 3V6.5" stroke="var(--sage)" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>
          </IRField>
        </div>

        <button onClick={handleSubmit} disabled={!canSubmit || submitting} style={{ ...IR_BTN_BASE, width: '100%', padding: '11px', background: '#1A1A1A', color: '#fff', opacity: (!canSubmit || submitting) ? 0.6 : 1 }}>
          {submitting ? 'Submitting…' : 'Submit'}
        </button>
      </div>

      <div>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 10 }}>Enquiries so far</h3>
        {(() => {
          // Feature (Sep 2026): derived here, not stored in state — it's
          // fully computable from enquiries + the two filter controls,
          // so there's nothing to keep in sync by hand.
          const visibleEnquiries = enquiries.filter(e =>
            (typeFilter === 'all' || e.enquiry_type === typeFilter) &&
            (brandFilter === 'all' || e.brand_name === brandFilter)
          );
          const counts = { all: enquiries.length, enquiry: 0, order: 0, interest: 0 };
          for (const e of enquiries) {
            if (counts[e.enquiry_type] !== undefined) counts[e.enquiry_type] += 1;
          }
          return (
            <>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                {[
                  { value: 'all', label: 'All' },
                  { value: 'interest', label: 'Interest' },
                  { value: 'enquiry', label: 'Enquiry' },
                  { value: 'order', label: 'Order' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTypeFilter(opt.value)}
                    style={{
                      padding: '5px 12px', borderRadius: 'var(--r-lg)', fontSize: 12, fontWeight: 500,
                      cursor: 'pointer', border: typeFilter === opt.value ? '1px solid var(--sage)' : '1px solid var(--surface4)',
                      background: typeFilter === opt.value ? 'rgba(122,140,110,0.1)' : '#fff',
                      color: typeFilter === opt.value ? 'var(--sage)' : 'var(--text2)',
                    }}
                  >
                    {opt.label} ({counts[opt.value] ?? 0})
                  </button>
                ))}
                {/* Feature (Sep 2026) — a real filter, picking one
                    specific brand, rather than alphabetically sorting
                    every brand together. A dropdown rather than buttons
                    here specifically because brands aren't a fixed set
                    of 4 the way types are — this list grows as more
                    brands get added, and a dropdown scales with that
                    without the row of buttons growing unbounded. */}
                <select
                  value={brandFilter}
                  onChange={e => setBrandFilter(e.target.value)}
                  style={{ ...IR_INPUT, width: 'auto', padding: '5px 10px', fontSize: 12, marginLeft: 4 }}
                >
                  <option value="all">All brands</option>
                  {brands.map(b => (
                    <option key={b.name} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>
              {loading ? (
                <div style={{ fontSize: 13, color: 'var(--text3)' }}>Loading…</div>
              ) : visibleEnquiries.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--text3)' }}>{enquiries.length === 0 ? 'None yet.' : 'No enquiries match this filter.'}</div>
              ) : (
          visibleEnquiries.map(e => (
            <div key={e.id} onClick={() => onOpenEnquiry(e.id)} className="ts-list-row" style={{ border: '1px solid var(--surface4)', borderRadius: 'var(--r)', padding: '10px 14px', marginBottom: 8, background: '#fff', fontSize: 13, cursor: 'pointer' }}>
              <div>
                <strong>{e.enquiry_number}</strong> — {e.store_name} <span style={{ color: 'var(--text3)' }}>({e.brand_name})</span>
                <div style={{ color: 'var(--text3)', fontSize: 12, marginTop: 2 }}>{e.buyer_name} · {e.buyer_email}</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {/* Feature (Sep 2026) — same type badge/colors as the
                    detail view, so the two screens read consistently:
                    order=blue, interest=purple, enquiry=amber. */}
                <span style={{
                  fontSize: 11, padding: '3px 10px', borderRadius: 'var(--r-lg)', fontWeight: 500,
                  background: e.enquiry_type === 'order' ? 'rgba(90,150,210,0.12)' : e.enquiry_type === 'interest' ? 'rgba(150,120,200,0.12)' : 'rgba(200,160,60,0.12)',
                  color: e.enquiry_type === 'order' ? '#3B6BA5' : e.enquiry_type === 'interest' ? '#7A5FA6' : 'var(--amber-deep)',
                }}>
                  {e.enquiry_type === 'order' ? 'Order' : e.enquiry_type === 'interest' ? 'Interest' : 'Enquiry'}
                </span>
                {/* Bug fix (Sep 2026): an Interest-type enquiry's
                    submission_status never leaves "pending" — nothing in
                    that flow ever calls Submit, since Interest stops
                    after Email 1 entirely (see the detail view's own
                    equivalent fix). Showing raw "Pending" here read as
                    unfinished/stuck when it's actually fully done the
                    moment Email 1 sends — "Done" based on email_sent is
                    what's actually true for this type. */}
                <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 'var(--r-lg)', fontWeight: 500, background: 'var(--surface2)', color: 'var(--text2)' }}>
                  {e.enquiry_type === 'interest'
                    ? (e.email_sent ? 'Done' : 'Failed')
                    : ({ pending: 'Pending', processing: 'Processing', needs_review: 'Needs review', submitted: 'Submitted' })[e.submission_status] || e.submission_status}
                </span>
                <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 'var(--r-lg)', fontWeight: 500, background: e.email_sent ? 'rgba(90,210,120,0.1)' : 'rgba(232,80,80,0.1)', color: e.email_sent ? 'var(--green)' : 'var(--red)' }}>
                  E1 {e.email_sent ? '✓' : '✗'}
                </span>
                {/* Interest never gets an Email 2 at all — see the
                    detail view's identical guard — so this badge would
                    permanently read "not scheduled" for something that
                    was never going to be scheduled. Hidden for this
                    type rather than showing a status that doesn't apply. */}
                {e.enquiry_type !== 'interest' && (
                  <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 'var(--r-lg)', fontWeight: 500, background: e.email2_sent ? 'rgba(90,210,120,0.1)' : 'var(--surface2)', color: e.email2_sent ? 'var(--green)' : 'var(--text3)' }}>
                    E2 {e.email2_sent ? '✓' : '—'}
                  </span>
                )}
              </div>
            </div>
          ))
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
}

function AccessRequests() {
  const { success, error } = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [notes, setNotes]       = useState({});
  const [copied, setCopied]     = useState({});

  const load = () => {
    setLoading(true);
    adminAPI.listAccessRequests()
      .then(r => setRequests(r.data.requests || []))
      .catch(() => error('Failed to load requests'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  async function handleStatus(id, status) {
    try {
      await adminAPI.updateAccessRequest(id, { status, notes: notes[id] || '' });
      success(`Marked as ${status}`);
      load();
    } catch { error('Failed to update'); }
  }

  async function handleSaveNotes(id) {
    try {
      await adminAPI.updateAccessRequest(id, { notes: notes[id] || '' });
      success('Notes saved');
    } catch { error('Failed to save notes'); }
  }

  async function handleGenerateKey(req) {
    try {
      // Bug fix (Aug 2026): this used to call the generic key-generator
      // (count/tokens_allocated/notes only — no real link to the
      // request), copy the code to the admin's own clipboard, and stop
      // there — nothing ever emailed the code to the requester. The new
      // endpoint creates the key, links it to this request in the
      // database, emails it to them as Qalawati (B-03), and returns
      // that same info — so the persisted `r.generated_key` from the
      // reloaded list (not local state) is what the UI shows from here
      // on, surviving refreshes instead of vanishing after one popup.
      const res = await adminAPI.approveAndGenerateKey(req.id);
      const { key_code, email_sent, email } = res.data;
      navigator.clipboard.writeText(key_code);
      success(
        email_sent
          ? `Key ${key_code} emailed to ${email} (also copied)`
          : `Key ${key_code} generated and copied — email failed to send, share it manually`
      );
      load();
    } catch { error('Failed to generate key'); }
  }

  function copyEmail(email, id) {
    navigator.clipboard.writeText(email).then(() => {
      setCopied(p => ({ ...p, [id]: true }));
      setTimeout(() => setCopied(p => ({ ...p, [id]: false })), 2000);
    });
  }

  const statusColor = s => ({
    pending:  { bg: 'rgba(200,160,60,0.1)',  text: 'var(--amber-deep)' },
    approved: { bg: 'rgba(90,210,120,0.1)',  text: 'var(--green)' },
    rejected: { bg: 'rgba(232,80,80,0.1)',   text: 'var(--red)' },
  }[s] || { bg: 'var(--surface2)', text: 'var(--text3)' });

  const pending  = requests.filter(r => r.status === 'pending').length;
  const approved = requests.filter(r => r.status === 'approved').length;

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>
          Access Requests
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text3)' }}>
          Brands requesting an access code from the landing page.
        </p>
        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 'var(--r-lg)', background: 'rgba(200,160,60,0.1)', color: 'var(--amber-deep)', fontWeight: 500 }}>
            {pending} pending
          </span>
          <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 'var(--r-lg)', background: 'rgba(90,210,120,0.1)', color: 'var(--green)', fontWeight: 500 }}>
            {approved} approved
          </span>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner /></div>
      ) : requests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text3)', fontSize: 14 }}>
          No requests yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {requests.map(r => {
            const sc   = statusColor(r.status);
            const date = new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' });
            return (
              <div key={r.id} style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 'var(--r-lg)', padding: '18px 20px',
              }}>
                {/* Top row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{r.name}</span>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 'var(--r-10)',
                        background: sc.bg, color: sc.text, textTransform: 'capitalize',
                      }}>
                        {r.status}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text4)' }}>{date}</span>
                    </div>
                    {/* Email */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <span style={{ fontSize: 13, color: 'var(--text2)' }}>{r.email}</span>
                      <button
                        onClick={() => copyEmail(r.email, r.id)}
                        style={{ fontSize: 10, padding: '2px 7px', borderRadius: 'var(--r-4)', border: '1px solid var(--border)', background: 'var(--surface2)', cursor: 'pointer', color: copied[r.id] ? 'var(--green)' : 'var(--text3)', fontFamily: 'var(--font-body)' }}
                      >
                        {copied[r.id] ? '✓' : 'Copy'}
                      </button>
                    </div>
                    {/* Link */}
                    {r.link && (
                      <a href={r.link.startsWith('http') ? r.link : `https://${r.link}`}
                        target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 12, color: 'var(--gold)', display: 'block', marginTop: 3 }}>
                        {r.link}
                      </a>
                    )}
                    {/* Generated key — read from the persisted, reloaded
                        request data (r.generated_key), not transient
                        local state. This is the actual fix for "no past
                        codes, just a popup that disappears": since this
                        now comes from the database via listAccessRequests,
                        it's still here after a refresh, a day later, or
                        opening this page on a different device. */}
                    {r.generated_key && (
                      <div style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 12px', borderRadius: 'var(--r-8)', background: 'rgba(90,210,120,0.08)', border: '1px solid rgba(90,210,120,0.25)' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: 'var(--green)', letterSpacing: '0.08em' }}>{r.generated_key.key_code}</span>
                        <button
                          onClick={() => { navigator.clipboard.writeText(r.generated_key.key_code); success('Copied'); }}
                          style={{ fontSize: 11, color: 'var(--green)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-body)', textDecoration: 'underline' }}
                        >
                          copy
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap', alignItems: 'center' }}>
                    {r.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleGenerateKey(r)}
                          style={{ padding: '7px 14px', borderRadius: 'var(--r)', border: 'none', background: 'var(--gold)', color: '#fff', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}
                        >
                          Generate &amp; Approve
                        </button>
                        <button
                          onClick={() => handleStatus(r.id, 'rejected')}
                          style={{ padding: '7px 12px', borderRadius: 'var(--r)', border: '1px solid rgba(232,80,80,0.3)', background: 'rgba(232,80,80,0.06)', color: 'var(--red)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)' }}
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {/* Bug fix: this used to check local-only genKey[r.id],
                        which is always empty after a refresh — so an
                        already-approved, already-keyed request would show
                        "Generate Key" again, and clicking it created a
                        SECOND, orphaned key with no link to this request.
                        Now checks the persisted r.generated_key instead:
                        an approved request with no key yet still offers
                        to generate one; an approved request that already
                        has one offers to resend the email instead
                        (handleGenerateKey is safely idempotent on the
                        backend either way — see AdminApproveAndGenerateKeyView). */}
                    {r.status === 'approved' && !r.generated_key && (
                      <button
                        onClick={() => handleGenerateKey(r)}
                        style={{ padding: '7px 14px', borderRadius: 'var(--r)', border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text2)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)' }}
                      >
                        Generate Key
                      </button>
                    )}
                    {r.status === 'approved' && r.generated_key && (
                      <button
                        onClick={() => handleGenerateKey(r)}
                        style={{ padding: '7px 14px', borderRadius: 'var(--r)', border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text2)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)' }}
                      >
                        Resend Email
                      </button>
                    )}
                    {r.status === 'rejected' && (
                      <button
                        onClick={() => handleStatus(r.id, 'pending')}
                        style={{ padding: '7px 12px', borderRadius: 'var(--r)', border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text3)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)' }}
                      >
                        Reconsider
                      </button>
                    )}
                  </div>
                </div>

                {/* Notes */}
                <div style={{ marginTop: 14, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <textarea
                    value={notes[r.id] ?? r.notes ?? ''}
                    onChange={e => setNotes(p => ({ ...p, [r.id]: e.target.value }))}
                    placeholder="Internal notes…"
                    rows={1}
                    style={{
                      flex: 1, padding: '7px 10px', borderRadius: 'var(--r)', resize: 'vertical',
                      border: '1px solid var(--border)', background: 'var(--surface2)',
                      fontSize: 12, color: 'var(--text)', fontFamily: 'var(--font-body)',
                      outline: 'none', minHeight: 32,
                    }}
                  />
                  <button
                    onClick={() => handleSaveNotes(r.id)}
                    style={{ padding: '7px 14px', borderRadius: 'var(--r)', border: '1px solid var(--border)', background: 'var(--surface2)', fontSize: 12, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' }}
                  >
                    Save notes
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}



// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — PROJECTS LIST
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const navItems = [
    { to: '/admin',                              icon: '', label: 'Overview',         end: true },
    { to: '/admin/review',                       icon: '', label: 'Review Profile'              },
    { to: '/admin/create-seller',                icon: '', label: 'Create Seller'               },
    { to: '/admin/discovery',                    icon: '', label: 'Discovery',          end: true  },
    { to: '/admin/discovery/inquiries',          icon: '', label: 'Inquiries'                   },
    { to: '/admin/studio-descriptions',          icon: '', label: 'Studio Descriptions'         },
    { to: '/admin/access-keys',                  icon: '', label: 'Access Keys'                  },
    { to: '/admin/contacts',                     icon: '', label: 'Contacts'                     },
    { to: '/admin/access-requests',              icon: '', label: 'Access Requests'              },
    { to: '/admin/introduction-requests',        icon: '', label: 'Introduction Requests'        },
    { to: '/admin/trade-show-enquiry',           icon: '', label: 'Order Booth'                    },
    { to: '/admin/library',                      icon: '', label: 'Library'                      },
    { to: '/admin/projects',                     icon: '📋', label: 'Projects'                  },
    { to: '/admin/orders',                       icon: '📦', label: 'Orders Dashboard'          },
  ];
  return (
    <DashLayout nav={navItems}>
      <Routes>
        {/* Temporary (Sep 2026) — bare /admin lands on Trade Show
            Enquiry instead of Overview, at explicit request while
            that's the priority. Revert by changing this back to
            `element={<Overview />}` — see App.jsx's roleHome for the
            matching temporary change to the post-login redirect. */}
        <Route index                                 element={<Navigate to="trade-show-enquiry" replace />} />
        <Route path="review"                         element={<ProfileReview />}          />
        <Route path="review/:pid"                    element={<ProfileReview />}          />
        <Route path="create-seller"                  element={<CreateSeller />}           />
        <Route path="discovery"                      element={<DiscoveryOverview />}      />
        <Route path="discovery/inquiries"            element={<DiscoveryInquiries />}     />
        <Route path="discovery/studio-inquiries"     element={<Navigate to="/admin/projects" replace />} />
        <Route path="discovery/:buyerId"             element={<DiscoveryBuyerDetail />}   />
        <Route path="studio-descriptions"             element={<StudioDescriptions />}     />
        <Route path="access-keys"                     element={<AccessKeys />}             />
        <Route path="contacts"                         element={<Contacts />}              />
        <Route path="access-requests"                  element={<AccessRequests />}         />
        <Route path="introduction-requests"            element={<IntroductionRequests />}   />
        <Route path="trade-show-enquiry"               element={<TradeShowEnquiryDesk />}   />
        <Route path="library"                          element={<LibraryManager />}         />
        <Route path="projects"                         element={<AdminProjectsList />}       />
        <Route path="projects/new"                     element={<AdminCreateProjectWizard />} />
        <Route path="projects/:projectId/proposals/:proposalId" element={<AdminProposalReview />} />
        <Route path="projects/:projectId"              element={<AdminProjectDetail />}      />
        <Route path="projects/:projectId/assign-studios" element={<AdminAssignStudios />}    />
        <Route path="orders"                           element={<AdminOrdersDashboard />}    />
      </Routes>
    </DashLayout>
  );
}
import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { onboardingAPI } from '../api/client';
import { DashLayout } from '../components/DashLayout';
import { Spinner } from '../components/Spinner';
import SectionA from './seller/SectionA';
import SectionB from './seller/SectionB';
import SectionC from './seller/SectionC';
import SectionD from './seller/SectionD';
import SectionE from './seller/SectionE';
import SectionF from './seller/SectionF';

function statusBadge(s) {
  const map = { submitted:'badge-green', in_progress:'badge-orange', not_started:'badge-gray', flagged:'badge-red', approved:'badge-teal' };
  const labels = { submitted:'Submitted', in_progress:'In Progress', not_started:'Not Started', flagged:'Flagged', approved:'Approved' };
  return <span className={`badge ${map[s]||'badge-gray'}`}>{labels[s]||s}</span>;
}

const SECTIONS = [
  { key:'a', label:'Studio Details',    path:'studio',      icon:'', desc:'Name, location, contacts, portfolio, USPs' },
  { key:'b', label:'Products & Fabrics',path:'products',    icon:'', desc:'21 garment types, 40+ fabrics, brands, awards' },
  { key:'c', label:'Crafts',            path:'crafts',      icon:'', desc:'Specializations, timelines, innovation scoring' },
  { key:'d', label:'Collaboration',     path:'collab',      icon:'', desc:'Designer, sampling rounds, buyer requirements' },
  { key:'e', label:'Production Scale',  path:'production',  icon:'', desc:'Monthly capacity, MOQ conditions' },
  { key:'f', label:'Process',           path:'process',     icon:'', desc:'Production steps, behind-the-scenes media' },
];

function Overview({ snapshot, flags }) {
  const nav = useNavigate();
  if (!snapshot) return <Spinner full />;
  const { status } = snapshot;
  const pct = status?.completion_percentage ?? 0;
  const submitted = SECTIONS.filter(s => {
    const st = status?.[`section_${s.key}_status`];
    return st === 'submitted' || st === 'approved';
  }).length;

  return (
    <div style={{ padding:'40px 48px', maxWidth:960 }}>

      {/* Header */}
      <div className="fade-up" style={{ marginBottom:40 }}>
        <h1 style={{ fontFamily:'var(--font-display)', fontSize:42, fontWeight:700, color:'var(--text)', marginBottom:8, lineHeight:1.1 }}>
          Your Studio<br/><em style={{ color:'var(--gold)' }}>Profile</em>
        </h1>
        <p style={{ color:'var(--text3)', fontSize:15 }}>Complete all 6 sections to get discovered by buyers.</p>
      </div>

      {/* Flags */}
      {flags?.total_flags > 0 && (
        <div className="flag-banner fade-up">
          <div>
            <strong style={{ display:'block', marginBottom:6 }}>{flags.total_flags} field{flags.total_flags > 1 ? 's' : ''} flagged by admin</strong>
            {flags.flags?.map((f, i) => (
              <div key={i} style={{ fontSize:12, marginTop:3 }}>
                Section {f.section?.toUpperCase()} · <em>{f.field}</em> — {f.reason}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progress card */}
      <div className="card card-gold fade-up" style={{ marginBottom:32, padding:'28px 32px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
          <div>
            <div style={{ fontSize:12, fontWeight:600, color:'var(--text3)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:6 }}>Overall Completion</div>
            <div style={{ fontSize:13, color:'var(--text2)' }}>{submitted} of 6 sections submitted</div>
          </div>
          <div style={{ fontFamily:'var(--font-display)', fontSize:48, fontWeight:700, color:'var(--gold)', lineHeight:1 }}>
            {pct}<span style={{ fontSize:24 }}>%</span>
          </div>
        </div>
        <div className="prog-bar" style={{ height:6 }}><div className="prog-bar-fill" style={{ width:`${pct}%` }} /></div>
        {pct === 100 && (
          <div style={{ marginTop:12, fontSize:13, color:'var(--green)', display:'flex', gap:6, alignItems:'center' }}>
            Profile complete — visible to buyers
          </div>
        )}
      </div>

      {/* Section grid */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        {SECTIONS.map((sec, i) => {
          const st = status?.[`section_${sec.key}_status`] || 'not_started';
          const done = st === 'submitted' || st === 'approved';
          return (
            <div key={sec.key}
              className={`card card-hover fade-up fade-up-${(i % 3) + 1}`}
              onClick={() => nav(sec.path)}
              style={{ cursor:'pointer', borderLeft:`3px solid ${done ? 'var(--gold)' : st === 'flagged' ? 'var(--red)' : st === 'in_progress' ? 'var(--amber)' : 'var(--border)'}` }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                  <span style={{ fontSize:22 }}>{sec.icon}</span>
                  <div>
                    <div style={{ fontSize:10, fontWeight:700, color:'var(--gold)', letterSpacing:'0.08em', textTransform:'uppercase' }}>Section {sec.key.toUpperCase()}</div>
                    <div style={{ fontWeight:600, fontSize:14, color:'var(--text)', marginTop:1 }}>{sec.label}</div>
                  </div>
                </div>
                {statusBadge(st)}
              </div>
              <p style={{ fontSize:12, color:'var(--text3)', marginBottom:16, lineHeight:1.6 }}>{sec.desc}</p>
              <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color: done ? 'var(--gold)' : 'var(--text3)', fontWeight: done ? 600 : 400 }}>
                {done ? 'Complete' : st === 'in_progress' ? '↻ In Progress' : '→ Start'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SellerDashboard() {
  const { user } = useAuth();
  const [snapshot, setSnapshot] = useState(null);
  const [flags, setFlags]       = useState(null);
  const profileId = user?.profiles?.[0]?.id;

  const refresh = () => {
    if (!profileId) return;
    onboardingAPI.snapshot(profileId).then(r => setSnapshot(r.data)).catch(()=>{});
    onboardingAPI.flags(profileId).then(r => setFlags(r.data)).catch(()=>{});
  };

  useEffect(refresh, [profileId]);

  const status = snapshot?.status;
  const navItems = [
    { to:'/dashboard',            icon:'', label:'Overview' },
    { to:'/dashboard/studio',     icon:'', label:'A — Studio',     badge: status?.section_a_status === 'flagged' ? { type:'red', text:'!' } : null },
    { to:'/dashboard/products',   icon:'', label:'B — Products',   badge: status?.section_b_status === 'flagged' ? { type:'red', text:'!' } : null },
    { to:'/dashboard/crafts',     icon:'', label:'C — Crafts',     badge: status?.section_c_status === 'flagged' ? { type:'red', text:'!' } : null },
    { to:'/dashboard/collab',     icon:'', label:'D — Collab',     badge: status?.section_d_status === 'flagged' ? { type:'red', text:'!' } : null },
    { to:'/dashboard/production', icon:'', label:'E — Production', badge: status?.section_e_status === 'flagged' ? { type:'red', text:'!' } : null },
    { to:'/dashboard/process',    icon:'', label:'F — Process',    badge: status?.section_f_status === 'flagged' ? { type:'red', text:'!' } : null },
  ].filter(n => n.badge !== null || true).map(n => ({ ...n, badge: n.badge || undefined }));

  return (
    <DashLayout nav={navItems}>
      <Routes>
        <Route index           element={<Overview snapshot={snapshot} flags={flags} />} />
        <Route path="studio"     element={<SectionA profileId={profileId} onSave={refresh} />} />
        <Route path="products"   element={<SectionB profileId={profileId} onSave={refresh} />} />
        <Route path="crafts"     element={<SectionC profileId={profileId} onSave={refresh} />} />
        <Route path="collab"     element={<SectionD profileId={profileId} onSave={refresh} />} />
        <Route path="production" element={<SectionE profileId={profileId} onSave={refresh} />} />
        <Route path="process"    element={<SectionF profileId={profileId} onSave={refresh} />} />
      </Routes>
    </DashLayout>
  );
}

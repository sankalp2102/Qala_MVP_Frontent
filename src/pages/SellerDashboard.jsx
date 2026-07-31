import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { onboardingAPI, projectsAPI } from '../api/client';
import { DashLayout } from '../components/DashLayout';
import { Spinner } from '../components/Spinner';
import { mediaUrl } from '../utils/mediaUrl';
import SectionA from './seller/SectionA';
import SectionB from './seller/SectionB';
import SectionC from './seller/SectionC';
import SectionD from './seller/SectionD';
import SectionE from './seller/SectionE';
import SectionF from './seller/SectionF';
import SectionG from './seller/SectionG';
import SectionH from './seller/SectionH';
import EnquiryDetail from './seller/EnquiryDetail';
import EnquiriesList from './seller/EnquiriesList';
import ProposalBuilder from './seller/ProposalBuilder';
import ActiveProjects from './seller/ActiveProjects';
import Wallet from './seller/Wallet';
import SellerHome from './seller/SellerHome';
import ActivityHistory from './seller/ActivityHistory';
import OrderDetail from './seller/OrderDetail';
import Earnings from './seller/Earnings';
import SellerProfile from './seller/SellerProfile';
import SellerSettings from './seller/SellerSettings';

// v3: 8 sections A–H
const SECTIONS = [
  { key:'a', label:'Introduction',          path:'studio',      icon:'', desc:'Studio identity, location, contacts, strengths, recognition' },
  { key:'b', label:'Categories',            path:'products',    icon:'', desc:'Gender, occasions, garment types, home furnishings' },
  { key:'c', label:'Fabrics & Dyes',        path:'fabrics',     icon:'', desc:'What you work with, and how well' },
  { key:'d', label:'Crafts & Techniques',   path:'crafts',      icon:'', desc:'Printing, surface, and weaving techniques' },
  { key:'e', label:'Collaboration',         path:'collab',      icon:'', desc:'Collaboration modes and design capabilities' },
  { key:'f', label:'Team & Capacity',       path:'production',  icon:'', desc:'Team, capacity, timelines, MOQ' },
  { key:'g', label:'Past Work',             path:'projects',    icon:'', desc:'Your product library and collections' },
  { key:'h', label:'Behind the Scenes',     path:'process',     icon:'', desc:'Studio media and final notes' },
];

/* ── OVERVIEW ── */
function statusBadge(s) {
  const map    = { submitted:'badge-green', in_progress:'badge-orange', not_started:'badge-gray', flagged:'badge-red', approved:'badge-teal' };
  const labels = { submitted:'Submitted', in_progress:'In Progress', not_started:'Not Started', flagged:'Flagged', approved:'Approved' };
  return <span className={`badge ${map[s]||'badge-gray'}`}>{labels[s]||s}</span>;
}

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
    <div style={{ padding:'clamp(20px, 3vw, 40px) clamp(16px, 4vw, 48px)', maxWidth:960 }}>

      {/* Header */}
      <div className="fade-up" style={{ marginBottom:40 }}>
        <h1 style={{ fontFamily:'var(--font-display)', fontSize:42, fontWeight:700, color:'var(--text)', marginBottom:8, lineHeight:1.1 }}>
          Your Studio<br/><em style={{ color:'var(--gold)' }}>Profile</em>
        </h1>
        <p style={{ color:'var(--text3)', fontSize:15 }}>Complete all 8 sections to get discovered by buyers.</p>
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
            <div style={{ fontSize:13, color:'var(--text2)' }}>{submitted} of 8 sections submitted</div>
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
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:16 }}>
        {SECTIONS.map((sec, i) => {
          const st   = status?.[`section_${sec.key}_status`] || 'not_started';
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

/* ── MAIN EXPORT ── */
export default function SellerDashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [snapshot, setSnapshot] = useState(null);
  const [flags, setFlags]       = useState(null);
  const profileId = user?.profiles?.[0]?.id;

  const refresh = () => {
    if (!profileId) return;
    onboardingAPI.snapshot(profileId).then(r => setSnapshot(r.data)).catch(() => {});
    onboardingAPI.flags(profileId).then(r => setFlags(r.data)).catch(() => {});
  };

  useEffect(refresh, [profileId]);

  // New-enquiries nav badge (spec §4.1) — counts assignments not yet
  // actioned by the studio (assigned/brief_viewed).
  const [newEnquiryCount, setNewEnquiryCount] = useState(0);
  useEffect(() => {
    const loadCount = () => {
      projectsAPI.getEnquiries()
        .then(r => {
          const n = (r.data.enquiries || []).filter(e => ['assigned', 'brief_viewed'].includes(e.enquiry_status)).length;
          setNewEnquiryCount(n);
        })
        .catch(() => {});
    };
    loadCount();
    const id = setInterval(loadCount, 60000); // refresh every minute, not a live feed
    return () => clearInterval(id);
  }, []);

  const status = snapshot?.status;
  const navItems = [
    { to:'/dashboard',             icon:'', label:'Overview',             end: true                                                                              },
    { to:'/dashboard/home',        icon:'', label:'Home'                                                                                                          },
    { to:'/dashboard/studio',      icon:'', label:'A — Introduction',     badge: status?.section_a_status === 'flagged' ? { type:'red', text:'!' } : null },
    { to:'/dashboard/products',    icon:'', label:'B — Categories',       badge: status?.section_b_status === 'flagged' ? { type:'red', text:'!' } : null },
    { to:'/dashboard/fabrics',     icon:'', label:'C — Fabrics & Dyes',   badge: status?.section_c_status === 'flagged' ? { type:'red', text:'!' } : null },
    { to:'/dashboard/crafts',      icon:'', label:'D — Crafts & Techniques', badge: status?.section_d_status === 'flagged' ? { type:'red', text:'!' } : null },
    { to:'/dashboard/collab',      icon:'', label:'E — Collaboration',    badge: status?.section_e_status === 'flagged' ? { type:'red', text:'!' } : null },
    { to:'/dashboard/production',  icon:'', label:'F — Team & Capacity', badge: status?.section_f_status === 'flagged' ? { type:'red', text:'!' } : null },
    { to:'/dashboard/projects',    icon:'', label:'G — Past Work',   badge: status?.section_g_status === 'flagged' ? { type:'red', text:'!' } : null },
    { to:'/dashboard/process',     icon:'', label:'H — Behind the Scenes', badge: status?.section_h_status === 'flagged' ? { type:'red', text:'!' } : null },
    { to:'/dashboard/enquiries',   icon:'', label:'Enquiries',   badge: newEnquiryCount > 0 ? { type:'gold', text:String(newEnquiryCount) } : null },
    { to:'/dashboard/active',      icon:'', label:'Active Projects'                                                                                    },
    { to:'/dashboard/earnings',    icon:'', label:'Earnings & Wallet'                                                                                  },
    { to:'/dashboard/activity',    icon:'', label:'Activity History'                                                                                   },
    { to:'/dashboard/profile',     icon:'', label:'My Profile'                                                                                         },
    { to:'/dashboard/settings',    icon:'', label:'Settings'                                                                                           },
  ].filter(n => n.badge !== null || true).map(n => ({ ...n, badge: n.badge || undefined }));

  return (
    <DashLayout nav={navItems} theme="qala-form-theme">
      <Routes>
        <Route index             element={<Overview snapshot={snapshot} flags={flags} />}  />
        <Route path="home"       element={<SellerHome />}                                  />
        <Route path="studio"     element={<SectionA profileId={profileId} initialData={snapshot?.studio_details}  onSave={refresh} onNext={() => { refresh(); nav('/dashboard/products'); }} />} />
        <Route path="products"   element={<SectionB profileId={profileId} initialData={snapshot?.studio_details}  onSave={refresh} onNext={() => { refresh(); nav('/dashboard/fabrics'); }} />} />
        <Route path="fabrics"    element={<SectionC profileId={profileId} initialData={{ studio: snapshot?.studio_details, fabrics: snapshot?.fabric_answers, dyes: snapshot?.dye_answers }} onSave={refresh} onNext={() => { refresh(); nav('/dashboard/crafts'); }} />} />
        <Route path="crafts"     element={<SectionD profileId={profileId} initialData={snapshot?.crafts}         onSave={refresh} onNext={() => { refresh(); nav('/dashboard/collab'); }} />} />
        <Route path="collab"     element={<SectionE profileId={profileId} initialData={snapshot?.collab_design}  onSave={refresh} onNext={() => { refresh(); nav('/dashboard/production'); }} />} />
        <Route path="production" element={<SectionF profileId={profileId} initialData={{ production: snapshot?.production_scale, collab: snapshot?.collab_design, studio: snapshot?.studio_details }} onSave={refresh} onNext={() => { refresh(); nav('/dashboard/projects'); }} />} />
        <Route path="projects"   element={<SectionG profileId={profileId} initialData={{ studio_products: snapshot?.studio_products, studio_collections: snapshot?.studio_collections }} onSave={refresh} onNext={() => { refresh(); nav('/dashboard/process'); }} />} />
        <Route path="process"    element={<SectionH profileId={profileId} initialData={{ process: snapshot?.process_readiness, studio: snapshot?.studio_details }} onSave={refresh} onNext={() => { refresh(); nav('/dashboard'); }} />} />
        <Route path="inquiries"  element={<Navigate to="/dashboard/enquiries" replace />}    />
        <Route path="enquiries"  element={<EnquiriesList />}                                          />
        <Route path="enquiries/:projectId" element={<EnquiryDetail />}                                />
        <Route path="enquiries/:projectId/proposal/:proposalId" element={<ProposalBuilder />}         />
        <Route path="active"     element={<ActiveProjects />}                                          />
        <Route path="active/:projectId/orders/:orderId" element={<OrderDetail />}                      />
        <Route path="wallet"     element={<Wallet />}                                                  />
        <Route path="earnings"   element={<Earnings />}                                                />
        <Route path="activity"   element={<ActivityHistory />}                                         />
        <Route path="profile"    element={<SellerProfile snapshot={snapshot} profileId={profileId} onSave={refresh} />} />
        <Route path="settings"   element={<SellerSettings snapshot={snapshot} profileId={profileId} onSave={refresh} userEmail={user?.email} />} />
      </Routes>
    </DashLayout>
  );
}
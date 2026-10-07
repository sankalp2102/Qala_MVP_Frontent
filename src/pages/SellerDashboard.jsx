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

  // Icons/groups restyled against seller-console.html's own sidebar — reused
  // its exact icons verbatim wherever a nav item matches one it actually
  // has (Home, Enquiries, Earnings & Wallet, Settings — and My Profile,
  // which in that prototype is a HOUSE glyph, not a person icon, since
  // it's the studio's own profile, not a personal account). Its "Projects"
  // icon (a lined notepad, not the admin panel's calendar-style Projects
  // icon) is reused for Active Projects — the two sidebars are different
  // files in the prototype with their own icon sets, not meant to be
  // identical to each other, so this doesn't force them to match.
  // Sections A–H (studio onboarding) and Activity History don't exist in
  // the prototype at all — new icons, drawn in the same 16x16/stroke-1.5
  // language, one per section's actual subject.
  // Groups mostly reuse the prototype's own group names (Operations /
  // Finances / Studio) where the matching items fall under them; "Studio
  // Profile" and the extra items under "Operations" are additions this
  // app actually has that the demo didn't need to model.
  const SI = {
    grid:     <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg>,
    pulse:    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 8h3l2-5 4 10 2-5h3"/></svg>,
    info:     <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6.5"/><path d="M8 7.3v4M8 5v.3"/></svg>,
    tag:      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 2h5.5L14 8.5 8.5 14 2 7.5V2Z"/><circle cx="5" cy="5" r="1"/></svg>,
    droplet:  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 1.5c2.5 3 4.5 5.8 4.5 8.3A4.5 4.5 0 0 1 3.5 9.8C3.5 7.3 5.5 4.5 8 1.5Z"/></svg>,
    craft:    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 3l10 10M13 3L3 13"/><circle cx="3" cy="3" r="1.2"/><circle cx="13" cy="3" r="1.2"/><circle cx="3" cy="13" r="1.2"/><circle cx="13" cy="13" r="1.2"/></svg>,
    people:   <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="5.5" cy="6" r="2.5"/><path d="M1 14c0-2.5 2-4.5 4.5-4.5S10 11.5 10 14"/><path d="M9.5 3.5a2.3 2.3 0 0 1 0 4.5"/><path d="M11 9.8c2 .3 3.5 2 3.5 4.2"/></svg>,
    capacity: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 14V9M6.5 14V5M11 14V7M15 14V2"/></svg>,
    folder:   <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1.5 4a1 1 0 0 1 1-1h3l1.5 2h6a1 1 0 0 1 1 1v6.5a1 1 0 0 1-1 1h-10.5a1 1 0 0 1-1-1V4Z"/></svg>,
    camera:   <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1.5 5.5a1 1 0 0 1 1-1h2l1-2h5l1 2h2a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-7Z"/><circle cx="8" cy="9" r="2.3"/></svg>,
    // Reused verbatim from seller-console.html — these items exist in the
    // prototype exactly as-is.
    home:     <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg>,
    envelope: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 3h12v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3Z"/><path d="M2 3l6 5 6-5"/></svg>,
    projects: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="12" height="12" rx="1.5"/><path d="M5 6h6M5 8.5h4M5 11h3"/></svg>,
    wallet:   <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="4" width="14" height="10" rx="1.5"/><path d="M4 4V3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v1"/><circle cx="8" cy="9" r="2"/></svg>,
    house:    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 13V6l6-4 6 4v7"/><path d="M6 13v-3h4v3"/></svg>,
    gear:     <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="2"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.1 3.1l1.4 1.4M11.5 11.5l1.4 1.4M3.1 12.9l1.4-1.4M11.5 4.5l1.4-1.4"/></svg>,
  };

  const navItems = [
    { to:'/dashboard',             icon:SI.pulse,    label:'Overview',             end: true, group:'Overview' },
    { to:'/dashboard/home',        icon:SI.home,     label:'Home',                            group:'Overview' },

    { to:'/dashboard/studio',      icon:SI.info,     label:'A — Introduction',     group:'Studio Profile', badge: status?.section_a_status === 'flagged' ? { type:'red', text:'!' } : null },
    { to:'/dashboard/products',    icon:SI.tag,      label:'B — Categories',       group:'Studio Profile', badge: status?.section_b_status === 'flagged' ? { type:'red', text:'!' } : null },
    { to:'/dashboard/fabrics',     icon:SI.droplet,  label:'C — Fabrics & Dyes',   group:'Studio Profile', badge: status?.section_c_status === 'flagged' ? { type:'red', text:'!' } : null },
    { to:'/dashboard/crafts',      icon:SI.craft,    label:'D — Crafts & Techniques', group:'Studio Profile', badge: status?.section_d_status === 'flagged' ? { type:'red', text:'!' } : null },
    { to:'/dashboard/collab',      icon:SI.people,   label:'E — Collaboration',    group:'Studio Profile', badge: status?.section_e_status === 'flagged' ? { type:'red', text:'!' } : null },
    { to:'/dashboard/production',  icon:SI.capacity, label:'F — Team & Capacity', group:'Studio Profile', badge: status?.section_f_status === 'flagged' ? { type:'red', text:'!' } : null },
    { to:'/dashboard/projects',    icon:SI.folder,   label:'G — Past Work',   group:'Studio Profile', badge: status?.section_g_status === 'flagged' ? { type:'red', text:'!' } : null },
    { to:'/dashboard/process',     icon:SI.camera,   label:'H — Behind the Scenes', group:'Studio Profile', badge: status?.section_h_status === 'flagged' ? { type:'red', text:'!' } : null },

    { to:'/dashboard/enquiries',   icon:SI.envelope, label:'Enquiries',   group:'Operations', badge: newEnquiryCount > 0 ? { type:'gold', text:String(newEnquiryCount) } : null },
    { to:'/dashboard/active',      icon:SI.projects, label:'Active Projects',                 group:'Operations' },
    { to:'/dashboard/activity',    icon:SI.pulse,    label:'Activity History',                group:'Operations' },

    { to:'/dashboard/earnings',    icon:SI.wallet,   label:'Earnings & Wallet',               group:'Finances' },

    { to:'/dashboard/profile',     icon:SI.house,    label:'My Profile',                      group:'Studio' },
    { to:'/dashboard/settings',    icon:SI.gear,     label:'Settings',                        group:'Studio' },
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
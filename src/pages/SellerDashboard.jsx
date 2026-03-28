import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { onboardingAPI } from '../api/client';
import { DashLayout } from '../components/DashLayout';
import { Spinner } from '../components/Spinner';
import { mediaUrl } from '../utils/mediaUrl';
import SectionA from './seller/SectionA';
import SectionB from './seller/SectionB';
import SectionC from './seller/SectionC';
import SectionD from './seller/SectionD';
import SectionE from './seller/SectionE';
import SectionF from './seller/SectionF';

function statusBadge(s) {
  const map    = { submitted:'badge-green', in_progress:'badge-orange', not_started:'badge-gray', flagged:'badge-red', approved:'badge-teal' };
  const labels = { submitted:'Submitted', in_progress:'In Progress', not_started:'Not Started', flagged:'Flagged', approved:'Approved' };
  return <span className={`badge ${map[s]||'badge-gray'}`}>{labels[s]||s}</span>;
}

const SECTIONS = [
  { key:'a', label:'Studio Details',     path:'studio',      icon:'', desc:'Name, location, contacts, portfolio, USPs' },
  { key:'b', label:'Products & Fabrics', path:'products',    icon:'', desc:'21 garment types, 40+ fabrics, brands, awards' },
  { key:'c', label:'Crafts',             path:'crafts',      icon:'', desc:'Specializations, timelines, innovation scoring' },
  { key:'d', label:'Collaboration',      path:'collab',      icon:'', desc:'Designer, sampling rounds, buyer requirements' },
  { key:'e', label:'Production Scale',   path:'production',  icon:'', desc:'Monthly capacity, MOQ conditions' },
  { key:'f', label:'Process',            path:'process',     icon:'', desc:'Production steps, behind-the-scenes media' },
];

/* ── OVERVIEW ── */
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

/* ── SELLER INQUIRIES ── */
function SellerInquiries({ profileId }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');

  useEffect(() => {
    if (!profileId) return;
    onboardingAPI.getStudioInquiries(profileId)
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [profileId]);

  if (loading) return <Spinner full />;
  if (!data)   return <div style={{ padding: 40, color: 'var(--red)' }}>Failed to load inquiries.</div>;

  const filtered = data.inquiries.filter(inq => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      inq.name.toLowerCase().includes(q)  ||
      inq.email.toLowerCase().includes(q) ||
      inq.answers?.some(a => a.answer?.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ padding: 'clamp(20px, 3vw, 40px) clamp(16px, 4vw, 48px)' }}>
      <div className="fade-up" style={{ marginBottom: 36 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 42, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
          Buyer <em style={{ color: 'var(--gold)' }}>Inquiries</em>
        </h1>
        <p style={{ color: 'var(--text3)', fontSize: 15 }}>
          Buyers who clicked "Get a Callback" on your studio profile.
        </p>
      </div>

      <div className="card fade-up">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--gold)' }}>
            {data.count} Inquir{data.count !== 1 ? 'ies' : 'y'}
          </div>
          <input
            placeholder="Search name, email, answers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '8px 14px', fontSize: 13,
              color: 'var(--text)', width: 260, fontFamily: 'var(--font-body)',
            }}
          />
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
            <div style={{ fontSize: 14, color: 'var(--text3)', marginBottom: 6 }}>No inquiries yet.</div>
            <div style={{ fontSize: 12, color: 'var(--text4)' }}>
              When buyers click "Get a Callback" on your profile, they'll appear here.
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 14 }}>
            {filtered.map(inq => (
              <div key={inq.id} style={{
                padding: '20px 24px', background: 'var(--surface2)',
                borderRadius: 10, border: '1px solid var(--border)',
                borderLeft: '3px solid var(--gold)',
              }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 3 }}>{inq.name}</div>
                    <a
                      href={`mailto:${inq.email}`}
                      style={{ fontSize: 13, color: 'var(--teal)', textDecoration: 'none' }}
                    >
                      {inq.email}
                    </a>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text4)', textAlign: 'right' }}>
                    {new Date(inq.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    <br />
                    <span style={{ fontSize: 11 }}>
                      {new Date(inq.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Pre-call Q&A answers */}
                {inq.answers?.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                    {inq.answers.map((a, i) => (
                      <div key={i}>
                        <div style={{
                          fontSize: 10, fontWeight: 700, color: 'var(--text4)',
                          textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3,
                        }}>
                          {a.question}
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.65 }}>
                          {a.answer || <em style={{ color: 'var(--text4)' }}>No answer</em>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: 'var(--text4)', fontStyle: 'italic', marginBottom: 14 }}>
                    No pre-call questions answered.
                  </div>
                )}

                {/* Attachment */}
                {inq.attachment_url && (
                  <div style={{ marginBottom: 14 }}>
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

                {/* Buyer brief tags */}
                {inq.buyer && (
                  <div style={{ paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 10, color: 'var(--text4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                      Their discovery brief
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {(inq.buyer.product_types || []).map(p => (
                        <span key={p} style={{ fontSize: 11, color: 'var(--text3)', background: 'var(--surface)', padding: '2px 8px', borderRadius: 6 }}>
                          {p.replace(/_/g, ' ')}
                        </span>
                      ))}
                      {(inq.buyer.crafts || []).map(c => (
                        <span key={c} style={{ fontSize: 11, color: 'var(--gold)', background: 'var(--gold-dim)', padding: '2px 8px', borderRadius: 6 }}>
                          {c}
                        </span>
                      ))}
                      {inq.buyer.timeline && (
                        <span style={{ fontSize: 11, color: 'var(--teal)', background: 'var(--teal-dim)', padding: '2px 8px', borderRadius: 6 }}>
                          {inq.buyer.timeline.replace(/_/g, ' ')}
                        </span>
                      )}
                      {inq.buyer.batch_size && (
                        <span style={{ fontSize: 11, color: 'var(--text3)', background: 'var(--surface)', padding: '2px 8px', borderRadius: 6 }}>
                          {inq.buyer.batch_size.replace(/_/g, ' ')} pcs
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── MAIN EXPORT ── */
export default function SellerDashboard() {
  const { user } = useAuth();
  const [snapshot, setSnapshot] = useState(null);
  const [flags, setFlags]       = useState(null);
  const profileId = user?.profiles?.[0]?.id;

  const refresh = () => {
    if (!profileId) return;
    onboardingAPI.snapshot(profileId).then(r => setSnapshot(r.data)).catch(() => {});
    onboardingAPI.flags(profileId).then(r => setFlags(r.data)).catch(() => {});
  };

  useEffect(refresh, [profileId]);

  const status = snapshot?.status;
  const navItems = [
    { to:'/dashboard',             icon:'', label:'Overview',     end: true                                                                              },
    { to:'/dashboard/studio',      icon:'', label:'A — Studio',     badge: status?.section_a_status === 'flagged' ? { type:'red', text:'!' } : null },
    { to:'/dashboard/products',    icon:'', label:'B — Products',   badge: status?.section_b_status === 'flagged' ? { type:'red', text:'!' } : null },
    { to:'/dashboard/crafts',      icon:'', label:'C — Crafts',     badge: status?.section_c_status === 'flagged' ? { type:'red', text:'!' } : null },
    { to:'/dashboard/collab',      icon:'', label:'D — Collab',     badge: status?.section_d_status === 'flagged' ? { type:'red', text:'!' } : null },
    { to:'/dashboard/production',  icon:'', label:'E — Production', badge: status?.section_e_status === 'flagged' ? { type:'red', text:'!' } : null },
    { to:'/dashboard/process',     icon:'', label:'F — Process',    badge: status?.section_f_status === 'flagged' ? { type:'red', text:'!' } : null },
    { to:'/dashboard/inquiries',   icon:'', label:'Inquiries'                                                                                      },
  ].filter(n => n.badge !== null || true).map(n => ({ ...n, badge: n.badge || undefined }));

  return (
    <DashLayout nav={navItems}>
      <Routes>
        <Route index             element={<Overview snapshot={snapshot} flags={flags} />}  />
        <Route path="studio"     element={<SectionA profileId={profileId} onSave={refresh} />} />
        <Route path="products"   element={<SectionB profileId={profileId} onSave={refresh} />} />
        <Route path="crafts"     element={<SectionC profileId={profileId} onSave={refresh} />} />
        <Route path="collab"     element={<SectionD profileId={profileId} onSave={refresh} />} />
        <Route path="production" element={<SectionE profileId={profileId} onSave={refresh} />} />
        <Route path="process"    element={<SectionF profileId={profileId} onSave={refresh} />} />
        <Route path="inquiries"  element={<SellerInquiries profileId={profileId} />}           />
      </Routes>
    </DashLayout>
  );
}
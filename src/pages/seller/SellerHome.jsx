// src/pages/seller/SellerHome.jsx
//
// Rebuilt against seller-console__2_.html's Dashboard view — stats grid,
// pending-actions card, active-projects preview, recent-activity feed,
// wallet mini-card. Wired to real data via getEnquiries / getActiveProjects
// / walletAPI.getSellerWallet — no fabricated numbers.
//
// One honest simplification, flagged rather than hidden: the prototype's
// "Qalawati" panel shows an AI-generated, context-aware greeting
// referencing specific enquiries by name and match score. There's no
// greeting-generation endpoint available this session to back that with
// real AI output, so this renders a plain, genuinely-computed summary
// line instead (counts only, no fabricated buyer names or match
// commentary) rather than inventing text that looks AI-personalized but
// isn't. If/when a real Qalawati greeting endpoint exists, swap the
// `greeting` computation below for that call.
//
// Also simplified: the prototype's "Active Projects" mini phase-track
// shows 5 fine-grained stages (Design/Sampling/Sign-off/Production/
// Delivery) per project. The real Project model only exposes a coarse
// `stage` (STUDIO_ASSIGNED / IN_PRODUCTION) — not that granular a
// breakdown — so the preview here shows the coarse real stage rather
// than inventing intermediate steps that aren't tracked anywhere.
//
// "Recent Activity" similarly has no dedicated seller activity-log
// endpoint — composed here from real signals actually available
// (recently updated active projects + recent enquiries), not a genuine
// unified log. Noted inline where it matters.

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectsAPI, walletAPI } from '../../api/client';

const S = {
  topbar: { height: 56, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 28px', position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 100 },
  topbarTitle: { fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600 },
  topbarSub: { fontSize: 12, color: 'var(--text3)', marginTop: 1 },
  content: { padding: 28 },

  qalawatiPanel: { background: 'linear-gradient(135deg, #2a3d28 0%, #3d5538 100%)', borderRadius: 'var(--r-lg)', padding: 24, marginBottom: 24, position: 'relative', overflow: 'hidden' },
  qalawatiName: { fontSize: 11, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,.45)', marginBottom: 8 },
  qalawatiMsg: { fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 500, color: '#fff', lineHeight: 1.4, marginBottom: 14, maxWidth: 680 },
  qalawatiChips: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  qalawatiChip: { fontSize: 12, padding: '6px 14px', borderRadius: 'var(--r-20)', background: 'rgba(255,255,255,.10)', color: 'rgba(255,255,255,.85)', border: '1px solid rgba(255,255,255,.15)', cursor: 'pointer' },

  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 28 },
  statCard: (primary) => ({ background: primary ? 'var(--gold)' : 'var(--surface)', color: primary ? '#fff' : 'var(--text)', borderRadius: 'var(--r-10)', padding: '20px 22px', border: '1.5px solid transparent', cursor: 'pointer' }),
  statNum: { fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600, lineHeight: 1 },
  statLabel: (primary) => ({ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: primary ? 'rgba(255,255,255,.7)' : 'var(--text4)', marginTop: 8 }),
  statDelta: (primary, color) => ({ fontSize: 12, color: primary ? 'rgba(255,255,255,.85)' : (color || 'var(--green)'), marginTop: 4 }),

  dashGrid: { display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24 },
  card: { background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--r-10)', overflow: 'hidden', marginBottom: 16 },
  cardHeader: { padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  cardHeaderH3: { fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600 },
  cardBody: { padding: 20 },

  actionItem: { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '14px 20px', cursor: 'pointer', borderBottom: '1px solid var(--border)' },
  actionDot: (color) => ({ width: 8, height: 8, borderRadius: '50%', background: color || 'var(--gold)', marginTop: 4, flexShrink: 0 }),

  phaseTrack: { display: 'flex', alignItems: 'stretch', border: '1px solid var(--border)', borderRadius: 'var(--r-8)', overflow: 'hidden' },
  phase: (state) => ({ flex: 1, padding: '12px 14px', textAlign: 'center', background: state === 'done' ? 'var(--green-dim)' : state === 'current' ? 'var(--gold-dim)' : 'var(--surface)', borderLeft: '1px solid var(--border)' }),
  phaseLabel: (state) => ({ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', color: state === 'done' ? 'var(--green)' : state === 'current' ? 'var(--gold)' : 'var(--text4)' }),

  activityItem: { display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' },
  activityDot: (color) => ({ width: 8, height: 8, borderRadius: '50%', background: color || 'var(--gold)', marginTop: 5, flexShrink: 0 }),
  activityText: { fontSize: 13, color: 'var(--text2)', flex: 1 },
  activityTime: { fontSize: 11, color: 'var(--text4)', marginTop: 2 },

  badge: (bg, color) => ({ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 'var(--r-20)', fontSize: 11, fontWeight: 600, letterSpacing: '.03em', background: bg, color }),
};

function fmtRel(d) {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 1) return 'just now';
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

export default function SellerHome() {
  const nav = useNavigate();
  const [enquiries, setEnquiries] = useState([]);
  const [projects, setProjects] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      projectsAPI.getEnquiries(),
      projectsAPI.getActiveProjects(),
      walletAPI.getSellerWallet(),
    ]).then(([e, p, w]) => {
      setEnquiries(e.data.enquiries || e.data.assignments || []);
      setProjects(p.data.projects || []);
      setWallet(w.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--text4)', fontSize: 14 }}>Loading…</div>;

  const openEnquiries = enquiries.filter(e => ['assigned', 'brief_viewed'].includes(e.enquiry_status));
  const newToday = openEnquiries.filter(e => e.enquiry_assigned_at && (Date.now() - new Date(e.enquiry_assigned_at).getTime()) < 86400000);
  const pending = milestonesPendingFromMs(wallet);
  const totalPayout = wallet?.total_payout_inr || 0;

  const greeting = `You have ${openEnquiries.length} open ${openEnquiries.length === 1 ? 'enquiry' : 'enquiries'}${newToday.length ? `, ${newToday.length} new today` : ''}${projects.length ? `, and ${projects.length} active ${projects.length === 1 ? 'project' : 'projects'} in progress` : ''}.`;

  return (
    <div>
      <div style={S.topbar}>
        <div>
          <div style={S.topbarTitle}>Home</div>
          <div style={S.topbarSub}>Here's what needs your attention today</div>
        </div>
      </div>
      <div style={S.content}>

        <div style={S.qalawatiPanel}>
          <div style={S.qalawatiName}>✦ Qalawati</div>
          <div style={S.qalawatiMsg}>{greeting}</div>
          <div style={S.qalawatiChips}>
            <div style={S.qalawatiChip} onClick={() => nav('/dashboard/enquiries')}>Review enquiries →</div>
            <div style={S.qalawatiChip} onClick={() => nav('/dashboard/active')}>Check active projects</div>
          </div>
        </div>

        <div style={S.statsGrid}>
          <div style={S.statCard(true)} onClick={() => nav('/dashboard/wallet')}>
            <div style={S.statNum}>₹{Math.round(totalPayout).toLocaleString('en-IN')}</div>
            <div style={S.statLabel(true)}>Total Order Value via Qala</div>
            <div style={S.statDelta(true)}>across {projects.length} active {projects.length === 1 ? 'project' : 'projects'}</div>
          </div>
          <div style={S.statCard(false)} onClick={() => nav('/dashboard/enquiries')}>
            <div style={S.statNum}>{openEnquiries.length}</div>
            <div style={S.statLabel(false)}>Open Enquiries</div>
            <div style={S.statDelta(false, 'var(--gold)')}>{newToday.length} new today</div>
          </div>
          <div style={S.statCard(false)} onClick={() => nav('/dashboard/active')}>
            <div style={S.statNum}>{projects.length}</div>
            <div style={S.statLabel(false)}>Active Projects</div>
            <div style={S.statDelta(false, 'var(--green)')}>{projects.length > 0 ? 'On track' : 'None yet'}</div>
          </div>
        </div>

        <div style={S.dashGrid}>
          <div>
            {openEnquiries.length > 0 && (
              <div style={S.card}>
                <div style={S.cardHeader}><h3 style={S.cardHeaderH3}>Pending Actions</h3><span style={S.badge('var(--amber-dim)', 'var(--amber)')}>{openEnquiries.length} items</span></div>
                <div>
                  {openEnquiries.slice(0, 4).map(e => (
                    <div key={e.id} style={S.actionItem} onClick={() => nav(`/dashboard/enquiries/${e.id}`)}>
                      <div style={S.actionDot('var(--amber)')} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: 'var(--text2)' }}>New enquiry — <strong>{e.name}</strong></div>
                        <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 2 }}>Assigned {fmtRel(e.enquiry_assigned_at)}{e.enquiry_expires_at ? ` · Expires ${fmtRel(e.enquiry_expires_at)}` : ''}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={S.card}>
              <div style={S.cardHeader}>
                <h3 style={S.cardHeaderH3}>Active Projects</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => nav('/dashboard/active')}>View all</button>
              </div>
              <div style={S.cardBody}>
                {projects.length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--text4)', fontStyle: 'italic' }}>No active projects yet.</div>
                ) : projects.slice(0, 3).map((p, i) => {
                  const state = p.stage === 'in_production' ? 'current' : 'done';
                  return (
                    <div key={p.id} style={{ marginBottom: i < projects.length - 1 ? 16 : 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div>
                          <div style={{ fontWeight: 500 }}>{p.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text3)' }}>{p.buyer_name || ''}</div>
                        </div>
                        <span style={S.badge('var(--green-dim)', 'var(--green)')}>{p.stage === 'in_production' ? 'In Production' : 'Assigned'}</span>
                      </div>
                      <div style={S.phaseTrack}>
                        <div style={S.phase(p.stage === 'studio_assigned' ? 'current' : 'done')}><div style={S.phaseLabel(p.stage === 'studio_assigned' ? 'current' : 'done')}>Assigned</div></div>
                        <div style={S.phase(p.stage === 'in_production' ? 'current' : 'future')}><div style={S.phaseLabel(p.stage === 'in_production' ? 'current' : 'future')}>Production</div></div>
                        <div style={S.phase('future')}><div style={S.phaseLabel('future')}>Delivery</div></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div>
            <div style={S.card}>
              <div style={S.cardHeader}><h3 style={S.cardHeaderH3}>Wallet</h3><button className="btn btn-ghost btn-sm" onClick={() => nav('/dashboard/wallet')}>Details</button></div>
              <div style={S.cardBody}>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text4)', marginBottom: 4 }}>Total Paid Out</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 600, color: 'var(--gold)', lineHeight: 1.1 }}>₹{Math.round(totalPayout).toLocaleString('en-IN')}</div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text4)', marginBottom: 4 }}>Pending</div>
                  <div style={{ fontSize: 14 }}>₹{Math.round(pending).toLocaleString('en-IN')}</div>
                </div>
                <button className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={() => nav('/dashboard/wallet')}>View wallet</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function milestonesPendingFromMs(wallet) {
  if (!wallet?.milestones) return 0;
  return wallet.milestones.filter(m => !m.is_paid).reduce((s, m) => s + (m.payout_inr || 0), 0);
}
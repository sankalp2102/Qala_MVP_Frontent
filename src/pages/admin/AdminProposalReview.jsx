// src/pages/admin/AdminProposalReview.jsx
//
// Rebuilt directly against qala-admin-proposal.html — new self-contained
// page rather than folded into the existing AdminProjectDetail.jsx, since
// that file already handles many other things (overview, enquiries,
// orders) and this prototype is specifically the proposal-review screen
// on its own. Route it at /admin/projects/:projectId/proposals/:proposalId
// (see the placement guide for the App.jsx patch) — it can sit alongside
// the existing AdminProjectDetail tabs or replace them; that call is
// flagged in the guide as needing your decision, same as before.
//
// Same navbar/brief-strip/status-banner/always-visible Buyer's Brief card
// /5-tab Studio Submission card (Concept, Past work, Costing, Timelines,
// SOW) / Admin notes / side panel (Landing cost, Platform fee sliders,
// Studio payout, Payment schedule, Actions, Buyer responses) as the
// prototype. Uses the app's shared design tokens directly (var(--gold),
// var(--admin) etc.) since — unlike buyer-proposal-view.html — this
// prototype's :root block uses the SAME hex values as the app's index.css
// (confirmed by diff), so there's no palette-drift risk here.
//
// Real cost figures come from calcLandingCost() (utils/calculator.js),
// called with pfPctByPhase from platform_fee_design_pct /
// platform_fee_sampling_pct / platform_fee_production_pct — the same
// three fields the sliders edit — so the side panel is never out of sync
// with what the sliders show.

import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectsAPI } from '../../api/client';
import { calcLandingCost, sanitizeForex, fmtUSD, fmtINR } from '../../utils/calculator';
import LineItemCards from '../../components/proposals/LineItemCards';

const PHASE_COLOR = { designing: 'var(--ph-d, var(--gold))', design: 'var(--ph-d, var(--gold))', sampling: 'var(--ph-s, #C4953A)', production: 'var(--ph-p, var(--admin))' };
const PHASE_LABEL = { designing: 'Design', design: 'Design', sampling: 'Sampling', production: 'Production' };
// Milestone.phase in the DB uses 'design' (MilestonePhase enum), NOT
// 'designing' — that's the convention line_items/calcLandingCost use.
// These are genuinely two different conventions already in the codebase
// (line_items are an unconstrained JSONField; Milestone.phase is a real
// DB choices field). Mapping between them here rather than picking one
// everywhere, since changing LineItemCards' convention would touch the
// seller-side builder too.
const MS_PHASE = { designing: 'design', sampling: 'sampling', production: 'production' };
const TRIGGER_OPTIONS = {
  designing: ['Design start', 'Design approved', 'Design handover', 'Custom'],
  sampling: ['Sampling start', 'Samples approved', 'Samples delivered', 'Custom'],
  production: ['Production start', 'Ready for dispatch', 'Delivered', 'Custom'],
};

function usd(n) { return fmtUSD ? fmtUSD(n) : `$${Math.round(n || 0).toLocaleString()}`; }
function inr(n) { return fmtINR ? fmtINR(n) : `₹${Math.round(n || 0).toLocaleString('en-IN')}`; }

// ── Styles — app's shared tokens ──
const S = {
  navbar: { position: 'sticky', top: 0, zIndex: 300, background: 'var(--admin)', height: 52, display: 'flex', alignItems: 'center', padding: '0 24px', gap: 12 },
  navCrumb: { fontSize: 12, color: 'rgba(255,255,255,.55)', display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' },
  navLogo: { fontFamily: 'var(--font-display)', fontSize: 21, fontWeight: 600, color: '#fff', margin: '0 auto' },
  navRef: { fontSize: 11, color: 'rgba(255,255,255,.6)', border: '1px solid rgba(255,255,255,.2)', borderRadius: 5, padding: '2px 9px', fontFamily: 'monospace', letterSpacing: '.04em' },
  adminBadge: { fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', background: 'rgba(255,255,255,.14)', border: '1px solid rgba(255,255,255,.18)', color: '#fff', padding: '3px 10px', borderRadius: 100 },

  briefStrip: { background: 'var(--admin)', borderTop: '1px solid rgba(255,255,255,.08)', padding: '9px 24px 11px', display: 'flex', alignItems: 'flex-start', gap: 28, flexWrap: 'wrap' },
  bsLbl: { fontSize: 10, fontWeight: 600, letterSpacing: '.10em', textTransform: 'uppercase', color: 'rgba(255,255,255,.40)', marginBottom: 1 },
  bsVal: { fontSize: 13, fontWeight: 500, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 230 },

  page: { maxWidth: 1420, margin: '0 auto', padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr 364px', gap: 18, alignItems: 'start' },
  mainCol: { display: 'flex', flexDirection: 'column', gap: 14 },
  sideCol: { position: 'sticky', top: 108, display: 'flex', flexDirection: 'column', gap: 12 },

  card: { background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' },
  cardHeader: { padding: '13px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  cardTitle: { fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--text)' },
  cardBody: { padding: '16px 18px' },

  statusBanner: (variant) => ({ display: 'flex', alignItems: 'center', gap: 12, borderRadius: 10, padding: '12px 15px', ...(variant === 'approved' ? { background: '#EAF5F0', border: '1px solid #A8D5BE' } : variant === 'revision' ? { background: '#FDF5E8', border: '1px solid #E8C87A' } : { background: 'var(--admin-dim)', border: '1px solid var(--admin-dim2)' }) }),
  sbDot: (variant) => ({ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: variant === 'approved' ? '#2A8C5F' : variant === 'revision' ? '#C4953A' : 'var(--admin)' }),
  sbTitle: (variant) => ({ fontSize: 13, fontWeight: 600, color: variant === 'approved' ? '#1E7A51' : variant === 'revision' ? '#9A7020' : 'var(--admin)' }),

  chip: (bg, color) => ({ fontSize: 10, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 100, whiteSpace: 'nowrap', background: bg, color }),

  briefGrid: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 12 },
  briefCell: { background: 'var(--surface)', borderRadius: 8, padding: '9px 11px' },
  bcLbl: { fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text4)', marginBottom: 2 },
  bcVal: { fontSize: 13, color: 'var(--text)', fontWeight: 400 },
  bcValPrice: { fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 700, lineHeight: 1.1 },
  briefSection: { marginBottom: 13, paddingBottom: 13, borderBottom: '1px solid var(--border)' },
  briefSecLbl: { fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.10em', color: 'var(--text4)', marginBottom: 6, display: 'block' },
  briefTag: { display: 'inline-block', background: 'var(--gold-dim)', border: '1px solid var(--gold-dim2)', color: 'var(--gold-d)', fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 100, margin: '2px 2px 0 0' },
  briefNote: { fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 },
  qalaBox: { background: 'var(--admin-dim)', border: '1px solid var(--admin-dim2)', borderRadius: 8, padding: '10px 13px' },
  qgLbl: { fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--admin)', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 5 },
  refFile: { display: 'flex', alignItems: 'center', gap: 9, background: 'var(--surface)', borderRadius: 6, padding: '7px 10px', marginBottom: 5 },

  stabs: { display: 'flex', border: '1px solid var(--border)', borderRadius: 7, overflow: 'hidden', background: 'var(--surface)', marginBottom: 16 },
  stab: (on) => ({ flex: 1, padding: '7px 5px', fontSize: 12, fontWeight: on ? 600 : 400, color: on ? 'var(--text)' : 'var(--text3)', background: on ? 'var(--bg)' : 'transparent', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', textAlign: 'center', boxShadow: on ? '0 0 0 1px var(--border)' : 'none' }),

  infoBox: { display: 'flex', gap: 9, background: 'var(--admin-dim)', border: '1px solid var(--admin-dim2)', borderRadius: 8, padding: '9px 12px', fontSize: 12, color: 'var(--admin)', lineHeight: 1.6, marginBottom: 14 },

  phaseAc: { border: '1.5px solid #E8E4DF', borderRadius: 9, overflow: 'hidden', marginBottom: 10, background: '#fff' },
  phaseAcHd: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 15px', cursor: 'pointer', userSelect: 'none' },
  phaseAcBody: { padding: '13px 15px 15px', borderTop: '1px solid #F0EDE8', background: '#FDFCFA' },
  phDot: (bg) => ({ width: 9, height: 9, borderRadius: '50%', flexShrink: 0, background: bg }),

  table: { width: '100%', borderCollapse: 'collapse' },
  th: { fontSize: 10, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--text4)', padding: '4px 3px', borderBottom: '1px solid var(--border)', textAlign: 'left', whiteSpace: 'nowrap' },
  td: { padding: '4px 3px', borderBottom: '1px solid var(--border)', verticalAlign: 'middle' },
  tblInput: { padding: '4px 6px', fontSize: 12, borderRadius: 5, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none', width: '100%', boxSizing: 'border-box' },
  addRowBtn: { display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 9, padding: '5px 13px', fontSize: 12, fontWeight: 500, color: 'var(--admin)', background: 'var(--admin-dim)', border: '1px solid var(--admin-dim2)', borderRadius: 20, cursor: 'pointer' },
  phFootnote: { fontSize: 10, color: 'var(--text4)', fontStyle: 'italic', marginTop: 9, paddingTop: 9, borderTop: '1px dashed #EBE8E4' },

  frow2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 },
  fg: { marginBottom: 10 },
  fl2: { fontSize: 12, fontWeight: 500, color: 'var(--text2)', display: 'block', marginBottom: 4 },
  input: { width: '100%', background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 7, fontSize: 13, color: 'var(--text)', padding: '7px 10px', outline: 'none', boxSizing: 'border-box' },
  tlBlock: { background: 'var(--surface)', borderRadius: 8, padding: '11px 13px', marginBottom: 8 },
  tlPhLbl: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 },
  tlRow: { display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 },

  clause: { display: 'flex', alignItems: 'flex-start', gap: 8, background: 'var(--surface)', borderRadius: 7, padding: '8px 10px', marginBottom: 5, fontSize: 13, color: 'var(--text)' },
  cdel: { background: 'none', border: 'none', color: 'var(--text4)', cursor: 'pointer', fontSize: 14, padding: '0 2px' },

  resultCard: { background: 'var(--bg)', border: '1px solid var(--border2)', borderLeft: '4px solid var(--terra, #C97A52)', borderRadius: 9, padding: '12px 14px', marginBottom: 10 },
  rcLbl: { fontSize: 10, fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase', color: 'var(--text4)', marginBottom: 2 },
  rcVal: { fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--terra, #C97A52)', lineHeight: 1.2 },
  buRow: (sub, tot) => ({ display: 'flex', justifyContent: 'space-between', padding: sub ? '3px 0 3px 12px' : tot ? '8px 0 0' : '4px 0', borderBottom: tot ? 'none' : sub ? '1px dashed var(--border)' : '1px solid var(--border)', borderTop: tot ? '2px solid var(--border2)' : 'none', fontSize: sub ? 11 : tot ? 13 : 12, fontWeight: tot ? 600 : 400 }),

  pfRow: { display: 'flex', alignItems: 'center', gap: 9, padding: '7px 0', borderBottom: '1px solid var(--border)' },
  pfName: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, minWidth: 84 },
  pfNum: { width: 58, fontSize: 13, fontWeight: 600, textAlign: 'center', border: '1px solid var(--border2)', borderRadius: 5, padding: '3px 5px', background: 'var(--bg)', color: 'var(--text)', outline: 'none' },

  poutTotalBlock: { background: 'var(--terra-dim, rgba(201,122,82,.09))', border: '1px solid rgba(201,122,82,.18)', borderRadius: 8, padding: '10px 13px', marginBottom: 8 },
  poutBig: { fontFamily: 'var(--font-display)', fontSize: 23, fontWeight: 600, color: 'var(--terra, #C97A52)' },
  poutPhRow: { display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border)', fontSize: 12 },

  msRow: { display: 'grid', gridTemplateColumns: '1fr 54px auto', alignItems: 'center', gap: 7 },
  msSelect: { width: '100%', fontSize: 11, border: '1px solid var(--border)', borderRadius: 5, padding: '5px 7px', background: 'var(--bg)', color: 'var(--text)', outline: 'none' },
  msPct: { width: 54, fontSize: 13, fontWeight: 600, textAlign: 'center', border: '1px solid var(--border2)', borderRadius: 5, padding: '4px 5px', background: 'var(--bg)', color: 'var(--text)', outline: 'none' },

  btn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '9px 16px', borderRadius: 7, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none', width: '100%' },
  btnApprove: { background: 'var(--green, #2E9E62)', color: '#fff' },
  btnSave: { background: 'var(--admin)', color: '#fff' },
  btnGhost: { background: 'transparent', border: '1.5px solid var(--border2)', color: 'var(--text2)' },

  baItem: { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--border)' },
  baIcon: (bg, color) => ({ width: 32, height: 32, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0, marginTop: 1, background: bg, color }),
};

function fmtDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
function toInputDate(d) { return d ? d.slice(0, 10) : ''; }

const ITEM_COLS = {
  designing: ['name', 'category', 'cost_per_pc_inr', 'gst_rate'],
  sampling: ['name', 'product_domain', 'category', 'gender', 'material', 'technique', 'qty', 'cost_per_pc_inr', 'gst_rate', 'weight_per_pc'],
  production: ['name', 'product_domain', 'category', 'gender', 'material', 'technique', 'qty', 'cost_per_pc_inr', 'gst_rate', 'weight_per_pc', 'declared_value_usd'],
};
const COL_LABEL = {
  name: 'Item / description', category: 'Category', cost_per_pc_inr: 'Fee (₹)', gst_rate: 'GST',
  product_domain: 'Domain', gender: 'Gender', material: 'Material', technique: 'Technique',
  qty: 'Qty', weight_per_pc: 'Wt/pc (kg)', declared_value_usd: 'Decl. val ($)',
};

export default function AdminProposalReview() {
  const { projectId, proposalId } = useParams();
  const nav = useNavigate();

  const [project, setProject] = useState(null);
  const [proposal, setProposal] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('concept');
  const [openPwColl, setOpenPwColl] = useState({ 0: true });
  const [openPhase, setOpenPhase] = useState({ designing: true });
  const [currency, setCurrency] = useState('usd');
  const cv = (usdVal) => `${usd(usdVal)} / ${inr((usdVal || 0) * forex)}`;
  const [newClause, setNewClause] = useState('');
  const [showRevision, setShowRevision] = useState(false);
  const [revisionNote, setRevisionNote] = useState('');

  const load = () => {
    Promise.all([
      projectsAPI.adminGetProject(projectId),
      projectsAPI.adminGetProposals(projectId),
      projectsAPI.adminGetMilestones(projectId, proposalId),
    ]).then(([p, props, ms]) => {
      setProject(p.data.project);
      const found = (props.data.proposals || []).find(x => x.id === proposalId) || props.data.proposals?.[0];
      setProposal(found);
      setMilestones(ms.data.milestones || []);
    }).finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [projectId, proposalId]);

  useEffect(() => {
    const poll = () => projectsAPI.adminGetProposalActivity(projectId, proposalId).then(r => setActivity(r.data.activities || [])).catch(() => {});
    poll();
    const id = setInterval(poll, 4000);
    return () => clearInterval(id);
  }, [projectId, proposalId]);

  const patch = (data) => setProposal(p => ({ ...p, ...data }));
  const save = async (extra = {}) => {
    setSaving(true);
    try {
      const payload = { ...extra };
      await projectsAPI.adminUpdateProposal(projectId, proposalId, payload);
    } finally { setSaving(false); }
  };

  const forex = sanitizeForex(proposal?.forex_rate_usd_inr);
  const pfPctByPhase = proposal ? {
    designing: parseFloat(proposal.platform_fee_design_pct) || 0.04,
    sampling: parseFloat(proposal.platform_fee_sampling_pct) || 0.10,
    production: parseFloat(proposal.platform_fee_production_pct) || 0.15,
  } : null;
  const calc = useMemo(() => {
    if (!proposal) return null;
    return calcLandingCost({
      lineItems: proposal.line_items || [],
      boxes: proposal.boxes || [],
      forex,
      pfPctByPhase,
      shipping: proposal.shipping_method || 'dhl',
    });
  }, [proposal, forex]);

  if (loading || !proposal) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--text4)', fontSize: 14 }}>Loading…</div>;

  const brief = project?.brief || {};
  const items = proposal.line_items || [];

  const setPfPhase = (phase, val) => {
    const field = { designing: 'platform_fee_design_pct', sampling: 'platform_fee_sampling_pct', production: 'platform_fee_production_pct' }[phase];
    patch({ [field]: (parseFloat(val) || 0) / 100 });
  };

  const addMilestone = async (phase) => {
    const r = await projectsAPI.adminCreateMilestone(projectId, proposalId, { phase: MS_PHASE[phase], trigger_label: TRIGGER_OPTIONS[phase][0], percentage: 0 });
    setMilestones(ms => [...ms, r.data.milestone]);
  };
  const updateMilestone = async (mid, data) => {
    setMilestones(ms => ms.map(m => m.id === mid ? { ...m, ...data } : m));
    await projectsAPI.adminUpdateMilestone(projectId, proposalId, mid, data);
  };
  const deleteMilestone = async (mid) => {
    setMilestones(ms => ms.filter(m => m.id !== mid));
    await projectsAPI.adminDeleteMilestone(projectId, proposalId, mid);
  };

  const doApprove = async () => {
    await save({
      platform_fee_design_pct: proposal.platform_fee_design_pct, platform_fee_sampling_pct: proposal.platform_fee_sampling_pct,
      platform_fee_production_pct: proposal.platform_fee_production_pct, line_items: proposal.line_items,
      valid_until: proposal.valid_until, concept_title: proposal.concept_title, concept_description: proposal.concept_description,
      sow_clauses: proposal.sow_clauses, phase_notes: proposal.phase_notes, admin_notes: proposal.admin_notes,
    });
    await projectsAPI.adminSendProposal(projectId, proposalId);
    load();
  };
  const doRequestRevision = async () => {
    await projectsAPI.adminRequestRevision(projectId, proposalId, { notes: revisionNote });
    setShowRevision(false);
    load();
  };

  const statusVariant = proposal.status === 'sent_to_buyer' || proposal.status === 'accepted' ? 'approved' : proposal.status === 'revision_req' ? 'revision' : 'default';
  const statusText = {
    under_review: ['Proposal under review', 'Studio submitted · Awaiting Qala admin review before sending to buyer'],
    submitted: ['Proposal submitted', 'Awaiting Qala admin review before sending to buyer'],
    sent_to_buyer: ['Sent to buyer', `Sent — awaiting buyer decision`],
    accepted: ['Accepted by buyer', 'Buyer has accepted — awaiting first payment'],
    declined: ['Declined by buyer', 'Buyer declined the proposal'],
    revision_req: ['Revision requested', 'Sent back to studio for changes'],
  }[proposal.status] || [proposal.status, ''];

  const ACT_ICON = { accepted: ['✓', '#EAF5F0', '#1E7A51'], declined: ['✕', 'var(--red-dim)', 'var(--red)'], question: ['?', 'var(--amber-dim)', 'var(--amber)'], changes_requested: ['✎', 'var(--admin-dim)', 'var(--admin)'] };
  const ACT_TITLE = { accepted: 'Proposal accepted', declined: 'Proposal declined', question: 'Buyer asked a question', changes_requested: 'Buyer requested changes' };

  return (
    <div style={{ fontFamily: 'var(--font-body)', background: 'var(--surface)', minHeight: '100vh' }}>
      <nav style={S.navbar}>
        <div style={S.navCrumb} onClick={() => nav('/admin/projects')}>Admin <span>›</span> <span onClick={(e) => { e.stopPropagation(); nav(`/admin/projects/${projectId}`); }}>{project?.name}</span></div>
        <span style={S.navLogo}>Qala</span>
        <span style={S.navRef}>{proposalId.slice(0, 8).toUpperCase()}</span>
        <span style={S.adminBadge}>Admin</span>
      </nav>

      <div style={S.briefStrip}>
        <div><div style={S.bsLbl}>Project</div><div style={S.bsVal}>{project?.name}</div></div>
        <div><div style={S.bsLbl}>Buyer</div><div style={S.bsVal}>{brief.buyer_brand_name}{brief.buyer_location ? ` · ${brief.buyer_location}` : ''}</div></div>
        <div><div style={S.bsLbl}>Studio</div><div style={S.bsVal}>{proposal.studio_name}</div></div>
        <div><div style={S.bsLbl}>Target price</div><div style={S.bsVal}>{brief.target_landing_currency} {brief.target_landing_price_local || '—'}</div></div>
        <div><div style={S.bsLbl}>Bulk delivery</div><div style={S.bsVal}>{fmtDate(brief.target_bulk_delivery_date)}</div></div>
      </div>

      <div style={S.page}>
        <div style={S.mainCol}>

          <div style={S.statusBanner(statusVariant)}>
            <div style={S.sbDot(statusVariant)} />
            <div style={{ flex: 1 }}>
              <div style={S.sbTitle(statusVariant)}>{statusText[0]}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{statusText[1]}</div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text4)', whiteSpace: 'nowrap' }}>{proposal.submitted_at ? `Submitted ${fmtDateTime(proposal.submitted_at)}` : ''}</div>
          </div>

          {/* BUYER'S BRIEF — read-only */}
          <div style={S.card}>
            <div style={S.cardHeader}>
              <span style={S.cardTitle}>Buyer's brief</span>
              <span style={S.chip('var(--surface2)', 'var(--text3)')}>Read-only · from project creation</span>
            </div>
            <div style={S.cardBody}>
              <div style={S.briefSection}>
                <div style={S.briefGrid}>
                  <div style={S.briefCell}><div style={S.bcLbl}>Project type</div><div style={S.bcVal}>{brief.project_type || '—'}</div></div>
                  <div style={S.briefCell}><div style={S.bcLbl}>Gender</div><div style={S.bcVal}>{brief.gender || '—'}</div></div>
                  <div style={S.briefCell}><div style={S.bcLbl}>Est. qty</div><div style={S.bcVal}>{brief.bulk_quantity || '—'}</div></div>
                  <div style={S.briefCell}><div style={S.bcLbl}>Target price</div><div style={{ ...S.bcVal, ...S.bcValPrice }}>{brief.target_landing_currency} {brief.target_landing_price_local || '—'}{brief.garment_types?.[0] && <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text3)' }}> / {brief.garment_types[0].toLowerCase()}</span>}</div></div>
                  <div style={S.briefCell}><div style={S.bcLbl}>Bulk delivery</div><div style={S.bcVal}>{fmtDate(brief.target_bulk_delivery_date)}</div></div>
                  <div style={S.briefCell}><div style={S.bcLbl}>Delivery location</div><div style={S.bcVal}>{brief.buyer_location || '—'}</div></div>
                  <div style={{ ...S.briefCell, gridColumn: 'span 2' }}><div style={S.bcLbl}>Price basis</div><div style={S.bcVal}>All-in landed cost{brief.garment_types?.[0] ? ` · per ${brief.garment_types[0].toLowerCase()}` : ''}</div></div>
                </div>
              </div>
              {(brief.occasion_tags || []).length > 0 && (
                <div style={S.briefSection}><span style={S.briefSecLbl}>Occasion</span><div>{brief.occasion_tags.map(t => <span key={t} style={S.briefTag}>{t}</span>)}</div></div>
              )}
              {(brief.garment_types || []).length > 0 && (
                <div style={S.briefSection}><span style={S.briefSecLbl}>Product / garment types</span><div>{brief.garment_types.map(t => <span key={t} style={S.briefTag}>{t}</span>)}</div></div>
              )}
              <div style={S.briefSection}>
                {(brief.preferred_fabrics || []).length > 0 && <><span style={S.briefSecLbl}>Fabrics</span><div style={{ marginBottom: 9 }}>{brief.preferred_fabrics.map(t => <span key={t} style={S.briefTag}>{t}</span>)}</div></>}
                {(brief.printing_required || []).length > 0 && <><span style={S.briefSecLbl}>Printing & dyeing</span><div style={{ marginBottom: 9 }}>{brief.printing_required.map(t => <span key={t} style={S.briefTag}>{t}</span>)}</div></>}
                {(brief.embellishment_required || []).length > 0 && <><span style={S.briefSecLbl}>Surface work</span><div style={{ marginBottom: 9 }}>{brief.embellishment_required.map(t => <span key={t} style={S.briefTag}>{t}</span>)}</div></>}
                {(brief.preferred_dyes || []).length > 0 && <><span style={S.briefSecLbl}>Dyes</span><div>{brief.preferred_dyes.map(t => <span key={t} style={S.briefTag}>{t}</span>)}</div></>}
              </div>
              {(brief.moodboards || []).length > 0 && (
                <div style={S.briefSection}>
                  <span style={S.briefSecLbl}>References</span>
                  {brief.moodboards.map((m, i) => (
                    <div key={i} style={S.refFile}><span style={{ fontSize: 16 }}>🖼</span><span style={{ fontSize: 12, fontWeight: 500, flex: 1 }}>{m.name || m.file_name}</span></div>
                  ))}
                </div>
              )}
              {brief.additional_specs && (
                <div style={S.briefSection}><span style={S.briefSecLbl}>Buyer notes</span><div style={S.briefNote}>{brief.additional_specs}</div></div>
              )}
              {brief.admin_notes && (
                <div style={S.qalaBox}>
                  <div style={S.qgLbl}>🔒 Qala guidance <span style={{ fontSize: 10, fontWeight: 400, color: 'rgba(91,75,138,.6)', textTransform: 'none', letterSpacing: 0 }}>— visible to studio, not shared with buyer</span></div>
                  <div style={{ ...S.briefNote, color: 'var(--admin)' }}>{brief.admin_notes}</div>
                </div>
              )}
            </div>
          </div>

          {/* STUDIO SUBMISSION */}
          <div style={S.card}>
            <div style={S.cardHeader}>
              <span style={S.cardTitle}>Studio submission</span>
              <span style={S.chip(statusVariant === 'approved' ? '#EAF5F0' : statusVariant === 'revision' ? '#FDF5E8' : 'var(--amber-dim)', statusVariant === 'approved' ? '#1E7A51' : statusVariant === 'revision' ? '#9A7020' : 'var(--amber)')}>{statusText[0]}</span>
            </div>
            <div style={S.cardBody}>
              <div style={S.stabs}>
                {[['concept', 'Concept'], ['projects', 'Past work'], ['costing', 'Costing'], ['timelines', 'Timelines'], ['sow', 'SOW']].map(([k, l]) => (
                  <button key={k} style={S.stab(tab === k)} onClick={() => setTab(k)}>{l}</button>
                ))}
              </div>

              {tab === 'costing' && (
                <div>
                  <div style={S.infoBox}><span>🛡</span><span>You can edit any value before sending to buyer — items, costs, GST, shipping. All changes recalculate landing cost in real time. Studio's original figures are preserved internally.</span></div>
                  <LineItemCards
                    items={items}
                    onChange={(next) => patch({ line_items: next })}
                    phaseNotes={proposal.phase_notes || {}}
                    onPhaseNoteChange={(key, val) => patch({ phase_notes: { ...(proposal.phase_notes || {}), [key]: val } })}
                  />
                </div>
              )}

              {tab === 'timelines' && (
                <div>
                  <div style={S.infoBox}><span>ℹ</span><span>Dates committed by the studio. Est. delivery = dispatch + 7 days shipping + 3 days buffer. Edit if corrections needed before sending to buyer.</span></div>
                  {[['designing', 'design_handover_date', 'Design handover date', null], ['sampling', 'sample_dispatch_date', 'Sample dispatch date', 'Samples delivered (est.)'], ['production', 'bulk_dispatch_date', 'Bulk dispatch date', 'Delivery to buyer (est.)']].map(([phase, field, label, derivedLabel]) => {
                    const dispatchDate = proposal[field];
                    const derived = dispatchDate ? new Date(new Date(dispatchDate).getTime() + 10 * 86400000) : null;
                    return (
                      <div key={phase} style={S.tlBlock}>
                        <div style={{ ...S.tlPhLbl, color: PHASE_COLOR[phase] }}>{PHASE_LABEL[phase]}</div>
                        <div style={S.frow2}>
                          <div><label style={S.fl2}>{label}</label><input style={S.input} type="date" value={toInputDate(proposal[field])} onChange={e => patch({ [field]: e.target.value })} /></div>
                        </div>
                        {derivedLabel && derived && (
                          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>{derivedLabel}: <strong style={{ color: 'var(--text2)' }}>{fmtDate(derived)}</strong></div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {tab === 'concept' && (
                <div>
                  {proposal.concept_pdf_url && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface)', borderRadius: 8, padding: '12px 14px', marginBottom: 13 }}>
                      <span style={{ fontSize: 24 }}>📄</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{proposal.concept_pdf_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>Uploaded by studio</div>
                      </div>
                      <a href={proposal.concept_pdf_url} target="_blank" rel="noreferrer" style={{ background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: 6, padding: '6px 13px', fontSize: 12, fontWeight: 500, color: 'var(--text2)', textDecoration: 'none' }}>Preview</a>
                    </div>
                  )}
                  <div style={S.fg}><label style={S.fl2}>Concept title</label><input style={S.input} type="text" value={proposal.concept_title || ''} onChange={e => patch({ concept_title: e.target.value })} /></div>
                  <div style={S.fg}><label style={S.fl2}>Concept description</label><textarea style={{ ...S.input, minHeight: 96, resize: 'vertical' }} rows={4} value={proposal.concept_description || ''} onChange={e => patch({ concept_description: e.target.value })} /></div>
                </div>
              )}

              {tab === 'projects' && (
                <div>
                  <p style={{ fontSize: 12, color: 'var(--text3)', margin: '0 0 13px' }}>Collections the studio selected as relevant to this brief. Click to expand pieces and studio note.</p>
                  {(proposal.past_projects || []).length === 0 ? (
                    <div style={{ fontSize: 13, color: 'var(--text4)', fontStyle: 'italic' }}>No past work attached to this proposal.</div>
                  ) : proposal.past_projects.map((coll, i) => {
                    const pieces = coll.pieces || [];
                    const thumbs = pieces.slice(0, 3);
                    const vis = coll.visibility || (coll.is_hidden ? 'private' : 'public');
                    const visLabel = vis === 'open_for_collaboration' ? 'Open for collaboration' : vis === 'private' ? 'Private' : 'Public';
                    const isOpen = openPwColl[i];
                    return (
                      <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 10, marginBottom: 10, overflow: 'hidden' }}>
                        <div onClick={() => setOpenPwColl(o => ({ ...o, [i]: !o[i] }))} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', cursor: 'pointer', background: 'var(--surface)' }}>
                          <div style={{ position: 'relative', width: 60, height: 34, flexShrink: 0 }}>
                            {thumbs.length > 0 ? thumbs.map((p, j) => (
                              <div key={j} style={{ position: 'absolute', width: 32, height: 32, borderRadius: 7, background: p.image_url ? `url(${p.image_url}) center/cover` : 'var(--surface3)', border: '2px solid var(--surface)', left: j * 14, top: j === 0 ? 2 : j === 1 ? 1 : 0, zIndex: 3 - j }} />
                            )) : <div style={{ width: 32, height: 32, borderRadius: 7, background: 'var(--surface3)' }} />}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{coll.name || coll.collection_name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text3)', margin: '2px 0 6px' }}>{pieces.length} piece{pieces.length !== 1 ? 's' : ''}{coll.year ? ` · ${coll.year}` : ''} · {visLabel}</div>
                            {(coll.tags || []).length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                {coll.tags.map(t => <span key={t} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 100, background: 'var(--gold-dim)', color: 'var(--gold-d, var(--gold))', border: '1px solid var(--gold-l)' }}>{t}</span>)}
                              </div>
                            )}
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--text4)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>▾</span>
                        </div>
                        {isOpen && (
                          <div style={{ padding: '14px', borderTop: '1px solid var(--border)' }}>
                            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text4)', marginBottom: 10, display: 'block' }}>Pieces in this collection</span>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px,1fr))', gap: 8, marginBottom: 14 }}>
                              {pieces.map((p, j) => (
                                <div key={j}>
                                  <div style={{ width: '100%', aspectRatio: '1', borderRadius: 8, background: p.image_url ? `url(${p.image_url}) center/cover` : 'var(--surface3)' }} />
                                  <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                                </div>
                              ))}
                            </div>
                            {coll.note && (
                              <>
                                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text4)', marginBottom: 8, display: 'block' }}>Studio note — why this is relevant</span>
                                <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.65, fontStyle: 'italic', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>"{coll.note}"</div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {tab === 'sow' && (
                <div>
                  <div style={S.infoBox}><span>📋</span><span>Standard Qala SOW is auto-included. Below are project-specific clauses from the studio. You may add, edit, or remove any clause before sending to buyer.</span></div>
                  {(proposal.sow_clauses || []).map((c, i) => (
                    <div key={i} style={S.clause}>
                      <span style={{ color: 'var(--text4)', flexShrink: 0, marginTop: 1 }}>•</span>
                      <span style={{ flex: 1 }}>{c}</span>
                      <button style={S.cdel} onClick={() => patch({ sow_clauses: proposal.sow_clauses.filter((_, j) => j !== i) })}>×</button>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 7, marginTop: 9 }}>
                    <input style={{ ...S.input, flex: 1 }} type="text" placeholder="Add a project-specific clause…" value={newClause} onChange={e => setNewClause(e.target.value)} />
                    <button style={{ whiteSpace: 'nowrap', background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 7, padding: '7px 14px', fontSize: 12, fontWeight: 500, color: 'var(--text2)', cursor: 'pointer' }}
                      onClick={() => { if (newClause.trim()) { patch({ sow_clauses: [...(proposal.sow_clauses || []), newClause.trim()] }); setNewClause(''); } }}>+ Add</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ADMIN NOTES */}
          <div style={S.card}>
            <div style={S.cardHeader}><span style={S.cardTitle}>Admin notes</span><span style={{ fontSize: 11, color: 'var(--text4)' }}>Internal only · never shared</span></div>
            <div style={S.cardBody}>
              <textarea style={{ ...S.input, minHeight: 72, resize: 'vertical' }} placeholder="Pricing concerns, anomalies, review comments…" value={proposal.admin_notes || ''} onChange={e => patch({ admin_notes: e.target.value })} />
            </div>
          </div>
        </div>

        {/* SIDE PANEL */}
        <div style={S.sideCol}>
          <div style={S.card}>
            <div style={S.cardHeader}>
              <span style={S.cardTitle}>Landing cost</span>
              <span style={{ fontSize: 10, color: 'var(--text4)' }}>USD / INR</span>
            </div>
            <div style={S.cardBody}>
              <div style={S.resultCard}>
                <div style={S.rcLbl}>Buyer landing cost (total)</div>
                <div style={S.rcVal}>{cv(calc?.landingCostUSD)}</div>
              </div>
              <div style={{ marginBottom: 6, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text4)' }}>Cost build-up</div>
              <div style={S.buRow(false, false)}><span style={{ fontWeight: 600, color: 'var(--text2)' }}>Studio charges</span><span>{cv(calc?.totalProdUSD)}</span></div>
              {['designing', 'sampling', 'production'].map(p => (
                <div key={p} style={S.buRow(true, false)}><span style={{ color: PHASE_COLOR[p] }}>{PHASE_LABEL[p]}</span><span>{cv(calc?.byPhase?.[p]?.prodUSD)}</span></div>
              ))}
              <div style={S.buRow(false, false)}><span>Shipping · {calc?.isSG ? 'Economical' : 'Express'}</span><span>{cv(calc?.shippingUSD)}</span></div>
              <div style={S.buRow(false, false)}><span>Import duties</span><span>{cv(calc?.totalDutyUSD)}</span></div>
              <div style={S.buRow(false, false)}><span>Platform services</span><span>{cv(calc?.pfTotalFinal)}</span></div>
              {['designing', 'sampling', 'production'].map(p => (
                <div key={p} style={S.buRow(true, false)}><span style={{ color: PHASE_COLOR[p] }}>{PHASE_LABEL[p]} <span style={{ color: 'var(--text4)' }}>({Math.round((pfPctByPhase[p] || 0) * 100)}%)</span></span><span>{cv(calc?.byPhase?.[p]?.pfTotal)}</span></div>
              ))}
              <div style={S.buRow(false, true)}><span>Landing cost</span><span style={{ color: 'var(--gold-d)' }}>{cv(calc?.landingCostUSD)}</span></div>
            </div>
          </div>

          <div style={S.card}>
            <div style={S.cardHeader}><span style={S.cardTitle}>Platform fee</span><span style={S.chip('var(--admin-dim)', 'var(--admin)')}>Per phase · editable</span></div>
            <div style={S.cardBody}>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 11, lineHeight: 1.6 }}>Standard rates apply. Override any phase — changes reflect in landing cost immediately.</div>
              {['designing', 'sampling', 'production'].map(p => {
                const val = Math.round((pfPctByPhase[p] || 0) * 1000) / 10;
                const fillPct = Math.min(100, (val / 15) * 100);
                return (
                  <div key={p} style={S.pfRow}>
                    <div style={S.pfName}><div style={{ width: 7, height: 7, borderRadius: '50%', background: PHASE_COLOR[p] }} />{PHASE_LABEL[p]}</div>
                    <div style={{ position: 'relative', flex: 1, height: 4, background: 'var(--surface3)', borderRadius: 2 }}>
                      <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 2, pointerEvents: 'none', background: PHASE_COLOR[p], width: `${fillPct}%` }} />
                      <input type="range" min="0" max="15" step="0.5" value={val} onChange={e => setPfPhase(p, e.target.value)}
                        style={{ position: 'absolute', width: '100%', top: -6, left: 0, margin: 0, opacity: 0, cursor: 'pointer', height: 16 }} />
                    </div>
                    <input style={S.pfNum} type="number" min="0" max="30" step="0.5" value={val} onChange={e => setPfPhase(p, e.target.value)} />
                  </div>
                );
              })}
              <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 9 }}>% applied to studio charges incl. GST · per phase</div>
            </div>
          </div>

          <div style={S.card}>
            <div style={S.cardHeader}><span style={S.cardTitle}>Studio payout</span><span style={{ fontSize: 11, color: 'var(--text4)' }}>INR · incl. GST</span></div>
            <div style={S.cardBody}>
              <div style={S.poutTotalBlock}>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--text3)', marginBottom: 2 }}>Total payout</div>
                <div style={S.poutBig}>{inr(calc?.payoutTotalINR)}</div>
                <div style={{ fontSize: 11, color: 'rgba(201,122,82,.7)', marginTop: 1 }}>Studio receives after Qala deducts platform fee</div>
              </div>
              {['designing', 'sampling', 'production'].map(p => (
                <div key={p} style={S.poutPhRow}><span style={{ color: PHASE_COLOR[p] }}>{PHASE_LABEL[p]}</span><span style={{ fontWeight: 600, color: 'var(--text2)' }}>{inr(calc?.payoutByPhase?.[p])}</span></div>
              ))}
            </div>
          </div>

          <div style={S.card}>
            <div style={S.cardHeader}><span style={S.cardTitle}>Payment schedule</span><span style={S.chip('var(--admin-dim)', 'var(--admin)')}>Editable</span></div>
            <div style={S.cardBody}>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12, lineHeight: 1.6 }}>Studio-proposed milestone splits. Edit percentages or trigger for this project — must total 100% per phase.</div>
              {['designing', 'sampling', 'production'].map((phase, i) => (
                <div key={phase} style={{ marginBottom: 12, paddingBottom: i < 2 ? 12 : 0, borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}><div style={{ width: 7, height: 7, borderRadius: '50%', background: PHASE_COLOR[phase] }} /><span style={{ fontSize: 12, fontWeight: 600 }}>{PHASE_LABEL[phase]}</span></div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {milestones.filter(m => m.phase === MS_PHASE[phase]).map(m => {
                      const isCustom = !TRIGGER_OPTIONS[phase].slice(0, -1).includes(m.trigger_label);
                      return (
                        <div key={m.id}>
                          <div style={S.msRow}>
                            <select style={S.msSelect} value={isCustom ? 'Custom' : m.trigger_label} onChange={e => updateMilestone(m.id, { trigger_label: e.target.value === 'Custom' ? '' : e.target.value })}>
                              {TRIGGER_OPTIONS[phase].map(t => <option key={t}>{t}</option>)}
                            </select>
                            <input style={S.msPct} type="number" min="0" max="100" value={m.percentage} onChange={e => updateMilestone(m.id, { percentage: e.target.value })} />
                            <button style={S.cdel} onClick={() => deleteMilestone(m.id)}>×</button>
                          </div>
                          {isCustom && (
                            <div style={{ marginTop: 4 }}>
                              <input style={{ ...S.msSelect, width: '100%' }} type="text" placeholder="Describe the milestone condition…" value={m.trigger_label} onChange={e => updateMilestone(m.id, { trigger_label: e.target.value })} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <button style={{ ...S.addRowBtn, marginTop: 7 }} onClick={() => addMilestone(phase)}>+ Add milestone</button>
                </div>
              ))}
              <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 12 }}>Percentages of studio payout · must total 100% per phase · subject to GSTIN verification</div>
            </div>
          </div>

          <div style={S.card}>
            <div style={S.cardHeader}><span style={S.cardTitle}>Actions</span></div>
            <div style={S.cardBody}>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 13, lineHeight: 1.7 }}>Once approved, proposal is emailed to the buyer with {proposal.studio_name} in CC.</div>
              <div style={{ marginBottom: 13 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginBottom: 5, display: 'block' }}>Valid until</label>
                <input style={S.input} type="date" value={toInputDate(proposal.valid_until)} onChange={e => patch({ valid_until: e.target.value })} />
                <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 4 }}>Buyer sees this date on their proposal view.</div>
              </div>
              <div style={{ marginBottom: 13 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginBottom: 5, display: 'block' }}>First payment link</label>
                <input style={S.input} type="url" placeholder="https://pay.stripe.com/…" value={milestones[0]?.payment_link_url || ''}
                  onChange={e => updateMilestone(milestones[0]?.id, { payment_link_url: e.target.value })} />
                <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 4 }}>Buyer will see a <strong>Pay now</strong> button after accepting. First milestone: {PHASE_LABEL[milestones[0]?.phase] || 'Design'} phase — <strong>{usd(milestones[0]?.amount_usd)}</strong>.</div>
              </div>
              {showRevision ? (
                <div style={{ marginBottom: 10 }}>
                  <textarea style={{ ...S.input, minHeight: 68, resize: 'vertical', marginBottom: 8 }} placeholder="What needs to change?" value={revisionNote} onChange={e => setRevisionNote(e.target.value)} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button style={{ ...S.btn, ...S.btnGhost }} onClick={() => setShowRevision(false)}>Cancel</button>
                    <button style={{ ...S.btn, ...S.btnSave }} disabled={!revisionNote.trim()} onClick={doRequestRevision}>Send to studio</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <button style={{ ...S.btn, ...S.btnApprove }} disabled={saving} onClick={doApprove}>✓ Approve & send to buyer</button>
                  <button style={{ ...S.btn, ...S.btnSave }} disabled={saving} onClick={() => save({
                    platform_fee_design_pct: proposal.platform_fee_design_pct, platform_fee_sampling_pct: proposal.platform_fee_sampling_pct,
                    platform_fee_production_pct: proposal.platform_fee_production_pct, line_items: proposal.line_items,
                    valid_until: proposal.valid_until, concept_title: proposal.concept_title, concept_description: proposal.concept_description,
                    sow_clauses: proposal.sow_clauses, phase_notes: proposal.phase_notes, admin_notes: proposal.admin_notes,
                  })}>{saving ? 'Saving…' : 'Save changes (stay in review)'}</button>
                  <button style={{ ...S.btn, ...S.btnGhost }} onClick={() => setShowRevision(true)}>↩ Request studio revision</button>
                </div>
              )}
            </div>
          </div>

          <div style={S.card}>
            <div style={S.cardHeader}>
              <span style={S.cardTitle}>Buyer responses</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text4)' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green, #2E9E62)' }} />Live
              </span>
            </div>
            <div>
              {activity.length === 0 ? (
                <div style={{ padding: '22px 16px', textAlign: 'center', fontSize: 12, color: 'var(--text4)' }}>No buyer responses yet — waiting for buyer to open the proposal.</div>
              ) : activity.map(a => {
                const [icon, bg, color] = ACT_ICON[a.type] || ['•', 'var(--surface2)', 'var(--text3)'];
                return (
                  <div key={a.id} style={S.baItem}>
                    <div style={S.baIcon(bg, color)}>{icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{ACT_TITLE[a.type] || a.type}</div>
                      {a.message && <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.55, marginTop: 3, fontStyle: 'italic' }}>"{a.message}"</div>}
                      <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 3 }}>{fmtDateTime(a.created_at)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
// src/pages/admin/AdminAssignStudios.jsx
//
// Rebuilt against admin-assign-studios.html — same layout, copy, and
// behavior as the prototype, but styled with plain inline style objects
// (S.* below) instead of a separate .css file, matching how every other
// page in this app is styled (index.css only holds the shared design
// tokens and .btn/.field/.card utility classes — no page ever ships its
// own .css file, so this page shouldn't be the first).
//
// Data substitutions where the backend has no equivalent field —
// documented, not faked:
//   - "Rating" stat — no review/rating system exists in the backend at
//     all. Shown as "—".
//   - Filter chips "Jaipur"/"Rajasthan"/"Bengal" — no region-taxonomy
//     field; real studios are filtered by plain text match against
//     studio_location instead.
//   - "MOQ"/"Lead" — real StudioDetails fields (moq_per_batch,
//     production_time_weeks), added to the admin-match-studios endpoint
//     specifically to support this page.
//   - Studio tag chips — the matching engine's matched parameters
//     (Fabrics, Printing, Embellishment, etc.), since that's the only
//     per-studio craft data this endpoint returns.

import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectsAPI } from '../../api/client';

const PARAM_LABELS = {
  embellishment: 'Embellishment', printing: 'Printing', category: 'Category',
  weaving: 'Weaving', fabrics: 'Fabrics', dyes: 'Dyes',
  dyeing_techniques: 'Dyeing', spinning: 'Spinning',
};
const FILTER_CHIPS = [
  ['all', 'All'], ['embellishment', 'Embellishment'], ['dyes', 'Natural dyes'],
  ['weaving', 'Weaving'], ['fabrics', 'Fabrics'], ['printing', 'Printing'],
];

function matchLabel(score) {
  if (score >= 100) return { bg: 'var(--green-dim)', color: 'var(--green)', label: 'Strong match' };
  if (score >= 60)  return { bg: 'var(--gold-dim2)', color: 'var(--gold-d)', label: 'Good match' };
  if (score >= 30)  return { bg: 'var(--amber-dim)', color: 'var(--amber)', label: 'Partial match' };
  return              { bg: 'var(--surface2)', color: 'var(--text4)', label: 'Low match' };
}
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Inline style objects — one per prototype CSS class, same values ──
const S = {
  navbar: { position: 'sticky', top: 0, zIndex: 200, display: 'flex', alignItems: 'center', gap: 16, background: 'var(--admin)', color: '#fff', padding: '0 24px', height: 52, boxShadow: '0 1px 0 rgba(0,0,0,0.12)' },
  navLogo: { fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: '.04em', cursor: 'pointer' },
  navBack: { fontSize: 13, color: 'rgba(255,255,255,0.72)', cursor: 'pointer' },
  navSep: { color: 'rgba(255,255,255,0.30)', margin: '0 2px' },
  navChip: { background: 'rgba(255,255,255,0.15)', color: '#fff', borderRadius: 'var(--r-full)', padding: '3px 10px', fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', marginLeft: 'auto' },

  briefStrip: { background: 'var(--admin)', borderBottom: '1px solid rgba(255,255,255,0.10)', padding: '14px 24px', display: 'flex', alignItems: 'flex-start', gap: 32, flexWrap: 'wrap' },
  briefLabel: { fontSize: 10, fontWeight: 600, letterSpacing: '.10em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', marginBottom: 3 },
  briefValue: { fontSize: 13, fontWeight: 500, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220 },
  briefValueMono: { fontFamily: 'monospace', fontSize: 12, letterSpacing: '.04em', background: 'rgba(255,255,255,0.12)', padding: '2px 8px', borderRadius: 'var(--r-4)', display: 'inline-block' },

  pageLayout: { display: 'grid', gridTemplateColumns: '1fr 340px', minHeight: 'calc(100vh - 102px)', maxWidth: 1280, margin: '0 auto' },
  main: { padding: '28px 24px', minWidth: 0 },
  mainHeader: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 },
  mainTitle: { fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600 },
  countChip: { background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 'var(--r-full)', padding: '3px 10px', fontSize: 12, fontWeight: 600, color: 'var(--text2)' },

  searchBar: { display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid var(--border2)', borderRadius: 'var(--r-10)', padding: '10px 14px', marginBottom: 16 },
  searchInput: { flex: 1, border: 'none', outline: 'none', fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text)', background: 'transparent' },
  searchIcon: { color: 'var(--text4)', fontSize: 16, flexShrink: 0 },

  filters: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 },
  filterChip: (active) => ({ padding: '6px 14px', borderRadius: 'var(--r-full)', border: `1px solid ${active ? 'var(--admin)' : 'var(--border2)'}`, background: active ? 'var(--admin)' : '#fff', fontSize: 12, fontWeight: 500, color: active ? '#fff' : 'var(--text2)', cursor: 'pointer', userSelect: 'none' }),

  studioGrid: { display: 'flex', flexDirection: 'column', gap: 12 },
  studioCard: (assigned) => ({ border: `1px solid ${assigned ? 'var(--gold)' : 'var(--border)'}`, borderRadius: 'var(--r-lg)', padding: '18px 20px', display: 'flex', alignItems: 'flex-start', gap: 16, background: assigned ? 'var(--gold-dim)' : '#fff' }),
  studioAvatar: { width: 48, height: 48, borderRadius: 'var(--r-10)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, background: 'var(--admin-dim)', color: 'var(--admin)' },
  studioName: { fontSize: 15, fontWeight: 600, marginBottom: 2 },
  studioLocation: { fontSize: 12, color: 'var(--text3)', marginBottom: 10 },
  studioTags: { display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 },
  studioTag: { padding: '3px 10px', borderRadius: 'var(--r-full)', border: '1px solid var(--border)', fontSize: 11, color: 'var(--text2)', background: 'var(--surface)' },
  studioMeta: { display: 'flex', gap: 16, flexWrap: 'wrap' },
  studioStat: { fontSize: 11, color: 'var(--text3)' },

  assignBtn: (assigned) => ({ flexShrink: 0, padding: '8px 18px', borderRadius: 'var(--r-8)', border: `1px solid ${assigned ? 'var(--gold-d)' : 'var(--border2)'}`, background: assigned ? 'var(--gold)' : 'var(--surface)', fontSize: 13, fontWeight: 500, color: assigned ? '#fff' : 'var(--text2)', cursor: 'pointer', whiteSpace: 'nowrap', marginTop: 2 }),

  emptyState: { textAlign: 'center', padding: '48px 20px', color: 'var(--text3)' },

  rightPanel: { background: '#fff', borderLeft: '1px solid var(--border)', position: 'sticky', top: 102, height: 'calc(100vh - 102px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  rpHeader: { padding: '20px 20px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 },
  rpTitle: { fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 },
  rpSub: { fontSize: 12, color: 'var(--text4)' },
  assignedList: { flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 },
  assignedItem: { display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-10)', padding: '12px 14px' },
  aiAvatar: { width: 36, height: 36, borderRadius: 'var(--r-8)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, background: 'var(--admin-dim)', color: 'var(--admin)' },
  aiName: { fontSize: 13, fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  aiLocation: { fontSize: 11, color: 'var(--text4)' },
  aiRemove: { fontSize: 18, color: 'var(--text4)', cursor: 'pointer', padding: '0 4px', flexShrink: 0, lineHeight: 1 },
  assignedEmpty: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 20, color: 'var(--text4)' },

  rpFooter: { padding: '16px 20px', borderTop: '1px solid var(--border)', flexShrink: 0 },
  rpCountText: { fontSize: 12, color: 'var(--text3)', marginBottom: 12, textAlign: 'center' },

  btn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14, fontWeight: 500, padding: '11px 20px', borderRadius: 'var(--r-8)', border: 'none', cursor: 'pointer', width: '100%' },
  btnAdmin: { background: 'var(--admin)', color: '#fff', marginBottom: 8 },
  btnAdminDisabled: { opacity: 0.45, cursor: 'not-allowed' },
  btnSecondary: { background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border2)' },

  confirmState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px 20px', flex: 1 },
  confirmTitle: { fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, marginBottom: 6 },
  confirmSub: { fontSize: 13, color: 'var(--text3)', lineHeight: 1.55, marginBottom: 20 },
  confirmStudios: { display: 'flex', flexDirection: 'column', gap: 8, width: '100%', marginBottom: 24 },
  confirmPill: { display: 'flex', alignItems: 'center', gap: 10, background: 'var(--gold-dim)', border: '1px solid var(--gold-l)', borderRadius: 'var(--r-8)', padding: '10px 12px', textAlign: 'left' },
  cpDot: { width: 8, height: 8, borderRadius: '50%', background: 'var(--gold)', flexShrink: 0 },
  cpName: { fontSize: 13, fontWeight: 600 },
  cpCheck: { marginLeft: 'auto', color: 'var(--green)', fontSize: 14, fontWeight: 700 },

  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modal: { background: '#fff', borderRadius: 'var(--r-16)', width: '100%', maxWidth: 640, maxHeight: '88vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 60px rgba(0,0,0,0.20)' },
  modalHeader: { padding: '22px 24px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', gap: 16 },
  modalAvatar: { width: 56, height: 56, borderRadius: 'var(--r-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, flexShrink: 0, background: 'var(--admin-dim)', color: 'var(--admin)' },
  modalTitle: { fontSize: 18, fontWeight: 600, marginBottom: 2 },
  modalSubtitle: { fontSize: 13, color: 'var(--text3)' },
  modalClose: { marginLeft: 'auto', fontSize: 22, color: 'var(--text4)', cursor: 'pointer', lineHeight: 1, padding: '0 4px', flexShrink: 0 },
  modalBody: { overflowY: 'auto', flex: 1, padding: '22px 24px' },
  modalSection: { marginBottom: 22 },
  modalSectionTitle: { fontSize: 10, fontWeight: 700, letterSpacing: '.10em', textTransform: 'uppercase', color: 'var(--text4)', marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid var(--border)' },
  modalBio: { fontSize: 14, color: 'var(--text2)', lineHeight: 1.65 },
  modalStats: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 },
  modalStat: { background: 'var(--surface)', borderRadius: 'var(--r-10)', padding: '12px 14px' },
  modalStatVal: { fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: 2 },
  modalStatLbl: { fontSize: 11, color: 'var(--text4)' },
  modalTags: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  modalTag: { padding: '4px 12px', borderRadius: 'var(--r-full)', border: '1px solid var(--border2)', fontSize: 12, color: 'var(--text2)', background: 'var(--surface)' },
  modalFooter: { padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center' },

  matchBadge: (m) => ({ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 'var(--r-full)', flexShrink: 0, background: m.bg, color: m.color }),
  matchBarWrap: { display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 },
  matchBar: { height: 4, borderRadius: 'var(--r-2)', background: 'var(--surface2)', overflow: 'hidden', flex: 1 },
  matchBarFill: (pct) => ({ height: '100%', borderRadius: 'var(--r-2)', background: 'var(--gold)', width: `${pct}%` }),
};

export default function AdminAssignStudios() {
  const { projectId } = useParams();
  const nav = useNavigate();

  const [project, setProject] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [assigned, setAssigned] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [modalStudioId, setModalStudioId] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [notifiedIds, setNotifiedIds] = useState([]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      projectsAPI.adminGetProject(projectId),
      projectsAPI.adminMatchStudios(projectId),
    ])
      .then(([p, m]) => {
        setProject(p.data.project);
        setCandidates((m.data.candidates || []).filter(c => !c.already_assigned));
      })
      .catch(e => setError(e?.response?.data?.message || 'Could not load studios for this brief.'))
      .finally(() => setLoading(false));
  }, [projectId]);

  const brief = project?.brief || {};

  const lookingFor = useMemo(() => {
    const parts = [];
    if (brief.garment_types?.length) parts.push(brief.garment_types.slice(0, 2).join(', '));
    if (brief.printing_required?.length) parts.push(brief.printing_required[0]);
    if (brief.preferred_dyes?.length) parts.push(brief.preferred_dyes[0]);
    return parts.join(' · ') || '—';
  }, [brief]);

  const targetPrice = brief.target_landing_price_local
    ? `${brief.target_landing_currency || ''} ${brief.target_landing_price_local}${brief.bulk_quantity ? ` · ${brief.bulk_quantity} pcs` : ''}`
    : '—';

  const visible = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return candidates.filter(c => {
      const matchFilter = activeFilter === 'all' || (c.breakdown?.[activeFilter]?.raw > 0);
      const matchSearch = !q
        || c.studio_name.toLowerCase().includes(q)
        || (c.studio_location || '').toLowerCase().includes(q)
        || (c.about || '').toLowerCase().includes(q);
      return matchFilter && matchSearch;
    });
  }, [candidates, activeFilter, searchTerm]);

  const top  = visible.filter(c => c.score >= 100);
  const rest = visible.filter(c => c.score < 100);
  const showGrouped = activeFilter === 'all' && !searchTerm && top.length > 0;

  const toggleAssign = (id) => setAssigned(a => a.includes(id) ? a.filter(x => x !== id) : [...a, id]);
  const assignedCandidates = candidates.filter(c => assigned.includes(c.studio_id));
  const modalCandidate = candidates.find(c => c.studio_id === modalStudioId);

  const confirmAssignment = async () => {
    if (assigned.length === 0) return;
    setConfirming(true);
    try {
      const scores = {};
      const breakdowns = {};
      candidates.forEach(c => { scores[c.studio_id] = c.score; breakdowns[c.studio_id] = c.breakdown; });
      await projectsAPI.adminAssignStudios(projectId, { studio_ids: assigned, scores, breakdowns });
      setNotifiedIds(assigned);
      setConfirmed(true);
    } catch (e) {
      alert(e?.response?.data?.message || 'Could not assign studios — please try again.');
    } finally {
      setConfirming(false);
    }
  };

  // "Save & do later" — there is no draft-assignment concept in the
  // backend (an assignment IS the notification), so the only honest way
  // to not lose a selection made on this screen is to actually persist it
  // via the same real endpoint Confirm uses, just without showing the
  // "studios notified" success screen afterward. If nothing is selected,
  // there's nothing to lose — just navigate back.
  const saveAndDoLater = async () => {
    if (assigned.length === 0) { nav(`/admin/projects/${projectId}`); return; }
    setConfirming(true);
    try {
      const scores = {};
      const breakdowns = {};
      candidates.forEach(c => { scores[c.studio_id] = c.score; breakdowns[c.studio_id] = c.breakdown; });
      await projectsAPI.adminAssignStudios(projectId, { studio_ids: assigned, scores, breakdowns });
      nav(`/admin/projects/${projectId}`);
    } catch (e) {
      alert(e?.response?.data?.message || 'Could not save your selection — please try again.');
      setConfirming(false);
    }
  };

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--text4)', fontSize: 14 }}>Scoring studios against this brief…</div>;
  if (error) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--red)', fontSize: 14 }}>{error}</div>;

  return (
    <div>
      <nav style={S.navbar}>
        <span style={S.navBack} onClick={() => nav(`/admin/projects/${projectId}`)}>← Project</span>
        <span style={S.navSep}>/</span>
        <span style={{ ...S.navBack, color: '#fff' }}>Assign studios</span>
        <span style={{ ...S.navLogo, marginLeft: 'auto', marginRight: 0 }} onClick={() => nav('/admin/projects')}>Qala</span>
        <span style={S.navChip}>Admin</span>
      </nav>

      <div style={S.briefStrip}>
        <div><div style={S.briefLabel}>Ref</div><div style={{ ...S.briefValue, ...S.briefValueMono }}>{project?.id ? project.id.slice(0, 8).toUpperCase() : '—'}</div></div>
        <div><div style={S.briefLabel}>Project</div><div style={S.briefValue}>{project?.name || '—'}</div></div>
        <div><div style={S.briefLabel}>Buyer</div><div style={S.briefValue}>{brief.buyer_brand_name || project?.buyer_name || '—'}{brief.buyer_location ? ` · ${brief.buyer_location}` : ''}</div></div>
        <div><div style={S.briefLabel}>Looking for</div><div style={S.briefValue}>{lookingFor}</div></div>
        <div><div style={S.briefLabel}>Target price</div><div style={S.briefValue}>{targetPrice}</div></div>
        <div><div style={S.briefLabel}>Bulk delivery</div><div style={S.briefValue}>{fmtDate(brief.target_bulk_delivery_date)}</div></div>
      </div>

      <div style={S.pageLayout}>
        <main style={S.main}>
          <div style={S.mainHeader}>
            <div style={S.mainTitle}>Studio directory</div>
            <span style={S.countChip}>{visible.length} {visible.length === 1 ? 'studio' : 'studios'}</span>
          </div>

          <div style={S.searchBar}>
            <span style={S.searchIcon}>🔍</span>
            <input style={S.searchInput} type="text" placeholder="Search by name, location, or craft…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>

          <div style={S.filters}>
            {FILTER_CHIPS.map(([key, label]) => (
              <span key={key} style={S.filterChip(activeFilter === key)} onClick={() => setActiveFilter(key)}>{label}</span>
            ))}
          </div>

          {visible.length === 0 ? (
            <div style={S.emptyState}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
              <div style={{ fontSize: 14 }}>No studios match your search.</div>
            </div>
          ) : (
            <div style={S.studioGrid}>
              {showGrouped && <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--gold-d)', marginBottom: 8 }}>● Top matches for this brief</div>}
              {(showGrouped ? top : visible).map(c => (
                <StudioCard key={c.studio_id} c={c} isAssigned={assigned.includes(c.studio_id)} onAssign={toggleAssign} onView={setModalStudioId} />
              ))}
              {showGrouped && rest.length > 0 && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text4)', margin: '16px 0 8px' }}>Other studios</div>
                  {rest.map(c => <StudioCard key={c.studio_id} c={c} isAssigned={assigned.includes(c.studio_id)} onAssign={toggleAssign} onView={setModalStudioId} />)}
                </>
              )}
            </div>
          )}
        </main>

        <aside style={S.rightPanel}>
          {!confirmed ? (
            <>
              <div style={S.rpHeader}>
                <div style={S.rpTitle}>Assigned studios</div>
                <div style={S.rpSub}>Add studios to invite to submit a proposal</div>
              </div>
              <div style={S.assignedList}>
                {assignedCandidates.length === 0 ? (
                  <div style={S.assignedEmpty}>
                    <div style={{ fontSize: 28, marginBottom: 10 }}>🏭</div>
                    <div style={{ fontSize: 13, lineHeight: 1.5 }}>No studios assigned yet.<br />Pick from the directory →</div>
                  </div>
                ) : assignedCandidates.map(c => (
                  <div key={c.studio_id} style={S.assignedItem}>
                    <div style={S.aiAvatar}>{(c.studio_name || '?').slice(0, 2)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={S.aiName}>{c.studio_name}</div>
                      <div style={S.aiLocation}>{c.studio_location || '—'}</div>
                    </div>
                    <span style={S.aiRemove} onClick={() => toggleAssign(c.studio_id)} title="Remove">×</span>
                  </div>
                ))}
              </div>
              <div style={S.rpFooter}>
                <div style={S.rpCountText}><strong style={{ color: 'var(--text)' }}>{assignedCandidates.length} studio{assignedCandidates.length !== 1 ? 's' : ''}</strong> assigned</div>
                <button style={{ ...S.btn, ...S.btnAdmin, ...(assignedCandidates.length === 0 || confirming ? S.btnAdminDisabled : {}) }} disabled={assignedCandidates.length === 0 || confirming} onClick={confirmAssignment}>
                  {confirming ? 'Confirming…' : 'Confirm & notify studios'}
                </button>
                <button style={{ ...S.btn, ...S.btnSecondary }} disabled={confirming} onClick={saveAndDoLater}>
                  {confirming ? 'Saving…' : 'Save & do later'}
                </button>
              </div>
            </>
          ) : (
            <div style={S.confirmState}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
              <div style={S.confirmTitle}>Studios notified</div>
              <div style={S.confirmSub}>Each studio can now view the brief and submit a proposal. You'll be notified as proposals come in.</div>
              <div style={S.confirmStudios}>
                {candidates.filter(c => notifiedIds.includes(c.studio_id)).map(c => (
                  <div key={c.studio_id} style={S.confirmPill}>
                    <div style={S.cpDot} />
                    <div><div style={S.cpName}>{c.studio_name}</div><div style={{ fontSize: 11, color: 'var(--text3)' }}>{c.studio_location || '—'}</div></div>
                    <span style={S.cpCheck}>✓</span>
                  </div>
                ))}
              </div>
              <button style={{ ...S.btn, ...S.btnSecondary }} onClick={() => nav('/admin/projects')}>Go to admin console</button>
            </div>
          )}
        </aside>
      </div>

      {modalCandidate && (
        <div style={S.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setModalStudioId(null); }}>
          <div style={S.modal}>
            <div style={S.modalHeader}>
              <div style={S.modalAvatar}>{(modalCandidate.studio_name || '?').slice(0, 2)}</div>
              <div>
                <div style={S.modalTitle}>{modalCandidate.studio_name}</div>
                <div style={S.modalSubtitle}>📍 {modalCandidate.studio_location || '—'}</div>
              </div>
              <span style={S.modalClose} onClick={() => setModalStudioId(null)}>×</span>
            </div>
            <div style={S.modalBody}>
              <div style={S.modalSection}>
                <div style={S.modalSectionTitle}>About</div>
                <div style={S.modalBio}>{modalCandidate.about || 'No profile notes on file yet.'}</div>
              </div>
              <div style={S.modalSection}>
                <div style={S.modalSectionTitle}>Key stats</div>
                <div style={S.modalStats}>
                  <div style={S.modalStat}><div style={S.modalStatVal}>{modalCandidate.moq_per_batch ?? '—'}</div><div style={S.modalStatLbl}>Min. order qty</div></div>
                  <div style={S.modalStat}><div style={S.modalStatVal}>{modalCandidate.production_time_weeks ? `${modalCandidate.production_time_weeks}w` : '—'}</div><div style={S.modalStatLbl}>Lead time</div></div>
                  <div style={S.modalStat}><div style={S.modalStatVal}>{modalCandidate.completed_projects_count ?? '—'}</div><div style={S.modalStatLbl}>Projects done</div></div>
                  <div style={S.modalStat}><div style={S.modalStatVal}>—</div><div style={S.modalStatLbl}>Rating</div></div>
                </div>
              </div>
              <div style={S.modalSection}>
                <div style={S.modalSectionTitle}>Craft specialties</div>
                <div style={S.modalTags}>
                  {Object.entries(modalCandidate.breakdown || {}).filter(([, d]) => d.raw > 0).map(([k]) => <span key={k} style={S.modalTag}>{PARAM_LABELS[k] || k}</span>)}
                </div>
              </div>
              <div style={S.modalSection}>
                <div style={S.modalSectionTitle}>Match with this brief</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <span style={{ ...S.matchBadge(matchLabel(modalCandidate.score)), fontSize: 13, padding: '5px 12px' }}>
                    {matchLabel(modalCandidate.score).label} · {Math.round(modalCandidate.score)}%
                  </span>
                  <div style={{ ...S.matchBar, height: 6 }}><div style={S.matchBarFill(modalCandidate.score)} /></div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {Object.entries(modalCandidate.breakdown || {}).map(([k, d]) => (
                    <div key={k} style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, color: d.raw > 0 ? 'var(--text)' : 'var(--text4)' }}>
                      <span style={{ color: d.raw > 0 ? 'var(--green)' : 'var(--text4)', fontSize: 15 }}>{d.raw > 0 ? '✓' : '–'}</span>
                      <span>{PARAM_LABELS[k] || k}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={S.modalFooter}>
              <button style={{ ...S.btn, ...S.btnAdmin, width: 'auto', flex: 1, marginBottom: 0 }} onClick={() => toggleAssign(modalCandidate.studio_id)}>
                {assigned.includes(modalCandidate.studio_id) ? '✓ Assigned — remove' : '+ Assign studio'}
              </button>
              <button style={{ ...S.btn, ...S.btnSecondary, width: 'auto', flexShrink: 0 }} onClick={() => setModalStudioId(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StudioCard({ c, isAssigned, onAssign, onView }) {
  const m = matchLabel(c.score);
  const tags = Object.entries(c.breakdown || {}).filter(([, d]) => d.raw > 0).map(([k]) => PARAM_LABELS[k] || k);
  return (
    <div style={S.studioCard(isAssigned)}>
      <div style={S.studioAvatar}>{(c.studio_name || '?').slice(0, 2)}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <div style={S.studioName}>{c.studio_name}</div>
          <span style={S.matchBadge(m)}>{m.label} · {Math.round(c.score)}%</span>
        </div>
        <div style={S.studioLocation}>📍 {c.studio_location || '—'}</div>
        <div style={{ ...S.matchBarWrap, marginBottom: 8 }}>
          <div style={S.matchBar}><div style={S.matchBarFill(c.score)} /></div>
        </div>
        {tags.length > 0 && <div style={S.studioTags}>{tags.map(t => <span key={t} style={S.studioTag}>{t}</span>)}</div>}
        {c.about && <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8, lineHeight: 1.5 }}>{c.about}</div>}
        <div style={S.studioMeta}>
          <span style={S.studioStat}><strong style={{ color: 'var(--text2)', fontWeight: 600 }}>MOQ</strong> {c.moq_per_batch ?? '—'}</span>
          <span style={S.studioStat}><strong style={{ color: 'var(--text2)', fontWeight: 600 }}>Lead</strong> {c.production_time_weeks ? `${c.production_time_weeks}w` : '—'}</span>
          <span style={S.studioStat}><strong style={{ color: 'var(--text2)', fontWeight: 600 }}>Projects</strong> {c.completed_projects_count ?? '—'}</span>
          <span style={{ ...S.studioStat, marginLeft: 'auto' }}>
            <a href="#" style={{ color: 'var(--admin)', fontWeight: 500, fontSize: 12, textDecoration: 'none' }} onClick={(e) => { e.preventDefault(); onView(c.studio_id); }}>View full profile →</a>
          </span>
        </div>
      </div>
      <button style={S.assignBtn(isAssigned)} onClick={() => onAssign(c.studio_id)}>{isAssigned ? '✓ Assigned' : '+ Assign'}</button>
    </div>
  );
}
// src/components/proposals/ProposalCarbonCopy.jsx
//
// The single, shared, prototype-exact rendering of a buyer-facing
// proposal — extracted from what was PublicProposalView.jsx so there's
// exactly ONE implementation to keep correct, used by BOTH:
//   1. PublicProposalView.jsx — the no-login emailed link (/p/:token)
//   2. buyer/ProjectDetail.jsx's Proposals tab — the logged-in buyer's
//      own dashboard view of the same proposal
// These were two separate, drifting implementations before — the
// dashboard version was a much simpler ad-hoc card that didn't match the
// prototype (buyer-proposal-view.html) at all, which is exactly what was
// reported. Rather than hand-copy the same 700 lines a second time (and
// have them drift again), this component takes the proposal data and a
// couple of action callbacks as props, and is 100% identical either way
// it's used.
//
// Rebuilt directly against buyer-proposal-view.html — same nav, hero,
// prominent action-card right after the hero, concept/past-work/cost/
// timeline/payment/terms/studio boxes, sticky footer actions, and all six
// modals (accept, question, changes, decline, SOW, product quick-view,
// plus the post-accept payment modal). Uses the prototype's OWN color
// palette (C.* below) rather than the shared app tokens — this prototype
// defines --sage/--gold/--purple with different hex values than the rest
// of the app's --gold/--admin tokens, so reusing var(--gold) here would
// silently shift colors. Inline styles throughout, no separate .css file.
//
// Real cost figures come from the same calcLandingCost() the rest of the
// app already uses (utils/calculator.js) — not reimplemented here — so
// the phase totals shown to the buyer are guaranteed consistent with
// what admin/studio see, not a separate approximation.

import { useState } from 'react';
import { calcLandingCost, sanitizeForex } from '../../utils/calculator';

// ── Prototype's own palette — NOT the shared app tokens ──
const C = {
  sage: '#7A8C6E', sageD: '#5C6D52', sageDim: '#EFF3EC', sageDim2: '#C8D4C2',
  gold: '#C4953A', goldD: '#9A7020', goldDim: '#FDF5E8', goldDim2: '#E8C87A',
  purple: '#5B4B8A', purpleDim: '#F0EDF8', purpleDim2: '#C4BAE0',
  red: '#C0392B', redDim: '#FDECEA',
  text: '#1A1714', text2: '#4A4540', text3: '#7A736E', text4: '#ADA7A2',
  border: '#EDE9E4', border2: '#DDD7D0',
  surface: '#F8F6F3', surface2: '#F2EEE9', bg: '#FFFFFF',
  phD: '#7A8C6E', phS: '#C4953A', phP: '#5B4B8A',
};
const fh = "'Cormorant Garamond', serif";
const fb = "'DM Sans', sans-serif";

const PHASE_LABEL = { designing: 'Design', sampling: 'Sampling', production: 'Production' };
const PHASE_DOT = { designing: C.phD, sampling: C.phS, production: C.phP };
const PHASE_BADGE = {
  designing: { bg: C.sageDim, color: C.sageD, label: 'Design' },
  design:    { bg: C.sageDim, color: C.sageD, label: 'Design' },
  sampling:  { bg: C.goldDim, color: C.goldD, label: 'Sampling' },
  production:{ bg: C.purpleDim, color: C.purple, label: 'Production' },
};

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtUSD(x) { return `$${Math.round(x || 0).toLocaleString()}`; }

// ── Styles ──
const S = {
  nav: { position: 'sticky', top: 0, zIndex: 200, background: C.bg, borderBottom: `1px solid ${C.border}`, padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', gap: 14 },
  navBrand: { fontFamily: fh, fontSize: 20, fontWeight: 600, letterSpacing: '.01em', flexShrink: 0, color: C.text },
  navDivider: { width: 1, height: 20, background: C.border2, flexShrink: 0 },
  navCtx: { fontSize: 13, color: C.text3, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },

  page: { maxWidth: 600, margin: '0 auto', padding: '36px 20px 140px', fontFamily: fb, color: C.text, fontSize: 15, lineHeight: 1.6 },
  pageEmbedded: { maxWidth: 600, margin: '0 auto', padding: '0 0 20px', fontFamily: fb, color: C.text, fontSize: 15, lineHeight: 1.6 },

  heroEye: { fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.12em', color: C.sage, marginBottom: 10 },
  heroTitle: { fontFamily: fh, fontSize: 38, fontWeight: 500, color: C.text, lineHeight: 1.15, marginBottom: 8 },
  heroBy: { fontSize: 15, color: C.text3, marginBottom: 18 },
  heroChip: { fontSize: 12, color: C.text3, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: '4px 12px' },

  actionCard: { background: C.sageDim, border: `1px solid ${C.sageDim2}`, borderRadius: 10, padding: '22px 22px 18px', marginBottom: 28 },
  actionCardTitle: { fontSize: 13, fontWeight: 600, color: C.sageD, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.08em' },
  actionCardSub: { fontSize: 13, color: C.text3, marginBottom: 18, lineHeight: 1.6 },

  btn: { fontFamily: fb, fontSize: 15, fontWeight: 500, borderRadius: 8, padding: '13px 20px', cursor: 'pointer', border: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, lineHeight: 1, width: '100%', justifyContent: 'center' },
  btnAccept: { background: C.sage, color: '#fff', fontSize: 16, fontWeight: 600, padding: '15px 20px' },
  btnOutline: { background: C.bg, color: C.text2, border: `1.5px solid ${C.border2}` },
  btnDecline: { background: 'none', color: C.text4, border: 'none', fontSize: 13, textDecoration: 'underline', padding: '6px 0', width: 'auto', justifyContent: 'flex-start' },
  actionNote: { fontSize: 12, color: C.text4, marginTop: 12, lineHeight: 1.5 },

  sbox: { border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden', background: C.bg, marginBottom: 16 },
  sboxHd: { padding: '14px 20px', background: C.surface, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  sboxLbl: { fontSize: 13, fontWeight: 600, color: C.text2 },
  sboxBd: { padding: 20 },

  conceptPdf: { display: 'flex', alignItems: 'center', gap: 14, background: C.surface2, padding: '16px 20px', borderBottom: `1px solid ${C.border}`, cursor: 'pointer' },
  conceptTitle: { fontFamily: fh, fontSize: 19, fontWeight: 500, marginBottom: 6 },
  conceptDesc: { fontSize: 14, color: C.text2, lineHeight: 1.7 },

  accRow: (first) => ({ borderTop: first ? 'none' : `2px solid ${C.border2}` }),
  accHead: { display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', cursor: 'pointer', userSelect: 'none', background: C.surface },
  accTitle: { flex: 1, fontSize: 15, fontWeight: 500, color: C.text },
  accSub: { fontSize: 13, color: C.text3, fontWeight: 400 },
  accChev: { fontSize: 13, color: C.text3, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5 },
  accHint: { fontSize: 11, color: C.text4 },
  accBody: { borderTop: `2px solid ${C.border2}`, background: C.bg },

  pwThumbWrap: { position: 'relative', width: 76, height: 48, flexShrink: 0 },
  pwThumb: (bg, left, z) => ({ position: 'absolute', width: 48, height: 48, borderRadius: 6, border: '2px solid #fff', background: bg, left, top: z === 3 ? 0 : 1, zIndex: z }),
  pwTag: { fontSize: 12, color: C.text3, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: '2px 10px' },
  pwDetail: { padding: '16px 20px', background: C.surface },
  piecesGrid: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 12 },
  piece: { border: `1px solid ${C.border}`, borderRadius: 7, overflow: 'hidden', background: C.bg, cursor: 'pointer' },
  pieceName: { fontSize: 11, padding: '4px 7px', color: C.text3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  pwNote: { fontSize: 13, color: C.text3, lineHeight: 1.65, fontStyle: 'italic', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 7, padding: '10px 14px' },

  phDivider: { padding: '10px 20px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.1em', color: C.text3, background: '#E8E4DE', borderTop: `2px solid ${C.border2}`, borderBottom: `2px solid ${C.border2}` },
  phDot: (bg) => ({ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, background: bg }),
  phTotal: { fontSize: 14, fontWeight: 600, color: C.text },
  phItem: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '14px 20px', borderBottom: `1px solid ${C.border}`, background: C.bg },
  phItemName: { fontSize: 15, fontWeight: 500, color: C.text, marginBottom: 5 },
  phItemTag: { fontSize: 12, color: C.text3, background: '#EDEAE5', borderRadius: 20, padding: '2px 9px' },
  phItemPrice: { fontFamily: fh, fontSize: 22, fontWeight: 500, color: C.text, whiteSpace: 'nowrap', flexShrink: 0 },
  phDesc: { margin: '12px 16px 16px', padding: '12px 14px', fontSize: 13, color: C.text3, lineHeight: 1.7, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 7 },
  ddpNote: { display: 'flex', alignItems: 'flex-start', gap: 9, background: C.sageDim, borderTop: `2px solid ${C.border2}`, padding: '12px 20px', fontSize: 13, color: C.sageD, lineHeight: 1.6 },

  tlTrack: { padding: '20px 20px 8px', position: 'relative' },
  tlEvent: { display: 'flex', gap: 14, marginBottom: 22, alignItems: 'flex-start' },
  tlDot: (bg, outline) => ({ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 3, border: '2px solid #fff', outline: `2px solid ${outline}`, background: bg }),
  tlDate: { fontSize: 12, fontWeight: 600, color: C.text3, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 2 },
  tlLabel: { fontSize: 15, fontWeight: 500, color: C.text },
  tlSub: { fontSize: 13, color: C.text3, marginTop: 2, lineHeight: 1.55 },

  table: { width: '100%', borderCollapse: 'collapse' },
  th: { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', color: C.text4, padding: '10px 20px', textAlign: 'left', background: '#EDEAE5', borderBottom: `2px solid ${C.border2}` },
  td: { fontSize: 13, color: C.text2, padding: '12px 20px', borderBottom: `1px solid ${C.border}`, verticalAlign: 'middle' },
  badge: (bg, color) => ({ display: 'inline-flex', alignItems: 'center', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', padding: '3px 9px', borderRadius: 20, background: bg, color }),
  payNote: { padding: '14px 20px', fontSize: 12, color: C.text4, lineHeight: 1.65, borderTop: `1px solid ${C.border}`, background: C.surface },

  termsDesc: { padding: '16px 20px', fontSize: 13, color: C.text2, lineHeight: 1.7, borderBottom: `1px solid ${C.border}` },
  termLi: { display: 'flex', gap: 12, fontSize: 14, color: C.text2, lineHeight: 1.65, padding: '13px 20px', borderBottom: `1px solid ${C.border}`, listStyle: 'none' },
  sowRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 20px', background: C.surface, borderTop: `1px solid ${C.border}` },
  sowLink: { fontSize: 13, fontWeight: 500, color: C.sage, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, border: `1px solid ${C.sageDim2}`, borderRadius: 7, padding: '7px 14px', background: C.sageDim, cursor: 'pointer' },

  studioCard: { display: 'flex', gap: 16, alignItems: 'flex-start', padding: 20 },
  studioAv: { width: 52, height: 52, borderRadius: 10, background: 'linear-gradient(135deg,#D8C9B5,#B09A84)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fh, fontSize: 20, fontWeight: 600, color: '#7A6A55' },
  studioName: { fontFamily: fh, fontSize: 18, fontWeight: 600, color: C.text, marginBottom: 3 },
  studioLoc: { fontSize: 12, color: C.text3, marginBottom: 10 },
  stag: { fontSize: 12, color: C.text2, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: '3px 10px' },
  studioNote: { fontSize: 13, color: C.text4, lineHeight: 1.6, fontStyle: 'italic', marginBottom: 12 },

  footerActs: { borderTop: `2px solid ${C.border}`, background: C.bg, padding: '16px 24px 20px', position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100 },
  footerActsEmbedded: { borderTop: `2px solid ${C.border}`, background: C.bg, padding: '16px 0 4px', marginTop: 12 },
  faInner: { maxWidth: 600, margin: '0 auto' },
  faLabel: { fontSize: 12, color: C.text3, marginBottom: 10, textAlign: 'center' },
  faBtnSm: { fontSize: 13, padding: '10px 16px', whiteSpace: 'nowrap', flexShrink: 0, borderRadius: 7, cursor: 'pointer', fontFamily: fb, border: `1.5px solid ${C.border2}`, background: C.bg, color: C.text2 },

  modalBd: { position: 'fixed', inset: 0, background: 'rgba(15,12,20,.45)', zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modal: { background: C.bg, borderRadius: 12, width: '100%', maxWidth: 460, boxShadow: '0 16px 56px rgba(0,0,0,.22)', overflow: 'hidden', position: 'relative' },
  modalHd: { padding: '22px 22px 16px', borderBottom: `1px solid ${C.border}` },
  modalTitle: { fontFamily: fh, fontSize: 22, fontWeight: 500, color: C.text },
  modalSub: { fontSize: 13, color: C.text3, marginTop: 5, lineHeight: 1.6 },
  modalBdInner: { padding: '18px 22px' },
  modalFt: { padding: '14px 22px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 10, justifyContent: 'flex-end' },
  modalX: { position: 'absolute', top: 16, right: 18, background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.text3, padding: '2px 6px', lineHeight: 1 },
  mLbl: { fontSize: 12, fontWeight: 600, color: C.text3, marginBottom: 7, display: 'block' },
  mta: { width: '100%', height: 100, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', fontSize: 14, fontFamily: fb, color: C.text, background: C.bg, resize: 'none', outline: 'none', boxSizing: 'border-box', lineHeight: 1.55 },
  mIcon: { fontSize: 40, textAlign: 'center', marginBottom: 12 },
  btnModalMain: { fontFamily: fb, fontSize: 14, fontWeight: 600, borderRadius: 8, padding: '11px 20px', cursor: 'pointer', border: 'none', background: C.sage, color: '#fff' },
  btnModalSec: { fontFamily: fb, fontSize: 14, fontWeight: 400, borderRadius: 8, padding: '11px 20px', cursor: 'pointer', border: `1.5px solid ${C.border2}`, background: C.bg, color: C.text2 },
};

function Accordion({ first, dot, title, sub, right, children, isOpen, onToggle }) {
  return (
    <div style={S.accRow(first)}>
      <div style={S.accHead} onClick={onToggle}>
        {dot && <div style={S.phDot(dot)} />}
        <div style={S.accTitle}>{title} {sub && <span style={S.accSub}>— {sub}</span>}</div>
        {right}
        <span style={S.accChev}>{!dot && <span style={S.accHint}>{isOpen ? 'tap to collapse' : 'tap to expand'}</span>} {isOpen ? '▲' : '▼'}</span>
      </div>
      {isOpen && <div style={S.accBody}>{children}</div>}
    </div>
  );
}

function ActionModal({ title, sub, label, required, placeholder, danger, confirmLabel, submitting, onSubmit, onClose, icon }) {
  const [text, setText] = useState('');
  return (
    <div style={S.modalBd} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={S.modal}>
        <div style={{ ...S.modalHd, ...(icon ? { textAlign: 'center', paddingTop: 26 } : {}) }}>
          {icon && <div style={S.mIcon}>{icon}</div>}
          <div style={S.modalTitle}>{title}</div>
          <div style={S.modalSub}>{sub}</div>
        </div>
        <div style={S.modalBdInner}>
          <span style={S.mLbl}>{label} {required ? <span style={{ color: '#D04A02' }}>*</span> : <span style={{ color: C.text4, fontWeight: 400 }}>(optional)</span>}</span>
          <textarea style={{ ...S.mta, ...(required ? {} : { height: 80 }) }} placeholder={placeholder} value={text} onChange={e => setText(e.target.value)} />
        </div>
        <div style={S.modalFt}>
          <button style={S.btnModalSec} onClick={onClose}>{danger ? 'Keep it open' : 'Cancel'}</button>
          <button style={{ ...S.btnModalMain, ...(danger ? { background: C.red } : {}) }} disabled={submitting} onClick={() => onSubmit(text)}>
            {submitting ? 'Sending…' : confirmLabel}
          </button>
        </div>
        <button style={S.modalX} onClick={onClose}>×</button>
      </div>
    </div>
  );
}

function SuccessModal({ icon, title, sub, onClose }) {
  return (
    <div style={S.modalBd} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={S.modal}>
        <div style={{ ...S.modalHd, textAlign: 'center', padding: '28px 22px 18px' }}>
          <div style={S.mIcon}>{icon}</div>
          <div style={S.modalTitle}>{title}</div>
          <div style={{ ...S.modalSub, marginTop: 8 }}>{sub}</div>
        </div>
        <div style={{ ...S.modalFt, justifyContent: 'center' }}>
          <button style={S.btnModalMain} onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

function SOWModal({ proposal, onClose }) {
  const sections = [
    ['1. Parties', `This Agreement is between ${proposal.buyer_name || 'the Buyer'} (Buyer), ${proposal.studio_info?.name || 'the Studio'} (Studio), and Qala Global Pvt Ltd (Platform), effective on the date of Buyer acceptance.`],
    ['2. Scope of Work', 'Design, sample, and produce the agreed units across the styles set out above, to approved tech packs, shipped DDP to the Buyer. All goods to conform to the approved sample.'],
    ['3. Quality', 'The approved sample is the quality benchmark. Buyer has 7 days from delivery to raise a quality claim. Qala mediates all claims with the Studio directly.'],
    ['4. Ownership', 'All design files transfer to Buyer on payment of the design fee. The Studio may not reproduce designs for other buyers. Buyer receives exclusive commercial rights to all assets.'],
    ['5. Payments', 'Payments are milestone-triggered per the Payment Schedule. Qala issues each payment link. Nothing is charged automatically.'],
    ['6. Export', 'Qala acts as exporter of record. All shipments are delivered duty paid — Buyer receives goods cleared with no customs liability at destination.'],
    ['7. Disputes', 'All disputes are first mediated by Qala. If unresolved within 30 days, disputes go to binding arbitration under SIAC rules, conducted in English.'],
  ];
  return (
    <div style={S.modalBd} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ ...S.modal, maxWidth: 500 }}>
        <div style={S.modalHd}>
          <div style={S.modalTitle}>Full Agreement</div>
          <div style={S.modalSub}>{proposal.project_name} · {proposal.buyer_name} × {proposal.studio_info?.name} × Qala · {fmtDate(proposal.submitted_at)}</div>
        </div>
        <div style={{ maxHeight: '55vh', overflowY: 'auto' }}>
          {sections.map(([t, body]) => (
            <div key={t} style={{ padding: '16px 22px', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.1em', color: C.text4, marginBottom: 8 }}>{t}</div>
              <p style={{ fontSize: 13, color: C.text2, lineHeight: 1.7 }}>{body}</p>
            </div>
          ))}
        </div>
        <div style={{ ...S.modalFt, justifyContent: 'space-between' }}>
          <span style={S.sowLink}>⬇ Download PDF</span>
          <button style={S.btnModalMain} onClick={onClose}>Close</button>
        </div>
        <button style={S.modalX} onClick={onClose}>×</button>
      </div>
    </div>
  );
}

function QuickViewModal({ piece, onClose }) {
  const [imgIdx, setImgIdx] = useState(0);
  const images = piece.images?.length ? piece.images : [piece.image_url].filter(Boolean);
  const specs = [
    ['Garment type', piece.garment_type], ['Fabric', piece.fabric],
    ['Craft technique', piece.technique], ['Dyes used', piece.dyes_used],
    ['Gender', piece.gender], ['Occasion', piece.occasion],
    ['Season', piece.season], ['Silhouette', piece.silhouette],
    ['Sustainability', piece.sustainability], ['Care instructions', piece.care_instructions],
  ].filter(([, v]) => v);
  return (
    <div style={S.modalBd} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ ...S.modal, maxWidth: 440 }}>
        <div style={{ position: 'relative', background: C.surface2, borderRadius: '12px 12px 0 0', overflow: 'hidden' }}>
          <div style={{ aspectRatio: '4/3', width: '100%', position: 'relative', background: images[imgIdx] ? `url(${images[imgIdx]}) center/cover` : C.surface2 }} />
          {images.length > 1 && (
            <>
              <button onClick={() => setImgIdx((imgIdx - 1 + images.length) % images.length)} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,.9)', border: 'none', borderRadius: '50%', width: 34, height: 34, fontSize: 20, cursor: 'pointer', color: C.text2 }}>‹</button>
              <button onClick={() => setImgIdx((imgIdx + 1) % images.length)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,.9)', border: 'none', borderRadius: '50%', width: 34, height: 34, fontSize: 20, cursor: 'pointer', color: C.text2 }}>›</button>
            </>
          )}
        </div>
        <div style={{ padding: '16px 22px 14px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontFamily: fh, fontSize: 22, fontWeight: 500, color: C.text, marginBottom: 4 }}>{piece.name}</div>
          <div style={{ fontSize: 12, color: C.text4, marginBottom: 8 }}>{piece.collection_name}</div>
        </div>
        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
          {specs.map(([lbl, val]) => (
            <div key={lbl} style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: C.text4, padding: '10px 12px 10px 22px', background: C.surface }}>{lbl}</div>
              <div style={{ fontSize: 13, color: C.text2, padding: '10px 22px 10px 12px', lineHeight: 1.5 }}>{val}</div>
            </div>
          ))}
        </div>
        <div style={S.modalFt}><button style={S.btnModalMain} onClick={onClose}>Close</button></div>
        <button style={S.modalX} onClick={onClose}>×</button>
      </div>
    </div>
  );
}

// ── Main exported component ──────────────────────────────────────────────
// proposal    — required, the full proposal object
// onAccept(notes)          — async, called when buyer confirms acceptance
// onAction(type, message)  — async, type: 'question'|'changes_requested'|'declined'
// navContext  — string shown in the top nav strip ("<project> · <studio>")
// embedded    — true when rendered inside the logged-in buyer dashboard
//               (suppresses the standalone nav bar and switches the
//               footer from a page-fixed bar to a normal in-card block,
//               since multiple proposals can be listed on one page there)
export default function ProposalCarbonCopy({ proposal, onAccept, onAction, navContext, embedded = false }) {
  const [openAcc, setOpenAcc] = useState({});
  const [modal, setModal] = useState(null);
  const [success, setSuccess] = useState(null);
  const [quickView, setQuickView] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const toggleAcc = (id) => setOpenAcc(o => ({ ...o, [id]: !o[id] }));

  const forex = sanitizeForex(proposal.forex_rate_usd_inr);
  const calc = calcLandingCost({
    lineItems: proposal.line_items || [],
    boxes: proposal.boxes || [],
    forex,
    pfPctByPhase: {
      designing:  proposal.platform_fee_design_pct     != null ? parseFloat(proposal.platform_fee_design_pct)     : 0.04,
      sampling:   proposal.platform_fee_sampling_pct    != null ? parseFloat(proposal.platform_fee_sampling_pct)   : 0.10,
      production: proposal.platform_fee_production_pct  != null ? parseFloat(proposal.platform_fee_production_pct) : 0.15,
    },
    advancePct: (proposal.advance_pct || 50) / 100,
  });
  const items = calc.items || [];
  // amount_usd on Milestone is never computed or saved anywhere in the
  // backend — the admin milestone form only captures a percentage — so it
  // was always null/blank on every real milestone. Computing it live here
  // from the same verified calc.byPhase totals instead of trusting a
  // field nothing ever populates.
  const MS_PHASE_TO_CALC = { design: 'designing', sampling: 'sampling', production: 'production' };
  const milestoneAmountUSD = (m) => {
    const phaseKey = MS_PHASE_TO_CALC[m.phase];
    const phaseTotal = calc.byPhase?.[phaseKey]?.subtotal || 0;
    return (parseFloat(m.percentage) || 0) / 100 * phaseTotal;
  };
  const canAct = proposal.status === 'sent_to_buyer' && !proposal.is_expired && !accepted;

  const doAccept = async (notes) => {
    setSubmitting(true);
    try {
      await onAccept(notes);
      setModal(null);
      setAccepted(true);
      setModal('payment');
    } catch (e) {
      alert(e?.response?.data?.message || 'Could not accept — please refresh and try again.');
    } finally { setSubmitting(false); }
  };
  const doAction = async (type, text, successMsg) => {
    if ((type === 'question' || type === 'changes_requested') && !text.trim()) return;
    setSubmitting(true);
    try {
      await onAction(type, text);
      setModal(null);
      setSuccess(successMsg);
    } catch (e) {
      alert(e?.response?.data?.message || 'Could not send — please try again.');
    } finally { setSubmitting(false); }
  };

  return (
    <div style={{ background: embedded ? 'transparent' : C.bg, minHeight: embedded ? 'auto' : '100vh' }}>
      {!embedded && (
        <nav style={S.nav}>
          <div style={S.navBrand}>Qa<span style={{ color: C.sage }}>la</span></div>
          <div style={S.navDivider} />
          <div style={S.navCtx}>{navContext}</div>
        </nav>
      )}

      <div style={embedded ? S.pageEmbedded : S.page}>
        <div style={{ marginBottom: 32 }}>
          <div style={S.heroEye}>Proposal</div>
          <div style={S.heroTitle}>{proposal.concept_title || proposal.project_name}</div>
          <div style={S.heroBy}>Prepared by {proposal.studio_info?.name}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {proposal.submitted_at && <span style={S.heroChip}>Submitted {fmtDate(proposal.submitted_at)}</span>}
            <span style={S.heroChip}>Reviewed by Qala</span>
            {proposal.valid_until && <span style={S.heroChip}>{proposal.is_expired ? 'Expired' : 'Valid until'} {fmtDate(proposal.valid_until)}</span>}
          </div>
        </div>

        {canAct && (
          <div style={S.actionCard}>
            <div style={S.actionCardTitle}>Your response needed</div>
            <div style={S.actionCardSub}>Review the details below, then accept to move forward, or ask a question first.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button style={{ ...S.btn, ...S.btnAccept }} onClick={() => setModal('accept')}>✓ Accept proposal</button>
              <button style={{ ...S.btn, ...S.btnOutline }} onClick={() => setModal('question')}>Ask a question</button>
              <button style={{ ...S.btn, ...S.btnDecline }} onClick={() => setModal('decline')}>Decline this proposal</button>
            </div>
            <div style={S.actionNote}>Valid until {fmtDate(proposal.valid_until)}. Need help? <a style={{ color: C.sage }} href="mailto:hello@qala.studio">Email Qala</a></div>
          </div>
        )}

        {/* PAYMENT STATUS — persistent, not just a one-time modal */}
        {proposal.status === 'accepted' && (proposal.milestones || []).length > 0 && (
          <div style={{ ...S.actionCard, background: C.sageDim, border: `1px solid ${C.sageDim2}` }}>
            <div style={S.actionCardTitle}>✓ Proposal accepted — payment status</div>
            <div style={S.actionCardSub}>{proposal.studio_info?.name} has been notified. Pay each milestone as it comes due — you'll also get these links by email.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {proposal.milestones.map(m => {
                const b = PHASE_BADGE[m.phase] || PHASE_BADGE.production;
                return (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px 14px' }}>
                    <span style={S.badge(b.bg, b.color)}>{b.label}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{m.trigger_label}</div>
                      <div style={{ fontSize: 12, color: C.text3 }}>{m.percentage}% · {fmtUSD(milestoneAmountUSD(m))}</div>
                    </div>
                    {m.is_paid ? (
                      <span style={{ fontSize: 12, fontWeight: 600, color: C.sageD, whiteSpace: 'nowrap' }}>✓ Paid</span>
                    ) : m.payment_link_url ? (
                      <a href={m.payment_link_url} target="_blank" rel="noreferrer" style={{ fontSize: 13, fontWeight: 600, color: '#fff', background: C.sage, borderRadius: 7, padding: '8px 16px', textDecoration: 'none', whiteSpace: 'nowrap' }}>Pay now →</a>
                    ) : (
                      <span style={{ fontSize: 12, color: C.text4, whiteSpace: 'nowrap' }}>Link coming soon</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CONCEPT */}
        <div style={S.sbox}>
          <div style={S.sboxHd}><span style={S.sboxLbl}>Concept</span></div>
          {proposal.concept_pdf_url && (
            <div style={S.conceptPdf} onClick={() => window.open(proposal.concept_pdf_url, '_blank')}>
              <span style={{ fontSize: 30 }}>📄</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: C.text2 }}>{proposal.concept_pdf_name || 'Concept file'}</div>
                <div style={{ fontSize: 12, color: C.text4, marginTop: 2 }}>Tap to preview</div>
              </div>
              <div style={{ marginLeft: 'auto', fontSize: 13, color: C.sage, fontWeight: 500 }}>Open ›</div>
            </div>
          )}
          <div style={S.sboxBd}>
            <div style={S.conceptTitle}>{proposal.concept_title}</div>
            <p style={{ ...S.conceptDesc, marginTop: 6 }}>{proposal.concept_description}</p>
          </div>
        </div>

        {/* PAST WORK */}
        {(proposal.past_projects || []).length > 0 && (
          <div style={S.sbox}>
            <div style={S.sboxHd}>
              <span style={S.sboxLbl}>Past work — relevant to your brief</span>
              <span style={{ fontSize: 12, color: C.text4 }}>Tap a collection to see pieces</span>
            </div>
            {proposal.past_projects.map((coll, i) => {
              const id = `pw${i}`;
              const pieces = coll.pieces || [];
              return (
                <Accordion key={id} first={i === 0} title={coll.name || coll.collection_name}
                  sub={null} isOpen={!!openAcc[id]} onToggle={() => toggleAcc(id)}
                  right={<div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 500, color: C.text }}>{coll.name || coll.collection_name}</div>
                    <div style={{ fontSize: 13, color: C.text3, marginTop: 2 }}>{coll.pieces_count || pieces.length} pieces{coll.year ? ` · ${coll.year}` : ''}</div>
                    {(coll.tags || []).length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>{coll.tags.map(t => <span key={t} style={S.pwTag}>{t}</span>)}</div>}
                  </div>}>
                  <div style={S.pwDetail}>
                    <div style={S.piecesGrid}>
                      {pieces.map((p, j) => (
                        <div key={j} style={S.piece} onClick={() => setQuickView({ ...p, collection_name: coll.name || coll.collection_name })}>
                          <div style={{ width: '100%', aspectRatio: '1', background: p.image_url ? `url(${p.image_url}) center/cover` : C.surface2 }} />
                          <div style={S.pieceName}>{p.name}</div>
                        </div>
                      ))}
                    </div>
                    {coll.note && <div style={S.pwNote}>"{coll.note}"</div>}
                  </div>
                </Accordion>
              );
            })}
          </div>
        )}

        {/* COST & SCOPE */}
        <div style={S.sbox}>
          <div style={S.sboxHd}><span style={S.sboxLbl}>Scope and Costs</span></div>
          <div style={S.phDivider}>Breakdown by phase</div>
          {['designing', 'sampling', 'production'].map((phase) => {
            const phaseItems = items.filter(it => it.itemType === phase);
            if (phaseItems.length === 0) return null;
            const phaseTotal = calc.byPhase?.[phase]?.subtotal || 0;
            const prodTotal = phaseItems.reduce((s, it) => s + it.prodUSD, 0) || 1;
            return (
              <Accordion key={phase} first={false} dot={PHASE_DOT[phase]} title={PHASE_LABEL[phase]}
                sub={phase === 'production' ? `${proposal.bulk_quantity || ''} pieces, DDP`.trim() : phase === 'sampling' ? 'One sample per style' : 'Tech packs & artwork'}
                right={<div style={S.phTotal}>{fmtUSD(phaseTotal)}</div>}
                isOpen={!!openAcc[phase]} onToggle={() => toggleAcc(phase)}>
                <div>
                  {phaseItems.map((it, j) => {
                    const itemPrice = it.prodUSD * (phaseTotal / prodTotal);
                    return (
                      <div key={j} style={S.phItem}>
                        <div>
                          <div style={S.phItemName}>{it.name}</div>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {it.category && <span style={S.phItemTag}>{it.category}</span>}
                            {it.qty > 1 && <span style={S.phItemTag}>{it.qty} pieces</span>}
                          </div>
                        </div>
                        <div style={S.phItemPrice}>{fmtUSD(itemPrice)}</div>
                      </div>
                    );
                  })}
                </div>
                {proposal[`${phase}_description`] && <div style={S.phDesc}>{proposal[`${phase}_description`]}</div>}
              </Accordion>
            );
          })}
          <div style={S.ddpNote}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>📦</span>
            <div>
              <div>Price includes delivery to {proposal.buyer_name || 'you'} — cleared through customs, nothing extra to pay on arrival.</div>
              <div style={{ marginTop: 5, fontSize: 12, color: C.sageD, opacity: .85 }}>Payment gateway fee (charged at each milestone): <strong>5% card · 1% bank transfer</strong></div>
            </div>
          </div>
        </div>

        {/* TIMELINE */}
        <div style={S.sbox}>
          <div style={S.sboxHd}><span style={S.sboxLbl}>Timeline</span></div>
          <div style={S.tlTrack}>
            {[
              ['Design handover', proposal.design_handover_date, C.phD, C.sageDim2, 'Tech packs, print layouts, and colour specs delivered for your approval'],
              ['Samples dispatched', proposal.sample_dispatch_date, C.phS, C.goldDim, 'Samples shipped — delivery to you approx. 3–5 days'],
            ].filter(([, date]) => date).map(([label, date, dot, outline, sub]) => (
              <div key={label} style={S.tlEvent}>
                <div style={S.tlDot(dot, outline)} />
                <div>
                  <div style={S.tlDate}>{fmtDate(date)}</div>
                  <div style={S.tlLabel}>{label}</div>
                  <div style={S.tlSub}>{sub}</div>
                </div>
              </div>
            ))}
            {proposal.sample_dispatch_date && (
              <div style={S.tlEvent}>
                <div style={S.tlDot('#B5683C', '#EAC9B2')} />
                <div>
                  <div style={S.tlDate}>After you approve samples</div>
                  <div style={S.tlLabel}>Bulk production begins</div>
                  <div style={S.tlSub}>Studio starts immediately on your written sign-off</div>
                </div>
              </div>
            )}
            {[
              ['Bulk dispatch', proposal.bulk_dispatch_date, C.phP, C.purpleDim2, 'All pieces shipped via DHL Express'],
              ['Delivery to buyer', proposal.bulk_delivery_date, '#3A6B52', '#9EC4B0', 'Cleared through customs, delivered to your door'],
            ].filter(([, date]) => date).map(([label, date, dot, outline, sub]) => (
              <div key={label} style={S.tlEvent}>
                <div style={S.tlDot(dot, outline)} />
                <div>
                  <div style={S.tlDate}>{fmtDate(date)}</div>
                  <div style={S.tlLabel}>{label}</div>
                  <div style={S.tlSub}>{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PAYMENT SCHEDULE */}
        {(proposal.milestones || []).length > 0 && (
          <div style={S.sbox}>
            <div style={S.sboxHd}><span style={S.sboxLbl}>Payment schedule</span></div>
            <table style={S.table}>
              <thead><tr><th style={S.th}>Phase</th><th style={S.th}>When you pay</th><th style={{ ...S.th, textAlign: 'center' }}>%</th><th style={{ ...S.th, textAlign: 'right' }}>Amount</th></tr></thead>
              <tbody>
                {proposal.milestones.map(m => {
                  const b = PHASE_BADGE[m.phase] || PHASE_BADGE.production;
                  return (
                    <tr key={m.id}>
                      <td style={S.td}><span style={S.badge(b.bg, b.color)}>{b.label}</span></td>
                      <td style={{ ...S.td, fontWeight: 500, color: C.text }}>{m.trigger_label}</td>
                      <td style={{ ...S.td, textAlign: 'center', color: C.text3 }}>{m.percentage}%</td>
                      <td style={{ ...S.td, textAlign: 'right', fontWeight: 600, color: C.text }}>{fmtUSD(milestoneAmountUSD(m))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={S.payNote}>Qala sends you a payment link for each milestone — nothing is charged automatically.</div>
          </div>
        )}

        {/* KEY TERMS */}
        <div style={S.sbox}>
          <div style={S.sboxHd}><span style={S.sboxLbl}>Key Terms</span></div>
          <div style={S.termsDesc}>
            The Agreement is a legally binding three-party contract between you, {proposal.studio_info?.name}, and Qala — covering scope, quality, IP, payments, and dispute resolution. <strong>Please read it in full before accepting.</strong>
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {[
              'Price includes delivery to your door — all customs cleared, no surprise charges on arrival.',
              'Quality benchmark is the approved sample. Anything that deviates is covered under our quality guarantee.',
              'You have 7 days from delivery to raise a quality concern. Qala manages it directly with the studio.',
              'All design files (tech packs, print artwork) transfer to you once the design fee is paid.',
              'The studio produces exclusively for you — your designs will not be made for any other buyer.',
              'Qala handles all export paperwork and acts as exporter of record.',
            ].map(t => (
              <li key={t} style={S.termLi}><span style={{ color: C.sage, fontWeight: 700, flexShrink: 0, fontSize: 15 }}>✓</span>{t}</li>
            ))}
          </ul>
          <div style={S.sowRow}>
            <span style={{ fontSize: 12, color: C.text3, lineHeight: 1.5 }}>Binding from the date of your acceptance.</span>
            <span style={S.sowLink} onClick={() => setModal('sow')}>📄 Read full agreement</span>
          </div>
        </div>

        {/* STUDIO */}
        <div style={S.sbox}>
          <div style={S.sboxHd}><span style={S.sboxLbl}>About the studio</span></div>
          <div style={S.studioCard}>
            <div style={S.studioAv}>{(proposal.studio_info?.name || '?')[0]}</div>
            <div style={{ flex: 1 }}>
              <div style={S.studioName}>{proposal.studio_info?.name}</div>
              <div style={S.studioLoc}>{proposal.studio_info?.location || '—'}</div>
              {(proposal.studio_info?.techniques || []).length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                  {proposal.studio_info.techniques.map(t => <span key={t} style={S.stag}>{t}</span>)}
                </div>
              )}
              {proposal.studio_info?.bio && <div style={S.studioNote}>"{proposal.studio_info.bio}"</div>}
              <div style={{ paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                {proposal.studio_info?.studio_slug ? (
                  <a href={`/${proposal.studio_info.studio_slug}`} target="_blank" rel="noreferrer" style={{ fontSize: 13, fontWeight: 500, color: C.sage, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}>View studio profile →</a>
                ) : (
                  <span style={{ fontSize: 13, color: C.text4 }}>Studio profile not available yet</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER ACTIONS */}
      {canAct && (
        <div style={embedded ? S.footerActsEmbedded : S.footerActs}>
          <div style={S.faInner}>
            <div style={S.faLabel}>Valid until {fmtDate(proposal.valid_until)} &nbsp;·&nbsp; Need help? Email Qala</div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button style={S.faBtnSm} onClick={() => setModal('question')}>Ask a question</button>
              <button style={S.faBtnSm} onClick={() => setModal('changes')}>Request changes</button>
              <button style={{ ...S.btn, ...S.btnAccept, flex: 1 }} onClick={() => setModal('accept')}>✓ Accept proposal</button>
            </div>
          </div>
        </div>
      )}

      {modal === 'accept' && (
        <ActionModal icon="✅" title="Accept this proposal?"
          sub={`Qalawati will notify ${proposal.studio_info?.name} and add this to your project. You'll receive an order confirmation and your first payment link by email.`}
          label="Notes to studio" required={false} placeholder="Anything you'd like the studio to know before they start…"
          confirmLabel="✓ Confirm acceptance" submitting={submitting} onSubmit={doAccept} onClose={() => setModal(null)} />
      )}
      {modal === 'question' && (
        <ActionModal title="Ask a question" sub="Qalawati will add your question to the project email thread and notify the studio."
          label="Your question" required placeholder="e.g. Can you share more block options? / What happens if we reduce one style?"
          confirmLabel="Send question" submitting={submitting}
          onSubmit={(text) => doAction('question', text, { icon: '💬', title: 'Question sent', sub: `Qalawati has added your question to the project email thread.` })}
          onClose={() => setModal(null)} />
      )}
      {modal === 'changes' && (
        <ActionModal title="Request changes" sub="Describe what you'd like adjusted. Qalawati will forward this to the studio on your shared email thread."
          label="What needs to change?" required placeholder="e.g. Increase quantity · Cooler palette · Can design take 3 weeks?"
          confirmLabel="Request changes" submitting={submitting}
          onSubmit={(text) => doAction('changes_requested', text, { icon: '✏️', title: 'Changes requested', sub: 'Qalawati has forwarded your notes to the studio. They will respond within 2 business days.' })}
          onClose={() => setModal(null)} />
      )}
      {modal === 'decline' && (
        <ActionModal title="Decline this proposal" sub="You can always come back if you change your mind. Qala will let the studio know."
          label="Reason" required={false} placeholder="e.g. Budget too high · Timeline doesn't work · Going with another studio" danger
          confirmLabel="Decline proposal" submitting={submitting}
          onSubmit={(text) => doAction('declined', text, { icon: '🙏', title: 'Proposal declined', sub: "Thank you for letting us know. Qalawati has notified the studio. We're here if you change your mind." })}
          onClose={() => setModal(null)} />
      )}
      {modal === 'sow' && <SOWModal proposal={proposal} onClose={() => setModal(null)} />}
      {modal === 'payment' && (
        <div style={S.modalBd}>
          <div style={{ ...S.modal, maxWidth: 420 }}>
            <div style={{ ...S.modalHd, textAlign: 'center', padding: '26px 22px 18px' }}>
              <div style={S.mIcon}>✅</div>
              <div style={S.modalTitle}>Proposal accepted!</div>
              <div style={{ ...S.modalSub, marginTop: 6 }}>{proposal.studio_info?.name} has been notified and will begin once your first payment is confirmed.</div>
            </div>
            {proposal.milestones?.[0] && (
              <div style={{ padding: 0 }}>
                <div style={{ background: C.sageDim, borderTop: `1px solid ${C.sageDim2}`, borderBottom: `1px solid ${C.sageDim2}`, padding: '16px 22px' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.09em', color: C.sageD, marginBottom: 6 }}>First payment due now</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 500, color: C.text }}>{proposal.milestones[0].trigger_label}</div>
                      <div style={{ fontSize: 12, color: C.text3, marginTop: 2 }}>Triggered on proposal acceptance</div>
                    </div>
                    <div style={{ fontFamily: fh, fontSize: 28, fontWeight: 500, color: C.text }}>{fmtUSD(milestoneAmountUSD(proposal.milestones[0]))}</div>
                  </div>
                </div>
                <div style={{ padding: '16px 22px 6px' }}>
                  {proposal.milestones[0].payment_link_url ? (
                    <a href={proposal.milestones[0].payment_link_url} target="_blank" rel="noreferrer"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: C.sage, color: '#fff', fontFamily: fb, fontSize: 16, fontWeight: 600, padding: '14px 20px', borderRadius: 8, textDecoration: 'none', width: '100%', boxSizing: 'border-box' }}>
                      Pay now — {fmtUSD(milestoneAmountUSD(proposal.milestones[0]))} →
                    </a>
                  ) : (
                    <div style={{ fontSize: 13, color: C.text3, textAlign: 'center' }}>Payment link coming shortly by email.</div>
                  )}
                  <div style={{ fontSize: 12, color: C.text4, textAlign: 'center', marginTop: 10, lineHeight: 1.55 }}>Payment link also sent to your email.</div>
                </div>
              </div>
            )}
            <div style={{ ...S.modalFt, justifyContent: 'center', borderTop: `1px solid ${C.border}` }}>
              <button onClick={() => setModal(null)} style={{ fontSize: 12, color: C.text4, background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>I'll pay later via email</button>
            </div>
          </div>
        </div>
      )}
      {success && <SuccessModal icon={success.icon} title={success.title} sub={success.sub} onClose={() => setSuccess(null)} />}
      {quickView && <QuickViewModal piece={quickView} onClose={() => setQuickView(null)} />}
    </div>
  );
}
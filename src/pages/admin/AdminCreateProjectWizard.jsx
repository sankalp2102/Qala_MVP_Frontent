// src/pages/admin/AdminCreateProjectWizard.jsx
//
// Rebuilt against admin-create-project.html — same navbar/step indicator,
// same form sections/labels/copy/placeholder text, same tag lists
// verbatim, same upload zone, same step-2 studio directory (which the
// prototype itself reuses wholesale from admin-assign-studios.html — so
// step 2 here is intentionally the same markup/logic as
// AdminAssignStudios.jsx, just embedded inline instead of a route change,
// matching the prototype's single-page 2-step flow exactly).
//
// Styled with plain inline style objects (S.* below), matching every
// other page in this app — no separate .css file. index.css only holds
// shared design tokens and .btn/.field/.card utility classes; individual
// pages have never shipped their own stylesheet, so this page doesn't
// either (an earlier pass introduced two .css files for this and
// AdminAssignStudios.jsx — removed, converted to inline styles to match
// the rest of the codebase).
//
// Data substitutions where the backend has no equivalent (documented,
// not hidden): no rating system → "—"; Jaipur/Rajasthan/Bengal filters →
// location text search; studio tag chips → matched scoring parameters;
// MOQ/lead time come from real StudioDetails fields.

import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectsAPI } from '../../api/client';

// ── Taxonomy option lists — copied verbatim from admin-create-project.html ──
const OCCASION_TAGS = ['Everyday / Casual', 'Resort / Vacation', 'Formal / Office', 'Occasion wear', 'Bridal & festive', 'Activewear', 'Loungewear', 'Streetwear'];
const PRODUCT_TAGS  = ['Tops & shirts', 'Dresses', 'Trousers & pants', 'Skirts', 'Jackets & coats', 'Co-ord sets', 'Jumpsuits', 'Kurtas & tunics', 'Kaftans', 'Blouses', 'Sarees & wraps', 'Accessories'];
const FABRIC_TAGS   = ['Linen', 'Cotton', 'Silk', 'Wool', 'Cashmere', 'Viscose / Rayon', 'Modal', 'Bamboo', 'Organza', 'Chiffon', 'Georgette', 'Handloom cotton', 'Khadi', 'Chanderi', 'Muslin'];
const PRINT_TAGS    = ['Handblock print', 'Screen print', 'Digital print', 'Batik', 'Kalamkari', 'Discharge print', 'Resist print', 'Tie & dye', 'Shibori', 'Bandhani', 'No print / solid'];
const SURFACE_TAGS  = ['Hand embroidery', 'Machine embroidery', 'Zari / Zardozi', 'Sequins & beading', 'Smocking', 'Appliqué', 'Patchwork', 'Mirror work', 'Cutwork', 'No surface work'];
const DYE_TAGS       = ['Natural dyes', 'Reactive dyes', 'Indigo', 'Azo-free synthetic', 'Acid dyes', 'Vat dyes', 'No preference'];
const DELIVERY_COUNTRIES = ['United States', 'United Kingdom', 'France', 'Germany', 'Netherlands', 'Australia', 'Canada', 'Japan', 'South Korea', 'UAE', 'Singapore', 'Italy', 'Spain', 'Sweden', 'Denmark', 'Switzerland', 'New Zealand'];

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
  navChip: { background: 'rgba(255,255,255,0.15)', color: '#fff', borderRadius: 'var(--r-full)', padding: '3px 10px', fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' },

  stepIndicator: { display: 'flex', alignItems: 'center', gap: 0, margin: '0 auto' },
  stepNode: (active, done) => ({ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 500, color: active ? '#fff' : done ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.45)' }),
  stepNum: (active, done) => ({ width: 22, height: 22, borderRadius: '50%', border: `1.5px solid ${active ? '#fff' : done ? 'var(--gold-l)' : 'rgba(255,255,255,0.30)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0, background: active ? '#fff' : done ? 'var(--gold)' : 'transparent', color: active ? 'var(--admin)' : done ? '#fff' : 'inherit' }),
  stepArrow: { color: 'rgba(255,255,255,0.25)', fontSize: 14, margin: '0 10px' },

  page: { maxWidth: 780, margin: '0 auto', padding: '40px 24px 80px' },
  pageHeaderH1: { fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600, letterSpacing: '.01em', marginBottom: 6 },
  pageHeaderP: { fontSize: 14, color: 'var(--text3)' },

  formSection: { marginBottom: 36, paddingBottom: 36, borderBottom: '1px solid var(--border)' },
  formSectionLast: { marginBottom: 36, paddingBottom: 0, borderBottom: 'none' },
  sectionTitle: { fontSize: 11, fontWeight: 600, letterSpacing: '.10em', textTransform: 'uppercase', color: 'var(--admin)', marginBottom: 20 },

  field: { marginBottom: 18 },
  fieldRowCol2: { display: 'grid', gap: 14, gridTemplateColumns: '1fr 1fr' },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 6, letterSpacing: '.03em' },
  opt: { fontWeight: 400, color: 'var(--text4)', fontSize: 11 },
  input: { width: '100%', fontSize: 14, color: 'var(--text)', background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 'var(--r-8)', padding: '10px 14px', outline: 'none', boxSizing: 'border-box' },

  buyerDropdown: { position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50, background: '#fff', border: '1px solid var(--border2)', borderRadius: 'var(--r-10)', boxShadow: '0 8px 24px rgba(0,0,0,0.10)', overflow: 'hidden' },
  buyerOption: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)' },
  buyerAvatar: { width: 34, height: 34, borderRadius: '50%', background: 'var(--admin-dim2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: 'var(--admin)', flexShrink: 0 },
  buyerOptName: { fontSize: 14, fontWeight: 500 },
  buyerOptBrand: { fontSize: 12, color: 'var(--text3)' },
  buyerSelectedCard: { background: 'var(--admin-dim)', border: '1px solid rgba(91,75,138,0.20)', borderRadius: 'var(--r-10)', padding: '14px 16px', marginTop: 8, display: 'flex', alignItems: 'center', gap: 14 },
  buyerSelAvatar: { width: 40, height: 40, borderRadius: '50%', background: 'var(--admin)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: '#fff', flexShrink: 0 },
  buyerSelName: { fontSize: 15, fontWeight: 600 },
  buyerSelMeta: { fontSize: 12, color: 'var(--text3)', marginTop: 2 },
  buyerSelChange: { marginLeft: 'auto', fontSize: 12, color: 'var(--admin)', cursor: 'pointer', fontWeight: 500 },

  tagGrid: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  tag: (selected) => ({ padding: '7px 14px', borderRadius: 'var(--r-full)', border: `1px solid ${selected ? 'var(--gold-d)' : 'var(--border2)'}`, fontSize: 13, fontWeight: selected ? 500 : 400, color: selected ? '#fff' : 'var(--text2)', cursor: 'pointer', background: selected ? 'var(--gold)' : 'var(--surface)', userSelect: 'none' }),
  tagAddWrap: { display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 },
  tagAddInput: { fontSize: 13, padding: '6px 12px', border: '1px dashed var(--border2)', borderRadius: 'var(--r-full)', outline: 'none', background: 'var(--bg)', color: 'var(--text)', width: 160 },
  tagAddBtn: { padding: '6px 12px', borderRadius: 'var(--r-full)', border: '1px solid var(--border2)', background: 'var(--surface)', fontSize: 12, fontWeight: 600, color: 'var(--admin)', cursor: 'pointer', whiteSpace: 'nowrap' },

  priceRow: { display: 'flex', gap: 10 },

  uploadZone: { border: '1.5px dashed var(--border2)', borderRadius: 'var(--r-10)', padding: '28px 20px', textAlign: 'center', cursor: 'pointer', background: 'var(--surface)' },
  uploadTitle: { fontSize: 14, fontWeight: 500, color: 'var(--text2)', marginBottom: 4 },
  uploadSub: { fontSize: 12, color: 'var(--text4)' },
  uploadFileItem: { display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--r-8)', padding: '10px 14px' },
  uploadFileName: { fontSize: 13, fontWeight: 500, flex: 1 },
  uploadFileSize: { fontSize: 11, color: 'var(--text4)' },
  uploadFileRemove: { fontSize: 16, color: 'var(--text4)', cursor: 'pointer', padding: '0 4px' },

  qalaCommentBox: { background: 'var(--admin-dim)', border: '1px solid rgba(91,75,138,0.20)', borderRadius: 'var(--r-10)', padding: 16 },
  qalaCommentLabel: { fontSize: 11, fontWeight: 600, color: 'var(--admin)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 },

  formActions: { display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 32, marginTop: 8, borderTop: '1px solid var(--border)' },

  btn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14, fontWeight: 500, padding: '11px 22px', borderRadius: 'var(--r-8)', border: 'none', cursor: 'pointer' },
  btnBlock: { width: '100%', display: 'flex' },
  btnSecondary: { background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border2)' },
  btnAdmin: { background: 'var(--admin)', color: '#fff' },
  btnAdminDisabled: { opacity: 0.45, cursor: 'not-allowed' },

  briefStrip: { background: 'var(--admin)', borderBottom: '1px solid rgba(255,255,255,0.10)', padding: '14px 24px', display: 'flex', alignItems: 'flex-start', gap: 32, flexWrap: 'wrap' },
  briefLabel: { fontSize: 10, fontWeight: 600, letterSpacing: '.10em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', marginBottom: 3 },
  briefValue: { fontSize: 13, fontWeight: 500, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220 },
  briefValueMono: { fontFamily: 'monospace', fontSize: 12, letterSpacing: '.04em', background: 'rgba(255,255,255,0.12)', padding: '2px 8px', borderRadius: 'var(--r-4)', display: 'inline-block' },

  pageLayout: { display: 'grid', gridTemplateColumns: '1fr 340px', minHeight: 'calc(100vh - 112px)', maxWidth: 1280, margin: '0 auto' },
  main: { padding: '28px 24px', minWidth: 0 },
  mainHeader: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 },
  mainTitle: { fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600 },
  countChip: { background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 'var(--r-full)', padding: '3px 10px', fontSize: 12, fontWeight: 600, color: 'var(--text2)' },
  searchBar: { display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid var(--border2)', borderRadius: 'var(--r-10)', padding: '10px 14px', marginBottom: 16 },
  searchInput: { flex: 1, border: 'none', outline: 'none', fontSize: 14, color: 'var(--text)', background: 'transparent' },
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

  rightPanel: { background: '#fff', borderLeft: '1px solid var(--border)', position: 'sticky', top: 112, height: 'calc(100vh - 112px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
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

function TagGrid({ options, selected, onToggle, onAddCustom, addLabel }) {
  const [custom, setCustom] = useState('');
  const add = () => { const v = custom.trim(); if (v) onAddCustom(v); setCustom(''); };
  const allTags = [...options, ...selected.filter(s => !options.includes(s))];
  return (
    <div style={S.tagGrid}>
      {allTags.map(opt => (
        <div key={opt} style={S.tag(selected.includes(opt))} onClick={() => onToggle(opt)}>{opt}</div>
      ))}
      <div style={S.tagAddWrap}>
        <input style={S.tagAddInput} placeholder={addLabel} value={custom} onChange={e => setCustom(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />
        <button style={S.tagAddBtn} onClick={add}>+ Add</button>
      </div>
    </div>
  );
}

export default function AdminCreateProjectWizard() {
  const nav = useNavigate();
  const fileRef = useRef(null);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [projectId, setProjectId] = useState(null);

  const [name, setName] = useState('');
  const [buyerSearch, setBuyerSearch] = useState('');
  const [buyerResults, setBuyerResults] = useState([]);
  const [buyer, setBuyer] = useState(null);
  const [projectType, setProjectType] = useState('');
  const [gender, setGender] = useState('');
  const [occasion, setOccasion] = useState([]);
  const [products, setProducts] = useState([]);
  const [fabrics, setFabrics] = useState([]);
  const [printing, setPrinting] = useState([]);
  const [surface, setSurface] = useState([]);
  const [dyes, setDyes] = useState([]);
  const [estQty, setEstQty] = useState('');
  const [priceCurrency, setPriceCurrency] = useState('EUR');
  const [priceAmount, setPriceAmount] = useState('');
  const [priceUnit, setPriceUnit] = useState('dress');
  const [deliveryBulk, setDeliveryBulk] = useState('');
  const [deliveryCountry, setDeliveryCountry] = useState('');
  const [deliveryCity, setDeliveryCity] = useState('');
  const [files, setFiles] = useState([]);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [qalaComments, setQalaComments] = useState('');

  useEffect(() => {
    if (!buyerSearch.trim()) { setBuyerResults([]); return; }
    const t = setTimeout(() => {
      projectsAPI.adminGetCustomers({ q: buyerSearch }).then(r => setBuyerResults(r.data.customers || [])).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [buyerSearch]);

  const toggle = (list, setList, val) => setList(list.includes(val) ? list.filter(v => v !== val) : [...list, val]);

  const createProject = async () => {
    setError('');
    setSaving(true);
    try {
      const projRes = await projectsAPI.adminCreateProject({ name, buyer_user_id: buyer?.id || null });
      const id = projRes.data.project.id;
      setProjectId(id);

      await projectsAPI.adminUpdateBrief(id, {
        garment_types: products,
        preferred_fabrics: fabrics,
        printing_required: printing,
        embellishment_required: surface,
        preferred_dyes: dyes,
        project_type: projectType || null,
        gender: gender ? gender.toLowerCase() : null,
        occasion_tags: occasion,
        bulk_quantity: estQty ? parseInt(estQty) : null,
        target_landing_price_local: priceAmount || null,
        target_landing_currency: priceCurrency,
        target_bulk_delivery_date: deliveryBulk || null,
        buyer_location: [deliveryCity, deliveryCountry].filter(Boolean).join(', ') || null,
        additional_specs: additionalNotes || null,
        admin_notes: qalaComments || null,
      });

      for (const f of files) {
        const fd = new FormData();
        fd.append('file', f);
        await projectsAPI.adminUploadMoodboard(id, fd);
      }

      setStep(2);
    } catch (e) {
      setError(e?.response?.data?.message || 'Could not create the project — check the form and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <nav style={S.navbar}>
        <span style={S.navBack} onClick={() => nav('/admin/projects')}>← Admin console</span>
        <a style={{ ...S.navLogo, marginLeft: 'auto', marginRight: 'auto' }} onClick={() => nav('/admin/projects')}>Qala</a>
        <div style={S.stepIndicator}>
          <div style={S.stepNode(step === 1, step > 1)}>
            <span style={S.stepNum(step === 1, step > 1)}>{step > 1 ? '✓' : '1'}</span>
            <span>Create brief</span>
          </div>
          <span style={S.stepArrow}>→</span>
          <div style={S.stepNode(step === 2, false)}>
            <span style={S.stepNum(step === 2, false)}>2</span>
            <span>Assign studios</span>
          </div>
        </div>
        <span style={{ ...S.navChip, marginLeft: 'auto' }}>Admin</span>
      </nav>

      {step === 1 && (
        <div style={S.page}>
          <div style={{ marginBottom: 40 }}>
            <h1 style={S.pageHeaderH1}>New project</h1>
            <p style={S.pageHeaderP}>Fill in the buyer's brief. You'll assign studios in the next step.</p>
          </div>

          {error && <div style={{ background: 'var(--red-dim)', color: 'var(--red)', padding: '10px 14px', borderRadius: 'var(--r-8)', fontSize: 13, marginBottom: 20 }}>{error}</div>}

          <form onSubmit={e => e.preventDefault()}>

            <div style={S.formSection}>
              <div style={S.sectionTitle}>Project basics</div>
              <div style={S.field}>
                <label style={S.label}>Project name</label>
                <input style={S.input} type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Earth Memory — SS26 Linen Collection" />
              </div>
              <div style={S.field}>
                <label style={S.label}>Assign to buyer</label>
                <div style={{ position: 'relative' }}>
                  {!buyer ? (
                    <>
                      <input style={S.input} type="text" placeholder="Search by buyer name or brand…" autoComplete="off" value={buyerSearch} onChange={e => setBuyerSearch(e.target.value)} />
                      {buyerResults.length > 0 && (
                        <div style={S.buyerDropdown}>
                          {buyerResults.map(b => (
                            <div key={b.id} style={S.buyerOption} onClick={() => { setBuyer(b); setBuyerSearch(''); setBuyerResults([]); }}>
                              <div style={S.buyerAvatar}>{(b.name || b.email || '?')[0].toUpperCase()}</div>
                              <div>
                                <div style={S.buyerOptName}>{b.name || b.email}</div>
                                <div style={S.buyerOptBrand}>{b.email}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={S.buyerSelectedCard}>
                      <div style={S.buyerSelAvatar}>{(buyer.name || buyer.email || '?')[0].toUpperCase()}</div>
                      <div>
                        <div style={S.buyerSelName}>{buyer.name || buyer.email}</div>
                        <div style={S.buyerSelMeta}>{buyer.email}</div>
                      </div>
                      <span style={S.buyerSelChange} onClick={() => setBuyer(null)}>Change</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={S.formSection}>
              <div style={S.sectionTitle}>Project type</div>
              <div style={S.fieldRowCol2}>
                <div style={S.field}>
                  <label style={S.label}>What the buyer wants</label>
                  <select style={S.input} value={projectType} onChange={e => setProjectType(e.target.value)}>
                    <option value="">Select…</option>
                    <option value="collection">Make a collection</option>
                    <option value="pieces">Get some pieces made</option>
                    <option value="single">Get one piece made</option>
                  </select>
                </div>
                <div style={S.field}>
                  <label style={S.label}>Gender</label>
                  <select style={S.input} value={gender} onChange={e => setGender(e.target.value)}>
                    <option value="">Select…</option>
                    <option>Women</option>
                    <option>Men</option>
                    <option>Unisex</option>
                    <option>Kids</option>
                  </select>
                </div>
              </div>
              <div style={S.field}>
                <label style={S.label}>Occasion <span style={S.opt}>(select all that apply)</span></label>
                <TagGrid options={OCCASION_TAGS} selected={occasion} onToggle={v => toggle(occasion, setOccasion, v)} onAddCustom={v => setOccasion([...occasion, v])} addLabel="Add occasion…" />
              </div>
              <div style={S.field}>
                <label style={S.label}>Product / garment type <span style={S.opt}>(select all that apply)</span></label>
                <TagGrid options={PRODUCT_TAGS} selected={products} onToggle={v => toggle(products, setProducts, v)} onAddCustom={v => setProducts([...products, v])} addLabel="Add product type…" />
              </div>
            </div>

            <div style={S.formSection}>
              <div style={S.sectionTitle}>Creative brief</div>
              <div style={S.field}>
                <label style={S.label}>Fabrics to work with <span style={S.opt}>(select all that apply)</span></label>
                <TagGrid options={FABRIC_TAGS} selected={fabrics} onToggle={v => toggle(fabrics, setFabrics, v)} onAddCustom={v => setFabrics([...fabrics, v])} addLabel="Add fabric…" />
              </div>
              <div style={S.field}>
                <label style={S.label}>Printing & dyeing preference <span style={S.opt}>(select all that apply)</span></label>
                <TagGrid options={PRINT_TAGS} selected={printing} onToggle={v => toggle(printing, setPrinting, v)} onAddCustom={v => setPrinting([...printing, v])} addLabel="Add technique…" />
              </div>
              <div style={S.field}>
                <label style={S.label}>Surface work preference <span style={S.opt}>(select all that apply)</span></label>
                <TagGrid options={SURFACE_TAGS} selected={surface} onToggle={v => toggle(surface, setSurface, v)} onAddCustom={v => setSurface([...surface, v])} addLabel="Add surface work…" />
              </div>
              <div style={S.field}>
                <label style={S.label}>Dyes to be used <span style={S.opt}>(select all that apply)</span></label>
                <TagGrid options={DYE_TAGS} selected={dyes} onToggle={v => toggle(dyes, setDyes, v)} onAddCustom={v => setDyes([...dyes, v])} addLabel="Add dye type…" />
              </div>
            </div>

            <div style={S.formSection}>
              <div style={S.sectionTitle}>Commercial details</div>
              <div style={S.fieldRowCol2}>
                <div style={S.field}>
                  <label style={S.label}>Estimated qty — first batch</label>
                  <input style={S.input} type="number" min="1" value={estQty} onChange={e => setEstQty(e.target.value)} placeholder="e.g. 100" />
                </div>
                <div style={S.field}>
                  <label style={S.label}>Target landing price</label>
                  <div style={S.priceRow}>
                    <select style={{ ...S.input, width: 96, flexShrink: 0 }} value={priceCurrency} onChange={e => setPriceCurrency(e.target.value)}>
                      {['EUR', 'USD', 'GBP', 'AUD', 'CAD'].map(c => <option key={c}>{c}</option>)}
                    </select>
                    <input style={{ ...S.input, flex: 1 }} type="number" min="0" step="0.01" value={priceAmount} onChange={e => setPriceAmount(e.target.value)} placeholder="e.g. 480" />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                    <span style={{ fontSize: 11, color: 'var(--text4)' }}>per</span>
                    <input type="text" value={priceUnit} onChange={e => setPriceUnit(e.target.value)} placeholder="dress"
                      style={{ fontSize: 11, color: 'var(--text3)', border: 'none', borderBottom: '1px solid var(--border)', background: 'transparent', padding: '1px 4px', width: 90, outline: 'none' }} />
                    <span style={{ fontSize: 11, color: 'var(--text4)' }}>· all-in landing cost</span>
                  </div>
                </div>
              </div>
              <div style={S.field}>
                <label style={S.label}>Target delivery — bulk</label>
                <input style={{ ...S.input, maxWidth: 240 }} type="date" value={deliveryBulk} onChange={e => setDeliveryBulk(e.target.value)} />
              </div>
              <div style={S.field}>
                <label style={S.label}>Location of delivery</label>
                <div style={S.fieldRowCol2}>
                  <select style={S.input} value={deliveryCountry} onChange={e => setDeliveryCountry(e.target.value)}>
                    <option value="">Select country…</option>
                    {DELIVERY_COUNTRIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                  <input style={S.input} type="text" placeholder="City (optional)" value={deliveryCity} onChange={e => setDeliveryCity(e.target.value)} />
                </div>
              </div>
            </div>

            <div style={S.formSection}>
              <div style={S.sectionTitle}>References & additional context</div>
              <div style={S.field}>
                <label style={S.label}>References <span style={S.opt}>(PDF, images, or video — up to 5 files)</span></label>
                <div style={S.uploadZone} onClick={() => fileRef.current?.click()}>
                  <div style={{ fontSize: 26, marginBottom: 8 }}>📎</div>
                  <div style={S.uploadTitle}>Drop files here, or <span style={{ color: 'var(--admin)', textDecoration: 'underline' }}>browse</span></div>
                  <div style={S.uploadSub}>PDF · JPG · PNG · MP4 · MOV · up to 50 MB each</div>
                </div>
                <input ref={fileRef} type="file" multiple accept="image/*,.pdf,.mp4,.mov" style={{ display: 'none' }}
                  onChange={e => setFiles([...files, ...Array.from(e.target.files || [])].slice(0, 5))} />
                {files.length > 0 && (
                  <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {files.map((f, i) => (
                      <div key={i} style={S.uploadFileItem}>
                        <span style={{ fontSize: 18 }}>📎</span>
                        <span style={S.uploadFileName}>{f.name}</span>
                        <span style={S.uploadFileSize}>{(f.size / 1024 / 1024).toFixed(1)} MB</span>
                        <span style={S.uploadFileRemove} onClick={() => setFiles(files.filter((_, j) => j !== i))}>×</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={S.field}>
                <label style={S.label}>Anything more about the brief <span style={S.opt}>(optional)</span></label>
                <textarea style={{ ...S.input, resize: 'vertical', minHeight: 96, lineHeight: 1.55 }} rows={4} value={additionalNotes} onChange={e => setAdditionalNotes(e.target.value)}
                  placeholder="Any specific requests, constraints, inspirations, or context the studio should know about…" />
              </div>
            </div>

            <div style={S.formSectionLast}>
              <div style={S.sectionTitle}>Internal notes</div>
              <div style={S.qalaCommentBox}>
                <div style={S.qalaCommentLabel}>🔒 Qala comments — visible to studio, not to buyer</div>
                <textarea style={{ ...S.input, resize: 'vertical', minHeight: 96, lineHeight: 1.55, background: '#fff', borderColor: 'rgba(91,75,138,0.20)' }} rows={4} value={qalaComments} onChange={e => setQalaComments(e.target.value)}
                  placeholder="Context for the studio — craft direction, buyer preferences, quality expectations, any specific guidance from Qala…" />
              </div>
            </div>

            <div style={S.formActions}>
              <button type="button" style={{ ...S.btn, ...S.btnAdmin, ...(saving ? S.btnAdminDisabled : {}) }} disabled={saving} onClick={createProject}>
                {saving ? 'Creating…' : 'Create & assign studios →'}
              </button>
            </div>
          </form>
        </div>
      )}

      {step === 2 && projectId && (
        <AssignStudiosStep projectId={projectId} briefSummary={{
          name, buyer, priceCurrency, priceAmount, priceUnit, estQty, deliveryBulk,
          garmentTypes: products, printing, dyes,
        }} onDone={() => nav(`/admin/projects/${projectId}`)} onBack={() => setStep(1)} />
      )}
    </div>
  );
}

function AssignStudiosStep({ projectId, briefSummary, onDone, onBack }) {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [assigned, setAssigned] = useState([]);
  const [modalStudioId, setModalStudioId] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [notifiedIds, setNotifiedIds] = useState([]);

  useEffect(() => {
    projectsAPI.adminMatchStudios(projectId)
      .then(r => setCandidates((r.data.candidates || []).filter(c => !c.already_assigned)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  const visible = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return candidates.filter(c => {
      const matchFilter = activeFilter === 'all' || (c.breakdown?.[activeFilter]?.raw > 0);
      const matchSearch = !q || c.studio_name.toLowerCase().includes(q) || (c.studio_location || '').toLowerCase().includes(q);
      return matchFilter && matchSearch;
    });
  }, [candidates, activeFilter, searchTerm]);

  const top = visible.filter(c => c.score >= 100);
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

  // Same fix as AdminAssignStudios.jsx: no draft-assignment concept exists
  // in the backend, so persist any selection via the real endpoint before
  // leaving, rather than silently discarding it (previous behavior: onBack
  // just returned to step 1's form, losing the selection entirely).
  const saveAndDoLater = async () => {
    if (assigned.length === 0) { onDone(); return; }
    setConfirming(true);
    try {
      const scores = {};
      const breakdowns = {};
      candidates.forEach(c => { scores[c.studio_id] = c.score; breakdowns[c.studio_id] = c.breakdown; });
      await projectsAPI.adminAssignStudios(projectId, { studio_ids: assigned, scores, breakdowns });
      onDone();
    } catch (e) {
      alert(e?.response?.data?.message || 'Could not save your selection — please try again.');
      setConfirming(false);
    }
  };

  const priceStr = briefSummary.priceAmount
    ? `${briefSummary.priceCurrency} ${briefSummary.priceAmount}${briefSummary.estQty ? ` · ${briefSummary.estQty} pcs` : ''}`
    : '—';
  const lookingFor = [briefSummary.garmentTypes?.[0], briefSummary.printing?.[0], briefSummary.dyes?.[0]].filter(Boolean).join(' · ') || '—';

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--text4)', fontSize: 14 }}>Scoring studios against this brief…</div>;

  return (
    <div>
      <div style={S.briefStrip}>
        <div><div style={S.briefLabel}>Ref</div><div style={{ ...S.briefValue, ...S.briefValueMono }}>{projectId.slice(0, 8).toUpperCase()}</div></div>
        <div><div style={S.briefLabel}>Project</div><div style={S.briefValue}>{briefSummary.name || '—'}</div></div>
        <div><div style={S.briefLabel}>Buyer</div><div style={S.briefValue}>{briefSummary.buyer?.name || briefSummary.buyer?.email || '—'}</div></div>
        <div><div style={S.briefLabel}>Looking for</div><div style={S.briefValue}>{lookingFor}</div></div>
        <div><div style={S.briefLabel}>Target price</div><div style={S.briefValue}>{priceStr}</div></div>
        <div><div style={S.briefLabel}>Bulk delivery</div><div style={S.briefValue}>{fmtDate(briefSummary.deliveryBulk)}</div></div>
      </div>

      <div style={S.pageLayout}>
        <main style={S.main}>
          <div style={S.mainHeader}>
            <div style={S.mainTitle}>Studio directory</div>
            <span style={S.countChip}>{visible.length} {visible.length === 1 ? 'studio' : 'studios'}</span>
          </div>
          <div style={S.searchBar}>
            <span style={{ color: 'var(--text4)', fontSize: 16, flexShrink: 0 }}>🔍</span>
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
                <button style={{ ...S.btn, ...S.btnBlock, ...S.btnAdmin, marginBottom: 8, ...(assignedCandidates.length === 0 || confirming ? S.btnAdminDisabled : {}) }} disabled={assignedCandidates.length === 0 || confirming} onClick={confirmAssignment}>
                  {confirming ? 'Confirming…' : 'Confirm & notify studios'}
                </button>
                <button style={{ ...S.btn, ...S.btnBlock, ...S.btnSecondary }} disabled={confirming} onClick={saveAndDoLater}>
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
              <button style={{ ...S.btn, ...S.btnSecondary }} onClick={onDone}>Go to admin console</button>
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
                  <span style={{ ...S.matchBadge(matchLabel(modalCandidate.score)), fontSize: 13, padding: '5px 12px' }}>{matchLabel(modalCandidate.score).label} · {Math.round(modalCandidate.score)}%</span>
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
              <button style={{ ...S.btn, ...S.btnAdmin, width: 'auto', flex: 1 }} onClick={() => toggleAssign(modalCandidate.studio_id)}>
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
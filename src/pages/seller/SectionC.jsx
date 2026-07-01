import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { onboardingAPI } from '../../api/client';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../../components/Toast';

const API = onboardingAPI;

const FABRIC_GROUPS = [
  { cat: 'cotton', label: 'Cotton Based', fabrics: [
    'General Cotton', 'Organic cotton', 'Kala cotton', 'Cotton mulmul/muslin', 'Cotton poplin',
    'Cotton cambric', 'Cotton voile', 'Cotton satin', 'Cotton-silk blend', 'Cotton-linen blend',
  ]},
  { cat: 'silk', label: 'Silk Based', fabrics: [
    'General Silk', 'Mulberry silk', 'Tussar silk', 'Eri silk', 'Muga silk',
    'Silk crepe', 'Silk georgette', 'Silk chiffon', 'Silk satin', 'Silk blends',
  ]},
  { cat: 'linen',       label: 'Linen & Bast',             fabrics: ['Linen', 'Linen blends', 'Hemp', 'Hemp blends'] },
  { cat: 'wool',        label: 'Wool Based',               fabrics: ['General Wool', 'Pashmina', 'Other Fine wool', 'Wool blends'] },
  { cat: 'regenerated', label: 'Regenerated / Cellulosic', fabrics: ['Viscose', 'Rayon', 'Modal', 'Lyocell / Tencel'] },
  { cat: 'handcrafted', label: 'Handcrafted / Heritage',   fabrics: ['Handloom cotton', 'Handloom silk', 'Handwoven Wool'] },
];

const DYES = [
  'Natural / plant-based dyes', 'Vegetable dyes', 'Chemical / reactive dyes',
  'Low-impact / azo-free dyes', 'Indigo (natural)', 'Vat dyes',
];

const LEVEL_META = [
  { value: 'moderate', label: 'Moderate', tip: 'Work with regularly, good command',   bg: '#EBF5E8', text: '#5C845C', border: '#9EC09E' },
  { value: 'high',     label: 'High',     tip: 'Core material, deep expertise',       bg: '#A8D4A8', text: '#2A5E2A', border: '#7AB47A' },
  { value: 'pro',      label: 'Pro',      tip: 'Can source and use, not a specialty', bg: '#4A7C4A', text: '#FFFFFF', border: '#4A7C4A' },
];

function SectionHeader({ letter, title, desc }) {
  return (
    <div className="fade-up" style={{ marginBottom: 36 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Section {letter}</div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 500, fontStyle: 'italic', color: 'var(--gold)', lineHeight: 1.1 }}>{title}</h1>
      <p style={{ color: 'var(--text3)', fontSize: 14, marginTop: 8 }}>{desc}</p>
    </div>
  );
}

function CardSection({ title, children }) {
  return (
    <div className="card fade-up" style={{ marginBottom: 16 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 500, fontStyle: 'italic', color: 'var(--text)', marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>{title}</div>
      {children}
    </div>
  );
}

/*
 * ExpertiseButtons — hover tooltip per level.
 *
 * Tooltip rendered via createPortal into document.body.
 * This is the only reliable fix: without the portal, the tooltip div lives
 * inside the component tree where any ancestor CSS transform (e.g. fade-up
 * animations, card transitions) creates a new stacking context that makes
 * position:fixed behave like position:absolute — putting the tooltip in the
 * wrong place relative to the viewport.
 */
function ExpertiseButtons({ value, onChange, disabled }) {
  const [tooltip, setTooltip] = useState(null); // { text, x, y }

  const handleMouseEnter = (e, tip) => {
    if (disabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      text: tip,
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  };

  const handleMouseLeave = () => setTooltip(null);

  const tooltipEl = tooltip ? (
    <div style={{
      position: 'fixed',
      left: tooltip.x,
      top: tooltip.y,
      transform: 'translate(-50%, calc(-100% - 6px))',
      background: '#1A1A1A',
      color: '#fff',
      fontSize: 11,
      padding: '5px 10px',
      borderRadius: 6,
      whiteSpace: 'nowrap',
      zIndex: 9999,
      pointerEvents: 'none',
      boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
    }}>
      {tooltip.text}
      <div style={{
        position: 'absolute', top: '100%', left: '50%',
        transform: 'translateX(-50%)',
        width: 0, height: 0,
        borderLeft: '5px solid transparent',
        borderRight: '5px solid transparent',
        borderTop: '5px solid #1A1A1A',
      }} />
    </div>
  ) : null;

  return (
    <>
      <div style={{ display: 'flex', gap: 6 }}>
        {LEVEL_META.map(l => {
          const selected = value === l.value;
          return (
            <button
              key={l.value}
              disabled={disabled}
              onClick={() => onChange(l.value)}
              onMouseEnter={e => handleMouseEnter(e, l.tip)}
              onMouseLeave={handleMouseLeave}
              style={{
                fontSize: 11, fontWeight: 600, padding: '5px 12px', borderRadius: 5,
                border: `1px solid ${selected ? l.border : 'var(--border2)'}`,
                background: disabled ? 'transparent' : selected ? l.bg : 'var(--surface2)',
                color: disabled ? 'var(--text4)' : selected ? l.text : 'var(--text3)',
                cursor: disabled ? 'default' : 'pointer',
              }}>
              {l.label}
            </button>
          );
        })}
      </div>
      {tooltipEl && createPortal(tooltipEl, document.body)}
    </>
  );
}

function ExpertiseRow({ name, level, checked, onToggle, onLevel }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--border)', gap: 12 }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', flex: 1 }}>
        <input type="checkbox" checked={checked} onChange={onToggle} />
        <span style={{ fontSize: 14, color: 'var(--text)' }}>{name}</span>
      </label>
      <ExpertiseButtons value={level} onChange={onLevel} disabled={!checked} />
    </div>
  );
}

function FabricAccordion({ label, fabrics, answers, onToggle, onLevel, defaultOpen }) {
  const [open, setOpen] = useState(!!defaultOpen);
  const count = fabrics.filter(f => answers[f]?.checked).length;
  return (
    /*
     * Fix: removed overflow:'hidden' from this wrapper.
     * That property was clipping the tooltip because tooltips positioned
     * absolutely inside cannot escape an overflow:hidden ancestor.
     * The border-radius still renders correctly without overflow:hidden.
     */
    <div style={{ border: '1px solid #EDE8E2', borderRadius: 7, marginBottom: 8 }}>
      <div onClick={() => setOpen(o => !o)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 14px', background: '#FAFAF8', cursor: 'pointer', borderRadius: open ? '7px 7px 0 0' : 7 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {count > 0 && <span style={{ fontSize: 11, fontWeight: 600, color: '#4A7C4A', background: '#EEF3EC', padding: '2px 8px', borderRadius: 4 }}>{count} selected</span>}
          <span style={{ fontSize: 12, color: 'var(--text4)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>▾</span>
        </div>
      </div>
      {open && (
        <div style={{ padding: '4px 14px 10px', background: '#fff', borderTop: '1px solid #F0EDE8', borderRadius: '0 0 7px 7px' }}>
          {fabrics.map(f => (
            <ExpertiseRow key={f} name={f}
              checked={!!answers[f]?.checked} level={answers[f]?.level || null}
              onToggle={() => onToggle(f)} onLevel={lvl => onLevel(f, lvl)} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SectionC({ profileId, onSave, onNext }) {
  const { toasts, success, error } = useToast();

  const [fabricGroups, setFabricGroups] = useState(() =>
    Object.fromEntries(FABRIC_GROUPS.map(g => [g.cat, g.fabrics]))
  );
  const [fabricAnswers, setFabricAnswers] = useState({});
  const [dyeAnswers, setDyeAnswers]       = useState({});
  const [fabricNotes, setFabricNotes]     = useState('');
  const [dyeNotes, setDyeNotes]           = useState('');
  const [addingType, setAddingType]       = useState(false);
  const [newTypeName, setNewTypeName]     = useState('');
  const [saving, setSaving]               = useState(false);

  const taStyle = { width: '100%', padding: '10px 14px', border: '1.5px solid var(--border2)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text)', fontSize: 14, fontFamily: 'var(--font-body)', lineHeight: 1.7, outline: 'none', resize: 'vertical' };
  const inStyle = { width: '100%', height: 34, padding: '0 12px', border: '1.5px solid var(--border2)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none' };

  useEffect(() => {
    if (!profileId) return;
    API.getStudio(profileId).then(r => {
      setFabricNotes(r.data?.fabric_notes || '');
      setDyeNotes(r.data?.dye_notes || '');
    }).catch(() => {});
    API.getFabrics(profileId).then(r => {
      const rows = r.data || [];
      const answers = {}; const customByCat = {};
      rows.forEach(row => {
        const known = FABRIC_GROUPS.find(g => g.cat === row.category)?.fabrics.includes(row.fabric_name);
        if (!known) { customByCat[row.category] = customByCat[row.category] || []; customByCat[row.category].push(row.fabric_name); }
        answers[row.fabric_name] = { checked: row.works_with || !!row.expertise_level, level: row.expertise_level || null };
      });
      setFabricAnswers(answers);
      if (Object.keys(customByCat).length) {
        setFabricGroups(prev => {
          const next = { ...prev };
          Object.entries(customByCat).forEach(([cat, names]) => { next[cat] = [...(next[cat] || []), ...names]; });
          return next;
        });
      }
    }).catch(() => {});
    API.getDyes(profileId).then(r => {
      const answers = {};
      (r.data || []).forEach(row => { answers[row.dye_name] = row.expertise_level; });
      setDyeAnswers(answers);
    }).catch(() => {});
  }, [profileId]);

  const toggleFabric = (cat, name) => {
    setFabricAnswers(prev => {
      const e = prev[name];
      return e?.checked ? { ...prev, [name]: { checked: false, level: null } } : { ...prev, [name]: { checked: true, level: e?.level || null } };
    });
  };
  const setFabricLevel = (name, level) => setFabricAnswers(prev => ({ ...prev, [name]: { checked: true, level } }));
  const toggleDye = name => setDyeAnswers(prev => { const n = { ...prev }; if (n[name]) delete n[name]; else n[name] = 'moderate'; return n; });
  const setDyeLevel = (name, level) => setDyeAnswers(prev => ({ ...prev, [name]: level }));

  const addFabricType = () => {
    const v = newTypeName.trim(); if (!v) return;
    setFabricGroups(prev => ({ ...prev, [v.toLowerCase().replace(/\s+/g, '_')]: [] }));
    setNewTypeName(''); setAddingType(false);
  };

  const save = async (andNext = false) => {
    setSaving(true);
    try {
      const fabricPayload = [];
      Object.entries(fabricGroups).forEach(([cat, names]) => {
        names.forEach(name => {
          const a = fabricAnswers[name];
          if (a?.checked) fabricPayload.push({ category: FABRIC_GROUPS.find(g => g.cat === cat) ? cat : 'other', fabric_name: name, works_with: true, expertise_level: a.level });
        });
      });
      await API.putFabrics(profileId, fabricPayload);
      await API.putDyes(profileId, Object.entries(dyeAnswers).map(([dye_name, expertise_level]) => ({ dye_name, expertise_level })));
      await API.patchStudio(profileId, { fabric_notes: fabricNotes, dye_notes: dyeNotes });
      success('Section C saved!');
      onSave?.();
      if (andNext) onNext?.();
    } catch (e) {
      error(e.response?.data ? JSON.stringify(e.response.data) : 'Save failed');
    } finally { setSaving(false); }
  };

  return (
    <div style={{ padding: '40px 48px', maxWidth: 760 }}>
      <Toast toasts={toasts} />
      <SectionHeader letter="C" title="Fabrics & Dyes" desc="What you work with — and how well. Expertise level is required for each fabric and dye you select." />

      <CardSection title="C.1 — Fabrics You Work With">
        {FABRIC_GROUPS.map(g => (
          <FabricAccordion key={g.cat} label={g.label} fabrics={fabricGroups[g.cat] || g.fabrics}
            answers={fabricAnswers} onToggle={name => toggleFabric(g.cat, name)} onLevel={setFabricLevel} />
        ))}
        {Object.keys(fabricGroups).filter(k => !FABRIC_GROUPS.find(g => g.cat === k)).map(cat => (
          <FabricAccordion key={cat} label={cat.replace(/_/g, ' ')} fabrics={fabricGroups[cat]}
            answers={fabricAnswers} onToggle={name => toggleFabric(cat, name)} onLevel={setFabricLevel} defaultOpen />
        ))}
        {addingType ? (
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <input style={{ ...inStyle, flex: 1 }} value={newTypeName} onChange={e => setNewTypeName(e.target.value)} placeholder="e.g. Bamboo fiber" />
            <button className="btn btn-teal btn-sm" onClick={addFabricType}>Add</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setAddingType(false); setNewTypeName(''); }}>Cancel</button>
          </div>
        ) : (
          <button className="btn btn-outline btn-sm" style={{ marginTop: 12, borderStyle: 'dashed' }} onClick={() => setAddingType(true)}>+ Add new fabric type</button>
        )}
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>More about the fabrics you work with</label>
          <textarea rows={3} style={taStyle} value={fabricNotes} onChange={e => setFabricNotes(e.target.value)}
            placeholder="e.g. We source all our cottons directly from Kutch farmers. Our silks come from Murshidabad weavers we have worked with for 10+ years." />
          <p style={{ fontSize: 11, color: 'var(--text4)', marginTop: 6 }}>Sourcing, qualities, regional provenance, certifications — anything buyers should know about your fabrics.</p>
        </div>
      </CardSection>

      <CardSection title="C.2 — Dyes You Work With">
        {DYES.map(name => (
          <ExpertiseRow key={name} name={name}
            checked={!!dyeAnswers[name]} level={dyeAnswers[name] || null}
            onToggle={() => toggleDye(name)} onLevel={lvl => setDyeLevel(name, lvl)} />
        ))}
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>More about the dyes you work with</label>
          <textarea rows={3} style={taStyle} value={dyeNotes} onChange={e => setDyeNotes(e.target.value)}
            placeholder="e.g. All our natural dyes are plant-sourced and processed in-house. We use a fixed mordanting process that achieves consistent colourfastness." />
          <p style={{ fontSize: 11, color: 'var(--text4)', marginTop: 6 }}>Sourcing, processes, colourfastness, any specialisations buyers should know about.</p>
        </div>
      </CardSection>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button className="btn btn-primary btn-lg fade-up" onClick={() => save(true)} disabled={saving}>
          {saving ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Saving…</> : 'Save & Next'}
        </button>
        <button className="btn btn-ghost fade-up" onClick={() => save(false)} disabled={saving}>Save</button>
      </div>
    </div>
  );
}
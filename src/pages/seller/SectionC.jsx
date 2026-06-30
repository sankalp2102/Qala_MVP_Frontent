import { useState, useEffect } from 'react';
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
  { cat: 'linen', label: 'Linen & Bast', fabrics: ['Linen', 'Linen blends', 'Hemp', 'Hemp blends'] },
  { cat: 'wool', label: 'Wool Based', fabrics: ['General Wool', 'Pashmina', 'Other Fine wool', 'Wool blends'] },
  { cat: 'regenerated', label: 'Regenerated / Cellulosic', fabrics: ['Viscose', 'Rayon', 'Modal', 'Lyocell / Tencel'] },
  { cat: 'handcrafted', label: 'Handcrafted / Heritage', fabrics: ['Handloom cotton', 'Handloom silk', 'Handwoven Wool'] },
];

const DYES = [
  { name: 'Natural / plant-based dyes', tip: 'Occasional use / Regular practice / Specialist' },
  { name: 'Vegetable dyes', tip: 'Occasional use / Regular practice / Specialist' },
  { name: 'Chemical / reactive dyes', tip: 'Occasional use / Regular practice / Specialist' },
  { name: 'Low-impact / azo-free dyes', tip: 'Occasional use / Regular practice / Specialist' },
  { name: 'Indigo (natural)', tip: 'Occasional use / Regular practice / Specialist' },
  { name: 'Vat dyes', tip: 'Occasional use / Regular practice / Specialist' },
];

const LEVELS = [
  { value: 'moderate', label: 'Moderate' },
  { value: 'high',     label: 'High' },
  { value: 'pro',      label: 'Pro' },
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

function ExpertiseButtons({ value, onChange, disabled }) {
  const colors = {
    moderate: { bg: '#EBF5E8', text: '#5C845C', border: '#9EC09E' },
    high:     { bg: '#A8D4A8', text: '#2A5E2A', border: '#7AB47A' },
    pro:      { bg: '#4A7C4A', text: '#FFFFFF', border: '#4A7C4A' },
  };
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {LEVELS.map(l => {
        const selected = value === l.value;
        const c = colors[l.value];
        return (
          <button
            key={l.value}
            disabled={disabled}
            onClick={() => onChange(l.value)}
            style={{
              fontSize: 11, fontWeight: 600, padding: '5px 12px', borderRadius: 5,
              border: `1px solid ${selected ? c.border : 'var(--border2)'}`,
              background: disabled ? 'transparent' : selected ? c.bg : 'var(--surface2)',
              color: disabled ? 'var(--text4)' : selected ? c.text : 'var(--text3)',
              cursor: disabled ? 'default' : 'pointer',
            }}>
            {l.label}
          </button>
        );
      })}
    </div>
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
    <div style={{ border: '1px solid #EDE8E2', borderRadius: 7, marginBottom: 8, overflow: 'hidden' }}>
      <div onClick={() => setOpen(o => !o)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 14px', background: '#FAFAF8', cursor: 'pointer' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {count > 0 && <span style={{ fontSize: 11, fontWeight: 600, color: '#4A7C4A', background: '#EEF3EC', padding: '2px 8px', borderRadius: 4 }}>{count} selected</span>}
          <span style={{ fontSize: 12, color: 'var(--text4)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>▾</span>
        </div>
      </div>
      {open && (
        <div style={{ padding: '4px 14px 10px', background: '#fff', borderTop: '1px solid #F0EDE8' }}>
          {fabrics.map(f => (
            <ExpertiseRow
              key={f}
              name={f}
              checked={!!answers[f]?.checked}
              level={answers[f]?.level || null}
              onToggle={() => onToggle(f)}
              onLevel={lvl => onLevel(f, lvl)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SectionC({ profileId, onSave }) {
  const { toasts, success, error } = useToast();

  // fabricAnswers: { [groupCat]: { [fabricName]: { checked, level } } }
  const [fabricGroups, setFabricGroups] = useState(() =>
    Object.fromEntries(FABRIC_GROUPS.map(g => [g.cat, g.fabrics]))
  );
  const [fabricAnswers, setFabricAnswers] = useState({});
  const [dyeAnswers, setDyeAnswers] = useState({}); // { [dyeName]: level }
  const [fabricNotes, setFabricNotes] = useState('');
  const [dyeNotes, setDyeNotes] = useState('');

  const [addingType, setAddingType] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profileId) return;

    API.getStudio(profileId).then(r => {
      setFabricNotes(r.data?.fabric_notes || '');
      setDyeNotes(r.data?.dye_notes || '');
    }).catch(() => {});

    API.getFabrics(profileId).then(r => {
      const rows = r.data || [];
      const answers = {};
      const customByCat = {};
      rows.forEach(row => {
        const known = FABRIC_GROUPS.find(g => g.cat === row.category)?.fabrics.includes(row.fabric_name);
        if (!known) {
          customByCat[row.category] = customByCat[row.category] || [];
          customByCat[row.category].push(row.fabric_name);
        }
        answers[row.fabric_name] = {
          checked: row.works_with || !!row.expertise_level,
          level: row.expertise_level || null,
        };
      });
      setFabricAnswers(answers);
      if (Object.keys(customByCat).length) {
        setFabricGroups(prev => {
          const next = { ...prev };
          Object.entries(customByCat).forEach(([cat, names]) => {
            next[cat] = [...(next[cat] || []), ...names];
          });
          return next;
        });
      }
    }).catch(() => {});

    API.getDyes(profileId).then(r => {
      const rows = r.data || [];
      const answers = {};
      rows.forEach(row => { answers[row.dye_name] = row.expertise_level; });
      setDyeAnswers(answers);
    }).catch(() => {});
  }, [profileId]);

  const toggleFabric = (cat, name) => {
    setFabricAnswers(prev => {
      const existing = prev[name];
      if (existing?.checked) return { ...prev, [name]: { checked: false, level: null } };
      return { ...prev, [name]: { checked: true, level: existing?.level || null } };
    });
  };

  const setFabricLevel = (name, level) => {
    setFabricAnswers(prev => ({ ...prev, [name]: { checked: true, level } }));
  };

  const toggleDye = name => {
    setDyeAnswers(prev => {
      const next = { ...prev };
      if (next[name]) delete next[name];
      else next[name] = 'moderate';
      return next;
    });
  };

  const setDyeLevel = (name, level) => {
    setDyeAnswers(prev => ({ ...prev, [name]: level }));
  };

  const addFabricType = () => {
    const v = newTypeName.trim();
    if (!v) return;
    const key = v.toLowerCase().replace(/\s+/g, '_');
    setFabricGroups(prev => ({ ...prev, [key]: [] }));
    setNewTypeName('');
    setAddingType(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      // Build fabric payload across all groups
      const fabricPayload = [];
      Object.entries(fabricGroups).forEach(([cat, names]) => {
        names.forEach(name => {
          const a = fabricAnswers[name];
          if (a?.checked) {
            fabricPayload.push({
              category: FABRIC_GROUPS.find(g => g.cat === cat) ? cat : 'other',
              fabric_name: name,
              works_with: true,
              expertise_level: a.level,
            });
          }
        });
      });
      await API.putFabrics(profileId, fabricPayload);

      const dyePayload = Object.entries(dyeAnswers).map(([dye_name, expertise_level]) => ({ dye_name, expertise_level }));
      await API.putDyes(profileId, dyePayload);

      await API.patchStudio(profileId, { fabric_notes: fabricNotes, dye_notes: dyeNotes });

      success('Section C saved!');
      onSave?.();
    } catch (e) {
      error(e.response?.data ? JSON.stringify(e.response.data) : 'Save failed');
    } finally { setSaving(false); }
  };

  return (
    <div style={{ padding: '40px 48px', maxWidth: 760 }}>
      <Toast toasts={toasts} />
      <SectionHeader letter="C" title="Fabrics & Dyes" desc="What you work with — and how well. Expertise level is required for each fabric and dye you select." />

      {/* C.1 Fabrics */}
      <CardSection title="C.1 — Fabrics You Work With">
        {FABRIC_GROUPS.map((g, i) => (
          <FabricAccordion
            key={g.cat}
            label={g.label}
            fabrics={fabricGroups[g.cat] || g.fabrics}
            answers={fabricAnswers}
            onToggle={name => toggleFabric(g.cat, name)}
            onLevel={setFabricLevel}
          />
        ))}
        {Object.keys(fabricGroups).filter(k => !FABRIC_GROUPS.find(g => g.cat === k)).map(cat => (
          <FabricAccordion
            key={cat}
            label={cat.replace(/_/g, ' ')}
            fabrics={fabricGroups[cat]}
            answers={fabricAnswers}
            onToggle={name => toggleFabric(cat, name)}
            onLevel={setFabricLevel}
            defaultOpen
          />
        ))}

        {addingType ? (
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <input value={newTypeName} onChange={e => setNewTypeName(e.target.value)} placeholder="e.g. Bamboo fiber" style={{ flex: 1 }} />
            <button className="btn btn-teal btn-sm" onClick={addFabricType}>Add</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setAddingType(false); setNewTypeName(''); }}>Cancel</button>
          </div>
        ) : (
          <button className="btn btn-outline btn-sm" style={{ marginTop: 12, borderStyle: 'dashed' }} onClick={() => setAddingType(true)}>+ Add new fabric type</button>
        )}

        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>More about the fabrics you work with</label>
          <textarea rows={3} value={fabricNotes} onChange={e => setFabricNotes(e.target.value)}
            placeholder="e.g. We source all our cottons directly from Kutch farmers. Our silks come from Murshidabad weavers we have worked with for 10+ years."
            style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--border2)', borderRadius: 'var(--radius)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 14, fontFamily: 'var(--font-body)', lineHeight: 1.7, resize: 'vertical' }} />
          <p style={{ fontSize: 11, color: 'var(--text4)', marginTop: 6 }}>Sourcing, qualities, regional provenance, certifications — anything buyers should know about your fabrics.</p>
        </div>
      </CardSection>

      {/* C.2 Dyes */}
      <CardSection title="C.2 — Dyes You Work With">
        {DYES.map(d => (
          <ExpertiseRow
            key={d.name}
            name={d.name}
            checked={!!dyeAnswers[d.name]}
            level={dyeAnswers[d.name] || null}
            onToggle={() => toggleDye(d.name)}
            onLevel={lvl => setDyeLevel(d.name, lvl)}
          />
        ))}
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>More about the dyes you work with</label>
          <textarea rows={3} value={dyeNotes} onChange={e => setDyeNotes(e.target.value)}
            placeholder="e.g. All our natural dyes are plant-sourced and processed in-house. We use a fixed mordanting process that achieves consistent colourfastness."
            style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--border2)', borderRadius: 'var(--radius)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 14, fontFamily: 'var(--font-body)', lineHeight: 1.7, resize: 'vertical' }} />
          <p style={{ fontSize: 11, color: 'var(--text4)', marginTop: 6 }}>Sourcing, processes, colourfastness, any specialisations buyers should know about.</p>
        </div>
      </CardSection>

      <button className="btn btn-primary btn-lg fade-up" onClick={save} disabled={saving}>
        {saving ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Saving…</> : 'Save & Next'}
      </button>
    </div>
  );
}
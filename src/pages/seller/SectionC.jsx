import { useState, useEffect } from 'react';
import { onboardingAPI } from '../../api/client';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../../components/Toast';
import {
  SectionHeader, QCard, SectionFooter, GroupAccordion, ExpertiseRow,
  AddButton, EXPERTISE_TOOLTIPS, useAutosave, inputStyle, textareaStyle,
} from './_ui';

const API = onboardingAPI;

/* Hoisted OUT of SectionC on purpose. It used to be declared inside the
   SectionC function body, which meant a brand new FabricGroupBody function
   (a new component TYPE, as far as React's reconciler is concerned) was
   created on every SectionC re-render — including every click on a
   Moderate/High/Pro button, since that updates fabricAnswers state one level
   up. React sees the changed function identity and unmounts + remounts the
   whole subtree instead of reusing it, which wiped GroupAccordion's local
   `open` state and snapped every group shut mid-click (sometimes on the very
   click that was supposed to select a level, sometimes a beat later from an
   unrelated re-render — e.g. the autosave indicator). Living at module scope
   gives it a stable identity across renders, so state inside it (the
   accordion's open/closed flag, the inline "add fabric" input) now survives
   normal re-renders the way it should. */
function FabricGroupBody({
  g, removable = false, fabricGroups, fabricAnswers,
  toggleFabric, setFabricLevel, addFabricToGroup, deleteFabricFromGroup, removeFabricType,
}) {
  const [adding, setAdding] = useState(false);
  const [val, setVal] = useState('');
  const fabrics = fabricGroups[g.cat] || g.fabrics;
  const defaults = g.fabrics;
  const count = fabrics.filter(f => fabricAnswers[f]?.checked).length;
  const commit = () => { const v = val.trim(); if (!v) return; addFabricToGroup(g.cat, v); setVal(''); setAdding(false); };
  return (
    <GroupAccordion label={g.label} count={count}
      onDelete={removable ? () => removeFabricType(g.cat) : undefined}
      deleteLabel={`Remove ${g.label} type`}>
      {fabrics.map((f, i) => (
        <ExpertiseRow key={f} name={f}
          checked={!!fabricAnswers[f]?.checked} level={fabricAnswers[f]?.level || null}
          onToggle={() => toggleFabric(g.cat, f)} onLevel={lvl => setFabricLevel(f, lvl)}
          tooltips={EXPERTISE_TOOLTIPS.fabric}
          onDelete={!defaults.includes(f) ? () => deleteFabricFromGroup(g.cat, f) : undefined}
          isLast={i === fabrics.length - 1 && !adding} />
      ))}
      {adding ? (
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <input style={{ ...inputStyle, flex: 1 }} value={val} onChange={e => setVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commit(); } if (e.key === 'Escape') { setAdding(false); setVal(''); } }}
            placeholder={`e.g. add a ${g.label.split(' ')[0].toLowerCase()} fabric`} autoFocus />
          <button className="btn btn-primary btn-sm" onClick={commit}>Add</button>
          <button className="btn btn-ghost btn-sm" onClick={() => { setAdding(false); setVal(''); }}>Cancel</button>
        </div>
      ) : (
        <AddButton onClick={() => setAdding(true)}>+ Add {g.label.split(' ')[0].toLowerCase()} fabric</AddButton>
      )}
    </GroupAccordion>
  );
}

/* Heritage / Handloom group removed — not in the prototype. FabricAnswer.category
   is stored per row, so any pre-existing handloom answer resurfaces as a custom
   group rather than being stranded; it is never deleted from the backend. */
const FABRIC_GROUPS = [
  { cat: 'cotton', label: 'Cotton Based', fabrics: [
    // Bug fix (Aug 2026): "General Cotton" removed on request — too
    // generic next to the specific cotton types already listed here.
    'Organic cotton', 'Kala cotton', 'Cotton mulmul / muslin', 'Cotton poplin',
    'Cotton cambric', 'Cotton voile', 'Cotton satin', 'Cotton-silk blend', 'Cotton-linen blend',
  ]},
  { cat: 'silk', label: 'Silk Based', fabrics: [
    // Bug fix (Aug 2026): "General Silk" removed, same reason as above.
    'Mulberry silk', 'Tussar silk', 'Eri silk', 'Muga silk',
    'Silk crepe', 'Silk georgette', 'Silk chiffon', 'Silk satin', 'Silk blends',
  ]},
  { cat: 'linen',       label: 'Linen & Bast',             fabrics: ['Linen', 'Linen blends', 'Hemp', 'Hemp blends'] },
  // Bug fix (Aug 2026): "General Wool" removed, same reason as above.
  { cat: 'wool',        label: 'Wool Based',               fabrics: ['Pashmina', 'Other Fine wool', 'Wool blends'] },
  { cat: 'regenerated', label: 'Regenerated / Cellulosic', fabrics: ['Viscose', 'Rayon', 'Modal', 'Lyocell / Tencel'] },
];

const DYES_DEFAULT = [
  'Plant-based Dyes', 'Vegetable dyes', 'Low-impact / azo-free dyes', 'Chemical / reactive dyes',
];

/* Old default "Natural / plant-based dyes" was renamed to "Plant-based Dyes".
   Alias any saved value so an existing selection stays checked under the new
   name (and gets rewritten to the new name on the next save). */
const DYE_ALIASES = { 'Natural / plant-based dyes': 'Plant-based Dyes' };

export default function SectionC({ profileId, initialData, onSave, onNext }) {
  const { toasts, success, error } = useToast();
  const [fabricGroups, setFabricGroups] = useState(() =>
    Object.fromEntries(FABRIC_GROUPS.map(g => [g.cat, g.fabrics]))
  );
  const [fabricAnswers, setFabricAnswers] = useState({});
  const [dyeAnswers, setDyeAnswers]       = useState({});
  const [allDyeNames, setAllDyeNames]     = useState(DYES_DEFAULT);
  const [fabricNotes, setFabricNotes]     = useState('');
  const [dyeNotes, setDyeNotes]           = useState('');
  const [addingType, setAddingType]       = useState(false);
  const [newTypeName, setNewTypeName]     = useState('');
  const [addingDye, setAddingDye]         = useState(false);
  const [newDyeName, setNewDyeName]       = useState('');
  const [saving, setSaving]               = useState(false);

  const populateFabrics = (rows) => {
    const answers = {}; const customByCat = {};
    (rows || []).forEach(row => {
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
  };

  const populateDyes = (rows) => {
    const answers = {};
    const custom = [];
    (rows || []).forEach(row => {
      const name = DYE_ALIASES[row.dye_name] || row.dye_name;
      answers[name] = row.expertise_level;
      if (!DYES_DEFAULT.includes(name)) custom.push(name);
    });
    setDyeAnswers(answers);
    if (custom.length) setAllDyeNames([...DYES_DEFAULT, ...custom]);
  };

  useEffect(() => {
    if (!initialData) return;
    const { studio, fabrics, dyes } = initialData;
    if (studio) { setFabricNotes(studio.fabric_notes || ''); setDyeNotes(studio.dye_notes || ''); }
    if (fabrics) populateFabrics(fabrics);
    if (dyes)    populateDyes(dyes);
  }, [initialData]);

  useEffect(() => {
    if (!profileId || initialData) return;
    API.getStudio(profileId).then(r => { setFabricNotes(r.data?.fabric_notes || ''); setDyeNotes(r.data?.dye_notes || ''); }).catch(() => {});
    API.getFabrics(profileId).then(r => populateFabrics(r.data)).catch(() => {});
    API.getDyes(profileId).then(r => populateDyes(r.data)).catch(() => {});
  }, [profileId]);

  const toggleFabric = (cat, name) => {
    setFabricAnswers(prev => {
      const e = prev[name];
      return e?.checked ? { ...prev, [name]: { checked: false, level: null } } : { ...prev, [name]: { checked: true, level: e?.level || null } };
    });
  };
  const setFabricLevel = (name, level) => setFabricAnswers(prev => ({ ...prev, [name]: { checked: true, level } }));
  const toggleDye = name => setDyeAnswers(prev => { const n = { ...prev }; if (name in n) delete n[name]; else n[name] = null; return n; });
  const setDyeLevel = (name, level) => setDyeAnswers(prev => ({ ...prev, [name]: level }));

  const addFabricType = () => {
    const v = newTypeName.trim(); if (!v) return;
    // Slugify to match what the backend stores. Keep it to [a-z0-9_-] and cap at
    // 50 chars — that's the column width for FabricAnswer.category, so a long
    // name can't overflow it. Adding a group that already exists is a no-op.
    const slug = v.toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 50);
    if (!slug) return;
    setFabricGroups(prev => (slug in prev ? prev : { ...prev, [slug]: [] }));
    setNewTypeName(''); setAddingType(false);
  };
  const addFabricToGroup = (cat, fabricName) => setFabricGroups(prev => ({ ...prev, [cat]: [...(prev[cat] || []), fabricName] }));
  const deleteFabricFromGroup = (cat, fabricName) => {
    setFabricGroups(prev => ({ ...prev, [cat]: (prev[cat] || []).filter(f => f !== fabricName) }));
    setFabricAnswers(prev => { const next = { ...prev }; delete next[fabricName]; return next; });
  };

  /* Remove a seller-added fabric type (custom category) entirely, clearing the
     answers for every fabric under it. Default groups are never removable. */
  const removeFabricType = (cat) => {
    const names = fabricGroups[cat] || [];
    setFabricGroups(prev => { const next = { ...prev }; delete next[cat]; return next; });
    setFabricAnswers(prev => {
      const next = { ...prev };
      names.forEach(n => { delete next[n]; });
      return next;
    });
  };

  // Remove a studio-added dye entirely (name + any expertise answer).
  const removeCustomDye = (name) => {
    setAllDyeNames(prev => prev.filter(n => n !== name));
    setDyeAnswers(prev => { const next = { ...prev }; delete next[name]; return next; });
  };

  const addCustomDye = () => {
    const v = newDyeName.trim(); if (!v) return;
    setAllDyeNames(p => [...p, v]);
    setDyeAnswers(prev => ({ ...prev, [v]: null }));
    setNewDyeName(''); setAddingDye(false);
  };

  const persist = async () => {
    const fabricPayload = [];
    Object.entries(fabricGroups).forEach(([cat, names]) => {
      names.forEach(name => {
        const a = fabricAnswers[name];
        if (a?.checked) fabricPayload.push({ category: cat, fabric_name: name, works_with: true, expertise_level: a.level });
      });
    });
    await API.putFabrics(profileId, fabricPayload);
    await API.putDyes(profileId, Object.entries(dyeAnswers).map(([dye_name, expertise_level]) => ({ dye_name, expertise_level })));
    await API.patchStudio(profileId, { fabric_notes: fabricNotes, dye_notes: dyeNotes });
  };

  const autoSaving = useAutosave(persist, [fabricAnswers, dyeAnswers, fabricNotes, dyeNotes, fabricGroups]);

  const save = async (andNext = false) => {
    setSaving(true);
    try {
      await persist();
      success('Section C saved!');
      onSave?.();
      if (andNext) onNext?.();
    } catch (e) {
      error(e.response?.data ? JSON.stringify(e.response.data) : 'Save failed');
    } finally { setSaving(false); }
  };

  const notesLabel = { fontSize: 10, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 6 };

  const customCats = Object.keys(fabricGroups).filter(k => !FABRIC_GROUPS.find(g => g.cat === k));

  return (
    <div style={{ padding: '40px 48px 80px', maxWidth: 760 }}>
      <Toast toasts={toasts} />
      <SectionHeader letter="C" title="Fabrics & Dyes" desc="What you work with — and how well. Expertise level is required for each fabric and dye you select." />

      <QCard qref="C.1" title="Fabrics You Work With">
        {FABRIC_GROUPS.map(g => (
          <FabricGroupBody key={g.cat} g={g}
            fabricGroups={fabricGroups} fabricAnswers={fabricAnswers}
            toggleFabric={toggleFabric} setFabricLevel={setFabricLevel}
            addFabricToGroup={addFabricToGroup} deleteFabricFromGroup={deleteFabricFromGroup}
            removeFabricType={removeFabricType} />
        ))}
        {customCats.map(cat => (
          <FabricGroupBody key={cat} g={{ cat, label: cat.replace(/_/g, ' '), fabrics: [] }} removable
            fabricGroups={fabricGroups} fabricAnswers={fabricAnswers}
            toggleFabric={toggleFabric} setFabricLevel={setFabricLevel}
            addFabricToGroup={addFabricToGroup} deleteFabricFromGroup={deleteFabricFromGroup}
            removeFabricType={removeFabricType} />
        ))}
        {addingType ? (
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <input style={{ ...inputStyle, flex: 1 }} value={newTypeName} onChange={e => setNewTypeName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFabricType(); } }}
              placeholder="e.g. Wool Based, Regenerated, Synthetic…" autoFocus />
            <button className="btn btn-primary btn-sm" onClick={addFabricType}>Add Type</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setAddingType(false); setNewTypeName(''); }}>Cancel</button>
          </div>
        ) : (
          <AddButton inline onClick={() => setAddingType(true)}>+ Add new fabric type (e.g. Wool Based, Regenerated)</AddButton>
        )}
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--surface2)' }}>
          <label style={notesLabel}>More about the fabrics you work with</label>
          <textarea rows={3} style={textareaStyle} value={fabricNotes} onChange={e => setFabricNotes(e.target.value)}
            placeholder="e.g. We source all our cottons directly from Kutch farmers. Our silks come from Murshidabad weavers we've worked with for 10+ years. We can advise on hand-feel, drape, and weight for different end-uses." />
          <p className="field-hint" style={{ marginTop: 4 }}>Sourcing, qualities, regional provenance, certifications — anything buyers should know about your fabrics.</p>
        </div>
      </QCard>

      <QCard qref="C.2" title="Dyes You Work With" desc="Select the dye types your studio uses. Expertise level is required for each.">
        {allDyeNames.map((name, i) => (
          <ExpertiseRow key={name} name={name}
            checked={name in dyeAnswers} level={dyeAnswers[name] || null}
            onToggle={() => toggleDye(name)} onLevel={lvl => setDyeLevel(name, lvl)}
            tooltips={EXPERTISE_TOOLTIPS.dye}
            /* Studio-added dyes can be removed; the built-in list can't. */
            onDelete={DYES_DEFAULT.includes(name) ? undefined : () => removeCustomDye(name)}
            isLast={i === allDyeNames.length - 1} />
        ))}
        {addingDye ? (
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <input style={{ ...inputStyle, flex: 1 }} value={newDyeName} onChange={e => setNewDyeName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomDye(); } }}
              placeholder="e.g. Discharge dye, Mud resist, Sulphur dye…" autoFocus />
            <button className="btn btn-primary btn-sm" onClick={addCustomDye}>Add</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setAddingDye(false); setNewDyeName(''); }}>Cancel</button>
          </div>
        ) : (
          <AddButton inline onClick={() => setAddingDye(true)}>+ Add dye type</AddButton>
        )}
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--surface2)' }}>
          <label style={notesLabel}>More about the dyes you work with</label>
          <textarea rows={3} style={textareaStyle} value={dyeNotes} onChange={e => setDyeNotes(e.target.value)}
            placeholder="e.g. All our natural dyes are plant-sourced and processed in-house. We use a fixed mordanting process that achieves consistent colourfastness. We can match Pantone references with natural dyes on most base fabrics." />
          <p className="field-hint" style={{ marginTop: 4 }}>Sourcing, processes, colourfastness, any specialisations buyers should know about.</p>
        </div>
      </QCard>

      <SectionFooter onNext={() => save(true)} saving={saving} autoSaving={autoSaving} />
    </div>
  );
}
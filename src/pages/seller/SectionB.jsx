import { useState, useEffect, useRef, useCallback } from 'react';
import { onboardingAPI } from '../../api/client';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../../components/Toast';
import { inputStyle } from './SectionA';

const API = onboardingAPI;

const GENDERS = ['Womenswear', 'Menswear', 'Gender Neutral / Unisex', 'Kidswear'];

const OCCASIONS_DEFAULT = [
  'Resortwear / Travel', 'Everyday / Casual', 'Occasionwear / Ethnic',
  'Festive / Bridal', 'Workwear / Contemporary', 'Loungewear / Sleepwear', 'Activewear',
];

const GARMENTS_DEFAULT = [
  'Dresses', 'Coord Sets', 'Tops', 'Kaftans', 'Tunics / Kurtas', 'Skirts',
  'Accessories / Scarves / Stoles', 'Shirts', 'Trousers / Pants', 'Blazers / Jackets', 'Jumpsuits',
];

const HOME_FURNISHINGS_DEFAULT = [
  { group: 'Bedding', items: ['Bed sheets', 'Duvet covers', 'Pillow covers', 'Quilts / Razais', 'Bed runners'] },
  { group: 'Table Linen', items: ['Tablecloths', 'Table runners', 'Placemats', 'Napkins'] },
  { group: 'Kitchen Linen', items: ['Aprons', 'Kitchen towels', 'Oven mitts'] },
  { group: 'Bath Linen', items: ['Bath towels', 'Hand towels', 'Bathrobes', 'Bath mats'] },
  { group: 'Living Room Textiles', items: ['Cushion covers', 'Sofa throws / Blankets', 'Poufs'] },
  { group: 'Curtains & Drapes', items: ['Curtain panels', 'Sheer curtains', 'Tie-backs'] },
  { group: 'Upholstery', items: ['Chair covers / slipcovers', 'Headboard covers'] },
  { group: 'Floor Coverings', items: ['Rugs', 'Dhurries', 'Doormats'] },
  { group: 'Wall Textiles', items: ['Wall hangings', 'Tapestries', 'Macrame panels'] },
  { group: 'Accessories', items: ['Laundry bags', 'Storage baskets', 'Decorative hangings'] },
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

function SavedPulse({ show }) {
  if (!show) return null;
  return <span style={{ fontSize: 11, color: 'var(--text4)' }}>Saved</span>;
}

function RankItemRow({ name, rank, onToggle, isLast }) {
  const checked = rank != null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: isLast ? 'none' : '1px solid #F5F3EF' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', flex: 1 }}>
        <input type="checkbox" checked={checked} onChange={() => onToggle(name)} />
        <span style={{ fontSize: 13, color: '#1A1A1A' }}>{name}</span>
      </label>
      <div style={{
        width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: checked ? '#D97520' : 'transparent', color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0,
      }}>
        {checked ? rank : ''}
      </div>
    </div>
  );
}

function Top5Row({ name, top5, checked, onToggle, capReached, isLast }) {
  const [showCapTip, setShowCapTip] = useState(false);
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: isLast ? 'none' : '1px solid #F5F3EF' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', flex: 1 }}>
        <input type="checkbox" checked={checked} onChange={() => onToggle(name)} />
        <span style={{ fontSize: 13, color: '#1A1A1A' }}>{name}</span>
      </label>
      {/* Always visible — green when top5, grey when checked but cap reached, dim when unchecked */}
      <div style={{ position: 'relative' }}
        onMouseEnter={() => capReached && !top5 && setShowCapTip(true)}
        onMouseLeave={() => setShowCapTip(false)}>
        <button
          onClick={() => {
            if (!checked) return;
            if (top5) { onToggle(name, 'top5'); return; }           // deselect always allowed
            if (capReached) return;                                   // cap hit — show tooltip only
            onToggle(name, 'top5');
          }}
          style={{
            fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4,
            background: top5 ? '#EEF3EC' : 'transparent',
            color: top5 ? '#4A7C4A' : !checked ? '#DDD' : '#AAA',
            border: `1px solid ${top5 ? '#9EC09E' : checked ? '#D8D4CF' : '#EEE'}`,
            cursor: !checked ? 'default' : top5 || !capReached ? 'pointer' : 'not-allowed',
            flexShrink: 0,
          }}>
          {'★'} Top
        </button>
        {showCapTip && (
          <div style={{
            position: 'absolute', bottom: 'calc(100% + 6px)', right: 0,
            background: '#1A1A1A', color: '#fff', fontSize: 11,
            padding: '5px 10px', borderRadius: 6, whiteSpace: 'nowrap',
            zIndex: 200, pointerEvents: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
          }}>
            Deselect one Top to mark this
            <div style={{ position: 'absolute', top: '100%', right: 10, width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid #1A1A1A' }} />
          </div>
        )}
      </div>
    </div>
  );
}

function CategoryAccordion({ name, sub, count, defaultOpen, children }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div style={{ border: '1px solid #E0DCDA', borderRadius: 10, marginBottom: 12, overflow: 'hidden' }}>
      <div onClick={() => setOpen(o => !o)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 18px', background: '#FAFAF8', cursor: 'pointer' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{name}</div>
          <div style={{ fontSize: 11, color: 'var(--text4)' }}>{sub}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {count > 0 && <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--gold)', background: 'var(--gold-dim)', padding: '3px 8px', borderRadius: 4 }}>{count}</span>}
          <span style={{ fontSize: 12, color: 'var(--text4)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>▾</span>
        </div>
      </div>
      {open && <div style={{ padding: '4px 18px 16px', background: '#F9F8F6' }}>{children}</div>}
    </div>
  );
}

/* change 5: HFGroup with + Add other within each group */
function HFGroup({ group, items, checked, onToggle, onAddItem }) {
  const [addingItem, setAddingItem] = useState(false);
  const [newItem, setNewItem]       = useState('');
  const count = items.filter(i => checked.includes(i)).length;

  const commitItem = () => {
    const v = newItem.trim();
    if (!v) return;
    onAddItem(group, v);
    setNewItem('');
    setAddingItem(false);
  };

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{group}</span>
        {count > 0 && <span style={{ fontSize: 10, color: 'var(--gold)' }}>({count})</span>}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {items.map(item => {
          const isChecked = checked.includes(item);
          return (
            <label key={item} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 6,
              border: `1px solid ${isChecked ? '#D97520' : '#E4E0DB'}`,
              background: isChecked ? '#FEF8F0' : '#fff', cursor: 'pointer', fontSize: 12,
            }}>
              <input type="checkbox" checked={isChecked} onChange={() => onToggle(item)} style={{ margin: 0 }} />
              {item}
            </label>
          );
        })}
      </div>
      {addingItem ? (
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input style={{ ...inputStyle, flex: 1, height: 32, fontSize: 12 }} value={newItem} onChange={e => setNewItem(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitItem(); } }}
            placeholder={`Add to ${group}`} autoFocus />
          <button className="btn btn-teal btn-sm" onClick={commitItem}>Add</button>
          <button className="btn btn-ghost btn-sm" onClick={() => { setAddingItem(false); setNewItem(''); }}>Cancel</button>
        </div>
      ) : (
        <button onClick={() => setAddingItem(true)}
          style={{ marginTop: 6, fontSize: 11, color: 'var(--text4)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
          + Add other
        </button>
      )}
    </div>
  );
}

export default function SectionB({ profileId, initialData, onSave, onNext }) {
  const { toasts, success, error } = useToast();
  const [savedPulse, setSavedPulse] = useState(false);

  const [genders, setGenders]     = useState([]);
  const [occasions, setOccasions] = useState([]);
  const [customOcc, setCustomOcc] = useState('');
  const [addingOcc, setAddingOcc] = useState(false);

  const [garments, setGarments]         = useState([]);
  const [customGarment, setCustomGarment] = useState('');
  const [addingGarment, setAddingGarment] = useState(false);
  const [allGarmentNames, setAllGarmentNames] = useState(GARMENTS_DEFAULT);
  const [allOccasionNames, setAllOccasionNames] = useState(OCCASIONS_DEFAULT);

  const [homeFurnishings, setHomeFurnishings] = useState([]);
  /* change 5: custom items per group + custom categories */
  const [hfGroups, setHfGroups] = useState(HOME_FURNISHINGS_DEFAULT);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCatName, setNewCatName]         = useState('');

  const [saving, setSaving] = useState(false);
  const debounceRef         = useRef(null);

  const populateFromData = (d) => {
    if (!d) return;
    setGenders(d.gender_focus || []);
    const occ = d.occasions || [];
    setOccasions(occ);
    const customOccNames = occ.map(o => o.name).filter(n => !OCCASIONS_DEFAULT.includes(n));
    setAllOccasionNames([...OCCASIONS_DEFAULT, ...customOccNames]);
    const gar = d.garment_types || [];
    setGarments(gar);
    const customGarNames = gar.map(g => g.name).filter(n => !GARMENTS_DEFAULT.includes(n));
    setAllGarmentNames([...GARMENTS_DEFAULT, ...customGarNames]);
    setHomeFurnishings(d.home_furnishings || []);
  };

  /* Use snapshot data immediately when available */
  useEffect(() => { if (initialData) populateFromData(initialData); }, [initialData]);

  /* Fallback: only fetch if no snapshot data */
  useEffect(() => {
    if (!profileId || initialData) return;
    API.getStudio(profileId).then(r => populateFromData(r.data)).catch(() => {});
  }, [profileId]);

  /* change 3: debounced autosave */
  const triggerAutosave = useCallback((payload) => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        await API.patchStudio(profileId, payload);
        setSavedPulse(true);
        setTimeout(() => setSavedPulse(false), 1500);
      } catch {}
    }, 800);
  }, [profileId]);

  const nextRank = list => list.length ? Math.max(...list.map(x => x.rank)) + 1 : 1;

  const toggleGender = name => {
    setGenders(prev => {
      const exists = prev.find(g => g.name === name);
      const next = exists
        ? prev.filter(g => g.name !== name).sort((a,b) => a.rank - b.rank).map((g,i) => ({ ...g, rank: i+1 }))
        : [...prev, { name, rank: nextRank(prev) }];
      triggerAutosave({ gender_focus: next });
      return next;
    });
  };

  const toggleOccasion = name => {
    setOccasions(prev => {
      const exists = prev.find(o => o.name === name);
      const next = exists
        ? prev.filter(o => o.name !== name).sort((a,b) => a.rank - b.rank).map((o,i) => ({ ...o, rank: i+1 }))
        : [...prev, { name, rank: nextRank(prev) }];
      triggerAutosave({ occasions: next });
      return next;
    });
  };

  const addCustomOccasion = () => {
    const v = customOcc.trim();
    if (!v) return;
    setAllOccasionNames(prev => [...prev, v]);
    setOccasions(prev => { const next = [...prev, { name: v, rank: nextRank(prev) }]; triggerAutosave({ occasions: next }); return next; });
    setCustomOcc(''); setAddingOcc(false);
  };

  const TOP5_MAX = 5;
  const top5Count = garments.filter(g => g.top5).length;

  const toggleGarment = (name, mode) => {
    setGarments(prev => {
      let next = prev;
      const exists = prev.find(g => g.name === name);
      if (mode === 'top5') {
        // explicit top5 toggle — deselect always works, select only if under cap
        if (!exists) return prev;
        next = exists.top5
          ? prev.map(g => g.name === name ? { ...g, top5: false } : g)
          : prev.filter(g => g.top5).length >= TOP5_MAX ? prev
          : prev.map(g => g.name === name ? { ...g, top5: true } : g);
      } else {
        if (exists) {
          // unchecking — remove from list entirely
          next = prev.filter(g => g.name !== name);
        } else {
          // checking — auto-mark as top5 if slots remain, otherwise top5:false
          const currentTop5Count = prev.filter(g => g.top5).length;
          next = [...prev, { name, top5: currentTop5Count < TOP5_MAX }];
        }
      }
      triggerAutosave({ garment_types: next });
      return next;
    });
  };

  const addCustomGarment = () => {
    const v = customGarment.trim();
    if (!v) return;
    setAllGarmentNames(p => [...p, v]);
    setGarments(prev => { const next = [...prev, { name: v, top5: false }]; triggerAutosave({ garment_types: next }); return next; });
    setCustomGarment(''); setAddingGarment(false);
  };

  const toggleHF = item => {
    setHomeFurnishings(prev => {
      const next = prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item];
      triggerAutosave({ home_furnishings: next });
      return next;
    });
  };

  /* change 5: add item to an existing HF group */
  const addHFItem = (groupName, itemName) => {
    setHfGroups(prev => prev.map(g => g.group === groupName ? { ...g, items: [...g.items, itemName] } : g));
    setHomeFurnishings(prev => {
      const next = [...prev, itemName];
      triggerAutosave({ home_furnishings: next });
      return next;
    });
  };

  /* change 5: add a whole new HF category */
  const addHFCategory = () => {
    const v = newCatName.trim();
    if (!v) return;
    setHfGroups(prev => [...prev, { group: v, items: [] }]);
    setNewCatName(''); setAddingCategory(false);
  };

  const save = async (andNext = false) => {
    setSaving(true);
    try {
      await API.putStudio(profileId, {
        gender_focus: genders, occasions,
        garment_types: garments, home_furnishings: homeFurnishings,
      });
      success('Section B saved!');
      onSave?.();
      if (andNext) onNext?.();
    } catch (e) {
      error(e.response?.data ? JSON.stringify(e.response.data) : 'Save failed');
    } finally { setSaving(false); }
  };

  return (
    <div style={{ padding: '40px 48px', maxWidth: 760 }}>
      <Toast toasts={toasts} />
      <SectionHeader letter="B" title="Categories" desc="Which buyers you dress, what you make, and how well. These are the primary matching signals for Qalawati." />

      <CategoryAccordion name="Apparel" sub="Clothing, garments, accessories" defaultOpen count={genders.length + occasions.length + garments.length}>

        <CardSection title="B.1 — Gender">
          <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 14 }}>Check the categories you produce for. Order of checking becomes your ranking.</p>
          {GENDERS.map((name, i) => (
            <RankItemRow key={name} name={name} rank={genders.find(g => g.name === name)?.rank ?? null} onToggle={toggleGender} isLast={i === GENDERS.length - 1} />
          ))}
        </CardSection>

        <CardSection title="B.2 — Occasions">
          <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 14 }}>Rank by strength — first check = strongest occasion.</p>
          {allOccasionNames.map((name, i) => (
            <RankItemRow key={name} name={name} rank={occasions.find(o => o.name === name)?.rank ?? null} onToggle={toggleOccasion} isLast={i === allOccasionNames.length - 1} />
          ))}
          {addingOcc ? (
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <input style={{ ...inputStyle, flex: 1 }} value={customOcc} onChange={e => setCustomOcc(e.target.value)} placeholder="e.g. Maternity wear" />
              <button className="btn btn-teal btn-sm" onClick={addCustomOccasion}>Add</button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setAddingOcc(false); setCustomOcc(''); }}>Cancel</button>
            </div>
          ) : (
            <button className="btn btn-outline btn-sm" style={{ marginTop: 12 }} onClick={() => setAddingOcc(true)}>+ Add occasion</button>
          )}
        </CardSection>

        <CardSection title="B.3 — Garment Types">
          <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 6 }}>Select all garment types you produce. Your first 5 selections are automatically marked as Top — you can change which are Top by clicking the ★ button.</p>
          <p style={{ fontSize: 12, color: '#D97520', marginBottom: 14, fontWeight: 600 }}>Top 5 slots: {TOP5_MAX - top5Count} remaining</p>
          {allGarmentNames.map((name, i) => {
            const g = garments.find(x => x.name === name);
            return (
              <Top5Row key={name} name={name} checked={!!g} top5={!!g?.top5} capReached={top5Count >= TOP5_MAX} onToggle={toggleGarment} isLast={i === allGarmentNames.length - 1} />
            );
          })}
          {addingGarment ? (
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <input style={{ ...inputStyle, flex: 1 }} value={customGarment} onChange={e => setCustomGarment(e.target.value)} placeholder="e.g. Sarees" />
              <button className="btn btn-teal btn-sm" onClick={addCustomGarment}>Add</button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setAddingGarment(false); setCustomGarment(''); }}>Cancel</button>
            </div>
          ) : (
            <button className="btn btn-outline btn-sm" style={{ marginTop: 12, borderStyle: 'dashed' }} onClick={() => setAddingGarment(true)}>+ Add garment type not in list</button>
          )}
        </CardSection>
      </CategoryAccordion>

      {/* change 5: HF groups with per-group "Add other" + "Add category" at bottom */}
      <CategoryAccordion name="Home Furnishings" sub="Textiles for the home" count={homeFurnishings.length}>
        {hfGroups.map(g => (
          <HFGroup key={g.group} group={g.group} items={g.items} checked={homeFurnishings} onToggle={toggleHF} onAddItem={addHFItem} />
        ))}

        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          {addingCategory ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <input style={{ ...inputStyle, flex: 1, height: 34 }} value={newCatName} onChange={e => setNewCatName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addHFCategory(); } }}
                placeholder="New category name, e.g. Outdoor / Garden" autoFocus />
              <button className="btn btn-teal btn-sm" onClick={addHFCategory}>Add Category</button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setAddingCategory(false); setNewCatName(''); }}>Cancel</button>
            </div>
          ) : (
            <button className="btn btn-outline btn-sm" style={{ borderStyle: 'dashed' }} onClick={() => setAddingCategory(true)}>+ Add category</button>
          )}
        </div>
      </CategoryAccordion>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 8 }}>
        <button className="btn btn-primary btn-lg fade-up" onClick={() => save(true)} disabled={saving}>
          {saving ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Saving…</> : 'Save & Next'}
        </button>
        <button className="btn btn-ghost fade-up" onClick={() => save(false)} disabled={saving}>Save</button>
        <SavedPulse show={savedPulse} />
      </div>
    </div>
  );
}
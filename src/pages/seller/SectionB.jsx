import { useState, useEffect, useRef } from 'react';
import { onboardingAPI } from '../../api/client';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../../components/Toast';
import {
  SectionHeader, QCard, SectionFooter, RankRow, Top5Row, CheckRow,
  CategoryAccordion, GroupAccordion, AddButton, useAutosave, inputStyle, textareaStyle, TOP5_MAX,
  CollabToggle,
} from './_ui';

const API = onboardingAPI;

const GENDERS = ['Womenswear', 'Menswear', 'Gender Neutral / Unisex', 'Kidswear'];

const OCCASIONS_DEFAULT = [
  'Resortwear / Travel', 'Everyday / Casual', 'Occasionwear / Ethnic',
  'Festive / Bridal', 'Workwear / Contemporary', 'Loungewear / Sleepwear', 'Activewear',
];

/* B.3 — "Accessories / Scarves / Stoles" intentionally NOT in this default list.
   Sellers who selected it under the old form still see it (union with saved data),
   and it also lives on in B.4 as "Scarves / Stoles / Dupattas". */
const GARMENTS_DEFAULT = [
  'Dresses', 'Coord Sets', 'Tops', 'Kaftans', 'Tunics / Kurtas', 'Skirts',
  'Shirts', 'Trousers / Pants', 'Blazers / Jackets', 'Jumpsuits',
];

/* B.4 — Accessory Types (new card). */
const ACCESSORIES_DEFAULT = [
  'Bags / Totes / Clutches', 'Scarves / Stoles / Dupattas', 'Jewellery',
  'Caps / Hats', 'Belts / Sashes', 'Footwear', 'Pouches / Small Accessories',
];

/* B.5 — Home Furnishings. Labels track the prototype. HF_LEGACY_ALIASES maps a
   previously-stored value to its new label so a saved answer still renders,
   checked, under the new name without rewriting the DB. */
const HOME_FURNISHINGS_DEFAULT = [
  { group: 'Bedding',              items: ['Bed sheets / Bedcovers', 'Duvet covers / Quilt covers', 'Pillowcases / Pillow covers', 'Bed runners / Bolsters', 'Quilts / Razais'] },
  { group: 'Table Linen',         items: ['Tablecloths', 'Table runners', 'Napkins / Placemats', 'Tea towels / Bread baskets'] },
  { group: 'Kitchen Linen',       items: ['Aprons', 'Oven mitts / Pot holders', 'Dish towels / Kitchen cloths'] },
  { group: 'Bath Linen',          items: ['Bath towels / Hand towels', 'Bath mats / Bath rugs', 'Bathrobes / Wraps', 'Wash cloths / Face cloths'] },
  { group: 'Living Room Textiles',items: ['Cushion covers / Throw pillows', 'Throw blankets / Sofa throws', 'Pouf covers / Ottoman covers'] },
  { group: 'Curtains & Drapes',   items: ['Curtain panels', 'Sheer curtains', 'Valances / Pelmets', 'Door curtains / Dividers'] },
  { group: 'Upholstery',          items: ['Sofa / chair fabric panels', 'Headboard fabric', 'Bench / stool covers'] },
  { group: 'Floor Coverings',     items: ['Rugs / Carpets', 'Dhurries / Flatweave rugs', 'Doormats / Entry mats', 'Prayer mats / Yoga mats'] },
  { group: 'Wall Textiles',       items: ['Tapestries', 'Wall hangings / Textile art', 'Macramé / Woven panels'] },
  { group: 'Accessories & Gift',  items: ['Tote bags / Market bags', 'Gift wrapping fabric / Furoshiki', 'Storage baskets / Organizers', 'Patchwork / Quilted panels'] },
];

const HF_LEGACY_ALIASES = {
  'Bed sheets':               'Bed sheets / Bedcovers',
  'Duvet covers':             'Duvet covers / Quilt covers',
  'Pillow covers':            'Pillowcases / Pillow covers',
  'Bed runners':              'Bed runners / Bolsters',
  'Napkins':                  'Napkins / Placemats',
  'Placemats':                'Napkins / Placemats',
  'Kitchen towels':           'Dish towels / Kitchen cloths',
  'Oven mitts':               'Oven mitts / Pot holders',
  'Bath towels':              'Bath towels / Hand towels',
  'Hand towels':              'Bath towels / Hand towels',
  'Bathrobes':                'Bathrobes / Wraps',
  'Bath mats':                'Bath mats / Bath rugs',
  'Cushion covers':           'Cushion covers / Throw pillows',
  'Sofa throws / Blankets':   'Throw blankets / Sofa throws',
  'Poufs':                    'Pouf covers / Ottoman covers',
  'Rugs':                     'Rugs / Carpets',
  'Dhurries':                 'Dhurries / Flatweave rugs',
  'Doormats':                 'Doormats / Entry mats',
  'Wall hangings':            'Wall hangings / Textile art',
  'Tapestries':               'Tapestries',
  'Macrame panels':           'Macramé / Woven panels',
  'Storage baskets':          'Storage baskets / Organizers',
};

/* One home-furnishing group: selectable items + inline "add item".
   Custom groups additionally get a delete button (via onRemoveGroup). */
function HFGroup({ group, selected, onToggle, onAddItem, onRemoveGroup, onRemoveItem, isCustomItem }) {
  const [adding, setAdding] = useState(false);
  const [val, setVal] = useState('');
  const count = group.items.filter(i => selected.includes(i)).length;
  const commit = () => { const v = val.trim(); if (!v) return; onAddItem(v); setVal(''); setAdding(false); };
  return (
    <GroupAccordion label={group.group} count={count}
      onDelete={onRemoveGroup} deleteLabel={`Remove ${group.group} category`}>
      {group.items.map((item, i) => (
        <CheckRow key={item} name={item} checked={selected.includes(item)} onToggle={onToggle} isLast={i === group.items.length - 1 && !adding}
          onRemove={onRemoveItem && isCustomItem?.(group.group, item) ? () => onRemoveItem(group.group, item) : undefined} />
      ))}
      {group.items.length === 0 && !adding && (
        <div style={{ fontSize: 12, color: '#BBB', fontStyle: 'italic', padding: '8px 0' }}>No items yet — add one below.</div>
      )}
      {adding ? (
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <input style={{ ...inputStyle, flex: 1 }} value={val} onChange={e => setVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commit(); } if (e.key === 'Escape') { setAdding(false); setVal(''); } }}
            placeholder="e.g. add a product type" autoFocus />
          <button className="btn btn-primary btn-sm" onClick={commit}>Add</button>
          <button className="btn btn-ghost btn-sm" onClick={() => { setAdding(false); setVal(''); }}>Cancel</button>
        </div>
      ) : (
        <AddButton onClick={() => setAdding(true)}>+ Add other</AddButton>
      )}
    </GroupAccordion>
  );
}

export default function SectionB({ profileId, initialData, onSave, onNext }) {
  const { toasts, success, error } = useToast();

  const [genders, setGenders]     = useState([]);
  const [occasions, setOccasions] = useState([]);
  const [customOcc, setCustomOcc] = useState('');
  const [addingOcc, setAddingOcc] = useState(false);
  const [allOccasionNames, setAllOccasionNames] = useState(OCCASIONS_DEFAULT);

  const [garments, setGarments]           = useState([]);
  const [customGarment, setCustomGarment] = useState('');
  const [addingGarment, setAddingGarment] = useState(false);
  const [allGarmentNames, setAllGarmentNames] = useState(GARMENTS_DEFAULT);

  const [accessories, setAccessories]         = useState([]);
  const [customAcc, setCustomAcc]             = useState('');
  const [addingAcc, setAddingAcc]             = useState(false);
  const [allAccessoryNames, setAllAccessoryNames] = useState(ACCESSORIES_DEFAULT);

  const [homeFurnishings, setHomeFurnishings] = useState([]);
  const [hfGroups, setHfGroups]               = useState(HOME_FURNISHINGS_DEFAULT);
  const [categoryNotes, setCategoryNotes]     = useState('');
  const [addingHFGroup, setAddingHFGroup]     = useState(false);
  const [newHFGroup, setNewHFGroup]           = useState('');

  // Matchmaking spec v0.6 §2 — Stage 1 hard filter. Defaults true so a studio
  // that hasn't touched this looks unchanged to the matching engine.
  const [acceptingProjects, setAcceptingProjects] = useState(true);

  const [saving, setSaving] = useState(false);
  const hydrated            = useRef(false); // hydrate from server only once

  const populateFromData = (d) => {
    if (!d) return;
    setGenders(d.gender_focus || []);
    setCategoryNotes(d.category_notes || '');
    setAcceptingProjects(d.accepting_new_projects !== false);

    const occ = d.occasions || [];
    setOccasions(occ);
    const customOccNames = occ.map(o => o.name).filter(n => !OCCASIONS_DEFAULT.includes(n));
    setAllOccasionNames([...OCCASIONS_DEFAULT, ...customOccNames]);

    const gar = d.garment_types || [];
    setGarments(gar);
    const customGarNames = gar.map(g => g.name).filter(n => !GARMENTS_DEFAULT.includes(n));
    setAllGarmentNames([...GARMENTS_DEFAULT, ...customGarNames]);

    const acc = d.accessory_types || [];
    setAccessories(acc);
    const customAccNames = acc.filter(n => !ACCESSORIES_DEFAULT.includes(n));
    setAllAccessoryNames([...ACCESSORIES_DEFAULT, ...customAccNames]);

    // Home furnishings: alias legacy values to new labels for display; any value
    // we don't recognise is a seller custom item — collect it into an "Other"
    // group at the bottom rather than force-fitting it into a named category.
    const hf = d.home_furnishings || [];
    const aliased = hf.map(v => HF_LEGACY_ALIASES[v] || v);
    setHomeFurnishings(aliased);
    const known = new Set(HOME_FURNISHINGS_DEFAULT.flatMap(g => g.items));
    const extras = aliased.filter(v => !known.has(v));
    if (extras.length) {
      setHfGroups(prev => {
        const next = prev.map(g => ({ ...g, items: [...g.items] }));
        let other = next.find(g => g.group === 'Other');
        if (!other) { other = { group: 'Other', items: [], custom: true }; next.push(other); }
        extras.forEach(v => { if (!other.items.includes(v)) other.items.push(v); });
        return next;
      });
    }
  };

  /* ── Home-furnishing editing: add item within a group, add a new group ── */
  const addHFItem = (groupName, itemName) => {
    const v = itemName.trim(); if (!v) return;
    setHfGroups(prev => prev.map(g => g.group === groupName && !g.items.includes(v) ? { ...g, items: [...g.items, v] } : g));
    // Adding an item also selects it, so it persists in home_furnishings.
    setHomeFurnishings(prev => { const next = prev.includes(v) ? prev : [...prev, v]; return next; });
  };

  // Remove a studio-added item from a home-furnishings group (built-ins stay).
  const removeHFItem = (groupName, itemName) => {
    setHfGroups(prev => prev.map(g => g.group === groupName ? { ...g, items: g.items.filter(i => i !== itemName) } : g));
    setHomeFurnishings(prev => { const next = prev.filter(x => x !== itemName); return next; });
  };

  // An item is studio-added if it isn't in the built-in list for that group.
  const isCustomHFItem = (groupName, item) => {
    const base = HOME_FURNISHINGS_DEFAULT.find(g => g.group === groupName);
    return !base || !base.items.includes(item);
  };

  const addHFGroup = (groupName) => {
    const v = groupName.trim(); if (!v) return;
    setHfGroups(prev => prev.some(g => g.group.toLowerCase() === v.toLowerCase()) ? prev : [...prev, { group: v, items: [], custom: true }]);
  };

  const removeHFGroup = (groupName) => {
    setHfGroups(prev => {
      const grp = prev.find(g => g.group === groupName);
      if (grp) {
        setHomeFurnishings(hfPrev => { const next = hfPrev.filter(x => !grp.items.includes(x)); return next; });
      }
      return prev.filter(g => g.group !== groupName);
    });
  };

  // Hydrate from the server exactly ONCE. Re-populating on every initialData
  // change (which the parent produces after each Save/Next) would overwrite
  // selections made since the last load.
  useEffect(() => {
    if (initialData && !hydrated.current) { populateFromData(initialData); hydrated.current = true; }
  }, [initialData]);

  useEffect(() => {
    if (!profileId || hydrated.current || initialData) return;
    API.getStudio(profileId).then(r => { populateFromData(r.data); hydrated.current = true; }).catch(() => {});
  }, [profileId]);

  // Category selections are persisted by the shared useAutosave below, which
  // sends every category field together. The section previously ran its own
  // private 800ms debounce (`triggerAutosave`) that merged payloads and flushed
  // on unmount — but it was never registered with the autosave registry, so a
  // pending selection was dropped whenever the seller logged out, closed the
  // tab, refreshed, or backgrounded the page. Those are exactly the moments
  // work gets lost. Deleting it in favour of the shared hook picks up the
  // registry, the page-lifecycle flushes, failure retries and the error
  // indicator for free.

  const nextRank = list => list.length ? Math.max(...list.map(x => x.rank)) + 1 : 1;

  const toggleGender = name => {
    setGenders(prev => {
      const exists = prev.find(g => g.name === name);
      const next = exists
        ? prev.filter(g => g.name !== name).sort((a, b) => a.rank - b.rank).map((g, i) => ({ ...g, rank: i + 1 }))
        : [...prev, { name, rank: nextRank(prev) }];
      return next;
    });
  };

  const toggleOccasion = name => {
    setOccasions(prev => {
      const exists = prev.find(o => o.name === name);
      const next = exists
        ? prev.filter(o => o.name !== name).sort((a, b) => a.rank - b.rank).map((o, i) => ({ ...o, rank: i + 1 }))
        : [...prev, { name, rank: nextRank(prev) }];
      return next;
    });
  };

  const addCustomOccasion = () => {
    const v = customOcc.trim(); if (!v) return;
    setAllOccasionNames(prev => [...prev, v]);
    setOccasions(prev => { const next = [...prev, { name: v, rank: nextRank(prev) }]; return next; });
    setCustomOcc(''); setAddingOcc(false);
  };

  /* ── Removing studio-added entries ───────────────────────────────────────
     Only names the studio typed in are removable — the built-in options stay.
     Removing clears the name from the picker AND from the saved selection, then
     autosaves so the deletion sticks. */
  const isCustom = (name, defaults) => !defaults.includes(name);

  const removeCustomOccasion = (name) => {
    setAllOccasionNames(prev => prev.filter(n => n !== name));
    setOccasions(prev => {
      const next = prev.filter(o => o.name !== name).map((o, i) => ({ ...o, rank: i + 1 }));
      return next;
    });
  };

  const removeCustomGarment = (name) => {
    setAllGarmentNames(prev => prev.filter(n => n !== name));
    setGarments(prev => {
      const next = prev.filter(g => g.name !== name);
      return next;
    });
  };

  const removeCustomAccessory = (name) => {
    setAllAccessoryNames(prev => prev.filter(n => n !== name));
    setAccessories(prev => {
      const next = prev.filter(a => a !== name);
      return next;
    });
  };

  const top5Count = garments.filter(g => g.top5).length;

  const toggleGarment = (name, mode) => {
    setGarments(prev => {
      let next = prev;
      const exists = prev.find(g => g.name === name);
      if (mode === 'top5') {
        if (!exists) return prev;
        next = exists.top5
          ? prev.map(g => g.name === name ? { ...g, top5: false } : g)
          : prev.filter(g => g.top5).length >= TOP5_MAX ? prev
          : prev.map(g => g.name === name ? { ...g, top5: true } : g);
      } else if (exists) {
        next = prev.filter(g => g.name !== name);
      } else {
        const currentTop5 = prev.filter(g => g.top5).length;
        next = [...prev, { name, top5: currentTop5 < TOP5_MAX }];
      }
      return next;
    });
  };

  const addCustomGarment = () => {
    const v = customGarment.trim(); if (!v) return;
    setAllGarmentNames(p => [...p, v]);
    setGarments(prev => { const next = [...prev, { name: v, top5: false }]; return next; });
    setCustomGarment(''); setAddingGarment(false);
  };

  const toggleAccessory = name => {
    setAccessories(prev => {
      const next = prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name];
      return next;
    });
  };

  const addCustomAccessory = () => {
    const v = customAcc.trim(); if (!v) return;
    setAllAccessoryNames(p => [...p, v]);
    setAccessories(prev => { const next = [...prev, v]; return next; });
    setCustomAcc(''); setAddingAcc(false);
  };

  const toggleHF = item => {
    setHomeFurnishings(prev => {
      const next = prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item];
      return next;
    });
  };

  // One autosave for the whole section. Previously this covered `category_notes`
  // ONLY — every other field on the page (gender focus, occasions, garment
  // types, accessories, home furnishings) went through the private debounce that
  // has just been removed, so none of them were reachable by the logout flush or
  // the page-lifecycle handlers.
  const autoSaving = useAutosave(
    () => API.patchStudio(profileId, {
      gender_focus:     genders,
      occasions,
      garment_types:    garments,
      accessory_types:  accessories,
      home_furnishings: homeFurnishings,
      category_notes:   categoryNotes,
    }),
    [genders, occasions, garments, accessories, homeFurnishings, categoryNotes]
  );

  const toggleAcceptingProjects = () => {
    setAcceptingProjects(prev => {
      const next = !prev;
      API.patchStudio(profileId, { accepting_new_projects: next }).catch(
        () => error('Could not update your availability — please try again.')
      );
      return next;
    });
  };

  const save = async (andNext = false) => {
    setSaving(true);
    try {
      await API.putStudio(profileId, {
        gender_focus: genders, occasions,
        garment_types: garments, accessory_types: accessories,
        home_furnishings: homeFurnishings,
        category_notes: categoryNotes,
        accepting_new_projects: acceptingProjects,
      });
      success('Section B saved!');
      onSave?.();
      if (andNext) onNext?.();
    } catch (e) {
      error(e.response?.data ? JSON.stringify(e.response.data) : 'Save failed');
    } finally { setSaving(false); }
  };

  const fashionCount = genders.length + occasions.length + garments.length + accessories.length;

  return (
    <div style={{ padding: '40px 48px 80px', maxWidth: 760 }}>
      <Toast toasts={toasts} />
      <SectionHeader letter="B" title="Categories" desc="What categories you work with and have expertise in." />

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', marginBottom: 24, borderRadius: 8,
        background: acceptingProjects ? '#F3F6F1' : '#F7F1EC',
        border: `1px solid ${acceptingProjects ? '#7A8C6E' : '#D8D4CF'}`,
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>
            {acceptingProjects ? 'Currently accepting new projects' : 'Not accepting new projects right now'}
          </div>
          <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
            Turn this off if you're at capacity — buyers won't be matched to your studio until you turn it back on.
          </div>
        </div>
        <CollabToggle checked={acceptingProjects} onChange={toggleAcceptingProjects} label={acceptingProjects ? 'On' : 'Off'} />
      </div>

      {/* ── Fashion ── */}
      <CategoryAccordion icon="👗" name="Fashion" sub="Clothing and Accessories" defaultOpen count={fashionCount}>

        <QCard qref="B.1" title="Gender" desc="Select who you produce for — check in order of strength. First checked = your primary market.">
          {GENDERS.map((name, i) => (
            <RankRow key={name} name={name} rank={genders.find(g => g.name === name)?.rank ?? null} onToggle={toggleGender} isLast={i === GENDERS.length - 1} />
          ))}
        </QCard>

        <QCard qref="B.2" title="Occasions" desc="Select the occasions you produce for — check in order of strength. First checked = best at, and so on.">
          {allOccasionNames.map((name, i) => (
            <RankRow key={name} name={name} rank={occasions.find(o => o.name === name)?.rank ?? null} onToggle={toggleOccasion} isLast={i === allOccasionNames.length - 1}
              onRemove={isCustom(name, OCCASIONS_DEFAULT) ? () => removeCustomOccasion(name) : undefined} />
          ))}
          {addingOcc ? (
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <input style={{ ...inputStyle, flex: 1 }} value={customOcc} onChange={e => setCustomOcc(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomOccasion(); } }}
                placeholder="e.g. Swimwear, Sportswear, Uniform…" autoFocus />
              <button className="btn btn-primary btn-sm" onClick={addCustomOccasion}>Add</button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setAddingOcc(false); setCustomOcc(''); }}>Cancel</button>
            </div>
          ) : (
            <AddButton onClick={() => setAddingOcc(true)}>+ Add occasion</AddButton>
          )}
        </QCard>

        <QCard qref="B.3" title="Garment Types" desc="Select all garment types you produce. Check your best 5 first — they'll be highlighted as your top garment types on your profile.">
          <div style={{
            fontSize: 11, borderRadius: 5, padding: '6px 12px', marginBottom: 12, display: 'inline-block',
            background: top5Count >= TOP5_MAX ? '#FEF0EC' : '#EEF3EC',
            color: top5Count >= TOP5_MAX ? '#C0392B' : '#4A7C4A',
          }}>
            Top 5 slots: <strong>{Math.max(0, TOP5_MAX - top5Count)}</strong> remaining
          </div>
          {allGarmentNames.map((name, i) => {
            const g = garments.find(x => x.name === name);
            return (
              <Top5Row key={name} name={name} checked={!!g} top5={!!g?.top5}
                capReached={top5Count >= TOP5_MAX} onToggle={toggleGarment}
                isLast={i === allGarmentNames.length - 1}
                onRemove={isCustom(name, GARMENTS_DEFAULT) ? () => removeCustomGarment(name) : undefined} />
            );
          })}
          {addingGarment ? (
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <input style={{ ...inputStyle, flex: 1 }} value={customGarment} onChange={e => setCustomGarment(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomGarment(); } }}
                placeholder="e.g. Swimwear, Sherwani, Dhoti sets…" autoFocus />
              <button className="btn btn-primary btn-sm" onClick={addCustomGarment}>Add</button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setAddingGarment(false); setCustomGarment(''); }}>Cancel</button>
            </div>
          ) : (
            <AddButton inline onClick={() => setAddingGarment(true)}>+ Add garment type not in list</AddButton>
          )}
        </QCard>

        <QCard qref="B.4" title="Accessory Types" desc="Select all accessory types your studio produces.">
          {allAccessoryNames.map((name, i) => (
            <CheckRow key={name} name={name} checked={accessories.includes(name)} onToggle={toggleAccessory} isLast={i === allAccessoryNames.length - 1}
              onRemove={isCustom(name, ACCESSORIES_DEFAULT) ? () => removeCustomAccessory(name) : undefined} />
          ))}
          {addingAcc ? (
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <input style={{ ...inputStyle, flex: 1 }} value={customAcc} onChange={e => setCustomAcc(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomAccessory(); } }}
                placeholder="e.g. Sunglasses, Hair accessories…" autoFocus />
              <button className="btn btn-primary btn-sm" onClick={addCustomAccessory}>Add</button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setAddingAcc(false); setCustomAcc(''); }}>Cancel</button>
            </div>
          ) : (
            <AddButton inline onClick={() => setAddingAcc(true)}>+ Add accessory type not in list</AddButton>
          )}
        </QCard>

      </CategoryAccordion>

      {/* ── Home Furnishings ── */}
      <CategoryAccordion icon="🏠" name="Home Furnishings" sub="Bedding, table linen, soft furnishings, décor" count={homeFurnishings.length}>
        <QCard qref="B.5" title="Home Furnishing Categories" desc="Select the home furnishing categories your studio produces. Open each to select specific product types.">
          {hfGroups.map(g => (
            <HFGroup
              key={g.group}
              group={g}
              selected={homeFurnishings}
              onToggle={toggleHF}
              onAddItem={name => addHFItem(g.group, name)}
              onRemoveGroup={g.custom ? () => removeHFGroup(g.group) : undefined}
              onRemoveItem={removeHFItem}
              isCustomItem={isCustomHFItem}
            />
          ))}
          {addingHFGroup ? (
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <input style={{ ...inputStyle, flex: 1 }} value={newHFGroup} onChange={e => setNewHFGroup(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addHFGroup(newHFGroup); setNewHFGroup(''); setAddingHFGroup(false); } }}
                placeholder="e.g. Outdoor / Garden, Pet Textiles, Nursery…" autoFocus />
              <button className="btn btn-primary btn-sm" onClick={() => { addHFGroup(newHFGroup); setNewHFGroup(''); setAddingHFGroup(false); }}>Add Category</button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setAddingHFGroup(false); setNewHFGroup(''); }}>Cancel</button>
            </div>
          ) : (
            <AddButton inline onClick={() => setAddingHFGroup(true)}>+ Add category not in list</AddButton>
          )}
        </QCard>
      </CategoryAccordion>

      <QCard qref="B.6" title="More About the Categories" desc="Anything about what you make that the options above don't capture — signature product types, combinations you specialise in, or categories you're expanding into.">
        <textarea rows={3} style={textareaStyle} value={categoryNotes} onChange={e => setCategoryNotes(e.target.value)}
          placeholder="e.g. We're known for our co-ord sets and resortwear, and we're starting to take on structured tailoring. We also do a small line of hand-embroidered kidswear on request." />
      </QCard>

      <SectionFooter onNext={() => save(true)} saving={saving} autoSaving={autoSaving} />
    </div>
  );
}
import { useState, useEffect } from 'react';
import { onboardingAPI } from '../../api/client';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../../components/Toast';

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

const HOME_FURNISHINGS = [
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

/* ── Ranked item row (gender, occasions) ── */
function RankItemRow({ name, rank, onToggle }) {
  const checked = rank != null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', flex: 1 }}>
        <input type="checkbox" checked={checked} onChange={() => onToggle(name)} />
        <span style={{ fontSize: 14, color: 'var(--text)' }}>{name}</span>
      </label>
      <div style={{
        width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: checked ? 'var(--gold)' : 'transparent', color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0,
      }}>
        {checked ? rank : ''}
      </div>
    </div>
  );
}

/* ── Top 5 garment row ── */
function Top5Row({ name, top5, checked, onToggle, disabled }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', flex: 1 }}>
        <input type="checkbox" checked={checked} onChange={() => onToggle(name)} />
        <span style={{ fontSize: 14, color: 'var(--text)' }}>{name}</span>
      </label>
      {checked && (
        <button
          onClick={() => onToggle(name, 'top5')}
          disabled={disabled && !top5}
          style={{
            fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 4,
            background: top5 ? 'var(--gold-dim)' : 'transparent',
            color: top5 ? 'var(--gold)' : 'var(--text4)',
            border: `1px solid ${top5 ? 'rgba(200,165,90,0.4)' : 'var(--border2)'}`,
            cursor: disabled && !top5 ? 'not-allowed' : 'pointer', opacity: disabled && !top5 ? 0.4 : 1,
          }}>
          ★ Top
        </button>
      )}
    </div>
  );
}

/* ── Category accordion (Apparel / Home Furnishings) ── */
function CategoryAccordion({ icon, name, sub, count, defaultOpen, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ border: '1px solid var(--border2)', borderRadius: 10, marginBottom: 12, overflow: 'hidden' }}>
      <div onClick={() => setOpen(o => !o)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 18px', background: 'var(--surface2)', cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>{icon}</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{name}</div>
            <div style={{ fontSize: 11, color: 'var(--text4)' }}>{sub}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {count > 0 && <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--gold)', background: 'var(--gold-dim)', padding: '3px 8px', borderRadius: 4 }}>{count}</span>}
          <span style={{ fontSize: 12, color: 'var(--text4)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>▾</span>
        </div>
      </div>
      {open && <div style={{ padding: '4px 18px 16px', background: 'var(--surface)' }}>{children}</div>}
    </div>
  );
}

/* ── Home furnishing sub-group ── */
function HFGroup({ group, items, checked, onToggle }) {
  const count = items.filter(i => checked.includes(i)).length;
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
              border: `1px solid ${isChecked ? 'rgba(200,165,90,0.4)' : 'var(--border2)'}`,
              background: isChecked ? 'var(--gold-dim)' : 'var(--surface2)', cursor: 'pointer', fontSize: 12,
            }}>
              <input type="checkbox" checked={isChecked} onChange={() => onToggle(item)} style={{ margin: 0 }} />
              {item}
            </label>
          );
        })}
      </div>
    </div>
  );
}

export default function SectionB({ profileId, onSave }) {
  const { toasts, success, error } = useToast();

  const [genders, setGenders]     = useState([]); // [{name, rank}]
  const [occasions, setOccasions] = useState([]); // [{name, rank}]
  const [customOcc, setCustomOcc] = useState('');
  const [addingOcc, setAddingOcc] = useState(false);

  const [garments, setGarments]   = useState([]); // [{name, top5}]
  const [customGarment, setCustomGarment] = useState('');
  const [addingGarment, setAddingGarment]   = useState(false);

  const [homeFurnishings, setHomeFurnishings] = useState([]); // string[]

  const [saving, setSaving] = useState(false);
  const [allGarmentNames, setAllGarmentNames] = useState(GARMENTS_DEFAULT);
  const [allOccasionNames, setAllOccasionNames] = useState(OCCASIONS_DEFAULT);

  useEffect(() => {
    if (!profileId) return;
    API.getStudio(profileId).then(r => {
      const d = r.data;
      if (!d) return;
      setGenders(d.gender_focus || []);
      const occ = d.occasions || [];
      setOccasions(occ);
      // merge any custom occasions into the displayed list
      const customNames = occ.map(o => o.name).filter(n => !OCCASIONS_DEFAULT.includes(n));
      setAllOccasionNames([...OCCASIONS_DEFAULT, ...customNames]);

      const gar = d.garment_types || [];
      setGarments(gar);
      const customGarmentNames = gar.map(g => g.name).filter(n => !GARMENTS_DEFAULT.includes(n));
      setAllGarmentNames([...GARMENTS_DEFAULT, ...customGarmentNames]);

      setHomeFurnishings(d.home_furnishings || []);
    }).catch(() => {});
  }, [profileId]);

  const nextRank = list => (list.length ? Math.max(...list.map(x => x.rank)) + 1 : 1);

  const toggleGender = name => {
    setGenders(prev => {
      const exists = prev.find(g => g.name === name);
      if (exists) {
        const filtered = prev.filter(g => g.name !== name).sort((a, b) => a.rank - b.rank);
        return filtered.map((g, i) => ({ ...g, rank: i + 1 }));
      }
      return [...prev, { name, rank: nextRank(prev) }];
    });
  };

  const toggleOccasion = name => {
    setOccasions(prev => {
      const exists = prev.find(o => o.name === name);
      if (exists) {
        const filtered = prev.filter(o => o.name !== name).sort((a, b) => a.rank - b.rank);
        return filtered.map((o, i) => ({ ...o, rank: i + 1 }));
      }
      return [...prev, { name, rank: nextRank(prev) }];
    });
  };

  const addCustomOccasion = () => {
    const v = customOcc.trim();
    if (!v) return;
    setAllOccasionNames(prev => [...prev, v]);
    setOccasions(prev => [...prev, { name: v, rank: nextRank(prev) }]);
    setCustomOcc('');
    setAddingOcc(false);
  };

  const TOP5_MAX = 5;
  const top5Count = garments.filter(g => g.top5).length;

  const toggleGarment = (name, mode) => {
    setGarments(prev => {
      const exists = prev.find(g => g.name === name);
      if (mode === 'top5') {
        if (!exists) return prev;
        if (exists.top5) {
          return prev.map(g => g.name === name ? { ...g, top5: false } : g);
        }
        if (top5Count >= TOP5_MAX) return prev; // cap
        return prev.map(g => g.name === name ? { ...g, top5: true } : g);
      }
      // toggling selection itself
      if (exists) {
        return prev.filter(g => g.name !== name);
      }
      return [...prev, { name, top5: false }];
    });
  };

  const addCustomGarment = () => {
    const v = customGarment.trim();
    if (!v) return;
    setAllGarmentNames(prev => [...prev, v]);
    setGarments(prev => [...prev, { name: v, top5: false }]);
    setCustomGarment('');
    setAddingGarment(false);
  };

  const toggleHF = item => {
    setHomeFurnishings(prev => prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item]);
  };

  const save = async () => {
    setSaving(true);
    try {
      await API.putStudio(profileId, {
        gender_focus: genders,
        occasions,
        garment_types: garments,
        home_furnishings: homeFurnishings,
      });
      success('Section B saved!');
      onSave?.();
    } catch (e) {
      error(e.response?.data ? JSON.stringify(e.response.data) : 'Save failed');
    } finally { setSaving(false); }
  };

  return (
    <div style={{ padding: '40px 48px', maxWidth: 760 }}>
      <Toast toasts={toasts} />
      <SectionHeader letter="B" title="Categories" desc="Which buyers you dress, what you make, and how well. These are the primary matching signals for Qalawati." />

      <CategoryAccordion icon="👗" name="Apparel" sub="Clothing, garments, accessories" defaultOpen count={genders.length + occasions.length + garments.length}>

        {/* B.1 Gender */}
        <CardSection title="B.1 — Gender">
          <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 14 }}>
            Check the categories you produce for. The order you check them in becomes your ranking — checked first means you do it best.
          </p>
          {GENDERS.map(name => (
            <RankItemRow key={name} name={name} rank={genders.find(g => g.name === name)?.rank ?? null} onToggle={toggleGender} />
          ))}
        </CardSection>

        {/* B.2 Occasions */}
        <CardSection title="B.2 — Occasions">
          <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 14 }}>
            Check the occasions you produce for. Rank them by strength — first check = strongest occasion.
          </p>
          {allOccasionNames.map(name => (
            <RankItemRow key={name} name={name} rank={occasions.find(o => o.name === name)?.rank ?? null} onToggle={toggleOccasion} />
          ))}
          {addingOcc ? (
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <input value={customOcc} onChange={e => setCustomOcc(e.target.value)} placeholder="e.g. Maternity wear" style={{ flex: 1 }} />
              <button className="btn btn-teal btn-sm" onClick={addCustomOccasion}>Add</button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setAddingOcc(false); setCustomOcc(''); }}>Cancel</button>
            </div>
          ) : (
            <button className="btn btn-outline btn-sm" style={{ marginTop: 12 }} onClick={() => setAddingOcc(true)}>+ Add occasion</button>
          )}
        </CardSection>

        {/* B.3 Garment Types */}
        <CardSection title="B.3 — Garment Types">
          <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 6 }}>
            Select all garment types you produce. Check your best 5 first — they will be highlighted as your top garment types on your profile.
          </p>
          <p style={{ fontSize: 12, color: 'var(--gold)', marginBottom: 14, fontWeight: 600 }}>Top 5 slots: {TOP5_MAX - top5Count} remaining</p>
          {allGarmentNames.map(name => {
            const g = garments.find(x => x.name === name);
            return (
              <Top5Row
                key={name}
                name={name}
                checked={!!g}
                top5={!!g?.top5}
                disabled={top5Count >= TOP5_MAX}
                onToggle={toggleGarment}
              />
            );
          })}
          {addingGarment ? (
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <input value={customGarment} onChange={e => setCustomGarment(e.target.value)} placeholder="e.g. Sarees" style={{ flex: 1 }} />
              <button className="btn btn-teal btn-sm" onClick={addCustomGarment}>Add</button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setAddingGarment(false); setCustomGarment(''); }}>Cancel</button>
            </div>
          ) : (
            <button className="btn btn-outline btn-sm" style={{ marginTop: 12, borderStyle: 'dashed' }} onClick={() => setAddingGarment(true)}>+ Add garment type not in list</button>
          )}
        </CardSection>
      </CategoryAccordion>

      {/* Home Furnishings */}
      <CategoryAccordion icon="🏠" name="Home Furnishings" sub="Textiles for the home" count={homeFurnishings.length}>
        {HOME_FURNISHINGS.map(g => (
          <HFGroup key={g.group} group={g.group} items={g.items} checked={homeFurnishings} onToggle={toggleHF} />
        ))}
      </CategoryAccordion>

      <button className="btn btn-primary btn-lg fade-up" onClick={save} disabled={saving} style={{ marginTop: 8 }}>
        {saving ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Saving…</> : 'Save & Next'}
      </button>
    </div>
  );
}
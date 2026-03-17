import { useState, useEffect } from 'react';
import { onboardingAPI } from '../../api/client';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../../components/Toast';

// ── Exact 21 product types from ProductTypes model ──
const PRODUCT_LIST = [
  { key: 'dresses',                   label: 'Dresses' },
  { key: 'tops',                      label: 'Tops' },
  { key: 'shirts',                    label: 'Shirts' },
  { key: 't_shirts',                  label: 'T-Shirts' },
  { key: 'tunics_kurtas',             label: 'Tunics / Kurtas' },
  { key: 'coord_sets',                label: 'Coord Sets' },
  { key: 'jumpsuits',                 label: 'Jumpsuits' },
  { key: 'skirts',                    label: 'Skirts' },
  { key: 'shorts',                    label: 'Shorts' },
  { key: 'trousers_pants',            label: 'Trousers / Pants' },
  { key: 'denim',                     label: 'Denim' },
  { key: 'blazers',                   label: 'Blazers' },
  { key: 'coats_jackets',             label: 'Coats & Jackets' },
  { key: 'capes',                     label: 'Capes' },
  { key: 'waistcoats_vests',          label: 'Waistcoats / Vests' },
  { key: 'kaftans',                   label: 'Kaftans' },
  { key: 'resortwear_sets',           label: 'Resortwear Sets' },
  { key: 'loungewear_sleepwear',      label: 'Loungewear / Sleepwear' },
  { key: 'activewear',                label: 'Activewear' },
  { key: 'kidswear',                  label: 'Kidswear' },
  { key: 'accessories_scarves_stoles',label: 'Accessories / Scarves / Stoles' },
];

// ── Fabric list matching FabricAnswer model categories ──
const FABRIC_CATEGORIES = [
  { cat: 'cotton', label: 'Cotton Based', fabrics: [
    'Mulmul','Cambric','Poplin','Voile','Lawn','Dobby Cotton','Jacquard Cotton','Slub Cotton','Khadi Cotton',
  ]},
  { cat: 'silk', label: 'Silk Based', fabrics: [
    'Chanderi Silk','Banarasi Silk','Dupion Silk','Georgette Silk','Crepe Silk','Raw Silk / Kosa Silk','Tussar Silk','Matka Silk',
  ]},
  { cat: 'linen', label: 'Linen & Bast', fabrics: [
    'Pure Linen','Linen-Cotton Blend','Linen-Silk Blend','Hemp','Ramie',
  ]},
  { cat: 'wool', label: 'Wool Based', fabrics: [
    'Merino Wool','Pashmina','Shahtoosh-style Wool','Tweed','Woollen Dobby',
  ]},
  { cat: 'other', label: 'Others / Man-made', fabrics: [
    'Bamboo Jersey','Modal','Tencel / Lyocell','Viscose / Rayon','Polyester','Recycled Polyester','Nylon','Organza','Net / Tulle',
  ]},
];

function CardSection({ title, children }) {
  return (
    <div className="card fade-up" style={{ marginBottom: 20 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--text)', marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>{title}</div>
      {children}
    </div>
  );
}

export default function SectionB({ profileId, onSave }) {
  const { toasts, success, error } = useToast();
  const [products, setProducts] = useState({});
  const [fabrics, setFabrics]   = useState({}); // { fabric_name: { works_with, is_primary, innovation_note, category } }
  const [brands, setBrands]     = useState([]);
  const [awards, setAwards]     = useState([]);
  const [newBrand, setNewBrand] = useState({ brand_name: '', scope: '' });
  const [brandImg, setBrandImg] = useState(null);
  const [newAward, setNewAward] = useState({ award_name: '', link: '' });
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    if (!profileId) return;
    onboardingAPI.getProducts(profileId).then(r => setProducts(r.data || {})).catch(() => {});
    onboardingAPI.getFabrics(profileId).then(r => {
      const m = {};
      (r.data || []).forEach(f => { m[f.fabric_name] = f; });
      setFabrics(m);
    }).catch(() => {});
    onboardingAPI.getBrands(profileId).then(r => setBrands(r.data || [])).catch(() => {});
    onboardingAPI.getAwards(profileId).then(r => setAwards(r.data || [])).catch(() => {});
  }, [profileId]);

  const save = async () => {
    setSaving(true);
    try {
      await onboardingAPI.putProducts(profileId, products);
      const fabArr = Object.values(fabrics).filter(f => f.fabric_name);
      if (fabArr.length) await onboardingAPI.putFabrics(profileId, fabArr);
      success('Section B saved!');
      onSave?.();
    } catch (e) {
      error(e.response?.data ? JSON.stringify(e.response.data) : 'Save failed');
    } finally { setSaving(false); }
  };

  const toggleProduct = k => setProducts(p => ({ ...p, [k]: !p[k] }));

  const toggleFabric = (name, cat) => setFabrics(f => {
    const ex = f[name] || { category: cat, fabric_name: name, works_with: false, is_primary: null, innovation_note: '' };
    return { ...f, [name]: { ...ex, works_with: !ex.works_with } };
  });

  const setFabricPrimary = (name, cat, val) => setFabrics(f => {
    const ex = f[name] || { category: cat, fabric_name: name, works_with: true, innovation_note: '' };
    return { ...f, [name]: { ...ex, is_primary: val, works_with: true } };
  });

  const addBrand = async () => {
    if (!newBrand.brand_name) { error('Brand name required'); return; }
    try {
      const fd = new FormData();
      fd.append('brand_name', newBrand.brand_name);
      if (newBrand.scope) fd.append('scope', newBrand.scope);
      if (brandImg) fd.append('image', brandImg);
      fd.append('order', brands.length + 1);
      const r = await onboardingAPI.addBrand(profileId, fd);
      setBrands(b => [...b, r.data]);
      setNewBrand({ brand_name: '', scope: '' });
      setBrandImg(null);
      success('Brand added');
    } catch { error('Failed to add brand'); }
  };

  const delBrand = async id => {
    try { await onboardingAPI.delBrand(profileId, id); setBrands(b => b.filter(x => x.id !== id)); }
    catch { error('Failed'); }
  };

  const addAward = async () => {
    if (!newAward.award_name) { error('Award name required'); return; }
    try {
      const r = await onboardingAPI.addAward(profileId, { ...newAward, order: awards.length + 1 });
      setAwards(a => [...a, r.data]);
      setNewAward({ award_name: '', link: '' });
      success('Award added');
    } catch { error('Failed to add award'); }
  };

  return (
    <div style={{ padding: '40px 48px', maxWidth: 780 }}>
      <Toast toasts={toasts} />
      <div className="fade-up" style={{ marginBottom: 36 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{ width: 44, height: 44, borderRadius: 11, background: 'var(--gold-dim)', border: '1px solid rgba(200,165,90,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}></div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Section B</div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, color: 'var(--text)' }}>Products & Fabrics</h1>
          </div>
        </div>
        <p style={{ color: 'var(--text3)', fontSize: 14, marginLeft: 56 }}>What garments you produce, which fabrics you work with, your brand history, and any recognition.</p>
      </div>

      {/* B.1 Product Types */}
      <CardSection title="B.1 — Garment Types You Produce">
        <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16 }}>
          Select all the garment silhouettes your studio is set up to produce. These are direct filter signals — buyers search by these categories.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 7 }}>
          {PRODUCT_LIST.map(({ key, label }) => (
            <label key={key} style={{
              display: 'flex', alignItems: 'center', gap: 9,
              padding: '9px 12px', borderRadius: 'var(--radius)',
              background: products[key] ? 'var(--gold-dim)' : 'var(--surface2)',
              border: `1px solid ${products[key] ? 'rgba(200,165,90,0.3)' : 'var(--border)'}`,
              cursor: 'pointer', fontSize: 13, fontWeight: products[key] ? 600 : 400,
              color: products[key] ? 'var(--gold)' : 'var(--text2)',
              transition: 'all .15s',
            }}>
              <input type="checkbox" checked={!!products[key]} onChange={() => toggleProduct(key)}
                style={{ accentColor: 'var(--gold)', width: 13, height: 13, flexShrink: 0 }} />
              {label}
            </label>
          ))}
        </div>
      </CardSection>

      {/* B.2 Fabrics */}
      <CardSection title="B.2 — Fabrics You Work With">
        <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 6 }}>
          Select each fabric your studio works with. For selected fabrics, mark them as <strong style={{ color: 'var(--gold)' }}>Primary</strong> (core expertise) or <strong style={{ color: 'var(--text2)' }}>Secondary</strong>, and add a short description of how you use it — this feeds the recommendation engine.
        </p>
        <p style={{ fontSize: 12, color: 'var(--text4)', marginBottom: 18 }}>Click a fabric name to select it. Expand to add details.</p>

        {FABRIC_CATEGORIES.map(cat => (
          <div key={cat.cat} style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>{cat.label}</div>
            {/* Pill row for toggling */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 12 }}>
              {cat.fabrics.map(f => {
                const on = fabrics[f]?.works_with;
                return (
                  <button key={f} onClick={() => toggleFabric(f, cat.cat)} style={{
                    padding: '7px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
                    border: `1px solid ${on ? 'rgba(200,165,90,0.4)' : 'var(--border2)'}`,
                    background: on ? 'var(--gold-dim)' : 'var(--surface2)',
                    color: on ? 'var(--gold)' : 'var(--text2)',
                    fontWeight: on ? 600 : 400, transition: 'all .15s',
                    fontFamily: 'var(--font-body)',
                  }}>
                    {f}
                  </button>
                );
              })}
            </div>
            {/* Expanded detail cards for selected fabrics in this category */}
            {cat.fabrics.filter(f => fabrics[f]?.works_with).map(f => {
              const entry = fabrics[f] || {};
              const isPrimary = entry.is_primary === true;
              const isSecondary = entry.is_primary === false;
              return (
                <div key={f} style={{
                  background: 'var(--surface2)', border: '1px solid rgba(200,165,90,0.2)',
                  borderLeft: '3px solid var(--gold)', borderRadius: 'var(--radius)',
                  padding: '14px 16px', marginBottom: 8,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--gold)' }}>{f}</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => setFabricPrimary(f, cat.cat, isPrimary ? null : true)} style={{
                        padding: '4px 12px', borderRadius: 20, fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-body)',
                        border: `1px solid ${isPrimary ? 'rgba(200,165,90,0.5)' : 'var(--border2)'}`,
                        background: isPrimary ? 'var(--gold-dim)' : 'transparent',
                        color: isPrimary ? 'var(--gold)' : 'var(--text4)', fontWeight: isPrimary ? 600 : 400,
                      }}>Primary</button>
                      <button onClick={() => setFabricPrimary(f, cat.cat, isSecondary ? null : false)} style={{
                        padding: '4px 12px', borderRadius: 20, fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-body)',
                        border: `1px solid ${isSecondary ? 'var(--border3)' : 'var(--border2)'}`,
                        background: isSecondary ? 'var(--surface4)' : 'transparent',
                        color: isSecondary ? 'var(--text2)' : 'var(--text4)', fontWeight: isSecondary ? 600 : 400,
                      }}>Secondary</button>
                    </div>
                  </div>
                  <textarea
                    value={entry.innovation_note || ''}
                    onChange={e => setFabrics(fbs => ({
                      ...fbs,
                      [f]: { ...fbs[f], innovation_note: e.target.value }
                    }))}
                    rows={2}
                    placeholder={`Describe how you use ${f} — techniques, finishes, typical products, any special treatments or innovations...`}
                    style={{
                      width: '100%', padding: '9px 12px',
                      border: '1px solid var(--border2)', borderRadius: 8,
                      background: 'var(--surface3)', color: 'var(--text)',
                      fontSize: 13, fontFamily: 'var(--font-body)', lineHeight: 1.6, resize: 'vertical',
                    }}
                  />
                </div>
              );
            })}
          </div>
        ))}

        {/* Other / Custom fabrics */}
        <div style={{ marginBottom: 8, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Other Fabrics (not listed above)</div>
          <p style={{ fontSize: 12, color: 'var(--text4)', marginBottom: 12 }}>Add any fabrics you work with that aren't in the list above. Each one will appear as a selected fabric with a description field.</p>

          {/* Existing custom fabrics */}
          {Object.entries(fabrics).filter(([name, entry]) => entry.works_with && entry.category === 'other').map(([f, entry]) => {
            const isPrimary = entry.is_primary === true;
            const isSecondary = entry.is_primary === false;
            return (
              <div key={f} style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', borderLeft: '3px solid var(--border3)', borderRadius: 'var(--radius)', padding: '14px 16px', marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{f}</span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <button onClick={() => setFabricPrimary(f, 'other', isPrimary ? null : true)} style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-body)', border: `1px solid ${isPrimary ? 'rgba(255,255,255,0.3)' : 'var(--border2)'}`, background: isPrimary ? 'var(--gold-dim)' : 'transparent', color: isPrimary ? 'var(--gold)' : 'var(--text4)', fontWeight: isPrimary ? 600 : 400 }}>Primary</button>
                    <button onClick={() => setFabricPrimary(f, 'other', isSecondary ? null : false)} style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-body)', border: `1px solid ${isSecondary ? 'var(--border3)' : 'var(--border2)'}`, background: isSecondary ? 'var(--surface4)' : 'transparent', color: isSecondary ? 'var(--text2)' : 'var(--text4)', fontWeight: isSecondary ? 600 : 400 }}>Secondary</button>
                    <button onClick={() => setFabrics(fbs => { const n = { ...fbs }; delete n[f]; return n; })} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 15, padding: '2px 4px' }}>×</button>
                  </div>
                </div>
                <textarea value={entry.innovation_note || ''} onChange={e => setFabrics(fbs => ({ ...fbs, [f]: { ...fbs[f], innovation_note: e.target.value } }))} rows={2}
                  placeholder={`Describe how you use ${f}...`}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border2)', borderRadius: 8, background: 'var(--surface3)', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font-body)', lineHeight: 1.6, resize: 'vertical' }} />
              </div>
            );
          })}

          {/* Add custom fabric row */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              className="input-raw"
              placeholder="e.g. Khadi Silk, Jamdani, Ikat Cotton…"
              id="custom-fabric-input"
              style={{ flex: 1 }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  const val = e.target.value.trim();
                  if (!val) return;
                  if (fabrics[val]) { e.target.value = ''; return; }
                  setFabrics(fbs => ({ ...fbs, [val]: { category: 'other', fabric_name: val, works_with: true, is_primary: null, innovation_note: '' } }));
                  e.target.value = '';
                }
              }}
            />
            <button className="btn btn-outline btn-sm" onClick={() => {
              const inp = document.getElementById('custom-fabric-input');
              const val = inp?.value?.trim();
              if (!val) return;
              if (fabrics[val]) { inp.value = ''; return; }
              setFabrics(fbs => ({ ...fbs, [val]: { category: 'other', fabric_name: val, works_with: true, is_primary: null, innovation_note: '' } }));
              inp.value = '';
            }}>+ Add</button>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text4)', marginTop: 6 }}>Press Enter or click Add. Each custom fabric will expand for description.</p>
        </div>
      </CardSection>

      {/* B.3 Brand Experience */}
      <CardSection title="B.3 — Brand Experience">
        <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16 }}>
          Which brands or buyers have you worked with? List them here — this builds trust with new buyers.
        </p>
        {brands.map(b => (
          <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '12px 14px', background: 'var(--surface2)', borderRadius: 'var(--radius)', marginBottom: 8, border: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{b.brand_name}</div>
              {b.scope && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3 }}>{b.scope}</div>}
              {b.file_name && <div style={{ fontSize: 11, color: 'var(--teal)', marginTop: 3 }}>{b.file_name}</div>}
            </div>
            <button className="btn btn-danger btn-sm" onClick={() => delBrand(b.id)}>Remove</button>
          </div>
        ))}
        <div style={{ padding: 16, border: '1px solid var(--border2)', borderRadius: 'var(--radius)', marginTop: 8, background: 'var(--surface2)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10, marginBottom: 10 }}>
            <div className="field">
              <label>Brand / Buyer Name *</label>
              <input value={newBrand.brand_name} onChange={e => setNewBrand(b => ({ ...b, brand_name: e.target.value }))} placeholder="e.g. Good Earth" />
            </div>
            <div className="field">
              <label>Scope of Work *</label>
              <input value={newBrand.scope} onChange={e => setNewBrand(b => ({ ...b, scope: e.target.value }))} placeholder="e.g. Hand block printed kurtas for SS23 collection, 200 pcs" />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Image *</div>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setBrandImg(e.target.files[0])} style={{ display: 'none' }} />
              <span className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>{brandImg ? brandImg.name : '+ Attach Image'}</span>
            </label>
          </div>
          <button className="btn btn-outline btn-sm" onClick={addBrand}>+ Add Brand</button>
        </div>
      </CardSection>

      {/* B.4 Awards & Press */}
      <CardSection title="B.4 — Awards & Press Mentions">
        <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16 }}>
          Have you been featured in any press, won any awards, or been part of any recognized programs? Add them here.
        </p>
        {awards.map(a => (
          <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'var(--surface2)', borderRadius: 'var(--radius)', marginBottom: 8, border: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{a.award_name}</div>
              {a.link && <a href={a.link} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--gold)' }}>View →</a>}
            </div>
            <button className="btn btn-danger btn-sm" onClick={() => onboardingAPI.delAward(profileId, a.id).then(() => setAwards(x => x.filter(y => y.id !== a.id)))}>Remove</button>
          </div>
        ))}
        <div style={{ padding: 16, border: '1px solid var(--border2)', borderRadius: 'var(--radius)', marginTop: 8, background: 'var(--surface2)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10, marginBottom: 10 }}>
            <div className="field">
              <label>Award / Press Mention *</label>
              <input value={newAward.award_name} onChange={e => setNewAward(a => ({ ...a, award_name: e.target.value }))} placeholder="e.g. Featured in Vogue India — March 2023" />
            </div>
            <div className="field">
              <label>URL (optional)</label>
              <input type="url" value={newAward.link} onChange={e => setNewAward(a => ({ ...a, link: e.target.value }))} placeholder="https://..." />
            </div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={addAward}>+ Add Award / Mention</button>
        </div>
      </CardSection>

      <button className="btn btn-primary btn-lg fade-up" onClick={save} disabled={saving}>
        {saving ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Saving…</> : 'Save Section B'}
      </button>
    </div>
  );
}

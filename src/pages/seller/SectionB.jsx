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
    'General Cotton',
    'Organic cotton',
    'Kala cotton',
    'Cotton mulmul / muslin',
    'Cotton poplin',
    'Cotton cambric',
    'Cotton voile',
    'Cotton satin',
    'Cotton-silk blend',
    'Cotton-linen blend',
    'Other cotton blends',
    'Other cotton fabric',
  ]},
  { cat: 'silk', label: 'Silk Based', fabrics: [
    'General Silk',
    'Mulberry silk',
    'Tussar silk',
    'Eri silk',
    'Muga silk',
    'Silk crepe',
    'Silk georgette',
    'Silk chiffon',
    'Silk satin',
    'Silk blends',
    'Other silk fabric',
  ]},
  { cat: 'linen', label: 'Linen & Bast', fabrics: [
    'Linen',
    'Linen blends',
    'Hemp',
    'Hemp blends',
    'Other bast fiber fabric',
  ]},
  { cat: 'wool', label: 'Wool Based', fabrics: [
    'General Wool',
    'Pashmina',
    'Other Fine wool',
    'Wool blends',
    'Other wool fabric',
  ]},
  { cat: 'regenerated', label: 'Regenerated / Cellulosic', fabrics: [
    'Viscose',
    'Rayon',
    'Modal',
    'Lyocell / Tencel',
    'Other regenerated cellulosic fabric',
  ]},
  { cat: 'handcrafted', label: 'Handcrafted / Heritage', fabrics: [
    'Handloom cotton',
    'Handloom silk',
    'Handwoven Wool',
    'Other handloom fabric',
  ]},
  { cat: 'other', label: 'Other', fabrics: [
    'Other fabric',
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
  const [fabrics, setFabrics]   = useState({});
  const [brands, setBrands]     = useState([]);
  const [newBrand, setNewBrand] = useState({ brand_name: '', scope: '' });
  const [brandImg, setBrandImg] = useState(null);
  const [editingBrand, setEditingBrand] = useState(null);
  const [editBrandImg, setEditBrandImg] = useState(null);
  const [saving, setSaving]     = useState(false);

  // B.1 — Products Portfolio (moved from A)
  const [workMedia, setWorkMedia]           = useState([]);
  const [uploading, setUploading]           = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [editingMedia, setEditingMedia]     = useState(null); // { id, product_name, crafts_used, fabrics_used }

  // B.2 — Garment Categories
  const [genderFocus, setGenderFocus]       = useState([]);
  const [occasions, setOccasions]           = useState([]);
  const [styleCategories, setStyleCategories] = useState([]);
  const [savingCategories, setSavingCategories] = useState(false);

  // Studio crafts (for portfolio metadata multi-select)
  const [studioCrafts, setStudioCrafts]     = useState([]);

  const GENDER_OPTIONS = ['Womenswear', 'Menswear', 'Kidswear', 'Gender Neutral'];
  const OCCASION_OPTIONS = [
    'Casual / Everyday', 'Festive / Occasion', 'Resort / Holiday',
    'Workwear', 'Bridal / Wedding', 'Streetwear',
    'Activewear', 'Lounge / At-home', 'Nightwear',
  ];
  const STYLE_OPTIONS = [
    'Dresses', 'Tops', 'Shirts', 'T-Shirts', 'Tunics / Kurtas',
    'Coord Sets', 'Jumpsuits', 'Skirts', 'Shorts', 'Trousers / Pants',
    'Denim', 'Blazers', 'Coats & Jackets', 'Capes', 'Waistcoats / Vests',
    'Kaftans', 'Resortwear Sets', 'Loungewear / Sleepwear',
    'Activewear', 'Kidswear', 'Accessories / Scarves / Stoles',
  ];

  useEffect(() => {
    if (!profileId) return;
    onboardingAPI.getProducts(profileId).then(r => setProducts(r.data || {})).catch(() => {});
    onboardingAPI.getFabrics(profileId).then(r => {
      const m = {};
      (r.data || []).forEach(f => { m[f.fabric_name] = f; });
      setFabrics(m);
    }).catch(() => {});
    onboardingAPI.getBrands(profileId).then(r => setBrands(r.data || [])).catch(() => {});

    // Load portfolio (work_dump media from Section A)
    onboardingAPI.getStudio(profileId).then(r => {
      const d = r.data;
      if (!d) return;
      const media = d.media_files || [];
      setWorkMedia(media.filter(m => m.media_type === 'work_dump'));
      // Load garment categories
      setGenderFocus(d.gender_focus || []);
      setOccasions(d.occasions || []);
      setStyleCategories(d.style_categories || []);
    }).catch(() => {});

    // Load studio crafts for portfolio metadata
    onboardingAPI.getCrafts(profileId).then(r => {
      setStudioCrafts((r.data || []).map(c => c.craft_name));
    }).catch(() => {});
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

  // ── Portfolio helpers ──────────────────────────────────────────────────────

  const uploadPortfolio = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    e.target.value = '';

    // Check 20-item cap client-side
    const remaining = 20 - workMedia.length;
    if (remaining <= 0) { error('Maximum 20 portfolio uploads reached. Remove an item first.'); return; }
    const toUpload = files.slice(0, remaining);
    if (toUpload.length < files.length) error(`Only ${remaining} slot(s) remaining — uploading first ${remaining} file(s).`);

    setUploading(true);
    setUploadProgress({ done: 0, total: toUpload.length, failed: 0 });
    let done = 0, failed = 0;

    for (const file of toUpload) {
      try {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('media_type', 'work_dump');
        fd.append('order', workMedia.length + done + 1);
        const r = await onboardingAPI.uploadStudioMedia(profileId, fd);
        setWorkMedia(m => [...m, r.data]);
      } catch { failed++; }
      done++;
      setUploadProgress({ done, total: toUpload.length, failed });
    }

    if (failed === 0) success(`${done} file${done > 1 ? 's' : ''} uploaded!`);
    else error(`${failed} of ${done} failed.`);
    setUploading(false);
    setUploadProgress(null);
  };

  const delPortfolioItem = async (mediaId) => {
    try {
      await onboardingAPI.delStudioMedia(profileId, mediaId);
      setWorkMedia(m => m.filter(x => x.id !== mediaId));
    } catch { error('Failed to remove'); }
  };

  const saveMediaMeta = async (mediaId, meta) => {
    // PATCH the media item with product_name / crafts_used / fabrics_used
    // Uses the existing patchStudio endpoint which passes through to StudioMedia
    // via the media_id param — update if a dedicated PATCH endpoint exists
    try {
      await onboardingAPI.patchStudio(profileId, { media_meta: { id: mediaId, ...meta } });
      setWorkMedia(m => m.map(x => x.id === mediaId ? { ...x, ...meta } : x));
      setEditingMedia(null);
      success('Saved');
    } catch { error('Failed to save'); }
  };

  // ── Category helpers ───────────────────────────────────────────────────────

  const toggleChip = (list, setList, val) =>
    setList(l => l.includes(val) ? l.filter(x => x !== val) : [...l, val]);

  const saveCategories = async () => {
    setSavingCategories(true);
    try {
      await onboardingAPI.patchStudio(profileId, {
        gender_focus:     genderFocus,
        occasions:        occasions,
        style_categories: styleCategories,
      });
      success('Categories saved!');
    } catch { error('Save failed'); }
    finally { setSavingCategories(false); }
  };

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
      
      // Calculate order from current state length synchronously
      const currentOrder = brands.length + 1;
      fd.append('order', currentOrder);
      
      const r = await onboardingAPI.addBrand(profileId, fd);
      
      // Update state and ensure we add to the list
      setBrands(prevBrands => [...prevBrands, r.data]);
      setNewBrand({ brand_name: '', scope: '' });
      setBrandImg(null);
      success('Brand added');
    } catch (err) { 
      console.error('Failed to add brand:', err);
      error('Failed to add brand'); 
    }
  };

  const delBrand = async id => {
    try { await onboardingAPI.delBrand(profileId, id); setBrands(b => b.filter(x => x.id !== id)); }
    catch { error('Failed'); }
  };

  const saveEditBrand = async () => {
    if (!editingBrand.brand_name) { error('Brand name required'); return; }
    try {
      const fd = new FormData();
      fd.append('brand_name', editingBrand.brand_name);
      fd.append('scope', editingBrand.scope || '');
      if (editBrandImg) fd.append('image', editBrandImg);
      const r = await onboardingAPI.patchBrand(profileId, editingBrand.id, fd);
      setBrands(b => b.map(x => x.id === editingBrand.id ? r.data : x));
      setEditingBrand(null);
      setEditBrandImg(null);
      success('Brand updated');
    } catch { error('Failed to update brand'); }
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
        <p style={{ color: 'var(--text3)', fontSize: 14, marginLeft: 56 }}>Your products portfolio, garment categories, and the fabrics you work with.</p>
      </div>

      {/* B.1 — Products Portfolio */}
      <CardSection title="B.1 — Products Portfolio">
        <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 4 }}>
          Share pictures of the different types of garments you have produced. This is your rack — show variety across silhouettes and techniques.
        </p>
        <p style={{ fontSize: 12, color: 'var(--text4)', marginBottom: 16 }}>
          Ideally 15–20 images / videos. Max 20 uploads. For each item, add the product name, crafts used, and fabric.
        </p>

        {/* Uploaded items */}
        {workMedia.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            {workMedia.map(m => (
              <div key={m.id} style={{ padding: '12px 14px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                {editingMedia?.id === m.id ? (
                  /* ── Edit metadata inline ── */
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                      {m.file_name}
                    </div>
                    <div className="field" style={{ marginBottom: 10 }}>
                      <label>Product Name</label>
                      <input value={editingMedia.product_name || ''} onChange={e => setEditingMedia(x => ({ ...x, product_name: e.target.value }))} placeholder="e.g. Ajrakh Resort Dress" />
                    </div>
                    <div className="field" style={{ marginBottom: 10 }}>
                      <label>Crafts Used</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {studioCrafts.map(c => {
                          const on = (editingMedia.crafts_used || []).includes(c);
                          return (
                            <button key={c} onClick={() => setEditingMedia(x => ({ ...x, crafts_used: on ? (x.crafts_used || []).filter(v => v !== c) : [...(x.crafts_used || []), c] }))}
                              style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)', border: `1px solid ${on ? 'rgba(200,165,90,0.4)' : 'var(--border2)'}`, background: on ? 'var(--gold-dim)' : 'var(--surface3)', color: on ? 'var(--gold)' : 'var(--text3)' }}>
                              {c}
                            </button>
                          );
                        })}
                        {studioCrafts.length === 0 && <span style={{ fontSize: 12, color: 'var(--text4)' }}>Add crafts in Section C first</span>}
                      </div>
                    </div>
                    <div className="field" style={{ marginBottom: 12 }}>
                      <label>Fabric(s)</label>
                      <input value={(editingMedia.fabrics_used || []).join(', ')} onChange={e => setEditingMedia(x => ({ ...x, fabrics_used: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))} placeholder="e.g. Mulmul, Cotton Voile" />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-teal btn-sm" onClick={() => saveMediaMeta(m.id, { product_name: editingMedia.product_name, crafts_used: editingMedia.crafts_used, fabrics_used: editingMedia.fabrics_used })}>Save</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditingMedia(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  /* ── Read view ── */
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{m.product_name || m.file_name}</div>
                      {m.product_name && <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 1 }}>{m.file_name}</div>}
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, display: 'flex', gap: 10 }}>
                        {m.crafts_used?.length > 0 && <span>Crafts: {m.crafts_used.join(', ')}</span>}
                        {m.fabrics_used?.length > 0 && <span>Fabrics: {m.fabrics_used.join(', ')}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 12 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditingMedia({ id: m.id, product_name: m.product_name || '', crafts_used: m.crafts_used || [], fabrics_used: m.fabrics_used || [] })}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => delPortfolioItem(m.id)}>Remove</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Upload button */}
        {workMedia.length < 20 && (
          <label style={{ display: 'inline-block' }}>
            <input type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime" onChange={uploadPortfolio} style={{ display: 'none' }} />
            <span className="btn btn-outline btn-sm" style={{ cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.6 : 1 }}>
              {uploading
                ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Uploading {uploadProgress?.done || 0} / {uploadProgress?.total || 0}…</>
                : `+ Upload Images / Videos (${workMedia.length}/20)`}
            </span>
          </label>
        )}
        {workMedia.length >= 20 && (
          <div style={{ fontSize: 12, color: 'var(--text4)', marginTop: 4 }}>Maximum 20 uploads reached. Remove an item to add a new one.</div>
        )}
        <p style={{ fontSize: 11, color: 'var(--text4)', marginTop: 8 }}>Images: JPG · PNG · WEBP up to 10 MB · Videos: MP4 · MOV up to 100 MB</p>
      </CardSection>

      {/* B.2 — Garment Categories */}
      <CardSection title="B.2 — Garment Categories">
        <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16 }}>
          Tell us who you design for and what occasions your garments suit. This helps buyers find you.
        </p>

        {/* Gender */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Gender</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {GENDER_OPTIONS.map(g => {
              const on = genderFocus.includes(g);
              return (
                <button key={g} onClick={() => toggleChip(genderFocus, setGenderFocus, g)} style={{ padding: '7px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-body)', border: `1px solid ${on ? 'rgba(200,165,90,0.4)' : 'var(--border2)'}`, background: on ? 'var(--gold-dim)' : 'var(--surface2)', color: on ? 'var(--gold)' : 'var(--text2)', fontWeight: on ? 600 : 400, transition: 'all .15s' }}>
                  {g}
                </button>
              );
            })}
          </div>
        </div>

        {/* Occasions */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Occasion</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {OCCASION_OPTIONS.map(o => {
              const on = occasions.includes(o);
              return (
                <button key={o} onClick={() => toggleChip(occasions, setOccasions, o)} style={{ padding: '7px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-body)', border: `1px solid ${on ? 'rgba(200,165,90,0.4)' : 'var(--border2)'}`, background: on ? 'var(--gold-dim)' : 'var(--surface2)', color: on ? 'var(--gold)' : 'var(--text2)', fontWeight: on ? 600 : 400, transition: 'all .15s' }}>
                  {o}
                </button>
              );
            })}
          </div>
        </div>

        {/* Style */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Style / Garment Type</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {STYLE_OPTIONS.map(s => {
              const on = styleCategories.includes(s);
              return (
                <button key={s} onClick={() => toggleChip(styleCategories, setStyleCategories, s)} style={{ padding: '7px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-body)', border: `1px solid ${on ? 'rgba(200,165,90,0.4)' : 'var(--border2)'}`, background: on ? 'var(--gold-dim)' : 'var(--surface2)', color: on ? 'var(--gold)' : 'var(--text2)', fontWeight: on ? 600 : 400, transition: 'all .15s' }}>
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        <button className="btn btn-teal btn-sm" onClick={saveCategories} disabled={savingCategories}>
          {savingCategories ? <><span className="spinner" style={{ width: 13, height: 13 }} /> Saving…</> : 'Save Categories'}
        </button>
      </CardSection>

      {/* B.3 — Product Types (hidden per spec — data still saved) */}
      <div style={{ display: 'none' }}>
      <CardSection title="B.3 — Product Types (internal)">
        <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16 }}>
          Select all the garment types your studio produces. Buyers search and filter by these categories.
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
      </div>{/* end hidden B.3 Product Types */}

      {/* B.4 — Fabrics You Work With */}
      <CardSection title="B.3 — Fabrics You Work With">
        <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 6 }}>
          Select each fabric your studio works with. For selected fabrics, mark them as <strong style={{ color: 'var(--gold)' }}>Primary</strong> (core expertise) or <strong style={{ color: 'var(--text2)' }}>Secondary</strong>, and add a short description of how you use it — this feeds the recommendation engine.
        </p>
        <p style={{ fontSize: 12, color: 'var(--text4)', marginBottom: 18 }}>Click a fabric name to select it. Expand to add details.</p>

        {FABRIC_CATEGORIES.map(cat => (
          <div key={cat.cat} style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>{cat.label}</div>
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

      {/* Brands — hidden per spec (data preserved) */}
      <div style={{ display: 'none' }}>
        {/* brands state and handlers kept intact above for data compatibility */}
        {brands.length > 0 && <span>{brands.length}</span>}
      </div>

      <button className="btn btn-primary btn-lg fade-up" onClick={save} disabled={saving}>
        {saving ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Saving…</> : 'Save Section B'}
      </button>
    </div>
  );
}

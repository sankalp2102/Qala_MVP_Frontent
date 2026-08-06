import { useState, useEffect, useMemo, useRef } from 'react';
import { onboardingAPI } from '../../api/client';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../../components/Toast';
import { SectionHeader, SectionFooter, CollabToggle, HideToggle, inputStyle, textareaStyle } from './_ui';
import { mediaUrl } from '../../utils/mediaUrl';

const API = onboardingAPI;

const GENDER_OPTIONS = ['Womenswear', 'Menswear', 'Gender Neutral / Unisex', 'Kidswear', 'Home / Non-apparel'];

/* Sand/terracotta placeholder tints used when a product has no photo (per prototype). */
const PLACEHOLDER_COLORS = ['#C8B898', '#D4C4A8', '#B8A880', '#C0A876', 'var(--surface4)', '#CDBBA0'];
const tintFor = id => PLACEHOLDER_COLORS[Math.abs(String(id).split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % PLACEHOLDER_COLORS.length];

const EMPTY_PRODUCT = {
  name: '', garment_type: '', gender: '', silhouette: '', occasion: '',
  season_suitable_for: '', fabrics_used: '', dyes_used: '', craft_techniques_used: '',
  sustainability_parameters: '', care_instructions: '',
  open_for_collab: false, is_hidden: false,
};

const BULK_COLUMNS = [
  { label: 'Product Name', req: true }, { label: 'Garment Type' }, { label: 'Gender' },
  { label: 'Silhouette' }, { label: 'Occasion' }, { label: 'Season' }, { label: 'Fabrics Used' },
  { label: 'Dyes Used' }, { label: 'Craft Techniques' }, { label: 'Sustainability Parameters' },
  { label: 'Care Instructions' }, { label: 'Image 1…6' },
  { label: 'Product Page Link' }, { label: 'Price' }, { label: 'Currency' },
];

/* ── shared style atoms (mirrors the prototype's .pw-* CSS) ───────────────── */
const S = {
  label:    { fontSize: 10, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6, display: 'block' },
  form:     { border: '1px solid var(--surface4)', borderRadius: 'var(--r-10)', background: '#fff', overflow: 'hidden', marginBottom: 16 },
  formHead: { padding: '12px 16px', background: 'var(--bg)', borderBottom: '1px solid var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  formTitle:{ fontSize: 13, fontWeight: 600, color: 'var(--text)' },
  formBody: { padding: 16 },
  row2:     { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 },
  greenBox: { background: 'var(--surface)', border: '1px solid var(--sage-pale)', borderRadius: 'var(--r-8)', padding: '11px 14px', display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  ptag:     { fontSize: 9, padding: '2px 6px', borderRadius: 'var(--r-4)', background: 'var(--surface)', color: '#777' },
  ptagColl: { fontSize: 9, padding: '2px 6px', borderRadius: 'var(--r-4)', background: 'var(--surface2)', color: 'var(--green-d)' },
  ptagNone: { fontSize: 9, padding: '2px 6px', borderRadius: 'var(--r-4)', background: 'var(--surface)', color: '#BBB', fontStyle: 'italic' },
  hiddenBadge: { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#888', background: 'var(--surface)', border: '1px solid var(--surface4)', padding: '2px 8px', borderRadius: 'var(--r-10)' },
};

function XClose({ onClick }) {
  return (
    <button onClick={onClick} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#AAA', padding: 2, lineHeight: 1 }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
    </button>
  );
}
function TrashSvg() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2" /></svg>;
}

/* ── Product add / edit form ─────────────────────────────────────────────── */
function ProductForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || EMPTY_PRODUCT);
  const [photoFiles, setPhotoFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const set = p => setForm(f => ({ ...f, ...p }));

  const pickPhotos = e => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    setPhotoFiles(prev => [...prev, ...files.map(f => ({ file: f, preview: URL.createObjectURL(f) }))]);
  };
  const rmLocal = i => setPhotoFiles(prev => { URL.revokeObjectURL(prev[i].preview); return prev.filter((_, j) => j !== i); });

  const submit = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try { await onSave(form, photoFiles.map(p => p.file)); } finally { setSaving(false); }
  };

  const existingPhotos = form.photos || [];

  return (
    <div style={S.form}>
      <div style={S.formHead}>
        <div style={S.formTitle}>{initial?.id ? 'Edit Product' : 'New Product'}</div>
        <XClose onClick={onCancel} />
      </div>
      <div style={S.formBody}>
        <div style={S.row2}>
          <div><label style={S.label}>Product Name *</label><input style={inputStyle} value={form.name} onChange={e => set({ name: e.target.value })} placeholder="e.g. Indigo Shift Dress" /></div>
          <div><label style={S.label}>Garment Type</label><input style={inputStyle} value={form.garment_type || ''} onChange={e => set({ garment_type: e.target.value })} placeholder="e.g. Dress, Kurta, Blouse, Scarf" /></div>
        </div>
        <div style={S.row2}>
          <div><label style={S.label}>Gender</label>
            <select style={inputStyle} value={form.gender || ''} onChange={e => set({ gender: e.target.value })}>
              <option value="">Select</option>
              {GENDER_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div><label style={S.label}>Silhouette</label><input style={inputStyle} value={form.silhouette || ''} onChange={e => set({ silhouette: e.target.value })} placeholder="e.g. A-line, Straight, Relaxed fit, Draped" /></div>
        </div>
        <div style={S.row2}>
          <div><label style={S.label}>Occasion</label><input style={inputStyle} value={form.occasion || ''} onChange={e => set({ occasion: e.target.value })} placeholder="e.g. Resortwear, Festive, Everyday, Bridal" /></div>
          <div><label style={S.label}>Season Suitable For</label><input style={inputStyle} value={form.season_suitable_for || ''} onChange={e => set({ season_suitable_for: e.target.value })} placeholder="e.g. Summer, All-season, Winter" /></div>
        </div>
        <div style={S.row2}>
          <div><label style={S.label}>Fabrics Used</label><input style={inputStyle} value={form.fabrics_used || ''} onChange={e => set({ fabrics_used: e.target.value })} placeholder="e.g. Cotton mulmul, Chanderi silk" /></div>
          <div><label style={S.label}>Dyes Used</label><input style={inputStyle} value={form.dyes_used || ''} onChange={e => set({ dyes_used: e.target.value })} placeholder="e.g. Natural indigo, Azo-free reactive, Plant-based" /></div>
        </div>
        <div style={{ marginBottom: 12 }}><label style={S.label}>Craft Techniques Used</label><input style={inputStyle} value={form.craft_techniques_used || ''} onChange={e => set({ craft_techniques_used: e.target.value })} placeholder="e.g. Hand block print, Shibori, Kantha embroidery, Ajrakh" /></div>
        <div style={{ marginBottom: 12 }}><label style={S.label}>Sustainability Parameters</label><input style={inputStyle} value={form.sustainability_parameters || ''} onChange={e => set({ sustainability_parameters: e.target.value })} placeholder="e.g. Natural dyes only, Cutting waste upcycled, Rain-fed cotton" /></div>
        <div style={{ marginBottom: 14 }}><label style={S.label}>Care Instructions</label><input style={inputStyle} value={form.care_instructions || ''} onChange={e => set({ care_instructions: e.target.value })} placeholder="e.g. Hand wash cold, dry in shade, do not wring" /></div>

        <div style={{ marginBottom: 14 }}>
          <label style={S.label}>Photos</label>
          {(existingPhotos.length > 0 || photoFiles.length > 0) && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              {existingPhotos.map(p => (
                <div key={p.id} style={{ width: 64, height: 64, borderRadius: 'var(--r-4)', overflow: 'hidden', border: '1px solid var(--surface4)' }}>
                  <img src={mediaUrl(p.thumbnail || p.file)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />
                </div>
              ))}
              {photoFiles.map((p, i) => (
                <div key={i} style={{ width: 64, height: 64, borderRadius: 'var(--r-4)', overflow: 'hidden', position: 'relative', border: '1px solid var(--surface4)' }}>
                  <img src={p.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button onClick={() => rmLocal(i)} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', borderRadius: 'var(--r-4)', width: 16, height: 16, fontSize: 11, cursor: 'pointer', lineHeight: 1 }}>×</button>
                </div>
              ))}
            </div>
          )}
          <label style={{ display: 'block', border: '1px dashed var(--warm-gray)', borderRadius: 'var(--r)', padding: 18, textAlign: 'center', cursor: 'pointer' }}>
            <div style={{ fontSize: 18, color: '#CCC' }}>📸</div>
            <div style={{ fontSize: 13, color: '#888' }}>Upload product photos</div>
            <div style={{ fontSize: 11, color: '#BBB', marginTop: 4 }}>JPG · PNG · WEBP · up to 10 MB each · multiple allowed</div>
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple style={{ display: 'none' }} onChange={pickPhotos} />
          </label>
        </div>

        <div style={S.greenBox}>
          <div style={{ marginTop: 2 }}><CollabToggle checked={!!form.open_for_collab} onChange={v => set({ open_for_collab: v })} /></div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--green-deep)', marginBottom: 2 }}>Open for Collaboration</div>
            <div style={{ fontSize: 11, color: '#666', lineHeight: 1.5 }}>Buyers can request their own version of this piece — adapted to their fabrics, colours, or silhouettes.</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
          <div style={{ marginTop: 2 }}><HideToggle checked={!!form.is_hidden} onChange={v => set({ is_hidden: v })} /></div>
          <div>
            <div style={{ fontSize: 12, color: '#555' }}>Hide from public profile</div>
            <div style={{ fontSize: 11, color: '#AAA', marginTop: 4, lineHeight: 1.4 }}>Share directly with specific buyers instead.</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={submit} disabled={!form.name.trim() || saving}>{saving ? 'Saving…' : 'Save Product'}</button>
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ── Bulk import zone ─────────────────────────────────────────────────────── */
const IMPORT_MODES = [
  { key: 'append',  label: 'Add to library',  hint: 'Keep existing products and add these' },
  { key: 'update',  label: 'Update matching', hint: 'Update products with the same name, add the rest' },
  { key: 'replace', label: 'Replace all',     hint: 'Delete existing products first — use for a clean re-import' },
];

function BulkZone({ onImport, onDownloadTemplate, onCancel }) {
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState('append');
  const inputRef = useRef(null);
  const handle = async e => {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    if (mode === 'replace' && !window.confirm('This deletes all existing products in your library before importing. Continue?')) return;
    setBusy(true);
    try { await onImport(file, mode); } finally { setBusy(false); }
  };
  return (
    <div onClick={() => !busy && inputRef.current?.click()}
      style={{ border: '2px dashed var(--sage-pale)', borderRadius: 'var(--r-10)', background: 'var(--surface)', padding: '32px 24px', textAlign: 'center', cursor: busy ? 'default' : 'pointer', marginBottom: 14 }}>
      <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handle} disabled={busy} />
      <div style={{ fontSize: 28, marginBottom: 10 }}>📋</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--green-deep)', marginBottom: 4 }}>{busy ? 'Importing…' : 'Upload your product list'}</div>
      <div style={{ fontSize: 12, color: '#777', marginBottom: 14 }}>Drop an Excel or CSV file here, or click to browse</div>

      {/* Import mode — prevents a re-import silently duplicating the library */}
      <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
        {IMPORT_MODES.map(m => (
          <button key={m.key} type="button" title={m.hint} onClick={() => setMode(m.key)}
            style={{ fontSize: 11, padding: '5px 11px', borderRadius: 'var(--r)', cursor: 'pointer',
              border: `1px solid ${mode === m.key ? 'var(--sage)' : 'var(--border-l)'}`,
              background: mode === m.key ? 'var(--surface2)' : '#fff',
              color: mode === m.key ? 'var(--green-deep)' : '#777', fontWeight: mode === m.key ? 600 : 400 }}>
            {m.label}
          </button>
        ))}
      </div>
      <div style={{ fontSize: 10, color: '#999', marginBottom: 12 }}>
        {IMPORT_MODES.find(m => m.key === mode)?.hint}
      </div>

      <div style={{ fontSize: 10, color: '#AAA', marginBottom: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em' }}>Expected columns</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, justifyContent: 'center' }}>
        {BULK_COLUMNS.map(c => (
          <span key={c.label} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 'var(--r-5)', background: c.req ? 'var(--surface)' : '#fff', border: `1px solid ${c.req ? '#F0C8B0' : 'var(--border-l)'}`, color: c.req ? '#C06818' : '#777', opacity: c.faded ? 0.5 : 1 }}>{c.label}</span>
        ))}
      </div>
      <div style={{ fontSize: 10, color: '#999', marginTop: 10 }}>
        Column names are matched flexibly — “Fabric”, “Fabrics” and “Fabrics Used” all work.
        Add <strong>Image 1…6</strong> columns (links or pasted URLs) and we’ll download the photos for you.
      </div>
      <div style={{ marginTop: 14, display: 'flex', gap: 8, justifyContent: 'center' }}>
        <button type="button" className="btn btn-ghost" style={{ fontSize: 12, padding: '7px 14px' }} onClick={e => { e.stopPropagation(); onDownloadTemplate?.(); }}>Download template</button>
        <button className="btn btn-ghost" style={{ fontSize: 12, padding: '7px 14px', color: '#888' }} onClick={e => { e.stopPropagation(); onCancel(); }}>Cancel</button>
      </div>
    </div>
  );
}

/* ── Image import progress (background queue) ─────────────────────────────── */
function ImageJobBanner({ job, onRetry }) {
  if (!job) return null;
  const done    = job.status === 'completed';
  const failed  = job.status === 'failed';
  const queued  = job.status === 'queued';
  const running = job.status === 'running';
  if (done && !job.failed) return null;   // fully successful — nothing to report
  // A job can be retried whenever it failed outright, or finished with failures.
  // A dispatch failure leaves failed === 0, so don't gate retry on that count.
  const canRetry = failed || (done && job.failed > 0);

  const tone = failed ? 'var(--red-d)' : done ? '#B5822A' : queued ? 'var(--text-muted)' : 'var(--green-deep)';
  const bg   = failed ? 'var(--surface)' : done ? 'var(--surface)' : queued ? 'var(--bg)' : 'var(--surface)';
  const bd   = failed ? '#F0C0B8' : done ? '#F0D4A4' : queued ? 'var(--surface4)' : 'var(--sage-pale)';

  return (
    <div style={{ border: `1px solid ${bd}`, background: bg, borderRadius: 'var(--r-8)', padding: '12px 14px', marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: tone }}>
          {queued  && `Queued — waiting for the image worker (${job.total_images} images)`}
          {running && `Downloading product images… ${job.processed_images}/${job.total_images}`}
          {done    && `Images finished — ${job.succeeded} added, ${job.failed} could not be downloaded`}
          {failed  && 'Image download failed'}
        </div>
        {canRetry && (
          <button type="button" className="btn btn-ghost" style={{ fontSize: 11, padding: '5px 12px' }} onClick={onRetry}>
            Retry failed
          </button>
        )}
      </div>
      {running && (
        <div style={{ height: 5, background: 'var(--surface3)', borderRadius: 'var(--r-4)', marginTop: 9, overflow: 'hidden' }}>
          <div style={{ width: `${job.progress_percent}%`, height: '100%', background: 'var(--sage)', transition: 'width .4s' }} />
        </div>
      )}
      {(job.errors || []).length > 0 && (
        <details style={{ marginTop: 8 }}>
          <summary style={{ fontSize: 11, color: '#777', cursor: 'pointer' }}>
            View {job.errors.length} problem{job.errors.length === 1 ? '' : 's'}
          </summary>
          <div style={{ maxHeight: 150, overflowY: 'auto', marginTop: 6 }}>
            {job.errors.slice(0, 50).map((e, i) => (
              <div key={i} style={{ fontSize: 11, color: 'var(--text-muted)', padding: '3px 0', borderBottom: '1px solid var(--surface2)' }}>
                <strong>{e.product || '—'}</strong>: {e.error}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

/* ── Product grid card ────────────────────────────────────────────────────── */
function ProductCard({ product, collectionName, onEdit, onDelete, selectable = false, selected = false, onToggleSelect }) {
  const [hover, setHover] = useState(false);
  const photo = (product.photos || [])[0];
  const extraTags = [product.fabrics_used, product.craft_techniques_used].filter(Boolean).slice(0, 2);
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      // In select mode the whole card is the hit target — clicking anywhere toggles.
      onClick={selectable ? onToggleSelect : undefined}
      style={{ border: `1px solid ${selected ? 'var(--sage)' : 'var(--surface4)'}`, borderRadius: 'var(--r-10)', overflow: 'hidden', background: '#fff', position: 'relative', boxShadow: selected ? '0 0 0 2px var(--sage-pale)' : hover ? '0 4px 16px rgba(0,0,0,.1)' : 'none', opacity: product.is_hidden ? 0.7 : 1, cursor: selectable ? 'pointer' : 'default' }}>
      <div style={{ height: 110, position: 'relative', overflow: 'hidden', background: photo ? 'var(--surface2)' : tintFor(product.id) }}>
        {photo && <img src={mediaUrl(photo.thumbnail || photo.file)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />}

        {selectable && (
          <div style={{ position: 'absolute', top: 7, left: 7, width: 20, height: 20, borderRadius: 'var(--r-5)', border: `1.5px solid ${selected ? 'var(--sage)' : 'rgba(0,0,0,.25)'}`, background: selected ? 'var(--sage)' : 'rgba(255,255,255,.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            {selected && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            )}
          </div>
        )}

        {/* Edit / delete are hidden in select mode so a stray click can't destroy a row */}
        {!selectable && (
          <div style={{ position: 'absolute', inset: 0, background: hover ? 'rgba(0,0,0,.05)' : 'transparent', display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start', padding: 7, gap: 4, opacity: hover ? 1 : 0, transition: 'opacity .15s' }}>
            <button onClick={onEdit} style={{ background: 'rgba(255,255,255,.95)', border: '1px solid rgba(0,0,0,.1)', borderRadius: 'var(--r-5)', padding: '3px 8px', fontSize: 10, cursor: 'pointer', color: '#555' }}>Edit</button>
            <button onClick={onDelete} style={{ background: 'rgba(255,255,255,.95)', border: '1px solid rgba(0,0,0,.1)', borderRadius: 'var(--r-5)', padding: '3px 8px', fontSize: 10, cursor: 'pointer', color: 'var(--red-d)' }}>×</button>
          </div>
        )}
      </div>
      <div style={{ padding: '10px 12px 12px' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3, marginBottom: 2 }}>{product.name || 'Untitled product'}</div>
        <div style={{ fontSize: 10, color: '#999', marginBottom: 7 }}>{[product.garment_type, product.gender].filter(Boolean).join(' · ') || '—'}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          <span style={collectionName ? S.ptagColl : S.ptagNone}>{collectionName || 'No collection'}</span>
          {extraTags.map((t, i) => <span key={i} style={S.ptag}>{t}</span>)}
        </div>
      </div>
    </div>
  );
}

/* ── Collection create / edit form ───────────────────────────────────────── */
function CollectionForm({ initial, products, onSave, onCancel }) {
  const [form, setForm] = useState(initial || { name: '', about: '', is_hidden: false, open_for_collab: false, product_ids: [] });
  const [saving, setSaving] = useState(false);
  const ids = new Set(form.product_ids);
  const toggle = id => setForm(f => {
    const next = new Set(f.product_ids);
    next.has(id) ? next.delete(id) : next.add(id);
    return { ...f, product_ids: [...next] };
  });
  const submit = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };
  return (
    <div style={S.form}>
      <div style={S.formHead}>
        <div style={S.formTitle}>{initial?.id ? 'Edit Collection' : 'New Collection'}</div>
        <XClose onClick={onCancel} />
      </div>
      <div style={S.formBody}>
        <div style={{ marginBottom: 12 }}><label style={S.label}>Collection Name *</label><input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Colour Studies SS23, Festive Capsule" /></div>
        <div style={{ marginBottom: 16 }}><label style={S.label}>About <span style={{ color: '#BBB', fontWeight: 400 }}>(optional)</span></label><textarea rows={2} style={textareaStyle} value={form.about || ''} onChange={e => setForm(f => ({ ...f, about: e.target.value }))} placeholder="What was the theme or brief behind this collection?" /></div>

        <div style={{ borderTop: '1px solid var(--surface2)', paddingTop: 16, marginBottom: 16 }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Pick products for this collection</div>
            <div style={{ fontSize: 11, color: '#AAA', marginTop: 2 }}>Select from your product library. <span style={{ color: 'var(--sage)', fontWeight: 500 }}>{form.product_ids.length} selected</span></div>
          </div>
          {products.length === 0 ? (
            <div style={{ fontSize: 12, color: '#AAA', fontStyle: 'italic' }}>Add a product first, then group it here.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 8 }}>
              {products.map(p => {
                const sel = ids.has(p.id);
                const photo = (p.photos || [])[0];
                return (
                  <div key={p.id} onClick={() => toggle(p.id)}
                    style={{ border: `2px solid ${sel ? 'var(--sage)' : 'var(--surface4)'}`, borderRadius: 'var(--r-8)', overflow: 'hidden', cursor: 'pointer', position: 'relative', background: sel ? 'var(--surface)' : '#fff' }}>
                    <div style={{ height: 72, background: photo ? 'var(--surface2)' : tintFor(p.id) }}>
                      {photo && <img src={mediaUrl(photo.thumbnail || photo.file)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />}
                    </div>
                    <div style={{ padding: '7px 9px 9px' }}>
                      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text)', lineHeight: 1.3 }}>{p.name || 'Untitled'}</div>
                      <div style={{ fontSize: 9, color: '#AAA', marginTop: 2 }}>{[p.garment_type, p.gender].filter(Boolean).join(' · ') || '—'}</div>
                    </div>
                    <div style={{ position: 'absolute', top: 5, right: 5, width: 18, height: 18, borderRadius: '50%', border: `2px solid ${sel ? 'var(--sage)' : 'var(--border-l)'}`, background: sel ? 'var(--sage)' : '#fff', color: sel ? '#fff' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>✓</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={S.greenBox}>
          <div style={{ marginTop: 2 }}><CollabToggle checked={!!form.open_for_collab} onChange={v => setForm(f => ({ ...f, open_for_collab: v }))} /></div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--green-deep)', marginBottom: 2 }}>Open for Collaboration</div>
            <div style={{ fontSize: 11, color: '#666', lineHeight: 1.5 }}>Buyers can request their own version of pieces in this collection.</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
          <div style={{ marginTop: 2 }}><HideToggle checked={!!form.is_hidden} onChange={v => setForm(f => ({ ...f, is_hidden: v }))} /></div>
          <div>
            <div style={{ fontSize: 12, color: '#555' }}>Hide from public profile</div>
            <div style={{ fontSize: 11, color: '#AAA', marginTop: 4, lineHeight: 1.4 }}>Share directly with specific buyers instead.</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={submit} disabled={!form.name.trim() || saving}>{saving ? 'Saving…' : 'Save Collection'}</button>
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ── Collection card ─────────────────────────────────────────────────────── */
function CollectionCard({ collection, onPatch, onEdit, onDelete, onViewProducts }) {
  const members = collection.products || [];
  return (
    <div style={{ border: '1px solid var(--surface4)', borderRadius: 'var(--r-10)', background: '#fff', marginBottom: 12, overflow: 'hidden', opacity: collection.is_hidden ? 0.65 : 1 }}>
      <div style={{ padding: '13px 16px', borderBottom: '1px solid var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
            {collection.name || 'Untitled collection'}
            {collection.is_hidden && <span style={S.hiddenBadge}>🔒 Hidden</span>}
          </div>
          <div style={{ fontSize: 11, color: '#AAA', marginTop: 2 }}>{members.length} product{members.length === 1 ? '' : 's'}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {!collection.is_hidden && <CollabToggle checked={!!collection.open_for_collab} onChange={v => onPatch({ open_for_collab: v })} label="Open for Collab" />}
          <HideToggle checked={!!collection.is_hidden} onChange={v => onPatch({ is_hidden: v })} label="Hide" />
          <button className="btn btn-ghost" style={{ padding: '5px 12px', fontSize: 11 }} onClick={onEdit}>Edit</button>
          <button aria-label="Delete collection" onClick={onDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red-d)', padding: '4px 6px', display: 'inline-flex' }}><TrashSvg /></button>
        </div>
      </div>
      {collection.is_hidden ? (
        <div style={{ padding: '10px 16px 14px', fontSize: 12, color: '#888', fontStyle: 'italic' }}>Collection is hidden. Products still in your library.</div>
      ) : (
        <>
          {collection.about && <div style={{ fontSize: 11, color: '#888', padding: '0 16px 12px', lineHeight: 1.5 }}>{collection.about}</div>}
          <div style={{ padding: '12px 16px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {members.slice(0, 4).map(p => {
              const photo = (p.photos || [])[0];
              return <div key={p.id} style={{ width: 56, height: 56, borderRadius: 'var(--r)', background: photo ? 'var(--surface2)' : tintFor(p.id), overflow: 'hidden', flexShrink: 0 }}>
                {photo && <img src={mediaUrl(photo.thumbnail || photo.file)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />}
              </div>;
            })}
            {members.length > 0
              ? <button onClick={onViewProducts} style={{ background: 'none', border: 'none', color: 'var(--sage)', fontSize: 11, cursor: 'pointer', paddingLeft: 6 }}>View all {members.length} product{members.length === 1 ? '' : 's'} →</button>
              : <span style={{ fontSize: 11, color: '#BBB', fontStyle: 'italic' }}>No products yet — Edit to add some.</span>}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Section ─────────────────────────────────────────────────────────────── */
export default function SectionG({ profileId, initialData, onSave, onNext }) {
  const { toasts, success, error } = useToast();
  const [products, setProducts]       = useState([]);
  const [collections, setCollections] = useState([]);
  const [tab, setTab]                 = useState('products');
  const [prodMode, setProdMode]       = useState(null);   // 'single' | 'bulk' | null
  const [imageJob, setImageJob]       = useState(null);   // background image-import progress
  const pollRef                       = useRef(null);
  const [selectMode, setSelectMode]   = useState(false);  // bulk-select for deletion
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [editingProduct, setEditingProduct] = useState(null);
  const [collFormOpen, setCollFormOpen]     = useState(false);
  const [editingCollection, setEditingCollection] = useState(null);
  const [ddOpen, setDdOpen]           = useState(false);
  const [saving, setSaving]           = useState(false);
  const [busy, setBusy]               = useState(false);
  const pending = useRef(0);
  const ddRef = useRef(null);

  // Wrap any persisting action so the footer indicator shows live save state.
  const track = async fn => {
    pending.current += 1; setBusy(true);
    try { return await fn(); }
    finally { pending.current -= 1; if (pending.current <= 0) { pending.current = 0; setBusy(false); } }
  };

  // A product or collection form is open with input that hasn't been committed.
  // Section G deliberately has no autosave — a half-typed product must not
  // create a row — so the browser is the only thing that can warn the seller
  // before a reload or tab close throws the form away.
  const formOpen = prodMode === 'single' || !!editingProduct || collFormOpen || !!editingCollection;
  useEffect(() => {
    if (!formOpen) return;
    const onBeforeUnload = e => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [formOpen]);

  useEffect(() => {
    if (!initialData) return;
    if (initialData.studio_products)    setProducts(initialData.studio_products);
    if (initialData.studio_collections) setCollections(initialData.studio_collections);
  }, [initialData]);

  useEffect(() => {
    if (!profileId || initialData) return;
    API.getStudioProducts(profileId).then(r => setProducts(r.data || [])).catch(() => {});
    API.getCollections(profileId).then(r => setCollections(r.data || [])).catch(() => {});
  }, [profileId]);

  useEffect(() => {
    if (!ddOpen) return;
    const h = e => { if (ddRef.current && !ddRef.current.contains(e.target)) setDdOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [ddOpen]);

  // Pick up an image-import job still running from an earlier visit, so progress
  // survives a page reload. Always clear the interval on unmount.
  useEffect(() => {
    if (!profileId) return;
    API.getImageImportJob(profileId)
      .then(r => {
        const job = r.data?.job;
        if (!job) return;
        setImageJob(job);
        if (job.status === 'queued' || job.status === 'running') pollImageJob(job.id);
      })
      .catch(() => {});
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [profileId]);

  const collectionNameFor = useMemo(() => {
    const m = {};
    collections.forEach(c => (c.products || []).forEach(p => { if (!m[p.id]) m[p.id] = c.name; }));
    return m;
  }, [collections]);

  // ── Products ──
  const addProduct = (form, photoFiles) => track(async () => {
    try {
      const r = await API.addStudioProduct(profileId, form);
      let saved = r.data;
      const uploaded = [];
      let failed = 0;
      for (const file of photoFiles) {
        try { const fd = new FormData(); fd.append('file', file); const pr = await API.uploadProductPhoto(profileId, saved.id, fd); uploaded.push(pr.data); } catch { failed++; }
      }
      setProducts(prev => [...prev, { ...saved, photos: uploaded }]);
      setProdMode(null);
      if (failed) error(`Product saved, but ${failed} photo${failed === 1 ? '' : 's'} didn't upload — edit the product to retry.`);
      else success('Product added');
    } catch { error('Failed to save product'); }
  });
  const saveEditedProduct = (form, photoFiles) => track(async () => {
    try {
      const { photos, id, ...body } = form;
      const r = await API.patchStudioProduct(profileId, id, body);
      let updated = r.data;
      const uploaded = [];
      let failed = 0;
      for (const file of photoFiles) {
        try { const fd = new FormData(); fd.append('file', file); const pr = await API.uploadProductPhoto(profileId, id, fd); uploaded.push(pr.data); } catch { failed++; }
      }
      setProducts(prev => prev.map(p => p.id === id ? { ...updated, photos: [...(photos || []), ...uploaded] } : p));
      setEditingProduct(null);
      if (failed) error(`Product updated, but ${failed} photo${failed === 1 ? '' : 's'} didn't upload — try adding ${failed === 1 ? 'it' : 'them'} again.`);
      else success('Product updated');
    } catch { error('Failed to update product'); }
  });
  const deleteProduct = id => track(async () => {
    try { await API.delStudioProduct(profileId, id); } catch { error('Failed to delete product'); return; }
    setProducts(prev => prev.filter(p => p.id !== id));
    setCollections(prev => prev.map(c => ({ ...c, products: (c.products || []).filter(p => p.id !== id) })));
  });
  /* ── Bulk selection + delete ─────────────────────────────────────────── */
  const toggleSelect = id => setSelectedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const selectAll  = () => setSelectedIds(new Set(products.map(p => p.id)));
  const clearSel   = () => setSelectedIds(new Set());
  const exitSelect = () => { setSelectMode(false); clearSel(); };

  const deleteSelected = () => track(async () => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    const all = ids.length === products.length;
    const msg = all
      ? `Delete all ${ids.length} products? This also removes their photos and cannot be undone.`
      : `Delete ${ids.length} selected product${ids.length === 1 ? '' : 's'}? This also removes their photos and cannot be undone.`;
    if (!window.confirm(msg)) return;
    try {
      // One request rather than N — deleting a large library one-by-one is slow
      // and can half-finish. The backend also clears each photo from storage.
      const r = await API.bulkDeleteProducts(profileId, all ? { all: true } : { product_ids: ids });
      const removed = new Set(r.data?.deleted_ids || ids);
      setProducts(prev => prev.filter(p => !removed.has(p.id)));
      setCollections(prev => prev.map(c => ({ ...c, products: (c.products || []).filter(p => !removed.has(p.id)) })));
      exitSelect();
      success(`Deleted ${r.data?.deleted ?? ids.length} product${(r.data?.deleted ?? ids.length) === 1 ? '' : 's'}`);
    } catch (e) { error(e.response?.data?.error || 'Could not delete the selected products'); }
  });

  const bulkImport = (file, mode = 'append') => track(async () => {
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('mode', mode);
      const r = await API.bulkImportProducts(profileId, fd);
      const d = r.data || {};
      const returned = d.products || [];

      // 'replace'/'update' change existing rows, so re-read rather than append.
      if (mode === 'append') setProducts(prev => [...prev, ...returned]);
      else {
        try { const fresh = await API.getStudioProducts(profileId); setProducts(fresh.data || []); }
        catch { setProducts(returned); }
      }

      setProdMode(null);

      const bits = [];
      if (d.created) bits.push(`${d.created} added`);
      if (d.updated) bits.push(`${d.updated} updated`);
      if (d.deleted) bits.push(`${d.deleted} replaced`);
      success(`Import complete — ${bits.join(', ') || 'no changes'}`);

      // Surface skipped columns / bad values instead of failing silently.
      (d.warnings || []).slice(0, 4).forEach(w => error(w));

      if (d.job) { setImageJob(d.job); pollImageJob(d.job.id); }
    } catch (e) { error(e.response?.data?.error || 'Import failed'); }
  });

  // Poll the background image-import job until it finishes.
  const pollImageJob = (jobId) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const r = await API.getImageImportJob(profileId, jobId);
        const job = r.data?.job;
        if (!job) return;
        setImageJob(job);
        if (job.status === 'completed' || job.status === 'failed') {
          clearInterval(pollRef.current); pollRef.current = null;
          // Photos now exist on the server — refresh so they appear in the grid.
          try { const fresh = await API.getStudioProducts(profileId); setProducts(fresh.data || []); } catch { /* non-fatal */ }
        }
      } catch { /* transient — keep polling */ }
    }, 3000);
  };

  const retryImages = async () => {
    try {
      const r = await API.retryImageImport(profileId);
      if (r.data?.job) { setImageJob(r.data.job); pollImageJob(r.data.job.id); success('Retrying image download'); }
      else success(r.data?.message || 'No images pending');
    } catch { error('Could not start retry'); }
  };
  const downloadTemplate = async () => {
    try {
      const r = await API.downloadProductTemplate(profileId);
      const url = URL.createObjectURL(new Blob([r.data], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url; a.download = 'qala-product-template.csv';
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch { error('Could not download template'); }
  };

  // ── Collections ──
  const saveCollection = form => track(async () => {
    try {
      if (form.id) {
        const r = await API.patchCollection(profileId, form.id, form);
        setCollections(prev => prev.map(c => c.id === form.id ? r.data : c));
        setEditingCollection(null); success('Collection updated');
      } else {
        const r = await API.addCollection(profileId, form);
        setCollections(prev => [...prev, r.data]);
        setCollFormOpen(false); success('Collection created');
      }
    } catch { error('Failed to save collection'); }
  });
  const patchCollection = (id, patch) => track(async () => {
    setCollections(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
    try { const r = await API.patchCollection(profileId, id, patch); setCollections(prev => prev.map(c => c.id === id ? r.data : c)); }
    catch { error('Failed to save change'); }
  });
  const deleteCollection = id => track(async () => {
    try { await API.delCollection(profileId, id); } catch { error('Failed to delete collection'); return; }
    setCollections(prev => prev.filter(c => c.id !== id));
  });

  const finish = async (andNext = false) => {
    setSaving(true);
    try { success('Section G saved!'); onSave?.(); if (andNext) onNext?.(); }
    finally { setSaving(false); }
  };

  const tabBtn = (key, label, count) => (
    <button onClick={() => { setTab(key); setDdOpen(false); }}
      style={{ background: tab === key ? '#fff' : 'transparent', border: 'none', padding: '7px 20px', borderRadius: 'var(--r)', fontSize: 13, cursor: 'pointer', color: tab === key ? 'var(--text)' : '#888', fontWeight: 500, boxShadow: tab === key ? '0 1px 4px rgba(0,0,0,.1)' : 'none', whiteSpace: 'nowrap' }}>
      {label}
      <span style={{ fontSize: 10, background: tab === key ? 'var(--surface2)' : 'var(--surface4)', color: tab === key ? 'var(--green-d)' : '#777', borderRadius: 'var(--r-8)', padding: '1px 6px', marginLeft: 4 }}>{count}</span>
    </button>
  );

  return (
    <div style={{ padding: '40px 48px 80px', maxWidth: 760 }}>
      <Toast toasts={toasts} />
      <SectionHeader letter="G" title="Past Work"
        desc="Build your product library — every piece your studio has made. Then group them into collections to give buyers context. Start by adding products, then organise as you go." />

      {/* Top bar: tabs + primary action */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', background: 'var(--surface)', borderRadius: 'var(--r-8)', padding: 3, gap: 2 }}>
          {tabBtn('products', 'Products', products.length)}
          {tabBtn('collections', 'Collections', collections.length)}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 'auto', flexWrap: 'wrap' }}>
          {tab === 'products' ? (
            <div ref={ddRef} style={{ position: 'relative' }}>
              <button className="btn btn-primary" onClick={() => setDdOpen(o => !o)}>+ Add Product ▾</button>
              {ddOpen && (
                <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, background: '#fff', border: '1px solid var(--border-l)', borderRadius: 'var(--r-10)', boxShadow: '0 8px 24px rgba(0,0,0,.14)', minWidth: 230, zIndex: 200, overflow: 'hidden' }}>
                  <div onClick={() => { setProdMode('single'); setEditingProduct(null); setDdOpen(false); }} style={{ padding: '11px 14px', cursor: 'pointer', display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                    <div style={{ fontSize: 18 }}>✏️</div>
                    <div><div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>Add one product</div><div style={{ fontSize: 10, color: '#AAA', marginTop: 2, lineHeight: 1.4 }}>Fill in a quick form — name, type, fabrics, photos</div></div>
                  </div>
                  <div style={{ height: 1, background: 'var(--surface2)' }} />
                  <div onClick={() => { setProdMode('bulk'); setDdOpen(false); }} style={{ padding: '11px 14px', cursor: 'pointer', display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                    <div style={{ fontSize: 18 }}>📋</div>
                    <div><div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>Import via Excel</div><div style={{ fontSize: 10, color: '#AAA', marginTop: 2, lineHeight: 1.4 }}>Add many products at once from a spreadsheet</div></div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button className="btn btn-primary" onClick={() => { setEditingCollection(null); setCollFormOpen(true); }}>+ Create Collection</button>
          )}
        </div>
      </div>

      {/* ══ PRODUCTS VIEW ══ */}
      {tab === 'products' && (
        <div>
          {editingProduct
            ? <ProductForm initial={editingProduct} onSave={saveEditedProduct} onCancel={() => setEditingProduct(null)} />
            : prodMode === 'single' && <ProductForm onSave={addProduct} onCancel={() => setProdMode(null)} />}
          <ImageJobBanner job={imageJob} onRetry={retryImages} />
          {prodMode === 'bulk' && !editingProduct && <BulkZone onImport={bulkImport} onDownloadTemplate={downloadTemplate} onCancel={() => setProdMode(null)} />}

          {products.length === 0 && !prodMode && !editingProduct ? (
            <div style={{ border: '1px dashed var(--border-l)', borderRadius: 'var(--r-10)', padding: '32px', textAlign: 'center', color: '#AAA', fontSize: 13 }}>
              No products yet. Use <strong style={{ color: 'var(--sage)' }}>+ Add Product</strong> to start your library.
            </div>
          ) : (
            <>
              {/* Selection toolbar — only shown when there's something to select */}
              {products.length > 0 && !prodMode && !editingProduct && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap',
                  padding: selectMode ? '9px 12px' : 0, borderRadius: 'var(--r-8)',
                  background: selectMode ? 'var(--surface)' : 'transparent',
                  border: selectMode ? '1px solid var(--sage-pale)' : 'none' }}>
                  {!selectMode ? (
                    <button type="button" onClick={() => setSelectMode(true)}
                      style={{ background: 'none', border: '1px solid var(--border-l)', borderRadius: 'var(--r)', padding: '5px 12px', fontSize: 11, color: '#666', cursor: 'pointer' }}>
                      Select
                    </button>
                  ) : (
                    <>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--green-deep)' }}>
                        {selectedIds.size} selected
                      </span>
                      <button type="button" onClick={selectedIds.size === products.length ? clearSel : selectAll}
                        style={{ background: 'none', border: '1px solid var(--sage-pale)', borderRadius: 'var(--r)', padding: '5px 11px', fontSize: 11, color: 'var(--green-deep)', cursor: 'pointer' }}>
                        {selectedIds.size === products.length ? 'Clear all' : `Select all (${products.length})`}
                      </button>
                      <button type="button" disabled={!selectedIds.size} onClick={deleteSelected}
                        style={{ background: selectedIds.size ? 'var(--red-d)' : 'var(--surface4)', border: 'none', borderRadius: 'var(--r)', padding: '5px 13px', fontSize: 11, color: '#fff', cursor: selectedIds.size ? 'pointer' : 'default', fontWeight: 500 }}>
                        Delete selected
                      </button>
                      <button type="button" onClick={exitSelect}
                        style={{ background: 'none', border: 'none', fontSize: 11, color: '#888', cursor: 'pointer', marginLeft: 'auto' }}>
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12, marginBottom: 16 }}>
                {products.map(p => (
                  <ProductCard key={p.id} product={p} collectionName={collectionNameFor[p.id]}
                    selectable={selectMode}
                    selected={selectedIds.has(p.id)}
                    onToggleSelect={() => toggleSelect(p.id)}
                    onEdit={() => { setProdMode(null); setEditingProduct(p); }}
                    onDelete={() => deleteProduct(p.id)} />
                ))}
              </div>
            </>
          )}

          {products.length > 0 && (
            <div style={{ fontSize: 11, color: '#AAA', textAlign: 'center', padding: '8px 0' }}>
              {products.length} product{products.length === 1 ? '' : 's'} &nbsp;·&nbsp;
              <button onClick={() => { setEditingProduct(null); setProdMode('single'); }} style={{ background: 'none', border: 'none', color: 'var(--sage)', cursor: 'pointer', fontSize: 11, padding: 0 }}>+ Add product</button>
            </div>
          )}
        </div>
      )}

      {/* ══ COLLECTIONS VIEW ══ */}
      {tab === 'collections' && (
        <div>
          <div style={{ fontSize: 12, color: '#AAA', marginBottom: 16, lineHeight: 1.6 }}>
            Collections are how you present your work — group related products together to give buyers context. A product can belong to more than one collection.
          </div>

          {editingCollection
            ? <CollectionForm initial={editingCollection} products={products} onSave={saveCollection} onCancel={() => setEditingCollection(null)} />
            : collFormOpen && <CollectionForm products={products} onSave={saveCollection} onCancel={() => setCollFormOpen(false)} />}

          {collections.map(c => (
            <CollectionCard key={c.id} collection={c}
              onPatch={patch => patchCollection(c.id, patch)}
              onEdit={() => { setCollFormOpen(false); setEditingCollection({ ...c, product_ids: (c.products || []).map(p => p.id) }); }}
              onDelete={() => deleteCollection(c.id)}
              onViewProducts={() => setTab('products')} />
          ))}

          {!collFormOpen && !editingCollection && (
            <button onClick={() => { setEditingCollection(null); setCollFormOpen(true); }}
              style={{ width: '100%', padding: 14, border: '2px dashed var(--border-l)', borderRadius: 'var(--r-10)', background: 'transparent', fontSize: 13, color: '#999', cursor: 'pointer' }}>
              {collections.length ? '+ Create another collection' : '+ Create Collection'}
            </button>
          )}
        </div>
      )}

      {/* autoSaving={null} — Section G has no autosave and never did. Products
          and collections are committed through their own Save buttons, because
          a half-typed product form must not create a row. The footer used to
          pass `busy`, which rendered the green "Changes saved automatically"
          any time no upload was running, promising a guarantee this section
          cannot keep. The unsaved-changes guard above covers the real risk. */}
      <SectionFooter onNext={() => finish(true)} saving={saving || busy} autoSaving={null} />
    </div>
  );
}
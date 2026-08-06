// src/components/projects/BriefForm.jsx
// Shared brief edit form used by buyer (ProjectDetail) and admin (AdminProjectDetail).
// Change 2: Added reference_url field + file attachments block (admin-only) at bottom.
import { useState } from 'react';
import { projectsAPI } from '../../api/client';

const CURRENCIES = ['USD','EUR','GBP','INR','AED','SGD'];

function AttachmentIcon({ mime }) {
  if (!mime) return '📎';
  if (mime.startsWith('image/'))       return '🖼';
  if (mime === 'application/pdf')      return '📄';
  if (mime.startsWith('video/'))       return '🎬';
  if (mime.includes('word'))           return '📝';
  if (mime.includes('excel') || mime.includes('spreadsheet')) return '📊';
  return '📎';
}

function formatBytes(kb) {
  if (!kb) return '';
  if (kb < 1024) return `${kb} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export default function BriefForm({ projectId, brief, isAdmin, onSaved }) {
  const [form, setForm]   = useState({
    buyer_brand_name:           brief?.buyer_brand_name            || '',
    buyer_location:             brief?.buyer_location              || '',
    product_category:           brief?.product_category            || '',
    product_description:        brief?.product_description         || '',
    materials_keywords:         brief?.materials_keywords          || [],
    sample_quantity:            brief?.sample_quantity             || '',
    bulk_quantity:              brief?.bulk_quantity               || '',
    budget_min:                 brief?.budget_min                  || '',
    budget_max:                 brief?.budget_max                  || '',
    budget_currency:            brief?.budget_currency             || 'USD',
    target_landing_price_local: brief?.target_landing_price_local  || '',
    target_landing_currency:    brief?.target_landing_currency     || 'EUR',
    target_landing_price_usd:   brief?.target_landing_price_usd   || '',
    target_sample_delivery_date: brief?.target_sample_delivery_date || '',
    target_bulk_delivery_date:   brief?.target_bulk_delivery_date  || '',
    additional_specs:           brief?.additional_specs            || '',
    // Change 2: reference_url
    reference_url:              brief?.reference_url               || '',
  });
  const [kwInput,    setKwInput]    = useState('');
  const [saving,     setSaving]     = useState(false);

  // Change 2: attachments state
  const [attachments,    setAttachments]    = useState(brief?.moodboards || []);
  const [uploadingFile,  setUploadingFile]  = useState(false);
  const [deletingId,     setDeletingId]     = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const addKeyword = () => {
    const kw = kwInput.trim();
    if (!kw || form.materials_keywords.includes(kw)) return;
    set('materials_keywords', [...form.materials_keywords, kw]);
    setKwInput('');
  };
  const removeKeyword = kw => set('materials_keywords', form.materials_keywords.filter(k => k !== kw));

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        sample_quantity: form.sample_quantity ? parseInt(form.sample_quantity) : null,
        bulk_quantity:   form.bulk_quantity   ? parseInt(form.bulk_quantity)   : null,
        budget_min:      form.budget_min      || null,
        budget_max:      form.budget_max      || null,
        target_landing_price_local: form.target_landing_price_local || null,
        target_landing_price_usd:   form.target_landing_price_usd   || null,
        target_landing_currency:    form.target_landing_currency     || null,
        target_sample_delivery_date: form.target_sample_delivery_date || null,
        target_bulk_delivery_date:   form.target_bulk_delivery_date   || null,
        reference_url: form.reference_url || null,
      };
      if (isAdmin) {
        await projectsAPI.adminUpdateBrief(projectId, payload);
      } else {
        await projectsAPI.updateBrief(projectId, payload);
      }
      onSaved();
    } catch {} finally { setSaving(false); }
  };

  // Change 2: upload attachment (admin only)
  const uploadAttachment = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploadingFile(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('order', attachments.length + 1);
      const r = await projectsAPI.adminUploadMoodboard(projectId, fd);
      setAttachments(prev => [...prev, r.data.moodboard]);
    } catch (err) {
      alert('Upload failed. Allowed: images, PDF, video, Word, Excel. Max 50 MB (100 MB for video).');
    } finally { setUploadingFile(false); }
  };

  // Change 2: delete attachment (admin only)
  const deleteAttachment = async (id) => {
    setDeletingId(id);
    try {
      await projectsAPI.adminDeleteMoodboard(projectId, id);
      setAttachments(prev => prev.filter(a => a.id !== id));
    } catch {} finally { setDeletingId(null); }
  };

  const inp = { fontSize: 13 };
  const sel = {
    width: '100%', padding: '9px 12px', borderRadius: 'var(--r-8)',
    border: '1px solid var(--border)', background: 'var(--surface2)',
    fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--text)',
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

      {/* Buyer / brand */}
      <div className="field">
        <label style={{ fontSize: 11 }}>Brand / Buyer Name</label>
        <input value={form.buyer_brand_name} onChange={e => set('buyer_brand_name', e.target.value)} placeholder="Maison Éclat" style={inp} />
      </div>
      <div className="field">
        <label style={{ fontSize: 11 }}>Location (City, Country)</label>
        <input value={form.buyer_location} onChange={e => set('buyer_location', e.target.value)} placeholder="Paris, France" style={inp} />
      </div>

      {/* Product */}
      <div className="field">
        <label style={{ fontSize: 11 }}>Product Category</label>
        <input value={form.product_category} onChange={e => set('product_category', e.target.value)} placeholder="Women's RTW · 5 pieces" style={inp} />
      </div>
      <div className="field" style={{ gridColumn: '1 / -1' }}>
        <label style={{ fontSize: 11 }}>Product Description</label>
        <textarea rows={3} value={form.product_description} onChange={e => set('product_description', e.target.value)}
          placeholder="A 5-piece linen collection for summer — kurta, wide-leg trousers, jacket…"
          style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--r-8)', border: '1px solid var(--border)', background: 'var(--surface2)', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text)', resize: 'vertical' }} />
      </div>

      {/* Materials keywords */}
      <div style={{ gridColumn: '1 / -1' }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', display: 'block', marginBottom: 6 }}>Materials / Keywords</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {form.materials_keywords.map(kw => (
            <span key={kw} style={{ fontSize: 12, padding: '3px 10px', background: 'var(--surface3)', borderRadius: 'var(--r-20)', color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 6 }}>
              {kw}
              <button onClick={() => removeKeyword(kw)} style={{ background: 'none', border: 'none', color: 'var(--text4)', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={kwInput} onChange={e => setKwInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addKeyword()}
            placeholder="e.g. 100% Linen, Natural dyes, Handblock print — press Enter to add"
            style={{ flex: 1, padding: '7px 10px', borderRadius: 'var(--r)', border: '1px solid var(--border)', background: 'var(--surface2)', fontSize: 12, fontFamily: 'var(--font-body)', color: 'var(--text)' }} />
          <button onClick={addKeyword} className="btn btn-ghost" style={{ fontSize: 12, padding: '7px 12px' }}>Add</button>
        </div>
      </div>

      {/* Quantities */}
      <div className="field">
        <label style={{ fontSize: 11 }}>Sample Quantity (sets)</label>
        <input type="number" value={form.sample_quantity} onChange={e => set('sample_quantity', e.target.value)} placeholder="1" min="0" style={inp} />
      </div>
      <div className="field">
        <label style={{ fontSize: 11 }}>Bulk Quantity (sets)</label>
        <input type="number" value={form.bulk_quantity} onChange={e => set('bulk_quantity', e.target.value)} placeholder="100" min="0" style={inp} />
      </div>

      {/* Budget */}
      <div className="field">
        <label style={{ fontSize: 11 }}>Budget Min</label>
        <input type="number" value={form.budget_min} onChange={e => set('budget_min', e.target.value)} placeholder="5000" style={inp} />
      </div>
      <div className="field">
        <label style={{ fontSize: 11 }}>Budget Max</label>
        <input type="number" value={form.budget_max} onChange={e => set('budget_max', e.target.value)} placeholder="15000" style={inp} />
      </div>
      <div className="field">
        <label style={{ fontSize: 11 }}>Budget Currency</label>
        <select value={form.budget_currency} onChange={e => set('budget_currency', e.target.value)} style={sel}>
          {CURRENCIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Target landing price */}
      <div className="field">
        <label style={{ fontSize: 11 }}>Target Landing Price (local currency)</label>
        <input type="number" value={form.target_landing_price_local} onChange={e => set('target_landing_price_local', e.target.value)} placeholder="480" style={inp} />
      </div>
      <div className="field">
        <label style={{ fontSize: 11 }}>Landing Price Currency</label>
        <select value={form.target_landing_currency} onChange={e => set('target_landing_currency', e.target.value)} style={sel}>
          {CURRENCIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div className="field">
        <label style={{ fontSize: 11 }}>Target Landing Price (USD equivalent)</label>
        <input type="number" value={form.target_landing_price_usd} onChange={e => set('target_landing_price_usd', e.target.value)} placeholder="519" style={inp} />
      </div>

      {/* Delivery dates */}
      <div className="field">
        <label style={{ fontSize: 11 }}>Target Sample Delivery Date</label>
        <input type="date" value={form.target_sample_delivery_date} onChange={e => set('target_sample_delivery_date', e.target.value)} style={inp} />
      </div>
      <div className="field">
        <label style={{ fontSize: 11 }}>Target Bulk Delivery Date</label>
        <input type="date" value={form.target_bulk_delivery_date} onChange={e => set('target_bulk_delivery_date', e.target.value)} style={inp} />
      </div>

      {/* Additional specs */}
      <div className="field" style={{ gridColumn: '1 / -1' }}>
        <label style={{ fontSize: 11 }}>Additional Notes</label>
        <textarea rows={3} value={form.additional_specs} onChange={e => set('additional_specs', e.target.value)}
          placeholder="Open to studio's creative direction. Minimal packaging preferred…"
          style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--r-8)', border: '1px solid var(--border)', background: 'var(--surface2)', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text)', resize: 'vertical' }} />
      </div>

      {/* ── Change 2: Reference link + attachments (bottom, full-width) ── */}
      <div style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--border)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Reference Materials</div>

        {/* Reference URL — available to both admin and buyer */}
        <div className="field" style={{ margin: 0 }}>
          <label style={{ fontSize: 11 }}>Reference Link</label>
          <input
            type="url"
            value={form.reference_url}
            onChange={e => set('reference_url', e.target.value)}
            placeholder="https://drive.google.com/… or Notion / Dropbox link"
            style={inp}
          />
          <span style={{ fontSize: 11, color: 'var(--text4)', marginTop: 4, display: 'block' }}>
            Paste a Google Drive folder, Notion page, Dropbox link, or any external reference for the studio.
          </span>
        </div>

        {/* File attachments — admin only */}
        {isAdmin && (
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 8 }}>
              Attachments <span style={{ fontWeight: 400, color: 'var(--text4)' }}>(images, PDF, video, Word, Excel)</span>
            </label>

            {/* Existing attachments list */}
            {attachments.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                {attachments.map(a => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--surface2)', borderRadius: 'var(--r-8)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 16 }}>{AttachmentIcon({ mime: a.mime_type })}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {a.url ? (
                          <a href={a.url} target="_blank" rel="noreferrer" style={{ color: 'var(--gold)', textDecoration: 'none' }}>
                            {a.file_name}
                          </a>
                        ) : a.file_name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text4)' }}>{a.mime_type} · {formatBytes(a.file_size_kb)}</div>
                    </div>
                    <button
                      disabled={deletingId === a.id}
                      onClick={() => deleteAttachment(a.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text4)', fontSize: 18, padding: '2px 6px', lineHeight: 1 }}
                      title="Remove attachment"
                    >
                      {deletingId === a.id ? '…' : '×'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload button */}
            <label style={{ display: 'inline-block', cursor: 'pointer' }}>
              <input
                type="file"
                style={{ display: 'none' }}
                accept="image/*,.pdf,video/mp4,video/quicktime,video/x-msvideo,.doc,.docx,.xls,.xlsx"
                onChange={uploadAttachment}
                disabled={uploadingFile}
              />
              <span className="btn btn-ghost" style={{ fontSize: 12, cursor: 'pointer', opacity: uploadingFile ? 0.6 : 1 }}>
                {uploadingFile ? 'Uploading…' : '+ Upload file'}
              </span>
            </label>
          </div>
        )}

        {/* Show attachments read-only for non-admin (buyer can see but not upload) */}
        {!isAdmin && attachments.length > 0 && (
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 8 }}>Attachments</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {attachments.map(a => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--surface2)', borderRadius: 'var(--r-8)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 16 }}>{AttachmentIcon({ mime: a.mime_type })}</span>
                  <a href={a.url} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: 'var(--gold)', textDecoration: 'none' }}>{a.file_name}</a>
                  <span style={{ fontSize: 11, color: 'var(--text4)', marginLeft: 'auto' }}>{formatBytes(a.file_size_kb)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10 }}>
        <button onClick={save} disabled={saving} className="btn btn-primary" style={{ fontSize: 13 }}>
          {saving ? 'Saving…' : 'Save Brief'}
        </button>
      </div>
    </div>
  );
}
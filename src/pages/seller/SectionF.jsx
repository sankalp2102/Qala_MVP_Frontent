import { useState, useEffect } from 'react';
import { onboardingAPI } from '../../api/client';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../../components/Toast';

function CardSection({ title, children }) {
  return (
    <div className="card fade-up" style={{ marginBottom: 20 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--text)', marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>{title}</div>
      {children}
    </div>
  );
}

export default function SectionF({ profileId, onSave }) {
  const { toasts, success, error } = useToast();
  const [steps, setSteps]       = useState('');
  const [stepsFlagged, setStepsFlagged] = useState(null);
  const [media, setMedia]       = useState([]);
  const [saving, setSaving]     = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!profileId) return;
    onboardingAPI.getProcess(profileId).then(r => {
      const d = r.data;
      if (!d) return;
      setSteps(d.production_steps || '');
      setStepsFlagged(d.steps_flagged ? d.steps_flag_reason : null);
      setMedia(d.bts_media || []);
    }).catch(() => {});
  }, [profileId]);

  const save = async () => {
    setSaving(true);
    try {
      await onboardingAPI.putProcess(profileId, { production_steps: steps });
      success('Section F saved!');
      onSave?.();
    } catch (e) {
      error(e.response?.data ? JSON.stringify(e.response.data) : 'Save failed');
    } finally { setSaving(false); }
  };

  const upload = async e => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('order', media.length + 1);
      const r = await onboardingAPI.uploadBTS(profileId, fd);
      setMedia(m => [...m, r.data]);
      success('Uploaded!');
    } catch (e) {
      error(e.response?.data?.file?.[0] || 'Upload failed. Check file type and size.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const delMedia = async id => {
    try {
      await onboardingAPI.delBTS(profileId, id);
      setMedia(m => m.filter(x => x.id !== id));
    } catch { error('Failed to remove file'); }
  };

  const isVideo = mime => mime && mime.startsWith('video');

  return (
    <div style={{ padding: '40px 48px', maxWidth: 760 }}>
      <Toast toasts={toasts} />
      <div className="fade-up" style={{ marginBottom: 36 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{ width: 44, height: 44, borderRadius: 11, background: 'var(--gold-dim)', border: '1px solid rgba(200,165,90,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>⚙️</div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Section F</div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, color: 'var(--text)' }}>Process Readiness</h1>
          </div>
        </div>
        <p style={{ color: 'var(--text3)', fontSize: 14, marginLeft: 56 }}>Walk buyers through how you work — from receiving a brief to final delivery.</p>
      </div>

      {/* F.1 Production Steps */}
      <CardSection title="F.1 — Full Production Process">
        <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 6, lineHeight: 1.7 }}>
          Describe your complete production workflow — from the moment you receive a buyer's brief to the moment their order is shipped. Include all stages, who handles each, and typical timelines.
        </p>
        <p style={{ fontSize: 12, color: 'var(--text4)', marginBottom: 14 }}>
          The more detail you provide here, the more confidence buyers have in working with you. This section is read carefully by serious buyers.
        </p>
        {stepsFlagged && (
          <div style={{ background: 'var(--red-dim)', border: '1px solid rgba(224,85,85,0.25)', borderLeft: '3px solid var(--red)', borderRadius: 'var(--radius)', padding: '8px 12px', fontSize: 12, color: 'var(--red)', marginBottom: 12 }}>
            🚩 Admin flagged: {stepsFlagged}
          </div>
        )}
        <textarea
          value={steps}
          onChange={e => setSteps(e.target.value)}
          style={{
            width: '100%', minHeight: 240, padding: '14px 16px',
            border: '1px solid var(--border2)', borderRadius: 'var(--radius)',
            background: 'var(--surface2)', color: 'var(--text)', fontSize: 14,
            resize: 'vertical', fontFamily: 'var(--font-body)', lineHeight: 1.8,
            transition: 'border-color .18s, box-shadow .18s',
          }}
          onFocus={e => { e.target.style.borderColor = 'var(--gold-d)'; e.target.style.boxShadow = '0 0 0 3px var(--gold-dim)'; }}
          onBlur={e => { e.target.style.borderColor = 'var(--border2)'; e.target.style.boxShadow = 'none'; }}
          placeholder={`Step 1: Receive brief from buyer — review reference images, tech pack (if available), quantity, timeline requirements. Confirm feasibility within 24 hours.

Step 2: Fabric sourcing — source from our regular suppliers in Jaipur. 3–5 days for standard stock, up to 2 weeks for special orders.

Step 3: Sample development — our master craftsperson begins the first sample. Block carving (if new motif required): 3–4 days. First sample delivery: 10–12 days from brief.

Step 4: Buyer approval round — buyer reviews sample physically or via video call. We incorporate feedback.

Step 5: Bulk production begins once sample is approved in writing. Production timeline shared upfront per order.

Step 6: Quality check — each piece individually inspected before packing.

Step 7: Packing and dispatch via our logistics partner. Real-time tracking shared.`}
        />
      </CardSection>

      {/* F.2 BTS Media */}
      <CardSection title="F.2 — Behind-the-Scenes &amp; Promotional Media">
        <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 6, lineHeight: 1.7 }}>
          Upload photos and videos from your studio — craftspeople at work, production in progress, your workspace, finished products, packaging. This content appears on your profile to buyers.
        </p>
        <p style={{ fontSize: 12, color: 'var(--text4)', marginBottom: 16 }}>
          Authentic behind-the-scenes content builds trust significantly with high-value buyers.
        </p>

        {/* Uploaded files */}
        {media.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Uploaded ({media.length})</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
              {media.map(m => (
                <div key={m.id} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px', position: 'relative' }}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>{isVideo(m.mime_type) ? '🎥' : '🖼️'}</div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', wordBreak: 'break-all', marginBottom: 4 }}>{m.file_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text4)' }}>{m.mime_type} · {m.file_size_kb} KB</div>
                  {m.caption && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{m.caption}</div>}
                  <button onClick={() => delMedia(m.id)} style={{
                    position: 'absolute', top: 8, right: 8,
                    background: 'var(--red-dim)', border: 'none', color: 'var(--red)',
                    width: 22, height: 22, borderRadius: 6, cursor: 'pointer', fontSize: 12,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload button */}
        <label style={{ display: 'inline-block' }}>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/x-msvideo"
            onChange={upload}
            style={{ display: 'none' }}
          />
          <span className="btn btn-outline" style={{ cursor: 'pointer' }}>
            {uploading
              ? <><span className="spinner" style={{ width: 15, height: 15 }} /> Uploading…</>
              : '+ Upload Photo or Video'}
          </span>
        </label>
        <p style={{ fontSize: 11, color: 'var(--text4)', marginTop: 10 }}>
          Images: JPG · PNG · WEBP up to 10 MB &nbsp;|&nbsp; Videos: MP4 · MOV · AVI up to 100 MB
        </p>
      </CardSection>

      <button className="btn btn-primary btn-lg fade-up" onClick={save} disabled={saving}>
        {saving ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Saving…</> : '✓ Save Section F'}
      </button>
    </div>
  );
}

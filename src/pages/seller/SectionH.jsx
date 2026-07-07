import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { onboardingAPI } from '../../api/client';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../../components/Toast';

const API = onboardingAPI;

function SectionHeader({ letter, title, desc }) {
  return (
    <div className="fade-up" style={{ marginBottom: 36 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Section {letter}</div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 500, fontStyle: 'italic', color: 'var(--gold)', lineHeight: 1.1 }}>{title}</h1>
      <p style={{ color: 'var(--text3)', fontSize: 14, marginTop: 8 }}>{desc}</p>
    </div>
  );
}

function CardSection({ title, desc, children }) {
  return (
    <div className="card fade-up" style={{ marginBottom: 16 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 500, fontStyle: 'italic', color: 'var(--text)', marginBottom: 6 }}>{title}</div>
      {desc && <p style={{ fontSize: 12.5, color: 'var(--text3)', marginBottom: 16, lineHeight: 1.7 }}>{desc}</p>}
      {children}
    </div>
  );
}

function UploadArea({ uploading, progress }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ border: '1px dashed #C8C4BF', borderRadius: 6, padding: 28, textAlign: 'center', background: hovered && !uploading ? '#FAFAF8' : 'transparent', transition: 'background .1s' }}>
      {uploading ? (
        <div style={{ fontSize: 13, color: '#888' }}>
          <span className="spinner" style={{ width: 14, height: 14, display: 'inline-block', marginRight: 6 }} />
          Uploading {progress?.done || 0} / {progress?.total || 0}…
        </div>
      ) : (
        <>
          <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>Upload photos &amp; videos</div>
          <div style={{ fontSize: 11, color: '#BBBBBB' }}>Images up to 10 MB · Videos up to 100 MB</div>
        </>
      )}
    </div>
  );
}

export default function SectionH({ profileId, initialData, onSave, onNext }) {
  const { toasts, success, error } = useToast();
  const nav = useNavigate();

  const [media, setMedia] = useState([]);
  const [studioNotes, setStudioNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!initialData) return;
    const { process, studio } = initialData;
    if (process?.bts_media) setMedia(process.bts_media);
    if (studio?.studio_notes) setStudioNotes(studio.studio_notes || '');
  }, [initialData]);

  useEffect(() => {
    if (!profileId || initialData) return;
    API.getProcess(profileId).then(r => { if (r.data?.bts_media) setMedia(r.data.bts_media); }).catch(() => {});
    API.getStudio(profileId).then(r => { setStudioNotes(r.data?.studio_notes || ''); }).catch(() => {});
  }, [profileId]);

  const upload = async e => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    e.target.value = '';

    setUploading(true);
    setUploadProgress({ done: 0, total: files.length, failed: 0 });
    let done = 0, failed = 0;

    for (const file of files) {
      try {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('order', media.length + done + 1);
        const r = await API.uploadBTS(profileId, fd);
        setMedia(m => [...m, r.data]);
      } catch { failed++; }
      done++;
      setUploadProgress({ done, total: files.length, failed });
    }

    if (failed === 0) success(`${files.length} file${files.length > 1 ? 's' : ''} uploaded!`);
    else error(`${failed} of ${files.length} failed`);

    setUploading(false);
    setUploadProgress(null);
  };

  const delMedia = async id => {
    try { await API.delBTS(profileId, id); setMedia(m => m.filter(x => x.id !== id)); }
    catch { error('Failed'); }
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      await API.patchStudio(profileId, { studio_notes: studioNotes });
      success('Profile submitted!');
      onSave?.();
      nav('/dashboard');
    } catch (e) {
      error(e.response?.data ? JSON.stringify(e.response.data) : 'Submit failed');
    } finally { setSubmitting(false); }
  };

  return (
    <div style={{ padding: '40px 48px', maxWidth: 760 }}>
      <Toast toasts={toasts} />
      <SectionHeader letter="H" title="Behind the Scenes" desc="Craftspeople at work, dye vats, printing tables, finished products being packed. Authentic content builds trust significantly with serious buyers." />

      <CardSection
        title="H.1 — Studio & Process Media"
        desc="Good BTS content includes: artisans mid-process, close-ups of craft detail, the studio workspace, materials and tools, finished product packaged for delivery."
      >
        {media.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {media.map(m => (
              <div key={m.id} style={{ width: 72, height: 72, borderRadius: 6, overflow: 'hidden', position: 'relative', border: '1px solid var(--border2)' }}>
                {m.mime_type?.startsWith('video') ? (
                  <div style={{ width: '100%', height: '100%', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--text4)' }}>Video</div>
                ) : (
                  <img src={m.file} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
                <button onClick={() => delMedia(m.id)} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: 4, width: 18, height: 18, fontSize: 11, cursor: 'pointer', lineHeight: 1 }}>×</button>
              </div>
            ))}
          </div>
        )}
        <label style={{ display: 'block', cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.6 : 1 }}>
          <input type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/x-msvideo" onChange={upload} style={{ display: 'none' }} disabled={uploading} />
          <UploadArea uploading={uploading} progress={uploadProgress} />
        </label>
        {uploadProgress?.failed > 0 && <span style={{ fontSize: 11, color: 'var(--red)', marginLeft: 10 }}>{uploadProgress.failed} failed</span>}
        <p style={{ fontSize: 11, color: 'var(--text4)', marginTop: 8 }}>Images: JPG · PNG · WEBP up to 10 MB. Videos: MP4 · MOV · AVI up to 100 MB.</p>
      </CardSection>

      <CardSection
        title="H.2 — Anything else buyers should know?"
        desc="Is there anything about your studio, your process, or the way you work that hasn't come up — and that you would want a buyer to know before reaching out?"
      >
        <textarea rows={4} value={studioNotes} onChange={e => setStudioNotes(e.target.value)}
          placeholder="e.g. We visit buyer locations for fit sessions at no extra cost. We are a women-led studio — all 40 artisans are women."
          style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--border2)', borderRadius: 'var(--radius)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 14, fontFamily: 'var(--font-body)', lineHeight: 1.7, resize: 'vertical' }} />
        <p style={{ fontSize: 11, color: 'var(--text4)', marginTop: 8 }}>Optional. This appears at the bottom of your public profile.</p>
      </CardSection>

      <button className="btn btn-primary btn-lg fade-up" onClick={submit} disabled={submitting}>
        {submitting ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Submitting…</> : '✓ Submit Profile'}
      </button>
    </div>
  );
}
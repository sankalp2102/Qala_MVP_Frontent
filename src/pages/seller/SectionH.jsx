import { useState, useEffect } from 'react';
import { onboardingAPI } from '../../api/client';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../../components/Toast';
import { SectionHeader, QCard, SectionFooter, MediaDropzone, MediaThumb, textareaStyle } from './_ui';
import { mediaUrl } from '../../utils/mediaUrl';

const API = onboardingAPI;

export default function SectionH({ profileId, initialData, onSave, onNext }) {
  const { toasts, success, error } = useToast();

  const [media, setMedia] = useState([]);
  const [studioNotes, setStudioNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [saving, setSaving] = useState(false);

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

  const doSave = async (thenNav) => {
    setSaving(true);
    try {
      await API.patchStudio(profileId, { studio_notes: studioNotes });
      success(thenNav ? 'Profile submitted!' : 'Section H saved!');
      onSave?.();
      if (thenNav) onNext?.();
    } catch (e) {
      error(e.response?.data ? JSON.stringify(e.response.data) : 'Save failed');
    } finally { setSaving(false); }
  };

  return (
    <div style={{ padding: '40px 48px 80px', maxWidth: 760 }}>
      <Toast toasts={toasts} />
      <SectionHeader letter="H" title="Behind the Scenes" desc="Craftspeople at work, dye vats, printing tables, finished products being packed. Authentic content builds trust significantly with serious buyers." />

      <QCard qref="H.1" title="Studio & Process Media"
        desc="Good BTS content includes: artisans mid-process, close-ups of craft detail, the studio workspace, materials and tools, finished product packaged for delivery.">
        <label style={{ display: 'block', cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.6 : 1 }}>
          <input type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/x-msvideo" onChange={upload} style={{ display: 'none' }} disabled={uploading} />
          <MediaDropzone icon="🎬" uploading={uploading} progress={uploadProgress}
            label="Upload photos or videos"
            hint="Images: JPG · PNG · WEBP up to 10 MB · Videos: MP4 · MOV · AVI up to 100 MB" />
        </label>
        {media.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
            {media.map(m => (
              <MediaThumb key={m.id} src={mediaUrl(m.file)} isVideo={m.mime_type?.startsWith('video')} onRemove={() => delMedia(m.id)} />
            ))}
          </div>
        )}
        {uploadProgress?.failed > 0 && <span style={{ fontSize: 11, color: 'var(--red)', marginLeft: 10 }}>{uploadProgress.failed} failed</span>}
      </QCard>

      <QCard qref="H.2" title="Anything else buyers should know?"
        desc="Is there anything about your studio, your process, or the way you work that hasn't come up in this form — and that you'd want a buyer to know before reaching out?">
        <textarea rows={4} value={studioNotes} onChange={e => setStudioNotes(e.target.value)}
          placeholder="e.g. We visit buyer locations for fit sessions at no extra cost. We're a women-led studio — all 40 of our artisans are women from the local community. We don't take fast-turnaround orders under 4 weeks — quality takes time."
          style={{ ...textareaStyle, marginTop: 8 }} />
      </QCard>

      <SectionFooter
        onNext={() => doSave(true)}
        onSave={() => doSave(false)}
        saving={saving}
        nextLabel="Submit Profile ✓" />
    </div>
  );
}
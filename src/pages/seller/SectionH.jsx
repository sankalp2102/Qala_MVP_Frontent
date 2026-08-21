import { useState, useEffect } from 'react';
import { onboardingAPI, extractErrorMessage } from '../../api/client';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../../components/Toast';
import { SectionHeader, QCard, SectionFooter, MediaDropzone, MediaThumb, useAutosave, textareaStyle } from './_ui';
import { mediaUrl } from '../../utils/mediaUrl';

const API = onboardingAPI;

export default function SectionH({ profileId, initialData, onSave, onNext }) {
  const { toasts, success, error } = useToast();

  const [media, setMedia] = useState([]);
  const [sustainability, setSustainability] = useState('');   // H.1 (v6 NEW)
  const [teamCare, setTeamCare]             = useState('');   // H.2 (v6 NEW)
  const [studioNotes, setStudioNotes]       = useState('');   // H.4
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!initialData) return;
    const { process, studio } = initialData;
    if (process?.bts_media) setMedia(process.bts_media);
    if (studio) {
      setSustainability(studio.sustainability_notes || '');
      setTeamCare(studio.team_care_notes || '');
      setStudioNotes(studio.studio_notes || '');
    }
  }, [initialData]);

  useEffect(() => {
    if (!profileId || initialData) return;
    API.getProcess(profileId).then(r => { if (r.data?.bts_media) setMedia(r.data.bts_media); }).catch(() => {});
    API.getStudio(profileId).then(r => {
      setSustainability(r.data?.sustainability_notes || '');
      setTeamCare(r.data?.team_care_notes || '');
      setStudioNotes(r.data?.studio_notes || '');
    }).catch(() => {});
  }, [profileId]);

  const upload = async e => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    e.target.value = '';

    setUploading(true);
    setUploadProgress({ done: 0, total: files.length, failed: 0 });
    let done = 0, failed = 0;
    let lastFailReason = '';

    for (const file of files) {
      try {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('order', media.length + done + 1);
        const r = await API.uploadBTS(profileId, fd);
        setMedia(m => [...m, r.data]);
      } catch (e) {
        // Bug fix (Aug 2026): counted failures but never recorded WHY —
        // the toast below could only ever say "N failed," never what
        // actually went wrong. Uses the shared extractErrorMessage
        // helper now — the flat field lookup this used to do never
        // actually matched what the backend returns, on top of a
        // separate backend bug that made every field error unreadable
        // regardless (see core/utils.py) — both fixed together.
        failed++;
        lastFailReason = extractErrorMessage(e, lastFailReason);
      }
      done++;
      setUploadProgress({ done, total: files.length, failed });
    }

    if (failed === 0) success(`${files.length} file${files.length > 1 ? 's' : ''} uploaded!`);
    else error(`${failed} of ${files.length} failed${lastFailReason ? ` — ${lastFailReason}` : ''}`);

    setUploading(false);
    setUploadProgress(null);
  };

  const delMedia = async id => {
    // Bug fix (Aug 2026): same class of issue fixed in SectionD's
    // deleteCard — this removed the item from local state even when the
    // backend delete failed, so the UI could silently drift from what's
    // actually saved. Only removes locally once the delete succeeds.
    try { await API.delBTS(profileId, id); }
    catch (e) { error(extractErrorMessage(e, 'Could not delete — please try again.')); return; }
    setMedia(m => m.filter(x => x.id !== id));
  };

  const buildPayload = () => ({
    sustainability_notes: sustainability,
    team_care_notes:      teamCare,
    studio_notes:         studioNotes,
  });

  const autoSaving = useAutosave(() => API.patchStudio(profileId, buildPayload()),
    [sustainability, teamCare, studioNotes]);

  const doSave = async (thenNav) => {
    setSaving(true);
    try {
      await API.patchStudio(profileId, buildPayload());
      success(thenNav ? 'Profile submitted!' : 'Section H saved!');
      onSave?.();
      if (thenNav) onNext?.();
    } catch (e) {
      error(extractErrorMessage(e, 'Save failed'));
    } finally { setSaving(false); }
  };

  return (
    <div style={{ padding: '40px 48px 80px', maxWidth: 760 }}>
      <Toast toasts={toasts} />
      <SectionHeader letter="H" title="Behind the Scenes" desc="Craftspeople at work, dye vats, printing tables, finished products being packed. Authentic content builds trust significantly with serious buyers." />

      {/* H.1 — Sustainability (v6 NEW) */}
      <QCard qref="H.1" title="How does your studio approach sustainable production?"
        desc="Materials, waste, water, energy, sourcing — whatever sustainability means in practice for your studio. Buyers increasingly ask, and specifics build trust.">
        <textarea rows={4} value={sustainability} onChange={e => setSustainability(e.target.value)}
          placeholder="e.g. We use only natural indigo and plant-based dyes — no chemicals at all. Our cutting waste goes to a local cooperative that makes accessories from it. We source handloom cotton from rain-fed farms in Maharashtra."
          style={{ ...textareaStyle, marginTop: 8 }} />
      </QCard>

      {/* H.2 — Team care (v6 NEW) */}
      <QCard qref="H.2" title="How do you take care of your team?"
        desc="Wages, working conditions, benefits, skill development — how you look after the people who make the work.">
        <textarea rows={4} value={teamCare} onChange={e => setTeamCare(e.target.value)}
          placeholder="e.g. All our artisans earn above minimum wage and are covered under a group health insurance policy. We run a monthly skill workshop and our workspace has proper ventilation and natural light."
          style={{ ...textareaStyle, marginTop: 8 }} />
      </QCard>

      {/* H.3 — Studio & Process Media (was H.1) */}
      <QCard qref="H.3" title="Studio & Process Media"
        desc="Good BTS content includes: artisans mid-process, close-ups of craft detail, the studio workspace, materials and tools, finished product packaged for delivery.">
        <label style={{ display: 'block', cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.6 : 1 }}>
          {/* Bug fix (Aug 2026): "some studios reported photo and video
              upload not working" — this explicit list can filter HEIC
              files out of the browser's own file picker on desktop
              entirely, before any code here runs. image/* lets HEIC
              through to be selected; the backend converts it to JPEG
              automatically. Video types are left as an explicit list —
              unlike images, there's no equivalent "convert whatever
              format arrives" step for video, so only formats the backend
              genuinely accepts should be selectable in the first place. */}
          <input type="file" multiple accept="image/*,video/mp4,video/quicktime,video/x-msvideo" onChange={upload} style={{ display: 'none' }} disabled={uploading} />
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

      {/* H.4 — Anything else (was H.2) */}
      <QCard qref="H.4" title="Anything else buyers should know?"
        desc="Is there anything about your studio, your process, or the way you work that hasn't come up in this form — and that you'd want a buyer to know before reaching out?">
        <textarea rows={4} value={studioNotes} onChange={e => setStudioNotes(e.target.value)}
          placeholder="e.g. We visit buyer locations for fit sessions at no extra cost. We're a women-led studio — all 40 of our artisans are women from the local community. We don't take fast-turnaround orders under 4 weeks — quality takes time."
          style={{ ...textareaStyle, marginTop: 8 }} />
      </QCard>

      <SectionFooter
        onNext={() => doSave(true)}
        saving={saving}
        autoSaving={autoSaving}
        nextLabel="Submit Profile ✓" />
    </div>
  );
}
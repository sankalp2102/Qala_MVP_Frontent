import { useState, useEffect } from 'react';
import { onboardingAPI } from '../../api/client';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../../components/Toast';
import {
  SectionHeader, QCard, SectionFooter, CollabToggle, HideToggle,
  TrashIcon, inputStyle, textareaStyle,
} from './_ui';
import { mediaUrl } from '../../utils/mediaUrl';

const API = onboardingAPI;

function FieldLabel({ children }) {
  return <div style={{ fontSize: 10, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{children}</div>;
}

/* Client-type radio cards. */
function ClientTypeRadio({ value, onChange }) {
  const opts = [
    { value: 'own',   label: 'Own brand' },
    { value: 'named', label: 'Brand / Buyer' },
    { value: 'anon',  label: 'Prefer not to name' },
  ];
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {opts.map(o => (
        <label key={o.value} onClick={() => onChange(o.value)}
          style={{
            flex: o.value === 'anon' ? 1.2 : 1, display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 12px', borderRadius: 5, cursor: 'pointer',
            border: `1px solid ${value === o.value ? '#1A1A1A' : '#E4E0DB'}`,
            background: value === o.value ? '#F5F3EF' : '#fff',
          }}>
          <input type="radio" checked={value === o.value} onChange={() => onChange(o.value)} style={{ accentColor: '#1A1A1A', width: 'auto', flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 500, color: '#1A1A1A' }}>{o.label}</span>
        </label>
      ))}
    </div>
  );
}

/* Saved project card. */
function ProjectCard({ project, onPatch, onDelete, onUploadPhoto, onDeletePhoto }) {
  const [editing, setEditing] = useState(false);

  const clientLabel = project.client_type === 'named' && project.client_name
    ? project.client_name
    : project.client_type === 'anon' ? 'Client undisclosed' : 'Own brand';

  const monthLabel = project.month_year
    ? new Date(project.month_year + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    : null;

  const photos = project.photos || [];

  return (
    <div style={{
      border: '1px solid #D8D4CF', borderRadius: 10, background: '#fff', marginBottom: 14,
      boxShadow: '0 2px 10px rgba(0,0,0,0.07)', opacity: project.is_hidden ? 0.65 : 1, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #F0EDE8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <strong style={{ fontSize: 14, color: '#1A1A1A' }}>{project.name || 'Untitled project'}</strong>
            {project.is_hidden && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#888', background: '#F5F3EF', border: '1px solid #E4E0DB', padding: '2px 8px', borderRadius: 10 }}>🔒 Hidden</span>
            )}
          </div>
          <span style={{ fontSize: 12, color: '#888' }}>{clientLabel}{monthLabel ? ` · ${monthLabel}` : ''}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Open-for-Collab toggle — now on the saved card, wired to the API */}
          <CollabToggle checked={!!project.open_for_collab} onChange={v => onPatch({ open_for_collab: v })} label="Open for Collab" />
          <HideToggle checked={!!project.is_hidden} onChange={v => onPatch({ is_hidden: v })} label="Hide" />
          <button onClick={() => setEditing(e => !e)} style={{ padding: '5px 12px', fontSize: 11, background: '#fff', border: '1px solid #E4E0DB', borderRadius: 5, cursor: 'pointer', color: '#555' }}>
            {editing ? 'Done' : 'Edit'}
          </button>
          <button aria-label="Delete project" onClick={onDelete}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C0392B', padding: '4px 6px', lineHeight: 1, display: 'inline-flex', alignItems: 'center' }}>
            <TrashIcon size={13} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {project.is_hidden && !editing ? (
          <div style={{ fontSize: 12, color: '#888', fontStyle: 'italic' }}>
            This project is hidden from your public profile. You can share it directly with specific buyers.
          </div>
        ) : (
          <>
            {/* Photos */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {photos.map(p => (
                <div key={p.id} style={{ width: 64, height: 64, borderRadius: 4, overflow: 'hidden', position: 'relative', border: '1px solid #E4E0DB', flexShrink: 0 }}>
                  {p.mime_type?.startsWith('video/') ? (
                    <div style={{ width: '100%', height: '100%', background: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18 }}>▶</div>
                  ) : (
                    <img src={mediaUrl(p.file)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />
                  )}
                  <button onClick={() => onDeletePhoto(p.id)} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', borderRadius: 3, width: 16, height: 16, fontSize: 11, cursor: 'pointer', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>×</button>
                </div>
              ))}
              <label style={{ width: 64, height: 64, borderRadius: 4, background: '#F0EDE8', border: '1px dashed #C8C4BF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 18, color: '#CCC', flexShrink: 0 }}>
                +
                <input type="file" accept="image/*,video/mp4,video/quicktime,video/x-msvideo" multiple style={{ display: 'none' }} onChange={onUploadPhoto} />
              </label>
            </div>

            {!editing && (
              <div style={{ display: 'grid', gap: 6 }}>
                {project.fabrics_used && <div style={{ display: 'flex', gap: 8, fontSize: 12 }}><span style={{ color: '#999', minWidth: 80 }}>Fabrics</span><span>{project.fabrics_used}</span></div>}
                {project.techniques_used && <div style={{ display: 'flex', gap: 8, fontSize: 12 }}><span style={{ color: '#999', minWidth: 80 }}>Techniques</span><span>{project.techniques_used}</span></div>}
                {project.about && <div style={{ display: 'flex', gap: 8, fontSize: 12 }}><span style={{ color: '#999', minWidth: 80 }}>About</span><span style={{ color: '#555', lineHeight: 1.5 }}>{project.about}</span></div>}
                {!project.fabrics_used && !project.techniques_used && !project.about && (
                  <p style={{ fontSize: 12, color: '#AAA', fontStyle: 'italic', margin: 0 }}>No details added yet — click Edit to fill in.</p>
                )}
              </div>
            )}
          </>
        )}

        {/* Edit form */}
        {editing && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 4 }}>
            <div><FieldLabel>Project / Collection Name *</FieldLabel><input style={inputStyle} value={project.name} onChange={e => onPatch({ name: e.target.value })} placeholder="e.g. Earth Tones Capsule" /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><FieldLabel>Month &amp; Year</FieldLabel><input style={inputStyle} type="month" value={project.month_year || ''} onChange={e => onPatch({ month_year: e.target.value })} /></div>
            </div>
            <div><FieldLabel>Client</FieldLabel><ClientTypeRadio value={project.client_type} onChange={v => onPatch({ client_type: v })} /></div>
            {project.client_type === 'named' && (
              <div><FieldLabel>Brand / Buyer Name</FieldLabel><input style={inputStyle} value={project.client_name || ''} onChange={e => onPatch({ client_name: e.target.value })} placeholder="e.g. Doodlage" /></div>
            )}
            {project.client_type === 'anon' && (
              <div style={{ fontSize: 12, color: '#888', padding: '8px 12px', background: '#F5F3EF', borderRadius: 5 }}>Client name will not appear on your profile. The project will be listed as a collaboration without naming the brand.</div>
            )}
            <div><FieldLabel>Fabrics Used</FieldLabel><input style={inputStyle} value={project.fabrics_used || ''} onChange={e => onPatch({ fabrics_used: e.target.value })} placeholder="e.g. Linen blend, organic cotton" /></div>
            <div><FieldLabel>Techniques Used</FieldLabel><input style={inputStyle} value={project.techniques_used || ''} onChange={e => onPatch({ techniques_used: e.target.value })} placeholder="e.g. Natural dye, appliqué, crochet detailing" /></div>
            <div><FieldLabel>About This Project</FieldLabel><textarea style={textareaStyle} rows={3} value={project.about || ''} onChange={e => onPatch({ about: e.target.value })} placeholder="What was the brief? What did you create? What made it notable?" /></div>
          </div>
        )}
      </div>
    </div>
  );
}

/* Add-new-project form — dashed terracotta card. */
function AddProjectForm({ onSave, onCancel }) {
  const [form, setForm] = useState({
    name: '', month_year: '', client_type: 'own', client_name: '',
    fabrics_used: '', techniques_used: '', about: '',
    open_for_collab: false, is_hidden: false,
  });
  const [photoFiles, setPhotoFiles] = useState([]);
  const [saving, setSaving] = useState(false);

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const handlePhotoSelect = e => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    setPhotoFiles(prev => [...prev, ...files.map(f => ({ file: f, preview: URL.createObjectURL(f) }))]);
  };
  const removeLocalPhoto = i => setPhotoFiles(prev => { URL.revokeObjectURL(prev[i].preview); return prev.filter((_, j) => j !== i); });

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try { await onSave(form, photoFiles.map(p => p.file)); } finally { setSaving(false); }
  };

  return (
    <div style={{ border: '1px dashed #D97520', borderRadius: 10, marginBottom: 14, background: '#fff', overflow: 'hidden' }}>
      <div style={{ padding: '16px 18px', borderBottom: '1px solid #F0EDE8' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 500, fontStyle: 'italic', color: '#1A1A1A' }}>Add New Project</div>
      </div>
      <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><FieldLabel>Project / Collection Name *</FieldLabel><input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Earth Tones Capsule" /></div>
          <div><FieldLabel>Month &amp; Year</FieldLabel><input style={inputStyle} type="month" value={form.month_year} onChange={e => set('month_year', e.target.value)} /></div>
        </div>

        <div><FieldLabel>Client</FieldLabel><ClientTypeRadio value={form.client_type} onChange={v => set('client_type', v)} /></div>
        {form.client_type === 'named' && (
          <div><FieldLabel>Brand / Buyer Name</FieldLabel><input style={inputStyle} value={form.client_name} onChange={e => set('client_name', e.target.value)} placeholder="e.g. Doodlage" /></div>
        )}
        {form.client_type === 'anon' && (
          <div style={{ fontSize: 12, color: '#888', padding: '8px 12px', background: '#F5F3EF', borderRadius: 5, lineHeight: 1.6 }}>Client name will not appear on your profile. The project will be listed as a collaboration without naming the brand.</div>
        )}

        <div><FieldLabel>Fabrics Used</FieldLabel><input style={inputStyle} value={form.fabrics_used} onChange={e => set('fabrics_used', e.target.value)} placeholder="e.g. Linen blend, organic cotton" /></div>
        <div><FieldLabel>Techniques Used</FieldLabel><input style={inputStyle} value={form.techniques_used} onChange={e => set('techniques_used', e.target.value)} placeholder="e.g. Natural dye, appliqué, crochet detailing" /></div>
        <div><FieldLabel>About This Project</FieldLabel><textarea style={textareaStyle} rows={3} value={form.about} onChange={e => set('about', e.target.value)} placeholder="What was the brief? What did you create? What made it notable?" /></div>

        <div>
          <FieldLabel>Photos &amp; Videos</FieldLabel>
          {photoFiles.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              {photoFiles.map((p, i) => (
                <div key={i} style={{ width: 64, height: 64, borderRadius: 4, overflow: 'hidden', position: 'relative', border: '1px solid #E4E0DB', flexShrink: 0 }}>
                  {p.file.type?.startsWith('video/') ? (
                    <div style={{ width: '100%', height: '100%', background: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18 }}>▶</div>
                  ) : (
                    <img src={p.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  )}
                  <button onClick={() => removeLocalPhoto(i)} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', borderRadius: 3, width: 16, height: 16, fontSize: 11, cursor: 'pointer', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>×</button>
                </div>
              ))}
            </div>
          )}
          <label style={{ display: 'block', border: '1px dashed #C8C4BF', borderRadius: 6, padding: 20, textAlign: 'center', cursor: 'pointer', background: '#FAFAF8' }}>
            <div style={{ fontSize: 20, color: '#CCC', marginBottom: 4 }}>🎬</div>
            <div style={{ fontSize: 13, color: '#888' }}>Upload photos &amp; videos</div>
            <div style={{ fontSize: 11, color: '#BBBBBB', marginTop: 2 }}>Images: JPG · PNG · WEBP up to 10 MB · Videos: MP4 · MOV · AVI up to 100 MB</div>
            <input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/x-msvideo" multiple style={{ display: 'none' }} onChange={handlePhotoSelect} />
          </label>
        </div>

        {/* Open for Collaboration — green callout */}
        <div style={{ background: '#F2F6F0', border: '1px solid #C8D9C4', borderRadius: 8, padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ marginTop: 2, flexShrink: 0 }}><CollabToggle checked={form.open_for_collab} onChange={v => set('open_for_collab', v)} /></div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#3A6B3A', marginBottom: 4 }}>Open for Collaboration</div>
            <div style={{ fontSize: 11, color: '#666', lineHeight: 1.5 }}>Buyers can select products from your catalogue and request their own version — adapted to their fabrics, colours, or silhouettes. Turning this on adds it to your Catalogue Collaboration offering.</div>
          </div>
        </div>

        {/* Hide toggle */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ marginTop: 2, flexShrink: 0 }}><HideToggle checked={form.is_hidden} onChange={v => set('is_hidden', v)} /></div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#555' }}>Hide this project from public profile</div>
            <div style={{ fontSize: 11, color: '#888', marginTop: 3, lineHeight: 1.5 }}>Hidden projects won't appear on your public profile. You can share them directly with specific buyers you choose.</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
          <button onClick={handleSave} disabled={!form.name.trim() || saving} className="btn btn-primary">{saving ? 'Saving…' : 'Save Project'}</button>
          <button onClick={onCancel} className="btn btn-ghost">Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function SectionG({ profileId, initialData, onSave, onNext }) {
  const { toasts, success, error } = useToast();
  const [projects, setProjects] = useState([]);
  const [adding, setAdding]     = useState(false);
  const [saving, setSaving]     = useState(false);

  useEffect(() => { if (initialData) setProjects(initialData || []); }, [initialData]);

  useEffect(() => {
    if (!profileId || initialData) return;
    API.getProjects(profileId).then(r => setProjects(r.data || [])).catch(() => {});
  }, [profileId]);

  const patchProject = async (idx, patch) => {
    setProjects(prev => prev.map((p, i) => i === idx ? { ...p, ...patch } : p));
    const project = projects[idx];
    if (project?.id) { try { await API.patchProject(profileId, project.id, patch); } catch {} }
  };

  const deleteProject = async idx => {
    const project = projects[idx];
    if (project.id) { try { await API.delProject(profileId, project.id); } catch {} }
    setProjects(prev => prev.filter((_, i) => i !== idx));
  };

  const uploadPhoto = async (idx, e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    e.target.value = '';
    const project = projects[idx];
    if (!project.id) { error('Save the project first before adding photos'); return; }
    for (const file of files) {
      try {
        const fd = new FormData(); fd.append('file', file);
        const r = await API.uploadProjectPhoto(profileId, project.id, fd);
        setProjects(prev => prev.map((p, i) => i === idx ? { ...p, photos: [...(p.photos || []), r.data] } : p));
      } catch { error('Photo upload failed'); }
    }
  };

  const deletePhoto = async (idx, photoId) => {
    const project = projects[idx];
    try {
      await API.delProjectPhoto(profileId, project.id, photoId);
      setProjects(prev => prev.map((p, i) => i === idx ? { ...p, photos: p.photos.filter(ph => ph.id !== photoId) } : p));
    } catch { error('Failed to remove photo'); }
  };

  const handleAddSave = async (form, photoFiles) => {
    if (!form.name?.trim()) { error('Project name is required'); return; }
    try {
      const r = await API.addProject(profileId, form);
      const saved = r.data;
      const uploaded = [];
      for (const file of photoFiles) {
        try { const fd = new FormData(); fd.append('file', file); const pr = await API.uploadProjectPhoto(profileId, saved.id, fd); uploaded.push(pr.data); } catch {}
      }
      setProjects(prev => [...prev, { ...saved, photos: uploaded }]);
      setAdding(false); success('Project saved');
    } catch { error('Failed to save project'); }
  };

  const finish = async (andNext = false) => {
    setSaving(true);
    try { success('Section G saved!'); onSave?.(); if (andNext) onNext?.(); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ padding: '40px 48px 80px', maxWidth: 760 }}>
      <Toast toasts={toasts} />
      <SectionHeader letter="G" title="Past Projects"
        desc="Walk buyers through your work — collections, collaborations, and any past work you're proud of. Add photos and short videos; this is what serious buyers read carefully." />

      {projects.map((project, idx) => (
        <ProjectCard
          key={project.id || idx}
          project={project}
          onPatch={patch => patchProject(idx, patch)}
          onDelete={() => deleteProject(idx)}
          onUploadPhoto={e => uploadPhoto(idx, e)}
          onDeletePhoto={photoId => deletePhoto(idx, photoId)}
        />
      ))}

      {adding ? (
        <AddProjectForm onSave={handleAddSave} onCancel={() => setAdding(false)} />
      ) : (
        <button onClick={() => setAdding(true)}
          style={{ width: '100%', padding: 14, marginBottom: 20, border: '1px dashed #D97520', borderRadius: 10, background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#D97520', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          + Add New Project
        </button>
      )}

      <SectionFooter onNext={() => finish(true)} onSave={() => finish(false)} saving={saving} />
    </div>
  );
}
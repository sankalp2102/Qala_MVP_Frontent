import { useState, useEffect } from 'react';
import { onboardingAPI } from '../../api/client';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../../components/Toast';
import { TrashIcon, inputStyle, textareaStyle } from './SectionA';
import { mediaUrl } from '../../utils/mediaUrl';

const API = onboardingAPI;

/* ── Section header ── */
function SectionHeader({ letter, title, desc }) {
  return (
    <div className="fade-up" style={{ marginBottom: 36 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Section {letter}</div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 500, fontStyle: 'italic', color: 'var(--gold)', lineHeight: 1.1 }}>{title}</h1>
      <p style={{ color: 'var(--text3)', fontSize: 14, marginTop: 8 }}>{desc}</p>
    </div>
  );
}

/* ── Open for Collab toggle (sage green, 32×18) — label-free in card header ── */
function CollabToggle({ checked, onChange }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      title={checked ? 'Open for Collab — click to disable' : 'Click to mark as Open for Collab'}
      style={{
        position: 'relative', width: 32, height: 18, borderRadius: 9, flexShrink: 0,
        background: checked ? '#7A8C6E' : '#CCC', transition: 'background .2s', cursor: 'pointer',
      }}>
      <div style={{
        position: 'absolute', top: 2, width: 14, height: 14, borderRadius: '50%',
        background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
        left: checked ? 16 : 2, transition: 'left .2s',
      }} />
    </div>
  );
}

/* ── Visibility (Hide) toggle (gold, 36×20) ── */
function HideToggle({ checked, onChange, label }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
      <div
        onClick={() => onChange(!checked)}
        style={{
          position: 'relative', width: 36, height: 20, borderRadius: 10, flexShrink: 0,
          background: checked ? 'var(--gold)' : '#D8D4CF', transition: 'background .2s',
        }}>
        <div style={{
          position: 'absolute', top: 3, width: 14, height: 14, borderRadius: '50%',
          background: '#fff',
          left: checked ? 19 : 3, transition: 'left .2s',
        }} />
      </div>
      {label && <span style={{ fontSize: 11, color: 'var(--text3)' }}>{label}</span>}
    </label>
  );
}

/* ── Client type radio cards (3 options) ── */
function ClientTypeRadio({ value, onChange }) {
  const opts = [
    { value: 'own',   label: 'Own brand' },
    { value: 'named', label: 'Brand / Buyer' },
    { value: 'anon',  label: 'Prefer not to name' },
  ];
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {opts.map(o => (
        <label key={o.value}
          onClick={() => onChange(o.value)}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 12px', border: `1px solid ${value === o.value ? '#1A1A1A' : '#E4E0DB'}`,
            borderRadius: 5, cursor: 'pointer',
            background: value === o.value ? '#F5F3EF' : '#fff',
            transition: 'all .1s',
          }}>
          <input type="radio" name="client_type_g" value={o.value} checked={value === o.value}
            onChange={() => onChange(o.value)} style={{ accentColor: '#1A1A1A', flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{o.label}</span>
        </label>
      ))}
    </div>
  );
}

/* ── Inline field label ── */
function FieldLabel({ children }) {
  return <div style={{ fontSize: 10, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{children}</div>;
}

/* ── Saved project card ── */
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
      boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
      opacity: project.is_hidden ? 0.65 : 1, overflow: 'hidden',
    }}>
      {/* ── Card header ── */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #F0EDE8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <strong style={{ fontSize: 14, color: 'var(--text)' }}>{project.name || 'Untitled project'}</strong>
            {project.is_hidden && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#888', background: '#F5F3EF', border: '1px solid #E4E0DB', padding: '2px 8px', borderRadius: 10 }}>
                Hidden
              </span>
            )}
          </div>
          <span style={{ fontSize: 12, color: '#888' }}>
            {clientLabel}{monthLabel ? ` · ${monthLabel}` : ''}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <HideToggle checked={!!project.is_hidden} onChange={v => onPatch({ is_hidden: v })} label="Hide" />
          </div>
          <button
            onClick={() => setEditing(e => !e)}
            style={{ padding: '5px 12px', fontSize: 11, background: '#fff', border: '1px solid #E4E0DB', borderRadius: 5, cursor: 'pointer', color: 'var(--text2)' }}>
            {editing ? 'Done' : 'Edit'}
          </button>
          <button
            aria-label="Delete project"
            onClick={onDelete}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#CCC', padding: '4px 6px', lineHeight: 1, display: 'inline-flex', alignItems: 'center' }}
            onMouseEnter={e => e.currentTarget.style.color = '#C0392B'}
            onMouseLeave={e => e.currentTarget.style.color = '#CCC'}>
            <TrashIcon size={13} />
          </button>
        </div>
      </div>

      {/* ── Card body ── */}
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Photos row — always shown */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {photos.map(p => (
            <div key={p.id} style={{ width: 64, height: 64, borderRadius: 4, overflow: 'hidden', position: 'relative', border: '1px solid #E4E0DB', flexShrink: 0 }}>
              {p.mime_type?.startsWith('video/') ? (
                <div style={{ width: '100%', height: '100%', background: '#1A1A1A', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                  <span style={{ fontSize: 20 }}>▶</span>
                  <span style={{ fontSize: 9, color: '#aaa' }}>video</span>
                </div>
              ) : (
                <img src={mediaUrl(p.file)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />
              )}
              <button onClick={() => onDeletePhoto(p.id)} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', borderRadius: 3, width: 16, height: 16, fontSize: 11, cursor: 'pointer', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>×</button>
            </div>
          ))}
          {/* + slot to add more photos */}
          <label style={{ width: 64, height: 64, borderRadius: 4, background: '#F0EDE8', border: '1px dashed #C8C4BF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 18, color: '#CCC', flexShrink: 0 }}>
            +
            <input type="file" accept="image/*,video/mp4,video/quicktime,video/x-msvideo" multiple style={{ display: 'none' }} onChange={onUploadPhoto} />
          </label>
        </div>

        {/* Info rows — always visible */}
        {!editing && (
          <div style={{ display: 'grid', gap: 6 }}>
            {project.fabrics_used && (
              <div style={{ display: 'flex', gap: 8, fontSize: 12 }}>
                <span style={{ color: '#999', minWidth: 80 }}>Fabrics</span>
                <span>{project.fabrics_used}</span>
              </div>
            )}
            {project.techniques_used && (
              <div style={{ display: 'flex', gap: 8, fontSize: 12 }}>
                <span style={{ color: '#999', minWidth: 80 }}>Techniques</span>
                <span>{project.techniques_used}</span>
              </div>
            )}
            {project.about && (
              <div style={{ display: 'flex', gap: 8, fontSize: 12 }}>
                <span style={{ color: '#999', minWidth: 80 }}>About</span>
                <span style={{ color: '#555', lineHeight: 1.5 }}>{project.about}</span>
              </div>
            )}
            {!project.fabrics_used && !project.techniques_used && !project.about && (
              <p style={{ fontSize: 12, color: '#AAA', fontStyle: 'italic', margin: 0 }}>No details added yet — click Edit to fill in.</p>
            )}
          </div>
        )}

        {/* Edit form — shown when editing */}
        {editing && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 4 }}>
            <div>
              <FieldLabel>Project / Collection Name *</FieldLabel>
              <input style={inputStyle} value={project.name} onChange={e => onPatch({ name: e.target.value })} placeholder="e.g. Earth Tones Capsule" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <FieldLabel>Month & Year</FieldLabel>
                <input style={inputStyle} type="month" value={project.month_year || ''} onChange={e => onPatch({ month_year: e.target.value })} />
              </div>
              <div>
                <FieldLabel>Client</FieldLabel>
                <select
                  value={project.client_type}
                  onChange={e => onPatch({ client_type: e.target.value })}
                  style={{ ...inputStyle }}>
                  <option value="own">Own brand</option>
                  <option value="named">Brand / Buyer</option>
                  <option value="anon">Prefer not to name</option>
                </select>
              </div>
            </div>
            {project.client_type === 'named' && (
              <div>
                <FieldLabel>Brand / Buyer Name</FieldLabel>
                <input style={inputStyle} value={project.client_name || ''} onChange={e => onPatch({ client_name: e.target.value })} placeholder="e.g. Doodlage" />
              </div>
            )}
            {project.client_type === 'anon' && (
              <div style={{ fontSize: 12, color: '#888', padding: '8px 12px', background: '#F5F3EF', borderRadius: 5 }}>
                Client name will not appear on your profile. The project will be listed as a collaboration without naming the brand.
              </div>
            )}
            <div>
              <FieldLabel>Fabrics Used</FieldLabel>
              <input style={inputStyle} value={project.fabrics_used || ''} onChange={e => onPatch({ fabrics_used: e.target.value })} placeholder="e.g. Linen blend, organic cotton" />
            </div>
            <div>
              <FieldLabel>Techniques Used</FieldLabel>
              <input style={inputStyle} value={project.techniques_used || ''} onChange={e => onPatch({ techniques_used: e.target.value })} placeholder="e.g. Natural dye, appliqué, crochet detailing" />
            </div>
            <div>
              <FieldLabel>About This Project</FieldLabel>
              <textarea style={textareaStyle} rows={3} value={project.about || ''} onChange={e => onPatch({ about: e.target.value })} placeholder="What was the brief? What did you create? What made it notable?" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Add new project form (dashed orange border card) ── */
function AddProjectForm({ onSave, onCancel }) {
  const [form, setForm] = useState({
    name: '', month_year: '', client_type: 'own', client_name: '',
    fabrics_used: '', techniques_used: '', about: '',
    open_for_collab: false, is_hidden: false,
  });
  const [photos, setPhotos]   = useState([]);
  const [saving, setSaving]   = useState(false);
  const [photoFiles, setPhotoFiles] = useState([]);

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const handlePhotoSelect = e => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    const previews = files.map(f => ({ file: f, preview: URL.createObjectURL(f) }));
    setPhotoFiles(prev => [...prev, ...previews]);
  };

  const removeLocalPhoto = i => {
    setPhotoFiles(prev => {
      URL.revokeObjectURL(prev[i].preview);
      return prev.filter((_, j) => j !== i);
    });
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await onSave(form, photoFiles.map(p => p.file));
    } finally { setSaving(false); }
  };

  return (
    <div style={{
      border: '1px dashed #D97520', borderRadius: 10, marginBottom: 14,
      background: '#fff', overflow: 'hidden',
    }}>
      <div style={{ padding: '16px 18px', borderBottom: '1px solid #F0EDE8' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 500, fontStyle: 'italic', color: 'var(--text)' }}>Add New Project</div>
      </div>
      <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <FieldLabel>Project / Collection Name *</FieldLabel>
            <input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Earth Tones Capsule" />
          </div>
          <div>
            <FieldLabel>Month & Year</FieldLabel>
            <input style={inputStyle} type="month" value={form.month_year} onChange={e => set('month_year', e.target.value)} />
          </div>
        </div>

        {/* Client — radio cards matching HTML spec */}
        <div>
          <FieldLabel>Client</FieldLabel>
          <ClientTypeRadio value={form.client_type} onChange={v => set('client_type', v)} />
        </div>

        {/* Brand name — shows when named */}
        {form.client_type === 'named' && (
          <div>
            <FieldLabel>Brand / Buyer Name</FieldLabel>
            <input style={inputStyle} value={form.client_name} onChange={e => set('client_name', e.target.value)} placeholder="e.g. Doodlage" />
          </div>
        )}

        {/* Anon note — shows when prefer not to name */}
        {form.client_type === 'anon' && (
          <div style={{ fontSize: 12, color: '#888', padding: '8px 12px', background: '#F5F3EF', borderRadius: 5, lineHeight: 1.6 }}>
            Client name will not appear on your profile. The project will be listed as a collaboration without naming the brand.
          </div>
        )}

        <div>
          <FieldLabel>Fabrics Used</FieldLabel>
          <input style={inputStyle} value={form.fabrics_used} onChange={e => set('fabrics_used', e.target.value)} placeholder="e.g. Linen blend, organic cotton" />
        </div>
        <div>
          <FieldLabel>Techniques Used</FieldLabel>
          <input style={inputStyle} value={form.techniques_used} onChange={e => set('techniques_used', e.target.value)} placeholder="e.g. Natural dye, appliqué, crochet detailing" />
        </div>
        <div>
          <FieldLabel>About This Project</FieldLabel>
          <textarea style={textareaStyle} rows={3} value={form.about} onChange={e => set('about', e.target.value)} placeholder="What was the brief? What did you create? What made it notable?" />
        </div>

        {/* Photos */}
        <div>
          <FieldLabel>Photos &amp; Videos</FieldLabel>
          {photoFiles.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              {photoFiles.map((p, i) => (
                <div key={i} style={{ width: 64, height: 64, borderRadius: 4, overflow: 'hidden', position: 'relative', border: '1px solid #E4E0DB', flexShrink: 0 }}>
                  {p.file.type?.startsWith('video/') ? (
                    <div style={{ width: '100%', height: '100%', background: '#1A1A1A', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                      <span style={{ fontSize: 20 }}>▶</span>
                      <span style={{ fontSize: 9, color: '#aaa' }}>video</span>
                    </div>
                  ) : (
                    <img src={p.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  )}
                  <button onClick={() => removeLocalPhoto(i)} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', borderRadius: 3, width: 16, height: 16, fontSize: 11, cursor: 'pointer', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>×</button>
                </div>
              ))}
            </div>
          )}
          <label style={{
            display: 'block', border: '1px dashed #C8C4BF', borderRadius: 6, padding: 20,
            textAlign: 'center', cursor: 'pointer', background: '#FAFAF8',
          }}>
            <div style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 500, marginBottom: 4 }}>Upload photos &amp; videos</div>
            <div style={{ fontSize: 11, color: '#AAA' }}>JPG · PNG · WEBP up to 10 MB · MP4 · MOV up to 100 MB</div>
            <input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/x-msvideo" multiple style={{ display: 'none' }} onChange={handlePhotoSelect} />
          </label>
        </div>

        {/* Open for Collaboration — green card matching HTML spec */}
        <div style={{ background: '#F2F6F0', border: '1px solid #C8D9C4', borderRadius: 8, padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ marginTop: 2, flexShrink: 0 }}>
            <CollabToggle checked={form.open_for_collab} onChange={v => set('open_for_collab', v)} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#3A6B3A', marginBottom: 4 }}>Open for Collaboration</div>
            <div style={{ fontSize: 11, color: '#666', lineHeight: 1.6 }}>
              Buyers can select this design from your catalogue and request their own version — adapted to their fabrics, colours, or quantities. Turning this on adds it to your Catalogue Collaboration offering.
            </div>
          </div>
        </div>

        {/* Hide toggle — with label and hint matching spec */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ marginTop: 2, flexShrink: 0 }}>
            <HideToggle checked={form.is_hidden} onChange={v => set('is_hidden', v)} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text2)' }}>Hide this project from public profile</div>
            <div style={{ fontSize: 11, color: '#888', marginTop: 3, lineHeight: 1.5 }}>
              Hidden projects won't appear on your public profile. You can share them directly with specific buyers you choose.
            </div>
          </div>
        </div>

        {/* Form footer */}
        <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
          <button
            onClick={handleSave}
            disabled={!form.name.trim() || saving}
            className="btn btn-primary">
            {saving ? 'Saving…' : 'Save Project'}
          </button>
          <button onClick={onCancel} className="btn btn-ghost">Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ── Main section ── */
export default function SectionG({ profileId, initialData, onSave, onNext }) {
  const { toasts, success, error } = useToast();
  const [projects, setProjects]     = useState([]);
  const [adding, setAdding]         = useState(false);
  const [saving, setSaving]         = useState(false);

  useEffect(() => { if (initialData) setProjects(initialData || []); }, [initialData]);

  useEffect(() => {
    if (!profileId || initialData) return;
    API.getProjects(profileId).then(r => setProjects(r.data || [])).catch(() => {});
  }, [profileId]);

  /* Patch a saved project immediately */
  const patchProject = async (idx, patch) => {
    setProjects(prev => prev.map((p, i) => i === idx ? { ...p, ...patch } : p));
    const project = projects[idx];
    if (project?.id) {
      try { await API.patchProject(profileId, project.id, patch); } catch {}
    }
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
        const fd = new FormData();
        fd.append('file', file);
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

  /* Save new project from AddProjectForm, then upload any selected photos */
  const handleAddSave = async (form, photoFiles) => {
    if (!form.name?.trim()) { error('Project name is required'); return; }
    try {
      const r = await API.addProject(profileId, form);
      const saved = r.data;

      /* Upload photos if any were selected in the add form */
      const uploadedPhotos = [];
      for (const file of photoFiles) {
        try {
          const fd = new FormData(); fd.append('file', file);
          const pr = await API.uploadProjectPhoto(profileId, saved.id, fd);
          uploadedPhotos.push(pr.data);
        } catch {}
      }

      setProjects(prev => [...prev, { ...saved, photos: uploadedPhotos }]);
      setAdding(false);
      success('Project saved');
    } catch { error('Failed to save project'); }
  };

  const finish = async (andNext = false) => {
    setSaving(true);
    try {
      success('Section G saved!');
      onSave?.();
      if (andNext) onNext?.();
    } finally { setSaving(false); }
  };

  return (
    <div style={{ padding: '40px 48px', maxWidth: 760 }}>
      <Toast toasts={toasts} />
      <SectionHeader
        letter="G"
        title="Past Projects"
        desc="Walk buyers through your work — collections, collaborations, and anything you are proud of. This is what serious buyers read carefully." />

      {/* Saved project cards */}
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

      {/* Add new project form */}
      {adding ? (
        <AddProjectForm
          onSave={handleAddSave}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <button
          onClick={() => setAdding(true)}
          style={{
            width: '100%', padding: '14px', marginBottom: 20,
            border: '1px dashed #D97520', borderRadius: 10,
            background: 'transparent', cursor: 'pointer',
            fontSize: 13, fontWeight: 500, color: '#D97520',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
          + Add New Project
        </button>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button className="btn btn-primary btn-lg fade-up" onClick={() => finish(true)} disabled={saving}>
          {saving ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Saving…</> : 'Save & Next'}
        </button>
        <button className="btn btn-ghost fade-up" onClick={() => finish(false)} disabled={saving}>Save</button>
      </div>
    </div>
  );
}
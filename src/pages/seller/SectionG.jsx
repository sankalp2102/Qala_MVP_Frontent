import { useState, useEffect } from 'react';
import { onboardingAPI } from '../../api/client';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../../components/Toast';
import { TrashIcon } from './SectionA';

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

function ToggleSwitch({ checked, onChange, onColor = 'var(--gold)', label }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
      <div onClick={() => onChange(!checked)} style={{
        width: 36, height: 20, borderRadius: 10, position: 'relative', flexShrink: 0,
        background: checked ? onColor : '#D8D4CF', transition: 'background .15s',
      }}>
        <div style={{
          width: 14, height: 14, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3,
          left: checked ? 19 : 3, transition: 'left .15s',
        }} />
      </div>
      {label && <span style={{ fontSize: 11, fontWeight: 600, color: checked ? onColor : 'var(--text4)' }}>{label}</span>}
    </label>
  );
}

function ProjectCard({ project, onPatch, onDelete, onUploadPhoto, onDeletePhoto }) {
  const [editing, setEditing] = useState(false);

  return (
    <div style={{
      border: '1px solid var(--border2)', borderRadius: 10, background: '#fff', marginBottom: 16,
      opacity: project.is_hidden ? 0.65 : 1, boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '14px 18px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>
            {project.name || 'Untitled project'}
            {project.is_hidden && <span style={{ marginLeft: 8, fontSize: 10, color: 'var(--text4)', background: 'var(--surface2)', padding: '2px 6px', borderRadius: 4 }}>Hidden</span>}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
            {project.client_type === 'named' ? project.client_name : project.client_type === 'anon' ? 'Client undisclosed' : 'Own brand'}
            {project.month_year && ` · ${project.month_year}`}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <ToggleSwitch checked={project.open_for_collab} onChange={v => onPatch({ open_for_collab: v })} onColor="#7A8C6E" label="Open for Collab" />
          <ToggleSwitch checked={project.is_hidden} onChange={v => onPatch({ is_hidden: v })} />
          <button className="btn btn-ghost btn-sm" onClick={() => setEditing(e => !e)}>{editing ? 'Done' : 'Edit'}</button>
          <button aria-label="Delete project" onClick={onDelete}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text4)', padding: 4, display: 'flex', alignItems: 'center', borderRadius: 4 }}>
            <TrashIcon size={16} />
          </button>
        </div>
      </div>

      <div style={{ padding: '14px 18px' }}>
        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="field"><label>Project / Collection Name *</label>
              <input value={project.name} onChange={e => onPatch({ name: e.target.value })} placeholder="e.g. Earth Tones Capsule" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field"><label>Month & Year</label>
                <input type="month" value={project.month_year || ''} onChange={e => onPatch({ month_year: e.target.value })} />
              </div>
              <div className="field"><label>Client</label>
                <select value={project.client_type} onChange={e => onPatch({ client_type: e.target.value })}>
                  <option value="own">Own brand</option>
                  <option value="named">Brand / Buyer</option>
                  <option value="anon">Prefer not to name</option>
                </select>
              </div>
            </div>
            {project.client_type === 'named' && (
              <div className="field"><label>Brand Name</label>
                <input value={project.client_name || ''} onChange={e => onPatch({ client_name: e.target.value })} />
              </div>
            )}
            {project.client_type === 'anon' && (
              <p style={{ fontSize: 11, color: 'var(--text4)', fontStyle: 'italic' }}>Client will not appear on your public profile.</p>
            )}
            <div className="field"><label>Fabrics Used</label>
              <input value={project.fabrics_used || ''} onChange={e => onPatch({ fabrics_used: e.target.value })} placeholder="e.g. Linen blend, organic cotton" />
            </div>
            <div className="field"><label>Techniques Used</label>
              <input value={project.techniques_used || ''} onChange={e => onPatch({ techniques_used: e.target.value })} placeholder="e.g. Natural dye, applique, crochet detailing" />
            </div>
            <div className="field"><label>About This Project</label>
              <textarea rows={3} value={project.about || ''} onChange={e => onPatch({ about: e.target.value })}
                placeholder="What was the brief? What did you create? What made it notable?"
                style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--border2)', borderRadius: 'var(--radius)', background: 'var(--surface2)', resize: 'vertical', fontFamily: 'var(--font-body)' }} />
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {project.fabrics_used && <div style={{ fontSize: 13 }}><span style={{ color: 'var(--text4)', minWidth: 80, display: 'inline-block' }}>Fabrics</span> {project.fabrics_used}</div>}
            {project.techniques_used && <div style={{ fontSize: 13 }}><span style={{ color: 'var(--text4)', minWidth: 80, display: 'inline-block' }}>Techniques</span> {project.techniques_used}</div>}
            {project.about && <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}><span style={{ color: 'var(--text4)', minWidth: 80, display: 'inline-block' }}>About</span> {project.about}</div>}
          </div>
        )}

        {/* Photos */}
        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          {(project.photos || []).map(p => (
            <div key={p.id} style={{ width: 64, height: 64, borderRadius: 6, overflow: 'hidden', position: 'relative', border: '1px solid var(--border2)' }}>
              <img src={p.file} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button onClick={() => onDeletePhoto(p.id)} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: 4, width: 16, height: 16, fontSize: 10, cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
          ))}
          <label style={{ width: 64, height: 64, borderRadius: 6, border: '1px dashed var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text4)', fontSize: 20, flexShrink: 0 }}>
            +
            <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={onUploadPhoto} />
          </label>
        </div>
      </div>
    </div>
  );
}

function emptyDraft() {
  return {
    _local: true, _tempId: Date.now(),
    name: '', client_type: 'own', client_name: '', month_year: '',
    fabrics_used: '', techniques_used: '', about: '',
    open_for_collab: false, is_hidden: false, photos: [],
  };
}

export default function SectionG({ profileId, onSave, onNext }) {
  const { toasts, success, error } = useToast();
  const [projects, setProjects] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profileId) return;
    API.getProjects(profileId).then(r => setProjects(r.data || [])).catch(() => {});
  }, [profileId]);

  const addProject = () => setProjects(p => [...p, emptyDraft()]);

  const patchProject = async (idx, patch) => {
    setProjects(prev => prev.map((p, i) => i === idx ? { ...p, ...patch } : p));
    const project = projects[idx];
    if (project?.id) {
      try { await API.patchProject(profileId, project.id, patch); } catch {}
    }
  };

  const saveNewProject = async idx => {
    const project = projects[idx];
    if (!project.name?.trim()) { error('Project name is required'); return; }
    try {
      const { _local, _tempId, photos, ...payload } = project;
      const r = await API.addProject(profileId, payload);
      setProjects(prev => prev.map((p, i) => i === idx ? r.data : p));
      success('Project saved');
    } catch (e) {
      error('Failed to save project');
    }
  };

  const deleteProject = async idx => {
    const project = projects[idx];
    if (project.id) {
      try { await API.delProject(profileId, project.id); } catch {}
    }
    setProjects(prev => prev.filter((_, i) => i !== idx));
  };

  const uploadPhoto = async (idx, e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    e.target.value = '';
    const project = projects[idx];
    if (!project.id) { error('Save the project before adding photos'); return; }

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

  const finish = async (andNext = false) => {
    setSaving(true);
    try {
      for (let i = 0; i < projects.length; i++) {
        if (projects[i]._local && projects[i].name?.trim()) await saveNewProject(i);
      }
      success('Section G saved!');
      onSave?.();
      if (andNext) onNext?.();
    } finally { setSaving(false); }
  };

  return (
    <div style={{ padding: '40px 48px', maxWidth: 760 }}>
      <Toast toasts={toasts} />
      <SectionHeader letter="G" title="Past Projects" desc="Walk buyers through your work — collections, collaborations, and anything you are proud of. This is what serious buyers read carefully." />

      {projects.map((project, idx) => (
        <ProjectCard
          key={project.id || project._tempId}
          project={project}
          onPatch={patch => patchProject(idx, patch)}
          onDelete={() => deleteProject(idx)}
          onUploadPhoto={e => uploadPhoto(idx, e)}
          onDeletePhoto={photoId => deletePhoto(idx, photoId)}
        />
      ))}

      <div style={{ border: '1px dashed var(--gold)', borderRadius: 10, padding: '20px', textAlign: 'center', marginBottom: 20 }}>
        <button className="btn btn-outline" onClick={addProject}>+ Add New Project</button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button className="btn btn-primary btn-lg fade-up" onClick={() => finish(true)} disabled={saving}>
          {saving ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Saving…</> : 'Save & Next'}
        </button>
        <button className="btn btn-ghost fade-up" onClick={() => finish(false)} disabled={saving}>Save</button>
      </div>
    </div>
  );
}
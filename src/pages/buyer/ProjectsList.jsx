import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectsAPI } from '../../api/client';

const STAGE_LABELS = {
  draft:           'Draft',
  brief_submitted: 'Brief Submitted',
  studio_assigned: 'Studio Assigned',
  in_production:   'In Production',
  completed:       'Completed',
  cancelled:       'Cancelled',
};

const STAGE_COLORS = {
  draft:           { bg: 'var(--surface3)',   text: 'var(--text3)'  },
  brief_submitted: { bg: 'var(--amber-dim)',  text: 'var(--amber)'  },
  studio_assigned: { bg: 'var(--gold-dim)',   text: 'var(--gold)'   },
  in_production:   { bg: 'var(--teal-dim)',   text: 'var(--teal)'   },
  completed:       { bg: 'var(--green-dim)',  text: 'var(--green)'  },
  cancelled:       { bg: 'var(--red-dim)',    text: 'var(--red)'    },
};

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function StageBadge({ stage }) {
  const c = STAGE_COLORS[stage] || STAGE_COLORS.draft;
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
      padding: '3px 10px', borderRadius: 'var(--r-20)',
      background: c.bg, color: c.text,
      textTransform: 'uppercase', whiteSpace: 'nowrap',
    }}>
      {STAGE_LABELS[stage] || stage}
    </span>
  );
}

function ProjectCard({ project, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--r-lg)', padding: '20px 24px', cursor: 'pointer',
        transition: 'box-shadow 0.18s, border-color 0.18s',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
        e.currentTarget.style.borderColor = 'rgba(200,165,90,0.3)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.borderColor = 'var(--border)';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
            {project.name}
          </div>
          {project.studio_name && (
            <div style={{ fontSize: 13, color: 'var(--text3)' }}>
              Studio: <span style={{ color: 'var(--gold)' }}>{project.studio_name}</span>
            </div>
          )}
        </div>
        <StageBadge stage={project.stage} />
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        {project.proposal_count > 0 && (
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>
            {project.proposal_count} proposal{project.proposal_count !== 1 ? 's' : ''}
          </span>
        )}
        {project.order_count > 0 && (
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>
            {project.order_count} order{project.order_count !== 1 ? 's' : ''}
          </span>
        )}
        <span style={{ fontSize: 12, color: 'var(--text4)', marginLeft: 'auto' }}>
          {formatDate(project.updated_at)}
        </span>
      </div>
    </div>
  );
}

export default function ProjectsList() {
  const nav = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName,  setNewName]  = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    projectsAPI.listProjects()
      .then(r => setProjects(r.data.projects || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const r = await projectsAPI.createProject({ name: newName.trim() });
      nav(`/buyer/projects/${r.data.project.id}`);
    } catch {
      setCreating(false);
    }
  };

  if (loading) return (
    <div style={{ padding: 40, color: 'var(--text3)', fontSize: 14 }}>Loading projects…</div>
  );

  return (
    <div style={{ padding: 'clamp(20px, 3vw, 40px) clamp(16px, 4vw, 48px)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
            My <em style={{ color: 'var(--gold)' }}>Projects</em>
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text3)' }}>
            Track your briefs, proposals, and orders with studios.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn btn-primary"
          style={{ fontSize: 13, padding: '9px 20px' }}
        >
          + New Project
        </button>
      </div>

      {/* New project form */}
      {showForm && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)', padding: '20px 24px', marginBottom: 24,
          borderLeft: '3px solid var(--gold)',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>
            Name your project
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder="e.g. Resort Shirts SS26"
              style={{
                flex: 1, padding: '9px 14px', borderRadius: 'var(--r-8)',
                border: '1px solid var(--border)', background: 'var(--surface2)',
                fontSize: 14, color: 'var(--text)', fontFamily: 'var(--font-body)',
              }}
            />
            <button onClick={handleCreate} disabled={creating || !newName.trim()} className="btn btn-primary" style={{ fontSize: 13, padding: '9px 20px' }}>
              {creating ? 'Creating…' : 'Create'}
            </button>
            <button onClick={() => { setShowForm(false); setNewName(''); }} className="btn btn-ghost" style={{ fontSize: 13, padding: '9px 16px' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {projects.length === 0 ? (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)', padding: '48px 32px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📋</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text)', marginBottom: 8 }}>
            No projects yet
          </div>
          <p style={{ fontSize: 14, color: 'var(--text3)', marginBottom: 24 }}>
            Create a project to start working with a studio.
          </p>
          <button onClick={() => setShowForm(true)} className="btn btn-primary" style={{ fontSize: 14, padding: '10px 24px' }}>
            Create First Project →
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {projects.map(p => (
            <ProjectCard key={p.id} project={p} onClick={() => nav(`/buyer/projects/${p.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}
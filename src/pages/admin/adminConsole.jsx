// Shared look for the admin console pages (projects list, project detail,
// and any admin page that wants the same style later: orders, studios...).
//
// Scoped on purpose: styles are injected by <AdminConsoleStyles /> only while
// an admin page using it is mounted, and every class is prefixed `ac-`, so
// nothing here can leak into the seller or buyer dashboards.

// Stage -> label and pill colour (draft grey, brief submitted amber,
// assigned / in production green, completed neutral, cancelled red).
export const STAGES = [
  { key: 'draft',           label: 'Draft',           kind: 'draft'     },
  { key: 'brief_submitted', label: 'Brief Submitted', kind: 'pending'   },
  { key: 'studio_assigned', label: 'Studio Assigned', kind: 'active'    },
  { key: 'in_production',   label: 'In Production',   kind: 'active'    },
  { key: 'completed',       label: 'Completed',       kind: 'completed' },
  { key: 'cancelled',       label: 'Cancelled',       kind: 'cancelled' },
];
export const STAGE_BY_KEY = Object.fromEntries(STAGES.map(st => [st.key, st]));

export function fmtDate(iso) {
  return iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
}

export function initials(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export function StagePill({ stage }) {
  const st = STAGE_BY_KEY[stage];
  return <span className={`ac-badge ${st?.kind || 'draft'}`}>{st?.label || (stage || '').replace(/_/g, ' ')}</span>;
}

const CSS = `
/* ── top bar / page frame ── */
.ac-topbar {
  min-height: 56px; border-bottom: 1px solid var(--border);
  display: flex; align-items: center; gap: 12px; padding: 8px 28px;
  position: sticky; top: 0; z-index: 20; background: var(--bg); flex-wrap: wrap;
}
.ac-title { font-family: var(--font-display); font-size: 22px; font-weight: 600; flex: 1; color: var(--text); }
.ac-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-left: auto; }
.ac-breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text3); min-width: 0; }
.ac-breadcrumb a { color: var(--gold); cursor: pointer; text-decoration: none; }
.ac-breadcrumb a:hover { text-decoration: underline; }
.ac-breadcrumb .ac-crumb-sep { color: var(--text4); }
.ac-breadcrumb .ac-crumb-cur { color: var(--text); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ac-content { padding: 28px; }

/* ── buttons ── */
.ac-btn {
  display: inline-flex; align-items: center; gap: 8px; white-space: nowrap;
  padding: 8px 18px; border-radius: 6px; font-family: var(--font-body);
  font-size: 13px; font-weight: 500; cursor: pointer; border: 1px solid transparent;
  transition: all 0.15s; width: auto;
}
.ac-btn.primary { background: var(--gold); color: #fff; }
.ac-btn.primary:hover { background: var(--gold-d, var(--gold)); }
.ac-btn.outline { background: transparent; color: var(--text2); border-color: var(--border2, var(--border)); }
.ac-btn.outline:hover { background: var(--surface); }
.ac-btn.danger { background: var(--red-dim); color: var(--red); border-color: rgba(201,64,64,0.2); }
.ac-btn.sm { padding: 6px 14px; font-size: 12px; }
.ac-btn:disabled { opacity: 0.5; cursor: default; }
.ac-select {
  padding: 6px 10px; border-radius: 6px; border: 1px solid var(--border2, var(--border));
  background: var(--bg); font-size: 12px; font-family: var(--font-body); color: var(--text2);
}

/* ── list: chips, search, table ── */
.ac-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; }
.ac-chips { display: flex; gap: 8px; flex-wrap: wrap; }
.ac-chip {
  padding: 5px 14px; border-radius: 20px; font-size: 12px; font-weight: 500;
  border: 1px solid var(--border2, var(--border)); cursor: pointer; transition: all 0.15s;
  background: var(--bg); color: var(--text2); font-family: var(--font-body);
}
.ac-chip:hover { background: var(--surface2); }
.ac-chip.active { background: var(--gold-dim); border-color: var(--gold-l, var(--gold)); color: var(--gold); }
.ac-search {
  padding: 7px 14px; border-radius: 20px; border: 1px solid var(--border);
  background: var(--surface2); font-size: 13px; font-family: var(--font-body);
  color: var(--text); width: 260px; max-width: 100%;
}
.ac-tablewrap { overflow-x: auto; }
.ac-table { width: 100%; border-collapse: collapse; min-width: 720px; }
.ac-table th {
  text-align: left; padding: 10px 14px; font-size: 11px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.08em; color: var(--text4);
  border-bottom: 1px solid var(--border); white-space: nowrap;
}
.ac-table td { font-size: 14px; padding: 14px; border-bottom: 1px solid var(--border); vertical-align: middle; }
.ac-table tbody tr { cursor: pointer; }
.ac-table tbody tr:hover td { background: var(--surface); }
.ac-name { font-weight: 500; color: var(--text); font-size: 14px; }
.ac-sub { display: block; font-size: 12px; color: var(--text3); font-weight: 400; margin-top: 2px; }
.ac-muted { color: var(--text3); }
.ac-fw { font-weight: 500; color: var(--text); }
.ac-empty { padding: 48px 32px; text-align: center; color: var(--text3); font-size: 14px; border: 1px solid var(--border); border-radius: var(--r-lg); }

/* ── pills ── */
.ac-badge {
  display: inline-flex; align-items: center; gap: 5px; white-space: nowrap;
  padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; letter-spacing: 0.03em;
}
.ac-badge::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.ac-badge.draft     { background: var(--surface3); color: var(--text3); }
.ac-badge.pending   { background: var(--amber-dim); color: var(--amber); }
.ac-badge.active    { background: var(--green-dim); color: var(--green); }
.ac-badge.completed { background: var(--surface3); color: var(--text2); }
.ac-badge.cancelled { background: var(--red-dim); color: var(--red); }
.ac-badge.stopped   { background: var(--surface2); color: var(--text3); border: 1px solid var(--border); }
.ac-badge.stopped::before { display: none; }

/* ── detail: grid + cards ── */
.ac-grid { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 24px; align-items: start; }
.ac-grid.full { grid-template-columns: minmax(0, 1fr); }
.ac-card { background: var(--bg); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; margin-bottom: 16px; }
.ac-card-head { padding: 14px 20px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.ac-card-head h3 { font-family: var(--font-display); font-size: 16px; font-weight: 600; color: var(--text); margin: 0; }
.ac-card-body { padding: 20px; }
.ac-field { margin-bottom: 14px; }
.ac-field:last-child { margin-bottom: 0; }
.ac-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text4); margin-bottom: 4px; }
.ac-value { font-size: 14px; color: var(--text); word-break: break-word; }
.ac-avatar {
  width: 44px; height: 44px; border-radius: 50%; background: var(--surface2); border: 1px solid var(--border);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  font-family: var(--font-display); font-size: 16px; font-weight: 600; color: var(--text3);
}
.ac-avatar.studio { border-radius: 8px; background: var(--gold-dim); color: var(--gold); }
.ac-person { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.ac-note { font-size: 12px; color: var(--text3); text-align: center; padding: 14px 0; line-height: 1.6; }
.ac-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 9px 0; border-bottom: 1px solid var(--border); font-size: 12px; }
.ac-row:last-child { border-bottom: none; }
.ac-row.click { cursor: pointer; }
.ac-row.click:hover { background: var(--surface); }
.ac-stopped-banner {
  display: flex; align-items: center; gap: 10px; background: var(--surface2); border: 1px solid var(--border);
  border-radius: 10px; padding: 12px 16px; margin-bottom: 20px; font-size: 13px; color: var(--text2);
}
@media (max-width: 1100px) { .ac-grid { grid-template-columns: minmax(0, 1fr); } }
@media (max-width: 1024px) {
  .ac-topbar { padding: 8px 16px 8px 64px; }
  .ac-content { padding: 20px 16px; }
}
`;

export function AdminConsoleStyles() {
  return <style>{CSS}</style>;
}
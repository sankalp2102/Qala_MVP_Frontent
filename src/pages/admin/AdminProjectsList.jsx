import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectsAPI } from '../../api/client';
import { AdminConsoleStyles, STAGES, StagePill } from './adminConsole';

function fmt(iso) {
  return iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
}

// ── Buyer search dropdown ──────────────────────────────────────────────────────
function BuyerSearch({ value, onChange, buyers, onSearch }) {
  const [query,   setQuery]   = useState('');
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef();

  // Show display label for selected
  const selected = buyers.find(b => b.id === value);
  const displayVal = selected ? selected.display : '';

  const search = async (q) => {
    setQuery(q);
    setLoading(true);
    try { await onSearch(q); } finally { setLoading(false); }
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = query
    ? buyers.filter(b => b.display.toLowerCase().includes(query.toLowerCase()))
    : buyers;

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      <input
        value={open ? query : displayVal}
        onFocus={() => { setOpen(true); setQuery(''); }}
        onChange={e => { search(e.target.value); }}
        placeholder="Search by name or email…"
        style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--r-8)', border: '1px solid var(--border)', background: 'var(--surface2)', fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--text)', boxSizing: 'border-box' }}
      />
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-8)', boxShadow: 'var(--shadow-lg)', maxHeight: 220, overflowY: 'auto', marginTop: 4 }}>
          <div
            onClick={() => { onChange(''); setOpen(false); setQuery(''); }}
            style={{ padding: '9px 14px', fontSize: 13, color: 'var(--text3)', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            — No buyer yet (assign later) —
          </div>
          {loading && <div style={{ padding: '9px 14px', fontSize: 12, color: 'var(--text4)' }}>Searching…</div>}
          {!loading && filtered.length === 0 && (
            <div style={{ padding: '9px 14px', fontSize: 12, color: 'var(--text4)' }}>No buyers found</div>
          )}
          {filtered.map(b => (
            <div key={b.id}
              onClick={() => { onChange(b.id); setOpen(false); setQuery(''); }}
              style={{ padding: '9px 14px', fontSize: 13, color: 'var(--text)', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ fontWeight: 500 }}>{b.name || b.email}</div>
              {b.name && <div style={{ fontSize: 11, color: 'var(--text4)' }}>{b.email}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AdminProjectsList() {
  const nav = useNavigate();
  const [projects,    setProjects]    = useState([]);
  const [buyers,      setBuyers]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [creating,    setCreating]    = useState(false);
  const [showCreate,  setShowCreate]  = useState(false);
  const [stageFilter, setStageFilter] = useState('');
  const [searchQ,     setSearchQ]     = useState('');

  const [form, setForm] = useState({
    name: '', buyer_user_id: '',
    buyer_brand_name: '', buyer_location: '',
    product_category: '',
    bulk_quantity: '',
    budget_currency: 'USD',
    target_landing_price_usd: '',
    target_sample_delivery_date: '', target_bulk_delivery_date: '',
    additional_specs: '',
    reference_url: '',
  });

  const load = () => {
    setLoading(true);
    projectsAPI.adminListProjects({})
      .then(r => setProjects(r.data.projects || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const loadBuyers = async (q = '') => {
    try {
      const r = await projectsAPI.adminGetCustomers(q ? { q } : {});
      setBuyers(r.data.customers || []);
    } catch {}
  };

  useEffect(() => { load(); loadBuyers(); }, []);

  const set = (k, v) => setForm(f => ({...f, [k]: v}));

  const create = async () => {
    if (!form.name.trim()) return;
    setCreating(true);
    try {
      const r = await projectsAPI.adminCreateProject({
        name:                        form.name,
        buyer_user_id:               form.buyer_user_id || null,
        buyer_brand_name:            form.buyer_brand_name,
        buyer_location:              form.buyer_location,
        product_category:            form.product_category,
        bulk_quantity:               form.bulk_quantity     ? parseInt(form.bulk_quantity)     : null,
        budget_currency:             form.budget_currency,
        target_landing_price_usd:    form.target_landing_price_usd   || null,
        target_sample_delivery_date: form.target_sample_delivery_date || null,
        target_bulk_delivery_date:   form.target_bulk_delivery_date   || null,
        additional_specs:            form.additional_specs,
        reference_url:               form.reference_url || null,
      });
      nav(`/admin/projects/${r.data.project.id}`);
    } catch { setCreating(false); }
  };

  // Stage chip + search, both client-side. Everything is loaded once so the
  // chip counts are always for the whole list, not just the selected stage.
  const stageCounts = projects.reduce((acc, p) => { acc[p.stage] = (acc[p.stage] || 0) + 1; return acc; }, {});
  const filtered = projects.filter(p => {
    if (stageFilter && p.stage !== stageFilter) return false;
    if (!searchQ) return true;
    const q = searchQ.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.buyer_name?.toLowerCase().includes(q) ||
      p.buyer_email?.toLowerCase().includes(q) ||
      p.studio_name?.toLowerCase().includes(q)
    );
  });

  const subLine = (p) => [p.product_category, p.bulk_quantity ? `${p.bulk_quantity} units` : null].filter(Boolean).join(' · ') || '—';

  return (
    <div>
      <AdminConsoleStyles />

      {/* Top bar */}
      <div className="ac-topbar">
        <div className="ac-title">Projects</div>
        <button onClick={() => nav('/admin/projects/new')} className="ac-btn primary">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M7 1v12M1 7h12" /></svg>
          New Project
        </button>
      </div>

      <div className="ac-content">

      {/* Create form */}
      {showCreate && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '24px 28px', marginBottom: 24, borderLeft: '3px solid var(--gold)' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--text)', marginBottom: 20 }}>Create Project</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 11 }}>Project Name *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Handblock Linen SS27" style={{ fontSize: 13 }} />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', display: 'block', marginBottom: 6 }}>ASSIGN TO BUYER</label>
              <BuyerSearch
                value={form.buyer_user_id}
                onChange={v => set('buyer_user_id', v)}
                buyers={buyers}
                onSearch={loadBuyers}
              />
              <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 4 }}>You can assign a buyer later from the project detail page.</div>
            </div>

            {/* Brief fields */}
            <div className="field">
              <label style={{ fontSize: 11 }}>Buyer Name</label>
              <input value={form.buyer_brand_name} onChange={e => set('buyer_brand_name', e.target.value)} placeholder="Maison Éclat" style={{ fontSize: 13 }} />
            </div>
            <div className="field">
              <label style={{ fontSize: 11 }}>Location</label>
              <input value={form.buyer_location} onChange={e => set('buyer_location', e.target.value)} placeholder="Paris, France" style={{ fontSize: 13 }} />
            </div>
            <div className="field">
              <label style={{ fontSize: 11 }}>Product Type</label>
              <input value={form.product_category} onChange={e => set('product_category', e.target.value)} placeholder="Women's RTW" style={{ fontSize: 13 }} />
            </div>
            <div className="field">
              <label style={{ fontSize: 11 }}>Buyer Currency</label>
              <select value={form.budget_currency} onChange={e => set('budget_currency', e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--r-8)', border: '1px solid var(--border)', background: 'var(--surface2)', fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--text)' }}>
                {['USD','EUR','GBP','INR','AED'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="field">
              <label style={{ fontSize: 11 }}>Bulk Quantity</label>
              <input type="number" value={form.bulk_quantity} onChange={e => set('bulk_quantity', e.target.value)} placeholder="100" style={{ fontSize: 13 }} />
            </div>
            <div className="field">
              <label style={{ fontSize: 11 }}>Target Landing Price</label>
              <input type="number" value={form.target_landing_price_usd} onChange={e => set('target_landing_price_usd', e.target.value)} placeholder="519" style={{ fontSize: 13 }} />
            </div>
            <div className="field">
              <label style={{ fontSize: 11 }}>Target Sample Delivery</label>
              <input type="date" value={form.target_sample_delivery_date} onChange={e => set('target_sample_delivery_date', e.target.value)} style={{ fontSize: 13 }} />
            </div>
            <div className="field">
              <label style={{ fontSize: 11 }}>Target Bulk Delivery</label>
              <input type="date" value={form.target_bulk_delivery_date} onChange={e => set('target_bulk_delivery_date', e.target.value)} style={{ fontSize: 13 }} />
            </div>
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 11 }}>Additional Notes</label>
              <textarea rows={3} value={form.additional_specs} onChange={e => set('additional_specs', e.target.value)}
                placeholder="Fabrics, techniques, certifications, special requirements…"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--r-8)', border: '1px solid var(--border)', background: 'var(--surface2)', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text)', resize: 'vertical' }} />
            </div>

            {/* Change 2: Reference link */}
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 11 }}>Reference Link <span style={{ fontWeight: 400, color: 'var(--text4)' }}>(optional)</span></label>
              <input
                type="url"
                value={form.reference_url}
                onChange={e => set('reference_url', e.target.value)}
                placeholder="https://drive.google.com/… or Notion / Dropbox link"
                style={{ fontSize: 13 }}
              />
              <span style={{ fontSize: 11, color: 'var(--text4)', marginTop: 4, display: 'block' }}>
                A Google Drive folder, Notion brief, or any external reference for the studio. File attachments can be added after the project is created.
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button onClick={create} disabled={creating || !form.name.trim()} className="btn btn-primary" style={{ fontSize: 13 }}>
              {creating ? 'Creating…' : 'Create Project'}
            </button>
            <button onClick={() => setShowCreate(false)} className="btn btn-ghost" style={{ fontSize: 13 }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Filter chips (with counts) + search */}
      <div className="ac-toolbar">
        <div className="ac-chips">
          <button className={`ac-chip${stageFilter === '' ? ' active' : ''}`} onClick={() => setStageFilter('')}>
            All ({projects.length})
          </button>
          {STAGES.filter(st => st.key !== 'cancelled' || stageCounts.cancelled).map(st => (
            <button key={st.key} className={`ac-chip${stageFilter === st.key ? ' active' : ''}`} onClick={() => setStageFilter(st.key)}>
              {st.label} ({stageCounts[st.key] || 0})
            </button>
          ))}
        </div>
        <input
          className="ac-search"
          value={searchQ} onChange={e => setSearchQ(e.target.value)}
          placeholder="Search name, buyer or studio…"
        />
      </div>

      {/* Project table */}
      {loading ? (
        <div style={{ padding: 40, color: 'var(--text3)', fontSize: 14 }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="ac-empty">{searchQ || stageFilter ? 'No projects match your filters.' : 'No projects yet.'}</div>
      ) : (
        <div className="ac-tablewrap">
          <table className="ac-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Buyer</th>
                <th>Studio</th>
                <th>Stage</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                return (
                  <tr key={p.id} onClick={() => nav(`/admin/projects/${p.id}`)}>
                    <td>
                      <div className="ac-name">{p.name}<span className="ac-sub">{subLine(p)}</span></div>
                    </td>
                    <td>
                      {p.buyer_name || p.buyer_email
                        ? <><span className="ac-fw">{p.buyer_name || p.buyer_email}</span>{p.buyer_location && <><br /><span className="ac-muted" style={{ fontSize: 12 }}>{p.buyer_location}</span></>}</>
                        : <span className="ac-muted">No buyer</span>}
                    </td>
                    <td>{p.studio_name ? <span className="ac-fw">{p.studio_name}</span> : <span className="ac-muted">—</span>}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <StagePill stage={p.stage} />
                        {p.stopped_after_phase && (
                          <span className="ac-badge stopped" title={`Buyer stopped after ${p.stopped_after_phase}`}>
                            Stopped · {p.stopped_after_phase}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="ac-muted" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{fmt(p.created_at)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="ac-btn outline sm" onClick={e => { e.stopPropagation(); nav(`/admin/projects/${p.id}`); }}>View</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </div>
  );
}
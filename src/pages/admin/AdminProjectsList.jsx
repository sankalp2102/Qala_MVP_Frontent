import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectsAPI, adminAPI } from '../../api/client';

const STAGE_COLORS = {
  draft:           'var(--text3)',
  brief_submitted: 'var(--amber)',
  studio_assigned: 'var(--gold)',
  in_production:   'var(--teal)',
  completed:       'var(--green)',
  cancelled:       'var(--red)',
};

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
        style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--text)', boxSizing: 'border-box' }}
      />
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: 'var(--shadow-lg)', maxHeight: 220, overflowY: 'auto', marginTop: 4 }}>
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

  // Buyers who contacted a studio directly ("Get Introduced") but don't have
  // a formal project/brief yet — surfaced here instead of a separate nav
  // section so admin runs into them naturally while working the pipeline.
  const [inquiries,   setInquiries]   = useState([]);
  const [inqLoading,  setInqLoading]  = useState(true);
  const [inqOpen,     setInqOpen]     = useState(true);
  const [converting,  setConverting]  = useState(null);
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
    projectsAPI.adminListProjects(stageFilter ? { stage: stageFilter } : {})
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

  useEffect(() => { load(); loadBuyers(); }, [stageFilter]);

  useEffect(() => {
    setInqLoading(true);
    adminAPI.getAdminStudioInquiries()
      .then(r => setInquiries(r.data.inquiries || []))
      .catch(() => {})
      .finally(() => setInqLoading(false));
  }, []);

  const pendingInquiries = inquiries.filter(i => !i.project_id);

  const convertToProject = async (inq) => {
    setConverting(inq.id);
    try {
      const r = await adminAPI.convertInquiryToProject(inq.id);
      nav(`/admin/projects/${r.data.project_id}/assign-studios`);
    } catch (e) {
      alert(e?.response?.data?.message || 'Could not convert this inquiry to a project.');
      setConverting(null);
    }
  };

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

  // Client-side search filter on project list
  const filtered = projects.filter(p => {
    if (!searchQ) return true;
    const q = searchQ.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.buyer_name?.toLowerCase().includes(q) ||
      p.buyer_email?.toLowerCase().includes(q) ||
      p.studio_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ padding: 'clamp(20px,3vw,40px) clamp(16px,4vw,48px)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Projects</h1>
          <p style={{ fontSize: 14, color: 'var(--text3)' }}>{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <select value={stageFilter} onChange={e => setStageFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--text)' }}>
            <option value="">All Stages</option>
            {['draft','brief_submitted','studio_assigned','in_production','completed','cancelled'].map(s => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <button onClick={() => nav('/admin/projects/new')} className="btn btn-primary" style={{ fontSize: 13, padding: '8px 18px' }}>+ New Project</button>
        </div>
      </div>

      {/* Buyers who contacted a studio directly — convert to a project here */}
      {!inqLoading && pendingInquiries.length > 0 && (
        <div style={{ background: 'var(--gold-dim)', border: '1px solid var(--gold)', borderRadius: 12, marginBottom: 20, overflow: 'hidden' }}>
          <div
            onClick={() => setInqOpen(o => !o)}
            style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
          >
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
              🔔 {pendingInquiries.length} buyer{pendingInquiries.length > 1 ? 's' : ''} contacted a studio directly — not yet a project
            </div>
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>{inqOpen ? 'Hide ▲' : 'Show ▼'}</span>
          </div>
          {inqOpen && (
            <div style={{ padding: '0 20px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pendingInquiries.map(inq => (
                <div key={inq.id} style={{
                  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
                  padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{inq.name} <span style={{ fontWeight: 400, color: 'var(--text4)' }}>· {inq.email}</span></div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                      Contacted <strong>{inq.studio?.name}</strong>
                      {inq.buyer?.product_types?.length > 0 && <> · {inq.buyer.product_types.join(', ')}</>}
                    </div>
                  </div>
                  {inq.buyer ? (
                    <button
                      onClick={() => convertToProject(inq)}
                      disabled={converting === inq.id}
                      className="btn btn-primary"
                      style={{ fontSize: 12, padding: '7px 16px', whiteSpace: 'nowrap' }}
                    >
                      {converting === inq.id ? 'Creating…' : 'Convert to Project →'}
                    </button>
                  ) : (
                    <span style={{ fontSize: 11, color: 'var(--text4)', fontStyle: 'italic', whiteSpace: 'nowrap' }}>
                      No brief data — create manually
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Search bar */}
      <div style={{ marginBottom: 16 }}>
        <input
          value={searchQ} onChange={e => setSearchQ(e.target.value)}
          placeholder="Search projects by name, buyer, or studio…"
          style={{ width: '100%', padding: '9px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--text)', boxSizing: 'border-box' }}
        />
      </div>

      {/* Create form */}
      {showCreate && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '24px 28px', marginBottom: 24, borderLeft: '3px solid var(--gold)' }}>
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
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--text)' }}>
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
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text)', resize: 'vertical' }} />
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

      {/* Project list */}
      {loading ? (
        <div style={{ padding: 40, color: 'var(--text3)', fontSize: 14 }}>Loading…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.length === 0 && (
            <div style={{ padding: '48px 32px', textAlign: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
              <div style={{ fontSize: 14, color: 'var(--text3)' }}>{searchQ ? 'No projects match your search.' : 'No projects yet.'}</div>
            </div>
          )}
          {filtered.map(p => (
            <div key={p.id} onClick={() => nav(`/admin/projects/${p.id}`)}
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, transition: 'box-shadow 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-lg)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                  {p.buyer_name || p.buyer_email || 'No buyer'} · {p.studio_name ? `Studio: ${p.studio_name}` : 'No studio'} · Updated {fmt(p.updated_at)}
                </div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: `${STAGE_COLORS[p.stage] || 'var(--text3)'}22`, color: STAGE_COLORS[p.stage] || 'var(--text3)', textTransform: 'uppercase', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {p.stage?.replace(/_/g, ' ')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
import { useState, useEffect } from 'react';
import { projectsAPI } from '../../api/client';

function fmt(iso) {
  return iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
}

export default function AdminOrdersDashboard() {
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [overdue, setOverdue] = useState(0);
  const [filters, setFilters] = useState({ order_type: '', status: '' });

  const load = () => {
    setLoading(true);
    const params = {};
    if (filters.order_type) params.order_type = filters.order_type;
    if (filters.status)     params.status     = filters.status;
    projectsAPI.adminGetOrders(params)
      .then(r => { setOrders(r.data.orders || []); setOverdue(r.data.overdue_count || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filters]);

  const setFilter = (key, val) => setFilters(f => ({...f, [key]: val}));

  return (
    <div style={{ padding: 'clamp(20px,3vw,40px) clamp(16px,4vw,48px)' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
          Orders Dashboard
        </h1>
        <div style={{ display: 'flex', gap: 20 }}>
          <span style={{ fontSize: 13, color: 'var(--text3)' }}>{orders.length} orders</span>
          {overdue > 0 && (
            <span style={{ fontSize: 13, color: 'var(--red)', fontWeight: 600 }}>⚠ {overdue} overdue</span>
          )}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        <select value={filters.order_type} onChange={e => setFilter('order_type', e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--text)' }}>
          <option value="">Order Type</option>
          {['design','sampling','bulk','rerun'].map(o => (
            <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <select value={filters.status} onChange={e => setFilter('status', e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--text)' }}>
          <option value="">Status</option>
          {['pending','confirmed','in_progress','dispatched','delivered','cancelled'].map(o => (
            <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ padding: 40, color: 'var(--text3)', fontSize: 14 }}>Loading…</div>
      ) : orders.length === 0 ? (
        <div style={{ padding: '48px 32px', textAlign: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 }}>
          <div style={{ fontSize: 14, color: 'var(--text3)' }}>No orders found.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {orders.map(o => (
            <div key={o.order_id} style={{
              background: 'var(--surface)',
              border: `1px solid ${o.is_overdue ? 'var(--red)' : 'var(--border)'}`,
              borderRadius: 10, padding: '14px 20px',
              display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap',
            }}>
              {o.is_overdue && (
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>
                  OVERDUE
                </span>
              )}
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{o.project_name}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                  {o.order_type?.replace(/_/g, ' ')} · {o.studio_name || '—'} · {o.buyer_email || '—'}
                </div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', background: 'var(--surface2)', padding: '2px 8px', borderRadius: 6, textTransform: 'capitalize', flexShrink: 0 }}>
                {o.status?.replace(/_/g, ' ')}
              </span>
              {o.committed_dispatch_date && (
                <div style={{ fontSize: 12, color: 'var(--text3)', flexShrink: 0 }}>
                  Dispatch: {fmt(o.committed_dispatch_date)}
                </div>
              )}
              {o.awb_number && (
                <div style={{ fontSize: 12, color: 'var(--gold)', fontFamily: 'monospace', flexShrink: 0 }}>
                  {o.awb_number}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
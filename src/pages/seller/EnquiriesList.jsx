import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectsAPI } from '../../api/client';

function fmt(iso) {
  return iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
}

const STAGE_COLORS = {
  draft:           'var(--text3)',
  brief_submitted: 'var(--amber)',
  studio_assigned: 'var(--gold)',
  in_production:   'var(--teal)',
  completed:       'var(--green)',
  cancelled:       'var(--red)',
};

export default function EnquiriesList() {
  const nav = useNavigate();
  const [enquiries, setEnquiries] = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    projectsAPI.getEnquiries()
      .then(r => setEnquiries(r.data.enquiries || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: 'clamp(20px,3vw,40px) clamp(16px,4vw,48px)' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
          Project <em style={{ color: 'var(--gold)' }}>Enquiries</em>
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text3)' }}>
          Briefs shared with your studio by Qala.
        </p>
      </div>

      {loading ? (
        <div style={{ padding: 40, color: 'var(--text3)', fontSize: 14 }}>Loading…</div>
      ) : enquiries.length === 0 ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '48px 32px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📬</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text)', marginBottom: 8 }}>No enquiries yet</div>
          <p style={{ fontSize: 14, color: 'var(--text3)' }}>
            When Qala shares a buyer brief with your studio, it will appear here.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {enquiries.map(e => (
            <div key={e.id}
              onClick={() => nav(`/dashboard/enquiries/${e.id}`)}
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 22px', cursor: 'pointer', transition: 'box-shadow 0.15s', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}
              onMouseEnter={e2 => e2.currentTarget.style.boxShadow = 'var(--shadow-lg)'}
              onMouseLeave={e2 => e2.currentTarget.style.boxShadow = 'none'}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{e.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                  {e.buyer_name || e.buyer_email || 'Anonymous buyer'} · Received {fmt(e.updated_at)}
                </div>
              </div>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, flexShrink: 0,
                background: `${STAGE_COLORS[e.stage] || 'var(--text3)'}22`,
                color: STAGE_COLORS[e.stage] || 'var(--text3)',
                textTransform: 'uppercase', whiteSpace: 'nowrap',
              }}>
                {e.stage?.replace(/_/g, ' ')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
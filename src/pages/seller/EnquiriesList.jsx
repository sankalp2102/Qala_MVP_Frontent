import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectsAPI } from '../../api/client';

function fmt(iso) {
  return iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
}

function relTime(iso) {
  if (!iso) return '—';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return fmt(iso);
}

// Spec §4.2 filter tabs — status buckets mapped from the studio's
// per-project EnquiryStatus (projects/models.py::EnquiryStatus).
const FILTERS = [
  { key: 'all',      label: 'All',            statuses: null },
  { key: 'new',      label: 'New',            statuses: ['assigned', 'brief_viewed'] },
  { key: 'draft',    label: 'Draft',          statuses: ['proposal_draft'] },
  { key: 'sent',     label: 'Proposal Sent',  statuses: ['proposal_submitted', 'proposal_approved', 'proposal_sent'] },
  { key: 'accepted', label: 'Accepted',       statuses: ['proposal_approved'] }, // approved == buyer accepted (spec §3.4)
  { key: 'declined', label: 'Declined',       statuses: ['enquiry_declined', 'expired'] },
];

const STATUS_META = {
  assigned:           { label: 'New',              color: 'var(--gold)' },
  brief_viewed:       { label: 'New',               color: 'var(--gold)' },
  enquiry_accepted:   { label: 'Accepted Enquiry',   color: 'var(--teal)' },
  enquiry_declined:   { label: 'Declined',           color: 'var(--red)' },
  proposal_draft:     { label: 'Draft Saved',        color: 'var(--text3)' },
  proposal_submitted: { label: 'Under Review',       color: 'var(--amber)' },
  proposal_approved:  { label: 'Accepted',           color: 'var(--green)' },
  proposal_sent:      { label: 'Sent to Buyer',      color: 'var(--amber)' },
  expired:            { label: 'Expired',            color: 'var(--red)' },
};

const CTA_LABEL = {
  assigned:           'Review Brief →',
  brief_viewed:       'Review Brief →',
  enquiry_accepted:   'Start Proposal →',
  proposal_draft:     'Continue Draft →',
  proposal_submitted: 'View Proposal →',
  proposal_approved:  'View Project →',
  proposal_sent:      'View Proposal →',
  enquiry_declined:   null,
  expired:            null,
};

export default function EnquiriesList() {
  const nav = useNavigate();
  const [enquiries, setEnquiries] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState('all');

  useEffect(() => {
    projectsAPI.getEnquiries()
      .then(r => setEnquiries(r.data.enquiries || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const counts = useMemo(() => {
    const c = {};
    FILTERS.forEach(f => {
      c[f.key] = f.statuses
        ? enquiries.filter(e => f.statuses.includes(e.enquiry_status)).length
        : enquiries.length;
    });
    return c;
  }, [enquiries]);

  const visible = useMemo(() => {
    const f = FILTERS.find(x => x.key === filter);
    if (!f || !f.statuses) return enquiries;
    return enquiries.filter(e => f.statuses.includes(e.enquiry_status));
  }, [enquiries, filter]);

  return (
    <div style={{ padding: 'clamp(20px,3vw,40px) clamp(16px,4vw,48px)' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
          Project <em style={{ color: 'var(--gold)' }}>Enquiries</em>
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text3)' }}>
          Briefs Qala has matched to your studio.
        </p>
      </div>

      {/* Filter tabs — spec §4.2 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              fontSize: 13, fontWeight: 500, padding: '7px 16px', borderRadius: 20,
              border: `1px solid ${filter === f.key ? 'var(--gold)' : 'var(--border2)'}`,
              background: filter === f.key ? 'var(--gold-dim)' : 'transparent',
              color: filter === f.key ? 'var(--gold)' : 'var(--text3)',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {f.label} {counts[f.key] > 0 && <span style={{ opacity: 0.7 }}>({counts[f.key]})</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: 40, color: 'var(--text3)', fontSize: 14 }}>Loading…</div>
      ) : visible.length === 0 ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '48px 32px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📬</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text)', marginBottom: 8 }}>
            {filter === 'all' ? 'No enquiries yet' : 'Nothing in this filter'}
          </div>
          <p style={{ fontSize: 14, color: 'var(--text3)' }}>
            When Qala assigns your studio to a project, it will appear here.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {visible.map(e => {
            const meta = STATUS_META[e.enquiry_status] || { label: e.enquiry_status || '—', color: 'var(--text3)' };
            const isNew = e.enquiry_status === 'assigned';
            const cta = CTA_LABEL[e.enquiry_status];
            return (
              <div
                key={e.id}
                onClick={() => nav(`/dashboard/enquiries/${e.id}`)}
                style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderLeft: isNew ? '3px solid var(--gold)' : '1px solid var(--border)',
                  borderRadius: 12, padding: '18px 22px', cursor: 'pointer',
                  transition: 'box-shadow 0.15s',
                }}
                onMouseEnter={ev => ev.currentTarget.style.boxShadow = 'var(--shadow-lg)'}
                onMouseLeave={ev => ev.currentTarget.style.boxShadow = 'none'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
                      {e.name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                      <span>{e.buyer_name || e.buyer_email || 'Anonymous buyer'}</span>
                      {typeof e.match_score === 'number' && e.match_score > 0 && (
                        <>
                          <span>·</span>
                          <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{Math.round(e.match_score)}% match</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                      background: `${meta.color}22`, color: meta.color,
                      textTransform: 'uppercase', whiteSpace: 'nowrap', display: 'inline-block',
                    }}>
                      {meta.label}
                    </span>
                    <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 4 }}>
                      {relTime(e.enquiry_assigned_at || e.updated_at)}
                    </div>
                  </div>
                </div>

                {e.about && (
                  <div style={{
                    fontSize: 13, color: 'var(--text3)', marginTop: 10, lineHeight: 1.5,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>
                    {e.about}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                  <span style={{ fontSize: 11, color: 'var(--text4)', border: '1px solid var(--border)', borderRadius: 20, padding: '2px 10px' }}>
                    {e.id?.slice(0, 8)}
                  </span>
                  {cta && (
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--gold)' }}>{cta}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
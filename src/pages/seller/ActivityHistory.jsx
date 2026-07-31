// src/pages/seller/ActivityHistory.jsx
//
// Rebuilt against seller-console__2_.html's Activity History view —
// grouped-by-date list, filter chips, badge-per-category. Real data:
// aggregates ActivityLog entries from every active project (via
// getActiveProjects, whose ProjectDetailSerializer already nests up to
// 50 real log entries per project) plus real milestone payouts from the
// wallet endpoint — not a fabricated feed.
//
// One honest gap: enquiry-received and proposal-submitted events for
// projects that are still at the enquiry stage (not yet "active") aren't
// included, since getEnquiries' ProjectCardSerializer doesn't nest
// activity logs the way getActiveProjects' ProjectDetailSerializer does.
// This history is complete for active/in-production projects, not the
// full enquiry pipeline.

import { useState, useEffect, useMemo } from 'react';
import { projectsAPI, walletAPI } from '../../api/client';

const CATEGORY_BADGE = {
  payment:   { bg: 'var(--green-dim)', color: 'var(--green)', label: 'Payment' },
  order:     { bg: 'var(--amber-dim)', color: 'var(--amber)', label: 'Order' },
  proposal:  { bg: 'var(--surface2)', color: 'var(--text3)', label: 'Proposal' },
  enquiry:   { bg: 'var(--amber-dim)', color: 'var(--amber)', label: 'Enquiry' },
  other:     { bg: 'var(--surface2)', color: 'var(--text3)', label: 'Update' },
};
const EVENT_CATEGORY = {
  proposal_created: 'proposal', proposal_submitted: 'proposal', proposal_revision: 'proposal',
  proposal_sent: 'proposal', proposal_accepted: 'proposal', proposal_declined: 'proposal',
  order_created: 'order', order_dispatched: 'order', order_delivered: 'order',
  order_stage_updated: 'order', order_delayed: 'order', pickup_scheduled: 'order',
  studio_assigned: 'enquiry', brief_submitted: 'enquiry',
};
const DOT_COLOR = { proposal_accepted: 'var(--green)', order_delivered: 'var(--green)', proposal_declined: 'var(--red)', order_delayed: 'var(--amber)' };

const S = {
  topbar: { height: 56, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 28px' },
  content: { padding: 28 },
  h1: { fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, marginBottom: 6 },
  sub: { fontSize: 13, color: 'var(--text3)', marginBottom: 20 },
  filterRow: { display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  filterChip: (active) => ({ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: `1px solid ${active ? 'var(--gold)' : 'var(--border2)'}`, background: active ? 'var(--gold)' : 'transparent', color: active ? '#fff' : 'var(--text2)' }),
  card: { background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' },
  groupLabel: { padding: '10px 20px 6px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text4)', borderBottom: '1px solid var(--border)', borderTop: '1px solid var(--border)' },
  item: { display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 20px', borderBottom: '1px solid var(--border)' },
  dot: (color) => ({ width: 8, height: 8, borderRadius: '50%', background: color || 'var(--gold)', marginTop: 5, flexShrink: 0 }),
  text: { fontSize: 13, color: 'var(--text2)' },
  time: { fontSize: 11, color: 'var(--text4)', marginTop: 2 },
  badge: (bg, color) => ({ fontSize: 10, background: bg, color, padding: '2px 8px', borderRadius: 20, fontWeight: 600, flexShrink: 0 }),
};

function dayKey(d) { return new Date(d).toDateString(); }
function dayLabel(d) {
  const date = new Date(d);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yest = new Date(today); yest.setDate(yest.getDate() - 1);
  const dd = new Date(date); dd.setHours(0, 0, 0, 0);
  if (dd.getTime() === today.getTime()) return `Today · ${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  if (dd.getTime() === yest.getTime()) return `Yesterday · ${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtTime(d) { return new Date(d).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true }); }

export default function ActivityHistory() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    Promise.all([projectsAPI.getActiveProjects(), walletAPI.getSellerWallet()]).then(([p, w]) => {
      const projectEvents = (p.data.projects || []).flatMap(proj =>
        (proj.activity || []).map(a => ({
          id: a.id, ts: a.created_at, text: a.description, category: EVENT_CATEGORY[a.event_type] || 'other',
          dotColor: DOT_COLOR[a.event_type],
        }))
      );
      const paymentEvents = (w.data.milestones || []).filter(m => m.is_paid).map(m => ({
        id: `ms-${m.id}`, ts: m.paid_at, text: `Payment released — ${m.project_name}, ${m.phase} phase`,
        category: 'payment', dotColor: 'var(--green)',
      }));
      const all = [...projectEvents, ...paymentEvents].filter(e => e.ts).sort((a, b) => new Date(b.ts) - new Date(a.ts));
      setEvents(all);
    }).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => filter === 'all' ? events : events.filter(e => e.category === filter), [events, filter]);
  const grouped = useMemo(() => {
    const groups = [];
    let lastKey = null;
    filtered.forEach(e => {
      const key = dayKey(e.ts);
      if (key !== lastKey) { groups.push({ key, label: dayLabel(e.ts), items: [] }); lastKey = key; }
      groups[groups.length - 1].items.push(e);
    });
    return groups;
  }, [filtered]);

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--text4)', fontSize: 14 }}>Loading…</div>;

  return (
    <div>
      <div style={S.topbar}><div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600 }}>Activity History</div></div>
      <div style={S.content}>
        <h1 style={S.h1}>Activity History</h1>
        <p style={S.sub}>A full log of everything that has happened across your projects and payments.</p>

        <div style={S.filterRow}>
          {['all', 'payment', 'order', 'enquiry', 'proposal'].map(f => (
            <div key={f} style={S.filterChip(filter === f)} onClick={() => setFilter(f)}>{f === 'all' ? 'All' : CATEGORY_BADGE[f].label + 's'}</div>
          ))}
        </div>

        <div style={S.card}>
          {grouped.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', fontSize: 13, color: 'var(--text4)' }}>No activity yet.</div>
          ) : grouped.map(g => (
            <div key={g.key}>
              <div style={S.groupLabel}>{g.label}</div>
              {g.items.map(e => {
                const b = CATEGORY_BADGE[e.category];
                return (
                  <div key={e.id} style={S.item}>
                    <div style={S.dot(e.dotColor)} />
                    <div style={{ flex: 1 }}>
                      <div style={S.text}>{e.text}</div>
                      <div style={S.time}>{fmtTime(e.ts)}</div>
                    </div>
                    <span style={S.badge(b.bg, b.color)}>{b.label}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
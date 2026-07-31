// src/pages/seller/Earnings.jsx
//
// Replaces the earlier Wallet.jsx — that one was built from the spec doc,
// not this actual prototype file, so it didn't match. This rebuild is
// against seller-console__2_.html's Earnings & Wallet view directly:
// same 3-card wallet-grid, same verified-account info box, same
// transaction table.
//
// Honest gap, not faked: the prototype's "Available to Withdraw" vs
// "Pending Release" split, "Withdraw Now" button, bank-transfer
// transaction rows, and TDS-deduction line assume a real withdrawal/
// payout-request system with a bank-transfer ledger. No such system
// exists in the backend — wallet_views.py only tracks per-milestone
// paid/unpaid status, not a separate withdrawable-balance concept or any
// TDS calculation. Rather than invent numbers for a financial page (the
// one place where fabricated data is actively harmful, not just
// cosmetic), this shows only what's real: total paid out, total pending,
// and the real milestone-level transaction list. "Withdraw Now" and
// "Bank Details" are shown disabled with an honest explanation instead
// of a fake working button.

import { useState, useEffect } from 'react';
import { walletAPI } from '../../api/client';

const PHASE_LABEL = { design: 'Design', sampling: 'Sampling', production: 'Production' };

const S = {
  topbar: { height: 56, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 28px', justifyContent: 'space-between' },
  content: { padding: 28 },
  h1: { fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, marginBottom: 6 },
  sub: { fontSize: 13, color: 'var(--text3)', marginBottom: 20 },

  walletGrid: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 20 },
  walletCard: (primary) => ({ borderRadius: 12, padding: '20px 22px', background: primary ? 'linear-gradient(135deg,#7A8C6E,#5E7050)' : 'var(--surface)', color: primary ? '#fff' : 'var(--text)' }),
  walletLabel: (primary) => ({ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', color: primary ? 'rgba(255,255,255,.75)' : 'var(--text4)', marginBottom: 6 }),
  walletAmount: (primary) => ({ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 600, lineHeight: 1.1, color: primary ? '#fff' : 'var(--text)' }),
  walletNote: (primary) => ({ fontSize: 11, color: primary ? 'rgba(255,255,255,.7)' : 'var(--text3)', marginTop: 6, lineHeight: 1.4 }),

  infoBox: { display: 'flex', gap: 9, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--text3)', lineHeight: 1.6, marginBottom: 20 },

  card: { background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' },
  cardHeader: { padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  cardHeaderH3: { fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600 },

  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text4)', borderBottom: '1px solid var(--border)' },
  td: { padding: 14, borderBottom: '1px solid var(--border)', verticalAlign: 'middle' },
  cellTitle: { fontWeight: 500, color: 'var(--text)', fontSize: 14 },
  cellSub: { display: 'block', fontSize: 12, color: 'var(--text3)', fontWeight: 400, marginTop: 2 },
  badge: (bg, color) => ({ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: bg, color }),
};

function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'; }

export default function Earnings() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    walletAPI.getSellerWallet().then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--text4)', fontSize: 14 }}>Loading…</div>;

  const milestones = data?.milestones || [];
  const paid = milestones.filter(m => m.is_paid);
  const pending = milestones.filter(m => !m.is_paid);
  const totalPaid = data?.total_payout_inr || 0;
  const totalPending = pending.reduce((s, m) => s + (m.payout_inr || 0), 0);

  // This month = milestones paid in the current calendar month
  const now = new Date();
  const thisMonthPaid = paid.filter(m => {
    const d = new Date(m.paid_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((s, m) => s + (m.payout_inr || 0), 0);

  const visible = filter === 'all' ? milestones : filter === 'received' ? paid : pending;

  return (
    <div>
      <div style={S.topbar}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600 }}>Earnings & Wallet</div>
      </div>
      <div style={S.content}>
        <h1 style={S.h1}>Earnings & Wallet</h1>
        <p style={S.sub}>Your Qala earnings and payout history. Paid in INR to your registered bank account.</p>

        <div style={S.walletGrid}>
          <div style={S.walletCard(true)}>
            <div style={S.walletLabel(true)}>Total Paid Out</div>
            <div style={S.walletAmount(true)}>₹{Math.round(totalPaid).toLocaleString('en-IN')}</div>
            <div style={S.walletNote(true)}>Across all released milestones</div>
          </div>
          <div style={S.walletCard(false)}>
            <div style={S.walletLabel(false)}>Pending Release</div>
            <div style={S.walletAmount(false)}>₹{Math.round(totalPending).toLocaleString('en-IN')}</div>
            <div style={S.walletNote(false)}>Milestones not yet marked paid</div>
          </div>
          <div style={S.walletCard(false)}>
            <div style={S.walletLabel(false)}>This Month</div>
            <div style={S.walletAmount(false)}>₹{Math.round(thisMonthPaid).toLocaleString('en-IN')}</div>
            <div style={S.walletNote(false)}>Released so far this calendar month</div>
          </div>
        </div>

        <div style={S.infoBox}>
          Withdrawal-to-bank and TDS-deduction tracking aren't set up yet — this shows Qala-side milestone payouts only. "Withdraw Now" isn't wired to a real transfer system yet.
        </div>

        <div style={S.card}>
          <div style={S.cardHeader}>
            <h3 style={S.cardHeaderH3}>Transaction History</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              {['all', 'received', 'pending'].map(f => (
                <div key={f} onClick={() => setFilter(f)} style={{ fontSize: 11, padding: '4px 12px', borderRadius: 20, cursor: 'pointer', border: `1px solid ${filter === f ? 'var(--gold)' : 'var(--border2)'}`, background: filter === f ? 'var(--gold)' : 'transparent', color: filter === f ? '#fff' : 'var(--text2)', textTransform: 'capitalize' }}>{f}</div>
              ))}
            </div>
          </div>
          {visible.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', fontSize: 13, color: 'var(--text4)' }}>No transactions in this view.</div>
          ) : (
            <table style={S.table}>
              <thead><tr><th style={S.th}>Transaction</th><th style={S.th}>Project</th><th style={S.th}>Amount (INR)</th><th style={S.th}>Status</th><th style={S.th}>Date</th></tr></thead>
              <tbody>
                {visible.map(m => (
                  <tr key={m.id}>
                    <td style={S.td}><div style={S.cellTitle}>{PHASE_LABEL[m.phase] || m.phase} milestone<span style={S.cellSub}>{m.trigger_label}</span></div></td>
                    <td style={{ ...S.td, fontSize: 13, color: 'var(--text3)' }}>{m.project_name}</td>
                    <td style={{ ...S.td, fontWeight: 500, color: m.is_paid ? 'var(--green)' : 'var(--amber)' }}>{m.is_paid ? '+' : ''}₹{Math.round(m.payout_inr || 0).toLocaleString('en-IN')}</td>
                    <td style={S.td}>{m.is_paid ? <span style={S.badge('var(--green-dim)', 'var(--green)')}>Released</span> : <span style={S.badge('var(--amber-dim)', 'var(--amber)')}>Pending</span>}</td>
                    <td style={{ ...S.td, fontSize: 13, color: 'var(--text3)' }}>{m.is_paid ? fmtDate(m.paid_at) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
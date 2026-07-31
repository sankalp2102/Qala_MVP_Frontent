// src/pages/buyer/Wallet.jsx — buyer-wallet.html, Phase 4 of the parity plan.
import { useState, useEffect } from 'react';
import { walletAPI } from '../../api/client';

const PHASE_LABELS = { design: 'Design', sampling: 'Sampling', production: 'Production' };

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function Wallet() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    walletAPI.getBuyerWallet()
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding:40, color:'var(--text4)', fontSize:14 }}>Loading…</div>;

  const milestones = data?.milestones || [];
  const paid    = milestones.filter(m => m.is_paid);
  const pending = milestones.filter(m => !m.is_paid);

  return (
    <div style={{ padding:'clamp(20px,3vw,40px) clamp(16px,4vw,48px)' }}>
      <h1 style={{ fontFamily:'var(--font-display)', fontSize:32, fontWeight:700, color:'var(--text)', marginBottom:6 }}>Wallet</h1>
      <p style={{ fontSize:14, color:'var(--text3)', marginBottom:28 }}>Your payment history across every project.</p>

      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:'22px 26px', marginBottom:28, maxWidth:340 }}>
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--text4)', marginBottom:6 }}>Total paid</div>
        <div style={{ fontFamily:'var(--font-display)', fontSize:30, fontWeight:600, color:'var(--text)' }}>${Number(data?.total_paid_usd || 0).toLocaleString()}</div>
      </div>

      {pending.length > 0 && (
        <div style={{ marginBottom:32 }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--text4)', marginBottom:12 }}>Pending</div>
          {pending.map(m => (
            <div key={m.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 18px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, marginBottom:8 }}>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{PHASE_LABELS[m.phase]} — {m.project_name}</div>
                <div style={{ fontSize:12, color:'var(--text4)' }}>{m.studio_name} · {m.trigger_label}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:14, fontWeight:600, color:'var(--text)' }}>${Number(m.amount_usd || 0).toLocaleString()}</div>
                {m.payment_link_url && (
                  <a href={m.payment_link_url} target="_blank" rel="noreferrer" style={{ fontSize:11, color:'var(--gold)' }}>Pay now →</a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div>
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--text4)', marginBottom:12 }}>History</div>
        {paid.length === 0 ? (
          <div style={{ fontSize:13, color:'var(--text4)', fontStyle:'italic' }}>No payments yet.</div>
        ) : paid.map(m => (
          <div key={m.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 18px', borderBottom:'1px solid var(--border)' }}>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{PHASE_LABELS[m.phase]} — {m.project_name}</div>
              <div style={{ fontSize:12, color:'var(--text4)' }}>{m.studio_name} · Paid {fmt(m.paid_at)}</div>
            </div>
            <div style={{ fontSize:14, fontWeight:600, color:'var(--green)' }}>${Number(m.amount_usd || 0).toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
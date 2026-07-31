/*
 * src/components/proposals/PaymentModal.jsx
 *
 * Shown immediately on proposal acceptance (spec §8.1). Payment links are
 * pasted manually by admin against each Milestone (no live Stripe
 * integration in v1 — see projects/models.py::Milestone) — "Pay now" just
 * opens whatever link admin set for Milestone 1 (Design) in a new tab.
 */
export default function PaymentModal({ proposal, studioName, onClose }) {
  const m1 = (proposal?.milestones || [])
    .filter(m => m.phase === 'design')
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))[0];

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(26,22,18,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 16, maxWidth: 440, width: '100%',
          padding: '32px 30px', boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div style={{ fontSize: 34, marginBottom: 10 }}>🎉</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
          Proposal accepted!
        </div>
        <div style={{ fontSize: 14, color: 'var(--text3)', marginBottom: 22 }}>
          {studioName ? `${studioName} has been notified and will begin work.` : 'The studio has been notified.'}
        </div>

        {m1 ? (
          <div style={{ background: 'var(--surface2)', borderRadius: 12, padding: '18px 20px', marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
              First payment due
            </div>
            <div style={{ fontSize: 14, color: 'var(--text)', marginBottom: 4 }}>{m1.trigger_label || 'Design phase kick-off'}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, color: 'var(--gold)' }}>
              {m1.amount_usd ? `$${Number(m1.amount_usd).toLocaleString()}` : '—'}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20 }}>
            No payment link has been set for this milestone yet — Qala will follow up by email.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {m1?.payment_link_url && (
            <a
              href={m1.payment_link_url}
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary"
              style={{ textAlign: 'center', fontSize: 14, padding: '12px 20px', textDecoration: 'none' }}
            >
              Pay now — ${m1.amount_usd ? Number(m1.amount_usd).toLocaleString() : ''}
            </a>
          )}
          <button onClick={onClose} className="btn btn-ghost" style={{ fontSize: 13 }}>
            I'll pay later via email
          </button>
        </div>

        <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 16, textAlign: 'center' }}>
          Payment link also sent to your registered email — you can pay from your inbox any time.
        </div>
      </div>
    </div>
  );
}
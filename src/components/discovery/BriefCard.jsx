// src/components/discovery/BriefCard.jsx
// Shown inside the chat when matching completes.
// Summarises what was collected and provides the "Find Studios" CTA.

import { useNavigate } from 'react-router-dom';
import { discoveryAPI } from '../../api/client';

const BATCH_LABELS = {
  under_30: 'Under 30 pieces',
  '30_100': '30–100 pieces',
  over_100: '100+ pieces',
  not_sure: 'Quantity flexible',
};

const TIMELINE_LABELS = {
  '1_3_months':    '1–3 months',
  '3_6_months':    '3–6 months',
  '6_plus_months': '6+ months',
  not_sure:        'Timeline flexible',
  flexible:        'Timeline flexible',
};

export default function BriefCard({ extracted = {}, sessionToken }) {
  const navigate = useNavigate();

  function handleFindStudios() {
    if (sessionToken) {
      discoveryAPI.saveSession(sessionToken);
      navigate('/discover/results');
    }
  }

  const products  = extracted.product_types || [];
  const fabrics   = extracted.fabrics || [];
  const crafts    = extracted.crafts || [];
  const batch     = BATCH_LABELS[extracted.batch_size] || '';
  const timeline  = TIMELINE_LABELS[extracted.timeline] || '';

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border2)',
      borderRadius: 12,
      padding: '16px 18px',
      marginTop: 8,
      maxWidth: 320,
    }}>
      <div style={{
        fontSize: 10, fontWeight: 600, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: 'var(--text3)',
        marginBottom: 12,
      }}>
        Your Brief
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>

        {products.length > 0 && (
          <BriefRow
            icon="👕"
            label={products.map(p => p.replace(/_/g, ' ')).join(', ')}
          />
        )}

        {fabrics.length > 0 && (
          <BriefRow
            icon="🧵"
            label={fabrics.join(', ')}
          />
        )}

        {crafts.length > 0 && (
          <BriefRow
            icon="✦"
            label={crafts.join(', ')}
          />
        )}

        {batch && (
          <BriefRow icon="📦" label={batch} />
        )}

        {timeline && (
          <BriefRow icon="📅" label={timeline} />
        )}
      </div>

      <button
        onClick={handleFindStudios}
        style={{
          width: '100%',
          padding: '11px 16px',
          borderRadius: 8,
          background: '#1A1612',
          color: '#F5F0E8',
          border: 'none',
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          fontFamily: 'var(--font-body)',
          transition: 'background 0.18s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#C46E49'; }}
        onMouseLeave={e => { e.currentTarget.style.background = '#1A1612'; }}
      >
        Find Studios →
      </button>
    </div>
  );
}

function BriefRow({ icon, label }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <span style={{
        fontSize: 13, color: 'var(--text2)',
        textTransform: 'capitalize', lineHeight: 1.4,
      }}>
        {label}
      </span>
    </div>
  );
}
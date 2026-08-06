// src/pages/public/PublicProposalView.jsx
//
// The no-login emailed-link page (/p/:token). Fetches the proposal by
// token and renders it via the shared ProposalCarbonCopy component —
// see that file for the actual prototype-exact rendering. This file is
// now just the token-fetching + loading/error states + wiring the public
// (unauthenticated) accept/action API calls.

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { publicAPI } from '../../api/parityClient';
import ProposalCarbonCopy from '../../components/proposals/ProposalCarbonCopy';

const fh = "'Cormorant Garamond', serif";
const fb = "'DM Sans', sans-serif";

export default function PublicProposalView() {
  const { token } = useParams();
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    publicAPI.getProposal(token)
      .then(r => setProposal(r.data.proposal))
      .catch(e => setError(e?.response?.data?.message || 'This proposal link is invalid or has expired.'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [token]);

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--taupe)', fontFamily: fb, fontSize: 14 }}>Loading…</div>;
  if (error || !proposal) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 20, textAlign: 'center', fontFamily: fb }}>
        <div style={{ fontFamily: fh, fontSize: 24, color: 'var(--text)' }}>This link isn't valid</div>
        <div style={{ fontSize: 14, color: '#7A736E', maxWidth: 360 }}>{error || 'The proposal could not be found.'}</div>
      </div>
    );
  }

  return (
    <ProposalCarbonCopy
      proposal={proposal}
      navContext={`${proposal.project_name} · ${proposal.studio_info?.name}`}
      onAccept={async (notes) => { await publicAPI.acceptProposal(token, { notes }); load(); }}
      onAction={async (type, message) => { await publicAPI.actOnProposal(token, { type, message }); if (type === 'declined') load(); }}
    />
  );
}
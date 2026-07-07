import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectsAPI } from '../../api/client';

function fmt(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
}

const PROPOSAL_STATUS_LABELS = {
  draft:'Draft', submitted:'Submitted to Qala', under_review:'Under Review',
  sent_to_buyer:'Sent to Buyer', accepted:'Accepted', declined:'Declined', negotiating:'Negotiating',
};
const PROPOSAL_STATUS_COLORS = {
  draft:'var(--text3)', submitted:'var(--amber)', under_review:'var(--amber)',
  sent_to_buyer:'var(--teal)', accepted:'var(--green)', declined:'var(--red)', negotiating:'var(--gold)',
};

export default function EnquiryDetail() {
  const { projectId } = useParams();
  const nav           = useNavigate();
  const [enquiry,  setEnquiry]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [creating, setCreating] = useState(false);

  const load = () => {
    setLoading(true);
    projectsAPI.getEnquiry(projectId)
      .then(r => setEnquiry(r.data.enquiry))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [projectId]);

  const createDraftProposal = async () => {
    setCreating(true);
    try {
      const r = await projectsAPI.createProposal(projectId, {});
      nav(`/dashboard/enquiries/${projectId}/proposal/${r.data.proposal.id}`);
    } catch { setCreating(false); }
  };

  if (loading) return <div style={{ padding:40, color:'var(--text3)', fontSize:14 }}>Loading…</div>;
  if (!enquiry) return <div style={{ padding:40, color:'var(--red)', fontSize:14 }}>Enquiry not found.</div>;

  const brief = enquiry.brief || {};
  const myProposals = enquiry.my_proposals || [];
  const draftProposal = myProposals.find(p => p.status === 'draft');
  const submittedProposal = myProposals.find(p => p.status !== 'draft');

  return (
    <div style={{ padding:'clamp(20px, 3vw, 40px) clamp(16px, 4vw, 48px)' }}>
      <button onClick={() => nav('/dashboard/enquiries')} style={{ background:'none', border:'none', color:'var(--text3)', fontSize:13, cursor:'pointer', marginBottom:20, padding:0 }}>
        ← All Enquiries
      </button>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:700, color:'var(--text)', marginBottom:6 }}>{enquiry.name}</h1>
          {enquiry.buyer_name && <div style={{ fontSize:13, color:'var(--text3)' }}>From: <span style={{ color:'var(--text)' }}>{enquiry.buyer_name}</span></div>}
        </div>
        {/* CTA */}
        {myProposals.length === 0 ? (
          <button onClick={createDraftProposal} disabled={creating} className="btn btn-primary" style={{ fontSize:13, padding:'10px 22px' }}>
            {creating ? 'Creating…' : 'Create Proposal →'}
          </button>
        ) : draftProposal ? (
          <button onClick={() => nav(`/dashboard/enquiries/${projectId}/proposal/${draftProposal.id}`)} className="btn btn-primary" style={{ fontSize:13, padding:'10px 22px' }}>
            Continue Proposal →
          </button>
        ) : null}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:28, alignItems:'start' }}>
        {/* Left — brief */}
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          {/* Brief */}
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'24px 28px' }}>
            <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:600, color:'var(--text)', marginBottom:20 }}>Brief</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              {[
                ['Product Category',  brief.product_category     || '—'],
                ['Quantity',          brief.quantity_estimate    || '—'],
                ['Budget',            brief.budget_min && brief.budget_max ? `${brief.budget_currency || 'USD'} ${Number(brief.budget_min).toLocaleString()} – ${Number(brief.budget_max).toLocaleString()}` : '—'],
                ['Target Delivery',   fmt(brief.target_delivery_date)],
              ].map(([label, val]) => (
                <div key={label}>
                  <div style={{ fontSize:10, fontWeight:700, color:'var(--text4)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>{label}</div>
                  <div style={{ fontSize:14, color:'var(--text)' }}>{val}</div>
                </div>
              ))}
              {brief.additional_specs && (
                <div style={{ gridColumn:'1 / -1' }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'var(--text4)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>Additional Specs</div>
                  <div style={{ fontSize:14, color:'var(--text)', lineHeight:1.65, whiteSpace:'pre-wrap' }}>{brief.additional_specs}</div>
                </div>
              )}
            </div>
          </div>

          {/* Moodboards */}
          {(brief.moodboards || []).length > 0 && (
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'20px 24px' }}>
              <div style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:600, color:'var(--text)', marginBottom:14 }}>Moodboards</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
                {brief.moodboards.map(m => (
                  <div key={m.id} style={{ width:90, height:90, borderRadius:8, overflow:'hidden', border:'1px solid var(--border)', background:'var(--surface2)' }}>
                    {m.url && m.file_name?.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                      <img src={m.url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                    ) : (
                      <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>📄</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* My proposals */}
          {myProposals.length > 0 && (
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'20px 24px' }}>
              <div style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:600, color:'var(--text)', marginBottom:14 }}>My Proposal</div>
              {myProposals.map(p => (
                <div key={p.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 0', borderBottom:'1px solid var(--border)' }}>
                  <div>
                    <span style={{ fontSize:12, fontWeight:600, color: PROPOSAL_STATUS_COLORS[p.status] || 'var(--text3)' }}>
                      {PROPOSAL_STATUS_LABELS[p.status] || p.status}
                    </span>
                    {p.submitted_at && <div style={{ fontSize:11, color:'var(--text4)', marginTop:2 }}>Submitted {fmt(p.submitted_at)}</div>}
                  </div>
                  {p.status === 'draft' && (
                    <button onClick={() => nav(`/dashboard/enquiries/${projectId}/proposal/${p.id}`)} className="btn btn-ghost" style={{ fontSize:12 }}>
                      Edit →
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'20px 24px' }}>
            <div style={{ fontSize:10, fontWeight:700, color:'var(--gold)', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:14 }}>Enquiry Info</div>
            {[
              ['Received',     fmt(enquiry.created_at)],
              ['Brief Version', (enquiry.brief_versions || []).length > 0 ? `v${Math.max(...(enquiry.brief_versions||[]).map(v=>v.version_number))}` : 'v1'],
              ['Project Stage', enquiry.stage?.replace(/_/g,' ')],
            ].map(([label, val]) => (
              <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                <span style={{ fontSize:12, color:'var(--text4)' }}>{label}</span>
                <span style={{ fontSize:13, color:'var(--text)', fontWeight:500, textTransform:'capitalize' }}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
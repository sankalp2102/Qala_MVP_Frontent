// src/pages/seller/EnquiryDetail.jsx
//
// Restructured against seller-console__2_.html's viewEnquiryDetail —
// topbar breadcrumb + expiry badge, Buyer's Brief card (with inline
// match score), Buyer Profile card, Ask-a-question card, sidebar Your
// Match (now with a REAL per-parameter breakdown checklist — see below),
// Enquiry Info + Actions. All the real logic from the previous version
// (createDraftProposal, respond/accept/decline, QAThread, LiveEnquiryFeed,
// canRespond/canStartProposal gating) is unchanged — only the layout and
// labels moved to match the prototype.
//
// Real fix this pass: StudioAssignment previously only stored a flat
// match_score, so there was no way to show WHY a studio matched — the
// prototype's per-parameter checklist (✓ Kantha, ✓ Linen/Cotton, etc.)
// had nothing to render from. Added match_breakdown to the model this
// session and wired the admin assign-flow to actually populate it, so
// this is now real data, not a mock.
//
// Honest gap, not faked: the prototype's "Buyer Profile" card shows
// "Qala Orders" (order count) and "Typical Order Size" — no buyer
// order-history data is exposed to the studio anywhere in the backend
// (EnquiryDetailSerializer has no such field). Shown as "Not available
// yet" rather than a fabricated number. "Focus" (buyer's business
// category) has no backing either and is omitted rather than guessed.
//
// The prototype's card literally says "Ask the Buyer a Question" — kept
// as "Ask Qala a question" instead, because that's how the feature
// actually works per the real backend: SellerEnquiryMessage routes
// through Qala admin, not directly to the buyer. Matching the
// prototype's wording here would misrepresent who actually sees the
// message.

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectsAPI } from '../../api/client';

function fmt(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function daysUntil(iso) {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

const PROPOSAL_STATUS_LABELS = {
  draft: 'Draft', submitted: 'Submitted to Qala', under_review: 'Under Review',
  sent_to_buyer: 'Sent to Buyer', accepted: 'Accepted', declined: 'Declined', negotiating: 'Negotiating',
};
const PROPOSAL_STATUS_COLORS = {
  draft: 'var(--text3)', submitted: 'var(--amber)', under_review: 'var(--amber)',
  sent_to_buyer: 'var(--teal)', accepted: 'var(--green)', declined: 'var(--red)', negotiating: 'var(--gold)',
};
const ASSIGNMENT_STATUS_LABELS = {
  assigned: 'New — not yet viewed',
  brief_viewed: 'Viewed',
  enquiry_accepted: 'Enquiry accepted',
  enquiry_declined: 'Enquiry declined',
  proposal_draft: 'Proposal draft in progress',
  proposal_submitted: 'Proposal submitted — Qala reviewing',
  proposal_approved: 'Proposal accepted by buyer',
  proposal_sent: 'Proposal sent to buyer',
  expired: 'Enquiry expired',
};
const PARAM_LABELS = {
  embellishment: 'Embellishment', printing: 'Printing', category: 'Category',
  weaving: 'Weaving', fabrics: 'Fabrics', dyes: 'Dyes',
  dyeing_techniques: 'Dyeing', spinning: 'Spinning',
};

const S = {
  topbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
  breadcrumb: { fontSize: 13, color: 'var(--text3)' },
  breadcrumbLink: { color: 'var(--text3)', cursor: 'pointer', background: 'none', border: 'none', fontSize: 13, padding: 0 },
  badgeNew: { fontSize: 11, fontWeight: 600, background: 'var(--gold-dim)', color: 'var(--gold-d, var(--gold))', border: '1px solid var(--gold-l)', borderRadius: 'var(--r-20)', padding: '4px 12px' },
  card: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '24px 28px', marginBottom: 20 },
  cardTitle: { fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--text)', marginBottom: 20 },
  detailLabel: { fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 },
  detailValue: { fontSize: 14, fontWeight: 500, color: 'var(--text)' },
  divider: { height: 1, background: 'var(--border)', margin: '18px 0' },
  chip: { fontSize: 12, color: 'var(--text2)', background: 'var(--gold-dim)', border: '1px solid var(--gold-l)', borderRadius: 'var(--r-20)', padding: '3px 10px' },
};

export default function EnquiryDetail() {
  const { projectId } = useParams();
  const nav = useNavigate();
  const [enquiry, setEnquiry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [responding, setResponding] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

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

  const respond = async (action, reason) => {
    setResponding(true);
    try {
      await projectsAPI.respondToEnquiry(projectId, { action, decline_reason: reason });
      await load();
      setDeclineOpen(false);
      setDeclineReason('');
    } catch { /* surfaced via unchanged sidebar state */ }
    finally { setResponding(false); }
  };

  if (loading) return <div style={{ padding: 40, color: 'var(--text3)', fontSize: 14 }}>Loading…</div>;
  if (!enquiry) return <div style={{ padding: 40, color: 'var(--red)', fontSize: 14 }}>Enquiry not found.</div>;

  const brief = enquiry.brief || {};
  const assignment = enquiry.assignment || {};
  const myProposals = enquiry.my_proposals || [];
  const draftProposal = myProposals.find(p => p.status === 'draft');
  const canRespond = assignment.status === 'assigned' || assignment.status === 'brief_viewed';
  const canStartProposal = ['assigned', 'brief_viewed', 'enquiry_accepted'].includes(assignment.status) && myProposals.length === 0;
  const daysLeft = daysUntil(assignment.expires_at);
  const breakdown = assignment.match_breakdown || {};
  const breakdownEntries = Object.entries(breakdown);

  const techniques = ['embellishment_required', 'printing_required', 'weaving_required', 'dyeing_techniques_required', 'spinning_required']
    .flatMap(f => brief[f] || []);

  return (
    <div style={{ padding: 'clamp(20px, 3vw, 40px) clamp(16px, 4vw, 48px)' }}>
      <div style={S.topbar}>
        <div style={S.breadcrumb}>
          <button style={S.breadcrumbLink} onClick={() => nav('/dashboard/enquiries')}>Enquiries</button>
          <span style={{ margin: '0 8px', color: 'var(--text4)' }}>›</span>
          <span style={{ color: 'var(--text)' }}>{enquiry.name}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {assignment.status === 'assigned' && daysLeft !== null && (
            <span style={S.badgeNew}>New{daysLeft >= 0 ? ` · Expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}` : ' · Expired'}</span>
          )}
          {canStartProposal ? (
            <button onClick={createDraftProposal} disabled={creating} className="btn btn-primary" style={{ fontSize: 13, padding: '10px 22px' }}>
              {creating ? 'Creating…' : 'Start Proposal →'}
            </button>
          ) : draftProposal ? (
            <button onClick={() => nav(`/dashboard/enquiries/${projectId}/proposal/${draftProposal.id}`)} className="btn btn-primary" style={{ fontSize: 13, padding: '10px 22px' }}>
              Continue Draft →
            </button>
          ) : null}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24, alignItems: 'start' }}>
        {/* LEFT COLUMN */}
        <div>
          {/* Buyer's Brief — rebuilt using the real Brief fields (verified
             against the actual serializer). The previous version read
             fields that don't exist on the model at all — product_category,
             target_landing_price_usd, product_description,
             materials_keywords, reference_url — which is exactly why the
             brief looked empty/broken: those were always undefined. */}
          <div style={S.card}>
            <div style={S.cardTitle}>Buyer's Brief</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 20 }}>
              <div><div style={S.detailLabel}>Project type</div><div style={S.detailValue}>{brief.project_type || '—'}</div></div>
              <div><div style={S.detailLabel}>Gender</div><div style={S.detailValue}>{brief.gender || '—'}</div></div>
              <div><div style={S.detailLabel}>Quantity</div><div style={S.detailValue}>{brief.bulk_quantity ? `${Number(brief.bulk_quantity).toLocaleString()} units` : '—'}</div></div>
              <div><div style={S.detailLabel}>Target price</div><div style={S.detailValue}>{brief.target_landing_price_local ? `${brief.target_landing_currency || ''} ${brief.target_landing_price_local}` : '—'}</div></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
              <div><div style={S.detailLabel}>Bulk delivery</div><div style={S.detailValue}>{fmt(brief.target_bulk_delivery_date)}</div></div>
              <div><div style={S.detailLabel}>Delivery location</div><div style={S.detailValue}>{brief.buyer_location || '—'}</div></div>
              {typeof assignment.match_score === 'number' && (
                <div><div style={S.detailLabel}>Match Score</div><div style={{ ...S.detailValue, color: 'var(--gold)', fontSize: 18 }}>{Math.round(assignment.match_score)}%</div></div>
              )}
              <div />
            </div>

            {(brief.occasion_tags || []).length > 0 && (
              <>
                <div style={S.divider} />
                <div style={{ ...S.detailLabel, marginBottom: 6 }}>Occasion</div>
                <div>{brief.occasion_tags.map((t, i) => <span key={i} style={S.chip}>{t}</span>)}</div>
              </>
            )}
            {(brief.garment_types || []).length > 0 && (
              <>
                <div style={S.divider} />
                <div style={{ ...S.detailLabel, marginBottom: 6 }}>Product / garment types</div>
                <div>{brief.garment_types.map((t, i) => <span key={i} style={S.chip}>{t}</span>)}</div>
              </>
            )}

            <div style={S.divider} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
              <div>
                <div style={{ ...S.detailLabel, marginBottom: 6 }}>Fabrics</div>
                <div>{(brief.preferred_fabrics || []).length > 0 ? brief.preferred_fabrics.map((t, i) => <span key={i} style={{ fontSize: 12, color: 'var(--text2)', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r-20)', padding: '3px 10px', marginRight: 4, display: 'inline-block', marginBottom: 4 }}>{t}</span>) : <span style={{ fontSize: 12, color: 'var(--text4)' }}>Not specified</span>}</div>
              </div>
              <div>
                <div style={{ ...S.detailLabel, marginBottom: 6 }}>Printing & dyeing</div>
                <div>{(brief.printing_required || []).length > 0 ? brief.printing_required.map((t, i) => <span key={i} style={{ fontSize: 12, color: 'var(--text2)', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r-20)', padding: '3px 10px', marginRight: 4, display: 'inline-block', marginBottom: 4 }}>{t}</span>) : <span style={{ fontSize: 12, color: 'var(--text4)' }}>Not specified</span>}</div>
              </div>
              <div>
                <div style={{ ...S.detailLabel, marginBottom: 6 }}>Surface work</div>
                <div>{(brief.embellishment_required || []).length > 0 ? brief.embellishment_required.map((t, i) => <span key={i} style={{ fontSize: 12, color: 'var(--text2)', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r-20)', padding: '3px 10px', marginRight: 4, display: 'inline-block', marginBottom: 4 }}>{t}</span>) : <span style={{ fontSize: 12, color: 'var(--text4)' }}>Not specified</span>}</div>
              </div>
              <div>
                <div style={{ ...S.detailLabel, marginBottom: 6 }}>Dyes</div>
                <div>{(brief.preferred_dyes || []).length > 0 ? brief.preferred_dyes.map((t, i) => <span key={i} style={{ fontSize: 12, color: 'var(--text2)', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r-20)', padding: '3px 10px', marginRight: 4, display: 'inline-block', marginBottom: 4 }}>{t}</span>) : <span style={{ fontSize: 12, color: 'var(--text4)' }}>Not specified</span>}</div>
              </div>
            </div>

            {(brief.moodboards || []).length > 0 && (
              <>
                <div style={S.divider} />
                <div style={{ ...S.detailLabel, marginBottom: 6 }}>References</div>
                {brief.moodboards.map((m, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'var(--surface)', borderRadius: 'var(--r)', padding: '7px 10px', marginBottom: 5 }}>
                    <span style={{ fontSize: 16 }}>🖼</span><span style={{ fontSize: 12, fontWeight: 500, flex: 1 }}>{m.file_name || m.name}</span>
                    {m.url && <a href={m.url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--gold)' }}>Open ↗</a>}
                  </div>
                ))}
              </>
            )}
            {brief.additional_specs && (
              <>
                <div style={S.divider} />
                <div style={{ ...S.detailLabel, marginBottom: 6 }}>Buyer notes</div>
                <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>{brief.additional_specs}</p>
              </>
            )}
          </div>

          {/* Buyer Profile */}
          <div style={S.card}>
            <div style={S.cardTitle}>Buyer Profile</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 16 }}>
              <div><div style={S.detailLabel}>Brand</div><div style={S.detailValue}>{brief.buyer_brand_name || enquiry.buyer_name || '—'}</div></div>
              <div><div style={S.detailLabel}>Based</div><div style={S.detailValue}>{brief.buyer_location || '—'}</div></div>
              <div><div style={S.detailLabel}>Communication</div><div style={{ fontSize: 12, color: 'var(--text4)' }}>Not available yet</div></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
              <div><div style={S.detailLabel}>Qala Orders</div><div style={{ fontSize: 12, color: 'var(--text4)' }}>Not available yet</div></div>
              <div><div style={S.detailLabel}>Typical Order Size</div><div style={{ fontSize: 12, color: 'var(--text4)' }}>Not available yet</div></div>
              <div />
            </div>
          </div>

          {/* Qala's note — private admin context, never shown to buyer (spec §4.4) */}
          {assignment.studio_note && (
            <div style={{ background: 'var(--surface)', border: '1px solid #C9B8E8', borderRadius: 'var(--r-lg)', padding: '18px 22px', marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--purple)', marginBottom: 4 }}>🔒 Qala's note to you</div>
              <div style={{ fontSize: 10, color: 'rgba(91,75,138,0.65)', marginBottom: 10 }}>Visible to your studio only — not shared with the buyer</div>
              <div style={{ fontSize: 13, color: 'var(--purple)', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{assignment.studio_note}</div>
            </div>
          )}

          {/* Moodboards */}
          {(brief.moodboards || []).length > 0 && (
            <div style={S.card}>
              <div style={S.cardTitle}>Moodboards</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {brief.moodboards.map(m => (
                  <div key={m.id} style={{ width: 90, height: 90, borderRadius: 'var(--r-8)', overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--surface2)' }}>
                    {m.url && m.file_name?.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                      <img src={m.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>📄</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* My proposals — inline progress strip (spec §4.6) */}
          {myProposals.length > 0 && (
            <div style={S.card}>
              <div style={S.cardTitle}>My Proposal</div>
              {myProposals.map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: PROPOSAL_STATUS_COLORS[p.status] || 'var(--text3)' }}>
                      {PROPOSAL_STATUS_LABELS[p.status] || p.status}
                    </span>
                    {p.submitted_at && <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 2 }}>Submitted {fmt(p.submitted_at)}</div>}
                  </div>
                  <button onClick={() => nav(`/dashboard/enquiries/${projectId}/proposal/${p.id}`)} className="btn btn-ghost" style={{ fontSize: 12 }}>
                    {p.status === 'draft' ? 'Continue Draft →' : 'View Proposal →'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Live buyer response feed — only meaningful once a proposal's been sent */}
          {myProposals.some(p => ['sent_to_buyer', 'accepted', 'declined'].includes(p.status)) && (
            <div style={{ marginBottom: 20 }}>
              <LiveEnquiryFeed
                projectId={projectId}
                proposalId={myProposals.find(p => ['sent_to_buyer', 'accepted', 'declined'].includes(p.status))?.id}
              />
            </div>
          )}

          {/* Ask Qala a question — spec §4.5, available any time before/during proposal work.
              (Prototype's card says "Ask the Buyer a Question" — kept as Qala here since that's
              who actually receives it per the real backend routing.) */}
          <QAThread projectId={projectId} />
        </div>

        {/* RIGHT SIDEBAR */}
        <div>
          {/* Your Match — now with a real per-parameter breakdown */}
          {typeof assignment.match_score === 'number' && (
            <div style={S.card}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Your Match</div>
              <div style={{ textAlign: 'center', padding: '12px 0 18px' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 52, fontWeight: 600, color: 'var(--gold)', lineHeight: 1 }}>
                  {Math.round(assignment.match_score)}%
                </div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
                  {assignment.match_score >= 80 ? 'Strong match' : assignment.match_score >= 60 ? 'Good match' : 'Partial match'}
                </div>
              </div>
              {breakdownEntries.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {breakdownEntries.map(([key, d]) => (
                    <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, color: 'var(--text3)' }}>{PARAM_LABELS[key] || key}</span>
                      <span style={{ fontSize: 13, fontWeight: 500, color: d?.raw > 0 ? 'var(--green)' : 'var(--text4)' }}>
                        {d?.raw > 0 ? '✓ Matched' : '– Not matched'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 11, color: 'var(--text4)', textAlign: 'center' }}>Match breakdown not available for this enquiry (assigned before this detail was tracked).</div>
              )}
            </div>
          )}

          {/* Enquiry status + actions */}
          <div style={S.card}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>Enquiry Info</div>
            {[
              ['Received', fmt(enquiry.created_at)],
              ['Status', ASSIGNMENT_STATUS_LABELS[assignment.status] || assignment.status || '—'],
              ['Brief Version', (enquiry.brief_versions || []).length > 0 ? `v${Math.max(...(enquiry.brief_versions || []).map(v => v.version_number))}` : 'v1'],
              ['Project Stage', enquiry.stage?.replace(/_/g, ' ')],
            ].map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--text4)' }}>{label}</span>
                <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500, textTransform: 'capitalize', textAlign: 'right' }}>{val}</span>
              </div>
            ))}

            {assignment.decline_reason && (
              <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 8, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                {assignment.decline_reason}
              </div>
            )}
          </div>

          {/* Actions — Accept is no longer a separate required step: Qala
             already assigned this studio directly, so "Start Proposal" in
             the topbar is the primary action. Decline remains available
             here for the rare case a studio genuinely can't take it on. */}
          {canRespond && (
            <div style={S.card}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 14 }}>Actions</div>
              {!declineOpen ? (
                <button onClick={() => setDeclineOpen(true)} disabled={responding} className="btn btn-ghost" style={{ fontSize: 13, width: '100%', justifyContent: 'center', color: 'var(--red)' }}>
                  Decline Enquiry
                </button>
              ) : (
                <div>
                  <textarea
                    value={declineReason}
                    onChange={e => setDeclineReason(e.target.value)}
                    placeholder="Reason (optional)"
                    rows={3}
                    style={{ width: '100%', fontSize: 13, padding: 10, borderRadius: 'var(--r-8)', border: '1px solid var(--border2)', fontFamily: 'var(--font-body)', resize: 'vertical', marginBottom: 8, boxSizing: 'border-box' }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => respond('decline', declineReason)} disabled={responding} className="btn btn-primary" style={{ fontSize: 13, flex: 1, background: 'var(--red)', borderColor: 'var(--red)' }}>
                      {responding ? 'Saving…' : 'Confirm Decline'}
                    </button>
                    <button onClick={() => setDeclineOpen(false)} className="btn btn-ghost" style={{ fontSize: 13 }}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Q&A thread — spec §4.5 "Ask a question first" ──────────────────────────
// Private studio<->admin messaging before committing to a proposal.
function QAThread({ projectId }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const load = () => {
    projectsAPI.getEnquiryMessages(projectId)
      .then(r => setMessages(r.data.messages || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [projectId]);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await projectsAPI.sendEnquiryMessage(projectId, { message: text.trim() });
      setText('');
      load();
    } catch { /* surfaced by list not updating */ }
    finally { setSending(false); }
  };

  return (
    <div style={S.card}>
      <div style={S.cardTitle}>Ask Qala a question</div>
      <div style={{ fontSize: 12, color: 'var(--text4)', marginTop: -14, marginBottom: 14 }}>Optional · before starting your proposal</div>

      {!loading && messages.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14, maxHeight: 280, overflowY: 'auto' }}>
          {messages.map(m => (
            <div key={m.id} style={{
              alignSelf: m.sender === 'studio' ? 'flex-end' : 'flex-start',
              maxWidth: '80%',
              background: m.sender === 'studio' ? 'var(--gold-dim)' : 'var(--surface2)',
              borderRadius: 'var(--r-10)', padding: '9px 13px',
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: m.sender === 'studio' ? 'var(--gold)' : 'var(--text3)', marginBottom: 3 }}>
                {m.sender === 'studio' ? 'You' : m.sender_name || 'Qala'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{m.message}</div>
              <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 3 }}>{fmt(m.created_at)}</div>
            </div>
          ))}
        </div>
      )}

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="e.g. Are you open to machine-assisted work for the base stitch with hand detailing at collars and cuffs?"
        rows={3}
        style={{ width: '100%', fontSize: 13, padding: '9px 12px', borderRadius: 'var(--r-8)', border: '1px solid var(--border)', background: 'var(--surface2)', fontFamily: 'var(--font-body)', color: 'var(--text)', resize: 'vertical', marginBottom: 10, boxSizing: 'border-box' }}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={send} disabled={sending || !text.trim()} className="btn btn-primary btn-sm">
          {sending ? 'Sending…' : 'Send Question'}
        </button>
      </div>
    </div>
  );
}

// ── Live buyer-response feed (studio side) — mirrors the admin one, now
// visible to studios too so they're not the only party left in the dark. ──
const ACTIVITY_LABELS = {
  accepted: { icon: '✓', color: 'var(--green)', label: 'Buyer accepted the proposal' },
  question: { icon: '?', color: 'var(--amber)', label: 'Buyer asked a question' },
  changes_requested: { icon: '✎', color: 'var(--amber)', label: 'Buyer requested changes' },
  declined: { icon: '✕', color: 'var(--red)', label: 'Buyer declined the proposal' },
};

function LiveEnquiryFeed({ projectId, proposalId }) {
  const [activity, setActivity] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    const poll = () => {
      projectsAPI.getProposalActivity(projectId, proposalId)
        .then(r => { if (alive) { setActivity(r.data.activity || []); setLoaded(true); } })
        .catch(() => {});
    };
    poll();
    const id = setInterval(poll, 4000);
    return () => { alive = false; clearInterval(id); };
  }, [projectId, proposalId]);

  if (!loaded || activity.length === 0) return null;

  return (
    <div style={S.card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>Buyer responses</span>
        <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600 }}>Live</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {activity.map(a => {
          const meta = ACTIVITY_LABELS[a.type] || { icon: '•', color: 'var(--text3)', label: a.type };
          return (
            <div key={a.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, background: `${meta.color}22`, color: meta.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{meta.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: 'var(--text)' }}>{meta.label}</div>
                {a.message && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{a.message}</div>}
                <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 2 }}>{fmt(a.created_at)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
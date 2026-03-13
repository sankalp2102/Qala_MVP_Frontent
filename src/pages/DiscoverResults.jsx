import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { discoveryAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import RecommendationCard from '../components/discovery/RecommendationCard';
import AuthGateModal from '../components/AuthGateModal';
import qalaLogo from '../assets/qala-logo.png';

export default function DiscoverResults() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [data,     setData]    = useState(null);
  const [loading,  setLoading] = useState(true);
  const [error,    setError]   = useState('');
  const [authGate, setAuthGate] = useState(null);
  const [applying, setApplying] = useState(null);
  const carouselRef = useRef();

  // Custom inquiry form state
  const [inquiryOpen,       setInquiryOpen]       = useState(false);
  const [inquiryName,       setInquiryName]       = useState('');
  const [inquiryEmail,      setInquiryEmail]      = useState('');
  const [inquiryMessage,    setInquiryMessage]    = useState('');
  const [inquirySubmitting, setInquirySubmitting] = useState(false);
  const [inquiryDone,       setInquiryDone]       = useState(false);
  const [inquiryError,      setInquiryError]      = useState('');

  const load = async () => {
    const tok = discoveryAPI.getStoredSession();
    if (!tok) { nav('/discover'); return; }
    try {
      const r = await discoveryAPI.getRecommendations(tok);
      setData(r.data);
    } catch (e) {
      if (e.response?.status === 404) nav('/discover');
      else setError('Could not load recommendations. Please try again.');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const submitInquiry = async e => {
    e.preventDefault();
    setInquiryError('');
    setInquirySubmitting(true);
    try {
      const tok = discoveryAPI.getStoredSession();
      await discoveryAPI.submitCustomInquiry({
        name:          inquiryName,
        email:         inquiryEmail,
        message:       inquiryMessage,
        session_token: tok || '',
      });
      setInquiryDone(true);
    } catch {
      setInquiryError('Something went wrong. Please try again.');
    } finally {
      setInquirySubmitting(false);
    }
  };

  const applySuggestion = async suggestion => {
    const tok = discoveryAPI.getStoredSession();
    if (!tok) return;
    setApplying(suggestion.change_type);
    try {
      const r = await discoveryAPI.editRecommendations(tok, {
        apply_suggestion: suggestion.apply_patch,
      });
      setData(r.data);
    } catch {} finally { setApplying(null); }
  };

  const handleContact = studio => {
    if (user) {
      nav('/studio/' + studio.studio_id);
    } else {
      setAuthGate({ studio });
    }
  };

  const scroll = dir => {
    if (!carouselRef.current) return;
    carouselRef.current.scrollBy({ left: dir * 380, behavior: 'smooth' });
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16,
    }}>
      <div style={{ position: 'relative', width: 60, height: 60 }}>
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          border: '1px solid rgba(196,110,73,0.15)',
          animation: 'spin 2s linear infinite',
        }} />
        <div style={{
          position: 'absolute', inset: 8, borderRadius: '50%',
          border: '1px solid rgba(196,110,73,0.25)',
          animation: 'spin 1.4s linear infinite reverse',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <img src={qalaLogo} alt="Qala" style={{ height: 22, width: 'auto' }} />
        </div>
      </div>
      <div style={{ fontSize: 13, color: 'var(--text3)', letterSpacing: '0.06em' }}>
        Finding your studios…
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );

  // ── Error ────────────────────────────────────────────────────────────────
  if (error) return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 16,
    }}>
      <div style={{ fontSize: 13, color: 'var(--red)' }}>{error}</div>
      <button onClick={load} className="btn btn-ghost btn-sm">Try again</button>
    </div>
  );

  const recs    = data?.recommendations       || [];
  const bonus   = data?.bonus_visual_matches  || [];
  const suggs   = data?.zero_match_suggestions || [];
  const summary = data?.buyer_summary         || {};

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: none } }
        @keyframes spin   { to { transform: rotate(360deg) } }
        .fade-in          { animation: fadeUp 0.5s ease both; }
        .sugg-chip:hover  { border-color: rgba(196,110,73,0.5) !important; background: rgba(196,110,73,0.05) !important; }
        .scroll-btn:hover { background: rgba(196,110,73,0.1) !important; }
        .back-btn:hover   { color: var(--text) !important; }
        .inquiry-btn:hover { border-color: rgba(196,110,73,0.6) !important; background: rgba(196,110,73,0.05) !important; }
      `}</style>

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 40px', borderBottom: '1px solid var(--border)',
        position: 'sticky', top: 0, background: 'rgba(248,245,241,0.95)',
        backdropFilter: 'blur(12px)', zIndex: 20,
      }}>
        <button
          className="back-btn"
          onClick={() => nav('/discover')}
          style={{
            background: 'none', border: 'none', color: 'var(--text3)',
            fontSize: 13, cursor: 'pointer', letterSpacing: '0.06em',
            display: 'flex', alignItems: 'center', gap: 6,
            fontFamily: 'var(--font-body)', transition: 'color 0.2s',
          }}
        >← Edit answers</button>

        <img src={qalaLogo} alt="Qala" style={{ height: 36, width: 'auto', display: 'block' }} />

        <button
          onClick={() => { discoveryAPI.clearSession(); nav('/discover'); }}
          style={{
            background: 'none', border: '1px solid var(--border)',
            color: 'var(--text3)', fontSize: 11, cursor: 'pointer',
            padding: '6px 14px', borderRadius: 6, letterSpacing: '0.06em',
            fontFamily: 'var(--font-body)',
          }}
        >Start over</button>
      </div>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <div style={{ padding: '0 0 100px' }}>

        {/* Buyer summary strip */}
        {summary.display && (
          <div
            className="fade-in"
            style={{
              marginTop: 40, marginLeft: 40, marginRight: 40, padding: '16px 24px',
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 12, display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: recs.length > 0 ? 'var(--green)' : 'var(--amber)',
              }} />
              <div>
                <div style={{ fontSize: 10, color: 'var(--text4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>
                  Your search
                </div>
                <div style={{ fontSize: 14, color: 'var(--text2)', fontWeight: 500 }}>
                  {summary.display}
                </div>
              </div>
            </div>
            <button
              onClick={() => nav('/discover')}
              style={{
                background: 'none', border: '1px solid var(--border2)',
                color: 'var(--text3)', fontSize: 12, cursor: 'pointer',
                padding: '6px 16px', borderRadius: 6, fontFamily: 'var(--font-body)',
              }}
            >Edit →</button>
          </div>
        )}

        {/* Zero match state */}
        {data?.zero_match && recs.length === 0 && (
          <div className="fade-in" style={{ marginTop: 48, textAlign: 'center', padding: '0 40px' }}>
            <div style={{ fontSize: 40, marginBottom: 20 }}>🔍</div>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontSize: 32,
              fontWeight: 700, color: 'var(--text)', marginBottom: 12,
            }}>
              No exact matches found
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text3)', maxWidth: 480, margin: '0 auto 40px', lineHeight: 1.7 }}>
              Your combination is quite specific. Try adjusting one of these to unlock matching studios:
            </p>
            {suggs.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
                {suggs.map((s, i) => (
                  <button
                    key={i}
                    className="sugg-chip"
                    onClick={() => applySuggestion(s)}
                    disabled={applying === s.change_type}
                    style={{
                      padding: '12px 20px', borderRadius: 24,
                      border: '1px solid var(--border2)',
                      background: 'rgba(255,255,255,0.8)', cursor: 'pointer',
                      fontFamily: 'var(--font-body)', transition: 'all 0.15s',
                      display: 'flex', alignItems: 'center', gap: 10,
                    }}
                  >
                    {applying === s.change_type && (
                      <span className="spinner" style={{ width: 12, height: 12 }} />
                    )}
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{s.message}</div>
                      {s.studios_count > 0 && (
                        <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 2 }}>
                          {s.studios_count} studio{s.studios_count !== 1 ? 's' : ''} available
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Main recommendations */}
        {recs.length > 0 && (
          <div className="fade-in" style={{ marginTop: 52 }}>
            <div style={{ textAlign: 'center', marginBottom: 28, padding: '0 40px' }}>
              <div style={{ fontSize: 10, color: 'var(--text4)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>
                  Matched studios
                </div>
                <h2 style={{
                  fontFamily: 'var(--font-display)', fontSize: 'clamp(22px,2.5vw,34px)',
                  fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em',
                  lineHeight: 1.3, maxWidth: 600, margin: '0 auto',
                }}>
                  Based on what you've shared, here are a few studios that could be right for you
                </h2>
              {/* Dot indicators */}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center', marginTop: 16 }}>
                {recs.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      if (!carouselRef.current) return;
                      const cardW = carouselRef.current.offsetWidth;
                      carouselRef.current.scrollTo({ left: i * (cardW + 20), behavior: 'smooth' });
                    }}
                    style={{
                      width: 8, height: 8, borderRadius: '50%', border: 'none',
                      background: 'var(--border2)', cursor: 'pointer', padding: 0,
                      transition: 'background 0.2s',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Full-width snap carousel */}
            <div
              ref={carouselRef}
              style={{
                display: 'flex', gap: 20,
                overflowX: 'auto', paddingBottom: 24,
                scrollbarWidth: 'none', msOverflowStyle: 'none',
                scrollSnapType: 'x mandatory',
                paddingLeft: 40, paddingRight: 40,
              }}
            >
              {recs.map((rec, i) => (
                <div
                  key={rec.studio_id || i}
                  style={{
                    minWidth: 'calc(100vw - 120px)',
                    maxWidth: 'calc(100vw - 120px)',
                    flex: '0 0 calc(100vw - 120px)',
                    scrollSnapAlign: 'start',
                    animation: `fadeUp 0.5s ease ${0.1 + i * 0.08}s both`,
                  }}
                >
                  <RecommendationCard
                    rec={rec}
                    position={i + 1}
                    onContact={handleContact}
                    isBonus={false}
                  />
                </div>
              ))}
            </div>

            {/* Arrow nav below */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 16 }}>
              {['←', '→'].map((arrow, i) => (
                <button
                  key={arrow}
                  className="scroll-btn"
                  onClick={() => {
                    if (!carouselRef.current) return;
                    const cardW = carouselRef.current.offsetWidth;
                    carouselRef.current.scrollBy({ left: (i === 0 ? -1 : 1) * (cardW + 20), behavior: 'smooth' });
                  }}
                  style={{
                    width: 44, height: 44, borderRadius: '50%',
                    border: '1px solid var(--border2)', background: 'transparent',
                    color: 'var(--text2)', cursor: 'pointer', fontSize: 16,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.15s',
                  }}
                >{arrow}</button>
              ))}
            </div>
          </div>
        )}

        {/* Bonus visual matches */}
        {bonus.length > 0 && (
          <div className="fade-in" style={{ marginTop: 64, padding: '0 40px' }}>
            <div style={{ marginBottom: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: 'var(--text4)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>
                Also worth exploring
              </div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--text2)' }}>
                Visual matches
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text4)', marginTop: 6 }}>
                These studios match your aesthetic but differ on some practical criteria.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20, marginTop: 24 }}>
              {bonus.map((rec, i) => (
                <div key={rec.studio_id || i} style={{ animation: `fadeUp 0.5s ease ${0.1 + i * 0.06}s both` }}>
                  <RecommendationCard
                    rec={rec}
                    position={i + 1}
                    onContact={handleContact}
                    isBonus={true}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {recs.length === 0 && bonus.length === 0 && !data?.zero_match && (
          <div style={{ textAlign: 'center', padding: '80px 40px' }}>
            <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 24 }}>
              No studios are registered yet. Check back soon.
            </div>
            <button onClick={() => nav('/')} className="btn btn-ghost btn-sm">
              Back to home
            </button>
          </div>
        )}

        {/* ── Custom Inquiry Section ───────────────────────────────────── */}
        <div style={{
          marginTop: 80,
          borderTop: '1px solid var(--border)',
          paddingTop: 60,
          paddingBottom: 80,
          paddingLeft: 40,
          paddingRight: 40,
        }}>
          <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
            <div style={{
              fontSize: 10, color: 'var(--text4)', letterSpacing: '0.14em',
              textTransform: 'uppercase', fontWeight: 600, marginBottom: 12,
            }}>
              Not finding what you need?
            </div>
            <h3 style={{
              fontFamily: 'var(--font-display)', fontSize: 'clamp(22px, 2.5vw, 32px)',
              fontWeight: 700, color: 'var(--text)', marginBottom: 10, letterSpacing: '-0.01em',
            }}>
              Tell us directly — we'll find<br />the right studio for you.
            </h3>
            <p style={{ fontSize: 14, color: 'var(--text3)', lineHeight: 1.7, marginBottom: 28 }}>
              Describe what you're looking for and our team will reach out personally with hand-picked options.
            </p>

            {/* CTA button */}
            {!inquiryOpen && !inquiryDone && (
              <button
                className="inquiry-btn"
                onClick={() => setInquiryOpen(true)}
                style={{
                  padding: '12px 28px', background: 'transparent',
                  border: '1px solid rgba(196,110,73,0.3)', borderRadius: 8,
                  color: 'var(--text)', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'var(--font-body)',
                  transition: 'border-color 0.2s, background 0.2s',
                  letterSpacing: '0.03em',
                }}
              >
                Send a custom requirement →
              </button>
            )}

            {/* Success state */}
            {inquiryDone && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 16,
                padding: '20px 24px',
                background: 'rgba(90,232,122,0.06)',
                border: '1px solid rgba(90,232,122,0.2)',
                borderLeft: '3px solid var(--green)',
                borderRadius: 10,
                animation: 'fadeUp 0.4s ease both',
              }}>
                <div style={{ fontSize: 22, lineHeight: 1 }}>✓</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--green)', marginBottom: 4 }}>
                    We've received your requirement
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.6 }}>
                    The Qala team will review your brief and get back to you at{' '}
                    <strong style={{ color: 'var(--text2)' }}>{inquiryEmail}</strong>{' '}
                    within 1–2 business days.
                  </div>
                </div>
              </div>
            )}

            {/* Inquiry form */}
            {inquiryOpen && !inquiryDone && (
              <form
                onSubmit={submitInquiry}
                style={{
                  display: 'flex', flexDirection: 'column', gap: 16,
                  background: 'var(--surface)',
                  border: '1px solid var(--border2)',
                  borderRadius: 12, padding: '28px',
                  animation: 'fadeUp 0.3s ease both',
                }}
              >
                <div style={{ display: 'flex', gap: 12 }}>
                  <div className="field" style={{ flex: 1 }}>
                    <label>First name</label>
                    <input
                      type="text"
                      placeholder="Your name"
                      value={inquiryName}
                      onChange={e => setInquiryName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="field" style={{ flex: 1 }}>
                    <label>Email</label>
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={inquiryEmail}
                      onChange={e => setInquiryEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="field">
                  <label>What are you looking for?</label>
                  <textarea
                    placeholder="Tell us about your project — fabric preferences, craft, quantity, timeline, design stage, anything that helps..."
                    value={inquiryMessage}
                    onChange={e => setInquiryMessage(e.target.value)}
                    required
                    style={{ minHeight: 120, resize: 'vertical' }}
                  />
                </div>

                {inquiryError && (
                  <div style={{
                    padding: '10px 14px', fontSize: 13, color: 'var(--red)',
                    background: 'var(--red-dim)', border: '1px solid rgba(255,85,85,0.3)',
                    borderLeft: '3px solid var(--red)', borderRadius: 8,
                  }}>
                    {inquiryError}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <button
                    type="submit"
                    disabled={inquirySubmitting}
                    style={{
                      padding: '11px 28px',
                      background: inquirySubmitting ? 'var(--surface3)' : 'var(--gold)',
                      color: inquirySubmitting ? 'var(--text4)' : '#fff',
                      border: 'none', borderRadius: 'var(--radius)',
                      fontSize: 13, fontWeight: 500,
                      cursor: inquirySubmitting ? 'default' : 'pointer',
                      fontFamily: 'var(--font-body)', transition: 'background 0.18s ease',
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}
                  >
                    {inquirySubmitting && (
                      <span className="spinner" style={{ width: 14, height: 14, borderColor: 'var(--surface4)', borderTopColor: '#555' }} />
                    )}
                    {inquirySubmitting ? 'Sending…' : 'Send to Qala team →'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setInquiryOpen(false); setInquiryError(''); }}
                    style={{
                      padding: '11px 18px', background: 'none',
                      border: '1px solid var(--border)', borderRadius: 8,
                      color: 'var(--text3)', fontSize: 13, cursor: 'pointer',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    Cancel
                  </button>
                </div>

                <p style={{ fontSize: 11, color: 'var(--text4)', lineHeight: 1.6, margin: 0 }}>
                  Your questionnaire answers will be shared with the Qala team automatically so you don't need to repeat yourself.
                </p>
              </form>
            )}
          </div>
        </div>

      </div>

      {/* ── Browse Full Directory CTA ─────────────────────────── */}
      <div style={{
        borderTop: '1px solid var(--border)',
        padding: '64px 48px',
        textAlign: 'center',
        background: 'var(--bg)',
      }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 11, fontWeight: 500,
          letterSpacing: '0.16em', textTransform: 'uppercase',
          color: 'var(--text4)', marginBottom: 18,
        }}>
          Not what you were looking for?
        </div>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(26px, 3.5vw, 38px)',
          fontWeight: 300,
          color: 'var(--text)',
          lineHeight: 1.15,
          marginBottom: 14,
          letterSpacing: '-0.01em',
        }}>
          Browse the full{' '}
          <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Studio Directory</em>
        </h2>
        <p style={{
          fontFamily: 'var(--font-body)',
          fontSize: 14, fontWeight: 300,
          color: 'var(--text3)', lineHeight: 1.7,
          maxWidth: 400, margin: '0 auto 32px',
        }}>
          Explore every studio on Qala — filter by craft, fabric, and product type at your own pace.
        </p>
        <button
          onClick={() => nav('/directory')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '12px 28px',
            borderRadius: 'var(--radius)',
            border: '1.5px solid var(--text)',
            background: 'transparent',
            color: 'var(--text)',
            fontSize: 13, fontWeight: 500,
            fontFamily: 'var(--font-body)',
            letterSpacing: '0.04em',
            cursor: 'pointer',
            transition: 'background 0.18s ease, color 0.18s ease, border-color 0.18s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'var(--text)';
            e.currentTarget.style.color = 'var(--bg)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text)';
          }}
        >
          Browse all studios →
        </button>
      </div>

      {/* Auth gate modal */}
      {authGate && (
        <AuthGateModal
          studioName={authGate.studio?.studio_name}
          onClose={() => setAuthGate(null)}
          onSuccess={() => { setAuthGate(null); nav('/studio/' + authGate.studio?.studio_id); }}
        />
      )}
    </div>
  );
}
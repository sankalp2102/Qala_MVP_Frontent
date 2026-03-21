import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { discoveryAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import RecommendationCard from '../components/discovery/RecommendationCard';
import AuthGateModal from '../components/AuthGateModal';
import qalaLogo from '../assets/qala-logo.png';

// ─── Calendar icon ──────────────────────────────────────────────────────────
const CalendarIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

// ─── Pencil icon ────────────────────────────────────────────────────────────
const PencilIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

// ─── DatePicker component ───────────────────────────────────────────────────
function DatePicker({ selectedDates, setSelectedDates }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewYear, setViewYear] = React.useState(today.getFullYear());
  const [viewMonth, setViewMonth] = React.useState(today.getMonth());
  const [open, setOpen] = React.useState(false);

  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const dayNames = ['Su','Mo','Tu','We','Th','Fr','Sa'];

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const toKey = (y, m, d) => `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

  const handleDayClick = (day) => {
    if (!day) return;
    const clickedKey = toKey(viewYear, viewMonth, day);
    const clickedDate = new Date(viewYear, viewMonth, day);

    if (selectedDates.includes(clickedKey)) {
      // Deselect this date
      setSelectedDates(selectedDates.filter(d => d !== clickedKey));
    } else if (selectedDates.length === 0) {
      // First selection ever — auto-select clicked + next 2 days
      const toAdd = [clickedKey];
      for (let i = 1; i <= 2; i++) {
        const next = new Date(clickedDate);
        next.setDate(next.getDate() + i);
        toAdd.push(toKey(next.getFullYear(), next.getMonth(), next.getDate()));
      }
      setSelectedDates(toAdd.sort());
    } else {
      // Subsequent selection — add just this one date
      setSelectedDates([...selectedDates, clickedKey].sort());
    }
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const formatSelected = (key) => {
    const [y, m, d] = key.split('-');
    return new Date(y, m-1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  return (
    <div style={{ position: 'relative' }}>
      <label style={{ display: 'block', fontSize: 12, color: 'var(--text3)', marginBottom: 6, fontWeight: 500 }}>
        Preferred dates <span style={{ fontWeight: 400, color: 'var(--text4)' }}>(optional)</span>
      </label>

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '9px 12px', borderRadius: 8,
          border: '1px solid var(--border2)', background: 'var(--bg)',
          fontFamily: 'var(--font-body)', fontSize: 13, color: selectedDates.length ? 'var(--text)' : 'var(--text4)',
          cursor: 'pointer', textAlign: 'left',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <span>
          {selectedDates.length === 0
            ? 'Select dates…'
            : selectedDates.map(formatSelected).join('  ·  ')}
        </span>
        <span style={{ fontSize: 10, color: 'var(--text4)' }}>{open ? '▲' : '▼'}</span>
      </button>

      {/* Selected chips */}
      {selectedDates.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {selectedDates.map(key => (
            <span key={key} style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '3px 10px', borderRadius: 20,
              background: 'rgba(196,110,73,0.1)', border: '1px solid rgba(196,110,73,0.25)',
              fontSize: 12, color: 'var(--text2)',
            }}>
              {formatSelected(key)}
              <button
                type="button"
                onClick={() => setSelectedDates(selectedDates.filter(d => d !== key))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text4)', fontSize: 13, padding: 0, lineHeight: 1, display: 'flex', alignItems: 'center' }}
              >×</button>
            </span>
          ))}
          <button
            type="button"
            onClick={() => setSelectedDates([])}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text4)', fontSize: 11, padding: '3px 6px', fontFamily: 'var(--font-body)' }}
          >Clear all</button>
        </div>
      )}

      {/* Calendar dropdown */}
      {open && (
        <div style={{
          position: 'absolute', zIndex: 50, top: 'calc(100% + 8px)', left: 0,
          background: 'var(--surface)', border: '1px solid var(--border2)',
          borderRadius: 12, padding: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          minWidth: 280,
        }}>
          {/* Month nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <button type="button" onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--text2)', padding: '2px 8px' }}>‹</button>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-body)' }}>
              {monthNames[viewMonth]} {viewYear}
            </span>
            <button type="button" onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--text2)', padding: '2px 8px' }}>›</button>
          </div>

          {/* Day names */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
            {dayNames.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 10, color: 'var(--text4)', fontWeight: 600, padding: '2px 0', letterSpacing: '0.05em' }}>{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {cells.map((day, idx) => {
              if (!day) return <div key={idx} />;
              const key = toKey(viewYear, viewMonth, day);
              const isSelected = selectedDates.includes(key);
              const isPast = new Date(viewYear, viewMonth, day) < today;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => !isPast && handleDayClick(day)}
                  style={{
                    width: '100%', aspectRatio: '1', borderRadius: 6, border: 'none',
                    background: isSelected ? '#C46E49' : 'transparent',
                    color: isPast ? 'var(--text4)' : isSelected ? '#fff' : 'var(--text)',
                    cursor: isPast ? 'default' : 'pointer',
                    fontSize: 13, fontFamily: 'var(--font-body)',
                    opacity: isPast ? 0.35 : 1,
                    fontWeight: isSelected ? 600 : 400,
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (!isPast && !isSelected) e.currentTarget.style.background = 'rgba(196,110,73,0.12)'; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <p style={{ fontSize: 11, color: 'var(--text4)', marginTop: 10, marginBottom: 0, lineHeight: 1.5 }}>
            Click a date to select it + next 2 days. Click again to deselect.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Shared inquiry form ────────────────────────────────────────────────────
function InquiryForm({ name, setName, email, setEmail, selectedDates, setSelectedDates, message, setMessage, error, submitting, onSubmit, onCancel }) {
  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeUp 0.3s ease both', textAlign: 'left' }}>
      <div style={{ display: 'flex', gap: 12 }}>
        <div className="field" style={{ flex: 1 }}>
          <label>First name</label>
          <input type="text" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} required />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label>Email</label>
          <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
      </div>
      <DatePicker selectedDates={selectedDates} setSelectedDates={setSelectedDates} />
      <div className="field">
        <label>Additional comments</label>
        <textarea placeholder="Tell us about your project — fabric preferences, craft, quantity, timeline, design stage, anything that helps..." value={message} onChange={e => setMessage(e.target.value)} style={{ minHeight: 100, resize: 'vertical' }} />
      </div>
      {error && (
        <div style={{ padding: '10px 14px', fontSize: 13, color: 'var(--red)', background: 'var(--red-dim)', border: '1px solid rgba(255,85,85,0.3)', borderLeft: '3px solid var(--red)', borderRadius: 8 }}>
          {error}
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button type="submit" disabled={submitting} style={{
          padding: '11px 28px', background: submitting ? 'var(--surface3)' : '#1A1612',
          color: submitting ? 'var(--text4)' : '#F5F0E8', border: 'none', borderRadius: 8,
          fontSize: 13, fontWeight: 500, cursor: submitting ? 'default' : 'pointer',
          fontFamily: 'var(--font-body)', transition: 'background 0.18s ease',
          display: 'flex', alignItems: 'center', gap: 8,
        }}
          onMouseEnter={e => { if (!submitting) e.target.style.background = '#C46E49'; }}
          onMouseLeave={e => { if (!submitting) e.target.style.background = '#1A1612'; }}
        >
          {submitting && <span className="spinner" style={{ width: 14, height: 14, borderColor: 'var(--surface4)', borderTopColor: '#555' }} />}
          {submitting ? 'Sending…' : 'Send to Qala team →'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} style={{ padding: '11px 18px', background: 'none', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text3)', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Cancel</button>
        )}
      </div>
      <p style={{ fontSize: 11, color: 'var(--text4)', lineHeight: 1.6, margin: 0 }}>Your questionnaire answers will be shared with the Qala team automatically.</p>
    </form>
  );
}

// ─── Directory CTA card ─────────────────────────────────────────────────────
function DirectoryCTACard({ onNavigate }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16,
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', height: '100%',
        textAlign: 'center', padding: '48px 36px',
        transition: 'border-color 0.2s',
        borderColor: hovered ? 'var(--border3)' : 'var(--border)',
      }}
    >
      <div style={{ fontSize: 40, marginBottom: 20, opacity: 0.3 }}>🏛</div>
      <div style={{ fontSize: 10, color: 'var(--text4)', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 10 }}>
        Want to explore more?
      </div>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(22px, 2.5vw, 30px)', fontWeight: 300, color: 'var(--text)', lineHeight: 1.2, marginBottom: 10, letterSpacing: '-0.01em' }}>
        Browse the full <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>Studio Directory</em>
      </h3>
      <p style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.7, maxWidth: 320, marginBottom: 28 }}>
        Explore every studio on Qala — filter by craft, fabric, and product type at your own pace.
      </p>
      <button onClick={onNavigate} style={{
        display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 28px', borderRadius: 8,
        background: '#1A1612', color: '#F5F0E8', border: 'none', fontSize: 13, fontWeight: 500,
        fontFamily: 'var(--font-body)', letterSpacing: '0.04em', cursor: 'pointer', transition: 'background 0.18s ease',
      }}
        onMouseEnter={e => e.currentTarget.style.background = '#C46E49'}
        onMouseLeave={e => e.currentTarget.style.background = '#1A1612'}
      >Browse all studios →</button>
    </div>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────
export default function DiscoverResults() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [authGate, setAuthGate] = useState(null);
  const [applying, setApplying] = useState(null);
  const carouselRef = useRef();
  const [activeCard, setActiveCard] = useState(0);

  const [headerInquiryOpen, setHeaderInquiryOpen] = useState(false);
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [inquiryName, setInquiryName] = useState('');
  const [inquiryEmail, setInquiryEmail] = useState('');
  const [inquiryDates, setInquiryDates] = useState([]);
  const [inquiryMessage, setInquiryMessage] = useState('');
  const [inquirySubmitting, setInquirySubmitting] = useState(false);
  const [inquiryDone, setInquiryDone] = useState(false);
  const [inquiryError, setInquiryError] = useState('');

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
      const dateLine = inquiryDates.length > 0
        ? '\nPreferred dates: ' + inquiryDates.map(d => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })).join(', ')
        : '';
      const fullMessage = [inquiryMessage, dateLine].filter(Boolean).join('');
      await discoveryAPI.submitCustomInquiry({ name: inquiryName, email: inquiryEmail, message: fullMessage, session_token: tok || '' });
      setInquiryDone(true);
      setHeaderInquiryOpen(false);
      setInquiryOpen(false);
    } catch {
      setInquiryError('Something went wrong. Please try again.');
    } finally { setInquirySubmitting(false); }
  };

  const applySuggestion = async suggestion => {
    const tok = discoveryAPI.getStoredSession();
    if (!tok) return;
    setApplying(suggestion.change_type);
    try {
      const r = await discoveryAPI.editRecommendations(tok, { apply_suggestion: suggestion.apply_patch });
      setData(r.data);
    } catch {} finally { setApplying(null); }
  };

  const handleContact = studio => {
    if (user) nav('/studio/' + studio.studio_id);
    else setAuthGate({ studio });
  };

  const recs = data?.recommendations || [];
  const bonus = data?.bonus_visual_matches || [];
  const suggs = data?.zero_match_suggestions || [];
  const summary = data?.buyer_summary || {};
  const totalCards = recs.length > 0 ? recs.length + 1 : 0;

  const scrollToCard = useCallback((index) => {
    if (!carouselRef.current || totalCards === 0) return;
    const clamped = Math.max(0, Math.min(index, totalCards - 1));
    setActiveCard(clamped);
    const card = carouselRef.current.children[clamped];
    if (card) {
      const scrollLeft = card.offsetLeft - (carouselRef.current.offsetWidth - card.offsetWidth) / 2;
      carouselRef.current.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
  }, [totalCards]);

  // ── Loading ──
  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <div style={{ position: 'relative', width: 60, height: 60 }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1px solid rgba(196,110,73,0.15)', animation: 'spin 2s linear infinite' }} />
        <div style={{ position: 'absolute', inset: 8, borderRadius: '50%', border: '1px solid rgba(196,110,73,0.25)', animation: 'spin 1.4s linear infinite reverse' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src={qalaLogo} alt="Qala" style={{ height: 22, width: 'auto' }} />
        </div>
      </div>
      <div style={{ fontSize: 13, color: 'var(--text3)', letterSpacing: '0.06em' }}>Finding your studios…</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );

  // ── Error ──
  if (error) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 13, color: 'var(--red)' }}>{error}</div>
      <button onClick={load} className="btn btn-ghost btn-sm">Try again</button>
    </div>
  );

  // ── Render ──
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: none } }
        @keyframes spin   { to { transform: rotate(360deg) } }
        .fade-in { animation: fadeUp 0.5s ease both; }
        .sugg-chip:hover { border-color: rgba(196,110,73,0.5) !important; background: rgba(196,110,73,0.05) !important; }
        .help-btn:hover { background: #C46E49 !important; }
        .carousel-arrow:hover:not(:disabled) { background: rgba(26,22,18,0.06) !important; border-color: var(--border3) !important; }
        .carousel-scroll::-webkit-scrollbar { display: none; }
        .pencil-btn:hover { color: #C46E49 !important; }
      `}</style>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        padding: '0 24px',
        height: 64,
        borderBottom: '1px solid var(--border)',
        background: 'rgba(248,245,241,0.97)',
        backdropFilter: 'blur(12px)',
        zIndex: 20,
        flexShrink: 0,
      }}>
        {/* Left — logo */}
        <div>
          <img
            src={qalaLogo}
            alt="Qala"
            style={{ height: 32, width: 'auto', cursor: 'pointer', display: 'block' }}
            onClick={() => nav('/')}
          />
        </div>

        {/* Center — search pill + pencil */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, justifyContent: 'center' }}>
          {summary.display ? (
            <>
              <span style={{
                fontSize: 'clamp(13px, 1.4vw, 17px)',
                fontWeight: 600,
                color: 'var(--text)',
                fontFamily: 'var(--font-body)',
                letterSpacing: '-0.01em',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '50vw',
              }}>
                {summary.display}
              </span>
              <button
                className="pencil-btn"
                onClick={() => nav('/discover')}
                title="Edit search"
                style={{
                  background: 'none', border: 'none', padding: '3px 5px',
                  cursor: 'pointer', color: 'var(--text3)',
                  display: 'flex', alignItems: 'center',
                  transition: 'color 0.2s', flexShrink: 0,
                }}
              >
                <PencilIcon />
              </button>
            </>
          ) : (
            <span style={{ fontSize: 13, color: 'var(--text3)', fontFamily: 'var(--font-body)' }}>
              Studio matches
            </span>
          )}
        </div>

        {/* Right — Help Me Decide */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="help-btn" onClick={() => setHeaderInquiryOpen(true)} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '9px 20px', borderRadius: 8, background: '#1A1612', color: '#F5F0E8',
            border: 'none', fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-body)',
            letterSpacing: '0.03em', cursor: 'pointer', transition: 'background 0.2s',
            whiteSpace: 'nowrap',
          }}>
            <CalendarIcon /> Help Me Decide
          </button>
        </div>
      </div>

      {/* ── Help Me Decide modal ───────────────────────────────────────── */}
      {headerInquiryOpen && !inquiryDone && (
        <div
          onClick={() => setHeaderInquiryOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(15,10,8,0.5)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
            animation: 'fadeUp 0.2s ease both',
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{
            width: '100%', maxWidth: 520, background: 'var(--surface)', borderRadius: 16,
            border: '1px solid var(--border)', padding: '32px 28px 8px',
            boxShadow: '0 24px 80px rgba(0,0,0,0.2)',
          }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400, color: 'var(--text)', marginBottom: 6, textAlign: 'center' }}>
              Help Me Decide
            </div>
            <p style={{ fontSize: 13, color: 'var(--text3)', textAlign: 'center', marginBottom: 20, lineHeight: 1.6 }}>
              Share your details and our team will reach out with hand-picked options.
            </p>
            <InquiryForm
              name={inquiryName} setName={setInquiryName}
              email={inquiryEmail} setEmail={setInquiryEmail}
              selectedDates={inquiryDates} setSelectedDates={setInquiryDates}
              message={inquiryMessage} setMessage={setInquiryMessage}
              error={inquiryError} submitting={inquirySubmitting}
              onSubmit={submitInquiry}
              onCancel={() => { setHeaderInquiryOpen(false); setInquiryError(''); }}
            />
          </div>
        </div>
      )}

      {/* ── Body — heading + carousel fills remaining height ──────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* Subheading — compact, below header */}
        {recs.length > 0 && (
          <div className="fade-in" style={{ textAlign: 'center', padding: '16px 40px 10px', flexShrink: 0 }}>
            <p style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(16px, 1.8vw, 22px)',
              fontWeight: 400, color: 'var(--text2)',
              letterSpacing: '-0.01em', lineHeight: 1.3,
              margin: 0,
            }}>
              Based on what you've shared, here are studios that could be right for you
            </p>
          </div>
        )}

        {/* Zero match */}
        {data?.zero_match && recs.length === 0 && (
          <div className="fade-in" style={{ textAlign: 'center', padding: '40px 60px 24px', flexShrink: 0 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(20px, 2.5vw, 30px)', fontWeight: 400, color: 'var(--text)', marginBottom: 12 }}>
              No exact matches found
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text3)', maxWidth: 480, margin: '0 auto 28px', lineHeight: 1.7 }}>
              Your combination is quite specific. Try adjusting one of these:
            </p>
            {suggs.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginBottom: 28 }}>
                {suggs.map((s, i) => (
                  <button key={i} className="sugg-chip" onClick={() => applySuggestion(s)} disabled={applying === s.change_type} style={{
                    padding: '12px 20px', borderRadius: 24, border: '1px solid var(--border2)',
                    background: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontFamily: 'var(--font-body)',
                    transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    {applying === s.change_type && <span className="spinner" style={{ width: 12, height: 12 }} />}
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{s.message}</div>
                      {s.studios_count > 0 && <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 2 }}>{s.studios_count} studio{s.studios_count !== 1 ? 's' : ''} available</div>}
                    </div>
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => nav('/directory')} style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 28px', borderRadius: 8,
              background: '#1A1612', color: '#F5F0E8', border: 'none', fontSize: 13, fontWeight: 500,
              fontFamily: 'var(--font-body)', letterSpacing: '0.04em', cursor: 'pointer', transition: 'background 0.18s ease',
            }}
              onMouseEnter={e => e.currentTarget.style.background = '#C46E49'}
              onMouseLeave={e => e.currentTarget.style.background = '#1A1612'}
            >Browse all studios →</button>
          </div>
        )}

        {/* ── Carousel ────────────────────────────────────────────────── */}
        {recs.length > 0 && (
          <div className="fade-in" style={{
            /* Explicit height: viewport minus header(64) minus subheading(~68) minus counter area(40) */
            height: 'calc(100vh - 140px)',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
          }}>
            {/* Left arrow */}
            <button className="carousel-arrow" onClick={() => scrollToCard(activeCard - 1)} disabled={activeCard === 0} style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 10,
              width: 44, height: 44, borderRadius: '50%',
              border: '1px solid var(--border2)', background: 'rgba(248,245,241,0.95)', backdropFilter: 'blur(8px)',
              color: activeCard === 0 ? 'var(--text4)' : 'var(--text)',
              cursor: activeCard === 0 ? 'default' : 'pointer',
              fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s', opacity: activeCard === 0 ? 0.3 : 1,
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}>←</button>

            {/* Cards scroll container — explicit height minus counter space */}
            <div
              ref={carouselRef}
              className="carousel-scroll"
              style={{
                display: 'flex',
                gap: 24,
                overflowX: 'auto',
                overflowY: 'hidden',
                scrollSnapType: 'x mandatory',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                padding: '8px 68px',
                height: 'calc(100% - 32px)',  /* leave 32px for counter */
                alignItems: 'stretch',
              }}
            >
              {recs.map((rec, i) => (
                <div key={rec.studio_id || i} style={{
                  minWidth: 'calc(100vw - 160px)',
                  maxWidth: 'calc(100vw - 160px)',
                  flex: '0 0 calc(100vw - 160px)',
                  scrollSnapAlign: 'center',
                  animation: `fadeUp 0.5s ease ${0.1 + i * 0.08}s both`,
                }}>
                  <RecommendationCard rec={rec} position={i + 1} onContact={handleContact} isBonus={false} />
                </div>
              ))}
              {/* Directory CTA card */}
              <div style={{
                minWidth: 'calc(100vw - 160px)',
                maxWidth: 'calc(100vw - 160px)',
                flex: '0 0 calc(100vw - 160px)',
                scrollSnapAlign: 'center',
                animation: `fadeUp 0.5s ease ${0.1 + recs.length * 0.08}s both`,
              }}>
                <DirectoryCTACard onNavigate={() => nav('/directory')} />
              </div>
            </div>

            {/* Right arrow */}
            <button className="carousel-arrow" onClick={() => scrollToCard(activeCard + 1)} disabled={activeCard === totalCards - 1} style={{
              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 10,
              width: 44, height: 44, borderRadius: '50%',
              border: '1px solid var(--border2)', background: 'rgba(248,245,241,0.95)', backdropFilter: 'blur(8px)',
              color: activeCard === totalCards - 1 ? 'var(--text4)' : 'var(--text)',
              cursor: activeCard === totalCards - 1 ? 'default' : 'pointer',
              fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s', opacity: activeCard === totalCards - 1 ? 0.3 : 1,
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}>→</button>

            {/* Card counter */}
            <div style={{
              textAlign: 'center', height: 32,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, color: 'var(--text4)', letterSpacing: '0.08em',
            }}>
              {activeCard + 1} / {totalCards}
            </div>
          </div>
        )}

        {/* Bonus visual matches — scrollable below the fold */}
        {bonus.length > 0 && (
          <div className="fade-in" style={{ padding: '32px 60px 40px', flexShrink: 0 }}>
            <div style={{ marginBottom: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: 'var(--text4)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8, fontWeight: 600 }}>Also worth exploring</div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 400, color: 'var(--text2)' }}>Visual matches</h3>
              <p style={{ fontSize: 13, color: 'var(--text4)', marginTop: 6 }}>These studios match your aesthetic but differ on some practical criteria.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20, marginTop: 24 }}>
              {bonus.map((rec, i) => (
                <div key={rec.studio_id || i} style={{ animation: `fadeUp 0.5s ease ${0.1 + i * 0.06}s both` }}>
                  <RecommendationCard rec={rec} position={i + 1} onContact={handleContact} isBonus={true} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {recs.length === 0 && bonus.length === 0 && !data?.zero_match && (
          <div style={{ textAlign: 'center', padding: '80px 60px', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 24 }}>No studios registered yet. Check back soon.</div>
            <button onClick={() => nav('/')} className="btn btn-ghost btn-sm">Back to home</button>
          </div>
        )}

        {/* ── Bottom inquiry section ───────────────────────────────────── */}
        <div style={{ borderTop: '1px solid var(--border)', padding: '48px 60px 64px', flexShrink: 0 }}>
          <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--text4)', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 12 }}>
              Not finding what you need?
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(22px, 2.5vw, 32px)', fontWeight: 400, color: 'var(--text)', marginBottom: 10, letterSpacing: '-0.01em' }}>
              Tell us directly — we'll find the right studio for you.
            </h3>
            <p style={{ fontSize: 14, color: 'var(--text3)', lineHeight: 1.7, marginBottom: 28 }}>
              Describe what you're looking for and our team will reach out personally with hand-picked options.
            </p>

            {!inquiryOpen && !inquiryDone && (
              <button onClick={() => setInquiryOpen(true)} style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '12px 28px', background: '#1A1612', color: '#F5F0E8',
                border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500,
                cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'background 0.2s', letterSpacing: '0.03em',
              }}
                onMouseEnter={e => e.currentTarget.style.background = '#C46E49'}
                onMouseLeave={e => e.currentTarget.style.background = '#1A1612'}
              ><CalendarIcon /> Send a custom requirement →</button>
            )}

            {inquiryDone && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 16, padding: '20px 24px',
                background: 'rgba(90,232,122,0.06)', border: '1px solid rgba(90,232,122,0.2)',
                borderLeft: '3px solid var(--green)', borderRadius: 10, animation: 'fadeUp 0.4s ease both', textAlign: 'left',
              }}>
                <div style={{ fontSize: 22, lineHeight: 1 }}>✓</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--green)', marginBottom: 4 }}>We've received your requirement</div>
                  <div style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.6 }}>
                    The Qala team will review your brief and get back to you at <strong style={{ color: 'var(--text2)' }}>{inquiryEmail}</strong> within 1–2 business days.
                  </div>
                </div>
              </div>
            )}

            {inquiryOpen && !inquiryDone && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 12, padding: '28px', animation: 'fadeUp 0.3s ease both' }}>
                <InquiryForm
                  name={inquiryName} setName={setInquiryName}
                  email={inquiryEmail} setEmail={setInquiryEmail}
                  selectedDates={inquiryDates} setSelectedDates={setInquiryDates}
                  message={inquiryMessage} setMessage={setInquiryMessage}
                  error={inquiryError} submitting={inquirySubmitting}
                  onSubmit={submitInquiry}
                  onCancel={() => { setInquiryOpen(false); setInquiryError(''); }}
                />
              </div>
            )}
          </div>
        </div>
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
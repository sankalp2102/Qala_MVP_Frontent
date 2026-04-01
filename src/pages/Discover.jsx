import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { discoveryAPI } from '../api/client';
import ChipSelect from '../components/discovery/ChipSelect';
import ImageGrid from '../components/discovery/ImageGrid';
import qalaLogo from '../assets/qala-logo.png';


// ── data ──────────────────────────────────────────────────────────────────────
const PRODUCT_TYPES = [
  'Dresses','Tops','Shirts','T-shirts','Tunics / Kurtas','Co-ord sets',
  'Jumpsuits','Skirts','Shorts','Trousers / Pants','Denim (Jeans / Jackets)',
  'Blazers','Coats & Jackets','Capes','Waistcoats / Vests','Kaftans',
  'Resortwear sets','Loungewear / Sleepwear','Activewear','Kidswear',
  'Accessories (Scarves / Stoles)','Swimwear','Fabrics',
];

const FABRICS = [
  'Cotton', 'Silk', 'Linen', 'Wool',
  'Regenerated Fabrics', 'Handloom Fabrics', 'Cashmere',
];

const CRAFTS = [
  'Hand Block Printing', 'Tie Dye', 'Embroidery', 'Applique',
  'Patchwork', 'Crochet', 'Knitting', 'Handweaving',
  'Hand Spinning', 'Natural/Plant Based Dyes', 'Kantha',
  'Upcycled Fabrics', 'Eco Printing', 'Ikkat',
];

const PROCESS_STAGES = [
  { value: 'I have a vision',             label: 'I have a vision',             desc: 'Moodboard / inspiration' },
  { value: 'I have designs or sketches',  label: 'I have designs or sketches',  desc: 'Ready to develop further' },
  { value: 'I have samples already made', label: 'I have samples', desc: 'Looking for a production partner' },
  { value: "I'm still exploring ideas",   label: "I'm still exploring ideas",   desc: 'No fixed direction yet' },
];

const DESIGN_SUPPORT = [
  'Garment design (shapes, styles, fits)',
  'Print or textile design',
  'Tech pack development',
  'Pattern making',
  'No, I have this covered',
];

const TIMELINES = [
  { value: '1_3_months',    label: '1 – 3 months' },
  { value: '3_6_months',    label: '3 – 6 months' },
  { value: '6_plus_months', label: '6 months or longer' },
  { value: 'not_sure',      label: 'Not sure yet' },
  { value: 'flexible',      label: "I'm flexible based on what's realistic" },
];

const BATCH_SIZES = [
  { value: 'under_30', label: 'Under 30 pieces' },
  { value: '30_100',   label: '30 – 100 pieces' },
  { value: 'over_100', label: '100+ pieces' },
  { value: 'not_sure', label: 'Not sure yet' },
];

const TOTAL_STEPS = 6;

// ── step meta ─────────────────────────────────────────────────────────────────
const STEPS = [
  {
    q:    "Let's start with the overall look.",
    sub:  "Which visuals feel closest to your collection?",
    hint: "Pick a few that feel right — this helps us understand your style.",
  },
  {
    q:    "What would you like to make?",
    hint: "Different products need different skills and materials. Being specific here helps us find the best studio match.",
  },
  {
    q:    "Do you have any fabric preferences?",
    sub:  "",
    hint: "Fabric affects how a garment looks, feels, and behaves. Even small changes can make a big difference.",
  },
  {
    q:    "Would you like to include any craft techniques?",
    sub:  "",
    hint: "Handcraft techniques add character and uniqueness, but work differently than machine production.",
  },
  {
    q:    "Where are you in the process?",
    sub:  "",
    hint: "You don't need everything figured out to start. This just helps us understand what kind of support might be useful.",
  },
  {
    q:    "Finally, a few practical details.",
    sub:  "Timeline and production volume help us find the right fit.",
    hint: "Timing depends on the work involved, studio capacity, and seasonality. Some things move fast — others need patience.",
  },
];

export default function Discover() {
  const nav = useNavigate();
  const [step, setStep]             = useState(1);
  const [dir,  setDir]              = useState(1);
  const [anim, setAnim]             = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');

  // Option 8 — use sessionStorage cache if Landing preloaded, else fetch
  const [prefetchedImages,  setPrefetchedImages]  = useState(null);
  const [prefetchLoading,   setPrefetchLoading]   = useState(true);

  useEffect(() => {
    const CACHE_KEY = 'qala_img_cache_v1';

    // Try sessionStorage first — Landing may have already fetched + shuffled
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const imgs = JSON.parse(cached);
        setPrefetchedImages(imgs);
        setPrefetchLoading(false);
        return; // images already in browser cache — skip API call entirely
      }
    } catch {}

    // No cache — fetch, shuffle, store for next time
    discoveryAPI.getImages()
      .then(r => {
        const all = (r.data.images || []).filter(
          img => !(img.mime_type?.startsWith('video/') ||
                   /\.(mp4|mov|avi|webm|mkv)$/i.test(img.image_url || ''))
        );
        const shuffled = [...all].sort(() => Math.random() - 0.5);
        try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(shuffled)); } catch {}
        setPrefetchedImages(shuffled);
      })
      .catch(() => setPrefetchedImages([]))
      .finally(() => setPrefetchLoading(false));
  }, []);

  const [answers, setAnswers] = useState({
    visual_selection_ids: [],
    product_types:        [],
    fabrics:              [],
    fabric_is_flexible:   false,
    fabric_not_sure:      false,
    craft_interest:       null,
    crafts:               [],
    craft_is_flexible:    false,
    craft_not_sure:       false,
    experimentation:      null,
    process_stage:        '',
    design_support:       [],
    timeline:             '',
    batch_size:           '',
    first_name:           '',
    last_name:            '',
  });

  // restore session if exists
  useEffect(() => {
    const tok = discoveryAPI.getStoredSession();
    if (tok) {
      discoveryAPI.getSession(tok)
        .then(r => {
          const d = r.data.data;
          setAnswers(prev => ({
            ...prev,
            product_types:        d.product_types        || [],
            fabrics:              d.fabrics               || [],
            fabric_is_flexible:   d.fabric_is_flexible    || false,
            fabric_not_sure:      d.fabric_not_sure       || false,
            craft_interest:       d.craft_interest        || null,
            crafts:               d.crafts                || [],
            craft_is_flexible:    d.craft_is_flexible     || false,
            craft_not_sure:       d.craft_not_sure        || false,
            experimentation:      d.experimentation       || null,
            process_stage:        d.process_stage         || '',
            design_support:       d.design_support        || [],
            timeline:             d.timeline              || '',
            batch_size:           d.batch_size            || '',
            visual_selection_ids: d.visual_selection_ids  || [],
          }));
        })
        .catch(() => {});
    }
  }, []);

  const goTo = (next) => {
    if (next < 1 || next > TOTAL_STEPS) return;
    const goingForward = next > step;
    setDir(goingForward ? 1 : -1);
    setAnim(true);
    setTimeout(() => {
      setStep(next);
      setAnim(false);
    }, 220);
  };

  // true if user picked at least one specific craft
  const hasSpecificCraft = () =>
    answers.crafts.length > 0 && !answers.craft_is_flexible && !answers.craft_not_sure;

  const getNextStep = () => step + 1;

  const getPrevStep = () => step - 1;

  const canProceed = () => {
    if (step === 2 && answers.product_types.length === 0) return false;
    if (step === 4 && answers.craft_interest === null &&
        answers.crafts.length === 0 && !answers.craft_is_flexible) return false;
    if (step === 5 && !answers.process_stage) return false;
    if (step === 6 && (!answers.timeline || !answers.batch_size)) return false;
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const existingToken = discoveryAPI.getStoredSession();
      const payload = {
        ...answers,
        craft_interest:  answers.craft_interest  || 'no',
        experimentation: answers.experimentation || 'skipped',
      };
      if (existingToken) payload.session_token = existingToken;

      const r = await discoveryAPI.submitReadinessCheck(payload);
      discoveryAPI.saveSession(r.data.session_token);
      nav('/discover/results');
    } catch (e) {
      setError(e.response?.data?.message || 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  const set = (key, val) => setAnswers(prev => ({ ...prev, [key]: val }));

  // ── layout ───────────────────────────────────────────────────────────────────
  return (
    <div className="discover-root" style={{ height: '100vh', background: '#F8F5F1', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <style>{`
        @keyframes slideInFwd  { from{opacity:0;transform:translateX(40px)}  to{opacity:1;transform:none} }
        @keyframes slideInBack { from{opacity:0;transform:translateX(-40px)} to{opacity:1;transform:none} }
        @keyframes slideOut    { from{opacity:1} to{opacity:0} }
        @keyframes fadeSlideIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
        .step-enter-fwd  { animation: slideInFwd  0.25s cubic-bezier(0.4,0,0.2,1) both; }
        .step-enter-back { animation: slideInBack 0.25s cubic-bezier(0.4,0,0.2,1) both; }
        .step-exit       { animation: slideOut    0.18s ease both; }
        .inline-step-reveal { animation: fadeSlideIn 0.28s cubic-bezier(0.4,0,0.2,1) both; }
        .option-card:hover { border-color: rgba(196,110,73,0.5) !important; background: rgba(196,110,73,0.04) !important; }
        .option-card.sel  { border-color: #C46E49 !important; background: rgba(196,110,73,0.08) !important; }
        .option-card.sel div { color: #C46E49 !important; }
        .nav-btn:hover { background: rgba(196,110,73,0.06) !important; }
        .continue-btn:not(:disabled):hover { background: #C46E49 !important; }
        @media (max-width: 600px) {
          .discover-topbar { padding: 10px 16px !important; position: sticky !important; top: 0 !important; z-index: 20 !important; }
          .qala-logo       { height: 18px !important; width: auto !important; }
          .discover-dots   { gap: 4px !important; }
          .discover-dot    { transform: scale(0.8); }
          .discover-q      { font-size: 28px !important; }
          .discover-scroll { padding: 20px 16px 24px !important; }
          .discover-botnav { position: sticky !important; bottom: 0 !important; z-index: 10 !important; backdrop-filter: blur(8px); padding: 10px 16px !important; }
          .discover-root   { height: auto !important; overflow: visible !important; }
          .discover-inner  { overflow: visible !important; flex: unset !important; }
          .discover-scroll-area { overflow-y: visible !important; flex: unset !important; }
        }
      `}</style>

      {/* ── Top bar ── */}
      <div className="discover-topbar" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 32px', borderBottom: '1px solid var(--border)',
        background: '#F8F5F1', zIndex: 20, flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <button onClick={() => nav('/')} style={{
            background: 'none', border: 'none', color: 'var(--text3)',
            fontSize: 20, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 5,
            fontFamily: 'var(--font-body)', padding: 0,
          }}>←</button>
          <img src={qalaLogo} alt="Qala" className="qala-logo" />
        </div>

        {/* Progress dots */}
        <div className="discover-dots" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div key={i} className="discover-dot" style={{
              width:  i + 1 === step ? 20 : i + 1 < step ? 8 : 6,
              height: i + 1 === step ? 8  : i + 1 < step ? 8 : 6,
              borderRadius: i + 1 === step ? 4 : '50%',
              background: i + 1 < step ? 'rgba(196,110,73,0.5)'
                        : i + 1 === step ? 'var(--gold)'
                        : 'var(--border)',
              transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)',
            }} />
          ))}
        </div>
      </div>

      {/* ── Full-width content ── */}
      <div className="discover-inner" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Scrollable question area */}
        <div className="discover-scroll-area" style={{ flex: 1, overflowY: 'auto' }}>
          <div className="discover-scroll" style={{
            maxWidth: 860, margin: '0 auto',
            padding: 'clamp(32px, 5vw, 64px) clamp(20px, 4vw, 40px) 100px',
          }}>
            <div
              className={anim ? 'step-exit' : dir === 1 ? 'step-enter-fwd' : 'step-enter-back'}
              key={step}
            >
              {/* Step label */}
              <div style={{
                fontSize: 12, color: 'var(--text4)', letterSpacing: '0.14em',
                textTransform: 'uppercase', marginBottom: 14, fontWeight: 600,
              }}>
                Question {step}
              </div>

              {/* Question heading */}
              <h2 className="discover-q" style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(44px, 5.5vw, 68px)',
                fontWeight: 400, color: 'var(--text)', marginBottom: 10,
                lineHeight: 1.1, letterSpacing: '-0.01em',
              }}>
                {STEPS[step - 1].q}
              </h2>

              {STEPS[step - 1].sub && (
                <p style={{ fontSize: 15, color: 'var(--text3)', lineHeight: 1.65, marginBottom: 8 }}>
                  {STEPS[step - 1].sub}
                </p>
              )}

              {/* Hint box — no emoji, inline */}
              {STEPS[step - 1].hint && (
                <div style={{
                  margin: '16px 0 32px',
                  padding: '10px 14px',
                  background: 'rgba(196,110,73,0.05)',
                  borderLeft: '2px solid rgba(196,110,73,0.35)',
                  borderRadius: '0 6px 6px 0',
                }}>
                  <p style={{
                    margin: 0, fontSize: 14, color: 'var(--text3)',
                    lineHeight: 1.65, whiteSpace: 'pre-line',
                  }}>
                    {STEPS[step - 1].hint}
                  </p>
                  {step === 6 && answers.timeline && (
                    <p className="inline-step-reveal" style={{
                      margin: '8px 0 0', fontSize: 14, color: 'var(--text3)', lineHeight: 1.65,
                    }}>
                      With small-batch work, slight variations from piece to piece are normal — it's part of what makes each one special.
                    </p>
                  )}
                </div>
              )}

              <StepBody step={step} answers={answers} set={set} prefetchedImages={prefetchedImages} prefetchLoading={prefetchLoading} />

              {error && (
                <div style={{
                  marginTop: 24, padding: '12px 16px',
                  background: 'var(--red-dim)', border: '1px solid rgba(255,85,85,0.3)',
                  borderLeft: '3px solid var(--red)', borderRadius: 8,
                  fontSize: 13, color: 'var(--red)',
                }}>
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Bottom nav ── */}
        <div className="discover-botnav" style={{
          flexShrink: 0, padding: '16px clamp(20px, 4vw, 40px)',
          borderTop: '1px solid var(--border)',
          background: 'rgba(248,245,241,0.97)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          maxWidth: '100%',
        }}>
          <button
            className="nav-btn"
            onClick={() => goTo(getPrevStep())}
            disabled={step === 1}
            style={{
              background: 'none', border: '1px solid var(--border)',
              color: step === 1 ? 'var(--text4)' : 'var(--text2)',
              padding: '13px 28px', borderRadius: 10,
              fontSize: 15, cursor: step === 1 ? 'default' : 'pointer',
              fontFamily: 'var(--font-body)', transition: 'all 0.2s',
            }}
          >
            ← Back
          </button>

          {step < TOTAL_STEPS ? (
            <button
              className="continue-btn"
              onClick={() => goTo(getNextStep())}
              disabled={!canProceed()}
              style={{
                background: canProceed() ? '#1A1612' : 'var(--border)',
                color: canProceed() ? '#F5F0E8' : 'var(--text3)',
                border: 'none', padding: '13px 36px', borderRadius: 10,
                fontSize: 15, fontWeight: 700,
                cursor: canProceed() ? 'pointer' : 'not-allowed',
                fontFamily: 'var(--font-body)', transition: 'all 0.2s',
                letterSpacing: '0.03em',
              }}
            >
              Continue →
            </button>
          ) : (
            <button
              className="continue-btn"
              onClick={handleSubmit}
              disabled={submitting || !canProceed()}
              style={{
                background: submitting || !canProceed() ? 'var(--border)' : '#1A1612',
                color: submitting || !canProceed() ? 'var(--text3)' : '#F5F0E8',
                border: 'none', padding: '13px 36px', borderRadius: 10,
                fontSize: 15, fontWeight: 700,
                cursor: submitting || !canProceed() ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-body)', transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', gap: 8,
                letterSpacing: '0.03em',
              }}
            >
              {submitting && <span className="spinner" style={{ width: 14, height: 14, borderColor: 'var(--surface4)', borderTopColor: '#000' }} />}
              {submitting ? 'Finding studios…' : 'Find Studios →'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── individual step renderers ─────────────────────────────────────────────────
function StepBody({ step, answers, set, prefetchedImages, prefetchLoading }) {
  const toggle = (key, val) =>
    set(key, answers[key].includes(val)
      ? answers[key].filter(v => v !== val)
      : [...answers[key], val]);

  // Custom craft toggle — deselects No/Exploring when a pill is picked
  const toggleCraft = (val) => {
    const next = answers.crafts.includes(val)
      ? answers.crafts.filter(v => v !== val)
      : [...answers.crafts, val];
    set('crafts', next);
    if (next.length > 0 || answers.craft_is_flexible) {
      set('craft_interest', 'yes');
      set('craft_not_sure', false);
    } else {
      set('craft_interest', null);
    }
  };

  switch (step) {

    case 1:
      return (
        <div>
          <ImageGrid
            selected={answers.visual_selection_ids}
            onToggle={id => toggle('visual_selection_ids', id)}
            prefetchedImages={prefetchedImages}
            prefetchLoading={prefetchLoading}
          />
        </div>
      );

    case 2:
      return (
        <ChipSelect
          options={PRODUCT_TYPES}
          selected={answers.product_types}
          onToggle={val => toggle('product_types', val)}
        />
      );

    case 3: {
      const notSureDisabled3 = answers.fabrics.length > 0 || answers.fabric_is_flexible;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <ChipSelect
            options={FABRICS}
            selected={answers.fabrics}
            onToggle={val => toggle('fabrics', val)}
          />
          <div style={{ borderTop: '1px dashed var(--border)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
              <div
                onClick={() => set('fabric_is_flexible', !answers.fabric_is_flexible)}
                style={{
                  width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                  border: `2px solid ${answers.fabric_is_flexible ? '#C46E49' : '#B0A89A'}`,
                  background: answers.fabric_is_flexible ? '#C46E49' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s', cursor: 'pointer',
                }}
              >
                {answers.fabric_is_flexible && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <span
                onClick={() => set('fabric_is_flexible', !answers.fabric_is_flexible)}
                style={{ fontSize: 15, fontWeight: 600, color: answers.fabric_is_flexible ? '#C46E49' : 'var(--text2)', transition: 'color 0.15s' }}
              >
                I'm flexible
              </span>
            </label>
            <button
              onClick={() => !notSureDisabled3 && set('fabric_not_sure', !answers.fabric_not_sure)}
              disabled={notSureDisabled3}
              style={{
                alignSelf: 'flex-start', padding: '12px 22px', borderRadius: 100,
                border: `1.5px solid ${answers.fabric_not_sure ? '#C46E49' : notSureDisabled3 ? 'var(--border)' : '#B0A89A'}`,
                background: answers.fabric_not_sure ? 'rgba(196,110,73,0.10)' : 'transparent',
                color: notSureDisabled3 ? 'var(--text4)' : answers.fabric_not_sure ? '#C46E49' : 'var(--text2)',
                fontSize: 15, fontWeight: 600,
                cursor: notSureDisabled3 ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-body)', transition: 'all 0.15s',
                opacity: notSureDisabled3 ? 0.4 : 1,
              }}
            >
              Not sure yet
            </button>
          </div>
        </div>
      );
    }

    case 4: {
      // Merged Q4+Q5: craft pills upfront + No / I'm still exploring as option buttons
      // I'm flexible checkbox alongside pills
      const noCraftsMode   = answers.craft_interest === 'no' || answers.craft_interest === 'exploring';
      const flexibleActive = answers.craft_is_flexible;

      const toggleFlexible = () => {
        const next = !flexibleActive;
        set('craft_is_flexible', next);
        if (next) {
          set('craft_interest', 'yes');
          set('craft_not_sure', false);
        } else {
          if (answers.crafts.length === 0) set('craft_interest', null);
        }
      };

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Craft pills — muted when No/Exploring selected */}
          <div style={{ opacity: noCraftsMode ? 0.35 : 1, pointerEvents: noCraftsMode ? 'none' : 'auto', transition: 'opacity 0.2s' }}>
            <ChipSelect
              options={CRAFTS}
              selected={answers.crafts}
              onToggle={toggleCraft}
            />
          </div>

          {/* I'm flexible checkbox */}
          <label style={{
            display: 'flex', alignItems: 'center', gap: 10,
            cursor: noCraftsMode ? 'not-allowed' : 'pointer', userSelect: 'none',
            opacity: noCraftsMode ? 0.35 : 1, transition: 'opacity 0.2s',
          }}>
            <div
              onClick={() => !noCraftsMode && toggleFlexible()}
              style={{
                width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                border: `2px solid ${flexibleActive ? '#C46E49' : '#B0A89A'}`,
                background: flexibleActive ? '#C46E49' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s', cursor: noCraftsMode ? 'not-allowed' : 'pointer',
              }}
            >
              {flexibleActive && (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
            <span
              onClick={() => !noCraftsMode && toggleFlexible()}
              style={{ fontSize: 15, fontWeight: 600, color: flexibleActive ? '#C46E49' : 'var(--text2)', transition: 'color 0.15s' }}
            >
              I'm flexible
            </span>
          </label>

          {/* Divider */}
          <div style={{ borderTop: '1px dashed var(--border)' }} />

          {/* No + I'm still exploring buttons */}
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { val: 'no',        label: 'No' },
              { val: 'exploring', label: "I'm still exploring" },
            ].map(opt => (
              <button
                key={opt.val}
                className={`option-card${answers.craft_interest === opt.val ? ' sel' : ''}`}
                onClick={() => {
                  if (answers.craft_interest === opt.val) {
                    // deselect
                    set('craft_interest', null);
                  } else {
                    set('craft_interest', opt.val);
                    set('crafts', []);
                    set('craft_is_flexible', false);
                    set('craft_not_sure', false);
                  }
                }}
                style={{
                  padding: '14px 24px', border: '1px solid var(--border)',
                  borderRadius: 12, background: 'transparent',
                  cursor: 'pointer', textAlign: 'center',
                  fontFamily: 'var(--font-body)', transition: 'all 0.15s',
                }}
              >
                <div style={{ fontSize: 15, fontWeight: 400, color: 'var(--text)' }}>{opt.label}</div>
              </button>
            ))}
          </div>
        </div>
      );
    }

    case 5:
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {PROCESS_STAGES.map(s => (
            <button
              key={s.value}
              className={`option-card${answers.process_stage === s.value ? ' sel' : ''}`}
              onClick={() => set('process_stage', s.value)}
              style={{
                width: '100%', padding: '20px 24px',
                border: '1px solid var(--border)', borderRadius: 12,
                background: 'transparent', cursor: 'pointer',
                textAlign: 'left', fontFamily: 'var(--font-body)', transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: 15, fontWeight: 400, color: 'var(--text)', marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 13, color: 'var(--text3)' }}>{s.desc}</div>
              </div>
              <div style={{
                width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                border: `2px solid ${answers.process_stage === s.value ? 'var(--gold)' : 'var(--border)'}`,
                background: answers.process_stage === s.value ? 'var(--gold)' : 'transparent',
                transition: 'all 0.15s',
              }} />
            </button>
          ))}
        </div>
      );

    case 6:
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16, fontWeight: 600 }}>
              Do you have a launch timeline in mind?
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {TIMELINES.map(t => (
                <button
                  key={t.value}
                  onClick={() => set('timeline', t.value)}
                  style={{
                    padding: '10px 20px', borderRadius: 8,
                    border: `1px solid ${answers.timeline === t.value ? '#C46E49' : 'var(--border2)'}`,
                    background: answers.timeline === t.value ? 'rgba(196,110,73,0.10)' : 'transparent',
                    color: answers.timeline === t.value ? '#C46E49' : 'var(--text2)',
                    fontSize: 13, fontWeight: answers.timeline === t.value ? 700 : 400,
                    cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.15s',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16, fontWeight: 600 }}>
              Roughly how many total pieces are you planning in this collection?
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {BATCH_SIZES.map(b => (
                <button
                  key={b.value}
                  onClick={() => set('batch_size', b.value)}
                  style={{
                    padding: '10px 20px', borderRadius: 8,
                    border: `1px solid ${answers.batch_size === b.value ? '#C46E49' : 'var(--border2)'}`,
                    background: answers.batch_size === b.value ? 'rgba(196,110,73,0.10)' : 'transparent',
                    color: answers.batch_size === b.value ? '#C46E49' : 'var(--text2)',
                    fontSize: 13, fontWeight: answers.batch_size === b.value ? 700 : 400,
                    cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.15s',
                  }}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16, fontWeight: 600 }}>
              Your name (optional)
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <input
                type="text" placeholder="First name"
                value={answers.first_name}
                onChange={e => set('first_name', e.target.value)}
                style={{
                  flex: 1, padding: '11px 14px', background: 'rgba(255,255,255,0.7)',
                  border: '1px solid var(--border2)', borderRadius: 8,
                  color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font-body)',
                }}
              />
              <input
                type="text" placeholder="Last name"
                value={answers.last_name}
                onChange={e => set('last_name', e.target.value)}
                style={{
                  flex: 1, padding: '11px 14px', background: 'rgba(255,255,255,0.7)',
                  border: '1px solid var(--border2)', borderRadius: 8,
                  color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font-body)',
                }}
              />
            </div>
          </div>
        </div>
      );

    default: return null;
  }
}

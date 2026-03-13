import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { discoveryAPI } from '../api/client';
import ChipSelect from '../components/discovery/ChipSelect';
import ImageGrid from '../components/discovery/ImageGrid';
import KnittingAnimation from '../components/discovery/KnittingAnimation';
import qalaLogo from '../assets/qala-logo.png';

const TOTAL_STEPS = 8;

// ── data ──────────────────────────────────────────────────────────────────────
const PRODUCT_TYPES = [
  'Dresses','Tops','Shirts','T-shirts','Tunics / Kurtas','Co-ord sets',
  'Jumpsuits','Skirts','Shorts','Trousers / Pants','Denim (Jeans / Jackets)',
  'Blazers','Coats & Jackets','Capes','Waistcoats / Vests','Kaftans',
  'Resortwear sets','Loungewear / Sleepwear','Activewear','Kidswear',
  'Accessories (Scarves / Stoles)','Swimwear','Fabrics',
];

const FABRICS = [
  'Cotton','Linen','Silk','Wool','Cashmere','Polyester','Viscose / Rayon',
  'Modal','Bamboo','Hemp','Denim','Khadi','Handloom cotton','Chanderi',
  'Banarasi silk','Organza','Chiffon','Crepe','Jersey','Fleece',
  'Angora wool','Leather / Faux leather','Velvet','Jacquard','Ikat',
];

const CRAFTS = [
  'Hand block printing','Screen printing','Digital printing','Natural dyeing',
  'Embroidery','Hand embroidery','Machine embroidery','Zari / Zardozi',
  'Smocking','Quilting','Weaving','Handloom weaving','Knitting','Crochet',
  'Batik','Shibori / Tie dye','Appliqué','Patchwork','Beadwork',
  'Mirror work','Sequin work','Cut work','Aari work',
];

const PROCESS_STAGES = [
  { value: 'I have a vision',             label: 'I have a vision',             desc: 'Moodboard / inspiration' },
  { value: 'I have designs or sketches',  label: 'I have designs or sketches',  desc: 'Ready to develop further' },
  { value: 'I have samples already made', label: 'I have samples already made', desc: 'Looking for a production partner' },
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

// ── step meta ─────────────────────────────────────────────────────────────────
const STEPS = [
  {
    q:    "Let's start with the overall look.",
    sub:  "Which visuals feel closest to your collection?",
    hint: "Pick a few that feel right — this helps us understand your style.",
  },
  {
    q:    "What would you like to make?",
    sub:  "Select all that apply — you can choose more than one.",
    hint: "Different products need different skills and materials.\nBeing specific here helps us find the best studio match.",
  },
  {
    q:    "Do you have any fabric preferences?",
    sub:  "",
    hint: "Fabric affects how a garment looks, feels, and behaves.\nEven small changes can make a big difference.",
  },
  {
    q:    "Would you like to include crafts in this collection?",
    sub:  "",
    hint: "Handcraft techniques add character and uniqueness,\nbut work differently than machine production.",
  },
  // Step 5 is rendered inline on step 4 when craft_interest === 'yes'
  // kept in STEPS array so progress bar still counts it
  {
    q:    "Do you know which technique(s) you'd like to use?",
    sub:  "",
    hint: "Each technique has its own timing and quirks.\nDon't worry if you're not sure yet — we'll help you explore.",
  },
  {
    q:    "Are you interested in experimenting with these techniques?",
    sub:  "",
    hint: "Experimentation can add time and rounds of sampling.\nIt's about finding what works for your timeline and budget.",
  },
  {
    q:    "Where are you in the process?",
    sub:  "",
    hint: "You don't need everything figured out to start.\nThis just helps us understand what kind of support might be useful.",
  },
  {
    q:    "Finally, a few practical details.",
    sub:  "Timeline and production volume help us find the right fit.",
    hint: "Timing depends on the work involved, studio capacity, and seasonality.\nSome things move fast — others need patience.",
  },
];

export default function Discover() {
  const nav = useNavigate();
  const [step, setStep]             = useState(1);
  const [dir,  setDir]              = useState(1);
  const [anim, setAnim]             = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');
  const [rowsKnitted, setRowsKnitted] = useState(0);

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
    if (goingForward) setRowsKnitted(Math.round((next / TOTAL_STEPS) * 16));
    setAnim(true);
    setTimeout(() => {
      setStep(next);
      setAnim(false);
    }, 220);
  };

  // true if user picked at least one specific craft
  const hasSpecificCraft = () =>
    answers.crafts.length > 0 && !answers.craft_is_flexible && !answers.craft_not_sure;

  const getNextStep = () => {
    // Step 4 now handles Q4 + Q5 inline:
    // No/Exploring → Q7 | Yes + specific craft → Q6 | Yes + flexible/not sure → Q7
    if (step === 4) {
      if (answers.craft_interest === 'no' || answers.craft_interest === 'exploring') return 7;
      if (answers.craft_interest === 'yes') return hasSpecificCraft() ? 6 : 7;
    }
    // Step 5 kept as fallback — same routing
    if (step === 5) return hasSpecificCraft() ? 6 : 7;
    return step + 1;
  };

  const getPrevStep = () => {
    // Q6 always goes back to Q4 (which shows Q5 inline)
    if (step === 6) return 4;
    // Q7: if craft_interest was no/exploring, came from Q4; otherwise from Q4 (inline Q5)
    if (step === 7 && (answers.craft_interest === 'no' || answers.craft_interest === 'exploring')) return 4;
    if (step === 7 && answers.craft_interest === 'yes') return 4;
    return step - 1;
  };

  const canProceed = () => {
    if (step === 2 && answers.product_types.length === 0) return false;
    if (step === 4) {
      if (answers.craft_interest === null) return false;
      // Q5 (craft selection) is optional — user can skip even if Yes was picked in Q4
    }
    if (step === 6 && answers.experimentation === null) return false;
    if (step === 7 && !answers.process_stage) return false;
    if (step === 8 && (!answers.timeline || !answers.batch_size)) return false;
    return true;
  };

  const handleSubmit = async () => {
    setRowsKnitted(16);;
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
    <div style={{ height: '100vh', background: '#F8F5F1', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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
        .continue-btn:not(:disabled):hover { background: #A85A38 !important; }
        @media(max-width: 900px) {
          .discover-split { flex-direction: column !important; }
          .discover-right { display: none !important; }
          .discover-left  { width: 100% !important; }
        }
      `}</style>

      {/* ── Top bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 32px', borderBottom: '1px solid var(--border)',
        background: '#F8F5F1', zIndex: 20, flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <button onClick={() => nav('/')} style={{
            background: 'none', border: 'none', color: 'var(--text3)',
            fontSize: 20, cursor: 'pointer', letterSpacing: '0.06em',
            display: 'flex', alignItems: 'center', gap: 5,
            fontFamily: 'var(--font-body)', padding: 0,
          }}>
            ←
          </button>
          <img src={qalaLogo} alt="Qala" style={{ height: 80, width: 'auto', display: 'block' }} />
        </div>

        <div style={{ flex: 1, maxWidth: 320, margin: '0 32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 10, color: 'var(--text4)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Question {step} of {TOTAL_STEPS}
            </span>
            <span style={{ fontSize: 10, color: 'var(--text4)' }}>
              {Math.round((step / TOTAL_STEPS) * 100)}%
            </span>
          </div>
          <div style={{ height: 2, background: 'var(--border)', borderRadius: 1 }}>
            <div style={{
              height: '100%', borderRadius: 1,
              background: '#C46E49',
              width: `${(step / TOTAL_STEPS) * 100}%`,
              transition: 'width 0.4s cubic-bezier(0.4,0,0.2,1)',
            }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div key={i} style={{
              width: i + 1 === step ? 18 : i + 1 < step ? 8 : 6,
              height: 6, borderRadius: 3,
              background: i + 1 < step ? 'rgba(196,110,73,0.5)'
                        : i + 1 === step ? 'var(--gold)'
                        : 'var(--border)',
              transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)',
            }} />
          ))}
        </div>
      </div>

      {/* ── Split body ── */}
      <div className="discover-split" style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* LEFT — 60% — Question */}
        <div className="discover-left" style={{
          width: '60%', display: 'flex', flexDirection: 'column',
          borderRight: '1px solid var(--border)', overflow: 'hidden',
        }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '48px 52px 100px' }}>
            <div
              className={anim ? 'step-exit' : dir === 1 ? 'step-enter-fwd' : 'step-enter-back'}
              key={step}
            >
              {/* Step header */}
              <div style={{ marginBottom: 36 }}>
                <div style={{
                  fontSize: 10, color: 'var(--text4)', letterSpacing: '0.14em',
                  textTransform: 'uppercase', marginBottom: 12, fontWeight: 600,
                }}>
                  Question {step}
                </div>
                <h2 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(24px, 2.8vw, 38px)',
                  fontWeight: 400, color: 'var(--text)', marginBottom: 10,
                  lineHeight: 1.15, letterSpacing: '-0.01em',
                }}>
                  {STEPS[step - 1].q}
                </h2>
                {STEPS[step - 1].sub && (
                  <p style={{ fontSize: 14, color: 'var(--text3)', lineHeight: 1.65 }}>
                    {STEPS[step - 1].sub}
                  </p>
                )}
              </div>

              <StepBody step={step} answers={answers} set={set} />

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

          {/* Bottom nav */}
          <div style={{
            flexShrink: 0, padding: '16px 52px',
            borderTop: '1px solid var(--border)',
            background: 'rgba(248,245,241,0.97)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          }}>
            <button
              className="nav-btn"
              onClick={() => goTo(getPrevStep())}
              disabled={step === 1}
              style={{
                background: 'none',
                border: '1px solid var(--border)',
                color: step === 1 ? 'var(--text4)' : 'var(--text2)',
                padding: '9px 22px', borderRadius: 8,
                fontSize: 13, cursor: step === 1 ? 'default' : 'pointer',
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
                  background: canProceed() ? '#C46E49' : 'var(--border)',
                  color: canProceed() ? '#FFFFFF' : 'var(--text3)',
                  border: 'none', padding: '9px 28px', borderRadius: 8,
                  fontSize: 13, fontWeight: 700,
                  cursor: canProceed() ? 'pointer' : 'not-allowed',
                  fontFamily: 'var(--font-body)', transition: 'all 0.2s',
                  letterSpacing: '0.03em',
                }}
              >
                Continue →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting || !canProceed()}
                style={{
                  background: submitting || !canProceed() ? 'var(--border)' : '#C46E49',
                  color: submitting || !canProceed() ? 'var(--text3)' : '#FFFFFF',
                  border: 'none', padding: '9px 28px', borderRadius: 8,
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'var(--font-body)', transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                {submitting && <span className="spinner" style={{ width: 14, height: 14, borderColor: 'var(--surface4)', borderTopColor: '#000' }} />}
                {submitting ? 'Finding studios…' : 'Find my studios →'}
              </button>
            )}
          </div>
        </div>

        {/* RIGHT — 40% — Knitting animation */}
        <div className="discover-right" style={{
          width: '40%',
          background: '#F8F5F1',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Animation shrinks to give space to hint block */}
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <KnittingAnimation rowsKnitted={rowsKnitted} />
          </div>

          {STEPS[step - 1].hint && (
            <div style={{
              flexShrink: 0,
              padding: '20px 32px 28px',
            }}>
              <p style={{
                margin: 0,
                fontSize: 12,
                color: 'var(--text3)',
                lineHeight: 1.80,
                fontStyle: 'italic',
                whiteSpace: 'pre-line',
                letterSpacing: '0.01em',
              }}>
                {STEPS[step - 1].hint}
              </p>
              {step === 8 && answers.timeline && (
                <p className="inline-step-reveal" style={{
                  margin: '12px 0 0',
                  fontSize: 12,
                  color: 'var(--text3)',
                  lineHeight: 1.80,
                  fontStyle: 'italic',
                  whiteSpace: 'pre-line',
                  letterSpacing: '0.01em',
                }}>
                  With small-batch work, slight variations from piece to piece are normal — it's part of what makes each one special.
                </p>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// ── individual step renderers ─────────────────────────────────────────────────
function StepBody({ step, answers, set }) {
  const toggle = (key, val) =>
    set(key, answers[key].includes(val)
      ? answers[key].filter(v => v !== val)
      : [...answers[key], val]);

  switch (step) {

    case 1:
      return (
        <div>
          <ImageGrid
            selected={answers.visual_selection_ids}
            onToggle={id => toggle('visual_selection_ids', id)}
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

            {/* I'm flexible — checkbox */}
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
                style={{ fontSize: 13, fontWeight: 600, color: answers.fabric_is_flexible ? '#C46E49' : 'var(--text2)', transition: 'color 0.15s' }}
              >
                I'm flexible
              </span>
            </label>

            {/* Not sure yet */}
            <button
              onClick={() => !notSureDisabled3 && set('fabric_not_sure', !answers.fabric_not_sure)}
              disabled={notSureDisabled3}
              style={{
                alignSelf: 'flex-start',
                padding: '9px 20px', borderRadius: 8,
                border: `1.5px solid ${answers.fabric_not_sure ? '#C46E49' : notSureDisabled3 ? 'var(--border)' : '#B0A89A'}`,
                background: answers.fabric_not_sure ? 'rgba(196,110,73,0.10)' : 'transparent',
                color: notSureDisabled3 ? 'var(--text4)' : answers.fabric_not_sure ? '#C46E49' : 'var(--text2)',
                fontSize: 13, fontWeight: 600,
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
      const notSureDisabled5 = answers.crafts.length > 0 || answers.craft_is_flexible;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Q4 — craft interest */}
          <div style={{ display: 'flex', gap: 16 }}>
            {[
              { val: 'yes',       label: 'Yes' },
              { val: 'no',        label: 'No' },
              { val: 'exploring', label: "I'm still exploring" },
            ].map(opt => (
              <button
                key={opt.val}
                className={`option-card${answers.craft_interest === opt.val ? ' sel' : ''}`}
                onClick={() => set('craft_interest', opt.val)}
                style={{
                  flex: 1, padding: '20px', border: '1px solid var(--border)',
                  borderRadius: 12, background: 'transparent',
                  cursor: 'pointer', textAlign: 'center',
                  fontFamily: 'var(--font-body)', transition: 'all 0.15s',
                }}
              >
                <div style={{ fontSize: 15, fontWeight: 400, color: 'var(--text)' }}>{opt.label}</div>
              </button>
            ))}
          </div>

          {/* Q5 inline — fades in when Yes is picked */}
          {answers.craft_interest === 'yes' && (
            <div className="inline-step-reveal" style={{
              borderTop: '1px solid var(--border)',
              paddingTop: 28,
              display: 'flex', flexDirection: 'column', gap: 20,
            }}>
              {/* Inline Q5 header */}
              <div>
                <div style={{
                  fontSize: 10, color: 'var(--text4)', letterSpacing: '0.14em',
                  textTransform: 'uppercase', marginBottom: 8, fontWeight: 600,
                }}>
                  Question 5
                </div>
                <h3 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(18px, 2vw, 26px)',
                  fontWeight: 400, color: 'var(--text)', margin: 0,
                  lineHeight: 1.2, letterSpacing: '-0.01em',
                }}>
                  Do you know which technique(s) you'd like to use?
                </h3>
              </div>

              {/* Craft chips */}
              <ChipSelect
                options={CRAFTS}
                selected={answers.crafts}
                onToggle={val => toggle('crafts', val)}
              />

              {/* Flexible / Not sure */}
              <div style={{ borderTop: '1px dashed var(--border)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>

                {/* I'm flexible — checkbox */}
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
                  <div
                    onClick={() => set('craft_is_flexible', !answers.craft_is_flexible)}
                    style={{
                      width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                      border: `2px solid ${answers.craft_is_flexible ? '#C46E49' : '#B0A89A'}`,
                      background: answers.craft_is_flexible ? '#C46E49' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s', cursor: 'pointer',
                    }}
                  >
                    {answers.craft_is_flexible && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  <span
                    onClick={() => set('craft_is_flexible', !answers.craft_is_flexible)}
                    style={{ fontSize: 13, fontWeight: 600, color: answers.craft_is_flexible ? '#C46E49' : 'var(--text2)', transition: 'color 0.15s' }}
                  >
                    I'm flexible
                  </span>
                </label>

                {/* Not sure yet */}
                <button
                  onClick={() => !notSureDisabled5 && set('craft_not_sure', !answers.craft_not_sure)}
                  disabled={notSureDisabled5}
                  style={{
                    alignSelf: 'flex-start',
                    padding: '9px 20px', borderRadius: 8,
                    border: `1.5px solid ${answers.craft_not_sure ? '#C46E49' : notSureDisabled5 ? 'var(--border)' : '#B0A89A'}`,
                    background: answers.craft_not_sure ? 'rgba(196,110,73,0.10)' : 'transparent',
                    color: notSureDisabled5 ? 'var(--text4)' : answers.craft_not_sure ? '#C46E49' : 'var(--text2)',
                    fontSize: 13, fontWeight: 600,
                    cursor: notSureDisabled5 ? 'not-allowed' : 'pointer',
                    fontFamily: 'var(--font-body)', transition: 'all 0.15s',
                    opacity: notSureDisabled5 ? 0.4 : 1,
                  }}
                >
                  Not sure yet
                </button>
              </div>
            </div>
          )}
        </div>
      );
    }

    // Case 5 kept as fallback only (shouldn't normally be reached)
    case 5: {
      const notSureDisabled5 = answers.crafts.length > 0 || answers.craft_is_flexible;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <ChipSelect
            options={CRAFTS}
            selected={answers.crafts}
            onToggle={val => toggle('crafts', val)}
          />
          <div style={{ borderTop: '1px dashed var(--border)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
              <div
                onClick={() => set('craft_is_flexible', !answers.craft_is_flexible)}
                style={{
                  width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                  border: `2px solid ${answers.craft_is_flexible ? '#C46E49' : '#B0A89A'}`,
                  background: answers.craft_is_flexible ? '#C46E49' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s', cursor: 'pointer',
                }}
              >
                {answers.craft_is_flexible && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <span
                onClick={() => set('craft_is_flexible', !answers.craft_is_flexible)}
                style={{ fontSize: 13, fontWeight: 600, color: answers.craft_is_flexible ? '#C46E49' : 'var(--text2)', transition: 'color 0.15s' }}
              >
                I'm flexible
              </span>
            </label>
            <button
              onClick={() => !notSureDisabled5 && set('craft_not_sure', !answers.craft_not_sure)}
              disabled={notSureDisabled5}
              style={{
                alignSelf: 'flex-start',
                padding: '9px 20px', borderRadius: 8,
                border: `1.5px solid ${answers.craft_not_sure ? '#C46E49' : notSureDisabled5 ? 'var(--border)' : '#B0A89A'}`,
                background: answers.craft_not_sure ? 'rgba(196,110,73,0.10)' : 'transparent',
                color: notSureDisabled5 ? 'var(--text4)' : answers.craft_not_sure ? '#C46E49' : 'var(--text2)',
                fontSize: 13, fontWeight: 600,
                cursor: notSureDisabled5 ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-body)', transition: 'all 0.15s',
                opacity: notSureDisabled5 ? 0.4 : 1,
              }}
            >
              Not sure yet
            </button>
          </div>
        </div>
      );
    }

    case 6:
      return (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {[
            { val: 'yes', label: "Yes, I'd like to explore new approaches" },
            { val: 'no',  label: "No, that is not a priority right now" },
          ].map(opt => (
            <button
              key={opt.val}
              className={`option-card${answers.experimentation === opt.val ? ' sel' : ''}`}
              onClick={() => set('experimentation', opt.val)}
              style={{
                flex: '1 1 200px', padding: '20px', border: '1px solid var(--border)',
                borderRadius: 12, background: 'transparent',
                cursor: 'pointer', textAlign: 'center',
                fontFamily: 'var(--font-body)', transition: 'all 0.15s',
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 400, color: 'var(--text)', lineHeight: 1.5 }}>{opt.label}</div>
            </button>
          ))}
        </div>
      );

    case 7:
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {PROCESS_STAGES.map(s => (
            <button
              key={s.value}
              className={`option-card${answers.process_stage === s.value ? ' sel' : ''}`}
              onClick={() => set('process_stage', s.value)}
              style={{
                width: '100%', padding: '18px 20px',
                border: '1px solid var(--border)', borderRadius: 12,
                background: 'transparent', cursor: 'pointer',
                textAlign: 'left', fontFamily: 'var(--font-body)', transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 400, color: 'var(--text)', marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>{s.desc}</div>
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

    case 8:
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

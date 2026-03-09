import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { discoveryAPI } from '../api/client';
import ChipSelect from '../components/discovery/ChipSelect';
import ImageGrid from '../components/discovery/ImageGrid';
import GarmentAnimation from '../components/discovery/GarmentAnimation';
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
  { value: 'I have a vision',              label: 'I have a vision',              desc: 'Moodboard / inspiration' },
  { value: 'I have designs or sketches',   label: 'I have designs or sketches',   desc: 'Ready to develop further' },
  { value: 'I have samples already made',  label: 'I have samples already made',  desc: 'Looking for a production partner' },
  { value: "I'm still exploring ideas",    label: "I'm still exploring ideas",    desc: 'No fixed direction yet' },
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

// ── helpers ───────────────────────────────────────────────────────────────────
function toggle(arr, val) {
  return arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val];
}

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
    hint: "",
  },
];

export default function Discover() {
  const nav = useNavigate();
  const [step, setStep]     = useState(1);
  const [dir,  setDir]      = useState(1);  // 1=forward, -1=backward
  const [anim, setAnim]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]   = useState('');

  const [answers, setAnswers] = useState({
    visual_selection_ids: [],
    product_types:        [],
    fabrics:              [],
    fabric_is_flexible:   false,
    fabric_not_sure:      false,
    craft_interest:       null,   // 'yes'|'no'
    crafts:               [],
    craft_is_flexible:    false,
    craft_not_sure:       false,
    experimentation:      null,   // 'yes'|'no'|'skipped'
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
            product_types:      d.product_types      || [],
            fabrics:            d.fabrics             || [],
            fabric_is_flexible: d.fabric_is_flexible  || false,
            fabric_not_sure:    d.fabric_not_sure     || false,
            craft_interest:     d.craft_interest      || null,
            crafts:             d.crafts              || [],
            craft_is_flexible:  d.craft_is_flexible   || false,
            craft_not_sure:     d.craft_not_sure      || false,
            experimentation:    d.experimentation     || null,
            process_stage:      d.process_stage       || '',
            design_support:     d.design_support      || [],
            timeline:           d.timeline            || '',
            batch_size:         d.batch_size          || '',
            visual_selection_ids: d.visual_selection_ids || [],
          }));
        })
        .catch(() => {});
    }
  }, []);

  const goTo = (next) => {
    if (next < 1 || next > TOTAL_STEPS) return;
    setDir(next > step ? 1 : -1);
    setAnim(true);
    setTimeout(() => {
      setStep(next);
      setAnim(false);
    }, 220);
  };

  // true if user picked at least one specific craft (not just flexible/not_sure toggles)
  const hasSpecificCraft = () => answers.crafts.length > 0 && !answers.craft_is_flexible && !answers.craft_not_sure;

  const getNextStep = () => {
    if (step === 4) return (answers.craft_interest === 'no' || answers.craft_interest === 'exploring') ? 7 : 5;
    if (step === 5) return hasSpecificCraft() ? 6 : 7;               // specific craft → experimentation(6), else skip to process stage(7)
    return step + 1;
  };

  const getPrevStep = () => {
    if (step === 7 && (answers.craft_interest === 'no' || answers.craft_interest === 'exploring')) return 4;
    if (step === 7 && answers.craft_interest === 'yes' && !hasSpecificCraft()) return 5; // skipped experimentation only
    if (step === 6 && (answers.craft_interest === 'no' || answers.craft_interest === 'exploring')) return 4; // safety net
    return step - 1;
  };

  const canProceed = () => {
    if (step === 2 && answers.product_types.length === 0) return false;
    if (step === 4 && answers.craft_interest === null) return false;
    if (step === 6 && answers.experimentation === null) return false;  // experimentation is now step 6
    if (step === 7 && !answers.process_stage) return false;           // process stage is now step 7
    if (step === 8 && (!answers.timeline || !answers.batch_size)) return false;
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

  // ── layout ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ height: '100vh', background: '#F8F5F1', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <style>{`
        @keyframes slideInFwd  { from{opacity:0;transform:translateX(40px)}  to{opacity:1;transform:none} }
        @keyframes slideInBack { from{opacity:0;transform:translateX(-40px)} to{opacity:1;transform:none} }
        @keyframes slideOut    { from{opacity:1} to{opacity:0} }
        .step-enter-fwd  { animation: slideInFwd  0.25s cubic-bezier(0.4,0,0.2,1) both; }
        .step-enter-back { animation: slideInBack 0.25s cubic-bezier(0.4,0,0.2,1) both; }
        .step-exit       { animation: slideOut    0.18s ease both; }
        .option-card:hover { border-color: rgba(196,110,73,0.5) !important; background: rgba(196,110,73,0.04) !important; }
        .option-card.sel  { border-color: #C46E49 !important; background: rgba(196,110,73,0.08) !important; }
        .option-card.sel div { color: #C46E49 !important; }
        .nav-btn:hover { background: rgba(196,110,73,0.06) !important; }
        .continue-btn:not(:disabled):hover { background: #A85A38 !important; }
        /* Mobile: stack vertically */
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
        {/* Logo + back */}
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

        {/* Step progress bar */}
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

        {/* Step dots */}
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
      <div className="discover-split" style={{
        flex: 1, display: 'flex', overflow: 'hidden',
      }}>

        {/* LEFT — 60% — Question */}
        <div className="discover-left" style={{
          width: '60%', display: 'flex', flexDirection: 'column',
          borderRight: '1px solid var(--border)', overflow: 'hidden',
        }}>
          {/* Scrollable question area */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '48px 52px 100px',
          }}>
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
                  fontWeight: 700, color: 'var(--text)', marginBottom: 10,
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

              {/* Step body */}
              <StepBody step={step} answers={answers} set={set} />

              {/* Helper / schooling text — shown below the step content */}
              {STEPS[step - 1].hint && (
                <p style={{
                  marginTop: 28, fontSize: 13, color: 'var(--text4)',
                  lineHeight: 1.7, fontStyle: 'italic',
                  borderLeft: '2px solid var(--border)',
                  paddingLeft: 14,
                  whiteSpace: 'pre-line',
                }}>
                  {STEPS[step - 1].hint}
                </p>
              )}

              {/* Error */}
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

          {/* Bottom nav — fixed within left panel */}
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

            {/* Optional skip hint for non-required questions */}
            {[3, 5].includes(step) && (
              <span style={{ fontSize: 11, color: 'var(--text4)' }}>
                Optional — you can skip
              </span>
            )}

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

        {/* RIGHT — 40% — Garment animation */}
        <div className="discover-right" style={{
          width: '40%',
          background: 'var(--surface)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Subtle radial glow */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'radial-gradient(ellipse at center, rgba(196,110,73,0.04) 0%, transparent 65%)',
          }} />
          <GarmentAnimation step={step} />
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

    case 3:
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <ChipSelect
            options={FABRICS}
            selected={answers.fabrics}
            onToggle={val => toggle('fabrics', val)}
          />
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', borderTop: '1px dashed var(--border)', paddingTop: 16 }}>
            <span style={{ fontSize: 11, color: 'var(--text4)', alignSelf: 'center', marginRight: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Or:</span>
            {[
              { key: 'fabric_is_flexible', label: "I'm flexible" },
              { key: 'fabric_not_sure',    label: "Not sure yet" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => set(key, !answers[key])}
                style={{
                  padding: '9px 20px', borderRadius: 8,
                  border: `1.5px solid ${answers[key] ? '#C46E49' : '#B0A89A'}`,
                  background: answers[key] ? 'rgba(196,110,73,0.10)' : 'rgba(176,168,154,0.10)',
                  color: answers[key] ? '#C46E49' : 'var(--text2)',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)',
                  transition: 'all 0.15s',
                }}
              >
                {answers[key] ? '✓ ' : ''}{label}
              </button>
            ))}
          </div>
        </div>
      );

    case 4:
      return (
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
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{opt.label}</div>
            </button>
          ))}
        </div>
      );

    case 5:
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <ChipSelect
            options={CRAFTS}
            selected={answers.crafts}
            onToggle={val => toggle('crafts', val)}
          />
          <div style={{ display: 'flex', gap: 12, borderTop: '1px dashed var(--border)', paddingTop: 16 }}>
            <span style={{ fontSize: 11, color: 'var(--text4)', alignSelf: 'center', marginRight: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Or:</span>
            {[
              { key: 'craft_is_flexible', label: "I'm flexible" },
              { key: 'craft_not_sure',    label: "Not sure yet" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => set(key, !answers[key])}
                style={{
                  padding: '9px 20px', borderRadius: 8,
                  border: `1.5px solid ${answers[key] ? '#C46E49' : '#B0A89A'}`,
                  background: answers[key] ? 'rgba(196,110,73,0.10)' : 'rgba(176,168,154,0.10)',
                  color: answers[key] ? '#C46E49' : 'var(--text2)',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)',
                  transition: 'all 0.15s',
                }}
              >
                {answers[key] ? '✓ ' : ''}{label}
              </button>
            ))}
          </div>
        </div>
      );

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
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', lineHeight: 1.5 }}>{opt.label}</div>
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
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{s.label}</div>
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

          {/* Optional name fields */}
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

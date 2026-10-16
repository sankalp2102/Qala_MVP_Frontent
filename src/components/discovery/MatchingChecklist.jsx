// src/components/discovery/MatchingChecklist.jsx
//
// Shared "reading your brief against our partner studios" progress
// animation shown while a match request is in flight.
//
// Design note: replaces the old single spinner + rotating line of text
// with five brief-aspect rows that tick off one at a time. It's driven
// entirely by the `step` prop — this component has no timer of its own.
// Brief.jsx's proceedToMatch() already ticks a loadingStep counter every
// ~600ms (and already runs for both the signed-in/has-contact path and
// the first-time path, right after the contact form is submitted), so
// both paths render this exact same animation, in sync with the real
// request, with zero new branching logic needed.
//
// Visual reference: the matchmaking-animation artifact Sankalp shared
// (progress-card / pc-row / pc-dot pattern) — ported to real CSS-in-JS
// here instead of the artifact's static HTML/CSS.

const SAGE = 'var(--sage)';

export const CHECKLIST_STEPS = [
  'Silhouette and garment type',
  'Fabric',
  'Print and surface work',
  'Ways of working',
  'Quantity and timeline',
];

export default function MatchingChecklist({ step = 0 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {CHECKLIST_STEPS.map((label, i) => {
        const done = i <= step;
        return (
          <div
            key={label}
            style={{
              display: 'flex', alignItems: 'center', gap: 9,
              fontSize: 12.5, fontFamily: 'var(--font-body)',
              color: done ? 'var(--text)' : 'var(--text3)',
              transition: 'color 0.2s ease',
            }}
          >
            <span style={{
              width: 14, height: 14, flexShrink: 0, borderRadius: '50%',
              border: `1.5px solid ${done ? SAGE : 'var(--border2)'}`,
              background: done ? SAGE : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.2s ease, border-color 0.2s ease',
            }}>
              {done && (
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none"
                  stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              )}
            </span>
            {label}
          </div>
        );
      })}
    </div>
  );
}
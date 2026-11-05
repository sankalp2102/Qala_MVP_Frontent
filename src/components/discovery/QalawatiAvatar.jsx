// src/components/discovery/QalawatiAvatar.jsx
//
// Shared Qalawati avatar mark. Every place that shows Qalawati renders this
// one component, so the artwork can never drift between screens.
//
// Redesign (Nov 2026, qalawati-avatar-handoff.html): the kolam avatar.
// A white kolam on a terracotta disc. Five pulli dots (four makers and a
// centre) held together by one unbroken line, a 4-petal rose curve. The
// line that connects the makers is Qalawati, the bridge between buyer and
// studio. Replaces the Oct 2026 embroidery-hoop-and-needle mark.
//
// Motion (straight from the handoff's animation spec):
//   entrance  fade in, scale 0.84 -> 1, rise 10px    0.9s, once     both sizes
//   breathe   whole disc scale 1 -> 1.04 -> 1         4s, infinite   both sizes
//   turn      ONLY the white kolam rotates; the       24s, linear    both sizes
//             orange disc stays still
//   ripple    two soft rings expand ~1.67x and fade   3s, 2nd +1.2s  large only
//   reduced   all of the above off when the OS "reduce motion" setting is on
//
// Props
//   size      px, default 40. 96 is the handoff's large size, 40 its small.
//   pulse     true = the large variant (ripple rings + bigger shadow).
//             Used on the welcome screen and the Stage-3 chat header.
//   animated  default true. false = still (no breathe; the kolam holds its
//             current angle). DiscoverV2 passes false for every chat
//             message except the newest Qalawati one, so a long chat isn't
//             a column of 20 spinning avatars.
//   style     extra wrapper styles (margins etc.)
//
// Three deliberate departures from the handoff's literal CSS, none visible:
//   1. The handoff's ripple keyframes animate width/height between fixed
//      96px and 160px, which only works at exactly 96px. Here the ripple
//      animates scale(1) -> scale(1.667) instead, the same 160/96 ratio,
//      so it is correct at any size. (The old version of this file injected
//      size-specific @keyframes per instance under one shared name, so two
//      avatars of different sizes on a page overwrote each other's ripple.
//      This fixes that too.)
//   2. Styles are injected once into <head>, not once per avatar.
//   3. A still avatar pauses the kolam's turn rather than removing it, so
//      when the newest message stops being newest the pattern stays where
//      it was instead of snapping back to 0 degrees.

const STYLE_ID = 'qw-avatar-styles';

const CSS = `
.qw-avatar { position: relative; flex-shrink: 0; }

.qw-avatar__svg {
  display: block;
  width: 100%; height: 100%;
  position: relative; z-index: 1;
  animation:
    qwIn 0.9s cubic-bezier(.2,.7,.3,1) both,
    qwBreathe 4s ease-in-out 1s infinite;
}
.qw-avatar--lg .qw-avatar__svg { filter: drop-shadow(0 8px 22px rgba(196,100,74,0.32)); }
.qw-avatar--sm .qw-avatar__svg { filter: drop-shadow(0 4px 10px rgba(196,100,74,0.25)); }

.qw-avatar__kolam {
  transform-box: view-box;
  transform-origin: 32px 32px;
  animation: qwTurn 24s linear infinite;
}

.qw-avatar--lg::before,
.qw-avatar--lg::after {
  content: '';
  position: absolute;
  top: 50%; left: 50%;
  width: 100%; height: 100%;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  background: rgba(212,131,106,0.22);
  animation: qwRipple 3s ease-out infinite;
  pointer-events: none;
}
.qw-avatar--lg::after {
  background: rgba(212,131,106,0.12);
  animation-delay: 1.2s;
}

.qw-avatar--still .qw-avatar__svg   { animation: none; }
.qw-avatar--still .qw-avatar__kolam { animation-play-state: paused; }

@keyframes qwIn {
  0%   { opacity: 0; transform: scale(0.84) translateY(10px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes qwBreathe {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.04); }
}
@keyframes qwTurn {
  to { transform: rotate(360deg); }
}
@keyframes qwRipple {
  0%   { transform: translate(-50%, -50%) scale(1);     opacity: 0.9; }
  100% { transform: translate(-50%, -50%) scale(1.667); opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .qw-avatar__svg,
  .qw-avatar__kolam,
  .qw-avatar--lg::before,
  .qw-avatar--lg::after { animation: none; }
}
`;

function ensureStyles() {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = CSS;
  document.head.appendChild(el);
}

// The single continuous kolam line (4-petal rose curve), verbatim from the handoff.
const KOLAM_PATH = 'M52.5 32L52.44 32.71L52.25 33.42L51.94 34.1L51.51 34.74L50.97 35.35L50.32 35.89L49.56 36.38L48.71 36.79L47.77 37.12L46.76 37.37L45.67 37.52L44.53 37.58L43.34 37.53L42.12 37.38L40.88 37.12L39.62 36.76L38.37 36.29L37.12 35.72L35.91 35.05L34.73 34.29L33.59 33.43L32.51 32.5L31.5 31.49L30.57 30.41L29.71 29.27L28.95 28.09L28.28 26.88L27.71 25.63L27.24 24.38L26.88 23.12L26.62 21.88L26.47 20.66L26.42 19.47L26.48 18.33L26.63 17.24L26.88 16.23L27.21 15.29L27.62 14.44L28.11 13.68L28.65 13.03L29.26 12.49L29.9 12.06L30.58 11.75L31.29 11.56L32 11.5L32.71 11.56L33.42 11.75L34.1 12.06L34.74 12.49L35.35 13.03L35.89 13.68L36.38 14.44L36.79 15.29L37.12 16.23L37.37 17.24L37.52 18.33L37.58 19.47L37.53 20.66L37.38 21.88L37.12 23.12L36.76 24.38L36.29 25.63L35.72 26.87L35.05 28.09L34.29 29.27L33.43 30.41L32.5 31.49L31.49 32.5L30.41 33.43L29.27 34.29L28.09 35.05L26.88 35.72L25.63 36.29L24.38 36.76L23.12 37.12L21.88 37.38L20.66 37.53L19.47 37.58L18.33 37.52L17.24 37.37L16.23 37.12L15.29 36.79L14.44 36.38L13.68 35.89L13.03 35.35L12.49 34.74L12.06 34.1L11.75 33.42L11.56 32.71L11.5 32L11.56 31.29L11.75 30.58L12.06 29.9L12.49 29.26L13.03 28.65L13.68 28.11L14.44 27.62L15.29 27.21L16.23 26.87L17.24 26.63L18.33 26.48L19.47 26.42L20.66 26.47L21.88 26.62L23.12 26.88L24.38 27.24L25.63 27.71L26.87 28.28L28.09 28.95L29.27 29.71L30.41 30.57L31.49 31.5L32.5 32.51L33.43 33.59L34.29 34.73L35.05 35.91L35.72 37.12L36.29 38.37L36.76 39.62L37.12 40.88L37.38 42.12L37.53 43.34L37.58 44.53L37.52 45.67L37.37 46.76L37.12 47.77L36.79 48.71L36.38 49.56L35.89 50.32L35.35 50.97L34.74 51.51L34.1 51.94L33.42 52.25L32.71 52.44L32 52.5L31.29 52.44L30.58 52.25L29.9 51.94L29.26 51.51L28.65 50.97L28.11 50.32L27.62 49.56L27.21 48.71L26.88 47.77L26.63 46.76L26.48 45.67L26.42 44.53L26.47 43.34L26.62 42.12L26.88 40.88L27.24 39.62L27.71 38.37L28.28 37.13L28.95 35.91L29.71 34.73L30.57 33.59L31.5 32.51L32.51 31.5L33.59 30.57L34.73 29.71L35.91 28.95L37.12 28.28L38.37 27.71L39.62 27.24L40.88 26.88L42.12 26.62L43.34 26.47L44.53 26.42L45.67 26.48L46.76 26.63L47.77 26.88L48.71 27.21L49.56 27.62L50.32 28.11L50.97 28.65L51.51 29.26L51.94 29.9L52.25 30.58L52.44 31.29L52.5 32Z';

export default function QalawatiAvatar({ size = 40, pulse = false, animated = true, style } = {}) {
  ensureStyles();
  const cls = [
    'qw-avatar',
    pulse ? 'qw-avatar--lg' : 'qw-avatar--sm',
    animated ? '' : 'qw-avatar--still',
  ].filter(Boolean).join(' ');

  return (
    <div className={cls} style={{ width: size, height: size, ...style }}>
      <svg className="qw-avatar__svg" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Qalawati">
        {/* orange disc: stays still */}
        <circle cx="32" cy="32" r="32" fill="#D4836A" />
        {/* kolam: rotates slowly as one group */}
        <g className="qw-avatar__kolam" fill="#fff">
          <circle cx="32" cy="32" r="25" fill="none" stroke="#fff" strokeWidth="1" opacity="0.4" />
          <path d={KOLAM_PATH} fill="none" stroke="#fff" strokeWidth="1.7" strokeLinejoin="round" />
          {/* pulli dots: four makers + centre */}
          <circle cx="22.6" cy="22.6" r="2.4" />
          <circle cx="41.4" cy="22.6" r="2.4" />
          <circle cx="41.4" cy="41.4" r="2.4" />
          <circle cx="22.6" cy="41.4" r="2.4" />
          <circle cx="32" cy="32" r="2.4" />
        </g>
      </svg>
    </div>
  );
}
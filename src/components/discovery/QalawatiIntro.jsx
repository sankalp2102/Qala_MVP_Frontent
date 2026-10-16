// src/components/discovery/QalawatiIntro.jsx
//
// Welcome screen (qala-brief-spec.docx, Section 3 — Stage 1). Ports the
// prototype's sequence: avatar with pulse rings -> two lines typed
// character-by-character -> input/chips/privacy note fade in once typing
// finishes. The third line from the old version ("Share your ideas with
// me...") is dropped — the spec only has two typed lines; that copy now
// lives in the input placeholder instead (DiscoverV2.jsx), same as the spec.
//
// Purely presentational: calls onComplete once both lines have finished
// typing, and (optionally) onQuickChip(text) if the caller wants the 5
// quick-start idea chips rendered here rather than built separately.

import { useState } from 'react';
import QalawatiAvatar from './QalawatiAvatar';
import TypedText from './TypedText';

// Exact copy from the spec's "Complete Copy Reference" (Stage 1).
const LINES = [
  { text: "Welcome to Qala. I'm Qalawati — your making guide.", cls: 'qw-line-h' },
  { text: 'So, what do you want to make?', cls: 'qw-line-q' },
];

// Spec Section 3 — Quick-Start Chips (five idea chips below the welcome input).
export const QUICK_START_CHIPS = [
  'Hand block Dresses',
  'Kantha Jackets',
  'Khadi Cotton Pants',
  'Natural Indigo Dyed Skirts',
  'Hand Knit Sweaters',
];

export default function QalawatiIntro({ onComplete, onQuickChip }) {
  const [lineIndex, setLineIndex] = useState(0); // which line is currently typing/shown
  const [linesDone, setLinesDone] = useState(false);

  function handleLineDone() {
    if (lineIndex < LINES.length - 1) {
      setTimeout(() => setLineIndex(i => i + 1), 300);
    } else {
      setLinesDone(true);
      onComplete && setTimeout(onComplete, 200);
    }
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '22px 24px 14px', textAlign: 'center', fontFamily: 'var(--font-body)',
    }}>
      <style>{`
        .qw-line-h { font-family: var(--font-display); font-size: 20px; font-weight: 500; color: var(--ink-warm); line-height: 1.3; margin-bottom: 12px; }
        .qw-line-q { font-family: var(--font-display); font-size: 19px; font-weight: 500; color: var(--ink-warm); line-height: 1.25; margin-top: 12px; margin-bottom: 4px; }
        .qw-chips-wrap { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 14px; opacity: 0; transform: translateY(6px); transition: opacity 0.5s ease 0.15s, transform 0.5s ease 0.15s; }
        .qw-chips-wrap.in { opacity: 1; transform: none; }
        .qw-chip { font-family: var(--font-body); font-size: 12.5px; color: var(--ink-warm-mid); background: #fff; border: 0.5px solid var(--border-warm-s); border-radius: 20px; padding: 7px 14px; cursor: pointer; white-space: nowrap; transition: border-color 0.15s, background 0.15s, color 0.15s; }
        .qw-chip:hover { border-color: var(--qw-b); background: var(--qw-l); color: var(--qw); }
        .qw-priv { margin-top: 16px; font-size: 10.5px; color: var(--ink-warm-mute); letter-spacing: 0.03em; opacity: 0; transition: opacity 0.5s ease 0.3s; }
        .qw-priv.in { opacity: 1; }
      `}</style>

      <QalawatiAvatar
        size={64}
        pulse
        style={{ margin: '0 auto 20px', filter: 'drop-shadow(0 10px 26px rgba(196,100,74,0.28))' }}
      />

      <div style={{ maxWidth: 480, width: '100%' }}>
        {LINES.slice(0, lineIndex + 1).map((line, i) => (
          i < lineIndex || linesDone ? (
            <div key={i} className={line.cls}>{line.text}</div>
          ) : (
            <TypedText key={i} as="div" className={line.cls} text={line.text} onDone={handleLineDone} />
          )
        ))}
      </div>

      {onQuickChip && (
        <>
          <div className={`qw-chips-wrap${linesDone ? ' in' : ''}`}>
            {QUICK_START_CHIPS.map(c => (
              <button key={c} className="qw-chip" onClick={() => onQuickChip(c)}>{c}</button>
            ))}
          </div>
          <div className={`qw-priv${linesDone ? ' in' : ''}`}>
            Your ideas stay private — never shared without your consent.
          </div>
        </>
      )}
    </div>
  );
}
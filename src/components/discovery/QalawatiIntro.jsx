// src/components/discovery/QalawatiIntro.jsx
//
// Ports the prototype's "ewelcome" sequence exactly: same avatar artwork,
// same three lines of copy (E_WELCOME), same stagger timing (1600ms after
// the first line, 1300ms after the second). Purely presentational — calls
// onComplete once the sequence has finished so the parent can reveal
// whatever comes next (the message input).

import { useEffect, useState } from 'react';
import QalawatiAvatar from './QalawatiAvatar';

// Exact avatar markup from the prototype (E_AV_SVG) — terracotta circle
// with the hand-drawn botanical mark.
// Exact copy from the prototype's E_WELCOME array — do not reword.
const LINES = [
  "Welcome to Qala. I'm Qalawati — your making guide.",
  'So, what do you want to make?',
  "Share your ideas with me — I'll help you shape them and find the right production partner.",
];

export default function QalawatiIntro({ onComplete }) {
  const [shown, setShown] = useState(0); // how many lines are mounted
  const [avatarIn, setAvatarIn] = useState(false);

  useEffect(() => {
    const t0 = setTimeout(() => setAvatarIn(true), 20);
    // Same stagger as the prototype: first gap 1600ms, then 1300ms per line.
    const timers = [t0];
    let elapsed = 0;
    LINES.forEach((_, i) => {
      elapsed += i === 0 ? 0 : (i === 1 ? 1600 : 1300);
      timers.push(setTimeout(() => setShown(i + 1), elapsed));
    });
    const doneAt = elapsed + 500; // small buffer after the last line's fade
    if (onComplete) timers.push(setTimeout(onComplete, doneAt));
    return () => timers.forEach(clearTimeout);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '22px 24px 14px', textAlign: 'center', fontFamily: 'var(--font-body)',
    }}>
      <style>{`
        @keyframes qwAvIn { 0% { opacity: 0; transform: scale(0.84) translateY(10px); } 100% { opacity: 1; transform: none; } }
        .qw-ew-line { font-size: 15.5px; line-height: 1.6; color: var(--ink-warm-mid); margin-bottom: 10px; opacity: 0; transform: translateY(8px); transition: opacity 0.6s ease, transform 0.6s ease; }
        .qw-ew-line.in { opacity: 1; transform: none; }
        .qw-ew-h { font-family: var(--font-display); font-size: 20px; font-weight: 500; color: var(--ink-warm); line-height: 1.3; margin-bottom: 12px; }
        .qw-ew-q { font-family: var(--font-display); font-size: 19px; font-weight: 500; color: var(--ink-warm); line-height: 1.25; margin-top: 12px; margin-bottom: 4px; }
        .qw-ew-soft { font-size: 13px; color: var(--ink-warm-mute); line-height: 1.5; margin-bottom: 0; }
      `}</style>

      <QalawatiAvatar
        size={64}
        style={{
          margin: '0 auto 14px',
          filter: 'drop-shadow(0 10px 26px rgba(196,100,74,0.28))',
          opacity: avatarIn ? 1 : 0,
          animation: avatarIn ? 'qwAvIn 1s cubic-bezier(0.2,0.7,0.3,1) both' : 'none',
        }}
      />

      <div style={{ maxWidth: 480, width: '100%' }}>
        {LINES.slice(0, shown).map((line, i) => {
          const isQ = /what.*to make/i.test(line);
          const cls = i === 0 ? 'qw-ew-h' : isQ ? 'qw-ew-q' : (i === LINES.length - 1 ? 'qw-ew-soft' : '');
          return (
            <IntroLine key={i} className={cls}>{line}</IntroLine>
          );
        })}
      </div>
    </div>
  );
}

function IntroLine({ className, children }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf2);
    });
    return () => cancelAnimationFrame(raf1);
  }, []);
  return (
    <div className={`qw-ew-line ${className} ${visible ? 'in' : ''}`}>
      {children}
    </div>
  );
}
// src/components/discovery/TypedText.jsx
//
// Character-by-character typing animation with a blinking cursor, ported
// from the prototype's typeLine() (qala-welcome-screen.html): ~28ms/char,
// a longer pause after commas/periods, cursor removed ~400ms after the
// last character. Used anywhere Qalawati's own copy should feel "typed"
// rather than just appearing — the welcome screen lines and (optionally)
// live chat bubbles.
//
// Kept intentionally dumb: it owns no conversation state, just reveals the
// `text` prop it's given and calls onDone once. Re-mount (change `key`) to
// re-run the animation for new text.

import { useEffect, useRef, useState } from 'react';

export default function TypedText({ text, onDone, charDelay = 28, as: Tag = 'span', style, className }) {
  const [shown, setShown] = useState('');
  const [done, setDone] = useState(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    let i = 0;
    let cancelled = false;
    setShown('');
    setDone(false);

    function next() {
      if (cancelled) return;
      if (i < text.length) {
        const ch = text[i];
        i++;
        setShown(text.slice(0, i));
        const delay = (ch === ',' || ch === '.') ? charDelay * 3.2 : charDelay + Math.random() * 18;
        setTimeout(next, delay);
      } else {
        setTimeout(() => {
          if (!cancelled) {
            setDone(true);
            onDoneRef.current && onDoneRef.current();
          }
        }, 400);
      }
    }
    const start = setTimeout(next, 0);
    return () => { cancelled = true; clearTimeout(start); };
  }, [text, charDelay]);

  return (
    <Tag className={className} style={style}>
      {shown}
      {!done && (
        <span style={{
          display: 'inline-block', width: 2, height: '1em', marginLeft: 2,
          background: 'var(--qw-b)', verticalAlign: 'middle', borderRadius: 1,
          animation: 'qwCursorBlink 1s step-end infinite',
        }} />
      )}
      <style>{`@keyframes qwCursorBlink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }`}</style>
    </Tag>
  );
}
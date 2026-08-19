// src/components/DeviceGate.jsx
//
// Feature (Aug 2026) — "Mobile / device rules" spec:
//   - Phones: blocked entirely, any orientation. "Please use desktop,
//     laptop, or tablet" message. No mobile optimization anywhere else
//     in the app — this gate is the whole mobile story by design.
//   - Tablets: only landscape needs to work. Portrait shows a
//     "rotate your device" message instead of the app.
//   - Desktop/laptop: always allowed, completely unaffected.
//
// Classification deliberately does NOT gate on window width alone — a
// desktop user with a narrow or split-screen browser window must never
// see a "please use desktop" message; that's a real, common case (this
// app itself gets tested in a narrow scratch window all the time) and a
// width-only check would incorrectly block it. Instead this checks for
// genuine touch-primary hardware first (via the `pointer: coarse` media
// query, the same signal touch-vs-mouse feature detection generally
// relies on, backed up by maxTouchPoints/ontouchstart for browsers that
// don't support the media query) — a mouse/trackpad device is NEVER
// blocked, regardless of how small its window is. Only once a device is
// confirmed touch-primary does screen size decide phone vs. tablet, and
// only for a touch-primary tablet-sized device does orientation matter.
import { useEffect, useState } from 'react';

const PHONE_MAX_SHORT_SIDE = 600;  // device's short side (constant across rotation) still "phone"
                                    // — sits comfortably between the largest common phone short
                                    // side (iPhone 15 Pro Max: 430) and the smallest common
                                    // tablet short side (iPad Mini: 744)
const TABLET_MAX_LONG_SIDE = 1366; // covers iPad Pro 12.9" landscape (1366×1024) at the top end

function computeDeviceClass() {
  if (typeof window === 'undefined') return 'desktop';

  const w = window.innerWidth;
  const h = window.innerHeight;
  // Bug fix: classifying by Math.max(w, h) misclassified a real iPhone
  // 15 (390×844 portrait) as a TABLET — its height (844) exceeded a
  // naive 768px "phone" ceiling, because modern phones are tall due to
  // their aspect ratio, not because they're tablet-sized. A phone's
  // SHORT side (~360–430px on every current phone) never changes when
  // you rotate it, and stays well clear of even the smallest real
  // tablet's short side (iPad Mini: 744px) — so the short side, not
  // whichever side is currently longer, is what actually distinguishes
  // "phone" from "tablet" regardless of orientation. Caught by testing
  // real device dimensions before shipping this, not by assumption.
  const shortSide = Math.min(w, h);
  const longSide  = Math.max(w, h);

  const isCoarsePointer = window.matchMedia?.('(pointer: coarse)')?.matches;
  const isTouchCapable = isCoarsePointer
    || (navigator.maxTouchPoints ?? 0) > 0
    || 'ontouchstart' in window;

  if (!isTouchCapable) return 'desktop';                    // mouse/trackpad — never blocked
  if (shortSide < PHONE_MAX_SHORT_SIDE) return 'phone';      // small touch device — always blocked
  if (longSide <= TABLET_MAX_LONG_SIDE) {
    return w >= h ? 'tablet-landscape' : 'tablet-portrait';
  }
  return 'desktop';                                          // large touchscreen (touch laptop/monitor)
}

function GateScreen({ title, body, icon }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'var(--bg)', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', textAlign: 'center',
      padding: '48px 32px', gap: 20,
    }}>
      <div style={{ fontSize: 40, lineHeight: 1 }}>{icon}</div>
      <h1 style={{
        fontFamily: 'var(--font-display)', fontWeight: 300,
        fontSize: 'clamp(24px, 6vw, 34px)', color: 'var(--text)',
        margin: 0, maxWidth: 420,
      }}>
        {title}
      </h1>
      <p style={{
        fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--text3)',
        lineHeight: 1.6, margin: 0, maxWidth: 340,
      }}>
        {body}
      </p>
    </div>
  );
}

export default function DeviceGate({ children }) {
  const [deviceClass, setDeviceClass] = useState(computeDeviceClass);

  useEffect(() => {
    const update = () => setDeviceClass(computeDeviceClass());
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  if (deviceClass === 'phone') {
    return (
      <GateScreen
        icon="🖥️"
        title="Please use a desktop, laptop, or tablet"
        body="Qala isn't available on mobile phones. Please switch to a larger device to continue."
      />
    );
  }

  if (deviceClass === 'tablet-portrait') {
    return (
      <GateScreen
        icon="🔄"
        title="Please rotate your device"
        body="Qala works in landscape mode on tablets. Rotate your device to continue."
      />
    );
  }

  return children;
}
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
// Bug fix (Aug 2026) — "the mobile block is showing on Chrome on laptop
// for a few users": the original version gated on touch HARDWARE
// capability (`pointer: coarse`, maxTouchPoints, ontouchstart) as a
// proxy for "is this a phone or tablet." That's the wrong question.
// Touchscreen Windows laptops (2-in-1s: Surface, HP Spectre x360,
// Lenovo Yoga, Dell XPS 2-in-1, etc.) are full laptops — keyboard,
// trackpad, mouse — where touch is a genuine but SECONDARY input.
// Chrome on Windows reports touch capability as true on these because
// the hardware exists, regardless of whether the person is actually
// touching the screen — which is exactly why this was hitting real
// laptop users. Switched to checking the device's actual OS/platform
// identity (User-Agent + Chrome/Edge's Client Hints API) instead of
// hardware capability — "does this device run a phone/tablet operating
// system" is the right question, not "can this device be touched."
import { useEffect, useState } from 'react';

const PHONE_MAX_SHORT_SIDE = 600;  // device's short side (constant across rotation) still "phone"
                                    // — sits comfortably between the largest common phone short
                                    // side (iPhone 15 Pro Max: 430) and the smallest common
                                    // tablet short side (iPad Mini: 744)
const TABLET_MAX_LONG_SIDE = 1366; // covers iPad Pro 12.9" landscape (1366×1024) at the top end

function isMobileOrTabletOS() {
  const ua = navigator.userAgent || '';

  // iPadOS 13+ deliberately reports as "Macintosh" in its UA to get
  // desktop-class sites by default — a well-known, standard quirk. The
  // established way to still catch it: a real Mac never reports touch
  // points at all; an iPad, even identifying as "Macintosh", does.
  const isIPadOS = /Macintosh/i.test(ua) && navigator.maxTouchPoints > 1;

  // Traditional mobile/tablet UA signatures. Deliberately does NOT
  // match "Windows" or generic "Touch" tokens some Windows UAs carry —
  // that's exactly the touchscreen-laptop false positive being fixed.
  const isMobileUA = /Android|iPhone|iPad|iPod|Mobi|Tablet/i.test(ua);

  // Chrome/Edge Client Hints — `mobile` is true only for actual phones
  // (false for tablets too, and false for every desktop/laptop
  // regardless of touch hardware). Only used as an extra positive
  // signal, never to override the UA checks above — plenty of browsers
  // (Safari, Firefox) don't support it at all.
  const clientHintsMobile = navigator.userAgentData?.mobile === true;

  return isIPadOS || isMobileUA || clientHintsMobile;
}

function computeDeviceClass() {
  if (typeof window === 'undefined') return 'desktop';

  if (!isMobileOrTabletOS()) return 'desktop';  // laptop/desktop — never blocked, touch or not

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

  if (shortSide < PHONE_MAX_SHORT_SIDE) return 'phone';      // small mobile-OS device — always blocked
  if (longSide <= TABLET_MAX_LONG_SIDE) {
    return w >= h ? 'tablet-landscape' : 'tablet-portrait';
  }
  return 'desktop';                                          // confirmed mobile OS but unusually large viewport — rare; fail safe to desktop
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
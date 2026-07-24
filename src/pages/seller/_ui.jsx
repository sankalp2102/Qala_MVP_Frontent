/*
 * src/pages/seller/_ui.jsx
 *
 * Shared primitives for the seller onboarding form (Sections A–H).
 *
 * Before this file, each of the eight sections redefined its own SectionHeader,
 * CardSection, Field, SavedPulse and ExpertiseButtons. They have all been
 * consolidated here and reshaped to match the studio-profile prototype:
 *
 *   - Question cards now render the ref ("A.1") on its own line beneath the
 *     italic title, instead of inlining it as "A.1 — Studio Name".
 *   - ExpertiseButtons takes an explicit `tooltips` set, because the three
 *     places it appears (fabrics, dyes, techniques) use three different copy
 *     sets. The old single LEVEL_META had its tooltips mismatched.
 *
 * Layout/colour constants come from the prototype, not from index.css vars,
 * wherever the prototype pins an exact hex.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { registerAutosave } from '../../utils/autosaveRegistry';

/**
 * Debounced autosave. Persists `persistFn` a short time after `deps` change,
 * skips the initial mount, serializes concurrent saves with an in-flight lock
 * (and re-runs once if a change landed mid-save). Returns an `autoSaving` flag
 * for the footer indicator so it can show "Saving…" vs "Changes saved".
 */
export function useAutosave(persistFn, deps, delay = 900) {
  const [autoSaving, setAutoSaving] = useState(false);
  const first    = useRef(true);
  const timer    = useRef(null);
  const inflight  = useRef(false);
  const pending  = useRef(false);
  const dirty    = useRef(false);   // edits waiting for the debounce to fire
  const mounted  = useRef(true);    // avoid setState after unmount
  const fnRef    = useRef(persistFn);
  fnRef.current  = persistFn;

  const run = async () => {
    if (inflight.current) { pending.current = true; return; }
    inflight.current = true;
    dirty.current = false;
    if (mounted.current) setAutoSaving(true);
    try { await fnRef.current(); } catch {}
    inflight.current = false;
    if (mounted.current) setAutoSaving(false);
    if (pending.current) { pending.current = false; run(); }
  };

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    dirty.current = true;
    clearTimeout(timer.current);
    timer.current = setTimeout(run, delay);
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  // Flush on unmount. Each onboarding section is its own route, so moving
  // between sections in the sidebar unmounts the component — and the effect
  // cleanup above would clear the pending timer, silently dropping anything
  // typed in the last `delay` ms while the footer still read
  // "Changes saved automatically". Fire the save instead of discarding it; the
  // request completes even though the component is gone.
  useEffect(() => () => {
    mounted.current = false;
    clearTimeout(timer.current);
    if (dirty.current) { dirty.current = false; fnRef.current?.(); }
  }, []);

  // Run the pending save immediately (no-op when there's nothing waiting).
  // Returns the persist promise so callers — logout, in particular — can await it.
  const flush = useCallback(() => {
    clearTimeout(timer.current);
    if (!dirty.current) return null;
    dirty.current = false;
    try { return fnRef.current?.(); } catch { return null; }
  }, []);

  // Make this section's pending save reachable from outside React, so logout can
  // await it before the auth tokens are cleared.
  useEffect(() => {
    flush.isDirty = () => dirty.current;
    return registerAutosave(flush);
  }, [flush]);

  // Page lifecycle — the cases in-app navigation doesn't cover.
  //
  // visibilitychange/pagehide are the reliable signals: they fire while the page
  // is still alive (tab switch, minimise, mobile backgrounding, and usually tab
  // close), so a normal request still completes.
  //
  // beforeunload cannot reliably finish an async request, so we do both things
  // that are possible: fire the save as a best effort, and ask the browser to
  // show its "Leave site?" prompt so the seller isn't silently losing work.
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') flush(); };
    const onPageHide = () => flush();
    const onBeforeUnload = (e) => {
      if (!dirty.current) return;
      flush();
      e.preventDefault();
      e.returnValue = '';
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [flush]);

  return autoSaving;
}

/* ═══════════════════════════════════════════════════════════════════════════
   SHARED INPUT STYLES
   ═══════════════════════════════════════════════════════════════════════════ */

export const inputStyle = {
  width: '100%', padding: '9px 12px',
  border: '1px solid #D8D4CF', borderRadius: 5,
  background: '#fff', color: '#1A1A1A',
  fontSize: 13, fontFamily: "'DM Sans', sans-serif",
  outline: 'none', transition: 'border-color .15s',
  appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'textfield',
};

export const textareaStyle = {
  width: '100%', padding: '9px 12px',
  border: '1px solid #D8D4CF', borderRadius: 5,
  background: '#fff', color: '#1A1A1A',
  fontSize: 13, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6,
  outline: 'none', transition: 'border-color .15s', resize: 'vertical',
};

/* ═══════════════════════════════════════════════════════════════════════════
   ICONS
   ═══════════════════════════════════════════════════════════════════════════ */

export function TrashIcon({ size = 16, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" style={{ display: 'block', flexShrink: 0 }}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

export function TrashBtn({ onClick, label = 'Remove', size = 16, danger = false }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      aria-label={label}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: hover || danger ? '#C0392B' : '#CCC',
        padding: '4px 6px', borderRadius: 4,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        lineHeight: 1, transition: 'color .12s',
      }}>
      <TrashIcon size={size} />
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   HEADERS, CARDS, BADGES
   ═══════════════════════════════════════════════════════════════════════════ */

export function SectionHeader({ letter, title, desc }) {
  return (
    <div className="fade-up" style={{ marginBottom: 32 }}>
      <div className="section-tag">
        Section {letter}
      </div>
      <h1 className="section-title">{title}</h1>
      <p className="section-desc">{desc}</p>
    </div>
  );
}

/**
 * Question card. Matches the prototype's .q-card:
 *   italic serif title  ->  uppercase grey ref  ->  grey description  ->  body
 */
export function QCard({ qref, title, desc, children, style }) {
  return (
    <div className="q-card fade-up" style={style}>
      <div className="q-card-inner">
        {title && <div className="q-title">{title}</div>}
        {qref && (
          <div className="q-ref">
            {qref}
          </div>
        )}
        {desc && <div className="q-desc">{desc}</div>}
        {children}
      </div>
    </div>
  );
}

export function FieldLabel({ children }) {
  return <label className="field-label">{children}</label>;
}

export function Field({ label, hint, children, style }) {
  return (
    <div style={{ marginBottom: 16, ...style }}>
      {label && <FieldLabel>{label}</FieldLabel>}
      {children}
      {hint && <div className="field-hint">{hint}</div>}
    </div>
  );
}

/** The prototype's 💡 tip boxes in F.5 / F.6. */
export function InfoBox({ children }) {
  return (
    <div style={{
      marginTop: 10, fontSize: 11, color: '#AAAAAA',
      background: '#FAFAF8', border: '1px solid #F0EDE8',
      borderRadius: 5, padding: '10px 12px', lineHeight: 1.5,
    }}>
      {children}
    </div>
  );
}

export function FlagBanner({ reason }) {
  if (!reason) return null;
  return (
    <div style={{
      background: 'var(--red-dim)', border: '1px solid rgba(224,85,85,0.25)',
      borderLeft: '3px solid var(--red)', borderRadius: 6,
      padding: '8px 12px', fontSize: 12, color: 'var(--red)', marginBottom: 12,
    }}>
      Admin flagged: {reason}
    </div>
  );
}

export function SavedPulse({ show }) {
  if (!show) return null;
  return <span style={{ fontSize: 11, color: '#AAA' }}>Saved</span>;
}

/** Passive autosave indicator — replaces the manual Save button. */
export function AutosaveIndicator({ saving }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: saving ? '#AAA' : '#4A8A4A' }}>
      {saving ? (
        <><span className="spinner" style={{ width: 12, height: 12 }} /> Saving…</>
      ) : (
        <>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 15, height: 15, borderRadius: '50%', background: '#E8F5E2', color: '#4A8A4A',
            fontSize: 10, fontWeight: 700,
          }}>✓</span>
          Changes saved automatically
        </>
      )}
    </span>
  );
}

/**
 * Section footer. The standalone "Save" button was removed — every section
 * autosaves as you type, so the footer keeps only the navigation button and a
 * passive autosave indicator. Section H overrides nextLabel to "Submit Profile ✓".
 */
export function SectionFooter({ onNext, saving, autoSaving, nextLabel = 'Save & Next →' }) {
  return (
    <div style={{ display: 'flex', gap: 14, marginTop: 8, alignItems: 'center' }}>
      <button className="btn btn-primary fade-up" onClick={onNext} disabled={saving}>
        {saving ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Saving…</> : nextLabel}
      </button>
      <AutosaveIndicator saving={autoSaving} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   EXPERTISE BUTTONS
   ═══════════════════════════════════════════════════════════════════════════ */

/*
 * Three levels, three colour steps of green intensity. Values match the
 * backend `ExpertiseLevel` TextChoices exactly: moderate / high / pro.
 */
export const EXPERTISE_LEVELS = [
  { value: 'moderate', label: 'Moderate', bg: '#EBF5E8', text: '#5C845C', border: '#9EC09E' },
  { value: 'high',     label: 'High',     bg: '#A8D4A8', text: '#2A5E2A', border: '#7AB47A' },
  { value: 'pro',      label: 'Pro',      bg: '#4A7C4A', text: '#FFFFFF', border: '#4A7C4A' },
];

/*
 * The prototype uses a DIFFERENT tooltip set in each of the three contexts.
 * The previous implementation reused one set for all of them, and had its
 * three strings assigned to the wrong three buttons. Both are fixed here.
 */
export const EXPERTISE_TOOLTIPS = {
  fabric: {
    moderate: 'Can source and use, not a specialty',
    high:     'Work with regularly, good command',
    pro:      'Core material, deep expertise',
  },
  dye: {
    moderate: 'Occasional use, still developing',
    high:     'Regular practice, confident results',
    pro:      'Specialist, rare expertise',
  },
  technique: {
    moderate: 'Occasional orders, growing comfort',
    high:     'Regular capability, strong output',
    pro:      'Primary focus, deep expertise',
  },
};

/**
 * Tooltip is portalled to document.body. Without the portal, any ancestor with
 * a CSS transform (the fade-up animation, card hovers) creates a stacking
 * context that makes position:fixed behave like position:absolute.
 */
export function ExpertiseButtons({ value, onChange, disabled = false, tooltips = EXPERTISE_TOOLTIPS.fabric }) {
  const [tip, setTip] = useState(null);

  const enter = (e, text) => {
    if (disabled || !text) return;
    const r = e.currentTarget.getBoundingClientRect();
    setTip({ text, x: r.left + r.width / 2, y: r.top });
  };
  const leave = () => setTip(null);

  const tipEl = tip ? (
    <div style={{
      position: 'fixed', left: tip.x, top: tip.y,
      transform: 'translate(-50%, calc(-100% - 6px))',
      background: '#1A1A1A', color: '#fff', fontSize: 10,
      padding: '4px 8px', borderRadius: 4, whiteSpace: 'nowrap',
      zIndex: 9999, pointerEvents: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
    }}>
      {tip.text}
    </div>
  ) : null;

  return (
    <>
      <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
        {EXPERTISE_LEVELS.map(l => {
          const selected = value === l.value;
          return (
            <button
              key={l.value}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && onChange(l.value)}
              onMouseEnter={e => enter(e, tooltips[l.value])}
              onMouseLeave={leave}
              style={{
                padding: '4px 11px', borderRadius: 4, fontSize: 11, fontWeight: 500,
                fontFamily: "'DM Sans', sans-serif",
                border: `1px solid ${disabled ? '#EEE' : selected ? l.border : '#D8D4CF'}`,
                background: selected && !disabled ? l.bg : '#fff',
                color: disabled ? '#DDD' : selected ? l.text : '#999',
                cursor: disabled ? 'default' : 'pointer',
                transition: 'all .12s',
              }}>
              {l.label}
            </button>
          );
        })}
      </div>
      {tipEl && createPortal(tipEl, document.body)}
    </>
  );
}

/**
 * One checkbox + expertise buttons row. Used by C.1 fabrics, C.2 dyes.
 * When checked but level is unset, the "— select level" prompt appears.
 */
export function ExpertiseRow({ name, level, checked, onToggle, onLevel, onDelete, isLast, tooltips }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '9px 0', gap: 12,
      borderBottom: isLast ? 'none' : '1px solid #F5F3EF',
    }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flex: 1, fontSize: 13, color: '#1A1A1A' }}>
        <input type="checkbox" checked={checked} onChange={onToggle} style={{ width: 'auto', cursor: 'pointer' }} />
        <span>{name}</span>
        {checked && !level && (
          <span style={{ fontSize: 10, color: '#D97520', marginLeft: 4 }}>— select level</span>
        )}
      </label>
      <ExpertiseButtons value={level} onChange={onLevel} disabled={!checked} tooltips={tooltips} />
      {onDelete && (
        <TrashBtn size={13} label={`Remove ${name}`} onClick={onDelete} />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   RANKED + TOP-5 ROWS  (Section B)
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * B.1 / B.2. The rank badge sits to the LEFT of the checkbox, per the
 * prototype's .rank-item-left ordering.
 */
export function RankRow({ name, rank, onToggle, isLast, onRemove }) {
  const checked = rank != null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', padding: '10px 0',
      borderBottom: isLast ? 'none' : '1px solid #F5F3EF',
    }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flex: 1 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
          background: checked ? '#D97520' : 'transparent',
          color: '#fff', fontSize: 11, fontWeight: 700,
        }}>
          {checked ? rank : ''}
        </span>
        <input type="checkbox" checked={checked} onChange={() => onToggle(name)} style={{ width: 'auto', cursor: 'pointer' }} />
        <span style={{ fontSize: 13, color: '#1A1A1A' }}>{name}</span>
      </label>
      {/* Only passed for studio-added entries — built-in options aren't removable */}
      {onRemove && <TrashBtn label={`Remove ${name}`} size={13} onClick={onRemove} />}
    </div>
  );
}

/**
 * B.3. Cap is FIVE (confirmed — the prototype's "Top 10" copy was discarded).
 * The ★ Top badge sits to the LEFT of the garment name.
 */
export const TOP5_MAX = 5;

export function Top5Row({ name, checked, top5, capReached, onToggle, isLast, onRemove }) {
  const [capTip, setCapTip] = useState(false);
  const canPromote = checked && (top5 || !capReached);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '9px 0', borderBottom: isLast ? 'none' : '1px solid #F5F3EF',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
        {/* ★ Top badge — LEFT of the name, per prototype */}
        <div style={{ position: 'relative', flexShrink: 0 }}
          onMouseEnter={() => capReached && checked && !top5 && setCapTip(true)}
          onMouseLeave={() => setCapTip(false)}>
          <button
            type="button"
            onClick={() => canPromote && onToggle(name, 'top5')}
            style={{
              fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4,
              background: top5 ? '#EEF3EC' : 'transparent',
              color: top5 ? '#4A7C4A' : !checked ? '#DDD' : '#AAA',
              border: `1px solid ${top5 ? '#9EC09E' : checked ? '#D8D4CF' : '#EEE'}`,
              cursor: !checked ? 'default' : canPromote ? 'pointer' : 'not-allowed',
              fontFamily: "'DM Sans', sans-serif",
            }}>
            ★ Top
          </button>
          {capTip && (
            <div style={{
              position: 'absolute', bottom: 'calc(100% + 6px)', left: 0,
              background: '#1A1A1A', color: '#fff', fontSize: 10,
              padding: '4px 8px', borderRadius: 4, whiteSpace: 'nowrap',
              zIndex: 200, pointerEvents: 'none',
            }}>
              Deselect one Top to mark this
            </div>
          )}
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flex: 1 }}>
          <input type="checkbox" checked={checked} onChange={() => onToggle(name)} style={{ width: 'auto', cursor: 'pointer' }} />
          <span style={{ fontSize: 13, color: '#1A1A1A' }}>{name}</span>
        </label>
        {/* Only passed for studio-added entries — built-in options aren't removable */}
        {onRemove && <TrashBtn label={`Remove ${name}`} size={13} onClick={onRemove} />}
      </div>
    </div>
  );
}

/** Simple checkbox row — B.4 accessories, B.5 home furnishings. */
export function CheckRow({ name, checked, onToggle, isLast, onRemove }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', padding: '9px 0',
      borderBottom: isLast ? 'none' : '1px solid #F5F3EF',
    }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flex: 1, fontSize: 13, color: '#1A1A1A' }}>
        <input type="checkbox" checked={checked} onChange={() => onToggle(name)} style={{ width: 'auto', cursor: 'pointer' }} />
        <span>{name}</span>
      </label>
      {/* Only passed for studio-added entries — built-in options aren't removable */}
      {onRemove && <TrashBtn label={`Remove ${name}`} size={13} onClick={onRemove} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ACCORDIONS
   ═══════════════════════════════════════════════════════════════════════════ */

/** Top-level category accordion — B's "Fashion" 👗 / "Home Furnishings" 🏠. */
export function CategoryAccordion({ icon, name, sub, count, defaultOpen, children }) {
  const [open, setOpen] = useState(!!defaultOpen);
  const [hover, setHover] = useState(false);
  return (
    <div style={{ border: '1px solid #E0DCDA', borderRadius: 10, marginBottom: 12, overflow: 'hidden' }}>
      <div
        onClick={() => setOpen(o => !o)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 18px', cursor: 'pointer', userSelect: 'none',
          background: hover ? '#F5F1EB' : '#FAFAF8', transition: 'background .1s',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {icon && <span style={{ fontSize: 20 }}>{icon}</span>}
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A' }}>{name}</div>
            {sub && <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{sub}</div>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {count > 0 && (
            <span style={{ fontSize: 11, background: '#EEF3EC', color: '#4A7C4A', borderRadius: 10, padding: '1px 8px' }}>
              {count} selected
            </span>
          )}
          <span style={{ fontSize: 12, color: '#BBB', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>▼</span>
        </div>
      </div>
      {open && (
        <div style={{ padding: '12px 12px 4px', borderTop: '1px solid #F0EDE8', background: '#F9F8F6' }}>
          {children}
        </div>
      )}
    </div>
  );
}

/** Inner accordion — C.1 fabric groups, B.5 home-furnishing groups. */
export function GroupAccordion({ label, count, defaultOpen, onDelete, deleteLabel = 'Remove', children }) {
  const [open, setOpen] = useState(!!defaultOpen);
  const [hover, setHover] = useState(false);
  return (
    <div style={{ border: '1px solid #EDE8E2', borderRadius: 7, marginBottom: 8, overflow: 'hidden' }}>
      <div
        onClick={() => setOpen(o => !o)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '11px 14px', cursor: 'pointer', userSelect: 'none', gap: 8,
          background: hover ? '#F5F1EB' : '#FAFAF8', transition: 'background .1s',
        }}>
        <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#888', fontWeight: 600 }}>
          {label}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {count > 0 && (
            <span style={{ fontSize: 11, background: '#EEF3EC', color: '#4A7C4A', borderRadius: 10, padding: '1px 8px' }}>
              {count} selected
            </span>
          )}
          {onDelete && (
            <span
              role="button"
              aria-label={deleteLabel}
              onClick={e => { e.stopPropagation(); onDelete(); }}
              style={{ display: 'inline-flex', alignItems: 'center', color: '#CCC', padding: '2px', borderRadius: 4, cursor: 'pointer', lineHeight: 1 }}
              onMouseEnter={e => e.currentTarget.style.color = '#C0392B'}
              onMouseLeave={e => e.currentTarget.style.color = '#CCC'}>
              <TrashIcon size={13} />
            </span>
          )}
          <span style={{ fontSize: 10, color: '#BBB', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>▼</span>
        </div>
      </div>
      {open && (
        <div style={{ padding: '0 14px 10px', background: '#fff', borderTop: '1px solid #F0EDE8' }}>
          {children}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MISC
   ═══════════════════════════════════════════════════════════════════════════ */

/** Dashed "+ Add ..." button. */
export function AddButton({ onClick, children, inline = false, style }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: inline ? '6px 12px' : '7px 14px',
        border: `1px dashed ${inline ? '#F0C890' : hover ? '#888' : '#C8C4BF'}`,
        borderRadius: 5, fontSize: inline ? 11 : 12,
        color: inline ? '#D97520' : hover ? '#555' : '#888',
        cursor: 'pointer', background: 'transparent',
        fontFamily: "'DM Sans', sans-serif", marginTop: 10,
        ...style,
      }}>
      {children}
    </button>
  );
}

/** Pill tag with an × — certifications (A.7) and awards (A.8). */
export function CertTag({ label, href, onRemove }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '4px 10px', border: '1px solid #E4E0DB', borderRadius: 20,
      fontSize: 12, color: '#555', background: '#FAFAF8',
    }}>
      {href
        ? <a href={href} target="_blank" rel="noreferrer" style={{ color: '#555', textDecoration: 'none' }}>{label} ↗</a>
        : label}
      <button onClick={onRemove} style={{ background: 'none', border: 'none', color: '#CCC', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: 0 }}>×</button>
    </span>
  );
}

/** Dashed dropzone. Wrap in a <label> holding the file input. */
export function MediaDropzone({ icon, label, hint, uploading, progress }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        border: '1px dashed #C8C4BF', borderRadius: 6, padding: 28,
        textAlign: 'center', cursor: uploading ? 'default' : 'pointer',
        background: hover && !uploading ? '#FAFAF8' : 'transparent',
        transition: 'background .1s',
      }}>
      {uploading ? (
        <div style={{ fontSize: 13, color: '#888' }}>
          <span className="spinner" style={{ width: 14, height: 14, display: 'inline-block', marginRight: 6, verticalAlign: 'middle' }} />
          Uploading {progress?.done ?? 0} / {progress?.total ?? 0}…
        </div>
      ) : (
        <>
          {icon && <div style={{ fontSize: 26, color: '#CCC', marginBottom: 8 }}>{icon}</div>}
          <div style={{ fontSize: 13, color: '#888' }}>{label}</div>
          {hint && <div style={{ fontSize: 11, color: '#BBBBBB', marginTop: 4 }}>{hint}</div>}
        </>
      )}
    </div>
  );
}

/** 72×72 media thumbnail. Videos render as a black tile with ▶, per prototype. */
export function MediaThumb({ src, isVideo, onRemove, size = 72 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 5, overflow: 'hidden',
      position: 'relative', border: '1px solid #E4E0DB', flexShrink: 0,
    }}>
      {isVideo ? (
        <div style={{
          width: '100%', height: '100%', background: '#1A1A1A',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 18,
        }}>▶</div>
      ) : (
        <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={e => { e.target.style.display = 'none'; }} />
      )}
      {onRemove && (
        <button onClick={onRemove} style={{
          position: 'absolute', top: 3, right: 3,
          width: 16, height: 16, background: 'rgba(0,0,0,0.55)', color: '#fff',
          border: 'none', borderRadius: '50%', fontSize: 10, cursor: 'pointer',
          lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>×</button>
      )}
    </div>
  );
}

/** Sage 32×18 toggle — "Open for Collab" (G). */
export function CollabToggle({ checked, onChange, label }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', userSelect: 'none' }}
      title={checked ? 'Open for Collab — click to disable' : 'Click to mark as Open for Collab'}>
      <div onClick={() => onChange(!checked)} style={{
        position: 'relative', width: 32, height: 18, borderRadius: 9, flexShrink: 0,
        background: checked ? '#7A8C6E' : '#CCC', transition: 'background .2s',
      }}>
        <div style={{
          position: 'absolute', top: 2, left: checked ? 16 : 2,
          width: 14, height: 14, borderRadius: '50%', background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.25)', transition: 'left .2s',
        }} />
      </div>
      {label && (
        <span style={{ fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', color: checked ? '#7A8C6E' : '#AAA' }}>
          {label}
        </span>
      )}
    </label>
  );
}

/** Terracotta 36×20 toggle — "Hide project" (G). */
export function HideToggle({ checked, onChange, label }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
      <div onClick={() => onChange(!checked)} style={{
        position: 'relative', width: 36, height: 20, borderRadius: 20, flexShrink: 0,
        background: checked ? '#D97520' : '#D8D4CF', transition: 'background .2s',
      }}>
        <div style={{
          position: 'absolute', top: 3, left: checked ? 19 : 3,
          width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left .2s',
        }} />
      </div>
      {label && <span style={{ fontSize: 11, color: '#888' }}>{label}</span>}
    </label>
  );
}

/** Yes / No pill pair — E.1. */
export function YNToggle({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {[{ v: true, l: 'Yes' }, { v: false, l: 'No' }].map(({ v, l }) => (
        <button key={l} type="button" onClick={() => onChange(v)} style={{
          padding: '8px 28px', borderRadius: 5, fontSize: 13,
          fontFamily: "'DM Sans', sans-serif",
          border: `1px solid ${value === v ? '#D97520' : '#D8D4CF'}`,
          background: value === v ? '#D97520' : '#fff',
          color: value === v ? '#fff' : '#555',
          cursor: 'pointer',
        }}>{l}</button>
      ))}
    </div>
  );
}
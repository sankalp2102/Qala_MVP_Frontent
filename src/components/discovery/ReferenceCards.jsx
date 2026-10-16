// src/components/discovery/ReferenceCards.jsx
//
// Renders Qalawati's opening 4-option branch (qala-brief-spec.docx, Section
// 4 — Stage 2) as the prototype's 2x2 icon-card grid instead of a plain
// chip row. The branch itself is unchanged — these are the exact same
// [CHIPS: ...] strings the backend already sends (qalawati/mechanics.py's
// OPENING block); this only changes how DiscoverV2.jsx presents them when
// they're detected to be that opening set. Clicking a card still just calls
// onSelect(label), same as any other chip — Qalawati's real branching logic
// (Path A/B/C/D) does the rest server-side.

// Matches each known opening-chip label (case-insensitive substring) to the
// prototype's icon + sub-copy. Falls back to the plain chip row (handled by
// the caller) if the current chip set doesn't look like this opening branch.
const CARD_META = [
  {
    match: /moodboard|reference/i,
    label: 'Moodboard or image refs',
    sub: 'Pinterest boards, photos, magazine clips',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/><rect x="7" y="7" width="4" height="4"/><rect x="13" y="7" width="4" height="4"/><rect x="7" y="13" width="4" height="4"/><rect x="13" y="13" width="4" height="4"/>
      </svg>
    ),
  },
  {
    match: /sketch|design/i,
    label: 'Sketches or designs',
    sub: 'Your drawings, flats, or design files',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
      </svg>
    ),
  },
  {
    match: /sample/i,
    label: 'I have a sample',
    sub: 'A garment to replicate or adapt',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.57a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.57a2 2 0 0 0-1.34-2.23z"/>
      </svg>
    ),
  },
  {
    match: /scratch/i,
    label: 'Starting from scratch',
    sub: "No refs yet — let's build the vision together",
    scratch: true,
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
      </svg>
    ),
  },
];

// True only when `chips` looks like the opening 4-path branch — so this
// component is never used to misrender some other, unrelated 4-chip set.
export function isReferenceChipSet(chips) {
  if (!chips || chips.length !== 4) return false;
  return CARD_META.every(m => chips.some(c => m.match.test(c)));
}

export default function ReferenceCards({ chips, onSelect }) {
  // Preserve the backend's own chip text as what actually gets sent —
  // only the card's label/sub/icon are swapped in for display. onSelect
  // also gets the card's `scratch` flag so the caller knows whether to
  // open the upload dropzone (cards 1-3) or not (card 4 — no upload for
  // "starting from scratch").
  const cards = CARD_META.map(meta => ({
    ...meta,
    sendText: chips.find(c => meta.match.test(c)) || meta.label,
  }));

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
      maxWidth: 480, width: '100%', margin: '2px auto 10px',
    }}>
      <style>{`
        .qw-ref-card { background: #fff; border: 0.5px solid var(--border-warm-s); border-radius: 14px; padding: 16px 14px; cursor: pointer; text-align: left; display: flex; flex-direction: column; gap: 7px; transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s; }
        .qw-ref-card:hover { border-color: var(--qw-b); box-shadow: 0 4px 18px rgba(196,100,74,0.12); transform: translateY(-2px); }
        .qw-ref-icon { width: 34px; height: 34px; border-radius: 10px; background: var(--qw-l); display: flex; align-items: center; justify-content: center; color: var(--qw); }
        .qw-ref-card.scratch .qw-ref-icon { background: var(--pl-l); color: var(--pl); }
        .qw-ref-label { font-family: var(--font-body); font-size: 13px; font-weight: 600; color: var(--ink-warm); line-height: 1.3; }
        .qw-ref-sub { font-size: 11.5px; color: var(--ink-warm-mute); line-height: 1.45; }
      `}</style>
      {cards.map(c => (
        <div
          key={c.label}
          className={`qw-ref-card${c.scratch ? ' scratch' : ''}`}
          onClick={() => onSelect(c.sendText, !!c.scratch)}
        >
          <div className="qw-ref-icon">{c.icon}</div>
          <div className="qw-ref-label">{c.label}</div>
          <div className="qw-ref-sub">{c.sub}</div>
        </div>
      ))}
    </div>
  );
}
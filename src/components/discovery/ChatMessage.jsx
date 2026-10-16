// src/components/discovery/ChatMessage.jsx
// Single message bubble matching artifact UI exactly:
//   - No role labels above bubbles
//   - Both sides: subtle background + 0.5px border
//   - User bubble: right-aligned, slightly darker bg
//   - AI bubble: left-aligned, lighter bg
//   - Image attached: shows inline INSIDE the bubble, above the text
//   - Brief card renders below AI bubble when has_brief is true
//   - No studio image dumps — pure conversation UI

import Brief from './Brief';
import QalawatiAvatar from './QalawatiAvatar';
import TypedText from './TypedText';
import MatchingChecklist from './MatchingChecklist';

// A message qualifies for the spec's char-by-char typing animation only
// when it's a short, plain, single-idea turn — exactly what mechanics.py's
// Stage 3 Q&A actually produces (1-2 sentences, no tables, no bold). This
// doubles as a safety net: post-match studio recommendations and anything
// else with real formatting just render normally, since typing through
// markdown syntax character-by-character would show the raw "**"/"|"
// tokens mid-animation.
function isAnimatable(text) {
  if (!text) return false;
  if (text.length > 240) return false;
  if (/\*\*/.test(text) || /\|/.test(text) || /\n\s*\n/.test(text)) return false;
  return true;
}

// ── Text renderer — supports **bold** markdown ────────────────────────────────
function renderMarkdownTable(rows) {
  const dataRows = rows.filter(r => !/^\|[-:\s|]+\|$/.test(r.trim()));
  if (dataRows.length < 2) return null;
  const parse = row => row.trim().split('|').slice(1, -1).map(c => c.trim());
  const [head, ...body] = dataRows;
  return (
    <div style={{ overflowX: 'auto', margin: '4px 0 8px' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12.5, fontFamily: 'var(--font-body)' }}>
        <thead>
          <tr>{parse(head).map((h, i) => <th key={i} style={{ padding: '5px 10px', borderBottom: '1.5px solid var(--border)', textAlign: 'left', color: 'var(--text3)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {body.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? 'rgba(0,0,0,0.02)' : 'transparent' }}>
              {parse(row).map((cell, j) => <td key={j} style={{ padding: '5px 10px', borderBottom: '0.5px solid var(--border)', color: 'var(--text)', verticalAlign: 'top' }}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Strips every bracketed control tag the backend embeds for the frontend
// to parse out-of-band — [CHIPS: ...] (quick replies) and [SKIPPABLE] /
// [REQUIRED] (Stage 3's per-question skip affordance, see DiscoverV2.jsx's
// parseSkippable()) — none of which are meant to be visible copy.
export function stripControlTags(text) {
  if (!text) return text;
  return text.replace(/\[CHIPS:[^\]]*\]/g, '').replace(/\[SKIPPABLE\]|\[REQUIRED\]/g, '').trim();
}

function renderText(text, isUser) {
  if (!text) return null;
  const clean = stripControlTags(text);
  if (!clean) return null;

  const lines = clean.split('\n');
  const result = [];
  let i = 0;
  while (i < lines.length) {
    if (lines[i].trim().startsWith('|')) {
      // Collect all consecutive table lines
      let j = i;
      while (j < lines.length && lines[j].trim().startsWith('|')) j++;
      const tableEl = renderMarkdownTable(lines.slice(i, j));
      result.push(tableEl
        ? <div key={i}>{tableEl}</div>
        : lines.slice(i, j).map((l, k) => <p key={i+k} style={{ margin:0,fontSize:14,lineHeight:1.65,color:isUser?'#fff':'var(--ink-warm)',fontFamily:'var(--font-body)' }}>{l}</p>)
      );
      i = j;
    } else if (lines[i].trim() === '---' || lines[i].trim() === '———') {
      result.push(<hr key={i} style={{ border:'none',borderTop:'0.5px solid var(--border)',margin:'6px 0' }} />);
      i++;
    } else if (!lines[i].trim()) {
      result.push(<div key={i} style={{ height: 4 }} />);
      i++;
    } else {
      const parts = lines[i].split(/\*\*([^*]+)\*\*/g);
      result.push(
        <p key={i} style={{ margin:0,fontSize:14,lineHeight:1.65,color:isUser?'#fff':'var(--ink-warm)',fontFamily:'var(--font-body)' }}>
          {parts.map((p, j) => j%2===1 ? <strong key={j} style={{ fontWeight:600 }}>{p}</strong> : p)}
        </p>
      );
      i++;
    }
  }
  return result;
}

// ── Strip BRIEF_START...BRIEF_END from the visible text ───────────────────────
function stripBrief(text) {
  if (!text) return text;
  return text.replace(/BRIEF_START[\s\S]*?BRIEF_END/g, '').trim();
}

// ── Extract raw brief text ────────────────────────────────────────────────────
function extractBrief(text) {
  if (!text) return null;
  const m = text.match(/BRIEF_START([\s\S]*?)BRIEF_END/);
  return m ? m[1].trim() : null;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ChatMessage({
  role,
  content,
  hasBrief,
  referenceImages,
  skipContactForm,
  sessionToken,
  sessionId,
  onAdjust,
  attachedImage,
  attachedMime,
  attachedImages,
  onMatchComplete,
  highlightBrief,
  animate,
  onTypingDone,
  matchingStep,
}) {
  const isAI   = role === 'assistant';
  const isUser = role === 'user';

  // "Finding your studios…" progress — a real Qalawati message bubble, not
  // a box inside the Brief card (see DiscoverV2.jsx's handleMatchComplete).
  // Short-circuits everything else below; a matching-progress message never
  // also carries brief/text/image content.
  if (matchingStep != null) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-end', gap: 8, maxWidth: '84%' }}>
          <QalawatiAvatar size={36} />
          <div style={{ padding: '10px 14px', borderRadius: '4px 18px 18px 18px', background: 'var(--cream)', boxSizing: 'border-box' }}>
            <p style={{ margin: '0 0 9px', fontSize: 14, lineHeight: 1.5, color: 'var(--ink-warm)', fontFamily: 'var(--font-body)' }}>
              Finding your studios…
            </p>
            <MatchingChecklist step={matchingStep} />
          </div>
        </div>
      </div>
    );
  }

  const briefRaw   = hasBrief ? extractBrief(content) : null;
  const visibleText = stripControlTags(hasBrief ? stripBrief(content) : content);
  const shouldType = isAI && animate && !hasBrief && isAnimatable(visibleText);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: isAI ? 'flex-start' : 'flex-end',
      marginBottom: 14,
    }}>
      {/* attachedImages array — new format */}
      {isUser && attachedImages?.length > 0 && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:6 }}>
          {attachedImages.map((img, i) => (
            <img key={i}
              src={`data:${img.mime || 'image/jpeg'};base64,${img.data}`}
              alt="attachment"
              style={{ maxHeight:180, maxWidth:'100%', borderRadius: 'var(--r-10)', border:'0.5px solid var(--border)', display:'block', objectFit:'cover' }}
            />
          ))}
        </div>
      )}
      {/* Legacy single image — backward compat */}
      {isUser && !attachedImages?.length && attachedImage && (
        <img
          src={`data:${attachedMime || 'image/jpeg'};base64,${attachedImage}`}
          alt="Reference"
          style={{ maxWidth:180, borderRadius: 'var(--r-10)', marginBottom:6, border:'0.5px solid var(--border)', display:'block' }}
        />
      )}

      {/* Bubble — hidden when hasBrief since card replaces it. Shapes match
          the spec's q-bubble/u-bubble (Section 7): AI bubble has a "typed
          from" corner (4px top-left), user bubble has a "sent to" corner
          (4px bottom-right) — same asymmetric-pill treatment as the
          prototype, just kept on the existing sans/markdown-capable text
          renderer below rather than switching to serif, since real AI
          replies here include tables/bold that serif would hurt. */}
      {visibleText && !hasBrief && (
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-end', gap: 8, maxWidth: '84%' }}>
          {isAI && <QalawatiAvatar size={36} />}
          <div style={{
            padding: '10px 14px',
            borderRadius: isAI ? '4px 18px 18px 18px' : '18px 18px 4px 18px',
            background: isUser ? 'var(--qw)' : 'var(--cream)',
            boxSizing: 'border-box',
          }}>
            {shouldType ? (
              <TypedText
                as="p"
                text={visibleText}
                onDone={onTypingDone}
                style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: 'var(--ink-warm)', fontFamily: 'var(--font-body)' }}
              />
            ) : renderText(visibleText, isUser)}
          </div>
        </div>
      )}

      {/* Brief card — below AI bubble */}
      {isAI && briefRaw && (
        <Brief
          rawText={briefRaw}
          sessionToken={sessionToken}
          sessionId={sessionId}
          onAdjust={onAdjust}
          onMatchComplete={onMatchComplete}
          highlightFindStudios={highlightBrief}
          referenceImages={referenceImages}
          skipContactForm={skipContactForm}
        />
      )}
    </div>
  );
}
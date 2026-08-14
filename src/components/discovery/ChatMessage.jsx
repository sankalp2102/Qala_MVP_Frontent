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

function renderText(text, isUser) {
  if (!text) return null;
  // Strip [CHIPS: ...] from rendered text — chips are shown separately
  const clean = text.replace(/\[CHIPS:[^\]]*\]/g, '').trim();
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
}) {
  const isAI   = role === 'assistant';
  const isUser = role === 'user';

  const briefRaw   = hasBrief ? extractBrief(content) : null;
  const visibleText = hasBrief ? stripBrief(content) : content;

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

      {/* Bubble — hidden when hasBrief since card replaces it */}
      {visibleText && !hasBrief && (
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-end', gap: 8, maxWidth: '84%' }}>
          {isAI && <QalawatiAvatar size={30} />}
          <div style={{
            padding: '10px 14px',
            borderRadius: 18,
            background: isUser ? 'var(--qw)' : 'var(--cream)',
            boxSizing: 'border-box',
          }}>
            {renderText(visibleText, isUser)}
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
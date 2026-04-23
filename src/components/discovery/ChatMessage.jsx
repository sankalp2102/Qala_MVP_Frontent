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

// ── Text renderer — supports **bold** markdown ────────────────────────────────
function renderText(text, isUser) {
  if (!text) return null;
  // Strip [CHIPS: ...] from rendered text — chips are shown separately
  const clean = text.replace(/\[CHIPS:[^\]]*\]/g, '').trim();
  if (!clean) return null;

  return clean.split('\n').filter(l => l.trim()).map((line, i) => {
    const parts = line.split(/\*\*([^*]+)\*\*/g);
    return (
      <p key={i} style={{
        margin: i === 0 ? 0 : '5px 0 0',
        fontSize: 14,
        lineHeight: 1.65,
        color: isUser ? '#F5F0E8' : 'var(--text)',
        fontFamily: 'var(--font-body)',
      }}>
        {parts.map((p, j) =>
          j % 2 === 1
            ? <strong key={j} style={{ fontWeight: 500 }}>{p}</strong>
            : p
        )}
      </p>
    );
  });
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
  sessionToken,
  sessionId,
  onAdjust,
  attachedImage,
  attachedMime,
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
      {/* Image attached — shown above text inside bubble for user messages */}
      {isUser && attachedImage && (
        <img
          src={`data:${attachedMime || 'image/jpeg'};base64,${attachedImage}`}
          alt="Reference"
          style={{
            maxWidth: 180,
            borderRadius: 10,
            marginBottom: 6,
            border: '0.5px solid var(--border)',
            display: 'block',
          }}
        />
      )}

      {/* Bubble */}
      {visibleText && (
        <div style={{
          maxWidth: '84%',
          padding: '9px 13px',
          borderRadius: isAI ? '3px 14px 14px 14px' : '14px 14px 3px 14px',
          background: isUser ? '#1A1612' : 'var(--surface2)',
          border: '0.5px solid var(--border)',
          boxSizing: 'border-box',
        }}>
          {renderText(visibleText, isUser)}
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
        />
      )}
    </div>
  );
}
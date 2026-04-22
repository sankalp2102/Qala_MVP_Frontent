// src/components/discovery/ChatMessage.jsx
// Renders a single message bubble — AI (left) or user (right).
//
// FIX: Image selection is now fully controlled.
//   - selectedIds prop comes from DiscoverV2 (single source of truth)
//   - onConfirm prop triggers message send from DiscoverV2
//   Both are passed straight through to InlineImageGrid.

import InlineImageGrid from './InlineImageGrid';
import BriefCard from './BriefCard';

export default function ChatMessage({
  role,
  content,
  showImages,       // [{id, url, studio_name}] — AI messages only
  sessionToken,     // set when matching complete
  extracted,        // for BriefCard
  selectedIds,      // controlled selection state from DiscoverV2
  onSelect,         // onSelect(ids) — user taps an image
  onConfirm,        // onConfirm() — user clicks "These look great"
  attachedImage,    // base64 preview for user messages with image
}) {
  const isAI   = role === 'assistant';
  const isUser = role === 'user';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: isAI ? 'flex-start' : 'flex-end',
      gap: 4,
    }}>
      {/* Role label */}
      <div style={{
        fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: isAI ? 'var(--text3)' : 'var(--text4)',
        paddingLeft: isAI ? 4 : 0,
        paddingRight: isAI ? 0 : 4,
      }}>
        {isAI ? 'Qala' : 'You'}
      </div>

      {/* Bubble */}
      <div style={{
        maxWidth: '82%',
        padding: '12px 16px',
        borderRadius: isAI ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
        background: isAI ? 'var(--surface)' : '#1A1612',
        color: isAI ? 'var(--text)' : '#F5F0E8',
        border: isAI ? '1px solid var(--border)' : 'none',
        fontSize: 14,
        lineHeight: 1.6,
        fontFamily: 'var(--font-body)',
        boxShadow: 'var(--shadow)',
      }}>
        {/* Attached image preview (user messages) */}
        {isUser && attachedImage && (
          <div style={{ marginBottom: content ? 8 : 0 }}>
            <img
              src={`data:image/jpeg;base64,${attachedImage}`}
              alt="Reference"
              style={{
                maxWidth: '100%', maxHeight: 160,
                borderRadius: 8, display: 'block',
              }}
            />
          </div>
        )}

        {/* Message text */}
        {content && (
          <span style={{ whiteSpace: 'pre-wrap' }}>{content}</span>
        )}

        {/* Inline image grid — controlled by parent */}
        {isAI && showImages?.length > 0 && (
          <InlineImageGrid
            images={showImages}
            selectedIds={selectedIds}
            onSelect={onSelect}
            onConfirm={onConfirm}
          />
        )}
      </div>

      {/* Brief card — shown below bubble when matching completes */}
      {isAI && sessionToken && extracted && (
        <BriefCard
          extracted={extracted}
          sessionToken={sessionToken}
        />
      )}
    </div>
  );
}
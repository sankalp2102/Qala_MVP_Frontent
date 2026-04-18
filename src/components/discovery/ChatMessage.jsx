// src/components/discovery/ChatMessage.jsx
// Renders a single message bubble — AI (left) or user (right).
// AI messages may contain inline images (InlineImageGrid) and a BriefCard.

import InlineImageGrid from './InlineImageGrid';
import BriefCard from './BriefCard';

export default function ChatMessage({
  role,             // 'assistant' | 'user'
  content,          // string
  showImages,       // array of {id, url, studio_name} — only on AI messages
  sessionToken,     // set when matching is complete
  extracted,        // extracted fields for BriefCard
  onImageSelect,    // callback(selectedIds)
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
          <div style={{ marginBottom: 8 }}>
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

        {/* Inline image grid (AI only, when images are returned) */}
        {isAI && showImages?.length > 0 && (
          <InlineImageGrid
            images={showImages}
            onSelect={onImageSelect}
          />
        )}
      </div>

      {/* Brief card below the bubble (AI only, when matching completes) */}
      {isAI && sessionToken && extracted && (
        <BriefCard
          extracted={extracted}
          sessionToken={sessionToken}
        />
      )}
    </div>
  );
}
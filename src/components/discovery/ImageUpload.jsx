// src/components/discovery/ImageUpload.jsx
// Image upload button. Two modes:
//   iconOnly=true  → artifact-style icon button (image icon, no border pill)
//   iconOnly=false → paperclip pill button (original style)

import { useRef } from 'react';

export default function ImageUpload({ onImage, disabled, iconOnly = false }) {
  const inputRef = useRef();

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      alert('Please upload a JPEG, PNG, or WebP image.');
      e.target.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('Image must be under 10MB.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      const raw    = ev.target.result;
      const base64 = raw.split(',')[1];
      const mime   = file.type || 'image/jpeg';
      onImage?.(base64, file.name, mime);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
      {iconOnly ? (
        // Artifact-style: square icon button with image icon
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          title="Upload image"
          style={{
            padding: 8,
            borderRadius: 8,
            border: '0.5px solid var(--border)',
            background: 'var(--surface2)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: disabled ? 0.4 : 1,
            transition: 'background 0.12s',
            flexShrink: 0,
          }}
          onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = 'var(--surface3)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface2)'; }}
        >
          {/* Image/landscape icon matching artifact */}
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <rect x=".75" y="2.75" width="13.5" height="9.5" rx="1.25"
              stroke="var(--text3)" strokeWidth="1"/>
            <circle cx="5" cy="6.3" r=".85" fill="var(--text3)"/>
            <path d="M.75 9.5l3.5-2.8 2.8 2.2 2.3-1.8 4.9 3.85"
              stroke="var(--text3)" strokeWidth="1" strokeLinejoin="round"/>
          </svg>
        </button>
      ) : (
        // Original paperclip pill button
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          title="Attach a reference image"
          style={{
            background: 'none',
            border: '1.5px solid var(--border)',
            borderRadius: 8,
            padding: '0 12px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            color: 'var(--text3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: 44, flexShrink: 0,
            transition: 'border-color 0.18s, color 0.18s',
            opacity: disabled ? 0.4 : 1,
          }}
          onMouseEnter={e => {
            if (!disabled) {
              e.currentTarget.style.borderColor = 'var(--gold)';
              e.currentTarget.style.color = 'var(--gold)';
            }
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.color = 'var(--text3)';
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
          </svg>
        </button>
      )}
    </>
  );
}
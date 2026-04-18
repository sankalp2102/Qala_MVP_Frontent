// src/components/discovery/ImageUpload.jsx
// Paperclip button that reads a file and returns clean base64 to parent.
// Accepts jpeg/png/webp up to 10MB. Strips the data: prefix before passing up.

import { useRef } from 'react';

export default function ImageUpload({ onImage, disabled }) {
  const inputRef = useRef();

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      alert('Please upload a JPEG, PNG, or WebP image.');
      e.target.value = '';
      return;
    }

    // Validate size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image must be under 10MB.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      // Strip "data:image/jpeg;base64," prefix — backend wants raw base64
      const raw = ev.target.result;
      const base64 = raw.split(',')[1];
      onImage?.(base64, file.name);
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // reset so same file can be reselected
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
          height: 44,
          transition: 'border-color 0.18s, color 0.18s',
          flexShrink: 0,
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
        {/* Paperclip icon */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
        </svg>
      </button>
    </>
  );
}
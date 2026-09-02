// src/components/ImageCropModal.jsx
//
// Feature (Aug 2026) — the WhatsApp-DP-style crop tool: drag to
// reposition, scroll/pinch to zoom, confirm to crop. Deliberately built
// around a plain image URL (not a local File) so the SAME component and
// the SAME confirm handler work for both a just-uploaded photo and an
// image that's been on a studio's profile for months — see cropImage.js
// for why that unification is possible (and what it depends on: GCS
// bucket CORS, configured alongside this feature).
import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { getCroppedImageBlob } from '../utils/cropImage';

export default function ImageCropModal({ imageUrl, aspect = 3 / 2, onConfirm, onCancel }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const onCropComplete = useCallback((_croppedArea, pixels) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels || saving) return;
    setSaving(true);
    try {
      const blob = await getCroppedImageBlob(imageUrl, croppedAreaPixels);
      await onConfirm(blob);
    } catch (e) {
      // A canvas SecurityError here means the GCS CORS config isn't
      // actually applied yet (or doesn't cover this origin) — see
      // cropImage.js's module docstring. Surfacing this distinctly
      // matters: it looks identical to "crop failed" from the outside,
      // but the fix is a bucket config check, not a code change.
      setLoadError(true);
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog" aria-modal="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(26,22,18,0.72)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
      onClick={e => { if (e.target === e.currentTarget && !saving) onCancel(); }}
    >
      <div style={{
        background: '#fff', borderRadius: 'var(--r-lg)', padding: 24,
        width: '100%', maxWidth: 520, boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
      }}>
        <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 22, fontWeight: 500, marginBottom: 4, color: 'var(--text-heading)' }}>
          Adjust photo
        </div>
        <div style={{ fontSize: 13, color: 'var(--text3, #8A8A8A)', marginBottom: 16, fontFamily: "'DM Sans', sans-serif" }}>
          Drag to reposition, scroll or pinch to zoom
        </div>

        <div style={{ position: 'relative', width: '100%', height: 320, background: '#1A1A1A', borderRadius: 'var(--r-5)', overflow: 'hidden' }}>
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            objectFit="contain"
          />
        </div>

        <input
          type="range" min={1} max={3} step={0.01} value={zoom}
          onChange={e => setZoom(Number(e.target.value))}
          aria-label="Zoom"
          style={{ width: '100%', marginTop: 16, accentColor: 'var(--sage)' }}
        />

        {loadError && (
          <div style={{ marginTop: 12, fontSize: 12, color: 'var(--red-d, #B23A3A)', fontFamily: "'DM Sans', sans-serif" }}>
            Couldn't process that crop — please try again, or reach out if this keeps happening.
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel} disabled={saving}
            style={{
              padding: '9px 18px', borderRadius: 'var(--r-5)', border: '1px solid var(--surface4)',
              background: '#fff', color: 'var(--text2, #4A4A4A)', fontSize: 13,
              cursor: saving ? 'default' : 'pointer', fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm} disabled={saving || !croppedAreaPixels}
            style={{
              padding: '9px 18px', borderRadius: 'var(--r-5)', border: 'none',
              background: 'var(--sage)', color: '#fff', fontSize: 13, fontWeight: 500,
              cursor: (saving || !croppedAreaPixels) ? 'default' : 'pointer',
              opacity: (saving || !croppedAreaPixels) ? 0.7 : 1,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {saving ? 'Saving…' : 'Save crop'}
          </button>
        </div>
      </div>
    </div>
  );
}
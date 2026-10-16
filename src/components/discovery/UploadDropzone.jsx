// src/components/discovery/UploadDropzone.jsx
//
// Stage 2's upload zone (qala-brief-spec.docx, Section 4 — "After Card
// Selection / Cards 1, 2, or 3"). Appears once the buyer picks one of the
// three upload-path reference cards; supports drag-and-drop and browsing,
// lists attached files, and reveals "Continue →" once at least one is
// attached and done processing.
//
// Qalawati's vision pipeline (discovery/chat_views.py) only ever accepts
// real raster images (JPEG/PNG/WEBP/GIF) — there's no PDF or video input
// on the backend. Rather than silently drop PDF/video support or mislabel
// raw PDF/video bytes as an "image" (which would just fail or feed Claude
// garbage), this component converts each one client-side into something
// Qalawati genuinely CAN look at:
//   - PDF  → first page rendered to a JPEG (pdfjs-dist, no server round-trip)
//   - Video → one representative frame captured to a JPEG
// Both are labelled as such in the file list and in the outgoing message,
// so nothing claims more understanding than it actually has (a PDF's other
// pages and a video's motion are not analysed).

import { useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

const IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const PDF_MIME = ['application/pdf'];
const VIDEO_MIME = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v'];

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;  // 20MB/file — spec Section 9
const MAX_PDF_BYTES = 20 * 1024 * 1024;    // same cap as images
const MAX_VIDEO_BYTES = 150 * 1024 * 1024; // videos run larger on disk even though
                                            // only a single frame is kept — this just
                                            // bounds how much gets read into memory

function classify(file) {
  if (IMAGE_MIME.includes(file.type)) return 'image';
  if (PDF_MIME.includes(file.type)) return 'pdf';
  if (VIDEO_MIME.includes(file.type)) return 'video';
  return null;
}

function readImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = ev => {
      const raw = ev.target.result;
      resolve({ data: raw.split(',')[1], mime: file.type || 'image/jpeg', name: file.name, kind: 'image' });
    };
    reader.onerror = () => reject(new Error(`${file.name}: could not read file`));
    reader.readAsDataURL(file);
  });
}

async function renderPdfFirstPage(file) {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 1.5 });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
  return {
    data: dataUrl.split(',')[1],
    mime: 'image/jpeg',
    name: `${file.name} — page 1${pdf.numPages > 1 ? ` of ${pdf.numPages}` : ''}`,
    kind: 'pdf',
  };
}

function captureVideoFrame(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.src = url;

    const cleanup = () => URL.revokeObjectURL(url);

    video.onloadedmetadata = () => {
      const duration = video.duration || 1;
      // A frame ~20% in tends to be past any opening black/fade — min() so a
      // very short clip still gets a valid, in-range seek time.
      video.currentTime = Math.min(duration * 0.2, Math.max(duration - 0.1, 0));
    };
    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 360;
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        cleanup();
        resolve({ data: dataUrl.split(',')[1], mime: 'image/jpeg', name: `${file.name} — frame`, kind: 'video' });
      } catch (e) {
        cleanup();
        reject(new Error(`${file.name}: could not capture a frame`));
      }
    };
    video.onerror = () => { cleanup(); reject(new Error(`${file.name}: could not read video`)); };
  });
}

const KIND_LABEL = { image: null, pdf: 'PDF page', video: 'video frame' };

export default function UploadDropzone({ onContinue, onDescribeInstead }) {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState([]); // [{data, mime, name, kind}]
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef();

  async function addFiles(fileList) {
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;
    setError('');

    const toProcess = [];
    const rejected = [];
    for (const f of incoming) {
      const kind = classify(f);
      if (!kind) { rejected.push(`${f.name} (unsupported file type)`); continue; }
      const limit = kind === 'image' ? MAX_IMAGE_BYTES : kind === 'pdf' ? MAX_PDF_BYTES : MAX_VIDEO_BYTES;
      if (f.size > limit) {
        rejected.push(`${f.name} (over ${Math.round(limit / (1024 * 1024))}MB)`);
        continue;
      }
      toProcess.push({ file: f, kind });
    }

    if (!toProcess.length) {
      if (rejected.length) setError(`Skipped: ${rejected.join(', ')}`);
      return;
    }

    setProcessing(true);
    const results = await Promise.allSettled(toProcess.map(({ file, kind }) => {
      if (kind === 'image') return readImage(file);
      if (kind === 'pdf') return renderPdfFirstPage(file);
      return captureVideoFrame(file);
    }));
    setProcessing(false);

    const succeeded = [];
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') succeeded.push(r.value);
      else rejected.push(r.reason?.message || `${toProcess[i].file.name}: couldn't be processed`);
    });

    if (succeeded.length) setFiles(prev => [...prev, ...succeeded]);
    if (rejected.length) setError(`Skipped: ${rejected.join(', ')}`);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragActive(false);
    addFiles(e.dataTransfer?.files);
  }

  function removeFile(i) {
    setFiles(prev => prev.filter((_, idx) => idx !== i));
  }

  function handleContinue() {
    // Strip `kind` before handing off — the chat API only wants {data, mime}.
    const images = files.map(({ data, mime }) => ({ data, mime }));
    const extras = files.filter(f => f.kind !== 'image');
    const note = extras.length
      ? ` (including ${extras.map(f => KIND_LABEL[f.kind]).join(', ')} converted from the file${extras.length > 1 ? 's' : ''} I attached)`
      : '';
    onContinue?.(images, `Here are my references.${note}`);
  }

  return (
    <div style={{ maxWidth: 480, width: '100%', margin: '2px auto 10px' }}>
      <style>{`
        .qw-drop { border: 1.5px dashed var(--border-warm-s); border-radius: 16px; padding: 22px 16px; text-align: center; cursor: pointer; transition: border-color 0.15s, background 0.15s; background: #fff; }
        .qw-drop.active { border-color: var(--qw-b); background: var(--qw-l); }
        .qw-drop:hover { border-color: var(--qw-b); }
        .qw-drop-head { font-family: var(--font-body); font-size: 13.5px; font-weight: 600; color: var(--ink-warm); margin: 0 0 3px; }
        .qw-drop-sub { font-size: 11.5px; color: var(--ink-warm-mute); margin: 0; }
        .qw-file-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 12px; color: var(--ink-warm-mid); background: #fff; border: 0.5px solid var(--border-warm-s); border-radius: 10px; padding: 7px 10px; margin-top: 8px; }
        .qw-file-x { background: none; border: none; cursor: pointer; color: var(--ink-warm-mute); font-size: 15px; line-height: 1; padding: 0 2px; }
        .qw-file-x:hover { color: var(--qw); }
        .qw-continue { width: 100%; margin-top: 10px; padding: 11px; border: none; border-radius: 12px; background: var(--qw); color: #fff; font-family: var(--font-body); font-size: 13.5px; font-weight: 600; cursor: pointer; transition: opacity 0.15s; }
        .qw-continue:hover { opacity: 0.9; }
        .qw-continue:disabled { opacity: 0.5; cursor: not-allowed; }
        .qw-describe-link { display: block; text-align: center; margin-top: 8px; font-size: 11.5px; color: var(--ink-warm-mute); background: none; border: none; cursor: pointer; text-decoration: underline; font-family: var(--font-body); }
      `}</style>

      <div
        className={`qw-drop${dragActive ? ' active' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,video/mp4,video/quicktime,video/webm"
          style={{ display: 'none' }}
          onChange={e => { addFiles(e.target.files); e.target.value = ''; }}
        />
        <p className="qw-drop-head">Drag &amp; drop here, or browse files</p>
        <p className="qw-drop-sub">Images, PDFs, or a short video clip — up to 20MB (150MB for video)</p>
      </div>

      {processing && (
        <p style={{ fontSize: 11, color: 'var(--ink-warm-mute)', margin: '6px 2px 0' }}>Processing…</p>
      )}
      {error && (
        <p style={{ fontSize: 11, color: 'var(--qw)', margin: '6px 2px 0' }}>{error}</p>
      )}

      {files.map((f, i) => (
        <div className="qw-file-row" key={i}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {f.name}{KIND_LABEL[f.kind] ? ` (${KIND_LABEL[f.kind]})` : ''}
          </span>
          <button className="qw-file-x" onClick={() => removeFile(i)} title="Remove">×</button>
        </div>
      ))}

      {files.length > 0 && (
        <button className="qw-continue" onClick={handleContinue} disabled={processing}>
          Continue →
        </button>
      )}

      {onDescribeInstead && (
        <button className="qw-describe-link" onClick={onDescribeInstead}>
          Or just describe it in the message below
        </button>
      )}
    </div>
  );
}
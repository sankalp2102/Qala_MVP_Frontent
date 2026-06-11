// src/components/LibraryManager.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { adminLibraryAPI } from '../api/client';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: '',                  label: 'All' },
  { value: 'occasion',          label: 'Occasion' },
  { value: 'season',            label: 'Season' },
  { value: 'fibre',             label: 'Fibre' },
  { value: 'fabric',            label: 'Fabric' },
  { value: 'weaves',            label: 'Weaves' },
  { value: 'prints',            label: 'Prints' },
  { value: 'printing_technique',label: 'Printing Technique' },
  { value: 'dye',               label: 'Dye' },
  { value: 'style',             label: 'Style' },
  { value: 'embellishment',     label: 'Embellishment' },
  { value: 'embroidery',        label: 'Embroidery' },
];

const CAT_LABEL = Object.fromEntries(CATEGORIES.slice(1).map(c => [c.value, c.label]));

// ─────────────────────────────────────────────────────────────────────────────
// SMALL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function Badge({ children, color = 'gray' }) {
  const colors = {
    gray:  { bg: 'rgba(255,255,255,0.07)', text: 'var(--text3)' },
    green: { bg: 'rgba(90,232,122,0.10)',  text: '#5AE87A' },
    amber: { bg: 'rgba(232,184,80,0.10)',  text: '#E8B850' },
    blue:  { bg: 'rgba(100,160,255,0.10)', text: '#64A0FF' },
  };
  const c = colors[color] || colors.gray;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: 10,
      background: c.bg, color: c.text,
      fontSize: 11, fontWeight: 500, letterSpacing: 0.3,
      fontFamily: 'var(--font-body)',
    }}>
      {children}
    </span>
  );
}

function Spinner({ size = 16 }) {
  return (
    <span style={{
      display: 'inline-block', width: size, height: size,
      border: `2px solid rgba(255,255,255,0.15)`,
      borderTopColor: 'var(--text3)',
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
    }} />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{
      flex: '1 1 160px',
      padding: '16px 20px',
      borderRadius: 10,
      background: 'var(--surface2)',
      border: '1px solid var(--border)',
    }}>
      <div style={{ fontSize: 22, fontWeight: 600, color: color || 'var(--text)', fontFamily: 'var(--font-display)', lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DROP ZONE
// ─────────────────────────────────────────────────────────────────────────────

function DropZone({ accept, multiple, label, hint, icon, onFiles, disabled }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const handleDrop = e => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const files = Array.from(e.dataTransfer.files);
    onFiles(files);
  };

  return (
    <div
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); if (!disabled) setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      style={{
        border: `2px dashed ${dragging ? 'var(--text3)' : 'var(--border)'}`,
        borderRadius: 10,
        padding: '28px 20px',
        textAlign: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: dragging ? 'rgba(255,255,255,0.03)' : 'transparent',
        transition: 'border-color 0.15s, background 0.15s',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text2)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 11, color: 'var(--text4)' }}>{hint}</div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        style={{ display: 'none' }}
        onChange={e => onFiles(Array.from(e.target.files))}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UPLOAD RESULT DISPLAY
// ─────────────────────────────────────────────────────────────────────────────

function ExcelResult({ result, onDismiss }) {
  if (!result) return null;
  const hasErrors = result.error_count > 0;
  return (
    <div style={{
      marginTop: 12, padding: '14px 16px', borderRadius: 8,
      background: hasErrors ? 'rgba(232,80,80,0.06)' : 'rgba(90,232,122,0.06)',
      border: `1px solid ${hasErrors ? 'rgba(232,80,80,0.2)' : 'rgba(90,232,122,0.2)'}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>
            {hasErrors ? '⚠ Import completed with warnings' : '✓ Import successful'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.7 }}>
            {result.created > 0 && <span>Created <strong style={{ color: 'var(--text)' }}>{result.created}</strong> new entries&nbsp;&nbsp;</span>}
            {result.updated > 0 && <span>Updated <strong style={{ color: 'var(--text)' }}>{result.updated}</strong> existing entries&nbsp;&nbsp;</span>}
            {result.error_count > 0 && <span>Skipped <strong style={{ color: '#E85050' }}>{result.error_count}</strong> rows</span>}
          </div>
          {hasErrors && (
            <details style={{ marginTop: 8 }}>
              <summary style={{ fontSize: 11, color: 'var(--text4)', cursor: 'pointer' }}>Show errors</summary>
              <div style={{ marginTop: 6, maxHeight: 120, overflowY: 'auto' }}>
                {result.errors.map((e, i) => (
                  <div key={i} style={{ fontSize: 11, color: '#E85050', lineHeight: 1.6 }}>• {e}</div>
                ))}
              </div>
            </details>
          )}
        </div>
        <button onClick={onDismiss} style={{ background: 'none', border: 'none', color: 'var(--text4)', cursor: 'pointer', fontSize: 16, padding: 0, lineHeight: 1 }}>×</button>
      </div>
    </div>
  );
}

function ImageResult({ result, onDismiss }) {
  if (!result) return null;
  const hasIssues = result.not_found.length > 0 || result.bad_format.length > 0;
  return (
    <div style={{
      marginTop: 12, padding: '14px 16px', borderRadius: 8,
      background: hasIssues ? 'rgba(232,184,80,0.06)' : 'rgba(90,232,122,0.06)',
      border: `1px solid ${hasIssues ? 'rgba(232,184,80,0.2)' : 'rgba(90,232,122,0.2)'}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>
            {hasIssues ? '⚠ Upload completed with warnings' : '✓ Images uploaded'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.7 }}>
            <span>Uploaded <strong style={{ color: 'var(--text)' }}>{result.uploaded_count}</strong> of {result.total_sent} files&nbsp;&nbsp;</span>
            {result.not_found.length > 0 && <span>Not matched: <strong style={{ color: '#E8B850' }}>{result.not_found.length}</strong>&nbsp;&nbsp;</span>}
            {result.bad_format.length > 0 && <span>Bad format: <strong style={{ color: '#E85050' }}>{result.bad_format.length}</strong></span>}
          </div>
          {result.not_found.length > 0 && (
            <details style={{ marginTop: 8 }}>
              <summary style={{ fontSize: 11, color: 'var(--text4)', cursor: 'pointer' }}>Unmatched files ({result.not_found.length})</summary>
              <div style={{ marginTop: 6, maxHeight: 100, overflowY: 'auto' }}>
                {result.not_found.map((f, i) => (
                  <div key={i} style={{ fontSize: 11, color: '#E8B850', lineHeight: 1.6 }}>
                    • {f.filename} {f.error ? `(${f.error})` : '— no entry with this ID'}
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
        <button onClick={onDismiss} style={{ background: 'none', border: 'none', color: 'var(--text4)', cursor: 'pointer', fontSize: 16, padding: 0, lineHeight: 1 }}>×</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ATTRIBUTE DISPLAY — renders JSON attributes cleanly
// ─────────────────────────────────────────────────────────────────────────────

function AttributeGrid({ attributes }) {
  if (!attributes || Object.keys(attributes).length === 0) {
    return <div style={{ fontSize: 12, color: 'var(--text4)' }}>No attributes</div>;
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px 16px' }}>
      {Object.entries(attributes).map(([key, val]) => (
        <div key={key}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6, color: 'var(--text4)', marginBottom: 2 }}>
            {key.replace(/_/g, ' ')}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>
            {val === null || val === undefined ? '—' : String(val)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ENTRY ROW — expandable table row
// ─────────────────────────────────────────────────────────────────────────────

function EntryRow({ entry, onDelete }) {
  const [expanded,   setExpanded]   = useState(false);
  const [detail,     setDetail]     = useState(null);
  const [loadDetail, setLoadDetail] = useState(false);
  const [deleting,   setDeleting]   = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const handleExpand = async () => {
    if (!expanded && !detail) {
      setLoadDetail(true);
      try {
        const res = await adminLibraryAPI.getEntry(entry.id);
        setDetail(res.data);
      } catch {
        // Show what we have from list
        setDetail(entry);
      } finally {
        setLoadDetail(false);
      }
    }
    setExpanded(e => !e);
  };

  const handleDelete = async () => {
    if (!confirmDel) { setConfirmDel(true); return; }
    setDeleting(true);
    try {
      await adminLibraryAPI.deleteEntry(entry.id);
      onDelete(entry.id);
    } catch {
      setDeleting(false);
      setConfirmDel(false);
    }
  };

  const rowBase = {
    display: 'grid',
    gridTemplateColumns: '1fr 140px 60px 90px',
    gap: 12,
    padding: '10px 16px',
    alignItems: 'center',
    cursor: 'pointer',
    borderBottom: '1px solid var(--border)',
    background: expanded ? 'rgba(255,255,255,0.02)' : 'transparent',
    transition: 'background 0.1s',
  };

  return (
    <>
      <div style={rowBase} onClick={handleExpand}>
        {/* ID + Name */}
        <div>
          <div style={{ fontSize: 13, color: 'var(--text)', fontFamily: 'var(--font-body)', fontWeight: 500 }}>
            {entry.id}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 1 }}>{entry.name}</div>
        </div>
        {/* Category */}
        <Badge color="blue">{CAT_LABEL[entry.category] || entry.category}</Badge>
        {/* Image */}
        <div style={{ fontSize: 12, color: entry.has_image ? '#5AE87A' : 'var(--text4)' }}>
          {entry.has_image ? '✓' : '—'}
        </div>
        {/* Actions */}
        <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
          {confirmDel ? (
            <>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{ padding: '4px 10px', borderRadius: 5, border: '1px solid rgba(232,80,80,0.5)', background: 'rgba(232,80,80,0.15)', color: '#E85050', fontSize: 11, cursor: deleting ? 'wait' : 'pointer', fontFamily: 'var(--font-body)' }}
              >
                {deleting ? '…' : 'Confirm'}
              </button>
              <button
                onClick={() => setConfirmDel(false)}
                style={{ padding: '4px 8px', borderRadius: 5, border: '1px solid var(--border)', background: 'none', color: 'var(--text4)', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-body)' }}
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={handleDelete}
              style={{ padding: '4px 10px', borderRadius: 5, border: '1px solid var(--border)', background: 'none', color: 'var(--text4)', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-body)' }}
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{
          padding: '16px 16px 20px',
          borderBottom: '1px solid var(--border)',
          background: 'rgba(255,255,255,0.015)',
        }}>
          {loadDetail ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text4)', fontSize: 12 }}>
              <Spinner size={12} /> Loading…
            </div>
          ) : detail ? (
            <>
              {detail.image_url && (
                <div style={{ marginBottom: 16 }}>
                  <img
                    src={detail.image_url}
                    alt={detail.name}
                    style={{ height: 120, borderRadius: 6, objectFit: 'cover', border: '1px solid var(--border)' }}
                  />
                </div>
              )}
              <AttributeGrid attributes={detail.attributes} />
            </>
          ) : null}
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function LibraryManager() {
  // ── Stats ──
  const [stats,      setStats]      = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // ── Excel upload ──
  const [excelUploading, setExcelUploading] = useState(false);
  const [excelResult,    setExcelResult]    = useState(null);

  // ── Image upload ──
  const [imgUploading, setImgUploading] = useState(false);
  const [imgResult,    setImgResult]    = useState(null);
  const [imgProgress,  setImgProgress]  = useState(null); // '12 / 45'

  // ── Browser ──
  const [entries,    setEntries]    = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page,       setPage]       = useState(1);
  const [pageSize]                  = useState(50);
  const [category,   setCategory]   = useState('');
  const [search,     setSearch]     = useState('');
  const [searchInput,setSearchInput]= useState('');
  const [loading,    setLoading]    = useState(false);

  // ── Fetch stats ──
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await adminLibraryAPI.getStats();
      setStats(res.data);
    } catch { /* silent */ }
    finally { setStatsLoading(false); }
  }, []);

  // ── Fetch entries ──
  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminLibraryAPI.listEntries({ category, search, page, page_size: pageSize });
      setEntries(res.data.results || []);
      setTotalCount(res.data.count || 0);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [category, search, page, pageSize]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  // ── Excel upload ──
  const handleExcelFiles = async (files) => {
    const file = files[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setExcelResult({ error: 'Only .xlsx files are accepted.' });
      return;
    }
    setExcelUploading(true);
    setExcelResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await adminLibraryAPI.uploadExcel(fd);
      setExcelResult(res.data);
      // Refresh stats and entries after successful import
      fetchStats();
      fetchEntries();
    } catch (e) {
      setExcelResult({ error: e.response?.data?.error || 'Upload failed', error_count: 1, errors: [] });
    } finally {
      setExcelUploading(false);
    }
  };

  // ── Image upload (chunked to avoid request size limits) ──
  const handleImageFiles = async (files) => {
    if (!files.length) return;
    setImgUploading(true);
    setImgResult(null);

    const CHUNK = 20; // upload 20 images per request
    let combined = { uploaded: [], not_found: [], bad_format: [], total_sent: 0 };

    try {
      for (let i = 0; i < files.length; i += CHUNK) {
        const batch = files.slice(i, i + CHUNK);
        setImgProgress(`${Math.min(i + CHUNK, files.length)} / ${files.length}`);
        const fd = new FormData();
        batch.forEach(f => fd.append('images', f));
        const res = await adminLibraryAPI.uploadImages(fd);
        combined.uploaded    = [...combined.uploaded,    ...(res.data.uploaded    || [])];
        combined.not_found   = [...combined.not_found,   ...(res.data.not_found   || [])];
        combined.bad_format  = [...combined.bad_format,  ...(res.data.bad_format  || [])];
        combined.total_sent += res.data.total_sent || 0;
      }
      combined.uploaded_count = combined.uploaded.length;
      setImgResult(combined);
      // Refresh entries to show updated has_image flags
      fetchStats();
      fetchEntries();
    } catch (e) {
      setImgResult({ error: e.response?.data?.error || 'Upload failed', uploaded: [], not_found: [], bad_format: [], uploaded_count: 0, total_sent: files.length });
    } finally {
      setImgUploading(false);
      setImgProgress(null);
    }
  };

  // ── Delete entry from list ──
  const handleDelete = (id) => {
    setEntries(prev => prev.filter(e => e.id !== id));
    setTotalCount(c => c - 1);
    fetchStats();
  };

  // ── Search debounce ──
  const searchTimer = useRef(null);
  const handleSearchInput = (val) => {
    setSearchInput(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearch(val);
      setPage(1);
    }, 350);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: '32px 24px' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── Page header ── */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 500, color: 'var(--text)', margin: 0 }}>
          Library
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 6, lineHeight: 1.6 }}>
          The taxonomy library powers the chat agent's knowledge — fabrics, crafts, styles, printing techniques, and more.
          Upload the Excel sheet to seed or update entries, then add images named by entry ID.
        </p>
      </div>

      {/* ── Stats bar ── */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 32 }}>
        {statsLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text4)', fontSize: 12 }}>
            <Spinner size={12} /> Loading stats…
          </div>
        ) : stats ? (
          <>
            <StatCard label="Total entries"   value={stats.total}          />
            <StatCard label="With images"     value={stats.with_image}     color="#5AE87A" />
            <StatCard label="Missing images"  value={stats.without_image}  color={stats.without_image > 0 ? '#E8B850' : undefined} />
            <StatCard label="Image coverage"  value={`${stats.image_coverage}%`} sub={`${stats.with_image} of ${stats.total}`} />
          </>
        ) : null}
      </div>

      {/* ── Two-column layout: Upload | Browser ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 340px) 1fr', gap: 24, alignItems: 'start' }}>

        {/* ── LEFT: Upload panel ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <div style={{
            borderRadius: 12,
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            overflow: 'hidden',
          }}>
            {/* Excel section */}
            <div style={{ padding: '20px 20px 0' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 14 }}>
                Excel Upload
              </div>

              {excelUploading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '32px 0', color: 'var(--text3)', fontSize: 13 }}>
                  <Spinner size={16} /> Importing entries…
                </div>
              ) : (
                <DropZone
                  accept=".xlsx"
                  multiple={false}
                  icon="📊"
                  label="Drop .xlsx here or click to browse"
                  hint="All 11 sheets imported at once. Re-uploading updates existing entries."
                  onFiles={handleExcelFiles}
                  disabled={excelUploading}
                />
              )}

              {excelResult && (
                excelResult.error ? (
                  <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 8, background: 'rgba(232,80,80,0.07)', border: '1px solid rgba(232,80,80,0.2)', fontSize: 12, color: '#E85050' }}>
                    {excelResult.error}
                  </div>
                ) : (
                  <ExcelResult result={excelResult} onDismiss={() => setExcelResult(null)} />
                )
              )}
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: 'var(--border)', margin: '20px 0' }} />

            {/* Image section */}
            <div style={{ padding: '0 20px 20px' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 14 }}>
                Image Upload
              </div>
              <div style={{ fontSize: 11, color: 'var(--text4)', marginBottom: 12, lineHeight: 1.6 }}>
                Name each file after its entry ID — e.g. <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: 3 }}>ajrakh.jpg</code>,&nbsp;
                <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: 3 }}>mulmul.png</code>.
                Upload in bulk — all selected at once.
              </div>

              {imgUploading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '32px 0', color: 'var(--text3)', fontSize: 13 }}>
                  <Spinner size={16} /> {imgProgress ? `Uploading ${imgProgress}…` : 'Uploading images…'}
                </div>
              ) : (
                <DropZone
                  accept="image/*"
                  multiple={true}
                  icon="🖼"
                  label="Drop images here or click to browse"
                  hint="jpg, png, webp — multiple files at once. Re-uploading replaces existing images."
                  onFiles={handleImageFiles}
                  disabled={imgUploading}
                />
              )}

              {imgResult && (
                imgResult.error ? (
                  <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 8, background: 'rgba(232,80,80,0.07)', border: '1px solid rgba(232,80,80,0.2)', fontSize: 12, color: '#E85050' }}>
                    {imgResult.error}
                  </div>
                ) : (
                  <ImageResult result={imgResult} onDismiss={() => setImgResult(null)} />
                )
              )}
            </div>

            {/* Per-category image coverage */}
            {stats?.categories && (
              <>
                <div style={{ height: 1, background: 'var(--border)' }} />
                <div style={{ padding: '16px 20px 20px' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>
                    Image coverage by category
                  </div>
                  {stats.categories.map(cat => {
                    const pct = cat.count > 0 ? Math.round(cat.with_image / cat.count * 100) : 0;
                    return (
                      <div key={cat.category} style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)', marginBottom: 3 }}>
                          <span>{cat.label}</span>
                          <span style={{ color: pct === 100 ? '#5AE87A' : pct > 0 ? '#E8B850' : 'var(--text4)' }}>
                            {cat.with_image}/{cat.count}
                          </span>
                        </div>
                        <div style={{ height: 3, borderRadius: 2, background: 'var(--surface2)' }}>
                          <div style={{
                            height: '100%', borderRadius: 2,
                            width: `${pct}%`,
                            background: pct === 100 ? '#5AE87A' : pct > 0 ? '#E8B850' : 'transparent',
                            transition: 'width 0.3s',
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── RIGHT: Browser panel ── */}
        <div style={{
          borderRadius: 12,
          border: '1px solid var(--border)',
          background: 'var(--surface)',
          overflow: 'hidden',
        }}>
          {/* Browser header */}
          <div style={{ padding: '16px 16px 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.6 }}>
                Browse Library
                {!loading && <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text4)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                  {totalCount} {category ? `${CAT_LABEL[category]} ` : ''}entries
                </span>}
              </div>
              {/* Search */}
              <input
                type="search"
                value={searchInput}
                onChange={e => handleSearchInput(e.target.value)}
                placeholder="Search by ID or name…"
                style={{
                  padding: '6px 12px', borderRadius: 7, fontSize: 12,
                  border: '1px solid var(--border)', background: 'var(--surface2)',
                  color: 'var(--text)', outline: 'none', width: 200,
                  fontFamily: 'var(--font-body)',
                }}
              />
            </div>

            {/* Category tabs */}
            <div style={{ display: 'flex', gap: 2, overflowX: 'auto', paddingBottom: 0, scrollbarWidth: 'none' }}>
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => { setCategory(cat.value); setPage(1); }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px 6px 0 0',
                    border: '1px solid var(--border)',
                    borderBottom: cat.value === category ? '1px solid var(--surface)' : '1px solid var(--border)',
                    background: cat.value === category ? 'var(--surface)' : 'var(--surface2)',
                    color: cat.value === category ? 'var(--text)' : 'var(--text4)',
                    fontSize: 11, fontWeight: cat.value === category ? 600 : 400,
                    cursor: 'pointer', whiteSpace: 'nowrap',
                    fontFamily: 'var(--font-body)',
                    transition: 'color 0.1s',
                    marginBottom: -1,
                  }}
                >
                  {cat.label}
                  {cat.value !== '' && stats?.categories && (
                    <span style={{ marginLeft: 4, opacity: 0.6 }}>
                      {stats.categories.find(c => c.category === cat.value)?.count || 0}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 140px 60px 90px',
            gap: 12,
            padding: '8px 16px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--surface2)',
          }}>
            {['ID / Name', 'Category', 'Image', ''].map((h, i) => (
              <div key={i} style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6, color: 'var(--text4)', fontWeight: 600 }}>
                {h}
              </div>
            ))}
          </div>

          {/* Table body */}
          <div style={{ minHeight: 200 }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0', gap: 10, color: 'var(--text4)', fontSize: 12 }}>
                <Spinner size={14} /> Loading entries…
              </div>
            ) : entries.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text4)', fontSize: 13 }}>
                {search ? `No entries matching "${search}"` : 'No entries yet — upload the Excel sheet to get started.'}
              </div>
            ) : (
              entries.map(entry => (
                <EntryRow key={entry.id} entry={entry} onDelete={handleDelete} />
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px',
              borderTop: '1px solid var(--border)',
              background: 'var(--surface2)',
            }}>
              <div style={{ fontSize: 11, color: 'var(--text4)' }}>
                Page {page} of {totalPages} &nbsp;·&nbsp; {totalCount} entries
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'none', color: page <= 1 ? 'var(--text4)' : 'var(--text2)', fontSize: 12, cursor: page <= 1 ? 'default' : 'pointer', fontFamily: 'var(--font-body)' }}
                >
                  ← Prev
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                  style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'none', color: page >= totalPages ? 'var(--text4)' : 'var(--text2)', fontSize: 12, cursor: page >= totalPages ? 'default' : 'pointer', fontFamily: 'var(--font-body)' }}
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

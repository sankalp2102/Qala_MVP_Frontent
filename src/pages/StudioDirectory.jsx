import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { discoveryAPI } from '../api/client';

// ─── Craft-specific CSS pattern backgrounds ────────────────────────────────
const PATTERNS = {
  'pattern-block': {
    backgroundImage: 'repeating-linear-gradient(45deg, rgba(185,92,56,0.15) 0, rgba(185,92,56,0.15) 2px, transparent 0, transparent 50%)',
    backgroundSize: '28px 28px',
    backgroundColor: '#F5EDE4',
  },
  'pattern-print': {
    backgroundImage: 'repeating-linear-gradient(-45deg, rgba(185,92,56,0.12) 0, rgba(185,92,56,0.12) 3px, transparent 0, transparent 18px)',
    backgroundColor: '#F5EDE4',
  },
  'pattern-embroidery': {
    backgroundImage: 'radial-gradient(circle, rgba(201,168,76,0.25) 1.5px, transparent 1.5px)',
    backgroundSize: '18px 18px',
    backgroundColor: '#F0E8D5',
  },
  'pattern-weave': {
    backgroundImage: `
      repeating-linear-gradient(0deg, rgba(122,140,110,0.2) 0, rgba(122,140,110,0.2) 2px, transparent 0, transparent 12px),
      repeating-linear-gradient(90deg, rgba(122,140,110,0.2) 0, rgba(122,140,110,0.2) 2px, transparent 0, transparent 12px)
    `,
    backgroundColor: '#E8F0E5',
  },
  'pattern-dye': {
    background: 'radial-gradient(ellipse at 30% 70%, rgba(122,140,110,0.3) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(201,168,76,0.25) 0%, transparent 50%), #EEE8DA',
  },
  'pattern-leather': {
    backgroundImage: 'repeating-linear-gradient(90deg, rgba(26,22,18,0.06) 0, rgba(26,22,18,0.06) 1px, transparent 0, transparent 14px)',
    backgroundColor: '#EAE0D0',
  },
};

// Pretty-print craft key → section title
function craftTitle(key) {
  const MAP = {
    'block-printing': 'Block Printing & Indigo',
    'block': 'Block Printing & Indigo',
    'embroidery': 'Embroidery & Appliqué',
    'handloom': 'Handloom & Weaving',
    'weaving': 'Handloom & Weaving',
    'natural-dye': 'Natural Dye',
    'leather': 'Leather & Accessories',
    'other': 'Other Crafts',
  };
  return (
    MAP[key] ||
    key.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div style={{
      background: 'var(--surface)', borderRadius: 12,
      border: '1px solid var(--border)', overflow: 'hidden',
    }}>
      <div style={{ height: 160, background: 'var(--surface3)', animation: 'pulse 1.4s ease infinite' }} />
      <div style={{ padding: '18px 20px 20px' }}>
        {[120, 80, 200, 160, 200].map((w, i) => (
          <div key={i} style={{
            height: 12, width: w, background: 'var(--surface3)', borderRadius: 6,
            marginBottom: 10, animation: 'pulse 1.4s ease infinite',
            animationDelay: `${i * 0.1}s`,
          }} />
        ))}
      </div>
    </div>
  );
}

function StudioCard({ studio, onClick }) {
  const pattern = PATTERNS[studio.card_pattern] || PATTERNS['pattern-block'];
  const [hovered, setHovered] = useState(false);
  const [imgError, setImgError] = useState(false);

  const crafts    = [studio.primary_craft, ...(studio.secondary_crafts || [])].filter(Boolean);
  const materials = (studio.fabrics || []).slice(0, 3);

  const BASE = 'https://api.qala.studio';
  const rawUrl = studio.hero_image_url || '';
  const imageUrl = rawUrl
    ? (rawUrl.startsWith('http') ? rawUrl : BASE + rawUrl)
    : null;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--surface)',
        borderRadius: 12,
        border: '1px solid var(--border)',
        overflow: 'hidden',
        cursor: 'pointer',
        display: 'flex', flexDirection: 'column',
        transition: 'transform 0.22s ease, box-shadow 0.22s ease',
        transform: hovered ? 'translateY(-4px)' : 'none',
        boxShadow: hovered ? '0 16px 40px rgba(26,22,18,0.1)' : 'none',
      }}
    >
      {/* Visual area */}
      <div style={{ height: 200, position: 'relative', overflow: 'hidden', ...(imageUrl && !imgError ? {} : pattern) }}>

        {/* Hero image */}
        {imageUrl && !imgError && (
          <img
            src={imageUrl}
            alt={studio.studio_name}
            onError={() => setImgError(true)}
            style={{
              width: '100%', height: '100%', objectFit: 'cover', display: 'block',
              transition: 'transform 0.4s ease',
              transform: hovered ? 'scale(1.04)' : 'scale(1)',
            }}
          />
        )}

        {/* Gradient overlay — always shown so text is readable over image */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(160deg, transparent 30%, rgba(26,22,18,0.5))',
        }} />

        {/* Location */}
        {studio.location && (
          <span style={{
            position: 'absolute', bottom: 10, right: 12,
            fontSize: 11, color: 'rgba(255,255,255,0.9)', fontWeight: 300,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {studio.location}
          </span>
        )}
      </div>

      {/* Card body */}
      <div style={{ padding: '18px 20px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Studio name */}
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 500,
          color: 'var(--text)', marginBottom: 4, lineHeight: 1.2,
        }}>
          {studio.studio_name || 'Unnamed Studio'}
        </div>

        {/* Origin line */}
        <div style={{
          fontSize: 11, color: 'var(--gold)', textTransform: 'uppercase',
          letterSpacing: '0.1em', fontWeight: 500, marginBottom: 10,
        }}>
          {[
            studio.location,
            studio.years_in_operation && `${Math.round(studio.years_in_operation)} yrs`,
          ].filter(Boolean).join(' • ')}
        </div>

        {/* Description */}
        <div style={{
          fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, fontWeight: 300,
          flex: 1, marginBottom: 14,
          display: '-webkit-box', WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {studio.short_description || 'Specialised craft studio.'}
        </div>

        {/* Tags */}
        {(crafts.length > 0 || materials.length > 0) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            {crafts.slice(0, 2).map(c => (
              <span key={c} className="tag tag-craft">{c}</span>
            ))}
            {materials.length > 0 && (
              <span className="tag tag-material">{materials.join(' · ')}</span>
            )}
          </div>
        )}

        {/* Metadata grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
          paddingTop: 14, borderTop: '1px solid var(--border)',
          marginBottom: 16,
        }}>
          <div>
            <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(74,68,64,0.5)', fontWeight: 500, marginBottom: 2 }}>
              In-house Designer
            </div>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>
              {studio.has_inhouse_designer === true ? 'Yes'
                : studio.has_inhouse_designer === false ? 'No'
                : '—'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(74,68,64,0.5)', fontWeight: 500, marginBottom: 2 }}>
              Sampling Time
            </div>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>
              {studio.typical_sampling_time_display || '—'}
            </div>
          </div>
        </div>

        {/* CTA */}
        <button
          style={{
            width: '100%', padding: 10,
            background: hovered ? '#1A1612' : 'transparent',
            color: hovered ? '#F5F0E8' : 'var(--text)',
            border: '1.5px solid rgba(26,22,18,0.15)',
            borderColor: hovered ? '#1A1612' : 'rgba(26,22,18,0.15)',
            borderRadius: 8, fontFamily: 'var(--font-body)',
            fontSize: 13, fontWeight: 500, letterSpacing: '0.04em',
            cursor: 'pointer', transition: 'background 0.18s, color 0.18s, border-color 0.18s',
          }}
        >
          View Studio Profile →
        </button>
      </div>
    </div>
  );
}

// ─── Filter chip ────────────────────────────────────────────────────────────
function Chip({ label, active, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '6px 14px', borderRadius: 100,
        border: `1.5px solid ${active ? '#1A1612' : hovered ? 'var(--gold)' : 'rgba(26,22,18,0.1)'}`,
        background: active ? '#1A1612' : 'transparent',
        color: active ? '#F5F0E8' : hovered ? 'var(--gold)' : 'var(--text2)',
        fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: active ? 500 : 400,
        cursor: 'pointer', whiteSpace: 'nowrap',
        transition: 'all 0.18s ease',
      }}
    >
      {label}
    </button>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────
export default function StudioDirectory() {
  const nav = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [allData, setAllData]     = useState(null);
  const [filters, setFilters]     = useState({
    craft:       searchParams.get('craft')   || '',
    fabric:      searchParams.get('fabric')  || '',
    productType: searchParams.get('product') || '',
  });

  // Collect all unique option values from the loaded studios
  const [options, setOptions] = useState({ crafts: [], fabrics: [], productTypes: [] });

  // ── Load data ────────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    setError(null);
    discoveryAPI.getStudioDirectory({})   // load ALL studios once; filter client-side
      .then(res => {
        setAllData(res.data);
        // Build filter options from all studio data
        const crafts   = new Set();
        const fabrics  = new Set();
        const products = new Set();
        Object.values(res.data.studios_by_craft || {}).forEach(studios => {
          studios.forEach(s => {
            if (s.primary_craft) crafts.add(s.primary_craft);
            (s.secondary_crafts || []).forEach(c => crafts.add(c));
            (s.fabrics || []).forEach(f => fabrics.add(f));
            (s.product_types || []).forEach(p => products.add(p.replace(/_/g, ' ')));
          });
        });
        setOptions({
          crafts:       [...crafts].sort(),
          fabrics:      [...fabrics].sort(),
          productTypes: [...products].sort(),
        });
      })
      .catch(() => setError('Unable to load studios. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  // ── Apply filters client-side ────────────────────────────────────────────
  const filteredStudios = useCallback(() => {
    if (!allData) return [];
    const all = Object.values(allData.studios_by_craft || {}).flat();
    // Deduplicate by studio_id
    const seen = new Set();
    return all.filter(s => {
      if (seen.has(s.studio_id)) return false;
      seen.add(s.studio_id);
      const craftMatch = !filters.craft ||
        (s.primary_craft || '').toLowerCase().includes(filters.craft.toLowerCase()) ||
        (s.secondary_crafts || []).some(c => c.toLowerCase().includes(filters.craft.toLowerCase()));
      const fabricMatch = !filters.fabric ||
        (s.fabrics || []).some(f => f.toLowerCase().includes(filters.fabric.toLowerCase()));
      const productMatch = !filters.productType ||
        (s.product_types || []).some(p =>
          p.replace(/_/g, ' ').toLowerCase().includes(filters.productType.toLowerCase())
        );
      return craftMatch && fabricMatch && productMatch;
    });
  }, [allData, filters]);

  const setFilter = (key, val) => {
    const next = { ...filters, [key]: filters[key] === val ? '' : val };
    setFilters(next);
    const p = {};
    if (next.craft)       p.craft   = next.craft;
    if (next.fabric)      p.fabric  = next.fabric;
    if (next.productType) p.product = next.productType;
    setSearchParams(p, { replace: true });
  };

  const clearAll = () => {
    setFilters({ craft: '', fabric: '', productType: '' });
    setSearchParams({}, { replace: true });
  };

  const displayed    = filteredStudios();
  const totalVisible = displayed.length;
  const hasAnyFilter = filters.craft || filters.fabric || filters.productType;
  const totalStudios = allData?.total_count || 0;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font-body)' }}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1 }
          50%       { opacity: 0.5 }
        }
        @media (max-width: 767px) {
          .dir-grid { grid-template-columns: 1fr !important; }
          .dir-filter-zone { flex-direction: column; padding: 16px !important; }
          .dir-filter-group { border-right: none !important; border-bottom: 1px solid var(--border); padding-right: 0 !important; margin-right: 0 !important; padding-bottom: 14px; width: 100%; }
        }
        @media (min-width: 768px) and (max-width: 1023px) {
          .dir-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .dir-filter-zone { padding: 0 24px !important; }
        }
      `}</style>

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div style={{
        background: '#1A1612', padding: '64px 48px 48px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{
          position: 'absolute', top: -60, right: -60,
          width: 320, height: 320, borderRadius: '50%',
          background: 'rgba(184,92,56,0.12)', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -40, left: '30%',
          width: 200, height: 200, borderRadius: '50%',
          background: 'rgba(201,168,76,0.08)', pointerEvents: 'none',
        }} />

        {/* Breadcrumb */}
        <div style={{
          fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.4)', marginBottom: 20, position: 'relative', zIndex: 1,
        }}>
          <span
            onClick={() => nav('/')}
            style={{ cursor: 'pointer', transition: 'color 0.15s' }}
            onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.7)'}
            onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.4)'}
          >Home</span>
          {' / '}
          <span
            onClick={() => nav('/discover')}
            style={{ cursor: 'pointer', transition: 'color 0.15s' }}
            onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,0.7)'}
            onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.4)'}
          >Discovery</span>
          {' / '}
          <span style={{ color: 'rgba(255,255,255,0.7)' }}>Craft Studios</span>
          {filters.craft && (
            <> {' / '} <span style={{ color: 'rgba(255,255,255,0.7)' }}>{filters.craft}</span> </>
          )}
        </div>

        {/* Title */}
        <h1 style={{
          fontFamily: 'var(--font-display)', fontWeight: 300,
          fontSize: 'clamp(38px, 5vw, 64px)', color: '#F5F0E8',
          lineHeight: 1.1, position: 'relative', zIndex: 1, maxWidth: 560,
          marginBottom: 20,
        }}>
          Craft Studios <em style={{ fontStyle: 'italic', color: '#E8997A' }}>— Directory</em>
        </h1>

        {/* Studio count */}
        <div style={{
          color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: 300,
          position: 'relative', zIndex: 1,
        }}>
          {loading ? 'Loading studios…' : `${totalStudios} studios across categories & crafts`}
        </div>
      </div>

      {/* ── STICKY FILTER BAR ───────────────────────────────────────────── */}
      <nav className="dir-filter-zone" style={{
        background: 'var(--bg)', borderBottom: '1px solid var(--border)',
        padding: '0 48px', position: 'sticky', top: 0, zIndex: 100,
        display: 'flex', alignItems: 'stretch', gap: 0,
      }}>
        {/* Craft filter */}
        <div className="dir-filter-group" style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '18px 0',
          borderRight: '1px solid var(--border)',
          paddingRight: 28, marginRight: 28, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text2)', fontWeight: 500, whiteSpace: 'nowrap' }}>
            Craft
          </span>
          <Chip label="All" active={!filters.craft} onClick={() => setFilter('craft', '')} />
          {options.crafts.map(c => (
            <Chip key={c} label={c} active={filters.craft === c} onClick={() => setFilter('craft', c)} />
          ))}
        </div>

        {/* Fabric filter */}
        <div className="dir-filter-group" style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '18px 0',
          borderRight: '1px solid var(--border)',
          paddingRight: 28, marginRight: 28, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text2)', fontWeight: 500, whiteSpace: 'nowrap' }}>
            Fabric
          </span>
          <Chip label="All" active={!filters.fabric} onClick={() => setFilter('fabric', '')} />
          {options.fabrics.slice(0, 8).map(f => (
            <Chip key={f} label={f} active={filters.fabric === f} onClick={() => setFilter('fabric', f)} />
          ))}
        </div>

        {/* Product type filter */}
        <div className="dir-filter-group" style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '18px 0',
          flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text2)', fontWeight: 500, whiteSpace: 'nowrap' }}>
            Product
          </span>
          <Chip label="All" active={!filters.productType} onClick={() => setFilter('productType', '')} />
          {options.productTypes.slice(0, 8).map(p => (
            <Chip key={p} label={p} active={filters.productType === p} onClick={() => setFilter('productType', p)} />
          ))}
        </div>

        {/* Results count */}
        <div style={{
          marginLeft: 'auto', fontSize: 12, color: 'var(--text3)',
          alignSelf: 'center', whiteSpace: 'nowrap', fontWeight: 300, paddingLeft: 20,
        }}>
          Showing <strong style={{ color: 'var(--text)', fontWeight: 500 }}>{totalVisible}</strong> studios
          {hasAnyFilter && (
            <button
              onClick={clearAll}
              style={{
                marginLeft: 12, fontSize: 11, color: 'var(--gold)',
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-body)', padding: 0, textDecoration: 'underline',
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      </nav>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
      <main style={{ padding: '40px 48px 80px', maxWidth: 1400, margin: '0 auto' }}>

        {/* Error state */}
        {error && (
          <div style={{
            textAlign: 'center', padding: '60px 40px',
            background: 'var(--red-dim)', borderRadius: 12,
            border: '1px solid rgba(201,64,64,0.2)',
          }}>
            <div style={{ fontSize: 14, color: 'var(--red)', marginBottom: 16 }}>{error}</div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading skeletons */}
        {loading && !error && (
          <div className="dir-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
            {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && totalVisible === 0 && (
          <div style={{
            textAlign: 'center', padding: '80px 40px',
            background: 'rgba(26,22,18,0.03)', borderRadius: 12,
            maxWidth: 400, margin: '0 auto',
          }}>
            <div style={{ fontSize: 40, marginBottom: 20 }}>🧵</div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400, color: 'var(--text)', marginBottom: 10 }}>
              No studios match this filter.
            </h3>
            <p style={{ fontSize: 14, color: 'var(--text3)', lineHeight: 1.6, marginBottom: 24 }}>
              Try adjusting your filters above, or view all studios.
            </p>
            <button className="btn btn-secondary btn-sm" onClick={clearAll}>
              View all studios
            </button>
          </div>
        )}

        {/* Flat studio grid */}
        {!loading && !error && totalVisible > 0 && (
          <div
            className="dir-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: 20,
            }}
          >
            {displayed.map(studio => (
              <StudioCard
                key={studio.studio_id}
                studio={studio}
                onClick={() => nav(`/studio/${studio.studio_id}`)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

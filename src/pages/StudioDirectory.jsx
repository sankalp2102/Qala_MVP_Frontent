import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { discoveryAPI } from '../api/client';
import { mediaUrl, mediaOnError } from '../utils/mediaUrl';
import UserAvatar from '../components/UserAvatar';
import qalaLogo from '../assets/qala-logo.png';
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
  const materials = (studio.fabrics || []).slice(0, 3).map(f => f.fabric_name || f).filter(Boolean);

  const rawUrl  = studio.hero_image_url || '';
  const imageUrl = rawUrl ? mediaUrl(rawUrl) : null;
  const imageFallback = rawUrl ? `https://api.qala.studio${rawUrl.startsWith('/') ? '' : '/'}${rawUrl.replace(/^https?:\/\/[^/]+/, '')}` : null;

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
            loading='eager'
            onError={e => {
              if (imageFallback && e.target.src !== imageFallback) {
                e.target.src = imageFallback;
              } else {
                setImgError(true);
              }
            }}
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
        border: `1.5px solid ${active ? '#1A1612' : hovered ? 'var(--gold)' : 'rgba(26,22,18,0.22)'}`,
        background: active ? '#1A1612' : hovered ? 'rgba(196,110,73,0.06)' : 'rgba(255,255,255,0.7)',
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


// ─── Pinned filter order ─────────────────────────────────────────────────────
const FABRIC_CATEGORY_LABELS = {
  cotton:      'Cotton Based',
  silk:        'Silk Based',
  linen:       'Linen Based',
  wool:        'Wool Based',
  regenerated: 'Regenerated Fabrics',
  handcrafted: 'Handloom Fabrics',
  other:       'Other Fabrics',
};

const PRODUCT_TYPE_LABELS = {
  dresses:                  'Dresses',
  tops:                     'Tops',
  shirts:                   'Shirts',
  t_shirts:                 'T-Shirts',
  tunics_kurtas:            'Tunics / Kurtas',
  coord_sets:               'Coord Sets',
  jumpsuits:                'Jumpsuits',
  skirts:                   'Skirts',
  shorts:                   'Shorts',
  trousers_pants:           'Trousers / Pants',
  denim:                    'Denim',
  blazers:                  'Blazers',
  coats_jackets:            'Coats / Jackets',
  capes:                    'Capes',
  waistcoats_vests:         'Waistcoats / Vests',
  kaftans:                  'Kaftans',
  resortwear_sets:          'Resortwear Sets',
  loungewear_sleepwear:     'Loungewear / Sleepwear',
  activewear:               'Activewear',
  kidswear:                 'Kidswear',
  accessories_scarves_stoles: 'Accessories / Scarves / Stoles',
};

const PINNED_CRAFTS        = ['Hand Block Printing', 'Embroidery', 'Tie Dye'];
const PINNED_FABRICS       = ['Cotton Based', 'Silk Based', 'Wool Based'];
const PINNED_PRODUCT_TYPES = ['Dresses', 'Trousers / Pants', 'Tops'];

// ─── Collapsible filter group ───────────────────────────────────────────────
const VISIBLE_COUNT = 3;

function FilterGroup({ label, options, pinned = [], activeValues, isAll, onAll, onToggle, isLast }) {
  const [expanded, setExpanded] = useState(false);

  // Pinned first (case-insensitive match against live options), then rest alphabetically
  const lc = s => s.toLowerCase();
  const ordered = [
    ...pinned.filter(p => options.some(o => lc(o) === lc(p))).map(p => options.find(o => lc(o) === lc(p))),
    ...options.filter(o => !pinned.some(p => lc(p) === lc(o))),
  ];

  const hiddenCount    = Math.max(0, ordered.length - VISIBLE_COUNT);
  const hasHiddenActive = activeValues.some(v => !ordered.slice(0, VISIBLE_COUNT).includes(v));

  return (
    <div style={{
      position: 'relative',
      borderRight: isLast ? 'none' : '1px solid var(--border)',
      paddingRight: isLast ? 0 : 20,
      marginRight: isLast ? 0 : 20,
    }}>
      {/* Single-line row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, height: 52, flexShrink: 0 }}>
        <span style={{
          fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
          color: 'var(--text3)', fontWeight: 600, whiteSpace: 'nowrap', marginRight: 2,
        }}>
          {label}
        </span>

        {/* All chip */}
        <Chip label="All" active={isAll} onClick={onAll} />

        {/* First VISIBLE_COUNT chips — pinned order */}
        {ordered.slice(0, VISIBLE_COUNT).map(opt => (
          <Chip
            key={opt}
            label={opt}
            active={activeValues.includes(opt)}
            onClick={() => onToggle(opt)}
          />
        ))}

        {/* +N more button */}
        {hiddenCount > 0 && (
          <button
            onClick={() => setExpanded(e => !e)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '5px 12px', borderRadius: 100, border: '1.5px solid',
              borderColor: expanded || hasHiddenActive ? '#C46E49' : 'rgba(26,22,18,0.15)',
              background: expanded ? 'rgba(196,110,73,0.08)' : 'transparent',
              color: expanded || hasHiddenActive ? '#C46E49' : 'var(--text3)',
              fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 500,
              cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.18s',
            }}
          >
            {expanded ? 'Collapse ▲' : `+${hiddenCount} more${hasHiddenActive ? ' ●' : ''}`}
          </button>
        )}
      </div>

      {/* Expanded dropdown panel */}
      {expanded && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 200,
          background: 'var(--bg)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '16px 18px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          display: 'flex', flexWrap: 'wrap', gap: 8,
          maxWidth: 480, minWidth: 280,
          animation: 'fadeDown 0.18s ease both',
        }}>
          {ordered.slice(VISIBLE_COUNT).map(opt => (
            <Chip
              key={opt}
              label={opt}
              active={activeValues.includes(opt)}
              onClick={() => { onToggle(opt); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Full filter bar ────────────────────────────────────────────────────────
function FilterBar({ options, filters, setFilter, clearAll, totalVisible, hasAnyFilter }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const activeCount = filters.craft.length + filters.fabric.length + filters.productType.length;

  return (
    <>
      <style>{`
        @keyframes fadeDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: none; }
        }
      `}</style>

      {/* Desktop nav — hidden on mobile via CSS */}
      <nav className="filter-bar-nav" style={{
        background: 'var(--bg)', borderBottom: '1px solid var(--border)',
        padding: '0 48px', position: 'sticky', top: 58, zIndex: 100,
        display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0,
      }}>
        <FilterGroup
          label="Craft"
          options={options.crafts}
          pinned={PINNED_CRAFTS}
          activeValues={filters.craft}
          isAll={filters.craft.length === 0}
          onAll={() => setFilter('craft', '')}
          onToggle={v => setFilter('craft', v)}
          isLast={false}
        />
        <FilterGroup
          label="Fabric"
          options={options.fabrics}
          pinned={PINNED_FABRICS}
          activeValues={filters.fabric}
          isAll={filters.fabric.length === 0}
          onAll={() => setFilter('fabric', '')}
          onToggle={v => setFilter('fabric', v)}
          isLast={false}
        />
        <FilterGroup
          label="Product"
          options={options.productTypes}
          pinned={PINNED_PRODUCT_TYPES}
          activeValues={filters.productType}
          isAll={filters.productType.length === 0}
          onAll={() => setFilter('productType', '')}
          onToggle={v => setFilter('productType', v)}
          isLast={true}
        />

        {/* Results count */}
        <div style={{
          marginLeft: 'auto', fontSize: 12, color: 'var(--text3)',
          whiteSpace: 'nowrap', fontWeight: 300, paddingLeft: 20,
          flexShrink: 0, alignSelf: 'center',
        }}>
          {hasAnyFilter && (
            <button
              onClick={clearAll}
              style={{
                fontSize: 11, color: 'var(--gold)',
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-body)', padding: 0, textDecoration: 'underline',
              }}
            >
              Clear filters
            </button>
          )}
        </div>
        {/* Avatar — only visible when logged in */}
        <UserAvatar hideWhenLoggedOut />
      </nav>

      {/* Mobile filter bar — hidden on desktop via CSS */}
      <div className="filter-mobile-bar" style={{
        background: 'var(--bg)', borderBottom: '1px solid var(--border)',
        padding: '10px 16px', position: 'sticky', top: 58, zIndex: 100,
        alignItems: 'center', gap: 10,
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => setDrawerOpen(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '8px 16px', borderRadius: 100,
              border: `1.5px solid ${activeCount > 0 ? '#1A1612' : 'rgba(26,22,18,0.22)'}`,
              background: activeCount > 0 ? '#1A1612' : 'rgba(255,255,255,0.7)',
              color: activeCount > 0 ? '#F5F0E8' : 'var(--text2)',
              fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            ⊞ Filters{activeCount > 0 ? ` (${activeCount})` : ''}
          </button>
          {hasAnyFilter && (
            <button onClick={clearAll} style={{
              fontSize: 12, color: 'var(--gold)', background: 'none',
              border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-body)', padding: 0, textDecoration: 'underline',
            }}>
              Clear
            </button>
          )}
        </div>
        {/* Avatar — only visible when logged in */}
        <UserAvatar hideWhenLoggedOut />
      </div>

      {/* Mobile filter drawer */}
      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(15,10,8,0.45)', backdropFilter: 'blur(4px)',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: 'var(--bg)', borderRadius: '20px 20px 0 0',
              maxHeight: '80dvh', overflowY: 'auto',
              animation: 'slideUp 0.25s cubic-bezier(0.4,0,0.2,1) both',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.15)',
            }}
          >
            {/* Drawer header */}
            <div style={{
              position: 'sticky', top: 0, background: 'var(--bg)',
              padding: '16px 20px 14px',
              borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)', position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)' }} />
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 500, color: 'var(--text)', marginTop: 8 }}>Filters</span>
              <button onClick={() => setDrawerOpen(false)} style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--text3)', cursor: 'pointer', marginTop: 4 }}>✕</button>
            </div>

            {/* Filter groups */}
            <div style={{ padding: '20px 20px 0' }}>
              {[
                { label: 'Craft',        key: 'craft',       opts: options.crafts,       pinned: PINNED_CRAFTS },
                { label: 'Fabric',       key: 'fabric',      opts: options.fabrics,      pinned: PINNED_FABRICS },
                { label: 'Product type', key: 'productType', opts: options.productTypes, pinned: PINNED_PRODUCT_TYPES },
              ].map(({ label, key, opts, pinned }) => {
                const lc = s => s.toLowerCase();
                const ordered = [
                  ...pinned.filter(p => opts.some(o => lc(o) === lc(p))).map(p => opts.find(o => lc(o) === lc(p))),
                  ...opts.filter(o => !pinned.some(p => lc(p) === lc(o))),
                ];
                return (
                  <div key={key} style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text3)', fontWeight: 600, marginBottom: 10 }}>{label}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      <Chip label="All" active={filters[key].length === 0} onClick={() => setFilter(key, '')} />
                      {ordered.map(opt => (
                        <Chip key={opt} label={opt} active={filters[key].includes(opt)} onClick={() => setFilter(key, opt)} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Apply button */}
            <div style={{ padding: '4px 20px 32px' }}>
              <button
                onClick={() => setDrawerOpen(false)}
                style={{
                  width: '100%', padding: '13px', borderRadius: 10,
                  background: '#1A1612', color: '#F5F0E8', border: 'none',
                  fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {activeCount > 0 ? `Show results · ${activeCount} filter${activeCount > 1 ? 's' : ''} active` : 'Show all studios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
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
    craft:       searchParams.get('craft')?.split(',').filter(Boolean)   || [],
    fabric:      searchParams.get('fabric')?.split(',').filter(Boolean)  || [],
    productType: searchParams.get('product')?.split(',').filter(Boolean) || [],
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
            (s.fabrics || []).forEach(f => {
              const category = typeof f === 'string' ? f : f.category;
              const label = FABRIC_CATEGORY_LABELS[category] || category;
              if (label) fabrics.add(label);
            });
            (s.product_types || []).forEach(p => {
              const label = PRODUCT_TYPE_LABELS[p] || p.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
              if (label) products.add(label);
            });
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
      const craftMatch = filters.craft.length === 0 ||
        filters.craft.some(fc =>
          (s.primary_craft || '').toLowerCase().includes(fc.toLowerCase()) ||
          (s.secondary_crafts || []).some(c => c.toLowerCase().includes(fc.toLowerCase()))
        );
      const fabricMatch = filters.fabric.length === 0 ||
        filters.fabric.some(ff =>
          (s.fabrics || []).some(f => {
            const category = typeof f === 'string' ? f : f.category;
            const label = FABRIC_CATEGORY_LABELS[category] || category;
            return label && label.toLowerCase() === ff.toLowerCase();
          })
        );
      const productMatch = filters.productType.length === 0 ||
        filters.productType.some(fp =>
          (s.product_types || []).some(p => {
            const label = PRODUCT_TYPE_LABELS[p] || p.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            return label.toLowerCase() === fp.toLowerCase();
          })
        );
      return craftMatch && fabricMatch && productMatch;
    });
  }, [allData, filters]);

  const setFilter = (key, val) => {
    const next = { ...filters };
    if (!val) {
      // Clicked "All" — clear that filter
      next[key] = [];
    } else {
      // Toggle the value in/out of the array
      const arr = next[key];
      next[key] = arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val];
    }
    setFilters(next);
    const p = {};
    if (next.craft.length)       p.craft   = next.craft.join(',');
    if (next.fabric.length)      p.fabric  = next.fabric.join(',');
    if (next.productType.length) p.product = next.productType.join(',');
    setSearchParams(p, { replace: true });
  };

  const clearAll = () => {
    setFilters({ craft: [], fabric: [], productType: [] });
    setSearchParams({}, { replace: true });
  };

  const displayed    = filteredStudios();
  const totalVisible = displayed.length;
  const hasAnyFilter = filters.craft.length > 0 || filters.fabric.length > 0 || filters.productType.length > 0;
  const totalStudios = allData?.total_count || 0;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font-body)' }}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1 }
          50%       { opacity: 0.5 }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(100%); }
          to   { opacity: 1; transform: none; }
        }
        @media (max-width: 767px) {
          .dir-grid { grid-template-columns: 1fr !important; }
          .dir-filter-zone { flex-direction: column; padding: 16px !important; }
          .dir-filter-group { border-right: none !important; border-bottom: 1px solid var(--border); padding-right: 0 !important; margin-right: 0 !important; padding-bottom: 14px; width: 100%; }
          .filter-bar-nav { display: none !important; }
          .filter-mobile-bar { display: flex !important; }
        }
        @media (min-width: 768px) and (max-width: 1023px) {
          .dir-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .dir-filter-zone { padding: 0 24px !important; }
        }
        .filter-mobile-bar { display: none; }
      `}</style>

      {/* ── LOGO BAR — sticky, always visible ───────────────────────────── */}
      <div style={{
        background: '#1A1612', borderBottom: '1px solid rgba(245,240,232,0.08)',
        padding: '0 48px', height: 58, position: 'sticky', top: 0, zIndex: 101,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <img src={qalaLogo} alt="Qala" className="qala-logo"
          onClick={() => nav('/')}
          style={{ filter: 'brightness(0) invert(1)', opacity: 0.9, cursor: 'pointer' }}
        />
        <UserAvatar hideWhenLoggedOut />
      </div>

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div style={{
        background: '#1A1612', padding: '32px 48px 48px',
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
      <FilterBar
        options={options}
        filters={filters}
        setFilter={setFilter}
        clearAll={clearAll}
        totalVisible={totalVisible}
        hasAnyFilter={hasAnyFilter}
      />

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
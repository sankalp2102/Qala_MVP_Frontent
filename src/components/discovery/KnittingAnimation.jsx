import { useState, useEffect, useRef } from 'react';

// ─── Palette (light cream background) ────────────────────────────────────────
const NEEDLE_SHAFT   = '#6B4226';
const NEEDLE_MID     = '#9F6547';
const NEEDLE_TIP     = '#9F6547';
const STOPPER        = '#C46E49';
const YARN           = '#C46E49';
const STITCH_DONE    = '#C46E49';       // terracotta — visible on cream
const STITCH_NEW     = '#A85A38';       // darker terracotta flash for new rows
const STITCH_BINDOFF = '#5C9977';       // deeper sage — visible on cream
const GLOW           = 'rgba(196,110,73,0.10)';
const LABEL          = '#9F6547';

// ─── Swatch geometry ──────────────────────────────────────────────────────────
const COLS       = 10;
const MAX_ROWS   = 16;
const SW         = 28;
const SH         = 20;
const SL         = 40;
const ST         = 120;
const SWATCH_W   = COLS * SW;
const SWATCH_H   = MAX_ROWS * SH;
const N_Y1       = ST - 32;
const N_Y2       = ST - 22;

// ─── One knit V-stitch ───────────────────────────────────────────────────────
function KnitStitch({ col, row, color, opacity, staggerDelay }) {
  const x  = SL + col * SW;
  const y  = ST + row * SH;
  const cx = x + SW / 2;

  const apexY = y + SH * 0.12;
  const botY  = y + SH * 0.88;
  const midY  = y + SH * 0.50;
  const loopR = SW * 0.07;

  const lPath = `M ${cx} ${apexY} Q ${cx - SW*0.22} ${midY} ${x + SW*0.10} ${botY}`;
  const rPath = `M ${cx} ${apexY} Q ${cx + SW*0.22} ${midY} ${x + SW*0.90} ${botY}`;

  return (
    <g opacity={opacity} style={{ transition: `opacity 0.18s ease ${staggerDelay}s` }}>
      <path d={lPath} fill="none" stroke={color} strokeWidth={2.0} strokeLinecap="round" />
      <path d={rPath} fill="none" stroke={color} strokeWidth={2.0} strokeLinecap="round" />
      <circle cx={x + SW*0.10} cy={botY} r={loopR} fill="none" stroke={color} strokeWidth={1.3} />
      <circle cx={x + SW*0.90} cy={botY} r={loopR} fill="none" stroke={color} strokeWidth={1.3} />
    </g>
  );
}

// ─── Two diagonal knitting needles ───────────────────────────────────────────
function Needles() {
  const n1x1 = SL - 24;               const n1y1 = N_Y1 - 8;
  const n1x2 = SL + SWATCH_W * 0.62;  const n1y2 = N_Y1 + 10;
  const n2x1 = SL + SWATCH_W + 20;    const n2y1 = N_Y2 - 6;
  const n2x2 = SL + SWATCH_W * 0.42;  const n2y2 = N_Y2 + 10;

  return (
    <g>
      {/* Needle 1 — left to right */}
      <line x1={n1x1} y1={n1y1} x2={n1x2} y2={n1y2}
        stroke={NEEDLE_SHAFT} strokeWidth={5} strokeLinecap="round" />
      <line x1={n1x1+20} y1={n1y1-0.5} x2={n1x2-30} y2={n1y2-1.5}
        stroke="rgba(255,255,255,0.20)" strokeWidth={1.2} strokeLinecap="round" />
      <circle cx={n1x1} cy={n1y1} r={6.5} fill={STOPPER} stroke={NEEDLE_SHAFT} strokeWidth={1} />
      <circle cx={n1x2} cy={n1y2} r={3.5} fill={NEEDLE_TIP} stroke={NEEDLE_MID} strokeWidth={0.8} />

      {/* Needle 2 — right to left */}
      <line x1={n2x1} y1={n2y1} x2={n2x2} y2={n2y2}
        stroke={NEEDLE_SHAFT} strokeWidth={5} strokeLinecap="round" />
      <line x1={n2x1-20} y1={n2y1-0.5} x2={n2x2+30} y2={n2y2-1.5}
        stroke="rgba(255,255,255,0.20)" strokeWidth={1.2} strokeLinecap="round" />
      <circle cx={n2x1} cy={n2y1} r={6.5} fill={STOPPER} stroke={NEEDLE_SHAFT} strokeWidth={1} />
      <circle cx={n2x2} cy={n2y2} r={3.5} fill={NEEDLE_TIP} stroke={NEEDLE_MID} strokeWidth={0.8} />
    </g>
  );
}

// ─── Yarn thread ──────────────────────────────────────────────────────────────
function YarnThread({ rows }) {
  if (rows >= MAX_ROWS) return null;
  const tipX = SL + SWATCH_W * 0.62;
  const tipY = N_Y1 + 10;
  const endX = SL + SWATCH_W;
  const endY = ST + rows * SH;
  const cpX  = tipX + 14;
  const cpY  = (tipY + endY) / 2 + 8;

  return (
    <path
      d={`M ${tipX} ${tipY} Q ${cpX} ${cpY} ${endX} ${endY}`}
      fill="none" stroke={YARN} strokeWidth={1.6}
      strokeLinecap="round" opacity={0.55}
      style={{ transition: 'all 0.35s ease' }}
    />
  );
}

// ─── Active row glow ──────────────────────────────────────────────────────────
function RowGlow({ rows }) {
  if (rows <= 0) return null;
  return (
    <rect
      x={SL - 4} y={ST + (rows - 2) * SH - 2}
      width={SWATCH_W + 8} height={SH * 2 + 4}
      fill={GLOW} rx={3}
      style={{ transition: 'y 0.35s ease' }}
    />
  );
}

// ─── Progress pips ────────────────────────────────────────────────────────────
function ProgressPips({ rows }) {
  const PW = 10, PH = 3, GAP = 3;
  const totalW = MAX_ROWS * (PW + GAP) - GAP;
  const startX = SL + (SWATCH_W - totalW) / 2;
  const y = ST + SWATCH_H + 26;

  return (
    <g>
      {Array.from({ length: MAX_ROWS }, (_, i) => (
        <rect key={i}
          x={startX + i * (PW + GAP)} y={y}
          width={PW} height={PH} rx={1.5}
          fill={i < rows ? STITCH_DONE : i === rows ? STOPPER : 'rgba(159,101,71,0.15)'}
          opacity={i < rows ? 0.68 : i === rows ? 0.5 : 1}
          style={{ transition: 'fill 0.3s ease, opacity 0.3s ease' }}
        />
      ))}
      {rows > 0 && (
        <text
          x={SL + SWATCH_W / 2} y={y + 18}
          textAnchor="middle" fontSize={10}
          fill={LABEL} opacity={0.55}
          fontFamily="'Sora', sans-serif" fontWeight={500} letterSpacing="0.06em"
        >
          {rows} / 16 rows
        </text>
      )}
    </g>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function KnittingAnimation({ rowsKnitted = 0 }) {
  const maxSeen = useRef(0);
  const [rows, setRows]       = useState(0);
  const [newFrom, setNewFrom] = useState(-1);

  useEffect(() => {
    if (rowsKnitted > maxSeen.current) {
      setNewFrom(maxSeen.current);
      maxSeen.current = rowsKnitted;
      setRows(rowsKnitted);
    }
  }, [rowsKnitted]);

  const SVG_W = SWATCH_W + SL * 2;
  const SVG_H = ST + SWATCH_H + 56;

  return (
    <div style={{
      width: '100%', height: '100%', background: '#F8F5F1',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative',
    }}>
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 50% 40%, rgba(196,110,73,0.06) 0%, transparent 65%)',
      }} />

      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        style={{ width: '88%', maxWidth: 360, height: 'auto', overflow: 'visible' }}
        aria-label="Knitting swatch progress"
      >
        {/* Ghost outline of full swatch area */}
        <rect
          x={SL-2} y={ST-2} width={SWATCH_W+4} height={SWATCH_H+4}
          fill="none" stroke="rgba(196,110,73,0.15)"
          strokeWidth={1} strokeDasharray="3 5" rx={2}
        />

        {/* Ghost stitches on empty needles */}
        {rows === 0 && Array.from({ length: COLS }, (_, c) => (
          <KnitStitch key={`ghost-${c}`} col={c} row={0}
            color={STITCH_DONE} opacity={0.12} staggerDelay={0} />
        ))}

        <RowGlow rows={rows} />

        {Array.from({ length: rows }, (_, row) => {
          const isBindOff = row === MAX_ROWS - 1;
          const isNew     = newFrom >= 0 && row >= newFrom;
          const color     = isBindOff ? STITCH_BINDOFF : isNew ? STITCH_NEW : STITCH_DONE;
          return Array.from({ length: COLS }, (_, col) => (
            <KnitStitch key={`${row}-${col}`} col={col} row={row}
              color={color} opacity={1}
              staggerDelay={isNew ? col * 0.028 : 0} />
          ));
        })}

        <YarnThread rows={rows} />
        <Needles />

        {rows >= MAX_ROWS && [0.15, 0.50, 0.85].map((frac, i) => (
          <circle key={i}
            cx={SL + SWATCH_W * frac} cy={ST + SWATCH_H + 12}
            r={2.8} fill={STITCH_BINDOFF} opacity={0.75} />
        ))}

        <ProgressPips rows={rows} />
      </svg>
    </div>
  );
}
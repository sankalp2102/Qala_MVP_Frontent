import { useEffect, useRef } from 'react';

const STAGES = [
  { label: 'Raw Fibre',       sub: 'The journey begins with raw material' },
  { label: 'Spinning',        sub: 'Fibres twisted into thread' },
  { label: 'Weaving',         sub: 'Threads interlaced into fabric' },
  { label: 'Dyeing',          sub: 'Colour absorbed into cloth' },
  { label: 'Block Printing',  sub: 'Pattern pressed by hand' },
  { label: 'Pattern Cutting', sub: 'Cloth shaped for the body' },
  { label: 'Stitching',       sub: 'Pieces joined with care' },
  { label: 'Finished',        sub: 'Ready to wear' },
];

function easeInOut(t) { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t; }
function lerp(a, b, t) { return a + (b - a) * t; }

// ─── draw each stage ──────────────────────────────────────────────────────────

function drawFibres(ctx, p, alpha) {
  if (alpha < 0.01) return;
  ctx.save();
  const seeds = [
    [62,82,22,18],[135,58,32,26],[205,90,28,22],[272,72,25,30],[322,112,20,24],
    [82,152,26,20],[165,142,30,18],[244,162,22,26],[305,148,28,20],
    [100,222,24,28],[182,232,28,22],[262,218,20,26],[143,292,26,24],[222,286,30,20],
  ];
  seeds.forEach(([bx,by,ang,len], i) => {
    const appear = Math.min(1, p * 3.5 - i * 0.12);
    if (appear <= 0) return;
    const t2 = Date.now() / 3000;
    const dx = Math.sin(t2 * 0.7 + i * 1.1) * 5;
    const dy = Math.cos(t2 * 0.5 + i * 0.9) * 4;
    const rad = (ang * Math.PI) / 180;
    ctx.globalAlpha = alpha * appear * 0.75;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(bx + dx, by + dy);
    ctx.quadraticCurveTo(
      bx + dx + Math.cos(rad) * len * 0.45 + Math.sin(rad) * 7,
      by + dy + Math.sin(rad) * len * 0.45 - Math.cos(rad) * 7,
      bx + dx + Math.cos(rad) * len,
      by + dy + Math.sin(rad) * len
    );
    ctx.stroke();
  });
  ctx.restore();
}

function drawSpinning(ctx, p, alpha) {
  if (alpha < 0.01) return;
  ctx.save();
  const cx = 200, cy = 185;
  const t = Date.now() / 800;
  const rot = t * (0.3 + p * 0.7) * Math.PI * 2;

  // Thread stream
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1.2;
  ctx.lineCap = 'round';
  ctx.globalAlpha = alpha * Math.min(1, p * 2);
  ctx.beginPath();
  for (let i = 0; i <= 50; i++) {
    const tt = i / 50;
    const x = lerp(58, cx - 22, tt);
    const y = lerp(38, cy - 35, tt) + Math.sin(tt * Math.PI * 5 + t) * 9;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Spool
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.globalAlpha = alpha * Math.min(1, p * 1.5);
  ctx.strokeStyle = 'rgba(255,255,255,0.65)';
  ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.ellipse(0, -32, 24, 9, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0,  32, 24, 9, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 1.2;
  [-4, 4].forEach(x => { ctx.beginPath(); ctx.moveTo(x,-32); ctx.lineTo(x,32); ctx.stroke(); });
  for (let i = 0; i < 10; i++) {
    ctx.globalAlpha = alpha * 0.35;
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, -22 + i * 5, 15 + Math.sin(i) * 3, 3.5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  // Trail
  ctx.globalAlpha = alpha * 0.3;
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 5]);
  ctx.beginPath();
  ctx.moveTo(cx, cy - 32);
  ctx.quadraticCurveTo(cx + 72, cy - 88, cx + 105, cy - 58);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawWeaving(ctx, p, alpha) {
  if (alpha < 0.01) return;
  ctx.save();
  const sx = 55, sy = 42, gap = 34, cols = 8, rows = 9;

  // Frame
  ctx.globalAlpha = alpha * Math.min(1, p * 5) * 0.18;
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(sx - 14, sy - 14, cols * gap + 28, rows * gap + 28);

  // Warp
  const warpA = Math.min(1, p * 4);
  for (let c = 0; c < cols; c++) {
    ctx.globalAlpha = alpha * warpA * 0.28;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(sx + c*gap, sy); ctx.lineTo(sx + c*gap, sy + rows*gap); ctx.stroke();
  }

  // Weft — animated wave running through completed rows + partial current row
  const t = Date.now() / 2000;
  const weftCount = p * rows;
  for (let r = 0; r < rows; r++) {
    const rowP = Math.min(1, weftCount - r);
    if (rowP <= 0) continue;
    const isLatest = r === Math.floor(weftCount);
    ctx.globalAlpha = alpha * rowP * (isLatest ? 0.95 : 0.75);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = isLatest ? 2 : 1.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let c = 0; c < cols; c++) {
      const isOver = (c + r) % 2 === 0;
      // Living weave: animate a gentle wave on completed rows
      const waveY = isLatest ? 0 : Math.sin(t * 1.5 + c * 0.6 + r * 0.4) * 1.2;
      const x = sx + c * gap;
      const y = sy + r * gap + (isOver ? -3 : 3) + waveY;
      const xLimit = isLatest ? sx + c * gap + gap * (rowP % 1 || 1) : sx + cols * gap;
      c === 0 ? ctx.moveTo(x, y) : ctx.lineTo(Math.min(x, xLimit), y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawDyeing(ctx, p, alpha) {
  if (alpha < 0.01) return;
  ctx.save();
  const t = Date.now() / 1500;

  // Cloth
  ctx.globalAlpha = alpha * 0.6;
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(155, 58); ctx.lineTo(155, 268);
  ctx.quadraticCurveTo(200, 290, 245, 268);
  ctx.lineTo(245, 58);
  ctx.stroke();
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(128, 52); ctx.lineTo(272, 52); ctx.stroke();

  // Vat
  ctx.globalAlpha = alpha * 0.3;
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(78, 298); ctx.quadraticCurveTo(78, 340, 200, 345);
  ctx.quadraticCurveTo(322, 340, 322, 298);
  ctx.lineTo(302, 158); ctx.quadraticCurveTo(200, 148, 98, 158); ctx.closePath();
  ctx.stroke();

  // Rising liquid
  const rise = p;
  const liqTop = 338 - rise * 205;
  ctx.globalAlpha = alpha * 0.14;
  ctx.fillStyle = '#fff';
  ctx.fillRect(85, liqTop, 230, 338 - liqTop);

  // Ripples on surface — animated
  if (p > 0.1) {
    for (let i = 0; i < 3; i++) {
      const phase = (t + i * 0.7) % 1;
      ctx.globalAlpha = alpha * (p - 0.1) * (1 - phase) * 0.4;
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.ellipse(200, liqTop + 4, 20 + phase * 60, 5 + phase * 3, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Dye climbing cloth
  if (p > 0.05) {
    const dyeTop = 268 - (p - 0.05) * 280;
    const grad = ctx.createLinearGradient(0, dyeTop + 90, 0, dyeTop);
    grad.addColorStop(0, 'rgba(255,255,255,0.22)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalAlpha = alpha;
    ctx.fillStyle = grad;
    ctx.fillRect(150, dyeTop, 100, 95);
  }
  ctx.restore();
}

function drawBlockPrinting(ctx, p, alpha) {
  if (alpha < 0.01) return;
  ctx.save();

  // Fabric
  ctx.globalAlpha = alpha * 0.12;
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(55, 44, 250, 258);

  const positions = [
    {x:100,y:96},{x:175,y:96},{x:250,y:96},
    {x:100,y:180},{x:175,y:180},{x:250,y:180},
    {x:100,y:264},{x:175,y:264},{x:250,y:264},
  ];
  const printCount = Math.floor(p * positions.length);
  const partial    = (p * positions.length) % 1;

  // Printed motifs
  positions.forEach((pos, i) => {
    if (i >= printCount) return;
    const pp = i < printCount - 1 ? 1 : partial;
    ctx.globalAlpha = alpha * pp;
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.fillStyle   = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.globalAlpha = alpha * pp * 0.3;
    ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(-22,0); ctx.lineTo(22,0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,-22); ctx.lineTo(0,22); ctx.stroke();
    [[0,-16],[16,0],[0,16],[-16,0]].forEach(([px,py]) => {
      ctx.globalAlpha = alpha * pp * 0.55;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(px, py, 4.5, 0, Math.PI*2); ctx.stroke();
    });
    ctx.restore();
  });

  // Block tool drifts toward the next print spot
  if (printCount < positions.length) {
    const next = positions[printCount];
    const t2 = Date.now() / 800;
    const hover = Math.sin(t2) * 4;
    ctx.globalAlpha = alpha * 0.8;
    ctx.save();
    ctx.translate(next.x + 34, next.y - 38 + hover);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-16, -8, 32, 16);
    ctx.strokeRect(-10, -22, 20, 16);
    ctx.beginPath(); ctx.moveTo(-6,-22); ctx.lineTo(6,-22); ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function drawCutting(ctx, p, alpha) {
  if (alpha < 0.01) return;
  ctx.save();

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 0.6;
  for (let i = 0; i < 9;  i++) { ctx.beginPath(); ctx.moveTo(45+i*34,25); ctx.lineTo(45+i*34,335); ctx.stroke(); }
  for (let i = 0; i < 11; i++) { ctx.beginPath(); ctx.moveTo(45,25+i*30); ctx.lineTo(330,25+i*30); ctx.stroke(); }

  // Pattern pieces — dashed
  const pieces = [
    'M 130,55 L 200,38 L 270,55 L 278,155 Q 240,174 200,170 Q 160,174 122,155 Z',
    'M 68,78 Q 48,118 58,168 L 113,153 Q 108,108 118,78 Z',
    'M 118,195 Q 122,175 200,170 Q 278,175 282,195 L 296,308 Q 200,326 104,308 Z',
  ];
  pieces.forEach((d, i) => {
    ctx.globalAlpha = alpha * Math.min(1, p * 3 - i * 0.3) * 0.22;
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([5,4]);
    ctx.stroke(new Path2D(d));
    ctx.setLineDash([]);
  });

  // Progressive cut line
  ctx.globalAlpha = alpha * 0.85;
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([p * 620, 1000]);
  ctx.stroke(new Path2D('M 130,55 L 200,38 L 270,55 L 278,155 Q 240,174 200,170 Q 160,174 122,155 Z'));
  ctx.setLineDash([]);

  // Scissors — continuously tracing the path
  const t2 = Date.now() / 2200;
  const cycle = t2 % 1;
  const sx = 130 + cycle * 140;
  const sy = 55 + Math.sin(cycle * Math.PI * 2) * 55;
  ctx.globalAlpha = alpha * Math.min(1, p * 6);
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(-0.4 + cycle * 1.2);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(20,-5); ctx.lineTo(3,9); ctx.closePath(); ctx.fill();
  ctx.globalAlpha = alpha * Math.min(1, p * 6) * 0.55;
  ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(20,5); ctx.lineTo(3,-9); ctx.closePath(); ctx.fill();
  ctx.globalAlpha = alpha * Math.min(1, p * 6);
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(0,0,2.5,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-12,-8); ctx.quadraticCurveTo(-18,-14,-15,-20); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-12, 8); ctx.quadraticCurveTo(-18, 14,-15, 20); ctx.stroke();
  ctx.restore();

  ctx.restore();
}

function drawStitching(ctx, p, alpha) {
  if (alpha < 0.01) return;
  ctx.save();

  // Panels
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1.2;
  ctx.globalAlpha = alpha;
  ctx.beginPath(); ctx.roundRect(45,75,130,205,6); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.roundRect(195,75,130,205,6); ctx.fill(); ctx.stroke();

  // Seam
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 1.4;
  ctx.setLineDash([4,3]);
  ctx.beginPath(); ctx.moveTo(75,178); ctx.lineTo(75 + p * 220, 178); ctx.stroke();
  ctx.setLineDash([]);

  // Stitch dots
  const dotCount = Math.floor(p * 30);
  for (let i = 0; i < dotCount; i++) {
    ctx.globalAlpha = alpha * 0.85;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.arc(75 + i*7.5, 178 + Math.sin(i*0.9)*2.5, 1.8, 0, Math.PI*2);
    ctx.fill();
  }

  // Needle — animated continuously
  const t2 = Date.now() / 600;
  const nx = 75 + p * 220;
  const ny = 178 + Math.sin(t2) * 11;
  ctx.globalAlpha = alpha * Math.min(1, p * 6);
  ctx.save();
  ctx.translate(nx, ny);
  ctx.rotate(0.3 + Math.sin(t2) * 0.4);
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0,-16); ctx.lineTo(0,12); ctx.stroke();
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(0,-13,2.5,1.8,0,0,Math.PI*2); ctx.stroke();
  ctx.globalAlpha = alpha * 0.28;
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0,-11); ctx.quadraticCurveTo(16,-34,-18-p*28,-17); ctx.stroke();
  ctx.restore();

  ctx.restore();
}

function drawFinished(ctx, p, alpha) {
  if (alpha < 0.01) return;
  ctx.save();
  const ep = p < 1 ? (1 - Math.pow(1 - p, 3)) : 1;
  ctx.globalAlpha = alpha;
  ctx.translate(200, 185);
  ctx.scale(0.45 + ep * 0.55, 0.45 + ep * 0.55);

  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.fillStyle   = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  // Neckline
  ctx.beginPath();
  ctx.moveTo(-30,-110); ctx.quadraticCurveTo(0,-132,30,-110);
  ctx.quadraticCurveTo(15,-95,0,-90); ctx.quadraticCurveTo(-15,-95,-30,-110);
  ctx.fill(); ctx.stroke();

  // Body
  ctx.beginPath();
  ctx.moveTo(-30,-110); ctx.lineTo(-62,-48); ctx.lineTo(-82,122);
  ctx.quadraticCurveTo(-40,148,0,142); ctx.quadraticCurveTo(40,148,82,122);
  ctx.lineTo(62,-48); ctx.lineTo(30,-110);
  ctx.fill(); ctx.stroke();

  // Sleeves
  ctx.beginPath();
  ctx.moveTo(-62,-48); ctx.quadraticCurveTo(-112,-28,-122,42);
  ctx.quadraticCurveTo(-108,56,-96,46); ctx.quadraticCurveTo(-88,-8,-50,-28);
  ctx.fill(); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(62,-48); ctx.quadraticCurveTo(112,-28,122,42);
  ctx.quadraticCurveTo(108,56,96,46); ctx.quadraticCurveTo(88,-8,50,-28);
  ctx.fill(); ctx.stroke();

  // Motifs
  if (p > 0.55) {
    const ma = Math.min(1, (p - 0.55) * 4);
    [{x:-22,y:-18},{x:22,y:-18},{x:0,y:22},{x:-22,y:62},{x:22,y:62}].forEach((m,i) => {
      ctx.globalAlpha = alpha * Math.min(1, ma * 5 - i * 0.8) * 0.6;
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.arc(m.x,m.y,8,0,Math.PI*2); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.beginPath(); ctx.arc(m.x,m.y,3,0,Math.PI*2); ctx.fill();
    });
  }

  // Hem embroidery
  if (p > 0.78) {
    ctx.globalAlpha = alpha * Math.min(1, (p-0.78)*5);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([(p-0.78)*5*200, 1000]);
    ctx.beginPath();
    ctx.moveTo(-82,122); ctx.quadraticCurveTo(-40,138,0,132); ctx.quadraticCurveTo(40,138,82,122);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Shimmer
  if (p > 0.9) {
    const t2 = Date.now() / 1200;
    [[-18,-78],[12,-38],[-38,-28]].forEach(([sx,sy],i) => {
      ctx.globalAlpha = alpha * (0.2 + Math.sin(t2 + i) * 0.15);
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(sx+16,sy+12); ctx.stroke();
    });
  }
  ctx.restore();
}

const DRAW_FNS = [
  drawFibres, drawSpinning, drawWeaving, drawDyeing,
  drawBlockPrinting, drawCutting, drawStitching, drawFinished,
];

// ─── main component ────────────────────────────────────────────────────────────
export default function GarmentAnimation({ step }) {
  const canvasRef  = useRef();
  const stateRef   = useRef({
    // Global time — never resets, drives all continuous animations
    globalT:    0,
    // Per-stage reveal progress [0..1] — advances automatically over time
    progress:   Array(8).fill(0),
    // Which stage is highlighted (matches question step)
    activeStep: step,
    lastTs:     null,
  });
  const labelRef = useRef();
  const rafRef   = useRef();

  // Update active step when user changes question — no animation reset
  useEffect(() => {
    stateRef.current.activeStep = step;
    // Update label
    if (labelRef.current) {
      const s = STAGES[step - 1];
      labelRef.current.innerHTML = `
        <div style="font-size:10px;color:rgba(255,255,255,0.35);letter-spacing:0.16em;text-transform:uppercase;font-weight:600;margin-bottom:5px">
          Stage ${step} of 8
        </div>
        <div style="font-family:var(--font-display);font-size:20px;color:rgba(255,255,255,0.85);font-weight:600;letter-spacing:-0.01em;margin-bottom:3px">
          ${s.label}
        </div>
        <div style="font-size:12px;color:rgba(255,255,255,0.3)">${s.sub}</div>
      `;
    }
  }, [step]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Resize handler
    const resize = () => {
      const p = canvas.parentElement;
      canvas.width  = p.clientWidth  || 400;
      canvas.height = p.clientHeight || 500;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement);

    // ── Main RAF loop — runs forever, never resets ─────────────────────────
    const loop = (ts) => {
      const s = stateRef.current;
      const dt = s.lastTs ? Math.min(ts - s.lastTs, 50) : 16; // cap dt at 50ms
      s.lastTs  = ts;
      s.globalT = ts / 1000;

      // Advance each stage's reveal progress automatically
      // Stages unlock sequentially: stage N only starts filling after N-1 reaches 0.15
      for (let i = 0; i < 8; i++) {
        const prevDone = i === 0 || s.progress[i - 1] > 0.15;
        if (!prevDone) continue;
        if (s.progress[i] < 1) {
          // Speed: ~3.5s per stage to fully reveal
          s.progress[i] = Math.min(1, s.progress[i] + dt / 3500);
        }
      }

      // ── Draw ───────────────────────────────────────────────────────────
      const ctx = canvas.getContext('2d');
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      ctx.fillStyle = '#0D0D0D';
      ctx.fillRect(0, 0, W, H);

      // Faint grid
      ctx.strokeStyle = 'rgba(255,255,255,0.022)';
      ctx.lineWidth = 0.5;
      for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
      for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

      // Centre the fixed 400×360 scene in whatever size canvas we have.
      // Leave ~110px at the bottom for the label overlay.
      const SCENE_W = 400, SCENE_H = 360;
      const usableH = H - 110;
      const offsetX = (W - SCENE_W) / 2;
      const offsetY = Math.max(0, (usableH - SCENE_H) / 2);

      ctx.save();
      ctx.translate(offsetX, offsetY);

      // Draw ALL stages — completed = ghost, active = bright, future = hidden
      for (let i = 0; i < 8; i++) {
        const p  = s.progress[i];
        const isActive = i + 1 === s.activeStep;
        const isPast   = i + 1 < s.activeStep;

        // Alpha: active = full, past = faint ghost, future = invisible
        let alpha;
        if (isActive)    alpha = 1.0;
        else if (isPast) alpha = 0.07 + (p * 0.04);
        else             alpha = Math.max(0, p * 0.06);

        if (alpha < 0.005) continue;
        DRAW_FNS[i](ctx, p, alpha);
      }

      ctx.restore();

      // Radial spotlight — centred in the usable area
      const grad = ctx.createRadialGradient(W/2, offsetY + SCENE_H/2, 0, W/2, offsetY + SCENE_H/2, W * 0.55);
      grad.addColorStop(0,   'rgba(255,255,255,0.025)');
      grad.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, []); // ← empty deps: loop starts once, NEVER restarts

  const stage = STAGES[step - 1];

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <canvas ref={canvasRef} style={{ flex: 1, width: '100%', display: 'block' }} />

      {/* Bottom overlay */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '36px 28px 24px',
        background: 'linear-gradient(transparent, rgba(13,13,13,0.97))',
        pointerEvents: 'none',
      }}>
        {/* Progress strips */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
          {STAGES.map((_, i) => (
            <div key={i} style={{
              height: 2.5, borderRadius: 2, flex: i + 1 === step ? 2.5 : 1,
              background: i + 1 < step
                ? 'rgba(255,255,255,0.45)'
                : i + 1 === step
                  ? 'rgba(255,255,255,0.9)'
                  : 'rgba(255,255,255,0.1)',
              transition: 'flex 0.45s cubic-bezier(0.4,0,0.2,1), background 0.35s ease',
            }} />
          ))}
        </div>

        {/* Label — updated via ref, no React re-render */}
        <div
          ref={labelRef}
          key={step}
          style={{ animation: 'labelSlide 0.3s ease both' }}
          dangerouslySetInnerHTML={{ __html: `
            <div style="font-size:10px;color:rgba(255,255,255,0.35);letter-spacing:0.16em;text-transform:uppercase;font-weight:600;margin-bottom:5px">
              Stage ${step} of 8
            </div>
            <div style="font-family:var(--font-display);font-size:20px;color:rgba(255,255,255,0.85);font-weight:600;letter-spacing:-0.01em;margin-bottom:3px">
              ${stage.label}
            </div>
            <div style="font-size:12px;color:rgba(255,255,255,0.3)">${stage.sub}</div>
          `}}
        />
      </div>

      <style>{`
        @keyframes labelSlide {
          from { opacity: 0; transform: translateY(5px); }
          to   { opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  );
}

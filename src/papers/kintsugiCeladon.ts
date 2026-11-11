import { PaperDesign } from './types';
import { rng, solid } from './util';

type Pt = [number, number];

function grain(ctx: CanvasRenderingContext2D, size: number, base: string, spread: number, seed: number) {
  solid(ctx, size, base);
  const rand = rng(seed);
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = spread / 500;
  for (let i = 0; i < 460; i++) {
    ctx.fillRect(rand() * size, rand() * size, Math.max(1, size * 0.003), Math.max(1, size * 0.002));
  }
  ctx.fillStyle = '#1b1714';
  ctx.globalAlpha = spread / 460;
  for (let i = 0; i < 460; i++) {
    ctx.fillRect(rand() * size, rand() * size, Math.max(1, size * 0.0025), Math.max(1, size * 0.0025));
  }
  ctx.globalAlpha = 1;
}

// Primary fracture sweeping from upper-left through the upper-left cobalt vessel (0.35, 0.37)
// down through the lower-right companion dish (0.66, 0.64) to the lower-right edge.
const MAIN_VEIN: Pt[] = [
  [0.03, 0.14],
  [0.14, 0.22],
  [0.24, 0.28],
  [0.35, 0.37],
  [0.48, 0.45],
  [0.57, 0.54],
  [0.66, 0.64],
  [0.80, 0.73],
  [0.96, 0.84],
];

// Branch rising from the primary vessel nexus (0.35, 0.37) across the upper-right sleeve zone
const BRANCH_UPPER: Pt[] = [
  [0.35, 0.37],
  [0.44, 0.29],
  [0.56, 0.22],
  [0.70, 0.15],
  [0.86, 0.07],
];

// Branch descending from the primary nexus (0.35, 0.37) through the lower-left coat/skirt panel
const BRANCH_LOWER: Pt[] = [
  [0.35, 0.37],
  [0.28, 0.50],
  [0.23, 0.64],
  [0.16, 0.78],
  [0.10, 0.93],
];

// Branch reaching from the lower-right dish nexus (0.66, 0.64) toward the upper-right margin
const BRANCH_EAST: Pt[] = [
  [0.66, 0.64],
  [0.75, 0.54],
  [0.83, 0.46],
  [0.95, 0.36],
];

// Fine gold-lacquer hairline splinters off the main fractures
const SPLINTERS: Pt[][] = [
  [[0.24, 0.28], [0.19, 0.38], [0.11, 0.43]],
  [[0.56, 0.22], [0.64, 0.28], [0.74, 0.29]],
  [[0.48, 0.45], [0.43, 0.56], [0.37, 0.65]],
  [[0.66, 0.64], [0.58, 0.75], [0.49, 0.87]],
];

const CRACKLE_CELLS: Pt[][] = [
  [[0.05, 0.06], [0.24, 0.04], [0.27, 0.18], [0.11, 0.21]],
  [[0.24, 0.04], [0.47, 0.06], [0.44, 0.21], [0.27, 0.18]],
  [[0.47, 0.06], [0.69, 0.05], [0.64, 0.20], [0.44, 0.21]],
  [[0.69, 0.05], [0.93, 0.09], [0.87, 0.26], [0.64, 0.20]],
  [[0.11, 0.21], [0.27, 0.18], [0.35, 0.37], [0.14, 0.39]],
  [[0.64, 0.20], [0.87, 0.26], [0.83, 0.46], [0.57, 0.40]],
  [[0.07, 0.42], [0.28, 0.50], [0.23, 0.64], [0.06, 0.62]],
  [[0.28, 0.50], [0.48, 0.45], [0.43, 0.66], [0.23, 0.64]],
  [[0.57, 0.54], [0.78, 0.52], [0.84, 0.71], [0.66, 0.64]],
  [[0.23, 0.64], [0.43, 0.66], [0.42, 0.88], [0.16, 0.78]],
  [[0.43, 0.66], [0.66, 0.64], [0.68, 0.90], [0.42, 0.88]],
  [[0.66, 0.64], [0.84, 0.71], [0.90, 0.91], [0.68, 0.90]],
];

function traceFracture(ctx: CanvasRenderingContext2D, pts: Pt[], size: number, mirrorX = false) {
  const px = (p: Pt): Pt => [(mirrorX ? 1 - p[0] : p[0]) * size, p[1] * size];
  const mapped = pts.map(px);
  ctx.beginPath();
  ctx.moveTo(mapped[0][0], mapped[0][1]);
  for (let i = 1; i < mapped.length - 1; i++) {
    const [x0, y0] = mapped[i];
    const [x1, y1] = mapped[i + 1];
    ctx.quadraticCurveTo(x0, y0, (x0 + x1) * 0.5, (y0 + y1) * 0.5);
  }
  const last = mapped[mapped.length - 1];
  ctx.lineTo(last[0], last[1]);
}

function drawKintsugiVein(
  ctx: CanvasRenderingContext2D,
  pts: Pt[],
  size: number,
  widthScale: number,
) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Warm urushi lacquer halo
  traceFracture(ctx, pts, size);
  ctx.strokeStyle = 'rgba(150, 54, 38, 0.18)';
  ctx.lineWidth = Math.max(2, size * 0.0155 * widthScale);
  ctx.stroke();

  // Dark urushi lacquer bed
  traceFracture(ctx, pts, size);
  ctx.strokeStyle = '#241614';
  ctx.lineWidth = Math.max(1.5, size * 0.0098 * widthScale);
  ctx.stroke();

  // Burnished gold body
  traceFracture(ctx, pts, size);
  ctx.strokeStyle = '#d6982c';
  ctx.lineWidth = Math.max(1.1, size * 0.006 * widthScale);
  ctx.stroke();

  // Bright gold powder highlight crest
  traceFracture(ctx, pts, size);
  ctx.strokeStyle = '#f5d472';
  ctx.lineWidth = Math.max(0.7, size * 0.0025 * widthScale);
  ctx.stroke();
  ctx.restore();
}

function drawCobaltVessel(
  ctx: CanvasRenderingContext2D,
  size: number,
  cx: number,
  cy: number,
  scale: number,
) {
  const x = cx * size;
  const y = cy * size;
  const s = size * scale;

  // Pooled celadon glaze inside the vessel well
  const pool = ctx.createRadialGradient(x, y, s * 0.02, x, y, s * 0.34);
  pool.addColorStop(0, 'rgba(170, 193, 168, 0.46)');
  pool.addColorStop(0.65, 'rgba(188, 206, 185, 0.24)');
  pool.addColorStop(1, 'rgba(220, 227, 216, 0)');
  ctx.fillStyle = pool;
  ctx.beginPath();
  ctx.arc(x, y, s * 0.34, 0, Math.PI * 2);
  ctx.fill();

  // Outer cobalt rim brushstroke
  ctx.strokeStyle = '#1b3346';
  ctx.lineWidth = Math.max(1.8, s * 0.016);
  ctx.beginPath();
  ctx.arc(x, y, s * 0.31, 0, Math.PI * 2);
  ctx.stroke();

  // Secondary cobalt wash ring
  ctx.strokeStyle = 'rgba(42, 76, 99, 0.58)';
  ctx.lineWidth = Math.max(1.1, s * 0.0072);
  ctx.beginPath();
  ctx.arc(x, y, s * 0.284, 0, Math.PI * 2);
  ctx.stroke();

  // Double foot-ring with radial potter's chatter marks
  const rOuter = s * 0.228;
  const rInner = s * 0.188;
  ctx.strokeStyle = '#223f54';
  ctx.lineWidth = Math.max(1, s * 0.0046);
  ctx.beginPath();
  ctx.arc(x, y, rOuter, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, rInner, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(27, 51, 70, 0.65)';
  ctx.lineWidth = Math.max(0.8, s * 0.0024);
  const ticks = 44;
  for (let i = 0; i < ticks; i++) {
    const a = (i / ticks) * Math.PI * 2;
    const tilt = a + 0.17;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * (rInner + s * 0.004), y + Math.sin(a) * (rInner + s * 0.004));
    ctx.lineTo(x + Math.cos(tilt) * (rOuter - s * 0.004), y + Math.sin(tilt) * (rOuter - s * 0.004));
    ctx.stroke();
  }

  // Inner well ring and central cobalt potter's spiral/medallion
  ctx.strokeStyle = '#1b3346';
  ctx.lineWidth = Math.max(1.1, s * 0.0062);
  ctx.beginPath();
  ctx.arc(x, y, s * 0.102, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = 'rgba(27, 51, 70, 0.88)';
  ctx.beginPath();
  ctx.arc(x, y, s * 0.025, 0, Math.PI * 2);
  ctx.fill();
}

function drawKasugaiStaple(
  ctx: CanvasRenderingContext2D,
  size: number,
  ux: number,
  uy: number,
  angle: number,
) {
  ctx.save();
  ctx.translate(ux * size, uy * size);
  ctx.rotate(angle);
  const halfLen = size * 0.022;
  const foot = size * 0.007;

  // Vermilion-urushi staple bed
  ctx.strokeStyle = '#963626';
  ctx.lineWidth = Math.max(1.5, size * 0.0065);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-halfLen, -foot);
  ctx.lineTo(-halfLen, 0);
  ctx.lineTo(halfLen, 0);
  ctx.lineTo(halfLen, foot);
  ctx.stroke();

  // Gold wire staple core
  ctx.strokeStyle = '#f2cc68';
  ctx.lineWidth = Math.max(0.9, size * 0.0026);
  ctx.beginPath();
  ctx.moveTo(-halfLen, -foot);
  ctx.lineTo(-halfLen, 0);
  ctx.lineTo(halfLen, 0);
  ctx.lineTo(halfLen, foot);
  ctx.stroke();
  ctx.restore();
}

export const kintsugiCeladonPaper: PaperDesign = {
  id: 'kintsugi-celadon',
  name: 'Kintsugi celadon',
  note: 'Crazed celadon stoneware and underglaze cobalt bowls mended with gold lacquer; a persimmon-urushi reverse.',
  placementNote: 'Fixed print on the starting square. Turn the paper to swap the upper-left and lower-right mended cobalt bowls across the fold; the reverse double gold frame and corner frets stay aligned with the sheet edges.',
  reverse: '#963626',
  drawFront(ctx, size) {
    grain(ctx, size, '#dce3d8', 9, 41);

    // Subtle glaze crackle (kan'nyu) across the sheet
    ctx.save();
    ctx.strokeStyle = 'rgba(148, 166, 144, 0.45)';
    ctx.lineWidth = Math.max(0.7, size * 0.0016);
    for (const cell of CRACKLE_CELLS) {
      ctx.beginPath();
      cell.forEach(([u, v], idx) => {
        if (idx === 0) ctx.moveTo(u * size, v * size);
        else ctx.lineTo(u * size, v * size);
      });
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();

    // Primary wheel-thrown cobalt vessel in the upper-left quadrant (cx=0.35, cy=0.37)
    // and companion cobalt dish in the lower-right quadrant (cx2=0.68, cy2=0.66),
    // each displaced slightly across the main kintsugi fracture line.
    const cx1 = 0.35, cy1 = 0.37, scale1 = 0.92;
    const cx2 = 0.68, cy2 = 0.66, scale2 = 0.66;

    // Upper-right shard (above MAIN_VEIN)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(size, 0);
    ctx.lineTo(size, size * 0.84);
    for (let i = MAIN_VEIN.length - 1; i >= 0; i--) {
      ctx.lineTo(MAIN_VEIN[i][0] * size, MAIN_VEIN[i][1] * size);
    }
    ctx.closePath();
    ctx.clip();
    drawCobaltVessel(ctx, size, cx1 + 0.012, cy1 - 0.010, scale1);
    drawCobaltVessel(ctx, size, cx2 + 0.010, cy2 - 0.009, scale2);
    ctx.restore();

    // Lower-left shard (below MAIN_VEIN)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, size);
    ctx.lineTo(size, size);
    for (let i = MAIN_VEIN.length - 1; i >= 0; i--) {
      ctx.lineTo(MAIN_VEIN[i][0] * size, MAIN_VEIN[i][1] * size);
    }
    ctx.closePath();
    ctx.clip();
    drawCobaltVessel(ctx, size, cx1 - 0.010, cy1 + 0.012, scale1);
    drawCobaltVessel(ctx, size, cx2 - 0.009, cy2 + 0.010, scale2);
    ctx.restore();

    // Fine gold-lacquer splinters
    for (const splinter of SPLINTERS) {
      drawKintsugiVein(ctx, splinter, size, 0.42);
    }

    // Secondary and primary kintsugi gold-lacquer mend veins
    drawKintsugiVein(ctx, BRANCH_UPPER, size, 0.76);
    drawKintsugiVein(ctx, BRANCH_LOWER, size, 0.72);
    drawKintsugiVein(ctx, BRANCH_EAST, size, 0.68);
    drawKintsugiVein(ctx, MAIN_VEIN, size, 1.0);

    // Vermilion-and-gold repair staples (kasugai) bridging the mended rims
    drawKasugaiStaple(ctx, size, 0.14, 0.22, -0.82);
    drawKasugaiStaple(ctx, size, 0.56, 0.22, 0.95);
    drawKasugaiStaple(ctx, size, 0.80, 0.73, -0.78);

    // Gold lacquer nexus pools at the fracture junctions
    for (const [ux, uy, r] of [
      [0.35, 0.37, 0.009],
      [0.66, 0.64, 0.008],
      [0.48, 0.45, 0.0055],
    ] as const) {
      ctx.fillStyle = '#241614';
      ctx.beginPath();
      ctx.arc(ux * size, uy * size, size * (r + 0.0025), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e8b64c';
      ctx.beginPath();
      ctx.arc(ux * size, uy * size, size * r, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  drawBack(ctx, size) {
    grain(ctx, size, '#963626', 8, 43);

    // Double gold-lacquer box border (m1 = 4.5%, m2 = 9.5%) tuned so:
    // - m1 sits cleanly inside the 7.5% kimono collar & 5.5% obi/zori bands,
    // - m1 and m2 frame the Coat-dress short sleeves with a double gold chevron cuff without clipping.
    const m1 = size * 0.045;
    const m2 = size * 0.095;
    ctx.strokeStyle = 'rgba(242, 202, 108, 0.78)';
    ctx.lineWidth = Math.max(1.2, size * 0.003);
    ctx.strokeRect(m1, m1, size - 2 * m1, size - 2 * m1);

    ctx.strokeStyle = 'rgba(232, 184, 92, 0.52)';
    ctx.lineWidth = Math.max(0.9, size * 0.0018);
    ctx.strokeRect(m2, m2, size - 2 * m2, size - 2 * m2);

    // Corner miter fret links between outer and inner gold frames
    ctx.strokeStyle = 'rgba(242, 202, 108, 0.68)';
    ctx.lineWidth = Math.max(1, size * 0.0022);
    for (const [cx, cy, sx, sy] of [
      [m1, m1, 1, 1],
      [size - m1, m1, -1, 1],
      [m1, size - m1, 1, -1],
      [size - m1, size - m1, -1, -1],
    ] as const) {
      const step = m2 - m1;
      ctx.beginPath();
      ctx.moveTo(cx + sx * step, cy);
      ctx.lineTo(cx + sx * step, cy + sy * step);
      ctx.lineTo(cx, cy + sy * step);
      ctx.stroke();
    }

    // Mirrored seeped gold-lacquer traces of the primary and upper kintsugi veins on the reverse
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    traceFracture(ctx, MAIN_VEIN, size, true);
    ctx.strokeStyle = 'rgba(36, 22, 20, 0.35)';
    ctx.lineWidth = Math.max(1.6, size * 0.0055);
    ctx.stroke();

    ctx.setLineDash([Math.max(4, size * 0.012), Math.max(2, size * 0.006)]);
    traceFracture(ctx, MAIN_VEIN, size, true);
    ctx.strokeStyle = 'rgba(244, 204, 108, 0.62)';
    ctx.lineWidth = Math.max(1.1, size * 0.003);
    ctx.stroke();

    traceFracture(ctx, BRANCH_UPPER, size, true);
    ctx.strokeStyle = 'rgba(244, 204, 108, 0.45)';
    ctx.lineWidth = Math.max(0.9, size * 0.0022);
    ctx.stroke();
    ctx.restore();
  },
};

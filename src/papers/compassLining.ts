import { PaperDesign } from './types';
import { rng, solid } from './util';

// Experiment (PR #14): Starlit lining's reverse-first layout made turn-proof.
// Starlit places each feature where the folds turn the reverse outward at 0°,
// so the other turns mostly hide it. Here the reverse is drawn with four-fold
// rotational symmetry about the sheet centre: one quarter of the design (edge
// trim, half a star column, a moon and a quarter of the star field) is drawn
// four times, rotated by 90°. The trims are mitred at the corners. A paper turn rotates both canvases about the same
// centre (src/render/sheetOrientation.ts), so every turn lands the same drawing
// in the same places. The stars are four-point sparkles, which are themselves
// symmetric, so no star ever appears tipped over.

const DOVE = '#dfe1e3';
const DOVE_FLECK = '#c9cdd2';
const NIGHT = '#1b2442';
const GOLD = '#e0b85a';
const PALE = '#c9d3e6';
const CREAM = '#efe6cf';

/** One quarter of the reverse (fractions of the sheet); the others are its rotations. */
export const COMPASS = {
  trim: { top: 0.018, bottom: 0.082 },
  column: { col: 0.5, halfWidth: 0.03, top: 0.14, bottom: 0.42 },
  moon: { col: 0.63, row: 0.6, radius: 0.045 },
};

function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, colour: string) {
  ctx.fillStyle = colour;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const rr = i % 2 === 0 ? r : r * 0.32;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

function quarter(ctx: CanvasRenderingContext2D, S: number) {
  const r = rng(97);
  // a quarter of the sparse field, kept clear of the features
  for (let i = 0; i < 36; i++) {
    const x = r(), y = 0.1 + r() * 0.9;
    if (Math.abs(x - 0.5) < 0.06 || Math.abs(y - 0.5) < 0.06) continue;
    if (Math.hypot(x - COMPASS.moon.col, y - COMPASS.moon.row) < COMPASS.moon.radius * 1.8) continue;
    if (x < 0.1 || x > 0.9 || y > 0.9) continue;
    sparkle(ctx, x * S, y * S, S * (0.005 + r() * 0.005), PALE);
  }
  // edge trim: two cream rules and gold sparkles between them, clipped to this
  // quarter's triangle so the four trims meet in mitred corners instead of crossing
  ctx.save();
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(S, 0); ctx.lineTo(S / 2, S / 2); ctx.closePath(); ctx.clip();
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, S * COMPASS.trim.top, S, S * 0.006);
  ctx.fillRect(0, S * COMPASS.trim.bottom - S * 0.006, S, S * 0.006);
  const mid = (COMPASS.trim.top + COMPASS.trim.bottom) / 2;
  for (let i = 1; i < 22; i++) sparkle(ctx, S * (0.022 + i * 0.0435), S * mid, S * 0.016, GOLD);
  ctx.restore();
  // half of the centre cross: spaced sparkles from the centre to the trim
  const { col, top, bottom } = COMPASS.column;
  for (let y = top; y <= bottom + 1e-9; y += 0.07) sparkle(ctx, S * col, S * y, S * 0.019, GOLD);
  // a crescent
  const m = COMPASS.moon;
  ctx.fillStyle = GOLD;
  ctx.beginPath(); ctx.arc(S * m.col, S * m.row, S * m.radius, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = NIGHT;
  ctx.beginPath(); ctx.arc(S * (m.col + m.radius * 0.45), S * (m.row - m.radius * 0.2), S * m.radius * 0.85, 0, Math.PI * 2); ctx.fill();
}

export const compassLining: PaperDesign = {
  id: 'compass-lining',
  name: 'Compass lining',
  note: 'Starlit’s night sky, drawn to land the same way at every turn',
  reverse: NIGHT,
  hidden: true,
  drawFront(ctx, S) {
    solid(ctx, S, DOVE);
    const r = rng(41);
    ctx.fillStyle = DOVE_FLECK;
    for (let i = 0; i < 900; i++) ctx.fillRect(r() * S, r() * S, S * 0.003, S * 0.003);
  },
  drawBack(ctx, S) {
    solid(ctx, S, NIGHT);
    for (let k = 0; k < 4; k++) {
      ctx.save();
      ctx.translate(S / 2, S / 2); ctx.rotate((k * Math.PI) / 2); ctx.translate(-S / 2, -S / 2);
      quarter(ctx, S);
      ctx.restore();
    }
    // the centre, where the four column halves meet
    sparkle(ctx, S / 2, S / 2, S * 0.03, GOLD);
  },
};

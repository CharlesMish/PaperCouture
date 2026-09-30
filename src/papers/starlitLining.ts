import { PaperDesign } from './types';
import { rng, solid } from './util';

// A reverse-first paper. The front is a quiet dove grey; the drawing is on the
// reverse, and each part of it is placed where the current folds turn the
// reverse outward (measured with scripts/paperLanding.ts at turn 0):
// - a starred trim in the top tenth, which becomes the dress and jacket collar
//   and sleeve tops, the pleated skirt's waistband and the vest lapel tips;
// - a column of stars down the vertical centre, which shows in the Lapel vest's
//   front opening and runs down the back of the dress and pleated skirt;
// - a crescent moon in the lower middle, where the Wrap skirt's broad panel
//   turns its reverse to the front and the dress back is widest.
// Everything else is a sparse star field, so a quarter turn still reads as
// night sky. Canvas coordinates are drawn as seen from behind (types.ts).

const DOVE = '#dfe1e3';
const DOVE_FLECK = '#c9cdd2';
const NIGHT = '#1b2442';
const GOLD = '#e0b85a';
const PALE = '#c9d3e6';
const CREAM = '#efe6cf';

/** Canvas regions of the reverse drawing (fractions of the sheet). */
export const STARLIT = {
  trim: { top: 0.018, bottom: 0.082 },
  column: { col: 0.5, halfWidth: 0.03, top: 0.14, bottom: 0.96 },
  moon: { col: 0.63, row: 0.6, radius: 0.05 },
};

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, colour: string) {
  ctx.fillStyle = colour;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

export const starlitLining: PaperDesign = {
  id: 'starlit-lining',
  name: 'Starlit lining',
  note: 'A quiet dove front; the night sky is on the reverse',
  reverse: NIGHT,
  drawFront(ctx, S) {
    solid(ctx, S, DOVE);
    // a faint, even fleck: texture without a motif for the folds to cut
    const r = rng(41);
    ctx.fillStyle = DOVE_FLECK;
    for (let i = 0; i < 900; i++) {
      const x = r() * S, y = r() * S;
      ctx.fillRect(x, y, S * 0.004 * (0.5 + r()), S * 0.0015);
    }
  },
  drawBack(ctx, S) {
    solid(ctx, S, NIGHT);
    // sparse field first, kept clear of the designed features
    const r = rng(73);
    for (let i = 0; i < 140; i++) {
      const x = r(), y = 0.1 + r() * 0.9;
      if (Math.abs(x - STARLIT.column.col) < STARLIT.column.halfWidth * 2) continue;
      if (Math.hypot(x - STARLIT.moon.col, y - STARLIT.moon.row) < STARLIT.moon.radius * 1.8) continue;
      star(ctx, x * S, y * S, S * (0.004 + r() * 0.005), PALE);
    }
    // collar trim: two cream rules and a row of gold stars between them
    ctx.fillStyle = CREAM;
    ctx.fillRect(0, S * STARLIT.trim.top, S, S * 0.006);
    ctx.fillRect(0, S * STARLIT.trim.bottom - S * 0.006, S, S * 0.006);
    const mid = (STARLIT.trim.top + STARLIT.trim.bottom) / 2;
    for (let i = 0; i < 23; i++) star(ctx, S * (0.022 + i * 0.0435), S * mid, S * 0.013, GOLD);
    // centre column: a spaced chain of gold stars (no connecting line, so it
    // never reads as a painted seam)
    const { col, top, bottom } = STARLIT.column;
    for (let y = top; y <= bottom + 1e-9; y += 0.082) star(ctx, S * col, S * y, S * 0.017, GOLD);
    // crescent moon: a gold disc with a night disc taken out of one side
    const m = STARLIT.moon;
    ctx.fillStyle = GOLD;
    ctx.beginPath(); ctx.arc(S * m.col, S * m.row, S * m.radius, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = NIGHT;
    ctx.beginPath(); ctx.arc(S * (m.col + m.radius * 0.45), S * (m.row - m.radius * 0.2), S * m.radius * 0.85, 0, Math.PI * 2); ctx.fill();
  },
};

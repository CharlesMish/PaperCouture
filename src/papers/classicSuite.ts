import type { PaperDesign } from './types';
import { rng, solid } from './util';

// Four classic repeats, each with a reverse chosen for what the folds show of it:
// the kimono's collar, the zori's thong, the obi's cord and every lining are the
// reverse. Two are traditional Japanese patterns (wagara) as chiyogami carries
// them; two are tailoring classics. All are regular repeats, so a fold shows up
// as the place where the repeat changes direction, and none depends on where the
// print sits on the sheet.

/** A washi-like back: the reverse colour with faint short fibres. Printed texture only. */
function washi(ctx: CanvasRenderingContext2D, S: number, ground: string, fibre: string, seed: number) {
  solid(ctx, S, ground);
  const next = rng(seed);
  ctx.strokeStyle = fibre;
  ctx.lineCap = 'round';
  for (let i = 0; i < 900; i++) {
    const x = next() * S, y = next() * S, a = next() * Math.PI, L = (0.006 + next() * 0.018) * S;
    ctx.lineWidth = S * (0.0005 + next() * 0.0007);
    ctx.globalAlpha = 0.35 + next() * 0.4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + (L / 2) * Math.cos(a) + (next() - 0.5) * L * 0.3, y + (L / 2) * Math.sin(a), x + L * Math.cos(a), y + L * Math.sin(a));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// --- Seigaiha: overlapping fans of concentric arcs, "waves of the blue sea".
const SEA = '#1f4b5c', FOAM = '#e9e2d0', GILT = '#c9a24a', PERSIMMON = '#cf633d';
export const seigaiha: PaperDesign = {
  id: 'seigaiha', name: 'Seigaiha waves',
  note: 'Overlapping wave scales in cream and gilt on deep teal, with a persimmon reverse',
  reverse: PERSIMMON,
  drawFront(ctx, S) {
    solid(ctx, S, SEA);
    const R = S / 10; // scale radius; rows step R/2 and every other row shifts by R
    const rows = Math.ceil(S / (R / 2)) + 3;
    const rings = [1, 0.8, 0.6, 0.4, 0.2];
    // top row first: each row's scales cover the lower halves of the row above
    for (let j = -1; j < rows; j++) {
      const y = j * (R / 2), shift = (j & 1) * R;
      for (let x = -2 * R + shift; x < S + 2 * R; x += 2 * R) {
        ctx.fillStyle = SEA;
        ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();
        rings.forEach((k, i) => {
          ctx.strokeStyle = i === 0 ? GILT : FOAM;
          ctx.lineWidth = S * (i === 0 ? 0.0032 : 0.0042);
          ctx.beginPath(); ctx.arc(x, y, R * k - S * 0.003, Math.PI, 2 * Math.PI); ctx.stroke();
        });
      }
    }
  },
  drawBack(ctx, S) { washi(ctx, S, PERSIMMON, '#e08a62', 4101); },
};

// --- Asanoha: the hemp-leaf star, a triangular lattice with each triangle's
// corners joined to its centre.
const MADDER = '#a3323a', IVORY = '#efe5d0';
export const asanoha: PaperDesign = {
  id: 'asanoha', name: 'Asanoha',
  note: 'The hemp-leaf star lattice in ivory on madder red, with an ivory reverse',
  reverse: IVORY,
  drawFront(ctx, S) {
    solid(ctx, S, MADDER);
    const a = S / 9, h = (a * Math.sqrt(3)) / 2;
    ctx.strokeStyle = IVORY;
    ctx.lineWidth = S * 0.0026;
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 0.92;
    ctx.beginPath();
    const tri = (p: number[][]) => {
      const c = [(p[0][0] + p[1][0] + p[2][0]) / 3, (p[0][1] + p[1][1] + p[2][1]) / 3];
      ctx.moveTo(p[0][0], p[0][1]); ctx.lineTo(p[1][0], p[1][1]); ctx.lineTo(p[2][0], p[2][1]); ctx.closePath();
      for (const q of p) { ctx.moveTo(q[0], q[1]); ctx.lineTo(c[0], c[1]); }
    };
    for (let j = -1; j * h < S + h; j++) {
      const off = (j & 1) * (a / 2);
      for (let i = -2; i * a < S + 2 * a; i++) {
        const x = i * a + off, y = j * h;
        tri([[x, y], [x + a, y], [x + a / 2, y + h]]); // pointing down
        tri([[x + a / 2, y + h], [x + a, y], [x + (3 * a) / 2, y + h]]); // pointing up
      }
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  },
  drawBack(ctx, S) { washi(ctx, S, IVORY, '#d9ccb0', 4202); },
};

// --- Polka dot: cherry dots in a half-drop on cream.
const CREAM = '#f2e8d4', CHERRY = '#b7303b', NAVY = '#24324f';
export const polkaDot: PaperDesign = {
  id: 'polka-dot', name: 'Polka dot',
  note: 'Cherry dots on cream in a half-drop, with a navy reverse',
  reverse: NAVY,
  drawFront(ctx, S) {
    solid(ctx, S, CREAM);
    const step = S / 11, r = step * 0.2;
    ctx.fillStyle = CHERRY;
    for (let j = -1; j * (step / 2) < S + step; j++) {
      const off = (j & 1) * (step / 2);
      for (let x = -step + off; x < S + step; x += step) {
        ctx.beginPath(); ctx.arc(x, j * (step / 2), r, 0, Math.PI * 2); ctx.fill();
      }
    }
  },
  drawBack(ctx, S) { washi(ctx, S, NAVY, '#34466a', 4303); },
};

// --- Houndstooth: woven, not drawn. A 2/2 twill with four dark and four light
// threads each way: the cell is the warp's colour where the warp is on top, the
// weft's where it is under. That is what makes the teeth.
const CHARCOAL = '#2a2a2e', CHALK = '#ebe5d8', CAMEL = '#b88b58';
export const houndstooth: PaperDesign = {
  id: 'houndstooth', name: 'Houndstooth',
  note: 'Charcoal and chalk houndstooth, with a camel reverse',
  reverse: CAMEL,
  drawFront(ctx, S) {
    solid(ctx, S, CHALK);
    const threads = 112, q = S / threads; // 14 repeats of 8 threads
    ctx.fillStyle = CHARCOAL;
    const dark = (k: number) => ((k % 8) + 8) % 8 < 4;
    for (let i = 0; i < threads; i++) for (let j = 0; j < threads; j++) {
      const warpUp = (i + j) % 4 < 2;
      if (warpUp ? dark(i) : dark(j)) ctx.fillRect(i * q, j * q, q + 0.6, q + 0.6);
    }
  },
  drawBack(ctx, S) { washi(ctx, S, CAMEL, '#c9a072', 4404); },
};

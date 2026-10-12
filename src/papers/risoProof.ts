import type { PaperDesign } from './types';
import { rng } from './util';

// Riso proof: a two-drum stencil print, pulled as a proof. The face is a pink
// halftone falling from the top and a teal halftone rising from the bottom,
// overprinting to violet in the middle; the teal drum is slightly out of
// register, as stencil proofs usually are.
//
// The reverse is a teal flood inside an unprinted margin that carries the
// printer's colour patches and registration targets. The margin is 0.068 of
// the square's half-width: the edge turns of the Swing coat (0.07) and the
// Camp-collar shirt (0.08) are just wider, so those facings and cuffs show
// the whole patch strip with a thin teal line at the fold. Other edges that
// fold onto the front (collars, waistbands, the brooch frame) show the strip
// at their raw edge. The margin runs round all four sides, so this holds at
// every quarter-turn. The face keeps a matching plain margin with crop marks,
// which becomes a pale hem band where a raw edge stays on the front.

const PAPER = '#f2ece0', PINK = '#f0559b', TEAL = '#0f7f86', MARK = '#6a6f72';
export const PROOF_MARGIN = 0.068; // sheet units, from each edge (sheet is 2 wide)
const SCREEN = 1 / 58; // halftone cell, fraction of the canvas

const clamp = (v: number) => Math.max(0, Math.min(1, v));
const pinkAt = (y: number) => clamp(0.08 + 0.86 * ((y + 0.42) / 1.42) ** 1.2);
const tealAt = (y: number) => clamp(0.08 + 0.86 * ((0.42 - y) / 1.42) ** 1.2);

function halftone(ctx: CanvasRenderingContext2D, S: number, colour: string, angle: number, density: (y: number) => number, shift: [number, number]) {
  const cell = SCREEN * S, c = Math.cos(angle), s = Math.sin(angle);
  const n = Math.ceil(0.75 / SCREEN) + 1;
  ctx.fillStyle = colour;
  for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) {
    const x = S / 2 + (i * c - j * s) * cell + shift[0] * S;
    const y = S / 2 + (i * s + j * c) * cell + shift[1] * S;
    if (x < -cell || y < -cell || x > S + cell || y > S + cell) continue;
    // material y of the dot centre (front canvas)
    const d = density(1 - (y / S) * 2);
    if (d < 0.02) continue;
    ctx.beginPath();
    ctx.arc(x, y, cell * Math.sqrt(d / Math.PI) * 1.02, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Clip to the printable area inside the margin. */
function inside(ctx: CanvasRenderingContext2D, S: number) {
  const m = (PROOF_MARGIN / 2) * S;
  ctx.beginPath();
  ctx.rect(m, m, S - 2 * m, S - 2 * m);
  ctx.clip();
}

function cropMarks(ctx: CanvasRenderingContext2D, S: number) {
  const m = (PROOF_MARGIN / 2) * S, t = m * 0.7;
  ctx.strokeStyle = MARK;
  ctx.lineWidth = Math.max(1, S * 0.0011);
  for (const [x, y, sx, sy] of [[m, m, -1, -1], [S - m, m, 1, -1], [m, S - m, -1, 1], [S - m, S - m, 1, 1]]) {
    ctx.beginPath();
    ctx.moveTo(x + sx * (m - t), y); ctx.lineTo(x + sx * m * 0.95, y);
    ctx.moveTo(x, y + sy * (m - t)); ctx.lineTo(x, y + sy * m * 0.95);
    ctx.stroke();
  }
}

function target(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  for (const [colour, dx] of [[TEAL, r * 0.06], [PINK, 0]] as const) {
    ctx.strokeStyle = colour;
    ctx.lineWidth = Math.max(1, r * 0.12);
    ctx.beginPath();
    ctx.arc(x + dx, y, r * 0.62, 0, Math.PI * 2);
    ctx.moveTo(x + dx - r, y); ctx.lineTo(x + dx + r, y);
    ctx.moveTo(x + dx, y - r); ctx.lineTo(x + dx, y + r);
    ctx.stroke();
  }
}

/** One edge's patch strip, drawn along the top edge; rotated for the others. */
function patchStrip(ctx: CanvasRenderingContext2D, S: number) {
  const m = (PROOF_MARGIN / 2) * S, size = m * 0.56, gap = size * 0.5;
  const patches: [string, number][] = [[PINK, 1], [PINK, 0.5], [PINK, 0.25], [TEAL, 1], [TEAL, 0.5], [TEAL, 0.25], ['both', 1]];
  const y = (m - size) / 2;
  let x = m * 2.2, k = 0;
  while (x + size < S - m * 2.2) {
    const [colour, tint] = patches[k++ % patches.length];
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, size, size); ctx.clip();
    ctx.globalCompositeOperation = 'multiply';
    for (const ink of colour === 'both' ? [PINK, TEAL] : [colour]) {
      ctx.fillStyle = ink;
      if (tint === 1) ctx.fillRect(x, y, size, size);
      else {
        const step = size / 4, r = step * Math.sqrt(tint / Math.PI);
        for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) { ctx.beginPath(); ctx.arc(x + i * step, y + j * step, r, 0, Math.PI * 2); ctx.fill(); }
      }
    }
    ctx.restore();
    x += size + gap;
    if (k % patches.length === 0) x += gap * 2;
  }
}

function margin(ctx: CanvasRenderingContext2D, S: number, patches: boolean) {
  const m = (PROOF_MARGIN / 2) * S;
  if (patches) for (let q = 0; q < 4; q++) {
    ctx.save();
    ctx.translate(S / 2, S / 2); ctx.rotate(q * Math.PI / 2); ctx.translate(-S / 2, -S / 2);
    patchStrip(ctx, S);
    target(ctx, m * 1.1, m / 2, m * 0.32);
    ctx.restore();
  }
  cropMarks(ctx, S);
}

export const risoProof: PaperDesign = {
  id: 'riso-proof',
  name: 'Riso proof',
  note: 'Pink and teal halftones overprinting to violet; the reverse margin carries the proof marks',
  reverse: TEAL,
  placementNote: 'The proof margin follows the paper’s edges at every turn: edge-turned facings and cuffs show the colour patches. Turning the paper changes the direction of the pink-to-teal fade.',
  drawFront(ctx, S) {
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, S, S);
    ctx.save();
    inside(ctx, S);
    ctx.globalCompositeOperation = 'multiply';
    halftone(ctx, S, PINK, 15 * Math.PI / 180, pinkAt, [0, 0]);
    halftone(ctx, S, TEAL, 75 * Math.PI / 180, tealAt, [0.0021, 0.0014]);
    ctx.restore();
    margin(ctx, S, false);
  },
  drawBack(ctx, S) {
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, S, S);
    ctx.save();
    inside(ctx, S);
    ctx.fillStyle = TEAL;
    ctx.fillRect(0, 0, S, S);
    // stencil solids are never perfectly flat: a few pale specks of paper
    const random = rng(4417);
    ctx.fillStyle = 'rgba(242,236,224,0.35)';
    for (let i = 0; i < 1400; i++) ctx.fillRect(random() * S, random() * S, S * 0.0012, S * 0.0012);
    ctx.restore();
    margin(ctx, S, true);
  },
};

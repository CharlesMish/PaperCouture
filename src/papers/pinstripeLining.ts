import { PaperDesign } from './types';
import { rng, solid } from './util';

// Suiting on the front, lining on the reverse. The front is charcoal with
// fine vertical pinstripes, so the body of a garment reads as tailored cloth.
// The reverse is a paisley-style lining: it only shows where the paper is
// really turned over, which is exactly the collar, lapels, sleeves, cuffs and
// bands. Nothing is painted to look like a fold; both faces are plain prints.

const CHARCOAL = '#2c2f35';
const CHALK = '#cfc8b8';
const SHADE = '#363a41';
const LINING = '#6b2233';
const GOLD = '#d3a651';
const ROSE = '#c0607a';
const CREAM = '#f1e2c4';

/** One boteh (teardrop with a curled tip), base at the origin before transform. */
function boteh(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, rot: number, fill: string, inner: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(0, s * 0.9);
  ctx.bezierCurveTo(s * 0.78, s * 0.9, s * 0.82, -s * 0.2, s * 0.12, -s * 0.62);
  ctx.quadraticCurveTo(-s * 0.02, -s * 0.95, s * 0.36, -s * 1.12);
  ctx.quadraticCurveTo(-s * 0.42, -s * 1.0, -s * 0.56, -s * 0.1);
  ctx.bezierCurveTo(-s * 0.72, s * 0.55, -s * 0.42, s * 0.9, 0, s * 0.9);
  ctx.closePath();
  ctx.fill();
  // an inner teardrop and seed, so each motif reads as a paisley, not a blob
  ctx.fillStyle = inner;
  ctx.beginPath();
  ctx.ellipse(-s * 0.02, s * 0.28, s * 0.3, s * 0.42, -0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(-s * 0.02, s * 0.34, s * 0.13, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export const pinstripeLining: PaperDesign = {
  id: 'pinstripe-lining',
  name: 'Pinstripe and lining',
  note: 'Charcoal pinstripe over a paisley lining',
  reverse: LINING,
  drawFront(ctx, S) {
    solid(ctx, S, CHARCOAL);
    // a faint woven shade every other stripe, then the chalk pinstripes
    const step = S / 22;
    ctx.fillStyle = SHADE;
    for (let i = 0; i < 22; i += 2) ctx.fillRect(i * step, 0, step, S);
    ctx.fillStyle = CHALK;
    const w = Math.max(1.5, S * 0.0032);
    for (let i = 0; i <= 22; i++) ctx.fillRect(i * step + step / 2 - w / 2, 0, w, S);
  },
  drawBack(ctx, S) {
    solid(ctx, S, LINING);
    // Half-drop grid of paisleys, dense enough that a narrow lapel or cuff
    // still catches part of one. Deterministic, so every load matches.
    const r = rng(47);
    const cols = 7;
    const rows = 8;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = ((col + (row % 2 ? 0.5 : 0) + 0.25) / cols) * S;
        const y = ((row + 0.5) / rows) * S;
        const rot = (row % 2 ? 0.6 : -0.4) + (r() - 0.5) * 0.5;
        const gold = (row + col) % 3 !== 0;
        boteh(ctx, x, y, S * 0.042, rot, gold ? GOLD : ROSE, gold ? ROSE : CREAM);
      }
    }
    // small cream dots between the motifs
    ctx.fillStyle = CREAM;
    for (let i = 0; i < 90; i++) {
      ctx.beginPath();
      ctx.arc(r() * S, r() * S, S * 0.0045, 0, Math.PI * 2);
      ctx.fill();
    }
  },
};

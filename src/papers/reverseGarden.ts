import { PaperDesign } from './types';
import { solid } from './util';

// The front is one quiet colour. The garden is drawn on the reverse, in the
// material that stays visible after folding:
//  - collar: centre of the top band (back-canvas x 0.28–0.72, y 0–0.10)
//  - sleeves: the outer top corners of that same band
//  - back field: the middle of the sheet, which is the uncovered centre
//    of the centre panel's reverse
// drawBack is the sheet seen from behind (canvas top-left is material (1, 1)).

const FRONT = '#d7e0da';
const GREEN = '#1c4034';
const LEAF = '#c5ddb0';
const LEAF_DEEP = '#8fb56e';
const BLOSSOM = '#f3d2c4';
const CORAL = '#e07a68';
const CREAM = '#f6efd8';

function leaf(
  ctx: CanvasRenderingContext2D,
  S: number,
  x: number,
  y: number,
  w: number,
  h: number,
  rot: number,
  colour: string,
) {
  ctx.save();
  ctx.translate(S * x, S * y);
  ctx.rotate(rot);
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.ellipse(0, 0, S * w, S * h, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function blossom(ctx: CanvasRenderingContext2D, S: number, x: number, y: number, r: number, petals: number) {
  const cx = S * x;
  const cy = S * y;
  const rad = S * r;
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * Math.PI * 2 - Math.PI / 2;
    ctx.fillStyle = i % 2 === 0 ? BLOSSOM : CORAL;
    ctx.beginPath();
    ctx.ellipse(cx + Math.cos(a) * rad * 0.45, cy + Math.sin(a) * rad * 0.45, rad * 0.48, rad * 0.32, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = CREAM;
  ctx.beginPath();
  ctx.arc(cx, cy, rad * 0.28, 0, Math.PI * 2);
  ctx.fill();
}

export const reverseGarden: PaperDesign = {
  id: 'reverse-garden',
  name: 'Reverse garden',
  note: 'A quiet front; the garden is on the reverse',
  reverse: GREEN,
  drawFront(ctx, S) {
    solid(ctx, S, FRONT);
  },
  drawBack(ctx, S) {
    solid(ctx, S, GREEN);
    // Collar: pale shapes filling the top band, not green-on-green.
    leaf(ctx, S, 0.34, 0.05, 0.07, 0.038, 0.2, CREAM);
    leaf(ctx, S, 0.5, 0.05, 0.075, 0.04, -0.15, BLOSSOM);
    leaf(ctx, S, 0.66, 0.05, 0.07, 0.038, 0.12, CREAM);
    // Sleeve corners, kept inside the top band.
    blossom(ctx, S, 0.07, 0.05, 0.048, 5);
    blossom(ctx, S, 0.93, 0.05, 0.048, 5);
    // Back field: a few large blossoms in the centre panel's reverse.
    ctx.strokeStyle = LEAF;
    ctx.lineWidth = Math.max(3, S * 0.016);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(S * 0.5, S * 0.9);
    ctx.quadraticCurveTo(S * 0.4, S * 0.64, S * 0.5, S * 0.4);
    ctx.stroke();
    leaf(ctx, S, 0.38, 0.72, 0.07, 0.032, -0.7, LEAF);
    leaf(ctx, S, 0.6, 0.56, 0.065, 0.03, 0.65, LEAF_DEEP);
    leaf(ctx, S, 0.42, 0.48, 0.055, 0.026, 0.35, LEAF);
    blossom(ctx, S, 0.5, 0.42, 0.1, 6);
    blossom(ctx, S, 0.46, 0.68, 0.11, 5);
    blossom(ctx, S, 0.56, 0.86, 0.085, 5);
  },
};

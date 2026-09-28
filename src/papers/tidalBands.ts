import { PaperDesign } from './types';
import { solid } from './util';

// Wide, gently curving bands across the whole sheet. The side creases cut
// them on a slant, so the dress front keeps broad cropped colour rather than
// a field of fine stripes.

const CREAM = '#f6f1e6';
const PALE = '#e4f4f1';
const TEAL = '#1a6b72';
const MID = '#3e9188';
const DEEP = '#0e454c';
const REVERSE = '#08343a';

function edge(S: number, base: number, amp: number, phase: number) {
  return (x: number) => S * (base + amp * Math.sin((x / S) * Math.PI * 1.45 + phase));
}

function band(
  ctx: CanvasRenderingContext2D,
  S: number,
  top: (x: number) => number,
  bottom: (x: number) => number,
  colour: string,
) {
  const n = 72;
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const x = (i / n) * S;
    const y = top(x);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  for (let i = n; i >= 0; i--) {
    const x = (i / n) * S;
    ctx.lineTo(x, bottom(x));
  }
  ctx.closePath();
  ctx.fillStyle = colour;
  ctx.fill();
}

export const tidalBands: PaperDesign = {
  id: 'tidal-bands',
  name: 'Tidal bands',
  note: 'Wide curving bands of teal, pale blue and cream',
  reverse: REVERSE,
  drawFront(ctx, S) {
    // The top band is the collar fold, so the pale, teal and cream bands
    // start below it and stay wide enough to read after the sides are cut.
    solid(ctx, S, DEEP);
    const edges = [
      edge(S, -0.02, 0, 0),
      edge(S, 0.16, 0.028, 0.4),
      edge(S, 0.38, 0.042, 2.2),
      edge(S, 0.58, 0.038, 0.55),
      edge(S, 0.78, 0.032, 2.45),
      edge(S, 1.06, 0, 0),
    ];
    const colours = [DEEP, PALE, TEAL, CREAM, MID];
    for (let i = 0; i < colours.length; i++) band(ctx, S, edges[i], edges[i + 1], colours[i]);
  },
  drawBack(ctx, S) {
    solid(ctx, S, REVERSE);
  },
};

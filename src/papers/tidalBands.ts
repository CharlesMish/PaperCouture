import { PaperDesign } from './types';
import { solid } from './util';

// Wide, gently curving bands across the whole sheet. The side creases cut
// them on a slant, so the dress front keeps broad cropped colour rather than
// a field of fine stripes.

const CREAM = '#f4efe4';
const PALE = '#d5ebe7';
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
    solid(ctx, S, DEEP);
    const edges = [
      edge(S, -0.02, 0, 0),
      edge(S, 0.18, 0.04, 0.5),
      edge(S, 0.4, 0.05, 2.3),
      edge(S, 0.62, 0.045, 0.7),
      edge(S, 0.84, 0.035, 2.5),
      edge(S, 1.04, 0, 0),
    ];
    const colours = [PALE, TEAL, CREAM, MID, DEEP];
    for (let i = 0; i < colours.length; i++) band(ctx, S, edges[i], edges[i + 1], colours[i]);
  },
  drawBack(ctx, S) {
    solid(ctx, S, REVERSE);
  },
};

import { PaperDesign } from './types';
import { solid } from './util';

// A small straight repeat: one short dash per cell, the same in every cell.
// The ground stays dominant. At dress scale it should read as texture rather
// than as a picture, and creases cut individual dashes instead of a motif.

const GROUND = '#f3eee4';
const INK = '#6a5d4e';

function drawInk(ctx: CanvasRenderingContext2D, S: number, margin = 0) {
  const n = 16;
  const c = S / n;
  const len = c * 0.34;
  const thick = Math.max(1, S * 0.0032);
  ctx.fillStyle = INK;
  for (let row = -margin; row < n + margin; row++) {
    for (let col = -margin; col < n + margin; col++) {
      const x = (col + 0.5) * c - len / 2;
      const y = (row + 0.5) * c - thick / 2;
      ctx.fillRect(x, y, len, thick);
    }
  }
}

export const seedDashes: PaperDesign = {
  id: 'seed-dashes',
  name: 'Seed dashes',
  note: 'One short dash, repeated, with room around each',
  reverse: '#6e7c6a',
  placement: {
    kind: 'snap', frontGround: GROUND, backGround: '#6e7c6a',
    // Neighbouring cells cover a half-cell shift in any quarter-turn, without
    // stretching a finite texture or tiling the grain.
    front: (ctx, S) => drawInk(ctx, S, 1),
    positions: [
      { label: 'Original', x: 0, y: 0 },
      { label: 'Half-cell right', x: 1/32, y: 0 },
      { label: 'Half-cell up', x: 0, y: 1/32 },
      { label: 'Half-cell both', x: 1/32, y: 1/32 },
    ],
  },
  drawFront(ctx, S) {
    solid(ctx, S, GROUND);
    drawInk(ctx, S);
  },
  drawBack(ctx, S) {
    solid(ctx, S, '#6e7c6a');
  },
};

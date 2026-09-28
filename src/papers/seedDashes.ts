import { PaperDesign } from './types';
import { solid } from './util';

// A small straight repeat: one short dash per cell, the same in every cell.
// The ground stays dominant. At dress scale it should read as texture rather
// than as a picture, and creases cut individual dashes instead of a motif.

const GROUND = '#f3eee4';
const INK = '#6a5d4e';

export const seedDashes: PaperDesign = {
  id: 'seed-dashes',
  name: 'Seed dashes',
  note: 'One short dash, repeated, with room around each',
  reverse: '#6e7c6a',
  drawFront(ctx, S) {
    solid(ctx, S, GROUND);
    const n = 16;
    const c = S / n;
    const len = c * 0.34;
    const thick = Math.max(1, S * 0.0032);
    ctx.fillStyle = INK;
    for (let row = 0; row < n; row++) {
      for (let col = 0; col < n; col++) {
        const x = (col + 0.5) * c - len / 2;
        const y = (row + 0.5) * c - thick / 2;
        ctx.fillRect(x, y, len, thick);
      }
    }
  },
  drawBack(ctx, S) {
    solid(ctx, S, '#6e7c6a');
  },
};

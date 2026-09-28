import { PaperDesign } from './types';
import { solid } from './util';

// A printed plain weave: horizontal ochre ribbons and vertical blue ribbons,
// each passing over the other at alternate crossings. The repeat is medium
// (six ribbons across the sheet) so the check still reads on the dress.
// Nothing here is a cloth simulation; it is flat ink on the paper texture.

const GAP = '#1a314c';
const OCHRE = '#e0a44a';
const OCHRE_LIT = '#f3d08a';
const BLUE = '#2a527f';
const BLUE_LIT = '#7aa0c8';
const REVERSE = '#5e6b66';

export const wovenChecks: PaperDesign = {
  id: 'woven-checks',
  name: 'Woven checks',
  note: 'A medium ochre and blue check, printed as a weave',
  reverse: REVERSE,
  drawFront(ctx, S) {
    solid(ctx, S, GAP);
    const n = 6;
    const pitch = S / n;
    const gap = pitch * 0.1;
    const thick = pitch - gap;
    const lit = thick * 0.2;

    for (let col = 0; col < n; col++) {
      const x = col * pitch + gap / 2;
      ctx.fillStyle = BLUE;
      ctx.fillRect(x, 0, thick, S);
      ctx.fillStyle = BLUE_LIT;
      ctx.fillRect(x, 0, lit, S);
    }
    for (let row = 0; row < n; row++) {
      const y = row * pitch + gap / 2;
      ctx.fillStyle = OCHRE;
      ctx.fillRect(0, y, S, thick);
      ctx.fillStyle = OCHRE_LIT;
      ctx.fillRect(0, y, S, lit);
    }
    for (let row = 0; row < n; row++) {
      for (let col = 0; col < n; col++) {
        if ((row + col) % 2 !== 0) continue;
        const x = col * pitch + gap / 2;
        const y = row * pitch + gap / 2;
        ctx.fillStyle = BLUE;
        ctx.fillRect(x, y - 0.5, thick, thick + 1);
        ctx.fillStyle = BLUE_LIT;
        ctx.fillRect(x, y - 0.5, lit, thick + 1);
      }
    }
  },
  drawBack(ctx, S) {
    solid(ctx, S, REVERSE);
  },
};

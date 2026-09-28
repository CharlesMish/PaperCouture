import { PaperDesign } from './types';
import { solid } from './util';

// A printed plain weave. Ochre and blue bands cross, and at each crossing
// one colour lies flat on top of the other. Edges are ink, not a highlight.
// Six bands across the sheet, so the check still reads on the dress.

const GAP = '#1c3148';
const OCHRE = '#c9923c';
const BLUE = '#2a4e76';
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
    const gap = pitch * 0.13;
    const thick = pitch - gap;
    // Ground showing for a short step where a band passes under another.
    const nick = thick * 0.09;

    for (let col = 0; col < n; col++) {
      const x = col * pitch + gap / 2;
      ctx.fillStyle = BLUE;
      ctx.fillRect(x, 0, thick, S);
    }
    for (let row = 0; row < n; row++) {
      const y = row * pitch + gap / 2;
      ctx.fillStyle = OCHRE;
      ctx.fillRect(0, y, S, thick);
    }
    for (let row = 0; row < n; row++) {
      for (let col = 0; col < n; col++) {
        const x = col * pitch + gap / 2;
        const y = row * pitch + gap / 2;
        const blueOver = (row + col) % 2 === 0;
        ctx.fillStyle = GAP;
        if (blueOver) {
          ctx.fillRect(x - nick, y, nick, thick);
          ctx.fillRect(x + thick, y, nick, thick);
          ctx.fillStyle = BLUE;
          ctx.fillRect(x, y, thick, thick);
        } else {
          ctx.fillRect(x, y - nick, thick, nick);
          ctx.fillRect(x, y + thick, thick, nick);
        }
      }
    }
  },
  drawBack(ctx, S) {
    solid(ctx, S, REVERSE);
  },
};

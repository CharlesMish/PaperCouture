import { PaperDesign } from './types';
import { solid } from './util';

// A printed plain weave. Six ochre bands and six blue bands. At each
// crossing one band runs straight through and the other stops short:
// a darker flat tone, then a narrow ground gap, then the band on top.
// The darker tone is only the end of a strip that goes under. It is not
// a light edge, a bevel, or a highlight along the ribbon.

const GAP = '#1c3148';
const OCHRE = '#c9923c';
const OCHRE_UNDER = '#8a5c26';
const BLUE = '#2a4e76';
const BLUE_UNDER = '#173049';
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
    // Ground between the bands, wide enough that they stay strips.
    const channel = pitch * 0.26;
    const thick = pitch - channel;
    // Narrow ground gap where the under band stops, before the one on top.
    const tuck = channel * 0.36;
    const underRun = channel - tuck;

    const at = (i: number) => i * pitch + channel / 2;

    for (let col = 0; col < n; col++) {
      ctx.fillStyle = BLUE;
      ctx.fillRect(at(col), 0, thick, S);
    }
    for (let row = 0; row < n; row++) {
      ctx.fillStyle = OCHRE;
      ctx.fillRect(0, at(row), S, thick);
    }

    for (let row = 0; row < n; row++) {
      for (let col = 0; col < n; col++) {
        const x = at(col);
        const y = at(row);
        const blueOver = (row + col) % 2 === 0;
        if (blueOver) {
          // Ochre ducks under. Darker ochre fills the channel up to a ground gap.
          ctx.fillStyle = OCHRE_UNDER;
          ctx.fillRect(x - channel, y, underRun, thick);
          ctx.fillRect(x + thick + tuck, y, underRun, thick);
          ctx.fillStyle = GAP;
          ctx.fillRect(x - tuck, y, tuck, thick);
          ctx.fillRect(x + thick, y, tuck, thick);
          ctx.fillStyle = BLUE;
          ctx.fillRect(x, y, thick, thick);
        } else {
          // Blue ducks under. Darker blue, then ground; the ochre stays across.
          ctx.fillStyle = BLUE_UNDER;
          ctx.fillRect(x, y - channel, thick, underRun);
          ctx.fillRect(x, y + thick + tuck, thick, underRun);
          ctx.fillStyle = GAP;
          ctx.fillRect(x, y - tuck, thick, tuck);
          ctx.fillRect(x, y + thick, thick, tuck);
        }
      }
    }
  },
  drawBack(ctx, S) {
    solid(ctx, S, REVERSE);
  },
};

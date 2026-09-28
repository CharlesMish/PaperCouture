import { PaperDesign } from './types';
import { solid } from './util';

// Quiet ivory with a printed ink border and a small corner mark. On the
// finished dress the plain centre becomes the front panel; the border runs
// down the inside edges of the side panels on the back, and the corner mark
// ends up tucked into a sleeve.

const IVORY = '#efe9dc';
const INK = '#262a33';

export const ivoryBorder: PaperDesign = {
  id: 'ivory-border',
  name: 'Ivory, ink border',
  note: 'Plain ivory with a printed border and a corner mark',
  reverse: INK,
  drawFront(ctx, S) {
    solid(ctx, S, IVORY);
    ctx.strokeStyle = INK;
    // heavy outer band
    const band = S * 0.045;
    ctx.lineWidth = band;
    ctx.strokeRect(band / 2, band / 2, S - band, S - band);
    // fine inner rule
    const inset = S * 0.072;
    ctx.lineWidth = S * 0.0035;
    ctx.strokeRect(inset, inset, S - 2 * inset, S - 2 * inset);
    // corner mark: a small diamond, top-left only
    const m = S * 0.105;
    const k = S * 0.018;
    ctx.fillStyle = '#9b3a2c';
    ctx.beginPath();
    ctx.moveTo(m, m - k);
    ctx.lineTo(m + k, m);
    ctx.lineTo(m, m + k);
    ctx.lineTo(m - k, m);
    ctx.closePath();
    ctx.fill();
  },
  drawBack(ctx, S) {
    solid(ctx, S, INK);
  },
};

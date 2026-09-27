import { PaperDesign } from './types';
import { solid } from './util';

// Border-led: the sheet is mostly empty ground. Broad ink bands sit on the
// top and bottom edges, with narrower side bands. The collar fold takes the
// top tenth of the sheet, so it removes most of the upper band and shows the
// reverse there. The side bands fall outside the slanted creases and travel
// to the back panels.

const GROUND = '#f3efe4';
const INK = '#1e3430';
const PALE = '#e6d3ae';
const RUST = '#c45c38';

export const wideFrame: PaperDesign = {
  id: 'wide-frame',
  name: 'Wide frame',
  note: 'Broad top and bottom bands around an empty centre',
  reverse: RUST,
  drawFront(ctx, S) {
    solid(ctx, S, GROUND);
    const side = S * 0.052;
    const top = S * 0.16;
    const bottom = S * 0.135;
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, S, top);
    ctx.fillRect(0, S - bottom, S, bottom);
    ctx.fillRect(0, top, side, S - top - bottom);
    ctx.fillRect(S - side, top, side, S - top - bottom);

    // a pale stitch just inside the ink, stopping short of the corners
    ctx.strokeStyle = PALE;
    ctx.lineWidth = Math.max(1, S * 0.004);
    const inset = S * 0.018;
    ctx.strokeRect(side + inset, top + inset, S - 2 * (side + inset), S - top - bottom - 2 * inset);

    // rust rules parallel to the top and bottom bands only
    ctx.strokeStyle = RUST;
    ctx.lineWidth = Math.max(1.25, S * 0.007);
    const x0 = side + S * 0.045;
    const x1 = S - side - S * 0.045;
    ctx.beginPath();
    ctx.moveTo(x0, top + S * 0.038);
    ctx.lineTo(x1, top + S * 0.038);
    ctx.moveTo(x0, S - bottom - S * 0.038);
    ctx.lineTo(x1, S - bottom - S * 0.038);
    ctx.stroke();
  },
  drawBack(ctx, S) {
    solid(ctx, S, RUST);
  },
};

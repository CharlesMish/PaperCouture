import { PaperDesign } from './types';
import { solid } from './util';

// The front is almost empty: one dark stroke down the middle of the centre
// panel. The reverse is that same ink across the whole sheet. Collar and
// sleeves are flipped facets, so they take this ground; a pale shape there
// would replace the contrast. A ring sits in the middle of the back only.

const FRONT = '#f6f1e6';
const INK = '#1b2433';
const PALE = '#f0e6d0';

export const inkReverse: PaperDesign = {
  id: 'ink-reverse',
  name: 'Ink reverse',
  note: 'A quiet front and a drawn dark reverse',
  reverse: INK,
  drawFront(ctx, S) {
    solid(ctx, S, FRONT);
    const x = S * 0.5;
    ctx.fillStyle = INK;
    ctx.fillRect(x - S * 0.005, S * 0.22, S * 0.01, S * 0.56);
    ctx.beginPath();
    ctx.moveTo(x, S * 0.175);
    ctx.lineTo(x + S * 0.016, S * 0.21);
    ctx.lineTo(x, S * 0.245);
    ctx.lineTo(x - S * 0.016, S * 0.21);
    ctx.closePath();
    ctx.fill();
  },
  drawBack(ctx, S) {
    solid(ctx, S, INK);
    // Ring kept inside the middle of the sheet. The top edge is the collar
    // and the corners are the sleeves; both stay the dark ground.
    const cx = S * 0.5;
    const cy = S * 0.58;
    ctx.strokeStyle = PALE;
    ctx.lineWidth = Math.max(2, S * 0.016);
    ctx.beginPath();
    ctx.arc(cx, cy, S * 0.14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, S * 0.04, 0, Math.PI * 2);
    ctx.stroke();
  },
};

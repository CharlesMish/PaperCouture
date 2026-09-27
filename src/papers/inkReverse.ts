import { PaperDesign } from './types';
import { solid } from './util';

// The front is almost empty: one dark stroke down the middle of the centre
// panel. The reverse is drawn on purpose, as seen from behind the sheet.
// A pale band across the top becomes the collar, pale corner blocks sit where
// the sleeve tips come from, and a large off-centre disc fills the field so
// the flipped faces are not a flat colour.

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
    // collar band: the top tenth of the sheet is what the collar fold turns out
    ctx.fillStyle = PALE;
    ctx.fillRect(0, 0, S, S * 0.1);
    ctx.fillStyle = INK;
    ctx.fillRect(0, S * 0.078, S, S * 0.008);

    // corner blocks, inset so they sit inside the sleeve tips
    const b = S * 0.11;
    const m = S * 0.035;
    ctx.fillStyle = PALE;
    ctx.fillRect(m, m, b, b);
    ctx.fillRect(S - m - b, m, b, b);
    ctx.fillRect(m, S - m - b, b, b);
    ctx.fillRect(S - m - b, S - m - b, b, b);

    // large disc, right of centre as seen from behind
    const cx = S * 0.64;
    const cy = S * 0.58;
    ctx.beginPath();
    ctx.arc(cx, cy, S * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(1.5, S * 0.012);
    ctx.beginPath();
    ctx.arc(cx, cy, S * 0.12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, S * 0.035, 0, Math.PI * 2);
    ctx.fillStyle = INK;
    ctx.fill();
  },
};

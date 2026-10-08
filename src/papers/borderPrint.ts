import { PaperDesign } from './types';
import { solid } from './util';

// A border print: one bold band of breaking waves across the lower middle of
// the sheet, and a quiet ground everywhere else. On the dress the band sits
// on the skirt front just above the hem (material y about -0.32 to -0.72), and
// its ends travel round to the back on the side flaps. The reverse is the
// band's indigo with a small cream wave rule along the top edge, which is the
// part of the reverse that becomes the collar.

const GROUND = '#f3ecdf';
const INDIGO = '#1f3a5f';
const FOAM = '#eef1ec';
const SKY = '#8fb3c9';
const CORAL = '#cf6a4e';

/** Canvas rows of the band, as fractions of the sheet height. */
export const BORDER_BAND = { top: 0.66, bottom: 0.86 };

function waves(ctx: CanvasRenderingContext2D, S: number, y0: number, h: number, count: number, crest: string, trough: string) {
  const w = S / count;
  for (let i = -1; i <= count; i++) {
    const x = i * w;
    // one scalloped wave: a broad trough, then a curling crest
    ctx.fillStyle = trough;
    ctx.beginPath();
    ctx.moveTo(x, y0 + h);
    ctx.quadraticCurveTo(x + w * 0.5, y0 + h * 0.15, x + w, y0 + h);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = crest;
    ctx.lineWidth = Math.max(1.5, h * 0.09);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.08, y0 + h * 0.92);
    ctx.quadraticCurveTo(x + w * 0.45, y0 + h * 0.12, x + w * 0.78, y0 + h * 0.42);
    ctx.quadraticCurveTo(x + w * 0.66, y0 + h * 0.52, x + w * 0.6, y0 + h * 0.4);
    ctx.stroke();
  }
}

export const borderPrint: PaperDesign = {
  id: 'border-print',
  name: 'Border print',
  note: 'One bold band of waves, set to land near the hem',
  reverse: INDIGO,
  drawFront(ctx, S) {
    solid(ctx, S, GROUND);
    const top = S * BORDER_BAND.top;
    const bottom = S * BORDER_BAND.bottom;
    ctx.fillStyle = INDIGO;
    ctx.fillRect(0, top, S, bottom - top);
    // three rows of waves inside the band, smaller toward the top
    waves(ctx, S, top + (bottom - top) * 0.06, (bottom - top) * 0.3, 14, FOAM, SKY);
    waves(ctx, S, top + (bottom - top) * 0.34, (bottom - top) * 0.3, 11, FOAM, '#2e5580');
    waves(ctx, S, top + (bottom - top) * 0.62, (bottom - top) * 0.34, 9, FOAM, SKY);
    // coral rules frame the band so it reads at display size
    ctx.fillStyle = CORAL;
    ctx.fillRect(0, top - S * 0.018, S, S * 0.009);
    ctx.fillRect(0, bottom + S * 0.009, S, S * 0.009);
  },
  drawBack(ctx, S) {
    solid(ctx, S, INDIGO);
    // A narrow cream wave rule inside the top tenth: on the dress and jacket
    // that strip is turned down and shows as the collar.
    ctx.fillStyle = CORAL;
    ctx.fillRect(0, S * 0.035, S, S * 0.006);
    waves(ctx, S, S * 0.045, S * 0.045, 16, FOAM, '#2e5580');
  },
};

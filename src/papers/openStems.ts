import { PaperDesign } from './types';
import { solid } from './util';

// A few stems and a lot of bare paper. One stem stands in the centre panel,
// one sits in the right side flap (so it leaves with that flap), and a short
// one stays low on the front. Nothing repeats across the sheet.

const GROUND = '#f7f4ee';
const STEM = '#3e5344';
const LEAF = '#6f8b5c';
const DEEP = '#2c4034';
const BERRY = '#a35248';

function stem(
  ctx: CanvasRenderingContext2D,
  S: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  bend: number,
  leaves: number,
) {
  const cx = (x0 + x1) / 2 + bend;
  const cy = (y0 + y1) / 2;
  ctx.strokeStyle = STEM;
  ctx.lineWidth = Math.max(1, S * 0.0045);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(cx, cy, x1, y1);
  ctx.stroke();
  for (let i = 0; i < leaves; i++) {
    const t = 0.22 + (i / leaves) * 0.7;
    const u = 1 - t;
    const x = u * u * x0 + 2 * u * t * cx + t * t * x1;
    const y = u * u * y0 + 2 * u * t * cy + t * t * y1;
    const side = i % 2 === 0 ? 1 : -1;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(side * 0.9 + (i % 3) * 0.15);
    ctx.fillStyle = i % 2 === 0 ? LEAF : DEEP;
    ctx.beginPath();
    ctx.ellipse(0, -S * 0.02, S * 0.011, S * 0.028, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export const openStems: PaperDesign = {
  id: 'open-stems',
  name: 'Open stems',
  note: 'Three stems with most of the sheet left bare',
  reverse: '#c4b49a',
  drawFront(ctx, S) {
    solid(ctx, S, GROUND);
    // centre panel: this one should remain on the dress front
    stem(ctx, S, S * 0.46, S * 0.9, S * 0.4, S * 0.24, S * 0.06, 6);
    // right flap: folded away onto the back
    stem(ctx, S, S * 0.9, S * 0.78, S * 0.78, S * 0.36, -S * 0.04, 4);
    // short stem, low on the front
    stem(ctx, S, S * 0.3, S * 0.92, S * 0.24, S * 0.64, S * 0.03, 3);
    ctx.fillStyle = BERRY;
    for (const [x, y] of [
      [0.43, 0.34],
      [0.455, 0.325],
      [0.442, 0.305],
    ]) {
      ctx.beginPath();
      ctx.arc(S * x, S * y, S * 0.008, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  drawBack(ctx, S) {
    solid(ctx, S, '#c4b49a');
  },
};

import { PaperDesign } from './types';
import { rng, solid } from './util';

// Restrained botanical: small leafy sprigs on a half-drop grid, sage and deep
// green with the odd cluster of berries. Each sprig leans a little
// differently, so no two panels of the dress look copied.

const GROUND = '#e8e1cf';
const SAGE = '#86976f';
const DEEP = '#4f5f41';
const BERRY = '#9c4f45';

function sprig(ctx: CanvasRenderingContext2D, S: number, x: number, y: number, angle: number, r: () => number) {
  const L = S * (0.085 + r() * 0.03);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const bend = (r() - 0.5) * L * 0.5;
  ctx.strokeStyle = DEEP;
  ctx.lineWidth = S * 0.0032;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, L / 2);
  ctx.quadraticCurveTo(bend, 0, 0, -L / 2);
  ctx.stroke();
  const leaves = 5 + Math.floor(r() * 3);
  for (let i = 0; i < leaves; i++) {
    const t = 0.15 + (i / leaves) * 0.8;
    // point on the quadratic stem
    const px = 2 * (1 - t) * t * bend;
    const py = L / 2 - t * L;
    const side = i % 2 === 0 ? 1 : -1;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(side * (0.9 + r() * 0.3) - 0.2);
    ctx.fillStyle = i % 3 === 0 ? DEEP : SAGE;
    ctx.beginPath();
    const lw = S * (0.011 + r() * 0.004);
    const ll = S * (0.024 + r() * 0.008);
    ctx.ellipse(0, -ll / 2, lw / 2, ll / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // leaf at the tip
  ctx.fillStyle = SAGE;
  ctx.beginPath();
  ctx.ellipse(0, -L / 2 - S * 0.012, S * 0.006, S * 0.014, 0, 0, Math.PI * 2);
  ctx.fill();
  if (r() > 0.55) {
    ctx.fillStyle = BERRY;
    for (let b = 0; b < 3; b++) {
      ctx.beginPath();
      ctx.arc(L * 0.12 + b * S * 0.009, L * 0.3 - b * S * 0.006, S * 0.0055, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

export const botanical: PaperDesign = {
  id: 'botanical',
  name: 'Botanical sprigs',
  note: 'Small leafy sprigs in sage and deep green',
  reverse: '#6f4556',
  drawFront(ctx, S) {
    solid(ctx, S, GROUND);
    const r = rng(29);
    const n = 6;
    const c = S / n;
    for (let col = -1; col <= n; col++) {
      for (let row = -1; row <= n; row++) {
        const x = (col + 0.5) * c + (r() - 0.5) * c * 0.15;
        const y = (row + 0.5 + (col % 2 ? 0.5 : 0)) * c + (r() - 0.5) * c * 0.15;
        sprig(ctx, S, x, y, (r() - 0.5) * 1.3 + (col % 2 ? 0.35 : -0.35), r);
      }
    }
  },
  drawBack(ctx, S) {
    solid(ctx, S, '#6f4556');
  },
};

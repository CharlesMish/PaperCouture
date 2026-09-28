import { PaperDesign } from './types';
import { solid } from './util';

// A few broad limbs and large fruit on a deep blue sheet. The readable
// arrangement sits in the centre panel (below the collar band), so the folded
// front keeps whole shapes instead of a small repeating floral.

const GROUND = '#16325a';
const BRANCH = '#a87545';
const BRANCH_CORE = '#3a2618';
const GOLD = '#e6b15a';
const APRICOT = '#e39245';
const PERSIMMON = '#d25a32';
const LIT = '#f6d7a4';
const OCHRE = '#c4923c';

function limb(
  ctx: CanvasRenderingContext2D,
  S: number,
  ax: number,
  ay: number,
  cx: number,
  cy: number,
  bx: number,
  by: number,
  width: number,
) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(S * ax, S * ay);
  ctx.quadraticCurveTo(S * cx, S * cy, S * bx, S * by);
  ctx.strokeStyle = BRANCH;
  ctx.lineWidth = S * width;
  ctx.stroke();
  ctx.strokeStyle = BRANCH_CORE;
  ctx.lineWidth = S * width * 0.34;
  ctx.stroke();
}

function fruit(ctx: CanvasRenderingContext2D, S: number, x: number, y: number, r: number, colour: string) {
  const cx = S * x;
  const cy = S * y;
  const rad = S * r;
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.arc(cx, cy, rad, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = LIT;
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.arc(cx - rad * 0.28, cy - rad * 0.3, rad * 0.36, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = BRANCH_CORE;
  ctx.beginPath();
  ctx.ellipse(cx, cy - rad * 0.88, rad * 0.2, rad * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
}

export const midnightOrchard: PaperDesign = {
  id: 'midnight-orchard',
  name: 'Midnight orchard',
  note: 'Broad branches and a few warm fruits on deep blue',
  reverse: OCHRE,
  drawFront(ctx, S) {
    solid(ctx, S, GROUND);
    limb(ctx, S, 0.34, 0.92, 0.22, 0.62, 0.4, 0.32, 0.032);
    limb(ctx, S, 0.38, 0.58, 0.52, 0.44, 0.64, 0.5, 0.02);
    limb(ctx, S, 0.7, 0.86, 0.78, 0.7, 0.52, 0.7, 0.018);
    limb(ctx, S, 0.36, 0.78, 0.46, 0.84, 0.4, 0.9, 0.016);
    fruit(ctx, S, 0.38, 0.84, 0.07, APRICOT);
    fruit(ctx, S, 0.36, 0.5, 0.084, GOLD);
    fruit(ctx, S, 0.56, 0.48, 0.062, PERSIMMON);
    fruit(ctx, S, 0.5, 0.68, 0.05, GOLD);
    fruit(ctx, S, 0.44, 0.36, 0.056, APRICOT);
  },
  drawBack(ctx, S) {
    solid(ctx, S, OCHRE);
  },
};

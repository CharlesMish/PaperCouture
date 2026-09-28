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
    limb(ctx, S, 0.32, 0.9, 0.2, 0.58, 0.4, 0.3, 0.03);
    limb(ctx, S, 0.37, 0.58, 0.56, 0.4, 0.7, 0.52, 0.02);
    limb(ctx, S, 0.72, 0.88, 0.8, 0.68, 0.56, 0.66, 0.018);
    // short spur off the main limb, still broad
    limb(ctx, S, 0.34, 0.44, 0.28, 0.38, 0.3, 0.34, 0.012);
    fruit(ctx, S, 0.36, 0.72, 0.072, APRICOT);
    fruit(ctx, S, 0.34, 0.48, 0.082, GOLD);
    fruit(ctx, S, 0.62, 0.5, 0.06, PERSIMMON);
    fruit(ctx, S, 0.52, 0.66, 0.046, GOLD);
    fruit(ctx, S, 0.44, 0.34, 0.054, APRICOT);
  },
  drawBack(ctx, S) {
    solid(ctx, S, OCHRE);
  },
};

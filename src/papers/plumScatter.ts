import { PaperDesign } from './types';
import { solid } from './util';

// One partly open plum blossom, then a short drift of related marks.
// Each petal is a broad ellipse, wider across than it is deep, so the
// tip is round. Neighbours use a lighter or darker plum where they
// overlap. Two petals are shorter, so the blossom is not fully open.
// The other side of the sheet stays blush.

const GROUND = '#f0d4de';
const PLUM = '#6e2448';
const DEEP = '#4c1834';
const LIFT = '#8a3a5e';
const CORAL = '#e36a55';
const REVERSE = '#6a2a48';

/** A round petal head. `across` is the tangential radius, `along` the radial one. */
function lobe(
  ctx: CanvasRenderingContext2D,
  S: number,
  ang: number,
  dist: number,
  across: number,
  along: number,
  colour: string,
) {
  const a = (ang * Math.PI) / 180;
  const ox = Math.sin(a) * dist * S;
  const oy = -Math.cos(a) * dist * S;
  const ux = Math.sin(a);
  const uy = -Math.cos(a);
  const vx = -uy;
  const vy = ux;
  const rt = across * S;
  const rr = along * S;
  ctx.fillStyle = colour;
  ctx.beginPath();
  const n = 40;
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI * 2;
    const px = Math.cos(t) * rr;
    const py = Math.sin(t) * rt;
    const x = ox + px * ux + py * vx;
    const y = oy + px * uy + py * vy;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

function cluster(ctx: CanvasRenderingContext2D, S: number) {
  const marks: [number, number, number, number][] = [
    [0, 0.002, 0.012, 0.009],
    [0.011, -0.004, 0.007, 0.005],
    [-0.009, 0.006, 0.006, 0.004],
    [0.002, 0.011, 0.004, 0.003],
  ];
  ctx.fillStyle = CORAL;
  for (const [x, y, rx, ry] of marks) {
    ctx.beginPath();
    ctx.ellipse(S * x, S * y, S * rx, S * ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Drawn back to front. The two plum petals are not neighbours, so each
// cap stays its own shape. Angles are degrees, 0 pointing up the sheet.
const BLOSSOM: [number, number, number, number, string][] = [
  [62, 0.058, 0.05, 0.043, PLUM],
  [288, 0.054, 0.045, 0.039, PLUM],
  [-12, 0.05, 0.043, 0.036, DEEP],
  [210, 0.056, 0.047, 0.043, DEEP],
  [136, 0.06, 0.052, 0.045, LIFT],
];

const HALF: [number, number, number, number, string][] = [
  [-55, 0.034, 0.024, 0.021, DEEP],
  [8, 0.032, 0.029, 0.026, PLUM],
  [78, 0.026, 0.022, 0.02, LIFT],
];

function bud(ctx: CanvasRenderingContext2D, S: number, x: number, y: number) {
  ctx.save();
  ctx.translate(S * x, S * y);
  ctx.rotate(-0.4);
  ctx.fillStyle = DEEP;
  ctx.beginPath();
  ctx.ellipse(0, 0, S * 0.02, S * 0.026, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PLUM;
  ctx.beginPath();
  ctx.ellipse(0, -S * 0.006, S * 0.013, S * 0.012, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function at(
  ctx: CanvasRenderingContext2D,
  S: number,
  x: number,
  y: number,
  petals: [number, number, number, number, string][],
  core: boolean,
) {
  ctx.save();
  ctx.translate(S * x, S * y);
  for (const p of petals) lobe(ctx, S, p[0], p[1], p[2], p[3], p[4]);
  if (core) cluster(ctx, S);
  ctx.restore();
}

function fallen(
  ctx: CanvasRenderingContext2D,
  S: number,
  x: number,
  y: number,
  ang: number,
  across: number,
  along: number,
  colour: string,
) {
  ctx.save();
  ctx.translate(S * x, S * y);
  lobe(ctx, S, ang, 0, across, along, colour);
  ctx.restore();
}

export const plumScatter: PaperDesign = {
  id: 'plum-scatter',
  name: 'Plum scatter',
  note: 'Irregular plum and coral petals with open ground',
  reverse: REVERSE,
  drawFront(ctx, S) {
    solid(ctx, S, GROUND);
    at(ctx, S, 0.4, 0.38, BLOSSOM, true);
    bud(ctx, S, 0.55, 0.52);
    at(ctx, S, 0.66, 0.63, HALF, false);
    fallen(ctx, S, 0.75, 0.73, 35, 0.02, 0.03, PLUM);
    fallen(ctx, S, 0.67, 0.82, 125, 0.016, 0.024, CORAL);
  },
  drawBack(ctx, S) {
    solid(ctx, S, REVERSE);
  },
};

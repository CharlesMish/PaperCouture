import { PaperDesign } from './types';
import { solid } from './util';

// An authored drift of plum and coral, not a repeat of the same flower.
// One cluster leads. Smaller marks follow it downhill, with open ground
// between them. Quiet parts of the sheet stay quiet.

const GROUND = '#f0d4de';
const PLUM = '#6e2448';
const DEEP = '#4c1834';
const CORAL = '#e36a55';
const REVERSE = '#6a2a48';

interface Petal {
  rot: number;
  len: number;
  wid: number;
  lean: number;
  colour: string;
  ox: number;
  oy: number;
}

function petal(ctx: CanvasRenderingContext2D, S: number, p: Petal) {
  const len = S * p.len;
  const wid = S * p.wid;
  const tip = p.lean * wid;
  ctx.save();
  ctx.translate(S * p.ox, S * p.oy);
  ctx.rotate(p.rot);
  ctx.fillStyle = p.colour;
  ctx.beginPath();
  // A thick base, so neighbouring petals fuse instead of meeting at a point.
  ctx.moveTo(0, len * 0.12);
  ctx.bezierCurveTo(wid * 1.25, len * 0.02, wid * 0.35 + tip, -len * 0.7, tip * 0.15, -len);
  ctx.bezierCurveTo(-wid * 0.15 + tip * 0.4, -len * 0.62, -wid, len * 0.04, 0, len * 0.12);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function cluster(ctx: CanvasRenderingContext2D, S: number, x: number, y: number, turn: number, petals: Petal[], core?: { rx: number; ry: number; rot: number }) {
  ctx.save();
  ctx.translate(S * x, S * y);
  ctx.rotate(turn);
  if (core) {
    ctx.fillStyle = DEEP;
    ctx.beginPath();
    ctx.ellipse(0, S * 0.012, S * core.rx, S * core.ry, core.rot, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const p of petals) petal(ctx, S, p);
  ctx.restore();
}

function bud(ctx: CanvasRenderingContext2D, S: number, x: number, y: number, len: number, rot: number) {
  const L = S * len;
  ctx.save();
  ctx.translate(S * x, S * y);
  ctx.rotate(rot);
  ctx.fillStyle = DEEP;
  ctx.beginPath();
  ctx.moveTo(0, L * 0.15);
  ctx.bezierCurveTo(L * 0.42, -L * 0.05, L * 0.28, -L * 0.72, 0, -L);
  ctx.bezierCurveTo(-L * 0.22, -L * 0.7, -L * 0.36, -L * 0.08, 0, L * 0.15);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = CORAL;
  ctx.beginPath();
  ctx.moveTo(0, -L * 0.62);
  ctx.bezierCurveTo(L * 0.12, -L * 0.78, L * 0.08, -L * 0.98, 0, -L);
  ctx.bezierCurveTo(-L * 0.08, -L * 0.96, -L * 0.1, -L * 0.76, 0, -L * 0.62);
  ctx.fill();
  ctx.restore();
}

// Bases are spread and angles stay inside a fan, so the mark is one
// overlapping silhouette with an opening, not a ring of equal petals.
// A short fan. The opening faces one way; bases sit on a small core.
const DOMINANT: Petal[] = [
  { rot: -0.35, len: 0.12, wid: 0.062, lean: 0.2, colour: DEEP, ox: -0.01, oy: -0.01 },
  { rot: -1.15, len: 0.1, wid: 0.04, lean: -0.55, colour: PLUM, ox: -0.04, oy: 0.012 },
  { rot: 0.55, len: 0.095, wid: 0.05, lean: 0.45, colour: PLUM, ox: 0.034, oy: 0.006 },
  { rot: 1.05, len: 0.07, wid: 0.032, lean: -0.2, colour: PLUM, ox: 0.01, oy: 0.04 },
];

const SECONDARY: Petal[] = [
  { rot: -0.35, len: 0.1, wid: 0.032, lean: 0.75, colour: CORAL, ox: -0.02, oy: 0.0 },
  { rot: 0.85, len: 0.09, wid: 0.046, lean: -0.25, colour: CORAL, ox: 0.028, oy: 0.022 },
  { rot: 2.15, len: 0.062, wid: 0.024, lean: 0.2, colour: PLUM, ox: -0.008, oy: 0.04 },
];

const FRAGMENT: Petal[] = [
  { rot: -0.45, len: 0.082, wid: 0.036, lean: -0.25, colour: PLUM, ox: 0, oy: 0 },
  { rot: 0.28, len: 0.06, wid: 0.028, lean: 0.45, colour: DEEP, ox: 0.016, oy: 0.012 },
];

const TRAILING: Petal[] = [
  { rot: 0.2, len: 0.062, wid: 0.03, lean: 0.65, colour: CORAL, ox: 0, oy: 0 },
  { rot: 0.95, len: 0.034, wid: 0.016, lean: -0.15, colour: DEEP, ox: 0.014, oy: 0.01 },
];

export const plumScatter: PaperDesign = {
  id: 'plum-scatter',
  name: 'Plum scatter',
  note: 'Irregular plum and coral petals with open ground',
  reverse: REVERSE,
  drawFront(ctx, S) {
    solid(ctx, S, GROUND);
    bud(ctx, S, 0.56, 0.24, 0.045, -0.4);
    cluster(ctx, S, 0.38, 0.42, -0.35, DOMINANT, { rx: 0.026, ry: 0.018, rot: -0.4 });
    cluster(ctx, S, 0.26, 0.6, -0.85, FRAGMENT);
    cluster(ctx, S, 0.7, 0.48, 0.25, TRAILING);
    cluster(ctx, S, 0.58, 0.76, 0.5, SECONDARY);
  },
  drawBack(ctx, S) {
    solid(ctx, S, REVERSE);
  },
};

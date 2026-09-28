import { PaperDesign } from './types';
import { solid } from './util';

// One partly open blossom, then a few smaller marks in the same hand.
// Petals are rounded and they overlap. Blush ground stays open around them.

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
  /** Shift along the petal, away from the shared centre. */
  out: number;
}

function petal(ctx: CanvasRenderingContext2D, S: number, p: Petal) {
  const len = S * p.len;
  const wid = S * p.wid;
  const tip = p.lean * wid * 0.35;
  ctx.save();
  ctx.rotate(p.rot);
  ctx.translate(tip * 0.15, -S * p.out);
  ctx.fillStyle = p.colour;
  ctx.beginPath();
  // Rounded, widest past the middle. The base is broad enough to overlap a neighbour.
  ctx.moveTo(wid * 0.36, -len * 0.02);
  ctx.bezierCurveTo(wid * 0.72, -len * 0.16, wid * 0.62, -len * 0.5, wid * 0.22, -len * 0.78);
  ctx.bezierCurveTo(wid * 0.04, -len * 0.98, -wid * 0.1, -len * 1.0, -wid * 0.24, -len * 0.82);
  ctx.bezierCurveTo(-wid * 0.42, -len * 0.58, -wid * 0.7, -len * 0.24, -wid * 0.34, len * 0.0);
  ctx.quadraticCurveTo(0, len * 0.05, wid * 0.36, -len * 0.02);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function junction(ctx: CanvasRenderingContext2D, S: number) {
  ctx.fillStyle = DEEP;
  ctx.beginPath();
  ctx.moveTo(0, -S * 0.016);
  ctx.bezierCurveTo(S * 0.018, -S * 0.01, S * 0.014, S * 0.008, S * 0.002, S * 0.016);
  ctx.bezierCurveTo(-S * 0.012, S * 0.018, -S * 0.02, S * 0.004, -S * 0.014, -S * 0.008);
  ctx.bezierCurveTo(-S * 0.006, -S * 0.02, S * 0.002, -S * 0.018, 0, -S * 0.016);
  ctx.closePath();
  ctx.fill();
}

function group(
  ctx: CanvasRenderingContext2D,
  S: number,
  x: number,
  y: number,
  turn: number,
  petals: Petal[],
  core: boolean,
) {
  ctx.save();
  ctx.translate(S * x, S * y);
  ctx.rotate(turn);
  if (core) junction(ctx, S);
  for (const p of petals) petal(ctx, S, p);
  ctx.restore();
}

// Five rounded petals. One is shorter, so the blossom stays partly open.
const BLOSSOM: Petal[] = [
  { rot: -2.2, len: 0.084, wid: 0.044, lean: 0.15, colour: DEEP, out: 0.01 },
  { rot: -1.02, len: 0.098, wid: 0.05, lean: -0.1, colour: PLUM, out: 0.008 },
  { rot: 0.12, len: 0.104, wid: 0.052, lean: 0.18, colour: PLUM, out: 0.006 },
  { rot: 1.22, len: 0.09, wid: 0.046, lean: 0.05, colour: DEEP, out: 0.01 },
  { rot: 2.05, len: 0.074, wid: 0.04, lean: -0.12, colour: CORAL, out: 0.006 },
];

const SIDE: Petal[] = [
  { rot: -0.7, len: 0.056, wid: 0.032, lean: 0.2, colour: PLUM, out: 0.004 },
  { rot: 0.28, len: 0.048, wid: 0.03, lean: -0.12, colour: DEEP, out: 0.006 },
  { rot: 1.2, len: 0.04, wid: 0.026, lean: 0.22, colour: CORAL, out: 0.008 },
];

const BUD: Petal[] = [
  { rot: -0.45, len: 0.048, wid: 0.028, lean: 0.1, colour: DEEP, out: 0.0 },
  { rot: 0.4, len: 0.044, wid: 0.026, lean: -0.14, colour: PLUM, out: 0.002 },
  { rot: -0.02, len: 0.02, wid: 0.012, lean: 0.0, colour: CORAL, out: 0.02 },
];

const FALLEN: Petal[] = [{ rot: 1.25, len: 0.046, wid: 0.03, lean: 0.16, colour: CORAL, out: 0 }];

const DRIFT: Petal[] = [
  { rot: -0.85, len: 0.042, wid: 0.026, lean: -0.12, colour: PLUM, out: 0.0 },
  { rot: 0.2, len: 0.03, wid: 0.02, lean: 0.18, colour: DEEP, out: 0.008 },
];

export const plumScatter: PaperDesign = {
  id: 'plum-scatter',
  name: 'Plum scatter',
  note: 'Irregular plum and coral petals with open ground',
  reverse: REVERSE,
  drawFront(ctx, S) {
    solid(ctx, S, GROUND);
    group(ctx, S, 0.56, 0.24, -0.55, BUD, false);
    group(ctx, S, 0.4, 0.4, -0.2, BLOSSOM, true);
    group(ctx, S, 0.27, 0.57, 0.35, FALLEN, false);
    group(ctx, S, 0.62, 0.58, 0.2, SIDE, false);
    group(ctx, S, 0.48, 0.74, -0.15, DRIFT, false);
  },
  drawBack(ctx, S) {
    solid(ctx, S, REVERSE);
  },
};

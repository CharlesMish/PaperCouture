import { PaperDesign } from './types';
import { solid } from './util';

// Drawings on the sheet, not ornaments pinned to the finished dress.
// The front is mist, with one stem rising from the lower left.
// The reverse is deep green: a cropped sprig along the top edge, warm
// marks in two corners, and one flowering stem through the middle.
// Folding shows different portions of those drawings. Nothing here
// moves to follow a collar, a sleeve, or a turn.

const FRONT = '#d7e0da';
const GREEN = '#1c4034';
const LEAF = '#c5ddb0';
const LEAF_DEEP = '#8fb56e';
const FRONT_LEAF = '#4f6d58';
const FRONT_LEAF_DEEP = '#2f4a3c';
const BLOSSOM = '#f3d2c4';
const CORAL = '#e07a68';
const CREAM = '#f6efd8';
const BUD = '#e7b0a0';

interface Pt {
  x: number;
  y: number;
}

function quad(p0: Pt, c: Pt, p1: Pt, t: number): Pt {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * c.x + t * t * p1.x,
    y: u * u * p0.y + 2 * u * t * c.y + t * t * p1.y,
  };
}

function quadTan(p0: Pt, c: Pt, p1: Pt, t: number): Pt {
  const u = 1 - t;
  return {
    x: 2 * u * (c.x - p0.x) + 2 * t * (p1.x - c.x),
    y: 2 * u * (c.y - p0.y) + 2 * t * (p1.y - c.y),
  };
}

function stem(ctx: CanvasRenderingContext2D, S: number, p0: Pt, c: Pt, p1: Pt, width: number, colour: string) {
  ctx.strokeStyle = colour;
  ctx.lineWidth = Math.max(1.5, S * width);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(S * p0.x, S * p0.y);
  ctx.quadraticCurveTo(S * c.x, S * c.y, S * p1.x, S * p1.y);
  ctx.stroke();
}

/** Leaf base sits on the stem. The tip is away from it. */
function leaf(
  ctx: CanvasRenderingContext2D,
  S: number,
  x: number,
  y: number,
  len: number,
  wid: number,
  rot: number,
  colour: string,
) {
  const L = S * len;
  const W = S * wid;
  ctx.save();
  ctx.translate(S * x, S * y);
  ctx.rotate(rot);
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(W * 1.1, -L * 0.28, W * 0.45, -L * 0.82, 0, -L);
  ctx.bezierCurveTo(-W * 0.7, -L * 0.78, -W * 0.85, -L * 0.22, 0, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function bud(ctx: CanvasRenderingContext2D, S: number, x: number, y: number, len: number, rot: number, colour: string) {
  const L = S * len;
  ctx.save();
  ctx.translate(S * x, S * y);
  ctx.rotate(rot);
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(0, L * 0.2);
  ctx.bezierCurveTo(L * 0.38, 0, L * 0.22, -L * 0.7, 0, -L);
  ctx.bezierCurveTo(-L * 0.28, -L * 0.62, -L * 0.32, 0.05 * L, 0, L * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * Overlapping petals, drawn back to front. `spread` opens or closes the
 * flower. The centre is small so it does not read as a highlight.
 */
function blossom(
  ctx: CanvasRenderingContext2D,
  S: number,
  x: number,
  y: number,
  r: number,
  turn: number,
  spread: number,
) {
  const petals = [
    { a: -0.1, len: 1, wid: 0.55, colour: BLOSSOM },
    { a: 1.15, len: 0.72, wid: 0.48, colour: CORAL },
    { a: 2.25, len: 0.96, wid: 0.5, colour: BLOSSOM },
    { a: 3.4, len: 0.66, wid: 0.42, colour: CORAL },
    { a: 4.55, len: 0.86, wid: 0.46, colour: CREAM },
  ];
  ctx.save();
  ctx.translate(S * x, S * y);
  ctx.rotate(turn);
  const R = S * r;
  for (const p of petals) {
    const a = p.a * spread;
    ctx.save();
    ctx.rotate(a);
    ctx.fillStyle = p.colour;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(R * p.wid, -R * p.len * 0.35, R * p.wid * 0.45, -R * p.len * 0.9, 0, -R * p.len);
    ctx.bezierCurveTo(-R * p.wid * 0.55, -R * p.len * 0.82, -R * p.wid * 0.7, -R * p.len * 0.25, 0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

export const reverseGarden: PaperDesign = {
  id: 'reverse-garden',
  name: 'Reverse garden',
  note: 'A quiet front; the garden is on the reverse',
  reverse: GREEN,
  drawFront(ctx, S) {
    solid(ctx, S, FRONT);
    const root: Pt = { x: 0.18, y: 0.9 };
    const bend: Pt = { x: 0.12, y: 0.68 };
    const tip: Pt = { x: 0.34, y: 0.5 };
    stem(ctx, S, root, bend, tip, 0.008, FRONT_LEAF_DEEP);

    const places = [0.28, 0.52, 0.78];
    const lens = [0.062, 0.046, 0.038];
    const wids = [0.022, 0.017, 0.014];
    const sides = [-1.15, 0.95, -0.7];
    const colours = [FRONT_LEAF, FRONT_LEAF_DEEP, FRONT_LEAF];
    for (let i = 0; i < places.length; i++) {
      const p = quad(root, bend, tip, places[i]);
      const t = quadTan(root, bend, tip, places[i]);
      const ang = Math.atan2(t.y, t.x) + sides[i];
      leaf(ctx, S, p.x, p.y, lens[i], wids[i], ang, colours[i]);
    }
    const budAt = quad(root, bend, tip, 0.93);
    const budTan = quadTan(root, bend, tip, 0.93);
    bud(ctx, S, budAt.x, budAt.y, 0.03, Math.atan2(budTan.y, budTan.x) + Math.PI / 2, BUD);
    const side = quad(root, bend, tip, 0.42);
    const sideTan = quadTan(root, bend, tip, 0.42);
    bud(ctx, S, side.x, side.y, 0.022, Math.atan2(sideTan.y, sideTan.x) - 1.1, BUD);
  },
  drawBack(ctx, S) {
    solid(ctx, S, GREEN);

    // Cropped sprig along the top edge of the sheet. Leaves differ, and
    // stretches of stem stay bare. A few tips run off the edge.
    const a: Pt = { x: 0.22, y: 0.01 };
    const b: Pt = { x: 0.48, y: 0.02 };
    const c: Pt = { x: 0.8, y: 0.058 };
    stem(ctx, S, a, b, c, 0.011, LEAF);
    const sprig: { t: number; len: number; wid: number; side: number; colour: string; bud?: boolean }[] = [
      { t: 0.2, len: 0.042, wid: 0.016, side: -1.25, colour: CREAM },
      { t: 0.44, len: 0.058, wid: 0.024, side: 1.3, colour: CREAM },
      { t: 0.6, len: 0.03, wid: 0.013, side: 0.75, colour: BLOSSOM, bud: true },
      { t: 0.8, len: 0.046, wid: 0.017, side: 1.65, colour: LEAF },
    ];
    for (const part of sprig) {
      const p = quad(a, b, c, part.t);
      const tan = quadTan(a, b, c, part.t);
      const ang = Math.atan2(tan.y, tan.x) + part.side;
      if (part.bud) bud(ctx, S, p.x, p.y, part.len, ang, part.colour);
      else leaf(ctx, S, p.x, p.y, part.len, part.wid, ang, part.colour);
    }

    // Warm corner marks. They are part of the sheet drawing.
    blossom(ctx, S, 0.07, 0.05, 0.046, 0.4, 0.92);
    blossom(ctx, S, 0.93, 0.05, 0.046, -0.6, 0.88);

    // Flowering stem through the middle of the sheet.
    const root: Pt = { x: 0.5, y: 0.9 };
    const bend: Pt = { x: 0.4, y: 0.64 };
    const tip: Pt = { x: 0.5, y: 0.4 };
    stem(ctx, S, root, bend, tip, 0.014, LEAF);

    const attachments: { t: number; len: number; wid: number; side: number; colour: string }[] = [
      { t: 0.22, len: 0.07, wid: 0.028, side: -1.05, colour: LEAF },
      { t: 0.48, len: 0.062, wid: 0.024, side: 0.95, colour: LEAF_DEEP },
      { t: 0.7, len: 0.05, wid: 0.02, side: -0.85, colour: LEAF },
    ];
    for (const leafSpec of attachments) {
      const p = quad(root, bend, tip, leafSpec.t);
      const tan = quadTan(root, bend, tip, leafSpec.t);
      leaf(ctx, S, p.x, p.y, leafSpec.len, leafSpec.wid, Math.atan2(tan.y, tan.x) + leafSpec.side, leafSpec.colour);
    }

    blossom(ctx, S, 0.56, 0.86, 0.082, 0.3, 0.9);
    blossom(ctx, S, 0.46, 0.68, 0.1, -0.45, 0.78);
    blossom(ctx, S, 0.5, 0.42, 0.092, 0.15, 1.02);
  },
};

import type { PaperDesign } from './types';

// Afternoon fig: one branch, read twice. The front is the shadow the branch
// throws on a plaster wall. The reverse is the same branch held up to the
// light, so the wall goes dark and the leaves go luminous. Both faces are
// drawn in front-canvas space and the reverse is mirrored once, which puts
// the same leaf on the same sheet point. A fold that turns paper over shows
// the other reading, not a second pattern.
//
// Placed after seeing the swing coat. Its shoulder yoke is the reverse of the
// top of the sheet, so the high leaf sits there and is worn as light. The low
// leaf sits on a front panel and is worn as shadow. The capelet keeps only the
// top half, so it keeps the light and folds the shadow away.

const WALL_LIT = '#fbf6ea';
const WALL = '#f3e7d2';
const WALL_SHADE = '#e5d5b8';
const SOOT = '#2c2824';
const STEM = '#4a4036';
const SHADE_LIT = '#274338';
const SHADE = '#1b3329';
const SHADE_DEEP = '#13241c';
const LEAF_WARM = '#d4e07a';
const LEAF_LIT = '#a8cc4e';
const VEIN_LIT = '#2a4634';
const STEM_LIT = '#d2e2ad';

export interface FigLeaf {
  /** Center, in front-canvas fractions (x right, y down). */
  x: number;
  y: number;
  /** Radians, clockwise in canvas space. 0 points the tip up. */
  rot: number;
  /** Width of the leaf relative to the sheet. */
  scale: number;
  /** 1 or -1. The second leaf is the branch's other hand. */
  turn: 1 | -1;
  /** Slightly narrows a younger leaf. 1 is the full fig. */
  bulge: number;
}

// The swing coat's shoulder is the reverse of the top of the sheet, and its
// front panels are the outer quarters. The high leaf sits in that shoulder so
// the yoke wears it as light. The low leaf sits on a front panel as shadow.
export const FIG_LEAVES: readonly FigLeaf[] = [
  { x: 0.48, y: 0.26, rot: -0.12, scale: 0.38, turn: 1, bulge: 1 },
  { x: 0.76, y: 0.52, rot: 0.2, scale: 0.30, turn: -1, bulge: 0.94 },
];

/** A five-lobed fig. Each sinus returns close to the midrib so the lobes stay separate. */
function figPath(ctx: CanvasRenderingContext2D, bulge: number): void {
  const b = bulge;
  ctx.beginPath();
  ctx.moveTo(0, -0.64);
  ctx.bezierCurveTo(0.10, -0.58, 0.12, -0.42, 0.045, -0.26);
  ctx.bezierCurveTo(0.16, -0.40, 0.34 * b, -0.36, 0.42 * b, -0.18);
  ctx.bezierCurveTo(0.26 * b, -0.06, 0.09, -0.10, 0.05, 0.02);
  ctx.bezierCurveTo(0.20, 0.00, 0.42 * b, 0.10, 0.46 * b, 0.24);
  ctx.bezierCurveTo(0.26 * b, 0.18, 0.09, 0.10, 0.05, 0.24);
  ctx.bezierCurveTo(0.16, 0.28, 0.24 * b, 0.42, 0.12 * b, 0.48);
  ctx.bezierCurveTo(0.05, 0.40, 0.035, 0.46, 0.026, 0.56);
  ctx.lineTo(-0.026, 0.56);
  ctx.bezierCurveTo(-0.04, 0.44, -0.08, 0.38, -0.16 * b, 0.46);
  ctx.bezierCurveTo(-0.26 * b, 0.36, -0.08, 0.22, -0.045, 0.22);
  ctx.bezierCurveTo(-0.16, 0.10, -0.40 * b, 0.14, -0.48 * b, 0.00);
  ctx.bezierCurveTo(-0.28 * b, -0.10, -0.07, 0.00, -0.045, -0.02);
  ctx.bezierCurveTo(-0.14, -0.16, -0.40 * b, -0.28, -0.38 * b, -0.42);
  ctx.bezierCurveTo(-0.20 * b, -0.38, -0.07, -0.26, -0.045, -0.24);
  ctx.bezierCurveTo(-0.12, -0.46, -0.08, -0.60, 0, -0.64);
  ctx.closePath();
}

/** Midrib first, then a vein into each lobe, in the same local space as the path. */
const VEIN_BRANCHES: readonly [number, number, number, number][] = [
  [0.00, -0.06, 0.26, -0.14],
  [0.00, 0.10, 0.30, 0.14],
  [0.00, 0.24, 0.10, 0.36],
  [0.00, -0.08, -0.24, -0.22],
  [0.00, 0.08, -0.30, 0.02],
  [0.00, 0.22, -0.12, 0.34],
];

const HOLES: readonly [number, number, number][] = [
  [0.20, -0.10, 0.026],
  [-0.18, 0.06, 0.020],
];

function ground(ctx: CanvasRenderingContext2D, size: number, back: boolean): void {
  const wash = ctx.createLinearGradient(0, 0, size * 0.85, size);
  if (back) {
    wash.addColorStop(0, SHADE_LIT);
    wash.addColorStop(0.55, SHADE);
    wash.addColorStop(1, SHADE_DEEP);
  } else {
    wash.addColorStop(0, WALL_LIT);
    wash.addColorStop(0.5, WALL);
    wash.addColorStop(1, WALL_SHADE);
  }
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, size, size);
}

/** A local leaf point, in front-canvas fractions. */
function at(leaf: FigLeaf, lx: number, ly: number): [number, number] {
  const x = lx * leaf.turn;
  const c = Math.cos(leaf.rot);
  const s = Math.sin(leaf.rot);
  return [leaf.x + leaf.scale * (x * c - ly * s), leaf.y + leaf.scale * (x * s + ly * c)];
}

function paint(ctx: CanvasRenderingContext2D, size: number, back: boolean): void {
  ctx.save();
  // The back canvas is viewed from behind. Mirror once so the branch stays
  // on the same points of the sheet.
  if (back) {
    ctx.translate(size, 0);
    ctx.scale(-1, 1);
  }
  ground(ctx, size, back);

  const [ax, ay] = at(FIG_LEAVES[0], 0, 0.52);
  const [bx, by] = at(FIG_LEAVES[1], 0, 0.52);
  ctx.strokeStyle = back ? STEM_LIT : STEM;
  ctx.lineWidth = size * (back ? 0.022 : 0.016);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(ax * size, ay * size);
  ctx.quadraticCurveTo(size * 0.62, size * 0.46, bx * size, by * size);
  ctx.stroke();

  for (const leaf of FIG_LEAVES) {
    ctx.save();
    ctx.translate(leaf.x * size, leaf.y * size);
    ctx.rotate(leaf.rot);
    ctx.scale(leaf.scale * leaf.turn * size, leaf.scale * size);
    figPath(ctx, leaf.bulge);
    if (back) {
      ctx.save();
      ctx.clip();
      const glow = ctx.createRadialGradient(0, 0.02, 0.02, 0, -0.08, 0.72);
      glow.addColorStop(0, LEAF_WARM);
      glow.addColorStop(1, LEAF_LIT);
      ctx.fillStyle = glow;
      ctx.fillRect(-1.2, -1.2, 2.4, 2.4);
      ctx.restore();
    } else {
      ctx.fillStyle = SOOT;
      ctx.fill();
    }
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = back ? VEIN_LIT : WALL;
    ctx.lineWidth = 0.015;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = back ? 0.8 : 0.95;
    ctx.beginPath();
    ctx.moveTo(0, 0.38);
    ctx.lineTo(0, -0.50);
    for (const [x0, y0, x1, y1] of VEIN_BRANCHES) {
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(x1 * 0.45, y0 * 0.4 + y1 * 0.6, x1, y1);
    }
    ctx.stroke();
    ctx.restore();
    ctx.restore();

    // Light leaks. Refill the wall rather than punching a hole, so the
    // texture stays opaque and the leak is the paper's own ground.
    ctx.save();
    ctx.beginPath();
    for (const [hx, hy, r] of HOLES) {
      const [x, y] = at(leaf, hx, hy);
      ctx.moveTo((x + r) * size, y * size);
      ctx.ellipse(x * size, y * size, r * leaf.scale * size, r * 0.82 * leaf.scale * size, leaf.rot, 0, Math.PI * 2);
    }
    ctx.clip();
    ground(ctx, size, back);
    ctx.restore();
  }
  ctx.restore();
}

export const afternoonFig: PaperDesign = {
  id: 'afternoon-fig',
  name: 'Afternoon fig',
  note: 'A fig branch in shadow on plaster; the reverse is that branch held to the light',
  reverse: SHADE,
  placementNote: 'Fixed print. The large leaf sits in the top of the sheet and the smaller leaf sits lower, to one side. Turning the square moves which half of the branch a fold keeps.',
  drawFront: (ctx, size) => paint(ctx, size, false),
  drawBack: (ctx, size) => paint(ctx, size, true),
};

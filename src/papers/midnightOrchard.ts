import { PaperDesign } from './types';
import { solid } from './util';

// One limb on deep blue. It is narrow, and it tapers. Short stems leave it
// and end in fruit, with blue ground between the wood and the fruit.
// The hem and the lower right stay open.

const GROUND = '#16325a';
const BRANCH = '#a87545';
const BRANCH_EDGE = '#6b4428';
const GOLD = '#e0a84c';
const APRICOT = '#e08a42';
const PERSIMMON = '#d25a32';
const OCHRE = '#c4923c';

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

function stemRot(from: Pt, to: Pt): number {
  return Math.atan2(from.x - to.x, -(from.y - to.y));
}

function widthAt(t: number, w0: number, w1: number, softenRoot: boolean): number {
  const s = t * t * (3 - 2 * t);
  let w = w0 + (w1 - w0) * s;
  if (softenRoot && t < 0.14) {
    const u = t / 0.14;
    w *= 0.58 + 0.42 * Math.sin((u * Math.PI) / 2);
  }
  return w;
}

/** A flat printed limb. Width tapers. The root is rounded. A darker edge sits on one side. */
function limb(
  ctx: CanvasRenderingContext2D,
  S: number,
  p0: Pt,
  c: Pt,
  p1: Pt,
  w0: number,
  w1: number,
  softenRoot: boolean,
) {
  const n = 36;
  const left: Pt[] = [];
  const right: Pt[] = [];
  let n0: Pt = { x: 0, y: 1 };
  let t0: Pt = { x: 0, y: -1 };
  let wRoot = w0;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = quad(p0, c, p1, t);
    const tan = quadTan(p0, c, p1, t);
    const len = Math.hypot(tan.x, tan.y) || 1;
    const tx = tan.x / len;
    const ty = tan.y / len;
    const nx = -ty;
    const ny = tx;
    const w = widthAt(t, w0, w1, softenRoot);
    if (i === 0) {
      n0 = { x: nx, y: ny };
      t0 = { x: tx, y: ty };
      wRoot = w;
    }
    left.push({ x: p.x + nx * w, y: p.y + ny * w });
    right.push({ x: p.x - nx * w, y: p.y - ny * w });
  }
  const cap: Pt[] = [];
  if (softenRoot) {
    const steps = 8;
    for (let i = steps - 1; i >= 1; i--) {
      const a = (Math.PI * i) / steps;
      cap.push({
        x: p0.x + n0.x * wRoot * Math.cos(a) - t0.x * wRoot * Math.sin(a),
        y: p0.y + n0.y * wRoot * Math.cos(a) - t0.y * wRoot * Math.sin(a),
      });
    }
  }
  const outline = [...left, ...right.slice().reverse(), ...cap];
  const paint = (pts: Pt[], colour: string) => {
    ctx.beginPath();
    ctx.moveTo(S * pts[0].x, S * pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(S * pts[i].x, S * pts[i].y);
    ctx.closePath();
    ctx.fillStyle = colour;
    ctx.fill();
  };
  const shade = outline.map((p) => ({
    x: p.x + n0.x * wRoot * 0.22,
    y: p.y + n0.y * wRoot * 0.22,
  }));
  paint(shade, BRANCH_EDGE);
  paint(outline, BRANCH);
}

function fruit(
  ctx: CanvasRenderingContext2D,
  S: number,
  x: number,
  y: number,
  r: number,
  colour: string,
  kind: 'gold' | 'apricot' | 'persimmon',
  rot: number,
) {
  ctx.save();
  ctx.translate(S * x, S * y);
  ctx.rotate(rot);
  if (kind === 'gold') ctx.scale(1.06, 0.94);
  else if (kind === 'apricot') ctx.scale(0.98, 1.04);
  else ctx.scale(1.03, 0.97);
  const R = S * r;
  ctx.beginPath();
  if (kind === 'gold') {
    ctx.moveTo(0, -R * 0.9);
    ctx.bezierCurveTo(R * 0.58, -R * 0.94, R * 0.98, -R * 0.46, R * 0.96, R * 0.08);
    ctx.bezierCurveTo(R * 0.94, R * 0.58, R * 0.62, R * 1.02, R * 0.08, R * 0.92);
    ctx.bezierCurveTo(-R * 0.48, R * 0.98, -R * 0.98, R * 0.5, -R * 0.94, R * 0.02);
    ctx.bezierCurveTo(-R * 0.9, -R * 0.5, -R * 0.52, -R * 0.96, 0, -R * 0.9);
  } else if (kind === 'apricot') {
    ctx.moveTo(R * 0.1, -R * 0.88);
    ctx.bezierCurveTo(R * 0.58, -R * 0.84, R * 0.98, -R * 0.4, R * 0.94, R * 0.12);
    ctx.bezierCurveTo(R * 0.9, R * 0.64, R * 0.46, R * 1.02, 0, R * 0.96);
    ctx.bezierCurveTo(-R * 0.5, R * 0.9, -R * 0.98, R * 0.42, -R * 0.92, -R * 0.06);
    ctx.bezierCurveTo(-R * 0.86, -R * 0.55, -R * 0.32, -R * 0.98, R * 0.1, -R * 0.88);
  } else {
    ctx.moveTo(0, -R * 0.84);
    ctx.bezierCurveTo(R * 0.52, -R * 0.9, R * 0.98, -R * 0.48, R * 0.96, R * 0.06);
    ctx.bezierCurveTo(R * 0.94, R * 0.58, R * 0.5, R * 1.0, 0, R * 0.96);
    ctx.bezierCurveTo(-R * 0.52, R * 1.0, -R * 0.98, R * 0.52, -R * 0.94, R * 0.02);
    ctx.bezierCurveTo(-R * 0.9, -R * 0.5, -R * 0.5, -R * 0.9, 0, -R * 0.84);
  }
  ctx.closePath();
  ctx.fillStyle = colour;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = kind === 'persimmon' ? '#9a3e22' : kind === 'gold' ? '#b78432' : '#c56e30';
  ctx.globalAlpha = 0.2;
  ctx.beginPath();
  ctx.ellipse(0, R * 0.78, R * 0.62, R * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = BRANCH_EDGE;
  ctx.beginPath();
  ctx.moveTo(-R * 0.07, -R * 0.74);
  ctx.quadraticCurveTo(0, -R * 0.58, R * 0.06, -R * 0.76);
  ctx.lineTo(R * 0.025, -R * 0.98);
  ctx.lineTo(-R * 0.03, -R * 0.98);
  ctx.closePath();
  ctx.fill();
  if (kind === 'persimmon') {
    ctx.strokeStyle = BRANCH_EDGE;
    ctx.lineWidth = Math.max(1.25, S * 0.0032);
    ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.moveTo(-R * 0.12, -R * 0.8);
    ctx.lineTo(R * 0.12, -R * 0.8);
    ctx.moveTo(0, -R * 0.7);
    ctx.lineTo(0, -R * 0.9);
    ctx.stroke();
  }
  ctx.restore();
}

function hang(from: Pt, dir: Pt, stem: number, r: number): { end: Pt; at: Pt } {
  const len = Math.hypot(dir.x, dir.y) || 1;
  const ux = dir.x / len;
  const uy = dir.y / len;
  const end = { x: from.x + ux * stem, y: from.y + uy * stem };
  const reach = r * 0.74;
  return { end, at: { x: end.x + ux * reach, y: end.y + uy * reach } };
}

export const midnightOrchard: PaperDesign = {
  id: 'midnight-orchard',
  name: 'Midnight orchard',
  note: 'Broad branches and a few warm fruits on deep blue',
  reverse: OCHRE,
  drawFront(ctx, S) {
    solid(ctx, S, GROUND);

    // Canvas +y is down the sheet, so a droop is the way fruit hangs.
    const root: Pt = { x: 0.34, y: 0.76 };
    const bend: Pt = { x: 0.29, y: 0.5 };
    const tip: Pt = { x: 0.52, y: 0.3 };
    const at = (t: number) => quad(root, bend, tip, t);

    const spots: { t: number; dir: Pt; stem: number; r: number; colour: string; kind: 'gold' | 'apricot' | 'persimmon' }[] = [
      { t: 0.22, dir: { x: -0.92, y: 0.4 }, stem: 0.058, r: 0.036, colour: APRICOT, kind: 'apricot' },
      { t: 0.46, dir: { x: 0.05, y: 1 }, stem: 0.04, r: 0.05, colour: GOLD, kind: 'gold' },
      { t: 0.72, dir: { x: 0.72, y: 0.7 }, stem: 0.034, r: 0.032, colour: PERSIMMON, kind: 'persimmon' },
      { t: 0.93, dir: { x: 0.35, y: 0.94 }, stem: 0.028, r: 0.022, colour: APRICOT, kind: 'apricot' },
    ];

    for (const spot of spots) {
      const from = at(spot.t);
      const { end } = hang(from, spot.dir, spot.stem, spot.r);
      limb(ctx, S, from, { x: (from.x + end.x) / 2, y: (from.y + end.y) / 2 }, end, 0.0052, 0.0024, false);
    }

    limb(ctx, S, root, bend, tip, 0.013, 0.0036, true);

    for (const spot of spots) {
      const from = at(spot.t);
      const { end, at: centre } = hang(from, spot.dir, spot.stem, spot.r);
      fruit(ctx, S, centre.x, centre.y, spot.r, spot.colour, spot.kind, stemRot(end, centre));
    }
  },
  drawBack(ctx, S) {
    solid(ctx, S, OCHRE);
  },
};

import { PaperDesign } from './types';
import { solid } from './util';

// One rising limb on deep blue. It tapers. One or two side branches leave it,
// curve down, and end in fruit. Each fruit hangs close, on a short stem.
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

/** A flat printed limb. Width tapers. A darker edge sits on one side only. */
function limb(ctx: CanvasRenderingContext2D, S: number, p0: Pt, c: Pt, p1: Pt, w0: number, w1: number) {
  const n = 32;
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = quad(p0, c, p1, t);
    const tan = quadTan(p0, c, p1, t);
    const len = Math.hypot(tan.x, tan.y) || 1;
    const nx = -tan.y / len;
    const ny = tan.x / len;
    const w = w0 + (w1 - w0) * t;
    left.push({ x: p.x + nx * w, y: p.y + ny * w });
    right.push({ x: p.x - nx * w, y: p.y - ny * w });
  }
  const paint = (pts: Pt[], colour: string) => {
    ctx.beginPath();
    ctx.moveTo(S * pts[0].x, S * pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(S * pts[i].x, S * pts[i].y);
    ctx.closePath();
    ctx.fillStyle = colour;
    ctx.fill();
  };
  const shade: Pt[] = left.map((p, i) => {
    const r = right[i];
    return { x: p.x + (p.x - r.x) * 0.1, y: p.y + (p.y - r.y) * 0.1 };
  });
  paint([...shade, ...right.slice().reverse()], BRANCH_EDGE);
  paint([...left, ...right.slice().reverse()], BRANCH);
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
  // Roundish. A little flatten, or a little taller, and no more than that.
  if (kind === 'gold') ctx.scale(1.06, 0.94);
  else if (kind === 'apricot') ctx.scale(0.98, 1.04);
  else ctx.scale(1.03, 0.97);
  const R = S * r;
  ctx.beginPath();
  if (kind === 'gold') {
    // Slightly wide, with a low shoulder on the right.
    ctx.moveTo(0, -R * 0.9);
    ctx.bezierCurveTo(R * 0.58, -R * 0.94, R * 0.98, -R * 0.46, R * 0.96, R * 0.08);
    ctx.bezierCurveTo(R * 0.94, R * 0.58, R * 0.62, R * 1.02, R * 0.08, R * 0.92);
    ctx.bezierCurveTo(-R * 0.48, R * 0.98, -R * 0.98, R * 0.5, -R * 0.94, R * 0.02);
    ctx.bezierCurveTo(-R * 0.9, -R * 0.5, -R * 0.52, -R * 0.96, 0, -R * 0.9);
  } else if (kind === 'apricot') {
    // Nearly round, a little taller, with a small notch at the stem.
    ctx.moveTo(R * 0.1, -R * 0.88);
    ctx.bezierCurveTo(R * 0.58, -R * 0.84, R * 0.98, -R * 0.4, R * 0.94, R * 0.12);
    ctx.bezierCurveTo(R * 0.9, R * 0.64, R * 0.46, R * 1.02, 0, R * 0.96);
    ctx.bezierCurveTo(-R * 0.5, R * 0.9, -R * 0.98, R * 0.42, -R * 0.92, -R * 0.06);
    ctx.bezierCurveTo(-R * 0.86, -R * 0.55, -R * 0.32, -R * 0.98, R * 0.1, -R * 0.88);
  } else {
    // Round, with a flattened shoulder where the calyx sits.
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

export const midnightOrchard: PaperDesign = {
  id: 'midnight-orchard',
  name: 'Midnight orchard',
  note: 'Broad branches and a few warm fruits on deep blue',
  reverse: OCHRE,
  drawFront(ctx, S) {
    solid(ctx, S, GROUND);

    // Canvas +y is down the sheet, so a droop is the way fruit hangs.
    // Side branches are short and thick. The fruit sits against them.
    const root: Pt = { x: 0.31, y: 0.86 };
    const bend: Pt = { x: 0.22, y: 0.56 };
    const tip: Pt = { x: 0.47, y: 0.36 };
    limb(ctx, S, root, bend, tip, 0.034, 0.014);

    const at = (t: number) => quad(root, bend, tip, t);

    // Lower fork: a short curve down into the apricot, still in the skirt.
    const low = at(0.3);
    const apricotEnd: Pt = { x: low.x + 0.032, y: low.y + 0.05 };
    const apricotC: Pt = { x: low.x + 0.006, y: low.y + 0.038 };
    limb(ctx, S, low, apricotC, apricotEnd, 0.022, 0.01);

    // Upper fork, shorter, drooping into the persimmon.
    const mid = at(0.78);
    const persimmonEnd: Pt = { x: mid.x + 0.028, y: mid.y + 0.042 };
    const persimmonC: Pt = { x: mid.x + 0.004, y: mid.y + 0.03 };
    limb(ctx, S, mid, persimmonC, persimmonEnd, 0.018, 0.009);

    // Gold hangs on a short neck under the limb.
    const goldFrom = at(0.52);
    const goldEnd: Pt = { x: goldFrom.x + 0.01, y: goldFrom.y + 0.036 };
    const goldC: Pt = { x: goldFrom.x + 0.002, y: goldFrom.y + 0.024 };
    limb(ctx, S, goldFrom, goldC, goldEnd, 0.015, 0.008);

    // The tip tapers into a short droop and the smaller apricot.
    const tipEnd: Pt = { x: tip.x + 0.008, y: tip.y + 0.03 };
    const tipC: Pt = { x: tip.x + 0.014, y: tip.y + 0.008 };
    limb(ctx, S, tip, tipC, tipEnd, 0.014, 0.008);

    // The notch meets the wood. The stem does not run to the middle of the fruit.
    const seat = (from: Pt, end: Pt, r: number): Pt => {
      const dx = end.x - from.x;
      const dy = end.y - from.y;
      const len = Math.hypot(dx, dy) || 1;
      const reach = r * 0.48;
      return { x: end.x + (dx / len) * reach, y: end.y + (dy / len) * reach };
    };

    const goldAt = seat(goldC, goldEnd, 0.07);
    const persimmonAt = seat(persimmonC, persimmonEnd, 0.056);
    const apricotAt = seat(apricotC, apricotEnd, 0.062);
    const tipAt = seat(tipC, tipEnd, 0.046);

    fruit(ctx, S, goldAt.x, goldAt.y, 0.07, GOLD, 'gold', stemRot(goldEnd, goldAt));
    fruit(ctx, S, persimmonAt.x, persimmonAt.y, 0.056, PERSIMMON, 'persimmon', stemRot(persimmonEnd, persimmonAt));
    fruit(ctx, S, apricotAt.x, apricotAt.y, 0.062, APRICOT, 'apricot', stemRot(apricotEnd, apricotAt));
    fruit(ctx, S, tipAt.x, tipAt.y, 0.046, APRICOT, 'apricot', stemRot(tipEnd, tipAt));
  },
  drawBack(ctx, S) {
    solid(ctx, S, OCHRE);
  },
};

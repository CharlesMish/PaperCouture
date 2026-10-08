// The Paper Couture fit-and-flare dress: a sleeveless bodice that narrows to a
// nipped waist, then a skirt that flares out. Original construction for this
// prototype; no published model is claimed.
//
// Why it needs more than simple folds: at the waist the side of the dress turns
// from "narrowing" to "flaring". A crease that bends like that cannot lie flat
// on its own; it needs two more creases at the bend. Here they are a small
// horizontal pleat across the waist and a short swivel crease in the hidden side
// flap (a "gusset"). Both waist corners are four-crease vertices that satisfy
// Kawasaki's condition (alternate angles sum to 180 degrees), so the whole step
// folds flat and moves rigidly as one mechanism (see collapse.ts).
//
// The gusset closes up toward the edge of the paper, so the pleat must be deep
// enough for the gusset to reach the edge before it closes. Folding the side
// edges in first (step 3) brings that edge closer and keeps the pleat small.
//
// Coordinates are the model coordinates of the state each step applies to,
// as in construction.ts. Step 3 is seen from the back of the dress; the waist
// (step 5) and the shoulders (step 6) are folded from the front.

import type { CollapseCrease, CollapseRegion, CollapseSpec, HalfPlane } from './collapse';
import { Construction } from './construction';
import { Op } from './engine';
import { Vec2, v2 } from './geometry';

export interface FitFlareParams {
  /** Top band folded down for the collar. */
  collar: number;
  /** Width of each side edge folded in before the waist is shaped. */
  edgeFold: number;
  /** Half-width of the bodice at the neckline, before the armholes. */
  shoulder: number;
  /** Half-width at the waist and its height (sheet y). */
  waist: number;
  waistY: number;
  /** Upward tilt of the lower gusset crease, degrees. 0 would be degenerate (see notes). */
  swivel: number;
}

export const DEFAULT_FIT_FLARE: FitFlareParams = {
  collar: 0.2,
  edgeFold: 0.33,
  shoulder: 0.5,
  waist: 0.4,
  waistY: 0.25,
  swivel: -5,
};

const deg = Math.PI / 180;
const dirAt = (a: number) => v2(Math.cos(a), Math.sin(a));
const along = (p: Vec2, a: number, t: number) => v2(p.x + Math.cos(a) * t, p.y + Math.sin(a) * t);
const mirror = (q: Vec2) => v2(-q.x, q.y);

/** Intersection of the lines p + s u and q + t w. */
function meet(p: Vec2, u: Vec2, q: Vec2, w: Vec2): Vec2 {
  const den = u.x * w.y - u.y * w.x;
  const s = ((q.x - p.x) * w.y - (q.y - p.y) * w.x) / den;
  return v2(p.x + u.x * s, p.y + u.y * s);
}

/** Waist geometry, left side, in the model after the side edges are folded in. */
export function fitFlareGeometry(p: FitFlareParams = DEFAULT_FIT_FLARE) {
  const top = 1 - p.collar;
  const edge = 1 - p.edgeFold; // the folded side edge of the stack
  const P = v2(-p.shoulder, top);
  const W1 = v2(-p.waist, p.waistY);
  const corner = v2(-edge, -1); // the skirt's side crease runs to the bottom corner
  const d1 = Math.atan2(p.shoulder - p.waist, top - p.waistY); // bodice narrows by d1
  const kappa = p.swivel * deg;
  const margin = 0.012; // gusset creases meet just beyond the folded edge

  // S, the swivel crease in the pleat, leaves W1 tilted by sigma; the skirt's side
  // flares by d2. Kawasaki at both corners and a clean waist (the skirt side
  // passes the bodice corner) give sigma = d2 - kappa; the pleat length ell is
  // the shortest that lets the gusset creases reach the folded edge.
  let sigma = 15 * deg;
  let ell = 0.1;
  let W2 = W1;
  let d2 = 0;
  for (let it = 0; it < 200; it++) {
    const meetX = (len: number) => {
      const w2 = v2(W1.x + len * Math.sin(sigma), W1.y - len * Math.cos(sigma));
      return meet(W1, dirAt(Math.PI + d1 + sigma), w2, dirAt(Math.PI - kappa)).x;
    };
    let lo = 1e-4;
    let hi = 1;
    for (let k = 0; k < 80; k++) {
      const mid = (lo + hi) / 2;
      if (meetX(mid) > -edge - margin) lo = mid;
      else hi = mid;
    }
    ell = hi;
    W2 = v2(W1.x + ell * Math.sin(sigma), W1.y - ell * Math.cos(sigma));
    d2 = Math.atan2(edge - Math.abs(W2.x), W2.y + 1);
    const next = d2 - kappa;
    if (Math.abs(next - sigma) < 1e-13) break;
    sigma = next;
  }

  const aC1 = Math.PI + d1 + sigma; // upper gusset crease, from W1
  const aC2 = Math.PI - kappa; // lower gusset crease, from W2
  const toEdge = (from: Vec2, a: number) => along(from, a, (from.x + edge) / -Math.cos(a));

  // Fold-angle rates (tan of half the fold angle, relative to the pleat at W1).
  // At each corner the two creases that run nearly straight through it (the
  // pleat) fold together and fastest; the other two (the sides) follow at the
  // rate fixed by the corner's angles.
  const k1 = Math.sin((d1 + sigma) / 2) / Math.cos((d1 - sigma) / 2);
  const k2 = Math.abs(Math.sin(kappa / 2) / Math.cos(sigma + kappa / 2));

  return {
    top, edge, P, W1, W2, corner, d1, d2, sigma, kappa, ell,
    C1end: toEdge(W1, aC1),
    C2end: toEdge(W2, aC2),
    aC1, aC2,
    rates: { pleatTop: 1, sides: k1, pleatBottom: k1 / k2 },
  };
}

export function buildFitFlare(p: FitFlareParams = DEFAULT_FIT_FLARE): Construction {
  const g = fitFlareGeometry(p);
  const { top, edge, P, W1, W2, corner } = g;
  const h1 = W1.y;
  const h2 = W2.y;

  // --- the waist collapse: regions, bodies and creases (left side, mirrored)
  const plane = (a: Vec2, b: Vec2, keep: Vec2): HalfPlane => ({ a, b, keep });
  const bis = (from: Vec2, a: number, b: number) => along(from, (a + b) / 2, 0.03);
  const inPb = v2(0, (top + h1) / 2);
  const inPs = v2(0, (h1 + h2) / 2);
  const inPk = v2(0, -0.5);
  const regions: CollapseRegion[] = [];
  const creases: CollapseCrease[] = [];
  const R = g.rates;
  const split = h1 + 0.5 * (top - h1); // see the bodice flap regions below
  const pace = Math.sqrt(R.sides * R.pleatBottom);

  const sideL = (sx: 1 | -1) => (q: Vec2) => (sx < 0 ? q : mirror(q));
  const pbWhere: HalfPlane[] = [plane(v2(-2, h1), v2(2, h1), inPb)];
  const psWhere: HalfPlane[] = [plane(v2(-2, h1), v2(2, h1), inPs), plane(v2(-2, h2), v2(2, h2), inPs)];
  const pkWhere: HalfPlane[] = [plane(v2(-2, h2), v2(2, h2), inPk)];

  for (const sx of [-1, 1] as const) {
    const m = sideL(sx);
    const s = sx < 0 ? 'left' : 'right';
    const mP = m(P), mW1 = m(W1), mW2 = m(W2), mCorner = m(corner);
    const mC1 = m(g.C1end), mC2 = m(g.C2end);
    pbWhere.push(plane(mP, mW1, inPb));
    psWhere.push(plane(mW1, mW2, inPs));
    pkWhere.push(plane(mW2, mCorner, inPk));

    // points safely inside each flap region (bisectors at the corners)
    const inFb = m(bis(W1, Math.PI / 2 + g.d1, g.aC1));
    const inFbUp = m(v2(P.x - 0.05, top - 0.02));
    const inFs = m(v2((W1.x + W2.x + g.C1end.x + g.C2end.x) / 4, (W1.y + W2.y + g.C1end.y + g.C2end.y) / 4));
    const inFk = m(bis(W2, g.aC2, 1.5 * Math.PI - g.d2));
    regions.push(
      // the bodice flap in two parts, so its upper half can lie low over the
      // few layers at the shoulder instead of riding on the waist's thick stack
      { tag: `side-${s}`, body: `bodice-${s}`, where: [plane(mP, mW1, inFb), plane(mW1, mC1, inFb), plane(v2(-2, split), v2(2, split), inFb)] },
      { tag: `side-${s}`, body: `bodice-${s}`, where: [plane(mP, mW1, inFbUp), plane(v2(-2, split), v2(2, split), inFbUp)] },
      { tag: `gusset-${s}`, body: `gusset-${s}`, where: [plane(mW1, mW2, inFs), plane(mW1, mC1, inFs), plane(mW2, mC2, inFs)] },
      { tag: `skirt-${s}`, body: `skirt-${s}`, where: [plane(mW2, mCorner, inFk), plane(mW2, mC2, inFk)] },
    );
    creases.push(
      { name: `side-${s}`, parent: 'bodice', child: `bodice-${s}`, a: mP, b: mW1, rate: R.sides, sign: -1 },
      { name: `swivel-${s}`, parent: 'pleat', child: `gusset-${s}`, a: mW1, b: mW2, rate: R.sides, sign: 1 },
      { name: `skirt-side-${s}`, parent: 'skirt', child: `skirt-${s}`, a: mW2, b: mCorner, rate: R.sides, sign: -1 },
      { name: `gusset-top-${s}`, parent: `bodice-${s}`, child: `gusset-${s}`, a: mW1, b: mC1, rate: R.pleatTop, sign: -1 },
      { name: `gusset-bottom-${s}`, parent: `gusset-${s}`, child: `skirt-${s}`, a: mW2, b: mC2, rate: R.pleatBottom, sign: 1 },
    );
  }
  regions.unshift(
    { tag: 'bodice', body: 'bodice', where: pbWhere },
    { tag: 'pleat', body: 'pleat', where: psWhere },
    { tag: 'skirt', body: 'skirt', where: pkWhere },
  );
  creases.unshift(
    { name: 'waist-top', parent: 'bodice', child: 'pleat', a: mirror(W1), b: W1, rate: R.pleatTop, sign: -1 },
    { name: 'waist-bottom', parent: 'pleat', child: 'skirt', a: mirror(W2), b: W2, rate: R.pleatBottom, sign: 1 },
  );

  const collapse: CollapseSpec = {
    // the skirt stays on the table: the bodice lifts toward you, pleats and
    // settles back down, while the side flaps fold away behind
    base: 'skirt',
    regions,
    creases,
    groups: { pleat: 0, bodice: 0, 'bodice-left': 1, 'gusset-left': 1, 'skirt-left': 1, 'bodice-right': 2, 'gusset-right': 2, 'skirt-right': 2 },
    pace,
  };

  // the pleat takes up 2 * (h1 - h2); with the skirt fixed, the neckline drops by that
  const neck = top - 2 * (h1 - h2);

  const ops: Op[] = [
    {
      kind: 'fold',
      id: 'collar',
      title: 'Fold the top edge down',
      hint: 'This band becomes the neckline. The reverse colour shows where the paper turns over.',
      folds: [{ name: 'collar', a: v2(-1.5, top), b: v2(1.5, top), moving: v2(0, 1), sense: 'valley' }],
    },
    {
      kind: 'turn',
      id: 'turn-1',
      title: 'Turn the paper over',
      hint: 'The neckline band is underneath now. The rest is shaped from the back.',
    },
    {
      kind: 'fold',
      id: 'edges',
      title: 'Fold both side edges in',
      hint: 'A wide hem on each side. It keeps the waist pleat in the next step small.',
      folds: [
        { name: 'edge-left', a: v2(-edge, -1.5), b: v2(-edge, 1.5), moving: v2(-1, 0), sense: 'valley' },
        { name: 'edge-right', a: v2(edge, -1.5), b: v2(edge, 1.5), moving: v2(1, 0), sense: 'valley' },
      ],
    },
    {
      kind: 'turn',
      id: 'turn-2',
      title: 'Turn the paper over',
      hint: 'Printed side up again. The waist is shaped from the front, so you can watch it form.',
    },
    {
      kind: 'collapse',
      id: 'waist',
      title: 'Fold the sides behind and pleat the waist',
      hint: 'One move: the sides fold behind, and a small pleat across the waist lets each side bend, in to the waist and out below it.',
      collapse,
    },
    {
      kind: 'fold',
      id: 'shoulders',
      title: 'Tuck the shoulder points behind',
      hint: 'The side flaps peek above the neckline at each shoulder. Fold those points down behind: a nipped waist and a full skirt, from one uncut square.',
      folds: [
        { name: 'shoulder-left', a: v2(-1.5, neck), b: v2(0, neck), moving: v2(-0.4, neck + 0.1), sense: 'mountain', only: 'side-left' },
        { name: 'shoulder-right', a: v2(0, neck), b: v2(1.5, neck), moving: v2(0.4, neck + 0.1), sense: 'mountain', only: 'side-right' },
      ],
    },
  ];

  return { name: 'Fit-and-flare dress', ops, meta: { top, shoulderPoint: P, sleeveCutDir: v2(0, -1) } };
}

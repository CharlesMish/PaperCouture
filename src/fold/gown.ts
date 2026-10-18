// The Paper Couture one-shoulder gown: a floor-length column with an empire waist,
// a single shoulder, a sash of the paper's other side sweeping from that shoulder
// across the bodice to the opposite side seam, one cap sleeve, and a contrast hem
// band, from one uncut square. Original construction for this prototype; no
// published model is claimed.
//
// Why it is built this way. A gown wants length and a narrow body, which on a
// square means the side edges fold to the centre (a cupboard fold: the body is
// half the sheet wide, and the folded halves become the gown's back) and as little
// paper as possible goes into the waist. A full skirt is not available that way:
// in the fit-and-flare mechanism the pleat across the body has to take up the
// whole difference between bodice and hem, and a ball-gown flare needs a pleat
// over half the sheet deep (and a mermaid a pleat across the knees). So the
// silhouette is a column that widens gently (10 degrees each side), and the
// ambition goes into the neckline instead, where folding is cheap.
//
// The neckline is one straight fold. The sheet's top-left corner folds down
// across the bodice along a line from the left edge to a point on the top edge
// right of centre; everything above that line becomes the sash, showing the
// other side of the paper, and the line itself becomes an asymmetric neckline
// from the left underarm up to the right shoulder. The right shoulder keeps the
// sheet's full height. A corner that large would hang its tip past the waist,
// into the waist pleat and its gussets (up to 23 layers at the waist corner), so
// the tip is folded in first, along a 45 degree line that meets the sash's fold
// on the left edge: the sash then ends just above the waist on the left side
// seam and the folded tip lies hidden under it, beyond the side seam.
//
// The waist is the fit-and-flare's mechanism (a pleat across the body and a
// hidden gusset each side, see fitFlare.ts) at an empire height, with the same
// scan-and-bisection solve as the coat-dress. Its side creases run up to the
// sheet's top edge, so the body behind the low side would show above the
// neckline; one flap fold tucks that corner behind along the sash's line. On the
// high side, the part of the side flap above the shoulder folds out behind as a
// cap sleeve.
//
// Colour comes only from folding: the sash and the hem band are folded once, the
// body not at all, so they always show opposite sides of the paper. The colour
// choice turns the sheet over first; every later fold is the same, in the same
// place, so both colourways have the same shape.

import type { CollapseCrease, CollapseRegion, CollapseSpec, HalfPlane } from './collapse';
import type { Construction } from './construction';
import { FoldError, FoldSpec, Op } from './engine';
import { Vec2, v2 } from './geometry';

export type GownSide = 'print' | 'reverse';

export interface GownParams {
  /** Half-width of the bodice at the top (sheet units; the sheet is [-1, 1]^2). */
  bust: number;
  /** Half-width at the empire waist, where the waist pleat starts. */
  waist: number;
  /** Height of the waist (top of the waist pleat), sheet y. */
  waistY: number;
  /** Tilt of the lower gusset crease (see fitFlare.ts); keep it negative. */
  swivel: number;
  /** Width of each folded-in side panel; 0.5 brings both edges to the centre. */
  edgeFold: number;
  /** Depth of the hem band. */
  hem: number;
  /** Where the sash's fold meets the left edge (sheet y). */
  drapeLeft: number;
  /** Where the sash's fold meets the top edge (sheet x); the right shoulder is beyond it. */
  drapeTop: number;
  /** Direction of the cap sleeve's fold from the shoulder point, degrees below horizontal. */
  sleeve: number;
  /** Which side of the paper the gown shows (the sash and hem band show the other). */
  side: GownSide;
}

export const DEFAULT_GOWN: GownParams = {
  bust: 0.3,
  waist: 0.27,
  waistY: 0.45,
  swivel: -5,
  edgeFold: 0.5,
  hem: 0.07,
  drapeLeft: 0.52,
  drapeTop: 0.25,
  sleeve: 54,
  side: 'print',
};

const deg = Math.PI / 180;
const mirror = (q: Vec2) => v2(-q.x, q.y);
const along = (p: Vec2, a: number, t: number) => v2(p.x + Math.cos(a) * t, p.y + Math.sin(a) * t);
const dirAt = (a: number) => v2(Math.cos(a), Math.sin(a));
const plane = (a: Vec2, b: Vec2, keep: Vec2): HalfPlane => ({ a, b, keep });
/** Intersection of the lines p + s u and q + t w. */
function meet(p: Vec2, u: Vec2, q: Vec2, w: Vec2): Vec2 {
  const den = u.x * w.y - u.y * w.x;
  const s = ((q.x - p.x) * w.y - (q.y - p.y) * w.x) / den;
  return v2(p.x + u.x * s, p.y + u.y * s);
}
/** Reflection of p across the line through a and b. */
export function reflect(p: Vec2, a: Vec2, b: Vec2): Vec2 {
  const dx = b.x - a.x, dy = b.y - a.y, n = Math.hypot(dx, dy);
  const ux = dx / n, uy = dy / n, rx = p.x - a.x, ry = p.y - a.y;
  const t = rx * ux + ry * uy;
  return v2(a.x + 2 * t * ux - rx, a.y + 2 * t * uy - ry);
}

/** Left-side geometry in the model as the waist collapses (print side toward you). */
export function gownGeometry(p: GownParams = DEFAULT_GOWN) {
  const edge = 1 - p.edgeFold;
  if (edge < 0 || edge > 2 * p.waist + 1e-9) {
    throw new FoldError('gown: the folded-in sides must not cross the centre behind the waist (edgeFold too small or waist too narrow)');
  }
  const top = 1;
  const P = v2(-p.bust, top), W1 = v2(-p.waist, p.waistY), corner = v2(-edge, -1);
  const d1 = Math.atan2(Math.abs(P.x) - Math.abs(W1.x), P.y - W1.y);
  const kappa = p.swivel * deg;
  const margin = 0.012;
  // fitFlareGeometry's solve: for a swivel tilt sigma the pleat length is the
  // shortest that lets both gusset creases reach the folded edge before they
  // meet; Kawasaki at both waist corners needs sigma = d2 - kappa. Scan for the
  // first sign change, then bisect: the shallowest pleat that closes.
  const solve = (sigma: number) => {
    const beyond = (len: number) => {
      const w2 = v2(W1.x + len * Math.sin(sigma), W1.y - len * Math.cos(sigma));
      const M = meet(W1, dirAt(Math.PI + d1 + sigma), w2, dirAt(Math.PI - kappa));
      return M.x < -edge - margin;
    };
    let lo = 1e-4, hi = 1;
    for (let k = 0; k < 80; k++) {
      const mid = (lo + hi) / 2;
      if (beyond(mid)) hi = mid;
      else lo = mid;
    }
    const W2 = v2(W1.x + hi * Math.sin(sigma), W1.y - hi * Math.cos(sigma));
    const d2 = Math.atan2(Math.abs(corner.x) - Math.abs(W2.x), W2.y + 1);
    return { ell: hi, W2, d2, residual: d2 - kappa - sigma };
  };
  let sLo = 0.5 * deg, sHi = 0;
  const sign0 = Math.sign(solve(sLo).residual);
  for (let a = 1; a <= 60; a += 0.5) {
    if (Math.sign(solve(a * deg).residual) !== sign0) { sHi = a * deg; break; }
    sLo = a * deg;
  }
  if (!sHi) throw new FoldError('gown: no waist pleat closes for these proportions');
  for (let k = 0; k < 100; k++) {
    const mid = (sLo + sHi) / 2;
    if (Math.sign(solve(mid).residual) === sign0) sLo = mid;
    else sHi = mid;
  }
  const sigma = (sLo + sHi) / 2;
  const { ell, W2, d2 } = solve(sigma);
  const aC1 = Math.PI + d1 + sigma, aC2 = Math.PI - kappa;
  const toEdge = (from: Vec2, a: number) => along(from, a, (from.x + edge) / -Math.cos(a));
  const k1 = Math.sin((d1 + sigma) / 2) / Math.cos((d1 - sigma) / 2);
  const k2 = Math.abs(Math.sin(kappa / 2) / Math.cos(sigma + kappa / 2));
  const pleat = W1.y - W2.y;

  // the neckline: the sash fold, the 45 degree tip fold meeting it on the left edge
  const drapeA = v2(-1, p.drapeLeft), drapeB = v2(p.drapeTop, 1);
  const tip = 1 - p.drapeLeft;
  const tipA = v2(-1, 1 - tip), tipB = v2(-1 + tip, 1);
  // where the sash ends: the folded tip's top corner, reflected by the sash fold
  const sashEnd = reflect(tipB, drapeA, drapeB);
  // the finished right shoulder point (the bodice drops by twice the pleat)
  const shoulder = v2(p.bust, top - 2 * pleat);
  return {
    top, edge, P, W1, W2, corner, d1, d2, sigma, kappa, ell, aC1, aC2, pleat,
    C1end: toEdge(W1, aC1), C2end: toEdge(W2, aC2),
    rates: { pleatTop: 1, sides: k1, pleatBottom: k1 / k2 },
    drapeA, drapeB, tipA, tipB, sashEnd, shoulder,
  };
}

/** The empire waist: the fit-and-flare collapse, with its side creases up to the top edge. */
export function gownWaistSpec(p: GownParams = DEFAULT_GOWN): CollapseSpec {
  const g = gownGeometry(p);
  const { top, P, W1, W2, corner } = g;
  const h1 = W1.y, h2 = W2.y;
  const bis = (from: Vec2, a: number, b: number) => along(from, (a + b) / 2, 0.03);
  const inPb = v2(0, (top + h1) / 2), inPs = v2(0, (h1 + h2) / 2), inPk = v2(0, (h2 - 1) / 2);
  const R = g.rates;
  const regions: CollapseRegion[] = [];
  const creases: CollapseCrease[] = [];
  const pbWhere: HalfPlane[] = [plane(v2(-2, h1), v2(2, h1), inPb)];
  const psWhere: HalfPlane[] = [plane(v2(-2, h1), v2(2, h1), inPs), plane(v2(-2, h2), v2(2, h2), inPs)];
  const pkWhere: HalfPlane[] = [plane(v2(-2, h2), v2(2, h2), inPk)];
  for (const sx of [-1, 1] as const) {
    const m = (q: Vec2) => (sx < 0 ? q : mirror(q));
    const s = sx < 0 ? 'left' : 'right';
    const mP = m(P), mW1 = m(W1), mW2 = m(W2), mC = m(corner), mC1 = m(g.C1end), mC2 = m(g.C2end);
    pbWhere.push(plane(mP, mW1, inPb));
    psWhere.push(plane(mW1, mW2, inPs));
    pkWhere.push(plane(mW2, mC, inPk));
    const inFb = m(bis(W1, Math.PI / 2 + g.d1, g.aC1));
    const inFs = m(v2((W1.x + W2.x + g.C1end.x + g.C2end.x) / 4, (W1.y + W2.y + g.C1end.y + g.C2end.y) / 4));
    const inFk = m(bis(W2, g.aC2, 1.5 * Math.PI - g.d2));
    regions.push(
      { tag: `side-${s}`, body: `bodice-${s}`, where: [plane(mP, mW1, inFb), plane(mW1, mC1, inFb)] },
      { tag: `gusset-${s}`, body: `gusset-${s}`, where: [plane(mW1, mW2, inFs), plane(mW1, mC1, inFs), plane(mW2, mC2, inFs)] },
      { tag: `skirt-${s}`, body: `skirt-${s}`, where: [plane(mW2, mC, inFk), plane(mW2, mC2, inFk)] },
    );
    creases.push(
      { name: `side-${s}`, parent: 'bodice', child: `bodice-${s}`, a: mP, b: mW1, rate: R.sides, sign: -1 },
      { name: `swivel-${s}`, parent: 'pleat', child: `gusset-${s}`, a: mW1, b: mW2, rate: R.sides, sign: 1 },
      { name: `skirt-side-${s}`, parent: 'skirt', child: `skirt-${s}`, a: mW2, b: mC, rate: R.sides, sign: -1 },
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
  return {
    base: 'skirt',
    regions,
    creases,
    groups: { pleat: 0, bodice: 0, 'bodice-left': 1, 'gusset-left': 1, 'skirt-left': 1, 'bodice-right': 2, 'gusset-right': 2, 'skirt-right': 2 },
    pace: Math.sqrt(R.sides * R.pleatBottom),
  };
}

export function buildGown(p: GownParams = DEFAULT_GOWN): Construction {
  const g = gownGeometry(p);
  const e = g.edge;
  const print = p.side === 'print';
  const other = print ? 'the reverse colour' : 'the print';
  const sleeveDir = v2(-Math.cos(p.sleeve * deg), -Math.sin(p.sleeve * deg));
  const S = g.shoulder;
  const sleeve: FoldSpec = {
    name: 'sleeve', a: S, b: v2(S.x + sleeveDir.x, S.y + sleeveDir.y), moving: v2(S.x - 0.12, S.y - 0.01), sense: 'mountain', only: 'side-right',
  };
  // Both colourways start with the hem band, so the colour choice is offered at
  // the very first fold; the reverse-colour gown folds it behind and turns over,
  // which leaves the paper exactly as if it had started print side down.
  const ops: Op[] = [
    {
      kind: 'fold', id: 'hem', title: print ? 'Fold up the hem band' : 'Fold the hem band behind',
      hint: print
        ? 'Print side up. Fold the bottom edge up toward you by a narrow band (3.5% of the side). It becomes the hem band, in the reverse colour.'
        : 'Print side up. Fold the bottom edge behind by a narrow band (3.5% of the side). It becomes the printed hem band of a reverse-colour gown.',
      folds: [{ name: 'hem', a: v2(1.5, -1 + p.hem), b: v2(-1.5, -1 + p.hem), moving: v2(0, -1), sense: print ? 'valley' : 'mountain' }],
    },
  ];
  if (!print) ops.push({ kind: 'turn', id: 'turn-0', title: 'Turn over', hint: 'Reverse side up: the rest of the gown is folded on this side.' });
  ops.push(
    {
      kind: 'fold', id: 'tip', title: 'Fold the corner tip in',
      hint: 'Fold the top-left corner down at 45 degrees. It will hide under the sash and stops the sash just above the waist.',
      folds: [{ name: 'tip', a: g.tipA, b: g.tipB, moving: v2(-1, 1), sense: 'valley' }],
    },
    {
      kind: 'fold', id: 'sash', title: 'Fold the sash down',
      hint: `From the end of the last crease on the left edge to a point on the top edge right of centre: the corner folds down across the bodice as the sash, in ${other}. The crease is the neckline, low on the left and rising to the right shoulder.`,
      folds: [{ name: 'sash', a: g.drapeA, b: g.drapeB, moving: v2(-1, 1), sense: 'valley' }],
    },
    { kind: 'turn', id: 'turn-1', title: 'Turn over', hint: '' },
    {
      kind: 'fold', id: 'sides', title: 'Fold both sides to the centre',
      hint: 'A cupboard fold: both side edges meet on the vertical centre line. These panels become the back of the gown.',
      folds: [
        { name: 'panel-right', a: v2(-e, -1.5), b: v2(-e, 1.5), moving: v2(-1, 0), sense: 'valley' },
        { name: 'panel-left', a: v2(e, -1.5), b: v2(e, 1.5), moving: v2(1, 0), sense: 'valley' },
      ],
    },
    { kind: 'turn', id: 'turn-2', title: 'Turn over', hint: '' },
    {
      kind: 'fold', id: 'tuck', title: 'Tuck the back panel behind the neckline',
      hint: 'On the low side of the neckline the back panel shows above it. Fold that corner of the back panel down behind, along the neckline.',
      folds: [{ name: 'tuck', a: g.drapeA, b: g.drapeB, moving: v2(p.drapeTop - 0.05, 0.999), sense: 'mountain', only: 'panel-right' }],
    },
    {
      kind: 'collapse', id: 'waist', title: 'Pleat the empire waist',
      hint: 'The fit-and-flare waist, high under the bust: a pleat across the body and a hidden gusset each side, with the sides folding behind. The skirt widens gently to the hem.',
      collapse: gownWaistSpec(p),
    },
    {
      kind: 'fold', id: 'sleeve', title: 'Fold out the cap sleeve',
      hint: 'Behind the right shoulder, the top of the side flap folds out past the shoulder as a single cap sleeve.',
      folds: [sleeve],
    },
  );
  return { name: print ? 'One-shoulder gown' : 'One-shoulder gown, reverse colour', ops, meta: { top: g.top, shoulderPoint: g.P, sleeveCutDir: v2(0, -1) } };
}

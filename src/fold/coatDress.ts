// The Paper Couture coat-dress: a pointed sailor collar in front that becomes a
// square cape across the back, fronts that meet under the collar and open into a
// contrast underskirt, short sleeves under the collar, a nipped waist and a
// flared skirt, from one uncut square. Original construction for this prototype;
// no published model is claimed.
//
// Why it is built this way. A square has four free corners. A gate-fold coat
// front has exactly one of them at the neck, which can become a lapel or a
// sleeve but not both (the lapel vest and the box jacket each pick one). Here
// neither the collar nor the sleeves come from a corner. One rigid step does both
// shoulders: at each shoulder point V four creases meet,
//
//   the shoulder line (horizontal, across the back),
//   the side seam (down, leaning out by `flare` so the skirt can widen),
//   the collar's upper crease (at `collar` degrees from the shoulder line), and
//   the collar's lower crease, which becomes the V of the neckline.
//
// Counter-clockwise from the shoulder line the sectors at V are: back yoke and
// sleeve (collar deg), collar wedge (90 - flare), front (180 - collar), back
// (90 + flare). Opposite sectors sum to 180 degrees (Kawasaki), so the vertex
// folds flat and moves rigidly with one degree of freedom; its fold-angle rates
// are fixed by the sector angles (shoulderRate). In that one move the fronts
// fold in across the side seams, the strip above the shoulders folds down behind
// as the back yoke, and the wedge between them turns through the shoulder and
// lies over it as the collar. The outer part of the strip above each shoulder
// (beyond the side seam) comes down with the yoke as a short sleeve under the
// collar. Because the collar wedge is fixed at 90 - flare degrees, the sleeve's
// angle below horizontal and the V's angle add up to that wedge: a steeper V
// means flatter sleeves.
//
// The waist is the fit-and-flare's mechanism (a pleat across the body and a
// hidden gusset each side, see fitFlare.ts), solved here against the leaning
// side seam, with its side creases starting just below the collar and sleeves
// so those never fold with them.
//
// Colour comes only from which way each piece of paper faces: the fronts are
// folded once and the collar, back yoke and underskirt are folded an even number
// of times, so the coat and its collar always show opposite sides of the paper.
// The coat side choice decides which: a printed coat with a reverse-colour
// collar and underskirt, or a reverse-colour coat with the print in the collar,
// underskirt and back yoke. The second is folded with both collapses mirrored,
// worked from the back, and revealed with a final turn.

import type { CollapseCrease, CollapseRegion, CollapseSpec, HalfPlane } from './collapse';
import type { Construction } from './construction';
import { FoldError, Op } from './engine';
import { Vec2, v2 } from './geometry';
import { cm, lineMeet } from './measure';

export type CoatSide = 'print' | 'reverse';

export interface CoatDressParams {
  /** Half-width of the body at the shoulder: the shoulder points are at x = +-hinge. */
  hinge: number;
  /** Outward lean of the side seams below the shoulder, degrees. Widens the skirt. */
  flare: number;
  /** Height of the shoulder line (sheet y). Paper above it becomes yoke and sleeves. */
  shoulder: number;
  /** Direction of the collar's upper crease from the shoulder point, degrees (90..180). */
  collar: number;
  /** How far the waist pulls in from the side seam (at the top of the waist's side creases). */
  waistNip: number;
  /** How far the waist sits below the top of its side creases. */
  waistDrop: number;
  /** Tilt of the lower gusset crease (see fitFlare.ts); keep it negative. */
  swivel: number;
  /** Clearance between the sleeves/collar and the top of the waist's side creases. */
  clearance: number;
  /** Which side of the paper the coat shows. */
  coat: CoatSide;
}

export const DEFAULT_COAT_DRESS: CoatDressParams = {
  hinge: 0.5,
  flare: 5,
  shoulder: 0.6,
  collar: 120,
  waistNip: 0.07,
  waistDrop: 0.2,
  swivel: -5,
  clearance: 0.02,
  coat: 'reverse',
};

const deg = Math.PI / 180;
const mirror = (q: Vec2) => v2(-q.x, q.y);
const at = (p: Vec2, a: number, t: number) => v2(p.x + Math.cos(a * deg) * t, p.y + Math.sin(a * deg) * t);
const along = (p: Vec2, a: number, t: number) => v2(p.x + Math.cos(a) * t, p.y + Math.sin(a) * t);
const dirAt = (a: number) => v2(Math.cos(a), Math.sin(a));
const plane = (a: Vec2, b: Vec2, keep: Vec2): HalfPlane => ({ a, b, keep });
const rotate = (p: Vec2, c: Vec2, a: number) => {
  const ca = Math.cos(a * deg), sa = Math.sin(a * deg);
  const x = p.x - c.x, y = p.y - c.y;
  return v2(c.x + ca * x - sa * y, c.y + sa * x + ca * y);
};
/** Intersection of the lines p + s u and q + t w. */
function meet(p: Vec2, u: Vec2, q: Vec2, w: Vec2): Vec2 {
  const den = u.x * w.y - u.y * w.x;
  const s = ((q.x - p.x) * w.y - (q.y - p.y) * w.x) / den;
  return v2(p.x + u.x * s, p.y + u.y * s);
}

/**
 * Fold-angle rate of the shoulder line and the collar's lower crease relative to
 * the side seam and the collar's upper crease (tan of half the fold angle). For a
 * flat-foldable degree-4 vertex with consecutive sectors a, b, on the branch used
 * here (the yoke folds away from the fronts), it is
 * |cos((a - b) / 2) / cos((a + b) / 2)| with a = collar and b = 90 - flare.
 */
export function shoulderRate(p: Pick<CoatDressParams, 'collar' | 'flare'>): number {
  const a = p.collar * deg, b = (90 - p.flare) * deg;
  return Math.abs(Math.cos((a - b) / 2) / Math.cos((a + b) / 2));
}

/** Left-side geometry, in the model after the first turn-over. */
export function coatDressGeometry(p: CoatDressParams = DEFAULT_COAT_DRESS) {
  const V = v2(-p.hinge, p.shoulder);
  const c1 = p.collar;
  const c2 = c1 + 90 - p.flare;
  const seamDir = 270 - p.flare;
  const tanF = Math.tan(p.flare * deg);
  /** x of the left side seam (the folded edge of the body) at height y, below V. */
  const seamX = (y: number) => V.x - tanF * (V.y - y);

  // The collar wedge turns through -2 * collar about V (two reflections: the
  // shoulder line, then its upper crease); the yoke and sleeves are reflected
  // across the shoulder line, so the sheet's top edge lands at 2s - 1.
  const ray = (a: number) => {
    const d = v2(Math.cos(a * deg), Math.sin(a * deg));
    let t = (-1 - V.x) / d.x;
    if (V.y + d.y * t > 1) t = (1 - V.y) / d.y;
    return v2(V.x + d.x * t, V.y + d.y * t);
  };
  const X1 = ray(c1);
  const X2 = ray(c2);
  const collarPts = [X1, X2, v2(-1, Math.min(1, X1.y)), v2(-1, X2.y)];
  const collarLow = Math.min(...collarPts.map((q) => rotate(q, V, -2 * c1).y));
  const sleeveLow = 2 * p.shoulder - 1;
  const yA = Math.min(collarLow, sleeveLow) - p.clearance;
  const A = v2(seamX(yA), yA);

  // --- the waist: fitFlareGeometry's solve, against the leaning seam.
  // For a swivel tilt sigma, the pleat length ell is the shortest that lets the
  // two gusset creases reach the seam before they meet; the skirt's side crease
  // then runs from W2 to the hem corner at d2 from vertical, and Kawasaki at both
  // waist corners needs sigma = d2 - kappa. The shallowest such pleat is found by
  // a scan and bisection (a plain iteration oscillates once the seam leans out).
  const W1 = v2(A.x + p.waistNip, yA - p.waistDrop);
  const corner = v2(seamX(-1), -1);
  const d1 = Math.atan2(Math.abs(A.x) - Math.abs(W1.x), A.y - W1.y);
  const kappa = p.swivel * deg;
  const margin = 0.012;
  const solve = (sigma: number) => {
    const beyondSeam = (len: number) => {
      const w2 = v2(W1.x + len * Math.sin(sigma), W1.y - len * Math.cos(sigma));
      const M = meet(W1, dirAt(Math.PI + d1 + sigma), w2, dirAt(Math.PI - kappa));
      return M.x < seamX(M.y) - margin;
    };
    let lo = 1e-4;
    let hi = 1;
    for (let k = 0; k < 80; k++) {
      const mid = (lo + hi) / 2;
      if (beyondSeam(mid)) hi = mid;
      else lo = mid;
    }
    const ell = hi;
    const W2 = v2(W1.x + ell * Math.sin(sigma), W1.y - ell * Math.cos(sigma));
    const d2 = Math.atan2(Math.abs(corner.x) - Math.abs(W2.x), W2.y + 1);
    return { ell, W2, d2, residual: d2 - kappa - sigma };
  };
  let sLo = 0.5 * deg;
  let sHi = sLo;
  const sign0 = Math.sign(solve(sLo).residual);
  for (let a = 1; a <= 60; a += 0.5) {
    if (Math.sign(solve(a * deg).residual) !== sign0) { sHi = a * deg; break; }
    sLo = a * deg;
  }
  if (sHi === 0.5 * deg) {
    throw new FoldError('coat-dress: no waist pleat closes for these proportions (reduce the nip or the flare)');
  }
  for (let k = 0; k < 100; k++) {
    const mid = (sLo + sHi) / 2;
    if (Math.sign(solve(mid).residual) === sign0) sLo = mid;
    else sHi = mid;
  }
  const sigma = (sLo + sHi) / 2;
  const { ell, W2, d2 } = solve(sigma);
  const aC1 = Math.PI + d1 + sigma;
  const aC2 = Math.PI - kappa;
  const toSeam = (from: Vec2, a: number) => {
    // from + t (cos a, sin a) on x = V.x - tanF (V.y - y)
    const t = (V.x - tanF * V.y + tanF * from.y - from.x) / (Math.cos(a) - tanF * Math.sin(a));
    return along(from, a, t);
  };
  const k1 = Math.sin((d1 + sigma) / 2) / Math.cos((d1 - sigma) / 2);
  const k2 = Math.abs(Math.sin(kappa / 2) / Math.cos(sigma + kappa / 2));
  return {
    V, c1, c2, seamDir, seamX, X1, X2, collarLow, sleeveLow,
    A, yA, W1, W2, corner, d1, d2, sigma, kappa, ell, aC1, aC2,
    C1end: toSeam(W1, aC1),
    C2end: toSeam(W2, aC2),
    rates: { pleatTop: 1, sides: k1, pleatBottom: k1 / k2 },
  };
}

/** Folded from the back instead: every crease turns the other way. */
function mirrored(spec: CollapseSpec): CollapseSpec {
  return { ...spec, creases: spec.creases.map((c) => ({ ...c, sign: (-c.sign) as 1 | -1 })) };
}

export function coatShoulderSpec(p: CoatDressParams = DEFAULT_COAT_DRESS): CollapseSpec {
  const g = coatDressGeometry(p);
  const { V, c1, c2, seamDir } = g;
  const s = V.y;
  const rate = shoulderRate(p);
  const H = at(V, seamDir, 4);
  const inBack = v2(0, s - 0.5);
  const regions: CollapseRegion[] = [
    { tag: 'back', body: 'back', where: [plane(v2(-2, s), v2(2, s), inBack), plane(V, H, inBack), plane(mirror(V), mirror(H), inBack)] },
    { tag: 'yoke', body: 'upper', where: [plane(v2(-2, s), v2(2, s), v2(0, s + 1)), plane(V, v2(V.x, 2), v2(0, 1)), plane(mirror(V), v2(-V.x, 2), v2(0, 1))] },
  ];
  const creases: CollapseCrease[] = [
    // the shoulder line: the yoke folds down behind the back
    { name: 'shoulder', parent: 'back', child: 'upper', a: V, b: mirror(V), rate, sign: -1 },
  ];
  for (const sx of [-1, 1] as const) {
    const m = (q: Vec2) => (sx < 0 ? q : mirror(q));
    const side = sx < 0 ? 'left' : 'right';
    const mV = m(V);
    const L1 = m(at(V, c1, 4));
    const L2 = m(at(V, c2, 4));
    const inS = m(at(V, (90 + c1) / 2, 0.05));
    const inW = m(at(V, (c1 + c2) / 2, 0.05));
    const inF = m(at(V, (c2 + seamDir) / 2, 0.05));
    regions.push(
      { tag: `sleeve-${side}`, body: 'upper', where: [plane(mV, m(v2(V.x, 2)), inS), plane(mV, L1, inS)] },
      { tag: `collar-${side}`, body: `collar-${side}`, where: [plane(mV, L1, inW), plane(mV, L2, inW)] },
      { tag: `front-${side}`, body: `front-${side}`, where: [plane(mV, L2, inF), plane(mV, m(H), inF)] },
    );
    creases.push(
      { name: `side-seam-${side}`, parent: 'back', child: `front-${side}`, a: mV, b: m(at(V, seamDir, 1.8)), rate: 1, sign: 1 },
      { name: `collar-top-${side}`, parent: 'upper', child: `collar-${side}`, a: mV, b: L1, rate: 1, sign: -1 },
      { name: `collar-neck-${side}`, parent: `collar-${side}`, child: `front-${side}`, a: mV, b: L2, rate, sign: -1 },
    );
  }
  const spec: CollapseSpec = {
    base: 'back',
    regions,
    creases,
    groups: { upper: 0, 'collar-left': 1, 'front-left': 1, 'collar-right': 2, 'front-right': 2 },
    pace: Math.sqrt(rate),
  };
  return p.coat === 'print' ? spec : mirrored(spec);
}

export function coatWaistSpec(p: CoatDressParams = DEFAULT_COAT_DRESS): CollapseSpec {
  const g = coatDressGeometry(p);
  const { A, W1, W2, corner, yA } = g;
  const h1 = W1.y, h2 = W2.y;
  const bis = (from: Vec2, a: number, b: number) => along(from, (a + b) / 2, 0.03);
  const inPb = v2(0, (yA + h1) / 2), inPs = v2(0, (h1 + h2) / 2), inPk = v2(0, (h2 - 1) / 2);
  const R = g.rates;
  const regions: CollapseRegion[] = [];
  const creases: CollapseCrease[] = [];
  const pbWhere: HalfPlane[] = [plane(v2(-2, h1), v2(2, h1), inPb), plane(v2(-2, yA), v2(2, yA), inPb)];
  const psWhere: HalfPlane[] = [plane(v2(-2, h1), v2(2, h1), inPs), plane(v2(-2, h2), v2(2, h2), inPs)];
  const pkWhere: HalfPlane[] = [plane(v2(-2, h2), v2(2, h2), inPk)];
  for (const sx of [-1, 1] as const) {
    const m = (q: Vec2) => (sx < 0 ? q : mirror(q));
    const s = sx < 0 ? 'left' : 'right';
    const mA = m(A), mW1 = m(W1), mW2 = m(W2), mCorner = m(corner), mC1 = m(g.C1end), mC2 = m(g.C2end);
    pbWhere.push(plane(mA, mW1, inPb));
    psWhere.push(plane(mW1, mW2, inPs));
    pkWhere.push(plane(mW2, mCorner, inPk));
    const inFb = m(bis(W1, Math.PI / 2 + g.d1, g.aC1));
    const inFs = m(v2((W1.x + W2.x + g.C1end.x + g.C2end.x) / 4, (W1.y + W2.y + g.C1end.y + g.C2end.y) / 4));
    const inFk = m(bis(W2, g.aC2, 1.5 * Math.PI - g.d2));
    regions.push(
      { tag: `waist-side-${s}`, body: `bodice-${s}`, where: [plane(mA, mW1, inFb), plane(mW1, mC1, inFb), plane(v2(-2, yA), v2(2, yA), inFb)] },
      { tag: `gusset-${s}`, body: `gusset-${s}`, where: [plane(mW1, mW2, inFs), plane(mW1, mC1, inFs), plane(mW2, mC2, inFs)] },
      { tag: `skirt-${s}`, body: `skirt-${s}`, where: [plane(mW2, mCorner, inFk), plane(mW2, mC2, inFk)] },
    );
    creases.push(
      { name: `waist-side-${s}`, parent: 'bodice', child: `bodice-${s}`, a: mA, b: mW1, rate: R.sides, sign: -1 },
      { name: `swivel-${s}`, parent: 'pleat', child: `gusset-${s}`, a: mW1, b: mW2, rate: R.sides, sign: 1 },
      { name: `skirt-side-${s}`, parent: 'skirt', child: `skirt-${s}`, a: mW2, b: mCorner, rate: R.sides, sign: -1 },
      { name: `gusset-top-${s}`, parent: `bodice-${s}`, child: `gusset-${s}`, a: mW1, b: mC1, rate: R.pleatTop, sign: -1 },
      { name: `gusset-bottom-${s}`, parent: `gusset-${s}`, child: `skirt-${s}`, a: mW2, b: mC2, rate: R.pleatBottom, sign: 1 },
    );
  }
  regions.unshift(
    // everything above the side creases' top (sleeves, collar, yoke) rides with the bodice
    { tag: 'upper-body', body: 'bodice', where: [plane(v2(-2, yA), v2(2, yA), v2(0, yA + 1))] },
    { tag: 'bodice', body: 'bodice', where: pbWhere },
    { tag: 'pleat', body: 'pleat', where: psWhere },
    { tag: 'skirt', body: 'skirt', where: pkWhere },
  );
  creases.unshift(
    { name: 'waist-top', parent: 'bodice', child: 'pleat', a: mirror(W1), b: W1, rate: R.pleatTop, sign: -1 },
    { name: 'waist-bottom', parent: 'pleat', child: 'skirt', a: mirror(W2), b: W2, rate: R.pleatBottom, sign: 1 },
  );
  const spec: CollapseSpec = {
    base: 'skirt',
    regions,
    creases,
    groups: { pleat: 0, bodice: 0, 'bodice-left': 1, 'gusset-left': 1, 'skirt-left': 1, 'bodice-right': 2, 'gusset-right': 2, 'skirt-right': 2 },
    pace: Math.sqrt(R.sides * R.pleatBottom),
  };
  return p.coat === 'print' ? spec : mirrored(spec);
}

/** Where a crease from a shoulder point leaves the sheet, for the instructions. */
const edgeEnd = (q: Vec2) => (q.y > 1 - 1e-9 ? `the top edge ${cm(1 + q.x)} in from the side` : `the side edge ${cm(1 - q.y)} below the top`);

/** The two collapses' creases as a folder finds them, from the same numbers that place them. */
function coatInstructions(p: CoatDressParams) {
  const g = coatDressGeometry(p);
  const { V } = g;
  const points = Math.abs(p.hinge - 0.5) < 1e-9
    ? 'halfway between each side edge and the centre line'
    : `${cm(1 - p.hinge)} in from each side edge`;
  const creases = `1. Crease the shoulder line between the two shoulder points, ${cm(1 - V.y)} below the top edge and ${points}. `
    + `2. From each shoulder point crease three lines: the side seam, down to the bottom edge ${cm(1 + g.seamX(-1))} in from the side; `
    + `the top of the collar, up to ${edgeEnd(g.X1)}; and the neckline, out to ${edgeEnd(g.X2)}.`;
  // the waist, on the paper as it lies after the shoulders: its top is the shoulder fold
  const aim = lineMeet(g.A, v2(g.W1.x - g.A.x, g.W1.y - g.A.y), v2(0, -1), v2(1, 0));
  const below = g.collarLow < g.sleeveLow ? 'the collar point' : 'the sleeve';
  const waist = (behind: boolean) => `1. Crease two lines across, ${cm(V.y - g.W1.y)} and ${cm(V.y - g.W2.y)} below the shoulder fold. `
    + `2. On each side, crease from the side edge just below ${below} toward the bottom edge ${cm(aim.x - g.corner.x)} in from the bottom corner, stopping at the upper line; then from the lower line, just inside, to the bottom corner. `
    + (behind
      ? '3. Fold the sides behind along these creases while you fold the body down along the lower line and back up along the upper one. '
      : '3. Fold the sides toward you along these creases while you fold the body down behind along the lower line and back up behind along the upper one, so the pleat forms on the far side. ')
    + `A small gusset folds flat inside each side, reaching the side edge ${cm(V.y - g.C1end.y)} below the shoulder fold.`;
  return { creases, waist };
}

export function buildCoatDress(p: CoatDressParams = DEFAULT_COAT_DRESS): Construction {
  const print = p.coat === 'print';
  const say = coatInstructions(p);
  const ops: Op[] = [
    {
      kind: 'turn',
      id: 'turn',
      title: 'Turn the paper over',
      hint: 'Print side up to start. Turn it over from side to side, so the print is underneath: every crease that follows is made on this side first, then collapsed.',
    },
    {
      kind: 'collapse',
      id: 'shoulders',
      title: print ? 'Collapse both shoulders' : 'Collapse both shoulders from the back',
      hint: print
        ? `${say.creases} 3. Fold the fronts in along the side seams to meet while the strip above the shoulders folds down behind as the back yoke; each top corner turns over its shoulder onto the front as the collar. The short sleeves come down with the yoke, under the collar.`
        : `You are working on the back of the coat. ${say.creases} 3. Fold the strip above the shoulders down toward you as the back yoke while the fronts fold away underneath along the side seams to meet; each top corner turns over its shoulder to become the collar on the other side.`,
      collapse: coatShoulderSpec(p),
    },
    {
      kind: 'collapse',
      id: 'waist',
      title: print ? 'Pleat the waist and fold the sides behind' : 'Pleat the waist and fold the sides toward you',
      hint: print ? say.waist(true) : `Still on the back. ${say.waist(false)}`,
      collapse: coatWaistSpec(p),
    },
  ];
  if (!print) {
    ops.push({
      kind: 'turn',
      id: 'reveal',
      title: 'Turn over to reveal the coat',
      hint: 'Turn it over from side to side: the coat shows the reverse colour; the collar, the underskirt in the opening and the back yoke show the print.',
    });
  }
  const g = coatDressGeometry(p);
  return { name: print ? 'Coat-dress, printed' : 'Coat-dress', ops, meta: { top: p.shoulder, shoulderPoint: g.V, sleeveCutDir: v2(0, -1) } };
}

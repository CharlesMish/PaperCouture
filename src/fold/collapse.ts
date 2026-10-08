// Collapse: one step in which several creases fold at once, like a swivel or a
// pleat that changes the angle of a side. A simple fold (engine.ts) moves paper
// across one line; a waist that narrows and then flares cannot be made that way,
// because the side crease has to bend where the pleat meets it.
//
// A collapse divides the current flat model into convex REGIONS, each belonging
// to a rigid BODY. Bodies are joined by CREASES that form a tree from a base body
// that stays put; extra creases close loops and are checked. Every crease folds
// by a fold angle rho with tan(rho / 2) = rate * tau, where tau runs from 0 to
// infinity over the step. That is exactly how fold angles are linked around a
// flat-foldable four-crease vertex, so a crease pattern whose vertices all have
// four creases and the right rates moves rigidly: no piece bends or stretches,
// and every crease reaches 180 degrees together at the end.
//
// The end state is exact (each body's map is a product of reflections). The
// stacking order is read from the rigid motion just before it lands flat.

import { Facet, FoldError, SheetState, modelPoly } from './engine';
import {
  Affine2,
  IDENTITY,
  Vec2,
  applyAffine,
  centroid,
  compose,
  convexOverlap,
  det,
  dot,
  norm,
  reflectionAcross,
  signedArea,
  splitConvex,
  sub,
  v2,
} from './geometry';

/** Keep the side of the line through a and b that contains `keep`. */
export interface HalfPlane {
  a: Vec2;
  b: Vec2;
  keep: Vec2;
}

export interface CollapseRegion {
  /** Tag added to every piece of paper in this region (later flap folds use it). */
  tag: string;
  body: string;
  where: HalfPlane[];
}

export interface CollapseCrease {
  name: string;
  parent: string;
  child: string;
  /** Crease segment ends in model coordinates before the step (also its line). */
  a: Vec2;
  b: Vec2;
  /** tan(rho / 2) = rate * tau. 0 for a boundary that never opens. */
  rate: number;
  /** +1: the child swings up toward the viewer (valley); -1: down (mountain). */
  sign: 1 | -1;
}

export interface CollapseSpec {
  base: string;
  regions: CollapseRegion[];
  /** The first crease into a body puts it on the tree; any later one must agree. */
  creases: CollapseCrease[];
  /** Arrow and tint group for each moving body. */
  groups: Record<string, number>;
  /** A rate whose crease follows the eased progress exactly; sets the pace. */
  pace: number;
}

export type Mat34 = Float64Array; // row-major 3x4, as in timeline.ts

// ---------------------------------------------------------------------------
// small 3x4 helpers

export function mat34Identity(): Mat34 {
  return Float64Array.from([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0]);
}

/** A ∘ B */
export function mul34(A: Mat34, B: Mat34, out: Mat34 = new Float64Array(12)): Mat34 {
  const r = new Float64Array(12);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 4; j++) {
      let v = A[i * 4] * B[j] + A[i * 4 + 1] * B[4 + j] + A[i * 4 + 2] * B[8 + j];
      if (j === 3) v += A[i * 4 + 3];
      r[i * 4 + j] = v;
    }
  }
  out.set(r);
  return out;
}

/** Rotation by angle th about the horizontal axis through p with unit direction w. */
function rotLine(p: Vec2, w: Vec2, th: number): Mat34 {
  const [x, y, z] = [w.x, w.y, 0];
  const C = Math.cos(th);
  const S = Math.sin(th);
  const t = 1 - C;
  const R = [
    t * x * x + C, t * x * y - S * z, t * x * z + S * y,
    t * x * y + S * z, t * y * y + C, t * y * z - S * x,
    t * x * z - S * y, t * y * z + S * x, t * z * z + C,
  ];
  const c = [p.x, p.y, 0];
  const M = new Float64Array(12);
  for (let r = 0; r < 3; r++) {
    M[r * 4] = R[r * 3];
    M[r * 4 + 1] = R[r * 3 + 1];
    M[r * 4 + 2] = R[r * 3 + 2];
    M[r * 4 + 3] = c[r] - (R[r * 3] * c[0] + R[r * 3 + 1] * c[1] + R[r * 3 + 2] * c[2]);
  }
  return M;
}

export function apply34(M: Mat34, x: number, y: number, z: number): [number, number, number] {
  return [
    M[0] * x + M[1] * y + M[2] * z + M[3],
    M[4] * x + M[5] * y + M[6] * z + M[7],
    M[8] * x + M[9] * y + M[10] * z + M[11],
  ];
}

// ---------------------------------------------------------------------------
// spec analysis (cached per spec)

export interface CollapsePlan {
  spec: CollapseSpec;
  bodies: string[];
  /** tree crease (index into spec.creases) that attaches each body; -1 for the base */
  via: number[];
  /** the body it hangs from on the tree (a crease may be walked child to parent) */
  parentOf: number[];
  /** true when the tree walks `via` from its child to its parent */
  reversed: boolean[];
  /** in-plane unit normal of each crease, pointing into its child body */
  normal: Vec2[];
  /** exact flat map of each body at the end of the step */
  final: Affine2[];
}

const plans = new WeakMap<CollapseSpec, CollapsePlan>();

const affClose = (p: Affine2, q: Affine2, eps = 1e-9) =>
  Math.abs(p.a - q.a) + Math.abs(p.b - q.b) + Math.abs(p.c - q.c) + Math.abs(p.d - q.d) +
    Math.abs(p.e - q.e) + Math.abs(p.f - q.f) < eps;

function sideOfPlane(h: HalfPlane): (q: Vec2) => number {
  const d = norm(sub(h.b, h.a));
  let n = v2(-d.y, d.x);
  if (dot(n, sub(h.keep, h.a)) < 0) n = v2(-n.x, -n.y);
  return (q: Vec2) => dot(sub(q, h.a), n);
}

/** A point well inside a region (centroid of the region clipped to a large square). */
function regionPoint(r: CollapseRegion): Vec2 | null {
  let poly: Vec2[] | null = [v2(-9, -9), v2(9, -9), v2(9, 9), v2(-9, 9)];
  for (const h of r.where) {
    const s = sideOfPlane(h);
    poly = poly ? splitConvex(poly, s).pos : null;
  }
  return poly ? centroid(poly) : null;
}

export function planCollapse(spec: CollapseSpec): CollapsePlan {
  const cached = plans.get(spec);
  if (cached) return cached;
  const bodies = [spec.base];
  for (const r of spec.regions) if (!bodies.includes(r.body)) bodies.push(r.body);
  const idx = (b: string) => {
    const i = bodies.indexOf(b);
    if (i < 0) throw new FoldError(`collapse: unknown body ${b}`);
    return i;
  };
  const via = bodies.map(() => -1);
  const parentOf = bodies.map(() => -1);
  const reversed = bodies.map(() => false);
  const final: (Affine2 | null)[] = bodies.map((_, i) => (i === 0 ? { ...IDENTITY } : null));
  const normal: Vec2[] = [];

  spec.creases.forEach((c) => {
    const child = spec.regions.filter((r) => r.body === c.child).map(regionPoint).find((p) => p);
    if (!child) throw new FoldError(`collapse: body ${c.child} has no area`);
    const d = norm(sub(c.b, c.a));
    let n = v2(-d.y, d.x);
    if (dot(n, sub(child, c.a)) < 0) n = v2(-n.x, -n.y);
    normal.push(n);
  });

  // build the tree in crease order, repeating until no more bodies attach
  let grew = true;
  while (grew) {
    grew = false;
    spec.creases.forEach((c, ci) => {
      const p = idx(c.parent);
      const ch = idx(c.child);
      // either side may be the one already placed (the base can be any body)
      const [from, to] = final[p] && !final[ch] ? [p, ch] : final[ch] && !final[p] ? [ch, p] : [-1, -1];
      if (from >= 0) {
        final[to] = compose(final[from]!, reflectionAcross(c.a, sub(c.b, c.a)));
        via[to] = ci;
        parentOf[to] = from;
        reversed[to] = from === ch;
        grew = true;
      }
    });
  }
  bodies.forEach((b, i) => {
    if (!final[i]) throw new FoldError(`collapse: body ${b} is not joined to ${spec.base}`);
  });
  // loops must close in the flat end state
  spec.creases.forEach((c, ci) => {
    const ch = idx(c.child);
    if (via[ch] === ci || via[idx(c.parent)] === ci) return;
    const want = compose(final[idx(c.parent)]!, reflectionAcross(c.a, sub(c.b, c.a)));
    if (!affClose(want, final[ch]!, 1e-7)) {
      throw new FoldError(`collapse: crease ${c.name} does not close (flat end state would tear)`);
    }
  });

  const plan: CollapsePlan = { spec, bodies, via, parentOf, reversed, normal, final: final as Affine2[] };
  plans.set(spec, plan);
  return plan;
}

/** Fold angle of every crease at eased progress e (0..1). */
export function collapseAngles(spec: CollapseSpec, e: number): number[] {
  if (e >= 1) return spec.creases.map((c) => (c.rate > 0 ? c.sign * Math.PI : 0));
  const tau = Math.tan((Math.PI * Math.max(0, e)) / 2) / spec.pace;
  return spec.creases.map((c) => c.sign * 2 * Math.atan(c.rate * tau));
}

/** 3D pose of every body (maps pre-step model coords at z = 0 into 3D). */
export function bodyPoses(plan: CollapsePlan, angles: number[]): Mat34[] {
  const poses: (Mat34 | null)[] = plan.bodies.map((_, i) => (i === 0 ? mat34Identity() : null));
  const order: number[] = [0];
  for (let k = 0; k < order.length; k++) {
    plan.bodies.forEach((_, i) => {
      if (plan.parentOf[i] === order[k] && !order.includes(i)) order.push(i);
    });
  }
  for (const i of order) {
    if (i === 0) continue;
    const ci = plan.via[i];
    const c = plan.spec.creases[ci];
    // rotating about n x z by a positive angle lifts the side n points into
    // toward +z; a valley lifts both sides, so walking the crease backwards
    // uses the opposite normal and the same angle
    const n = plan.reversed[i] ? v2(-plan.normal[ci].x, -plan.normal[ci].y) : plan.normal[ci];
    poses[i] = mul34(poses[plan.parentOf[i]]!, rotLine(c.a, v2(n.y, -n.x), angles[ci]));
  }
  return poses as Mat34[];
}

/**
 * How far the loop creases are from closing at these angles: for every crease
 * that is not on the tree, the largest difference between the child's pose and
 * the parent's pose turned about that crease. 0 means the step is rigid.
 */
export function loopResidual(plan: CollapsePlan, angles: number[]): { crease: string; error: number }[] {
  const poses = bodyPoses(plan, angles);
  const out: { crease: string; error: number }[] = [];
  plan.spec.creases.forEach((c, ci) => {
    const ch = plan.bodies.indexOf(c.child);
    const p = plan.bodies.indexOf(c.parent);
    if (plan.via[ch] === ci || plan.via[p] === ci) return;
    const n = plan.normal[ci];
    const want = mul34(poses[p], rotLine(c.a, v2(n.y, -n.x), angles[ci]));
    let err = 0;
    for (let k = 0; k < 12; k++) err = Math.max(err, Math.abs(want[k] - poses[ch][k]));
    out.push({ crease: c.name, error: err });
  });
  return out;
}

// ---------------------------------------------------------------------------

export interface CollapseResult {
  state: SheetState;
  moved: Set<number>;
  parent: Map<number, number>;
  /** result facet id -> body index */
  bodyOf: Map<number, number>;
}

let nextId = 1_000_000;

const invApply = (T: Affine2, q: Vec2): Vec2 => {
  // rigid: the inverse of the linear part is its transpose
  const x = q.x - T.e;
  const y = q.y - T.f;
  return { x: T.a * x + T.c * y, y: T.b * x + T.d * y };
};

function clipConvex(a: Vec2[], b: Vec2[]): Vec2[] | null {
  let poly: Vec2[] | null = a;
  const ccw = signedArea(b) > 0;
  for (let i = 0; i < b.length && poly; i++) {
    const p = b[i];
    const q = b[(i + 1) % b.length];
    const e = sub(q, p);
    const n = ccw ? v2(-e.y, e.x) : v2(e.y, -e.x);
    poly = splitConvex(poly, (m) => dot(sub(m, p), n)).pos;
  }
  return poly;
}

export function applyCollapse(state: SheetState, spec: CollapseSpec): CollapseResult {
  const plan = planCollapse(spec);
  const parent = new Map<number, number>();
  const bodyOf = new Map<number, number>();
  const moved = new Set<number>();
  const pieces: { f: Facet; src: Facet; body: number }[] = [];

  for (const f of state.facets) {
    let area = 0;
    for (const r of spec.regions) {
      let poly: Vec2[] | null = f.poly;
      for (const h of r.where) {
        const s = sideOfPlane(h);
        poly = poly ? splitConvex(poly, (m) => s(applyAffine(f.T, m))).pos : null;
      }
      if (!poly || Math.abs(signedArea(poly)) < 1e-12) continue;
      area += signedArea(poly);
      const body = plan.bodies.indexOf(r.body);
      const g: Facet = {
        id: nextId++,
        poly,
        T: compose(plan.final[body], f.T),
        rank: f.rank,
        tags: [...f.tags, r.tag],
      };
      parent.set(g.id, f.id);
      bodyOf.set(g.id, body);
      if (body !== 0) moved.add(g.id);
      pieces.push({ f: g, src: f, body });
    }
    if (Math.abs(area - signedArea(f.poly)) > 1e-9) {
      throw new FoldError(`collapse: regions do not cover facet ${f.id} exactly`);
    }
  }

  // Stacking: pose the bodies just short of flat (zero thickness) and read who is
  // above whom wherever two pieces overlap. Pieces of one body keep their order,
  // reversed if that body ends up turned over.
  const near = bodyPoses(plan, collapseAngles(spec, 1 - 1e-4));
  const n = pieces.length;
  const polys = pieces.map((p) => modelPoly(p.f));
  const above: number[][] = pieces.map(() => []);
  const indeg = new Array(n).fill(0);
  const zAt = (k: number, X: Vec2) => {
    const p = pieces[k];
    const q = applyAffine(p.src.T, invApply(p.f.T, X));
    return apply34(near[p.body], q.x, q.y, 0)[2];
  };
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (!convexOverlap(polys[i], polys[j])) continue;
      const shared = clipConvex(polys[i], polys[j]);
      if (!shared || Math.abs(signedArea(shared)) < 1e-12) continue;
      const X = centroid(shared);
      let lower: number;
      if (pieces[i].body === pieces[j].body) {
        const flip = det(plan.final[pieces[i].body]) < 0;
        const li = pieces[i].src.rank;
        const lj = pieces[j].src.rank;
        if (li === lj) continue;
        lower = (li < lj) !== flip ? i : j;
      } else {
        const zi = zAt(i, X);
        const zj = zAt(j, X);
        if (Math.abs(zi - zj) < 1e-12) throw new FoldError('collapse: cannot tell which layer is on top');
        lower = zi < zj ? i : j;
      }
      const upper = lower === i ? j : i;
      above[lower].push(upper);
      indeg[upper]++;
    }
  }
  // topological order, ties broken by the old stacking for stability
  const ready = pieces.map((_, k) => k).filter((k) => indeg[k] === 0);
  const key = (k: number) => [pieces[k].src.rank, pieces[k].f.id];
  const order: number[] = [];
  while (ready.length) {
    ready.sort((a, b) => key(a)[0] - key(b)[0] || key(a)[1] - key(b)[1]);
    const k = ready.shift()!;
    order.push(k);
    for (const u of above[k]) if (--indeg[u] === 0) ready.push(u);
  }
  if (order.length !== n) {
    // name one loop of "is below" so the author can see which layers collide
    const left = new Set(pieces.map((_, k) => k).filter((k) => !order.includes(k)));
    const desc = (k: number) => `${plan.bodies[pieces[k].body]} (${pieces[k].f.tags.join('+')})`;
    const seen = new Map<number, number>();
    let k = [...left][0];
    const path: number[] = [];
    // every piece left over still has a piece below it that is also left over
    while (!seen.has(k)) {
      seen.set(k, path.length);
      path.push(k);
      k = [...left].find((u) => above[u].includes(k))!;
    }
    const loop = path.slice(seen.get(k)).reverse().map(desc).join(' < ');
    throw new FoldError(`collapse: layers would pass through each other: ${loop}`);
  }
  order.forEach((k, r) => (pieces[k].f.rank = r));

  return { state: { facets: pieces.map((p) => p.f) }, moved, parent, bodyOf };
}

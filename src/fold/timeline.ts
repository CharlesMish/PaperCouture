// Precomputes every resting state of a construction and, for each operation, the
// pieces needed to animate it. Rendering asks for frame(op, t) and receives one
// rigid 3D transform per piece; t = 0 is the state before the op, t = 1 after.
// frame(k, 1) and frame(k + 1, 0) describe the same paper (checked in scripts/check.ts).

import {
  Adjacency,
  Facet,
  Line,
  Op,
  SheetState,
  applyFold,
  applyTurn,
  computeLevels,
  findAdjacency,
  findRawEdges,
  modelPoly,
  sideOf,
  specLine,
  unfoldedSquare,
} from './engine';
import { Affine2, Vec2, applyAffine, centroid, det, lineConvexRange, signedArea, v2 } from './geometry';
import { CollapsePlan, applyCollapse, bodyPoses, collapseAngles, mul34, planCollapse } from './collapse';
import { separateLayers } from './layerSeparation';

/** Vertical spacing between stacked layers, in model units (sheet = 2 units). */
export const LAYER_GAP = 0.0055;
/** Lowest layer floats this far above the table to avoid z-fighting. */
export const BASE_Z = 0.0015;

export interface Piece {
  index: number;
  id: number;
  poly: Vec2[];
  preT: Affine2;
  preZ: number;
  postT: Affine2;
  postZ: number;
  /** fold spec index that moves this piece; -1 = static. Turn ops: 0 for every piece.
   *  Collapse ops: the arrow group of the piece's body. */
  spec: number;
  /** Collapse ops: index of the rigid body carrying this piece; -1 otherwise. */
  body: number;
}

export interface Hinge {
  a: number; // piece index
  b: number;
  m0: Vec2;
  m1: Vec2;
  outA: Vec2;
}

export interface RawEdgeRef {
  piece: number;
  m0: Vec2;
  m1: Vec2;
  out: Vec2;
}

export interface OpAnim {
  index: number;
  op: Op;
  pieces: Piece[];
  hinges: Hinge[];
  raw: RawEdgeRef[];
  /** fold ops: one per spec */
  lines: Line[];
  /** fold ops: crease segment clipped to the paper it cuts, model coords */
  creaseSegments: [Vec2, Vec2][];
  /** fold ops: centroid of each moving region, before and after */
  arrows: { from: Vec2; to: Vec2 }[];
  /** radius used to lift the model during turn-overs / mountain folds */
  liftRadius: number;
  maxPreZ: number;
  /** collapse ops only */
  collapse?: CollapsePlan;
  /** Rendering-depth correction for a collapse and its later folds only. */
  layeredCollapse?: boolean;
}

export interface Timeline {
  ops: OpAnim[];
  states: SheetState[];
}

const zOf = (level: number) => BASE_Z + level * LAYER_GAP;

const affEq = (p: Affine2, q: Affine2) =>
  Math.abs(p.a - q.a) + Math.abs(p.b - q.b) + Math.abs(p.c - q.c) + Math.abs(p.d - q.d) +
    Math.abs(p.e - q.e) + Math.abs(p.f - q.f) < 1e-9;

export function buildTimeline(ops: Op[]): Timeline {
  let state = unfoldedSquare();
  const states: SheetState[] = [state];
  const anims: OpAnim[] = [];
  let layeredCollapse = false;

  ops.forEach((op, index) => {
    const pre = state;
    const preLevels = computeLevels(pre);
    const preById = new Map(pre.facets.map((f) => [f.id, f]));

    // ancestor (in `pre`) and moving spec for each facet of the result
    let cur = pre;
    let ancestor = new Map(pre.facets.map((f) => [f.id, f.id]));
    let movedBy = new Map<number, number>();
    let bodyOf = new Map<number, number>();
    let collapse: CollapsePlan | undefined;
    const lines: Line[] = [];
    const creaseSegments: [Vec2, Vec2][] = [];
    const arrows: { from: Vec2; to: Vec2 }[] = [];

    if (op.kind === 'fold') {
      op.folds.forEach((spec, si) => {
        const line = specLine(spec);
        lines.push(line);
        // preview geometry is taken from the state this spec applies to
        const candidates = cur.facets.filter((f) => (spec.only ? f.tags.includes(spec.only) : true));
        let t0 = Infinity;
        let t1 = -Infinity;
        for (const f of candidates) {
          const r = lineConvexRange(line.p, line.dir, modelPoly(f));
          if (r) {
            t0 = Math.min(t0, r[0]);
            t1 = Math.max(t1, r[1]);
          }
        }
        if (t1 > t0) {
          creaseSegments.push([
            v2(line.p.x + line.dir.x * t0, line.p.y + line.dir.y * t0),
            v2(line.p.x + line.dir.x * t1, line.p.y + line.dir.y * t1),
          ]);
        }

        const res = applyFold(cur, spec);
        const nextAncestor = new Map<number, number>();
        const nextMoved = new Map<number, number>();
        for (const f of res.state.facets) {
          const par = res.parent.get(f.id)!;
          nextAncestor.set(f.id, ancestor.get(par)!);
          const prevMove = movedBy.get(par);
          if (res.moved.has(f.id)) {
            if (prevMove !== undefined) {
              throw new Error(`${op.id}: grouped folds must move separate paper (${spec.name})`);
            }
            nextMoved.set(f.id, si);
          } else if (prevMove !== undefined) nextMoved.set(f.id, prevMove);
        }

        // arrow: area-weighted centroid of what moved, before and after
        let ax = 0;
        let ay = 0;
        let aw = 0;
        let bx = 0;
        let by = 0;
        for (const f of res.state.facets) {
          if (!res.moved.has(f.id)) continue;
          const src = cur.facets.find((g) => g.id === res.parent.get(f.id))!;
          const w = Math.abs(signedArea(f.poly));
          const c0 = centroid(f.poly.map((m) => applyAffine(src.T, m)));
          const c1 = centroid(modelPoly(f));
          ax += c0.x * w;
          ay += c0.y * w;
          bx += c1.x * w;
          by += c1.y * w;
          aw += w;
        }
        arrows.push({ from: v2(ax / aw, ay / aw), to: v2(bx / aw, by / aw) });

        ancestor = nextAncestor;
        movedBy = nextMoved;
        cur = res.state;
      });
    } else if (op.kind === 'collapse') {
      layeredCollapse = true;
      const spec = op.collapse;
      collapse = planCollapse(spec);
      const res = applyCollapse(pre, spec);
      cur = res.state;
      bodyOf = res.bodyOf;
      ancestor = new Map(cur.facets.map((f) => [f.id, res.parent.get(f.id)!]));
      for (const f of cur.facets) {
        const b = res.bodyOf.get(f.id)!;
        if (res.moved.has(f.id)) movedBy.set(f.id, spec.groups[collapse.bodies[b]] ?? 0);
      }
      for (const c of spec.creases) if (c.rate > 0) creaseSegments.push([c.a, c.b]);
      // one arrow per group: where its paper sits before and after
      const groups = Math.max(-1, ...movedBy.values()) + 1;
      for (let g = 0; g < groups; g++) {
        let ax = 0, ay = 0, bx = 0, by = 0, aw = 0;
        for (const f of cur.facets) {
          if (movedBy.get(f.id) !== g) continue;
          const src = preById.get(res.parent.get(f.id)!)!;
          const w = Math.abs(signedArea(f.poly));
          const c0 = centroid(f.poly.map((m) => applyAffine(src.T, m)));
          const c1 = centroid(modelPoly(f));
          ax += c0.x * w; ay += c0.y * w; bx += c1.x * w; by += c1.y * w; aw += w;
        }
        arrows.push(aw > 0 ? { from: v2(ax / aw, ay / aw), to: v2(bx / aw, by / aw) } : { from: v2(0, 0), to: v2(0, 0) });
      }
    } else {
      cur = applyTurn(pre);
      for (const f of cur.facets) movedBy.set(f.id, 0);
    }

    const post = cur;
    const postLevels = computeLevels(post);
    const pieces: Piece[] = post.facets.map((f, i) => {
      const anc = preById.get(ancestor.get(f.id)!)!;
      return {
        index: i,
        id: f.id,
        poly: f.poly,
        preT: anc.T,
        preZ: zOf(preLevels.get(anc.id)!),
        postT: f.T,
        postZ: zOf(postLevels.get(f.id)!),
        spec: movedBy.get(f.id) ?? -1,
        body: bodyOf.get(f.id) ?? -1,
      };
    });

    const asFacet = (p: Piece): Facet => ({ id: p.index, poly: p.poly, T: p.postT, rank: 0, tags: [] });
    const facetsForAdj = pieces.map(asFacet);
    const hinges: Hinge[] = findAdjacency(facetsForAdj)
      .filter((h: Adjacency) => {
        const A = pieces[h.a.id];
        const B = pieces[h.b.id];
        const never =
          A.spec === B.spec &&
          A.body === B.body &&
          affEq(A.preT, B.preT) &&
          Math.abs(A.preZ - B.preZ) < 1e-9 &&
          Math.abs(A.postZ - B.postZ) < 1e-9;
        return !never;
      })
      .map((h) => ({ a: h.a.id, b: h.b.id, m0: h.m0, m1: h.m1, outA: h.outA }));
    const raw = findRawEdges(facetsForAdj).map((r) => ({ piece: r.facet.id, m0: r.m0, m1: r.m1, out: r.out }));

    // lift radius: how far paper swings from its axis (used so it never dips into the table)
    let liftRadius = 0;
    for (const p of pieces) {
      if (p.spec < 0) continue;
      for (const m of p.poly) {
        const q = applyAffine(p.preT, m);
        if (op.kind === 'turn') liftRadius = Math.max(liftRadius, Math.abs(q.x));
        else if (op.kind === 'fold' && op.folds[p.spec].sense === 'mountain') {
          liftRadius = Math.max(liftRadius, sideOf(lines[p.spec], q));
        }
      }
    }
    const maxPreZ = Math.max(...pieces.map((p) => p.preZ));

    anims.push({ index, op, pieces, hinges, raw, lines, creaseSegments, arrows, liftRadius, maxPreZ, collapse, layeredCollapse });
    states.push(post);
    state = post;
  });

  return { ops: anims, states };
}

// ---------------------------------------------------------------------------
// Frame evaluation. A piece's pose is a 3x4 row-major affine matrix mapping the
// material point (u, v, w) to model space (x, y, z). w maps to the piece's front
// normal, so column 2 is the direction the pattern side faces.

export type Mat34 = Float64Array; // length 12

export const easeInOut = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, t)));

function flat(T: Affine2, z: number, out: Mat34, o: number) {
  const s = det(T) < 0 ? -1 : 1;
  out[o + 0] = T.a; out[o + 1] = T.b; out[o + 2] = 0; out[o + 3] = T.e;
  out[o + 4] = T.c; out[o + 5] = T.d; out[o + 6] = 0; out[o + 7] = T.f;
  out[o + 8] = 0; out[o + 9] = 0; out[o + 10] = s; out[o + 11] = z;
}

/** Left-multiply the matrix at out[o] by a rotation of angle th about axis w through point c. */
function rotateAbout(out: Mat34, o: number, w: [number, number, number], c: [number, number, number], th: number) {
  const [x, y, z] = w;
  const C = Math.cos(th);
  const S = Math.sin(th);
  const t = 1 - C;
  const R = [
    t * x * x + C, t * x * y - S * z, t * x * z + S * y,
    t * x * y + S * z, t * y * y + C, t * y * z - S * x,
    t * x * z - S * y, t * y * z + S * x, t * z * z + C,
  ];
  const m = Array.from(out.subarray(o, o + 12));
  for (let r = 0; r < 3; r++) {
    for (let col = 0; col < 4; col++) {
      let v = R[r * 3] * m[col] + R[r * 3 + 1] * m[4 + col] + R[r * 3 + 2] * m[8 + col];
      if (col === 3) v += c[r] - (R[r * 3] * c[0] + R[r * 3 + 1] * c[1] + R[r * 3 + 2] * c[2]);
      out[o + r * 4 + col] = v;
    }
  }
}

const lastLift = new WeakMap<OpAnim, number>();

/** How far the last evaluateFrame of this op raised the whole model off the table. */
export const frameLift = (anim: OpAnim): number => lastLift.get(anim) ?? 0;

/**
 * Pose every piece of op `anim` at progress t in [0, 1].
 * `stagger` lets grouped folds run one after another instead of together.
 */
function rawFrame(anim: OpAnim, t: number, out?: Mat34): Mat34 {
  const n = anim.pieces.length;
  const M = out && out.length === n * 12 ? out : new Float64Array(n * 12);
  const e = easeInOut(t);
  const th = Math.PI * e;
  const op = anim.op;

  if (op.kind === 'turn') {
    const c = anim.maxPreZ / 2;
    const lift = (anim.liftRadius + 0.04) * Math.sin(th);
    for (const p of anim.pieces) {
      const o = p.index * 12;
      flat(p.preT, p.preZ, M, o);
      rotateAbout(M, o, [0, -1, 0], [0, 0, c], th);
      const corr = p.postZ - (2 * c - p.preZ);
      M[o + 11] += corr * e + lift;
    }
    return M;
  }

  if (op.kind === 'collapse') {
    // Separate a rotating stack along its own normal, not the world's z axis.
    // Vertical offsets become coplanar at 90 degrees and then invert its layers.
    const poses = bodyPoses(anim.collapse!, collapseAngles(op.collapse, e));
    let minZ = Infinity;
    for (const p of anim.pieces) {
      const o = p.index * 12;
      flat(p.preT, 0, M, o);
      if (p.body > 0) mul34(poses[p.body], M.subarray(o, o + 12), M.subarray(o, o + 12));
      if (e === 0 || e === 1) M[o + 11] += p.preZ + (p.postZ - p.preZ) * e;
      else {
        const R = poses[p.body];
        const sign = det(anim.collapse!.final[p.body]) < 0 ? -1 : 1;
        const z = p.preZ * (1 - e) + sign * p.postZ * e;
        M[o + 3] += R[2] * z;
        M[o + 7] += R[6] * z;
        M[o + 11] += R[10] * z;
      }
      for (const m of p.poly) minZ = Math.min(minZ, M[o + 8] * m.x + M[o + 9] * m.y + M[o + 11]);
    }
    const lift = Math.max(0, BASE_Z - minZ);
    if (lift > 0) for (const p of anim.pieces) M[p.index * 12 + 11] += lift;
    lastLift.set(anim, lift);
    return M;
  }

  let lift = 0;
  if (anim.liftRadius > 0) lift = (anim.liftRadius + 0.04) * Math.sin(th);
  lastLift.set(anim, lift);
  for (const p of anim.pieces) {
    const o = p.index * 12;
    if (p.spec < 0) {
      flat(p.preT, p.preZ + (p.postZ - p.preZ) * e, M, o);
    } else {
      const line = anim.lines[p.spec];
      const sense = (op as Extract<Op, { kind: 'fold' }>).folds[p.spec].sense;
      const n = line.nMove;
      const sign = sense === 'valley' ? 1 : -1;
      const w: [number, number, number] = [sign * n.y, -sign * n.x, 0];
      const c = (p.preZ + p.postZ) / 2;
      flat(p.preT, p.preZ, M, o);
      rotateAbout(M, o, w, [line.p.x, line.p.y, c], th);
    }
    M[o + 11] += lift;
  }
  return M;
}

const idealAnims = new WeakMap<OpAnim, OpAnim>();
const separatedFrames = new WeakMap<OpAnim, { t: number; M: Mat34; lift: number }>();
/** Preserve the authored resting poses; only resolve their artificial depth in motion. */
export function evaluateFrame(anim: OpAnim, t: number, out?: Mat34): Mat34 {
  // Pending peeks and a held scrub are rendered repeatedly at one pose. Keep a
  // private copy so callers can reuse/mutate their output buffer safely.
  const cached = separatedFrames.get(anim);
  if (cached?.t === t) {
    const M = out?.length === cached.M.length ? out : new Float64Array(cached.M.length);
    M.set(cached.M); lastLift.set(anim, cached.lift); return M;
  }
  const M = rawFrame(anim, t, out);
  if (!anim.layeredCollapse || anim.op.kind === 'turn' || t <= 0 || t >= 1) return M;
  let ideal = idealAnims.get(anim);
  if (!ideal) {
    ideal = { ...anim, maxPreZ: 0, pieces: anim.pieces.map(p => ({ ...p, preZ: 0, postZ: 0 })) };
    idealAnims.set(anim, ideal);
  }
  separateLayers(anim.pieces, rawFrame(ideal, t), M, t);
  let low = Infinity;
  for (const p of anim.pieces) for (const m of p.poly)
    low = Math.min(low, M[p.index * 12 + 8] * m.x + M[p.index * 12 + 9] * m.y + M[p.index * 12 + 11]);
  const lift = Math.max(0, BASE_Z - low);
  for (const p of anim.pieces) M[p.index * 12 + 11] += lift;
  lastLift.set(anim, frameLift(anim) + lift);
  separatedFrames.set(anim, { t, M: M.slice(), lift: frameLift(anim) });
  return M;
}

/** Transform a material point with a piece pose. */
export function posePoint(M: Mat34, o: number, u: number, v: number): [number, number, number] {
  return [
    M[o] * u + M[o + 1] * v + M[o + 3],
    M[o + 4] * u + M[o + 5] * v + M[o + 7],
    M[o + 8] * u + M[o + 9] * v + M[o + 11],
  ];
}

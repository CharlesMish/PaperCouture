// Crease-based flat-fold engine.
//
// The sheet is a set of convex facets. Each facet keeps its polygon in MATERIAL
// coordinates (the unfolded square) forever, plus a rigid 2D transform that says
// where that material currently lies in the flat folded model, plus a stacking
// rank. A fold splits facets along the crease (in material space, exactly) and
// reflects the moving ones. Nothing is ever morphed: every piece of paper is the
// same material polygon, only moved rigidly, so motifs stay attached and the
// reverse side shows wherever det(transform) < 0.

import {
  Affine2,
  IDENTITY,
  MIRROR_X,
  Vec2,
  applyAffine,
  compose,
  convexOverlap,
  cross,
  det,
  dot,
  len,
  norm,
  reflectionAcross,
  signedArea,
  splitConvex,
  sub,
  v2,
} from './geometry';

export interface Facet {
  id: number;
  /** Polygon in material coordinates, counter-clockwise. */
  poly: Vec2[];
  /** Material -> flat model transform. */
  T: Affine2;
  /** Stacking rank; higher is closer to the viewer looking down on the table. */
  rank: number;
  /** Names of fold specs that have moved this material (inherited through splits). */
  tags: string[];
}

export interface SheetState {
  facets: Facet[];
}

export type FoldSense = 'valley' | 'mountain';

export interface FoldSpec {
  /** Unique name; stored as a tag on every facet it moves. */
  name: string;
  /** Two points on the crease line, in model coordinates of the state it applies to. */
  a: Vec2;
  b: Vec2;
  /** Any model point on the side that moves. */
  moving: Vec2;
  /** valley = the moving part swings up toward the viewer and lands on top. */
  sense: FoldSense;
  /** If set, only facets carrying this tag may move (a flap fold, not all layers). */
  only?: string;
}

export type Op =
  | { kind: 'fold'; id: string; title: string; hint: string; folds: FoldSpec[] }
  | { kind: 'turn'; id: string; title: string; hint: string };

export class FoldError extends Error {}

// ---------------------------------------------------------------------------

let nextId = 1;
const newId = () => nextId++;

export function unfoldedSquare(): SheetState {
  return {
    facets: [
      {
        id: newId(),
        poly: [v2(-1, -1), v2(1, -1), v2(1, 1), v2(-1, 1)],
        T: { ...IDENTITY },
        rank: 0,
        tags: [],
      },
    ],
  };
}

export const modelPoly = (f: Facet): Vec2[] => f.poly.map((p) => applyAffine(f.T, p));
export const isFlipped = (f: Facet): boolean => det(f.T) < 0;

export interface Line {
  p: Vec2;
  dir: Vec2; // unit
  /** Unit normal pointing toward the moving side. */
  nMove: Vec2;
}

export function specLine(spec: FoldSpec): Line {
  const dir = norm(sub(spec.b, spec.a));
  let n = v2(-dir.y, dir.x);
  if (dot(n, sub(spec.moving, spec.a)) < 0) n = v2(-n.x, -n.y);
  return { p: spec.a, dir, nMove: n };
}

/** Signed distance of a model point from the line; positive on the moving side. */
export const sideOf = (line: Line, q: Vec2): number => dot(sub(q, line.p), line.nMove);

function compactRanks(facets: Facet[]): void {
  const sorted = facets.slice().sort((a, b) => a.rank - b.rank || a.id - b.id);
  sorted.forEach((f, i) => (f.rank = i));
}

export interface FoldResult {
  state: SheetState;
  /** ids (in result) of facets that moved */
  moved: Set<number>;
  /** result facet id -> id of the facet in the input state it was cut from */
  parent: Map<number, number>;
}

/**
 * Apply a single simple fold. Throws FoldError if the fold would tear the sheet
 * or pass paper through other paper.
 */
export function applyFold(state: SheetState, spec: FoldSpec): FoldResult {
  const line = specLine(spec);
  const parent = new Map<number, number>();
  const pieces: { f: Facet; moving: boolean }[] = [];

  for (const f of state.facets) {
    const candidate = spec.only ? f.tags.includes(spec.only) : true;
    const s = (m: Vec2) => sideOf(line, applyAffine(f.T, m));
    if (!candidate) {
      const g = { ...f, tags: f.tags.slice() };
      parent.set(g.id, f.id);
      pieces.push({ f: g, moving: false });
      continue;
    }
    const { pos, neg } = splitConvex(f.poly, s);
    if (pos && neg) {
      for (const [poly, moving] of [
        [pos, true],
        [neg, false],
      ] as const) {
        const g: Facet = { id: newId(), poly, T: { ...f.T }, rank: f.rank, tags: f.tags.slice() };
        parent.set(g.id, f.id);
        pieces.push({ f: g, moving });
      }
    } else {
      const g = { ...f, tags: f.tags.slice() };
      parent.set(g.id, f.id);
      pieces.push({ f: g, moving: !!pos });
    }
  }

  const moving = pieces.filter((p) => p.moving).map((p) => p.f);
  const staticF = pieces.filter((p) => !p.moving).map((p) => p.f);
  if (moving.length === 0) throw new FoldError(`${spec.name}: nothing on the moving side`);

  // 1. Connectivity: every material edge shared between a moving and a static
  //    facet must lie on the crease, otherwise the fold would tear the paper.
  const movingIds = new Set(moving.map((f) => f.id));
  for (const h of findAdjacency(pieces.map((p) => p.f))) {
    const am = movingIds.has(h.a.id);
    const bm = movingIds.has(h.b.id);
    if (am === bm) continue;
    for (const m of [h.m0, h.m1]) {
      const d = sideOf(line, applyAffine(h.a.T, m));
      if (Math.abs(d) > 1e-7) {
        throw new FoldError(`${spec.name}: moving paper is still attached away from the crease (would tear)`);
      }
    }
  }

  // 2. Layer order: a valley flap must be above every static layer it overlaps on
  //    its own side (it lifts off the top); a mountain flap must be below.
  if (spec.only) {
    for (const m of moving) {
      const mp = modelPoly(m);
      for (const s of staticF) {
        if (!convexOverlap(mp, modelPoly(s))) continue;
        if (spec.sense === 'valley' && s.rank > m.rank) {
          throw new FoldError(`${spec.name}: flap is trapped under other paper`);
        }
        if (spec.sense === 'mountain' && s.rank < m.rank) {
          throw new FoldError(`${spec.name}: flap is trapped above other paper`);
        }
      }
    }
  }

  // 3. Move: reflect across the crease, reverse the moving stack, place it on
  //    top (valley) or underneath (mountain).
  const R = reflectionAcross(line.p, line.dir);
  const ranks = pieces.map((p) => p.f.rank);
  const maxR = Math.max(...ranks);
  const minR = Math.min(...ranks);
  const mMax = Math.max(...moving.map((f) => f.rank));
  const mMin = Math.min(...moving.map((f) => f.rank));
  for (const f of moving) {
    f.T = compose(R, f.T);
    f.rank =
      spec.sense === 'valley' ? maxR + 1 + (mMax - f.rank) : minR - 1 - (f.rank - mMin);
    if (!f.tags.includes(spec.name)) f.tags.push(spec.name);
  }

  const facets = pieces.map((p) => p.f);
  compactRanks(facets);
  return { state: { facets }, moved: movingIds, parent };
}

/** Turn the whole model over about the vertical centre line (x -> -x). */
export function applyTurn(state: SheetState): SheetState {
  const facets = state.facets.map((f) => ({
    ...f,
    T: compose(MIRROR_X, f.T),
    rank: -f.rank,
    tags: f.tags.slice(),
  }));
  compactRanks(facets);
  return { facets };
}

// ---------------------------------------------------------------------------
// Stacking height. Ranks give a total order; the rendered height of a facet is
// the length of the longest chain of overlapping facets beneath it, so paper
// that has nothing underneath rests on the table.

export function computeLevels(state: SheetState): Map<number, number> {
  const sorted = state.facets.slice().sort((a, b) => a.rank - b.rank);
  const polys = new Map(sorted.map((f) => [f.id, modelPoly(f)]));
  const level = new Map<number, number>();
  for (let i = 0; i < sorted.length; i++) {
    const f = sorted[i];
    let l = 0;
    for (let j = 0; j < i; j++) {
      const g = sorted[j];
      if (convexOverlap(polys.get(f.id)!, polys.get(g.id)!)) l = Math.max(l, level.get(g.id)! + 1);
    }
    level.set(f.id, l);
  }
  return level;
}

// ---------------------------------------------------------------------------
// Material adjacency: which facets share an edge segment in the unfolded sheet.
// Used for tear checks, for drawing rounded fold edges, and for raw-edge walls.

export interface Adjacency {
  a: Facet;
  b: Facet;
  /** shared segment, material coords, oriented along a's CCW edge */
  m0: Vec2;
  m1: Vec2;
  /** unit outward normal from a across the edge, material coords */
  outA: Vec2;
}

export function findAdjacency(facets: Facet[]): Adjacency[] {
  const out: Adjacency[] = [];
  for (let i = 0; i < facets.length; i++) {
    const A = facets[i];
    for (let j = i + 1; j < facets.length; j++) {
      const B = facets[j];
      for (let ei = 0; ei < A.poly.length; ei++) {
        const p0 = A.poly[ei];
        const p1 = A.poly[(ei + 1) % A.poly.length];
        const e = sub(p1, p0);
        const L = len(e);
        if (L < 1e-12) continue;
        const u = { x: e.x / L, y: e.y / L };
        for (let ej = 0; ej < B.poly.length; ej++) {
          const q0 = B.poly[ej];
          const q1 = B.poly[(ej + 1) % B.poly.length];
          if (Math.abs(cross(u, sub(q0, p0))) > 1e-9 || Math.abs(cross(u, sub(q1, p0))) > 1e-9) continue;
          if (dot(u, sub(q1, q0)) >= 0) continue; // must run opposite
          const t0 = Math.max(0, Math.min(dot(u, sub(q0, p0)), dot(u, sub(q1, p0))));
          const t1 = Math.min(L, Math.max(dot(u, sub(q0, p0)), dot(u, sub(q1, p0))));
          if (t1 - t0 < 1e-9) continue;
          out.push({
            a: A,
            b: B,
            m0: { x: p0.x + u.x * t0, y: p0.y + u.y * t0 },
            m1: { x: p0.x + u.x * t1, y: p0.y + u.y * t1 },
            outA: { x: u.y, y: -u.x },
          });
        }
      }
    }
  }
  return out;
}

export interface RawEdge {
  facet: Facet;
  m0: Vec2;
  m1: Vec2;
  out: Vec2;
}

/** Facet edges that lie on the border of the original square. */
export function findRawEdges(facets: Facet[]): RawEdge[] {
  const out: RawEdge[] = [];
  const onBorder = (p: Vec2, q: Vec2) =>
    (Math.abs(p.x - q.x) < 1e-9 && Math.abs(Math.abs(p.x) - 1) < 1e-9) ||
    (Math.abs(p.y - q.y) < 1e-9 && Math.abs(Math.abs(p.y) - 1) < 1e-9);
  for (const f of facets) {
    for (let i = 0; i < f.poly.length; i++) {
      const p = f.poly[i];
      const q = f.poly[(i + 1) % f.poly.length];
      if (!onBorder(p, q)) continue;
      const u = norm(sub(q, p));
      out.push({ facet: f, m0: p, m1: q, out: { x: u.y, y: -u.x } });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Whole-state sanity checks, used by scripts/check.ts.

export function checkState(state: SheetState, label: string): string[] {
  const errs: string[] = [];
  const area = state.facets.reduce((s, f) => s + signedArea(f.poly), 0);
  if (Math.abs(area - 4) > 1e-9) errs.push(`${label}: material area ${area} != 4`);
  for (const f of state.facets) {
    if (signedArea(f.poly) <= 0) errs.push(`${label}: facet ${f.id} not CCW`);
    if (Math.abs(Math.abs(det(f.T)) - 1) > 1e-9) errs.push(`${label}: facet ${f.id} transform not rigid`);
  }
  // Paper continuity: shared material edges must coincide in the folded model.
  for (const h of findAdjacency(state.facets)) {
    for (const m of [h.m0, h.m1]) {
      const pa = applyAffine(h.a.T, m);
      const pb = applyAffine(h.b.T, m);
      if (len(sub(pa, pb)) > 1e-7) errs.push(`${label}: tear between facets ${h.a.id} and ${h.b.id}`);
    }
  }
  // Every non-border edge must be fully shared with a neighbour (no holes).
  const adj = findAdjacency(state.facets);
  for (const f of state.facets) {
    for (let i = 0; i < f.poly.length; i++) {
      const p = f.poly[i];
      const q = f.poly[(i + 1) % f.poly.length];
      const L = len(sub(q, p));
      const border =
        (Math.abs(p.x - q.x) < 1e-9 && Math.abs(Math.abs(p.x) - 1) < 1e-9) ||
        (Math.abs(p.y - q.y) < 1e-9 && Math.abs(Math.abs(p.y) - 1) < 1e-9);
      if (border) continue;
      const u = norm(sub(q, p));
      let shared = 0;
      for (const h of adj) {
        if (h.a !== f && h.b !== f) continue;
        const d0 = dot(sub(h.m0, p), u);
        const d1 = dot(sub(h.m1, p), u);
        const onEdge =
          Math.abs(cross(u, sub(h.m0, p))) < 1e-9 && Math.abs(cross(u, sub(h.m1, p))) < 1e-9;
        if (onEdge) shared += Math.abs(d1 - d0);
      }
      if (Math.abs(shared - L) > 1e-7) errs.push(`${label}: facet ${f.id} edge ${i} not closed (${shared}/${L})`);
    }
  }
  return errs;
}

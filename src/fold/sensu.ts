// Sensu: an open folding fan, from one small square: a half-round leaf of (by
// default) eleven panels spreading from a rivet point, with a pleat between each pair.
//
// Why it folds. The square is folded in half; the middle of the fold is the rivet.
// The two top corners fold behind so the outline, seen from the rivet, is half an
// octagon: everywhere within 8% of one radius, close to the arc of a real fan.
// Then the pleats, from the outside in, one on each side per step. Each is a
// zig-zag through the rivet: a narrow wedge folds over along one line and the rest
// of that side folds back along the next, so the outer paper slides in toward the
// middle over a tuck. Both creases of a pleat meet only at the rivet, on the
// paper's folded edge, so neither constrains the other: the wedge and the outer
// part turn at the same rate in opposite senses, and the outer part comes to rest
// flat, turned within the paper's plane by twice the wedge's angle. Five pleats a
// side close the half-round blank to a fan of 124 degrees.
//
// The leaf shows one side of the paper; the tucks show the other only from
// behind. The colour choice folds the first fold in front instead of behind.

import type { CollapseSpec, HalfPlane } from './collapse';
import type { Construction } from './construction';
import { FoldError, Op } from './engine';
import { v2 } from './geometry';

export type SensuSide = 'print' | 'reverse';

export interface SensuParams {
  /** Pleats on each side of the middle panel. */
  pleats: number;
  /** Half the angle of the open fan, in degrees. */
  halfSpread: number;
  side: SensuSide;
}

export const DEFAULT_SENSU: SensuParams = { pleats: 5, halfSpread: 62, side: 'print' };

const DEG = Math.PI / 180;
const HUB = v2(0, 0);
const ray = (a: number, r = 1.6) => v2(r * Math.cos(a), r * Math.sin(a));
/** The side of the line through the rivet at angle a that holds the angles just past a (s = +1) or just short of it (s = -1). */
const side = (a: number, s: 1 | -1): HalfPlane => ({ a: HUB, b: ray(a), keep: ray(a + s * 0.2, 0.5) });
const ABOVE: HalfPlane = { a: v2(-2, 0), b: v2(2, 0), keep: v2(0, 1) };

/** Angles (radians, from the rivet, 0 = right along the fold; on the paper as it lies flat) of each pleat's inner crease on the right. */
export function sensuGeometry(p: SensuParams = DEFAULT_SENSU) {
  const { pleats: n, halfSpread } = p;
  if (!(Number.isInteger(n) && n >= 2 && n <= 8)) throw new FoldError('sensu: 2 to 8 pleats a side');
  if (!(halfSpread > 45 && halfSpread < 85)) throw new FoldError('sensu: half spread out of range');
  const half = halfSpread * DEG;
  /** half the angle each pleat's wedge takes up, in the paper */
  const tuck = (Math.PI / 2 - half) / (2 * n);
  /** the angle every panel shows (the middle one is the same, centred) */
  const panel = half / (n + 0.5);
  // Each pleat's inner crease, as an angle in the flat paper, from the middle out.
  // Seen in the folded fan a pleat's step sits half a panel and one tuck further
  // out each time; in the paper every pleat further in has also used two tucks.
  const inner: number[] = [];
  for (let k = 0; k < n; k++) inner.push(Math.PI / 2 - panel / 2 - tuck - k * (panel + 2 * tuck));
  /** where the round-off folds cross the edges, in sheet coordinates: the crease
   *  runs from (round, 1) to (1, round), the line x + y = sqrt 2 (and its mirror) */
  const round = Math.SQRT2 - 1;
  /** the same crease measured for a folder: its distance in from the corner along
   *  each edge, as a fraction of the square's side ((1 - round) / 2, about 29.3%).
   *  Kept apart from `round`, a coordinate, so the two are never confused again. */
  const cornerOffset = (1 - round) / 2;
  return { n, half, tuck, panel, inner, round, cornerOffset };
}

/** Pleat k: on each side, a wedge folds over along its inner crease and the rest of the side folds back along the next. */
export function sensuPleatSpec(p: SensuParams, k: number): CollapseSpec {
  const g = sensuGeometry(p);
  const A = g.inner[k], d = g.tuck, L = (x: number) => Math.PI - x;
  return {
    base: 'base',
    regions: [
      { tag: `sensu-${k}-base`, body: 'base', where: [ABOVE, side(A, 1), side(L(A), -1)] },
      { tag: `sensu-${k}-tuck-right`, body: 'tuck-right', where: [ABOVE, side(A, -1), side(A - d, 1)] },
      { tag: `sensu-${k}-outer-right`, body: 'outer-right', where: [ABOVE, side(A - d, -1)] },
      { tag: `sensu-${k}-tuck-left`, body: 'tuck-left', where: [ABOVE, side(L(A), 1), side(L(A - d), -1)] },
      { tag: `sensu-${k}-outer-left`, body: 'outer-left', where: [ABOVE, side(L(A - d), 1)] },
    ],
    creases: [
      { name: `sensu-${k}-in-right`, parent: 'base', child: 'tuck-right', a: HUB, b: ray(A), rate: 1, sign: 1 },
      { name: `sensu-${k}-out-right`, parent: 'tuck-right', child: 'outer-right', a: HUB, b: ray(A - d), rate: 1, sign: -1 },
      { name: `sensu-${k}-in-left`, parent: 'base', child: 'tuck-left', a: HUB, b: ray(L(A)), rate: 1, sign: 1 },
      { name: `sensu-${k}-out-left`, parent: 'tuck-left', child: 'outer-left', a: HUB, b: ray(L(A - d)), rate: 1, sign: -1 },
    ],
    groups: { 'tuck-right': 0, 'outer-right': 0, 'tuck-left': 1, 'outer-left': 1 },
    pace: 1,
  };
}

const ORDINAL = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth'];

export function buildSensu(p: SensuParams = DEFAULT_SENSU): Construction {
  const g = sensuGeometry(p);
  const print = p.side === 'print';
  const r = g.round;
  const deg = (x: number) => (x / DEG).toFixed(1);
  const ops: Op[] = [
    {
      kind: 'fold', id: 'sensu-half', title: print ? 'Fold in half, bottom edge behind' : 'Fold in half, bottom edge up',
      hint: (print ? 'Print side up. Fold the bottom edge up behind to meet the top edge.' : 'Print side up. Fold the bottom edge up to meet the top edge.')
        + ` The middle of the fold is the rivet. The fan shows ${print ? 'the print' : 'the reverse colour'}.`,
      folds: [{ name: 'sensu-half', a: v2(-1.5, 0), b: v2(1.5, 0), moving: v2(0, -1), sense: print ? 'mountain' : 'valley' }],
    },
    {
      kind: 'fold', id: 'sensu-round', title: 'Fold the top corners behind',
      hint: `All layers. Fold each top corner behind along a line from ${(g.cornerOffset * 100).toFixed(1)}% of the square in from the corner along the top to the same distance down the side. The outline is now half an octagon round the rivet.`,
      folds: [
        { name: 'sensu-round-right', a: v2(r, 1), b: v2(1, r), moving: v2(0.99, 0.99), sense: 'mountain' },
        { name: 'sensu-round-left', a: v2(-1, r), b: v2(-r, 1), moving: v2(-0.99, 0.99), sense: 'mountain' },
      ],
    },
  ];
  // Outermost pleat first: each step's creases then lie in paper that has not been
  // pleated, which is still flat beside them, and the pleats already made ride
  // along with the outer part. (Worked from the middle out, the same pleats join
  // paper resting on a growing stack, and the drawing opens at the rivet.)
  for (let k = g.n - 1; k >= 0; k--) {
    const fromMiddle = 90 - g.inner[k] / DEG;
    const done = g.n - 1 - k;
    ops.push({
      kind: 'collapse', id: `sensu-pleat-${done + 1}`, title: done === 0 ? 'Pleat both sides' : `Pleat both sides (${ORDINAL[done]})`,
      hint: `From the outside in. On each side, from the rivet: valley-fold along the line ${deg(fromMiddle * DEG)} degrees from the middle and mountain-fold along the line ${deg(g.tuck)} degrees further out, so the outer paper slides in over a narrow tuck. `
        + (k === 0 ? `That is the last pleat: ${2 * g.n + 1} panels, the fan open to ${2 * p.halfSpread} degrees.` : `${k} more on each side.`),
      collapse: sensuPleatSpec(p, k),
    });
  }
  return { name: print ? 'Folding fan' : 'Folding fan, reverse colour', ops, meta: { top: 1, shoulderPoint: v2(0, 1), sleeveCutDir: v2(1, 0) } };
}

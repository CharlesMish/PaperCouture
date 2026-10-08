import type { Construction } from './construction';
import type { Op } from './engine';
import { v2 } from './geometry';

/** Folded necktie (experimental). One intact square, set as a diamond: the
 * diagonal from the knot corner to the tip corner becomes the tie's axis.
 *
 * Four kite folds narrow the square from behind (the classic kite base, then
 * the same fold again). After the reveal the blade is the untouched central
 * strip of the printed face. The knot is the narrow end folded down and its
 * point tucked back up: a real two-crease pleat, not a drawn knot. There is no
 * neck loop or tied knot; place it flat over a top on the board.
 *
 * Coordinates: A(u, v) is the tie frame while the reverse faces up (v runs
 * along the diagonal toward the knot corner); B(u, v) is the same frame after
 * the reveal turn mirrors the model. The finished piece lies along a diagonal
 * of the workshop table; Display and the board turn it upright (see
 * garmentDisplayAngle). */

const S = Math.SQRT2;
type Point = [number, number];
const A = (u: number, v: number) => v2((u - v) / S, (u + v) / S);
const B = (u: number, v: number) => v2((v - u) / S, (u + v) / S);

/** The kite folds bisect the angle at the knot corner: 22.5 degrees, then
 * 11.25 degrees from the axis. At exactly these angles each folded edge lands
 * on the axis, so the two flaps meet without overlapping. Narrower or
 * overlapping variants exceeded the established layer-gap limit at the knot. */
export const NECKTIE_KITE_DEGREES = [22.5, 11.25] as const;
/** Knot crease, measured along the axis from the square's centre (the knot
 * corner is at v = sqrt(2)), and the depth of the tucked pleat. The tuck must be
 * more than half of the folded-down point, or its tip would rise above the knot. */
export const NECKTIE_KNOT = { crease: 0.7, depth: 0.38 } as const;

/** Where a kite crease from the knot corner, at `degrees` from the axis on the
 * left, meets the lower-left edge of the diamond (u + v = -sqrt(2)). */
function kitePoint(degrees: number): Point {
  const r = degrees * Math.PI / 180, dx = -Math.sin(r), dy = -Math.cos(r);
  const t = (2 * S) / -(dx + dy);
  return [dx * t, S + dy * t];
}

const fold = (F: typeof A, id: string, title: string, hint: string, a: Point, b: Point, moving: Point, only?: string): Op => ({
  kind: 'fold', id, title, hint,
  folds: [{ name: id, a: F(...a), b: F(...b), moving: F(...moving), sense: 'valley', ...(only ? { only } : {}) }],
});
const turn = (id: string, title: string, hint: string): Op => ({ kind: 'turn', id, title, hint });

export function buildNecktie(): Construction {
  const [wide, narrow] = NECKTIE_KITE_DEGREES.map(kitePoint);
  const mirror = (p: Point): Point => [-p[0], p[1]];
  const knot: Point = [0, S], { crease, depth } = NECKTIE_KNOT;
  return {
    name: 'Folded necktie',
    meta: { top: crease, shoulderPoint: v2(0, crease), sleeveCutDir: v2(1, 0) },
    ops: [
      turn('tie-reverse', 'Put the print underneath',
        'Work the tie from the reverse. Imagine a diagonal from the upper-left corner (the knot) to the lower-right corner (the tip).'),
      fold(A, 'tie-kite-left', 'Fold the first edge to the diagonal',
        'Fold the edge below the knot corner onto the diagonal, along the guide that starts at that corner.',
        knot, wide, [-S, -.2]),
      fold(A, 'tie-kite-right', 'Fold the other edge to meet it',
        'Fold the matching edge onto the diagonal. The two flaps meet without overlapping; the sheet is now a long kite.',
        knot, mirror(wide), [S, -.2]),
      fold(A, 'tie-narrow-left', 'Narrow the first side again',
        'Bring the new folded edge to the diagonal. The kite becomes slimmer toward the knot corner.',
        knot, narrow, [-.8, -.4]),
      fold(A, 'tie-narrow-right', 'Narrow the other side',
        'Repeat on the other side. The square corner at the far end stays whole: it will be the tip.',
        knot, mirror(narrow), [.8, -.4]),
      turn('tie-front', 'Turn over to the printed blade',
        'The kite folds go underneath. One continuous printed blade runs from the narrow end to the pointed tip.'),
      fold(B, 'tie-knot', 'Fold the narrow end down',
        'Fold the narrow point straight down across the tie along the guide. This flap starts the knot.',
        [-2, crease], [2, crease], knot),
      fold(B, 'tie-knot-tuck', 'Tuck the point back up to finish the knot',
        'Lift only the folded point and turn it back up, inside the knot. The two creases make a small knot above the blade. It is flat paper: no neck loop and nothing is tied.',
        [-2, crease - depth], [2, crease - depth], [0, crease - depth - 1], 'tie-knot'),
    ],
  };
}

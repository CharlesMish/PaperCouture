import type { Construction } from './construction';
import type { Op } from './engine';
import { v2 } from './geometry';
import { cm } from './measure';

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

/** How far along the narrowed tie's edges (or the folded-down knot flap's) a
 * distance `d` along the axis reaches: those edges run at the second kite angle. */
const alongEdge = (d: number) => d / Math.cos(NECKTIE_KITE_DEGREES[1] * Math.PI / 180);

export function buildNecktie(): Construction {
  const [wide, narrow] = NECKTIE_KITE_DEGREES.map(kitePoint);
  const mirror = (p: Point): Point => [-p[0], p[1]];
  const knot: Point = [0, S], { crease, depth } = NECKTIE_KNOT;
  // For the instructions, on the paper as it lies (the knot corner top left while
  // the kite is folded): the first creases meet the bottom (and right) edge this
  // far from the bottom left (top right) corner, the second ones this far from the
  // bottom right corner, the tip.
  const wideIn = A(...wide).x + 1, narrowIn = 1 - A(...narrow).x;
  // The knot crease lies S - crease along the axis from the narrow point; the tuck
  // crease lies `depth` below the knot fold. Both are given along the edges.
  const knotAlong = alongEdge(S - crease), tuckAlong = alongEdge(depth);
  return {
    name: 'Folded necktie',
    meta: { top: crease, shoulderPoint: v2(0, crease), sleeveCutDir: v2(1, 0) },
    ops: [
      turn('tie-reverse', 'Put the print underneath',
        'Turn it over from side to side, so the other colour is up. The diagonal from the top left corner (the narrow end) to the bottom right corner (the tip) becomes the tie.'),
      fold(A, 'tie-kite-left', 'Fold the left edge to the diagonal',
        `Fold the left edge in to lie along the diagonal, creasing from the top left corner. The crease meets the bottom edge ${cm(wideIn)} from the bottom left corner.`,
        knot, wide, [-S, -.2]),
      fold(A, 'tie-kite-right', 'Fold the top edge to meet it',
        `Fold the top edge down to lie along the diagonal the same way, creasing from the top left corner to the right edge ${cm(wideIn)} below the top right corner. The two edges meet: a kite.`,
        knot, mirror(wide), [S, -.2]),
      fold(A, 'tie-narrow-left', 'Narrow the left side again',
        `Fold the left folded edge in to the diagonal again, all the layers, creasing from the top left corner. The crease meets the bottom edge ${cm(narrowIn)} from the bottom right corner.`,
        knot, narrow, [-.8, -.4]),
      fold(A, 'tie-narrow-right', 'Narrow the top side again',
        `Fold the top folded edge down to the diagonal the same way, creasing from the top left corner to the right edge ${cm(narrowIn)} above the bottom right corner. That corner stays whole: it is the tip.`,
        knot, mirror(narrow), [.8, -.4]),
      turn('tie-front', 'Turn over to the printed blade',
        'Turn it over from side to side. The print is up, the narrow end now points to the top right and the tip to the bottom left.'),
      fold(B, 'tie-knot', 'Fold the narrow end down',
        `Fold the narrow end down toward the tip onto the print, all the layers, creasing straight across the tie ${cm(knotAlong)} from the narrow point, measured along its edges. The point comes down to about the middle of the tie.`,
        [-2, crease], [2, crease], knot),
      fold(B, 'tie-knot-tuck', 'Fold the point back up into a knot',
        `Fold only the folded-down point back up on top of the flap, creasing straight across it ${cm(tuckAlong)} below the top fold, measured along its edges. The point ends just below the top fold. The two folds make the knot.`,
        [-2, crease - depth], [2, crease - depth], [0, crease - depth - 1], 'tie-knot'),
    ],
  };
}

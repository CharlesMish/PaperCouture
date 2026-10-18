// Cloche: a bell-shaped hat from one small square, seen from the front: a rounded
// crown, a ribbon of the paper's other side round its base, and a short brim.
//
// Why it folds. Narrow bands are folded along the top and bottom edges, and the
// square is folded in half with the lower half behind, so the back half carries its
// band on the outside. The top of the doubled sheet then folds down in front: that
// flap is the crown, and because it brings the back half to the front, its lower
// edge carries the back half's band, a ribbon across the hat, with the brim below
// it. (It is the kimono's collar fold, done straight across.) From the back, the
// sides fold in to the hat's width, the crown's sides taper in to its top, and the
// top corners fold in to round it; the model turns back over.
//
// A brim wider than the crown would need a notch at each end of the ribbon, which
// one uncut square cannot make with flat folds (the notch is joined to the paper on
// two sides), so the brim is as wide as the crown's base, like a cloche's.
//
// Colour comes only from folding: the hat shows one side, the ribbon the other.
// The colour choice folds the bands behind and turns over before the half fold.

import type { Construction } from './construction';
import { FoldError, Op } from './engine';
import { v2 } from './geometry';

export type ClocheSide = 'print' | 'reverse';

export interface ClocheParams {
  /** Width of the edge bands (the ribbon), in sheet units. */
  band: number;
  /** Height of the crown fold on the doubled sheet (0 to 1). */
  crownFold: number;
  /** Half the hat's width, half the crown's flat top, and the rounding at the top corners. */
  halfWidth: number;
  halfTop: number;
  round: number;
  side: ClocheSide;
}

export const DEFAULT_CLOCHE: ClocheParams = { band: 0.05, crownFold: 0.57, halfWidth: 0.64, halfTop: 0.32, round: 0.14, side: 'print' };

export function clocheGeometry(p: ClocheParams = DEFAULT_CLOCHE) {
  const { band: b, crownFold: k, halfWidth: s, halfTop: a, round } = p;
  if (!(b > 0.02 && b < 0.1)) throw new FoldError('cloche: band out of range');
  if (!(k > 0.52 && k < 0.66)) throw new FoldError('cloche: crown fold out of range');
  if (!(a < s && s <= 0.9 && a > 0.1)) throw new FoldError('cloche: widths out of range');
  // the doubled sheet's top edge is at 1 - b (its bands are folded), so the crown
  // flap's lower edge, where the ribbon starts, lands at 2k - (1 - b)
  const ribbon = 2 * k - 1 + b;
  const taper = Math.hypot(s - a, k - ribbon);
  if (!(round > 0 && round < Math.min(a, taper / 2))) throw new FoldError('cloche: rounding out of range');
  const u = round / taper;
  return { b, top: k, ribbon, halfWidth: s, halfTop: a, round, dx: (s - a) * u, dy: (k - ribbon) * u };
}

/** Rendered-level allowance per operation (scripts/hingeCheck.ts). The sides, the
 * taper and the rounding each fold the whole stack, so the renderer's levels put the
 * two sides of the rounding folds 37 apart; those creases fold through 16 paper
 * layers and the crown's top corners have up to 32 (check-wardrobe-gaps.ts). */
export const CLOCHE_LEVELS: Readonly<Record<string, number>> = { 'cl-sides': 11, 'cl-taper': 23, 'cl-round': 37, 'cl-reveal': 38 };

export function buildCloche(p: ClocheParams = DEFAULT_CLOCHE): Construction {
  const g = clocheGeometry(p);
  const { b, top: k, ribbon: r, halfWidth: s, halfTop: a, round: d, dx, dy } = g;
  const print = p.side === 'print';
  const pct = (x: number) => `${(x * 50).toFixed(1)}%`;
  const ops: Op[] = [
    {
      kind: 'fold', id: 'cl-bands', title: print ? 'Fold down narrow bands' : 'Fold narrow bands behind',
      hint: `Print side up. Fold the top and bottom edges ${print ? 'in' : 'behind'} by ${pct(b)} of the side. One becomes the ribbon, in ${print ? 'the reverse colour' : 'the print'}; the hat shows ${print ? 'the print' : 'the reverse colour'}.`,
      folds: [
        { name: 'cl-band-top', a: v2(1.5, 1 - b), b: v2(-1.5, 1 - b), moving: v2(0, 0.999), sense: print ? 'valley' : 'mountain' },
        { name: 'cl-band-bottom', a: v2(-1.5, -1 + b), b: v2(1.5, -1 + b), moving: v2(0, -0.999), sense: print ? 'valley' : 'mountain' },
      ],
    },
  ];
  if (!print) ops.push({ kind: 'turn', id: 'cl-turn-0', title: 'Turn over', hint: 'The bands stay at the top and bottom.' });
  ops.push(
    {
      kind: 'fold', id: 'cl-half', title: 'Fold in half, bottom edge behind',
      hint: 'Fold the bottom edge up behind to meet the top edge. The back half now carries its band on the outside.',
      folds: [{ name: 'cl-half', a: v2(-1.5, 0), b: v2(1.5, 0), moving: v2(0, -0.5), sense: 'mountain' }],
    },
    {
      kind: 'fold', id: 'cl-crown', title: 'Fold the top down: the crown',
      hint: `All layers. Fold the top down along a line ${pct(k)} of the square above the bottom fold. The back half's band comes to the front along the flap's lower edge: the ribbon. Below it is the brim.`,
      folds: [{ name: 'cl-crown', a: v2(1.5, k), b: v2(-1.5, k), moving: v2(0, 0.9), sense: 'valley' }],
    },
    { kind: 'turn', id: 'cl-turn', title: 'Turn over', hint: 'Shape the hat from the back.' },
    {
      kind: 'fold', id: 'cl-sides', title: 'Fold in the sides',
      hint: `All layers. Fold both sides in so the hat is ${pct(2 * s)} of the square wide.`,
      folds: [
        { name: 'cl-side-left', a: v2(-s, 1.5), b: v2(-s, -1.5), moving: v2(-0.99, 0.1), sense: 'valley' },
        { name: 'cl-side-right', a: v2(s, -1.5), b: v2(s, 1.5), moving: v2(0.99, 0.1), sense: 'valley' },
      ],
    },
    {
      kind: 'fold', id: 'cl-taper', title: 'Taper the crown',
      hint: `All layers. Fold each upper corner in along a line from the end of the ribbon to ${pct(a)} of the square from the middle along the top.`,
      folds: [
        { name: 'cl-taper-left', a: v2(-s, r), b: v2(-a, k), moving: v2(-s + 0.01, k - 0.01), sense: 'valley' },
        { name: 'cl-taper-right', a: v2(a, k), b: v2(s, r), moving: v2(s - 0.01, k - 0.01), sense: 'valley' },
      ],
    },
    {
      kind: 'fold', id: 'cl-round', title: 'Round the top',
      hint: `Fold the two top corners in, ${pct(d)} of the square along each edge, to round the crown.`,
      folds: [
        { name: 'cl-round-left', a: v2(-a - dx, k - dy), b: v2(-a + d, k), moving: v2(-a + 0.003, k - 0.003), sense: 'valley' },
        { name: 'cl-round-right', a: v2(a - d, k), b: v2(a + dx, k - dy), moving: v2(a - 0.003, k - 0.003), sense: 'valley' },
      ],
    },
    { kind: 'turn', id: 'cl-reveal', title: 'Turn over', hint: 'The finished cloche.' },
  );
  return { name: print ? 'Cloche' : 'Cloche, reverse colour', ops, meta: { top: k, shoulderPoint: v2(0, k), sleeveCutDir: v2(1, 0) } };
}

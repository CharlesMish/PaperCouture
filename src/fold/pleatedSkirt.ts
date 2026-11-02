import { Construction } from './construction';
import { v2 } from './geometry';
import { cm } from './measure';

export type PleatDepth = 'shallow' | 'classic' | 'deep';
/** Discrete return creases: 0.15 / 0.2 / 0.26 inward of each pleat crease. Only the
 * `pleats-return` operation changes, so the choice sits before that fold.
 * Shallow returns more paper and hides the reverse channel; deep returns less
 * and leaves a broad reverse channel. Below about 0.14 the returned paper
 * crosses the later hem-corner creases and the engine reports a tear. */
/* The return creases are stored as literal x positions (top edge, lower edge)
 * rather than computed offsets, so the Classic default keeps bit-identical
 * creases (0.56 - 0.2 is not exactly 0.36 in floating point). */
export const PLEAT_DEPTHS: { id: PleatDepth; name: string; top: number; bottom: number; hint: string }[] = [
  { id: 'shallow', name: 'Shallow', top: 0.41, bottom: 0.61, hint: 'More of each flap folds back, so the printed pleats almost hide the other colour.' },
  { id: 'classic', name: 'Classic', top: 0.36, bottom: 0.56, hint: 'These become the pleats, with narrow strips of the other colour at the sides.' },
  { id: 'deep', name: 'Deep', top: 0.3, bottom: 0.5, hint: 'Less of each flap folds back, so wider strips of the other colour show at the sides.' },
];
/** The side folds: on the top edge at ±SIDE_TOP, on the bottom edge at ±SIDE_BOTTOM. */
const SIDE_TOP = 0.56, SIDE_BOTTOM = 0.76;
/** The shortening fold and the waistband fold. */
const LENGTH = -0.6, WAIST = 0.78;
/** The return folds, for the instructions: parallel to the side folds, meeting the
 * top edge SIDE_TOP - d.top in from them. */
const returnHint = (d: typeof PLEAT_DEPTHS[number]) =>
  `On each side flap only, fold the inner part back out along a crease parallel to the side fold, meeting the top edge ${cm(SIDE_TOP - d.top)} in from the side fold. ${d.hint}`;

/** Two broad returned pleats, made from one uncut square.
 *
 * The parallel pairs of creases leave a printed central panel, printed pleat
 * faces, and narrow channels of reverse paper. The pleats are rigid material
 * folds; no printed lines, mesh scaling, or inflated cloth provide their shape.
 * The shortening fold is worked from the back, then its two projecting corners
 * are folded inward before the paper is turned front-up for the waistband.
 */
export function buildPleatedSkirt(depth: PleatDepth = 'classic'): Construction {
  const d = PLEAT_DEPTHS.find(option => option.id === depth)!;
  const construction: Construction = {
    name: 'Pleated skirt',
    meta: { top: 0.78, shoulderPoint: v2(-0.56, 1), sleeveCutDir: v2(1, 0) },
    ops: [
      {
        kind: 'fold', id: 'pleats-in', title: 'Fold the sides in for the pleats',
        hint: `Print side up. Fold each side in onto the print along a slanting crease: from the top edge ${cm(1 - SIDE_TOP)} in from the side, to the bottom edge ${cm(1 - SIDE_BOTTOM)} in from the side. The broad centre stays open between the flaps.`,
        folds: [
          { name: 'pleat-left', a: v2(-SIDE_TOP, 1), b: v2(-SIDE_BOTTOM, -1), moving: v2(-1, 0), sense: 'valley' },
          { name: 'pleat-right', a: v2(SIDE_TOP, 1), b: v2(SIDE_BOTTOM, -1), moving: v2(1, 0), sense: 'valley' },
        ],
      },
      {
        kind: 'fold', id: 'pleats-return', title: 'Return the inner edges outward',
        hint: returnHint(d),
        folds: [
          { name: 'pleat-return-left', a: v2(-d.top, 1), b: v2(-d.bottom, -1), moving: v2(0, 0), sense: 'valley', only: 'pleat-left' },
          { name: 'pleat-return-right', a: v2(d.top, 1), b: v2(d.bottom, -1), moving: v2(0, 0), sense: 'valley', only: 'pleat-right' },
        ],
      },
      {
        kind: 'turn', id: 'pleats-hem-back', title: 'Turn over to finish the hem',
        hint: 'Turn it over from side to side, so the pleats are underneath.',
      },
      {
        kind: 'fold', id: 'pleats-length', title: 'Lift the lower edge to shorten the skirt',
        hint: `Fold the bottom up onto the back along a crease ${cm(1 - LENGTH)} below the top edge, through all the layers. This sets the skirt length.`,
        folds: [{ name: 'pleats-length', a: v2(-1.5, LENGTH), b: v2(1.5, LENGTH), moving: v2(0, -1.5), sense: 'valley' }],
      },
      {
        kind: 'fold', id: 'pleats-hem-corners', title: 'Tuck the two hem corners inward',
        hint: 'The turned-up strip sticks out a little past each side. Fold the strip only: turn its two corners in onto it, along the side edges of the paper beneath.',
        folds: [
          { name: 'pleats-hem-left', a: v2(-SIDE_TOP, 1), b: v2(-SIDE_BOTTOM, -1), moving: v2(-1, 0), sense: 'valley', only: 'pleats-length' },
          { name: 'pleats-hem-right', a: v2(SIDE_TOP, 1), b: v2(SIDE_BOTTOM, -1), moving: v2(1, 0), sense: 'valley', only: 'pleats-length' },
        ],
      },
      {
        kind: 'turn', id: 'pleats-front', title: 'Turn back to the pleated front',
        hint: 'Turn it over from side to side, back to the centre panel and the two pleats.',
      },
      {
        kind: 'fold', id: 'pleats-waist', title: 'Fold down the waistband',
        hint: `Fold the top edge down over the pleats by ${cm(1 - WAIST)}, all the layers. This band, in the other colour, is the waistband.`,
        folds: [{ name: 'pleats-waist', a: v2(-1.5, WAIST), b: v2(1.5, WAIST), moving: v2(0, 1.5), sense: 'valley' }],
      },
    ],
  };
  if (depth !== 'classic') {
    const ret = construction.ops.find(op => op.id === 'pleats-return')!;
    ret.title = depth === 'shallow' ? 'Fold back more of each flap for shallow pleats' : 'Fold back less of each flap for deep pleats';
    construction.name = `${d.name} pleated skirt`;
  }
  return construction;
}

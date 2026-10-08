import { Construction } from './construction';
import { v2 } from './geometry';

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
  { id: 'shallow', name: 'Shallow', top: 0.41, bottom: 0.61, hint: 'Return most of each flap. The printed pleat faces almost close over the reverse channels.' },
  { id: 'classic', name: 'Classic', top: 0.36, bottom: 0.56, hint: 'Lift only the free inner edges and fold them back toward the sides. The two returned panels become the pleats.' },
  { id: 'deep', name: 'Deep', top: 0.3, bottom: 0.5, hint: 'Return a narrower strip. Broad reverse channels stay open beside the centre panel.' },
];

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
        hint: 'Lift both side panels onto the printed face. Leave the broad centre open between them.',
        folds: [
          { name: 'pleat-left', a: v2(-0.56, 1), b: v2(-0.76, -1), moving: v2(-1, 0), sense: 'valley' },
          { name: 'pleat-right', a: v2(0.56, 1), b: v2(0.76, -1), moving: v2(1, 0), sense: 'valley' },
        ],
      },
      {
        kind: 'fold', id: 'pleats-return', title: 'Return the inner edges outward',
        hint: 'Lift only the free inner edges and fold them back toward the sides. The two returned panels become the pleats.',
        folds: [
          { name: 'pleat-return-left', a: v2(-d.top, 1), b: v2(-d.bottom, -1), moving: v2(0, 0), sense: 'valley', only: 'pleat-left' },
          { name: 'pleat-return-right', a: v2(d.top, 1), b: v2(d.bottom, -1), moving: v2(0, 0), sense: 'valley', only: 'pleat-right' },
        ],
      },
      {
        kind: 'turn', id: 'pleats-hem-back', title: 'Turn over to finish the hem',
        hint: 'The pleats are underneath. Work on this side so the hem can fold upward in view.',
      },
      {
        kind: 'fold', id: 'pleats-length', title: 'Lift the lower edge to shorten the skirt',
        hint: 'Bring the lower panel up along the guide. Its corners will be tidied next.',
        folds: [{ name: 'pleats-length', a: v2(-1.5, -0.6), b: v2(1.5, -0.6), moving: v2(0, -1.5), sense: 'valley' }],
      },
      {
        kind: 'fold', id: 'pleats-hem-corners', title: 'Tuck the two hem corners inward',
        hint: 'Fold the small projecting corners onto the back, following the side edges. This keeps the hem neat.',
        folds: [
          { name: 'pleats-hem-left', a: v2(-0.56, 1), b: v2(-0.76, -1), moving: v2(-1, 0), sense: 'valley', only: 'pleats-length' },
          { name: 'pleats-hem-right', a: v2(0.56, 1), b: v2(0.76, -1), moving: v2(1, 0), sense: 'valley', only: 'pleats-length' },
        ],
      },
      {
        kind: 'turn', id: 'pleats-front', title: 'Turn back to the pleated front',
        hint: 'The shortened hem is underneath. The broad centre and both returned pleats are visible again.',
      },
      {
        kind: 'fold', id: 'pleats-waist', title: 'Fold down the waistband',
        hint: 'Bring the top strip down over the pleats. Its reverse colour finishes the waist.',
        folds: [{ name: 'pleats-waist', a: v2(-1.5, 0.78), b: v2(1.5, 0.78), moving: v2(0, 1.5), sense: 'valley' }],
      },
    ],
  };
  if (depth !== 'classic') {
    const ret = construction.ops.find(op => op.id === 'pleats-return')!;
    ret.title = depth === 'shallow' ? 'Return most of each flap for shallow pleats' : 'Return a narrow strip for deep pleats';
    ret.hint = d.hint;
    construction.name = `${d.name} pleated skirt`;
  }
  return construction;
}

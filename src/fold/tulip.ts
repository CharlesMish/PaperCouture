import { Construction } from './construction';
import { v2 } from './geometry';
import { cm, lineMeet } from './measure';

/** A folded tulip head from its own square, with valley folds only.
 *
 * The square is folded in half corner to corner, with the print outside. The
 * middle of the long fold becomes the base of the flower. Each end of the
 * long fold is then folded up through both layers, hinged at that base point,
 * so the two ends cross in front of the tip of the triangle: two petals with the
 * tip showing between them, which is the classic three-point tulip.
 *
 * TULIP_ANGLE is the angle between each petal crease and the centre line.
 * At 45° the ends meet at the tip (a plain diamond). Below 30° the first petal
 * reaches past the second crease and is caught by the second fold. 33° leaves a margin.
 * Folding only the top layer, for two-tone petals, was tried and removed:
 * the petal crease crosses the joined long fold, so the engine reports a tear
 * (see docs/geometry-collection/drafts/NOTES.md).
 *
 * The flower's centre line runs from the middle of the square to a corner, so
 * the accessory registry turns it by -3π/4 to stand it upright. */
export const TULIP_ANGLE = 33;
export const TULIP_SCALE = 0.2;
/** Lowers the upright flower by about half its height, so it is centred on
 * the anchor and fits inside the skirts' waistbands. */
export const TULIP_LIFT = -0.7;
export const TULIP_POSITIONS = ['waist-left', 'waist', 'waist-right'] as const;

export function buildTulip(): Construction {
  const f = (TULIP_ANGLE * Math.PI) / 180, s = Math.SQRT1_2;
  // unit directions from the base (0, 0): toward the tip (-1, -1) and toward each end of the fold
  const tip = v2(-s, -s), endA = v2(-s, s), endC = v2(s, -s);
  const crease = (end: typeof tip) => v2(Math.cos(f) * tip.x + Math.sin(f) * end.x, Math.cos(f) * tip.y + Math.sin(f) * end.y);
  // for the instructions: the first petal crease meets the triangle's left edge (x = -1)
  // this far above its square corner (-1, -1); the second, by symmetry, the bottom edge as far from it
  const fromCorner = lineMeet(v2(0, 0), crease(endA), v2(-1, -1), v2(0, 1)).y + 1;
  return {
    name: 'Folded tulip',
    meta: { top: 0, shoulderPoint: v2(0, 0), sleeveCutDir: v2(1, 0) },
    ops: [
      { kind: 'turn', id: 'tulip-turn', title: 'Turn the square over', hint: 'Start print side up and turn it over from side to side, so the print is underneath. The next fold brings it back outside.' },
      {
        kind: 'fold', id: 'tulip-half', title: 'Fold in half, corner to corner',
        hint: 'Fold in half corner to corner: bring the top right corner down onto the bottom left corner, creasing from the top left corner to the bottom right corner. The middle of this long fold is the base of the flower.',
        folds: [{ name: 'tulip-half', a: v2(-1, 1), b: v2(1, -1), moving: v2(1, 1), sense: 'valley' }],
      },
      // Two operations: the second petal lands over the first.
      {
        kind: 'fold', id: 'tulip-left', title: 'Fold the top left point over into a petal',
        hint: `Fold the top left point down, both layers, along a crease from the middle of the long fold to the left edge, ${cm(fromCorner)} above the square corner. Its point now sticks out past the bottom edge.`,
        folds: [{ name: 'tulip-left', a: v2(0, 0), b: crease(endA), moving: v2(-1, 1), sense: 'valley' }],
      },
      {
        kind: 'fold', id: 'tulip-right', title: 'Fold the bottom right point over into a petal',
        hint: `Fold the bottom right point over the first petal, both layers: crease from the middle of the long fold to the bottom edge, ${cm(fromCorner)} from the square corner. The square corner shows between the two petals: the tulip.`,
        folds: [{ name: 'tulip-right', a: v2(0, 0), b: crease(endC), moving: v2(1, -1), sense: 'valley' }],
      },
    ],
  };
}

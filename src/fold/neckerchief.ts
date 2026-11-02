import { Construction } from './construction';
import { v2 } from './geometry';
import { cm } from './measure';

/** A small neckerchief from its own square: a contrasting folded neckband over
 * a printed triangle that points down the chest. Placement at the neckline is
 * a styling step, not a knot or a paper lock with the garment. */
export const NECKERCHIEF_SCALE = 0.17;
/** Only the neckline suits a neckerchief; other anchors are not offered. */
export const NECKERCHIEF_POSITIONS = ['neckline'] as const;

export function buildNeckerchief(): Construction {
  const band = 1 - 0.6; // depth of the neckband folded down from the top edge
  return {
    name: 'Neckerchief',
    meta: { top: 0.6, shoulderPoint: v2(0, 0.6), sleeveCutDir: v2(1, 0) },
    ops: [
      {
        kind: 'fold', id: 'kerchief-band', title: 'Fold down the neckband',
        hint: `Print side up. Fold the top edge down onto the print by ${cm(band)}, all the way across. This band, in the other colour, becomes the neckband.`,
        folds: [{ name: 'kerchief-band', a: v2(-1.5, 0.6), b: v2(1.5, 0.6), moving: v2(0, 1.5), sense: 'valley' }],
      },
      { kind: 'turn', id: 'kerchief-turn', title: 'Turn the square over', hint: 'Turn it over from side to side, so the neckband is underneath along the top edge.' },
      // Two separate operations: the side flaps overlap in the middle, so the
      // second one is folded over the first rather than swinging at once.
      {
        kind: 'fold', id: 'kerchief-left', title: 'Fold the left side in',
        hint: 'Fold the left side in along a slanting crease from the top left corner to the middle of the bottom edge. Fold all the layers.',
        folds: [{ name: 'kerchief-left', a: v2(-1, 0.6), b: v2(0, -1), moving: v2(-1, -1), sense: 'valley' }],
      },
      {
        kind: 'fold', id: 'kerchief-right', title: 'Fold the right side over it',
        hint: 'Fold the right side in over the left one, along a slanting crease from the top right corner to the same point at the middle of the bottom edge. The paper is now a triangle pointing down.',
        folds: [{ name: 'kerchief-right', a: v2(1, 0.6), b: v2(0, -1), moving: v2(1, -1), sense: 'valley' }],
      },
      { kind: 'turn', id: 'kerchief-front', title: 'Reveal the neckerchief', hint: 'Turn it over from side to side: a printed triangle pointing down, with the neckband in the other colour along its top edge.' },
    ],
  };
}

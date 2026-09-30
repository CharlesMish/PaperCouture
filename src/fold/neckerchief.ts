import { Construction } from './construction';
import { v2 } from './geometry';

/** A small neckerchief from its own square: a contrasting folded neckband over
 * a printed triangle that points down the chest. Placement at the neckline is
 * a styling step, not a knot or a paper lock with the garment. */
export const NECKERCHIEF_SCALE = 0.17;
/** Only the neckline suits a neckerchief; other anchors are not offered. */
export const NECKERCHIEF_POSITIONS = ['neckline'] as const;

export function buildNeckerchief(): Construction {
  return {
    name: 'Neckerchief',
    meta: { top: 0.6, shoulderPoint: v2(0, 0.6), sleeveCutDir: v2(1, 0) },
    ops: [
      {
        kind: 'fold', id: 'kerchief-band', title: 'Fold down the neckband',
        hint: 'Bring the top edge down onto the print. The band shows the reverse and becomes the folded neckband.',
        folds: [{ name: 'kerchief-band', a: v2(-1.5, 0.6), b: v2(1.5, 0.6), moving: v2(0, 1.5), sense: 'valley' }],
      },
      { kind: 'turn', id: 'kerchief-turn', title: 'Turn the square over', hint: 'The band is underneath. The two sides fold in on this side.' },
      // Two separate operations: the side flaps overlap in the middle, so the
      // second one is folded over the first rather than swinging at once.
      {
        kind: 'fold', id: 'kerchief-left', title: 'Fold the first side in',
        hint: 'Fold the left side along the guide, from its top corner to the middle of the lower edge.',
        folds: [{ name: 'kerchief-left', a: v2(-1, 0.6), b: v2(0, -1), moving: v2(-1, -1), sense: 'valley' }],
      },
      {
        kind: 'fold', id: 'kerchief-right', title: 'Fold the second side over it',
        hint: 'Fold the right side over the first along the matching guide. The square is now a triangle.',
        folds: [{ name: 'kerchief-right', a: v2(1, 0.6), b: v2(0, -1), moving: v2(1, -1), sense: 'valley' }],
      },
      { kind: 'turn', id: 'kerchief-front', title: 'Reveal the neckerchief', hint: 'A printed triangle with a reverse-colour neckband. Place it at the neckline; it is not knotted or locked on.' },
    ],
  };
}

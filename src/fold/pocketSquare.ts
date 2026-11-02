import { Construction } from './construction';
import { v2 } from './geometry';
import { cm } from './measure';

/** A folded patch pocket from its own square (the flat "TV fold" of a pocket
 * square): a printed patch with a straight band of the reverse along its top.
 * The whole piece lies flat on the chest as a styled patch-pocket motif. It is
 * not a hankie tucked into a garment pocket; no pocket or slot is folded into
 * the garment (Astra review of PR #11: the name says so, and the last step
 * says to lay it flat on the chest).
 *
 * A pointed version (folding the two top corners down to a peak) was tried
 * and removed: the corners are four layers deep by then and the turn opened a
 * sampled hinge gap of 0.061 against the 0.044 limit. */
export const POCKET_SCALE = 0.14;
export const POCKET_POSITIONS = ['chest-left', 'chest-right'] as const;

export function buildPocketSquare(): Construction {
  const band = 1 - 0.7; // depth of the band folded down from the top edge
  const lift = -0.2 - -1; // the bottom fold's crease, above the bottom edge
  return {
    name: 'Folded patch pocket',
    meta: { top: 0.7, shoulderPoint: v2(0, 0.7), sleeveCutDir: v2(1, 0) },
    ops: [
      {
        kind: 'fold', id: 'pocket-band', title: 'Fold down the top edge',
        hint: `Print side up. Fold the top edge down onto the print by ${cm(band)}, all the way across. This band, in the other colour, becomes the top of the pocket.`,
        folds: [{ name: 'pocket-band', a: v2(-1.5, 0.7), b: v2(1.5, 0.7), moving: v2(0, 1.5), sense: 'valley' }],
      },
      { kind: 'turn', id: 'pocket-turn', title: 'Turn the square over', hint: 'Turn it over from side to side, so the band is underneath along the top edge.' },
      {
        kind: 'fold', id: 'pocket-sides', title: 'Fold both sides to the middle',
        hint: 'Fold the left and right edges in to meet on the centre line, without overlapping. Fold all the layers.',
        folds: [
          { name: 'pocket-left', a: v2(-0.5, -1.5), b: v2(-0.5, 1.5), moving: v2(-1, 0), sense: 'valley' },
          { name: 'pocket-right', a: v2(0.5, -1.5), b: v2(0.5, 1.5), moving: v2(1, 0), sense: 'valley' },
        ],
      },
      {
        kind: 'fold', id: 'pocket-bottom', title: 'Fold the bottom edge up',
        hint: `Fold the bottom edge up along a crease ${cm(lift)} above it, all the layers, over the side flaps. It stops just short of the top edge.`,
        folds: [{ name: 'pocket-bottom', a: v2(-1.5, -0.2), b: v2(1.5, -0.2), moving: v2(0, -1.5), sense: 'valley' }],
      },
      { kind: 'turn', id: 'pocket-front', title: 'Reveal the patch pocket', hint: 'Turn it over from side to side: a printed patch with a band of the other colour across the top. Lay it flat on the chest.' },
    ],
  };
}

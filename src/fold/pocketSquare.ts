import { Construction } from './construction';
import { v2 } from './geometry';

/** A folded patch pocket from its own square (the flat "TV fold" of a pocket
 * square): a printed patch with a straight band of the reverse along its top.
 * The whole piece lies flat on the chest as a styled patch-pocket motif. It is
 * not a hankie tucked into a garment pocket; no pocket or slot is folded into
 * the garment (Astra review of PR #11: name and hints say so).
 *
 * A pointed version (folding the two top corners down to a peak) was tried
 * and removed: the corners are four layers deep by then and the turn opened a
 * sampled hinge gap of 0.061 against the 0.044 limit. */
export const POCKET_SCALE = 0.14;
export const POCKET_POSITIONS = ['chest-left', 'chest-right'] as const;

export function buildPocketSquare(): Construction {
  return {
    name: 'Folded patch pocket',
    meta: { top: 0.7, shoulderPoint: v2(0, 0.7), sleeveCutDir: v2(1, 0) },
    ops: [
      {
        kind: 'fold', id: 'pocket-band', title: 'Fold down the top edge',
        hint: 'Bring the top edge down onto the print. This reverse-colour band becomes the top edge of the patch.',
        folds: [{ name: 'pocket-band', a: v2(-1.5, 0.7), b: v2(1.5, 0.7), moving: v2(0, 1.5), sense: 'valley' }],
      },
      { kind: 'turn', id: 'pocket-turn', title: 'Turn the square over', hint: 'The band is underneath. Narrow the square from this side.' },
      {
        kind: 'fold', id: 'pocket-sides', title: 'Fold both sides to the middle',
        hint: 'Bring the left and right edges to the centre line. They meet without overlapping.',
        folds: [
          { name: 'pocket-left', a: v2(-0.5, -1.5), b: v2(-0.5, 1.5), moving: v2(-1, 0), sense: 'valley' },
          { name: 'pocket-right', a: v2(0.5, -1.5), b: v2(0.5, 1.5), moving: v2(1, 0), sense: 'valley' },
        ],
      },
      {
        kind: 'fold', id: 'pocket-bottom', title: 'Fold the lower edge up',
        hint: 'Lift the bottom panel onto this side to make a small, firm patch.',
        folds: [{ name: 'pocket-bottom', a: v2(-1.5, -0.2), b: v2(1.5, -0.2), moving: v2(0, -1.5), sense: 'valley' }],
      },
      { kind: 'turn', id: 'pocket-front', title: 'Reveal the patch pocket', hint: 'A printed patch with a straight reverse band along the top. Place it flat on the chest; nothing is tucked into the garment.' },
    ],
  };
}

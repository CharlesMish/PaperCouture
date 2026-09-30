import { Construction } from './construction';
import { v2 } from './geometry';

/** A pocket square from its own square, in the flat "TV fold": a printed
 * pocket with a straight band of the reverse along the top where the square
 * peeks out. It is placed on the chest as a styled piece; no pocket is cut
 * into the garment.
 *
 * A pointed version (folding the two top corners down to a peak) was tried
 * and removed: the corners are four layers deep by then and the turn opened a
 * sampled hinge gap of 0.061 against the 0.044 limit. */
export const POCKET_SCALE = 0.14;
export const POCKET_POSITIONS = ['chest-left', 'chest-right'] as const;

export function buildPocketSquare(): Construction {
  return {
    name: 'Pocket square',
    meta: { top: 0.7, shoulderPoint: v2(0, 0.7), sleeveCutDir: v2(1, 0) },
    ops: [
      {
        kind: 'fold', id: 'pocket-band', title: 'Fold down the top edge',
        hint: 'Bring the top edge down onto the print. This reverse-colour band is the strip that shows above the pocket.',
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
        hint: 'Lift the bottom panel onto this side to make a small, firm pocket.',
        folds: [{ name: 'pocket-bottom', a: v2(-1.5, -0.2), b: v2(1.5, -0.2), moving: v2(0, -1.5), sense: 'valley' }],
      },
      { kind: 'turn', id: 'pocket-front', title: 'Reveal the pocket square', hint: 'A printed pocket with a straight reverse band along the top. Place it on the chest.' },
    ],
  };
}

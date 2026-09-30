import { Construction } from './construction';
import { v2 } from './geometry';

export type VestLength = 'short' | 'longline' | 'pointed';
/** Draft (PR #14): the pointed hem lifts each lower outer corner of the longline
 * body along a crease from the side seam down to near the front opening, so the
 * hem falls to two points either side of the reveal (a waistcoat hem). */
export const VEST_POINTS = { rise: 0.25, run: 0.45 };

/** Gate-fold panels and genuine flap lapels. The apparent opening exposes a
 * continuous backing layer, rather than a cut hole or a hollow garment. */
export function buildLapelVest(length: VestLength = 'short'): Construction {
  const construction: Construction = {
    name: 'Lapel vest',
    meta: { top: 1, shoulderPoint: v2(-0.55, 1), sleeveCutDir: v2(1, 0) },
    ops: [
      { kind: 'turn', id: 'vest-turn', title: 'Put the print underneath', hint: 'The side panels will bring the print back to the front. A narrow strip of reverse will remain between them.' },
      {
        kind: 'fold', id: 'vest-panels', title: 'Bring in the two front panels',
        hint: 'Fold the sides toward the centre, leaving a narrow reveal of the backing paper between them.',
        folds: [
          { name: 'vest-left', a: v2(-0.55, -1.5), b: v2(-0.55, 1.5), moving: v2(-1, 0), sense: 'valley' },
          { name: 'vest-right', a: v2(0.55, -1.5), b: v2(0.55, 1.5), moving: v2(1, 0), sense: 'valley' },
        ],
      },
      {
        kind: 'fold', id: 'vest-lapel-left', title: 'Turn out the first lapel',
        hint: 'Lift only the inner corner of the left front panel. Its reverse makes a folded lapel.',
        folds: [{ name: 'vest-lapel-left', a: v2(-0.22, 1), b: v2(-0.1, 0.6), moving: v2(-0.1, 1), sense: 'valley', only: 'vest-left' }],
      },
      {
        kind: 'fold', id: 'vest-lapel-right', title: 'Open the matching lapel',
        hint: 'Turn out the right inner corner. The opening shows the backing sheet; this is a flat paper vest.',
        folds: [{ name: 'vest-lapel-right', a: v2(0.22, 1), b: v2(0.1, 0.6), moving: v2(0.1, 1), sense: 'valley', only: 'vest-right' }],
      },
      { kind: 'turn', id: 'vest-back', title: 'Turn over to finish the outline', hint: 'Work on the back with the shoulder corners and lower edge facing you.' },
      {
        kind: 'fold', id: 'vest-shoulders', title: 'Tuck the outer shoulder corners',
        hint: 'Lift the outer shoulder corners onto this side to make the sleeveless outline.',
        folds: [
          { name: 'vest-shoulder-left', a: v2(-0.55, 0.55), b: v2(-0.38, 1), moving: v2(-0.55, 1), sense: 'valley' },
          { name: 'vest-shoulder-right', a: v2(0.55, 0.55), b: v2(0.38, 1), moving: v2(0.55, 1), sense: 'valley' },
        ],
      },
      {
        kind: 'fold', id: 'vest-shorten', title: 'Fold a short body',
        hint: 'Lift the lower edge onto this side to establish the vest length.',
        folds: [{ name: 'vest-shorten', a: v2(-1.5, -0.4), b: v2(1.5, -0.4), moving: v2(0, -1), sense: 'valley' }],
      },
      { kind: 'turn', id: 'vest-front', title: 'Reveal the lapels', hint: 'Turn back to the printed panels. The smaller lapels leave broad shoulders on either side.' },
    ],
  };
  if (length === 'longline' || length === 'pointed') {
    const hem = construction.ops.find(op => op.id === 'vest-shorten');
    if (hem?.kind === 'fold') {
      hem.title = 'Finish the longline body';
      hem.hint = 'Lift a smaller strip of the lower edge onto this side, leaving a longer waistcoat body.';
      hem.folds[0].a.y = -0.78;
      hem.folds[0].b.y = -0.78;
    }
  }
  if (length === 'pointed') {
    const y = -0.78, { rise, run } = VEST_POINTS;
    construction.name = 'Lapel vest, pointed hem';
    construction.ops.splice(construction.ops.findIndex(op => op.id === 'vest-shorten') + 1, 0, {
      kind: 'fold', id: 'vest-hem-points', title: 'Fold the hem points',
      hint: 'Lift both lower outer corners onto this side. The hem now slopes down to two points beside the front opening.',
      folds: [
        { name: 'vest-point-left', a: v2(-0.55, y + rise), b: v2(-0.55 + run, y), moving: v2(-0.55, y), sense: 'valley' },
        { name: 'vest-point-right', a: v2(0.55, y + rise), b: v2(0.55 - run, y), moving: v2(0.55, y), sense: 'valley' },
      ],
    });
  }
  return construction;
}

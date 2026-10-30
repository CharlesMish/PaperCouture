import type { Construction } from './construction';
import { v2 } from './geometry';
import { cm } from './measure';

export const SASH_SCALE = .16;
export const SASH_LIFT = -.54;
export const SASH_POSITIONS = ['waist'] as const;

/** Separate-square folded bar. Placement is a styling gesture, not a belt
 * threaded around the garment or a physical attachment. */
export function buildFoldedSash(): Construction {
  // the border's depth; the last crease's height above the bar's bottom fold, and the finished bar's height
  const border = 1 - .8, lift = .28 - -.1, bar = .8 - .28;
  return { name: 'Folded sash', meta: { top: .8, shoulderPoint: v2(0, .8), sleeveCutDir: v2(1, 0) }, ops: [
    { kind: 'fold', id: 'sash-band', title: 'Fold down a narrow border', hint: `Print side up. Fold the top edge down onto the print by ${cm(border)}, all the way across. This strip, in the other colour, becomes the border along the sash.`, folds: [
      { name: 'sash-band', a: v2(-1.5, .8), b: v2(1.5, .8), moving: v2(0, 1), sense: 'valley' },
    ] },
    { kind: 'turn', id: 'sash-back', title: 'Turn the square over', hint: 'Turn it over from side to side, so the border is underneath along the top edge.' },
    { kind: 'fold', id: 'sash-body', title: 'Fold in half, bottom to top', hint: 'Fold the paper in half: bring the bottom edge up to meet the top edge, all the way across. This makes a long bar.', folds: [
      { name: 'sash-body', a: v2(-1.5, -.1), b: v2(1.5, -.1), moving: v2(0, -1), sense: 'valley' },
    ] },
    { kind: 'fold', id: 'sash-return', title: 'Narrow the bar once more', hint: `Fold the bottom edge up again, all the layers, along a crease ${cm(lift)} above it. The bar is now ${cm(bar)} tall.`, folds: [
      { name: 'sash-return', a: v2(-1.5, .28), b: v2(1.5, .28), moving: v2(0, -.1), sense: 'valley' },
    ] },
    { kind: 'turn', id: 'sash-front', title: 'Reveal the folded sash', hint: 'Turn it over from side to side: a printed bar with a narrow border of the other colour along its top edge.' },
  ] };
}

import type { Construction } from './construction';
import { v2 } from './geometry';

export const SASH_SCALE = .16;
export const SASH_LIFT = -.54;
export const SASH_POSITIONS = ['waist'] as const;

/** Separate-square folded bar. Placement is a styling gesture, not a belt
 * threaded around the garment or a physical attachment. */
export function buildFoldedSash(): Construction {
  return { name: 'Folded sash', meta: { top: .8, shoulderPoint: v2(0, .8), sleeveCutDir: v2(1, 0) }, ops: [
    { kind: 'fold', id: 'sash-band', title: 'Turn down a narrow border', hint: 'This small strip will show the reverse along the finished sash.', folds: [
      { name: 'sash-band', a: v2(-1.5, .8), b: v2(1.5, .8), moving: v2(0, 1), sense: 'valley' },
    ] },
    { kind: 'turn', id: 'sash-back', title: 'Turn the square over', hint: 'Keep the border underneath while narrowing the rest of the square.' },
    { kind: 'fold', id: 'sash-body', title: 'Bring up the lower panel', hint: 'Lift the bottom edge to meet the top, keeping a full-width bar.', folds: [
      { name: 'sash-body', a: v2(-1.5, -.1), b: v2(1.5, -.1), moving: v2(0, -1), sense: 'valley' },
    ] },
    { kind: 'fold', id: 'sash-return', title: 'Narrow the bar once more', hint: 'Bring the lower layers up behind the front. The small border stays at the upper edge.', folds: [
      { name: 'sash-return', a: v2(-1.5, .28), b: v2(1.5, .28), moving: v2(0, -.1), sense: 'valley' },
    ] },
    { kind: 'turn', id: 'sash-front', title: 'Reveal the folded sash', hint: 'A printed bar with a reverse border. Place it at the waist as a separate paper accent; it has no tie or lock.' },
  ] };
}

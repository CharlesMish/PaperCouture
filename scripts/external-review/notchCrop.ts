import type { Construction } from '../../src/fold/construction';
import type { Op } from '../../src/fold/engine';
import { v2 } from '../../src/fold/geometry';

type Point = [number, number];
const fold = (id: string, title: string, hint: string, a: Point, b: Point, moving: Point): Op => ({
  kind: 'fold', id, title, hint,
  folds: [{ name: id, a: v2(...a), b: v2(...b), moving: v2(...moving), sense: 'valley' }],
});

/** Cropped top from one intact square. Hem first, then two lapels, then shoulders.
 * The notch is uninterrupted printed sheet, not a cut neck. No selective flaps. */
export function buildNotchCrop(): Construction {
  return {
    name: 'Notch-collar crop',
    meta: { top: 1, shoulderPoint: v2(0, 1), sleeveCutDir: v2(1, 0) },
    ops: [
      fold('notch-hem', 'Turn up a short hem', 'Lift the bottom edge onto the sheet. The band shows the reverse and stops below the collar.', [-1.6, -0.58], [1.6, -0.58], [0, -1]),
      fold('notch-wing-left', 'Fold the left lapel', 'Bring the upper-left corner down along the diagonal. The reverse face becomes one side of the notch.', [-0.2, 1], [-1, 0.18], [-1, 1]),
      fold('notch-wing-right', 'Fold the right lapel', 'Match the other corner. The printed sheet remains continuous between the two lapels.', [0.2, 1], [1, 0.18], [1, 1]),
      fold('notch-shoulder-left', 'Slope the left shoulder', 'Turn the outer shoulder down. The new edge is a fold, not a cut sleeve.', [-1, -0.02], [-0.46, 1], [-1, 1]),
      fold('notch-shoulder-right', 'Slope the right shoulder', 'Match the other shoulder. The points beside the notch are the lapel tips.', [1, -0.02], [0.46, 1], [1, 1]),
    ],
  };
}

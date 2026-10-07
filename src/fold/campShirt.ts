import type { Construction } from './construction';
import type { Op } from './engine';
import { v2 } from './geometry';

type Point = [number, number];
const fold = (id: string, title: string, hint: string, a: Point, b: Point, moving: Point, only?: string): Op => ({
  kind: 'fold', id, title, hint,
  folds: [{ name: id, a: v2(...a), b: v2(...b), moving: v2(...moving), sense: 'valley', ...(only ? { only } : {}) }],
});
const turn = (id: string, title: string, hint: string): Op => ({ kind: 'turn', id, title, hint });

/** One intact square allocated to a clean front, two free sleeve corners and
 * two selected collar flaps. The initial edge turns become the real reverse
 * cuffs; the upper part of those same strips frames the short neck reveal.
 *
 * Order matters: form the collar and finish the shoulders BEFORE lifting the
 * body. The body stops below the collar tips instead of passing through them
 * to imitate a tucked/locked shirt. Sleeve hinges start at the gate seams' free
 * bottom endpoints; an interior hinge would tear their attached material.
 *
 * This is a flat garment silhouette, with continuous backing at the neck and
 * no open torso, armholes or proven lock. Rigid facets and sampled motion are
 * verified separately; they do not establish physical paper foldability.
 */
export function buildCampShirt(): Construction {
  return {
    name: 'Camp-collar shirt',
    meta: { top: 1, shoulderPoint: v2(-.5, .62), sleeveCutDir: v2(1, 0) },
    ops: [
      fold('shirt-edge-left', 'Prepare the first cuff edge',
        'Turn a narrow strip of the left edge onto the print. This same strip will finish a sleeve and the collar edge.',
        [-.92, -1.5], [-.92, 1.5], [-1, 0]),
      fold('shirt-edge-right', 'Prepare the matching cuff edge',
        'Turn the opposite strip inward to match. Both contrast strips are folded paper, not added trim.',
        [.92, -1.5], [.92, 1.5], [1, 0]),
      turn('shirt-reverse', 'Put the prepared edges underneath',
        'Turn over before making the gate folds. The print will return on the panels.'),
      fold('shirt-panel-left', 'Bring in the first long panel',
        'Fold the left side toward the centre. Leave a narrow reveal between the panels.',
        [-.5, -1.5], [-.5, 1.5], [-1, 0]),
      fold('shirt-panel-right', 'Bring in the matching panel',
        'Fold the right side inward. Keep the two free lower corners available for the sleeves.',
        [.5, -1.5], [.5, 1.5], [1, 0]),
      fold('shirt-sleeve-left', 'Open the first sleeve corner',
        'Lift only the lower corner of the left panel. It pivots from the bottom of the side seam; the backing stays flat.',
        [-.5, -1], [0, -.1], [0, -1], 'shirt-panel-left'),
      fold('shirt-sleeve-right', 'Open the other sleeve corner',
        'Open the matching free corner. The narrow prepared edges will become the contrasting cuffs after the body is raised.',
        [.5, -1], [0, -.1], [0, -1], 'shirt-panel-right'),
      fold('shirt-collar-left', 'Turn out the first collar point',
        'Lift only the upper inner corner of the left panel. Its reverse makes a pointed collar.',
        [-.5, 1], [-.08, .82], [-.08, 1], 'shirt-panel-left'),
      fold('shirt-collar-right', 'Turn out the matching collar point',
        'Fold the other inner corner outward. The space between the points still contains the continuous backing sheet.',
        [.5, 1], [.08, .82], [.08, 1], 'shirt-panel-right'),
      turn('shirt-shoulder-back', 'Turn over to shape the shoulders',
        'Keep the collar underneath. Finish the shoulder outline before the lower body covers this side.'),
      fold('shirt-shoulder-left', 'Slope the first shoulder',
        'Turn the upper outer corner onto the back. The small fold includes the layers already at this shoulder.',
        [-.5, .62], [-.22, 1], [-.5, 1]),
      fold('shirt-shoulder-right', 'Slope the other shoulder',
        'Match the shoulder slope. A short straight neck edge remains between the two slopes.',
        [.5, .62], [.22, 1], [.5, 1]),
      turn('shirt-front', 'Return to the collar and sleeves',
        'The shoulders are finished. One broad fold will bring the printed body and cuffed sleeves into place.'),
      fold('shirt-body', 'Raise the body below the collar',
        'Lift the lower panel as one stack. Its edge stops below the collar points; it is not tucked through them or locked. The print, collar and cuffs all come from this one square.',
        [-1.5, -.21], [1.5, -.21], [0, -1]),
    ],
  };
}

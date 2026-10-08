import type { Construction } from './construction';
import type { Op } from './engine';
import { v2 } from './geometry';

type Point = [number, number];
const fold = (id: string, title: string, hint: string, a: Point, b: Point, moving: Point, only?: string): Op => ({
  kind: 'fold', id, title, hint,
  folds: [{ name: id, a: v2(...a), b: v2(...b), moving: v2(...moving), sense: 'valley', ...(only ? { only } : {}) }],
});

/** A long open-front silhouette: two flared panels, retained lining and
 * turned shoulder flaps. Edge turns make actual contrasting front facings.
 * No cut opening, cavity, closure or practical foldability is claimed. */
export function buildSwingCoat(): Construction {
  return { name: 'Swing coat', meta: { top: 1, shoulderPoint: v2(-.48, 1), sleeveCutDir: v2(.3, -.6) }, ops: [
    fold('coat-facing-left', 'Prepare the first facing', 'Turn a narrow edge onto the print; it will become a real folded facing inside the coat.', [-.93, -1.5], [-.93, 1.5], [-1, 0]),
    fold('coat-facing-right', 'Prepare the other facing', 'Match the edge on the opposite side. Keep the long print panels clear.', [.93, -1.5], [.93, 1.5], [1, 0]),
    { kind: 'turn', id: 'coat-lining', title: 'Put the lining face up', hint: 'The reverse stays visible between the two front panels.' },
    fold('coat-panel-left', 'Fold the first flared panel', 'Follow the sloping guide. The opening widens toward the long hem.', [-.48, 1], [-.58, -1], [-1, 0]),
    fold('coat-panel-right', 'Fold the matching panel', 'Bring the other side inward, leaving the continuous lining visible between the free edges.', [.48, 1], [.58, -1], [1, 0]),
    fold('coat-sleeve-left', 'Turn out the first shoulder flap', 'Turn only the upper free corner outward, pivoting from the end of the side crease.', [-.48, 1], [-.18, .4], [0, 1], 'coat-panel-left'),
    fold('coat-sleeve-right', 'Match the shoulder flap', 'Turn out the matching corner to complete the broad shoulder yoke.', [.48, 1], [.18, .4], [0, 1], 'coat-panel-right'),
    { kind: 'turn', id: 'coat-back', title: 'Turn over to finish the hem', hint: 'Work on the back so the front panels keep their long edges.' },
    fold('coat-hem', 'Turn up the long hem', 'Fold the lower strip behind the coat, retaining all of the square.', [-1.5, -.78], [1.5, -.78], [0, -1]),
    { kind: 'turn', id: 'coat-front', title: 'Reveal the swing coat', hint: 'Long flared front panels, folded facings and a broad shoulder yoke over an intact lining. A flat outerwear silhouette, without a through-opening or fastening.' },
  ] };
}

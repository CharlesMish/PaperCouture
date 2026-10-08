// Frozen PR25 construction for the local comparison only. Not registered in the app.
import type { Construction } from '../../../src/fold/construction';
import type { Op } from '../../../src/fold/engine';
import { v2 } from '../../../src/fold/geometry';

type Point = [number, number];
const fold = (id: string, title: string, hint: string, a: Point, b: Point, moving: Point): Op => ({
  kind: 'fold', id, title, hint,
  folds: [{ name: id, a: v2(...a), b: v2(...b), moving: v2(...moving), sense: 'valley' }],
});
const turn = (id: string, title: string, hint: string): Op => ({ kind: 'turn', id, title, hint });
const meta = (top: number) => ({ top, shoulderPoint: v2(0, top), sleeveCutDir: v2(1, 0) });

/** The proposed flat shoulder layer, adapted to the workshop's turn-over and
 * valley workflow. Three folds worked from behind replace three mountains;
 * no layer selector, material cut, collar opening or fastening is introduced. */
export function buildCollaredCapelet(): Construction {
  return { name: 'Collared capelet', meta: meta(.7), ops: [
    fold('capelet-collar', 'Fold down the collar band', 'Bring the upper edge onto the front. The reverse becomes the collar band; there is no neck opening.', [-1.5, .7], [1.5, .7], [0, 1]),
    turn('capelet-back', 'Turn over to shape the capelet', 'Work the hem and both shoulder corners on the back, with the collar underneath.'),
    fold('capelet-hem', 'Fold a short hem behind', 'Bring the lower part up onto this side. The full square remains inside the short shoulder layer.', [-1.5, -.3], [1.5, -.3], [0, -1]),
    fold('capelet-shoulder-first', 'Slope the first shoulder', 'Fold this outer corner onto the back along the diagonal guide.', [.45, .7], [1, .15], [1, .7]),
    fold('capelet-shoulder-second', 'Slope the other shoulder', 'Follow the matching diagonal to leave a broad lower panel.', [-.45, .7], [-1, .15], [-1, .7]),
    turn('capelet-front', 'Reveal the collared capelet', 'A short, flat shoulder layer with a reverse collar. Lay it over a top on the board; it has no neck opening, tie or locking closure.'),
  ] };
}

import type { Construction } from './construction';
import type { Op } from './engine';
import { v2 } from './geometry';

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

export type BootDirection = 'left' | 'right';
/** One intact square per boot. Direction names describe the toe in Front view,
 * not anatomical left/right. Mirroring the crease coordinates preserves the
 * printed front on both variants; it is not a negative-scale display trick. */
export function buildAnkleBoot(direction: BootDirection = 'right'): Construction {
  const sign = direction === 'right' ? -1 : 1; // the initial turn mirrors x
  const X = (p: Point): Point => [sign * p[0], p[1]];
  const third = 1 / 3, ankle = .45, toeEnd = ankle + 1 - third;
  return { name: `Ankle boot, toe ${direction}`, meta: meta(1), ops: [
    turn('boot-back', 'Put the print underneath', 'Fold the boot from the reverse. The completed front will keep the print.'),
    fold('boot-side-first', 'Fold the first third inward', 'Bring one side into a narrow upright strip. All layers move together.', X([-third, -1.5]), X([-third, 1.5]), X([-1, 0])),
    fold('boot-side-second', 'Fold the other third inward', 'Fold the opposite side over it. This three-layer strip becomes the ankle and foot.', X([third, -1.5]), X([third, 1.5]), X([1, 0])),
    fold('boot-ankle', 'Turn the lower strip into a foot', `Lift the lower strip along the diagonal guide. After the final turn, the toe will point ${direction}; the sloped heel remains folded paper.`, X([-third, ankle]), X([third, ankle - 2 * third]), X([0, -1])),
    fold('boot-toe', 'Tuck the toe corner', 'Fold the small outer toe corner onto this side. Do not cut or round the paper edge.', X([toeEnd - .28, ankle]), X([toeEnd, ankle - .3]), X([toeEnd, ankle])),
    turn('boot-front', 'Reveal the flat ankle boot', `A single flat boot silhouette, toe ${direction}. Fold and pin the other direction separately for a pair; no foot opening or wearable cavity is claimed.`),
  ] };
}

export const COMPANION_CONSTRUCTIONS = {
  capelet: buildCollaredCapelet,
  'boot-left': () => buildAnkleBoot('left'),
  'boot-right': () => buildAnkleBoot('right'),
};

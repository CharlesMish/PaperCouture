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

/** Two printed front panels over continuous reverse-side lining. The slanted
 * gate folds create real free edges; no slit, painted seam or neck hole is used.
 * Hem and shoulders are worked on the back with whole-stack valley folds. */
export function buildOpenFrontCapelet(): Construction {
  return { name: 'Open-front capelet', meta: meta(1), ops: [
    turn('capelet-lining', 'Put the lining face up', 'The reverse becomes the lining between the two printed front panels.'),
    fold('capelet-panel-first', 'Fold the first front panel', 'Bring the outer edge inward along the sloping guide. Its free edge leaves more lining visible toward the hem.', [-.53, 1], [-.78, -1], [-1, 0]),
    fold('capelet-panel-second', 'Fold the other front panel', 'Match the opposite panel. The space between these real paper edges reveals the continuous lining underneath.', [.53, 1], [.78, -1], [1, 0]),
    turn('capelet-back', 'Turn over to shape the capelet', 'Keep the front panels underneath while shaping the hem and shoulders.'),
    fold('capelet-hem', 'Fold the lower half behind', 'Bring the lower half up onto this side. All layers move together to make a short shoulder layer.', [-1.5, 0], [1.5, 0], [0, -1]),
    fold('capelet-shoulder-first', 'Slope the first shoulder', 'Tuck the upper outer corner onto the back along the diagonal guide.', [-.63, .5], [-.35, 1], [-.53, 1]),
    fold('capelet-shoulder-second', 'Slope the other shoulder', 'Match the opposite shoulder. The front panels remain separate over their lining.', [.63, .5], [.35, 1], [.53, 1]),
    turn('capelet-front', 'Reveal the open-front capelet', 'Two printed panels open onto a continuous paper lining. Layer it over a top on the board; it has no through-opening or fastening.'),
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
  capelet: buildOpenFrontCapelet,
  'boot-left': () => buildAnkleBoot('left'),
  'boot-right': () => buildAnkleBoot('right'),
};

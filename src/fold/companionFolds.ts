import type { Construction } from './construction';
import type { Op } from './engine';
import { v2 } from './geometry';
import { cm, lineMeet } from './measure';

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
  // Panel creases run from x = ±neck on the top edge to x = ±hem on the bottom edge;
  // the shoulder creases run from (∓.63, .5) to (∓.35, 1).
  const neck = .53, hem = .78, shoulderTop = .35;
  // For the instructions: after the hem fold the outline's top corners are the
  // panel creases' bottom ends (x = ±hem); the shoulder crease leaves the top edge
  // shoulderTop in from the centre and meets the slanting side (from (-hem, 1) to
  // the panel crease at y = 0) at sideMeet, below the top edge at y = 1.
  const sideMeet = lineMeet(v2(-.63, .5), v2(.28, .5), v2(-hem, 1), v2(hem - (neck + hem) / 2, -1));
  const shoulder = `along a slanting crease: from the top edge ${cm(hem - shoulderTop)} in from the corner, to the side ${cm(1 - sideMeet.y)} below the top edge. Fold all the layers.`;
  const panel = `along a slanting crease: from the top edge ${cm(1 - neck)} in from the side, to the bottom edge ${cm(1 - hem)} in from the side.`;
  return { name: 'Open-front capelet', meta: meta(1), ops: [
    turn('capelet-lining', 'Put the lining face up', 'Turn it over from side to side, so the other colour is up. It becomes the lining between the two printed front panels.'),
    fold('capelet-panel-first', 'Fold the left front panel', `Fold the left side over onto the lining ${panel} Its free edge comes nearly to the centre line at the top and angles away below.`, [-neck, 1], [-hem, -1], [-1, 0]),
    fold('capelet-panel-second', 'Fold the right front panel', `Fold the right side over onto the lining ${panel} The lining shows in a gap that widens toward the bottom.`, [neck, 1], [hem, -1], [1, 0]),
    turn('capelet-back', 'Turn over to shape the capelet', 'Turn it over from side to side, so the front panels are underneath.'),
    fold('capelet-hem', 'Fold the bottom half up', 'Fold the bottom half up onto this side, bottom edge to top edge, all the layers. The tips of the panels poke a little above the top.', [-1.5, 0], [1.5, 0], [0, -1]),
    fold('capelet-shoulder-first', 'Slope the left shoulder', `Fold the top left corner down onto this side ${shoulder}`, [-.63, .5], [-shoulderTop, 1], [-neck, 1]),
    fold('capelet-shoulder-second', 'Slope the right shoulder', `Fold the top right corner down onto this side ${shoulder}`, [.63, .5], [shoulderTop, 1], [neck, 1]),
    turn('capelet-front', 'Reveal the open-front capelet', 'Turn it over from side to side: two printed panels open down the middle over the lining.'),
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
  // Sides as the paper lies while folding: the foot swings out toward `other`, and
  // the final turn sends the toe the opposite way (toward `direction`).
  const first = direction, other = direction === 'left' ? 'right' : 'left';
  // The foot runs from y = ankle - 2 * third up to y = ankle (the leg's top is y = 1);
  // the toe crease meets the toe end .3 below its top corner, the top edge .28 in.
  const footBottom = ankle - 2 * third;
  return { name: `Ankle boot, toe ${direction}`, meta: meta(1), ops: [
    turn('boot-back', 'Put the print underneath', 'Turn it over from side to side, so the other colour is up. The boot is shaped from the back.'),
    fold('boot-side-first', `Fold the ${first} third in`, `Fold the ${first} side over, creasing a third of the way across, ${cm(1 - third)} from the ${first} edge.`, X([-third, -1.5]), X([-third, 1.5]), X([-1, 0])),
    fold('boot-side-second', `Fold the ${other} third over it`, `Fold the ${other} side over on top, creasing along the edge of the first flap, so the ${other} edge meets the ${first} fold. This strip becomes the leg and foot.`, X([third, -1.5]), X([third, 1.5]), X([1, 0])),
    fold('boot-ankle', 'Turn the lower strip into a foot', `Fold the bottom of the strip up and out to the ${other} at 45 degrees: crease from the ${first} edge ${cm(1 - ankle)} below the top to the ${other} edge ${cm(1 - footBottom)} below the top. Fold all the layers; the strip turns sideways into the foot.`, X([-third, ankle]), X([third, ankle - 2 * third]), X([0, -1])),
    fold('boot-toe', 'Fold down the toe corner', `Fold the top corner of the toe down onto this side, all the layers. Crease from the toe end, ${cm(1 - (ankle - .3))} below the top of the leg, up to the foot's top edge, cutting off a small triangle almost as long on top as down the end.`, X([toeEnd - .28, ankle]), X([toeEnd, ankle - .3]), X([toeEnd, ankle])),
    turn('boot-front', 'Reveal the flat ankle boot', `Turn it over from side to side: the boot in the print, toe pointing ${direction}.`),
  ] };
}

export const COMPANION_CONSTRUCTIONS = {
  capelet: buildOpenFrontCapelet,
  'boot-left': () => buildAnkleBoot('left'),
  'boot-right': () => buildAnkleBoot('right'),
};

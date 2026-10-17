import type { Construction } from '../../../src/fold/construction';
import type { Op } from '../../../src/fold/engine';
import { v2 } from '../../../src/fold/geometry';

// STUDY ONLY: not registered in the app. One intact square.
type Point = [number, number];
const fold = (id: string, title: string, hint: string, a: Point, b: Point, moving: Point, only?: string): Op => ({
  kind: 'fold', id, title, hint,
  folds: [{ name: id, a: v2(...a), b: v2(...b), moving: v2(...moving), sense: 'valley', ...(only ? { only } : {}) }],
});

export const BERET = {
  band: 0.22,   // headband strip turned onto the print
  crown: 0.25,  // top fold line (sheet y), folded behind
  upper: 0.42,  // chamfer of the upper corners, along each edge
  lower: 0.3,   // chamfer of the band corners
} as const;

/** Second-stage corner folds that round the crown: an isosceles nick of
 * side `s` at each corner the first chamfer left behind. */
const SOFT = 0.13;
const unit = (x: number, y: number): Point => { const l = Math.hypot(x, y); return [x / l, y / l]; };
function nick(id: string, corner: Point, alongA: Point, alongB: Point, s = SOFT): Op {
  const [ax, ay] = unit(...alongA), [bx, by] = unit(...alongB);
  return fold(id, 'Round the crown', 'Fold the small corner over to soften the outline.',
    [corner[0] + ax * s, corner[1] + ay * s], [corner[0] + bx * s, corner[1] + by * s], corner);
}

export function buildBeret(p = BERET, round = false): Construction {
  const bottom = -1 + p.band;
  return { name: round ? 'Beret (rounded)' : 'Beret', meta: { top: p.crown, shoulderPoint: v2(0, p.crown), sleeveCutDir: v2(1, 0) }, ops: [
    fold('beret-band', 'Turn up the headband', 'Fold the lower strip onto the print. Its reverse becomes the band.', [-1.5, bottom], [1.5, bottom], [0, -1]),
    { kind: 'turn', id: 'beret-back', title: 'Turn over', hint: 'Shape the crown from the back.' },
    fold('beret-crown', 'Fold the top down', 'Fold the top of the square down behind the crown. This sets the beret’s height.', [-1.5, p.crown], [1.5, p.crown], [0, 1]),
    fold('beret-upper-a', 'Soften one upper corner', 'Fold the corner over along the guide.', [-1, p.crown - p.upper], [-1 + p.upper, p.crown], [-1, p.crown]),
    fold('beret-upper-b', 'Soften the other upper corner', 'Match the other side.', [1, p.crown - p.upper], [1 - p.upper, p.crown], [1, p.crown]),
    ...(round ? [
      nick('beret-round-a1', [-1, p.crown - p.upper], [0, -1], [1, 1]),
      nick('beret-round-a2', [-1 + p.upper, p.crown], [1, 0], [-1, -1]),
      nick('beret-round-b1', [1, p.crown - p.upper], [0, -1], [-1, 1]),
      nick('beret-round-b2', [1 - p.upper, p.crown], [-1, 0], [1, -1]),
    ] : []),
    fold('beret-lower-a', 'Taper one side of the band', 'Fold the lower corner in so the band is narrower than the crown.', [-1, bottom + p.lower], [-1 + p.lower, bottom], [-1, bottom]),
    fold('beret-lower-b', 'Taper the other side', 'Match the other lower corner.', [1, bottom + p.lower], [1 - p.lower, bottom], [1, bottom]),
    { kind: 'turn', id: 'beret-front', title: 'Reveal the beret', hint: 'A flat beret silhouette: wide soft crown over a turned headband. There is no opening for a head.' },
  ] };
}

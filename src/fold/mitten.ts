import type { Construction } from './construction';
import type { Op } from './engine';
import { v2 } from './geometry';
import { cm } from './measure';

// One intact square per flat mitten ornament. Adapted from Claude’s October study.
// The retained top turn shortens the palm; sides meet without overlapping.
// There is no hand opening, cloth shaping, or implied mid-hand thumb mechanism.
type Point = [number, number];
export type ThumbSide = 'left' | 'right';

interface MittenParams {
  cuff: number;    // depth of the turned cuff strip
  side: number;    // side creases at x = ±side (the hand is 2*side wide)
  thumbAt: number; // height where the thumb hinge meets the flap's free edge
  top: number;     // retained top turn; no trimming
  tip: number;     // fingertip corner folds, along each edge
}
export const MITTEN_GEOMETRY: Readonly<MittenParams> = { cuff: 0.25, side: 0.50, thumbAt: 0.20, top: 0.75, tip: 0.30 };

export function buildMitten(thumb: ThumbSide = 'left'): Construction {
  const p = MITTEN_GEOMETRY;
  // Shaping happens on the back, so model x is mirrored there; flip the
  // crease coordinates for the other hand rather than mirroring the display.
  const s = thumb === 'left' ? 1 : -1;
  const X = (q: Point): Point => [s * q[0], q[1]];
  const fold = (id: string, title: string, hint: string, a: Point, b: Point, moving: Point, only?: string): Op => ({
    kind: 'fold', id, title, hint,
    folds: [{ name: id, a: v2(...X(a)), b: v2(...X(b)), moving: v2(...X(moving)), sense: 'valley', ...(only ? { only } : {}) }],
  });
  const bottom = -1 + p.cuff;
  // The thumb-side flap's free edge lies at x = side - (1 - side) once folded.
  // As the paper lies while shaping (from the back), the thumb side is the opposite
  // of the hand's name; the final turn swaps it back.
  const near = thumb === 'left' ? 'right' : 'left', far = thumb;
  // The thumb crease meets the flap's inner edge (on the centre line) this high above the bottom.
  const thumbRise = p.thumbAt - bottom;
  return { name: `${thumb === 'left' ? 'Left' : 'Right'} mitten`, meta: { top: p.top, shoulderPoint: v2(0, p.top), sleeveCutDir: v2(1, 0) }, ops: [
    fold('mitt-cuff', 'Turn up the cuff', `Print side up. Fold the bottom edge up onto the print by ${cm(p.cuff)}, all the way across. This band becomes the cuff, in the other colour.`, [-1.5, bottom], [1.5, bottom], [0, -1]),
    { kind: 'turn', id: 'mitt-back', title: 'Turn over', hint: 'Turn it over from side to side, so the cuff band is underneath along the bottom edge.' },
    fold('mitt-top', 'Fold down the hand top', `Fold the top edge down onto this side by ${cm(1 - p.top)}, all the way across. This squares off the top of the hand.`, [-1.5, p.top], [1.5, p.top], [0, 1]),
    fold('mitt-thumb-side', 'Fold in the thumb side', `Fold the ${near} edge in to the vertical centre line, all the layers. The crease is ${cm(1 - p.side)} from the ${near} edge.`, [p.side, -1.5], [p.side, 1.5], [1, 0]),
    fold('mitt-thumb', 'Swing out the thumb', `On that flap only, fold its lower inner corner out to the ${near}: crease from the bottom ${near} corner to the flap's inner edge, ${cm(thumbRise)} above the bottom. The corner sticks out past the side as the thumb.`,
      [p.side, bottom], [p.side - (1 - p.side), p.thumbAt], [p.side - (1 - p.side), bottom], 'mitt-thumb-side'),
    fold('mitt-far-side', 'Fold in the other side', `Fold the ${far} edge in to the centre line to meet the first flap, all the layers.`, [-p.side, -1.5], [-p.side, 1.5], [-1, 0]),
    fold('mitt-tip-a', `Fold down the top ${near} corner`, `Fold the top ${near} corner down onto this side at 45 degrees, creasing ${cm(p.tip)} from the corner along both edges. This rounds the fingertips.`, [p.side, p.top - p.tip], [p.side - p.tip, p.top], [p.side, p.top]),
    fold('mitt-tip-b', `Fold down the top ${far} corner`, `Fold the top ${far} corner down the same way, ${cm(p.tip)} from the corner along both edges.`, [-p.side, p.top - p.tip], [-p.side + p.tip, p.top], [-p.side, p.top]),
    { kind: 'turn', id: 'mitt-front', title: 'Reveal the mitten', hint: `Turn it over from side to side: the mitten in the print, thumb on the ${thumb}, cuff at the bottom.` },
  ] };
}

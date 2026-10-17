import type { Construction } from './construction';
import type { Op } from './engine';
import { v2 } from './geometry';

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
  return { name: `${thumb === 'left' ? 'Left' : 'Right'} mitten`, meta: { top: p.top, shoulderPoint: v2(0, p.top), sleeveCutDir: v2(1, 0) }, ops: [
    fold('mitt-cuff', 'Turn up the cuff', 'Fold the lower strip onto the print. Its reverse becomes the cuff.', [-1.5, bottom], [1.5, bottom], [0, -1]),
    { kind: 'turn', id: 'mitt-back', title: 'Turn over', hint: 'Shape the hand from the back so the print stays whole on the front.' },
    fold('mitt-top', 'Fold down the hand top', 'Fold the upper strip behind the palm. Keep all of the square; this makes a shorter mitten.', [-1.5, p.top], [1.5, p.top], [0, 1]),
    fold('mitt-thumb-side', 'Fold in the thumb side', 'Bring the thumb-side edge in along the guide.', [p.side, -1.5], [p.side, 1.5], [1, 0]),
    fold('mitt-thumb', 'Swing out the thumb', 'Lift only the lower inner corner of the first flap and turn it outward, pivoting where its crease meets the cuff.',
      [p.side, bottom], [p.side - (1 - p.side), p.thumbAt], [p.side - (1 - p.side), bottom], 'mitt-thumb-side'),
    fold('mitt-far-side', 'Fold in the other side', 'Bring the other edge in to meet the first flap along the back.', [-p.side, -1.5], [-p.side, 1.5], [-1, 0]),
    fold('mitt-tip-a', 'Round one fingertip corner', 'Fold the small top corner over.', [p.side, p.top - p.tip], [p.side - p.tip, p.top], [p.side, p.top]),
    fold('mitt-tip-b', 'Round the other corner', 'Match the other top corner.', [-p.side, p.top - p.tip], [-p.side + p.tip, p.top], [-p.side, p.top]),
    { kind: 'turn', id: 'mitt-front', title: 'Reveal the mitten', hint: 'A flat mitten ornament with a turned cuff and a wrist-root thumb. There is no hand opening; fold the other hand separately for a pair.' },
  ] };
}

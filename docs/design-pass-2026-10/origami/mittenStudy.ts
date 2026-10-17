import type { Construction } from '../../../src/fold/construction';
import type { Op } from '../../../src/fold/engine';
import { v2 } from '../../../src/fold/geometry';

// STUDY ONLY: not registered in the app. One intact square per mitten.
type Point = [number, number];
export type ThumbSide = 'left' | 'right';

export interface MittenParams {
  cuff: number;    // depth of the turned cuff strip
  side: number;    // side creases at x = ±side (the hand is 2*side wide)
  thumbAt: number; // height where the thumb hinge meets the flap's free edge
  tip: number;     // fingertip corner folds, along each edge
}
/** Chosen after a short sweep (see NOTES): a narrower hand and a steeper thumb
 * hinge. side 0.40 looked slightly better but its final turn exceeds the
 * existing eight-layer hinge tolerance; 0.42 is the narrowest that passes. */
export const MITTEN: MittenParams = { cuff: 0.24, side: 0.42, thumbAt: 0.5, tip: 0.22 };
/** First attempt: the thumb barely clears the cuff and reads as a heel. */
export const MITTEN_V1: MittenParams = { cuff: 0.3, side: 0.5, thumbAt: 0.085, tip: 0.22 };

export function buildMitten(thumb: ThumbSide = 'left', p: MittenParams = MITTEN): Construction {
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
  return { name: `Mitten, thumb ${thumb}`, meta: { top: 1, shoulderPoint: v2(0, 1), sleeveCutDir: v2(1, 0) }, ops: [
    fold('mitt-cuff', 'Turn up the cuff', 'Fold the lower strip onto the print. Its reverse becomes the cuff.', [-1.5, bottom], [1.5, bottom], [0, -1]),
    { kind: 'turn', id: 'mitt-back', title: 'Turn over', hint: 'Shape the hand from the back so the print stays whole on the front.' },
    fold('mitt-thumb-side', 'Fold in the thumb side', 'Bring the thumb-side edge in along the guide.', [p.side, -1.5], [p.side, 1.5], [1, 0]),
    fold('mitt-thumb', 'Swing out the thumb', 'Lift only the lower inner corner of the first flap and turn it outward, pivoting where its crease meets the cuff.',
      [p.side, bottom], [p.side - (1 - p.side), p.thumbAt], [p.side - (1 - p.side), bottom], 'mitt-thumb-side'),
    fold('mitt-far-side', 'Fold in the other side', 'Bring the other edge in. It closes over the inner end of the thumb flap.', [-p.side, -1.5], [-p.side, 1.5], [-1, 0]),
    fold('mitt-tip-a', 'Round one fingertip corner', 'Fold the small top corner over.', [p.side, 1 - p.tip], [p.side - p.tip, 1], [p.side, 1]),
    fold('mitt-tip-b', 'Round the other corner', 'Match the other top corner.', [-p.side, 1 - p.tip], [-p.side + p.tip, 1], [-p.side, 1]),
    { kind: 'turn', id: 'mitt-front', title: 'Reveal the mitten', hint: 'A flat mitten with a turned cuff and an outward thumb. There is no hand opening; fold the other hand separately for a pair.' },
  ] };
}

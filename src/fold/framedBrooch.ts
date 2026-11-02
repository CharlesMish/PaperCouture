import type { Construction } from './construction';
import { v2 } from './geometry';
import { cm } from './measure';

export type BroochShape = 'square' | 'rectangle';

/** An intact small square with four narrow edges folded onto the printed face.
 * The centre remains paper: this is a flat decorative accent, not a cut frame,
 * opening, pin or clasp. Both shapes use one intact square; the rectangle
 * has deeper top/bottom borders. */
export function buildFramedBrooch(shape: BroochShape = 'square'): Construction {
  const edge = (id: string, title: string, hint: string, a: [number, number], b: [number, number], moving: [number, number]) => ({
    kind: 'fold' as const, id, title, hint,
    folds: [{ name: id, a: v2(...a), b: v2(...b), moving: v2(...moving), sense: 'valley' as const }],
  });
  const rectangular = shape === 'rectangle', x = rectangular ? .8 : .75, y = rectangular ? .65 : .75;
  return {
    name: rectangular ? 'Framed brooch · rectangle' : 'Framed brooch · square',
    meta: { top: y, shoulderPoint: v2(0, y), sleeveCutDir: v2(1, 0) },
    ops: [
      edge('frame-top', rectangular ? 'Fold a deeper top border' : 'Fold a narrow top border', `Print side up. Fold the top edge down onto the print by ${cm(1 - y)}, all the way across. The other colour makes the top of the frame.`, [-1.5, y], [1.5, y], [0, 1]),
      edge('frame-bottom', 'Match the bottom border', `Fold the bottom edge up onto the print by the same ${cm(1 - y)}.`, [-1.5, -y], [1.5, -y], [0, -1]),
      edge('frame-left', 'Fold the left border', `Fold the left edge over onto the print by ${cm(1 - x)}, all the layers, so the ends of both borders fold in with it. ${rectangular ? 'The side borders are narrower than the top and bottom.' : 'All four borders are the same depth.'}`, [-x, -1.5], [-x, 1.5], [-1, 0]),
      edge('frame-right', 'Complete the paper frame', `Fold the right edge over by the same ${cm(1 - x)}, all the layers. The four borders now frame the printed centre.`, [x, -1.5], [x, 1.5], [1, 0]),
    ],
  };
}

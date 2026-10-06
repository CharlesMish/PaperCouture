import type { Construction } from './construction';
import { v2 } from './geometry';

/** An intact small square with four narrow edges folded onto the printed face.
 * The centre remains paper: this is a flat decorative accent, not a cut frame,
 * opening, pin or clasp. The 6 cm starting square is an outfit styling choice. */
export function buildFramedBrooch(): Construction {
  const edge = (id: string, title: string, hint: string, a: [number, number], b: [number, number], moving: [number, number]) => ({
    kind: 'fold' as const, id, title, hint,
    folds: [{ name: id, a: v2(...a), b: v2(...b), moving: v2(...moving), sense: 'valley' as const }],
  });
  return {
    name: 'Framed brooch',
    meta: { top: .75, shoulderPoint: v2(0, .75), sleeveCutDir: v2(1, 0) },
    ops: [
      edge('frame-top', 'Fold a narrow top border', 'Bring the top edge toward the centre along the guide. Its reverse makes the first border; keep the printed centre uncovered.', [-1.5, .75], [1.5, .75], [0, 1]),
      edge('frame-bottom', 'Match the bottom border', 'Bring the bottom edge inward by the same amount. A broad printed strip remains between the two borders.', [-1.5, -.75], [1.5, -.75], [0, -1]),
      edge('frame-left', 'Fold the left border', 'Turn the left edge onto the front, including the ends of both folded bands. The layers overlap at the corners.', [-.75, -1.5], [-.75, 1.5], [-1, 0]),
      edge('frame-right', 'Complete the paper frame', 'Match the right border. The printed centre is intact paper, not a hole. Place this flat accent on the board; it has no pin or fastening.', [.75, -1.5], [.75, 1.5], [1, 0]),
    ],
  };
}

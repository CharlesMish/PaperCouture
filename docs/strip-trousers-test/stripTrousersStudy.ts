// TEST STUDY, not a garment: it is not registered in the Design list or
// imported by the app. See NOTES.md in this folder.
//
// Strip trousers: fold the square into a four-layer strip (sides to the
// centre, then in half lengthwise), then fold the strip in half across its
// middle along a line tilted by `beta`. The two halves of the strip become the
// two legs. Below the fold they are separate paper, so the gap between them is
// genuinely empty, and because the strip shows the print on both faces, both
// legs show the print. The legs splay by +-beta; the finished piece is tilted
// by beta in model coordinates (display it rotated by -beta).
import type { Construction } from '../../src/fold/construction';
import type { FoldSpec, Op } from '../../src/fold/engine';
import { Vec2, v2 } from '../../src/fold/geometry';

export type StripWidth = 0.5 | 0.25;

const deg = Math.PI / 180;
const fold = (name: string, a: Vec2, b: Vec2, moving: Vec2): FoldSpec => ({ name, a, b, moving, sense: 'valley' });
const op = (id: string, title: string, hint: string, ...folds: FoldSpec[]): Op => ({ kind: 'fold', id, title, hint, folds });

export function buildStripTrousersStudy(width: StripWidth = 0.5, beta = 22): Construction {
  const b = beta * deg;
  const ops: Op[] = [
    { kind: 'turn', id: 'trousers-turn', title: 'Turn the paper over', hint: 'Start with the print underneath.' },
    op('trousers-gate', 'Fold both sides to the centre', 'The flaps show the print.',
      fold('trousers-gate-left', v2(-0.5, -2), v2(-0.5, 2), v2(-1, 0)),
      fold('trousers-gate-right', v2(0.5, -2), v2(0.5, 2), v2(1, 0))),
    op('trousers-half', 'Fold in half lengthwise', 'Both faces of the strip now show the print.',
      fold('trousers-half', v2(0, -2), v2(0, 2), v2(-0.5, 0))),
  ];
  if (width === 0.25) {
    ops.push(op('trousers-quarter', 'Fold in half lengthwise again', 'A narrower strip makes slimmer legs and a higher crotch.',
      fold('trousers-quarter', v2(0.25, -2), v2(0.25, 2), v2(0, 0))));
  }
  const centre = v2(width === 0.5 ? 0.25 : 0.375, 0);
  ops.push(op('trousers-waist', 'Fold the strip in half at an angle', 'The fold is the waist; the two halves of the strip become the legs.',
    fold('trousers-waist', v2(centre.x - Math.cos(b), centre.y - Math.sin(b)), v2(centre.x + Math.cos(b), centre.y + Math.sin(b)), v2(centre.x, 1))));
  return { name: `Strip trousers study (${width === 0.5 ? 'wide' : 'slim'})`, ops, meta: { top: 0, shoulderPoint: centre, sleeveCutDir: v2(0, -1) } };
}

/** Where the inner edges of the legs cross, below the waist, as a fraction of leg length:
 * (w / 2) / sin(beta) over the leg length (1 unit). */
export const crotchDepth = (width: number, beta: number) => width / 2 / Math.sin(beta * deg);

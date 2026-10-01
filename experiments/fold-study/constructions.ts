import type { Construction } from '../../src/fold/construction';
import type { Op } from '../../src/fold/engine';
import { v2 } from '../../src/fold/geometry';

const fold = (id: string, title: string, hint: string, a: [number, number], b: [number, number], moving: [number, number]): Op => ({
  kind: 'fold', id, title, hint, folds: [{ name: id, a: v2(...a), b: v2(...b), moving: v2(...moving), sense: 'valley' }],
});
const turn = (id: string, title: string, hint: string): Op => ({ kind: 'turn', id, title, hint });
const meta = { top: 1, shoulderPoint: v2(0, 1), sleeveCutDir: v2(1, 0) };

/** The same five operations as the owner-reviewed study; one complete square. */
export function buildApron(): Construction {
  return { name: 'Bib apron', meta, ops: [
    fold('hem', 'Turn up the hem', 'Lift the bottom edge. This band shows the reverse of your paper.', [-1.5, -.7], [1.5, -.7], [0, -1]),
    turn('back', 'Turn the sheet over', 'The hem is underneath. Work the bib corners from this side.'),
    fold('bib-left', 'Narrow the first bib corner', 'Fold the upper-left corner inward along the sloping guide.', [-1, .1], [-.22, 1], [-1, 1]),
    fold('bib-right', 'Narrow the other bib corner', 'Fold the upper-right corner inward to match.', [1, .1], [.22, 1], [1, 1]),
    turn('front', 'Reveal the apron', 'Turn over to see the printed bib and contrasting hem. This silhouette has no neck ties.'),
  ] };
}

const D = (u: number, v: number): [number, number] => [(u - v) / Math.SQRT2, (u + v) / Math.SQRT2];
/** The tip must be folded BEFORE turning over, so closure reveals the reverse. */
export function buildClutch(): Construction {
  return { name: 'Envelope clutch', meta, ops: [
    fold('tip', 'Fold the flap tip first', 'Fold this small corner before turning over. It becomes the contrasting triangle on the lid.', D(1.05, -1.6), D(1.05, 1.6), D(1.414, 0)),
    turn('reverse', 'Turn the sheet over', 'The pre-folded tip is now underneath. Bring in the envelope panels from this side.'),
    fold('left', 'Bring in the first side', 'Follow the diagonal guide to bring the first outer corner inward.', D(-.65, -1.6), D(-.65, 1.6), D(-1.414, 0)),
    fold('right', 'Bring in the other side', 'Fold the opposite corner inward over the first panel.', D(.65, -1.6), D(.65, 1.6), D(1.414, 0)),
    fold('body', 'Lift the lower envelope panel', 'Bring the lower point up to form the flat body.', D(-1.6, -.6), D(1.6, -.6), D(0, -1.414)),
    fold('lid', 'Close the upper flap', 'Fold down the lid. Its triangle reveals the reverse; this is a flat envelope form, without a proven lock or bag cavity.', D(-1.6, .42), D(1.6, .42), D(0, 1)),
  ] };
}
export const CANDIDATES = { clutch: buildClutch, apron: buildApron };
export type CandidateId = keyof typeof CANDIDATES;

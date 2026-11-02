// Integrated copies of PR16 992169afec594bc6c577483760e967366d009053. Original experiment is preserved.
import type { Construction } from './construction';
import type { Op } from './engine';
import { v2 } from './geometry';
import { cm } from './measure';

const fold = (id: string, title: string, hint: string, a: [number, number], b: [number, number], moving: [number, number]): Op => ({
  kind: 'fold', id, title, hint, folds: [{ name: id, a: v2(...a), b: v2(...b), moving: v2(...moving), sense: 'valley' }],
});
const turn = (id: string, title: string, hint: string): Op => ({ kind: 'turn', id, title, hint });
const meta = { top: 1, shoulderPoint: v2(0, 1), sleeveCutDir: v2(1, 0) };

/** Apron creases: the hem line (y), and where each bib crease meets the side edge (y) and the top edge (|x|). */
const HEM = -.7, BIB_SIDE = .1, BIB_TOP = .22;
const bibCrease = `from the top edge ${cm(1 - BIB_TOP)} in from the corner to the side edge ${cm(1 - BIB_SIDE)} below it`;

/** The same five operations as the owner-reviewed study; one complete square. */
export function buildApron(): Construction {
  return { name: 'Bib apron', meta, ops: [
    fold('hem', 'Turn up the hem', `Print side up. Fold the bottom edge up onto the print by ${cm(1 + HEM)}, all the way across. This band becomes the hem, in the paper's other colour.`, [-1.5, HEM], [1.5, HEM], [0, -1]),
    turn('back', 'Turn the sheet over', 'Turn it over from side to side, so the hem band is underneath along the bottom edge.'),
    fold('bib-left', 'Narrow the first bib corner', `Fold the top left corner down onto the paper along a slanting crease ${bibCrease}. This slopes one side of the bib.`, [-1, BIB_SIDE], [-BIB_TOP, 1], [-1, 1]),
    fold('bib-right', 'Narrow the other bib corner', `Fold the top right corner down the same way: crease ${bibCrease}.`, [1, BIB_SIDE], [BIB_TOP, 1], [1, 1]),
    turn('front', 'Reveal the apron', 'Turn it over from side to side: a printed bib narrowing to the top, over a hem band in the other colour.'),
  ] };
}

const D = (u: number, v: number): [number, number] => [(u - v) / Math.SQRT2, (u + v) / Math.SQRT2];
/** Clutch creases, as distances from the centre along a diagonal: each is at right angles to it. */
const TIP = 1.05, SIDE = .65, BODY = -.6, LID = .42;
/** How far from a corner a crease at `d` along the diagonal meets the two edges at that corner. */
const fromCorner = (d: number) => 2 - d * Math.SQRT2;
/** How far the body and lid creases end in from the paper's edge, on the side folds. */
const onSideFold = (d: number) => 1 - (SIDE + Math.abs(d)) / Math.SQRT2;
/** The tip must be folded BEFORE turning over, so closure reveals the reverse. */
export function buildClutch(): Construction {
  return { name: 'Envelope clutch', meta, ops: [
    fold('tip', 'Fold the flap tip first', `Print side up. Fold the top right corner down onto the print along a short crease that meets the top and right edges ${cm(fromCorner(TIP))} from the corner. This small triangle becomes the contrasting tip of the lid.`, D(TIP, -1.6), D(TIP, 1.6), D(1.414, 0)),
    turn('reverse', 'Turn the sheet over', 'Turn it over from side to side: the folded tip is now underneath at the top left corner, and the other colour faces you.'),
    fold('left', 'Bring in the first side', `Fold the bottom left corner in along a crease at right angles to the diagonal, meeting the bottom and left edges ${cm(fromCorner(SIDE))} from the corner. Its point lands just past the centre.`, D(-SIDE, -1.6), D(-SIDE, 1.6), D(-1.414, 0)),
    fold('right', 'Bring in the other side', `Fold the top right corner in the same way, the crease meeting the top and right edges ${cm(fromCorner(SIDE))} from the corner. Its point overlaps the first one a little.`, D(SIDE, -1.6), D(SIDE, 1.6), D(1.414, 0)),
    fold('body', 'Lift the lower envelope panel', `Fold the bottom right corner up and in along a crease at right angles to both side folds: from the lower side fold ${cm(onSideFold(BODY))} above the bottom edge to the upper one ${cm(onSideFold(BODY))} in from the right edge. Fold all the layers. This is the body.`, D(-1.6, BODY), D(1.6, BODY), D(0, -1.414)),
    fold('lid', 'Close the upper flap', `Fold the top left corner, with the tip, down over the body along a crease at right angles to the side folds: from the lower side fold ${cm(onSideFold(LID))} in from the left edge to the upper one ${cm(onSideFold(LID))} below the top edge. The tip shows the other colour.`, D(-1.6, LID), D(1.6, LID), D(0, 1)),
  ] };
}

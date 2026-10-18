// Zori: a flat sandal seen from above, folded from one small square: an oval-ish
// sole with a thong (hanao) of the paper's other side, from a point near the toe
// out to both sides of the sole. Fold two for a pair: zori are not made left and
// right, so both are the same fold.
//
// Why it folds. A narrow band is folded along the top edge, then the square is
// folded in half with one half behind: that half now carries its band on the
// outside, on the back. Folding both top corners down from the middle of the top
// edge, through every layer, brings the back layer to the front with its band
// along the folded-over edge: two strips of the other colour that leave the top
// point and run down and out. That is the kimono collar's fold at a shallower
// angle, so the strips spread instead of lying side by side. The front layer's own
// band stays only in the small triangle just under the point, which fills the
// thong's front knot.
//
// The toe. That point is on the paper's edge, but a zori's thong starts some way
// in from the toe. So, worked from the back, the sides fold in to the sole's width
// (the thong's ends go round them), and the lower part of the strip folds up past
// the point: seen from the front, the paper above the point is that layer, showing
// the same side as the sole. The four corners fold in to round the sole.
//
// Colour comes only from folding: the sole is folded an even number of times and
// the thong an odd number, so they always show opposite sides. The colour choice
// folds the first band behind and turns over, which leaves the paper as if it had
// started the other side up.

import type { Construction } from './construction';
import { FoldError, Op } from './engine';
import { v2 } from './geometry';

export type ZoriSide = 'print' | 'reverse';

export interface ZoriParams {
  /** Width of the band that becomes the thong, in sheet units (the sheet is [-1, 1]^2). */
  band: number;
  /** Slope of the corner folds that make the thong: drop over half the folded width. */
  cornerSlope: number;
  /** Half the sole's width. */
  halfWidth: number;
  /** How far the toe reaches above the thong's point. */
  toe: number;
  /** Size of the rounding folds at the toe and at the heel. */
  toeRound: number;
  heelRound: number;
  /** Which side of the paper the sole shows (the thong shows the other). */
  side: ZoriSide;
}

export const DEFAULT_ZORI: ZoriParams = { band: 0.06, cornerSlope: 0.56, halfWidth: 0.25, toe: 0.26, toeRound: 0.14, heelRound: 0.11, side: 'print' };

/** The zori's lines, in the model as the steps meet them (the half fold at x = 0, the strip on x in [-1, 0]). */
export function zoriGeometry(p: ZoriParams = DEFAULT_ZORI) {
  const { band: b, cornerSlope, halfWidth: s, toe } = p;
  if (!(b > 0.02 && b < 0.12)) throw new FoldError('zori: the thong band must be between 0.02 and 0.12');
  if (!(cornerSlope > 0.3 && cornerSlope < 0.9)) throw new FoldError('zori: corner slope out of range');
  const cx = -0.5; // the middle of the folded strip
  const point = v2(cx, 1 - b); // the thong's point: the middle of the banded top edge
  const phi = Math.atan(cornerSlope); // corner folds below horizontal
  const alpha = Math.PI / 2 - 2 * phi; // the thong's strips from vertical
  // each strip is half the top edge long; its end must pass the sole's side
  const reach = 0.5 * Math.sin(alpha);
  if (!(s < reach - 0.004)) throw new FoldError('zori: the thong does not reach the sides of the sole');
  if (!(s > 0.1 && s < 0.5)) throw new FoldError('zori: sole width out of range');
  const toeTop = point.y + toe;
  const heel = (toeTop - 1) / 2; // the lower part folds up behind about y = heel; its edge lands at toeTop
  if (!(heel > -0.5 && heel < point.y - 0.5 * Math.cos(alpha))) throw new FoldError('zori: the heel fold would cut the thong');
  return {
    b, cx, point, phi, alpha, halfWidth: s, toeTop, heel,
    /** where the thong's strips leave the sole's sides */
    strapY: point.y - s / Math.tan(alpha),
    length: toeTop - heel,
  };
}

/** Rendered-level allowance for the zori's folds (scripts/hingeCheck.ts). Its last
 * three folds turn whole stacks; the renderer's overlap levels put the two sides
 * of the rounding folds up to 19 apart, although no crease of the zori folds through
 * more than 8 paper layers (measured in check-zori-sensu.ts). */
export const ZORI_FOLD_LEVELS = 19;

export function buildZori(p: ZoriParams = DEFAULT_ZORI): Construction {
  const g = zoriGeometry(p);
  const { b, cx, point, halfWidth: s, toeTop, heel } = g;
  const { toeRound: ct, heelRound: ch } = p;
  const print = p.side === 'print';
  const sole = print ? 'the print' : 'the reverse colour';
  const thong = print ? 'the reverse colour' : 'the print';
  // the last steps are worked from the back, where the model is mirrored
  const M = (x: number, y: number) => v2(-x, y);
  const pct = (x: number) => `${(x * 50).toFixed(1)}%`; // of the square's side
  const ops: Op[] = [
    {
      kind: 'fold', id: 'zori-band', title: print ? 'Fold down a narrow band' : 'Fold a narrow band behind',
      hint: (print
        ? `Print side up. Fold the top edge down ${pct(b)} of the side. `
        : `Print side up. Fold the top edge behind ${pct(b)} of the side. `)
        + `This band becomes the thong, in ${thong}; the sole shows ${sole}.`,
      folds: [{ name: 'zori-band', a: v2(1.5, 1 - b), b: v2(-1.5, 1 - b), moving: v2(0, 0.99), sense: print ? 'valley' : 'mountain' }],
    },
  ];
  if (!print) ops.push({ kind: 'turn', id: 'zori-turn', title: 'Turn over', hint: 'The band stays at the top.' });
  ops.push(
    {
      kind: 'fold', id: 'zori-half', title: 'Fold in half, right half behind',
      hint: 'Fold the right half behind onto the left, edges together. The band of the back half is now on the outside, on the back.',
      folds: [{ name: 'zori-half', a: v2(0, -1.5), b: v2(0, 1.5), moving: v2(0.5, 0), sense: 'mountain' }],
    },
    {
      kind: 'fold', id: 'zori-thong', title: 'Fold both top corners down',
      hint: `All layers. From the middle of the top edge, fold each top corner down along a line that meets the side ${pct(p.cornerSlope * 0.5)} of the square below the top. The back half's band comes round to the front as two strips spreading from the point: the thong.`,
      folds: [
        { name: 'zori-thong-left', a: point, b: v2(cx - 1, point.y - p.cornerSlope), moving: v2(cx - 0.45, point.y - 0.01), sense: 'valley' },
        { name: 'zori-thong-right', a: v2(cx + 1, point.y - p.cornerSlope), b: point, moving: v2(cx + 0.45, point.y - 0.01), sense: 'valley' },
      ],
    },
    { kind: 'turn', id: 'zori-turn-back', title: 'Turn over', hint: 'The thong is underneath now. Shape the sole from the back.' },
    {
      kind: 'fold', id: 'zori-sides', title: 'Fold in the sides',
      hint: `All layers. Fold both long sides in so the sole is ${pct(2 * s)} of the square wide, centred on the thong; the two edges meet down the middle. The thong's ends go round the sides.`,
      folds: [
        { name: 'zori-side-left', a: M(cx + s, 1.5), b: M(cx + s, -1.5), moving: M(-0.01, 0), sense: 'valley' },
        { name: 'zori-side-right', a: M(cx - s, -1.5), b: M(cx - s, 1.5), moving: M(-0.99, 0), sense: 'valley' },
      ],
    },
    {
      kind: 'fold', id: 'zori-toe', title: 'Fold the bottom up',
      hint: `All layers. Fold the bottom edge up past the top until, seen from the other side, ${pct(p.toe)} of the square shows above the thong's point: the toe.`,
      folds: [{ name: 'zori-toe', a: M(1.5, heel), b: M(-1.5, heel), moving: M(cx, -0.99), sense: 'valley' }],
    },
    {
      kind: 'fold', id: 'zori-round', title: 'Round the corners',
      hint: 'Fold the four corners in at 45 degrees, a little more at the toe than at the heel.',
      folds: [
        { name: 'zori-toe-left', a: M(cx - s + ct, toeTop), b: M(cx - s, toeTop - ct), moving: M(cx - s + 0.005, toeTop - 0.005), sense: 'valley' },
        { name: 'zori-toe-right', a: M(cx + s, toeTop - ct), b: M(cx + s - ct, toeTop), moving: M(cx + s - 0.005, toeTop - 0.005), sense: 'valley' },
        { name: 'zori-heel-left', a: M(cx - s, heel + ch), b: M(cx - s + ch, heel), moving: M(cx - s + 0.005, heel + 0.005), sense: 'valley' },
        { name: 'zori-heel-right', a: M(cx + s - ch, heel), b: M(cx + s, heel + ch), moving: M(cx + s - 0.005, heel + 0.005), sense: 'valley' },
      ],
    },
    { kind: 'turn', id: 'zori-reveal', title: 'Turn over', hint: 'The finished zori. Fold a second square the same way for the pair.' },
  );
  return { name: print ? 'Zori' : 'Zori, reverse colour', ops, meta: { top: toeTop, shoulderPoint: point, sleeveCutDir: v2(1, 0) } };
}

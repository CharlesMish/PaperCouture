// Shell top: a short sleeveless top from one square, with a neckband and a hem
// band of the paper's other side and shoulders that slope out from the neckband.
// It replaces the boat-neck top, whose wide band over an inverted trapezoid read
// as a flowerpot.
//
// Why it folds. Narrow bands are folded along the top and bottom edges. From the
// back, a pleat across the lower half shortens the square to a top's length: the
// bottom folds up along the hem line, then only that flap folds back down, placed
// so that its edge, with its band, lands just below the hem line. From the front
// the top ends in a band of the other colour. Then the sides fold in and the top
// corners fold in from the ends of the neckband to slope the shoulders, and the
// model turns back over.
//
// The outline has no notches: sleeves, a V neck or armholes cut into the side
// would need paper joined on two sides to turn in, which simple flat folds cannot
// do. The shape is a shell: a neckband, sloping shoulders, a straight body.
//
// Colour comes only from folding. The colour choice folds the bands behind and
// skips the first turn-over, which leaves the paper exactly as if it had started
// the other side up.

import type { Construction } from './construction';
import { FoldError, type Op } from './engine';
import { v2 } from './geometry';

export type ShellSide = 'print' | 'reverse';

export interface ShellParams {
  /** Widths of the neck and hem bands, in sheet units. */
  neckband: number;
  hemband: number;
  /** Half-width of the neckband and of the body. */
  neck: number;
  halfWidth: number;
  /** How far the shoulders slope down from the neckband to the side. */
  shoulderDrop: number;
  /** Height of the hem line (sheet y). */
  hem: number;
  side: ShellSide;
}

export const DEFAULT_SHELL: ShellParams = { neckband: 0.06, hemband: 0.06, neck: 0.3, halfWidth: 0.6, shoulderDrop: 0.28, hem: -0.2, side: 'print' };

export function shellGeometry(p: ShellParams = DEFAULT_SHELL) {
  const { neckband: nb, hemband: hb, neck: n, halfWidth: s, shoulderDrop: d, hem: a } = p;
  if (!(nb > 0.02 && nb < 0.12 && hb > 0.02 && hb < 0.12)) throw new FoldError('shell top: bands out of range');
  if (!(n > 0.15 && n < s - 0.1 && s <= 0.8)) throw new FoldError('shell top: widths out of range');
  const top = 1 - nb;
  if (!(d > 0.05 && d < top - a - 0.3)) throw new FoldError('shell top: shoulder drop out of range');
  // the pleat: up at the hem line a, back down at y0, so the folded bottom edge
  // (at -1 + hb once its band is folded) lands at a - hb
  const y0 = a + (1 + a - 2 * hb) / 2;
  if (!(a > -0.6 && y0 < 2 * a + 1 - hb - 0.05)) throw new FoldError('shell top: hem out of range');
  return { top, hem: a, pleat: y0, bottom: a - hb, neck: n, halfWidth: s, shoulder: v2(s, top - d) };
}

/** Rendered-level allowance per operation (scripts/hingeCheck.ts): the shoulder
 * folds' two sides are 11 levels apart, although they fold through 4 paper layers
 * and the finished top has at most 8 at any point (check-wardrobe-gaps.ts). */
export const SHELL_LEVELS: Readonly<Record<string, number>> = { 'sh-shoulders': 11, 'sh-reveal': 11 };

export function buildShellTop(p: ShellParams = DEFAULT_SHELL): Construction {
  const g = shellGeometry(p);
  const { top, hem: a, pleat: y0 } = g;
  const { neckband: nb, hemband: hb, neck: n, halfWidth: s, shoulderDrop: d } = p;
  const print = p.side === 'print';
  const pct = (x: number) => `${(x * 50).toFixed(1)}%`;
  // from the back the model is mirrored; the shape is symmetric, so this only
  // swaps which fold is named left
  const M = (x: number, y: number) => v2(-x, y);
  const ops: Op[] = [
    {
      kind: 'fold', id: 'sh-bands', title: print ? 'Fold in a neckband and a hem band' : 'Fold a neckband and a hem band behind',
      hint: `Print side up. Fold the top edge ${print ? 'down' : 'behind'} by ${pct(nb)} of the side and the bottom edge ${print ? 'up' : 'behind'} by ${pct(hb)}: both bands show ${print ? 'the reverse colour' : 'the print'}; the top shows ${print ? 'the print' : 'the reverse colour'}.`,
      folds: [
        { name: 'sh-neckband', a: v2(1.5, top), b: v2(-1.5, top), moving: v2(0, 0.999), sense: print ? 'valley' : 'mountain' },
        { name: 'sh-hemband', a: v2(-1.5, -1 + hb), b: v2(1.5, -1 + hb), moving: v2(0, -0.999), sense: print ? 'valley' : 'mountain' },
      ],
    },
  ];
  if (print) ops.push({ kind: 'turn', id: 'sh-back', title: 'Turn over', hint: 'The top is shaped from the back.' });
  ops.push(
    {
      kind: 'fold', id: 'sh-hem', title: 'Fold the bottom up: the hem',
      hint: `Fold the bottom up along a line ${pct(1 + a - hb)} of the square above the folded bottom edge. This line is the hem.`,
      folds: [{ name: 'sh-hem', a: M(-1.5, a), b: M(1.5, a), moving: v2(0, -0.9), sense: 'valley' }],
    },
    {
      kind: 'fold', id: 'sh-pleat', title: 'Fold the flap back down',
      hint: `Fold only that flap back down along a line ${pct(y0 - a)} of the square above the hem, so its band just shows below the hem from the front. The pleat makes the top shorter.`,
      folds: [{ name: 'sh-pleat', a: M(1.5, y0), b: M(-1.5, y0), moving: v2(0, y0 + 0.05), sense: 'valley', only: 'sh-hem' }],
    },
    {
      kind: 'fold', id: 'sh-sides', title: 'Fold in the sides',
      hint: `All layers. Fold both sides in so the top is ${pct(2 * s)} of the square wide.`,
      folds: [
        { name: 'sh-side-left', a: M(-s, 1.5), b: M(-s, -1.5), moving: M(-0.99, 0), sense: 'valley' },
        { name: 'sh-side-right', a: M(s, -1.5), b: M(s, 1.5), moving: M(0.99, 0), sense: 'valley' },
      ],
    },
    {
      kind: 'fold', id: 'sh-shoulders', title: 'Slope the shoulders',
      hint: `Fold each top corner in along a line from the end of the neckband, ${pct(n)} of the square from the middle, to the side ${pct(d)} below the top.`,
      folds: [
        { name: 'sh-shoulder-left', a: M(-s, top - d), b: M(-n, top), moving: M(-s + 0.01, top - 0.01), sense: 'valley' },
        { name: 'sh-shoulder-right', a: M(n, top), b: M(s, top - d), moving: M(s - 0.01, top - 0.01), sense: 'valley' },
      ],
    },
    { kind: 'turn', id: 'sh-reveal', title: 'Turn over', hint: 'The finished shell top. Flat, with no neck opening or armholes.' },
  );
  return { name: print ? 'Shell top' : 'Shell top, reverse colour', ops, meta: { top, shoulderPoint: v2(-n, top), sleeveCutDir: v2(1, 0) } };
}

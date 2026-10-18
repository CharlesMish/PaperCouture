import type { Construction } from './construction';
import { v2 } from './geometry';

/** Width of the cord (obijime) bands and the finished band's half-height, in sheet units. */
export const OBI_CORD = 0.06;
export const OBI_HALF_HEIGHT = 0.25;
/** The obi spans the kimono's body just below the sleeves: its square is a third of the kimono's. */
export const OBI_SCALE = 0.33;
export const OBI_POSITIONS = ['waist'] as const;

/** Separate small square folded into an obi: a printed band with a cord of the
 * paper's other side across its middle (two narrow bands meeting at the centre).
 * Placed at the waist as a paper accent; it is not tied and has no bow behind. */
export function buildObi(): Construction {
  const c = OBI_CORD, edge = 1 - c, h = OBI_HALF_HEIGHT;
  return { name: 'Obi', meta: { top: h, shoulderPoint: v2(0, h), sleeveCutDir: v2(1, 0) }, ops: [
    { kind: 'fold', id: 'obi-cord', title: 'Turn down two narrow bands', hint: 'Fold the top and bottom edges over by a narrow band. Where they meet later, they make the cord across the obi.', folds: [
      { name: 'obi-cord-top', a: v2(-1.5, edge), b: v2(1.5, edge), moving: v2(0, 1), sense: 'valley' },
      { name: 'obi-cord-bottom', a: v2(1.5, -edge), b: v2(-1.5, -edge), moving: v2(0, -1), sense: 'valley' },
    ] },
    { kind: 'turn', id: 'obi-turn', title: 'Turn over', hint: 'The bands are underneath now.' },
    { kind: 'fold', id: 'obi-panels', title: 'Fold both edges to the centre', hint: 'Top and bottom edges meet on the middle line; the two bands meet there as the cord.', folds: [
      { name: 'obi-top', a: v2(-1.5, edge / 2), b: v2(1.5, edge / 2), moving: v2(0, 0.9), sense: 'valley' },
      { name: 'obi-bottom', a: v2(1.5, -edge / 2), b: v2(-1.5, -edge / 2), moving: v2(0, -0.9), sense: 'valley' },
    ] },
    { kind: 'fold', id: 'obi-narrow', title: 'Narrow the band', hint: 'Fold the top and bottom edges behind so the cord sits in the middle of a narrower band.', folds: [
      { name: 'obi-narrow-top', a: v2(1.5, h), b: v2(-1.5, h), moving: v2(0, 0.45), sense: 'mountain' },
      { name: 'obi-narrow-bottom', a: v2(-1.5, -h), b: v2(1.5, -h), moving: v2(0, -0.45), sense: 'mountain' },
    ] },
  ] };
}

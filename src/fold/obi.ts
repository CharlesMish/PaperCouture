import type { Construction } from './construction';
import { v2 } from './geometry';
import { cm } from './measure';

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
  // how far in from each edge of the band the last creases run (the band is `edge` tall after the panels)
  const narrow = edge / 2 - h;
  return { name: 'Obi', meta: { top: h, shoulderPoint: v2(0, h), sleeveCutDir: v2(1, 0) }, ops: [
    { kind: 'fold', id: 'obi-cord', title: 'Fold over two narrow strips', hint: `Print side up. Fold the top and bottom edges over onto the print by ${cm(c)} each, all the way across. These narrow strips, in the other colour, become the cord.`, folds: [
      { name: 'obi-cord-top', a: v2(-1.5, edge), b: v2(1.5, edge), moving: v2(0, 1), sense: 'valley' },
      { name: 'obi-cord-bottom', a: v2(1.5, -edge), b: v2(-1.5, -edge), moving: v2(0, -1), sense: 'valley' },
    ] },
    { kind: 'turn', id: 'obi-turn', title: 'Turn the square over', hint: 'Turn it over from side to side, so both narrow strips are underneath.' },
    { kind: 'fold', id: 'obi-panels', title: 'Fold both edges to the centre', hint: 'Fold the top edge down and the bottom edge up to meet on the centre line, all the layers. The two narrow strips now meet in the middle as the cord.', folds: [
      { name: 'obi-top', a: v2(-1.5, edge / 2), b: v2(1.5, edge / 2), moving: v2(0, 0.9), sense: 'valley' },
      { name: 'obi-bottom', a: v2(1.5, -edge / 2), b: v2(-1.5, -edge / 2), moving: v2(0, -0.9), sense: 'valley' },
    ] },
    { kind: 'fold', id: 'obi-narrow', title: 'Fold the top and bottom edges behind', hint: `Fold the top and bottom edges behind, all the layers, along creases ${cm(narrow)} in from each edge. The obi is now a band ${cm(2 * h)} tall with the cord across its middle.`, folds: [
      { name: 'obi-narrow-top', a: v2(1.5, h), b: v2(-1.5, h), moving: v2(0, 0.45), sense: 'mountain' },
      { name: 'obi-narrow-bottom', a: v2(-1.5, -h), b: v2(1.5, -h), moving: v2(0, -0.45), sense: 'mountain' },
    ] },
  ] };
}

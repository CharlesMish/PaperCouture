import { Construction } from './construction';
import { v2 } from './geometry';
import { cm } from './measure';
/** One wing of a modular bow. The workshop explicitly repeats this sequence on
 * a second square. Assembly overlaps the two tips; it is not a paper locking joint. */
export function buildBowWing(): Construction {
  // Each tip crease runs square to the long diagonal fold and crosses the triangle's
  // edge this far from the tip (the corner of the sheet), so the tip lands on the long fold.
  const tipCut = 1 - 0.3;
  return {
    name: 'Two-piece bow · wing',
    meta: { top: 1, shoulderPoint: v2(0, 1), sleeveCutDir: v2(1, 0) },
    ops: [
      { kind: 'turn', id: 'bow-turn', title: 'Put the print underneath', hint: 'Each wing of the bow takes its own square. Start print side up and turn it over from side to side, so the other colour faces up.' },
      { kind: 'fold', id: 'bow-diagonal', title: 'Fold corner to corner', hint: 'Fold in half corner to corner: bring the bottom right corner up onto the top left corner, creasing from the bottom left corner to the top right corner. The print shows on this triangle, the wing.', folds: [{ name: 'bow-diagonal', a: v2(-1, -1), b: v2(1, 1), moving: v2(1, -1), sense: 'valley' }] },
      { kind: 'fold', id: 'bow-tip-top', title: 'Fold the top right point in', hint: `Fold the top right point over onto the triangle, both layers, along a crease square to the long folded edge that crosses the top edge ${cm(tipCut)} from the point. The point lands on the long fold.`, folds: [{ name: 'bow-tip-top', a: v2(0.3, 1), b: v2(1, 0.3), moving: v2(1, 1), sense: 'valley' }] },
      { kind: 'fold', id: 'bow-tip-bottom', title: 'Fold the bottom left point in', hint: `Fold the bottom left point up the same way, both layers: crease square to the long folded edge, crossing the left edge ${cm(tipCut)} above the point. Both ends of the wing are now blunt.`, folds: [{ name: 'bow-tip-bottom', a: v2(-1, -0.3), b: v2(-0.3, -1), moving: v2(-1, -1), sense: 'valley' }] },
      { kind: 'turn', id: 'bow-reveal', title: 'Reveal the wing', hint: 'Turn it over from side to side: a printed wing with its folded points behind. Fold a second square the same way for the other wing.' },
    ],
  };
}

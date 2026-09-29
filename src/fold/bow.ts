import { Construction } from './construction';
import { v2 } from './geometry';
/** One wing of a modular bow. The workshop explicitly repeats this sequence on
 * a second square. Assembly overlaps the two tips; it is not a paper locking joint. */
export function buildBowWing(): Construction {
  return {
    name: 'Two-piece bow · wing',
    meta: { top: 1, shoulderPoint: v2(0, 1), sleeveCutDir: v2(1, 0) },
    ops: [
      { kind: 'turn', id: 'bow-turn', title: 'Put the print underneath', hint: 'This two-piece bow uses one square for each wing. Turn this one reverse-side up.' },
      { kind: 'fold', id: 'bow-diagonal', title: 'Fold corner to corner', hint: 'Bring the lower-right corner to the upper-left. The triangle becomes one wing.', folds: [{ name: 'bow-diagonal', a: v2(-1, -1), b: v2(1, 1), moving: v2(1, -1), sense: 'valley' }] },
      { kind: 'fold', id: 'bow-tip-top', title: 'Tuck the first outer tip', hint: 'A small fold softens the outer end of the wing. Keep the broad face intact.', folds: [{ name: 'bow-tip-top', a: v2(0.3, 1), b: v2(1, 0.3), moving: v2(1, 1), sense: 'valley' }] },
      { kind: 'fold', id: 'bow-tip-bottom', title: 'Tuck the other outer tip', hint: 'Match the small fold at the other end. Both tucked tips will sit behind the wing.', folds: [{ name: 'bow-tip-bottom', a: v2(-1, -0.3), b: v2(-0.3, -1), moving: v2(-1, -1), sense: 'valley' }] },
      { kind: 'turn', id: 'bow-reveal', title: 'Reveal the wing', hint: 'The clean patterned face is ready. Two matching wings overlap at their narrow tips.' },
    ],
  };
}

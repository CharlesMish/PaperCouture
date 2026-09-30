import { Construction } from './construction';
import { v2 } from './geometry';

/** A separate third square for the modular bow: a folded rectangular centre.
 * Assembly is decorative placement, not a claim of a self-locking joint. */
export function buildBowCentre(): Construction {
  return {
    name: 'Bow · folded centre',
    meta: { top: 0.5, shoulderPoint: v2(0, 0.5), sleeveCutDir: v2(1, 0) },
    ops: [
      {
        kind: 'turn', id: 'centre-turn', title: 'Put the print underneath',
        hint: 'Use a third, smaller square for the optional centre. Both completed wings are kept aside.',
      },
      {
        kind: 'fold', id: 'centre-bands', title: 'Bring the top and bottom edges to the middle',
        hint: 'Two broad folds make a band. The paper stays connected along both creases.',
        folds: [
          { name: 'centre-top', a: v2(-1.5, 0.5), b: v2(1.5, 0.5), moving: v2(0, 1), sense: 'valley' },
          { name: 'centre-bottom', a: v2(-1.5, -0.5), b: v2(1.5, -0.5), moving: v2(0, -1), sense: 'valley' },
        ],
      },
      {
        kind: 'fold', id: 'centre-left', title: 'Fold the left end across',
        hint: 'Bring the left end inward along the guide. It will sit behind the finished centre.',
        folds: [{ name: 'centre-left', a: v2(-0.36, -1.5), b: v2(-0.36, 1.5), moving: v2(-1, 0), sense: 'valley' }],
      },
      {
        kind: 'fold', id: 'centre-right', title: 'Overlap with the right end',
        hint: 'Fold the second end over the first. This makes a compact, layered rectangle.',
        folds: [{ name: 'centre-right', a: v2(0.36, -1.5), b: v2(0.36, 1.5), moving: v2(1, 0), sense: 'valley' }],
      },
      {
        kind: 'turn', id: 'centre-reveal', title: 'Reveal the folded centre',
        hint: 'Place this separate folded square over the meeting point of the two wings. The three pieces are a styled assembly.',
      },
    ],
  };
}

import { Construction } from './construction';
import { v2 } from './geometry';

/** An asymmetric wrap study. Every panel is retained from one square; the
 * wrap faces and doubled waistband carry the print over a reverse backing. */
export function buildWrapSkirt(): Construction {
  return {
    name: 'Wrap skirt',
    meta: { top: 0.72, shoulderPoint: v2(-0.2, 1), sleeveCutDir: v2(1, 0) },
    ops: [
      { kind: 'turn', id: 'skirt-turn', title: 'Put the print underneath', hint: 'The wrap folds will bring the print back to the front, leaving a reveal of the reverse beneath them.' },
      {
        kind: 'fold', id: 'skirt-length', title: 'Establish the skirt length',
        hint: 'Tuck the bottom edge behind before making the wrap panels. This keeps the hem compact.',
        folds: [{ name: 'skirt-length', a: v2(-1.5, -0.55), b: v2(1.5, -0.55), moving: v2(0, -1), sense: 'mountain' }],
      },
      {
        kind: 'fold', id: 'skirt-wrap-left', title: 'Bring the broad panel across',
        hint: 'Fold the left side inward along the slanted guide. Its printed face becomes the broad wrap panel.',
        folds: [{ name: 'skirt-wrap-left', a: v2(-0.2, 1), b: v2(-0.82, -0.55), moving: v2(-1, 0), sense: 'valley' }],
      },
      {
        kind: 'fold', id: 'skirt-wrap-right', title: 'Overlap the second panel',
        hint: 'Bring the narrower right side inward. The two slanted edges overlap near the waist.',
        folds: [{ name: 'skirt-wrap-right', a: v2(0.5, 1), b: v2(0.82, -0.55), moving: v2(1, 0), sense: 'valley' }],
      },
      {
        kind: 'fold', id: 'skirt-hem', title: 'Tuck the small hem points',
        hint: 'The slanted folds leave small points below the hem. Turn just those points underneath.',
        folds: [{ name: 'skirt-hem', a: v2(-1.5, -0.55), b: v2(1.5, -0.55), moving: v2(0, -1.5), sense: 'mountain' }],
      },
      {
        kind: 'fold', id: 'skirt-waist', title: 'Start the narrow waistband',
        hint: 'Fold down a narrow strip. One more turn will make a compact waistband.',
        folds: [{ name: 'skirt-waist', a: v2(-1.5, 0.86), b: v2(1.5, 0.86), moving: v2(0, 1.5), sense: 'valley' }],
      },
      {
        kind: 'fold', id: 'skirt-waist-finish', title: 'Turn the waistband once more',
        hint: 'Roll the folded strip down again to make a small band above the wrap panels.',
        folds: [{ name: 'skirt-waist-finish', a: v2(-1.5, 0.72), b: v2(1.5, 0.72), moving: v2(0, 1), sense: 'valley' }],
      },
    ],
  };
}

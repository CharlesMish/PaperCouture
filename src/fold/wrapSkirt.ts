import { Construction } from './construction';
import { v2 } from './geometry';

export type WrapDirection = 'original' | 'opposite';
export type WaistbandFinish = 'double' | 'single';
export interface WrapSkirtOptions {
  wrap?: WrapDirection;
  band?: WaistbandFinish;
}

/** An asymmetric wrap study. Every panel is retained from one square; the
 * wrap faces and doubled waistband carry the print over a reverse backing. */
export function buildWrapSkirt({ wrap = 'original', band = 'double' }: WrapSkirtOptions = {}): Construction {
  const construction: Construction = {
    name: 'Wrap skirt',
    meta: { top: 0.72, shoulderPoint: v2(-0.2, 1), sleeveCutDir: v2(1, 0) },
    ops: [
      {
        kind: 'fold', id: 'skirt-length', title: 'Establish the skirt length',
        hint: 'Lift the bottom edge up onto the printed face. We will turn the whole sheet over next.',
        folds: [{ name: 'skirt-length', a: v2(-1.5, -0.55), b: v2(1.5, -0.55), moving: v2(0, -1), sense: 'valley' }],
      },
      { kind: 'turn', id: 'skirt-turn', title: 'Turn over for the wrap panels', hint: 'The length fold is underneath. Bring the side panels up onto this side next.' },
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
      { kind: 'turn', id: 'skirt-hem-back', title: 'Turn over to reach the hem points', hint: 'Work from the back so the little points can fold upward in view.' },
      {
        kind: 'fold', id: 'skirt-hem', title: 'Lift the small hem points up',
        hint: 'Lift the small points onto this side, following the handles. They will be hidden when we turn back.',
        folds: [{ name: 'skirt-hem', a: v2(-1.5, -0.55), b: v2(1.5, -0.55), moving: v2(0, -1.5), sense: 'valley' }],
      },
      { kind: 'turn', id: 'skirt-front', title: 'Return to the patterned front', hint: 'The hem points are tucked away. Finish with the narrow waistband.' },
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

  if (wrap === 'opposite') {
    // Only the asymmetric panel creases change. The symmetric length fold and
    // turn-over are an identical prefix, so the choice is safe at the first
    // wrap fold. Reflect model-space creases, never paper material/UV coordinates.
    for (const op of construction.ops) {
      if (op.kind !== 'fold' || !['skirt-wrap-left', 'skirt-wrap-right'].includes(op.id)) continue;
      op.folds = op.folds.map(fold => ({
        ...fold,
        a: v2(-fold.a.x, fold.a.y), b: v2(-fold.b.x, fold.b.y), moving: v2(-fold.moving.x, fold.moving.y),
      }));
      op.hint = op.id === 'skirt-wrap-left'
        ? 'Fold the right side inward along the slanted guide. Its printed face becomes the broad wrap panel.'
        : 'Bring the narrower left side inward. The two slanted edges overlap near the waist.';
    }
    construction.meta.shoulderPoint = v2(0.2, 1);
  }

  if (band === 'single') {
    construction.meta.top = 0.78;
    construction.ops = construction.ops.filter(op => op.id !== 'skirt-waist-finish');
    const waist = construction.ops.find(op => op.id === 'skirt-waist')!;
    waist.title = 'Fold one broad waistband';
    waist.hint = 'Fold the top strip down once along the deeper guide. This leaves a broader printed waistband.';
    if (waist.kind === 'fold') {
      waist.folds[0].a.y = 0.78;
      waist.folds[0].b.y = 0.78;
    }
  }

  return construction;
}

import { Construction } from './construction';
import type { FoldSpec } from './engine';
import { sub, v2 } from './geometry';
import { cm, lineMeet } from './measure';

export type WrapDirection = 'original' | 'opposite';
export type WaistbandFinish = 'double' | 'single';
export type SkirtLength = 'short' | 'classic' | 'long';
/** Discrete skirt lengths: the first crease (and the matching hem-point fold)
 * moves up or down. The side, wrap and waistband creases are unchanged, so the
 * lower edge stays well away from the thick waistband layers. */
export const SKIRT_LENGTHS: { id: SkirtLength; name: string; y: number; hint: string }[] = [
  { id: 'short', name: 'Short', y: -0.3, hint: 'This deep fold makes a short skirt.' },
  { id: 'classic', name: 'Classic', y: -0.55, hint: 'This sets the skirt length.' },
  { id: 'long', name: 'Long', y: -0.8, hint: 'This narrow strip leaves a long skirt.' },
];

/** The waistband creases: turned twice (0.86 then 0.72) or once (0.78). */
const WAIST = 0.86, WAIST_FINISH = 0.72, SINGLE_WAIST = 0.78;

/** The length fold, for the instructions: the strip below the crease at `y` folds up. */
const lengthHint = (option: typeof SKIRT_LENGTHS[number]) =>
  `Print side up. Fold the bottom edge up onto the print by ${cm(1 + option.y)}, all the way across. ${option.hint}`;
/** A wrap-panel fold, for the instructions: where its slanting crease meets the top
 * edge and the bottom edge (the length fold at `bottom`), in from the side it folds. */
function wrapHint(fold: FoldSpec, bottom: number, what: string): string {
  const side = fold.moving.x < 0 ? 'left' : 'right';
  const low = lineMeet(fold.a, sub(fold.b, fold.a), v2(0, bottom), v2(1, 0));
  return `Fold the ${side} side over along a slanting crease: from the top edge ${cm(1 - Math.abs(fold.a.x))} in from the ${side}, to the bottom edge ${cm(1 - Math.abs(low.x))} in from the ${side}. ${what}`;
}
export interface WrapSkirtOptions {
  wrap?: WrapDirection;
  band?: WaistbandFinish;
  length?: SkirtLength;
}

/** An asymmetric wrap study. Every panel is retained from one square; the
 * wrap faces and doubled waistband carry the print over a reverse backing. */
export function buildWrapSkirt({ wrap = 'original', band = 'double', length = 'classic' }: WrapSkirtOptions = {}): Construction {
  const construction: Construction = {
    name: 'Wrap skirt',
    meta: { top: 0.72, shoulderPoint: v2(-0.2, 1), sleeveCutDir: v2(1, 0) },
    ops: [
      {
        kind: 'fold', id: 'skirt-length', title: 'Establish the skirt length',
        hint: lengthHint(SKIRT_LENGTHS.find(l => l.id === 'classic')!),
        folds: [{ name: 'skirt-length', a: v2(-1.5, -0.55), b: v2(1.5, -0.55), moving: v2(0, -1), sense: 'valley' }],
      },
      { kind: 'turn', id: 'skirt-turn', title: 'Turn over for the wrap panels', hint: 'Turn it over from side to side, so the folded strip is underneath along the bottom edge.' },
      {
        kind: 'fold', id: 'skirt-wrap-left', title: 'Bring the broad panel across',
        hint: '', // set below, once the length and wrap are known
        folds: [{ name: 'skirt-wrap-left', a: v2(-0.2, 1), b: v2(-0.82, -0.55), moving: v2(-1, 0), sense: 'valley' }],
      },
      {
        kind: 'fold', id: 'skirt-wrap-right', title: 'Overlap the second panel',
        hint: '',
        folds: [{ name: 'skirt-wrap-right', a: v2(0.5, 1), b: v2(0.82, -0.55), moving: v2(1, 0), sense: 'valley' }],
      },
      { kind: 'turn', id: 'skirt-hem-back', title: 'Turn over to reach the hem points', hint: 'Turn it over from side to side. The slanting folds leave a small point sticking out below the bottom edge on each side.' },
      {
        kind: 'fold', id: 'skirt-hem', title: 'Lift the small hem points up',
        hint: 'Fold both small points up along the bottom edge, onto this side. They are hidden once you turn back.',
        folds: [{ name: 'skirt-hem', a: v2(-1.5, -0.55), b: v2(1.5, -0.55), moving: v2(0, -1.5), sense: 'valley' }],
      },
      { kind: 'turn', id: 'skirt-front', title: 'Return to the patterned front', hint: 'Turn it over from side to side, back to the wrap panels.' },
      {
        kind: 'fold', id: 'skirt-waist', title: 'Start the narrow waistband',
        hint: `Fold the top edge down by ${cm(1 - WAIST)}, all the layers. This strip starts the waistband.`,
        folds: [{ name: 'skirt-waist', a: v2(-1.5, WAIST), b: v2(1.5, WAIST), moving: v2(0, 1.5), sense: 'valley' }],
      },
      {
        kind: 'fold', id: 'skirt-waist-finish', title: 'Turn the waistband once more',
        hint: `Fold the strip down once more, all the layers, along its lower edge (another ${cm(WAIST - WAIST_FINISH)}). This makes a narrow printed waistband.`,
        folds: [{ name: 'skirt-waist-finish', a: v2(-1.5, WAIST_FINISH), b: v2(1.5, WAIST_FINISH), moving: v2(0, 1), sense: 'valley' }],
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
    }
    construction.meta.shoulderPoint = v2(0.2, 1);
  }

  if (length !== 'classic') {
    const option = SKIRT_LENGTHS.find(l => l.id === length)!;
    construction.name = `${option.name} wrap skirt`;
    for (const op of construction.ops) {
      if (op.kind !== 'fold' || (op.id !== 'skirt-length' && op.id !== 'skirt-hem')) continue;
      op.folds = op.folds.map(fold => ({ ...fold, a: v2(fold.a.x, option.y), b: v2(fold.b.x, option.y) }));
      if (op.id === 'skirt-length') op.hint = lengthHint(option);
    }
  }

  if (band === 'single') {
    construction.meta.top = SINGLE_WAIST;
    construction.ops = construction.ops.filter(op => op.id !== 'skirt-waist-finish');
    const waist = construction.ops.find(op => op.id === 'skirt-waist')!;
    waist.title = 'Fold one broad waistband';
    waist.hint = `Fold the top edge down by ${cm(1 - SINGLE_WAIST)}, all the layers. This broad band is the printed waistband.`;
    if (waist.kind === 'fold') {
      waist.folds[0].a.y = SINGLE_WAIST;
      waist.folds[0].b.y = SINGLE_WAIST;
    }
  }

  const bottom = SKIRT_LENGTHS.find(l => l.id === length)!.y;
  for (const op of construction.ops) {
    if (op.kind !== 'fold') continue;
    if (op.id === 'skirt-wrap-left') op.hint = wrapHint(op.folds[0], bottom, 'Its print side comes up as the broad wrap panel.');
    if (op.id === 'skirt-wrap-right') op.hint = wrapHint(op.folds[0], bottom, 'This narrower panel overlaps the first near the waist.');
  }
  return construction;
}

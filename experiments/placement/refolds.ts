// Candidate refolds for pieces the review marked "Look again", and one new piece. Sketches only:
// they are not in the app's design list, and nothing in src/ reads this file.
// Each is drawn beside the current fold in the review page's Refolds tab, and
// experiments/placement/validate-refolds.ts runs the same gates the repository
// uses for a draft fold. If one is wanted, it should be moved into src/fold as
// a new design or a choice on the old one, so the existing fold stays exact.
import type { Construction } from '../../src/fold/construction';
import type { Op } from '../../src/fold/engine';
import { v2 } from '../../src/fold/geometry';

type Point = [number, number];
const fold = (id: string, title: string, hint: string, a: Point, b: Point, moving: Point, only?: string): Op => ({
  kind: 'fold', id, title, hint,
  folds: [{ name: id, a: v2(...a), b: v2(...b), moving: v2(...moving), sense: 'valley', ...(only ? { only } : {}) }],
});
const turn = (id: string, title: string, hint: string): Op => ({ kind: 'turn', id, title, hint });
const meta = (top: number) => ({ top, shoulderPoint: v2(0, top), sleeveCutDir: v2(1, 0) });

/** The ankle boot with one fold added at the start: the top edge turned down
 * onto the print, so the finished shaft has a cuff of the other colour. */
export function bootWithCuff(direction: 'left' | 'right' = 'left', cuff = .22): Construction {
  const sign = direction === 'right' ? -1 : 1;
  const X = (p: Point): Point => [sign * p[0], p[1]];
  const third = 1 / 3, ankle = .45, toeEnd = ankle + 1 - third;
  return { name: `Cuffed ankle boot, toe ${direction}`, meta: meta(1 - cuff), ops: [
    fold('cuff', 'Turn down the cuff', 'Fold the top edge down onto the print. This band of the other colour becomes the cuff.', [-1.5, 1 - cuff], [1.5, 1 - cuff], [0, 1]),
    turn('boot-back', 'Put the print underneath', 'Fold the boot from the reverse, with the cuff underneath.'),
    fold('boot-side-first', 'Fold the first third inward', 'Bring one side into a narrow upright strip. All layers move together.', X([-third, -1.5]), X([-third, 1.5]), X([-1, 0])),
    fold('boot-side-second', 'Fold the other third inward', 'Fold the opposite side over it.', X([third, -1.5]), X([third, 1.5]), X([1, 0])),
    fold('boot-ankle', 'Turn the lower strip into a foot', 'Lift the lower strip along the diagonal guide.', X([-third, ankle]), X([third, ankle - 2 * third]), X([0, -1])),
    fold('boot-toe', 'Tuck the toe corner', 'Fold the small outer toe corner onto this side.', X([toeEnd - .28, ankle]), X([toeEnd, ankle - .3]), X([toeEnd, ankle])),
    turn('boot-front', 'Reveal the cuffed boot', 'A flat boot with a cuff of the other colour at the top of the shaft.'),
  ] };
}

/** A hat with a band: the lower edge is turned up onto the print first, so the
 * band is the other colour, and the crown is shaped above it. */
export function hatWithBand(band = .22, base = .9, crownTop = .5, height = .25): Construction {
  const bandTop = -1 + 2 * band; // the turned-up strip covers [-1 + band, bandTop]
  return { name: 'Banded hat', meta: meta(height), ops: [
    fold('hat-band', 'Turn up the band', 'Fold the lower edge up onto the print. This strip of the other colour is the hat band.', [-1.5, -1 + band], [1.5, -1 + band], [0, -1]),
    turn('hat-reverse', 'Put the print underneath', 'Shape the crown from the reverse, with the band underneath.'),
    fold('hat-crown-left', 'Shape the first crown corner', 'Fold the upper corner in from just above the band.', [-base, bandTop], [-crownTop, 1], [-1, 1]),
    fold('hat-crown-right', 'Shape the other crown corner', 'Match it on the other side.', [base, bandTop], [crownTop, 1], [1, 1]),
    fold('hat-top', 'Flatten the crown top', 'Turn the top down onto this side.', [-1.5, height], [1.5, height], [0, 1]),
    turn('hat-front', 'Reveal the banded hat', 'A tapered crown over a band of the other colour, with the brim ends showing past it.'),
  ] };
}

/** The boat-neck top with short sleeves: each side flap is folded back out
 * from the shoulder, as the dress does, so the top has shoulders. */
export function topWithSleeves(shoulder = .62, waist = .5, drop = .5, reach = .3): Construction {
  const top = .7;
  const sleeve = (s: number): Op => fold(s < 0 ? 'tee-sleeve-left' : 'tee-sleeve-right', s < 0 ? 'Fold out the first sleeve' : 'Fold out the other sleeve',
    'Fold only the side flap back outward from the shoulder to make a short sleeve.',
    [s * shoulder, top], [s * (shoulder - reach), top - drop], [s * (shoulder - .12), top - .05], s < 0 ? 'tee-left' : 'tee-right');
  return { name: 'Short-sleeved top', meta: meta(top), ops: [
    fold('tee-band', 'Fold the neckband', 'Turn down the top edge. Its reverse becomes a wide, straight neckband.', [-1.5, top], [1.5, top], [0, 1]),
    turn('tee-back', 'Turn over to shape the body', 'Keep the band underneath.'),
    fold('tee-left', 'Fold in the first side', 'Fold the side in along the sloping guide.', [-shoulder, top], [-waist, -1], [-1, 0]),
    sleeve(-1),
    fold('tee-right', 'Fold in the other side', 'Match it on the other side.', [shoulder, top], [waist, -1], [1, 0]),
    sleeve(1),
    fold('tee-hem', 'Fold a short hem', 'Bring the lower panel up behind the top.', [-1.5, -.3], [1.5, -.3], [0, -1]),
    turn('tee-front', 'Reveal the short-sleeved top', 'A neckband, two short sleeves and a short body.'),
  ] };
}

/** Wide-leg trousers, or hakama: two leg panels that part toward the hem over a
 * backing of the other colour, under a waistband of that colour. Nothing is cut;
 * the opening between the legs is the backing showing, as on the cross-wrap top. */
export function wideLegTrousers(band = .2, flare = .12, waist = .47): Construction {
  const top = 1 - band, fold2 = top - band; // the hem band lies on [top - band, top]; folding at its lower edge brings only the band to the front
  return { name: 'Wide-leg trousers', meta: meta(fold2), ops: [
    fold('trouser-band', 'Turn down the waistband', 'Fold the top edge down onto the print. This strip of the other colour becomes the waistband.', [-1.5, top], [1.5, top], [0, 1]),
    turn('trouser-back', 'Put the print underneath', 'Fold the legs from the reverse.'),
    fold('trouser-left', 'Fold in the first leg', 'Bring one side in to the middle at the waist, leaning out a little toward the hem.', [-waist, top], [-waist - flare, -1], [-1, 0]),
    fold('trouser-right', 'Fold in the other leg', 'Match it. The legs meet at the waist and part toward the hem.', [waist, top], [waist + flare, -1], [1, 0]),
    fold('trouser-waist', 'Fold the waistband over', 'Turn the top down over the legs. The band of the other colour now sits across the waist.', [-1.5, fold2], [1.5, fold2], [0, top]),
  ] };
}

/** `measured` is copied from validate-refolds.ts and the current fold's own metrics, at the current fold's suggested square. */
export interface Refold { id: string; name: string; replaces?: string; build: () => Construction; note: string; measured: string }
export const REFOLDS: Refold[] = [
  { id: 'trousers', name: 'Wide-leg trousers (new)', build: () => wideLegTrousers(),
    note: 'The wardrobe has no trousers, and you said the earlier attempts fought the paper. This one does not try to separate the legs. Two panels meet under a waistband of the other colour and part toward the hem over the backing, the way the cross-wrap top shows its V. Five steps, all simple folds. Wide and flared, so it is closest to hakama, which is also what a kimono is worn with.',
    measured: 'At 20 cm: 5 steps; 11.8 × 16.5 cm; two layers over 74% of it; 11 layers on 0.2% of it, where both legs, the hem and the waist fold meet at the centre of the waistband. Hinge stack 9 layer gaps, over the limit of 8.' },
  { id: 'boot-cuff', name: 'Ankle boot with a cuff', replaces: 'boot-left', build: () => bootWithCuff('left'),
    note: 'One fold added at the start: the top edge turned down onto the print. The shaft gets a cuff of the other colour, which is what tells you it is a boot. Six layers at the cuff instead of three. The toe-right boot is the mirror image.',
    measured: 'At 8 cm: 7 steps (6 now); most layers 6 (6 now); narrowest facet 8.2 mm (0.29 mm now, a sliver at the top that the cuff removes). Hinge stack 10 layer gaps, over the limit of 8 the simple folds are held to; the current boot is exactly at 8.' },
  { id: 'top-sleeves', name: 'Boat-neck top with short sleeves', replaces: 'boat-top', build: () => topWithSleeves(),
    note: 'Each side flap is folded back out from the shoulder, the way the dress makes its sleeves, and the tiny shoulder-tip tuck is no longer needed. One step more. It reads as a top because it has shoulders.',
    measured: 'At 16 cm: 8 steps (7 now); most layers 6 (6 now); narrowest facet 10.9 mm (4.1 mm now). Hinge stack 6 layer gaps.' },
  { id: 'hat-band', name: 'Hat with a band', replaces: 'hat', build: () => hatWithBand(),
    note: 'The lower edge is turned up onto the print first, so the band is the other colour, and the crown is shaped above it. One step fewer. Better than the plain trapezoid, but still the weakest of the three: the brim is only the band’s two ends.',
    measured: 'At 8 cm: 6 steps (7 now); most layers 4 (5 now); shortest crease 1.7 mm (9.2 mm now), where the crown fold crosses the band. Hinge stack 4 layer gaps.' },
];

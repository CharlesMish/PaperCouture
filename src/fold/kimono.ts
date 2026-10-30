// The Paper Couture kimono: the traditional paper kimono (the folded robe of
// chiyogami decorations), from one uncut square: square sleeves, a collar of the
// paper's other side running down the front from a point at the neck, and a body
// that narrows to the hem. The fold follows the traditional sequence; the
// construction below is that sequence written as rigid steps for this engine.
//
// Why it folds. The square is folded in half with the fold at the hem, so the
// kimono has a front and a back joined only there. Both layers get a narrow band
// along their open top edge. The lower corners fold up at 45 degrees until they
// touch the band's crease (they become the shoulders later); then both top corners
// fold to the centre line at 45 degrees. That fold carries the front layer's
// corners, with their bands, round to the back layer's side, where the two bands
// lie side by side down the centre: the collar.
//
// The sleeves come from the squash (step 9 of the traditional diagrams). Seen from
// the side the lower-corner flaps are on, the lower half of the body (both layers,
// joined at the hem) lifts up across the line through the two side points, and
// each lower-corner flap, now two layers hinged on the 45 degree collar line,
// opens outward into the empty shoulder corner. The four creases at each side
// point turn as one rigid mechanism: the lift and the flap's own crease turn at the
// same rate, the other two (the flap's hinge on the body and its hinge on the
// collar fold) at sqrt(2) times that rate (tan of half the fold angle), so every
// crease loop closes at every moment of the move. The sleeves are always square:
// both their sides are half the band's distance from the paper's middle.
//
// Colour comes only from folding: the body is folded once and the collar bands
// twice, so they always show opposite sides of the paper. The colour choice folds
// the first step the other way and turns over, which leaves the paper exactly as if
// it had started the other side up.

import type { CollapseCrease, CollapseRegion, CollapseSpec, HalfPlane } from './collapse';
import type { Construction } from './construction';
import { FoldError, Op } from './engine';
import { Vec2, v2 } from './geometry';
import { cm } from './measure';

export type KimonoSide = 'print' | 'reverse';

export interface KimonoParams {
  /** Width of each collar band, in sheet units (the sheet is [-1, 1]^2). */
  band: number;
  /** Which side of the paper the kimono shows (the collar shows the other). */
  side: KimonoSide;
}

export const DEFAULT_KIMONO: KimonoParams = { band: 0.15, side: 'print' };

const plane = (a: Vec2, b: Vec2, keep: Vec2): HalfPlane => ({ a, b, keep });

/** The kimono's lines, in the model as the steps meet them (the fold in half at y = 0). */
export function kimonoGeometry(p: KimonoParams = DEFAULT_KIMONO) {
  const b = p.band;
  if (!(b > 0.02 && b < 0.3)) throw new FoldError('kimono: the collar band must be between 0.02 and 0.3 of the half-sheet');
  const top = 1 - b; // the open top edge once its band is folded
  const sideY = 0.5 - b; // the side points: where the 45 degree folds from the top and from below meet
  return {
    b, top, sideY,
    /** half-width of the finished kimono (sleeve tip to sleeve tip is 1, half the sheet) */
    halfWidth: 0.5,
    /** top of the sleeves (the lifted body's hem lands here) */
    shoulderY: top - b,
    sideLeft: v2(-0.5, sideY), sideRight: v2(0.5, sideY),
  };
}

const COLLAR = ['collar-left', 'collar-right'];
/** Crease directions of the squash: the lift, each flap's hinge, the flap's own fold, its shoulder hinge. */
export const SQUASH_SIGNS = [-1, -1, 1, 1] as const;
const FLAPS = ['corner-left', 'corner-right'];

/** Step 9: lift the lower body and open both sleeves, as one rigid move, seen
 * from the collar side (the traditional diagrams turn the model over for it; the
 * paper does the same thing, and from this side every sleeve layer stays behind
 * the collar while it moves, which is where it comes to rest). */
export function kimonoSquashSpec(p: KimonoParams = DEFAULT_KIMONO, signs: readonly number[] = SQUASH_SIGNS): CollapseSpec {
  const g = kimonoGeometry(p);
  const { b, top, sideY } = g;
  const below = plane(v2(-2, sideY), v2(2, sideY), v2(0, sideY - 1));
  const above = plane(v2(-2, sideY), v2(2, sideY), v2(0, sideY + 1));
  const regions: CollapseRegion[] = [
    // the collar flaps stay where they are, wherever they lie
    { tag: 'k-collar-left', body: 'body', where: [], only: 'collar-left' },
    { tag: 'k-collar-right', body: 'body', where: [], only: 'collar-right' },
    { tag: 'k-yoke', body: 'body', where: [above], except: [...COLLAR, ...FLAPS] },
    { tag: 'k-lift', body: 'lift', where: [below], except: [...COLLAR, ...FLAPS] },
  ];
  const creases: CollapseCrease[] = [
    { name: 'lift', parent: 'body', child: 'lift', a: v2(-1, sideY), b: v2(1, sideY), rate: 1, sign: signs[0] as 1 | -1 },
  ];
  // seen from the collar side, the flap folded as 'corner-right' lies on the left
  for (const [flap, sx] of [['corner-right', -1], ['corner-left', 1]] as const) {
    const s = sx > 0 ? 'right' : 'left';
    const P = v2(sx * 0.5, sideY);
    // the flap halves lie inside the diamond: between the hinge and the centre
    // below the side points' line, between the collar fold and it above. Bounding
    // them there also tells each crease which side its moving body is on.
    const hinge = plane(v2(sx * b, 0), P, v2(sx * (b + 0.02), sideY - 0.02));
    const shoulder = plane(v2(sx * b, top - b), P, v2(sx * (b + 0.02), sideY + 0.02));
    regions.push(
      { tag: `k-flap-${s}`, body: `flap-${s}`, where: [below, hinge], only: flap, except: COLLAR },
      { tag: `k-sleeve-${s}`, body: `sleeve-${s}`, where: [above, shoulder], only: flap, except: COLLAR },
    );
    creases.push(
      // the corner flap's own fold onto the body, which now opens
      { name: `hinge-${s}`, parent: 'lift', child: `flap-${s}`, a: v2(sx * b, 0), b: P, rate: Math.SQRT2, sign: signs[1] as 1 | -1 },
      // the flap folds across the side points' line, between its lifted and its sleeve half
      { name: `sleeve-fold-${s}`, parent: `flap-${s}`, child: `sleeve-${s}`, a: v2(sx * b, sideY), b: P, rate: 1, sign: signs[2] as 1 | -1 },
      // the sleeve half's hinge on the collar fold, which opens outward
      { name: `shoulder-${s}`, parent: `sleeve-${s}`, child: 'body', a: v2(sx * b, top - b), b: P, rate: Math.SQRT2, sign: signs[3] as 1 | -1 },
    );
  }
  return { base: 'body', regions, creases, groups: { lift: 0, 'flap-left': 1, 'sleeve-left': 1, 'flap-right': 2, 'sleeve-right': 2 }, pace: 1.2 };
}

export function buildKimono(p: KimonoParams = DEFAULT_KIMONO): Construction {
  const g = kimonoGeometry(p);
  const { b, top } = g;
  const print = p.side === 'print';
  const collar = print ? 'the reverse colour' : 'the print';
  const ops: Op[] = [
    {
      kind: 'fold', id: 'half', title: print ? 'Fold in half, bottom edge behind' : 'Fold in half, bottom edge up',
      hint: (print
        ? 'Print side up. Crease the vertical centre line first. Fold the bottom edge up behind to meet the top edge: the fold is the hem.'
        : 'Print side up. Crease the vertical centre line first. Fold the bottom edge up to meet the top edge: the fold is the hem.')
        + ' The kimono shows ' + (print ? 'the print' : 'the reverse colour') + ', its collar ' + collar + '.',
      folds: [{ name: 'half', a: v2(-1.5, 0), b: v2(1.5, 0), moving: v2(0, -1), sense: print ? 'mountain' : 'valley' }],
    },
  ];
  if (print) ops.push({ kind: 'turn', id: 'turn-0', title: 'Turn over', hint: 'Turn it over from side to side. The open edges stay at the top.' });
  ops.push(
    {
      kind: 'fold', id: 'corners', title: 'Fold the lower corners up',
      hint: `Crease a line across the front layer ${cm(b)} below the top edge: the collar band. Fold both lower corners up, all layers, along 45 degree creases that start where that line meets each side edge, so the corner points touch the line.`,
      folds: [
        { name: 'corner-left', a: v2(-1, top), b: v2(-b, 0), moving: v2(-0.99, 0.01), sense: 'valley' },
        { name: 'corner-right', a: v2(b, 0), b: v2(1, top), moving: v2(0.99, 0.01), sense: 'valley' },
      ],
    },
    {
      kind: 'fold', id: 'band-front', title: 'Fold down the front band',
      hint: `Front layer only: fold the top edge down by ${cm(b)}, along the line you creased, over the corner points. This band becomes one side of the collar, in ${collar}.`,
      folds: [{ name: 'band-front', a: v2(1.5, top), b: v2(-1.5, top), moving: v2(0, 0.99), sense: 'valley', only: 'half' }],
    },
    { kind: 'turn', id: 'turn-1', title: 'Turn over', hint: 'Turn it over from side to side: the corner flaps are now behind, and the back layer is on top.' },
    {
      kind: 'fold', id: 'band-back', title: 'Fold down the back band',
      hint: `Fold the top edge down by ${cm(b)}, level with the band underneath: the same band on this layer, the other side of the collar.`,
      folds: [{ name: 'band-back', a: v2(1.5, top), b: v2(-1.5, top), moving: v2(0, 0.99), sense: 'valley' }],
    },
    {
      kind: 'fold', id: 'collar', title: 'Fold the top corners to the centre',
      hint: `All layers: fold each top corner down along a 45 degree crease from the middle of the top edge, so the banded top edge lies along the centre line. The two bands meet down the middle and hang ${cm(b)} past the bottom: the collar.`,
      folds: [
        { name: 'collar-left', a: v2(0, top), b: v2(-1, top - 1), moving: v2(-0.6, top - 0.02), sense: 'valley' },
        { name: 'collar-right', a: v2(1, top - 1), b: v2(0, top), moving: v2(0.6, top - 0.02), sense: 'valley' },
      ],
    },
    {
      kind: 'collapse', id: 'sleeves', title: 'Open and lift the sleeves',
      hint: `A squash behind the collar; in paper it is easiest with the model turned over. 1. Turn it over: the side triangles are on top. 2. Fold the bottom half up toward you along the line between the two side corners, leaving the collar strips flat on the table. 3. As it rises, open each side triangle and press it flat into the empty corner above, as a square sleeve. 4. Turn back over: the collar runs down the front in ${collar}.`,
      collapse: kimonoSquashSpec(p),
    },
  );
  return { name: print ? 'Kimono' : 'Kimono, reverse colour', ops, meta: { top, shoulderPoint: v2(-0.5, g.shoulderY), sleeveCutDir: v2(0, -1) } };
}

/** Where an accessory may sit on the finished kimono (model units): only the
 * waist, just under the sleeves, where the obi goes. */
export function kimonoAnchors(p: KimonoParams = DEFAULT_KIMONO) {
  const g = kimonoGeometry(p);
  return [{ id: 'waist' as const, label: 'Waist (obi)', x: 0, y: g.sideY - 0.08 }];
}

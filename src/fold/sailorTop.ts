import { Construction } from './construction';
import { v2 } from './geometry';

/** A sleeveless top whose large square collar is folded down at the back.
 *
 * The collar colour comes from real layer order, not a painted panel. The
 * first fold lays a deep band of the sheet onto the printed face. After the
 * turn and the side folds, that band is the lowest layer under the top of the
 * back, so folding the whole top down brings it out on top: a square of the
 * reverse across the back. Only a narrow strip of the band stays on the
 * front as a neckline. All folds are valley folds with explicit turn-overs.
 *
 * A final front fold of the shoulder corners (which showed the collar colour
 * over the shoulders) was tried and removed: at the neckline the stack is six
 * to eight layers deep, and turning that corner opened a sampled hinge gap of
 * 0.083 against the 0.044 limit. See docs/geometry-collection/drafts/NOTES.md.
 */
const BAND = 0.5; // first fold: the top half becomes the hidden collar band
const NECK = 0.1; // collar fold at the back; the finished neckline
const SIDE = 0.5; // upright side creases; the side flaps meet in a back seam
const HEM = -0.75;

export function buildSailorTop(): Construction {
  return {
    name: 'Sailor-collar top',
    meta: { top: NECK, shoulderPoint: v2(-SIDE, NECK), sleeveCutDir: v2(1, 0) },
    ops: [
      {
        kind: 'fold', id: 'sailor-band', title: 'Fold the top half down',
        hint: 'Bring the top edge down to the middle. This deep band will become the collar; most of it ends up at the back.',
        folds: [{ name: 'sailor-band', a: v2(-1.5, BAND), b: v2(1.5, BAND), moving: v2(0, 1.5), sense: 'valley' }],
      },
      { kind: 'turn', id: 'sailor-turn', title: 'Turn the paper over', hint: 'The band is underneath now. The back of the top is shaped on this side.' },
      {
        kind: 'fold', id: 'sailor-sides', title: 'Fold both sides to the centre',
        hint: 'Bring each side edge to the middle along the upright guides. The two flaps meet in a back seam.',
        folds: [
          { name: 'sailor-side-left', a: v2(-SIDE, 1.5), b: v2(-SIDE, -1.5), moving: v2(-1, 0), sense: 'valley' },
          { name: 'sailor-side-right', a: v2(SIDE, 1.5), b: v2(SIDE, -1.5), moving: v2(1, 0), sense: 'valley' },
        ],
      },
      {
        kind: 'fold', id: 'sailor-collar', title: 'Fold the collar down the back',
        hint: 'Bring the whole top down over the side flaps. The hidden band comes out on top as a square collar in the reverse colour.',
        folds: [{ name: 'sailor-collar', a: v2(-1.5, NECK), b: v2(1.5, NECK), moving: v2(0, 1.5), sense: 'valley' }],
      },
      {
        kind: 'fold', id: 'sailor-hem', title: 'Lift the lower edge to set the length',
        hint: 'Fold the bottom panel up onto the back. Nothing is cut; the extra paper sits under the collar.',
        folds: [{ name: 'sailor-hem', a: v2(-1.5, HEM), b: v2(1.5, HEM), moving: v2(0, -1.5), sense: 'valley' }],
      },
      { kind: 'turn', id: 'sailor-front', title: 'Turn over to the front', hint: 'The square collar is at the back; use Display > Back to see it. A narrow strip of the band finishes the neckline.' },
    ],
  };
}

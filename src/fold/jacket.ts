import { buildDress, Construction, DressParams, sideFolds, sleeveDrop, sleeveFolds } from './construction';
import type { Op } from './engine';
import { Affine2, MIRROR_X, Vec2, applyAffine, compose, norm, reflectionAcross, sub, v2 } from './geometry';
import { cm } from './measure';

export type JacketLength = 'cropped' | 'longer';
export const JACKET_LENGTHS: { id: JacketLength; name: string; hem: number; hint: string }[] = [
  { id: 'cropped', name: 'Cropped', hem: -0.32, hint: 'Bring a deep lower panel up for the original short, boxy jacket.' },
  { id: 'longer', name: 'Longer', hem: -0.6, hint: 'Turn up a shallower panel to leave a longer, relaxed jacket body.' },
];

export type CuffStyle = 'plain' | 'turned';
export const CUFF_STYLES: { id: CuffStyle; name: string; hint: string }[] = [
  { id: 'plain', name: 'Plain', hint: 'Finish with the sleeves as they are.' },
  { id: 'turned', name: 'Printed corners', hint: 'After the reveal, turn back a small corner of the top layer at each sleeve end. It shows the print; it is not a reverse-colour cuff band.' },
];
/** How far along the sleeve's raw end the turned-back corner reaches. Larger
 * values make the crease flatter; by about 0.11 it starts to catch the other
 * sleeve's collar layer, so the choice is a fixed authored corner, not a slider. */
const CUFF_REACH = 0.1;
/** The dress folds the jacket starts from: a deeper, broader body and flatter sleeves. */
const JACKET_DRESS: DressParams = { collar: 0.18, shoulder: 0.62, hem: 0.66, sleeveDroop: 55 };

/** Turned-back cuffs, worked on the front after the reveal.
 *
 * Each sleeve is two layers joined along its upper edge: the collar band on
 * top (reverse colour) and the side flap beneath it (printed side up). The
 * under-layer runs on beneath the body, so a straight cuff band across both
 * layers is trapped, and folding a band of the top layer alone would tear the
 * joined edge. The one clean flap is a corner of the top layer whose crease
 * starts exactly at the sleeve tip: turning it back shows its printed face and
 * uncovers the printed under-layer, so the sleeve end shows a printed corner.
 * It is named and described as a turned corner at the choice, not as a
 * reverse cuff band (Astra review of PR #11). */
function cuffOp(c: Construction): Op {
  const reflection = (i: number, j: number): Affine2 => {
    const op = c.ops[i];
    if (op.kind !== 'fold') throw new Error('jacket cuffs: unexpected construction');
    const f = op.folds[j];
    return reflectionAcross(f.a, norm(sub(f.b, f.a)));
  };
  const top = c.meta.top;
  // collar band -> turn -> right side flap -> right sleeve -> reveal turn:
  // the material to model transform of the collar-band layer on one sleeve.
  const M = [reflection(0, 0), MIRROR_X, reflection(2, 1), reflection(3, 1), MIRROR_X].reduce((acc, r) => compose(r, acc));
  const tip = applyAffine(M, v2(-1, top)); // collar crease meets the sheet edge
  const corner = applyAffine(M, v2(-1, 1)); // the sheet corner
  const reach = applyAffine(M, v2(-1 + CUFF_REACH, 1)); // along the top raw edge
  const mirror = (p: Vec2) => v2(-p.x, p.y);
  return {
    kind: 'fold', id: 'jacket-cuffs', title: 'Turn back the sleeve corners',
    // the turned-back triangle: its crease runs from the sleeve tip to the band's raw
    // edge, CUFF_REACH in from the sheet corner
    hint: `At each sleeve end, lift the top layer only (the collar band) and fold its loose corner back: crease from the sleeve's outermost point to the band's loose edge, ${cm(CUFF_REACH)} from the corner. The corner shows the print.`,
    folds: [
      { name: 'cuff-left', a: tip, b: reach, moving: corner, sense: 'valley', only: 'collar' },
      { name: 'cuff-right', a: mirror(tip), b: mirror(reach), moving: mirror(corner), sense: 'valley', only: 'collar' },
    ],
  };
}

/** A short, broad-sleeved study. The lower panel folds onto the back;
 * its material is retained rather than cutting or scaling a dress mesh. */
export function buildJacket(length: JacketLength = 'cropped', cuffs: CuffStyle = 'plain'): Construction {
  const hem = JACKET_LENGTHS.find(option => option.id === length)!.hem;
  const p = JACKET_DRESS;
  const c = buildDress({ ...p });
  const top = c.meta.top; // the collar fold, now the top edge
  const hemFold = (what: string) =>
    `Fold the bottom up onto the back along a crease ${cm(top - hem)} below the top edge, through all the layers. ${what}`;
  c.name = 'Box jacket';
  c.ops[1].hint = 'Turn it over from side to side, so the collar band is underneath along the top edge. The jacket is shaped from the back.';
  c.ops[2].hint = `${sideFolds(p)} These near-upright folds keep the body broad and boxy.`;
  c.ops[3].title = 'Fold the top corners out into sleeves';
  c.ops[3].hint = `${sleeveFolds(sleeveDrop(p))} The corners swing out into broad sleeves.`;
  c.ops[4] = {
    kind: 'fold', id: 'jacket-hem', title: 'Fold the body up short',
    hint: hemFold('This deep fold makes the cropped body.'),
    folds: [{ name: 'jacket-hem', a: v2(-1.5, hem), b: v2(1.5, hem), moving: v2(0, -1), sense: 'valley' }],
  };
  c.ops[5].title = 'Turn over to reveal the jacket';
  c.ops[5].hint = 'Turn it over from side to side to reveal the jacket: a broad collar band, a short body and open sleeves.';
  if (length === 'longer') {
    c.name = 'Longer box jacket';
    c.ops[4].title = 'Turn up a shallower hem';
    c.ops[4].hint = hemFold('This shallower fold leaves a longer body.');
    c.ops[5].hint = 'Turn it over from side to side to reveal the jacket: a broad collar band, a longer body and open sleeves.';
  }
  if (cuffs === 'turned') {
    c.ops[5].hint = 'Turn it over from side to side to reveal the jacket. One more small fold turns back a corner at each sleeve end.';
    c.ops.push(cuffOp(c));
    c.name = c.name.replace('box jacket', 'box jacket, turned sleeve corners').replace('Box jacket', 'Box jacket, turned sleeve corners');
  }
  return c;
}

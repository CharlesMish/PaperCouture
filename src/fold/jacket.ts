import { buildDress, Construction } from './construction';
import type { Op } from './engine';
import { Affine2, MIRROR_X, Vec2, applyAffine, compose, norm, reflectionAcross, sub, v2 } from './geometry';

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
    hint: 'Lift only the top layer at each sleeve end, hinged at the tip. Each corner shows the printed side: a turned corner, not a reverse cuff band.',
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
  const c = buildDress({ collar: 0.18, shoulder: 0.62, hem: 0.66, sleeveDroop: 55 });
  c.name = 'Box jacket';
  c.ops[1].hint = 'The collar is underneath. Work from the back to shape a short jacket.';
  c.ops[2].hint = 'These almost upright folds keep the body broad and box-shaped.';
  c.ops[3].title = 'Open the broad sleeves';
  c.ops[3].hint = 'Turn just the upper side flaps out. A short diagonal fold separates each sleeve from the body.';
  c.ops[4] = {
    kind: 'fold', id: 'jacket-hem', title: 'Shorten the body with a deep fold',
    hint: 'Bring the whole lower panel up onto the back. The square becomes a cropped jacket; no paper is cut away.',
    folds: [{ name: 'jacket-hem', a: v2(-1.5, hem), b: v2(1.5, hem), moving: v2(0, -1), sense: 'valley' }],
  };
  c.ops[5].title = 'Turn over to reveal the jacket';
  c.ops[5].hint = 'A broad collar, short body and open sleeves, folded from one square.';
  if (length === 'longer') {
    c.name = 'Longer box jacket';
    c.ops[4].title = 'Turn up a shallower hem';
    c.ops[4].hint = 'Fold the lower panel upward onto the back. More of the body stays long; all of the paper is retained.';
    c.ops[5].hint = 'A broad collar, longer body and open sleeves, folded from one square.';
  }
  if (cuffs === 'turned') {
    c.ops[5].hint = 'Reveal the jacket. One more small fold turns back a printed corner at each sleeve end.';
    c.ops.push(cuffOp(c));
    c.name = c.name.replace('box jacket', 'box jacket, turned sleeve corners').replace('Box jacket', 'Box jacket, turned sleeve corners');
  }
  return c;
}

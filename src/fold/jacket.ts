import { buildDress, Construction } from './construction';
import { v2 } from './geometry';

export type JacketLength = 'cropped' | 'longer';
export const JACKET_LENGTHS: { id: JacketLength; name: string; hem: number; hint: string }[] = [
  { id: 'cropped', name: 'Cropped', hem: -0.32, hint: 'Bring a deep lower panel up for the original short, boxy jacket.' },
  { id: 'longer', name: 'Longer', hem: -0.6, hint: 'Turn up a shallower panel to leave a longer, relaxed jacket body.' },
];

/** A short, broad-sleeved study. The lower panel folds onto the back;
 * its material is retained rather than cutting or scaling a dress mesh. */
export function buildJacket(length: JacketLength = 'cropped'): Construction {
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
  return c;
}

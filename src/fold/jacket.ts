import { buildDress, Construction } from './construction';
import { v2 } from './geometry';

/** A short, broad-sleeved study. The lower panel folds onto the back;
 * its material is retained rather than cutting or scaling a dress mesh. */
export function buildJacket(): Construction {
  const c = buildDress({ collar: 0.18, shoulder: 0.62, hem: 0.66, sleeveDroop: 55 });
  c.name = 'Box jacket';
  c.ops[1].hint = 'The collar is underneath. Work from the back to shape a short jacket.';
  c.ops[2].hint = 'These almost upright folds keep the body broad and box-shaped.';
  c.ops[3].title = 'Open the broad sleeves';
  c.ops[3].hint = 'Turn just the upper side flaps out. A short diagonal fold separates each sleeve from the body.';
  c.ops[4] = {
    kind: 'fold', id: 'jacket-hem', title: 'Shorten the body with a deep fold',
    hint: 'Bring the whole lower panel up onto the back. The square becomes a cropped jacket; no paper is cut away.',
    folds: [{ name: 'jacket-hem', a: v2(-1.5, -0.32), b: v2(1.5, -0.32), moving: v2(0, -1), sense: 'valley' }],
  };
  c.ops[5].title = 'Turn over to reveal the jacket';
  c.ops[5].hint = 'A broad collar, short body and open sleeves, folded from one square.';
  return c;
}

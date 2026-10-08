import { buildDress, type Construction } from '../../src/fold/construction';

/** Deliberately uses the established dress family: a deeper collar, narrow
 * straight body and dropped sleeves. Kept as a study until outfit curation. */
export function buildFunnelCoat(): Construction {
  const c = buildDress({ collar: .36, shoulder: .5, hem: .60, sleeveDroop: 72 });
  c.name = 'Funnel coat study';
  c.ops[0].title = 'Fold a deep standing-collar band';
  c.ops[0].hint = 'This deep folded band suggests a high collar. It is not an open neck or a three-dimensional tube.';
  c.ops[1].hint = 'The deep band is underneath. Shape the long, narrow coat from behind.';
  c.ops[2].hint = 'The long side folds leave a narrow body with only a little flare.';
  c.ops[3].title = 'Open the dropped sleeves';
  c.ops[3].hint = 'Fold the upper side flaps out on steep guides. The narrow sleeves lie close to the body.';
  c.ops[5].title = 'Reveal the long coat study';
  c.ops[5].hint = 'A narrow, high-collared silhouette from the dress fold family. No front opening or hollow interior.';
  return c;
}


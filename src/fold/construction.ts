// The Paper Couture A-line dress: an original simple construction written for this
// prototype. It uses only simple valley folds and turn-overs, so every step is a
// rigid rotation of paper about one crease. It is in the family of common
// "sides to the centre, corners out for sleeves" paper dresses, but the slanted
// side creases and exact proportions here are our own; no published model is
// claimed.
//
// Model coordinates: the sheet starts as [-1, 1]^2, pattern side up, y toward the
// far edge of the table (the top of the dress).

import { Op } from './engine';
import { Vec2, v2 } from './geometry';

export interface DressParams {
  /** Depth of the top band folded down for the collar (sheet is 2 units wide). */
  collar: number;
  /** Half-width of the bodice at the neckline. 0.5 makes the side flaps meet at the centre. */
  shoulder: number;
  /** Half-width at the hem. Larger than `shoulder` gives the A-line flare. */
  hem: number;
  /** How far the sleeves droop below horizontal, in degrees. */
  sleeveDroop: number;
}

export const DEFAULT_DRESS: DressParams = {
  collar: 0.2,
  shoulder: 0.5,
  hem: 0.82,
  sleeveDroop: 45,
};

export interface Construction {
  name: string;
  ops: Op[];
  /** Guide geometry for tests/diagnostics. */
  meta: { top: number; shoulderPoint: Vec2; sleeveCutDir: Vec2 };
}

export function buildDress(p: DressParams = DEFAULT_DRESS): Construction {
  const top = 1 - p.collar; // model y of the collar fold edge
  const bottom = -1;
  const P = v2(-p.shoulder, top); // left shoulder point: where the side crease meets the top edge
  const H = v2(-p.hem, bottom);

  // Side crease slant from vertical.
  const phi = Math.atan2(p.hem - p.shoulder, top - bottom);
  // The flap's top edge leaves P at 2φ below horizontal (it is the reflection of the
  // horizontal collar edge across the slanted crease). Reflecting it once more across
  // the sleeve crease must point it (180° - droop) around, so:
  const alpha = Math.PI / 2 - (p.sleeveDroop * Math.PI) / 360 + phi; // below horizontal, inward
  const cutDir = v2(Math.cos(alpha), -Math.sin(alpha));

  const mirror = (q: Vec2) => v2(-q.x, q.y);

  const ops: Op[] = [
    {
      kind: 'fold',
      id: 'collar',
      title: 'Fold the top edge down',
      hint: 'This band becomes the collar. The reverse colour shows where the paper turns over.',
      folds: [{ name: 'collar', a: v2(-1.5, top), b: v2(1.5, top), moving: v2(0, 1), sense: 'valley' }],
    },
    {
      kind: 'turn',
      id: 'turn-1',
      title: 'Turn the paper over',
      hint: 'The collar is now underneath. We shape the dress from the back.',
    },
    {
      kind: 'fold',
      id: 'sides',
      title: 'Fold both sides in along the guides',
      hint: 'The creases slant outward toward the hem, which gives the skirt its A-line.',
      folds: [
        { name: 'side-left', a: P, b: H, moving: v2(-1, 0), sense: 'valley' },
        { name: 'side-right', a: mirror(P), b: mirror(H), moving: v2(1, 0), sense: 'valley' },
      ],
    },
    {
      kind: 'fold',
      id: 'sleeves',
      title: 'Fold the top corners out into sleeves',
      hint: 'Only the side flaps move. Their tips swing past the shoulders.',
      folds: [
        {
          name: 'sleeve-left',
          a: P,
          b: v2(P.x + cutDir.x, P.y + cutDir.y),
          moving: v2(0, top),
          sense: 'valley',
          only: 'side-left',
        },
        {
          name: 'sleeve-right',
          a: mirror(P),
          b: v2(-(P.x + cutDir.x), P.y + cutDir.y),
          moving: v2(0, top),
          sense: 'valley',
          only: 'side-right',
        },
      ],
    },
    {
      kind: 'fold',
      id: 'hem',
      title: 'Fold the hem points up',
      hint: 'The slanted creases leave two small points below the hem. Fold them onto the back.',
      folds: [{ name: 'hem-points', a: v2(-1.5, bottom), b: v2(1.5, bottom), moving: v2(0, -2), sense: 'valley' }],
    },
    {
      kind: 'turn',
      id: 'turn-2',
      title: 'Turn over to reveal the dress',
      hint: 'Collar, sleeves and hem: all one square, uncut.',
    },
  ];

  return { name: 'A-line dress', ops, meta: { top, shoulderPoint: P, sleeveCutDir: cutDir } };
}

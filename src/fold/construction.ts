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
import { Vec2, v2, applyAffine, reflectionAcross, sub } from './geometry';
import { cm, lineMeet } from './measure';

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

/** Where the side folds run, for the instructions (every skirt shape). */
export const sideFolds = (p: DressParams) =>
  `Fold each side in along a slanting crease: from the top edge ${cm(1 - p.shoulder)} in from the side, to the bottom edge ${cm(1 - p.hem)} in from the side. Fold all the layers.`;
/**
 * How far below the top edge the sleeve crease leaves the side flap, on the flap's
 * inner edge (the sheet's side edge, folded in): a landmark for the instructions,
 * from the same numbers that place the creases.
 */
export function sleeveDrop(p: DressParams): number {
  const top = 1 - p.collar, P = v2(-p.shoulder, top), H = v2(-p.hem, -1);
  const phi = Math.atan2(p.hem - p.shoulder, top + 1);
  const alpha = Math.PI / 2 - (p.sleeveDroop * Math.PI) / 360 + phi;
  const across = reflectionAcross(P, sub(H, P));
  const inner = [applyAffine(across, v2(-1, top)), applyAffine(across, v2(-1, -1))];
  return top - lineMeet(P, v2(Math.cos(alpha), -Math.sin(alpha)), inner[0], sub(inner[1], inner[0])).y;
}
/** Where the sleeve folds run (every sleeve angle): `drop` is how far below the top edge the crease leaves the flap. */
export const sleeveFolds = (drop: number) =>
  `On each side flap only, fold the top corner back out: crease from the top of the side fold down to the flap's inner edge, ${cm(drop)} below the top.`;

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
      hint: `Print side up. Fold the top edge down onto the print by ${cm(p.collar)}, all the way across. This band becomes the collar, in the paper's other colour.`,
      folds: [{ name: 'collar', a: v2(-1.5, top), b: v2(1.5, top), moving: v2(0, 1), sense: 'valley' }],
    },
    {
      kind: 'turn',
      id: 'turn-1',
      title: 'Turn the paper over',
      hint: 'Turn it over from side to side, so the collar band is underneath along the top edge. The dress is shaped from the back.',
    },
    {
      kind: 'fold',
      id: 'sides',
      title: 'Fold both sides in',
      hint: `${sideFolds(p)} The slant gives the skirt its A-line.`,
      folds: [
        { name: 'side-left', a: P, b: H, moving: v2(-1, 0), sense: 'valley' },
        { name: 'side-right', a: mirror(P), b: mirror(H), moving: v2(1, 0), sense: 'valley' },
      ],
    },
    {
      kind: 'fold',
      id: 'sleeves',
      title: 'Fold the top corners out into sleeves',
      hint: `${sleeveFolds(sleeveDrop(p))} Their corners swing out past the shoulders.`,
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
      hint: 'The slanting side folds leave a small point sticking out below the bottom edge on each side. Fold both points up along the bottom edge, onto the back.',
      folds: [{ name: 'hem-points', a: v2(-1.5, bottom), b: v2(1.5, bottom), moving: v2(0, -2), sense: 'valley' }],
    },
    {
      kind: 'turn',
      id: 'turn-2',
      title: 'Turn over to reveal the dress',
      hint: 'Turn it over from side to side: the collar, sleeves and hem all come from one uncut square.',
    },
  ];

  return { name: 'A-line dress', ops, meta: { top, shoulderPoint: P, sleeveCutDir: cutDir } };
}

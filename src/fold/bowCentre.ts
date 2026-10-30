import { Construction } from './construction';
import { v2 } from './geometry';
import { cm } from './measure';

/** A separate third square for the modular bow: a folded rectangular centre.
 * Assembly is decorative placement, not a claim of a self-locking joint. */
export function buildBowCentre(): Construction {
  // each end creases this far in from its edge of the band, so the two ends overlap across the middle
  const end = 0.36, endFold = 1 - end;
  return {
    name: 'Bow · folded centre',
    meta: { top: 0.5, shoulderPoint: v2(0, 0.5), sleeveCutDir: v2(1, 0) },
    ops: [
      {
        kind: 'turn', id: 'centre-turn', title: 'Put the print underneath',
        hint: 'Take a third square, a little smaller than the wing squares. Start print side up and turn it over from side to side, so the other colour faces up.',
      },
      {
        kind: 'fold', id: 'centre-bands', title: 'Fold the top and bottom edges to the middle',
        hint: 'Fold the top edge down to the centre line and the bottom edge up to meet it. The paper is now a band half as tall, with the print on the flaps.',
        folds: [
          { name: 'centre-top', a: v2(-1.5, 0.5), b: v2(1.5, 0.5), moving: v2(0, 1), sense: 'valley' },
          { name: 'centre-bottom', a: v2(-1.5, -0.5), b: v2(1.5, -0.5), moving: v2(0, -1), sense: 'valley' },
        ],
      },
      {
        kind: 'fold', id: 'centre-left', title: 'Fold the left end across',
        hint: `Fold the left end over to the right along an upright crease ${cm(endFold)} in from the left edge, all the layers. Its edge passes a little beyond the centre line.`,
        folds: [{ name: 'centre-left', a: v2(-end, -1.5), b: v2(-end, 1.5), moving: v2(-1, 0), sense: 'valley' }],
      },
      {
        kind: 'fold', id: 'centre-right', title: 'Fold the right end over it',
        hint: `Fold the right end over to the left the same way, along an upright crease ${cm(endFold)} in from the right edge, all the layers. The two ends overlap across the middle of a small rectangle.`,
        folds: [{ name: 'centre-right', a: v2(end, -1.5), b: v2(end, 1.5), moving: v2(1, 0), sense: 'valley' }],
      },
      {
        kind: 'turn', id: 'centre-reveal', title: 'Reveal the folded centre',
        hint: 'Turn it over from side to side: a printed rectangle with the folded ends behind. Place it over the point where the two wings meet.',
      },
    ],
  };
}

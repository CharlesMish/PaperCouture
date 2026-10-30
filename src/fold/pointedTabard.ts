import type { Construction } from './construction';
import type { Op } from './engine';
import { v2 } from './geometry';
import { cm } from './measure';

type Point = [number, number];
const fold = (id: string, title: string, hint: string, a: Point, b: Point, moving: Point): Op => ({
  kind: 'fold', id, title, hint,
  folds: [{ name: id, a: v2(...a), b: v2(...b), moving: v2(...moving), sense: 'valley' }],
});

// Crease positions, shared by the folds and their instructions: the top band (y),
// the side folds (|x|) and where the hem creases leave the sides (y).
const BAND = .78, SIDE = .58, HEM_SIDE = -.60;

/** A long, shield-shaped garment study from one intact square. The apparent
 * neckband is a folded edge, not a neck opening. No ties or paper lock. */
export function buildPointedTabard(): Construction {
  return { name: 'Pointed tabard', meta: { top: BAND, shoulderPoint: v2(0, BAND), sleeveCutDir: v2(1, 0) }, ops: [
    fold('tabard-band', 'Turn down the upper band', `Print side up. Fold the top edge down onto the print by ${cm(1 - BAND)}, all the way across. This band becomes the neckband, in the other colour.`, [-1.5, BAND], [1.5, BAND], [0, 1]),
    { kind: 'turn', id: 'tabard-back', title: 'Turn the sheet over', hint: 'Turn it over from side to side, so the band is underneath along the top edge.' },
    fold('tabard-left', 'Narrow the first side', `Fold the left side in along a straight crease ${cm(1 - SIDE)} from the left edge, top to bottom. Fold all the layers.`, [-SIDE, -1.5], [-SIDE, 1.5], [-1, 0]),
    fold('tabard-right', 'Narrow the other side', `Fold the right side in along a straight crease ${cm(1 - SIDE)} from the right edge, all the layers. It overlaps the left flap.`, [SIDE, -1.5], [SIDE, 1.5], [1, 0]),
    fold('tabard-hem-left', 'Shape the first hem corner', `Fold the bottom left corner up onto the paper along a crease from the middle of the bottom edge to the left side ${cm(HEM_SIDE + 1)} above the bottom. Fold all the layers.`, [-SIDE, HEM_SIDE], [0, -1], [-SIDE, -1]),
    fold('tabard-hem-right', 'Shape the other hem corner', `Fold the bottom right corner up the same way, from the middle of the bottom edge to the right side ${cm(HEM_SIDE + 1)} above the bottom. The two creases meet in a point at the hem.`, [SIDE, HEM_SIDE], [0, -1], [SIDE, -1]),
    { kind: 'turn', id: 'tabard-front', title: 'Reveal the pointed tabard', hint: 'Turn it over from side to side: a long printed body with the band across the top and a pointed hem.' },
  ] };
}

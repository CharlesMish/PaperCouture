import { Construction } from './construction';
import { v2 } from './geometry';
import { cm } from './measure';

/** Four corner folds form a small diamond pin. Attachment is a styling step,
 * not an asserted paper lock between the two independent sheets. */
export function buildPin(): Construction {
  const corner = (id: string, title: string, hint: string, a: [number, number], b: [number, number], moving: [number, number]) => ({
    kind: 'fold' as const, id, title, hint,
    folds: [{ name: id, a: v2(...a), b: v2(...b), moving: v2(...moving), sense: 'valley' as const }],
  });
  return {
    name: 'Diamond pin',
    meta: { top: 1, shoulderPoint: v2(0, 1), sleeveCutDir: v2(1, 0) },
    ops: [
      { kind: 'turn', id: 'pin-turn', title: 'Put the print underneath', hint: 'Start print side up and turn it over from side to side, so the other colour faces up. Each corner fold brings the print back into view.' },
      // the corners fold to the centre: each crease joins the middles of two edges, half the side from the corner
      corner('pin-ne', 'Fold the top right corner to the centre',
        `Fold the top right corner onto the centre of the square: crease from the middle of the top edge to the middle of the right edge, ${cm(1)} from the corner on each. The flap shows the print.`,
        [0, 1], [1, 0], [1, 1]),
      corner('pin-nw', 'Fold the top left corner to the centre',
        'Fold the top left corner onto the centre the same way: crease from the middle of the left edge to the middle of the top edge. Its point meets the first one.',
        [-1, 0], [0, 1], [-1, 1]),
      corner('pin-sw', 'Fold the bottom left corner to the centre',
        'Fold the bottom left corner onto the centre: crease from the middle of the bottom edge to the middle of the left edge.',
        [0, -1], [-1, 0], [-1, -1]),
      corner('pin-se', 'Fold the last corner to the centre',
        'Fold the bottom right corner onto the centre: crease from the middle of the right edge to the middle of the bottom edge. The four printed flaps meet in the middle of a small square standing on its point: the diamond pin.',
        [1, 0], [0, -1], [1, -1]),
    ],
  };
}

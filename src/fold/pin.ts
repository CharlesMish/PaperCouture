import { Construction } from './construction';
import { v2 } from './geometry';

/** Four corner folds form a small diamond pin. Attachment is a styling step,
 * not an asserted paper lock between the two independent sheets. */
export function buildPin(): Construction {
  const corner = (id: string, title: string, a: [number, number], b: [number, number], moving: [number, number]) => ({
    kind: 'fold' as const, id, title,
    hint: 'Bring this corner to the centre. The print returns as one face of the pin.',
    folds: [{ name: id, a: v2(...a), b: v2(...b), moving: v2(...moving), sense: 'valley' as const }],
  });
  return {
    name: 'Diamond pin',
    meta: { top: 1, shoulderPoint: v2(0, 1), sleeveCutDir: v2(1, 0) },
    ops: [
      { kind: 'turn', id: 'pin-turn', title: 'Put the print underneath', hint: 'Start with the reverse facing up. Each corner fold will bring the print back into view.' },
      corner('pin-ne', 'Fold the upper-right corner in', [0, 1], [1, 0], [1, 1]),
      corner('pin-nw', 'Fold the upper-left corner in', [-1, 0], [0, 1], [-1, 1]),
      corner('pin-sw', 'Fold the lower-left corner in', [0, -1], [-1, 0], [-1, -1]),
      corner('pin-se', 'Close the final corner', [1, 0], [0, -1], [1, -1]),
    ],
  };
}

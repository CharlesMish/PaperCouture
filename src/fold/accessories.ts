import type { AttachmentAnchor, AttachmentPosition } from './garments';
import type { Construction } from './construction';
import { buildPin } from './pin';
import { buildBowWing } from './bow';
import { buildNeckerchief, NECKERCHIEF_POSITIONS, NECKERCHIEF_SCALE } from './neckerchief';
import { buildPocketSquare, POCKET_POSITIONS, POCKET_SCALE } from './pocketSquare';

export type AccessoryId = 'pin' | 'bow' | 'kerchief' | 'pocket';

/** One placed component of an accessory, in the accessory group's units. */
export interface AccessoryPiece { angle: number; offset: number; scale: number }

/** Registry of separately folded accessories. The pin and bow values are the
 * ones main.ts and check-attachments.ts already used; the draft neckerchief
 * and folded patch pocket add a restricted list of garment positions. */
export const ACCESSORIES: {
  id: AccessoryId; name: string; build(): Construction; pieces: AccessoryPiece[];
  positions?: readonly AttachmentPosition[];
}[] = [
  { id: 'pin', name: 'Diamond pin', build: buildPin, pieces: [{ angle: 0, offset: 0, scale: 0.16 }] },
  { id: 'bow', name: 'Two-piece bow', build: buildBowWing, pieces: [
    { angle: -Math.PI / 4, offset: -1.27, scale: 0.19 }, { angle: 3 * Math.PI / 4, offset: 1.27, scale: 0.19 },
  ] },
  { id: 'kerchief', name: 'Neckerchief', build: buildNeckerchief, pieces: [{ angle: 0, offset: 0, scale: NECKERCHIEF_SCALE }], positions: NECKERCHIEF_POSITIONS },
  { id: 'pocket', name: 'Folded patch pocket', build: buildPocketSquare, pieces: [{ angle: 0, offset: 0, scale: POCKET_SCALE }], positions: POCKET_POSITIONS },
];
export function findAccessory(id: AccessoryId) { return ACCESSORIES.find(a => a.id === id)!; }
/** The garment positions an accessory may use. Empty means it cannot be placed. */
export function accessoryAnchors(id: AccessoryId, anchors: AttachmentAnchor[]): AttachmentAnchor[] {
  const allowed = findAccessory(id).positions;
  return allowed ? anchors.filter(a => allowed.includes(a.id)) : anchors;
}

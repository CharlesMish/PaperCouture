import type { AttachmentAnchor, AttachmentPosition } from './garments';
import type { Construction } from './construction';
import { buildPin } from './pin';
import { buildBowWing } from './bow';
import { buildNeckerchief, NECKERCHIEF_POSITIONS, NECKERCHIEF_SCALE } from './neckerchief';
import { buildPocketSquare, POCKET_POSITIONS, POCKET_SCALE } from './pocketSquare';
import { buildTulip, TULIP_LIFT, TULIP_POSITIONS, TULIP_SCALE } from './tulip';
import { buildFoldedSash, SASH_POSITIONS, SASH_SCALE, SASH_LIFT } from './foldedSash';
import { buildObi, OBI_POSITIONS, OBI_SCALE } from './obi';

export type AccessoryId = 'pin' | 'bow' | 'kerchief' | 'pocket' | 'tulip' | 'sash' | 'obi';

/** One placed component of an accessory, in the accessory group's units. */
/** angle and offset/lift (x/y, in the piece's own units, after turning) place
 * the folded piece relative to the anchor. */
export interface AccessoryPiece { angle: number; offset: number; scale: number; lift?: number }

/** Registry of separately folded accessories. The pin and bow values are the
 * ones main.ts and check-attachments.ts already used; the draft neckerchief
 * and folded patch pocket add a restricted list of garment positions. */
export const ACCESSORIES: {
  id: AccessoryId; name: string; build(): Construction; pieces: AccessoryPiece[];
  positions?: readonly AttachmentPosition[];
  experiment?: string;
}[] = [
  { id: 'pin', name: 'Diamond pin', build: buildPin, pieces: [{ angle: 0, offset: 0, scale: 0.16 }] },
  { id: 'bow', name: 'Two-piece bow', build: buildBowWing, pieces: [
    { angle: -Math.PI / 4, offset: -1.27, scale: 0.19 }, { angle: 3 * Math.PI / 4, offset: 1.27, scale: 0.19 },
  ] },
  { id: 'kerchief', name: 'Neckerchief', build: buildNeckerchief, pieces: [{ angle: 0, offset: 0, scale: NECKERCHIEF_SCALE }], positions: NECKERCHIEF_POSITIONS,
    // what a step once said about its placement, kept as the piece's note
    experiment: 'Separate square · placed at the neckline; not knotted or fastened on' },
  { id: 'pocket', name: 'Folded patch pocket', build: buildPocketSquare, pieces: [{ angle: 0, offset: 0, scale: POCKET_SCALE }], positions: POCKET_POSITIONS,
    experiment: 'Separate square · placed flat on the chest; nothing is tucked into the garment' },
  // Draft (PR #13): a folded tulip at the waist anchors, stood upright and
  // lowered so the flower (not its base point) is centred on the anchor.
  { id: 'tulip', name: 'Folded tulip', build: buildTulip, pieces: [{ angle: -3 * Math.PI / 4, offset: 0, scale: TULIP_SCALE, lift: TULIP_LIFT }], positions: TULIP_POSITIONS },
  { id: 'sash', name: 'Folded sash', build: buildFoldedSash, pieces: [{ angle: 0, offset: 0, scale: SASH_SCALE, lift: SASH_LIFT }], positions: SASH_POSITIONS,
    experiment: 'Separate square · placed at the waist, no tie or lock' },
  { id: 'obi', name: 'Obi', build: buildObi, pieces: [{ angle: 0, offset: 0, scale: OBI_SCALE }], positions: OBI_POSITIONS,
    experiment: 'Separate small square · a band with a cord across it, placed at the waist; not tied, no bow behind' },
];
export function findAccessory(id: AccessoryId) { return ACCESSORIES.find(a => a.id === id)!; }
/** The garment positions an accessory may use. Empty means it cannot be placed. */
export function accessoryAnchors(id: AccessoryId, anchors: AttachmentAnchor[]): AttachmentAnchor[] {
  const allowed = findAccessory(id).positions;
  return allowed ? anchors.filter(a => allowed.includes(a.id)) : anchors;
}

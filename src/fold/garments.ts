import { buildSilhouette, SilhouetteId } from './silhouettes';
import { buildJacket } from './jacket';
import { buildWrapSkirt } from './wrapSkirt';
import { buildLapelVest } from './lapelVest';

export type GarmentId = 'dress' | 'jacket' | 'skirt' | 'vest';
export type AttachmentPosition = 'neckline' | 'chest-left' | 'chest-right' | 'waist-left' | 'waist' | 'waist-right';
export interface AttachmentAnchor { id: AttachmentPosition; label: string; x: number; y: number }
export const GARMENTS: { id: GarmentId; name: string }[] = [
  { id: 'dress', name: 'Dress' }, { id: 'jacket', name: 'Box jacket' },
  { id: 'skirt', name: 'Wrap skirt' }, { id: 'vest', name: 'Lapel vest' },
];
export function garmentIdFrom(value: string | null): GarmentId {
  return GARMENTS.find(g => g.id === value)?.id ?? 'dress';
}
export function buildGarment(id: GarmentId, silhouette: SilhouetteId) {
  switch (id) {
    case 'jacket': return buildJacket();
    case 'skirt': return buildWrapSkirt();
    case 'vest': return buildLapelVest();
    default: return buildSilhouette(silhouette);
  }
}
/** Garment-specific points in the resting model, rather than generic body labels.
 * The skirt's waistband is asymmetric, and the vest has two narrow front panels. */
export function attachmentAnchors(id: GarmentId, top: number, bottom: number): AttachmentAnchor[] {
  if (id === 'skirt') return [
    { id: 'waist-left', label: 'Left waistband', x: -0.15, y: 0.57 },
    { id: 'waist', label: 'Centre waistband', x: 0.13, y: 0.57 },
    { id: 'waist-right', label: 'Right waistband', x: 0.40, y: 0.57 },
  ];
  if (id === 'vest') return [
    { id: 'neckline', label: 'Centre clasp', x: 0, y: 0.50 },
    { id: 'chest-left', label: 'Left lapel', x: -0.26, y: 0.78 },
    { id: 'chest-right', label: 'Right lapel', x: 0.26, y: 0.78 },
    { id: 'waist-left', label: 'Left panel', x: -0.29, y: 0.05 },
    { id: 'waist-right', label: 'Right panel', x: 0.29, y: 0.05 },
  ];
  return [
    { id: 'neckline', label: 'Neckline', x: 0, y: top - 0.17 },
    { id: 'chest-left', label: 'Left chest', x: -0.25, y: top - 0.42 },
    { id: 'chest-right', label: 'Right chest', x: 0.25, y: top - 0.42 },
    { id: 'waist-left', label: 'Left waist', x: -0.25, y: bottom + (top - bottom) * 0.4 },
    { id: 'waist', label: 'Centre waist', x: 0, y: bottom + (top - bottom) * 0.4 },
    { id: 'waist-right', label: 'Right waist', x: 0.25, y: bottom + (top - bottom) * 0.4 },
  ];
}
export function attachmentSize(id: GarmentId): number {
  return id === 'skirt' || id === 'vest' ? 0.75 : 1;
}

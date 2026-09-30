import { buildSilhouette, SilhouetteId } from './silhouettes';
import { buildJacket } from './jacket';
import { buildWrapSkirt } from './wrapSkirt';
import { buildLapelVest } from './lapelVest';
import { buildPleatedSkirt } from './pleatedSkirt';
import { buildSailorTop } from './sailorTop';
import { DEFAULT_OPTIONS, GarmentOptions } from './garmentOptions';

export type GarmentId = 'dress' | 'jacket' | 'skirt' | 'vest' | 'pleats' | 'sailor';
export type AttachmentPosition = 'neckline' | 'chest-left' | 'chest-right' | 'waist-left' | 'waist' | 'waist-right';
export interface AttachmentAnchor { id: AttachmentPosition; label: string; x: number; y: number }
export const GARMENTS: { id: GarmentId; name: string }[] = [
  { id: 'dress', name: 'Dress' }, { id: 'jacket', name: 'Box jacket' },
  { id: 'skirt', name: 'Wrap skirt' }, { id: 'vest', name: 'Lapel vest' },
  { id: 'pleats', name: 'Pleated skirt' },
  { id: 'sailor', name: 'Sailor-collar top' },
];
export function garmentIdFrom(value: string | null): GarmentId {
  return GARMENTS.find(g => g.id === value)?.id ?? 'dress';
}
export function buildGarment(id: GarmentId, selection: SilhouetteId | GarmentOptions = DEFAULT_OPTIONS) {
  const options = typeof selection === 'string' ? { ...DEFAULT_OPTIONS, silhouette: selection } : selection;
  switch (id) {
    case 'jacket': return buildJacket(options.jacketLength, options.cuffs);
    case 'skirt': return buildWrapSkirt({ wrap: options.wrap, band: options.band });
    case 'vest': return buildLapelVest(options.vestLength);
    case 'pleats': return buildPleatedSkirt(options.pleatDepth);
    case 'sailor': return buildSailorTop();
    default: return buildSilhouette(options.silhouette, options.sleeves);
  }
}
/** Garment-specific points in the resting model, rather than generic body labels.
 * The skirt's waistband is asymmetric, and the vest has two narrow front panels. */
export function attachmentAnchors(id: GarmentId, top: number, bottom: number, options: GarmentOptions = DEFAULT_OPTIONS): AttachmentAnchor[] {
  if (id === 'skirt') return [
    { id: 'waist-left', label: 'Left waistband', x: -0.10, y: 0.57 },
    { id: 'waist', label: 'Centre waistband', x: 0.13, y: 0.57 },
    { id: 'waist-right', label: 'Right waistband', x: 0.35, y: 0.57 },
  ].map(a => ({ ...a, id: a.id as AttachmentPosition, x: options.wrap === 'opposite' ? -a.x : a.x, y: a.y + top - .72 }))
    .sort((a, b) => a.x - b.x).map((a, i) => ({ ...a, id: (['waist-left', 'waist', 'waist-right'] as const)[i], label: ['Left waistband', 'Centre waistband', 'Right waistband'][i] }));
  if (id === 'vest') return [
    { id: 'neckline', label: 'Centre clasp', x: 0, y: 0.50 },
    { id: 'chest-left', label: 'Left lapel', x: -0.22, y: 0.76 },
    { id: 'chest-right', label: 'Right lapel', x: 0.22, y: 0.76 },
    { id: 'waist-left', label: 'Left panel', x: -0.29, y: options.vestLength === 'longline' ? -.14 : .05 },
    { id: 'waist-right', label: 'Right panel', x: 0.29, y: options.vestLength === 'longline' ? -.14 : .05 },
  ];
  if (id === 'pleats') return [
    { id: 'waist-left', label: 'Left waistband', x: -.34, y: .635 },
    { id: 'waist', label: 'Centre waistband', x: 0, y: .635 },
    { id: 'waist-right', label: 'Right waistband', x: .34, y: .635 },
  ];
  // Draft sailor top: anchors sit below the neckline strip on the flat front.
  if (id === 'sailor') return [
    { id: 'neckline', label: 'Neckline', x: 0, y: -0.06 },
    { id: 'chest-left', label: 'Left chest', x: -0.22, y: -0.3 },
    { id: 'chest-right', label: 'Right chest', x: 0.22, y: -0.3 },
    { id: 'waist-left', label: 'Left waist', x: -0.22, y: -0.56 },
    { id: 'waist', label: 'Centre waist', x: 0, y: -0.56 },
    { id: 'waist-right', label: 'Right waist', x: 0.22, y: -0.56 },
  ];
  return [
    { id: 'neckline', label: 'Neckline', x: 0, y: top - 0.18 },
    { id: 'chest-left', label: 'Left chest', x: -0.25, y: top - 0.42 },
    { id: 'chest-right', label: 'Right chest', x: 0.25, y: top - 0.42 },
    { id: 'waist-left', label: 'Left waist', x: -0.25, y: bottom + (top - bottom) * 0.4 },
    { id: 'waist', label: 'Centre waist', x: 0, y: bottom + (top - bottom) * 0.4 },
    { id: 'waist-right', label: 'Right waist', x: 0.25, y: bottom + (top - bottom) * 0.4 },
  ];
}
export function attachmentSize(id: GarmentId): number {
  return id === 'skirt' || id === 'vest' || id === 'pleats' || id === 'sailor' ? 0.75 : 1;
}

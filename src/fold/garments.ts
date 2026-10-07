import { buildSilhouette, SilhouetteId } from './silhouettes';
import { buildJacket } from './jacket';
import { buildWrapSkirt } from './wrapSkirt';
import { buildLapelVest } from './lapelVest';
import { buildPleatedSkirt } from './pleatedSkirt';
import { DEFAULT_OPTIONS, GarmentOptions } from './garmentOptions';
import { buildApron, buildClutch } from './experimental';
import { oneShoulder } from './oneShoulder';
import { buildPointedTabard } from './pointedTabard';
import { buildBoatNeckTop, buildCrossWrapTop, buildFoldedHat } from './outfitCollection';
import { buildOpenFrontCapelet, buildAnkleBoot } from './companionFolds';
import { buildFramedBrooch } from './framedBrooch';
import { buildNecktie } from './necktie';
import { buildCampShirt } from './campShirt';

export type GarmentId = 'dress' | 'jacket' | 'skirt' | 'vest' | 'pleats' | 'apron' | 'clutch' | 'tunic' | 'tabard' | 'boat-top' | 'wrap-top' | 'hat' | 'capelet' | 'boot-left' | 'boot-right' | 'framed-brooch' | 'necktie' | 'camp-shirt';
export type AttachmentPosition = 'neckline' | 'chest-left' | 'chest-right' | 'waist-left' | 'waist' | 'waist-right';
export interface AttachmentAnchor { id: AttachmentPosition; label: string; x: number; y: number }
export const GARMENTS: { id: GarmentId; name: string; experiment?: string }[] = [
  { id: 'dress', name: 'Dress' }, { id: 'jacket', name: 'Box jacket' },
  { id: 'skirt', name: 'Wrap skirt' }, { id: 'vest', name: 'Lapel vest' },
  { id: 'pleats', name: 'Pleated skirt' },
  { id: 'clutch', name: 'Envelope clutch', experiment: 'One square · flat envelope, no locking closure' },
  { id: 'apron', name: 'Bib apron', experiment: 'One square · apron silhouette without ties' },
  { id: 'tunic', name: 'One-shoulder tunic', experiment: 'One square · asymmetric silhouette, no cut neckline' },
  { id: 'tabard', name: 'Pointed tabard', experiment: 'One square · pointed silhouette, no neck opening or ties' },
  { id: 'boat-top', name: 'Boat-neck top', experiment: 'One square · short top silhouette, no neck opening or armholes' },
  { id: 'wrap-top', name: 'Cross-wrap top', experiment: 'One square · crossed panels on continuous backing, no locking closure' },
  { id: 'hat', name: 'Folded hat', experiment: 'One square · separate flat crown and brim silhouette, not an opened wearable hat' },
  { id: 'camp-shirt', name: 'Camp-collar shirt', experiment: 'One square · folded collar and cuffs on a flat shirt, no neck opening or locking tuck' },
  { id: 'necktie', name: 'Folded necktie', experiment: 'Small intact square · flat tie with a folded knot pleat; no neck loop and nothing is tied' },
  { id: 'capelet', name: 'Open-front capelet', experiment: 'One square · separate front panels over continuous lining, no through-opening or fastening' },
  { id: 'boot-left', name: 'Ankle boot · toe left', experiment: 'One square · flat boot silhouette; pin the other direction separately for a pair' },
  { id: 'boot-right', name: 'Ankle boot · toe right', experiment: 'One square · flat boot silhouette; pin the other direction separately for a pair' },
  { id: 'framed-brooch', name: 'Framed brooch', experiment: 'Small intact square · printed centre and folded border, no opening or fastening' },
];
export function garmentExperiment(id: GarmentId) { return GARMENTS.find(g => g.id === id)?.experiment; }
export function garmentDisplayAngle(id: GarmentId) { return id === 'clutch' ? -Math.PI / 4 : id === 'necktie' ? Math.PI / 4 : 0; }
export function garmentIdFrom(value: string | null): GarmentId {
  return GARMENTS.find(g => g.id === value)?.id ?? 'dress';
}
export function buildGarment(id: GarmentId, selection: SilhouetteId | GarmentOptions = DEFAULT_OPTIONS) {
  const options = typeof selection === 'string' ? { ...DEFAULT_OPTIONS, silhouette: selection } : selection;
  switch (id) {
    case 'camp-shirt': return buildCampShirt();
    case 'necktie': return buildNecktie();
    case 'capelet': return buildOpenFrontCapelet();
    case 'boot-left': return buildAnkleBoot('left');
    case 'boot-right': return buildAnkleBoot('right');
    case 'framed-brooch': return buildFramedBrooch(options.broochShape);
    case 'boat-top': return buildBoatNeckTop();
    case 'wrap-top': return buildCrossWrapTop();
    case 'hat': return buildFoldedHat();
    case 'apron': return buildApron();
    case 'clutch': return buildClutch();
    case 'tunic': return oneShoulder();
    case 'tabard': return buildPointedTabard();
    case 'jacket': return buildJacket(options.jacketLength, options.cuffs);
    case 'skirt': return buildWrapSkirt({ wrap: options.wrap, band: options.band, length: options.skirtLength });
    case 'vest': return buildLapelVest(options.vestLength);
    case 'pleats': return buildPleatedSkirt(options.pleatDepth);
    default: return buildSilhouette(options.silhouette, options.sleeves);
  }
}
/** Garment-specific points in the resting model, rather than generic body labels.
 * The skirt's waistband is asymmetric, and the vest has two narrow front panels. */
export function attachmentAnchors(id: GarmentId, top: number, bottom: number, options: GarmentOptions = DEFAULT_OPTIONS): AttachmentAnchor[] {
  // These new silhouettes have no reviewed attachment positions yet.
  if (garmentExperiment(id)) return [];
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
  return id === 'skirt' || id === 'vest' || id === 'pleats' ? 0.75 : 1;
}

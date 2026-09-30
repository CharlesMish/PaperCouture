import { buildDress, DEFAULT_DRESS } from './construction';
export type SilhouetteId = 'straight' | 'classic' | 'flare';
export type SleeveId = 'classic' | 'lifted' | 'dropped';
export const SILHOUETTES: { id: SilhouetteId; name: string; hem: number; hint: string }[] = [
  { id: 'straight', name: 'Straight', hem: 0.56, hint: 'Nearly upright side folds make a narrow, straight skirt.' },
  { id: 'classic', name: 'Classic A-line', hem: 0.82, hint: 'Slant the side folds outward for the original A-line skirt.' },
  { id: 'flare', name: 'Wide flare', hem: 0.98, hint: 'Leave more paper at the hem for a broad, flared skirt.' },
];
/** Discrete authored creases: the sleeve choice changes only the `sleeves` op.
 * Every option is supported with each of the three side-fold silhouettes. */
export const SLEEVES: { id: SleeveId; name: string; droop: number; hint: string }[] = [
  { id: 'classic', name: 'Classic', droop: 45, hint: 'Open the side flaps into the original diagonal sleeves.' },
  { id: 'lifted', name: 'Lifted', droop: 30, hint: 'Open the flaps farther outward for wider sleeves with a shallower slope.' },
  { id: 'dropped', name: 'Dropped', droop: 65, hint: 'Use steeper creases to keep the sleeves closer to the sides.' },
];

export function buildSilhouette(id: SilhouetteId, sleeve: SleeveId = 'classic') {
  const s = SILHOUETTES.find(s => s.id === id)!;
  const arm = SLEEVES.find(s => s.id === sleeve)!;
  const c = buildDress({ ...DEFAULT_DRESS, hem: s.hem, sleeveDroop: arm.droop });
  c.name = s.id === 'classic' ? 'A-line dress' : `${s.name} dress`;
  c.ops[2].hint = s.hint;
  // Preserve the existing default instruction text as well as its geometry.
  if (sleeve !== 'classic') {
    c.ops[3].title = sleeve === 'lifted' ? 'Open the sleeves farther out' : 'Fold the sleeves down close to the sides';
    c.ops[3].hint = arm.hint;
  }
  return c;
}

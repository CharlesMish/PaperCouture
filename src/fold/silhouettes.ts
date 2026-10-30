import { buildDress, DEFAULT_DRESS, sideFolds, sleeveDrop, sleeveFolds } from './construction';
export type SilhouetteId = 'straight' | 'classic' | 'flare';
export type SleeveId = 'classic' | 'lifted' | 'dropped';
export const SILHOUETTES: { id: SilhouetteId; name: string; hem: number; hint: string }[] = [
  { id: 'straight', name: 'Straight', hem: 0.56, hint: 'Nearly upright side folds make a narrow, straight skirt.' },
  { id: 'classic', name: 'Classic A-line', hem: 0.82, hint: 'The slant gives the skirt its A-line.' },
  { id: 'flare', name: 'Wide flare', hem: 0.98, hint: 'Keeping almost the full width at the hem makes a broad, flared skirt.' },
];
/** Discrete authored creases: the sleeve choice changes only the `sleeves` op.
 * Every option is supported with each of the three side-fold silhouettes. */
export const SLEEVES: { id: SleeveId; name: string; droop: number; hint: string }[] = [
  { id: 'classic', name: 'Classic', droop: 45, hint: 'Their corners swing out past the shoulders.' },
  { id: 'lifted', name: 'Lifted', droop: 30, hint: 'A shallower slope makes wider sleeves.' },
  { id: 'dropped', name: 'Dropped', droop: 65, hint: 'A steeper crease keeps the sleeves close to the sides.' },
];

export function buildSilhouette(id: SilhouetteId, sleeve: SleeveId = 'classic') {
  const s = SILHOUETTES.find(s => s.id === id)!;
  const arm = SLEEVES.find(s => s.id === sleeve)!;
  const params = { ...DEFAULT_DRESS, hem: s.hem, sleeveDroop: arm.droop };
  const c = buildDress(params);
  c.name = s.id === 'classic' ? 'A-line dress' : `${s.name} dress`;
  c.ops[2].hint = `${sideFolds(params)} ${s.hint}`;
  c.ops[3].hint = `${sleeveFolds(sleeveDrop(params))} ${arm.hint}`;
  if (sleeve !== 'classic') c.ops[3].title = sleeve === 'lifted' ? 'Open the sleeves farther out' : 'Fold the sleeves down close to the sides';
  return c;
}

import { buildDress, DEFAULT_DRESS } from './construction';
export type SilhouetteId = 'straight' | 'classic' | 'flare';
export const SILHOUETTES: { id: SilhouetteId; name: string; hem: number; hint: string }[] = [
  { id: 'straight', name: 'Straight', hem: 0.56, hint: 'Nearly upright side folds make a narrow, straight skirt.' },
  { id: 'classic', name: 'Classic A-line', hem: 0.82, hint: 'Slant the side folds outward for the original A-line skirt.' },
  { id: 'flare', name: 'Wide flare', hem: 0.98, hint: 'Leave more paper at the hem for a broad, flared skirt.' },
];
export function buildSilhouette(id: SilhouetteId) {
  const s = SILHOUETTES.find(s => s.id === id)!;
  const c = buildDress({ ...DEFAULT_DRESS, hem: s.hem });
  c.name = s.id === 'classic' ? 'A-line dress' : `${s.name} dress`;
  c.ops[2].hint = s.hint;
  return c;
}

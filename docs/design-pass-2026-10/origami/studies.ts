import type { Construction } from '../../../src/fold/construction';
import { buildBeret } from './beretStudy';
import { buildMitten, MITTEN_V1 } from './mittenStudy';

/** Unregistered origami studies for this design pass (not in the app). */
export const STUDIES: Record<string, () => Construction> = {
  'mitten-left': () => buildMitten('left'),
  'mitten-right': () => buildMitten('right'),
  'mitten-v1': () => buildMitten('left', MITTEN_V1),
  beret: () => buildBeret(),
  'beret-round': () => buildBeret(undefined, true),
};

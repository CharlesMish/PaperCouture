import { GARMENTS, type GarmentId } from '../fold/garments';
import { recommendedSquareCm } from '../fold/paperSize';

// How the pieces are presented: easiest first, in three tiers. Presentation only:
// design IDs, defaults and constructions are unchanged.
//
// The tier follows one rule, checked against the constructions by
// scripts/check-design-order.ts (in npm test):
// - Advanced: a step that moves several creases at once (a collapse), or 12 steps or more.
// - Easy: otherwise, at most 7 steps from a square of 14 cm or more.
// - Medium: the rest (more steps, or a small square that is fiddly in the hand).

export type Difficulty = 'easy' | 'medium' | 'advanced';
export const DIFFICULTIES: { id: Difficulty; name: string; about: string }[] = [
  { id: 'easy', name: 'Easy', about: 'A few straight folds on a full-size square.' },
  { id: 'medium', name: 'Medium', about: 'More steps, or a small square that takes care in the hand.' },
  { id: 'advanced', name: 'Advanced', about: 'Several creases folded at once, or a long sequence.' },
];

/** The piece a newcomer is pointed to (and the default). */
export const START_HERE: GarmentId = 'dress';

/**
 * Pieces the collection notes keep as experimental: newer flat studies whose notes
 * say what they leave out. Edit here to promote or demote a piece.
 */
const EXPERIMENTAL = new Set<GarmentId>([
  'clutch', 'apron', 'tunic', 'tabard', 'boat-top', 'wrap-top', 'hat', 'capelet', 'boot-left', 'boot-right',
  'framed-brooch', 'camp-shirt', 'necktie', 'swing-coat', 'fit-flare', 'mitten-left', 'mitten-right',
]);
export const isExperimental = (id: GarmentId) => EXPERIMENTAL.has(id);

/** Steps in each design's default construction, and its tier (both checked). */
export const DESIGN_FACTS: Record<GarmentId, { steps: number; difficulty: Difficulty }> = {
  dress: { steps: 6, difficulty: 'easy' }, jacket: { steps: 6, difficulty: 'easy' },
  pleats: { steps: 7, difficulty: 'easy' }, apron: { steps: 5, difficulty: 'easy' },
  tunic: { steps: 7, difficulty: 'easy' }, tabard: { steps: 7, difficulty: 'easy' },
  'boat-top': { steps: 7, difficulty: 'easy' },
  vest: { steps: 8, difficulty: 'medium' }, skirt: { steps: 9, difficulty: 'medium' },
  zori: { steps: 8, difficulty: 'medium' }, 'framed-brooch': { steps: 4, difficulty: 'medium' },
  'boot-left': { steps: 6, difficulty: 'medium' }, 'boot-right': { steps: 6, difficulty: 'medium' },
  clutch: { steps: 6, difficulty: 'medium' }, hat: { steps: 7, difficulty: 'medium' },
  'wrap-top': { steps: 8, difficulty: 'medium' }, necktie: { steps: 8, difficulty: 'medium' },
  capelet: { steps: 8, difficulty: 'medium' }, 'mitten-left': { steps: 9, difficulty: 'medium' },
  'mitten-right': { steps: 9, difficulty: 'medium' }, 'swing-coat': { steps: 10, difficulty: 'medium' },
  'coat-dress': { steps: 4, difficulty: 'advanced' }, sensu: { steps: 7, difficulty: 'advanced' },
  kimono: { steps: 8, difficulty: 'advanced' }, gown: { steps: 9, difficulty: 'advanced' },
  'fit-flare': { steps: 6, difficulty: 'advanced' }, 'camp-shirt': { steps: 14, difficulty: 'advanced' },
};

/** Mirror-image pieces shown as one card with a choice of side. */
export const PAIRS: { name: string; members: [GarmentId, string][] }[] = [
  { name: 'Ankle boots', members: [['boot-left', 'Toe left'], ['boot-right', 'Toe right']] },
  { name: 'Mittens', members: [['mitten-left', 'Left hand'], ['mitten-right', 'Right hand']] },
];
export const pairOf = (id: GarmentId) => PAIRS.find(p => p.members.some(([m]) => m === id));

const tierRank = (id: GarmentId) => DIFFICULTIES.findIndex(d => d.id === DESIGN_FACTS[id].difficulty);
/** Easiest first: by tier; the starting piece first; the collection before experiments; fewer steps first. */
export const BROWSE_GARMENTS = GARMENTS.map((g, i) => ({ g, i })).sort((a, b) =>
  tierRank(a.g.id) - tierRank(b.g.id)
  || Number(b.g.id === START_HERE) - Number(a.g.id === START_HERE)
  || Number(isExperimental(a.g.id)) - Number(isExperimental(b.g.id))
  || DESIGN_FACTS[a.g.id].steps - DESIGN_FACTS[b.g.id].steps
  || a.i - b.i).map(({ g }) => g);

/** One line for a card: steps and the suggested square. */
export const designDetail = (id: GarmentId) => `${DESIGN_FACTS[id].steps} steps · ${recommendedSquareCm(id)} cm square`;

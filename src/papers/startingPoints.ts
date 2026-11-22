// Starting points: how a paper begins on a particular piece (its quarter turn
// and, for a print that slides, where the print sits).
//
// Three sources, all offered in the placement panel as pictures of the finished
// piece: placements measured on the spot (src/papers/landing.ts), a short list
// suggested by hand below, and one the person saved for themselves. Only the
// saved one is ever applied without being chosen: picking that paper for that
// piece starts from it. Nothing here changes a paper's drawing, a default, a
// link or a saved board.
import type { PrintPosition } from './types';

export interface StartingPoint extends PrintPosition { turns: number }
export interface SuggestedStart extends StartingPoint { name: string }

export const sameStart = (a: StartingPoint, b: StartingPoint) => a.turns === b.turns && Math.abs(a.x - b.x) < 1 / 512 && Math.abs(a.y - b.y) < 1 / 512;

/**
 * Suggestions chosen by eye from the placement review (docs/placement-review).
 * Keyed by paper id, then design id. They are proposals awaiting Charlie's
 * review, and they are only ever offered, never applied on their own.
 */
export const SUGGESTED: Readonly<Record<string, Readonly<Record<string, readonly SuggestedStart[]>>>> = {
  // The band sits at the foot of the sheet. Pieces made mostly from the top of
  // the square never see it as drawn; half a turn brings it up.
  'border-print': {
    jacket: [{ name: 'Waves across the yoke', turns: 2, x: 0, y: 0 }],
    skirt: [{ name: 'Waves on the wrap', turns: 2, x: 0, y: 0 }],
    vest: [{ name: 'Waves at the chest', turns: 2, x: 0, y: 0 }],
    apron: [{ name: 'Waves on the bib', turns: 2, x: 0, y: 0 }],
    'wrap-top': [{ name: 'Waves across the wrap', turns: 2, x: 0, y: 0 }],
    hat: [{ name: 'Hatband', turns: 2, x: 0, y: 0 }],
    kimono: [{ name: 'Waves at the sleeve hems', turns: 2, x: 0, y: 0 }],
    'coat-dress': [{ name: 'Waves on the collar', turns: 2, x: 0, y: 0 }],
    capelet: [{ name: 'Waves across the shoulders', turns: 2, x: 0, y: 0 }],
    'boot-left': [{ name: 'Cuff band', turns: 2, x: 0, y: 0 }],
    'boot-right': [{ name: 'Cuff band', turns: 2, x: 0, y: 0 }],
    zori: [{ name: 'Band across the footbed', turns: 2, x: 0, y: 0 }],
    sensu: [{ name: 'Waves along the rim', turns: 2, x: 0, y: 0 }],
  },
  'wide-frame': {
    kimono: [{ name: 'Dark sleeve bands', turns: 1, x: 0, y: 0 }],
    'swing-coat': [{ name: 'Dark front edges', turns: 1, x: 0, y: 0 }],
  },
  // One blossom and a trail of petals: as drawn it falls outside what these
  // pieces keep in view. Positions are multiples of 1/256 inside the 30% limit.
  'plum-scatter': {
    kimono: [{ name: 'Blossom on the sleeve', turns: 0, x: -0.2265625, y: 0 }],
    skirt: [{ name: 'Blossom on the wrap', turns: 2, x: 0.296875, y: 0.296875 }],
    'wrap-top': [{ name: 'Blossom on the front panel', turns: 0, x: -0.296875, y: 0 }],
    'coat-dress': [{ name: 'Blossom on the collar', turns: 0, x: -0.296875, y: 0.2265625 }],
    'camp-shirt': [{ name: 'Blossom at the hem', turns: 0, x: 0.07421875, y: -0.296875 }],
    necktie: [{ name: 'Blossom under the knot', turns: 1, x: -0.07421875, y: -0.07421875 }],
    capelet: [{ name: 'Blossom on one front', turns: 0, x: -0.296875, y: 0.1484375 }],
    zori: [{ name: 'Blossom at the heel', turns: 0, x: -0.1484375, y: 0.07421875 }],
  },
  'corner-bloom': {
    skirt: [{ name: 'Bloom on the wrap', turns: 2, x: 0.1484375, y: 0.07421875 }],
    clutch: [{ name: 'Bloom on the flap', turns: 2, x: 0, y: 0.07421875 }],
    'coat-dress': [{ name: 'Bloom at the waist', turns: 3, x: -0.1484375, y: -0.1484375 }],
    kimono: [{ name: 'Bloom on the sleeve', turns: 2, x: 0.1484375, y: 0 }],
  },
};

export function suggestedStarts(paperId: string, designId: string): readonly SuggestedStart[] {
  return SUGGESTED[paperId]?.[designId] ?? [];
}

const KEY = 'paper-couture:starting-points:v1';
type Saved = Record<string, StartingPoint>;
const slot = (pieceKey: string, paperId: string) => `${pieceKey}|${paperId}`;

function read(): Saved {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    return value && typeof value === 'object' ? value as Saved : {};
  } catch { return {}; }
}
function write(saved: Saved): boolean {
  try { localStorage.setItem(KEY, JSON.stringify(saved)); return true; } catch { return false; }
}

/** The person's own saved start for this paper on this piece, if any. */
export function savedStart(pieceKey: string, paperId: string): StartingPoint | undefined {
  const s = read()[slot(pieceKey, paperId)];
  if (!s || !Number.isFinite(s.turns) || !Number.isFinite(s.x) || !Number.isFinite(s.y)) return undefined;
  return { turns: ((Math.trunc(s.turns) % 4) + 4) % 4, x: s.x, y: s.y };
}
export function saveStart(pieceKey: string, paperId: string, start: StartingPoint): boolean {
  const saved = read();
  saved[slot(pieceKey, paperId)] = { turns: start.turns, x: start.x, y: start.y };
  return write(saved);
}
export function forgetStart(pieceKey: string, paperId: string): boolean {
  const saved = read();
  delete saved[slot(pieceKey, paperId)];
  return write(saved);
}

import type { StartingPaperSize } from '../fold/paperSize';

/** Version one stores posed vertices, never a recipe that can refold a kept piece. */
export const BOARD_KEY = 'paper-couture.pinboard.v1';
export const MAX_PIECES = 5;
export const MAX_SAVE_LENGTH = 2_000_000;
export const BACKGROUNDS = { Linen: '#d3c8b5', Rose: '#c4a09f', Slate: '#59646a' };
export type Background = keyof typeof BACKGROUNDS;
export interface PaperRecipe { id: string; turns: number; position: { x: number; y: number }; side: 'front' | 'back' }
export interface Surface {
  kind: 'paper' | 'line'; color: number[]; side: number; opacity: number;
  transparent: boolean; depthWrite: boolean; vertexColors: boolean; paper?: PaperRecipe;
}
export interface FrozenPiece {
  geometries: { position: number[]; normal?: number[]; uv?: number[]; color?: number[] }[];
  materials: Surface[];
  parts: { geometry: number; material: number; matrix: number[]; kind: 'mesh' | 'lines' }[];
}
export interface BoardItem { id: string; title: string; snapshot: FrozenPiece; x: number; y: number; tilt: number; paperSize?: StartingPaperSize }
export interface BoardState { version: 1; background: Background; selected: string | null; items: BoardItem[] }
export const emptyBoard = (): BoardState => ({ version: 1, background: 'Linen', selected: null, items: [] });
export function copyBoard(s: BoardState): BoardState {
  // Geometry and paper descriptions are immutable and may be shared by Undo states.
  return { ...s, items: s.items.map(item => ({ ...item })) };
}

const numeric = (v: unknown, limit: number) => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= limit;
const vector = (v: unknown, length: number, limit: number): v is number[] => Array.isArray(v) && v.length === length && v.every(n => numeric(n, limit));
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown, max: number): v is string => typeof v === 'string' && v.length > 0 && v.length <= max;

/** Reject the entire unsupported/damaged record and leave its bytes untouched. */
export function parseBoard(raw: string, paperIds: readonly string[]): BoardState {
  if (raw.length > MAX_SAVE_LENGTH) throw new Error('Board is too large');
  const s: unknown = JSON.parse(raw);
  if (!record(s) || s.version !== 1 || typeof s.background !== 'string' || !Object.hasOwn(BACKGROUNDS, s.background)
    || !Array.isArray(s.items) || s.items.length > MAX_PIECES) throw new Error('Unsupported board');
  const ids = new Set<string>();
  for (const item of s.items) {
    if (!record(item) || !text(item.id, 80) || ids.has(item.id) || !text(item.title, 180)
      || !numeric(item.x, 4) || !numeric(item.y, 4) || !numeric(item.tilt, 12) || !record(item.snapshot)) throw new Error('Invalid piece');
    ids.add(item.id);
    // Descriptive only: the scale is already baked into snapshot matrices. Never
    // infer this field for legacy records or apply it again when restoring.
    if (item.paperSize !== undefined) {
      const size = item.paperSize;
      const side = (v: unknown) => numeric(v, 30) && Number(v) > 0;
      if (!record(size) || !side(size.sideCm) || (size.companionCm !== undefined
        && (!Array.isArray(size.companionCm) || size.companionCm.length > 3 || !size.companionCm.every(side)))) throw new Error('Invalid paper size');
    }
    const p = item.snapshot;
    if (!Array.isArray(p.geometries) || !p.geometries.length || p.geometries.length > 16
      || !Array.isArray(p.materials) || !p.materials.length || p.materials.length > 16
      || !Array.isArray(p.parts) || !p.parts.length || p.parts.length > 24) throw new Error('Invalid snapshot');
    for (const g of p.geometries) {
      if (!record(g) || !Array.isArray(g.position) || !g.position.length || g.position.length > 60000
        || Object.keys(g).some(k => !['position', 'normal', 'uv', 'color'].includes(k))
        || g.position.length % 3 || !vector(g.position, g.position.length, 8)) throw new Error('Invalid vertices');
      const n = g.position.length / 3;
      for (const [key, size, limit] of [['normal', 3, 1.01], ['uv', 2, 2], ['color', 3, 1]] as const)
        if (g[key] !== undefined && !vector(g[key], n * size, limit)) throw new Error('Invalid attributes');
    }
    for (const m of p.materials) {
      if (!record(m) || !['paper', 'line'].includes(String(m.kind)) || !vector(m.color, 3, 1)
        || ![0, 1, 2].includes(m.side as number) || !numeric(m.opacity, 1) || Number(m.opacity) < 0
        || !['transparent', 'depthWrite', 'vertexColors'].every(k => typeof m[k] === 'boolean')) throw new Error('Invalid surface');
      if (m.paper !== undefined) {
        const r = m.paper;
        if (!record(r) || !paperIds.includes(String(r.id)) || ![0, 1, 2, 3].includes(r.turns as number)
          || !['front', 'back'].includes(String(r.side)) || !record(r.position)
          || !numeric(r.position.x, .5) || !numeric(r.position.y, .5)) throw new Error('Unknown paper');
      }
    }
    for (const part of p.parts) {
      if (!record(part) || !Number.isInteger(part.geometry) || !Number.isInteger(part.material)
        || Number(part.geometry) < 0 || Number(part.geometry) >= p.geometries.length
        || Number(part.material) < 0 || Number(part.material) >= p.materials.length
        || !['mesh', 'lines'].includes(String(part.kind)) || !vector(part.matrix, 16, 8)
        || part.matrix[3] !== 0 || part.matrix[7] !== 0 || part.matrix[11] !== 0 || part.matrix[15] !== 1) throw new Error('Invalid part');
    }
  }
  if (s.selected !== null && (typeof s.selected !== 'string' || !ids.has(s.selected))) throw new Error('Invalid selection');
  return s as unknown as BoardState;
}

export class BoardStore {
  private last: string | null = null;
  private blocked = false;
  constructor(private storage: () => Pick<Storage, 'getItem' | 'setItem'>, private paperIds: readonly string[]) {}
  load(): BoardState {
    this.last = this.storage().getItem(BOARD_KEY);
    try { return this.last === null ? emptyBoard() : parseBoard(this.last, this.paperIds); }
    catch (error) { this.blocked = true; throw error; }
  }
  save(state: BoardState): void {
    if (this.blocked) throw new Error('Existing board could not be read; it has not been replaced.');
    const storage = this.storage();
    if (storage.getItem(BOARD_KEY) !== this.last) throw new Error('The saved board changed in another tab. It has not been replaced.');
    const next = JSON.stringify(state);
    if (next.length > MAX_SAVE_LENGTH) throw new Error('Board exceeds the local save limit.');
    parseBoard(next, this.paperIds);
    storage.setItem(BOARD_KEY, next); // Atomic: a quota failure leaves the previous record intact.
    this.last = next;
  }
}

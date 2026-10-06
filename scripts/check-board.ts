import assert from 'node:assert/strict';
import { BOARD_KEY, BoardState, BoardStore, copyBoard, emptyBoard, MAX_PIECES, parseBoard } from '../src/board/model';

const paperIds = ['stripe-disc'];
const sample: BoardState = { ...emptyBoard(), selected: 'a', items: [{ id: 'a', title: 'A pinned piece', x: 0, y: 0, tilt: 0, snapshot: {
  geometries: [{ position: [0, 0, 0, 1, 0, 0, 0, 1, 0], uv: [0, 0, 1, 0, 0, 1] }],
  materials: [{ kind: 'paper', color: [1, 1, 1], side: 0, opacity: 1, transparent: false, depthWrite: true, vertexColors: false,
    paper: { id: 'stripe-disc', turns: 0, position: { x: 0, y: 0 }, side: 'front' } }],
  parts: [{ geometry: 0, material: 0, kind: 'mesh', matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] }],
} }] };
assert.deepEqual(parseBoard(JSON.stringify(sample), paperIds), sample);
const full: BoardState = { ...sample, items: Array.from({ length: MAX_PIECES }, (_, n) => ({ ...sample.items[0], id: `piece-${n}` })), selected: 'piece-0' };
assert.equal(MAX_PIECES, 5);
assert.deepEqual(parseBoard(JSON.stringify(full), paperIds), full);
assert.throws(() => parseBoard(JSON.stringify({ ...full, items: [...full.items, { ...sample.items[0], id: 'one-too-many' }] }), paperIds), /Unsupported board/);
const undo = copyBoard(sample); sample.items[0].x = .5;
assert.equal(undo.items[0].x, 0); assert.equal(undo.items[0].snapshot, sample.items[0].snapshot);
for (const corrupt of [
  (s: any) => { s.version = 2; },
  (s: any) => { s.items = Array(MAX_PIECES + 1).fill(s.items[0]); },
  (s: any) => { s.selected = 'missing'; },
  (s: any) => { s.items[0].snapshot.geometries[0].position[0] = null; },
  (s: any) => { s.items[0].snapshot.geometries[0].uv = [1]; },
  (s: any) => { s.items[0].snapshot.materials[0].paper.id = 'missing-paper'; },
  (s: any) => { s.items[0].snapshot.parts[0].geometry = 4; },
  (s: any) => { s.items[0].snapshot.parts[0].matrix[15] = 0; },
]) {
  const s = structuredClone(sample); corrupt(s); assert.throws(() => parseBoard(JSON.stringify(s), paperIds));
}
const values = new Map([['legacy-unrelated', 'keep']]); let fail = false;
const storage = { getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => { if (fail) throw new Error('Quota exceeded'); values.set(key, value); } };
const store = new BoardStore(() => storage, paperIds);
assert.deepEqual(store.load(), emptyBoard()); store.save(sample);
const saved = values.get(BOARD_KEY); fail = true;
assert.throws(() => store.save(emptyBoard())); assert.equal(values.get(BOARD_KEY), saved);
fail = false; store.save(undo); assert.deepEqual(new BoardStore(() => storage, paperIds).load(), undo);
assert.equal(values.get('legacy-unrelated'), 'keep');
// Compare-and-save protects another tab's newer retained work.
const other = new BoardStore(() => storage, paperIds); other.load(); store.save(sample);
assert.throws(() => other.save(emptyBoard()), /another tab/); assert.equal(values.get(BOARD_KEY), saved);
// Unsupported/damaged saves are not silently overwritten, including by Retry.
values.set(BOARD_KEY, '{broken'); const broken = new BoardStore(() => storage, paperIds);
assert.throws(() => broken.load()); assert.throws(() => broken.save(sample)); assert.equal(values.get(BOARD_KEY), '{broken');
// Temporarily denied storage can recover if no earlier board would be overwritten.
const retry = new BoardStore(() => { if (fail) throw new Error('Unavailable'); return storage; }, paperIds);
values.delete(BOARD_KEY); fail = true; assert.throws(() => retry.load()); fail = false; retry.save(sample);
assert.deepEqual(retry.load(), sample);
console.log('Board v1: round-trip, bounded validation, immutable Undo, missing legacy record, quota retry, unsupported-record preservation, unrelated storage, and cross-tab conflict pass.');

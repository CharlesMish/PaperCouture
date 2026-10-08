import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { capture, restore } from '../src/board/snapshot';
import { BOARD_KEY, BoardStore, copyBoard, emptyBoard, parseBoard } from '../src/board/model';
import { recommendedSquareCm, squareChoices, startingPaperSize } from '../src/fold/paperSize';
import { buildGarment, garmentDisplayAngle, GARMENTS } from '../src/fold/garments';
import { buildTimeline, evaluateFrame, posePoint } from '../src/fold/timeline';
import { PAPERS } from '../src/papers';

const paperIds = PAPERS.map(p => p.id);
const measured = GARMENTS.map(({ id }) => {
  const op = buildTimeline(buildGarment(id).ops).ops.at(-1)!;
  const frame = evaluateFrame(op, 1), box = new THREE.Box3();
  for (const p of op.pieces) for (const m of p.poly)
    box.expandByPoint(new THREE.Vector3(...posePoint(frame, p.index * 12, m.x, m.y)).applyAxisAngle(new THREE.Vector3(0, 0, 1), garmentDisplayAngle(id)));
  const before = box.getSize(new THREE.Vector3()), cm = recommendedSquareCm(id);
  return { id, cm, before: before.toArray(), after: before.multiplyScalar(cm / 20).toArray() };
});
const clutch = measured.find(m => m.id === 'clutch')!, apron = measured.find(m => m.id === 'apron')!, skirt = measured.find(m => m.id === 'skirt')!;
assert(clutch.after[0] < skirt.after[0] * .4, 'Clutch should read as a small handbag beside a skirt');
assert(apron.after[0] < skirt.after[0] && apron.after[1] < skirt.after[1], 'Apron fits inside the skirt silhouette');
assert.equal(recommendedSquareCm('future-design'), 20);
assert.deepEqual(squareChoices({ key: 'clutch', referenceCm: 20, recommendedCm: 8 }), [6.4, 8, 9.6, 20]);
assert.deepEqual(startingPaperSize({ key: 'bow', referenceCm: 3.8, recommendedCm: 3.8, companionCm: [3.8, 3.23] }, 3.04), { sideCm: 3.04, companionCm: [3.04, 2.58] });

// A real nested assembly: uniform sheet scaling includes an independently posed
// attachment, seam, and depth, without changing vertices, normals, UVs or color.
const geometry = new THREE.PlaneGeometry(1.8, 1.2).toNonIndexed();
const root = new THREE.Group(), material = new THREE.MeshStandardMaterial();
const mesh = new THREE.Mesh(geometry, material); mesh.rotation.z = .15; root.add(mesh);
const attachment = new THREE.Mesh(geometry, material); attachment.scale.setScalar(.18); attachment.position.set(.3, .4, .1); root.add(attachment);
const seamGeometry = new THREE.BufferGeometry(); seamGeometry.setAttribute('position', new THREE.Float32BufferAttribute([-.6, -.4, .001, .6, -.4, .001], 3));
root.add(new THREE.LineSegments(seamGeometry, new THREE.LineBasicMaterial()));
const original = capture([root], -.2), small = capture([root], -.2, .4);
assert.deepEqual(small.geometries, original.geometries); assert.deepEqual(small.materials, original.materials);
for (const [index, part] of small.parts.entries()) for (let n = 0; n < 16; n++)
  assert(Math.abs(part.matrix[n] - original.parts[index].matrix[n] * ([3, 7, 11, 15].includes(n) ? 1 : .4)) < 1e-12);
const originalGroup = restore(original), smallGroup = restore(small);
const bounds = (g: THREE.Group) => new THREE.Box3().setFromObject(g, true).getSize(new THREE.Vector3());
assert(bounds(smallGroup).distanceTo(bounds(originalGroup).multiplyScalar(.4)) < 1e-8);
assert.deepEqual(capture([root], -.2), original, 'Capturing must never mutate workshop objects');
for (const scale of [0, -1, NaN, Infinity, 9]) assert.throws(() => capture([root], 0, scale));
originalGroup.userData.dispose(); smallGroup.userData.dispose();
geometry.dispose(); seamGeometry.dispose(); material.dispose();

// Real old v1 capture keeps every matrix, material recipe and byte on read. New
// metadata has no role in restore, and version stays readable by old parsers.
const legacy = readFileSync(new URL('../docs/board-space/fixtures/longline-long.json', import.meta.url), 'utf8');
let durable = legacy, fail = false;
const storage = { getItem: (key: string) => key === BOARD_KEY ? durable : null, setItem: (_key: string, value: string) => { if (fail) throw new Error('Quota'); durable = value; } };
const store = new BoardStore(() => storage, paperIds), old = store.load();
assert.equal(durable, legacy); assert.equal(old.items[0].paperSize, undefined);
assert.deepEqual(old, JSON.parse(legacy));
const next = copyBoard(old); next.items.push({ id: 'sized', title: 'Small clutch', x: 0, y: 0, tilt: 0, snapshot: small, paperSize: { sideCm: 8 } }); next.selected = 'sized';
store.save(next); const saved = durable;
assert.deepEqual(new BoardStore(() => storage, paperIds).load(), next);
assert.deepEqual(next.items[0].snapshot, old.items[0].snapshot);
fail = true; assert.throws(() => store.save(emptyBoard())); assert.equal(durable, saved);
fail = false; store.save(old); assert.equal(durable, JSON.stringify(old), 'Undo restores the old captures exactly');
for (const bad of [{ sideCm: 0 }, { sideCm: 31 }, { sideCm: 8, companionCm: [NaN] }, { sideCm: 8, companionCm: [1, 2, 3, 4] }]) {
  const s = structuredClone(next); s.items.at(-1)!.paperSize = bad; assert.throws(() => parseBoard(JSON.stringify(s), paperIds));
}
console.log(JSON.stringify({ passed: true, measured, checks: ['Authored finished extents and suggested proportions', 'Uniform assembly matrix scale; exact material attributes and untouched workshop objects', 'Legacy v1 identity, additive descriptive metadata, reload, quota failure, Undo save'] }, null, 2));

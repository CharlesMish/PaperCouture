import assert from 'node:assert/strict';
import { PAPERS, findPaper } from '../src/papers/index';
import { normalizePosition, positionFromParams, positionToParams, sourceShift } from '../src/papers/printPosition';
import { applySheetOrientation } from '../src/render/sheetOrientation';
import * as THREE from 'three';

const floral = findPaper('corner-bloom'), seed = findPaper('seed-dashes');
for (const paper of PAPERS) {
  assert.deepEqual(positionFromParams(paper, new URLSearchParams()), { x: 0, y: 0 });
  for (const invalid of ['printX=Infinity', 'printY=NaN', 'printX=oops'])
    assert.deepEqual(positionFromParams(paper, new URLSearchParams(invalid)), { x: 0, y: 0 });
  const p = normalizePosition(paper, { x: 999, y: -999 });
  if (paper.placement?.kind === 'slide') assert(Math.abs(p.x) <= paper.placement.limit && Math.abs(p.y) <= paper.placement.limit);
  else assert.deepEqual(p, { x: 0, y: 0 });
}
for (const p of [{ x: .125, y: -.25 }, { x: 0, y: 0 }]) {
  const params = new URLSearchParams('step=3&owner=keep');
  positionToParams(p, params);
  assert.deepEqual(positionFromParams(floral, params), p);
  assert.equal(params.get('owner'), 'keep'); assert.equal(params.get('step'), '3');
  if (!p.x && !p.y) assert.equal(params.has('printX') || params.has('printY'), false);
}
assert.equal(seed.placement?.kind, 'snap');
if (seed.placement?.kind === 'snap') for (const p of seed.placement.positions)
  assert.deepEqual(normalizePosition(seed, p), { x: p.x, y: p.y });
assert.deepEqual(normalizePosition(seed, { x: .01, y: 0 }), { x: 0, y: 0 });

// Follow one sheet point through the existing front/back sampling matrices.
// The shifted source location must sample at that point + the requested
// displacement, on both faces, for every paper turn.
for (let q = 0; q < 4; q++) for (const p of [{ x: .125, y: -.0625 }, { x: -.25, y: .125 }]) {
  const front = new THREE.Texture(), back = new THREE.Texture();
  applySheetOrientation(front, 'front', q); applySheetOrientation(back, 'back', q);
  const before = new THREE.Vector2(.37, .61), after = before.clone().add(new THREE.Vector2(p.x, p.y));
  const shift = sourceShift(p, q);
  const f0 = before.clone().applyMatrix3(front.matrix), f1 = after.clone().applyMatrix3(front.matrix);
  const b0 = before.clone().applyMatrix3(back.matrix), b1 = after.clone().applyMatrix3(back.matrix);
  assert(f1.distanceTo(f0.add(new THREE.Vector2(shift.x, shift.y))) < 1e-12);
  assert(b1.distanceTo(b0.add(new THREE.Vector2(-shift.x, shift.y))) < 1e-12);
  assert(Math.abs(f1.x + b1.x - 1) < 1e-12 && Math.abs(f1.y - b1.y) < 1e-12);
}
console.log('Print positioning: bounded input, old URLs, exact snap positions, and two-sided registration at all four turns pass.');

/** Focused construction study check, not physical foldability certification. */
import assert from 'node:assert/strict';
import { buildCrossFrontRobe } from '../docs/geometry-collection/robe/crossFrontRobeStudy';
import { checkState, modelPoly } from '../src/fold/engine';
import { centroid, signedArea, Vec2 } from '../src/fold/geometry';
import { buildTimeline, evaluateFrame, LAYER_GAP, posePoint } from '../src/fold/timeline';

const c = buildCrossFrontRobe();
const tl = buildTimeline(c.ops);
for (const [i, state] of tl.states.entries()) assert.deepEqual(checkState(state, `robe state ${i}`), []);
assert.equal(new Set(c.ops.map(op => op.id)).size, c.ops.length);
assert(c.ops.every(op => op.kind === 'turn' || (op.kind === 'fold' && op.folds.every(fold => fold.sense === 'valley'))));
const inside = (poly: Vec2[], p: Vec2) => poly.every((a, i) => {
  const b = poly[(i + 1) % poly.length];
  return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x) >= -1e-10;
});
const distance = (a: number[], b: number[]) => Math.hypot(...a.map((v, i) => v - b[i]));
for (let i = 1; i < tl.ops.length; i++) {
  const before = tl.ops[i - 1], after = tl.ops[i];
  const A = evaluateFrame(before, 1), B = evaluateFrame(after, 0);
  for (const piece of after.pieces) {
    const source = before.pieces.find(p => inside(p.poly, centroid(piece.poly)));
    assert(source, `step ${i}: material source`);
    for (const p of piece.poly) assert(distance(posePoint(A, source.index * 12, p.x, p.y), posePoint(B, piece.index * 12, p.x, p.y)) < 1e-9, `step ${i}: resting endpoint discontinuity`);
  }
}
let maxHingeGap = 0, minZ = Infinity, maxStack = 0;
for (const op of tl.ops) {
  maxStack = Math.max(maxStack, ...op.pieces.map(p => p.postZ));
  for (let i = 0; i <= 40; i++) {
    const M = evaluateFrame(op, i / 40);
    for (const hinge of op.hinges) for (const p of [hinge.m0, hinge.m1]) maxHingeGap = Math.max(maxHingeGap, distance(posePoint(M, hinge.a * 12, p.x, p.y), posePoint(M, hinge.b * 12, p.x, p.y)));
    for (const piece of op.pieces) for (const p of piece.poly) minZ = Math.min(minZ, posePoint(M, piece.index * 12, p.x, p.y)[2]);
  }
}
assert(maxHingeGap <= 8 * LAYER_GAP, 'robe exceeds existing hinge-gap limit');
assert(minZ >= -1e-9, 'robe moves below the table');
const final = tl.states.at(-1)!;
const points = final.facets.flatMap(modelPoly);
const metrics = {
  steps: c.ops.length, facets: final.facets.length,
  retainedMaterialArea: final.facets.reduce((sum, p) => sum + signedArea(p.poly), 0),
  width: Math.max(...points.map(p => p.x)) - Math.min(...points.map(p => p.x)),
  height: Math.max(...points.map(p => p.y)) - Math.min(...points.map(p => p.y)),
  maxHingeGap, minZ, maxStack,
};
console.log(JSON.stringify(metrics, null, 2));
console.log('Robe construction checks passed; visual curation is a separate gate.');

import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { buildBowCentre } from '../src/fold/bowCentre';
import { checkState, modelPoly } from '../src/fold/engine';
import { buildTimeline, evaluateFrame, LAYER_GAP, posePoint } from '../src/fold/timeline';
import { centroid, Vec2 } from '../src/fold/geometry';

// The parked trousers probe lives in docs, not the production garment registry.
const construction = buildBowCentre();
const timeline = buildTimeline(construction.ops);
const distance = (a: number[], b: number[]) => Math.hypot(...a.map((x, i) => x - b[i]));
const contains = (poly: Vec2[], p: Vec2) => poly.every((a, i) => {
  const b = poly[(i + 1) % poly.length];
  return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x) >= -1e-10;
});
for (const [i, state] of timeline.states.entries()) assert.deepEqual(checkState(state, `centre state ${i}`), []);
let worstGap = 0;
let lowestZ = Infinity;
for (const op of timeline.ops) {
  assert(op.op.kind === 'turn' || op.op.folds.every(fold => fold.sense === 'valley'), 'centre uses visible upward folds');
  for (let sample = 0; sample <= 20; sample++) {
    const M = evaluateFrame(op, sample / 20);
    for (const hinge of op.hinges) for (const p of [hinge.m0, hinge.m1]) {
      worstGap = Math.max(worstGap, distance(posePoint(M, hinge.a * 12, p.x, p.y), posePoint(M, hinge.b * 12, p.x, p.y)));
    }
    for (const piece of op.pieces) for (const p of piece.poly) {
      lowestZ = Math.min(lowestZ, posePoint(M, piece.index * 12, p.x, p.y)[2]);
    }
  }
}
assert(worstGap <= 8 * LAYER_GAP, `centre hinge gap ${worstGap}`);
assert(lowestZ >= -1e-9, `centre dips below the table: ${lowestZ}`);
for (let i = 0; i + 1 < timeline.ops.length; i++) {
  const previous = timeline.ops[i], next = timeline.ops[i + 1];
  const A = evaluateFrame(previous, 1), B = evaluateFrame(next, 0);
  for (const piece of next.pieces) {
    const source = previous.pieces.find(candidate => contains(candidate.poly, centroid(piece.poly)));
    assert(source, `centre op ${i + 1} missing source`);
    for (const p of piece.poly) {
      assert(distance(posePoint(A, source.index * 12, p.x, p.y), posePoint(B, piece.index * 12, p.x, p.y)) <= 1e-9, 'centre endpoint jump');
    }
  }
}
const final = timeline.states.at(-1)!;
const points = final.facets.flatMap(modelPoly);
const width = Math.max(...points.map(p => p.x)) - Math.min(...points.map(p => p.x));
const height = Math.max(...points.map(p => p.y)) - Math.min(...points.map(p => p.y));
assert(Math.abs(width - 0.72) < 1e-9 && Math.abs(height - 1) < 1e-9, 'centre remains a compact vertical band');
assert(construction.ops.length === 5);
console.log(JSON.stringify({ name: construction.name, steps: construction.ops.length, facets: final.facets.length, width, height, worstGap, lowestZ }, null, 2));
if (process.argv.includes('--dump')) writeFileSync('docs/geometry-collection/trousers-centre/centre-states.json', JSON.stringify(timeline.states));
console.log('folded centre checks passed');

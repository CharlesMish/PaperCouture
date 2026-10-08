import assert from 'node:assert/strict';
import { CANDIDATES } from '../experiments/fold-study/constructions';
import { checkState, modelPoly, isFlipped } from '../src/fold/engine';
import { centroid, signedArea, Vec2 } from '../src/fold/geometry';
import { buildTimeline, evaluateFrame, posePoint, LAYER_GAP } from '../src/fold/timeline';
import { FoldController } from '../src/app/controller';
import { interiorPiercing } from './experiment-collision';

const inside = (poly: Vec2[], p: Vec2) => poly.every((a, i) => { const b = poly[(i + 1) % poly.length]; return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x) >= -1e-10; });
const distance = (a: number[], b: number[]) => Math.hypot(...a.map((x, i) => x - b[i]));
for (const [id, build] of Object.entries(CANDIDATES)) {
  const c = build(), tl = buildTimeline(c.ops);
  for (const [i, s] of tl.states.entries()) assert.deepEqual(checkState(s, `${id}:${i}`), []);
  assert.equal(new Set(c.ops.map(op => op.id)).size, c.ops.length);
  assert(c.ops.every(op => op.kind === 'turn' || (op.kind === 'fold' && op.folds.every(f => f.sense === 'valley'))));
  let gap = 0, lowest = Infinity, piercings = 0;
  for (const op of tl.ops) for (let i = 0; i <= 80; i++) {
    const M = evaluateFrame(op, i / 80);
    for (const h of op.hinges) for (const m of [h.m0, h.m1]) gap = Math.max(gap, distance(posePoint(M, h.a * 12, m.x, m.y), posePoint(M, h.b * 12, m.x, m.y)));
    const triangles = op.pieces.flatMap(p => p.poly.slice(1, -1).map((_, j) => ({ id: p.id, points: [p.poly[0], p.poly[j + 1], p.poly[j + 2]].map(m => posePoint(M, p.index * 12, m.x, m.y)) })));
    for (const p of op.pieces) for (const m of p.poly) lowest = Math.min(lowest, posePoint(M, p.index * 12, m.x, m.y)[2]);
    for (let a = 0; a < triangles.length; a++) for (let b = a + 1; b < triangles.length; b++) if (triangles[a].id !== triangles[b].id && interiorPiercing(triangles[a].points, triangles[b].points)) piercings++;
  }
  for (let i = 1; i < tl.ops.length; i++) {
    const a = tl.ops[i - 1], b = tl.ops[i], A = evaluateFrame(a, 1), B = evaluateFrame(b, 0);
    for (const p of b.pieces) {
      const source = a.pieces.find(q => inside(q.poly, centroid(p.poly))); assert(source);
      for (const m of p.poly) assert(distance(posePoint(A, source.index * 12, m.x, m.y), posePoint(B, p.index * 12, m.x, m.y)) < 1e-9);
    }
  }
  assert(gap <= 8 * LAYER_GAP); assert(lowest >= -1e-9); assert.equal(piercings, 0);
  // Face exposure is a normal-projection diagnostic, not a Display-camera oracle.
  const final = tl.states.at(-1)!; let covered = 0, reverse = 0;
  for (let y = -1; y < 1; y += .01) for (let x = -1; x < 1; x += .01) {
    const hit = final.facets.filter(f => { const p = modelPoly(f); return inside(signedArea(p) < 0 ? p.reverse() : p, { x: x + .005, y: y + .005 }); }).sort((a, b) => b.rank - a.rank)[0];
    if (hit) { covered++; if (isFlipped(hit)) reverse++; }
  }
  assert(reverse / covered > (id === 'apron' ? .20 : .09));
  const ctrl = new FoldController(c.ops.length, () => 1);
  for (let i = 0; i < c.ops.length; i++) { ctrl.next(); ctrl.update(2); assert.equal(ctrl.step, i + 1); }
  for (let i = c.ops.length; i > 0; i--) { ctrl.prev(); ctrl.update(2); assert.equal(ctrl.step, i - 1); }
  ctrl.next(); ctrl.update(.35); const pose = ctrl.pose(); ctrl.prev(); assert.deepEqual(ctrl.pose(), pose); ctrl.update(2); assert.equal(ctrl.step, 0);
  ctrl.next(); ctrl.update(.35); ctrl.reset(); assert.equal(ctrl.step, 0); assert(!ctrl.moving);
  console.log(`${id}: retained square, rigid facets, seams, endpoints, reverse exposure, controller reversal/reset; 81 samples/op; hinge ${gap.toFixed(4)}, strict triangle piercings ${piercings}`);
}
console.log('These checks do not certify physical foldability or continuous collision-free motion.');

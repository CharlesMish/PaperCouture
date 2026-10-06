import assert from 'node:assert/strict';
import { buildFramedBrooch } from '../src/fold/framedBrooch';
import { recommendedSquareCm } from '../src/fold/paperSize';
import { checkState, modelPoly, isFlipped } from '../src/fold/engine';
import { centroid, signedArea, Vec2 } from '../src/fold/geometry';
import { buildTimeline, evaluateFrame, posePoint, LAYER_GAP } from '../src/fold/timeline';
import { FoldController } from '../src/app/controller';
import { interiorPiercing } from './experiment-collision';

const inside = (poly: Vec2[], p: Vec2) => poly.every((a, i) => { const b = poly[(i + 1) % poly.length]; return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x) >= -1e-10; });
const distance = (a: number[], b: number[]) => Math.hypot(...a.map((x, i) => x - b[i]));
assert.equal(recommendedSquareCm('framed-brooch'), 4.5);
for (const shape of ['square', 'rectangle'] as const) {
const x = shape === 'rectangle' ? .8 : .75, y = shape === 'rectangle' ? .65 : .75;
const width = 2*x, height = 2*y, printedWidth = 4*x-2, printedHeight = 4*y-2;
const construction = buildFramedBrooch(shape), timeline = buildTimeline(construction.ops);
assert.equal(construction.ops.length, 4);
assert(construction.ops.every(op => op.kind === 'fold' && op.folds.every(f => f.sense === 'valley' && !f.only)));
let gap = 0, lowest = Infinity, piercings = 0;
for (const [i, state] of timeline.states.entries()) {
  assert.deepEqual(checkState(state, `frame:${i}`), []);
  assert(Math.abs(state.facets.reduce((sum, f) => sum + signedArea(f.poly), 0) - 4) < 1e-10);
}
for (const op of timeline.ops) for (let i = 0; i <= 80; i++) {
  const matrix = evaluateFrame(op, i / 80);
  for (const piece of op.pieces) for (let j = 0; j < piece.poly.length; j++) {
    const a = piece.poly[j], b = piece.poly[(j + 1) % piece.poly.length];
    assert(Math.abs(distance(posePoint(matrix, piece.index * 12, a.x, a.y), posePoint(matrix, piece.index * 12, b.x, b.y)) - Math.hypot(a.x - b.x, a.y - b.y)) < 1e-9, 'Rigid facet edges must keep their lengths');
  }
  for (const h of op.hinges) for (const m of [h.m0, h.m1]) gap = Math.max(gap, distance(posePoint(matrix, h.a * 12, m.x, m.y), posePoint(matrix, h.b * 12, m.x, m.y)));
  const triangles = op.pieces.flatMap(p => p.poly.slice(1, -1).map((_, j) => ({ id: p.id, points: [p.poly[0], p.poly[j + 1], p.poly[j + 2]].map(m => posePoint(matrix, p.index * 12, m.x, m.y)) })));
  for (const p of op.pieces) for (const m of p.poly) lowest = Math.min(lowest, posePoint(matrix, p.index * 12, m.x, m.y)[2]);
  for (let a = 0; a < triangles.length; a++) for (let b = a + 1; b < triangles.length; b++) if (triangles[a].id !== triangles[b].id && interiorPiercing(triangles[a].points, triangles[b].points)) piercings++;
}
for (let i = 1; i < timeline.ops.length; i++) {
  const a = timeline.ops[i - 1], b = timeline.ops[i], A = evaluateFrame(a, 1), B = evaluateFrame(b, 0);
  for (const p of b.pieces) {
    const parent = a.pieces.find(q => inside(q.poly, centroid(p.poly))); assert(parent);
    for (const m of p.poly) assert(distance(posePoint(A, parent.index * 12, m.x, m.y), posePoint(B, p.index * 12, m.x, m.y)) < 1e-9, 'Timeline endpoints must agree');
  }
}
assert(gap <= 8 * LAYER_GAP); assert(lowest >= -1e-9); assert.equal(piercings, 0);
const final = timeline.states.at(-1)!;
const hit = (x: number, y: number) => final.facets.filter(f => { const p = modelPoly(f); return inside(signedArea(p) < 0 ? p.reverse() : p, { x, y }); }).sort((a, b) => b.rank - a.rank)[0];
assert(hit(0, 0) && !isFlipped(hit(0, 0)), 'The central printed material must remain exposed');
for (const [px, py] of [[0, (3*y-1)/2], [0, -(3*y-1)/2], [-(3*x-1)/2, 0], [(3*x-1)/2, 0]]) assert(isFlipped(hit(px, py)), 'Each of four borders must show the true reverse');
assert.equal(final.facets.filter(f => f.tags.length === 0).length, 1);
const panel = final.facets.find(f => f.tags.length === 0)!;
assert(Math.abs(signedArea(panel.poly) - width*height) < 1e-10, 'The centre is retained continuous material, not a fabricated opening');
let printed = 0, covered = 0;
for (let py = -y; py < y-1e-6; py += .01) for (let px = -x; px < x-1e-6; px += .01) { const h = hit(px + .005, py + .005); assert(h); covered++; if (!isFlipped(h)) printed++; }
assert(Math.abs(printed / covered - printedWidth*printedHeight/(width*height)) < .01, 'Real visible centre agrees with its rectangular material footprint');
const controller = new FoldController(construction.ops.length, () => 1);
for (let i = 0; i < 4; i++) { controller.next(); controller.update(2); assert.equal(controller.step, i + 1); }
for (let i = 4; i > 0; i--) { controller.prev(); controller.update(2); assert.equal(controller.step, i - 1); }
controller.next(); controller.update(.35); const pose = controller.pose(); controller.prev(); assert.deepEqual(controller.pose(), pose); controller.update(2); assert.equal(controller.step, 0);
controller.next(); controller.update(.35); controller.reset(); assert.equal(controller.step, 0); assert(!controller.moving);
console.log(JSON.stringify({ passed: true, construction: construction.name, shape, steps: 4, facets: final.facets.length, retainedMaterialArea: 4, footprint: [width, height], suggestedSquareCm: 4.5, boardFootprint: [width*.225, height*.225], visiblePrintedPanel: [printedWidth, printedHeight], boardPrintedPanel: [printedWidth*.225, printedHeight*.225], printedFraction: printed / covered, samplesPerOperation: 81, worstHingeGap: gap, minimumZ: lowest, strictTrianglePiercings: piercings, checks: ['real engine retained square and rigid edges', 'endpoint continuity and sampled hinge/floor/collision checks', 'true reverse on four borders, printed continuous centre', 'controller forward/back/mid-step reversal/reset'], limitations: ['not physical paper', 'not continuous collision certification'] }, null, 2));

}

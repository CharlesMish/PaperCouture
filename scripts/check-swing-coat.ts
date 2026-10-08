import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { buildSwingCoat } from '../src/fold/swingCoat';
import { buildGarment, garmentIdFrom, attachmentAnchors } from '../src/fold/garments';
import { recommendedSquareCm } from '../src/fold/paperSize';
import { applyFold, checkState, isFlipped, modelPoly, type SheetState } from '../src/fold/engine';
import { centroid, signedArea, type Vec2 } from '../src/fold/geometry';
import { buildTimeline, evaluateFrame, posePoint, LAYER_GAP } from '../src/fold/timeline';
import { FoldController } from '../src/app/controller';
import { creasePattern, vertexProblems } from './crease_pattern';
import { hingeProblems } from './hingeCheck';
import { interiorPiercing } from './experiment-collision';

const c = buildSwingCoat(), tl = buildTimeline(c.ops);
const inside = (poly: Vec2[], p: Vec2) => poly.every((a, i) => {
  const b = poly[(i + 1) % poly.length];
  return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x) >= -1e-10;
});
const distance = (a: number[], b: number[]) => Math.hypot(...a.map((x, i) => x - b[i]));
const visibleAt = (s: SheetState, x: number, y: number) => s.facets.filter(f => {
  const poly = modelPoly(f);
  return inside(signedArea(poly) < 0 ? poly.reverse() : poly, { x, y });
}).sort((a, b) => b.rank - a.rank)[0];
assert.equal(garmentIdFrom('swing-coat'), 'swing-coat');
assert.deepEqual(buildGarment('swing-coat'), c);
assert.equal(recommendedSquareCm('swing-coat'), 20);
assert.deepEqual(attachmentAnchors('swing-coat', 1, -.21), [], 'Do not invent attachment anchors');
assert.equal(new Set(c.ops.map(op => op.id)).size, c.ops.length);
assert(c.ops.every(op => op.kind === 'turn' || (op.kind === 'fold' && op.folds.every(f => f.sense === 'valley'))));
for (const [i, s] of tl.states.entries()) assert.deepEqual(checkState(s, `coat:${i}`), []);
let maxHingeGap = 0, maxEdgeLengthError = 0, minZ = Infinity;
const perOperation = [];
for (const op of tl.ops) {
  assert.deepEqual(hingeProblems(op), []);
  let piercings = 0, gap = 0;
  // Discrete thin-triangle diagnostic. Excludes coplanar overlaps, tangencies,
  // sheet thickness and unsampled instants: never a physical foldability proof.
  for (let k = 0; k <= 160; k++) {
    const M = evaluateFrame(op, k / 160);
    for (const p of op.pieces) for (let i = 0; i < p.poly.length; i++) {
      const a = p.poly[i], b = p.poly[(i + 1) % p.poly.length];
      const A = posePoint(M, p.index * 12, a.x, a.y), B = posePoint(M, p.index * 12, b.x, b.y);
      minZ = Math.min(minZ, A[2]);
      maxEdgeLengthError = Math.max(maxEdgeLengthError, Math.abs(distance(A, B) - Math.hypot(a.x - b.x, a.y - b.y)));
    }
    for (const h of op.hinges) for (const m of [h.m0, h.m1])
      gap = Math.max(gap, distance(posePoint(M, h.a * 12, m.x, m.y), posePoint(M, h.b * 12, m.x, m.y)));
    const triangles = op.pieces.flatMap(p => p.poly.slice(1, -1).map((_, j) => ({ id: p.id,
      points: [p.poly[0], p.poly[j + 1], p.poly[j + 2]].map(m => posePoint(M, p.index * 12, m.x, m.y)),
    })));
    for (let a = 0; a < triangles.length; a++) for (let b = a + 1; b < triangles.length; b++)
      if (triangles[a].id !== triangles[b].id && interiorPiercing(triangles[a].points, triangles[b].points)) piercings++;
  }
  assert.equal(piercings, 0, `${op.op.id}: sampled paper piercing`);
  assert(gap <= 8 * LAYER_GAP, `${op.op.id}: exceeds the existing hinge tolerance`);
  maxHingeGap = Math.max(maxHingeGap, gap);
  perOperation.push({ id: op.op.id, maxHingeGap: gap, strictTrianglePiercings: piercings });
}
assert(maxEdgeLengthError < 1e-9); assert(minZ >= -1e-9);
for (let i = 1; i < tl.ops.length; i++) {
  const a = tl.ops[i - 1], b = tl.ops[i], A = evaluateFrame(a, 1), B = evaluateFrame(b, 0);
  for (const p of b.pieces) {
    const source = a.pieces.find(q => inside(q.poly, centroid(p.poly))); assert(source);
    for (const m of p.poly) assert(distance(posePoint(A, source.index * 12, m.x, m.y), posePoint(B, p.index * 12, m.x, m.y)) < 1e-9);
  }
}
const final = tl.states.at(-1)!;
assert.deepEqual(vertexProblems(creasePattern(c)), []);
assert.equal(final.facets.reduce((sum, f) => sum + signedArea(f.poly), 0), 4);
// Both printed panels, their actual reverse facings and the backing must remain
// visible. A painted seam or a detached overlay cannot satisfy these checks.
const visibleArea: Record<string, number> = {};
for (let y = -.77; y < .95; y += .005) for (let x = -.8; x < .8; x += .005) {
  const f = visibleAt(final, x, y); if (!f) continue;
  for (const tag of f.tags) visibleArea[tag] = (visibleArea[tag] ?? 0) + .005 ** 2;
}
for (const tag of ['coat-panel-left', 'coat-panel-right', 'coat-facing-left', 'coat-facing-right', 'coat-sleeve-left', 'coat-sleeve-right'])
  assert(visibleArea[tag] > .015, `${tag} must remain visible`);
assert(isFlipped(visibleAt(final, 0, -.3)), 'opening is actual reverse-side lining');
for (const x of [-.38,.38]) assert(!isFlipped(visibleAt(final,x,-.2)), 'front panels show original print');
const sleeve = c.ops.find(op => op.id === 'coat-sleeve-left')!;
assert(sleeve.kind === 'fold');
assert.throws(() => applyFold(tl.states[5], { ...sleeve.folds[0], a: { x: -.48, y: .8 } }), /would tear/);

const points = final.facets.flatMap(modelPoly);
const width = Math.max(...points.map(p => p.x)) - Math.min(...points.map(p => p.x));
const height = Math.max(...points.map(p => p.y)) - Math.min(...points.map(p => p.y));

// Verify uninterrupted, reversed, cancelled and repeated fold control for every
// operation, including the layered hem and final turn.
for (let step = 0; step < c.ops.length; step++) {
  const ctrl = new FoldController(c.ops.length, () => 1); ctrl.jumpTo(step);
  ctrl.next(); ctrl.update(.37); const p = ctrl.pose(); ctrl.prev(); assert.deepEqual(ctrl.pose(), p);
  ctrl.update(2); assert.equal(ctrl.step, step); ctrl.next(); ctrl.next(); assert.equal(ctrl.step, step + 1);
  ctrl.prev(); ctrl.prev(); assert.equal(ctrl.step, step);
  ctrl.beginScrub(); ctrl.scrubTo(.63); ctrl.endScrub(false); ctrl.update(2); assert.equal(ctrl.step, step);
  ctrl.beginScrub(); ctrl.scrubTo(.63); ctrl.endScrub(true); ctrl.update(2); assert.equal(ctrl.step, step + 1);
  ctrl.prev(); ctrl.update(.4); ctrl.reset(); assert.equal(ctrl.step, 0); assert(!ctrl.moving);
}
const metrics = { design: 'swing-coat', operations: c.ops.length, facets: final.facets.length,
  retainedMaterialArea: final.facets.reduce((n, f) => n + signedArea(f.poly), 0), width, height,
  startingSquareCm: 20, finishedCm: { width: width * 10, height: height * 10 },
  maxHingeGap, hingeLimit: 8 * LAYER_GAP, maxEdgeLengthError, minZ,
  maxStack: Math.max(...tl.ops.flatMap(op => op.pieces.map(p => p.postZ))),
  samplesPerOperation: 161, perOperation, visibleArea, 
  limits: 'Thin rigid facets only. Coplanar overlap is intentional layering; finite layer offsets separate some shared seams. No thickness, continuous collision or physical-paper certification.',
};
console.log(JSON.stringify(metrics, null, 2));
if (process.argv.includes('--dump')) {
  mkdirSync('docs/swing-coat/evidence', { recursive: true });
  writeFileSync('docs/swing-coat/evidence/geometry.json', JSON.stringify(metrics, null, 2) + '\n');
}

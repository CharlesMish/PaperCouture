import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { buildGarment } from '../src/fold/garments';
import { checkState } from '../src/fold/engine';
import { buildTimeline, evaluateFrame, posePoint, LAYER_GAP } from '../src/fold/timeline';
import { FoldController } from '../src/app/controller';
import { hingeProblems } from './hingeCheck';
import { interiorPiercing } from './experiment-collision';

const hash = (x: unknown) => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const frozen = JSON.parse(readFileSync(new URL('../docs/fit-flare/fixtures/pr28-resting.json', import.meta.url), 'utf8'));
const tl = buildTimeline(buildGarment('fit-flare').ops);
assert.deepEqual(tl.states.map(hash), frozen.states, 'Keep every authored flat state');
for (const [i, op] of tl.ops.entries()) {
  assert.deepEqual(checkState(tl.states[i], `fit-flare:${i}`), []);
  assert.equal(hash(Array.from(evaluateFrame(op, 0))), frozen.ops[i].start, `${op.op.id}: preserve entry pose`);
  assert.equal(hash(Array.from(evaluateFrame(op, 1))), frozen.ops[i].end, `${op.op.id}: preserve exit pose`);
  assert.deepEqual(hingeProblems(op), []);
}
// A constant tear must fail, even when its rest and motion gaps are identical.
for (const op of [buildTimeline(buildGarment('dress').ops).ops[0], tl.ops[4]]) {
  const index = op.hinges[0].a;
  const torn = { ...op, pieces: op.pieces.map(p => p.index === index ? { ...p, preZ: p.preZ + .5, postZ: p.postZ + .5 } : p) };
  assert(hingeProblems(torn, 2).some(e => e.includes('absolute hinge gap')));
}

const report: object[] = [];
for (const op of tl.ops.slice(4)) {
  let maxGap = 0, maxStretch = 0, minZ = Infinity, piercings = 0, float32Piercings = 0, maxPoseStep = 0;
  let previous: Float64Array | undefined;
  const times = [...new Set([0, 1e-6, 1e-5, 1e-4, .001, ...Array.from({ length: 1001 }, (_, k) => k / 1000), .9999, .99999, .999999])].sort((a, b) => a - b);
  const durations: number[] = [];
  for (const t of times) {
    const start = performance.now(), M = evaluateFrame(op, t); durations.push(performance.now() - start);
    if (previous) for (let i = 0; i < M.length; i++) maxPoseStep = Math.max(maxPoseStep, Math.abs(M[i] - previous[i]));
    previous = M;
    for (const p of op.pieces) for (let i = 0; i < p.poly.length; i++) {
      const a = p.poly[i], b = p.poly[(i + 1) % p.poly.length];
      const A = posePoint(M, p.index * 12, a.x, a.y), B = posePoint(M, p.index * 12, b.x, b.y);
      minZ = Math.min(minZ, A[2]);
      maxStretch = Math.max(maxStretch, Math.abs(Math.hypot(...A.map((v, j) => v - B[j])) - Math.hypot(a.x - b.x, a.y - b.y)));
    }
    for (const h of op.hinges) for (const m of [h.m0, h.m1]) {
      const a = posePoint(M, h.a * 12, m.x, m.y), b = posePoint(M, h.b * 12, m.x, m.y);
      maxGap = Math.max(maxGap, Math.hypot(...a.map((v, i) => v - b[i])));
    }
    const triangles = op.pieces.flatMap(p => p.poly.slice(1, -1).map((_, j) => ({ id: p.index,
      points: [p.poly[0], p.poly[j + 1], p.poly[j + 2]].map(m => posePoint(M, p.index * 12, m.x, m.y)),
    })));
    const rounded = triangles.map(tri => tri.points.map(p => p.map(Math.fround) as [number, number, number]));
    for (let a = 0; a < triangles.length; a++) for (let b = a + 1; b < triangles.length; b++) if (triangles[a].id !== triangles[b].id) {
      if (interiorPiercing(triangles[a].points, triangles[b].points)) piercings++;
      if (interiorPiercing(rounded[a], rounded[b])) float32Piercings++;
    }
  }
  assert.equal(piercings, 0, `${op.op.id}: rigid panel intersection`);
  assert.equal(float32Piercings, 0, `${op.op.id}: intersection after renderer precision conversion`);
  assert(maxGap <= 12 * LAYER_GAP + 1e-9); assert(maxStretch < 1e-9); assert(minZ >= -1e-9);
  assert(maxPoseStep < .012, `${op.op.id}: discontinuous sampled motion`);
  // A reset/back/scrub must not carry offset-solver state into the next frame.
  for (const t of [.1, .34, .455, .75, .95]) {
    const forward = evaluateFrame(op, t); evaluateFrame(op, .99); evaluateFrame(op, .001);
    assert.deepEqual(evaluateFrame(op, t), forward);
  }
  const held = evaluateFrame(op, .455), expected = held.slice();
  held.fill(NaN);
  assert.deepEqual(evaluateFrame(op, .455), expected, 'Output mutation must not corrupt the held-pose cache');
  const reused = new Float64Array(expected.length);
  assert.equal(evaluateFrame(op, .455, reused), reused);
  assert.deepEqual(reused, expected);
  durations.sort((a, b) => a - b);
  report.push({ id: op.op.id, samples: times.length, piercings, float32Piercings, maxGap, absoluteLimit: 12 * LAYER_GAP,
    maxStretch, minZ, maxPoseStep, evaluateFrameMedianMs: durations[Math.floor(durations.length / 2)], evaluateFrameP95Ms: durations[Math.floor(durations.length * .95)] });
}
const c = new FoldController(tl.ops.length, () => 1);
for (let repeat = 0; repeat < 3; repeat++) {
  c.reset();
  for (let k = 0; k < c.count; k++) { c.next(); c.update(.4); const pose = c.pose(); c.prev(); assert.deepEqual(c.pose(), pose); c.update(1); assert.equal(c.step, k); c.next(); c.update(1); }
  for (let k = c.count; k > 0; k--) { c.prev(); c.update(1); assert.equal(c.step, k - 1); }
}
const result = { frozenSource: frozen.source, unchangedRestingPoses: true, constantGapMutationsRejected: true, operations: report,
  limits: 'Discrete thin-panel tests, including Float32 rendering precision. Excludes coplanar contacts, tangencies, finite paper thickness and unsampled instants; not physical foldability certification.' };
if (process.env.FIT_FLARE_REPORT) { mkdirSync(dirname(process.env.FIT_FLARE_REPORT), { recursive: true }); writeFileSync(process.env.FIT_FLARE_REPORT, JSON.stringify(result, null, 2)); }
console.log(JSON.stringify(result, null, 2));

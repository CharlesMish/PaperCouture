// Focused geometry gate: node --import tsx scripts/check-dress-jacket.ts
// --dump writes actual posed facets for the companion study renderer.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { buildSilhouette, SILHOUETTES, SLEEVES } from '../src/fold/silhouettes';
import { buildJacket, JACKET_LENGTHS } from '../src/fold/jacket';
import { Construction } from '../src/fold/construction';
import { checkState, modelPoly, isFlipped } from '../src/fold/engine';
import { buildTimeline, evaluateFrame, posePoint, LAYER_GAP, Timeline } from '../src/fold/timeline';
import { Vec2, centroid } from '../src/fold/geometry';

const root = new URL('../docs/geometry-collection/dress-jacket/', import.meta.url);
const baseline = JSON.parse(readFileSync(new URL('baseline-hashes.json', root), 'utf8')) as {
  dress: Record<string, string>; jacket: string;
};
const stateData = (t: Timeline) => t.states.map(s => s.facets.map(({ id: _id, ...f }) => f));
const fingerprint = (t: Timeline) => createHash('sha256').update(JSON.stringify(stateData(t))).digest('hex');
const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const inside = (poly: Vec2[], p: Vec2) => poly.every((a, i) => {
  const b = poly[(i + 1) % poly.length];
  return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x) >= -1e-10;
});

function validate(c: Construction, name: string) {
  const t = buildTimeline(c.ops);
  for (const [i, state] of t.states.entries()) assert.deepEqual(checkState(state, `${name} state ${i}`), []);
  let worstGap = 0, lowestZ = Infinity;
  for (const op of t.ops) {
    for (let n = 0; n <= 20; n++) {
      const frame = evaluateFrame(op, n / 20);
      for (const h of op.hinges) for (const m of [h.m0, h.m1]) {
        worstGap = Math.max(worstGap, dist(posePoint(frame, h.a * 12, m.x, m.y), posePoint(frame, h.b * 12, m.x, m.y)));
      }
      for (const piece of op.pieces) for (const m of piece.poly) {
        const point = posePoint(frame, piece.index * 12, m.x, m.y);
        assert(point.every(Number.isFinite), `${name}: non-finite animation`);
        lowestZ = Math.min(lowestZ, point[2]);
      }
    }
  }
  assert(worstGap <= 8 * LAYER_GAP, `${name}: sampled hinge separation ${worstGap}`);
  assert(lowestZ >= -1e-9, `${name}: below-table paper ${lowestZ}`);
  for (let i = 0; i + 1 < t.ops.length; i++) {
    const a = t.ops[i], b = t.ops[i + 1], fa = evaluateFrame(a, 1), fb = evaluateFrame(b, 0);
    for (const p of b.pieces) {
      const parent = a.pieces.find(q => inside(q.poly, centroid(p.poly)));
      assert(parent, `${name}: missing source at step ${i + 1}`);
      for (const m of p.poly) assert(dist(posePoint(fa, parent.index * 12, m.x, m.y), posePoint(fb, p.index * 12, m.x, m.y)) < 1e-9, `${name}: step-boundary teleport`);
    }
  }
  const final = t.states[t.states.length - 1];
  const polys = final.facets.map(f => ({ poly: modelPoly(f), flipped: isFlipped(f), rank: f.rank }));
  const xs = polys.flatMap(f => f.poly.map(p => p.x)), ys = polys.flatMap(f => f.poly.map(p => p.y));
  const record = { name, steps: t.ops.length, width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys), facets: final.facets.length, worstGap, lowestZ, polys };
  console.log(`${name}: ${record.width.toFixed(3)} x ${record.height.toFixed(3)}, ${record.facets} facets; hinge ${worstGap.toFixed(4)}`);
  return { t, record };
}

const records = [];
for (const shape of SILHOUETTES) {
  const classic = buildSilhouette(shape.id);
  for (const sleeve of SLEEVES) {
    const c = buildSilhouette(shape.id, sleeve.id);
    // A choice is made before op 'sleeves'; every earlier operation and resting
    // state must be genuinely identical, not just have matching step counts.
    const decision = c.ops.findIndex(op => op.id === 'sleeves');
    assert.equal(decision, 3);
    assert.deepEqual(c.ops.slice(0, decision), classic.ops.slice(0, decision));
    const { t, record } = validate(c, `${shape.name} / ${sleeve.name}`);
    assert.deepEqual(stateData(t).slice(0, decision + 1), stateData(buildTimeline(classic.ops)).slice(0, decision + 1));
    if (sleeve.id === 'classic') assert.equal(fingerprint(t), baseline.dress[shape.id], `${shape.id}: default construction changed`);
    // The existing side-fold decision remains safe regardless of sleeve choice.
    assert.deepEqual(c.ops.slice(0, 2), buildSilhouette('classic').ops.slice(0, 2));
    assert.equal(c.ops[4].id, 'hem');
    assert(t.ops[4].pieces.some(p => p.spec >= 0), `${shape.id}: hem lost its moving pieces`);
    records.push(record);
  }
}
const cropped = buildJacket();
for (const length of JACKET_LENGTHS) {
  const c = buildJacket(length.id), decision = c.ops.findIndex(op => op.id === 'jacket-hem');
  assert.equal(decision, 4);
  assert.deepEqual(c.ops.slice(0, decision), cropped.ops.slice(0, decision));
  const { t, record } = validate(c, `Box jacket / ${length.name}`);
  assert.deepEqual(stateData(t).slice(0, decision + 1), stateData(buildTimeline(cropped.ops)).slice(0, decision + 1));
  if (length.id === 'cropped') assert.equal(fingerprint(t), baseline.jacket, 'default jacket construction changed');
  records.push(record);
}
if (process.argv.includes('--dump')) writeFileSync(new URL('geometry-results.json', root), JSON.stringify(records, null, 2) + '\n');
console.log(`Passed ${records.length} constructions, default parity, decision prefixes, retained material, rigidity, connectivity, endpoints and sampled motion.`);

// Run by hand:  node --import tsx experiments/placement/validate-refolds.ts
//
// The candidate refolds are sketches outside the app, so `npm test` does not see
// them. This applies the gates scripts/check-drafts.ts applies to a draft fold:
// every state passes the engine's own checks, paper stays above the table at 21
// samples of every step (the hinge stack is measured and reported), steps join without a jump, every
// fold comes up toward the viewer, and the whole square is still there at the end.
// It also prints the repository's physical-risk metrics for each. None of this
// shows that a sketch folds well in real paper.
import assert from 'node:assert/strict';
import type { Construction } from '../../src/fold/construction';
import { checkState, modelPoly } from '../../src/fold/engine';
import { Vec2, centroid, signedArea } from '../../src/fold/geometry';
import { buildTimeline, evaluateFrame, posePoint, LAYER_GAP } from '../../src/fold/timeline';
import { foldMetrics } from '../../scripts/foldMetrics';
import { REFOLDS, bootWithCuff } from './refolds';

const dist = (a: number[], b: number[]) => Math.hypot(...a.map((v, i) => v - b[i]));
const insideConvex = (poly: Vec2[], p: Vec2) => {
  const ccw = signedArea(poly) < 0 ? poly.slice().reverse() : poly;
  return ccw.every((a, i) => {
    const b = ccw[(i + 1) % ccw.length];
    return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x) >= -1e-10;
  });
};

function validate(c: Construction) {
  const t = buildTimeline(c.ops);
  for (const [i, s] of t.states.entries()) assert.deepEqual(checkState(s, `${c.name} state ${i}`), []);
  let worstGap = 0, lowestZ = Infinity;
  for (const op of t.ops) for (let n = 0; n <= 20; n++) {
    const M = evaluateFrame(op, n / 20);
    for (const h of op.hinges) for (const m of [h.m0, h.m1]) worstGap = Math.max(worstGap, dist(posePoint(M, h.a * 12, m.x, m.y), posePoint(M, h.b * 12, m.x, m.y)));
    for (const p of op.pieces) for (const m of p.poly) lowestZ = Math.min(lowestZ, posePoint(M, p.index * 12, m.x, m.y)[2]);
  }
  assert(lowestZ >= -1e-9, `${c.name}: paper below the table ${lowestZ}`);
  for (let k = 0; k + 1 < t.ops.length; k++) {
    const A = t.ops[k], B = t.ops[k + 1], MA = evaluateFrame(A, 1), MB = evaluateFrame(B, 0);
    for (const p of B.pieces) {
      const prior = A.pieces.find(q => insideConvex(q.poly, centroid(p.poly)));
      assert(prior, `${c.name}: no material source at step ${k + 1}`);
      for (const m of p.poly) assert(dist(posePoint(MA, prior.index * 12, m.x, m.y), posePoint(MB, p.index * 12, m.x, m.y)) < 1e-9, `${c.name}: jump between steps ${k} and ${k + 1}`);
    }
  }
  assert(c.ops.every(op => op.kind === 'turn' || (op.kind === 'fold' && op.folds.every(f => f.sense === 'valley'))), `${c.name}: every fold should come up toward the viewer`);
  const final = t.states.at(-1)!;
  const area = final.facets.reduce((sum, f) => sum + Math.abs(signedArea(f.poly)), 0);
  assert(Math.abs(area - 4) < 1e-9, `${c.name}: retained material ${area}`);
  const pts = final.facets.flatMap(f => modelPoly(f));
  return { gap: worstGap / LAYER_GAP, steps: c.ops.length, facets: final.facets.length, width: Math.max(...pts.map(p => p.x)) - Math.min(...pts.map(p => p.x)), height: Math.max(...pts.map(p => p.y)) - Math.min(...pts.map(p => p.y)) };
}

const SQUARE_CM: Record<string, number> = { 'boot-cuff': 8, 'top-sleeves': 16, 'hat-band': 8, trousers: 20 }; // the current folds' suggested squares
for (const c of [...REFOLDS.map(r => ({ id: r.id, c: r.build() })), { id: 'boot-cuff', c: bootWithCuff('right') }]) {
  const v = validate(c.c), m = foldMetrics(c.c, SQUARE_CM[c.id]);
  // The simple outfit and companion folds are held to a hinge stack of 8 layer gaps. Reported, not asserted:
  // a sketch over the limit is a thicker fold than its neighbours, which is for a person to weigh.
  const thick = v.gap > 8 + 1e-9 ? ` · OVER the 8-gap draft limit` : '';
  console.log(`${c.c.name}: ${v.steps} steps, ${v.facets} facets, ${v.width.toFixed(2)} × ${v.height.toFixed(2)}, hinge stack ${v.gap.toFixed(1)} layer gaps${thick}; at ${SQUARE_CM[c.id]} cm: ${JSON.stringify(m)}`);
}
console.log('Refold sketches pass the draft gates other than the hinge-stack limit where marked. Not folded in physical paper.');

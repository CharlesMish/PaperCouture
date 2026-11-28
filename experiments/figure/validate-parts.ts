// Run by hand:  node --import tsx experiments/figure/validate-parts.ts
//
// The worn body and the sleeves are sketches outside the app, so `npm test` does
// not see them. This applies the gates scripts/check-drafts.ts applies to a draft
// fold (engine state checks, table clearance at 21 samples of every step, steps
// that join without a jump, valley folds only, the whole square kept) at each of
// the three front openings, and prints the hinge stack and fold metrics. It does
// not show that any of them folds well in real paper.
import assert from 'node:assert/strict';
import type { Construction } from '../../src/fold/construction';
import { checkState, modelPoly } from '../../src/fold/engine';
import { Vec2, centroid, signedArea } from '../../src/fold/geometry';
import { buildTimeline, evaluateFrame, posePoint, LAYER_GAP } from '../../src/fold/timeline';
import { foldMetrics } from '../../scripts/foldMetrics';
import { BODY, SQUARES, sleeve, wornBody } from './parts';

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
  assert(Math.abs(final.facets.reduce((sum, f) => sum + Math.abs(signedArea(f.poly)), 0) - 4) < 1e-9, `${c.name}: material lost`);
  const pts = final.facets.flatMap(f => modelPoly(f));
  return { gap: worstGap / LAYER_GAP, folds: c.ops.filter(o => o.kind === 'fold').length, width: Math.max(...pts.map(p => p.x)) - Math.min(...pts.map(p => p.x)), height: Math.max(...pts.map(p => p.y)) - Math.min(...pts.map(p => p.y)) };
}
const report = (label: string, c: Construction, cm: number) => {
  const v = validate(c), m = foldMetrics(c, cm);
  console.log(`${label}: ${v.folds} folds, ${(v.width * cm / 2).toFixed(1)} × ${(v.height * cm / 2).toFixed(1)} cm from a ${cm} cm square, hinge stack ${v.gap.toFixed(1)} layer gaps${v.gap > 8 + 1e-9 ? ' (over the 8 the simple folds are held to)' : ''}, most layers ${m.layers.max}, shortest crease ${m.shortestCreaseMm} mm, narrowest facet ${m.narrowestFacetMm} mm`);
};
for (const lean of [21, 26, 31]) report(`Worn body, fronts at ${lean}°`, wornBody({ ...BODY, lean }), SQUARES.body);
report('Sleeve', sleeve('left'), SQUARES.sleeve);
report('Sleeve, mirrored', sleeve('right'), SQUARES.sleeve);
console.log('The worn parts pass the draft gates other than the hinge-stack limit where marked. Not folded in physical paper.');

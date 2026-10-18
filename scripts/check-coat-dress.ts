// Coat-dress checks: registration, rigid motion of both collapses, continuity,
// the finished crease pattern, what each colourway shows, and physical-risk
// measurements the general suite does not make (paper layers stacked at a
// point, the sharpest crease angle, the shortest crease and smallest facet in
// millimetres at the suggested square). Run: npm run check:coat-dress
// (--dump writes docs/coat-dress/evidence/geometry.json).
//
// None of this certifies physical foldability: the facets are thin and rigid,
// motion is sampled, and paper thickness, springback and handling are not
// modelled. It bounds the risks a physical test fold has to confirm.

import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { buildCoatDress, coatDressGeometry, coatShoulderSpec, coatWaistSpec, shoulderRate, DEFAULT_COAT_DRESS, type CoatSide } from '../src/fold/coatDress';
import { DEFAULT_OPTIONS, garmentDecisions, decisionStep, sharedFoldPrefix } from '../src/fold/garmentOptions';
import { buildGarment, garmentIdFrom, attachmentAnchors, garmentExperiment } from '../src/fold/garments';
import { recommendedSquareCm } from '../src/fold/paperSize';
import { checkState, isFlipped, modelPoly, type SheetState } from '../src/fold/engine';
import { planCollapse, collapseAngles, loopResidual } from '../src/fold/collapse';
import { centroid, signedArea, type Vec2 } from '../src/fold/geometry';
import { buildTimeline, evaluateFrame, posePoint, LAYER_GAP } from '../src/fold/timeline';
import { FoldController } from '../src/app/controller';
import { creasePattern, vertexProblems } from './crease_pattern';
import { foldMetrics } from './foldMetrics';
import { hingeProblems } from './hingeCheck';
import { interiorPiercing } from './experiment-collision';

const SQUARE_CM = recommendedSquareCm('coat-dress');
const MM_PER_UNIT = (SQUARE_CM * 10) / 2; // the sheet is two model units wide
const inside = (poly: Vec2[], p: Vec2) => poly.every((a, i) => {
  const b = poly[(i + 1) % poly.length];
  return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x) >= -1e-10;
});
const ccw = (poly: Vec2[]) => (signedArea(poly) < 0 ? poly.slice().reverse() : poly);
const distance = (a: number[], b: number[]) => Math.hypot(...a.map((x, i) => x - b[i]));
const covering = (s: SheetState, x: number, y: number) => s.facets.filter((f) => inside(ccw(modelPoly(f)), { x, y }));
const topAt = (s: SheetState, x: number, y: number) => covering(s, x, y).sort((a, b) => b.rank - a.rank)[0];
const bottomAt = (s: SheetState, x: number, y: number) => covering(s, x, y).sort((a, b) => a.rank - b.rank)[0];
/** Which side of the paper faces the viewer at a point: the print or the reverse. */
const frontFace = (s: SheetState, x: number, y: number) => (isFlipped(topAt(s, x, y)) ? 'reverse' : 'print');
const backFace = (s: SheetState, x: number, y: number) => (isFlipped(bottomAt(s, x, y)) ? 'print' : 'reverse');

// --- registration
assert.equal(garmentIdFrom('coat-dress'), 'coat-dress');
assert.equal(DEFAULT_OPTIONS.coatSide, DEFAULT_COAT_DRESS.coat);
assert.deepEqual(buildGarment('coat-dress'), buildCoatDress());
assert.deepEqual(buildGarment('coat-dress', { ...DEFAULT_OPTIONS, coatSide: 'print' }), buildCoatDress({ ...DEFAULT_COAT_DRESS, coat: 'print' }));
assert.equal(SQUARE_CM, 20);
assert.deepEqual(attachmentAnchors('coat-dress', 1, -1), [], 'Do not invent attachment anchors');
assert(garmentExperiment('coat-dress'), 'the coat-dress is listed as an experiment');
const [decision] = garmentDecisions('coat-dress');
assert.equal(decision.id, 'coatSide');
const print = buildCoatDress({ ...DEFAULT_COAT_DRESS, coat: 'print' });
const reverse = buildCoatDress({ ...DEFAULT_COAT_DRESS, coat: 'reverse' });
assert.equal(decisionStep(print, decision), 1);
assert.equal(decisionStep(reverse, decision), 1);
// only the shared turn-over is retained when the coat colour changes: the
// collapses share ids but fold the opposite way
assert.equal(sharedFoldPrefix(print, reverse), 1);

// --- closed-form fold rates: every crease loop of both collapses closes at every sample
let worstLoop = 0;
for (const coat of ['print', 'reverse'] as CoatSide[]) {
  const p = { ...DEFAULT_COAT_DRESS, coat };
  for (const spec of [coatShoulderSpec(p), coatWaistSpec(p)]) {
    const plan = planCollapse(spec);
    for (let k = 1; k < 200; k++) for (const r of loopResidual(plan, collapseAngles(spec, k / 200))) worstLoop = Math.max(worstLoop, r.error);
  }
}
assert(worstLoop < 1e-9, `collapse loops must close (worst ${worstLoop})`);
// the shoulder rate formula holds over the useful range, not just at the default
for (const collar of [110, 120, 130, 140]) for (const flare of [0, 3, 5, 7]) {
  const p = { ...DEFAULT_COAT_DRESS, collar, flare };
  const spec = coatShoulderSpec(p);
  const plan = planCollapse(spec);
  for (const e of [0.2, 0.5, 0.8]) for (const r of loopResidual(plan, collapseAngles(spec, e))) {
    assert(r.error < 1e-9, `shoulder vertex collar=${collar} flare=${flare}: ${r.crease} does not close (${r.error})`);
  }
  assert(shoulderRate(p) > 0);
}

// --- motion, continuity and the finished paper, for both colourways
const perColourway: Record<string, unknown> = {};
const finals: Record<string, SheetState> = {};
for (const [coat, c] of [['reverse', reverse], ['print', print]] as const) {
  const tl = buildTimeline(c.ops);
  for (const [i, s] of tl.states.entries()) assert.deepEqual(checkState(s, `coat-dress ${coat}:${i}`), []);
  let maxHingeGap = 0, maxEdgeLengthError = 0, minZ = Infinity;
  const perOperation = [];
  for (const op of tl.ops) {
    assert.deepEqual(hingeProblems(op), []);
    let piercings = 0, gap = 0;
    // Discrete thin-triangle diagnostic: excludes coplanar overlaps, tangency,
    // paper thickness and unsampled instants.
    for (let k = 0; k <= 160; k++) {
      const M = evaluateFrame(op, k / 160);
      for (const p of op.pieces) for (let i = 0; i < p.poly.length; i++) {
        const a = p.poly[i], b = p.poly[(i + 1) % p.poly.length];
        const A = posePoint(M, p.index * 12, a.x, a.y), B = posePoint(M, p.index * 12, b.x, b.y);
        minZ = Math.min(minZ, A[2]);
        maxEdgeLengthError = Math.max(maxEdgeLengthError, Math.abs(distance(A, B) - Math.hypot(a.x - b.x, a.y - b.y)));
      }
      for (const h of op.hinges) for (const m of [h.m0, h.m1]) gap = Math.max(gap, distance(posePoint(M, h.a * 12, m.x, m.y), posePoint(M, h.b * 12, m.x, m.y)));
      const triangles = op.pieces.flatMap((p) => p.poly.slice(1, -1).map((_, j) => ({
        id: p.id,
        points: [p.poly[0], p.poly[j + 1], p.poly[j + 2]].map((m) => posePoint(M, p.index * 12, m.x, m.y)),
      })));
      for (let a = 0; a < triangles.length; a++) for (let b = a + 1; b < triangles.length; b++) {
        if (triangles[a].id !== triangles[b].id && interiorPiercing(triangles[a].points, triangles[b].points)) piercings++;
      }
    }
    assert.equal(piercings, 0, `${coat} ${op.op.id}: sampled paper piercing`);
    maxHingeGap = Math.max(maxHingeGap, gap);
    perOperation.push({ id: op.op.id, maxHingeGap: gap, hingeGapInLayers: gap / LAYER_GAP, strictTrianglePiercings: piercings });
  }
  assert(maxEdgeLengthError < 1e-9, `${coat}: facets must stay rigid`);
  assert(minZ >= -1e-9, `${coat}: paper dips below the table`);
  for (let i = 1; i < tl.ops.length; i++) {
    const a = tl.ops[i - 1], b = tl.ops[i], A = evaluateFrame(a, 1), B = evaluateFrame(b, 0);
    for (const p of b.pieces) {
      const source = a.pieces.find((q) => inside(q.poly, centroid(p.poly)));
      assert(source, `${coat}: step ${i} piece has no source`);
      for (const m of p.poly) assert(distance(posePoint(A, source.index * 12, m.x, m.y), posePoint(B, p.index * 12, m.x, m.y)) < 1e-9, `${coat}: jump between steps ${i} and ${i + 1}`);
    }
  }
  const final = tl.states.at(-1)!;
  finals[coat] = final;
  assert.deepEqual(vertexProblems(creasePattern(c)), [], `${coat}: crease pattern must pass Maekawa and Kawasaki`);
  assert(Math.abs(final.facets.reduce((sum, f) => sum + signedArea(f.poly), 0) - 4) < 1e-9, 'all paper retained');

  // What the coat shows. The coat (fronts) and its collar show opposite sides
  // of the paper; the underskirt in the opening matches the collar.
  const g = coatDressGeometry({ ...DEFAULT_COAT_DRESS, coat });
  const other = coat === 'print' ? 'reverse' : 'print';
  // with the skirt fixed, the waist pleat lowers everything above it by twice its depth
  const drop = 2 * (g.W1.y - g.W2.y);
  const Vf = { x: g.V.x, y: g.V.y - drop };
  const overSleeve = (sx: number) => ({ x: sx * (Vf.x + 0.12 * Math.cos((255 * Math.PI) / 180)), y: Vf.y + 0.12 * Math.sin((255 * Math.PI) / 180) });
  const hemY = -0.85, waistY = (g.W1.y + g.W2.y) / 2 - 0.05;
  for (const sx of [-1, 1]) {
    assert.equal(frontFace(final, sx * 0.45, hemY), coat, `${coat}: front panel at the hem`);
    assert.equal(frontFace(final, sx * 0.25, waistY), coat, `${coat}: front panel below the waist`);
    const q = overSleeve(sx);
    assert.equal(frontFace(final, q.x, q.y), other, `${coat}: collar over the shoulder`);
    assert(topAt(final, q.x, q.y).tags.some((t) => t.startsWith('collar-')), `${coat}: the collar is the top layer over the shoulder`);
    assert(covering(final, q.x, q.y).some((f) => f.tags.some((t) => t.startsWith('sleeve-'))), `${coat}: a sleeve lies under the collar`);
  }
  assert.equal(frontFace(final, 0, hemY), other, `${coat}: underskirt shows in the opening`);
  assert(!topAt(final, 0, hemY).tags.some((t) => t.startsWith('front-')), `${coat}: the opening shows the back panel, not a front`);
  // the back: the yoke across the shoulders, the coat colour below it
  assert.equal(backFace(final, 0, Vf.y - 0.1), other, `${coat}: back yoke`);
  assert(bottomAt(final, 0, Vf.y - 0.1).tags.includes('yoke'), `${coat}: the yoke is the back layer across the shoulders`);
  assert.equal(backFace(final, 0, hemY), coat, `${coat}: back of the coat`);

  // --- physical-risk measurements (scripts/foldMetrics.ts)
  const fm = foldMetrics(c, SQUARE_CM);
  perColourway[coat] = {
    operations: c.ops.length, facets: final.facets.length, ...fm,
    maxHingeGap, hingeLimit: 12 * LAYER_GAP, maxEdgeLengthError, minZ, perOperation,
    waistPleatMm: +((g.W1.y - g.W2.y) * MM_PER_UNIT).toFixed(2),
    collarDepthMm: +((g.V.y - g.collarLow) * MM_PER_UNIT).toFixed(2),
  };
  // Bounds a physical fold has to tolerate, set by what the collection already
  // asks of paper (npm run fold-metrics prints every design): the fit-and-flare
  // stacks 12 layers at its waist corners and has a 0.28 mm crease; the pleated
  // skirt and necktie fold 11 degree wedges. The coat-dress's sharpest angle is
  // the hem corner between the leaning seam and the skirt's side crease.
  assert(fm.layers.max <= 12, `${coat}: ${fm.layers.max} layers at one point exceeds the fit-and-flare's 12`);
  assert(fm.sharpestCreaseAngleDeg >= 9, `${coat}: a ${fm.sharpestCreaseAngleDeg} degree crease angle is sharper than any existing design`);
  assert(fm.shortestCreaseMm >= 0.28, `${coat}: a ${fm.shortestCreaseMm} mm crease is shorter than any existing design's`);
  assert(fm.narrowestFacetMm >= 1.5, `${coat}: a ${fm.narrowestFacetMm} mm facet is too narrow to fold at ${SQUARE_CM} cm`);

  // forward, reverse, cancelled and repeated controls for every step
  for (let s = 0; s < c.ops.length; s++) {
    const ctrl = new FoldController(c.ops.length, () => 1); ctrl.jumpTo(s);
    ctrl.next(); ctrl.update(0.37); const pose = ctrl.pose(); ctrl.prev(); assert.deepEqual(ctrl.pose(), pose);
    ctrl.update(2); assert.equal(ctrl.step, s); ctrl.next(); ctrl.next(); assert.equal(ctrl.step, s + 1);
    ctrl.prev(); ctrl.prev(); assert.equal(ctrl.step, s);
    ctrl.beginScrub(); ctrl.scrubTo(0.63); ctrl.endScrub(false); ctrl.update(2); assert.equal(ctrl.step, s);
    ctrl.beginScrub(); ctrl.scrubTo(0.63); ctrl.endScrub(true); ctrl.update(2); assert.equal(ctrl.step, s + 1);
    ctrl.prev(); ctrl.update(0.4); ctrl.reset(); assert.equal(ctrl.step, 0); assert(!ctrl.moving);
  }
}

// both colourways fold the same paper to the same outline
const outline = (s: SheetState) => s.facets.map((f) => ({ c: centroid(modelPoly(f)), a: Math.abs(signedArea(f.poly)) }))
  .map(({ c, a }) => `${c.x.toFixed(6)},${c.y.toFixed(6)},${a.toFixed(6)}`).map((k) => k.replace(/-0\.000000/g, '0.000000')).sort();
const mirrorX = (s: SheetState) => outline({ facets: s.facets.map((f) => ({ ...f, poly: f.poly.map((p) => ({ x: -p.x, y: p.y })) })) } as SheetState);
const same = JSON.stringify(outline(finals.print)) === JSON.stringify(outline(finals.reverse))
  || JSON.stringify(outline(finals.print)) === JSON.stringify(mirrorX(finals.reverse));
assert(same, 'the two colourways must fold the same paper to the same place');

const g = coatDressGeometry();
const metrics = {
  design: 'coat-dress', startingSquareCm: SQUARE_CM, params: DEFAULT_COAT_DRESS,
  shoulderVertex: { collarDeg: g.c1, neckCreaseDeg: g.c2, seamDeg: g.seamDir, rate: shoulderRate(DEFAULT_COAT_DRESS) },
  waist: { pleat: g.W1.y - g.W2.y, skirtFlareDeg: (g.d2 * 180) / Math.PI, bodiceNarrowingDeg: (g.d1 * 180) / Math.PI },
  worstCollapseLoopResidual: worstLoop, samplesPerOperation: 161, colourways: perColourway,
  limits: 'Thin rigid facets, sampled motion. Layer counts are paper layers stacked at a point, not rendering offsets. No paper thickness, springback, continuous-collision or physical-paper certification.',
};
console.log(JSON.stringify(metrics, null, 2));
if (process.argv.includes('--dump')) {
  mkdirSync('docs/coat-dress/evidence', { recursive: true });
  writeFileSync('docs/coat-dress/evidence/geometry.json', JSON.stringify(metrics, null, 2) + '\n');
}
console.log('coat-dress checks passed');

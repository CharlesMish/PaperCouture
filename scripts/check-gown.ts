// One-shoulder gown checks: registration and the colour choice, rigid motion
// of the waist collapse, continuity, the finished crease pattern, what each
// colourway shows where (sash, neckline, cap sleeve, hem band, back), and the
// physical-risk measurements (paper layers stacked at a point, the sharpest
// crease angle, the shortest crease and narrowest facet in millimetres at the
// suggested square). Run: npm run check:gown (--dump writes
// docs/gown/evidence/geometry.json).
//
// None of this certifies physical foldability: the facets are thin and rigid,
// motion is sampled, and paper thickness, springback and handling are not
// modelled. It bounds the risks a physical test fold has to confirm.

import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { buildGown, gownGeometry, gownWaistSpec, DEFAULT_GOWN, type GownSide } from '../src/fold/gown';
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

const SQUARE_CM = recommendedSquareCm('gown');
const MM_PER_UNIT = (SQUARE_CM * 10) / 2; // the sheet is two model units wide
// See hingeCheck.ts: the sash wraps from the top of the front stack to the
// bottom of the back stack at the left side seam (16 rendered levels apart).
const RENDERED_LEVELS = 16;
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

// --- registration and the colour choice
assert.equal(garmentIdFrom('gown'), 'gown');
assert.equal(DEFAULT_OPTIONS.gownSide, DEFAULT_GOWN.side);
assert.deepEqual(buildGarment('gown'), buildGown());
assert.deepEqual(buildGarment('gown', { ...DEFAULT_OPTIONS, gownSide: 'reverse' }), buildGown({ ...DEFAULT_GOWN, side: 'reverse' }));
assert.equal(SQUARE_CM, 20);
assert.deepEqual(attachmentAnchors('gown', 1, -1), [], 'Do not invent attachment anchors');
assert(garmentExperiment('gown'), 'the gown is listed as an experiment');
const [decision] = garmentDecisions('gown');
assert.equal(decision.id, 'gownSide');
const print = buildGown({ ...DEFAULT_GOWN, side: 'print' });
const reverse = buildGown({ ...DEFAULT_GOWN, side: 'reverse' });
// offered at the very first fold: the hem band is folded toward you, or behind
// and then turned over
assert.equal(decisionStep(print, decision), 0);
assert.equal(decisionStep(reverse, decision), 0);
assert.equal(sharedFoldPrefix(print, reverse), 0);
assert.equal(print.ops.length + 1, reverse.ops.length);

// --- the waist collapse: every crease loop closes at every sample, both colourways
let worstLoop = 0;
for (const side of ['print', 'reverse'] as GownSide[]) {
  const spec = gownWaistSpec({ ...DEFAULT_GOWN, side });
  const plan = planCollapse(spec);
  for (let k = 1; k < 200; k++) for (const r of loopResidual(plan, collapseAngles(spec, k / 200))) worstLoop = Math.max(worstLoop, r.error);
}
assert(worstLoop < 1e-9, `collapse loops must close (worst ${worstLoop})`);

// --- the construction's own geometry
const g = gownGeometry();
assert(g.sashEnd.y > g.W1.y, 'the sash ends above the waist pleat (its tip is folded in)');
assert(Math.abs(g.tipA.x + 1) < 1e-12 && Math.abs(g.tipA.y - g.drapeA.y) < 1e-12, 'the tip fold meets the sash fold on the left edge');
assert(g.edge <= 2 * DEFAULT_GOWN.waist, 'the folded-in sides do not cross behind the waist');

// --- motion, continuity and the finished paper, for both colourways
const perColourway: Record<string, unknown> = {};
const finals: Record<string, SheetState> = {};
for (const [side, c] of [['print', print], ['reverse', reverse]] as const) {
  const tl = buildTimeline(c.ops);
  for (const [i, s] of tl.states.entries()) assert.deepEqual(checkState(s, `gown ${side}:${i}`), []);
  let maxHingeGap = 0, maxEdgeLengthError = 0, minZ = Infinity;
  const perOperation = [];
  for (const op of tl.ops) {
    assert.deepEqual(hingeProblems(op, 21, RENDERED_LEVELS), []);
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
    assert.equal(piercings, 0, `${side} ${op.op.id}: sampled paper piercing`);
    maxHingeGap = Math.max(maxHingeGap, gap);
    perOperation.push({ id: op.op.id, maxHingeGap: gap, hingeGapInLayers: gap / LAYER_GAP, strictTrianglePiercings: piercings });
  }
  assert(maxEdgeLengthError < 1e-9, `${side}: facets must stay rigid`);
  assert(minZ >= -1e-9, `${side}: paper dips below the table`);
  for (let i = 1; i < tl.ops.length; i++) {
    const a = tl.ops[i - 1], b = tl.ops[i], A = evaluateFrame(a, 1), B = evaluateFrame(b, 0);
    for (const p of b.pieces) {
      const source = a.pieces.find((q) => inside(q.poly, centroid(p.poly)));
      assert(source, `${side}: step ${i} piece has no source`);
      for (const m of p.poly) assert(distance(posePoint(A, source.index * 12, m.x, m.y), posePoint(B, p.index * 12, m.x, m.y)) < 1e-9, `${side}: jump between steps ${i} and ${i + 1}`);
    }
  }
  const final = tl.states.at(-1)!;
  finals[side] = final;
  assert.deepEqual(vertexProblems(creasePattern(c)), [], `${side}: crease pattern must pass Maekawa and Kawasaki`);
  assert(Math.abs(final.facets.reduce((sum, f) => sum + signedArea(f.poly), 0) - 4) < 1e-9, 'all paper retained');

  // What the gown shows. The bodice drops by twice the pleat (the skirt stays put).
  const other = side === 'print' ? 'reverse' : 'print';
  const drop = 2 * g.pleat;
  const necklineAt = (x: number) => g.drapeA.y + ((g.drapeB.y - g.drapeA.y) * (x - g.drapeA.x)) / (g.drapeB.x - g.drapeA.x);
  const sashEdgeAt = (x: number) => g.drapeB.y + ((g.sashEnd.y - g.drapeB.y) * (x - g.drapeB.x)) / (g.sashEnd.x - g.drapeB.x);
  // the body, below the waist and at the right of the bodice
  assert.equal(frontFace(final, 0, -0.5), side, `${side}: skirt front`);
  assert.equal(frontFace(final, 0.2, 0.7 - drop), side, `${side}: bodice right of the sash`);
  // the sash: between the neckline and its diagonal edge, on top, the other side of the paper
  for (const x of [-0.25, -0.1, 0.05]) {
    const y = (necklineAt(x) + sashEdgeAt(x)) / 2 - drop;
    assert.equal(frontFace(final, x, y), other, `${side}: sash at x=${x}`);
    assert(topAt(final, x, y).tags.includes('sash'), `${side}: the sash is the top layer at x=${x}`);
  }
  // the neckline: no paper at all just above it on the low side (the back panel is tucked)
  for (const x of [-0.25, -0.1, 0.05, 0.2]) {
    assert.equal(covering(final, x, necklineAt(x) + 0.01 - drop).length, 0, `${side}: paper shows above the neckline at x=${x}`);
  }
  // the right shoulder keeps the sheet's full height
  assert(covering(final, 0.28, g.top - 0.02 - drop).length > 0, `${side}: right shoulder`);
  // the cap sleeve: outside the bodice, below the shoulder point
  const S = g.shoulder;
  const sleevePt = { x: S.x + 0.1 * Math.cos(-78 * Math.PI / 180), y: S.y + 0.1 * Math.sin(-78 * Math.PI / 180) };
  const atSleeve = covering(final, sleevePt.x, sleevePt.y);
  assert(atSleeve.length > 0 && atSleeve.every((f) => f.tags.includes('sleeve')), `${side}: cap sleeve beyond the right shoulder`);
  // the hem band in the other colour, front and back
  const hemY = -1 + DEFAULT_GOWN.hem + 0.03;
  assert.equal(frontFace(final, 0, hemY), other, `${side}: hem band`);
  assert(topAt(final, 0, hemY).tags.includes('hem'), `${side}: the hem band is the top layer at the hem`);
  assert.equal(backFace(final, -0.2, hemY), other, `${side}: hem band at the back`);
  // the back: the folded-in panels, the gown's own colour
  assert.equal(backFace(final, -0.2, -0.5), side, `${side}: back of the skirt`);
  // the folded-in tip never shows, front or back
  for (let x = -0.6; x <= 0.6; x += 0.02) for (let y = -1; y <= 1; y += 0.02) {
    const cov = covering(final, x, y);
    if (!cov.length) continue;
    assert(!topAt(final, x, y).tags.includes('tip') && !bottomAt(final, x, y).tags.includes('tip'), `${side}: the folded tip shows at ${x.toFixed(2)}, ${y.toFixed(2)}`);
  }

  // --- physical-risk measurements (scripts/foldMetrics.ts)
  const fm = foldMetrics(c, SQUARE_CM);
  perColourway[side] = {
    operations: c.ops.length, facets: final.facets.length, ...fm,
    maxHingeGap, hingeLimit: RENDERED_LEVELS * LAYER_GAP, maxEdgeLengthError, minZ, perOperation,
    waistPleatMm: +(g.pleat * MM_PER_UNIT).toFixed(2),
  };
  // Bounds a physical fold has to tolerate, set by what the collection already
  // asks of paper (npm run fold-metrics prints every design): the fit-and-flare
  // and the coat-dress stack 12 layers at their waist corners and have crease
  // segments under a millimetre.
  assert(fm.layers.max <= 12, `${side}: ${fm.layers.max} layers at one point exceeds the fit-and-flare's 12`);
  assert(fm.sharpestCreaseAngleDeg >= 9, `${side}: a ${fm.sharpestCreaseAngleDeg} degree crease angle is sharper than any existing design`);
  assert(fm.shortestCreaseMm >= 0.28, `${side}: a ${fm.shortestCreaseMm} mm crease is shorter than any existing design's`);
  assert(fm.narrowestFacetMm >= 1.5, `${side}: a ${fm.narrowestFacetMm} mm facet is too narrow to fold at ${SQUARE_CM} cm`);

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

// both colourways fold the same paper to the same place, layer for layer
const outline = (s: SheetState) => s.facets.map((f) => ({ c: centroid(modelPoly(f)), a: Math.abs(signedArea(f.poly)), r: f.rank }))
  .map(({ c, a, r }) => `${c.x.toFixed(6)},${c.y.toFixed(6)},${a.toFixed(6)},${r}`).map((k) => k.replace(/-0\.000000/g, '0.000000')).sort();
assert.deepEqual(outline(finals.print), outline(finals.reverse), 'the two colourways must fold the same paper to the same place');

const metrics = {
  design: 'gown', startingSquareCm: SQUARE_CM, params: DEFAULT_GOWN,
  waist: { pleat: g.pleat, skirtFlareDeg: (g.d2 * 180) / Math.PI, bodiceNarrowingDeg: (g.d1 * 180) / Math.PI },
  neckline: {
    sashFold: [g.drapeA, g.drapeB], tipFold: [g.tipA, g.tipB], sashEnd: g.sashEnd,
    riseDeg: (Math.atan2(g.drapeB.y - g.drapeA.y, g.drapeB.x - g.drapeA.x) * 180) / Math.PI,
  },
  worstCollapseLoopResidual: worstLoop, samplesPerOperation: 161, colourways: perColourway,
  limits: 'Thin rigid facets, sampled motion. Layer counts are paper layers stacked at a point, not rendering offsets. No paper thickness, springback, continuous-collision or physical-paper certification.',
};
console.log(JSON.stringify(metrics, null, 2));
if (process.argv.includes('--dump')) {
  mkdirSync('docs/gown/evidence', { recursive: true });
  writeFileSync('docs/gown/evidence/geometry.json', JSON.stringify(metrics, null, 2) + '\n');
}
console.log('gown checks passed');

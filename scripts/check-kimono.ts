// Kimono and obi checks: registration, the colour choice, the two engine filters
// the squash needs (`except` on flap folds, `only`/`except` on collapse regions),
// the squash's rigidity and rates, motion and continuity, the finished crease
// pattern, what each colourway shows where, the obi and where it sits, and the
// physical-risk measurements. Run: npm run check:kimono (--dump writes
// docs/kimono/evidence/geometry.json).
//
// None of this certifies physical foldability: the facets are thin and rigid,
// motion is sampled, and paper thickness, springback and handling are not
// modelled. It bounds the risks a physical test fold has to confirm.

import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { buildKimono, kimonoGeometry, kimonoSquashSpec, kimonoAnchors, DEFAULT_KIMONO, SQUASH_SIGNS, type KimonoSide } from '../src/fold/kimono';
import { buildObi, OBI_CORD, OBI_HALF_HEIGHT, OBI_POSITIONS, OBI_SCALE } from '../src/fold/obi';
import { ACCESSORIES, accessoryAnchors } from '../src/fold/accessories';
import { DEFAULT_OPTIONS, garmentDecisions, decisionStep, sharedFoldPrefix } from '../src/fold/garmentOptions';
import { buildGarment, garmentIdFrom, attachmentAnchors, garmentExperiment } from '../src/fold/garments';
import { recommendedSquareCm } from '../src/fold/paperSize';
import { applyFold, checkState, isFlipped, mayMove, modelPoly, unfoldedSquare, type SheetState } from '../src/fold/engine';
import { planCollapse, collapseAngles, loopResidual } from '../src/fold/collapse';
import { centroid, signedArea, v2, type Vec2 } from '../src/fold/geometry';
import { buildTimeline, evaluateFrame, posePoint, LAYER_GAP } from '../src/fold/timeline';
import { FoldController } from '../src/app/controller';
import { creasePattern, vertexProblems } from './crease_pattern';
import { foldMetrics } from './foldMetrics';
import { hingeProblems } from './hingeCheck';
import { interiorPiercing } from './experiment-collision';

const SQUARE_CM = recommendedSquareCm('kimono');
const MM_PER_UNIT = (SQUARE_CM * 10) / 2;
// See hingeCheck.ts: the collar fold's two sides are 10 rendered levels apart.
const FOLD_LEVELS = 10;
const inside = (poly: Vec2[], p: Vec2) => poly.every((a, i) => {
  const b = poly[(i + 1) % poly.length];
  return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x) >= -1e-10;
});
const strictlyInside = (poly: Vec2[], p: Vec2) => poly.every((a, i) => {
  const b = poly[(i + 1) % poly.length];
  return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x) > 1e-9;
});
const ccw = (poly: Vec2[]) => (signedArea(poly) < 0 ? poly.slice().reverse() : poly);
const distance = (a: number[], b: number[]) => Math.hypot(...a.map((x, i) => x - b[i]));
const covering = (s: SheetState, x: number, y: number) => s.facets.filter((f) => inside(ccw(modelPoly(f)), { x, y }));
const topAt = (s: SheetState, x: number, y: number) => covering(s, x, y).sort((a, b) => b.rank - a.rank)[0];
const bottomAt = (s: SheetState, x: number, y: number) => covering(s, x, y).sort((a, b) => a.rank - b.rank)[0];
const frontFace = (s: SheetState, x: number, y: number) => (isFlipped(topAt(s, x, y)) ? 'reverse' : 'print');
const backFace = (s: SheetState, x: number, y: number) => (isFlipped(bottomAt(s, x, y)) ? 'print' : 'reverse');

// --- registration and the colour choice
assert.equal(garmentIdFrom('kimono'), 'kimono');
assert.equal(DEFAULT_OPTIONS.kimonoSide, DEFAULT_KIMONO.side);
assert.deepEqual(buildGarment('kimono'), buildKimono());
assert.deepEqual(buildGarment('kimono', { ...DEFAULT_OPTIONS, kimonoSide: 'reverse' }), buildKimono({ ...DEFAULT_KIMONO, side: 'reverse' }));
assert.equal(SQUARE_CM, 20);
assert(garmentExperiment('kimono'), 'the kimono is listed as an experiment');
const [decision] = garmentDecisions('kimono');
assert.equal(decision.id, 'kimonoSide');
const print = buildKimono({ ...DEFAULT_KIMONO, side: 'print' });
const reverse = buildKimono({ ...DEFAULT_KIMONO, side: 'reverse' });
assert.equal(decisionStep(print, decision), 0);
assert.equal(decisionStep(reverse, decision), 0);
assert.equal(sharedFoldPrefix(print, reverse), 0);
assert.equal(print.ops.length, reverse.ops.length + 1);

// --- the waist is the kimono's only accessory position, and the obi may only go there
const g = kimonoGeometry();
assert.deepEqual(attachmentAnchors('kimono', 1, -1), kimonoAnchors());
assert.deepEqual(kimonoAnchors().map((a) => a.id), ['waist']);
const obiEntry = ACCESSORIES.find((a) => a.id === 'obi');
assert(obiEntry && obiEntry.experiment, 'the obi is a listed accessory experiment');
assert.deepEqual([...OBI_POSITIONS], ['waist']);
assert.deepEqual(accessoryAnchors('obi', attachmentAnchors('kimono', 1, -1)).map((a) => a.id), ['waist']);

// --- the two engine filters
assert(mayMove({}, { tags: ['a'] }) && mayMove({ only: 'a' }, { tags: ['a'] }) && !mayMove({ only: 'b' }, { tags: ['a'] }));
assert(!mayMove({ except: ['a'] }, { tags: ['a', 'b'] }) && mayMove({ except: ['c'] }, { tags: ['a', 'b'] }));
assert(!mayMove({ only: 'a', except: ['b'] }, { tags: ['a', 'b'] }));
{
  // a flap fold with `except` leaves the excepted layer in place and folds the rest of the stack
  // a corner flap on the right; then everything left of x = -0.2 folds over, except that flap
  let s = applyFold(unfoldedSquare(), { name: 'flap', a: v2(0.4, 1), b: v2(1, 0.4), moving: v2(1, 1), sense: 'valley' }).state;
  const before = s.facets.filter((f) => f.tags.includes('flap')).map((f) => JSON.stringify(f.T));
  s = applyFold(s, { name: 'all-but-flap', a: v2(-0.2, -1.5), b: v2(-0.2, 1.5), moving: v2(-1, 0), sense: 'valley', except: ['flap'] }).state;
  assert.deepEqual(s.facets.filter((f) => f.tags.includes('flap')).map((f) => JSON.stringify(f.T)).sort(), before.sort(), 'excepted layer stays put');
  assert(s.facets.some((f) => f.tags.includes('all-but-flap') && !f.tags.includes('flap')), 'the rest of the stack folds');
  // and without the filter the same fold must also carry the flap if it lay on the moving side
  assert.throws(() => applyFold(s, { name: 'tear', a: v2(0.7, -1.5), b: v2(0.7, 1.5), moving: v2(1, 0), sense: 'valley', except: ['flap'] }), /would tear/, 'except cannot tear a flap off');
  assert.deepEqual(checkState(s, 'except fold'), []);
}

// --- the squash: rigid at every stage, at the rates the closed form gives
let worstLoop = 0;
for (const side of ['print', 'reverse'] as KimonoSide[]) {
  const spec = kimonoSquashSpec({ ...DEFAULT_KIMONO, side });
  const plan = planCollapse(spec);
  for (let k = 1; k < 400; k++) for (const r of loopResidual(plan, collapseAngles(spec, k / 400))) worstLoop = Math.max(worstLoop, r.error);
}
assert(worstLoop < 1e-9, `squash loops must close (worst ${worstLoop})`);
{
  const spec = kimonoSquashSpec();
  const rate = (name: string) => spec.creases.find((c) => c.name === name)!.rate;
  assert.equal(rate('lift'), 1);
  for (const s of ['left', 'right']) {
    assert.equal(rate(`sleeve-fold-${s}`), 1);
    assert(Math.abs(rate(`hinge-${s}`) - Math.SQRT2) < 1e-15 && Math.abs(rate(`shoulder-${s}`) - Math.SQRT2) < 1e-15);
  }
  // the mirror-image branch also closes; drawn from this side it has no continuous
  // layer order (see docs/kimono/NOTES.md), so the squash uses this one
  assert.deepEqual([...SQUASH_SIGNS], [-1, -1, 1, 1]);
}
// the squash closes for any band width the parameters allow, and its sleeves are square
for (const band of [0.08, 0.12, 0.15, 0.2, 0.25]) {
  const spec = kimonoSquashSpec({ ...DEFAULT_KIMONO, band });
  const plan = planCollapse(spec);
  for (const e of [0.25, 0.5, 0.75]) for (const r of loopResidual(plan, collapseAngles(spec, e))) assert(r.error < 1e-9, `band ${band}: ${r.crease} does not close`);
  const q = kimonoGeometry({ ...DEFAULT_KIMONO, band });
  assert(Math.abs((q.halfWidth - band) - (q.shoulderY - q.sideY)) < 1e-12, 'sleeves are square');
}

// --- motion, continuity and the finished paper, for both colourways
const perColourway: Record<string, unknown> = {};
const finals: Record<string, SheetState> = {};
for (const [side, c] of [['print', print], ['reverse', reverse]] as const) {
  const tl = buildTimeline(c.ops);
  for (const [i, s] of tl.states.entries()) assert.deepEqual(checkState(s, `kimono ${side}:${i}`), []);
  let maxHingeGap = 0, maxEdgeLengthError = 0, minZ = Infinity, maxEndJump = 0;
  const perOperation = [];
  for (const op of tl.ops) {
    assert.deepEqual(hingeProblems(op, 21, 12, FOLD_LEVELS), []);
    let piercings = 0, gap = 0;
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
    // the drawn motion settles continuously into both resting poses (no last-moment pop)
    for (const [t0, t1] of [[0, 1e-6], [1 - 1e-6, 1]]) {
      const A = evaluateFrame(op, t0), B = evaluateFrame(op, t1);
      for (const p of op.pieces) for (const m of p.poly) maxEndJump = Math.max(maxEndJump, distance(posePoint(A, p.index * 12, m.x, m.y), posePoint(B, p.index * 12, m.x, m.y)));
    }
    maxHingeGap = Math.max(maxHingeGap, gap);
    perOperation.push({ id: op.op.id, maxHingeGap: gap, hingeGapInLayers: gap / LAYER_GAP, strictTrianglePiercings: piercings });
  }
  assert(maxEdgeLengthError < 1e-9, `${side}: facets must stay rigid`);
  assert(minZ >= -1e-9, `${side}: paper dips below the table`);
  assert(maxEndJump < 1e-4, `${side}: a step jumps ${maxEndJump} at an endpoint`);
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

  // the squash moves no collar paper: every collar facet keeps its place
  const k = c.ops.findIndex((o) => o.id === 'sleeves');
  const pre = tl.states[k], post = tl.states[k + 1];
  const collarSpot = (s: SheetState) => s.facets.filter((f) => f.tags.some((t) => t.startsWith('collar-'))).map((f) => modelPoly(f).map((q) => `${q.x.toFixed(9)},${q.y.toFixed(9)}`).sort().join(' ')).sort();
  assert.deepEqual(collarSpot(post), collarSpot(pre), `${side}: the squash leaves the collar flaps where they were`);

  // What the kimono shows. The outline: square sleeves to x = +-1/2, a straight top,
  // the neck point at the centre, the body narrowing to the hem, the collar hanging below.
  const other = side === 'print' ? 'reverse' : 'print';
  const { b, top, sideY, shoulderY } = g;
  for (const sx of [-1, 1]) {
    for (const y of [sideY + 0.01, (sideY + shoulderY) / 2, shoulderY - 0.01]) {
      assert(covering(final, sx * 0.49, y).length, `${side}: sleeve reaches its tip at y=${y}`);
      assert.equal(covering(final, sx * 0.51, y).length, 0, `${side}: nothing past the sleeve tip`);
    }
    assert(covering(final, sx * 0.3, shoulderY - 0.01).length && !covering(final, sx * 0.3, shoulderY + 0.01).length, `${side}: straight top edge`);
    assert.equal(frontFace(final, sx * 0.4, (sideY + shoulderY) / 2), side, `${side}: sleeve front`);
    assert.equal(backFace(final, sx * 0.4, (sideY + shoulderY) / 2), side, `${side}: sleeve back`);
    // the body below the sleeves narrows along the lower-corner folds
    assert(covering(final, sx * (b + 0.02), 0.05).length, `${side}: body near the hem`);
    assert.equal(covering(final, sx * (b + (0.5 - b) * (0.1 / sideY) + 0.02), 0.1).length, 0, `${side}: body narrows to the hem`);
    // the collar: a band of the other side either side of the centre, neck to below the hem
    for (const y of [-b + 0.02, 0.2, 0.5, top - 0.1]) {
      assert.equal(frontFace(final, sx * b / 2, y), other, `${side}: collar at y=${y}`);
      assert(topAt(final, sx * b / 2, y).tags.some((t) => t.startsWith('band-')), `${side}: the collar band is on top at y=${y}`);
    }
  }
  assert(covering(final, 0.01, top - 0.02).length && !covering(final, 0, top + 0.01).length, `${side}: neck point`);
  assert.equal(covering(final, b + 0.03, -0.05).length, 0, `${side}: only the collar hangs below the hem`);
  assert.equal(backFace(final, 0, 0.5), side, `${side}: the back`);

  // physical layers along the collar crease when it is folded (bounds the hinge allowance above)
  const kc = c.ops.findIndex((o) => o.id === 'collar');
  let crease = 0;
  for (let s = 0.001; s < 1.2; s += 0.002) {
    const p = { x: -s, y: top - s };
    crease = Math.max(crease, tl.states[kc].facets.filter((f) => strictlyInside(ccw(modelPoly(f)), p)).length);
  }
  assert(crease <= 4, `${side}: the collar fold crosses ${crease} paper layers`);

  // --- physical-risk measurements
  const fm = foldMetrics(c, SQUARE_CM);
  perColourway[side] = {
    operations: c.ops.length, facets: final.facets.length, ...fm,
    maxHingeGap, hingeLimit: { folds: FOLD_LEVELS * LAYER_GAP, collapse: 12 * LAYER_GAP }, collarCreaseLayers: crease,
    maxEdgeLengthError, minZ, maxEndJump, perOperation,
    collarBandMm: +(b * MM_PER_UNIT).toFixed(2), sleeveMm: +((0.5 - b) * MM_PER_UNIT).toFixed(2),
  };
  assert(fm.layers.max <= 12, `${side}: ${fm.layers.max} layers at one point exceeds the fit-and-flare's 12`);
  assert(fm.sharpestCreaseAngleDeg >= 9, `${side}: a ${fm.sharpestCreaseAngleDeg} degree crease angle`);
  assert(fm.shortestCreaseMm >= 0.28, `${side}: a ${fm.shortestCreaseMm} mm crease`);
  assert(fm.narrowestFacetMm >= 1.5, `${side}: a ${fm.narrowestFacetMm} mm facet`);

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
const outline = (s: SheetState) => s.facets.map((f) => ({ c: centroid(modelPoly(f)), a: Math.abs(signedArea(f.poly)), r: f.rank }))
  .map(({ c, a, r }) => `${c.x.toFixed(6)},${c.y.toFixed(6)},${a.toFixed(6)},${r}`).map((k) => k.replace(/-0\.000000/g, '0.000000')).sort();
assert.deepEqual(outline(finals.print), outline(finals.reverse), 'the two colourways must fold the same paper to the same place');

// --- the obi
const obi = buildObi();
const otl = buildTimeline(obi.ops);
for (const [i, s] of otl.states.entries()) assert.deepEqual(checkState(s, `obi:${i}`), []);
for (const op of otl.ops) assert.deepEqual(hingeProblems(op), []);
const ofinal = otl.states.at(-1)!;
assert.deepEqual(vertexProblems(creasePattern(obi)), []);
assert(Math.abs(ofinal.facets.reduce((sum, f) => sum + signedArea(f.poly), 0) - 4) < 1e-9, 'obi: all paper retained');
assert(covering(ofinal, 0.99, OBI_HALF_HEIGHT - 0.01).length && !covering(ofinal, 0, OBI_HALF_HEIGHT + 0.01).length, 'obi: band height');
assert.equal(frontFace(ofinal, 0, 0), 'reverse', 'obi: cord across the middle');
assert.equal(frontFace(ofinal, 0.5, OBI_CORD + 0.02), 'print', 'obi: printed band above the cord');
assert.equal(frontFace(ofinal, -0.5, -OBI_CORD - 0.02), 'print', 'obi: printed band below the cord');
const om = foldMetrics(obi, SQUARE_CM * OBI_SCALE);
assert(om.narrowestFacetMm >= 1.5, `obi: a ${om.narrowestFacetMm} mm facet`);
// placed at the waist anchor, the obi lies across the body: its ends never pass the body's sides
const anchor = kimonoAnchors()[0];
const obiBottom = anchor.y - OBI_HALF_HEIGHT * OBI_SCALE, obiTop = anchor.y + OBI_HALF_HEIGHT * OBI_SCALE;
const bodyHalfWidthAt = (y: number) => g.b + (0.5 - g.b) * (y / g.sideY);
assert(obiBottom > 0 && OBI_SCALE <= bodyHalfWidthAt(obiBottom) + 1e-12, 'obi: within the body at its lower edge');
assert(obiTop < g.shoulderY, 'obi: below the top of the sleeves');

const metrics = {
  design: 'kimono', startingSquareCm: SQUARE_CM, params: DEFAULT_KIMONO,
  geometry: { band: g.b, top: g.top, sideY: g.sideY, shoulderY: g.shoulderY, halfWidth: g.halfWidth },
  squash: { signs: SQUASH_SIGNS, rates: { lift: 1, sleeveFold: 1, hinge: Math.SQRT2, shoulder: Math.SQRT2 }, worstLoopResidual: worstLoop },
  samplesPerOperation: 161, colourways: perColourway,
  obi: { squareCm: +(SQUARE_CM * OBI_SCALE).toFixed(2), finishedCm: om.finishedCm, layers: om.layers.max, cordMm: +(2 * OBI_CORD * SQUARE_CM * OBI_SCALE * 5).toFixed(2), narrowestFacetMm: om.narrowestFacetMm, placement: { y: anchor.y, from: obiBottom, to: obiTop } },
  limits: 'Thin rigid facets, sampled motion. Layer counts are paper layers stacked at a point, not rendering offsets. No paper thickness, springback, continuous-collision or physical-paper certification.',
};
console.log(JSON.stringify(metrics, null, 2));
if (process.argv.includes('--dump')) {
  mkdirSync('docs/kimono/evidence', { recursive: true });
  writeFileSync('docs/kimono/evidence/geometry.json', JSON.stringify(metrics, null, 2) + '\n');
}
console.log('kimono checks passed');

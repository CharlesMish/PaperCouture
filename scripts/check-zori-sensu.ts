// Zori and folding fan checks: registration and the colour choices, motion and
// continuity, the finished crease patterns, what each colourway shows where (the
// zori's thong and toe, the fan's panels and spread), how many paper layers each
// zori crease folds through (it bounds the renderer allowance), the fan's pleat
// collapses, and the physical-risk measurements. Run: npm run check:zori-sensu
// (--dump writes docs/kimono-companions/evidence/geometry.json).
//
// None of this certifies physical foldability: the facets are thin and rigid,
// motion is sampled, and paper thickness, springback and handling are not
// modelled. It bounds the risks a physical test fold has to confirm.

import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { buildZori, zoriGeometry, DEFAULT_ZORI, ZORI_FOLD_LEVELS, type ZoriSide } from '../src/fold/zori';
import { buildSensu, sensuGeometry, sensuPleatSpec, DEFAULT_SENSU, type SensuSide } from '../src/fold/sensu';
import { DEFAULT_OPTIONS, garmentDecisions, decisionStep, sharedFoldPrefix, optionsFromParams, optionsToParams } from '../src/fold/garmentOptions';
import { buildGarment, garmentIdFrom, attachmentAnchors, garmentExperiment, GARMENTS } from '../src/fold/garments';
import { recommendedSquareCm } from '../src/fold/paperSize';
import { checkState, isFlipped, modelPoly, type SheetState } from '../src/fold/engine';
import { planCollapse, collapseAngles, loopResidual } from '../src/fold/collapse';
import { centroid, signedArea, v2, type Vec2 } from '../src/fold/geometry';
import { buildTimeline, evaluateFrame, posePoint, LAYER_GAP } from '../src/fold/timeline';
import type { Construction } from '../src/fold/construction';
import { FoldController } from '../src/app/controller';
import { creasePattern, vertexProblems } from './crease_pattern';
import { foldMetrics } from './foldMetrics';
import { hingeProblems } from './hingeCheck';
import { interiorPiercing } from './experiment-collision';

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
const need = <T>(f: T | undefined, x: number, y: number): T => { if (!f) throw new Error(`no paper at (${x.toFixed(3)}, ${y.toFixed(3)})`); return f; };
const frontFace = (s: SheetState, x: number, y: number) => (isFlipped(need(topAt(s, x, y), x, y)) ? 'reverse' : 'print');
const backFace = (s: SheetState, x: number, y: number) => (isFlipped(need(bottomAt(s, x, y), x, y)) ? 'print' : 'reverse');
const opposite = (s: 'print' | 'reverse') => (s === 'print' ? 'reverse' : 'print');

// --- registration and the colour choices
for (const id of ['zori', 'sensu'] as const) {
  assert.equal(garmentIdFrom(id), id);
  assert(garmentExperiment(id), `${id} is listed as an experiment`);
  assert.deepEqual(attachmentAnchors(id, 1, -1), [], `${id} is a board piece with no accessory positions`);
}
assert.deepEqual(GARMENTS.map((g) => g.id).slice(GARMENTS.findIndex((g) => g.id === 'boot-right'), GARMENTS.findIndex((g) => g.id === 'boot-right') + 3), ['boot-right', 'zori', 'sensu']);
assert.equal(recommendedSquareCm('zori'), 8);
assert.equal(recommendedSquareCm('sensu'), 7.5);
assert.equal(DEFAULT_OPTIONS.zoriSide, DEFAULT_ZORI.side);
assert.equal(DEFAULT_OPTIONS.sensuSide, DEFAULT_SENSU.side);
assert.deepEqual(buildGarment('zori'), buildZori());
assert.deepEqual(buildGarment('zori', { ...DEFAULT_OPTIONS, zoriSide: 'reverse' }), buildZori({ ...DEFAULT_ZORI, side: 'reverse' }));
assert.deepEqual(buildGarment('sensu'), buildSensu());
assert.deepEqual(buildGarment('sensu', { ...DEFAULT_OPTIONS, sensuSide: 'reverse' }), buildSensu({ ...DEFAULT_SENSU, side: 'reverse' }));
const zori = { print: buildZori(), reverse: buildZori({ ...DEFAULT_ZORI, side: 'reverse' }) };
const sensu = { print: buildSensu(), reverse: buildSensu({ ...DEFAULT_SENSU, side: 'reverse' }) };
for (const [id, pair, key, option] of [['zori', zori, 'zori', 'zoriSide'], ['sensu', sensu, 'sensu', 'sensuSide']] as const) {
  const [decision] = garmentDecisions(id);
  assert.equal(decision.id, option);
  assert.equal(decisionStep(pair.print, decision), 0, `${id}: the choice comes at the first fold`);
  assert.equal(decisionStep(pair.reverse, decision), 0);
  assert.equal(sharedFoldPrefix(pair.print, pair.reverse), 0);
  const params = new URLSearchParams();
  optionsToParams({ ...DEFAULT_OPTIONS, [option]: 'reverse' }, params);
  assert.equal(params.get(key), 'reverse');
  assert.equal(optionsFromParams(params)[option], 'reverse');
}
assert.equal(zori.reverse.ops.length, zori.print.ops.length + 1, 'the reverse-colour zori adds one turn');
assert.equal(sensu.reverse.ops.length, sensu.print.ops.length);

// --- the fan's pleats: two creases through the rivet per side, open chains, equal and opposite rates
const sg = sensuGeometry();
for (let k = 0; k < sg.n; k++) {
  const spec = sensuPleatSpec(DEFAULT_SENSU, k);
  const plan = planCollapse(spec);
  for (let e = 1; e < 40; e++) for (const r of loopResidual(plan, collapseAngles(spec, e / 40))) assert(r.error < 1e-9);
  for (const c of spec.creases) {
    assert.deepEqual(c.a, v2(0, 0), 'every pleat crease starts at the rivet');
    assert.equal(c.rate, 1);
    assert.equal(c.sign, c.name.includes('-in-') ? 1 : -1);
  }
}
assert(Math.abs(2 * sg.n * 2 * sg.tuck + 2 * sg.half - Math.PI) < 1e-12, 'the tucks take up the half-round less the spread');
assert(Math.abs((2 * sg.n + 1) * sg.panel - 2 * sg.half) < 1e-12, 'eleven equal panels make up the spread');

// --- motion, continuity and the finished paper, for every piece and colourway
type Result = Record<string, unknown>;
const results: Record<string, Result> = {};
function motion(name: string, c: Construction, foldLevels: number) {
  const tl = buildTimeline(c.ops);
  for (const [i, s] of tl.states.entries()) assert.deepEqual(checkState(s, `${name}:${i}`), []);
  let maxHingeGap = 0, maxEdgeLengthError = 0, minZ = Infinity, maxEndJump = 0;
  const perOperation = [];
  for (const op of tl.ops) {
    assert.deepEqual(hingeProblems(op, 21, 12, foldLevels), [], `${name}: ${op.op.id}`);
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
    assert.equal(piercings, 0, `${name} ${op.op.id}: sampled paper piercing`);
    for (const [t0, t1] of [[0, 1e-6], [1 - 1e-6, 1]]) {
      const A = evaluateFrame(op, t0), B = evaluateFrame(op, t1);
      for (const p of op.pieces) for (const m of p.poly) maxEndJump = Math.max(maxEndJump, distance(posePoint(A, p.index * 12, m.x, m.y), posePoint(B, p.index * 12, m.x, m.y)));
    }
    maxHingeGap = Math.max(maxHingeGap, gap);
    perOperation.push({ id: op.op.id, maxHingeGap: gap, hingeGapInLevels: +(gap / LAYER_GAP).toFixed(2), strictTrianglePiercings: piercings });
  }
  assert(maxEdgeLengthError < 1e-9, `${name}: facets must stay rigid`);
  assert(minZ >= -1e-9, `${name}: paper dips below the table`);
  assert(maxEndJump < 1e-4, `${name}: a step jumps ${maxEndJump} at an endpoint`);
  for (let i = 1; i < tl.ops.length; i++) {
    const a = tl.ops[i - 1], b = tl.ops[i], A = evaluateFrame(a, 1), B = evaluateFrame(b, 0);
    for (const p of b.pieces) {
      const source = a.pieces.find((q) => inside(q.poly, centroid(p.poly)));
      assert(source, `${name}: step ${i} piece has no source`);
      for (const m of p.poly) assert(distance(posePoint(A, source.index * 12, m.x, m.y), posePoint(B, p.index * 12, m.x, m.y)) < 1e-9, `${name}: jump between steps ${i} and ${i + 1}`);
    }
  }
  const final = tl.states.at(-1)!;
  assert.deepEqual(vertexProblems(creasePattern(c)), [], `${name}: crease pattern must pass Maekawa and Kawasaki`);
  assert(Math.abs(final.facets.reduce((sum, f) => sum + signedArea(f.poly), 0) - 4) < 1e-9, `${name}: all paper retained`);
  for (let s = 0; s < c.ops.length; s++) {
    const ctrl = new FoldController(c.ops.length, () => 1); ctrl.jumpTo(s);
    ctrl.next(); ctrl.update(0.37); const pose = ctrl.pose(); ctrl.prev(); assert.deepEqual(ctrl.pose(), pose);
    ctrl.update(2); assert.equal(ctrl.step, s); ctrl.next(); ctrl.next(); assert.equal(ctrl.step, s + 1);
    ctrl.prev(); ctrl.prev(); assert.equal(ctrl.step, s);
    ctrl.beginScrub(); ctrl.scrubTo(0.63); ctrl.endScrub(false); ctrl.update(2); assert.equal(ctrl.step, s);
    ctrl.beginScrub(); ctrl.scrubTo(0.63); ctrl.endScrub(true); ctrl.update(2); assert.equal(ctrl.step, s + 1);
    ctrl.prev(); ctrl.update(0.4); ctrl.reset(); assert.equal(ctrl.step, 0); assert(!ctrl.moving);
  }
  return { tl, final, summary: { operations: c.ops.length, facets: final.facets.length, maxHingeGap, maxEdgeLengthError, minZ, maxEndJump, perOperation } };
}
const outline = (s: SheetState) => s.facets.map((f) => ({ c: centroid(modelPoly(f)), a: Math.abs(signedArea(f.poly)) }))
  .map(({ c, a }) => `${c.x.toFixed(6)},${c.y.toFixed(6)},${a.toFixed(6)}`).map((k) => k.replace(/-0\.000000/g, '0.000000')).sort();

// --- the zori
const zg = zoriGeometry();
const ZORI_CM = recommendedSquareCm('zori'), ZORI_MM = (ZORI_CM * 10) / 2;
const zoriFinals: SheetState[] = [];
for (const side of ['print', 'reverse'] as ZoriSide[]) {
  const c = zori[side];
  const { tl, final, summary } = motion(`zori ${side}`, c, ZORI_FOLD_LEVELS);
  zoriFinals.push(final);
  const { cx, point, halfWidth: s, toeTop, heel, alpha, b } = zg;
  const thong = opposite(side);
  // the outline: the sole's sides, toe and heel, the rounded corners
  for (const sx of [-1, 1]) {
    for (const y of [heel + 0.2, 0.5, point.y, toeTop - 0.2]) {
      assert(covering(final, cx + sx * (s - 0.005), y).length, `zori ${side}: sole reaches its side at y=${y}`);
      assert.equal(covering(final, cx + sx * (s + 0.005), y).length, 0, `zori ${side}: nothing past the side at y=${y}`);
    }
    assert.equal(covering(final, cx + sx * (s - 0.01), toeTop - 0.01).length, 0, `zori ${side}: toe corner rounded`);
    assert.equal(covering(final, cx + sx * (s - 0.01), heel + 0.01).length, 0, `zori ${side}: heel corner rounded`);
  }
  assert(covering(final, cx, toeTop - 0.005).length && !covering(final, cx, toeTop + 0.005).length, `zori ${side}: toe`);
  assert(covering(final, cx, heel + 0.005).length && !covering(final, cx, heel - 0.005).length, `zori ${side}: heel`);
  // the thong: two strips from the point, down and out, past the sides; the knot just under the point
  for (const sx of [-1, 1]) {
    const dir = v2(sx * Math.sin(alpha), -Math.cos(alpha)), out = v2(sx * Math.cos(alpha), Math.sin(alpha));
    for (let t = 0.15; t * Math.sin(alpha) < s - 0.02; t += 0.05) { // near the point the strip is narrower than the band
      const q = v2(point.x + t * dir.x + (b / 2) * out.x, point.y + t * dir.y + (b / 2) * out.y);
      assert.equal(frontFace(final, q.x, q.y), thong, `zori ${side}: thong at t=${t.toFixed(2)}`);
      // either side of the strip, the sole
      const o = v2(q.x + 1.2 * b * out.x, q.y + 1.2 * b * out.y);
      if (Math.abs(o.x - cx) < s - 0.005) assert.equal(frontFace(final, o.x, o.y), side, `zori ${side}: sole outside the strip`);
      assert.equal(frontFace(final, q.x - 1.2 * b * out.x, q.y - 1.2 * b * out.y), side, `zori ${side}: sole inside the strip`);
    }
    // where it meets the side
    assert.equal(frontFace(final, cx + sx * (s - 0.01), zg.strapY + 0.02), thong, `zori ${side}: the thong reaches the side`);
  }
  assert.equal(frontFace(final, cx, point.y - b / 2), thong, `zori ${side}: the knot under the point`);
  // the sole: inside the thong, at the heel, and the toe in front of the point
  for (const [x, y] of [[cx, 0.5], [cx, heel + 0.1], [cx + 0.15, 0.3], [cx - 0.2, point.y - 0.07], [cx + 0.2, point.y - 0.07], [cx, point.y + 0.04], [cx - 0.1, toeTop - 0.06], [cx + 0.1, toeTop - 0.06]]) {
    assert.equal(frontFace(final, x, y), side, `zori ${side}: sole at (${x}, ${y})`);
  }
  // underneath: the sole colour, apart from the thong's ends wrapped round the sides
  for (const [x, y] of [[cx, 0.5], [cx, toeTop - 0.1], [cx, heel + 0.1], [cx - 0.15, 0.85], [cx + 0.15, 0.25]]) assert.equal(backFace(final, x, y), side, `zori ${side}: underneath at (${x}, ${y})`);
  // paper layers each crease folds through, in the state it is folded from
  const creaseLayers: Record<string, number> = {};
  c.ops.forEach((op, i) => {
    if (op.kind !== 'fold') return;
    for (const f of op.folds) {
      const pre = tl.states[i];
      const d = v2(f.b.x - f.a.x, f.b.y - f.a.y), L = Math.hypot(d.x, d.y);
      let worst = 0;
      for (let u = -3; u <= 3; u += 0.002) {
        const p = v2(f.a.x + (u * d.x) / L, f.a.y + (u * d.y) / L);
        worst = Math.max(worst, pre.facets.filter((g) => strictlyInside(ccw(modelPoly(g)), p)).length);
      }
      creaseLayers[f.name] = worst;
    }
  });
  assert(Math.max(...Object.values(creaseLayers)) <= 8, `zori ${side}: a crease folds through ${JSON.stringify(creaseLayers)} layers`);
  const fm = foldMetrics(c, ZORI_CM);
  assert(fm.layers.max <= 16, `zori ${side}: ${fm.layers.max} layers`);
  assert(fm.narrowestFacetMm >= 1.5 && fm.shortestCreaseMm >= 0.5 && fm.sharpestCreaseAngleDeg >= 25, `zori ${side}: ${JSON.stringify(fm)}`);
  results[`zori-${side}`] = { ...summary, ...fm, creaseLayers, hingeLimit: { folds: ZORI_FOLD_LEVELS * LAYER_GAP } };
}
assert.deepEqual(outline(zoriFinals[0]), outline(zoriFinals[1]), 'both zori colourways fold the paper to the same place');

// --- the folding fan
const SENSU_CM = recommendedSquareCm('sensu'), SENSU_MM = (SENSU_CM * 10) / 2;
const fanFinals: SheetState[] = [];
for (const side of ['print', 'reverse'] as SensuSide[]) {
  const c = sensu[side];
  const { final, summary } = motion(`sensu ${side}`, c, 8);
  fanFinals.push(final);
  const at = (deg: number, r: number) => v2(r * Math.cos((deg * Math.PI) / 180), r * Math.sin((deg * Math.PI) / 180));
  const spread = DEFAULT_SENSU.halfSpread;
  // the spread: paper to within a degree of each guard edge, none past it
  for (const sx of [-1, 1]) for (const r of [0.3, 0.6, 0.9]) {
    const inside_ = at(90 + sx * (spread - 1), r), outside = at(90 + sx * (spread + 1), r);
    assert(covering(final, inside_.x, inside_.y).length, `sensu ${side}: paper at the edge of the spread, r=${r}`);
    assert.equal(covering(final, outside.x, outside.y).length, 0, `sensu ${side}: nothing past the spread, r=${r}`);
  }
  // the leaf reaches to within 8% of one radius everywhere, and never past 1.09
  for (let a = 90 - spread + 2; a <= 90 + spread - 2; a += 1) {
    const near = at(a, 0.92), far = at(a, 1.09);
    assert(covering(final, near.x, near.y).length, `sensu ${side}: leaf reaches r=0.92 at ${a} degrees`);
    assert.equal(covering(final, far.x, far.y).length, 0, `sensu ${side}: nothing past r=1.09 at ${a} degrees`);
  }
  // one colour on the front, eleven panels across it
  const panels: number[] = [];
  for (let a = 90 - spread + 0.25; a < 90 + spread; a += 0.25) {
    const q = at(a, 0.7);
    assert.equal(frontFace(final, q.x, q.y), side, `sensu ${side}: the leaf at ${a} degrees`);
    const id = topAt(final, q.x, q.y).id;
    if (panels.at(-1) !== id) panels.push(id);
  }
  assert.equal(panels.length, 2 * DEFAULT_SENSU.pleats + 1, `sensu ${side}: ${panels.length} panels`);
  assert.equal(new Set(panels).size, panels.length);
  assert.equal(backFace(final, 0, 0.7), side, `sensu ${side}: the back of the middle panel`);
  const fm = foldMetrics(c, SENSU_CM);
  assert(fm.layers.max <= 12, `sensu ${side}: ${fm.layers.max} layers`);
  // the tucks are wedges that meet at the rivet: their sharp angle is the fan's nature
  assert(Math.abs(fm.sharpestCreaseAngleDeg - (sg.tuck * 180) / Math.PI) < 0.05, `sensu ${side}: sharpest angle ${fm.sharpestCreaseAngleDeg}`);
  assert(fm.narrowestFacetMm >= 1.4, `sensu ${side}: a ${fm.narrowestFacetMm} mm facet`);
  results[`sensu-${side}`] = {
    ...summary, ...fm, panels: panels.length,
    // between a tuck's two creases at the leaf's edge (one radius); the angle a pleat takes up is twice the tuck
    tuckWidthAtEdgeMm: +(SENSU_MM * Math.sin(sg.tuck)).toFixed(2), panelWidthAtEdgeMm: +(SENSU_MM * 2 * Math.sin(sg.panel / 2)).toFixed(2),
  };
}
assert.deepEqual(outline(fanFinals[0]), outline(fanFinals[1]), 'both fan colourways fold the paper to the same place');

// --- what the instructions say matches the creases they describe
// Every measurement written in a step's hint or in the folding sheet's data is
// read back and compared with the crease coordinates themselves (fractions of the
// square's side, which spans 2 units). A wrong formula in prose fails here.
const percents = (text: string) => [...text.matchAll(/(\d+(?:\.\d+)?)%/g)].map((m) => Number(m[1]) / 100);
const degrees = (text: string) => [...text.matchAll(/(\d+(?:\.\d+)?) degrees/g)].map((m) => Number(m[1]));
const near = (a: number, b: number, tol: number, what: string) => assert(Math.abs(a - b) <= tol, `${what}: written ${a}, creases say ${b}`);
const fold = (c: Construction, id: string) => {
  const op = c.ops.find((o) => o.id === id);
  assert(op && op.kind === 'fold', `${id} is a fold`);
  return op;
};
{
  const c = zori.print;
  const band = fold(c, 'zori-band'), thong = fold(c, 'zori-thong'), sides = fold(c, 'zori-sides'), toe = fold(c, 'zori-toe'), round = fold(c, 'zori-round');
  near(percents(band.hint)[0], (1 - band.folds[0].a.y) / 2, 5e-4, 'zori band');
  // the corner crease meets the folded strip's side (half the sheet from its middle) this far below the top
  const t = thong.folds[0], slope = (t.a.y - t.b.y) / Math.abs(t.a.x - t.b.x);
  near(percents(thong.hint)[0], (0.5 * slope) / 2, 5e-4, 'zori corner drop');
  near(percents(sides.hint)[0], Math.abs(sides.folds[0].a.x - sides.folds[1].a.x) / 2, 5e-4, 'zori sole width');
  // the bottom edge (y = -1) lands at 2h + 1; the toe is what shows above the thong's point
  near(percents(toe.hint)[0], (2 * toe.folds[0].a.y + 1 - zg.point.y) / 2, 5e-4, 'zori toe');
  // the rounding folds run at 45 degrees and cut this much off each edge
  const edgeCut = (f: (typeof round.folds)[number]) => Math.abs(f.a.x - f.b.x) / 2;
  const sheet = JSON.parse(readFileSync('docs/kimono-companions/crease-pattern.json', 'utf8'));
  near(sheet.zori.fractions.band, (1 - band.folds[0].a.y) / 2, 5e-6, 'sheet: zori band');
  near(sheet.zori.fractions.cornerDrop, (0.5 * slope) / 2, 5e-6, 'sheet: zori corner drop');
  near(sheet.zori.fractions.soleWidth, Math.abs(sides.folds[0].a.x - sides.folds[1].a.x) / 2, 5e-6, 'sheet: zori sole width');
  near(sheet.zori.fractions.toe, (2 * toe.folds[0].a.y + 1 - zg.point.y) / 2, 5e-6, 'sheet: zori toe');
  near(sheet.zori.fractions.toeRound, edgeCut(round.folds[0]), 5e-6, 'sheet: zori toe rounding');
  near(sheet.zori.fractions.heelRound, edgeCut(round.folds[2]), 5e-6, 'sheet: zori heel rounding');
  // the fan: the corner creases' distance from the corner, and each pleat's angles from the middle
  const r = fold(sensu.print, 'sensu-round');
  const fromCorner = (1 - r.folds[0].a.x) / 2;
  assert(Math.abs(r.folds[0].a.y - 1) < 1e-12 && Math.abs(r.folds[0].b.x - 1) < 1e-12, 'the fan corner crease runs from the top edge to the side');
  near(percents(r.hint)[0], fromCorner, 5e-4, 'fan corner offset');
  near(sheet.sensu.cornerOffset, fromCorner, 5e-5, 'sheet: fan corner offset');
  for (const op of sensu.print.ops.filter((o) => o.kind === 'collapse')) {
    const [inner, tuck] = degrees(op.hint);
    const rays = op.collapse.creases.filter((k) => k.name.endsWith('-right')).map((k) => (Math.atan2(k.b.y, k.b.x) * 180) / Math.PI);
    near(inner, 90 - rays[0], 0.05, `${op.id} valley line from the middle`);
    near(tuck, rays[0] - rays[1], 0.05, `${op.id} tuck`);
  }
  near(sheet.sensu.tuckWidthAtEdgeMm, SENSU_MM * Math.sin(sg.tuck), 5e-3, 'sheet: tuck width at the edge');
}

const metrics = {
  zori: {
    startingSquareCm: ZORI_CM, params: DEFAULT_ZORI,
    finished: { lengthMm: +(zg.length * ZORI_MM).toFixed(1), widthMm: +(2 * zg.halfWidth * ZORI_MM).toFixed(1), thongMm: +(zg.b * ZORI_MM).toFixed(2) },
    thong: { fromVerticalDeg: +((zg.alpha * 180) / Math.PI).toFixed(2), pointFromToe: +((zg.toeTop - zg.point.y) / zg.length).toFixed(3), meetsSidesFromHeel: +((zg.strapY - zg.heel) / zg.length).toFixed(3) },
    colourways: { print: results['zori-print'], reverse: results['zori-reverse'] },
  },
  sensu: {
    startingSquareCm: SENSU_CM, params: DEFAULT_SENSU,
    geometry: { tuckDeg: +((sg.tuck * 180) / Math.PI).toFixed(3), panelDeg: +((sg.panel * 180) / Math.PI).toFixed(3), innerCreaseDeg: sg.inner.map((a) => +((a * 180) / Math.PI).toFixed(3)) },
    colourways: { print: results['sensu-print'], reverse: results['sensu-reverse'] },
  },
  samplesPerOperation: 161,
  limits: 'Thin rigid facets, sampled motion. Layer counts are paper layers stacked at a point, not rendering offsets. No paper thickness, springback, continuous-collision or physical-paper certification.',
};
console.log(JSON.stringify(metrics, null, 2));
if (process.argv.includes('--dump')) {
  mkdirSync('docs/kimono-companions/evidence', { recursive: true });
  writeFileSync('docs/kimono-companions/evidence/geometry.json', JSON.stringify(metrics, null, 2) + '\n');
}
console.log('zori and folding fan checks passed');

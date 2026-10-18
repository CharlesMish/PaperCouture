// Wardrobe-gap checks: the trousers, the cloche, the shell top and the kinchaku
// pouch. Registration and the colour choices, the retired designs, motion and
// continuity with each piece's per-operation level allowance, the finished crease
// patterns, what each colourway shows where, the written measurements against the
// creases they describe, how many paper layers each crease folds through, and the
// physical-risk measurements. Run: npm run check:wardrobe-gaps
// (--dump writes docs/wardrobe-gaps/evidence/geometry.json).
//
// None of this certifies physical foldability: the facets are thin and rigid,
// motion is sampled, and paper thickness, springback and handling are not
// modelled. It bounds the risks a physical test fold has to confirm.

import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { buildTrousers, trousersGeometry, DEFAULT_TROUSERS, TROUSERS_LEVELS, type TrousersSide } from '../src/fold/trousers';
import { buildCloche, clocheGeometry, DEFAULT_CLOCHE, CLOCHE_LEVELS, type ClocheSide } from '../src/fold/cloche';
import { buildShellTop, shellGeometry, DEFAULT_SHELL, SHELL_LEVELS, type ShellSide } from '../src/fold/shellTop';
import { buildKinchaku, KINCHAKU_LEVELS, KINCHAKU_ROUND } from '../src/fold/kinchaku';
import { DEFAULT_OPTIONS, garmentDecisions, decisionStep, sharedFoldPrefix, optionsFromParams, optionsToParams } from '../src/fold/garmentOptions';
import { buildGarment, garmentIdFrom, attachmentAnchors, garmentExperiment, garmentDisplayAngle, GARMENTS, type GarmentId } from '../src/fold/garments';
import { RETIRED_DESIGNS, BROWSE_GARMENTS, ALL_GARMENTS_IN_ORDER } from '../src/ui/designOrder';
import { recommendedSquareCm } from '../src/fold/paperSize';
import { checkState, isFlipped, modelPoly, type SheetState } from '../src/fold/engine';
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
const covered = (s: SheetState, x: number, y: number) => covering(s, x, y).length > 0;
const topAt = (s: SheetState, x: number, y: number) => covering(s, x, y).sort((a, b) => b.rank - a.rank)[0];
const need = <T>(f: T | undefined, x: number, y: number): T => { if (!f) throw new Error(`no paper at (${x.toFixed(3)}, ${y.toFixed(3)})`); return f; };
const frontFace = (s: SheetState, x: number, y: number) => (isFlipped(need(topAt(s, x, y), x, y)) ? 'reverse' : 'print');
const opposite = (s: 'print' | 'reverse') => (s === 'print' ? 'reverse' : 'print');
/** Covered extent along a row: the widest x reached by paper at height y. */
const rowMax = (s: SheetState, y: number) => Math.max(...s.facets.flatMap((f) => {
  const p = ccw(modelPoly(f)), xs: number[] = [];
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length];
    if ((a.y - y) * (b.y - y) <= 0 && a.y !== b.y) xs.push(a.x + ((y - a.y) / (b.y - a.y)) * (b.x - a.x));
  }
  return xs;
}));
const halfWidthAt = (s: SheetState, y: number) => rowMax(s, y);

// --- registration, the colour choices and the retired designs
const NEW: GarmentId[] = ['trousers', 'cloche', 'shell-top', 'kinchaku'];
for (const id of NEW) {
  assert.equal(garmentIdFrom(id), id);
  assert(garmentExperiment(id), `${id} is listed as an experiment`);
  assert(BROWSE_GARMENTS.some((g) => g.id === id), `${id} is browsable`);
}
assert.deepEqual(attachmentAnchors('cloche', 1, -1), [], 'the cloche is a board piece with no accessory positions');
assert.deepEqual(attachmentAnchors('kinchaku', 1, -1), [], 'the pouch is a board piece with no accessory positions');
assert.deepEqual(Object.fromEntries(NEW.map((id) => [id, recommendedSquareCm(id)])), { trousers: 20, cloche: 10, 'shell-top': 10, kinchaku: 10 });
assert.deepEqual([...RETIRED_DESIGNS].sort(), ['apron', 'boat-top', 'hat', 'tabard', 'tunic']);
for (const id of RETIRED_DESIGNS) {
  assert(!BROWSE_GARMENTS.some((g) => g.id === id), `${id} is retired from browsing`);
  assert.equal(garmentIdFrom(id), id, `${id} still opens by link`);
  assert.doesNotThrow(() => buildTimeline(buildGarment(id as GarmentId).ops), `${id} still folds`);
}
assert.deepEqual(ALL_GARMENTS_IN_ORDER.map((g) => g.id).sort(), GARMENTS.map((g) => g.id).sort(), 'the name selector keeps every design');
assert.deepEqual(ALL_GARMENTS_IN_ORDER.slice(-RETIRED_DESIGNS.length).map((g) => g.id).sort(), [...RETIRED_DESIGNS].sort(), 'retired designs come last');

assert.equal(DEFAULT_OPTIONS.trousersSide, DEFAULT_TROUSERS.side);
assert.equal(DEFAULT_OPTIONS.clocheSide, DEFAULT_CLOCHE.side);
assert.equal(DEFAULT_OPTIONS.shellSide, DEFAULT_SHELL.side);
const trousers = { print: buildTrousers(), reverse: buildTrousers({ ...DEFAULT_TROUSERS, side: 'reverse' }) };
const cloche = { print: buildCloche(), reverse: buildCloche({ ...DEFAULT_CLOCHE, side: 'reverse' }) };
const shell = { print: buildShellTop(), reverse: buildShellTop({ ...DEFAULT_SHELL, side: 'reverse' }) };
const kinchaku = buildKinchaku();
assert.deepEqual(buildGarment('kinchaku'), kinchaku);
assert.deepEqual(garmentDecisions('kinchaku'), [], 'the pouch has no colour choice: its rim is the fit-and-flare collar');
for (const [id, pair, key, option] of [
  ['trousers', trousers, 'trousers', 'trousersSide'], ['cloche', cloche, 'cloche', 'clocheSide'], ['shell-top', shell, 'shell-top', 'shellSide'],
] as const) {
  assert.deepEqual(buildGarment(id), pair.print);
  assert.deepEqual(buildGarment(id, { ...DEFAULT_OPTIONS, [option]: 'reverse' }), pair.reverse);
  const [decision, ...more] = garmentDecisions(id);
  assert.equal(more.length, 0);
  assert.equal(decision.id, option);
  assert.equal(decisionStep(pair.print, decision), 0, `${id}: the choice comes at the first fold`);
  assert.equal(decisionStep(pair.reverse, decision), 0);
  assert.equal(sharedFoldPrefix(pair.print, pair.reverse), 0);
  const params = new URLSearchParams();
  optionsToParams({ ...DEFAULT_OPTIONS, [option]: 'reverse' }, params);
  assert.equal(params.get(key), 'reverse');
  assert.equal(optionsFromParams(params)[option], 'reverse');
}
assert.equal(trousers.reverse.ops.length, trousers.print.ops.length, 'the reverse trousers only change two fold senses');
assert.equal(cloche.reverse.ops.length, cloche.print.ops.length + 1, 'the reverse cloche adds one turn');
assert.equal(shell.reverse.ops.length, shell.print.ops.length - 1, 'the reverse shell top skips one turn');
assert.equal(garmentDisplayAngle('trousers'), trousersGeometry().displayAngle, 'the trousers are shown turned by half the splay');
for (const id of ['cloche', 'shell-top', 'kinchaku'] as const) assert.equal(garmentDisplayAngle(id), 0);

// --- motion, continuity and the finished paper, for every piece and colourway
type Result = Record<string, unknown>;
const results: Record<string, Result> = {};
function motion(name: string, c: Construction, opLevels: Readonly<Record<string, number>>) {
  const tl = buildTimeline(c.ops);
  for (const [i, s] of tl.states.entries()) assert.deepEqual(checkState(s, `${name}:${i}`), []);
  let maxHingeGap = 0, maxEdgeLengthError = 0, minZ = Infinity, maxEndJump = 0;
  const perOperation = [];
  for (const op of tl.ops) {
    assert.deepEqual(hingeProblems(op, 21, 12, 8, opLevels), [], `${name}: ${op.op.id}`);
    let piercings = 0, gap = 0;
    for (let k = 0; k <= 80; k++) {
      const M = evaluateFrame(op, k / 80);
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
    perOperation.push({ id: op.op.id, maxHingeGap: gap, hingeGapInLevels: +(gap / LAYER_GAP).toFixed(2), allowanceInLevels: opLevels[op.op.id] ?? null, strictTrianglePiercings: piercings });
  }
  // every listed allowance is the measured gap (to a level), so growth fails and slack is visible
  for (const [id, levels] of Object.entries(opLevels)) {
    const measured = perOperation.find((o) => o.id === id);
    assert(measured, `${name}: allowance for a missing operation ${id}`);
    assert(Math.abs(measured.hingeGapInLevels - levels) <= 1, `${name} ${id}: allowance ${levels} levels, measured ${measured.hingeGapInLevels}`);
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
  // paper layers each crease folds through, in the state it is folded from (a
  // flap fold counts only the layers it may move)
  const creaseLayers: Record<string, number> = {};
  c.ops.forEach((op, i) => {
    if (op.kind !== 'fold') return;
    for (const f of op.folds) {
      const pre = tl.states[i];
      const d = v2(f.b.x - f.a.x, f.b.y - f.a.y), L = Math.hypot(d.x, d.y);
      let worst = 0;
      for (let u = -3; u <= 3; u += 0.002) {
        const p = v2(f.a.x + (u * d.x) / L, f.a.y + (u * d.y) / L);
        worst = Math.max(worst, pre.facets.filter((g) => (!f.only || g.tags.includes(f.only)) && strictlyInside(ccw(modelPoly(g)), p)).length);
      }
      creaseLayers[f.name] = worst;
    }
  });
  return { tl, final, creaseLayers, summary: { operations: c.ops.length, facets: final.facets.length, maxHingeGap, maxEdgeLengthError, minZ, maxEndJump, perOperation } };
}
const outline = (s: SheetState) => s.facets.map((f) => ({ c: centroid(modelPoly(f)), a: Math.abs(signedArea(f.poly)) }))
  .map(({ c, a }) => `${c.x.toFixed(6)},${c.y.toFixed(6)},${a.toFixed(6)}`).map((k) => k.replace(/-0\.000000/g, '0.000000')).sort();
function risks(name: string, c: Construction, id: GarmentId, creaseLayers: Record<string, number>, limits: { layers: number; crease: number; facetMm: number; angle: number }) {
  const fm = foldMetrics(c, recommendedSquareCm(id));
  assert(fm.layers.max <= limits.layers, `${name}: ${fm.layers.max} layers at one point`);
  assert(Math.max(...Object.values(creaseLayers)) <= limits.crease, `${name}: a crease folds through ${JSON.stringify(creaseLayers)} layers`);
  assert(fm.narrowestFacetMm >= limits.facetMm, `${name}: a ${fm.narrowestFacetMm} mm facet`);
  assert(fm.sharpestCreaseAngleDeg >= limits.angle, `${name}: a ${fm.sharpestCreaseAngleDeg} degree corner`);
  assert(fm.shortestCreaseMm >= 0.45, `${name}: a ${fm.shortestCreaseMm} mm crease`);
  return fm;
}

// --- the trousers
const tg = trousersGeometry();
assert(Math.abs(tg.inseamA - tg.inseamB) < 1e-9, 'both inseams are the same length');
const trouserFinals: SheetState[] = [];
for (const side of ['print', 'reverse'] as TrousersSide[]) {
  const c = trousers[side];
  const { final, summary, creaseLayers } = motion(`trousers ${side}`, c, TROUSERS_LEVELS);
  trouserFinals.push(final);
  const stripe = opposite(side);
  const { t, w, edge, crotch, beta } = tg;
  const inner = w + edge; // the first leg's inner edge, and the crotch point's x
  const border = 0.0075; // the strip's folded outer edge, outside the stripe
  // the waist: one band of paper across both legs, nothing above it
  for (let x = edge + 0.002; x < rowMax(final, t - 0.002) - 0.002; x += 0.01) {
    assert(covered(final, x, t - 0.002), `trousers ${side}: waist at x=${x.toFixed(2)}`);
    assert(!covered(final, x, t + 0.003), `trousers ${side}: nothing above the waist at x=${x.toFixed(2)}`);
  }
  // the hips: joined down to the crotch point, an empty gap below it that widens
  assert(covered(final, inner, crotch.y + 0.01), `trousers ${side}: paper at the hips`);
  assert(!covered(final, inner + 0.001, crotch.y - 0.01), `trousers ${side}: the gap starts at the crotch`);
  let gapAt = (y: number) => { let x = inner + 0.0005; while (!covered(final, x, y) && x < 1) x += 0.0005; return x - inner; };
  assert(gapAt(-0.9) > gapAt(-0.6) && gapAt(-0.6) > 0.005, `trousers ${side}: the gap between the legs widens toward the hems`);
  // the legs: one colour, the stripe just inside each outer seam
  for (let y = t - 0.03; y > -0.98; y -= 0.05) {
    assert(covered(final, edge + 0.001, y) && !covered(final, edge - 0.003, y), `trousers ${side}: first leg's outer seam at y=${y.toFixed(2)}`);
    assert.equal(frontFace(final, edge + border + 0.0075, y), stripe, `trousers ${side}: first leg's stripe at y=${y.toFixed(2)}`);
    assert.equal(frontFace(final, 0.12, y), side, `trousers ${side}: first leg at y=${y.toFixed(2)}`);
  }
  for (const y of [crotch.y - 0.05, -0.6, -0.75, -0.9]) {
    const outer = rowMax(final, y);
    assert.equal(frontFace(final, outer - border - 0.0075 / Math.cos(2 * beta), y), stripe, `trousers ${side}: second leg's stripe at y=${y.toFixed(2)}`);
    assert.equal(frontFace(final, outer - 0.08, y), side, `trousers ${side}: second leg at y=${y.toFixed(2)}`);
  }
  // the second leg splays by twice the display turn
  const splay = Math.atan2(rowMax(final, -0.9) - rowMax(final, -0.5), 0.4);
  assert(Math.abs(splay - 2 * beta) < 2e-3, `trousers ${side}: the second leg splays ${(splay * 180) / Math.PI} degrees`);
  const fm = risks(`trousers ${side}`, c, 'trousers', creaseLayers, { layers: 40, crease: 16, facetMm: 3, angle: 40 });
  results[`trousers-${side}`] = { ...summary, ...fm, creaseLayers };
}
assert.deepEqual(outline(trouserFinals[0]), outline(trouserFinals[1]), 'both trouser colourways fold the paper to the same place');

// --- the cloche
const cg = clocheGeometry();
const clocheFinals: SheetState[] = [];
for (const side of ['print', 'reverse'] as ClocheSide[]) {
  const c = cloche[side];
  const { final, summary, creaseLayers } = motion(`cloche ${side}`, c, CLOCHE_LEVELS);
  clocheFinals.push(final);
  const { b, top: k, ribbon: r, halfWidth: s, halfTop: a, round: d } = cg;
  // the ribbon: exactly one band wide, the full width of the hat at its lower edge
  assert.equal(frontFace(final, 0, r + b / 2), opposite(side), `cloche ${side}: ribbon`);
  assert.equal(frontFace(final, 0, r - 0.003), side, `cloche ${side}: brim just under the ribbon`);
  assert.equal(frontFace(final, 0, r + b + 0.003), side, `cloche ${side}: crown just above the ribbon`);
  for (const sx of [-1, 1]) assert.equal(frontFace(final, sx * (s - 0.01), r + 0.004), opposite(side), `cloche ${side}: ribbon reaches the side`);
  // the brim: straight sides, the bottom fold
  for (const sx of [-1, 1]) for (const y of [0.01, r / 2, r - 0.01]) {
    assert(covered(final, sx * (s - 0.003), y) && !covered(final, sx * (s + 0.003), y), `cloche ${side}: brim side at y=${y}`);
    assert.equal(frontFace(final, sx * 0.5, y), side, `cloche ${side}: brim`);
  }
  assert(covered(final, 0, 0.003) && !covered(final, 0, -0.003), `cloche ${side}: brim edge`);
  // the crown: tapers in to its top, the top corners rounded
  assert(covered(final, 0, k - 0.003) && !covered(final, 0, k + 0.003), `cloche ${side}: crown top`);
  const mid = (r + k) / 2;
  assert(halfWidthAt(final, mid) < s - 0.05 && halfWidthAt(final, mid) > a, `cloche ${side}: crown tapers`);
  for (const sx of [-1, 1]) {
    assert(!covered(final, sx * (a - 0.01), k - 0.01), `cloche ${side}: top corner rounded`);
    assert(covered(final, sx * (a - d - 0.01), k - 0.003), `cloche ${side}: flat top before the rounding`);
  }
  const fm = risks(`cloche ${side}`, c, 'cloche', creaseLayers, { layers: 32, crease: 16, facetMm: 1.6, angle: 24.9 });
  results[`cloche-${side}`] = { ...summary, ...fm, creaseLayers };
}
assert.deepEqual(outline(clocheFinals[0]), outline(clocheFinals[1]), 'both cloche colourways fold the paper to the same place');

// --- the shell top
const sg = shellGeometry();
const shellFinals: SheetState[] = [];
for (const side of ['print', 'reverse'] as ShellSide[]) {
  const c = shell[side];
  const { final, summary, creaseLayers } = motion(`shell top ${side}`, c, SHELL_LEVELS);
  shellFinals.push(final);
  const { top, hem: a, bottom, neck: n, halfWidth: s } = sg;
  const nb = DEFAULT_SHELL.neckband, hb = DEFAULT_SHELL.hemband, drop = DEFAULT_SHELL.shoulderDrop;
  assert.equal(frontFace(final, 0, top - nb / 2), opposite(side), `shell ${side}: neckband`);
  assert.equal(frontFace(final, 0, a - hb / 2), opposite(side), `shell ${side}: hem band`);
  assert(Math.abs(bottom - (a - hb)) < 1e-12 && covered(final, 0, bottom + 0.003) && !covered(final, 0, bottom - 0.003), `shell ${side}: only the hem band shows below the hem`);
  for (const y of [top - nb - 0.01, 0.5, 0, a + 0.01]) assert.equal(frontFace(final, 0.2, y), side, `shell ${side}: body at y=${y}`);
  for (const sx of [-1, 1]) {
    for (const y of [a, 0.2, top - drop - 0.01]) assert(covered(final, sx * (s - 0.003), y) && !covered(final, sx * (s + 0.003), y), `shell ${side}: side at y=${y}`);
    assert(!covered(final, sx * (s - 0.01), top - 0.01), `shell ${side}: shoulder slopes`);
    assert(covered(final, sx * (n - 0.005), top - 0.002) && !covered(final, sx * (n + 0.01), top - 0.002), `shell ${side}: neckband ends`);
  }
  assert(!covered(final, 0, top + 0.003), `shell ${side}: top edge`);
  const fm = risks(`shell top ${side}`, c, 'shell-top', creaseLayers, { layers: 8, crease: 4, facetMm: 2.9, angle: 43 });
  results[`shell-top-${side}`] = { ...summary, ...fm, creaseLayers };
}
assert.deepEqual(outline(shellFinals[0]), outline(shellFinals[1]), 'both shell top colourways fold the paper to the same place');

// --- the kinchaku pouch
{
  const { final, summary, creaseLayers } = motion('kinchaku', kinchaku, KINCHAKU_LEVELS);
  const ys = final.facets.flatMap((f) => modelPoly(f).map((p) => p.y));
  const top = Math.max(...ys), bottom = Math.min(...ys);
  // colours down the middle: the rim in the reverse colour, then the body
  let rimBottom = top;
  while (frontFace(final, 0, rimBottom - 0.001) === 'reverse') rimBottom -= 0.001;
  assert(top - rimBottom > 0.1 && top - rimBottom < 0.2, `kinchaku: a rim ${(top - rimBottom).toFixed(3)} deep`);
  for (let y = rimBottom - 0.01; y > bottom + 0.01; y -= 0.05) assert.equal(frontFace(final, 0, y), 'print', `kinchaku: body at y=${y.toFixed(2)}`);
  // the outline: in from the rim to a gathered neck, out to a full body, rounded at the base
  const widths: [number, number][] = [];
  for (let y = top - 0.005; y > bottom + 0.005; y -= 0.005) widths.push([y, halfWidthAt(final, y)]);
  const neck = widths.filter(([y]) => y < rimBottom && y > -0.3).reduce((m, q) => (q[1] < m[1] ? q : m));
  const body = widths.filter(([y]) => y < neck[0]).reduce((m, q) => (q[1] > m[1] ? q : m));
  const rim = widths[0][1];
  assert(rim - neck[1] > 0.1, `kinchaku: the neck is gathered in from the rim (${rim.toFixed(3)} to ${neck[1].toFixed(3)})`);
  assert(body[1] - neck[1] > 0.15, `kinchaku: the body is fuller than the neck (${body[1].toFixed(3)} to ${neck[1].toFixed(3)})`);
  assert(widths.at(-1)![1] < body[1] - KINCHAKU_ROUND / 2, 'kinchaku: the base is rounded');
  // underneath the rounded corners, nothing: they fold in, not out
  assert(!covered(final, body[1] - 0.01, bottom + 0.01) && !covered(final, -body[1] + 0.01, bottom + 0.01), 'kinchaku: base corners fold in');
  const fm = risks('kinchaku', kinchaku, 'kinchaku', creaseLayers, { layers: 14, crease: 4, facetMm: 2.8, angle: 13.9 });
  results.kinchaku = { ...summary, ...fm, creaseLayers, outline: { rimHalfWidth: +rim.toFixed(3), neckHalfWidth: +neck[1].toFixed(3), neckAt: +neck[0].toFixed(3), bodyHalfWidth: +body[1].toFixed(3), bodyAt: +body[0].toFixed(3) } };
}

// --- what the instructions say matches the creases they describe
// Measurements written in a step's hint are read back and compared with the crease
// coordinates (fractions of the square's side, which spans 2 units).
const percents = (text: string) => [...text.matchAll(/(\d+(?:\.\d+)?)%/g)].map((m) => Number(m[1]) / 100);
const degreesIn = (text: string) => [...text.matchAll(/(\d+(?:\.\d+)?) degrees/g)].map((m) => Number(m[1]));
const near = (a: number, b: number, tol: number, what: string) => assert(Math.abs(a - b) <= tol + 1e-9, `${what}: written ${a}, creases say ${b}`);
const fold = (c: Construction, id: string) => {
  const op = c.ops.find((o) => o.id === id);
  assert(op && op.kind === 'fold', `${id} is a fold`);
  return op;
};
for (const side of ['print', 'reverse'] as const) {
  const c = trousers[side];
  const sides = fold(c, 'tr-sides'), waist = fold(c, 'tr-waist'), up = fold(c, 'tr-up');
  const landed = 2 * Math.abs(sides.folds[0].a.x) - 1; // where the side edge lands, from the centre line
  near(percents(sides.hint)[0], landed / 2, 5e-4, 'trousers: side edges stop short of the centre');
  near(percents(sides.hint)[1], landed, 5e-4, 'trousers: band between them');
  near(percents(waist.hint)[0], (1 - waist.folds[0].a.y) / 2, 5e-4, 'trousers: waist below the top');
  const f = up.folds[0], angle = (Math.atan(Math.abs((f.b.y - f.a.y) / (f.b.x - f.a.x))) * 180) / Math.PI;
  near(degreesIn(up.hint)[0], angle, 0.5, 'trousers: second turn to the waist');
  near(percents(up.hint)[0], DEFAULT_TROUSERS.crotch / 2, 5e-4, 'trousers: crotch below the waist');
  near(tg.t - DEFAULT_TROUSERS.crotch, tg.crotch.y, 1e-12, 'trousers: crotch point');
}
for (const side of ['print', 'reverse'] as const) {
  const c = cloche[side];
  const bands = fold(c, 'cl-bands'), crown = fold(c, 'cl-crown'), sides = fold(c, 'cl-sides'), taper = fold(c, 'cl-taper'), round = fold(c, 'cl-round');
  near(percents(bands.hint)[0], (1 - bands.folds[0].a.y) / 2, 5e-4, 'cloche: bands');
  near(percents(crown.hint)[0], crown.folds[0].a.y / 2, 5e-4, 'cloche: crown above the bottom fold');
  near(percents(sides.hint)[0], Math.abs(sides.folds[0].a.x - sides.folds[1].a.x) / 2, 5e-4, 'cloche: hat width');
  const t = taper.folds[0];
  near(percents(taper.hint)[0], Math.abs(t.b.x) / 2, 5e-4, 'cloche: crown top from the middle');
  assert(Math.abs(t.a.y - cg.ribbon) < 1e-12, 'cloche: the taper starts at the ribbon\'s lower edge');
  const rr = round.folds[0];
  near(percents(round.hint)[0], Math.abs(rr.b.x - -cg.halfTop) / 2, 5e-4, 'cloche: rounding along the top');
  near(Math.hypot(rr.a.x + cg.halfTop, rr.a.y - cg.top), cg.round, 1e-12, 'cloche: rounding along the taper');
}
for (const side of ['print', 'reverse'] as const) {
  const c = shell[side];
  const bands = fold(c, 'sh-bands'), hem = fold(c, 'sh-hem'), pleat = fold(c, 'sh-pleat'), sides = fold(c, 'sh-sides'), shoulders = fold(c, 'sh-shoulders');
  near(percents(bands.hint)[0], (1 - bands.folds[0].a.y) / 2, 5e-4, 'shell: neckband');
  near(percents(bands.hint)[1], (bands.folds[1].a.y + 1) / 2, 5e-4, 'shell: hem band');
  const foldedBottom = bands.folds[1].a.y;
  near(percents(hem.hint)[0], (hem.folds[0].a.y - foldedBottom) / 2, 5e-4, 'shell: hem above the folded bottom edge');
  near(percents(pleat.hint)[0], (pleat.folds[0].a.y - hem.folds[0].a.y) / 2, 5e-4, 'shell: pleat above the hem');
  near(percents(sides.hint)[0], Math.abs(sides.folds[0].a.x - sides.folds[1].a.x) / 2, 5e-4, 'shell: width');
  const sh = shoulders.folds[0];
  near(percents(shoulders.hint)[0], Math.abs(sh.b.x) / 2, 5e-4, 'shell: neckband half-width');
  near(percents(shoulders.hint)[1], (sh.b.y - sh.a.y) / 2, 5e-4, 'shell: shoulder drop');
}
{
  const r = fold(kinchaku, 'kb-round'), f = r.folds[0];
  near(percents(r.hint)[0], KINCHAKU_ROUND / 2, 5e-3, 'kinchaku: base rounding');
  near(degreesIn(r.hint)[0], (Math.atan(Math.abs((f.b.y - f.a.y) / (f.b.x - f.a.x))) * 180) / Math.PI, 1e-9, 'kinchaku: rounding angle');
}

const metrics = {
  trousers: {
    startingSquareCm: recommendedSquareCm('trousers'), params: DEFAULT_TROUSERS,
    geometry: { waistY: +tg.t.toFixed(4), crotchBelowWaist: DEFAULT_TROUSERS.crotch, inseam: +tg.inseam.toFixed(4), splayDeg: 2 * DEFAULT_TROUSERS.splay, displayTurnDeg: +((tg.displayAngle * 180) / Math.PI).toFixed(2) },
    colourways: { print: results['trousers-print'], reverse: results['trousers-reverse'] },
  },
  cloche: { startingSquareCm: recommendedSquareCm('cloche'), params: DEFAULT_CLOCHE, geometry: cg, colourways: { print: results['cloche-print'], reverse: results['cloche-reverse'] } },
  shellTop: { startingSquareCm: recommendedSquareCm('shell-top'), params: DEFAULT_SHELL, geometry: sg, colourways: { print: results['shell-top-print'], reverse: results['shell-top-reverse'] } },
  kinchaku: { startingSquareCm: recommendedSquareCm('kinchaku'), round: KINCHAKU_ROUND, result: results.kinchaku },
  retired: RETIRED_DESIGNS,
  samplesPerOperation: 81,
  limits: 'Thin rigid facets, sampled motion. Layer counts are paper layers stacked at a point, not rendering offsets. No paper thickness, springback, continuous-collision or physical-paper certification.',
};
if (process.argv.includes('--dump')) {
  mkdirSync('docs/wardrobe-gaps/evidence', { recursive: true });
  writeFileSync('docs/wardrobe-gaps/evidence/geometry.json', JSON.stringify(metrics, null, 2) + '\n');
}
if (process.argv.includes('--print')) console.log(JSON.stringify(metrics, null, 2));
console.log('trousers, cloche, shell top and kinchaku checks passed');

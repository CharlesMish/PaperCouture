import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { buildPin } from '../src/fold/pin';
import { buildBowWing } from '../src/fold/bow';
import { buildPleatedSkirt } from '../src/fold/pleatedSkirt';
import { checkState, isFlipped, modelPoly } from '../src/fold/engine';
import { Vec2, centroid, signedArea, splitConvex } from '../src/fold/geometry';
import { buildTimeline, evaluateFrame, LAYER_GAP, posePoint } from '../src/fold/timeline';

const construction = buildPleatedSkirt();
const tl = buildTimeline(construction.ops);
const errors = tl.states.flatMap((s, i) => checkState(s, `pleats state ${i}`));
const inside = (poly: Vec2[], p: Vec2) => poly.every((a, i) => {
  const b = poly[(i + 1) % poly.length];
  return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x) >= -1e-10;
});
const dist = (a: number[], b: number[]) => Math.hypot(...a.map((v, i) => v - b[i]));
let worstGap = 0, lowestZ = Infinity, maxStack = 0;
for (const anim of tl.ops) {
  maxStack = Math.max(maxStack, ...anim.pieces.map(p => p.postZ));
  for (let k = 0; k <= 40; k++) {
    const M = evaluateFrame(anim, k / 40);
    for (const h of anim.hinges) for (const m of [h.m0, h.m1]) {
      worstGap = Math.max(worstGap, dist(posePoint(M, h.a * 12, m.x, m.y), posePoint(M, h.b * 12, m.x, m.y)));
    }
    for (const p of anim.pieces) for (const m of p.poly) lowestZ = Math.min(lowestZ, posePoint(M, p.index * 12, m.x, m.y)[2]);
  }
}
for (let k = 0; k < tl.ops.length - 1; k++) {
  const A = tl.ops[k], B = tl.ops[k + 1];
  const MA = evaluateFrame(A, 1), MB = evaluateFrame(B, 0);
  for (const p of B.pieces) {
    const prior = A.pieces.find(q => inside(q.poly, centroid(p.poly)));
    assert(prior, `no material ancestor at ${k}`);
    for (const m of p.poly) assert(dist(posePoint(MA, prior.index * 12, m.x, m.y), posePoint(MB, p.index * 12, m.x, m.y)) < 1e-9, `endpoint jump at ${k}`);
  }
}
assert.deepEqual(errors, []);
assert(worstGap <= 8 * LAYER_GAP, `hinge gap ${worstGap}`);
assert(lowestZ >= -1e-9, `below table: ${lowestZ}`);
assert(construction.ops.every(op => op.kind === 'turn' || op.folds.every(f => f.sense === 'valley')), 'a fold pushes away from the visible face');

const final = tl.states[tl.states.length - 1];
const visibleAt = (x: number, y: number) => final.facets.filter(f => {
  const poly = modelPoly(f);
  return inside(signedArea(poly) < 0 ? poly.slice().reverse() : poly, {x, y});
}).sort((a, b) => b.rank - a.rank)[0];
for (const [x, tag] of [[-0.53, 'pleat-return-left'], [0.53, 'pleat-return-right']] as const) {
  const f = visibleAt(x, 0);
  assert(f?.tags.includes(tag), `${tag} does not show on the front`);
  assert(!isFlipped(f), `${tag} should show printed paper`);
}
assert(visibleAt(0, 0) && !isFlipped(visibleAt(0, 0)), 'central front missing');
for (const x of [-0.63, 0.63]) assert(isFlipped(visibleAt(x, 0)), 'reverse pleat channel missing');
assert(isFlipped(visibleAt(0, 0.67)), 'reverse waistband missing');
for (const x of [-0.34, 0, 0.34]) assert(visibleAt(x, 0.635), 'waist anchor outside paper');
// Subtract the union of real retained garment facets from each transformed
// accessory facet. An empty remainder proves projected footprint coverage,
// including polygon interiors, instead of checking only anchor/vertex samples.
const garmentPolys = final.facets.map(modelPoly).map(p => signedArea(p) < 0 ? p.slice().reverse() : p);
function outsideConvex(subject: Vec2[], clip: Vec2[]): Vec2[][] {
  const result: Vec2[][] = [];
  let remainder: Vec2[] | null = subject;
  for (let i = 0; i < clip.length && remainder; i++) {
    const a = clip[i], b = clip[(i + 1) % clip.length];
    const split = splitConvex(remainder, p => (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x));
    if (split.neg) result.push(split.neg);
    remainder = split.pos;
  }
  return result;
}
const accessoryCoverage: {accessory: string; x: number; y: number; uncoveredArea: number}[] = [];
for (const [name, c] of [['pin', buildPin()], ['bow', buildBowWing()]] as const) {
  const states = buildTimeline(c.ops).states;
  const component = states[states.length - 1].facets.map(modelPoly);
  const transforms = name === 'pin' ? [{angle: 0, offset: 0, scale: 0.16 * 0.75}]
    : [{angle: -Math.PI / 4, offset: -1.27, scale: 0.19 * 0.75}, {angle: 3 * Math.PI / 4, offset: 1.27, scale: 0.19 * 0.75}];
  for (const x of [-0.34, 0, 0.34]) {
    let uncoveredArea = 0;
    for (const tr of transforms) for (const poly of component) {
      const footprint = poly.map(p => ({
        x: x + (p.x * Math.cos(tr.angle) - p.y * Math.sin(tr.angle) + tr.offset) * tr.scale,
        y: 0.635 + (p.x * Math.sin(tr.angle) + p.y * Math.cos(tr.angle)) * tr.scale,
      }));
      let uncovered = [signedArea(footprint) < 0 ? footprint.slice().reverse() : footprint];
      for (const garment of garmentPolys) uncovered = uncovered.flatMap(p => outsideConvex(p, garment));
      uncoveredArea += uncovered.reduce((a, p) => a + Math.abs(signedArea(p)), 0);
    }
    assert(uncoveredArea < 1e-10, `${name} at ${x} extends past the garment by area ${uncoveredArea}`);
    accessoryCoverage.push({accessory: name, x, y: 0.635, uncoveredArea});
  }
}
const points = final.facets.flatMap(modelPoly);
const xs = points.map(p => p.x), ys = points.map(p => p.y);
const summary = { name: construction.name, steps: construction.ops.length, facets: final.facets.length,
  width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys),
  top: Math.max(...ys), bottom: Math.min(...ys), maxStack, worstGap, lowestZ,
  accessoryCoverage,
  anchors: [-0.34, 0, 0.34].map(x => ({x, y: 0.635})),
  disclaimer: 'Geometry checks are not physical-paper or continuous-collision certification.' };
console.log(JSON.stringify(summary, null, 2));
if (process.argv.includes('--dump')) {
  mkdirSync('docs/geometry-collection/pleats', {recursive:true});
  writeFileSync('docs/geometry-collection/pleats/metrics.json', JSON.stringify(summary, null, 2) + '\n');
  writeFileSync('docs/geometry-collection/pleats/states.json', JSON.stringify(tl.states.map(s => s.facets.map(f => ({model: modelPoly(f), material: f.poly, rank: f.rank, flipped: isFlipped(f), tags: f.tags})))));
}
console.log('Pleated skirt checks passed.');

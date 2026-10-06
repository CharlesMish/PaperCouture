import assert from 'node:assert/strict';
import { COMPANION_CONSTRUCTIONS as CANDIDATES } from '../src/fold/companionFolds';
import { applyFold, checkState, modelPoly, isFlipped, unfoldedSquare, type FoldSpec, type SheetState } from '../src/fold/engine';
import { applyAffine, centroid, signedArea, Vec2, v2 } from '../src/fold/geometry';
import { buildTimeline, evaluateFrame, posePoint, LAYER_GAP } from '../src/fold/timeline';
import { FoldController } from '../src/app/controller';
import { interiorPiercing } from './experiment-collision';

const inside = (poly: Vec2[], p: Vec2) => poly.every((a, i) => { const b = poly[(i + 1) % poly.length]; return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x) >= -1e-10; });
const distance = (a: number[], b: number[]) => Math.hypot(...a.map((x, i) => x - b[i]));
const materialFacet = (state: SheetState, point: Vec2) => state.facets.find(f => inside(f.poly, point))!;
/** Reference endpoints only: the proposed mountain creases, interpreted by
 * THIS engine. They are not played because mountains swing toward the table.
 * The production adaptation must preserve every sampled material position and
 * material face; a visually similar silhouette would not establish that. */
function proposedBootRestingState(id: string): SheetState {
  const specs: FoldSpec[] = [];
  const add = (name: string, a: Vec2, b: Vec2, moving: Vec2, sense: 'valley' | 'mountain' = 'mountain') => specs.push({ name, a, b, moving, sense });
  const sign = id === 'boot-right' ? 1 : -1;
  const X = (x: number, y: number) => v2(sign * x, y);
  const t = 1/3, y = .45, end = y + 1 - t;
  add('first',X(-t,-1),X(-t,1),X(-1,0));
  add('second',X(t,-1),X(t,1),X(1,0));
  add('ankle',X(-t,y),X(t,y-2*t),X(0,-1));
  add('toe',X(end-.28,y),X(end,y-.3),X(end,y));
  return specs.reduce((state,spec)=>applyFold(state,spec).state,unfoldedSquare());
}
const finalStates = new Map<string, SheetState>();
for (const [id, build] of Object.entries(CANDIDATES)) {
  const c = build(), tl = buildTimeline(c.ops);
  for (const [i, s] of tl.states.entries()) assert.deepEqual(checkState(s, `${id}:${i}`), []);
  assert.equal(new Set(c.ops.map(op => op.id)).size, c.ops.length);
  assert(c.ops.every(op => op.kind === 'turn' || op.folds.every(f => f.sense === 'valley')));
  let gap = 0, lowest = Infinity, piercings = 0; let largestHingeAt = {op:'', fraction:0};
  for (const op of tl.ops) for (let i = 0; i <= 80; i++) {
    const M = evaluateFrame(op, i / 80);
    for (const p of op.pieces) for (let j = 0; j < p.poly.length; j++) {
      const a = p.poly[j], b = p.poly[(j + 1) % p.poly.length];
      assert(Math.abs(distance(posePoint(M, p.index * 12, a.x, a.y), posePoint(M, p.index * 12, b.x, b.y)) - Math.hypot(a.x - b.x, a.y - b.y)) < 1e-9, `${id}: facet stretches during motion`);
    }
    for (const h of op.hinges) for (const m of [h.m0, h.m1]) { const d = distance(posePoint(M, h.a * 12, m.x, m.y), posePoint(M, h.b * 12, m.x, m.y)); if(d>gap){gap=d;largestHingeAt={op:op.op.id,fraction:i/80};} }
    const triangles = op.pieces.flatMap(p => p.poly.slice(1, -1).map((_, j) => ({ id: p.id, points: [p.poly[0], p.poly[j + 1], p.poly[j + 2]].map(m => posePoint(M, p.index * 12, m.x, m.y)) })));
    for (const p of op.pieces) for (const m of p.poly) lowest = Math.min(lowest, posePoint(M, p.index * 12, m.x, m.y)[2]);
    for (let a = 0; a < triangles.length; a++) for (let b = a + 1; b < triangles.length; b++) if (triangles[a].id !== triangles[b].id && interiorPiercing(triangles[a].points, triangles[b].points)) piercings++;
  }
  for (let i = 1; i < tl.ops.length; i++) {
    const a = tl.ops[i - 1], b = tl.ops[i], A = evaluateFrame(a, 1), B = evaluateFrame(b, 0);
    for (const p of b.pieces) {
      const source = a.pieces.find(q => inside(q.poly, centroid(p.poly))); assert(source);
      for (const m of p.poly) assert(distance(posePoint(A, source.index * 12, m.x, m.y), posePoint(B, p.index * 12, m.x, m.y)) < 1e-9);
    }
  }
  assert(gap <= 8 * LAYER_GAP); assert(lowest >= -1e-9); assert.equal(piercings, 0);
  // Face exposure is a normal-projection diagnostic, not a Display-camera oracle.
  const final = tl.states.at(-1)!; finalStates.set(id, final);
  if (id.startsWith('boot-')) {
    const reference = proposedBootRestingState(id);
    for (let j=0;j<40;j++) for (let i=0;i<40;i++) {
      const material = v2(-1+(i+.314159)/20,-1+(j+.271828)/20);
      const actualFacet = materialFacet(final, material), expectedFacet = materialFacet(reference, material);
      assert(actualFacet && expectedFacet);
      const actual = applyAffine(actualFacet.T, material), expected = applyAffine(expectedFacet.T, material);
      assert(Math.hypot(actual.x-expected.x,actual.y-expected.y)<1e-9, `${id}: turn/valley adaptation changed material endpoint`);
      assert.equal(isFlipped(actualFacet),isFlipped(expectedFacet), `${id}: adaptation changed material face`);
    }
  }
  assert(Math.abs(final.facets.reduce((sum, f) => sum + signedArea(f.poly), 0) - 4) < 1e-10);
  const hit = (x: number, y: number) => final.facets.filter(f => {
    const p = modelPoly(f); return inside(signedArea(p) < 0 ? p.reverse() : p, {x, y});
  }).sort((a, b) => b.rank - a.rank)[0];
  if (id === 'capelet') {
    for (const y of [.15, .35, .55, .8]) assert(isFlipped(hit(0, y)), 'Real reverse lining is exposed between the front panels');
    for (const x of [-.45, .45]) assert(!isFlipped(hit(x, .35)), 'Both separate front panels show printed material');
    const liningWidth = (y: number) => Array.from({length: 1000}, (_, n) => -.5 + (n + .5) / 1000).filter(x => { const f = hit(x, y); return f && isFlipped(f); }).length / 1000;
    assert(liningWidth(.15) > liningWidth(.8) + .2, 'The real panel edges separate toward the hem');
  }
  let covered = 0, reverse = 0;
  for (let y = -1; y < 1; y += .01) for (let x = -1; x < 1; x += .01) {
    const hit = final.facets.filter(f => { const p = modelPoly(f); return inside(signedArea(p) < 0 ? p.reverse() : p, { x: x + .005, y: y + .005 }); }).sort((a, b) => b.rank - a.rank)[0];
    if (hit) { covered++; if (isFlipped(hit)) reverse++; }
  }
  if (id.startsWith('boot-')) assert.equal(reverse, 0, 'both mirrored boots keep their printed face');
  else assert(reverse / covered > .25 && reverse / covered < .6, 'capelet exposes continuous lining while retaining two visible printed panels');
  const ctrl = new FoldController(c.ops.length, () => 1);
  for (let i = 0; i < c.ops.length; i++) { ctrl.next(); ctrl.update(2); assert.equal(ctrl.step, i + 1); }
  for (let i = c.ops.length; i > 0; i--) { ctrl.prev(); ctrl.update(2); assert.equal(ctrl.step, i - 1); }
  ctrl.next(); ctrl.update(.35); const pose = ctrl.pose(); ctrl.prev(); assert.deepEqual(ctrl.pose(), pose); ctrl.update(2); assert.equal(ctrl.step, 0);
  ctrl.next(); ctrl.update(.35); ctrl.reset(); assert.equal(ctrl.step, 0); assert(!ctrl.moving);
  const points = final.facets.flatMap(modelPoly);
  const width = Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x));
  const height = Math.max(...points.map(p=>p.y))-Math.min(...points.map(p=>p.y));
  if (id === 'capelet') assert(width > 1.35 && width < 1.45, 'Capelet remains a broad shoulder layer');
  else assert(Math.abs(width-1.45)<1e-9);
  assert(Math.abs(height-(id==='capelet'?1:1.2166666666666668))<1e-9);
  console.log(JSON.stringify({id,steps:c.ops.length,facets:final.facets.length,width,height,retainedArea:final.facets.reduce((sum,f)=>sum+signedArea(f.poly),0),maxHingeGap:gap,largestHingeAt,hingeLimit:8*LAYER_GAP,minHeight:lowest,reverseFraction:reverse/covered,strictTrianglePiercings:piercings,samplesPerOperation:81,materialEndpointAndFaceSamples:id.startsWith('boot-')?1600:0}));
}
const left = finalStates.get('boot-left')!, right = finalStates.get('boot-right')!;
for(let j=0;j<40;j++)for(let i=0;i<40;i++){
  const material = v2(-1+(i+.314159)/20,-1+(j+.271828)/20), mirrored = v2(-material.x,material.y);
  const lf = materialFacet(left, mirrored), rf = materialFacet(right, material);
  const l = applyAffine(lf.T,mirrored), r = applyAffine(rf.T,material);
  assert(Math.hypot(l.x+r.x,l.y-r.y)<1e-9,'boot variants must mirror the creases, not the printed face');
  assert.equal(isFlipped(lf),isFlipped(rf));
}
console.log('These checks do not certify physical foldability or continuous collision-free motion.');

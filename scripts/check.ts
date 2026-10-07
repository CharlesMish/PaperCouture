// Geometry and state checks for the folding sequence. Run: npm run check
// Add --dump to write every resting state to docs/states.json (used for plots).
//
// What this catches:
//  - tears, holes, non-rigid facets, lost area (checkState)
//  - a fold that would lift paper trapped under other paper (applyFold throws)
//  - a jump between the end of one fold and the start of the next
//  - pieces coming apart mid-animation, or paper dipping into the table
//  - collapse steps whose creases do not close (the step would not be rigid)
//  - a finished crease pattern that breaks Maekawa or Kawasaki at any vertex

import { dragVector } from '../src/ui/foldHandles';
import { writeFileSync } from 'node:fs';
import { attachmentAnchors } from '../src/fold/garments';
import { buildWrapSkirt } from '../src/fold/wrapSkirt';
import { buildLapelVest } from '../src/fold/lapelVest';
import { buildDress } from '../src/fold/construction';
import { buildJacket } from '../src/fold/jacket';
import { buildBowWing } from '../src/fold/bow';
import { buildSilhouette } from '../src/fold/silhouettes';
import { buildPin } from '../src/fold/pin';
import { buildSailorTop } from '../docs/geometry-collection/drafts/sailor/sailorTopStudy';
import { buildNeckerchief } from '../src/fold/neckerchief';
import { buildPocketSquare } from '../src/fold/pocketSquare';
import { buildTulip } from '../src/fold/tulip';
import { buildFitFlare } from '../src/fold/fitFlare';
import { collapseAngles, loopResidual } from '../src/fold/collapse';
import { creasePattern, vertexProblems } from './crease_pattern';
import { COLLAR_Y, SIDE_APEX_Y, SIDE_HALF_ANGLE } from '../src/papers/dressMarks';
import { checkState, isFlipped, modelPoly } from '../src/fold/engine';
import { buildTimeline, evaluateFrame, posePoint, LAYER_GAP } from '../src/fold/timeline';
import { Vec2, centroid, signedArea } from '../src/fold/geometry';
import { FoldController } from '../src/app/controller';
import { checkTwoSidedRotation } from './rotationCheck';

const errors: string[] = [];
for (const construction of [buildDress(), buildSilhouette('straight'), buildSilhouette('flare'), buildJacket(), buildPin(), buildBowWing(), buildWrapSkirt(), buildLapelVest(),
  // Drafts (docs/geometry-collection/drafts/NOTES.md)
  buildJacket(undefined, 'turned'), buildSailorTop() /* parked study */, buildNeckerchief(), buildPocketSquare(),
  // PR #13 exploration
  buildTulip(), buildWrapSkirt({ length: 'short' }), buildWrapSkirt({ length: 'long' }),
  // PR #14
  buildLapelVest('pointed'),
  // fit-and-flare: the waist is a collapse step (src/fold/collapse.ts)
  buildFitFlare()]) {
const tl = buildTimeline(construction.ops);

tl.states.forEach((s, i) => errors.push(...checkState(s, `state ${i}`)));

const inside = (poly: Vec2[], p: Vec2) => {
  // convex, CCW material polygons
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    if ((b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x) < -1e-12) return false;
  }
  return true;
};

const dist3 = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

// 1. End of op k must equal start of op k+1 (no teleporting between steps).
for (let k = 0; k + 1 < tl.ops.length; k++) {
  const A = tl.ops[k];
  const B = tl.ops[k + 1];
  const MA = evaluateFrame(A, 1);
  const MB = evaluateFrame(B, 0);
  for (const pb of B.pieces) {
    const c = centroid(pb.poly);
    const pa = A.pieces.find((p) => inside(p.poly, c));
    if (!pa) {
      errors.push(`op ${k + 1}: piece ${pb.id} has no source in op ${k}`);
      continue;
    }
    for (const m of pb.poly) {
      const x = posePoint(MA, pa.index * 12, m.x, m.y);
      const y = posePoint(MB, pb.index * 12, m.x, m.y);
      if (dist3(x, y) > 1e-9) {
        errors.push(`op ${k}->${k + 1}: piece ${pb.id} jumps by ${dist3(x, y).toExponential(2)}`);
        break;
      }
    }
  }
}

// 2. Mid-animation: hinged pieces stay together, nothing goes under the table.
// Layers are drawn LAYER_GAP apart, so a hinge between a low and a high layer is
// already open by their height difference at rest; a tear is a hinge that opens
// well beyond that while it swings. For stacks up to 8 layers deep this is the
// old absolute limit.
let worstGap = 0;
let worstExcess = 0;
let lowestZ = Infinity;
for (const op of tl.ops) {
  const frames = Array.from({ length: 21 }, (_, s) => evaluateFrame(op, s / 20));
  for (const h of op.hinges) {
    for (const m of [h.m0, h.m1]) {
      const gaps = frames.map((M) => dist3(posePoint(M, h.a * 12, m.x, m.y), posePoint(M, h.b * 12, m.x, m.y)));
      worstGap = Math.max(worstGap, ...gaps);
      worstExcess = Math.max(worstExcess, Math.max(...gaps) - Math.max(gaps[0], gaps[gaps.length - 1]));
    }
  }
  for (const M of frames) {
    for (const p of op.pieces) {
      for (const m of p.poly) lowestZ = Math.min(lowestZ, posePoint(M, p.index * 12, m.x, m.y)[2]);
    }
  }
  // collapse steps: every loop of creases must close at every stage
  if (op.collapse) {
    let worst = 0;
    for (let s = 1; s < 40; s++) {
      for (const r of loopResidual(op.collapse, collapseAngles(op.collapse.spec, s / 40))) worst = Math.max(worst, r.error);
    }
    if (worst > 1e-9) errors.push(`${construction.name}: ${op.op.id} crease loops open by ${worst.toExponential(2)} (not rigid)`);
  }
}
const gapLimit = 8 * LAYER_GAP;
if (worstGap > gapLimit && worstExcess > 2 * LAYER_GAP) {
  errors.push(`${construction.name}: mid-fold hinge gap ${worstGap.toFixed(4)} (${worstExcess.toFixed(4)} beyond rest) exceeds ${gapLimit}`);
}
if (lowestZ < -1e-9) errors.push(`paper dips below the table (z = ${lowestZ.toFixed(4)})`);

// 2c. The finished crease pattern must be locally flat-foldable everywhere.
vertexProblems(creasePattern(construction)).forEach((p) => errors.push(`${construction.name}: crease pattern ${p}`));

// 3. Summary of the finished piece.
const last = tl.states[tl.states.length - 1];
const polys = last.facets.map(modelPoly);
const xs = polys.flat().map((p) => p.x);
const ys = polys.flat().map((p) => p.y);
const maxLayers = Math.max(...tl.ops.map((o) => Math.max(...o.pieces.map((p) => p.postZ))));

console.log(`construction: ${construction.name}, ${construction.ops.length} steps`);
tl.ops.forEach((o, i) => console.log(`  ${i + 1}. ${o.op.title}  (${o.pieces.length} pieces)`));
console.log(`final facets: ${last.facets.length}, flipped: ${last.facets.filter(isFlipped).length}`);
console.log(`final size: ${(Math.max(...xs) - Math.min(...xs)).toFixed(3)} wide x ${(Math.max(...ys) - Math.min(...ys)).toFixed(3)} tall (sheet = 2)`);
console.log(`stack height: ${maxLayers.toFixed(4)}; worst mid-fold hinge gap: ${worstGap.toFixed(4)} (${worstExcess.toFixed(4)} beyond rest); lowest z: ${lowestZ.toFixed(4)}`);

// 4. State machine: quick repeated input must never skip, corrupt or strand a step.
{
  const n = tl.ops.length;
  const c = new FoldController(n, () => 1);
  const run = (secs: number) => {
    for (let i = 0; i < secs * 60; i++) c.update(1 / 60);
  };
  const expect = (cond: boolean, msg: string) => {
    if (!cond) errors.push(`controller: ${msg}`);
  };
  c.next();
  c.next(); // second tap mid-fold finishes the first fold, never starts a second
  expect(c.step === 1 && !c.moving, 'double tap should complete exactly one fold');
  c.next();
  run(0.4);
  c.prev(); // reverse mid-fold
  run(2);
  expect(c.step === 1 && !c.moving, 'reversing mid-fold should return to the same step');
  c.next();
  run(0.5);
  c.reset(); // reset during animation cancels it
  expect(c.step === 0 && !c.moving && c.pose().pending && c.pose().t === 0, 'reset mid-fold should give the flat square');
  // hammering: each tap either starts the pending fold or finishes the moving one,
  // so 2 taps = 1 fold, and taps past the end are ignored
  for (let i = 0; i < 5; i++) c.next();
  run(2);
  expect(c.step === 3, `5 quick taps should give 3 folds (got ${c.step})`);
  for (let i = 0; i < 2 * n + 6; i++) c.next();
  expect(c.step === n && c.finished, 'extra taps should stop at the finished dress');
  for (let i = 0; i < 2 * n + 6; i++) c.prev();
  expect(c.step === 0 && !c.moving, 'extra Back taps should stop at the square');
  expect(c.beginScrub(), 'scrub should start from rest');
  c.scrubTo(0.2);
  c.next(); // buttons are ignored while dragging
  c.endScrub(false);
  run(2);
  expect(c.step === 0, 'a short drag should spring back');
  c.beginScrub();
  c.scrubTo(0.8);
  c.endScrub(true);
  run(2);
  expect(c.step === 1, 'a long drag should complete the fold');
}

if (process.argv.includes('--dump')) {
  const dump = tl.states.map((s) =>
    s.facets.map((f) => ({
      id: f.id,
      rank: f.rank,
      flipped: isFlipped(f),
      material: f.poly,
      model: modelPoly(f),
      area: signedArea(f.poly),
    })),
  );
  writeFileSync(`docs/states-${construction.name.toLowerCase().replaceAll(' ', '-')}.json`, JSON.stringify(dump));
  console.log('wrote docs/states.json');
}

}

// Silhouette switching is allowed at step 3 because the first two operations
// are exactly shared. Verify material mappings at that decision boundary.
{
  const base = buildDress();
  for (const id of ['straight', 'classic', 'flare'] as const) {
    const variant = buildSilhouette(id);
    if (JSON.stringify(base.ops.slice(0, 2)) !== JSON.stringify(variant.ops.slice(0, 2))) {
      errors.push(`${id}: shape choice would alter an already completed fold`);
    }
  }
  if (JSON.stringify(buildSilhouette('classic').ops) !== JSON.stringify(base.ops)) {
    // The explanatory hint differs, but crease and motion definitions must not.
    const folds = (c: typeof base) => c.ops.map(o => o.kind === 'fold' ? o.folds : o.kind);
    if (JSON.stringify(folds(buildSilhouette('classic'))) !== JSON.stringify(folds(base))) errors.push('classic changed the original folds');
  }
}

// Papers drawn to the fold (src/papers/dressMarks.ts) must match the classic
// A-line. Before the first turn-over the sheet is unmoved, so material = model.
{
  const dress = buildDress();
  const collar = dress.ops.find((o) => o.id === 'collar');
  const sides = dress.ops.find((o) => o.id === 'sides');
  if (collar?.kind !== 'fold' || sides?.kind !== 'fold') errors.push('dress marks: collar or sides step missing');
  else {
    if (Math.abs(collar.folds[0].a.y - COLLAR_Y) > 1e-9) errors.push('dress marks: COLLAR_Y does not match the collar fold');
    for (const f of sides.folds) {
      // sides are folded after one turn-over, which mirrors x; the apex is on x = 0
      const d = { x: f.b.x - f.a.x, y: f.b.y - f.a.y };
      const off = (0 - f.a.x) * d.y - (SIDE_APEX_Y - f.a.y) * d.x;
      if (Math.abs(off / Math.hypot(d.x, d.y)) > 1e-9) errors.push(`dress marks: ${f.name} misses the side apex`);
      const angle = Math.atan2(Math.abs(d.x), Math.abs(d.y));
      if (Math.abs(angle - SIDE_HALF_ANGLE) > 1e-9) errors.push(`dress marks: ${f.name} slant differs from SIDE_HALF_ANGLE`);
    }
  }
}

// Attachments must be anchored on retained paper, including the asymmetric
// skirt band and vest panels. A generic dress coordinate is not sufficient.
{
  const insidePolygon = (poly: Vec2[], p: Vec2) => {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i], b = poly[j];
      if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
    }
    return inside;
  };
  for (const [id, construction] of [['skirt', buildWrapSkirt()], ['vest', buildLapelVest()]] as const) {
    const states = buildTimeline(construction.ops).states;
    const polys = states[states.length - 1].facets.map(modelPoly);
    const ys = polys.flat().map(p => p.y);
    const anchors = attachmentAnchors(id, Math.max(...ys), Math.min(...ys));
    if (new Set(anchors.map(a => a.id)).size !== anchors.length) errors.push(`${id}: duplicate attachment ids`);
    for (const anchor of anchors) {
      if (!polys.some(poly => insidePolygon(poly, anchor))) errors.push(`${id}: ${anchor.label} is not on the folded paper`);
    }
  }
}

// Small folds must have a usable gesture distance without changing direction.
for (const [x, y] of [[0, 0], [0.1, -0.2], [40, 0], [-200, 30]]) {
  const v = dragVector(x, y), length = Math.hypot(v.vx, v.vy);
  if (!Number.isFinite(length) || length < 72 - 1e-8) errors.push('drag vector has no stable minimum distance');
  if (Math.hypot(x, y) > 1e-5 && (Math.abs(x * v.vy - y * v.vx) > 1e-7 || x * v.vx + y * v.vy <= 0)) errors.push('drag vector changed fold direction');
  if (Math.hypot(x, y) >= 72 && (v.vx !== x || v.vy !== y)) errors.push('large fold gesture was changed');
}
for (const c of [buildWrapSkirt(), buildLapelVest()]) {
  if (c.ops.some(op => op.kind === 'fold' && op.folds.some(f => f.sense !== 'valley'))) errors.push(`${c.name}: fold pushes away from the visible face`);
}

checkTwoSidedRotation(errors);

if (errors.length) {
  console.error(`\n${errors.length} problem(s):`);
  for (const e of errors.slice(0, 40)) console.error('  ' + e);
  process.exit(1);
}
console.log('\nall checks passed');


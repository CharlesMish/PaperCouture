// Workshop framing (src/app/workFrame.ts): every design starts on the whole-sheet
// framing, no step is framed wider than the whole sheet or closer than the limit,
// every step's paper stays inside its frame through its whole motion (sampled more
// finely than the frame itself is computed), and the blend between steps holds
// still for most of a fold and arrives exactly at the next step's frame.
// Run: npm run check:work-frame (--print lists each design's closest framing).

import assert from 'node:assert/strict';
import { GARMENTS, buildGarment } from '../src/fold/garments';
import { buildTimeline } from '../src/fold/timeline';
import { FULL_FRAME, MIN_HALF, WORK_ELEVATION, blendFrames, stepExtent, stepFrame } from '../src/app/workFrame';

const SIN = Math.sin(WORK_ELEVATION);
const fine = Array.from({ length: 41 }, (_, i) => i / 40);
const closest: Record<string, number> = {};
for (const g of GARMENTS) {
  const tl = buildTimeline(buildGarment(g.id).ops);
  assert.deepEqual(stepFrame(tl.ops[0]), FULL_FRAME, `${g.id}: the first step shows the whole sheet as before`);
  let zoom = 1;
  for (const op of tl.ops) {
    const f = stepFrame(op);
    assert(f.halfW <= FULL_FRAME.halfW + 1e-12 && f.halfH <= FULL_FRAME.halfH + 1e-12, `${g.id} ${op.op.id}: never wider than the whole sheet`);
    assert(f.halfW >= 1.3 * MIN_HALF - 1e-12, `${g.id} ${op.op.id}: never closer than the limit`);
    if (f !== FULL_FRAME) {
      // the paper fits the frame (less its margin) at 41 poses, within 2% of the frame
      const e = stepExtent(op, fine);
      const w = f.halfW / 1.3, h = (f.halfH / 1.08) * SIN, cv = f.y * SIN;
      const slack = 0.02 * Math.max(w, h);
      assert(e.u0 >= f.x - w - slack && e.u1 <= f.x + w + slack, `${g.id} ${op.op.id}: paper within the frame across`);
      assert(e.v0 >= cv - h - slack && e.v1 <= cv + h + slack, `${g.id} ${op.op.id}: paper within the frame up the screen`);
    }
    zoom = Math.max(zoom, FULL_FRAME.halfW / f.halfW);
  }
  closest[g.id] = +zoom.toFixed(2);
  // blending between consecutive steps: still before 60%, arrives at 100%
  for (let i = 0; i + 1 < tl.ops.length; i++) {
    const a = stepFrame(tl.ops[i]), b = stepFrame(tl.ops[i + 1]);
    assert.deepEqual(blendFrames(a, b, 0.6), a);
    assert.deepEqual(blendFrames(a, b, 0), a);
    const end = blendFrames(a, b, 1);
    for (const k of ['x', 'y', 'halfW', 'halfH'] as const) assert(Math.abs(end[k] - b[k]) < 1e-12, `${g.id} step ${i + 1}: arrives at the next frame`);
  }
}
// A drag let go at progress t0 (main.ts passes from = max(0.6, t0)): the frame at
// t0 is still the step's own (no jump at release), it then moves steadily to the next
// frame at t = 1 if the fold finishes, and stays put if it falls back below t0.
{
  const tl = buildTimeline(buildGarment('kimono').ops);
  const a = stepFrame(tl.ops[6]), b = stepFrame(tl.ops[7]);
  assert(Math.abs(a.halfW - b.halfW) > 0.5, 'kimono step 7 moves to a much closer frame');
  for (const t0 of [0.2, 0.6, 0.75, 0.9, 0.99]) {
    const from = Math.max(0.6, t0);
    assert.deepEqual(blendFrames(a, b, t0, from), a, `released at ${t0}: no jump`);
    for (const t of [0, t0 / 2, t0]) assert.deepEqual(blendFrames(a, b, t, from), a, `released at ${t0}, falling back through ${t}: still`);
    const end = blendFrames(a, b, 1, from);
    assert(Math.abs(end.halfW - b.halfW) < 1e-12 && Math.abs(end.y - b.y) < 1e-12, `released at ${t0}: arrives`);
    let last = a.halfW;
    for (let t = t0; t <= 1; t += 0.01) { const w = blendFrames(a, b, t, from).halfW; assert(w <= last + 1e-12, `released at ${t0}: moves one way`); last = w; }
  }
  // the brief glide after a drag pulled to the very end (from = 0, by time)
  assert.deepEqual(blendFrames(a, b, 0, 0), a);
  assert(Math.abs(blendFrames(a, b, 1, 0).halfW - b.halfW) < 1e-12);
}
assert(closest.kimono >= 1.6, `the kimono's last steps are framed ${closest.kimono}x closer`);
if (process.argv.includes('--print')) console.log(JSON.stringify(closest, null, 1));
const zoomed = Object.values(closest).filter((z) => z > 1.05).length;
console.log(`Workshop framing: ${GARMENTS.length} designs start on the whole sheet; ${zoomed} come closer as they shrink (up to ${Math.max(...Object.values(closest))}x); every step's paper inside its frame at 41 poses.`);

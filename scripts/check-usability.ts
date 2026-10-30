// Hidden folds: how much of each step's moving paper the workshop camera sees
// (src/fold/visibility.ts), which steps the app therefore offers "See this fold"
// and hidden-paper grips for, and that the measure agrees with what it claims.
// Run: npm run check:usability (--print lists every step's share).
//
// The eye is the workshop camera (57 degrees above the table, looking at the
// model's centre) at three distances, in model coordinates. The browser check
// (check-usability-browser.cjs) uses the real camera of each viewport.

import assert from 'node:assert/strict';
import { GARMENTS, buildGarment, type GarmentId } from '../src/fold/garments';
import { buildTimeline, evaluateFrame, type OpAnim } from '../src/fold/timeline';
import { HIDDEN_FOLD, movingVisibility } from '../src/fold/visibility';

const tFor = (deg: number) => Math.acos(1 - 2 * (deg / 180)) / Math.PI;
// the waiting pose the app draws (main.ts: PEEK_FOLD 8, PEEK_COLLAPSE 0)
const pendingT = (a: OpAnim) => (a.op.kind === 'collapse' ? 0 : tFor(8));
const th = (57 * Math.PI) / 180;
const eye = (d: number): [number, number, number] => [0, -Math.cos(th) * d, 0.08 + Math.sin(th) * d];

const share = (id: GarmentId, step: number, d = 8, t?: number) => {
  const op = buildTimeline(buildGarment(id).ops).ops[step - 1];
  return movingVisibility(op, evaluateFrame(op, t ?? pendingT(op)), eye(d));
};

// The three steps in the review: almost none of the moving paper shows.
for (const [id, step, op] of [['kimono', 8, 'sleeves'], ['gown', 9, 'sleeve'], ['fit-flare', 6, 'shoulders']] as const) {
  assert.equal(buildTimeline(buildGarment(id).ops).ops[step - 1].op.id, op);
  for (const d of [5, 8, 12]) {
    const v = share(id, step, d);
    assert(v.fraction < 0.05, `${id} step ${step}: ${(v.fraction * 100).toFixed(1)}% visible at distance ${d}`);
    for (const g of v.groups.values()) assert(g.fraction < HIDDEN_FOLD, `${id} step ${step}: a hidden group gets a grip`);
  }
}
// The kimono's collapse moves three parts (the lower half and two side flaps): one grip each.
assert.equal(share('kimono', 8).groups.size, 3);

// Ordinary visible folds are not flagged.
for (let step = 1; step <= 6; step++) {
  const op = buildTimeline(buildGarment('dress').ops).ops[step - 1];
  if (op.op.kind === 'turn') continue;
  assert(share('dress', step).fraction >= HIDDEN_FOLD, `dress step ${step} should not count as hidden`);
}

// Ground truth for the ray test: a flap lying under the whole sheet is hidden from
// above and seen from below; the same flap on top is seen from above.
{
  const op = buildTimeline(buildGarment('gown').ops).ops[8];
  const M = evaluateFrame(op, pendingT(op));
  const below: [number, number, number] = [0, -Math.cos(th) * 8, 0.08 - Math.sin(th) * 8];
  assert(movingVisibility(op, M, below).fraction > 0.3, 'the cap sleeve shows from underneath');
}

// Which steps the app offers "See this fold" for, from the default workshop
// distance: the list is recorded so any change to it is deliberate.
const offered: string[] = [];
const rows: string[] = [];
for (const g of GARMENTS) {
  const tl = buildTimeline(buildGarment(g.id).ops);
  for (const op of tl.ops) {
    if (op.op.kind === 'turn') continue;
    const v = movingVisibility(op, evaluateFrame(op, pendingT(op)), eye(8));
    rows.push(`${g.id} ${op.index + 1} ${op.op.id}: ${(v.fraction * 100).toFixed(1)}%`);
    // a share within a hair of the threshold is left out of the record (sampling)
    if (v.fraction < HIDDEN_FOLD - 0.005) offered.push(`${g.id}:${op.index + 1}`);
  }
}
assert.deepEqual(offered, ['kimono:7', 'kimono:8', 'gown:9', 'fit-flare:6', 'zori:7'], `steps offered "See this fold": ${offered.join(', ')}`);
if (process.argv.includes('--print')) console.log(rows.join('\n'));
console.log(`Hidden folds: kimono 8, gown 9 and fit-and-flare 6 under 5% visible from the workshop camera; "See this fold" offered at ${offered.join(', ')}.`);

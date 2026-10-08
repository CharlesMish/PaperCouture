// Reproducible rejected geometry study. Not imported by the application.
// Run: node --import tsx docs/geometry-collection/trousers-centre/trousers-probe.ts
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { checkState, modelPoly, Op } from '../../../src/fold/engine';
import { buildTimeline } from '../../../src/fold/timeline';
import { lineConvexRange, v2 } from '../../../src/fold/geometry';

export const trousersProbeOps: Op[] = [
  { kind: 'fold', id: 'probe-gates', title: 'Fold sides to centre', hint: 'Geometry study only.', folds: [
    { name: 'probe-left', a: v2(-0.5, -1), b: v2(-0.5, 1), moving: v2(-1, 0), sense: 'valley' },
    { name: 'probe-right', a: v2(0.5, -1), b: v2(0.5, 1), moving: v2(1, 0), sense: 'valley' },
  ] },
  { kind: 'fold', id: 'probe-spread', title: 'Spread lower flaps', hint: 'Test whether separate lower legs can emerge.', folds: [
    { name: 'probe-left-leg', a: v2(-0.5, 0), b: v2(0, 0.5), moving: v2(0, -1), sense: 'valley', only: 'probe-left' },
    { name: 'probe-right-leg', a: v2(0.5, 0), b: v2(0, 0.5), moving: v2(0, -1), sense: 'valley', only: 'probe-right' },
  ] },
];
export function runTrousersProbe() {
  let candidateError = '';
  try { buildTimeline(trousersProbeOps); }
  catch (error) { candidateError = String(error); }
  assert.match(candidateError, /would tear/);

  // One materially different repair: anchor the flap hinges at the free top
  // edge, where a selective outward fold can remain connected. This fixes the
  // tear but leaves a continuous backing sheet and a jacket-like silhouette.
  const repairOps: Op[] = [trousersProbeOps[0], {
    kind: 'fold', id: 'probe-top-flaps', title: 'Repair with free-edge flap hinges', hint: 'Geometry study only.', folds: [
      { name: 'probe-left-top', a: v2(-0.5, 1), b: v2(-0.5 + Math.cos(Math.PI * 3 / 8), 1 - Math.sin(Math.PI * 3 / 8)), moving: v2(0, 1), sense: 'valley', only: 'probe-left' },
      { name: 'probe-right-top', a: v2(0.5, 1), b: v2(0.5 - Math.cos(Math.PI * 3 / 8), 1 - Math.sin(Math.PI * 3 / 8)), moving: v2(0, 1), sense: 'valley', only: 'probe-right' },
    ],
  }];
  const timeline = buildTimeline(repairOps);
  for (const [i, state] of timeline.states.entries()) assert.deepEqual(checkState(state, `trousers repair ${i}`), []);
  const final = timeline.states.at(-1)!;
  const centreIntervals = final.facets.flatMap(f => {
    const interval = lineConvexRange(v2(0, 0), v2(0, 1), modelPoly(f));
    return interval ? [interval] : [];
  });
  assert(centreIntervals.some(([lo, hi]) => lo <= -1 && hi >= 1), 'repair retains an unbroken central backing');
  return { timeline, centreIntervals, candidateError };
}

if (typeof process !== 'undefined' && process.argv[1]?.endsWith('trousers-probe.ts')) {
  const { timeline, centreIntervals, candidateError } = runTrousersProbe();
  writeFileSync('docs/geometry-collection/trousers-centre/trousers-states.json', JSON.stringify(timeline.states));
  console.log(JSON.stringify({ status: 'parked', centreIntervals, candidateError }, null, 2));
}

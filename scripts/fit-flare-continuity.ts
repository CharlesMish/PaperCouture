import assert from 'node:assert/strict';
import { type OpAnim, posePoint } from '../src/fold/timeline';

/** Adaptive regression for finite jumps hidden between uniform samples. */
export function auditContinuity(op: OpAnim, frame: (op: OpAnim, t: number) => Float64Array) {
  const N = 4000, step = 1 / N;
  const spikes: { t: number; second: number }[] = [];
  let previous: Float64Array | undefined, before: Float64Array | undefined;
  for (let j = 0; j <= N; j++) {
    const M = frame(op, j / N);
    if (previous && before) {
      let second = 0;
      for (let k = 3; k < M.length; k += 4) second = Math.max(second, Math.abs(M[k] - 2 * previous[k] + before[k]));
      spikes.push({ t: (j - 1) / N, second });
    }
    before = previous; previous = M;
  }
  spikes.sort((a, b) => b.second - a.second);
  const gap = (lo: number, hi: number) => {
    const A = frame(op, lo), B = frame(op, hi);
    let result = 0;
    for (const p of op.pieces) for (const v of p.poly) {
      const a = posePoint(A, p.index * 12, v.x, v.y), b = posePoint(B, p.index * 12, v.x, v.y);
      result = Math.max(result, Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]));
    }
    return result;
  };
  // A speed bound scales with interval width; a finite jump cannot disappear
  // inside a generous fixed-position tolerance. The 1e-9 term covers numerical
  // roundoff, far below the rejected 0.00492-unit waist jump.
  const check = (lo: number, hi: number) => {
    const delta = gap(lo, hi), bound = 32 * (hi - lo) + 1e-9;
    assert(delta <= bound, `${op.op.id}: motion jump ${delta} over [${lo}, ${hi}] (bound ${bound})`);
    return delta;
  };
  const seeds = [...spikes.slice(0, 12).map(x => x.t), ...Array.from({ length: 33 }, (_, j) => j / 32), .2372104101, 1 / 3];
  const refined = seeds.map(seed => {
    let lo = Math.max(0, seed - step), hi = Math.min(1, seed + step);
    const initialDelta = check(lo, hi);
    for (let j = 0; j < 20; j++) {
      const mid = (lo + hi) / 2;
      if (gap(lo, mid) > gap(mid, hi)) hi = mid; else lo = mid;
      check(lo, hi);
    }
    return { seed, lo, hi, width: hi - lo, initialDelta, delta: check(lo, hi) };
  });
  const endpointLimits = Array.from({ length: 9 }, (_, j) => 10 ** (-j - 2)).map(width =>
    ({ width, start: check(0, width), end: check(1 - width, 1) }));
  const reviewerWitness = { lo: .2372104091644287, hi: .23721041107177734 };
  return { uniformSamples: N + 1, largestSecondDifference: spikes[0], refined, endpointLimits,
    reviewerWitness: { ...reviewerWitness, delta: check(reviewerWitness.lo, reviewerWitness.hi) } };
}

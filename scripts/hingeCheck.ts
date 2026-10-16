import { evaluateFrame, posePoint, LAYER_GAP, type OpAnim } from '../src/fold/timeline';

/** Absolute limits stay bounded even when a bad gap is also present at rest. */
/**
 * `collapseLayers` is the rendered-level bound for a construction once it has a
 * collapse step (12 by default). The one-shoulder gown passes 16: its sash wraps
 * from the top of the front stack to the bottom of the back stack at the left
 * side seam, and the renderer's overlap levels (computeLevels) count 16 between
 * them although no point of the finished gown has more than 12 paper layers
 * (scripts/foldMetrics.ts, asserted in check-gown.ts).
 */
export function hingeProblems(op: OpAnim, samples = 21, collapseLayers = 12): string[] {
  const frames = Array.from({ length: samples }, (_, i) => evaluateFrame(op, i / (samples - 1)));
  let maxGap = 0;
  for (const h of op.hinges) for (const p of [h.m0, h.m1]) {
    const gaps = frames.map(M => {
      const a = posePoint(M, h.a * 12, p.x, p.y), b = posePoint(M, h.b * 12, p.x, p.y);
      return Math.hypot(...a.map((x, i) => x - b[i]));
    });
    maxGap = Math.max(maxGap, ...gaps);
  }
  // The fit-and-flare waist has a measured twelve-layer corner. Earlier
  // constructions and the first four steps keep the original eight-gap bound.
  const limit = (op.layeredCollapse ? collapseLayers : 8) * LAYER_GAP;
  const errors: string[] = [];
  if (maxGap > limit + 1e-9) errors.push(`${op.op.id}: absolute hinge gap ${maxGap} exceeds ${limit}`);
  return errors;
}

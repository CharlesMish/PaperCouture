import { evaluateFrame, posePoint, LAYER_GAP, type OpAnim } from '../src/fold/timeline';

/** Absolute limits stay bounded even when a bad gap is also present at rest. */
export function hingeProblems(op: OpAnim, samples = 21): string[] {
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
  const limit = (op.layeredCollapse ? 12 : 8) * LAYER_GAP;
  const errors: string[] = [];
  if (maxGap > limit + 1e-9) errors.push(`${op.op.id}: absolute hinge gap ${maxGap} exceeds ${limit}`);
  return errors;
}

import { evaluateFrame, posePoint, LAYER_GAP, type OpAnim } from '../src/fold/timeline';

/** Absolute limits stay bounded even when a bad gap is also present at rest. */
/**
 * `collapseLayers` is the rendered-level bound for a construction once it has a
 * collapse step (12 by default). The one-shoulder gown passes 16: its sash wraps
 * from the top of the front stack to the bottom of the back stack at the left
 * side seam, and the renderer's overlap levels (computeLevels) count 16 between
 * them although no point of the finished gown has more than 12 paper layers
 * (scripts/foldMetrics.ts, asserted in check-gown.ts).
 *
 * `foldLayers` is the bound for ordinary folds before any collapse (8 by default).
 * The kimono passes 10: its collar fold turns both top corners through the whole
 * stack, and the renderer's levels put the two sides of that crease 10 apart,
 * although the crease itself folds through at most 4 paper layers (measured in
 * check-kimono.ts).
 *
 * `opLevels` gives a bound for named operations instead, for the thick pieces whose
 * allowance grows step by step (the trousers, cloche, shell top and kinchaku pouch,
 * each module's *_LEVELS). A bound per operation keeps the thin early steps of
 * those pieces at the ordinary limit, and each listed bound is the measured gap, so
 * any later growth fails.
 */
export function hingeProblems(op: OpAnim, samples = 21, collapseLayers = 12, foldLayers = 8, opLevels: Readonly<Record<string, number>> = {}): string[] {
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
  const limit = (opLevels[op.op.id] ?? (op.layeredCollapse ? collapseLayers : foldLayers)) * LAYER_GAP;
  const errors: string[] = [];
  if (maxGap > limit + 1e-9) errors.push(`${op.op.id}: absolute hinge gap ${maxGap} exceeds ${limit}`);
  return errors;
}

// Kinchaku: a drawstring pouch from one small square: a full, rounded body, a
// neck gathered in, and a top that flares out above it with a rim of the paper's
// other side.
//
// Why it folds. The outline turns in to the neck and out again above it, a notch on
// each side that simple folds cannot make. The fit-and-flare dress already solves
// that shape: a small pleat across the waist and a hidden gusset in each side flap
// fold in one rigid move (src/fold/fitFlare.ts). The pouch is that construction
// with the waist raised to a neck, the top band kept as the turned-over rim, and
// the shoulder points tucked as on the dress; then, from the back, the two bottom
// corners fold in to round the base. No published model is claimed.

import type { Construction } from './construction';
import type { Op } from './engine';
import { buildFitFlare, DEFAULT_FIT_FLARE, type FitFlareParams } from './fitFlare';
import { buildTimeline } from './timeline';
import { modelPoly } from './engine';
import { v2 } from './geometry';

export const KINCHAKU_SHAPE: FitFlareParams = { ...DEFAULT_FIT_FLARE, collar: 0.15, edgeFold: 0.4, shoulder: 0.5, waist: 0.35, waistY: 0.5, swivel: -5 };
/** How far the base corners are rounded, along each edge, in sheet units. */
export const KINCHAKU_ROUND = 0.32;

const TEXT: Record<string, { title: string; hint: string }> = {
  collar: { title: 'Fold the top edge down', hint: 'Print side up. This band becomes the rim of the pouch, in the reverse colour.' },
  'turn-1': { title: 'Turn the paper over', hint: 'The rim is underneath now. The sides are shaped from the back.' },
  edges: { title: 'Fold both side edges in', hint: 'A wide band on each side. It keeps the pleat at the neck small.' },
  'turn-2': { title: 'Turn the paper over', hint: 'Printed side up again. The neck is gathered from the front.' },
  waist: { title: 'Gather the neck', hint: 'One move: the sides fold behind, and a small pleat across the neck lets each side bend, in to the neck and out below it, and out again above it to the rim.' },
  shoulders: { title: 'Tuck the corners behind the rim', hint: 'The side flaps peek above the rim at each corner. Fold those points down behind.' },
};

/** The finished pouch's lowest edge and its half-width there, before rounding. */
function base(c: Construction) {
  const pts = buildTimeline(c.ops).states.at(-1)!.facets.flatMap(modelPoly);
  const bottom = Math.min(...pts.map((q) => q.y));
  const half = Math.max(...pts.filter((q) => q.y < bottom + 1e-6).map((q) => Math.abs(q.x)));
  return { bottom, half };
}

/** Rendered-level allowance per operation (scripts/hingeCheck.ts). The raised waist
 * collapse puts its hinges 13 levels apart in the renderer, one more than the
 * fit-and-flare's twelve; the pouch has at most 14 paper layers at any point
 * (check-wardrobe-gaps.ts). */
export const KINCHAKU_LEVELS: Readonly<Record<string, number>> = { waist: 13, shoulders: 13 };

export function buildKinchaku(): Construction {
  const dress = buildFitFlare(KINCHAKU_SHAPE);
  const ops: Op[] = dress.ops.map((op) => ({ ...op, ...(TEXT[op.id] ?? {}) }) as Op);
  const { bottom, half } = base(dress);
  const r = KINCHAKU_ROUND;
  // the rounding is worked from the back, where the model is mirrored
  const M = (x: number, y: number) => v2(-x, y);
  ops.push(
    { kind: 'turn', id: 'kb-turn', title: 'Turn over', hint: 'Round the base from the back.' },
    {
      kind: 'fold', id: 'kb-round', title: 'Round the base',
      hint: `Fold both bottom corners in at 45 degrees, from points ${(r * 50).toFixed(0)}% of the square in from each end of the bottom edge.`,
      folds: [
        { name: 'kb-round-left', a: M(-half + r, bottom), b: M(-half - 0.3, bottom + r + 0.3), moving: M(-half - 0.05, bottom + 0.02), sense: 'valley' },
        { name: 'kb-round-right', a: M(half + 0.3, bottom + r + 0.3), b: M(half - r, bottom), moving: M(half + 0.05, bottom + 0.02), sense: 'valley' },
      ],
    },
    { kind: 'turn', id: 'kb-reveal', title: 'Turn over', hint: 'The finished pouch.' },
  );
  return { name: 'Kinchaku pouch', ops, meta: dress.meta };
}

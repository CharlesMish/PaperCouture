// What the workshop camera frames for a step: the paper the step involves over its
// whole motion, the whole sheet to begin with, closer as the piece gets smaller (at
// most MIN_HALF of the sheet's half-width), never farther out than the whole sheet.
// Pure model-space numbers; main.ts turns them into a camera pose.

import { evaluateFrame, posePoint, type OpAnim } from '../fold/timeline';

/** The workshop camera looks down at the table from 57 degrees. */
export const WORK_ELEVATION = (57 * Math.PI) / 180;
const SIN = Math.sin(WORK_ELEVATION), COS = Math.cos(WORK_ELEVATION);

export interface WorkFrame {
  /** Point to look at, in model coordinates on the table (x, y). */
  x: number;
  y: number;
  /** Half-extents to fit, across and up the screen, in the units framePose takes. */
  halfW: number;
  halfH: number;
}

/** The whole-sheet framing the workshop has always used (target (0, 0) and 1.3 x 1.08). */
export const FULL_FRAME: WorkFrame = { x: 0, y: 0, halfW: 1.3, halfH: 1.08 };
/** The closest framing: this fraction of the sheet's half-width (so at most about 2.2x closer). */
export const MIN_HALF = 0.45;
const MARGIN_W = 1.3, MARGIN_H = 1.08 / SIN; // the whole-sheet framing's margins

/** Extent of a step's paper over its motion: across (u = x) and up the screen (v = y sin + z cos). */
export function stepExtent(anim: OpAnim, samples = Array.from({ length: 21 }, (_, i) => i / 20)) {
  let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
  for (const t of samples) {
    const M = evaluateFrame(anim, t);
    for (const p of anim.pieces) for (const m of p.poly) {
      const [x, y, z] = posePoint(M, p.index * 12, m.x, m.y);
      const v = y * SIN + z * COS;
      u0 = Math.min(u0, x); u1 = Math.max(u1, x); v0 = Math.min(v0, v); v1 = Math.max(v1, v);
    }
  }
  return { u0, u1, v0, v1 };
}

export function stepFrame(anim: OpAnim): WorkFrame {
  const { u0, u1, v0, v1 } = stepExtent(anim);
  const halfW = MARGIN_W * Math.max((u1 - u0) / 2, MIN_HALF);
  const halfH = MARGIN_H * Math.max((v1 - v0) / 2, MIN_HALF * SIN);
  // as large as the whole sheet (or larger, mid-turn): keep the whole-sheet framing
  if (halfW >= FULL_FRAME.halfW || halfH >= FULL_FRAME.halfH) return FULL_FRAME;
  return { x: (u0 + u1) / 2, y: (v0 + v1) / 2 / SIN, halfW, halfH };
}

/**
 * Between two steps' frames, by the fold's progress t: still up to `from`, then
 * eased to the next frame at t = 1. Normally `from` is 0.6, so the camera moves over
 * the last 40% of a fold. After a drag released at t0, main.ts passes max(0.6, t0):
 * the camera then starts from where it held still during the drag, with no jump,
 * whether the fold goes on to finish or falls back. (main.ts also eases the camera
 * over 0.35 s after a release that finishes the fold, so a late release cannot jump.)
 */
export function blendFrames(a: WorkFrame, b: WorkFrame, t: number, from = 0.6): WorkFrame {
  const s = from >= 1 ? 0 : Math.min(1, Math.max(0, (t - from) / (1 - from))), k = s * s * (3 - 2 * s);
  if (k <= 0) return a;
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, halfW: a.halfW + (b.halfW - a.halfW) * k, halfH: a.halfH + (b.halfH - a.halfH) * k };
}

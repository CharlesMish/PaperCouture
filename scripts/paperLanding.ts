// Where each face of the square lands on a finished construction.
//
// For every sample of the unfolded sheet this reports whether its printed face
// and its reverse face can be seen in the finished piece, from the front view
// (the Display "Front" preset) or from the back view, and where in the model it
// lands. Papers draw on two canvases, so the samples are also given in canvas
// coordinates for each face and each quarter turn (see
// src/render/sheetOrientation.ts and scripts/rotationCheck.ts):
//   front canvas (col, row) = (u', 1 - v'), back canvas = (1 - u', 1 - v'),
// where (u', v') is the turned sample of the material uv ((x + 1) / 2, (y + 1) / 2).
// This is a diagnostic for designing papers around the folds; it draws nothing.
import type { Construction } from '../src/fold/construction';
import { SheetState, isFlipped, modelPoly } from '../src/fold/engine';
import { Vec2, applyAffine, signedArea, v2 } from '../src/fold/geometry';
import { buildTimeline } from '../src/fold/timeline';

export type View = 'front' | 'back';
export interface Landing {
  /** material point of the unfolded sheet, [-1, 1]^2 */
  m: Vec2;
  /** model point in the finished piece */
  p: Vec2;
  /** which face of this material point is seen from each view, if any */
  front: 'print' | 'reverse' | null;
  back: 'print' | 'reverse' | null;
}
const inside = (poly: Vec2[], p: Vec2) => {
  const ccw = signedArea(poly) < 0 ? poly.slice().reverse() : poly;
  return ccw.every((a, i) => {
    const b = ccw[(i + 1) % ccw.length];
    return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x) >= -1e-10;
  });
};
export function finalState(c: Construction): SheetState {
  return buildTimeline(c.ops).states.at(-1)!;
}
/** Sample the sheet on an n x n grid of cell centres. */
export function landings(state: SheetState, n = 64): Landing[] {
  const polys = state.facets.map(f => ({ f, model: modelPoly(f) }));
  const out: Landing[] = [];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const m = v2(-1 + (2 * i + 1) / n, 1 - (2 * j + 1) / n);
    const own = state.facets.find(f => inside(f.poly, m));
    if (!own) continue;
    const p = applyAffine(own.T, m);
    const hits = polys.filter(q => inside(q.model, p)).sort((a, b) => a.f.rank - b.f.rank);
    const flipped = isFlipped(own);
    const top = hits[hits.length - 1]?.f, bottom = hits[0]?.f;
    out.push({
      m, p,
      front: top === own ? (flipped ? 'reverse' : 'print') : null,
      back: bottom === own ? (flipped ? 'print' : 'reverse') : null,
    });
  }
  return out;
}
/** Canvas position (0..1, row from the top) of a material point on one face at a quarter turn. */
export function canvasPoint(m: Vec2, face: 'print' | 'reverse', quarterTurns = 0): { col: number; row: number } {
  const u = (m.x + 1) / 2, v = (m.y + 1) / 2;
  const q = ((quarterTurns % 4) + 4) % 4;
  const [su, sv] = q === 0 ? [u, v] : q === 1 ? [1 - v, u] : q === 2 ? [1 - u, 1 - v] : [v, 1 - u];
  return face === 'print' ? { col: su, row: 1 - sv } : { col: 1 - su, row: 1 - sv };
}
/** Material point for a canvas position on one face at a quarter turn (inverse of canvasPoint). */
export function materialPoint(col: number, row: number, face: 'print' | 'reverse', quarterTurns = 0): Vec2 {
  const su = face === 'print' ? col : 1 - col, sv = 1 - row;
  const q = ((quarterTurns % 4) + 4) % 4;
  const [u, v] = q === 0 ? [su, sv] : q === 1 ? [sv, 1 - su] : q === 2 ? [1 - su, 1 - sv] : [1 - sv, su];
  return v2(2 * u - 1, 2 * v - 1);
}

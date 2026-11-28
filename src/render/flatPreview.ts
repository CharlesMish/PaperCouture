// A flat 2D drawing of a finished piece, for small previews.
//
// The folded model is flat at the end of every construction: each facet is a
// convex material polygon, a rigid transform into the model and a stacking
// rank (src/fold/engine.ts). This draws those facets in rank order on a 2D
// canvas, each one clipped to its own outline and filled with the paper's own
// drawing through the same quarter-turn mapping the 3D sheet uses
// (src/render/sheetOrientation.ts). Nothing here folds or decides anything; it
// is a second, cheap view of the same finished state, without lighting, layer
// thickness or the Display camera's tilt.
import type { Construction } from '../fold/construction';
import { SheetState, isFlipped, modelPoly } from '../fold/engine';
import { Vec2, applyAffine, v2 } from '../fold/geometry';
import { buildTimeline } from '../fold/timeline';
import type { PaperDesign, PrintPosition } from '../papers/types';
import { ORIGINAL } from '../papers/printPosition';
import { paperCanvas } from './textures';

export type FlatView = 'front' | 'back';
export interface PaperFaces { front: CanvasImageSource; back: CanvasImageSource; size: number }

export function finishedState(c: Construction): SheetState {
  return buildTimeline(c.ops).states.at(-1)!;
}

export function paperFaces(paper: PaperDesign, quarterTurns: number, position: PrintPosition = ORIGINAL, size = 256): PaperFaces {
  return { front: paperCanvas(paper, 'front', quarterTurns, position, size), back: paperCanvas(paper, 'back', quarterTurns, position, size), size };
}

/** Material point for a canvas position (0..1, row from the top) on one face at a quarter turn. */
export function materialPoint(col: number, row: number, face: 'print' | 'reverse', quarterTurns = 0): Vec2 {
  const su = face === 'print' ? col : 1 - col, sv = 1 - row;
  const q = ((quarterTurns % 4) + 4) % 4;
  const [u, v] = q === 0 ? [su, sv] : q === 1 ? [sv, 1 - su] : q === 2 ? [1 - su, 1 - sv] : [1 - sv, su];
  return v2(2 * u - 1, 2 * v - 1);
}

export interface FlatFrame { cx: number; cy: number; scale: number; angle: number; mirror: boolean }

/** Fit the finished outline into a square of `size` pixels with a margin. */
export function fitFrame(state: SheetState, size: number, view: FlatView = 'front', angle = 0, margin = 0.08): FlatFrame {
  const c = Math.cos(angle), s = Math.sin(angle);
  let lx = Infinity, hx = -Infinity, ly = Infinity, hy = -Infinity;
  for (const f of state.facets) for (const p of modelPoly(f)) {
    const x = p.x * c - p.y * s, y = p.x * s + p.y * c;
    lx = Math.min(lx, x); hx = Math.max(hx, x); ly = Math.min(ly, y); hy = Math.max(hy, y);
  }
  const span = Math.max(hx - lx, hy - ly) || 1;
  return { cx: (lx + hx) / 2, cy: (ly + hy) / 2, scale: size * (1 - 2 * margin) / span, angle, mirror: view === 'back' };
}

export interface FlatOptions { view?: FlatView; angle?: number; frame?: FlatFrame; edges?: boolean; shadow?: boolean }

/** Draw the finished piece into the whole canvas of `ctx` (assumed square). */
export function drawFinished(ctx: CanvasRenderingContext2D, state: SheetState, faces: PaperFaces, quarterTurns: number, options: FlatOptions = {}): FlatFrame {
  const size = ctx.canvas.width, view = options.view ?? 'front';
  const frame = options.frame ?? fitFrame(state, size, view, options.angle ?? 0);
  const c = Math.cos(frame.angle), s = Math.sin(frame.angle);
  const out = (p: Vec2): Vec2 => {
    const x = p.x * c - p.y * s - frame.cx, y = p.x * s + p.y * c - frame.cy;
    return v2(size / 2 + (frame.mirror ? -x : x) * frame.scale, size / 2 - y * frame.scale);
  };
  const facets = state.facets.slice().sort((a, b) => view === 'front' ? a.rank - b.rank : b.rank - a.rank);
  const trace = (pts: Vec2[]) => {
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
  };
  if (options.shadow) {
    ctx.save();
    ctx.shadowColor = 'rgba(40,30,20,.28)'; ctx.shadowBlur = size * .03; ctx.shadowOffsetY = size * .012;
    ctx.fillStyle = '#d8cbb8';
    for (const f of facets) { trace(modelPoly(f).map(out)); ctx.fill(); }
    ctx.restore();
  }
  for (const f of facets) {
    // Seen from the front, unflipped material shows its print; from the back, its reverse.
    const face = isFlipped(f) === (view === 'front') ? 'reverse' : 'print';
    const image = face === 'print' ? faces.front : faces.back;
    const pts = modelPoly(f).map(out);
    const o = out(applyAffine(f.T, materialPoint(0, 0, face, quarterTurns)));
    const x = out(applyAffine(f.T, materialPoint(1, 0, face, quarterTurns)));
    const y = out(applyAffine(f.T, materialPoint(0, 1, face, quarterTurns)));
    ctx.save();
    trace(pts);
    ctx.clip();
    ctx.transform((x.x - o.x) / faces.size, (x.y - o.y) / faces.size, (y.x - o.x) / faces.size, (y.y - o.y) / faces.size, o.x, o.y);
    ctx.drawImage(image, 0, 0);
    ctx.restore();
    if (options.edges !== false) {
      trace(pts);
      ctx.strokeStyle = 'rgba(48,43,38,.34)'; ctx.lineWidth = Math.max(.6, size / 420); ctx.lineJoin = 'round';
      ctx.stroke();
    }
  }
  return frame;
}

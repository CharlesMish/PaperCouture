// How much of the paper a step moves can be seen from a viewpoint. Some folds and
// collapses move paper that lies under other layers (the kimono's sleeves, the
// gown's cap sleeve): from the workshop camera almost none of it shows. The app
// uses this to offer "See this fold" and to place a grip on hidden paper.
//
// Samples points inside every moving triangle of the posed sheet and casts a ray
// from each toward the eye. A sample is hidden when another piece's triangle
// crosses that ray first. Fractions are area weighted. Model coordinates
// throughout (x right, y away, z up); no rendering, so it runs in checks too.

import type { Mat34, OpAnim } from './timeline';
import { posePoint } from './timeline';

type P3 = [number, number, number];

export interface GroupVisibility {
  /** Area fraction of this group's moving paper that the eye sees. */
  fraction: number;
  /** A visible sample of the group, if any, else the area-weighted centroid of its paper. */
  anchor: P3;
  /** Piece index the anchor lies on. */
  piece: number;
  anchorVisible: boolean;
}

export interface Visibility {
  /** Area fraction of all moving paper that the eye sees (1 when nothing moves). */
  fraction: number;
  /** By fold spec or collapse group. */
  groups: Map<number, GroupVisibility>;
}

// interior sample positions (barycentric), spread over the triangle
const SAMPLES: [number, number][] = [[1 / 3, 1 / 3], [0.6, 0.2], [0.2, 0.6], [0.2, 0.2], [0.45, 0.45], [0.1, 0.45], [0.45, 0.1]];

interface Tri { piece: number; a: P3; b: P3; c: P3; area: number }

const sub = (p: P3, q: P3): P3 => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
const crossP = (p: P3, q: P3): P3 => [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]];
const dot = (p: P3, q: P3) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];

/** Ray-triangle hit parameter along origin + t * dir (Moller-Trumbore), or -1. */
function hit(o: P3, d: P3, t: Tri): number {
  const e1 = sub(t.b, t.a), e2 = sub(t.c, t.a);
  const p = crossP(d, e2), det = dot(e1, p);
  if (Math.abs(det) < 1e-14) return -1;
  const inv = 1 / det, s = sub(o, t.a), u = dot(s, p) * inv;
  if (u < 0 || u > 1) return -1;
  const q = crossP(s, e1), v = dot(d, q) * inv;
  if (v < 0 || u + v > 1) return -1;
  return dot(e2, q) * inv;
}

export function movingVisibility(anim: OpAnim, M: Mat34, eye: P3): Visibility {
  const tris: Tri[] = [];
  for (const p of anim.pieces) {
    const pts = p.poly.map((m) => posePoint(M, p.index * 12, m.x, m.y) as P3);
    for (let i = 1; i + 1 < pts.length; i++) {
      const a = pts[0], b = pts[i], c = pts[i + 1];
      const n = crossP(sub(b, a), sub(c, a));
      tris.push({ piece: p.index, a, b, c, area: Math.hypot(...n) / 2 });
    }
  }
  const specOf = new Map(anim.pieces.map((p) => [p.index, p.spec]));
  const acc = new Map<number, { seen: number; total: number; cx: number; cy: number; cz: number; w: number; best?: { p: P3; piece: number; area: number }; biggest?: { piece: number; area: number } }>();
  let seen = 0, total = 0;
  for (const t of tris) {
    const spec = specOf.get(t.piece) ?? -1;
    if (spec < 0 || t.area < 1e-12) continue;
    const g = acc.get(spec) ?? { seen: 0, total: 0, cx: 0, cy: 0, cz: 0, w: 0 };
    acc.set(spec, g);
    const w = t.area / SAMPLES.length;
    for (const [u, v] of SAMPLES) {
      const p: P3 = [0, 1, 2].map((k) => u * t.a[k] + v * t.b[k] + (1 - u - v) * t.c[k]) as P3;
      const d = sub(eye, p);
      let visible = true;
      for (const o of tris) {
        if (o.piece === t.piece) continue;
        const h = hit(p, d, o);
        // ignore touching neighbours: a hit must be a little way along the ray
        if (h > 1e-5 && h < 1) { visible = false; break; }
      }
      g.total += w; total += w;
      if (visible) {
        g.seen += w; seen += w;
        if (!g.best || t.area > g.best.area) g.best = { p, piece: t.piece, area: t.area };
      }
    }
    const c: P3 = [0, 1, 2].map((k) => (t.a[k] + t.b[k] + t.c[k]) / 3) as P3;
    g.cx += c[0] * t.area; g.cy += c[1] * t.area; g.cz += c[2] * t.area; g.w += t.area;
    if (!g.biggest || t.area > g.biggest.area) g.biggest = { piece: t.piece, area: t.area };
  }
  const groups = new Map<number, GroupVisibility>();
  for (const [spec, g] of acc) {
    const fraction = g.total > 0 ? g.seen / g.total : 1;
    groups.set(spec, g.best
      ? { fraction, anchor: g.best.p, piece: g.best.piece, anchorVisible: true }
      : { fraction, anchor: [g.cx / g.w, g.cy / g.w, g.cz / g.w], piece: g.biggest!.piece, anchorVisible: false });
  }
  return { fraction: total > 0 ? seen / total : 1, groups };
}

/** Below this share of its moving paper in view, a step counts as hidden. */
export const HIDDEN_FOLD = 0.25;

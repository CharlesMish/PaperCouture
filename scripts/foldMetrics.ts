// Physical-risk measurements for any construction, in millimetres at a given
// starting square. They describe what a real fold has to cope with; they do
// not certify that it folds.
//
//   node --import tsx scripts/foldMetrics.ts [design ...]   prints a table for registered designs
//
// - layers: how many paper layers are stacked at a point of the finished model
//   (sampled on a grid), the most anywhere and where; not the renderer's offsets.
// - sharpestCreaseAngleDeg: the smallest angle between neighbouring creases at
//   any vertex of the finished crease pattern (thin wedges are hard to fold
//   accurately and tear first).
// - shortestCreaseMm: the shortest crease segment between two vertices.
// - narrowestFacetMm: the smallest width of any finished facet.

import type { Construction } from '../src/fold/construction';
import { modelPoly, type SheetState } from '../src/fold/engine';
import { signedArea, type Vec2 } from '../src/fold/geometry';
import { buildTimeline } from '../src/fold/timeline';
import { creasePattern, type Crease } from './crease_pattern';

export interface FoldMetrics {
  finishedCm: { width: number; height: number };
  layers: { max: number; at: { x: number; y: number }; areaByCount: Record<string, number> };
  creases: number;
  sharpestCreaseAngleDeg: number;
  sharpestAt: { x: number; y: number };
  shortestCreaseMm: number;
  narrowestFacetMm: number;
}

const inside = (poly: Vec2[], p: Vec2) => poly.every((a, i) => {
  const b = poly[(i + 1) % poly.length];
  return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x) >= -1e-10;
});
const ccw = (poly: Vec2[]) => (signedArea(poly) < 0 ? poly.slice().reverse() : poly);

export function foldMetrics(c: Construction, squareCm: number, step = 0.005): FoldMetrics {
  const mmPerUnit = (squareCm * 10) / 2; // the sheet is two model units wide
  const final: SheetState = buildTimeline(c.ops).states.at(-1)!;
  const polys = final.facets.map((f) => ccw(modelPoly(f)));
  const pts = polys.flat();
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  let max = 0, at = { x: 0, y: 0 };
  const area: Record<number, number> = {};
  let covered = 0;
  for (let y = y0; y < y1; y += step) for (let x = x0; x < x1; x += step) {
    const q = { x: x + step / 2, y: y + step / 2 };
    const n = polys.filter((poly) => inside(poly, q)).length;
    if (!n) continue;
    covered += step * step;
    area[n] = (area[n] ?? 0) + step * step;
    if (n > max) { max = n; at = q; }
  }
  const creases = creasePattern(c);
  const { minSector, minAt, shortest } = creaseMetrics(creases);
  return {
    finishedCm: { width: +((x1 - x0) * mmPerUnit / 10).toFixed(2), height: +((y1 - y0) * mmPerUnit / 10).toFixed(2) },
    layers: {
      max, at: { x: +at.x.toFixed(3), y: +at.y.toFixed(3) },
      areaByCount: Object.fromEntries(Object.entries(area).map(([k, v]) => [k, +(v / covered).toFixed(4)])),
    },
    creases: creases.length,
    sharpestCreaseAngleDeg: +minSector.toFixed(2),
    sharpestAt: { x: +minAt.x.toFixed(3), y: +minAt.y.toFixed(3) },
    shortestCreaseMm: +(shortest * mmPerUnit).toFixed(2),
    narrowestFacetMm: +(Math.min(...final.facets.map((f) => facetWidth(f.poly))) * mmPerUnit).toFixed(2),
  };
}

/** Smallest angle between neighbouring creases at any crease-pattern vertex (sheet
 * coordinates), and the shortest crease segment. At a vertex on the paper's edge
 * the outside of the paper is not an angle. */
export function creaseMetrics(creases: Crease[]) {
  const key = (p: Vec2) => `${p.x.toFixed(6)},${p.y.toFixed(6)}`;
  const at = new Map<string, { p: Vec2; dirs: number[] }>();
  for (const cr of creases) for (const [p, q] of [[cr.a, cr.b], [cr.b, cr.a]] as const) {
    const k = key(p);
    if (!at.has(k)) at.set(k, { p, dirs: [] });
    at.get(k)!.dirs.push(Math.atan2(q.y - p.y, q.x - p.x));
  }
  let minSector = 360;
  let minAt: Vec2 = { x: 0, y: 0 };
  for (const { p, dirs } of at.values()) {
    const onEdge = Math.abs(Math.abs(p.x) - 1) < 1e-9 || Math.abs(Math.abs(p.y) - 1) < 1e-9;
    const d = [...new Set(dirs.map((a) => a.toFixed(9)))].map(Number).sort((a, b) => a - b);
    if (d.length < 2) continue;
    for (let i = 0; i < d.length; i++) {
      const next = i + 1 < d.length ? d[i + 1] : d[0] + 2 * Math.PI;
      const sector = ((next - d[i]) * 180) / Math.PI;
      if (onEdge && sector > 180 - 1e-6) continue;
      // a straight crease passing through a vertex is not an angle
      if (Math.abs(sector - 180) < 1e-6) continue;
      if (sector < minSector) { minSector = sector; minAt = p; }
    }
  }
  let shortest = Infinity;
  for (const cr of creases) shortest = Math.min(shortest, Math.hypot(cr.a.x - cr.b.x, cr.a.y - cr.b.y));
  return { minSector, minAt, shortest };
}

/** Smallest width of a convex polygon (over its edges, the farthest vertex distance). */
export function facetWidth(poly: Vec2[]) {
  let w = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len < 1e-12) continue;
    let far = 0;
    for (const q of poly) far = Math.max(far, Math.abs((b.x - a.x) * (q.y - a.y) - (b.y - a.y) * (q.x - a.x)) / len);
    w = Math.min(w, far);
  }
  return w;
}

if (process.argv[1]?.endsWith('foldMetrics.ts')) {
  const { GARMENTS, buildGarment } = await import('../src/fold/garments');
  const { recommendedSquareCm } = await import('../src/fold/paperSize');
  const wanted = process.argv.slice(2);
  const rows = [];
  for (const g of GARMENTS) {
    if (wanted.length && !wanted.includes(g.id)) continue;
    const cm = recommendedSquareCm(g.id);
    const m = foldMetrics(buildGarment(g.id), cm);
    rows.push({ design: g.id, squareCm: cm, size: `${m.finishedCm.width} x ${m.finishedCm.height}`, maxLayers: m.layers.max, sharpestDeg: m.sharpestCreaseAngleDeg, shortestMm: m.shortestCreaseMm, narrowestMm: m.narrowestFacetMm });
  }
  console.table(rows);
}

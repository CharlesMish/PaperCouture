// Where each fold of a design lies on the paper as it sits on the table before that
// fold, in centimetres on the design's suggested square: for writing (and checking)
// step instructions a person can follow with real paper.
//
// For each straight fold: where the crease runs across the paper (its two ends,
// measured from the left and from the top of the paper's current outline), its angle,
// the existing corners and crease points it passes through, and which layers move.
// For a collapse: each crease line in the same terms.
//
// Run: npx tsx scripts/fold-measurements.ts dress kimono   (no ids: every design)

import { GARMENTS, buildGarment, type GarmentId } from '../src/fold/garments';
import { ACCESSORIES } from '../src/fold/accessories';
import { buildTimeline } from '../src/fold/timeline';
import { modelPoly, specLine, sideOf, mayMove, type SheetState, type Op, type FoldSpec } from '../src/fold/engine';
import { recommendedSquareCm } from '../src/fold/paperSize';
import { v2, type Vec2 } from '../src/fold/geometry';

// (kept for callers that test points)
export const inside = (poly: Vec2[], p: Vec2) => {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) c = !c;
  }
  return c;
};

export interface Measured {
  step: number; kind: Op['kind']; id: string; title: string;
  /** current paper outline (bounding box), cm */
  size: { w: number; h: number };
  creases: { name: string; from: [number, number]; to: [number, number]; angle: number; through: string[]; throughAt: [number, number][]; onMoving: [number, number][]; along: number[]; moves: string }[];
}

export function measure(ops: Op[], cm: number): Measured[] {
  const unit = cm / 2;
  const tl = buildTimeline(ops);
  return ops.map((op, i) => {
    const state: SheetState = tl.states[i];
    const polys = state.facets.map(modelPoly);
    const pts = polys.flat();
    const x0 = Math.min(...pts.map(p => p.x)), x1 = Math.max(...pts.map(p => p.x));
    const y0 = Math.min(...pts.map(p => p.y)), y1 = Math.max(...pts.map(p => p.y));
    // from the left edge and down from the top edge of the paper's outline, in cm
    const at = (p: Vec2): [number, number] => [(p.x - x0) * unit, (y1 - p.y) * unit];
    const name = (p: Vec2) => {
      const [x, y] = at(p).map(n => +n.toFixed(2)), W = +((x1 - x0) * unit).toFixed(2), H = +((y1 - y0) * unit).toFixed(2);
      const edges = [Math.abs(x) < .02 && 'left edge', Math.abs(x - W) < .02 && 'right edge', Math.abs(y) < .02 && 'top edge', Math.abs(y - H) < .02 && 'bottom edge'].filter(Boolean);
      return `(${x}, ${y})${edges.length ? ' ' + edges.join('/') : ''}`;
    };
    const lines: { name: string; a: Vec2; b: Vec2; spec?: FoldSpec }[] = op.kind === 'fold' ? op.folds.map(f => ({ name: f.name, a: f.a, b: f.b, spec: f }))
      : op.kind === 'collapse' ? op.collapse.creases.map(c => ({ name: c.name, a: c.a, b: c.b })) : [];
    const vertices: Vec2[] = [];
    for (const p of pts) if (!vertices.some(q => Math.hypot(q.x - p.x, q.y - p.y) < 1e-6)) vertices.push(p);
    return {
      step: i + 1, kind: op.kind, id: op.id, title: op.title,
      size: { w: (x1 - x0) * unit, h: (y1 - y0) * unit },
      creases: lines.map(l => {
        const d = v2(l.b.x - l.a.x, l.b.y - l.a.y), L = Math.hypot(d.x, d.y), u = v2(d.x / L, d.y / L);
        // where the line crosses the given outlines: its extent across that paper
        const extent = (shapes: Vec2[][]) => {
          let lo = Infinity, hi = -Infinity;
          for (const poly of shapes) for (let k = 0; k < poly.length; k++) {
            const p = poly[k], q = poly[(k + 1) % poly.length], e = v2(q.x - p.x, q.y - p.y);
            const den = u.x * e.y - u.y * e.x;
            if (Math.abs(den) < 1e-12) continue;
            const w = v2(p.x - l.a.x, p.y - l.a.y);
            const sAlong = (w.x * e.y - w.y * e.x) / den, tEdge = (w.x * u.y - w.y * u.x) / den;
            if (tEdge < -1e-9 || tEdge > 1 + 1e-9) continue;
            lo = Math.min(lo, sAlong); hi = Math.max(hi, sAlong);
          }
          return [v2(l.a.x + u.x * lo, l.a.y + u.y * lo), v2(l.a.x + u.x * hi, l.a.y + u.y * hi)];
        };
        const [A, B] = extent(polys);
        const on = vertices.filter(p => Math.abs((p.x - l.a.x) * u.y - (p.y - l.a.y) * u.x) < 1e-4);
        const through = on.map(name), throughAt = on.map(at);
        let moves = '';
        let onMoving: [number, number][] = [];
        let onMovingPts: Vec2[] = [];
        if (l.spec) {
          const line = specLine(l.spec);
          const moving = state.facets.filter(f => mayMove(l.spec!, f) && modelPoly(f).some(p => sideOf(line, p) > 1e-6));
          // a fold of some layers only: where the crease crosses those layers
          if (l.spec.only || l.spec.except) {
            const touched = state.facets.filter(f => mayMove(l.spec!, f));
            const [mA, mB] = extent(touched.map(modelPoly));
            if (Number.isFinite(mA.x)) { onMoving = [at(mA), at(mB)]; onMovingPts = [mA, mB]; }
          }
          const all = state.facets.filter(f => modelPoly(f).some(p => sideOf(line, p) > 1e-6));
          moves = `${moving.length} of ${all.length} facets on the moving side${l.spec.only ? ` (only ${l.spec.only})` : ''}${l.spec.except ? ` (not ${l.spec.except.join(', ')})` : ''}, ${l.spec.sense}`;
        }
        // along the paper's edges: from each end of the crease (and each point it passes
        // through) to the corners and crease points on the same straight edge
        const along: number[] = [];
        const ends = [A, B, ...on];
        if (onMoving.length) ends.push(...onMovingPts);
        for (const q of ends) for (const poly of polys) for (let k = 0; k < poly.length; k++) {
          const p0 = poly[k], p1 = poly[(k + 1) % poly.length], e = v2(p1.x - p0.x, p1.y - p0.y), el = Math.hypot(e.x, e.y);
          if (el < 1e-9) continue;
          const t = ((q.x - p0.x) * e.x + (q.y - p0.y) * e.y) / (el * el);
          if (t < -1e-6 || t > 1 + 1e-6 || Math.abs((q.x - p0.x) * e.y - (q.y - p0.y) * e.x) / el > 1e-4) continue;
          for (const w of vertices) if (Math.abs((w.x - q.x) * e.y - (w.y - q.y) * e.x) / el < 1e-4) {
            const dist = Math.hypot(w.x - q.x, w.y - q.y) * unit;
            if (dist > 1e-6 && !along.some(a => Math.abs(a - dist) < 1e-9)) along.push(dist);
          }
        }
        const angle = +((Math.atan2(u.y, u.x) * 180) / Math.PI).toFixed(1);
        return { name: l.name, from: at(A), to: at(B), angle: ((angle % 180) + 180) % 180, through, throughAt, onMoving, along, moves };
      }),
    };
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const ids = process.argv.slice(2);
  const all: { id: string; name: string; ops: Op[]; cm: number }[] = [
    ...GARMENTS.map(g => ({ id: g.id as string, name: g.name, ops: buildGarment(g.id).ops, cm: recommendedSquareCm(g.id as GarmentId) })),
    ...ACCESSORIES.map(a => ({ id: `accessory:${a.id}`, name: a.name, ops: a.build().ops, cm: 20 * a.pieces[0].scale })),
  ];
  for (const d of all.filter(d => !ids.length || ids.includes(d.id))) {
    console.log(`\n== ${d.id} · ${d.name} · ${d.cm} cm square (x from the left, y down from the top of the paper as it lies)`);
    for (const m of measure(d.ops, d.cm)) {
      console.log(`${m.step}. [${m.kind}] ${m.title} · paper ${+m.size.w.toFixed(2)} x ${+m.size.h.toFixed(2)}`);
      const r = (p: [number, number]) => p.map(n => +n.toFixed(2)).join(',');
      for (const c of m.creases) console.log(`   ${c.name}: ${r(c.from)} -> ${r(c.to)} at ${+c.angle.toFixed(1)}°; through ${c.through.join(' ') || '-'}${c.moves ? `; ${c.moves}` : ''}${c.onMoving.length ? `; across the layers that may move: ${r(c.onMoving[0])} -> ${r(c.onMoving[1])}` : ''}${c.along.length ? `; along the edges it meets, to corners/crease points: ${c.along.map(n => +n.toFixed(2)).join(', ')}` : ''}`);
    }
  }
}

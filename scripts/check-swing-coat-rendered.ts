import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { MeshStandardMaterial } from 'three';
import { buildGarment } from '../src/fold/garments';
import { buildTimeline, evaluateFrame } from '../src/fold/timeline';
import { SheetView } from '../src/render/sheetView';

type V = [number, number, number];
type Kind = 'facetFacet' | 'facetHinge' | 'hingeHinge';
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

// Independent normalized-plane crossing + barycentric point-in-triangle,
// matching the external review audit. Distances are in model units, unaffected
// by triangle area. Coplanar/tangent and sub-1e-8 grazing contacts are excluded.
function edgeCross(a: V, b: V, t: V[]) {
  const u = sub(t[1], t[0]), v = sub(t[2], t[0]), n = cross(u, v), len = Math.hypot(...n);
  if (len < 1e-12) return;
  const da = dot(n, sub(a, t[0])) / len, db = dot(n, sub(b, t[0])) / len;
  if (!(da > 1e-8 && db < -1e-8 || db > 1e-8 && da < -1e-8)) return;
  const r = da / (da - db), p = a.map((x, i) => x + r * (b[i] - x)) as V, w = sub(p, t[0]);
  const uu = dot(u, u), uv = dot(u, v), vv = dot(v, v), wu = dot(w, u), wv = dot(w, v), den = uu * vv - uv * uv;
  const s = (vv * wu - uv * wv) / den, q = (uu * wv - uv * wu) / den;
  if (s > 1e-7 && q > 1e-7 && s + q < 1 - 1e-7)
    return { point: p, depth: Math.min(Math.abs(da), Math.abs(db)), bary: [s, q], edgeFraction: r };
}
function crossing(a: V[], b: V[]) {
  let best: ReturnType<typeof edgeCross>;
  for (let i = 0; i < 3; i++) for (const hit of [edgeCross(a[i], a[(i + 1) % 3], b), edgeCross(b[i], b[(i + 1) % 3], a)])
    if (hit && (!best || hit.depth > best.depth)) best = hit;
  return best;
}
const view = new SheetView(new MeshStandardMaterial(), new MeshStandardMaterial());
const runs: object[] = [];
for (const op of buildTimeline(buildGarment('swing-coat').ops).ops) {
  view.setAnim(op);
  const count = op.pieces.reduce((n, p) => n + p.poly.length - 2, 0);
  const ids = op.pieces.flatMap(p => p.poly.slice(2).map(() => p.index));
  const times = [...new Set([...Array.from({ length: 201 }, (_, j) => j / 200), .455, .34])].sort((a, b) => a - b);
  const counts: Record<Kind, number> = { facetFacet: 0, facetHinge: 0, hingeHinge: 0 }, poses = { ...counts };
  const worst: Partial<Record<Kind, NonNullable<ReturnType<typeof crossing>> & { t: number; a: number; b: number; triangles: V[][] }>> = {};
  for (const t of times) {
    view.pose(evaluateFrame(op, t));
    const arr = view.front.geometry.attributes.position.array;
    const tris: V[][] = [];
    for (let i = 0; i < arr.length; i += 9) tris.push([0, 3, 6].map(k => Array.from(arr.slice(i + k, i + k + 3)) as V));
    const seen = new Set<Kind>();
    for (let a = 0; a < tris.length; a++) for (let b = a + 1; b < tris.length; b++) {
      if (a < count && b < count && ids[a] === ids[b]) continue;
      const hit = crossing(tris[a], tris[b]);
      if (!hit) continue;
      const kind: Kind = b < count ? 'facetFacet' : a < count ? 'facetHinge' : 'hingeHinge';
      counts[kind]++; seen.add(kind);
      if (!worst[kind] || worst[kind]!.depth < hit.depth) worst[kind] = { t, a, b, ...hit, triangles: [tris[a], tris[b]] };
    }
    for (const kind of seen) poses[kind]++;
  }
  // Connector surfaces already intersect in the source and in frozen resting
  // poses. Report them honestly; do not claim the entire rendered mesh is free
  // of intersections or remove strips to satisfy a facet-only regression.
  assert.equal(counts.facetFacet, 0, `${op.op.id}: rendered facet crossing`);
  runs.push({ op: op.op.id, facets: op.pieces.length, hinges: op.hinges.length, facetTriangles: count, samples: times.length, counts, poses, worst });
}
const result = { method: 'Actual SheetView buffers: Float32 material coordinates before transform and Float32 output. Independent normalized-plane crossing and barycentric test; excludes coplanar/tangent and sub-1e-8 grazing contacts.', runs };
if (process.env.SWING_COAT_RENDER_REPORT) {
  mkdirSync(dirname(process.env.SWING_COAT_RENDER_REPORT), { recursive: true });
  writeFileSync(process.env.SWING_COAT_RENDER_REPORT, JSON.stringify(result, null, 2));
}
console.log(JSON.stringify(result, null, 2));

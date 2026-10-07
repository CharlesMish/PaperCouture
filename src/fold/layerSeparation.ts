import type { Vec2 } from './geometry';

type V3 = [number, number, number];
interface Panel { index: number; poly: Vec2[] }
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0],
];
const translation = (M: Float64Array, i: number): V3 => [M[i * 12 + 3], M[i * 12 + 7], M[i * 12 + 11]];

/**
 * Keep the artificial layer offsets on the separating sides of the ideal paper.
 * This is a rendering-depth correction, not a paper-thickness or collision solver
 * for an invalid construction. The zero-thickness mechanism must already be
 * non-intersecting. Only translations change; material polygons and all rotations
 * stay rigid. Existing single-fold constructions do not use this path.
 *
 * For each pair of convex panels, an ideal separating axis supplies a linear
 * half-space constraint on their offsets. Project the offsets onto those bounds.
 * Choosing the axis with most current clearance preserves existing layer order
 * for coincident panels and avoids moving already separated panels unnecessarily.
 */
export function separateLayers(pieces: Panel[], ideal: Float64Array, M: Float64Array, progress: number): void {
  const polys = pieces.map(p => p.poly.map(({ x, y }): V3 => {
    const o = p.index * 12;
    return [ideal[o] * x + ideal[o + 1] * y + ideal[o + 3],
      ideal[o + 4] * x + ideal[o + 5] * y + ideal[o + 7],
      ideal[o + 8] * x + ideal[o + 9] * y + ideal[o + 11]];
  }));
  const normals = pieces.map(p => [ideal[p.index * 12 + 2], ideal[p.index * 12 + 6], ideal[p.index * 12 + 10]] as V3);
  const edges = polys.map(poly => poly.map((p, i) => sub(poly[(i + 1) % poly.length], p)));
  const offsets = pieces.map(p => sub(translation(M, p.index), translation(ideal, p.index)));
  const initial = offsets.map(v => [...v] as V3);
  const constraints: { a: number; b: number; axis: V3; gap: number }[] = [];

  for (let a = 0; a < pieces.length; a++) for (let b = a + 1; b < pieces.length; b++) {
    // Face normals, in-plane boundary normals (also cover coplanar panels),
    // and edge cross products: separating axes of two convex planar polygons.
    const axes = [normals[a], normals[b],
      ...edges[a].map(e => cross(normals[a], e)), ...edges[b].map(e => cross(normals[b], e)),
      ...edges[a].flatMap(e => edges[b].map(f => cross(e, f)))];
    let best: typeof constraints[number] | undefined;
    let clearance = -Infinity;
    for (const raw of axes) {
      const length = Math.hypot(...raw);
      if (length < 1e-8) continue;
      const axis = raw.map(v => v / length) as V3;
      const A = polys[a].map(p => dot(axis, p)), B = polys[b].map(p => dot(axis, p));
      for (const [gap, sign] of [[Math.min(...B) - Math.max(...A), 1], [Math.min(...A) - Math.max(...B), -1]]) {
        if (gap < -1e-9) continue;
        const n = axis.map(v => v * sign) as V3;
        const current = gap + dot(n, sub(offsets[b], offsets[a]));
        if (current > clearance) { clearance = current; best = { a, b, axis: n, gap }; }
      }
    }
    if (!best) throw new Error('Layer separation requires a non-intersecting ideal fold');
    constraints.push(best);
  }

  // A sub-pixel clearance survives Float32 vertex rounding. It goes to zero at
  // both resting states; evaluateFrame preserves those states exactly.
  const margin = 1e-6 * Math.sin(Math.PI * progress);
  for (let iteration = 0; iteration < 256; iteration++) {
    let worst = 0;
    for (const { a, b, axis, gap } of constraints) {
      const missing = margin - gap - dot(axis, sub(offsets[b], offsets[a]));
      if (missing <= 1e-12) continue;
      worst = Math.max(worst, missing);
      for (let j = 0; j < 3; j++) {
        offsets[a][j] -= axis[j] * missing / 2;
        offsets[b][j] += axis[j] * missing / 2;
      }
    }
    if (worst < 1e-11) break;
  }
  if (constraints.some(({ a, b, axis, gap }) => margin - gap - dot(axis, sub(offsets[b], offsets[a])) > 1e-8))
    throw new Error('Layer offsets did not converge within the bounded separation pass');
  for (let i = 0; i < pieces.length; i++) for (let j = 0; j < 3; j++)
    M[pieces[i].index * 12 + j * 4 + 3] += offsets[i][j] - initial[i][j];
}

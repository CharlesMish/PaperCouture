import type { Vec2 } from './geometry';

type V3 = [number, number, number];
interface Panel { index: number; poly: Vec2[] }
interface Frame { ideal: Float64Array; layered: Float64Array }
interface Choice { axis: number; sign: number }
interface Separator { a: number; b: number; path: Choice[] }
export interface LayerSeparationPlan { separators: Separator[] }
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const translation = (M: Float64Array, i: number): V3 => [M[i * 12 + 3], M[i * 12 + 7], M[i * 12 + 11]];
const unit = (v: V3): V3 => {
  const n = Math.hypot(...v);
  return n > 1e-8 ? v.map(x => x / n) as V3 : [NaN, NaN, NaN];
};

function geometry(pieces: Panel[], M: Float64Array) {
  const polys = pieces.map(p => p.poly.map(({ x, y }): V3 => {
    const o = p.index * 12;
    return [M[o] * x + M[o + 1] * y + M[o + 3], M[o + 4] * x + M[o + 5] * y + M[o + 7], M[o + 8] * x + M[o + 9] * y + M[o + 11]];
  }));
  const axes = pieces.map(p => {
    const o = p.index * 12, n: V3 = [M[o + 2], M[o + 6], M[o + 10]];
    // Transform material edge directions, avoiding subtraction of nearly equal
    // world positions. Each boundary normal rotates rigidly with its panel.
    return [n, ...p.poly.map((v, i) => {
      const q = p.poly[(i + 1) % p.poly.length], dx = q.x - v.x, dy = q.y - v.y;
      return unit(cross(n, [M[o] * dx + M[o + 1] * dy, M[o + 4] * dx + M[o + 5] * dy, M[o + 8] * dx + M[o + 9] * dy]));
    })];
  });
  return { polys, axes };
}
function pairAxes(A: V3[], B: V3[]): V3[] {
  const ea = A.slice(1).map(n => cross(A[0], n)), eb = B.slice(1).map(n => cross(B[0], n));
  return [...A, ...B, ...ea.flatMap(a => eb.map(b => unit(cross(a, b))))];
}
const separation = (A: V3[], B: V3[], n: V3) => Math.min(...B.map(p => dot(n, p))) - Math.max(...A.map(p => dot(n, p)));

const KNOTS = 32;
type Sample = ReturnType<typeof geometry> & { offsets: V3[] };

/**
 * Plan constraints once on a fixed time grid, independent of playback order.
 * Prefer one separating axis valid through the whole fold and compatible with
 * both saved endpoints. Where that is impossible, blend locally valid axes.
 * Two A-to-B separating normals have a separating positive combination, so
 * changing direction needs no per-frame winner selection at clearance ties.
 * Dense/adaptive tests validate this registered construction; these planning
 * samples alone are not a continuous collision certificate.
 */
export function planLayerSeparation(pieces: Panel[], sample: (t: number) => Frame): LayerSeparationPlan {
  const cache = new Map<number, Sample>();
  const at = (t: number): Sample => {
    let found = cache.get(t);
    if (!found) {
      const { ideal, layered } = sample(t);
      found = { ...geometry(pieces, ideal), offsets: pieces.map(p => sub(translation(layered, p.index), translation(ideal, p.index))) };
      cache.set(t, found);
    }
    return found;
  };
  function choices(a: number, b: number, times: number[], start: boolean, end: boolean) {
    const first = at(times[0]);
    const options = pairAxes(first.axes[a], first.axes[b]).flatMap((_, axis) => [1, -1].map(sign =>
      ({ axis, sign, valid: true, score: 0, previous: undefined as V3 | undefined })));
    for (const t of times) {
      const d = at(t), axes = pairAxes(d.axes[a], d.axes[b]);
      for (const option of options) if (option.valid) {
        const n = axes[option.axis].map(x => x * option.sign) as V3;
        const gap = separation(d.polys[a], d.polys[b], n), current = gap + dot(n, sub(d.offsets[b], d.offsets[a]));
        if (!Number.isFinite(n[0]) || gap < -1e-9 || (option.previous && dot(option.previous, n) < .95) ||
            (start && t === 0 && current < -1e-10) || (end && t === 1 && current < -1e-10)) option.valid = false;
        else { option.previous = n; option.score += current; }
      }
    }
    return options.filter(o => o.valid).sort((x, y) => y.score - x.score);
  }
  const separators: Separator[] = [], allTimes = Array.from({ length: KNOTS + 1 }, (_, j) => j / KNOTS);
  for (let a = 0; a < pieces.length; a++) for (let b = a + 1; b < pieces.length; b++) {
    const common = choices(a, b, allTimes, true, true)[0];
    if (common) { separators.push({ a, b, path: [common] }); continue; }
    const path: Choice[] = [];
    for (let j = 0; j <= KNOTS; j++) {
      const first = Math.max(0, j - 1) * 4, last = Math.min(KNOTS, j + 1) * 4;
      const times = Array.from({ length: last - first + 1 }, (_, k) => (first + k) / (KNOTS * 4));
      const best = choices(a, b, times, j === 0, j === KNOTS)[0];
      if (!best) throw new Error(`No continuous separating path for panels ${a}, ${b}`);
      path.push(best);
    }
    separators.push({ a, b, path });
  }
  return { separators };
}

/** Rigid rendering-depth translations; never a repair for an invalid ideal fold. */
export function separateLayers(plan: LayerSeparationPlan, pieces: Panel[], ideal: Float64Array, M: Float64Array, progress: number): void {
  const { polys, axes } = geometry(pieces, ideal);
  const offsets = pieces.map(p => sub(translation(M, p.index), translation(ideal, p.index))), initial = offsets.map(v => [...v] as V3);
  const constraints = plan.separators.map(({ a, b, path }) => {
    const candidates = pairAxes(axes[a], axes[b]);
    const j = Math.min(KNOTS - 1, Math.floor(progress * KNOTS)), q = progress * KNOTS - j;
    const weight = q * q * (3 - 2 * q);
    const start = path.length === 1 ? path[0] : path[j], end = path.length === 1 ? path[0] : path[j + 1];
    const n = unit(candidates[start.axis].map((x, k) => (1 - weight) * x * start.sign + weight * candidates[end.axis][k] * end.sign) as V3);
    const gap = separation(polys[a], polys[b], n);
    if (!Number.isFinite(n[0]) || gap < -1e-8) throw new Error('Planned separator is invalid for this fold');
    return { a, b, n, gap };
  });
  // Vanishes continuously at rest, preserving the frozen endpoint geometry.
  const margin = 1e-6 * Math.sin(Math.PI * progress);
  // Fixed work: a finite composition of continuous half-space projections.
  // Neither axis selection nor an early-exit iteration count can jump with t.
  for (let iteration = 0; iteration < 256; iteration++) for (const { a, b, n, gap } of constraints) {
    const missing = Math.max(0, margin - gap - dot(n, sub(offsets[b], offsets[a])));
    for (let j = 0; j < 3; j++) { offsets[a][j] -= n[j] * missing / 2; offsets[b][j] += n[j] * missing / 2; }
  }
  if (constraints.some(({ a, b, n, gap }) => margin - gap - dot(n, sub(offsets[b], offsets[a])) > 1e-8))
    throw new Error('Layer offsets did not converge within the bounded separation pass');
  for (let i = 0; i < pieces.length; i++) for (let j = 0; j < 3; j++) M[pieces[i].index * 12 + j * 4 + 3] += offsets[i][j] - initial[i][j];
}

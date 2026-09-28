// Small, dependency-free 2D geometry used by the fold engine.
// Material coordinates: the unfolded sheet is the square [-1, 1] x [-1, 1].
// Model coordinates: where that material currently lies in the folded, flat model.

export interface Vec2 {
  x: number;
  y: number;
}

export const v2 = (x: number, y: number): Vec2 => ({ x, y });
export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (a: Vec2, s: number): Vec2 => ({ x: a.x * s, y: a.y * s });
export const dot = (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y;
export const cross = (a: Vec2, b: Vec2): number => a.x * b.y - a.y * b.x;
export const len = (a: Vec2): number => Math.hypot(a.x, a.y);
export const norm = (a: Vec2): Vec2 => {
  const l = len(a) || 1;
  return { x: a.x / l, y: a.y / l };
};
export const lerp2 = (a: Vec2, b: Vec2, t: number): Vec2 => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});
export const fromAngleDeg = (deg: number): Vec2 => {
  const r = (deg * Math.PI) / 180;
  return { x: Math.cos(r), y: Math.sin(r) };
};

/**
 * Rigid 2D affine map (rotation or reflection + translation):
 *   x' = a*x + b*y + e
 *   y' = c*x + d*y + f
 * Every fold composes a reflection, so det is always +1 or -1. det < 0 means the
 * front (pattern) face of that piece of paper is facing down.
 */
export interface Affine2 {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

export const IDENTITY: Affine2 = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

export const applyAffine = (m: Affine2, p: Vec2): Vec2 => ({
  x: m.a * p.x + m.b * p.y + m.e,
  y: m.c * p.x + m.d * p.y + m.f,
});

export const applyLinear = (m: Affine2, v: Vec2): Vec2 => ({
  x: m.a * v.x + m.b * v.y,
  y: m.c * v.x + m.d * v.y,
});

/** outer ∘ inner */
export const compose = (outer: Affine2, inner: Affine2): Affine2 => ({
  a: outer.a * inner.a + outer.b * inner.c,
  b: outer.a * inner.b + outer.b * inner.d,
  c: outer.c * inner.a + outer.d * inner.c,
  d: outer.c * inner.b + outer.d * inner.d,
  e: outer.a * inner.e + outer.b * inner.f + outer.e,
  f: outer.c * inner.e + outer.d * inner.f + outer.f,
});

export const det = (m: Affine2): number => m.a * m.d - m.b * m.c;

/** Reflection across the line through p with direction dir. */
export function reflectionAcross(p: Vec2, dir: Vec2): Affine2 {
  const u = norm(dir);
  const c2 = u.x * u.x - u.y * u.y; // cos 2θ
  const s2 = 2 * u.x * u.y; // sin 2θ
  // x' = R (x - p) + p
  return {
    a: c2,
    b: s2,
    c: s2,
    d: -c2,
    e: p.x - (c2 * p.x + s2 * p.y),
    f: p.y - (s2 * p.x - c2 * p.y),
  };
}

export const MIRROR_X: Affine2 = { a: -1, b: 0, c: 0, d: 1, e: 0, f: 0 };

export function signedArea(poly: Vec2[]): number {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    s += p.x * q.y - q.x * p.y;
  }
  return s / 2;
}

export function centroid(poly: Vec2[]): Vec2 {
  let cx = 0;
  let cy = 0;
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    const w = p.x * q.y - q.x * p.y;
    a += w;
    cx += (p.x + q.x) * w;
    cy += (p.y + q.y) * w;
  }
  if (Math.abs(a) < 1e-14) {
    const m = poly.reduce((acc, p) => add(acc, p), v2(0, 0));
    return scale(m, 1 / poly.length);
  }
  return { x: cx / (3 * a), y: cy / (3 * a) };
}

/**
 * Split a convex polygon by the zero set of an affine function s(p).
 * Returns the parts with s >= 0 and s <= 0 (either may be null).
 * Vertices within eps of the line are shared by both parts.
 */
export function splitConvex(
  poly: Vec2[],
  s: (p: Vec2) => number,
  eps = 1e-9,
): { pos: Vec2[] | null; neg: Vec2[] | null } {
  const vals = poly.map((p) => {
    const v = s(p);
    return Math.abs(v) < eps ? 0 : v;
  });
  const hasPos = vals.some((v) => v > 0);
  const hasNeg = vals.some((v) => v < 0);
  if (!hasNeg) return { pos: poly.slice(), neg: null };
  if (!hasPos) return { pos: null, neg: poly.slice() };
  const pos: Vec2[] = [];
  const neg: Vec2[] = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    const vp = vals[i];
    const vq = vals[(i + 1) % poly.length];
    if (vp >= 0) pos.push(p);
    if (vp <= 0) neg.push(p);
    if ((vp > 0 && vq < 0) || (vp < 0 && vq > 0)) {
      const t = vp / (vp - vq);
      const x = lerp2(p, q, t);
      pos.push(x);
      neg.push(x);
    }
  }
  return {
    pos: Math.abs(signedArea(pos)) > 1e-12 ? dedupe(pos) : null,
    neg: Math.abs(signedArea(neg)) > 1e-12 ? dedupe(neg) : null,
  };
}

function dedupe(poly: Vec2[]): Vec2[] {
  const out: Vec2[] = [];
  for (const p of poly) {
    const last = out[out.length - 1];
    if (!last || len(sub(p, last)) > 1e-12) out.push(p);
  }
  if (out.length > 1 && len(sub(out[0], out[out.length - 1])) < 1e-12) out.pop();
  return out;
}

/** Positive-area overlap test for two convex polygons (separating axis theorem). */
export function convexOverlap(a: Vec2[], b: Vec2[], eps = 1e-7): boolean {
  for (const poly of [a, b]) {
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i];
      const q = poly[(i + 1) % poly.length];
      const n = norm(v2(q.y - p.y, p.x - q.x));
      let minA = Infinity;
      let maxA = -Infinity;
      let minB = Infinity;
      let maxB = -Infinity;
      for (const v of a) {
        const d = dot(v, n);
        minA = Math.min(minA, d);
        maxA = Math.max(maxA, d);
      }
      for (const v of b) {
        const d = dot(v, n);
        minB = Math.min(minB, d);
        maxB = Math.max(maxB, d);
      }
      if (Math.min(maxA, maxB) - Math.max(minA, minB) <= eps) return false;
    }
  }
  return true;
}

/** Parameter range [t0, t1] where the line p + t*dir lies inside a convex polygon, or null. */
export function lineConvexRange(p: Vec2, dir: Vec2, poly: Vec2[]): [number, number] | null {
  let t0 = -Infinity;
  let t1 = Infinity;
  const ccw = signedArea(poly) > 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const e = sub(b, a);
    // inward normal
    const n = ccw ? v2(-e.y, e.x) : v2(e.y, -e.x);
    const denom = dot(n, dir);
    const num = dot(n, sub(a, p));
    if (Math.abs(denom) < 1e-12) {
      if (num > 1e-12) return null;
      continue;
    }
    const t = num / denom;
    if (denom > 0) t0 = Math.max(t0, t);
    else t1 = Math.min(t1, t);
  }
  return t1 - t0 > 1e-9 ? [t0, t1] : null;
}

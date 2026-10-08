// Crease pattern of a finished garment, for folding it from real paper, and the
// local flat-foldability checks that go with it.
//
//   npm run crease-pattern            writes docs/crease-patterns/<design>.svg for every design
//
// Creases are read from the finished model: wherever two pieces of paper that
// touch in the unfolded square sit differently in the folded one. Mountain and
// valley are as seen from the printed side: a valley brings the printed faces
// together. At every interior vertex the pattern must satisfy Maekawa
// (mountains and valleys differ by two) and Kawasaki (alternate angles sum to
// 180 degrees); scripts/check.ts runs the same test.

import { mkdirSync, writeFileSync } from 'node:fs';
import { Construction } from '../src/fold/construction';
import { GARMENTS, buildGarment } from '../src/fold/garments';
import { Facet, findAdjacency, isFlipped } from '../src/fold/engine';
import { buildTimeline } from '../src/fold/timeline';
import { Vec2 } from '../src/fold/geometry';

export interface Crease {
  a: Vec2;
  b: Vec2;
  mv: 'M' | 'V';
}

const affEq = (f: Facet, g: Facet) =>
  Math.abs(f.T.a - g.T.a) + Math.abs(f.T.b - g.T.b) + Math.abs(f.T.c - g.T.c) + Math.abs(f.T.d - g.T.d) +
    Math.abs(f.T.e - g.T.e) + Math.abs(f.T.f - g.T.f) < 1e-9;

export function creasePattern(c: Construction): Crease[] {
  const tl = buildTimeline(c.ops);
  const last = tl.states[tl.states.length - 1];
  const out: Crease[] = [];
  for (const h of findAdjacency(last.facets)) {
    if (affEq(h.a, h.b)) continue; // same placement: not folded here
    // across a flat fold one side is turned over; the upper one decides
    const upper = h.a.rank > h.b.rank ? h.a : h.b;
    if (isFlipped(h.a) === isFlipped(h.b)) continue;
    out.push({ a: h.m0, b: h.m1, mv: isFlipped(upper) ? 'V' : 'M' });
  }
  return out;
}

// rounded, and with -0 folded into 0, so one vertex never splits into two keys
const snap = (v: number) => (Math.round(v * 1e7) / 1e7 + 0).toFixed(7);
const key = (p: Vec2) => `${snap(p.x)},${snap(p.y)}`;
const onBorder = (p: Vec2) => Math.abs(Math.abs(p.x) - 1) < 1e-9 || Math.abs(Math.abs(p.y) - 1) < 1e-9;

/** Problems at interior vertices (empty when the pattern is locally flat-foldable). */
export function vertexProblems(creases: Crease[]): string[] {
  const at = new Map<string, { p: Vec2; rays: { ang: number; mv: 'M' | 'V' }[] }>();
  const add = (p: Vec2, q: Vec2, mv: 'M' | 'V') => {
    const k = key(p);
    if (!at.has(k)) at.set(k, { p, rays: [] });
    at.get(k)!.rays.push({ ang: Math.atan2(q.y - p.y, q.x - p.x), mv });
  };
  for (const c of creases) {
    add(c.a, c.b, c.mv);
    add(c.b, c.a, c.mv);
  }
  const problems: string[] = [];
  for (const { p, rays } of at.values()) {
    if (onBorder(p)) continue;
    // merge rays that point the same way (one crease split into pieces)
    const uniq: { ang: number; mv: 'M' | 'V' }[] = [];
    for (const r of rays.sort((x, y) => x.ang - y.ang)) {
      const same = uniq.find((u) => Math.abs(Math.atan2(Math.sin(u.ang - r.ang), Math.cos(u.ang - r.ang))) < 1e-7);
      if (same) {
        if (same.mv !== r.mv) problems.push(`(${p.x.toFixed(3)}, ${p.y.toFixed(3)}): one crease is both mountain and valley`);
      } else uniq.push(r);
    }
    if (uniq.length === 2 && Math.abs(Math.abs(uniq[1].ang - uniq[0].ang) - Math.PI) < 1e-7 && uniq[0].mv === uniq[1].mv) continue; // straight through
    const sectors = uniq.map((r, i) => {
      const next = uniq[(i + 1) % uniq.length].ang + (i + 1 === uniq.length ? 2 * Math.PI : 0);
      return next - r.ang;
    });
    const alt = sectors.reduce((s, a, i) => s + (i % 2 ? -a : a), 0);
    const m = uniq.filter((r) => r.mv === 'M').length;
    const where = `(${p.x.toFixed(3)}, ${p.y.toFixed(3)})`;
    if (uniq.length % 2) problems.push(`${where}: ${uniq.length} creases meet (must be even)`);
    else {
      if (Math.abs(alt) > 1e-6) problems.push(`${where}: Kawasaki off by ${((alt / 2) * 180 / Math.PI).toFixed(4)} deg`);
      if (Math.abs(m - (uniq.length - m)) !== 2) problems.push(`${where}: Maekawa fails (${m} M, ${uniq.length - m} V)`);
    }
  }
  return problems;
}

/** The pattern as an SVG: printed side up, top of the dress at the top. */
export function creaseSvg(name: string, creases: Crease[]): string {
  const S = 600;
  const pad = 40;
  const X = (x: number) => pad + ((x + 1) / 2) * S;
  const Y = (y: number) => pad + ((1 - y) / 2) * S;
  const lines = creases
    .map((c) => {
      const style = c.mv === 'V' ? 'stroke="#2f5f9e" stroke-dasharray="9 6"' : 'stroke="#b23a2b" stroke-dasharray="12 4 2 4"';
      return `<line x1="${X(c.a.x).toFixed(2)}" y1="${Y(c.a.y).toFixed(2)}" x2="${X(c.b.x).toFixed(2)}" y2="${Y(c.b.y).toFixed(2)}" ${style} stroke-width="2"/>`;
    })
    .join('\n  ');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S + 2 * pad} ${S + 2 * pad + 50}" font-family="system-ui, sans-serif">
  <rect width="100%" height="100%" fill="#faf7f0"/>
  <rect x="${pad}" y="${pad}" width="${S}" height="${S}" fill="#fff" stroke="#2e2a25" stroke-width="2"/>
  ${lines}
  <text x="${pad}" y="${S + pad + 30}" font-size="16" fill="#2e2a25">${name}: printed side up, top of the dress at the top.</text>
  <text x="${pad}" y="${S + pad + 50}" font-size="14" fill="#2e2a25"><tspan fill="#2f5f9e">- - - valley</tspan>   <tspan fill="#b23a2b">-·-·- mountain</tspan>   (as seen from this side)</text>
</svg>
`;
}

if (process.argv[1]?.endsWith('crease_pattern.ts')) {
  mkdirSync('docs/crease-patterns', { recursive: true });
  let bad = 0;
  for (const g of GARMENTS) {
    const cp = creasePattern(buildGarment(g.id));
    const problems = vertexProblems(cp);
    bad += problems.length;
    writeFileSync(`docs/crease-patterns/${g.id}.svg`, creaseSvg(g.name, cp));
    console.log(`${g.id}: ${cp.length} crease segments, ${problems.length} vertex problems`);
    for (const p of problems.slice(0, 20)) console.log('  ' + p);
  }
  if (bad) process.exit(1);
}

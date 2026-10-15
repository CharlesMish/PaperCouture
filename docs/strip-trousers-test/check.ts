// TEST STUDY check (not part of npm test): node --import tsx docs/strip-trousers-test/check.ts
import assert from 'node:assert/strict';
import { buildStripTrousersStudy, crotchDepth } from './stripTrousersStudy';
import { buildTimeline } from '../../src/fold/timeline';
import { checkState, isFlipped, modelPoly } from '../../src/fold/engine';
import { signedArea, type Vec2 } from '../../src/fold/geometry';
import { creasePattern, vertexProblems } from '../../scripts/crease_pattern';
import { GARMENTS } from '../../src/fold/garments';

assert(!GARMENTS.some((g) => g.id.includes('trousers')), 'the study must not be registered as a garment');
const inside = (poly: Vec2[], p: Vec2) => poly.every((a, i) => {
  const b = poly[(i + 1) % poly.length];
  return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x) >= -1e-10;
});
for (const [w, beta] of [[0.5, 22], [0.25, 16]] as const) {
  const c = buildStripTrousersStudy(w, beta);
  const tl = buildTimeline(c.ops);
  for (const [i, s] of tl.states.entries()) assert.deepEqual(checkState(s, `${c.name}:${i}`), []);
  assert.deepEqual(vertexProblems(creasePattern(c)), []);
  const final = tl.states.at(-1)!;
  assert(Math.abs(final.facets.reduce((n, f) => n + signedArea(f.poly), 0) - 4) < 1e-9);
  // in the symmetric frame (legs splayed evenly about straight down; rotate by beta about the waist centre), a point on the
  // axis below the crotch is empty and points inside each leg show the print
  const b = (beta * Math.PI) / 180, o = c.meta.shoulderPoint;
  const toModel = (x: number, y: number) => ({ x: o.x + Math.cos(b) * x - Math.sin(b) * y, y: o.y + Math.sin(b) * x + Math.cos(b) * y });
  const depth = crotchDepth(w, beta);
  const polys = final.facets.map((f) => { const p = modelPoly(f); return signedArea(p) < 0 ? p.slice().reverse() : p; });
  const gap = toModel(0, -(depth + 0.1));
  assert(!polys.some((p) => inside(p, gap)), `${c.name}: the gap below the crotch must be empty`);
  const legSides: boolean[] = [];
  for (const sx of [-1, 1]) {
    const q = toModel(sx * (Math.sin(b) * 0.8), -Math.cos(b) * 0.8);
    const top = final.facets.filter((f, i) => inside(polys[i], q)).sort((m, n) => n.rank - m.rank)[0];
    assert(top, `${c.name}: leg ${sx} present`);
    legSides.push(isFlipped(top));
  }
  assert.equal(legSides[0], legSides[1], `${c.name}: both legs show the same side of the paper`);
  console.log(`${c.name}: ${c.ops.length} steps, ${final.facets.length} facets, crotch ${depth.toFixed(2)} of a 1-unit leg, gap empty`);
}

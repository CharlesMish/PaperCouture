import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildWrapSkirt, WrapDirection, WaistbandFinish } from '../src/fold/wrapSkirt';
import { buildLapelVest } from '../src/fold/lapelVest';
import { Construction } from '../src/fold/construction';
import { SheetState, checkState, computeLevels, isFlipped, modelPoly } from '../src/fold/engine';
import { buildTimeline, evaluateFrame, LAYER_GAP, posePoint } from '../src/fold/timeline';
import { Vec2, centroid, signedArea } from '../src/fold/geometry';

const artifact = fileURLToPath(new URL('../docs/geometry-collection/skirt-vest/', import.meta.url));
const baseline = JSON.parse(readFileSync(`${artifact}/baseline.json`, 'utf8'));
// JSON round-trip also normalizes signed zero, matching the serialized baseline.
const normalize = (c: Construction) => JSON.parse(JSON.stringify({ construction: c, states: buildTimeline(c.ops).states.map(s => s.facets.map(({ poly, T, rank, tags }) => ({ poly, T, rank, tags }))) }));
assert.deepEqual(normalize(buildWrapSkirt()), baseline.skirt, 'default skirt must retain every authored fold and state');
assert.deepEqual(normalize(buildLapelVest()), baseline.vest, 'default vest must retain every authored fold and state');
assert.deepEqual(buildWrapSkirt({ wrap: 'original', band: 'double' }), buildWrapSkirt());
assert.deepEqual(buildLapelVest('short'), buildLapelVest());

const inside = (poly: Vec2[], p: Vec2) => {
  const sign = Math.sign(signedArea(poly));
  return poly.every((a, i) => {
    const b = poly[(i + 1) % poly.length];
    return sign * ((b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x)) >= -1e-9;
  });
};
const faceAt = (s: SheetState, x: number, y: number) => s.facets.filter(f => inside(modelPoly(f), { x, y })).sort((a, b) => b.rank - a.rank)[0];
const pointKey = (p: Vec2) => `${p.x.toFixed(7).replace('-0.0000000', '0.0000000')},${p.y.toFixed(7).replace('-0.0000000', '0.0000000')}`;
const polyKey = (p: Vec2[]) => p.map(pointKey).sort().join(';');
const mirror = (p: Vec2) => ({ x: -p.x, y: p.y });
const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const cases: { id: string; c: Construction }[] = [];
for (const wrap of ['original', 'opposite'] as WrapDirection[]) {
  for (const band of ['double', 'single'] as WaistbandFinish[]) cases.push({ id: `skirt-${wrap}-${band}`, c: buildWrapSkirt({ wrap, band }) });
}
for (const length of ['short', 'longline'] as const) cases.push({ id: `vest-${length}`, c: buildLapelVest(length) });

for (const band of ['double', 'single'] as const) {
  const a = buildWrapSkirt({ band });
  const b = buildWrapSkirt({ wrap: 'opposite', band });
  assert.deepEqual(a.ops.slice(0, 2), b.ops.slice(0, 2), 'wrap choice may retain only the first two steps');
  const original = buildTimeline(a.ops).states.at(-1)!;
  const opposite = buildTimeline(b.ops).states.at(-1)!;
  assert.equal(original.facets.length, opposite.facets.length);
  for (const f of original.facets) {
    const twin = opposite.facets.find(g => polyKey(g.poly) === polyKey(f.poly.map(mirror)));
    assert.ok(twin, 'opposite wrap must use the reflected material region, not altered texture UVs');
    assert.equal(polyKey(modelPoly(twin)), polyKey(modelPoly(f).map(mirror)), 'opposite wrap must be the true geometric mirror');
    assert.equal(isFlipped(twin), isFlipped(f), 'a mirrored fold must retain face exposure');
    assert.equal(twin.rank, f.rank, 'a mirrored fold must retain physical layer order');
  }
}
for (const wrap of ['original', 'opposite'] as const) {
  const a = buildWrapSkirt({ wrap });
  const b = buildWrapSkirt({ wrap, band: 'single' });
  assert.deepEqual(a.ops.slice(0, 7), b.ops.slice(0, 7), 'waistband choices must preserve their seven-step prefix');
  assert.equal(a.ops.length, 9);
  assert.equal(b.ops.length, 8);
  assert.equal(b.ops.at(-1)!.id, 'skirt-waist');
  const s = buildTimeline(b.ops).states.at(-1)!;
  const x = wrap === 'original' ? 0.2 : -0.2;
  assert.ok(!isFlipped(faceAt(s, x, 0.70)), 'the broad one-turn band exposes print, not reverse material');
  const d = buildTimeline(a.ops).states.at(-1)!;
  assert.ok(!isFlipped(faceAt(d, x, 0.65)), 'the default double-turn band must expose print material');
}
assert.deepEqual(buildLapelVest().ops.slice(0, 6), buildLapelVest('longline').ops.slice(0, 6), 'vest length choice must retain first six steps and every lapel crease');

const reports = cases.map(({ id, c }) => {
  const tl = buildTimeline(c.ops);
  for (const [i, state] of tl.states.entries()) assert.deepEqual(checkState(state, `${id}: state ${i}`), []);
  for (const op of c.ops) if (op.kind === 'fold') assert.ok(op.folds.every(f => f.sense === 'valley'), `${id}: preserve visible upward fold sequence`);
  let worstGap = 0;
  let lowestZ = Infinity;
  for (const op of tl.ops) {
    for (let sample = 0; sample <= 20; sample++) {
      const M = evaluateFrame(op, sample / 20);
      for (const h of op.hinges) for (const m of [h.m0, h.m1]) worstGap = Math.max(worstGap, dist(posePoint(M, h.a * 12, m.x, m.y), posePoint(M, h.b * 12, m.x, m.y)));
      for (const piece of op.pieces) for (const m of piece.poly) lowestZ = Math.min(lowestZ, posePoint(M, piece.index * 12, m.x, m.y)[2]);
    }
  }
  assert.ok(worstGap <= 8 * LAYER_GAP, `${id}: hinge gap ${worstGap}`);
  assert.ok(lowestZ >= -1e-9, `${id}: material below table`);
  for (let i = 0; i < tl.ops.length - 1; i++) {
    const a = tl.ops[i];
    const b = tl.ops[i + 1];
    const A = evaluateFrame(a, 1);
    const B = evaluateFrame(b, 0);
    for (const piece of b.pieces) {
      const parent = a.pieces.find(p => inside(p.poly, centroid(piece.poly)));
      assert.ok(parent, `${id}: missing material parent`);
      for (const m of piece.poly) assert.ok(dist(posePoint(A, parent.index * 12, m.x, m.y), posePoint(B, piece.index * 12, m.x, m.y)) < 1e-9, `${id}: step ${i} endpoint jump`);
    }
  }
  const final = tl.states.at(-1)!;
  const points = final.facets.flatMap(modelPoly);
  const bounds = { left: Math.min(...points.map(p => p.x)), right: Math.max(...points.map(p => p.x)), top: Math.max(...points.map(p => p.y)), bottom: Math.min(...points.map(p => p.y)) };
  assert.ok(Math.abs(bounds.top - c.meta.top) < 1e-9, `${id}: top metadata must follow actual outline`);
  if (id === 'vest-longline') assert.ok(Math.abs(bounds.bottom + 0.78) < 1e-9);
  return { id, steps: c.ops.length, facets: final.facets.length, bounds, worstGap, lowestZ, final };
});

if (process.argv.includes('--capture')) {
  mkdirSync(artifact, { recursive: true });
  writeFileSync(`${artifact}/geometry-report.json`, JSON.stringify(reports, null, 2));
  const panels: string[] = [];
  const tileW = 350, tileH = 340, scale = 142;
  for (const [row, report] of reports.entries()) for (const [col, view] of ['front', 'angle', 'back'].entries()) {
    const cx = col * tileW + tileW / 2, cy = row * tileH + 183;
    panels.push(`<rect x="${col * tileW}" y="${row * tileH}" width="${tileW}" height="${tileH}" fill="#ece7df"/><text x="${col * tileW + 15}" y="${row * tileH + 28}" fill="#242424" font-size="16">${report.id} · ${view}</text>`);
    const levels = computeLevels(report.final);
    const facets = report.final.facets.slice().sort((a, b) => view === 'back' ? b.rank - a.rank : a.rank - b.rank);
    const projection = (x: number, y: number, z: number) => {
      if (view === 'back') return [cx - scale * x, cy - scale * y];
      if (view === 'angle') return [cx + scale * (0.83 * x + 0.56 * z), cy - scale * (y - 0.12 * x + 0.18 * z)];
      return [cx + scale * x, cy - scale * y];
    };
    for (const f of facets) {
      const z = (levels.get(f.id) ?? 0) * LAYER_GAP;
      const visibleBack = view === 'back' ? !isFlipped(f) : isFlipped(f);
      const points = modelPoly(f).map(p => projection(p.x, p.y, z).join(',')).join(' ');
      panels.push(`<polygon points="${points}" fill="${visibleBack ? '#174b56' : '#d5ae66'}" stroke="${visibleBack ? '#15343a' : '#725731'}" stroke-width="0.8" stroke-linejoin="round"/>`);
    }
  }
  writeFileSync(`${artifact}/plain-facets.svg`, `<svg xmlns="http://www.w3.org/2000/svg" width="${tileW * 3}" height="${tileH * reports.length}" font-family="sans-serif">${panels.join('')}</svg>`);
}
console.log(JSON.stringify(reports.map(({ final: _final, ...report }) => report), null, 2));
console.log('Skirt/vest variants: baseline parity, prefixes, true mirror mapping, face exposure, retained area, rigidity, endpoint continuity, sampled hinges, above-table motion, metadata all pass.');

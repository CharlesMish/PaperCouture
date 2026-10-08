/** Folded necktie (experimental): focused real-engine checks.
 *
 *   node --import tsx scripts/check-necktie.ts              # assertions only
 *   node --import tsx scripts/check-necktie.ts docs/necktie  # also writes maps
 *
 * These are flat rigid-facet checks with 81 sampled poses per operation. They
 * do not certify continuous collision-free motion or physical foldability. */
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { buildNecktie, NECKTIE_KNOT } from '../src/fold/necktie';
import { attachmentAnchors, buildGarment, garmentDisplayAngle, garmentExperiment, GARMENTS } from '../src/fold/garments';
import { recommendedSquareCm, REFERENCE_SQUARE_CM } from '../src/fold/paperSize';
import { checkState, findAdjacency, isFlipped, modelPoly, type SheetState } from '../src/fold/engine';
import { applyAffine, centroid, signedArea, type Vec2, v2 } from '../src/fold/geometry';
import { buildTimeline, evaluateFrame, posePoint, LAYER_GAP } from '../src/fold/timeline';
import { FoldController } from '../src/app/controller';
import { findPaper } from '../src/papers/index';
import { normalizePosition } from '../src/papers/printPosition';
import { interiorPiercing } from './experiment-collision';
import { canvasPoint, landings, materialPoint } from './paperLanding';

const out = process.argv[2];
const S = Math.SQRT2;
const inside = (poly: Vec2[], p: Vec2) => poly.every((a, i) => { const b = poly[(i + 1) % poly.length]; return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x) >= -1e-10; });
const ccw = (poly: Vec2[]) => signedArea(poly) < 0 ? poly.slice().reverse() : poly;
const distance = (a: number[], b: number[]) => Math.hypot(...a.map((x, i) => x - b[i]));
const near = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps;

// ---- registry and size
assert(GARMENTS.some(g => g.id === 'necktie' && g.name === 'Folded necktie'));
assert.match(garmentExperiment('necktie') ?? '', /no neck loop/);
assert.equal(attachmentAnchors('necktie', 1, -1).length, 0, 'experimental designs have no reviewed attachment anchors');
assert.equal(garmentDisplayAngle('necktie'), Math.PI / 4);
assert.equal(recommendedSquareCm('necktie'), 7);
const c = buildNecktie();
assert.deepEqual(JSON.stringify(buildGarment('necktie').ops), JSON.stringify(c.ops));

// ---- operations: valley folds and explicit turns; one selective, accessible tuck
assert.deepEqual(c.ops.map(op => op.id), ['tie-reverse', 'tie-kite-left', 'tie-kite-right', 'tie-narrow-left', 'tie-narrow-right', 'tie-front', 'tie-knot', 'tie-knot-tuck']);
assert(c.ops.every(op => op.kind === 'turn' || (op.kind === 'fold' && op.folds.every(f => f.sense === 'valley'))));
const selective = c.ops.flatMap(op => op.kind === 'fold' ? op.folds.filter(f => f.only) : []);
assert.deepEqual(selective.map(f => [f.name, f.only]), [['tie-knot-tuck', 'tie-knot']]);
assert(c.ops.every(op => op.title && op.hint && op.hint.length > 40), 'every step has a named title and a useful instruction');

const tl = buildTimeline(c.ops);
const connected = (state: SheetState) => {
  const seen = new Set([state.facets[0].id]), adj = findAdjacency(state.facets);
  for (let grew = true; grew;) { grew = false; for (const h of adj) for (const [x, y] of [[h.a, h.b], [h.b, h.a]]) if (seen.has(x.id) && !seen.has(y.id)) { seen.add(y.id); grew = true; } }
  return seen.size === state.facets.length;
};
for (const [i, state] of tl.states.entries()) {
  assert.deepEqual(checkState(state, `necktie:${i}`), [], 'retained area, CCW rigid facets and closed seams');
  assert(near(state.facets.reduce((s, f) => s + signedArea(f.poly), 0), 4), 'the whole square is retained');
  assert(connected(state), 'material stays one connected sheet');
}

// ---- motion: rigid, endpoint-continuous, above the table, no sampled piercing
const SAMPLES = 81;
let gap = 0, gapAt = '', lowest = Infinity, piercings = 0, stretch = 0;
const perOperation: { id: string; hingeGap: number; piercings: number }[] = [];
for (const op of tl.ops) {
  let opGap = 0, opPierce = 0;
  for (let i = 0; i < SAMPLES; i++) {
    const M = evaluateFrame(op, i / (SAMPLES - 1));
    for (const p of op.pieces) for (let j = 0; j < p.poly.length; j++) {
      const a = p.poly[j], b = p.poly[(j + 1) % p.poly.length];
      stretch = Math.max(stretch, Math.abs(distance(posePoint(M, p.index * 12, a.x, a.y), posePoint(M, p.index * 12, b.x, b.y)) - Math.hypot(a.x - b.x, a.y - b.y)));
    }
    for (const h of op.hinges) for (const m of [h.m0, h.m1]) {
      const d = distance(posePoint(M, h.a * 12, m.x, m.y), posePoint(M, h.b * 12, m.x, m.y));
      opGap = Math.max(opGap, d); if (d > gap) { gap = d; gapAt = `${op.op.id} at t=${(i / (SAMPLES - 1)).toFixed(4)}`; }
    }
    for (const p of op.pieces) for (const m of p.poly) lowest = Math.min(lowest, posePoint(M, p.index * 12, m.x, m.y)[2]);
    const tris = op.pieces.flatMap(p => p.poly.slice(1, -1).map((_, j) => ({ id: p.id, pts: [p.poly[0], p.poly[j + 1], p.poly[j + 2]].map(m => posePoint(M, p.index * 12, m.x, m.y)) })));
    for (let a = 0; a < tris.length; a++) for (let b = a + 1; b < tris.length; b++)
      if (tris[a].id !== tris[b].id && interiorPiercing(tris[a].pts as any, tris[b].pts as any)) { piercings++; opPierce++; }
  }
  perOperation.push({ id: op.op.id, hingeGap: +opGap.toFixed(4), piercings: opPierce });
}
assert(stretch < 1e-9, 'rigid facets keep their edge lengths during motion');
assert(gap <= 8 * LAYER_GAP + 1e-12, `hinge gap ${gap} exceeds the unchanged limit`);
assert(lowest >= -1e-9, 'paper never dips below the table');
assert.equal(piercings, 0, 'no sampled strict triangle piercing');
// endpoints: frame(k, 1) and frame(k + 1, 0) are the same paper; the start is the flat square
for (let i = 1; i < tl.ops.length; i++) {
  const a = tl.ops[i - 1], b = tl.ops[i], A = evaluateFrame(a, 1), B = evaluateFrame(b, 0);
  for (const p of b.pieces) {
    const src = a.pieces.find(q => inside(q.poly, centroid(p.poly))); assert(src);
    for (const m of p.poly) assert(distance(posePoint(A, src.index * 12, m.x, m.y), posePoint(B, p.index * 12, m.x, m.y)) < 1e-9, 'timeline endpoints agree');
  }
}
for (const p of tl.ops[0].pieces) for (const m of p.poly) {
  const q = posePoint(evaluateFrame(tl.ops[0], 0), p.index * 12, m.x, m.y);
  assert(near(q[0], m.x) && near(q[1], m.y), 'operation 1 starts from the flat square');
}
for (const [k, op] of tl.ops.entries()) {
  const M = evaluateFrame(op, 1), state = tl.states[k + 1];
  for (const p of op.pieces) { const f = state.facets.find(g => g.id === p.id)!; for (const m of p.poly) { const q = posePoint(M, p.index * 12, m.x, m.y), r = applyAffine(f.T, m); assert(near(q[0], r.x) && near(q[1], r.y), 'animation ends at the resting fold'); } }
}

// ---- controller: forward, back, mid-step reversal, reset
const ctrl = new FoldController(c.ops.length, () => 1);
for (let i = 0; i < c.ops.length; i++) { ctrl.next(); ctrl.update(2); assert.equal(ctrl.step, i + 1); }
for (let i = c.ops.length; i > 0; i--) { ctrl.prev(); ctrl.update(2); assert.equal(ctrl.step, i - 1); }
ctrl.next(); ctrl.update(.35); const midPose = ctrl.pose(); ctrl.prev(); assert.deepEqual(ctrl.pose(), midPose, 'reversal starts from the current pose'); ctrl.update(2); assert.equal(ctrl.step, 0);
for (let i = 0; i < 7; i++) { ctrl.next(); ctrl.update(2); }
ctrl.next(); ctrl.update(.5); ctrl.prev(); ctrl.update(2); assert.equal(ctrl.step, 7, 'reversing the tuck mid-motion returns to the folded-down point');
ctrl.next(); ctrl.update(.35); ctrl.reset(); assert.equal(ctrl.step, 0); assert(!ctrl.moving);

// ---- finished shape, in the upright Display/board orientation
const final = tl.states.at(-1)!;
const angle = garmentDisplayAngle('necktie');
const up = (p: Vec2) => v2(p.x * Math.cos(angle) - p.y * Math.sin(angle), p.x * Math.sin(angle) + p.y * Math.cos(angle));
const pts = final.facets.flatMap(f => modelPoly(f).map(up));
const minX = Math.min(...pts.map(p => p.x)), maxX = Math.max(...pts.map(p => p.x));
const minY = Math.min(...pts.map(p => p.y)), maxY = Math.max(...pts.map(p => p.y));
const width = maxX - minX, height = maxY - minY;
assert(near(minX, -maxX) && near(maxY, NECKTIE_KNOT.crease) && near(minY, -S), 'upright, symmetric, knot crease on top, square corner as the tip');
const tucked = final.facets.filter(f => f.tags.includes('tie-knot-tuck'));
assert(tucked.length > 0 && Math.max(...tucked.flatMap(f => modelPoly(f).map(up).map(p => p.y))) < NECKTIE_KNOT.crease - .02, 'the tucked point stays inside the knot');
const hitAt = (p: Vec2, view: 'front' | 'back') => {
  const q = v2(p.x * Math.cos(-angle) - p.y * Math.sin(-angle), p.x * Math.sin(-angle) + p.y * Math.cos(-angle));
  const hits = final.facets.filter(f => inside(ccw(modelPoly(f)), q)).sort((a, b) => a.rank - b.rank);
  return view === 'front' ? hits.at(-1) : hits[0];
};
const bladeCentre = hitAt(v2(0, -.55), 'front')!;
assert(bladeCentre.tags.length === 0 && !isFlipped(bladeCentre), 'the blade is the untouched printed centre of the square');
const knotFace = hitAt(v2(0, NECKTIE_KNOT.crease - .1), 'front')!;
assert(knotFace.tags.includes('tie-knot'), 'the knot is folded material lying over the blade');
let covered = 0, reverseFront = 0, reverseBack = 0;
for (let y = minY; y < maxY; y += .01) for (let x = minX; x < maxX; x += .01) {
  const f = hitAt(v2(x + .005, y + .005), 'front'); if (!f) continue; covered++;
  if (isFlipped(f)) reverseFront++;
  if (!isFlipped(hitAt(v2(x + .005, y + .005), 'back')!)) reverseBack++;
}
assert.equal(reverseFront, 0, 'Front shows only the printed face: blade and knot');
const tip = final.facets.flatMap(f => modelPoly(f).map(up)).filter(p => near(p.y, -S));
assert(tip.length > 0 && tip.every(p => near(p.x, 0)), 'single pointed tip');
const sideCm = recommendedSquareCm('necktie'), scale = sideCm / REFERENCE_SQUARE_CM;

// ---- source visibility (actual engine) and Corner bloom alignment
const N = 96, L = landings(final, N);
assert.equal(L.length, N * N);
const share = (face: 'print' | 'reverse', view: 'front' | 'back') => L.filter(l => l[view] === face).length / L.length;
const shares = { printFront: share('print', 'front'), printBack: share('print', 'back'), reverseFront: share('reverse', 'front'), reverseBack: share('reverse', 'back') };
assert.equal(shares.reverseFront, 0);
const bloom = findPaper('corner-bloom');
assert(bloom.placement?.kind === 'slide');
const limit = bloom.placement.limit, BLOOM = { col: .3, row: .66 }, RADIUS = .23; // flower drawing centre; its petals reach 0.115 of the canvas = 0.23 material units
// The square's centre: on the blade axis, just below the knot. It is reachable
// within the existing slide limit at all four turns (blade material = final model).
const target = v2(0, 0);
const visibleFront = (m: Vec2) => { const l = L.reduce((best, x) => Math.hypot(x.m.x - m.x, x.m.y - m.y) < Math.hypot(best.m.x - m.x, best.m.y - m.y) ? x : best); return l.front === 'print' && Math.hypot(l.m.x - m.x, l.m.y - m.y) < 2 / N; };
const discShare = (centre: Vec2) => { let n = 0, v = 0; for (let a = 0; a < 48; a++) for (const r of [0, RADIUS / 2, RADIUS]) { const m = v2(centre.x + r * Math.cos(a / 48 * 2 * Math.PI), centre.y + r * Math.sin(a / 48 * 2 * Math.PI)); if (Math.abs(m.x) > 1 || Math.abs(m.y) > 1) continue; n++; if (visibleFront(m)) v++; } return n ? v / n : 0; };
const alignment = [0, 1, 2, 3].map(q => {
  const original = materialPoint(BLOOM.col, BLOOM.row, 'print', q);
  const offset = normalizePosition(bloom, { x: Math.round((target.x - original.x) / 2 * 32) / 32, y: Math.round((target.y - original.y) / 2 * 32) / 32 });
  const aligned = v2(original.x + 2 * offset.x, original.y + 2 * offset.y);
  const c0 = canvasPoint(original, 'print', q);
  assert(near(c0.col, BLOOM.col, 1e-12) && near(c0.row, BLOOM.row, 1e-12));
  const result = { quarterTurns: q, degrees: q * 90, unshiftedMaterial: [+original.x.toFixed(4), +original.y.toFixed(4)], unshiftedFrontShare: +discShare(original).toFixed(3),
    offset, nudges: { right: offset.x * 32, up: offset.y * 32 }, alignedMaterial: [+aligned.x.toFixed(4), +aligned.y.toFixed(4)], alignedFrontShare: +discShare(aligned).toFixed(3) };
  assert(Math.abs(offset.x) <= limit && Math.abs(offset.y) <= limit, 'alignment uses the existing bounded slide');
  assert(Math.hypot(aligned.x - target.x, aligned.y - target.y) < 2 / 32 + 1e-9);
  assert.equal(result.alignedFrontShare, 1, 'the aligned flower disc is entirely on the printed blade');
  return result;
});

const report = {
  construction: c.name, sourceSquare: '[-1, 1]^2, one intact square', steps: c.ops.length,
  creases: c.ops.map(op => op.kind !== 'fold' ? { id: op.id, kind: op.kind === 'turn' ? 'turn over (x -> -x)' : op.kind } : { id: op.id, folds: op.folds.map(f => ({ a: [+f.a.x.toFixed(5), +f.a.y.toFixed(5)], b: [+f.b.x.toFixed(5), +f.b.y.toFixed(5)], moving: [+f.moving.x.toFixed(5), +f.moving.y.toFixed(5)], sense: f.sense, ...(f.only ? { only: f.only } : {}) })) }),
  finalFacets: final.facets.length, retainedArea: 4, connected: true,
  uprightModel: { width: +width.toFixed(4), height: +height.toFixed(4), knotCrease: NECKTIE_KNOT.crease, knotDepth: NECKTIE_KNOT.depth },
  suggestedSquareCm: sideCm, board: { width: +(width * scale).toFixed(4), height: +(height * scale).toFixed(4) },
  frontReverseFraction: reverseFront / covered, backReverseFraction: +(reverseBack / covered).toFixed(3),
  samplesPerOperation: SAMPLES, worstHingeGap: +gap.toFixed(4), worstHingeGapAt: gapAt, hingeLimit: 8 * LAYER_GAP, minimumZ: lowest, strictTrianglePiercings: piercings, perOperation,
  visibility: { method: 'real engine final facets and ranks, flat normal projection (scripts/paperLanding.ts)', materialSamples: N * N, shares },
  cornerBloomAlignment: { target: [+target.x.toFixed(4), +target.y.toFixed(4)], discRadius: RADIUS, step: '1/32 of the sheet per nudge', alignment },
  limitations: ['not physical paper', 'not continuous collision certification', 'flat normal projection, not the tilted Display camera'],
};

if (out) {
  mkdirSync(`${out}/visibility`, { recursive: true });
  const SZ = 240, M0 = 30, CW = 280, RH = 300;
  const columns = [['print', 'front', 'Print seen from Front'], ['print', 'back', 'Print seen from Back'], ['reverse', 'front', 'Reverse seen from Front'], ['reverse', 'back', 'Reverse seen from Back']] as const;
  const svg = [`<svg xmlns="http://www.w3.org/2000/svg" width="1150" height="1330" viewBox="0 0 1150 1330"><rect width="1150" height="1330" fill="#f7f4ee"/><g font-family="sans-serif" fill="#1e3232"><text x="30" y="28" font-size="20">Folded necktie: actual-engine visible paper in source-canvas coordinates</text><text x="30" y="49" font-size="13">Teal is visible material; pale is hidden. Rings: Corner bloom centre unshifted (open) and deliberately aligned (filled), print face only.</text><text x="30" y="68" font-size="13">Normal projection only. Back canvas mirrors material x once. Raised knot edges can differ in the tilted Display presets.</text>`];
  for (let q = 0; q < 4; q++) for (let col = 0; col < 4; col++) {
    const [face, view, label] = columns[col], mask = new Uint8Array(N * N);
    for (const l of L) if (l[view] === face) { const p = canvasPoint(l.m, face, q); mask[Math.min(N - 1, Math.floor(p.row * N)) * N + Math.min(N - 1, Math.floor(p.col * N))] = 1; }
    const x = M0 + col * CW, y = 110 + q * RH, count = mask.reduce((n, v) => n + v, 0);
    svg.push(`<text x="${x}" y="${y - 17}" font-size="14">${q * 90}° · ${label}</text><rect x="${x}" y="${y}" width="${SZ}" height="${SZ}" fill="#e1ddd5" stroke="#8b918b"/>`);
    for (let row = 0; row < N; row++) for (let i = 0; i < N;) { if (!mask[row * N + i]) { i++; continue; } const s = i; while (i < N && mask[row * N + i]) i++; svg.push(`<rect x="${x + s * SZ / N}" y="${y + row * SZ / N}" width="${(i - s) * SZ / N}" height="${SZ / N}" fill="#315f62"/>`); }
    if (face === 'print') {
      const a = alignment[q], o = canvasPoint(v2(...a.unshiftedMaterial as [number, number]), 'print', q), t = canvasPoint(v2(...a.alignedMaterial as [number, number]), 'print', q);
      const fx = (p: { col: number }) => x + (face === 'print' ? p.col : 1 - p.col) * SZ, fy = (p: { row: number }) => y + p.row * SZ;
      svg.push(`<circle cx="${fx(o)}" cy="${fy(o)}" r="${RADIUS / 2 * SZ}" fill="none" stroke="#c4483a" stroke-width="2"/><circle cx="${fx(t)}" cy="${fy(t)}" r="${RADIUS / 2 * SZ}" fill="#c4483a" fill-opacity=".35" stroke="#c4483a" stroke-width="2"/>`);
    }
    svg.push(`<text x="${x}" y="${y + SZ + 19}" font-size="13">${(count / (N * N) * 100).toFixed(2)}% of this face visible</text>`);
  }
  svg.push('</g></svg>');
  writeFileSync(`${out}/visibility/necktie.svg`, svg.join('\n'));
  writeFileSync(`${out}/geometry-report.json`, JSON.stringify(report, null, 2));
}
console.log(JSON.stringify({ passed: true, steps: report.steps, facets: report.finalFacets, board: report.board, worstHingeGap: report.worstHingeGap, at: gapAt, piercings, samplesPerOperation: SAMPLES, shares, alignment: alignment.map(a => ({ deg: a.degrees, unshifted: a.unshiftedFrontShare, offset: a.offset, aligned: a.alignedFrontShare })) }));
console.log('These checks do not certify physical foldability or continuous collision-free motion.');

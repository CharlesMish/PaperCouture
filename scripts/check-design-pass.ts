// 2026-10 design pass: the crease-aware paper's constants, the paper registry
// additions, and geometry checks on the unregistered origami studies.
// Writes docs/design-pass-2026-10/evidence/geometry.json.
//
// The study checks are the same discrete ones the Swing coat uses: retained
// area, valid resting states, rigid edges, sampled hinge gaps, table clearance
// and strict triangle piercing, plus local flat-foldability of the finished
// crease pattern. None of this establishes physical foldability.

import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { buildSwingCoat } from '../src/fold/swingCoat';
import { buildCampShirt } from '../src/fold/campShirt';
import type { Construction } from '../src/fold/construction';
import { checkState, modelPoly } from '../src/fold/engine';
import { signedArea } from '../src/fold/geometry';
import { buildTimeline, evaluateFrame, posePoint, LAYER_GAP } from '../src/fold/timeline';
import { PAPERS } from '../src/papers';
import { SWING_COAT_CREASES } from '../src/papers/coatMarks';
import { PROOF_MARGIN } from '../src/papers/risoProof';
import { creasePattern, vertexProblems } from './crease_pattern';
import { hingeProblems } from './hingeCheck';
import { interiorPiercing } from './experiment-collision';
import { STUDIES } from '../docs/design-pass-2026-10/origami/studies';

// --- Crease bloom is drawn on exactly the Swing coat's creases.
const key = (a: { x: number; y: number }, b: { x: number; y: number }) => {
  const p = [a, b].map(q => `${q.x.toFixed(3)},${q.y.toFixed(3)}`).sort();
  return p.join(' ');
};
const actual = new Set(creasePattern(buildSwingCoat()).map(c => key(c.a, c.b)));
const drawn = new Set(SWING_COAT_CREASES.map(([a, b]) => key({ x: a[0], y: a[1] }, { x: b[0], y: b[1] })));
assert.deepEqual([...drawn].sort(), [...actual].sort(), 'coatMarks.ts must list the Swing coat crease pattern');

// --- Riso proof's margin is narrower than the edge turns it is drawn for,
// measured from each finished crease pattern (vertical creases nearest an edge).
const edgeTurn = (c: Construction) => Math.min(...creasePattern(c)
  .filter(k => Math.abs(k.a.x - k.b.x) < 1e-9 && Math.abs(k.a.x) > 0.85).map(k => 1 - Math.abs(k.a.x)));
const turns = { 'swing-coat': edgeTurn(buildSwingCoat()), 'camp-shirt': edgeTurn(buildCampShirt()) };
assert(Math.abs(turns['swing-coat'] - 0.07) < 1e-9 && Math.abs(turns['camp-shirt'] - 0.08) < 1e-9, JSON.stringify(turns));
assert(PROOF_MARGIN < Math.min(...Object.values(turns)));

// --- Registry: four additions at the end of the experimental list, and
// every earlier paper keeps its id, relative order and curation.
const BEFORE = ['stripe-disc', 'running-stitch', 'pinstripe-lining', 'plum-scatter', 'oat-linen', 'slate-grain', 'plum-seed', 'broken-twill', 'copper-fleck', 'border-print', 'botanical', 'indigo-lattice', 'ivory-border', 'reed-study', 'arc-study', 'ginkgo-pairs', 'corner-bloom', 'midnight-orchard', 'tidal-bands', 'woven-checks', 'seed-dashes', 'ink-reverse', 'reverse-garden', 'starlit-lining', 'open-stems', 'falling-chevrons', 'sunray-pleats', 'cut-paper-mosaic', 'wide-frame', 'compass-lining'];
const ADDED = ['riso-proof', 'crease-bloom', 'marbled-endpaper', 'dusk-wash'];
const CLASSIC = ['seigaiha', 'asanoha', 'polka-dot', 'houndstooth'];
assert.deepEqual(PAPERS.filter(p => !CLASSIC.includes(p.id)).map(p => p.id), [...BEFORE, ...ADDED, 'grid']);
assert.deepEqual(PAPERS.filter(p => CLASSIC.includes(p.id)).map(p => p.id), CLASSIC);
for (const id of CLASSIC) assert.equal(PAPERS.find(p => p.id === id)?.curation, 'curated');
assert.equal(new Set(PAPERS.map(p => p.id)).size, PAPERS.length);
for (const id of ADDED) {
  const p = PAPERS.find(q => q.id === id)!;
  assert.equal(p.curation, 'experimental');
  assert.equal(p.placement, undefined, `${id}: fixed placement; sliding has not been verified`);
  assert(p.placementNote && p.note && !p.hidden);
}
assert.equal(PAPERS.filter(p => p.curation === 'curated').length, 17);

// --- Origami studies.
const studies: Record<string, unknown> = {};
for (const [id, build] of Object.entries(STUDIES)) {
  const c = build(), tl = buildTimeline(c.ops);
  assert.equal(new Set(c.ops.map(op => op.id)).size, c.ops.length, id);
  assert(c.ops.every(op => op.kind === 'turn' || (op.kind === 'fold' && op.folds.every(f => f.sense === 'valley'))), id);
  for (const [i, s] of tl.states.entries()) {
    assert.deepEqual(checkState(s, `${id}:${i}`), []);
    const area = s.facets.reduce((n, f) => n + Math.abs(signedArea(f.poly)), 0);
    assert(Math.abs(area - 4) < 1e-9, `${id}:${i}: area ${area}`);
  }
  let maxHingeGap = 0, maxEdgeError = 0, minZ = Infinity, piercings = 0;
  for (const op of tl.ops) {
    assert.deepEqual(hingeProblems(op), []);
    for (let k = 0; k <= 80; k++) {
      const M = evaluateFrame(op, k / 80);
      for (const p of op.pieces) for (let i = 0; i < p.poly.length; i++) {
        const a = p.poly[i], b = p.poly[(i + 1) % p.poly.length];
        const A = posePoint(M, p.index * 12, a.x, a.y), B = posePoint(M, p.index * 12, b.x, b.y);
        minZ = Math.min(minZ, A[2]);
        maxEdgeError = Math.max(maxEdgeError, Math.abs(Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]) - Math.hypot(a.x - b.x, a.y - b.y)));
      }
      for (const h of op.hinges) for (const m of [h.m0, h.m1]) {
        const A = posePoint(M, h.a * 12, m.x, m.y), B = posePoint(M, h.b * 12, m.x, m.y);
        maxHingeGap = Math.max(maxHingeGap, Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]));
      }
      const tris = op.pieces.flatMap(p => p.poly.slice(1, -1).map((_, j) => ({ id: p.id,
        points: [p.poly[0], p.poly[j + 1], p.poly[j + 2]].map(m => posePoint(M, p.index * 12, m.x, m.y)) })));
      for (let a = 0; a < tris.length; a++) for (let b = a + 1; b < tris.length; b++)
        if (tris[a].id !== tris[b].id && interiorPiercing(tris[a].points, tris[b].points)) piercings++;
    }
  }
  assert(maxEdgeError < 1e-9 && minZ >= -1e-9, id);
  assert(maxHingeGap <= 8 * LAYER_GAP + 1e-9, `${id}: hinge gap ${maxHingeGap}`); // as hingeCheck.ts
  assert.equal(piercings, 0, `${id}: sampled strict piercing`);
  const cp = creasePattern(c);
  assert.deepEqual(vertexProblems(cp), [], `${id}: crease pattern`);
  const final = tl.states.at(-1)!, pts = final.facets.flatMap(modelPoly);
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  studies[id] = {
    steps: c.ops.length, facets: final.facets.length, creases: cp.length,
    outline: { width: +(Math.max(...xs) - Math.min(...xs)).toFixed(3), height: +(Math.max(...ys) - Math.min(...ys)).toFixed(3) },
    maxHingeGap: +maxHingeGap.toFixed(4), minZ: +minZ.toFixed(4), strictPiercings: piercings, samplesPerOperation: 81,
  };
}
mkdirSync('docs/design-pass-2026-10/evidence', { recursive: true });
writeFileSync('docs/design-pass-2026-10/evidence/geometry.json', JSON.stringify({ coatCreases: drawn.size, studies }, null, 2) + '\n');
console.log('design pass: coat creases', drawn.size, '· studies', JSON.stringify(studies));

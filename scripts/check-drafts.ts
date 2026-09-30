// Drafted proposal items (branch drafts/papercouture-drafter-20260930).
// Run: node --import tsx scripts/check-drafts.ts   (also part of npm test)
// Geometry gates for the parked sailor-collar study, turned cuffs, pleat depths, the
// neckerchief and folded patch pocket, plus drawing/placement checks for the two
// draft papers. Like the other checks, this is not physical-paper or
// continuous-collision certification.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { buildSailorTop } from '../docs/geometry-collection/drafts/sailor/sailorTopStudy';
import { buildJacket } from '../src/fold/jacket';
import { buildPleatedSkirt, PLEAT_DEPTHS } from '../src/fold/pleatedSkirt';
import { buildNeckerchief } from '../src/fold/neckerchief';
import { buildPocketSquare } from '../src/fold/pocketSquare';
import { buildSilhouette } from '../src/fold/silhouettes';
import { buildLapelVest } from '../src/fold/lapelVest';
import { ACCESSORIES, accessoryAnchors } from '../src/fold/accessories';
import { attachmentAnchors, buildGarment, GARMENTS } from '../src/fold/garments';
import { Construction } from '../src/fold/construction';
import { Facet, SheetState, checkState, isFlipped, modelPoly } from '../src/fold/engine';
import { Vec2, applyAffine, centroid, signedArea, v2 } from '../src/fold/geometry';
import { buildTimeline, evaluateFrame, posePoint, LAYER_GAP } from '../src/fold/timeline';
import { PAPERS } from '../src/papers';
import { BORDER_BAND } from '../src/papers/borderPrint';

const dist = (a: number[], b: number[]) => Math.hypot(...a.map((v, i) => v - b[i]));
const insideConvex = (poly: Vec2[], p: Vec2) => {
  const ccw = signedArea(poly) < 0 ? poly.slice().reverse() : poly;
  return ccw.every((a, i) => {
    const b = ccw[(i + 1) % ccw.length];
    return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x) >= -1e-10;
  });
};

/** Same gates as the existing per-garment checks: retained material, rigidity,
 * connectivity, step-boundary continuity, 21 animation samples, table clearance. */
function validate(c: Construction) {
  const t = buildTimeline(c.ops);
  for (const [i, s] of t.states.entries()) assert.deepEqual(checkState(s, `${c.name} state ${i}`), []);
  let worstGap = 0, lowestZ = Infinity;
  for (const op of t.ops) for (let n = 0; n <= 20; n++) {
    const M = evaluateFrame(op, n / 20);
    for (const h of op.hinges) for (const m of [h.m0, h.m1]) worstGap = Math.max(worstGap, dist(posePoint(M, h.a * 12, m.x, m.y), posePoint(M, h.b * 12, m.x, m.y)));
    for (const p of op.pieces) for (const m of p.poly) lowestZ = Math.min(lowestZ, posePoint(M, p.index * 12, m.x, m.y)[2]);
  }
  assert(worstGap <= 8 * LAYER_GAP, `${c.name}: sampled hinge gap ${worstGap}`);
  assert(lowestZ >= -1e-9, `${c.name}: paper below the table ${lowestZ}`);
  for (let k = 0; k + 1 < t.ops.length; k++) {
    const A = t.ops[k], B = t.ops[k + 1], MA = evaluateFrame(A, 1), MB = evaluateFrame(B, 0);
    for (const p of B.pieces) {
      const prior = A.pieces.find(q => insideConvex(q.poly, centroid(p.poly)));
      assert(prior, `${c.name}: no material source at step ${k + 1}`);
      for (const m of p.poly) assert(dist(posePoint(MA, prior.index * 12, m.x, m.y), posePoint(MB, p.index * 12, m.x, m.y)) < 1e-9, `${c.name}: jump between steps ${k} and ${k + 1}`);
    }
  }
  assert(c.ops.every(op => op.kind === 'turn' || op.folds.every(f => f.sense === 'valley')), `${c.name}: every fold should come up toward the viewer`);
  return { t, final: t.states[t.states.length - 1], worstGap };
}
/** Top facet at a model point as seen from the front, or the bottom one from behind. */
function faceAt(state: SheetState, p: Vec2, from: 'front' | 'back'): { facet: Facet; reverse: boolean } {
  const hits = state.facets.filter(f => insideConvex(modelPoly(f), p)).sort((a, b) => a.rank - b.rank);
  assert(hits.length, `no paper at (${p.x}, ${p.y})`);
  const facet = from === 'front' ? hits[hits.length - 1] : hits[0];
  // From the front a flipped facet shows the reverse; from behind the reverse
  // shows on facets whose printed face is up.
  return { facet, reverse: from === 'front' ? isFlipped(facet) : !isFlipped(facet) };
}
const bounds = (s: SheetState) => {
  const pts = s.facets.flatMap(modelPoly);
  return { w: Math.max(...pts.map(p => p.x)) - Math.min(...pts.map(p => p.x)), h: Math.max(...pts.map(p => p.y)) - Math.min(...pts.map(p => p.y)) };
};
const fingerprint = (c: Construction) => createHash('sha256').update(JSON.stringify(buildTimeline(c.ops).states.map(s => s.facets.map(({ id: _id, ...f }) => f)))).digest('hex');

// --- Sailor-collar top (parked study, not selectable) ------------------------
{
  assert(!GARMENTS.some(g => (g.id as string) === 'sailor'), 'the sailor top is parked: it must not be a selectable garment');
  const c = buildSailorTop();
  const { final, worstGap } = validate(c);
  assert.equal(c.ops.filter(op => op.kind === 'turn').length, 2, 'sailor top: explicit turn-overs');
  for (const [x, y] of [[0, -0.1], [-0.3, -0.2], [0.3, 0], [-0.45, -0.25], [0.45, 0.05]]) assert(faceAt(final, v2(x, y), 'back').reverse, `sailor collar should show the reverse at the back (${x}, ${y})`);
  for (const [x, y] of [[-0.25, -0.5], [0.25, -0.6]]) assert(!faceAt(final, v2(x, y), 'back').reverse, `sailor back body below the collar should be printed (${x}, ${y})`);
  assert(faceAt(final, v2(0, 0.05), 'front').reverse, 'sailor neckline strip should be reverse');
  for (const [x, y] of [[0, -0.4], [-0.3, -0.6], [0.3, -0.3]]) assert(!faceAt(final, v2(x, y), 'front').reverse, `sailor front body should be printed (${x}, ${y})`);
  const b = bounds(final);
  for (const g of GARMENTS) {
    const o = bounds(buildTimeline(buildGarment(g.id).ops).states.at(-1)!);
    assert(Math.abs(o.w - b.w) > 0.05 || Math.abs(o.h - b.h) > 0.05, `sailor top outline duplicates ${g.id}`);
  }
  console.log(`Sailor-collar top (parked study, not selectable): ${c.ops.length} steps, ${final.facets.length} facets, ${b.w.toFixed(2)} x ${b.h.toFixed(2)}; hinge ${worstGap.toFixed(4)}; back collar reverse, front neckline strip reverse.`);
}

// --- Box jacket cuffs --------------------------------------------------------
{
  for (const length of ['cropped', 'longer'] as const) {
    const plain = buildJacket(length, 'plain'), turned = buildJacket(length, 'turned');
    assert.equal(fingerprint(plain), fingerprint(buildJacket(length)), 'plain cuffs must be the unchanged jacket');
    assert.equal(turned.ops.length, plain.ops.length + 1, 'turned cuffs add exactly one fold');
    assert.deepEqual(JSON.stringify(turned.ops.slice(0, plain.ops.length).map(op => op.kind === 'fold' ? op.folds : op.kind)),
      JSON.stringify(plain.ops.map(op => op.kind === 'fold' ? op.folds : op.kind)), 'turned cuffs rewrite earlier folds');
    const { final } = validate(turned);
    const plainFinal = buildTimeline(plain.ops).states.at(-1)!;
    const cuff = turned.ops.at(-1)!;
    assert(cuff.kind === 'fold' && cuff.folds.every(f => f.only === 'collar'), 'cuffs fold only the top sleeve layer');
    if (cuff.kind !== 'fold') continue;
    for (const f of cuff.folds) {
      // The turned corner uncovers the under-layer and lands above the crease;
      // both are printed where the plain sleeve end is reverse-coloured.
      const uncovered = centroid([f.a, f.b, f.moving]);
      const dx = f.b.x - f.a.x, dy = f.b.y - f.a.y, L = Math.hypot(dx, dy);
      const d = ((uncovered.x - f.a.x) * dy - (uncovered.y - f.a.y) * dx) / L;
      const landed = v2(uncovered.x - 2 * d * (dy / L), uncovered.y + 2 * d * (dx / L));
      assert(faceAt(plainFinal, uncovered, 'front').reverse, 'plain sleeve end should be reverse');
      assert(!faceAt(final, uncovered, 'front').reverse, `${length}: turned cuff should uncover printed paper`);
      assert(!faceAt(final, landed, 'front').reverse, `${length}: turned-back corner should show its printed face`);
    }
  }
  console.log('Box jacket cuffs: plain = unchanged baseline (both lengths); turned adds one top-layer flap per sleeve that shows printed paper.');
}

// --- Pleat depth ---------------------------------------------------------------
{
  assert.equal(fingerprint(buildPleatedSkirt('classic')), '32bdc8dbcab08dc55de0ff0178a4808bed90d8072b48ebe803f2a14bd397e4aa', 'classic pleats changed from the PR #10 baseline');
  assert.equal(fingerprint(buildPleatedSkirt()), fingerprint(buildPleatedSkirt('classic')));
  const channel = (depth: typeof PLEAT_DEPTHS[number]['id']) => {
    const final = validate(buildPleatedSkirt(depth)).final;
    // fraction of a sampled row at the skirt's mid height that shows the reverse
    let rev = 0, n = 0;
    for (let x = -0.7; x <= 0.7001; x += 0.01) { if (!final.facets.some(f => insideConvex(modelPoly(f), v2(x, 0)))) continue; n++; if (faceAt(final, v2(x, 0), 'front').reverse) rev++; }
    return rev / n;
  };
  const shares = Object.fromEntries(PLEAT_DEPTHS.map(d => [d.id, channel(d.id)]));
  assert(shares.shallow < shares.classic && shares.classic < shares.deep, `pleat choices should widen the reverse channel: ${JSON.stringify(shares)}`);
  assert(shares.deep - shares.shallow > 0.15, 'pleat depths should be visibly distinct');
  console.log(`Pleat depth: reverse share of the mid row shallow ${shares.shallow.toFixed(2)}, classic ${shares.classic.toFixed(2)}, deep ${shares.deep.toFixed(2)}; classic matches the PR #10 fingerprint.`);
}

// --- Neckerchief and folded patch pocket -----------------------------------------
{
  const k = validate(buildNeckerchief()).final;
  assert(faceAt(k, v2(0, 0.4), 'front').reverse, 'neckband should be reverse');
  assert(!faceAt(k, v2(0, -0.4), 'front').reverse, 'neckerchief triangle should be printed');
  const p = validate(buildPocketSquare()).final;
  assert(faceAt(p, v2(0, 0.55), 'front').reverse, 'patch pocket top band should be reverse');
  assert(!faceAt(p, v2(0, 0.1), 'front').reverse, 'pocket should be printed');
  for (const g of GARMENTS) {
    const anchors = attachmentAnchors(g.id, 1, -1);
    assert(accessoryAnchors('kerchief', anchors).every(a => a.id === 'neckline'));
    assert(accessoryAnchors('pocket', anchors).every(a => a.id === 'chest-left' || a.id === 'chest-right'));
  }
  assert.equal(accessoryAnchors('kerchief', attachmentAnchors('skirt', 1, -1)).length, 0, 'skirts have no neckline');
  assert.equal(accessoryAnchors('pin', attachmentAnchors('dress', 1, -1)).length, 6, 'pin keeps every position');
  assert.deepEqual(ACCESSORIES.slice(0, 2).map(a => a.pieces), [[{ angle: 0, offset: 0, scale: 0.16 }],
    [{ angle: -Math.PI / 4, offset: -1.27, scale: 0.19 }, { angle: 3 * Math.PI / 4, offset: 1.27, scale: 0.19 }]], 'pin/bow placement changed');
  console.log('Neckerchief (5 steps) and folded patch pocket (5 steps): geometry gates pass; reverse neckband / top band over a printed body; positions restricted to neckline / chest.');
}

// --- Draft papers ----------------------------------------------------------------
{
  const record = () => {
    const calls: string[] = [];
    const styles: string[] = [];
    const ctx = new Proxy({} as Record<string, unknown>, {
      get: (_t, key) => key === 'createLinearGradient' || key === 'createRadialGradient' ? () => ({ addColorStop() {} }) : (...args: unknown[]) => { calls.push(String(key)); void args; },
      set: (_t, key, value) => { if (key === 'fillStyle') styles.push(String(value)); return true; },
    }) as unknown as CanvasRenderingContext2D;
    return { ctx, calls, styles };
  };
  const ids = PAPERS.map(p => p.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate paper id');
  assert(ids.indexOf('diagnostic') < 0 || ids.indexOf('border-print') < ids.length - 1, 'diagnostic paper stays last');
  for (const id of ['pinstripe-lining', 'border-print']) {
    const paper = PAPERS.find(p => p.id === id);
    assert(paper && !paper.hidden, `${id} is not a visible swatch`);
    assert(paper.note.length <= 60, `${id}: swatch note should be one short line`);
    const back = record();
    paper.drawBack(back.ctx, 1024);
    assert.equal(back.styles[0], paper.reverse, `${id}: the drawn reverse ground should match its accent colour`);
    assert(back.calls.filter(c => c === 'fill' || c === 'fillRect' || c === 'stroke').length > 5, `${id}: drawBack should be a drawing, not a solid colour`);
    const front = record();
    paper.drawFront(front.ctx, 1024);
    assert(front.calls.length > 5, `${id}: drawFront draws nothing`);
  }
  // Border print: the band (material y = 1 - 2 * row) is visible print on the
  // dress front and reaches within reach of the hem; the reverse wave rule
  // (canvas rows 0.035-0.09) lies in the collar and shows there.
  const dress = buildTimeline(buildSilhouette('classic').ops).states.at(-1)!;
  const materialFace = (state: SheetState, m: Vec2) => {
    const f = state.facets.find(f => insideConvex(f.poly, m))!;
    const p = applyAffine(f.T, m);
    const top = faceAt(state, p, 'front').facet;
    return { visible: top.id === f.id, flipped: isFlipped(f), y: p.y };
  };
  const dressBottom = Math.min(...dress.facets.flatMap(modelPoly).map(p => p.y));
  for (const row of [BORDER_BAND.top + 0.01, (BORDER_BAND.top + BORDER_BAND.bottom) / 2, BORDER_BAND.bottom - 0.01]) for (const x of [-0.3, 0, 0.3]) {
    const s = materialFace(dress, v2(x, 1 - 2 * row));
    assert(s.visible && !s.flipped, `border band at canvas row ${row}, x ${x} is not on the dress front`);
  }
  assert(materialFace(dress, v2(0, 1 - 2 * BORDER_BAND.bottom)).y - dressBottom < 0.3, 'border band should sit near the dress hem');
  for (const row of [0.05, 0.08]) {
    const s = materialFace(dress, v2(0, 1 - 2 * row));
    assert(s.visible && s.flipped, `border-print reverse rule row ${row} should show on the dress collar`);
  }
  // Pinstripe and lining: the lining is only useful if it is exposed on the
  // collar, jacket sleeves and vest lapels of the current garments.
  const jacket = buildTimeline(buildJacket().ops).states.at(-1)!;
  assert(faceAt(dress, v2(0, 0.72), 'front').reverse, 'dress collar is reverse');
  assert(faceAt(jacket, v2(0.75, 0.52), 'front').reverse && faceAt(jacket, v2(-0.75, 0.52), 'front').reverse, 'jacket sleeves are reverse');
  const vest = buildTimeline(buildLapelVest().ops).states.at(-1)!;
  assert(vest.facets.some(f => f.tags.some(t => t.startsWith('vest-lapel-')) && isFlipped(f) === (faceAt(vest, centroid(modelPoly(f)), 'front').facet === f)), 'vest lapels expose the reverse');
  console.log('Draft papers: Pinstripe and lining, Border print registered with drawn reverses; border band lands on the dress front near the hem; reverse wave rule shows on the collar.');
}
console.log('Draft checks passed.');

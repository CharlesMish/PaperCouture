// Drafted proposal items (branch drafts/papercouture-drafter-20260930).
// Run: node --import tsx scripts/check-drafts.ts   (also part of npm test)
// Geometry gates for the parked sailor-collar study, turned cuffs, pleat depths, the
// neckerchief and folded patch pocket, plus drawing/placement checks for the
// draft papers. PR #13 exploration adds Starlit lining landing checks, wrap skirt
// lengths and the folded tulip; PR #14 adds the vest tapered hem (id `pointed`). Like the other checks, this is not physical-paper or
// continuous-collision certification.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { buildSailorTop } from '../docs/geometry-collection/drafts/sailor/sailorTopStudy';
import { buildJacket } from '../src/fold/jacket';
import { buildPleatedSkirt, PLEAT_DEPTHS } from '../src/fold/pleatedSkirt';
import { buildNeckerchief } from '../src/fold/neckerchief';
import { buildPocketSquare } from '../src/fold/pocketSquare';
import { buildSilhouette } from '../src/fold/silhouettes';
import { buildLapelVest, VEST_POINTS } from '../src/fold/lapelVest';
import { ACCESSORIES, accessoryAnchors } from '../src/fold/accessories';
import { attachmentAnchors, buildGarment, GARMENTS } from '../src/fold/garments';
import { Construction } from '../src/fold/construction';
import { Facet, SheetState, checkState, isFlipped, modelPoly } from '../src/fold/engine';
import { Vec2, applyAffine, centroid, signedArea, v2 } from '../src/fold/geometry';
import { buildTimeline, evaluateFrame, posePoint, LAYER_GAP } from '../src/fold/timeline';
import { PAPERS } from '../src/papers';
import { BORDER_BAND } from '../src/papers/borderPrint';
import { STARLIT } from '../src/papers/starlitLining';
import { buildWrapSkirt, SKIRT_LENGTHS } from '../src/fold/wrapSkirt';
import { buildTulip, TULIP_ANGLE } from '../src/fold/tulip';
import { canvasPoint, finalState, landings } from './paperLanding';

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
  for (const id of ['pinstripe-lining', 'border-print', 'starlit-lining']) {
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
// --- PR #13 exploration: Starlit lining (reverse-first paper) -------------------
{
  // Each part of the reverse drawing must land where the folds really turn the
  // reverse outward (turn 0), measured through the real constructions.
  const share = (garment: Parameters<typeof buildGarment>[0], inRegion: (c: { col: number; row: number }) => boolean, view: 'front' | 'back') => {
    const L = landings(finalState(buildGarment(garment)), 128).filter(l => inRegion(canvasPoint(l.m, 'reverse', 0)));
    assert(L.length > 50, `${garment}: region too small to measure`);
    return L.filter(l => l[view] === 'reverse').length / L.length;
  };
  const { trim, column, moon } = STARLIT;
  const inTrim = (c: { col: number; row: number }) => c.row > trim.top && c.row < trim.bottom;
  const inColumn = (top: number, bottom: number) => (c: { col: number; row: number }) => Math.abs(c.col - column.col) < column.halfWidth && c.row > top && c.row < bottom;
  const inMoon = (c: { col: number; row: number }) => Math.hypot(c.col - moon.col, c.row - moon.row) < moon.radius;
  const found = {
    dressTrim: share('dress', inTrim, 'front'), jacketTrim: share('jacket', inTrim, 'front'), pleatsTrim: share('pleats', inTrim, 'front'),
    vestColumn: share('vest', inColumn(0.15, 0.66), 'front'), dressBackColumn: share('dress', inColumn(column.top, column.bottom), 'back'),
    skirtMoon: share('skirt', inMoon, 'front'), dressBackMoon: share('dress', inMoon, 'back'),
  };
  assert(found.dressTrim > 0.85 && found.jacketTrim > 0.85, `starlit trim should be the dress and jacket collar/sleeve tops ${JSON.stringify(found)}`);
  assert(found.pleatsTrim > 0.55, 'starlit trim should be most of the pleated waistband');
  assert(found.vestColumn > 0.98, 'starlit star column should fill the vest front opening');
  assert(found.dressBackColumn > 0.98, 'starlit star column should run down the dress back');
  assert(found.skirtMoon > 0.98, 'starlit moon should be on the wrap skirt front');
  assert(found.dressBackMoon > 0.85, 'starlit moon should be on the dress back');
  console.log(`Starlit lining: reverse features land as designed at turn 0 ${Object.entries(found).map(([k, v]) => `${k} ${v.toFixed(2)}`).join(', ')}.`);
}

// --- PR #13 exploration: wrap skirt length ---------------------------------------
{
  // Classic is the PR #10 construction, byte for byte (geometry and captions).
  const fp = (c: Construction) => createHash('sha256').update(JSON.stringify(buildTimeline(c.ops).states.map(s => s.facets.map(({ id: _id, ...f }) => f)))).digest('hex');
  assert.equal(fp(buildWrapSkirt()), '4961d9ef9db169d2d535f25b5d5d9297f1be26cbee97f907658ebdb212862432', 'classic wrap skirt changed from the PR #10 baseline');
  assert.equal(JSON.stringify(buildWrapSkirt({ length: 'classic' })), JSON.stringify(buildWrapSkirt()), 'classic length must be the unchanged default');
  const heights: Record<string, number> = {};
  for (const length of SKIRT_LENGTHS) for (const wrap of ['original', 'opposite'] as const) for (const band of ['double', 'single'] as const) {
    const c = buildWrapSkirt({ length: length.id, wrap, band });
    const { final } = validate(c);
    assert.equal(c.ops.length, buildWrapSkirt({ wrap, band }).ops.length, 'a length choice adds no steps');
    if (wrap === 'original' && band === 'double') heights[length.id] = bounds(final).h;
  }
  assert(heights.classic - heights.short > 0.2 && heights.long - heights.classic > 0.2, `skirt lengths should be visibly distinct ${JSON.stringify(heights)}`);
  console.log(`Wrap skirt length: short/classic/long x wrap x band all pass the gates; heights ${Object.entries(heights).map(([k, v]) => `${k} ${v.toFixed(2)}`).join(', ')}; classic matches PR #10.`);
}

// --- PR #13 exploration: folded tulip --------------------------------------------
{
  const c = buildTulip();
  const { final, worstGap } = validate(c);
  assert(TULIP_ANGLE > 30 && TULIP_ANGLE < 45, 'tulip crease angle leaves the petals crossing without catching');
  assert(final.facets.every(f => faceAt(final, centroid(modelPoly(f)), 'front').facet !== f || !isFlipped(f)), 'every visible tulip face is printed');
  // upright frame: base at the origin, tip along (-1, -1)
  const up = (p: Vec2) => -(p.x + p.y) / Math.SQRT2, across = (p: Vec2) => (p.x - p.y) / Math.SQRT2;
  const pts = final.facets.flatMap(modelPoly);
  const height = Math.max(...pts.map(up)), width = Math.max(...pts.map(across)) - Math.min(...pts.map(across));
  assert(Math.min(...pts.map(up)) > -1e-9, 'the base of the tulip is its lowest point');
  assert(height > 1.3 && width > 1, `tulip should be a broad head, not a sliver (${height.toFixed(2)} x ${width.toFixed(2)})`);
  // two petal tips either side of the centre line, with the tip of the cup showing between them
  const tipPoint = v2(-1, -1);
  const atTip = faceAt(final, v2(tipPoint.x + 0.03, tipPoint.y + 0.03), 'front').facet;
  assert(!atTip.tags.some(t => t === 'tulip-left' || t === 'tulip-right'), 'the tip of the cup should show between the petals, not under them');
  // the petal tips sit a little below the cup's tip, well out to each side
  const tips = pts.filter(p => up(p) > 0.85 * height && Math.abs(across(p)) > 0.3);
  assert(tips.some(p => across(p) < 0) && tips.some(p => across(p) > 0), 'two petal tips, one either side');
  for (const g of GARMENTS) assert(accessoryAnchors('tulip', attachmentAnchors(g.id, 1, -1)).length > 0, `${g.id}: the tulip needs a waist position`);
  console.log(`Folded tulip: ${c.ops.length} steps (1 turn-over, ${c.ops.filter(o => o.kind === 'fold').length} valley folds), ${final.facets.length} facets, ${height.toFixed(2)} x ${width.toFixed(2)} upright; hinge ${worstGap.toFixed(4)}; printed faces; waist positions on every garment.`);
}
// --- PR #14: vest tapered hem (id `pointed`), folded into the vest-length choice -----
{
  // Short and Longline are the PR #13 constructions, byte for byte.
  assert.equal(fingerprint(buildLapelVest('short')), 'b7c4b2da96e9097ee60d6a4136c568a9ba3dbdee148c56d3bc0e28f1711d3218', 'short vest changed');
  assert.equal(fingerprint(buildLapelVest('longline')), 'b52e78ceaa495b31f9a4901247e3cfe596f98d0247c17ffc2c4b8c6eec9ae1fc', 'longline vest changed');
  const c = buildLapelVest('pointed');
  const { final, worstGap } = validate(c);
  const longline = buildLapelVest('longline');
  assert.equal(c.ops.length, longline.ops.length + 1, 'the tapered hem is one extra fold');
  const ids = c.ops.map(op => op.id);
  assert.equal(ids.indexOf('vest-hem-points'), ids.indexOf('vest-shorten') + 1, 'the points fold right after the length fold');
  assert.deepEqual(ids.filter(id => id !== 'vest-hem-points'), longline.ops.map(op => op.id), 'otherwise the longline sequence');
  const op = c.ops.find(o => o.id === 'vest-hem-points');
  assert(op?.kind === 'fold' && op.folds.every(f => f.sense === 'valley'), 'valley folds only');
  // far from the neckline and shoulders: every crease stays in the lower body
  assert(op.folds.every(f => Math.max(f.a.y, f.b.y) < -0.5), 'hem creases stay well below the waist');
  const hemY = -0.78, pts = final.facets.flatMap(modelPoly);
  const low = Math.min(...pts.map(p => p.y));
  assert(Math.abs(low - hemY) < 1e-9, `the points reach the longline hem (${low})`);
  const pointX = Math.max(...pts.filter(p => Math.abs(p.y - hemY) < 1e-9).map(p => Math.abs(p.x)));
  assert(pointX <= 0.55 - VEST_POINTS.run + 1e-9, `the lowest hem sits beside the front opening (|x| ${pointX.toFixed(2)})`);
  const sideLow = Math.min(...pts.filter(p => Math.abs(p.x) > 0.55 - 1e-6).map(p => p.y));
  assert(sideLow >= hemY + VEST_POINTS.rise - 1e-9, `the side seams are lifted by the points (${sideLow.toFixed(2)})`);
  console.log(`Vest tapered hem (pointed): ${c.ops.length} steps (longline + 1 valley fold), hinge ${worstGap.toFixed(4)}; points at |x| <= ${pointX.toFixed(2)} on the hem, sides raised to ${sideLow.toFixed(2)}; short/longline match PR #13.`);
}
console.log('Draft checks passed.');

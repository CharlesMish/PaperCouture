// Starting points: the pure parts, checked without a browser.
//
// 1. The sheet map behind the placement panel's veil and its found placements
//    (src/papers/landing.ts) agrees with the existing landing diagnostic
//    (scripts/paperLanding.ts, verified against rendered triangles in PR #13)
//    for every design at its default shape and each design's other colourway.
// 2. The flat preview's canvas-to-sheet mapping is the diagnostic's mapping.
// 3. Every suggested start names a real paper and design, sits inside the
//    paper's own limits, and is exactly representable (so a link, a saved board
//    and the panel agree on it).
import assert from 'node:assert/strict';
import { GARMENTS, buildGarment, garmentDisplayAngle } from '../src/fold/garments';
import { DEFAULT_OPTIONS, GarmentOptions, garmentDecisions } from '../src/fold/garmentOptions';
import { sheetMap } from '../src/papers/landing';
import { PAPERS } from '../src/papers';
import { normalizePosition } from '../src/papers/printPosition';
import { SUGGESTED, sameStart } from '../src/papers/startingPoints';
import { finishedState, materialPoint } from '../src/render/flatPreview';
import { landings, materialPoint as diagnosticPoint } from './paperLanding';

for (const face of ['print', 'reverse'] as const) for (let q = 0; q < 4; q++) for (const [c, r] of [[0, 0], [1, 0], [0, 1], [.3, .8]]) {
  const a = materialPoint(c, r, face, q), b = diagnosticPoint(c, r, face, q);
  assert.ok(Math.abs(a.x - b.x) < 1e-12 && Math.abs(a.y - b.y) < 1e-12, `canvas mapping differs for ${face} at turn ${q}`);
}

const n = 64;
let cells = 0, pieces = 0;
for (const g of GARMENTS) {
  const side = garmentDecisions(g.id).find(d => d.id.endsWith('Side'));
  for (const v of side ? side.choices.map(c => c.id) : [undefined]) {
    const options = side && v ? { ...DEFAULT_OPTIONS, [side.id]: v } as GarmentOptions : DEFAULT_OPTIONS;
    const state = finishedState(buildGarment(g.id, options));
    const map = sheetMap({ state, angle: garmentDisplayAngle(g.id) }, n);
    const seen = landings(state, n);
    assert.equal(seen.length, n * n, `${g.id}: the diagnostic covers the whole sheet`);
    let differ = 0;
    // Both sample cell centres row by row from the sheet's top-left corner.
    seen.forEach((l, i) => { if ((l.front === 'print') !== (map.lit[i] === 1)) differ++; });
    // Cells whose centre lies exactly on a crease can fall either way.
    assert.ok(differ <= n * n * .002, `${g.id}${v ? ' ' + v : ''}: ${differ} of ${n * n} sheet cells disagree with the landing diagnostic`);
    cells += n * n; pieces++;
  }
}

let suggestions = 0;
for (const [paperId, byDesign] of Object.entries(SUGGESTED)) {
  const paper = PAPERS.find(p => p.id === paperId);
  assert.ok(paper && !paper.hidden, `suggested paper ${paperId} is a visible paper`);
  for (const [designId, starts] of Object.entries(byDesign)) {
    assert.ok(GARMENTS.some(g => g.id === designId), `suggested design ${designId} exists`);
    for (const s of starts) {
      assert.ok(s.name && [0, 1, 2, 3].includes(s.turns), `${paperId} on ${designId}: a named start with a quarter turn`);
      assert.ok(sameStart(s, { turns: s.turns, ...normalizePosition(paper!, s) }), `${paperId} on ${designId}: "${s.name}" is inside the paper's limits and exactly representable`);
      assert.ok(!(s.x || s.y) || paper!.placement?.kind === 'slide', `${paperId} on ${designId}: only a sliding print is moved`);
      suggestions++;
    }
  }
}
console.log(`Starting points: sheet map agrees with the landing diagnostic on ${pieces} finished pieces (${cells} cells); ${suggestions} suggested starts are valid`);

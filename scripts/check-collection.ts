// Accepted collection regressions. Run: node --import tsx scripts/check-collection.ts
// Worker geometry gates deliberately exclude the parked robe/trousers studies.
import './check-dress-jacket';
import './check-skirt-vest';
import './check-pleats';
import './check-trousers-centre';
import './check-attachments';
import assert from 'node:assert/strict';
import { buildGarment, GARMENTS, garmentIdFrom, GarmentId } from '../src/fold/garments';
import {
  DEFAULT_OPTIONS, GarmentOptions, garmentDecisions, decisionStep,
  selectOption, sharedFoldPrefix, optionsFromParams,
} from '../src/fold/garmentOptions';
import { Construction } from '../src/fold/construction';
import { buildTimeline } from '../src/fold/timeline';

// Facet IDs are allocated globally; geometry, material and layer history are the
// state the application actually promises to preserve when changing a choice.
const stateSignature = (c: Construction) => JSON.parse(JSON.stringify(
  buildTimeline(c.ops).states.map(s => s.facets.map(({ poly, T, rank, tags }) => ({ poly, T, rank, tags }))),
));
function combinations(id: GarmentId) {
  let selections = [{ ...DEFAULT_OPTIONS }];
  for (const decision of garmentDecisions(id)) {
    selections = selections.flatMap(options => decision.choices.map(choice => selectOption(options, decision, choice.id)));
  }
  return selections;
}
let constructions = 0, transitions = 0;
for (const garment of GARMENTS) {
  const decisions = garmentDecisions(garment.id);
  for (const options of combinations(garment.id)) {
    constructions++;
    const current = buildGarment(garment.id, options);
    const states = stateSignature(current);
    const originalOptions = { ...options };
    for (const decision of decisions) {
      const before = decisionStep(current, decision);
      assert(before >= 0, `${garment.id}/${decision.id}: contextual decision points to a missing operation`);
      assert.equal(current.ops.filter(op => op.id === decision.before).length, 1, `${garment.id}: ambiguous decision operation ${decision.before}`);
      for (const choice of decision.choices) {
        transitions++;
        const selected = selectOption(options, decision, choice.id);
        assert.deepEqual(options, originalOptions, 'choosing another fold mutates the saved selection');
        // A later sleeve/band decision may not silently reset already chosen
        // side folds or wrap direction; this catches lost preference state.
        const earlier = decisions.slice(0, decisions.indexOf(decision));
        for (const previous of earlier) assert.equal(selected[previous.id], options[previous.id], `${decision.id} reset the earlier ${previous.id} choice`);
        const changed = buildGarment(garment.id, selected);
        const nextStates = stateSignature(changed);
        const shared = sharedFoldPrefix(current, changed);
        assert.equal(decisionStep(changed, decision), before, `${garment.id}: changing a choice moved its own entry point`);
        assert(shared >= before, `${garment.id}/${decision.id}: choice would rewrite completed folds`);
        // Prove the prefix helper against evaluated physical states, instead of
        // merely comparing the same operation signature used by that helper.
        assert.deepEqual(nextStates.slice(0, shared + 1), states.slice(0, shared + 1), `${garment.id}/${decision.id}: claimed common prefix changes retained paper`);
        assert(shared <= Math.min(current.ops.length, changed.ops.length), 'prefix extends beyond a construction');
        if (choice.id !== options[decision.id]) {
          assert.notDeepEqual(nextStates.at(-1), states.at(-1), `${garment.id}/${decision.id}/${choice.id}: advertised choice produces identical finished paper`);
          // Rewinding to an earlier decision also makes every later choice
          // pending. The UI must never preserve completed progress beyond here.
          for (const later of decisions.slice(decisions.indexOf(decision) + 1)) {
            assert(before < decisionStep(changed, later), `${garment.id}: later decision precedes the revisit boundary`);
            assert.equal(selected[later.id], options[later.id], 'rewinding should preserve a compatible later preference');
          }
        }
      }
    }
  }
}

// Exercise URL normalization all the way through the real builders. Malformed
// preferences should preserve other valid choices and never reach a builder as
// an unsupported string (e.g. a broken bookmark should not crash at startup).
const valid: GarmentOptions = {
  silhouette: 'flare', sleeves: 'dropped', jacketLength: 'longer',
  wrap: 'opposite', band: 'single', vestLength: 'longline',
};
const keys = { silhouette: 'shape', sleeves: 'sleeves', jacketLength: 'jacketLength', wrap: 'wrap', band: 'band', vestLength: 'vestLength' } as const;
const validParams = new URLSearchParams(Object.entries(keys).map(([id, key]) => [key, valid[id as keyof GarmentOptions]]));
assert.deepEqual(optionsFromParams(validParams), valid, 'a valid multi-choice bookmark should retain all selections');
for (const garment of GARMENTS) for (const decision of garmentDecisions(garment.id)) {
  for (const choice of decision.choices) {
    const selected = selectOption(valid, decision, choice.id);
    for (const other of Object.keys(keys) as (keyof GarmentOptions)[]) {
      if (other !== decision.id) assert.equal(selected[other], valid[other], `${decision.id} discarded a saved ${other} preference`);
    }
  }
}
// Revisiting should respond to physical changes, not explanatory copy edits.
const original = buildGarment('dress', valid);
const recaptioned: Construction = { ...original, ops: original.ops.map(op => ({ ...op, title: 'Updated guidance', hint: 'Same crease, clearer words.' })) };
assert.equal(sharedFoldPrefix(original, recaptioned), original.ops.length, 'caption changes falsely invalidate completed geometry');
assert.deepEqual(stateSignature(original), stateSignature(recaptioned));
const invalidValues = ['', 'invalid', '__proto__', 'constructor', 'CLASSIC', 'lifted ', 'single/double', '0', '<script>'];
for (const id of Object.keys(keys) as (keyof GarmentOptions)[]) for (const value of invalidValues) {
  const params = new URLSearchParams(validParams);
  params.set(keys[id], value);
  params.set('unknownChoice', 'longer');
  const actual = optionsFromParams(params);
  assert.deepEqual(actual, { ...valid, [id]: DEFAULT_OPTIONS[id] }, `invalid ${keys[id]}=${JSON.stringify(value)} corrupted another selection`);
  for (const garment of GARMENTS) assert.doesNotThrow(() => buildTimeline(buildGarment(garment.id, actual).ops), `${garment.id}: malformed URL reached the constructor`);
}
for (const raw of ['shape=%00&wrap=%F0%9F%93%84', 'sleeves=lifted%20&band=%ZZ', 'shape=%3Cscript%3E&band=single%2Fdouble']) {
  assert.deepEqual(optionsFromParams(new URLSearchParams(raw)), DEFAULT_OPTIONS, 'encoded invalid options should fall back to defaults');
}
assert.deepEqual(optionsFromParams(new URLSearchParams('unknown=longline&garmentOptions=%7B%7D')), DEFAULT_OPTIONS, 'unknown query fields changed fold options');
for (const invalid of [null, '', 'robe', 'trousers', 'constructor', '__proto__']) assert.equal(garmentIdFrom(invalid), 'dress', 'unknown or parked garment should open a usable default');
assert.deepEqual(DEFAULT_OPTIONS, { silhouette: 'classic', sleeves: 'classic', jacketLength: 'cropped', wrap: 'original', band: 'double', vestLength: 'short' }, 'normalizing options mutated the default selections');
console.log(`Collection integration: ${constructions} supported constructions, ${transitions} decision transitions, evaluated shared prefixes, preference retention and malformed URL recovery pass.`);

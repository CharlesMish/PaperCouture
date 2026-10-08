import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { writeFileSync } from 'node:fs';
import { GARMENTS, buildGarment } from '../src/fold/garments';
import { DEFAULT_OPTIONS, garmentDecisions } from '../src/fold/garmentOptions';
import { buildTimeline, evaluateFrame } from '../src/fold/timeline';

// Independent frozen checkout, supplied by CI or the reviewer. No baseline writes.
const baseline = resolve(process.env.BASELINE_DIR || '.fit-flare-baseline');
const old = await import(pathToFileURL(resolve(baseline, 'src/fold/garments.ts')).href);
const oldTimeline = await import(pathToFileURL(resolve(baseline, 'src/fold/timeline.ts')).href);
const checked: object[] = [];
for (const g of GARMENTS.filter(g => g.id !== 'fit-flare')) {
  let choices = [{ ...DEFAULT_OPTIONS }];
  for (const d of garmentDecisions(g.id)) choices = choices.flatMap(o => d.choices.map(c => ({ ...o, [d.id]: c.id })));
  for (const options of choices) {
    const a = buildTimeline(buildGarment(g.id, options).ops), b = oldTimeline.buildTimeline(old.buildGarment(g.id, options).ops);
    assert.deepEqual(a.states, b.states, `${g.id}: retained material states`);
    for (let k = 0; k < a.ops.length; k++) for (let j = 0; j <= 40; j++)
      assert.deepEqual(evaluateFrame(a.ops[k], j / 40), oldTimeline.evaluateFrame(b.ops[k], j / 40), `${g.id}:${k}:${j}`);
    checked.push({ id: g.id, options, statesIdentical: true, maxPoseDelta: 0 });
  }
}
if (process.env.PRESERVATION_REPORT) writeFileSync(process.env.PRESERVATION_REPORT, JSON.stringify({ baseline, variants: checked.length, checked }, null, 2));
console.log(`${checked.length} published garment variants: exact states and poses preserved`);

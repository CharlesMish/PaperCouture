// How pieces are presented (src/ui/designOrder.ts): every design has a recorded step
// count and tier that match its default construction and the tier rule, the order is
// easiest first with the starting piece leading, and pairs sit side by side.
// Run: npm run check:design-order (in npm test).

import assert from 'node:assert/strict';
import { GARMENTS, buildGarment } from '../src/fold/garments';
import { recommendedSquareCm } from '../src/fold/paperSize';
import { BROWSE_GARMENTS, DESIGN_FACTS, DIFFICULTIES, PAIRS, START_HERE } from '../src/ui/designOrder';

assert.equal(BROWSE_GARMENTS.length, GARMENTS.length, 'every design is presented once');
assert.equal(new Set(BROWSE_GARMENTS.map(g => g.id)).size, GARMENTS.length);
assert.equal(BROWSE_GARMENTS[0].id, START_HERE, 'the starting piece leads');
for (const g of GARMENTS) {
  const c = buildGarment(g.id), facts = DESIGN_FACTS[g.id];
  assert(facts, `${g.id}: has facts`);
  assert.equal(facts.steps, c.ops.length, `${g.id}: recorded step count`);
  const collapse = c.ops.some(op => op.kind === 'collapse');
  const rule = collapse || c.ops.length >= 12 ? 'advanced' : c.ops.length <= 7 && recommendedSquareCm(g.id) >= 14 ? 'easy' : 'medium';
  assert.equal(facts.difficulty, rule, `${g.id}: tier follows the rule`);
}
const rank = (id: string) => DIFFICULTIES.findIndex(d => d.id === DESIGN_FACTS[id as keyof typeof DESIGN_FACTS].difficulty);
for (let i = 1; i < BROWSE_GARMENTS.length; i++) assert(rank(BROWSE_GARMENTS[i - 1].id) <= rank(BROWSE_GARMENTS[i].id), 'easiest first');
for (const p of PAIRS) {
  const at = p.members.map(([id]) => BROWSE_GARMENTS.findIndex(g => g.id === id));
  assert.equal(Math.abs(at[0] - at[1]), 1, `${p.name}: side by side`);
}
const count = (d: string) => GARMENTS.filter(g => DESIGN_FACTS[g.id].difficulty === d).length;
console.log(`Design order: ${GARMENTS.length} designs, easiest first (${count('easy')} easy, ${count('medium')} medium, ${count('advanced')} advanced), ${START_HERE} first; step counts and tiers match the constructions.`);

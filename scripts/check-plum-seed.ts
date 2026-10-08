import assert from 'node:assert/strict';
import { plumSeed, plumSeedMotifs, PLUM_SEED_RADII } from '../src/papers/plumSeed';
import { normalizePosition } from '../src/papers/printPosition';

const seeds = plumSeedMotifs();
assert.equal(seeds.length, 196);
assert.deepEqual(plumSeedMotifs(), seeds, 'Every redraw must retain the same seeds');
let minimumMargin = Infinity;
for (const seed of seeds) {
  assert([seed.u, seed.v, seed.angle].every(Number.isFinite));
  assert(seed.ink === 0 || seed.ink === 1);
  const c = Math.cos(seed.angle), s = Math.sin(seed.angle);
  const rx = Math.hypot(PLUM_SEED_RADII.long * c, PLUM_SEED_RADII.short * s);
  const ry = Math.hypot(PLUM_SEED_RADII.long * s, PLUM_SEED_RADII.short * c);
  const margin = Math.min(1 - Math.abs(seed.u) - rx, 1 - Math.abs(seed.v) - ry);
  assert(margin > 0, 'The full rotated ellipse must lie inside the original sheet');
  minimumMargin = Math.min(minimumMargin, margin);
}
assert(seeds.filter(seed => seed.ink === 1).length > 30, 'Keep a visible secondary ink');
assert(new Set(seeds.map(seed => Math.floor(seed.angle / Math.PI * 8))).size === 8, 'No dominant shared arrow direction');
assert.equal(plumSeed.placement, undefined, 'Fixed placement is not an unsupported placement string');
for (const input of [{ x: .125, y: -.125 }, { x: Infinity, y: NaN }, { x: 1, y: 1 }])
  assert.deepEqual(normalizePosition(plumSeed, input), { x: 0, y: 0 });
console.log(JSON.stringify({ paper: plumSeed.id, seeds: seeds.length,
  plumSeeds: seeds.filter(seed => seed.ink === 0).length, sageSeeds: seeds.filter(seed => seed.ink === 1).length,
  minimumMaterialMargin: minimumMargin, fixedPlacement: true }));

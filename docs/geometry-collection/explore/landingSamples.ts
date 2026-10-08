// Exploration tool (PR #13): dump landing samples (material point + what each
// view sees) for every garment default and chosen variants, for analysis.
// node --import tsx docs/geometry-collection/explore/landingSamples.ts out.json [n]
import { writeFileSync } from 'node:fs';
import { GARMENTS, buildGarment } from '../../../src/fold/garments';
import { DEFAULT_OPTIONS, GarmentOptions } from '../../../src/fold/garmentOptions';
import { finalState, landings } from '../../../scripts/paperLanding';
import type { Construction } from '../../../src/fold/construction';

const n = Number(process.argv[3] || 64);
const variants: [string, Construction][] = GARMENTS.map(g => [g.id, buildGarment(g.id)]);
const extra: [string, Partial<GarmentOptions>, string][] = (JSON.parse(process.env.VARIANTS || '[]'));
for (const [id, opts, garment] of extra) variants.push([id, buildGarment(garment as never, { ...DEFAULT_OPTIONS, ...opts })]);
const out: Record<string, unknown> = {};
for (const [id, c] of variants) {
  const state = finalState(c);
  const L = landings(state, n);
  out[id] = { name: c.name, n, samples: L.map(l => [+l.m.x.toFixed(4), +l.m.y.toFixed(4), +l.p.x.toFixed(4), +l.p.y.toFixed(4), l.front === 'print' ? 1 : l.front === 'reverse' ? 2 : 0, l.back === 'print' ? 1 : l.back === 'reverse' ? 2 : 0]) };
}
writeFileSync(process.argv[2], JSON.stringify(out));
console.log(Object.keys(out).join(' '));

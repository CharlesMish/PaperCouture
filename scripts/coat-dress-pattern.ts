// Writes docs/coat-dress/crease-pattern.json: the coat-dress's finished crease
// pattern for both colourways (mountain/valley as seen from the printed side),
// its reference points and its physical-risk metrics, for the printable folding
// sheet (scripts/coat_dress_sheet.py). Run: npm run coat-dress-pattern
import { mkdirSync, writeFileSync } from 'node:fs';
import { buildCoatDress, coatDressGeometry, DEFAULT_COAT_DRESS } from '../src/fold/coatDress';
import { recommendedSquareCm } from '../src/fold/paperSize';
import { creasePattern } from './crease_pattern';
import { foldMetrics } from './foldMetrics';

const g = coatDressGeometry();
const pick = (p: { x: number; y: number }) => ({ x: +p.x.toFixed(6), y: +p.y.toFixed(6) });
const round = (cs: ReturnType<typeof creasePattern>) => cs.map((c) => ({ a: pick(c.a), b: pick(c.b), mv: c.mv }));
const reverse = buildCoatDress({ ...DEFAULT_COAT_DRESS, coat: 'reverse' });
const data = {
  note: 'Sheet coordinates [-1, 1], y up (top of the coat at the top), left-side reference points. Mountain/valley as seen from the printed side.',
  params: DEFAULT_COAT_DRESS,
  points: { V: pick(g.V), X1: pick(g.X1), X2: pick(g.X2), A: pick(g.A), W1: pick(g.W1), W2: pick(g.W2), C1: pick(g.C1end), C2: pick(g.C2end), corner: pick(g.corner) },
  metrics: { ...foldMetrics(reverse, recommendedSquareCm('coat-dress')), waistPleatMm: +((g.W1.y - g.W2.y) * 100).toFixed(2) },
  reverse: round(creasePattern(reverse)),
  print: round(creasePattern(buildCoatDress({ ...DEFAULT_COAT_DRESS, coat: 'print' }))),
};
mkdirSync('docs/coat-dress', { recursive: true });
writeFileSync('docs/coat-dress/crease-pattern.json', JSON.stringify(data, null, 1) + '\n');
console.log(`wrote docs/coat-dress/crease-pattern.json (${data.reverse.length} creases)`);

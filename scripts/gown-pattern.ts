// Writes docs/gown/crease-pattern.json: the one-shoulder gown's finished crease
// pattern (mountain/valley as seen from the printed side, printed gown), its
// reference points and its physical-risk metrics, for the printable folding
// sheet (scripts/gown_sheet.py). Run: npm run gown-pattern
import { mkdirSync, writeFileSync } from 'node:fs';
import { buildGown, gownGeometry, DEFAULT_GOWN } from '../src/fold/gown';
import { recommendedSquareCm } from '../src/fold/paperSize';
import { creasePattern } from './crease_pattern';
import { foldMetrics } from './foldMetrics';

const g = gownGeometry();
const pick = (p: { x: number; y: number }) => ({ x: +p.x.toFixed(6), y: +p.y.toFixed(6) });
const c = buildGown();
const cm = recommendedSquareCm('gown');
const data = {
  note: 'Sheet coordinates [-1, 1], y up (top of the gown at the top), printed side up. Waist points are the left side; the right side mirrors them.',
  params: DEFAULT_GOWN,
  points: {
    hem: pick({ x: -1, y: -1 + DEFAULT_GOWN.hem }), tipA: pick(g.tipA), tipB: pick(g.tipB), sashB: pick(g.drapeB),
    P: pick(g.P), W1: pick(g.W1), W2: pick(g.W2), C1: pick(g.C1end), C2: pick(g.C2end), corner: pick(g.corner),
  },
  metrics: { ...foldMetrics(c, cm), waistPleatMm: +(g.pleat * cm * 5).toFixed(2), skirtFlareDeg: +((g.d2 * 180) / Math.PI).toFixed(1) },
  creases: creasePattern(c).map((k) => ({ a: pick(k.a), b: pick(k.b), mv: k.mv })),
};
mkdirSync('docs/gown', { recursive: true });
writeFileSync('docs/gown/crease-pattern.json', JSON.stringify(data, null, 1) + '\n');
console.log(`wrote docs/gown/crease-pattern.json (${data.creases.length} creases)`);

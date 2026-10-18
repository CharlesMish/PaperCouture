// Writes docs/kimono/crease-pattern.json: the kimono's finished crease pattern
// (mountain/valley as seen from the printed side, printed kimono) and the obi's,
// with the physical-risk metrics, for the printable folding sheet
// (scripts/kimono_sheet.py). Run: npm run kimono-pattern
import { mkdirSync, writeFileSync } from 'node:fs';
import { buildKimono, kimonoGeometry, DEFAULT_KIMONO } from '../src/fold/kimono';
import { buildObi, OBI_CORD, OBI_HALF_HEIGHT, OBI_SCALE } from '../src/fold/obi';
import { recommendedSquareCm } from '../src/fold/paperSize';
import { creasePattern } from './crease_pattern';
import { foldMetrics } from './foldMetrics';

const g = kimonoGeometry();
const pick = (p: { x: number; y: number }) => ({ x: +p.x.toFixed(6), y: +p.y.toFixed(6) });
const cm = recommendedSquareCm('kimono');
const kimono = buildKimono();
const obi = buildObi();
const data = {
  note: 'Sheet coordinates [-1, 1], y up, printed side up. The kimono is folded in half with the fold (the hem) on y = 0.',
  params: DEFAULT_KIMONO,
  fractions: { collarBand: g.b / 2, obiCord: OBI_CORD / 2, obiHeight: OBI_HALF_HEIGHT },
  metrics: { ...foldMetrics(kimono, cm), collarBandMm: +(g.b * cm * 5).toFixed(1), sleeveMm: +((0.5 - g.b) * cm * 5).toFixed(1) },
  obi: { squareCm: +(cm * OBI_SCALE).toFixed(1), metrics: foldMetrics(obi, cm * OBI_SCALE), creases: creasePattern(obi).map((k) => ({ a: pick(k.a), b: pick(k.b), mv: k.mv })) },
  creases: creasePattern(kimono).map((k) => ({ a: pick(k.a), b: pick(k.b), mv: k.mv })),
};
mkdirSync('docs/kimono', { recursive: true });
writeFileSync('docs/kimono/crease-pattern.json', JSON.stringify(data, null, 1) + '\n');
console.log(`wrote docs/kimono/crease-pattern.json (${data.creases.length} kimono creases, ${data.obi.creases.length} obi creases)`);

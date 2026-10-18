// Writes docs/kimono-companions/crease-pattern.json: the zori's and the folding
// fan's finished crease patterns (mountain/valley as seen from the printed side,
// printed colourways), with the measurements and physical-risk metrics, for the
// printable folding sheet (scripts/zori_sensu_sheet.py). Run: npm run zori-sensu-pattern
import { mkdirSync, writeFileSync } from 'node:fs';
import { buildZori, zoriGeometry, DEFAULT_ZORI } from '../src/fold/zori';
import { buildSensu, sensuGeometry, DEFAULT_SENSU } from '../src/fold/sensu';
import { recommendedSquareCm } from '../src/fold/paperSize';
import { creasePattern } from './crease_pattern';
import { foldMetrics } from './foldMetrics';

const pick = (p: { x: number; y: number }) => ({ x: +p.x.toFixed(6), y: +p.y.toFixed(6) });
const zg = zoriGeometry(), sg = sensuGeometry();
const zcm = recommendedSquareCm('zori'), scm = recommendedSquareCm('sensu');
const deg = (r: number) => +((r * 180) / Math.PI).toFixed(2);
const data = {
  note: 'Sheet coordinates [-1, 1], y up, printed side up.',
  zori: {
    squareCm: zcm, params: DEFAULT_ZORI, metrics: foldMetrics(buildZori(), zcm),
    fractions: { band: DEFAULT_ZORI.band / 2, cornerDrop: DEFAULT_ZORI.cornerSlope / 4, soleWidth: DEFAULT_ZORI.halfWidth, toe: DEFAULT_ZORI.toe / 2, toeRound: DEFAULT_ZORI.toeRound / 2, heelRound: DEFAULT_ZORI.heelRound / 2 },
    finishedMm: { length: +(zg.length * zcm * 5).toFixed(1), width: +(2 * zg.halfWidth * zcm * 5).toFixed(1), thong: +(zg.b * zcm * 5).toFixed(1) },
    creases: creasePattern(buildZori()).map((k) => ({ a: pick(k.a), b: pick(k.b), mv: k.mv })),
  },
  sensu: {
    squareCm: scm, params: DEFAULT_SENSU, metrics: foldMetrics(buildSensu(), scm),
    tuckDeg: deg(sg.tuck), panelDeg: deg(sg.panel), innerFromMiddleDeg: sg.inner.map((a) => +(90 - deg(a)).toFixed(2)),
    /** the corner creases' distance in from the corner along each edge, as a fraction of the side */
    cornerOffset: +sg.cornerOffset.toFixed(4),
    /** the width between a tuck's two creases at the leaf's edge (one radius, half the side), in mm */
    tuckWidthAtEdgeMm: +(scm * 5 * Math.sin(sg.tuck)).toFixed(2),
    panelWidthAtEdgeMm: +(scm * 5 * 2 * Math.sin(sg.panel / 2)).toFixed(2),
    creases: creasePattern(buildSensu()).map((k) => ({ a: pick(k.a), b: pick(k.b), mv: k.mv })),
  },
};
mkdirSync('docs/kimono-companions', { recursive: true });
writeFileSync('docs/kimono-companions/crease-pattern.json', JSON.stringify(data, null, 1) + '\n');
console.log(`wrote docs/kimono-companions/crease-pattern.json (${data.zori.creases.length} zori creases, ${data.sensu.creases.length} fan creases)`);

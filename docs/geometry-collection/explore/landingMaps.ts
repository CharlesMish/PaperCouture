// Exploration tool (PR #13): writes where each face of the square lands on the
// finished garments, in canvas coordinates of each face at turn 0.
// node --import tsx docs/geometry-collection/explore/landingMaps.ts out.json
import { writeFileSync } from 'node:fs';
import { GARMENTS, buildGarment } from '../../../src/fold/garments';
import { canvasPoint, finalState, landings } from '../../../scripts/paperLanding';

const N = 64;
const out: Record<string, unknown> = {};
for (const g of GARMENTS) {
  const L = landings(finalState(buildGarment(g.id)), N);
  const grid = (face: 'print' | 'reverse') => {
    const cells: string[][] = Array.from({ length: N }, () => Array(N).fill('.'));
    for (const l of L) {
      const c = canvasPoint(l.m, face, 0);
      const f = l.front === face, b = l.back === face;
      cells[Math.floor(c.row * N)][Math.floor(c.col * N)] = f && b ? 'X' : f ? 'F' : b ? 'B' : '.';
    }
    return cells.map(r => r.join(''));
  };
  const share = (face: 'print' | 'reverse', view: 'front' | 'back') => L.filter(l => l[view] === face).length / L.length;
  out[g.id] = {
    name: g.name, print: grid('print'), reverse: grid('reverse'),
    shares: { printFront: share('print', 'front'), reverseFront: share('reverse', 'front'), printBack: share('print', 'back'), reverseBack: share('reverse', 'back') },
  };
}
writeFileSync(process.argv[2], JSON.stringify(out));
for (const [id, v] of Object.entries(out)) console.log(id, JSON.stringify((v as { shares: object }).shares));

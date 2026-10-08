/** Concept comparison for the necktie commission (diagnostic only; not imported
 * by the app). Builds the two buildable concepts with the real engine and writes
 * front/back facet renders plus their gate results:
 *   node --import tsx docs/necktie/concepts/concept-study.ts docs/necktie/concepts
 * Teal = printed face, sand = reverse, drawn from final facet ranks. */
import { writeFileSync } from 'node:fs';
import type { Construction } from '../../../src/fold/construction';
import { checkState, isFlipped, modelPoly, type Op, type SheetState } from '../../../src/fold/engine';
import { v2, type Vec2 } from '../../../src/fold/geometry';
import { buildTimeline, evaluateFrame, posePoint, LAYER_GAP } from '../../../src/fold/timeline';
import { buildNecktie } from '../../../src/fold/necktie';
import { interiorPiercing } from '../../../scripts/experiment-collision';

type P = [number, number];
const fold = (id: string, a: P, b: P, m: P): Op => ({ kind: 'fold', id, title: id, hint: id, folds: [{ name: id, a: v2(...a), b: v2(...b), moving: v2(...m), sense: 'valley' }] });
const turn = (id: string): Op => ({ kind: 'turn', id, title: id, hint: id });
/** Divided bottom: quarter the square into a four-layer strip, then swing each
 * end down about a 45-degree crease. The legs leave a real gap between them, but
 * the 0.5-unit strip gives 0.4-unit legs and mitred 45-degree hips. A cuff fold
 * or a thinner strip exceeds the layer-gap limit (0.0605 > 0.044). */
const culottes = (): Construction => ({ name: 'Culottes study', meta: { top: 0, shoulderPoint: v2(0, 0), sleeveCutDir: v2(1, 0) }, ops: [
  turn('print-down'), fold('half', [-2, 0], [2, 0], [0, 1]), fold('quarter', [-2, -.5], [2, -.5], [0, -1]),
  fold('leg-left', [-.1, 0], [-.6, -.5], [-1, -.25]), fold('leg-right', [.1, 0], [.6, -.5], [1, -.25]),
] });

function gates(c: Construction) {
  const tl = buildTimeline(c.ops); let gap = 0, pierce = 0, low = Infinity;
  const errors = tl.states.flatMap((s, i) => checkState(s, `${c.name}:${i}`));
  for (const op of tl.ops) for (let i = 0; i <= 80; i++) {
    const M = evaluateFrame(op, i / 80);
    for (const h of op.hinges) for (const m of [h.m0, h.m1]) gap = Math.max(gap, Math.hypot(...posePoint(M, h.a * 12, m.x, m.y).map((x, k) => x - posePoint(M, h.b * 12, m.x, m.y)[k])));
    for (const p of op.pieces) for (const m of p.poly) low = Math.min(low, posePoint(M, p.index * 12, m.x, m.y)[2]);
    const t = op.pieces.flatMap(p => p.poly.slice(1, -1).map((_, j) => ({ id: p.id, q: [p.poly[0], p.poly[j + 1], p.poly[j + 2]].map(m => posePoint(M, p.index * 12, m.x, m.y)) })));
    for (let a = 0; a < t.length; a++) for (let b = a + 1; b < t.length; b++) if (t[a].id !== t[b].id && interiorPiercing(t[a].q as any, t[b].q as any)) pierce++;
  }
  return { name: c.name, errors, worstHingeGap: +gap.toFixed(4), limit: 8 * LAYER_GAP, minimumZ: low, piercings: pierce, final: tl.states.at(-1)! };
}
function svg(state: SheetState, view: 'front' | 'back', angle: number, label: string) {
  const rot = (p: Vec2) => v2(p.x * Math.cos(angle) - p.y * Math.sin(angle), p.x * Math.sin(angle) + p.y * Math.cos(angle));
  const facets = state.facets.slice().sort((a, b) => view === 'front' ? a.rank - b.rank : b.rank - a.rank);
  const poly = (f: typeof facets[0]) => modelPoly(f).map(rot).map(p => `${(view === 'front' ? p.x : -p.x).toFixed(4)},${(-p.y).toFixed(4)}`).join(' ');
  const body = facets.map(f => `<polygon points="${poly(f)}" fill="${(view === 'front') !== isFlipped(f) ? '#4e655f' : '#cbbda6'}" stroke="#223" stroke-width=".008"/>`).join('');
  return `<g><rect x="-1.25" y="-1.6" width="2.5" height="3.2" fill="#efe7d8"/>${body}<text x="-1.2" y="-1.45" font-size=".11" font-family="sans-serif">${label}</text></g>`;
}
const out = process.argv[2] || 'docs/necktie/concepts';
const tie = gates(buildNecktie()), cul = gates(culottes());
const cells = [svg(tie.final, 'front', Math.PI / 4, 'Necktie · front'), svg(tie.final, 'back', Math.PI / 4, 'Necktie · back'), svg(cul.final, 'front', 0, 'Culottes study · front'), svg(cul.final, 'back', 0, 'Culottes study · back')];
const shift = (s: string, i: number) => `<g transform="translate(${1.25 + i * 2.6} 1.6)">${s.replace(/y="-1\.45"/, 'y="-1.42"')}</g>`;
writeFileSync(`${out}/concepts.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10.4 3.2" width="1300" height="400">${cells.map(shift).join('')}</svg>`);
const strip = ({ final, ...r }: ReturnType<typeof gates>) => r;
writeFileSync(`${out}/concepts.json`, JSON.stringify({ necktie: strip(tie), culottes: strip(cul), note: 'Culottes pass at this proportion only; a cuff fold reached 0.0605 > 0.044 and was not adopted.' }, null, 2));
console.log(JSON.stringify({ necktie: strip(tie), culottes: strip(cul) }));

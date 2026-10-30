// Step instructions (docs/instructions/STYLE.md): every design, every fold choice and
// every accessory has an instruction for each fold, written for someone folding real
// paper: no percentages or notes meant for reviewers, and every measurement it gives
// (src/fold/measure.ts) is a distance the step's own creases actually have on the
// paper at that moment. A measurement computed from the wrong quantity fails here.
// Run: npm run check:instructions (in npm test); --print shows each instruction as
// displayed, with its measurements, for reading through.

import assert from 'node:assert/strict';
import { GARMENTS, buildGarment, type GarmentId } from '../src/fold/garments';
import { garmentDecisions, selectOption, DEFAULT_OPTIONS } from '../src/fold/garmentOptions';
import { ACCESSORIES } from '../src/fold/accessories';
import { buildBowCentre } from '../src/fold/bowCentre';
import { recommendedSquareCm } from '../src/fold/paperSize';
import { formatHint, measuresIn } from '../src/fold/measure';
import type { Op } from '../src/fold/engine';
import { measure } from './fold-measurements';

/** Words that belong in a piece's notes or the docs, not in what to do next. */
const NOT_INSTRUCTIONS = [/%/, /\bfacets?\b/i, /\brigid(ly)?\b/i, /\bmaterial\b/i, /continuous backing/i, /\block(ing|ed)?\b/i,
  /\bnot tucked\b/i, /\bcrease pattern\b/i, /\bauthored\b/i, /along the guides?\b/i];
const print = process.argv.includes('--print');
// optional: only these designs / accessories (ids as in the registry, accessories as accessory:<id>)
const only = process.argv.slice(2).filter(a => !a.startsWith('--'));
const failures: string[] = [];
const check = (ok: unknown, message: string) => { if (!ok) failures.push(message); };
const TOL = 2e-3; // sheet units (0.02 cm on a 20 cm square; shown to the millimetre)

type Source = { label: string; ops: Op[]; cm: number };
const sources: Source[] = [];
for (const g of GARMENTS) {
  const id = g.id as GarmentId, cm = recommendedSquareCm(id);
  sources.push({ label: id, ops: buildGarment(id).ops, cm });
  for (const d of garmentDecisions(id)) for (const choice of d.choices) {
    const options = selectOption(DEFAULT_OPTIONS, d, choice.id);
    if (choice.id !== DEFAULT_OPTIONS[d.id]) sources.push({ label: `${id} (${d.id}: ${choice.id})`, ops: buildGarment(id, options).ops, cm });
  }
}
for (const a of ACCESSORIES) sources.push({ label: `accessory:${a.id}`, ops: a.build().ops, cm: 20 * a.pieces[0].scale });
sources.push({ label: 'accessory:bow-centre', ops: buildBowCentre().ops, cm: 20 * ACCESSORIES.find(a => a.id === 'bow')!.pieces[0].scale * .85 });

let measured = 0, instructions = 0;
const seen = new Set<string>();
for (const src of sources.filter(s => !only.length || only.includes(s.label.split(' (')[0]))) {
  const steps = measure(src.ops, 2); // 2 cm on a side: one cm per sheet unit
  src.ops.forEach((op, i) => {
    const where = `${src.label} step ${i + 1} (${op.id})`;
    check(op.title.length > 0 && op.title.length <= 60, `${where}: a short title`);
    if (op.kind !== 'turn') {
      check(op.hint.length >= 30, `${where}: says how to make the fold`);
      instructions++;
    }
    for (const bad of NOT_INSTRUCTIONS) check(!bad.test(op.hint), `${where}: uses ${bad} (keep it to what to do): "${op.hint}"`);
    // each measurement is a distance the creases of this step (or the next, for a
    // line creased now and folded then) have from the paper's edges or each other
    const near = [steps[i], steps[i + 1]].filter(Boolean);
    const points = near.flatMap(m => m.creases.flatMap(c => [c.from, c.to, ...c.throughAt, ...c.onMoving]).map(p => ({ p, m })));
    const candidates: number[] = [];
    for (const { p, m } of points) candidates.push(p[0], m.size.w - p[0], p[1], m.size.h - p[1]);
    for (const a of points) for (const b of points) if (a.m === b.m) candidates.push(Math.abs(a.p[0] - b.p[0]), Math.abs(a.p[1] - b.p[1]), Math.hypot(a.p[0] - b.p[0], a.p[1] - b.p[1]));
    for (const m of near) candidates.push(m.size.w, m.size.h);
    for (const u of measuresIn(op.hint)) {
      check(candidates.some(c => Math.abs(c - u) <= TOL), `${where}: the measurement ${u} (sheet units) matches none of the step's creases`);
      measured++;
    }
    const key = `${src.label.split(' (')[0]}|${op.id}|${op.hint}`;
    if (print && !seen.has(key)) {
      seen.add(key);
      console.log(`${where} · ${op.title}\n   ${formatHint(op.hint, src.cm) || '—'}`);
    }
  });
}
for (const f of failures) console.error(`  ${f}`);
assert.equal(failures.length, 0, `${failures.length} instruction problems (listed above)`);
console.log(`Instructions: ${instructions} fold instructions across ${GARMENTS.length} designs, their choices and ${ACCESSORIES.length + 1} accessory squares; ${measured} measurements match their creases.`);

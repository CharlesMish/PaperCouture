// Paper coverage report (PR #14). For every paper, garment and quarter turn it
// measures what reaches the Display Front view: how much of the front differs
// from its main colour (drawn ink or the other face), how much DRAWN ink shows,
// and how much of each face's ink is captured. It flags fronts with LOW VISIBLE
// INK: less than LOW_INK (0.5%) of the front shows either face's drawing. That is
// a measurement, not a verdict that no motif shows: small marks can remain (Astra's
// review of PR #14: Plum scatter on the skirt at 270° keeps two small petal marks
// at 0.00498). A plain one-colour front is also checked for, but the garments are
// two-tone by construction, so it does not occur.
//
// Scope: each garment's DEFAULT shape only (buildGarment(id) with DEFAULT_OPTIONS).
// Variants such as the short or long skirt, the longline or tapered-hem vest, other
// dress silhouettes or turned cuffs are not measured and can differ (e.g. Midnight
// orchard on the short skirt stays below 0.5% at every turn; on the classic skirt
// it does not).
//
//   PLAYWRIGHT_MODULE=<path to playwright> \
//   node --import tsx scripts/paperCoverage.ts [out-dir] [--check]
//
// The papers are drawn in headless Chromium by the app's own draw functions
// (scripts/paperRaster.ts, bundled with esbuild). The garments come from
// scripts/paperLanding.ts, so this has the same limitation: it is a flat
// normal-projection diagnostic (the top/bottom layer along the view axis of the
// finished flat piece), not an exact visibility oracle for the tilted Display
// camera. Ink is a pixel that differs from the face's dominant ground colour by
// more than INK_DISTANCE in RGB. Ink coverage says where the drawing lands; it
// does not say which turn looks best.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { build } from 'esbuild';
import { GARMENTS, buildGarment, type GarmentId } from '../src/fold/garments';
import { DEFAULT_OPTIONS } from '../src/fold/garmentOptions';
import { canvasPoint, finalState, landings, type Landing } from './paperLanding';

/** Canvas pixels per side: an odd multiple of SAMPLES, so every sample owns a
 * whole block of pixels centred on it, and a quarter turn maps blocks to blocks. */
export const RASTER = 384;
export const SAMPLES = 128;          // landing samples per side
export const INK_DISTANCE = 40;      // RGB distance from the ground colour
/** A garment front where less than this share differs from its main colour is "plain". */
export const PLAIN_FRONT = 0.02;
/** "Low visible ink": less than this share of the front shows drawn ink (0.5%).
 * Screenshots (PR #14 notes) mostly showed nothing, one star or two small marks
 * below it, and a small but real motif from about 0.006 up; it is not a sharp
 * boundary for "no motif". */
export const LOW_INK = 0.005;
/** Default-shape pairs known to stay below LOW_INK at every turn (single-motif
 * papers whose motif sits where the vest or the skirt wrap folds it away).
 * --check fails if this set changes, so a new or edited paper is noticed. */
export const KNOWN_LOW_INK = ['midnight-orchard/vest', 'plum-scatter/skirt', 'plum-scatter/vest'];

export interface Raster { id: string; name: string; hidden: boolean; front: Uint8Array; back: Uint8Array }
export interface Cell {
  /** share of the Front view's visible area that differs from its most common colour */
  contrast: number;
  /** share of the Front view's visible area that shows drawn ink (either face) */
  frontInk: number;
  /** share of the Front view's visible area that shows the reverse face */
  reverseArea: number;
  /** share of each face's ink that reaches the Front view */
  printCapture: number | null; reverseCapture: number | null;
}
export type Report = Record<string, { name: string; hidden: boolean; cells: Record<GarmentId, Cell[]> }>;

export async function rasterPapers(n = RASTER): Promise<Raster[]> {
  const require = createRequire(import.meta.url);
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
  const bundle = await build({ entryPoints: [resolve(import.meta.dirname, 'paperRaster.ts')], bundle: true, format: 'iife', write: false, logLevel: 'silent' });
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.setContent('<html><body></body></html>');
    await page.addScriptTag({ content: bundle.outputFiles[0].text });
    const out: { id: string; name: string; hidden: boolean; front: string; back: string }[] = await page.evaluate((k: number) => window.rasterPapers(k), n);
    return out.map(p => ({ ...p, front: Buffer.from(p.front, 'base64'), back: Buffer.from(p.back, 'base64') }));
  } finally { await browser.close(); }
}

/** Ink mask: pixels far from the most common (quantized) colour of the face. */
export function inkMask(rgb: Uint8Array, n = RASTER): Uint8Array {
  const counts = new Map<number, number>();
  const key = (i: number) => ((rgb[i * 3] >> 4) << 8) | ((rgb[i * 3 + 1] >> 4) << 4) | (rgb[i * 3 + 2] >> 4);
  for (let i = 0; i < n * n; i++) counts.set(key(i), (counts.get(key(i)) ?? 0) + 1);
  const mode = [...counts].sort((a, b) => b[1] - a[1])[0][0];
  const g = [0, 0, 0]; let c = 0;
  for (let i = 0; i < n * n; i++) if (key(i) === mode) { g[0] += rgb[i * 3]; g[1] += rgb[i * 3 + 1]; g[2] += rgb[i * 3 + 2]; c++; }
  const [r0, g0, b0] = g.map(x => x / c);
  const mask = new Uint8Array(n * n);
  for (let i = 0; i < n * n; i++) mask[i] = Math.hypot(rgb[i * 3] - r0, rgb[i * 3 + 1] - g0, rgb[i * 3 + 2] - b0) > INK_DISTANCE ? 1 : 0;
  return mask;
}

const pixel = (c: { col: number; row: number }, n = RASTER) => Math.min(n - 1, Math.floor(c.row * n)) * n + Math.min(n - 1, Math.floor(c.col * n));
/** Ink share of the pixel block a sample stands for (area average, so thin regular
 * repeats such as Seed dashes are not missed or doubled by point sampling). */
function blockInk(mask: Uint8Array, c: { col: number; row: number }, n = RASTER, k = n / SAMPLES): number {
  const x0 = Math.round(c.col * n - k / 2), y0 = Math.round(c.row * n - k / 2);
  let sum = 0, cnt = 0;
  for (let y = y0; y < y0 + k; y++) for (let x = x0; x < x0 + k; x++) {
    if (x < 0 || y < 0 || x >= n || y >= n) continue;
    sum += mask[y * n + x]; cnt++;
  }
  return cnt ? sum / cnt : 0;
}

const quantKey = (r: number, g: number, b: number) => ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
export function coverage(masks: { front: Uint8Array; back: Uint8Array }, L: Landing[], q: number, n = RASTER, rgb?: { front: Uint8Array; back: Uint8Array }): Cell {
  const total = (m: Uint8Array) => m.reduce((s, x) => s + x, 0) / m.length;
  const inkF = total(masks.front), inkB = total(masks.back);
  let seen = 0, ink = 0, rev = 0, capF = 0, capB = 0;
  const colours: number[][] = [];
  for (const l of L) {
    if (!l.front) continue;
    seen++;
    const face = l.front, mask = face === 'print' ? masks.front : masks.back;
    const cp = canvasPoint(l.m, face, q), px = pixel(cp, n);
    const hit = blockInk(mask, cp, n);
    if (rgb) { const src = face === 'print' ? rgb.front : rgb.back; colours.push([src[px * 3], src[px * 3 + 1], src[px * 3 + 2]]); }
    ink += hit;
    if (face === 'reverse') { rev++; capB += hit; } else capF += hit;
  }
  // every sample stands for the same sheet area, so ink reaching the view over
  // all samples, divided by the face's ink density, is the captured share
  let contrast = NaN;
  if (colours.length) {
    const counts = new Map<number, number>();
    for (const [r, g, b] of colours) counts.set(quantKey(r, g, b), (counts.get(quantKey(r, g, b)) ?? 0) + 1);
    const mode = [...counts].sort((a, b) => b[1] - a[1])[0][0];
    const ground = [0, 0, 0]; let c = 0;
    for (const [r, g, b] of colours) if (quantKey(r, g, b) === mode) { ground[0] += r; ground[1] += g; ground[2] += b; c++; }
    const [r0, g0, b0] = ground.map(x => x / c);
    contrast = colours.filter(([r, g, b]) => Math.hypot(r - r0, g - g0, b - b0) > INK_DISTANCE).length / colours.length;
  }
  return {
    contrast,
    frontInk: ink / seen, reverseArea: rev / seen,
    printCapture: inkF > 0 ? capF / L.length / inkF : null,
    reverseCapture: inkB > 0 ? capB / L.length / inkB : null,
  };
}

export function report(rasters: Raster[]): Report {
  const lands = Object.fromEntries(GARMENTS.map(g => [g.id, landings(finalState(buildGarment(g.id)), SAMPLES)])) as Record<GarmentId, Landing[]>;
  const out: Report = {};
  for (const r of rasters) {
    const masks = { front: inkMask(r.front), back: inkMask(r.back) };
    out[r.id] = { name: r.name, hidden: r.hidden, cells: Object.fromEntries(GARMENTS.map(g => [g.id, [0, 1, 2, 3].map(q => coverage(masks, lands[g.id], q, RASTER, r))])) as Record<GarmentId, Cell[]> };
  }
  return out;
}

/** Fronts matching a test, at a given turn and at every turn (selectable papers only). */
export function flagged(rep: Report, test: (c: Cell) => boolean) {
  const atTurn: string[] = [], always: string[] = [];
  for (const [id, p] of Object.entries(rep)) {
    if (p.hidden) continue;
    for (const [g, cells] of Object.entries(p.cells)) {
      const hit = cells.map(test);
      hit.forEach((e, q) => { if (e) atTurn.push(`${id}/${g}@${q * 90}`); });
      if (hit.every(Boolean)) always.push(`${id}/${g}`);
    }
  }
  return { atTurn, always };
}
export const plainFronts = (rep: Report) => flagged(rep, c => c.contrast < PLAIN_FRONT);
export const lowInkFronts = (rep: Report) => flagged(rep, c => c.frontInk < LOW_INK);

/** Per-sample drawn ink seen in the Front view (0 where the sample is hidden), for
 * comparing WHERE ink lands, not only how much (Astra: equal totals do not prove
 * spatial identity). */
export function inkMap(masks: { front: Uint8Array; back: Uint8Array }, L: Landing[], q: number, n = RASTER): Float64Array {
  return Float64Array.from(L, l => l.front ? blockInk(l.front === 'print' ? masks.front : masks.back, canvasPoint(l.m, l.front, q), n) : 0);
}
const PERCENT = (x: number) => `${(x * 100).toFixed(1)}%`;
const defaultShapes = () => `${GARMENTS.map(g => buildGarment(g.id).name).join(', ')} (DEFAULT_OPTIONS ${JSON.stringify(DEFAULT_OPTIONS)})`;

function markdown(rep: Report): string {
  const f = (x: number) => x.toFixed(3);
  const visible = Object.values(rep).filter(p => !p.hidden);
  const minContrast = Math.min(...visible.flatMap(p => Object.values(p.cells).flat().map(c => c.contrast)));
  const lines = [
    '# Paper coverage report',
    '',
    `Generated by \`scripts/paperCoverage.ts\` (canvas ${RASTER}px, ${SAMPLES}x${SAMPLES} landing samples; ink = RGB distance > ${INK_DISTANCE} from the face's ground colour).`,
    '',
    `Garments: the **default shape** of each only: ${defaultShapes()}. Variants (other skirt lengths, the longline or tapered-hem vest, other dress silhouettes, turned cuffs) are not measured and can differ.`,
    '',
    'Each cell is the share of the garment\'s Front view that shows **drawn ink** from either face, at turns 0° / 90° / 180° / 270°.',
    `**Bold** marks **low visible ink** (below ${LOW_INK}, i.e. ${PERCENT(LOW_INK)} of the front). This is a measurement, not "no motif": small marks can remain below it. The garment still shows its two paper colours.`,
    'The last column is the share of the reverse face\'s drawn ink that reaches the Front view, averaged over the five garments ("-" when the reverse has no drawing).',
    `No front is plain: the smallest share of any front that differs from its main colour is ${minContrast.toFixed(2)}, because every garment shows both faces.`,
    '',
    'Limits: this is a flat normal-projection diagnostic (top and bottom layer of the finished flat piece), not the tilted Display camera; ink coverage says where drawing lands, not which turn looks best.',
    '',
    `| Paper | ${GARMENTS.map(g => g.name).join(' | ')} | Reverse ink reaching the front (0° / 90° / 180° / 270°) |`,
    `| --- | ${GARMENTS.map(() => '---').join(' | ')} | --- |`,
  ];
  for (const [id, p] of Object.entries(rep)) {
    if (p.hidden && id !== 'compass-lining') continue; // diagnostics stay out; the PR #14 experiment is listed
    const cells = GARMENTS.map(g => p.cells[g.id].map(c => c.frontInk < LOW_INK ? `**${f(c.frontInk)}**` : f(c.frontInk)).join(' / '));
    const rc = [0, 1, 2, 3].map(q => { const xs = GARMENTS.map(g => p.cells[g.id][q].reverseCapture); return xs.every(x => x !== null) ? (xs.reduce((s, x) => s + x!, 0) / xs.length).toFixed(2) : '-'; });
    lines.push(`| ${p.name} (\`${id}\`${p.hidden ? ', hidden: URL only' : ''}) | ${cells.join(' | ')} | ${rc.join(' / ')} |`);
  }
  const e = lowInkFronts(rep);
  lines.push('', `Low visible ink (< ${PERCENT(LOW_INK)}) at some turn, default shapes (${e.atTurn.length}): ${e.atTurn.join(', ') || 'none'}.`, '', `Low visible ink (< ${PERCENT(LOW_INK)}) at every turn, default shapes: ${e.always.join(', ') || 'none'}.`, '');
  return lines.join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = process.argv.slice(2).find(a => !a.startsWith('--')) ?? 'docs/geometry-collection/drafts/coverage';
  const rasters = await rasterPapers();
  const rep = report(rasters);
  mkdirSync(out, { recursive: true });
  writeFileSync(`${out}/coverage.json`, JSON.stringify(rep, (_k, v) => typeof v === 'number' ? Math.round(v * 1000) / 1000 : v));
  writeFileSync(`${out}/coverage.md`, markdown(rep));
  const plain = plainFronts(rep), low = lowInkFronts(rep);
  console.log(`Paper coverage (default garment shapes): ${Object.keys(rep).length} papers x ${GARMENTS.length} garments x 4 turns; plain fronts: ${plain.atTurn.length}; low visible ink (< ${PERCENT(LOW_INK)}) at some turn: ${low.atTurn.length}; at every turn: ${low.always.join(', ') || 'none'}.`);
  if (process.argv.includes('--check')) {
    const unexpected = low.always.filter(x => !KNOWN_LOW_INK.includes(x)), fixed = KNOWN_LOW_INK.filter(x => !low.always.includes(x));
    if (plain.atTurn.length || unexpected.length || fixed.length) {
      console.error(`Coverage check failed: plain ${JSON.stringify(plain.atTurn)}, new low-ink fronts ${JSON.stringify(unexpected)}, no longer flagged ${JSON.stringify(fixed)}.`);
      process.exitCode = 1;
    } else console.log('Coverage check passed: no plain fronts; the low-visible-ink set matches KNOWN_LOW_INK.');
    // PR #14 experiment: Compass lining (hidden) is Starlit made four-fold symmetric.
    // It must land its drawing in the same PLACES at every turn (per sample, not
    // only in total), and at 0° keep at least 90% of Starlit's drawing on every
    // garment front.
    const compass = rep['compass-lining'], starlit = rep['starlit-lining'];
    if (compass && starlit) {
      const bad: string[] = [];
      const raster = rasters.find(r => r.id === 'compass-lining')!;
      const masks = { front: inkMask(raster.front), back: inkMask(raster.back) };
      const moved: string[] = [];
      for (const g of GARMENTS) {
        const L = landings(finalState(buildGarment(g.id)), SAMPLES);
        const base = inkMap(masks, L, 0), seen = L.filter(l => l.front).length;
        // share of the visible front whose ink differs by more than half a pixel block from turn 0
        const worst = Math.max(...[1, 2, 3].map(q => { const m = inkMap(masks, L, q); return m.reduce((s, x, i) => s + (Math.abs(x - base[i]) > 0.5 ? 1 : 0), 0) / seen; }));
        moved.push(`${g.id} ${(worst * 100).toFixed(2)}%`);
        if (worst > 0.001) bad.push(`${g.id}: ${PERCENT(worst)} of the front changes ink with the turn`);
        const c = compass.cells[g.id].map(x => x.frontInk);
        if (Math.max(...c) - Math.min(...c) > 0.002) bad.push(`${g.id} varies with turn ${JSON.stringify(c)}`);
        if (c[0] < 0.9 * starlit.cells[g.id][0].frontInk) bad.push(`${g.id} below 90% of Starlit at 0°`);
      }
      if (bad.length) { console.error(`Compass lining experiment failed: ${bad.join('; ')}`); process.exitCode = 1; }
      else console.log(`Compass lining (default shapes): the same ink in the same places at every turn (visible samples changing: ${moved.join(', ')}); front ink at 0° vs Starlit ${GARMENTS.map(g => `${g.id} ${compass.cells[g.id][0].frontInk.toFixed(3)}/${starlit.cells[g.id][0].frontInk.toFixed(3)}`).join(', ')}; Starlit's worst turn ${GARMENTS.map(g => Math.min(...starlit.cells[g.id].map(x => x.frontInk)).toFixed(3)).join('/')}.`);
    }
  }
}
